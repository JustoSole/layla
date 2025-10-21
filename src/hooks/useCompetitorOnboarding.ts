import { useState, useRef, useEffect } from 'react';
import { businessService } from '../services/api';

// Tipos para las sugerencias (reutilizando del onboarding)
export type PlaceSuggestion = {
  placeId: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
};

// Estados para el onboarding de competidores
interface CompetitorOnboardingState {
  // Estados básicos
  searchText: string;
  tripAdvisorUrl: string;
  error: string | null;
  
  // Entrada manual alternativa
  manualPlaceId: string;
  manualMode: boolean;
  
  // Estados de loading
  isLoading: boolean;
  
  // Estados para autocompletado
  suggestions: PlaceSuggestion[];
  showSuggestions: boolean;
  loadingSuggestions: boolean;
  selectedSuggestion: PlaceSuggestion | null;
  highlightedIndex: number;
  
  // Estados de progreso
  loadingReviews: boolean;
  reviewsStep: string;
  
  // Datos del competidor resultantes
  competitorData: {
    external_place_id: string;
    name: string;
    rating?: number;
    totalReviews?: number;
    address?: string;
    phone?: string;
    website?: string;
    google_cid?: string;
    google_place_id?: string;
  } | null;
}

export const useCompetitorOnboarding = () => {
  // Estado centralizado
  const [state, setState] = useState<CompetitorOnboardingState>({
    searchText: "",
    tripAdvisorUrl: "",
    error: null,
    manualPlaceId: "",
    manualMode: false,
    isLoading: false,
    suggestions: [],
    showSuggestions: false,
    loadingSuggestions: false,
    selectedSuggestion: null,
    highlightedIndex: -1,
    loadingReviews: false,
    reviewsStep: "",
    competitorData: null
  });
  
  // Referencias
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup para evitar memory leaks
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Manejar clicks fuera del autocomplete para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!state.showSuggestions) return;
      
      const target = event.target as Node;
      const searchInput = searchInputRef.current;
      const suggestionsContainer = suggestionsRef.current;
      
      if (
        searchInput && !searchInput.contains(target) &&
        suggestionsContainer && !suggestionsContainer.contains(target)
      ) {
        updateState({ 
          showSuggestions: false, 
          highlightedIndex: -1 
        });
      }
    };

    if (state.showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [state.showSuggestions]);
  
  // Helper para actualizar estado
  const updateState = (updates: Partial<CompetitorOnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };
  
  // Función para obtener sugerencias
  const fetchSuggestions = async (input: string) => {
    if (!input.trim() || input.length < 2) {
      updateState({ 
        suggestions: [], 
        showSuggestions: false 
      });
      return;
    }

    try {
      updateState({ loadingSuggestions: true });
      
      const response = await businessService.getPlaceSuggestions(input.trim(), 'AR', { vertical: 'gastronomia' });

      if (response?.ok && response.suggestions) {
        // Filtrar lugares geográficos
        const filteredSuggestions = response.suggestions.filter((suggestion: PlaceSuggestion) => {
          const mainText = suggestion.structured_formatting.main_text.toLowerCase();
          const secondaryText = suggestion.structured_formatting.secondary_text.toLowerCase();
          
          const geographicTerms = [
            'provincia', 'ciudad', 'barrio', 'distrito', 'municipio',
            'localidad', 'partido', 'comuna', 'región', 'argentina',
            'buenos aires (provincia)', 'caba', 'capital federal'
          ];
          
          const hasBusinessType = (suggestion.types || []).some(t => [
            'restaurant','cafe','bar','bakery','meal_takeaway','meal_delivery','food','establishment',
            'supermarket','clothing_store','electronics_store','furniture_store','department_store',
            'bank','lawyer','accounting','real_estate_agency','insurance_agency'
          ].includes(t));
          
          const isGeographic = !hasBusinessType && geographicTerms.some(term => 
            mainText.includes(term) || secondaryText.includes(term)
          );
          
          const isJustAddress = /^\d+/.test(mainText) && !mainText.includes(' ');
          
          return !isGeographic && !isJustAddress;
        });

        updateState({ 
          suggestions: filteredSuggestions, 
          showSuggestions: true,
          highlightedIndex: -1 
        });
      } else {
        const fallback: PlaceSuggestion = {
          placeId: "fallback",
          description: `${input} - No encontrado como negocio`,
          structured_formatting: {
            main_text: input,
            secondary_text: "Buscar solo entre establecimientos comerciales"
          },
          types: ["establishment"]
        };
        updateState({ 
          suggestions: [fallback], 
          showSuggestions: true 
        });
      }
    } catch (error) {
      console.error('❌ Error fetching suggestions:', error);
      updateState({ 
        suggestions: [], 
        showSuggestions: false,
        error: 'Error al obtener sugerencias'
      });
    } finally {
      updateState({ loadingSuggestions: false });
    }
  };

  // Función de debounce para búsqueda
  const handleInputChange = (value: string) => {
    updateState({ 
      searchText: value, 
      selectedSuggestion: null 
    });
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Seleccionar sugerencia
  const handleSuggestionSelect = (suggestion: PlaceSuggestion) => {
    updateState({
      selectedSuggestion: suggestion,
      searchText: suggestion.structured_formatting.main_text,
      showSuggestions: false,
      highlightedIndex: -1
    });
    
    searchInputRef.current?.focus();
  };

  // Navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!state.showSuggestions || state.suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        updateState({
          highlightedIndex: state.highlightedIndex < state.suggestions.length - 1 
            ? state.highlightedIndex + 1 
            : state.highlightedIndex
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        updateState({
          highlightedIndex: state.highlightedIndex > 0 
            ? state.highlightedIndex - 1 
            : -1
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (state.highlightedIndex >= 0) {
          handleSuggestionSelect(state.suggestions[state.highlightedIndex]);
        }
        break;
      case 'Escape':
        updateState({
          showSuggestions: false,
          highlightedIndex: -1
        });
        break;
    }
  };

  // Búsqueda y carga de competidor
  const handleSearch = async () => {
    const placeIdToUse = state.manualPlaceId.trim() || state.selectedSuggestion?.placeId || "";
    const finalSearchText = state.selectedSuggestion?.structured_formatting.main_text || state.searchText.trim() || '';
    
    if (!placeIdToUse || placeIdToUse === "fallback") {
      updateState({ error: 'Introduce un Place ID válido o elige una sugerencia' });
      return;
    }

    updateState({ 
      isLoading: true, 
      error: null,
      showSuggestions: false,
      loadingReviews: false,
      reviewsStep: ''
    });

    try {
      console.log(`🔍 Cargando competidor: "${finalSearchText}"`);
      
      // Onboard en modo 'competition'
      const result = await businessService.onboardByPlaceId(
        placeIdToUse,
        'Argentina', 
        'es',
        state.tripAdvisorUrl.trim() || undefined,
        'competition' // MODO COMPETENCIA
      );

      if (!result?.ok) {
        throw new Error(result?.error || 'No se encontró el negocio competidor');
      }

      const businessInfo = result.business_info;
      const externalPlaceId = result.external_place_id;
      const googleCid = businessInfo?.cid || null;
      const tripadvisorUrl = state.tripAdvisorUrl.trim() || undefined;

      console.log('✅ Competidor onboarded:', {
        name: businessInfo?.name,
        external_place_id: externalPlaceId,
        cid: googleCid
      });

      // Preparar datos del competidor
      const competitorData = {
        external_place_id: externalPlaceId,
        name: businessInfo?.name || finalSearchText,
        rating: businessInfo?.rating,
        totalReviews: businessInfo?.votes_count || 0,
        address: businessInfo?.address,
        phone: businessInfo?.phone,
        website: businessInfo?.url,
        google_cid: googleCid,
        google_place_id: businessInfo?.place_id
      };

      updateState({ competitorData });

      // 🚀 Cargar reviews de los últimos 6 meses (sin análisis NLP)
      if (externalPlaceId) {
        updateState({ loadingReviews: true, reviewsStep: 'Cargando reseñas del competidor (últimos 6 meses)...' });

        // Ejecutar carga de reviews en background
        (async () => {
          try {
            const ingestResults: { provider: string; count: number }[] = [];
            
            // Google Reviews (últimos 6 meses = ~180 días)
            if (googleCid) {
              try {
                updateState({ reviewsStep: 'Cargando reseñas de Google...' });
                const googleRes = await businessService.ingestGoogleReviews(
                  externalPlaceId, 
                  googleCid, 
                  100, // depth reducido para competidores
                  180  // últimos 6 meses
                );
                const count = googleRes?.inserted ?? googleRes?.upserted ?? 0;
                ingestResults.push({ provider: 'Google', count });
                console.log(`✅ ${count} reseñas de Google cargadas`);
              } catch (googleErr) {
                console.error('❌ Error cargando Google reviews:', googleErr);
              }
            }

            // TripAdvisor Reviews (últimos 6 meses)
            if (tripadvisorUrl) {
              try {
                updateState({ reviewsStep: 'Cargando reseñas de TripAdvisor...' });
                const tripRes = await businessService.ingestTripAdvisorReviews(
                  externalPlaceId, 
                  tripadvisorUrl, 
                  100, // depth reducido
                  180  // últimos 6 meses
                );
                const count = tripRes?.inserted ?? tripRes?.upserted ?? 0;
                ingestResults.push({ provider: 'TripAdvisor', count });
                console.log(`✅ ${count} reseñas de TripAdvisor cargadas`);
              } catch (tripErr) {
                console.error('❌ Error cargando TripAdvisor reviews:', tripErr);
              }
            }

            const totalIngested = ingestResults.reduce((acc, cur) => acc + (cur.count || 0), 0);
            
            // Actualizar total de reviews del competidor
            if (totalIngested > 0) {
              updateState(prev => ({
                competitorData: prev.competitorData ? {
                  ...prev.competitorData,
                  totalReviews: (prev.competitorData.totalReviews || 0) + totalIngested
                } : null
              }));
            }

            // NO ejecutamos análisis NLP para competidores
            console.log('✅ Carga de reviews completada. NLP no ejecutado (competidor).');
            updateState({ 
              reviewsStep: `✅ ${totalIngested} reseñas cargadas (últimos 6 meses)` 
            });

          } catch (err) {
            console.error('❌ Error en carga de reviews:', err);
            updateState({ reviewsStep: '❌ Error cargando reseñas' });
          } finally {
            updateState({ loadingReviews: false });
          }
        })();
      }

      return competitorData;
      
    } catch (err) {
      console.error('❌ Error al cargar competidor:', err);
      updateState({ 
        error: err instanceof Error ? err.message : 'Error cargando el competidor' 
      });
      return null;
    } finally {
      updateState({ isLoading: false });
    }
  };

  // Reset del formulario
  const reset = () => {
    setState({
      searchText: "",
      tripAdvisorUrl: "",
      error: null,
      manualPlaceId: "",
      manualMode: false,
      isLoading: false,
      suggestions: [],
      showSuggestions: false,
      loadingSuggestions: false,
      selectedSuggestion: null,
      highlightedIndex: -1,
      loadingReviews: false,
      reviewsStep: "",
      competitorData: null
    });
  };

  return {
    // Estado
    state,
    refs: {
      searchInputRef,
      suggestionsRef,
      debounceRef
    },
    
    // Acciones
    actions: {
      updateState,
      handleInputChange,
      handleSuggestionSelect,
      handleKeyDown,
      handleSearch,
      reset,
      setManualPlaceId: (value: string) => updateState({ manualPlaceId: value }),
      toggleManualMode: () => updateState({ manualMode: !state.manualMode }),
      setTripAdvisorUrl: (url: string) => updateState({ tripAdvisorUrl: url }),
      closeSuggestions: () => updateState({ showSuggestions: false, highlightedIndex: -1 })
    }
  };
};

