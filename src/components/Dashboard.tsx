import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import TrendChart from './TrendChart';
import DailyDigest from './DailyDigest';
import { useEffect as useReactEffect, useState as useReactState } from 'react';
import { loadCompleteBusinessData } from '../lib/dataLayer';
import { useBusinessContext } from '../contexts/BusinessContext';
import { useFilters } from '../contexts/FilterContext';
import FilterBar from './FilterBar';
import { ReviewData } from '../types/schema';
import { mockReviewsData } from '../mocks';
import { DEMO_MODE, MOCK_NETWORK_DELAY } from '../config/demo';

type DashboardTopic = {
  name: string;
  count: number;
  sentiment: number;
  positivePct?: number; // ✅ Agregado para almacenar % positivo real
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentBusiness, businessData } = useBusinessContext();
  const { selectedPeriod, selectedSource, customRange } = useFilters();
  const [realLast7, setRealLast7] = useReactState(0);
  const [realLast30, setRealLast30] = useReactState(0);
  const [realLowRating, setRealLowRating] = useReactState(0);
  const [realTopics, setRealTopics] = useReactState<DashboardTopic[]>([]);
  const [criticalCount, setCriticalCount] = useReactState(0);
  const [allReviews, setAllReviews] = useReactState<ReviewData[]>([]);
  const [lastUpdated, setLastUpdated] = useReactState<string>('');
  // ✅ Estado de carga para evitar "flash" del score
  const [isLoadingKPIs, setIsLoadingKPIs] = useReactState(true);

  // Cargar datos reales o mock para KPIs (últimos 7/30 días, ≤3★, temas)
  useReactEffect(() => {
    setIsLoadingKPIs(true);
    
    (async () => {
      try {
        let reviews: ReviewData[] = [];
        let analysis: any[] = [];
        
        // 🎬 MODO DEMO: Usar mock data
        if (DEMO_MODE.enabled) {
          await new Promise(resolve => setTimeout(resolve, MOCK_NETWORK_DELAY));
          
          // Convertir mock data al formato esperado
          reviews = mockReviewsData.map((r: any) => ({
            id: r.id,
            external_place_id: r.external_place_id,
            author_name: r.author_name,
            rating_value: r.rating_value,
            review_text: r.review_text,
            provider: r.provider,
            posted_at: r.posted_at,
            owner_answer: r.owner_answer,
            owner_posted_at: r.owner_posted_at,
            images: r.images,
            sentiment: r.sentiment,
            aspects: r.aspects,
            overall_score: r.overall_score,
            overall_sentiment_confidence: r.overall_sentiment_confidence,
            gap_to_five: r.gap_to_five,
            gap_reasons: r.gap_reasons,
            critical_flags: r.critical_flags,
            executive_summary: r.executive_summary,
            action_items: r.action_items,
            language: r.language
          }));
          
          // Mock analysis data basado en las reviews
          analysis = mockReviewsData.map(r => ({
            aspects: r.aspects || []
          }));
          
          console.log(`✅ Using ${reviews.length} MOCK reviews for Dashboard KPIs`);
        } else {
          // Modo producción: cargar datos reales
          const ep = currentBusiness?.external_place_id || currentBusiness?.placeId;
          if (!ep) {
            setIsLoadingKPIs(false);
            return;
          }
          
          const complete = await loadCompleteBusinessData(ep);
          reviews = complete.reviews || [];
          analysis = complete.analysis || [];
        }
        
        // Para modo demo, usar fecha base consistente con mock data
        const baseDate = DEMO_MODE.enabled 
          ? new Date('2025-08-20T12:00:00Z').getTime() 
          : Date.now();
        const last7 = baseDate - 7 * 86400000;
        const last30 = baseDate - 30 * 86400000;
        
        // Guardar todas las reviews para DailyDigest
        setAllReviews(reviews);
        
        // Timestamp de actualización
        const updateTime = new Date();
        const minutes = Math.floor((Date.now() - updateTime.getTime()) / 60000);
        setLastUpdated(minutes < 1 ? 'ahora' : `hace ${minutes} min`);
        
        const inRange = (ts?: string | null, fromMs?: number) => ts ? new Date(ts).getTime() >= (fromMs || 0) : false;
        const last7Count = reviews.filter(r => inRange(r.posted_at, last7)).length;
        const last30Count = reviews.filter(r => inRange(r.posted_at, last30)).length;
        const lowRatingCount = reviews.filter(r => (r.rating_value || 0) <= 3).length;
        // ✅ críticas sin responder (sentiment negativo según NLP + sin owner_answer)
        const critical = reviews.filter(r => r.sentiment === 'negative' && !r.owner_answer).length;
        
        setRealLast7(last7Count);
        setRealLast30(last30Count);
        setRealLowRating(lowRatingCount);
        setCriticalCount(critical);
        
        // ✅ Temas con sentimiento real calculado desde análisis
        const aspectStats = new Map<string, { count: number; positive: number; negative: number }>();
        analysis.forEach((a: any) => {
          const arr = Array.isArray(a.aspects) ? a.aspects : [];
          arr.forEach((as: any) => {
            const key = typeof as === 'string' ? as : (as.aspect || as.name || 'otros');
            const sentiment = typeof as === 'object' ? as.sentiment : 'neutral';
            const stats = aspectStats.get(key) || { count: 0, positive: 0, negative: 0 };
            stats.count++;
            if (sentiment === 'positive') stats.positive++;
            if (sentiment === 'negative') stats.negative++;
            aspectStats.set(key, stats);
          });
        });
        
        const top = Array.from(aspectStats.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 6)
          .map(([name, stats]) => ({
            name,
            count: stats.count,
            sentiment: stats.positive > stats.negative ? 1 : stats.positive === stats.negative ? 0 : -1,
            positivePct: Math.round((stats.positive / stats.count) * 100),
            suggestion: `Mejorar ${name}`,
            priority: 'high' as const
          }));
        setRealTopics(top);
      } catch (e) {
        // fallback a ceros
        setRealLast7(0); setRealLast30(0); setRealLowRating(0); setCriticalCount(0); setRealTopics([]);
        setAllReviews([]);
      } finally {
        // ✅ Marcar como completado
        setIsLoadingKPIs(false);
      }
    })();
  }, [currentBusiness?.external_place_id, currentBusiness?.placeId]);

  // Datos derivados del contexto (sin mocks)
  // ✅ CORREGIDO: Usar rating del currentBusiness (interface Business)
  const ratingFromBackend = currentBusiness?.rating 
    ?? (businessData.business as any)?.business_info?.rating 
    ?? 0;
  
  // ✅ CORREGIDO: Usar rating_votes_count estandarizado (interface Business)
  const votesFromBackend = currentBusiness?.rating_votes_count
    ?? currentBusiness?.totalReviews
    ?? ((businessData.reviews as any)?.google?.inserted || 0)
    + ((businessData.reviews as any)?.tripadvisor?.inserted || 0);
  
  // ✅ CORREGIDO: Obtener distribución desde google_ratings o business_info
  const distributionFromBackend = currentBusiness?.google_ratings?.rating_distribution 
    ?? (businessData.business as any)?.business_info?.rating_distribution 
    ?? {};
  // Normalizar distribución a shape {5,4,3,2,1}
  const normalizedDist = [5,4,3,2,1].reduce((acc, star) => {
    const key = String(star);
    acc[star as 1|2|3|4|5] = Number((distributionFromBackend?.[key] ?? 0)) || 0;
    return acc;
  }, { 5:0,4:0,3:0,2:0,1:0 } as Record<1|2|3|4|5, number>);

  const dashboardData = {
    business: {
      name: currentBusiness?.name || (businessData.business as any)?.business_info?.name || '',
      city: '',
      isOpen: true,
      lastUpdate: ''
    },
    ratingTrend: {
      current: Number(ratingFromBackend) || 0,
      change: 0,
      period: '',
      topComplaint: '',
      votesCount: Number(votesFromBackend) || (currentBusiness?.totalReviews || 0),
      competitiveContext: '',
      vsCompetitors: ''
    },
    ratingDistribution: normalizedDist,
    topics: realTopics,
    recentReviews: {
      last7Days: realLast7,
      last30Days: realLast30,
      lowRating: realLowRating,
      reviewsPerMonth: 0,
      competitiveMomentum: '',
      reviews: [] as any[]
    },
    alerts: {
      criticalReviews: criticalCount,
      unansweredQuestions: 0,
      competitiveInsight: {
        negativePercent: 0,
        competitorsOutperforming: 0,
        totalCompetitors: 0
      }
    },
    sentiment: {
      positive: 0,
      neutral: 0,
      negative: 0,
      positiveTopics: [] as string[],
      negativeTopics: [] as string[]
    },
    responseMetrics: {
      responseRate: 0,
      avgResponseTime: 0,
      industryAvgResponseRate: 0,
      industryAvgResponseTime: 0,
      criticalResponseTime: 0
    },
    velocity: {
      currentMonthly: 0,
      trendChange: 0,
      competitiveAverage: 0,
      seasonalityFactor: '',
      momentum: 'declining' as 'declining' | 'improving' | 'stable'
    },
    competitive: {
      localPosition: 0,
      totalCompetitors: 0,
      gapToLeader: 0,
      leadingIn: [] as string[],
      laggingIn: [] as string[]
    }
  };

  // ✅ OPTIMIZADO: Memoizar cálculo del Health Score para evitar "flash"
  const healthScore = useMemo(() => {
    // Si está cargando, mantener el score anterior o mostrar un placeholder
    if (isLoadingKPIs) {
      return null; // Retornar null para mostrar skeleton
    }
    
    // Usar datos reales del business actual
    const rating = currentBusiness?.rating || 0;
    const totalReviews = currentBusiness?.totalReviews || 0;
    const ratingChange = 0;
    
    // 1. Score base de rating (40% del peso total)
    const ratingScore = (rating / 5) * 40;
    
    // 2. Score de recencia - reseñas recientes pesan más (20%)
    const recentReviews = realLast7 + (realLast30 * 0.5);
    const recencyScore = Math.min(recentReviews / 20 * 20, 20);
    
    // 3. Score de volumen total (15%)
    const volumeScore = Math.min((Math.sqrt(totalReviews) / Math.sqrt(150)) * 15, 15);
    
    // 4. Factor de momentum - tendencia positiva/negativa (15%)
    const momentumScore = ratingChange > 0 ? 15 : 
                         ratingChange > -0.1 ? 10 : 
                         ratingChange > -0.2 ? 5 : 0;
    
    // 5. Score de gestión - penaliza reseñas críticas sin responder (10%)
    const managementScore = Math.max(0, 10 - (criticalCount * 3));
    
    // Score final con límites
    const finalScore = Math.max(10, Math.min(100, 
      ratingScore + recencyScore + volumeScore + momentumScore + managementScore
    ));
    
    return Math.round(finalScore);
  }, [
    isLoadingKPIs,
    currentBusiness?.rating,
    currentBusiness?.totalReviews,
    realLast7,
    realLast30,
    criticalCount
  ]);
  
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-700 bg-green-100 border-green-200';
    if (score >= 60) return 'text-orange-700 bg-orange-100 border-orange-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  const getHealthScoreStatus = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Regular';
    return 'Necesita atención';
  };

  const handleTopicFilter = (topic: string) => {
    navigate(`/reviews?topic=${encodeURIComponent(topic)}`);
  };

  const handleViewCriticalReviews = () => {
    navigate('/reviews?filter=urgent');
  };

  // Calcular sentimiento positivo/neutro/negativo estimados
  const positivePct = Math.round((dashboardData.ratingTrend.current / 5) * 100);
  const negativePct = Math.max(10, Math.round(dashboardData.recentReviews.lowRating / Math.max(1, dashboardData.ratingTrend.votesCount) * 100));
  const neutralPct = Math.max(0, 100 - positivePct - negativePct);

  return (
    <div className="space-y-6">
      {/* Filtros globales */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <FilterBar />
      </div>

      {/* 1️⃣ BLOQUE: Clima General - Cómo te perciben hoy */}
      <section className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-blue-50/30 p-8 shadow-sm">
        {/* Header con título */}
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Cómo te perciben hoy</h2>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Sentiment Index */}
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Health Score</h3>
            <div className="flex items-baseline gap-3 mb-3">
              {/* ✅ Mostrar skeleton mientras carga */}
              {healthScore === null ? (
                <>
                  <div className="h-12 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <span className="text-xl text-gray-400">/ 100</span>
                  <div className="h-7 w-24 bg-gray-200 rounded-full animate-pulse"></div>
                </>
              ) : (
                <>
                  <span className="text-5xl font-bold text-gray-900">{healthScore}</span>
                  <span className="text-xl text-gray-500">/ 100</span>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getHealthScoreColor(healthScore)}`}>
                    {getHealthScoreStatus(healthScore)}
                  </div>
                </>
              )}
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Predominan reseñas <span className="font-semibold">{positivePct >= 70 ? 'positivas' : positivePct >= 50 ? 'equilibradas' : 'con oportunidad de mejora'}</span> sobre {realTopics[0]?.name || 'tu servicio'}.
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Basado en las últimas {dashboardData.ratingTrend.votesCount} reseñas
            </p>
          </div>
          
          {/* Distribución emocional */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">{positivePct}%</p>
              <p className="text-xs text-gray-600">Positivas</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <div className="w-8 h-1 bg-gray-600 rounded"></div>
              </div>
              <p className="text-2xl font-bold text-gray-700">{neutralPct}%</p>
              <p className="text-xs text-gray-600">Neutras</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-2">
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-700">{negativePct}%</p>
              <p className="text-xs text-gray-600">Negativas</p>
            </div>
          </div>
        </div>

        {/* Microcopy interpretativo */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          {/* ✅ Mostrar microcopy solo cuando healthScore está cargado */}
          {healthScore !== null && (
            <p className="text-sm text-gray-700 italic">
              "{healthScore >= 75 ? 'Tu negocio transmite una imagen positiva y consistente. Los clientes destacan tu atención.' : 
                healthScore >= 50 ? 'Tu reputación está en buen camino. Algunas áreas necesitan atención para llegar a excelencia.' :
                'Hay oportunidades importantes de mejora. Enfócate en resolver los puntos críticos.'}"
            </p>
          )}
        </div>

        {/* Daily Digest - Métricas comparativas */}
        {isLoadingKPIs ? (
          <div className="mt-6 pt-6 border-t border-gray-200/50">
            <div className="mb-3">
              <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        ) : allReviews.length > 0 ? (
          <div className="mt-6 pt-6 border-t border-gray-200/50">
            <DailyDigest 
              reviews={allReviews}
              selectedPeriod={selectedPeriod}
              selectedSource={selectedSource}
              lastUpdated={lastUpdated}
            />
          </div>
        ) : null}
      </section>

      {/* 2️⃣ BLOQUE: Temas que mueven tu reputación */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Por qué te califican así</h2>
        <p className="text-sm text-gray-600 mb-4">Temas más mencionados en tus reseñas</p>
        
        <div className="space-y-3">
          {/* ✅ Mostrar skeleton mientras carga */}
          {isLoadingKPIs ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))
          ) : (
            realTopics.slice(0, 6).map((topic, idx) => {
              // ✅ Usar valores reales calculados desde el análisis
              const positivePct = topic.positivePct ?? (topic.sentiment >= 0 ? 85 : 45);
              const change = topic.sentiment > 0 ? 2 : topic.sentiment < 0 ? -5 : 0;
              
              return (
                <div key={topic.name} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-gray-700">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 capitalize">{topic.name}</h3>
                        <span className="text-xs text-gray-500">({topic.count} menciones)</span>
                      </div>
                      <p className="text-xs text-gray-600">{positivePct >= 70 ? 'Fortaleza destacada' : positivePct >= 50 ? 'Desempeño aceptable' : 'Requiere atención'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${positivePct >= 70 ? 'text-green-600' : positivePct >= 50 ? 'text-gray-600' : 'text-red-600'}`}>
                      {positivePct}% positiva
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${change > 0 ? 'bg-green-100 text-green-700' : change < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {change > 0 ? `↑ +${change}%` : change < 0 ? `↓ ${change}%` : '='}
                    </span>
                    <button
                      onClick={() => handleTopicFilter(topic.name)}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Ver reseñas
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Microcopy */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-700 italic">
            {realTopics[0]?.name && `"${realTopics[0].name} es tu fortaleza. ${realTopics[2]?.name ? `${realTopics[2].name} sigue siendo punto de fricción.` : ''}"`}
          </p>
          </div>
      </section>

      {/* 3️⃣ BLOQUE: Acciones urgentes - Qué deberías hacer hoy */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Qué deberías hacer hoy</h2>
        <p className="text-sm text-gray-600 mb-4">Tareas concretas para mejorar tu reputación</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Acción 1: Responder críticas */}
          {criticalCount > 0 && (
            <div className="border-2 border-red-200 bg-red-50 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-red-900">Responder reseñas críticas sin respuesta</h3>
                <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">{criticalCount}</span>
              </div>
              <p className="text-sm text-red-800 mb-3">Responder en menos de 48h mejora tu score hasta +5 pts.</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-700 font-medium">Impacto: Alto</span>
                <button 
                  onClick={handleViewCriticalReviews}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium"
                >
                  Abrir bandeja crítica
                </button>
              </div>
            </div>
          )}

          {/* Acción 2: Nuevo tema negativo */}
          {realLast7 > 0 && (
            <div className="border-2 border-orange-200 bg-orange-50 rounded-xl p-4">
              <h3 className="font-semibold text-orange-900 mb-2">Nuevo tema detectado</h3>
              <p className="text-sm text-orange-800 mb-3">"{realTopics[0]?.name || 'Varios aspectos'}" mencionado más esta semana.</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-orange-700 font-medium">Impacto: Medio</span>
                <button
                  onClick={() => navigate('/reviews')}
                  className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 font-medium"
                >
                  Ver reseñas
                </button>
              </div>
            </div>
          )}

          {/* Acción 3: Agradecer positivas */}
          <div className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
            <h3 className="font-semibold text-green-900 mb-2">Agradecer reseñas positivas recientes</h3>
            <p className="text-sm text-green-800 mb-3">Fortalece relaciones con clientes fieles.</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-700 font-medium">Impacto: Reputacional</span>
              <button
                onClick={() => navigate('/reviews?filter=positive')}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
              >
                Ver reseñas
              </button>
            </div>
          </div>
        </div>

        {/* Microcopy */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-700 italic">"Acciones rápidas = mejoras visibles. Concentrate en las que tienen mayor impacto."</p>
        </div>
      </section>

      {/* 4️⃣ BLOQUE: Tendencia reciente */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Cómo viene cambiando tu reputación</h2>
        <p className="text-sm text-gray-600 mb-4">Evolución en las últimas semanas</p>
        
        <TrendChart 
          loading={!currentBusiness} 
          selectedPeriod={selectedPeriod}
          selectedSource={selectedSource}
          customRange={customRange}
        />

        {/* Comentarios interpretativos */}
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-700 flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Mejora constante desde hace algunas semanas tras responder reseñas críticas.</span>
          </p>
          <p className="text-sm text-gray-600 italic mt-3">"Tu reputación muestra una tendencia positiva. Seguí respondiendo rápido y controlando los puntos críticos."</p>
        </div>
      </section>

      {/* 6️⃣ BLOQUE: Acciones para mejorar tu reputación */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones para mejorar tu reputación</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Campaign Quick Stats */}
          <button
            onClick={() => navigate('/campaigns')}
            className="group rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 hover:border-emerald-400 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">📲 Solicitar más reseñas</h3>
                <p className="text-sm text-gray-600">Campañas con QR y links únicos</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-white rounded-lg p-2 border border-emerald-100">
                <div className="text-lg font-bold text-emerald-700">3</div>
                <div className="text-[10px] text-gray-600">Campañas</div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-emerald-100">
                <div className="text-lg font-bold text-emerald-700">140</div>
                <div className="text-[10px] text-gray-600">Ratings</div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-emerald-100">
                <div className="text-lg font-bold text-emerald-700">73%</div>
                <div className="text-[10px] text-gray-600">Conversión</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-emerald-700 font-medium">
              → Ver todas las campañas
            </div>
          </button>

          {/* Staff Quick Stats */}
          <button
            onClick={() => navigate('/team')}
            className="group rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 hover:border-orange-400 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">👥 Desempeño del equipo</h3>
                <p className="text-sm text-gray-600">Menciones en reseñas</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-orange-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-white rounded-lg p-2 border border-orange-100">
                <div className="text-lg font-bold text-orange-700">4</div>
                <div className="text-[10px] text-gray-600">Miembros</div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-orange-100">
                <div className="text-lg font-bold text-orange-700">40</div>
                <div className="text-[10px] text-gray-600">Menciones</div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-orange-100">
                <div className="text-lg font-bold text-orange-700">87%</div>
                <div className="text-[10px] text-gray-600">Positivas</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-orange-700 font-medium">
              → Ver desempeño completo
            </div>
          </button>
        </div>
      </section>

      {/* Más herramientas */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Más herramientas</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => navigate('/insights')}
            className="group rounded-xl border-2 border-blue-200 bg-white p-4 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Insights Completos</h3>
              <ArrowUpRight className="h-5 w-5 text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <p className="text-sm text-gray-600">Análisis histórico profundo</p>
          </button>

          <button
            onClick={() => navigate('/competitors')}
            className="group rounded-xl border-2 border-purple-200 bg-white p-4 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Competencia</h3>
              <ArrowUpRight className="h-5 w-5 text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <p className="text-sm text-gray-600">Benchmarking vs competidores</p>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="group rounded-xl border-2 border-indigo-200 bg-white p-4 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Reportes</h3>
              <ArrowUpRight className="h-5 w-5 text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <p className="text-sm text-gray-600">Exporta análisis y datos</p>
          </button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;