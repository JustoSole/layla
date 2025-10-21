import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ProgressDashboardProps {
  totalReviews: number;
  reviewsWithResponse: number;
  urgentCount?: number;
  onViewUrgent?: () => void;
  isLoading?: boolean;
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  totalReviews,
  reviewsWithResponse,
  urgentCount = 0,
  onViewUrgent,
  isLoading = false
}) => {
  
  // Calcular métricas
  const responseRate = totalReviews > 0 
    ? Math.round((reviewsWithResponse / totalReviews) * 100) 
    : 0;

  // Milestones simples
  const milestones = [
    { threshold: 10, label: '10 reseñas respondidas', achieved: reviewsWithResponse >= 10 },
    { threshold: 50, label: '50 reseñas respondidas', achieved: reviewsWithResponse >= 50 },
    { threshold: 100, label: '100 reseñas respondidas', achieved: reviewsWithResponse >= 100 },
  ];

  const nextMilestone = milestones.find(m => !m.achieved);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-2 w-full bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Críticas urgentes - si hay */}
      {urgentCount > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  {urgentCount} crítica{urgentCount > 1 ? 's' : ''} pendiente{urgentCount > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-700">Requieren atención prioritaria</p>
              </div>
            </div>
            {onViewUrgent && (
              <button
                onClick={onViewUrgent}
                className="text-xs font-medium text-red-700 hover:text-red-800 whitespace-nowrap"
              >
                Ver →
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Separador si hay urgentes */}
      {urgentCount > 0 && <div className="border-t border-gray-200"></div>}

      {/* Reviews respondidas */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">Reviews respondidas</span>
          <span className="text-2xl font-bold text-gray-900">{reviewsWithResponse}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(responseRate, 100)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {responseRate}% de response rate
        </p>
      </div>

      {/* Next milestone */}
      {nextMilestone && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Próximo logro: {nextMilestone.label}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min((reviewsWithResponse / nextMilestone.threshold) * 100, 100)}%` 
                }}
              ></div>
            </div>
            <span className="text-xs font-medium text-gray-700">
              {reviewsWithResponse}/{nextMilestone.threshold}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;

