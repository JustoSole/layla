import React from 'react';
import { Star, MessageSquare, TrendingUp, BarChart3, Globe, Eye } from 'lucide-react';
import type { OnboardResponse, IngestResponse, AnalyzeResponse } from '../services/api';

interface DataStatsProps {
  businessData: {
    business: OnboardResponse | null;
    reviews: {
      google: IngestResponse | null;
      tripadvisor: IngestResponse | null;
    };
    analysis: AnalyzeResponse | null;
  };
  isVisible: boolean;
}

const DataStats: React.FC<DataStatsProps> = ({ businessData, isVisible }) => {
  if (!isVisible || !businessData.business) return null;

  const { business, reviews, analysis } = businessData;
  const totalReviews = (reviews.google?.inserted || 0) + (reviews.tripadvisor?.inserted || 0);
  
  // ✅ CORREGIDO: Usar rating directamente desde business_info
  const avgRating = (business as any)?.business_info?.rating || 0;
  
  const sentimentDist = (analysis as any)?.summary?.sentiment_distribution ?? { positive: 0, neutral: 0, negative: 0 };
  const totalAspects = (analysis as any)?.summary?.total_aspects_found ?? 0;

  const stats = [
    {
      icon: Globe,
      label: 'Business Registrado',
      value: business.business_info?.name || 'N/A',
      subValue: `ID: ${business.external_place_id}`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      icon: MessageSquare,
      label: 'Total Reviews',
      value: totalReviews.toString(),
      subValue: `Google: ${reviews.google?.inserted || 0} • TripAdvisor: ${reviews.tripadvisor?.inserted || 0}`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      icon: Star,
      label: 'Rating Promedio',
      value: avgRating ? `${avgRating.toFixed(1)}★` : 'N/A',
      // ✅ CORREGIDO: Usar totalReviews calculado en lugar de rating_summary
      subValue: `${totalReviews} votos total`,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      icon: TrendingUp,
      label: 'Reviews Analizadas',
      value: analysis?.analyzed?.toString() || '0',
      subValue: analysis ? 
        `${sentimentDist.positive} positivas, ${sentimentDist.negative} negativas` :
        'Sin análisis',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ];

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-cyan-50 rounded-xl border border-indigo-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Datos del Backend Conectados
          </h3>
          {business.mock_mode && (
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
              MODO DESARROLLO
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Última sincronización</div>
          <div className="text-sm font-medium text-gray-900">
            {new Date().toLocaleTimeString('es-ES')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {stats.map((stat, index) => (
          <div key={index} className={`${stat.bgColor} ${stat.borderColor} border rounded-lg p-3`}>
            <div className="flex items-center space-x-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-sm font-medium text-gray-700">{stat.label}</span>
            </div>
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-600 mt-1">{stat.subValue}</div>
          </div>
        ))}
      </div>

      {/* Reviews Preview */}
      {(reviews.google || reviews.tripadvisor) && (
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center space-x-2 mb-3">
            <Eye className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Preview de Reviews</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {reviews.google && reviews.google.reviews_preview && (
              <div className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span className="text-sm font-medium text-gray-700">Google Reviews</span>
                  <span className="text-xs text-gray-500">({reviews.google.inserted} ingresadas)</span>
                </div>
                <div className="space-y-2">
                  {reviews.google.reviews_preview.slice(0, 2).map((review, idx) => (
                    <div key={idx} className="text-xs text-gray-600 border-l-2 border-gray-200 pl-2">
                      <div className="font-medium">{review.author} • {review.rating}★</div>
                      <div className="text-gray-500 truncate">{review.text_preview}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviews.tripadvisor && reviews.tripadvisor.reviews_preview && (
              <div className="bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span className="text-sm font-medium text-gray-700">TripAdvisor Reviews</span>
                  <span className="text-xs text-gray-500">({reviews.tripadvisor.inserted} ingresadas)</span>
                </div>
                <div className="space-y-2">
                  {reviews.tripadvisor.reviews_preview.slice(0, 2).map((review, idx) => (
                    <div key={idx} className="text-xs text-gray-600 border-l-2 border-gray-200 pl-2">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{review.author} • {review.rating}★</span>
                        {review.has_owner_response && (
                          <span className="bg-blue-100 text-blue-700 px-1 rounded text-xs">Respondida</span>
                        )}
                      </div>
                      <div className="text-gray-500 truncate">{review.text_preview}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Summary */}
      {analysis && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Resumen del Análisis</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-lg font-bold text-green-600">
                {sentimentDist.positive}
              </div>
              <div className="text-xs text-green-700">Positivas</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-lg font-bold text-gray-600">
                {sentimentDist.neutral}
              </div>
              <div className="text-xs text-gray-700">Neutrales</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-lg font-bold text-red-600">
                {sentimentDist.negative}
              </div>
              <div className="text-xs text-red-700">Negativas</div>
            </div>
          </div>
          
          <div className="mt-3 text-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{totalAspects}</span> aspectos totales extraídos
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataStats;
