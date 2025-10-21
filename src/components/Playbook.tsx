import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBusinessContext } from '../contexts/BusinessContext';
import { CheckSquare, Square, AlertTriangle } from 'lucide-react';

/**
 * Playbook principal: vista enfocada en acción.
 * Usa datos disponibles: rating, reviews/semana, respuesta, y análisis (sentiment/aspects) del negocio.
 * Modo filtrado por área via query param ?area=competencia|respuesta|volumen
 */
const Playbook: React.FC = () => {
  const navigate = useNavigate();
  const { businessData, currentBusiness } = useBusinessContext();
  const [params] = useSearchParams();
  const area = params.get('area');

  // Colores utilitarios (evita clases dinámicas de Tailwind)
  const colorClasses: Record<string, { bg: string; text: string; btn: string; btnHover: string; header: string }> = {
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', btn: 'bg-purple-600', btnHover: 'hover:bg-purple-700', header: 'text-purple-900' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', btn: 'bg-blue-600', btnHover: 'hover:bg-blue-700', header: 'text-blue-900' },
    green: { bg: 'bg-green-50', text: 'text-green-700', btn: 'bg-green-600', btnHover: 'hover:bg-green-700', header: 'text-green-900' },
  };

  // Rating base (preferir contexto del negocio)
  const rating = (currentBusiness?.rating as number | undefined)
    ?? (businessData?.business?.business_info?.rating as number | undefined)
    ?? 0;

  // Reviews preview combinadas (si existen en el estado)
  const reviewPreviews = useMemo(() => {
    const g = (businessData?.reviews as any)?.google?.reviews_preview || [];
    const t = ((businessData?.reviews as any)?.tripAdvisor || (businessData?.reviews as any)?.tripadvisor)?.reviews_preview || [];
    return [...g, ...t];
  }, [businessData.reviews]);

  const pendingResponses = useMemo(() => {
    // ✅ Usar sentiment NLP para identificar críticas sin responder
    return reviewPreviews.filter((r: any) => !r.has_owner_response && r.sentiment === 'negative').length;
  }, [reviewPreviews]);

  const weeklyReviews = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const withDates = reviewPreviews.filter((r: any) => !!r.posted_at);
    if (withDates.length > 0) {
      return withDates.filter((r: any) => new Date(r.posted_at).getTime() >= sevenDaysAgo).length;
    }
    const insertedGoogle = (businessData?.reviews as any)?.google?.inserted || 0;
    const insertedTA = ((businessData?.reviews as any)?.tripAdvisor || (businessData?.reviews as any)?.tripadvisor)?.inserted || 0;
    return Math.max(0, Math.round((insertedGoogle + insertedTA) / 4));
  }, [reviewPreviews, businessData.reviews]);

  // Última reseña para recordatorio 72h
  const lastReviewHours = useMemo(() => {
    const all = reviewPreviews.filter((r: any) => !!r.posted_at);
    if (all.length === 0) return Infinity;
    const newest = Math.max(...all.map((r: any) => new Date(r.posted_at).getTime()));
    return Math.round((Date.now() - newest) / (1000 * 60 * 60));
  }, [reviewPreviews]);

  // Análisis (sentimiento/aspectos) — soporta múltiples formatos
  const analysis: any = businessData.analysis || {};

  const sentimentBreakdown = useMemo(() => {
    const sum = analysis?.summary?.sentiment_distribution;
    if (sum) return sum;
    const pr = analysis?.processed_reviews as any[] | undefined;
    if (Array.isArray(pr)) {
      return pr.reduce((acc: any, r: any) => {
        const s = r.sentiment || 'neutral';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
    }
    const arr = Array.isArray(analysis) ? analysis : [];
    if (arr.length > 0) {
      return arr.reduce((acc: any, r: any) => {
        const s = r.sentiment || 'neutral';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
    }
    return { positive: 0, neutral: 0, negative: 0 };
  }, [analysis]);

  const topAspects = useMemo(() => {
    const counts: Record<string, number> = {};
    const pr = analysis?.processed_reviews as any[] | undefined;
    if (Array.isArray(pr)) {
      pr.forEach((r: any) => (r.top_aspects || []).forEach((a: string) => { counts[a] = (counts[a] || 0) + 1; }));
    }
    const arr = Array.isArray(analysis) ? analysis : [];
    if (arr.length > 0) {
      arr.forEach((r: any) => (r.aspects || []).forEach((a: any) => {
        const key = typeof a === 'string' ? a : (a.aspect || 'aspecto');
        counts[key] = (counts[key] || 0) + 1;
      }));
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [analysis]);

  const responseRate = useMemo(() => {
    const total = reviewPreviews.length;
    if (total === 0) return 0;
    const responded = reviewPreviews.filter((r: any) => !!r.has_owner_response).length;
    return Math.round((responded / total) * 100);
  }, [reviewPreviews]);

  // Checklist con persistencia local (por simplicidad)
  type TaskKey = `${string}:${number}`;
  const [done, setDone] = useState<Record<TaskKey, boolean>>({});
  useEffect(() => {
    try {
      const saved = localStorage.getItem('playbook_tasks');
      if (saved) setDone(JSON.parse(saved));
    } catch {}
  }, []);
  const toggle = (key: TaskKey) => {
    setDone(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('playbook_tasks', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Cálculo de cuántas 5★ se necesitan para alcanzar un objetivo de rating
  const fiveStarsNeeded = (currentAvg: number, total: number, target: number) => {
    const sum = currentAvg * total;
    const denom = 5 - target;
    if (denom <= 0) return 0;
    const x = Math.ceil((target * total - sum) / denom);
    return Math.max(0, x);
  };

  // ✅ CORREGIDO: Usar rating_votes_count estandarizado
  const totalReviews = (currentBusiness?.totalReviews as number | undefined)
    ?? currentBusiness?.rating_votes_count
    ?? (((businessData?.reviews as any)?.google?.inserted || 0)
      + (((businessData?.reviews as any)?.tripAdvisor || (businessData?.reviews as any)?.tripadvisor)?.inserted || 0));

  const nextTenthTarget = Math.min(5, Math.floor(rating * 10) / 10 + 0.1);
  const needForNextTenth = fiveStarsNeeded(rating, totalReviews || 0, nextTenthTarget);
  const needFor45 = rating >= 4.5 ? 0 : fiveStarsNeeded(rating, totalReviews || 0, 4.5);

  // Meta para superar al siguiente competidor (si el ranking la guardó)
  let competitorHint: { name: string; need5Stars: number } | null = null;
  try {
    const raw = localStorage.getItem('reputacionlocal_next_competitor');
    if (raw) {
      const next = JSON.parse(raw);
      const competitorRating: number = next.rating || 0;
      const needToBeat = competitorRating > rating ? fiveStarsNeeded(rating, totalReviews || 0, Math.min(5, competitorRating + 0.01)) : 0;
      competitorHint = { name: next.name, need5Stars: Math.max(0, needToBeat) };
    }
  } catch {}

  const sections = [
    {
      id: 'rating',
      title: 'Rating: subir a 4.3 este mes',
      color: 'purple',
      kpi: `Actual: ${rating.toFixed ? rating.toFixed(1) : rating} • Negativas: ${sentimentBreakdown.negative || 0}`,
      tasks: [
        'Entregar tarjetas QR en caja/mesas',
        'Pedir reseña después de pagos (POS/WhatsApp)',
        'Responder 100% de ≤3★ en 24h'
      ],
      cta: { label: 'Ir a reseñas ≤3★', to: '/reviews' }
    },
    {
      id: 'volumen',
      title: 'Volumen: 4 reseñas por semana',
      color: 'blue',
      kpi: `Esta semana: ${weeklyReviews}/4`,
      tasks: [
        'Pedir reseñas a clientes frecuentes',
        'Activar recordatorio diario automático',
        'Publicar QR en redes/biografía'
      ],
      cta: { label: 'Ver últimos 7 días', to: '/reviews' }
    },
    {
      id: 'respuesta',
      title: 'Respuesta: 95% en ≤1 día',
      color: 'green',
      kpi: `Pendientes: ${pendingResponses} • Tasa: ${responseRate}%`,
      tasks: [
        'Responder pendientes de hoy',
        'Configurar plantillas rápidas (positiva/neutral/negativa)',
        'Activar alertas de nuevas reseñas'
      ],
      cta: { label: 'Abrir pendientes', to: '/reviews' }
    }
  ].filter(s => !area || s.id === area);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900">Playbook</h1>
        <p className="text-sm text-gray-600">Qué hacer hoy para mejorar tu posición y reputación.</p>
      </div>

      {sections.map(section => {
        const cls = colorClasses[section.color];
        return (
          <div key={section.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`px-4 py-3 border-b border-gray-200 ${cls.bg} flex items-center justify-between`}>
              <div className={`${cls.header} font-semibold`}>{section.title}</div>
              <div className={`text-xs ${cls.text}`}>{section.kpi}</div>
            </div>
            <div className="p-4 space-y-3">
              {section.id === 'rating' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    Para {nextTenthTarget.toFixed(1)}: {needForNextTenth} × 5★
                  </span>
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                    Para 4.5: {needFor45} × 5★
                  </span>
                  {competitorHint && (
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      Superar a {competitorHint.name}: {competitorHint.need5Stars} × 5★
                    </span>
                  )}
                </div>
              )}
              {/* Meta semanal badge (solo Volumen) */}
              {section.id === 'volumen' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded-full ${weeklyReviews >= 4 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {weeklyReviews >= 4 ? 'Meta semanal lograda' : `Faltan ${Math.max(0, 4 - weeklyReviews)}`}
                  </span>
                </div>
              )}

              {section.tasks.map((t, i) => {
                const key = `${section.id}:${i}` as TaskKey;
                const checked = !!done[key];
                return (
                  <button key={i} onClick={() => toggle(key)} className="flex items-center space-x-2 text-sm w-full text-left">
                    {checked ? <CheckSquare className="h-4 w-4 text-green-600" /> : <Square className="h-4 w-4 text-gray-300" />}
                    <span className={checked ? 'line-through text-gray-400' : ''}>{t}</span>
                  </button>
                );
              })}
              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-gray-600">Consejo: prioriza tareas que impacten rating y respuesta.</div>
                <button onClick={() => navigate(section.id === 'rating' ? '/reviews?filter=low' : section.id === 'respuesta' ? '/reviews?filter=unanswered' : '/reviews')}
                  className={`text-xs ${cls.btn} ${cls.btnHover} text-white px-3 py-1 rounded-md`}>{section.cta.label}</button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-900">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div className="text-sm">
            {lastReviewHours > 72 && (
              <div className="mb-2"><span className="font-semibold">Hace {Math.floor(lastReviewHours/24)} días</span> que no recibes reseñas. Activa el plan de Volumen hoy.</div>
            )}
            Mejores prácticas para pymes:
            <ul className="list-disc list-inside mt-1">
              <li>Responde siempre: prioriza negativas (≤3★) en 24h con tono empático.</li>
              <li>Pide reseñas en el momento de mayor satisfacción (pago/entrega).</li>
              <li>Facilita el camino: QR visible, link corto en bio y WhatsApp prearmado.</li>
              <li>Aprende de aspectos frecuentes para mejoras rápidas (servicio/tiempos).</li>
              <li>Evita incentivos por reseñas: incumplen políticas y arriesgan el perfil.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Aspectos más mencionados</h2>
        <div className="flex flex-wrap gap-2">
          {topAspects.length === 0 ? (
            <span className="text-xs text-gray-500">Aún no hay suficientes análisis para mostrar aspectos.</span>
          ) : (
            topAspects.map(a => (
              <span key={a.name} className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                {a.name} · {a.count}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Playbook;


