import React from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import PlatformIcon from './PlatformIcons';

interface PlatformSelectorProps {
  hasGoogleBusiness: boolean;
  tripAdvisorUrl: string;
  onTripAdvisorChange: (url: string) => void;
  businessName?: string;
}

const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  hasGoogleBusiness,
  tripAdvisorUrl,
  onTripAdvisorChange,
  businessName = "tu negocio"
}) => {
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-3">
        📊 Fuentes de reseñas para analizar:
      </div>
      
      {/* Google Platform - Siempre activo */}
      <div className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
        hasGoogleBusiness 
          ? 'border-green-300 bg-green-50' 
          : 'border-blue-300 bg-blue-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <PlatformIcon platform="Google" size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Google My Business</span>
                {hasGoogleBusiness && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </div>
              <p className="text-sm text-gray-600">
                {hasGoogleBusiness 
                  ? `✓ ${businessName} encontrado en Google` 
                  : "Buscando en Google Places..."
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">Principal</div>
            <div className="text-xs text-gray-500">Requerido</div>
          </div>
        </div>
      </div>

      {/* TripAdvisor Platform - Condicional y más prominente */}
      <div className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
        tripAdvisorUrl.trim() 
          ? 'border-orange-300 bg-orange-50' 
          : 'border-gray-200 bg-gray-50 hover:border-orange-200 hover:bg-orange-25'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <PlatformIcon platform="TripAdvisor" size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">TripAdvisor</span>
                {tripAdvisorUrl.trim() && (
                  <CheckCircle2 className="h-4 w-4 text-orange-600" />
                )}
              </div>
              <p className="text-sm text-gray-600">
                {tripAdvisorUrl.trim() 
                  ? "✓ URL configurada - se incluirán estas reseñas" 
                  : "Opcional: agregar reseñas de TripAdvisor"
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            {tripAdvisorUrl.trim() ? (
              <>
                <div className="text-sm font-medium text-orange-700">Incluido</div>
                <div className="text-xs text-orange-600">+ Reseñas adicionales</div>
              </>
            ) : (
              <>
                <div className="text-sm font-medium text-gray-500">Opcional</div>
                <div className="text-xs text-gray-400">Más datos</div>
              </>
            )}
          </div>
        </div>

        {/* Input para TripAdvisor URL */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="url"
              value={tripAdvisorUrl}
              onChange={(e) => onTripAdvisorChange(e.target.value)}
              placeholder="ej. Hotel_Review-g60763-d123456-Reviews-..."
              className={`w-full px-4 py-2 text-sm border rounded-lg transition-all duration-200 ${
                tripAdvisorUrl.trim() 
                  ? 'border-orange-300 focus:border-orange-500 focus:ring-orange-500' 
                  : 'border-gray-200 focus:border-orange-400 focus:ring-orange-400'
              } focus:ring-2 focus:ring-opacity-20 outline-none`}
            />
            {!tripAdvisorUrl.trim() && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Plus className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 flex items-start gap-1">
            <span>💡</span>
            <span>
              Si tu negocio está en TripAdvisor, copia la parte de la URL después de ".com/" 
              para obtener más reseñas y un análisis más completo.
            </span>
          </p>
        </div>
      </div>

      {/* Resumen visual */}
      {hasGoogleBusiness && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-blue-800">
              📈 Fuentes configuradas:
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <PlatformIcon platform="Google" size={16} />
                <span className="text-blue-700">Google</span>
              </div>
              {tripAdvisorUrl.trim() && (
                <>
                  <span className="text-blue-600">+</span>
                  <div className="flex items-center gap-1">
                    <PlatformIcon platform="TripAdvisor" size={16} />
                    <span className="text-blue-700">TripAdvisor</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            {tripAdvisorUrl.trim() 
              ? `Combinando datos de ${hasGoogleBusiness ? '2' : '1'} plataforma${tripAdvisorUrl.trim() ? 's' : ''} para un análisis más completo.`
              : 'Solo datos de Google. Agregá TripAdvisor para más información.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default PlatformSelector;
