import React from 'react';
import { Star, CheckCircle2, MapPin, Phone, Globe, Building2 } from 'lucide-react';
import PlatformIcon from './PlatformIcons';

interface BusinessPreviewProps {
  card: any;
  metrics: any;
  topics: any[];
  tripAdvisorUrl: string;
  loadingReviews: boolean;
  reviewsLoadingStep: string;
}

const BusinessPreview: React.FC<BusinessPreviewProps> = ({
  card,
  metrics,
  topics,
  tripAdvisorUrl,
  loadingReviews,
  reviewsLoadingStep
}) => {
  if (!card || !metrics) {
    // Skeleton loading state
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="animate-pulse">
          <div className="flex items-center gap-4 pb-6 border-b">
            <div className="w-16 h-16 bg-gray-200 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
          <div className="py-6 space-y-4">
            <div className="h-12 bg-gray-200 rounded w-1/3 mx-auto" />
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-4 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Datos de providers para mostrar fuentes - MEJORADO
  const providers = {
    google: {
      active: !!(metrics._providers?.hasGoogle),
      votes: metrics._providers?.googleVotes || 0,
      rating: metrics._providers?.googleRating || 0,
      name: 'Google'
    },
    tripadvisor: {
      active: !!(metrics._providers?.hasTripAdvisor),
      votes: metrics._providers?.tripAdvisorVotes || 0,
      rating: metrics._providers?.tripAdvisorRating || 0,
      name: 'TripAdvisor'
    }
  };

  // ✅ Log de verificación de datos en BusinessPreview
  if (metrics.totalVotes === 0 || !topics?.length) {
    console.warn('⚠️ BusinessPreview missing data:', {
      totalVotes: metrics.totalVotes,
      topicsCount: topics?.length,
      hasProviders: !!metrics._providers
    });
  }

  const activePlatforms = Object.values(providers).filter(p => p.active);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      {/* Header con información del negocio */}
      <div className="flex items-start gap-4 pb-6 border-b">
        <img 
          src={card.photo} 
          alt={`Foto de ${card.name}`} 
          className="w-16 h-16 rounded-xl object-cover flex-shrink-0" 
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {card.name}
            </h2>
            <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 text-xs px-2 py-0.5 rounded whitespace-nowrap">
              <CheckCircle2 className="h-3 w-3 mr-1" /> 
              Verificado
            </span>
          </div>
          
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span>{card.category}</span>
            </div>
            {card.address && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{card.address}</span>
              </div>
            )}
            {card.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{card.phone}</span>
              </div>
            )}
            {card.website && (
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4 flex-shrink-0" />
                <a 
                  href={card.website} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline truncate"
                >
                  {card.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating prominente con fuentes */}
      <div className="text-center py-6 border-b">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`h-7 w-7 ${
                  i < Math.round(metrics.rating) 
                    ? "text-yellow-400 fill-current" 
                    : "text-gray-300"
                }`} 
              />
            ))}
          </div>
          <span className="text-4xl font-bold text-gray-900">
            {metrics.rating?.toFixed(1)}
          </span>
        </div>
        
        <div className="text-lg text-gray-600 font-medium mb-3">
          {metrics.totalVotes?.toLocaleString()} reseñas totales
          {activePlatforms.length > 1 && (
            <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
              Combinadas
            </span>
          )}
        </div>

        {/* Fuentes de datos - Visual mejorado con ratings individuales */}
        {activePlatforms.length > 1 && (
          <div className="flex items-center justify-center gap-6 p-4 bg-gradient-to-r from-blue-50 to-orange-50 rounded-lg max-w-lg mx-auto border border-gray-100">
            {providers.google.active && (
              <div className="flex items-center gap-2">
                <PlatformIcon platform="Google" size={24} />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Google</div>
                  <div className="text-xs text-gray-500">
                    {providers.google.votes?.toLocaleString()} • {providers.google.rating?.toFixed(1)}⭐
                  </div>
                </div>
              </div>
            )}
            
            {providers.tripadvisor.active && (
              <>
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600">+</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PlatformIcon platform="TripAdvisor" size={24} />
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">TripAdvisor</div>
                    <div className="text-xs text-gray-500">
                      {providers.tripadvisor.votes?.toLocaleString()} • {providers.tripadvisor.rating?.toFixed(1)}⭐
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Solo una plataforma */}
        {activePlatforms.length === 1 && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <PlatformIcon platform={providers.google.active ? "Google" : "TripAdvisor"} size={16} />
            <span>
              Datos de {providers.google.active ? 'Google My Business' : 'TripAdvisor'}
            </span>
          </div>
        )}
      </div>

      {/* Distribución de ratings */}
      {metrics.distribution && (
        <div className="py-4 border-b">
          <p className="text-sm text-gray-600 mb-3 font-medium">Distribución de reseñas:</p>
          <div className="space-y-2">
            {[5,4,3,2,1].map(star => {
              const count = metrics.distribution[star] || 0;
              const maxCount = Math.max(...Object.values(metrics.distribution).map(v => Number(v) || 0));
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="w-6 text-xs text-gray-600 font-medium text-right">
                    {star}★
                  </span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-12 text-xs text-gray-500 text-right font-medium">
                    {count.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Topics principales */}
      <div className="py-4">
        <p className="text-sm text-gray-600 mb-3 font-medium">Temas más mencionados:</p>
        {!topics.length ? (
          <div className="animate-pulse flex gap-2">
            <div className="h-8 bg-gray-200 rounded-full w-20"></div>
            <div className="h-8 bg-gray-200 rounded-full w-24"></div>
            <div className="h-8 bg-gray-200 rounded-full w-16"></div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topics.slice(0, 6).map(topic => (
              <span 
                key={topic.label} 
                className="px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-800 font-medium border border-blue-200"
              >
                {topic.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Loading indicator para reviews en background */}
      {loadingReviews && reviewsLoadingStep && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                {reviewsLoadingStep}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Los datos mostrados ya están disponibles. El procesamiento adicional continúa en segundo plano.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessPreview;
