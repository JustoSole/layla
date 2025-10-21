import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from '../contexts/BusinessContext';

// Chips compactos para el Dashboard: resumen accionable
const ActionChips: React.FC = () => {
  const navigate = useNavigate();
  const { businessData, currentBusiness } = useBusinessContext();

  const rating = (currentBusiness?.rating as number | undefined) ?? 0;
  const analyzed = businessData?.analysis?.analyzed || (Array.isArray(businessData?.analysis) ? businessData.analysis.length : 0) || 0;
  const responded = (() => {
    const g = (businessData?.reviews as any)?.google?.reviews_preview || [];
    const t = ((businessData?.reviews as any)?.tripAdvisor || (businessData?.reviews as any)?.tripadvisor)?.reviews_preview || [];
    const all = [...g, ...t];
    if (all.length === 0) return 0;
    return Math.round((all.filter((r: any) => !!r.has_owner_response).length / all.length) * 100);
  })();

  // Total de reseñas (preferir contexto)
  // ✅ CORREGIDO: Usar rating_votes_count estandarizado
  const totalReviews = (currentBusiness?.totalReviews as number | undefined)
    ?? currentBusiness?.rating_votes_count
    ?? (((businessData?.reviews as any)?.google?.inserted || 0)
      + (((businessData?.reviews as any)?.tripAdvisor || (businessData?.reviews as any)?.tripadvisor)?.inserted || 0));

  const fiveStarsNeeded = (currentAvg: number, total: number, target: number) => {
    if (!isFinite(currentAvg) || !isFinite(total) || total < 1) return null;
    const sum = currentAvg * total;
    const denom = 5 - target;
    if (denom <= 0) return 0;
    const x = Math.ceil((target * total - sum) / denom);
    return Math.max(0, x);
  };

  const nextTenthTarget = Math.min(5, Math.floor(rating * 10) / 10 + 0.1);
  const needNext = fiveStarsNeeded(rating, totalReviews || 0, nextTenthTarget);
  const need45 = rating >= 4.5 ? 0 : (fiveStarsNeeded(rating, totalReviews || 0, 4.5) ?? null);

  // Competidor inmediato almacenado por CompetitorBenchmark
  const competitorHint = useMemo(() => {
    try {
      const raw = localStorage.getItem('reputacionlocal_next_competitor');
      if (!raw) return null;
      const next = JSON.parse(raw);
      const competitorRating: number = next.rating || 0;
      const needToBeat = competitorRating > rating ? fiveStarsNeeded(rating, totalReviews || 0, Math.min(5, competitorRating + 0.01)) : 0;
      return { name: next.name as string, need: needToBeat as number | null };
    } catch { return null; }
  }, [rating, totalReviews]);

  return (
    <div className="flex flex-wrap gap-2">
      <span className="px-3 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200">Rating {rating.toFixed(1)}</span>
      <span className="px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">Análisis {analyzed}</span>
      <button
        onClick={() => navigate('/reviews?filter=unanswered')}
        className={`px-3 py-1 rounded-full text-xs border ${responded >= 95 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
        title="Abrir pendientes por responder"
      >
        Respuesta {responded}%
      </button>
      {needNext !== null && (
        <button
          onClick={() => navigate('/reviews?filter=high')}
          className="px-3 py-1 rounded-full text-xs bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
          title="Reseñas 5★ necesarias para subir un decimal"
        >
          +{nextTenthTarget.toFixed(1)}: {needNext}×5★
        </button>
      )}
      {need45 !== null && rating < 4.5 && (
        <button
          onClick={() => navigate('/reviews?filter=high')}
          className="px-3 py-1 rounded-full text-xs bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
          title="Cuántas 5★ para llegar a 4.5"
        >
          4.5: {need45}×5★
        </button>
      )}
      {competitorHint && typeof competitorHint.need === 'number' && (
        <button
          onClick={() => navigate('/competitors')}
          className="px-3 py-1 rounded-full text-xs bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
          title="Ir a Competencia"
        >
          Superar a {competitorHint.name}: {competitorHint.need}×5★
        </button>
      )}
    </div>
  );
};

export default ActionChips;


