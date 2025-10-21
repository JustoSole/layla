import React from "react";
import { MapPin, CheckCircle2, ArrowRight, Search, Building2, Sparkles, Loader2 } from "lucide-react";
import { useOnboarding } from '../hooks/useOnboarding';
import PlatformSelector from './PlatformSelector';
import BusinessPreview from './BusinessPreview';

// Componente de onboarding simplificado usando hook personalizado
const OnboardingSimplified: React.FC = () => {
  const { state, refs, actions } = useOnboarding();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto w-full max-w-3xl">
        {state.step === 1 && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-slate-50/80 px-8 py-6">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Paso 1 de 2</span>
                <div className="flex h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                  <span className="h-full w-1/2 bg-blue-500"></span>
                </div>
              </div>
            </div>
            <div className="px-8 pb-8 pt-6">
            {/* Header */}
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <MapPin className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Buscá tu negocio</h1>
                <p className="text-gray-600">Escribí el nombre de tu restaurante, tienda, consultorio o cualquier establecimiento comercial.</p>
              </div>
            </div>

            {/* Search Form */}
            <form onSubmit={(e) => { e.preventDefault(); actions.handleSearch(); }} className="space-y-4" aria-labelledby="onboarding-search-label">
              <div className="relative">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    ref={refs.searchInputRef}
                    type="text"
                    value={state.searchText}
                    onChange={(e) => actions.handleInputChange(e.target.value)}
                    onKeyDown={actions.handleKeyDown}
                    onFocus={() => {
                      if (state.suggestions.length > 0) {
                        actions.updateState({ showSuggestions: true });
                      }
                    }}
                    placeholder="ej. Restaurante Don Carlos, Farmacia del Centro"
                    className={`w-full rounded-xl border-2 bg-white pl-12 pr-12 py-4 text-base transition-all duration-200 ${
                      state.selectedSuggestion 
                        ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'
                    } focus:ring-2 focus:ring-opacity-20 outline-none`}
                    required
                    disabled={state.isLoading}
                    role="combobox"
                    aria-expanded={state.showSuggestions}
                    aria-controls="place-suggestions-listbox"
                    aria-autocomplete="list"
                    aria-activedescendant={state.highlightedIndex >= 0 ? `suggestion-option-${state.highlightedIndex}` : undefined}
                  />
                  
                  {/* Loading indicator */}
                  {state.loadingSuggestions && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    </div>
                  )}
                  
                  {/* Success indicator */}
                  {state.selectedSuggestion && !state.loadingSuggestions && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {state.showSuggestions && state.suggestions.length > 0 && (
                  <div 
                    ref={refs.suggestionsRef}
                    className="absolute z-50 w-full mt-2 max-h-[50vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl transition-all duration-150"
                    id="place-suggestions-listbox"
                    role="listbox"
                  >
                    {state.suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion.placeId}
                        onClick={() => actions.handleSuggestionSelect(suggestion)}
                        className={`cursor-pointer border-b border-gray-100 p-4 transition-colors last:border-b-0 ${
                          index === state.highlightedIndex 
                            ? 'bg-blue-50 border-blue-100' 
                            : 'hover:bg-gray-50'
                        }`}
                        id={`suggestion-option-${index}`}
                        role="option"
                        aria-selected={index === state.highlightedIndex}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {suggestion.structured_formatting.main_text}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {suggestion.structured_formatting.secondary_text}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Platform Selector */}
              {state.selectedSuggestion && (
                <div className="mt-6 space-y-6">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                          <CheckCircle2 className="h-5 w-5" /> Negocio listo para analizar
                        </p>
                        <p className="mt-2 text-sm text-emerald-700">
                          {state.selectedSuggestion.structured_formatting.main_text}
                        </p>
                        <p className="text-xs text-emerald-700/80">
                          {state.selectedSuggestion.structured_formatting.secondary_text}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                        <Sparkles className="h-4 w-4" /> Paso siguiente
                      </span>
                    </div>
                  </div>
                  <PlatformSelector
                    hasGoogleBusiness={!!state.selectedSuggestion}
                    tripAdvisorUrl={state.tripAdvisorUrl}
                    onTripAdvisorChange={actions.setTripAdvisorUrl}
                    businessName={state.selectedSuggestion.structured_formatting.main_text}
                  />
                  {!state.tripAdvisorUrl && (
                    <p className="text-xs text-slate-500">
                      ¿Sin TripAdvisor? Podés avanzar igual y sumarlo después desde configuración.
                    </p>
                  )}
                </div>
              )}

              {/* Manual Place ID toggle + input */}
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={actions.toggleManualMode}
                  className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
                  aria-expanded={state.manualMode}
                  aria-controls="manual-placeid-section"
                >
                  {state.manualMode ? '← Buscar por nombre' : 'No encuentro el negocio'}
                </button>
                {state.manualMode && (
                  <span className="text-xs text-gray-500">Ingreso avanzado</span>
                )}
              </div>

              {state.manualMode && (
                <div id="manual-placeid-section" className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Place ID de Google (formato "ChIJ...")
                  </label>
                  <input
                    type="text"
                    value={state.manualPlaceId}
                    onChange={(e) => actions.setManualPlaceId(e.target.value)}
                    placeholder="ChIJxxxxxxxxxxxxxxxxx"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    aria-describedby="manual-help"
                  />
                  <p id="manual-help" className="mt-1 text-xs text-gray-500">
                    Tip: encontralo en Google Maps → Compartir → Copiar ID del lugar.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={state.isLoading || (!state.searchText.trim() && !state.selectedSuggestion)}
              >
                {state.isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Buscando tu negocio...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span>{state.selectedSuggestion ? 'Continuar con este negocio' : 'Analizar negocio'}</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
              
              {/* Error Message */}
              {state.error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
                  {state.error}
                </div>
              )}
            </form>
            </div>
          </div>
        )}

        {/* Step 2: Business Preview */}
        {state.step === 2 && (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 bg-slate-50/80 px-8 py-6">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Paso 2 de 2</span>
                <div className="flex h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                  <span className="h-full w-full bg-blue-500"></span>
                </div>
              </div>
            </div>
            <div className="px-8 pb-8 pt-6">
            <BusinessPreview 
              card={state.businessCard}
              metrics={state.businessMetrics}
              topics={state.businessTopics}
              tripAdvisorUrl={state.tripAdvisorUrl}
              loadingReviews={state.loadingReviews}
              reviewsLoadingStep={state.reviewsStep}
            />
            
            {/* Confirm Button */}
            <div className="mt-6">
              <button
                onClick={actions.handleConfirm}
                disabled={state.isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state.isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Preparando tu panel…</span>
                  </>
                ) : (
                  <>
                    <span>Entrar al panel</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-500 mt-3">
                Prueba gratis 10 días • Sin tarjeta
              </p>
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingSimplified;
