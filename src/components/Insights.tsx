import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from '../contexts/BusinessContext';
import { useFilters } from '../contexts/FilterContext';
import { loadCompleteBusinessData } from '../lib/dataLayer';
import { 
  TrendingUp, TrendingDown, Star, 
  ArrowRight, Zap, AlertTriangle, Info
} from 'lucide-react';
import { analyzeGapToFive, generateMockGapData, generateAspectDeepAnalysis, type GapAnalysis, type AspectDeepAnalysis } from '../utils/gapAnalysis';
import AspectDeepDive from './AspectDeepDive';
import SentimentTrendChart from './SentimentTrendChart';
import FilterBar from './FilterBar';
import { mockReviewsData } from '../mocks';
import { DEMO_MODE, MOCK_NETWORK_DELAY } from '../config/demo';

const Insights: React.FC = () => {
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessContext();
  const { selectedPeriod, selectedSource, customRange } = useFilters();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);

  // Cargar reviews (real o mock dependiendo del modo)
  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      
      try {
        // 🎬 MODO DEMO: Usar mock data
        if (DEMO_MODE.enabled) {
          await new Promise(resolve => setTimeout(resolve, MOCK_NETWORK_DELAY));
          setReviews(mockReviewsData);
          console.log(`✅ Using ${mockReviewsData.length} MOCK reviews for Insights`);
          setLoading(false);
          return;
        }

        // Modo producción: cargar datos reales
        const ep = currentBusiness?.external_place_id || currentBusiness?.placeId;
        if (!ep) {
          setLoading(false);
          return;
        }
        
        const data = await loadCompleteBusinessData(ep);
        setReviews(data.reviews || []);
      } catch (error) {
        console.error('Error loading reviews for Insights:', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadReviews();
  }, [currentBusiness]);

  // Análisis de Gap to Five
  const gapAnalysis: GapAnalysis = useMemo(() => {
    if (reviews.length === 0) {
      return generateMockGapData();
    }
    return analyzeGapToFive(reviews);
  }, [reviews]);

  // Análisis profundo de aspectos
  const aspectAnalyses: AspectDeepAnalysis[] = useMemo(() => {
    if (reviews.length === 0) {
      return [];
    }
    return generateAspectDeepAnalysis(reviews);
  }, [reviews]);

  // Verificar si hay datos reales de gap
  const hasGapData = gapAnalysis.gapToFiveCount > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Cargando insights...</p>
        </div>
      </div>
    );
  }

  // Topics con datos de gap
  const topics = [
    { 
      name: 'Servicio', 
      positive: 88, 
      negative: 12, 
      change: 2, 
      trend: 'up' as const,
      gapCount: 18,
      gapPercentage: 40,
      topGapReason: 'Tiempo de espera en horario pico',
      quickWinPotential: 'high' as const
    },
    { 
      name: 'Comida', 
      positive: 91, 
      negative: 9, 
      change: -3, 
      trend: 'down' as const,
      gapCount: 8,
      gapPercentage: 17.8,
      topGapReason: 'Variedad vegetariana',
      quickWinPotential: 'medium' as const
    },
    { 
      name: 'Limpieza', 
      positive: 83, 
      negative: 17, 
      change: 5, 
      trend: 'up' as const,
      gapCount: 3,
      gapPercentage: 6.7,
      topGapReason: 'Baños',
      quickWinPotential: 'low' as const
    },
    { 
      name: 'Ambiente', 
      positive: 76, 
      negative: 24, 
      change: -10, 
      trend: 'down' as const,
      gapCount: 12,
      gapPercentage: 26.7,
      topGapReason: 'Ruido en horario pico',
      quickWinPotential: 'medium' as const
    },
  ];

  const strengths = ['Atención personalizada', 'Calidad de comida', 'Ambiente acogedor'];
  const weaknesses = ['WiFi', 'Rapidez en atención', 'Ruido en horario pico'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insights Profundos</h1>
          <p className="text-sm text-gray-600 mt-1">Análisis histórico y oportunidades de mejora</p>
        </div>
      </div>

      {/* Filtros globales */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <FilterBar />
      </div>

      {/* 📊 Vista rápida - Limpio y escaneable */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Oportunidades 5★ */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Oportunidades 5★</div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-bold text-amber-600">{gapAnalysis.gapToFiveCount}</span>
            <span className="text-sm text-gray-500">reviews</span>
          </div>
          <div className="text-xs flex items-center gap-1 text-gray-600">
            <Star className="h-3 w-3 text-amber-500" />
            <span className="font-medium">+{gapAnalysis.potentialIncrease.toFixed(1)}★ potencial</span>
          </div>
        </div>

        {/* Top Tema */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Top Fortaleza</div>
          <div className="text-lg font-bold text-gray-900 truncate mb-1">{topics[0]?.name || 'Servicio'}</div>
          <div className="text-xs flex items-center gap-1 text-emerald-600">
            <TrendingUp className="h-3 w-3" />
            <span className="font-medium">{topics[0]?.positive || 88}% positivo</span>
          </div>
        </div>
      </section>

      {/* 🆕 1️⃣ HERO SIMPLIFICADO: Oportunidad de 5 Estrellas */}
      {hasGapData ? (
        <section className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50/50 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
              <Star className="h-6 w-6 text-white" fill="currentColor" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">
                    Oportunidad de 5 Estrellas
                  </h2>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-amber-700">{gapAnalysis.gapToFiveCount} reviews</span> de clientes satisfechos mencionaron mejoras específicas
                  </p>
                </div>
                
                {/* Rating projection - compact */}
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-600">{gapAnalysis.currentRating}★</span>
                    <ArrowRight className="h-4 w-4 text-amber-600" />
                    <span className="text-lg font-bold text-emerald-600">{gapAnalysis.potentialRating}★</span>
                  </div>
                  <div className="text-xs text-gray-500">Potencial +{gapAnalysis.potentialIncrease.toFixed(1)}★</div>
                </div>
              </div>
              
              {/* Top 3 gaps - compact */}
              <div className="bg-white/80 rounded-lg p-3 border border-amber-100 mb-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">Top mejoras mencionadas:</div>
                <div className="space-y-1.5">
                  {gapAnalysis.topGapReasons.slice(0, 3).map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-gray-900 truncate">{reason.text}</span>
                      <span className="flex-shrink-0 text-xs text-gray-500">({reason.count})</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* CTA simplificado */}
              <button 
                onClick={() => navigate('/reviews?gap=true')}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Ver las {gapAnalysis.gapToFiveCount} reviews →
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* Empty state mejorado */
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
              <Info className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                Sin análisis de oportunidades aún
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                Las reviews necesitan ser analizadas para identificar oportunidades de mejora.
              </p>
              <button 
                onClick={() => navigate('/reviews')}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Ir a reseñas →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2️⃣ Evolución histórica del Sentiment Index */}
      <SentimentTrendChart 
        selectedPeriod={selectedPeriod}
        selectedSource={selectedSource}
        customRange={customRange}
      />

      {/* 🔄 3️⃣ Distribución de sentimientos por tema - PRIORIZADO Y ACCIONABLE */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900">¿Qué falla y qué funciona?</h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>Ordenado por urgencia</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">Tus temas priorizados automáticamente</p>

        {/* Lista vertical priorizada */}
        <div className="space-y-3">
          {/* Primero: problemas (< 60%) */}
          {topics.filter(t => t.positive < 60).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Requiere atención urgente</span>
              </div>
              {topics
                .filter(t => t.positive < 60)
                .sort((a, b) => a.positive - b.positive)
                .map((topic) => (
                  <div 
                    key={topic.name}
                    className="rounded-lg border-2 border-red-200 bg-red-50/30 p-4 mb-2 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <h3 className="font-bold text-gray-900 text-base">{topic.name}</h3>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">
                          <TrendingDown className="h-3 w-3" />
                          {Math.abs(topic.change)}%
                        </div>
                      </div>
                      {topic.gapCount > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold">
                          <Zap className="h-3 w-3" />
                          {topic.gapCount} oport.
                        </div>
                      )}
                    </div>

                    {/* Barra visual grande */}
                    <div className="mb-3">
                      <div className="flex h-4 bg-gray-200 rounded-lg overflow-hidden mb-2">
                        <div 
                          className="bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ width: `${topic.positive}%` }}
                        >
                          {topic.positive > 12 && `${topic.positive}%`}
                        </div>
                        <div 
                          className="bg-red-500 flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ width: `${topic.negative}%` }}
                        >
                          {topic.negative > 12 && `${topic.negative}%`}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{topic.positive}% positivo</span>
                        <span className="font-bold text-red-600">{topic.negative}% negativo</span>
                      </div>
                    </div>

                    {/* Acción sugerida */}
                    <div className="flex items-start gap-2 bg-white border border-red-200 rounded-lg p-3">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 mb-1">Acción recomendada:</p>
                        <p className="text-xs text-gray-700 mb-2">
                          {topic.gapCount > 10 ? `Revisar "${topic.topGapReason}" mencionado en ${topic.gapCount} reviews` : 
                           `Analizar las ${Math.round(topic.negative * 0.3)} reviews negativas más recientes`}
                        </p>
                        <button
                          onClick={() => navigate(`/reviews?aspect=${encodeURIComponent(topic.name)}&sentiment=negative`)}
                          className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          Ver reviews problemáticas →
                        </button>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          )}

          {/* Segundo: en observación (60-79%) */}
          {topics.filter(t => t.positive >= 60 && t.positive < 80).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">En observación</span>
              </div>
              {topics
                .filter(t => t.positive >= 60 && t.positive < 80)
                .sort((a, b) => a.positive - b.positive)
                .map((topic) => (
                  <div 
                    key={topic.name}
                    className="rounded-lg border border-amber-200 bg-amber-50/20 p-4 mb-2 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <h3 className="font-semibold text-gray-900">{topic.name}</h3>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          topic.trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {topic.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(topic.change)}%
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{topic.positive}%</span>
                    </div>

                    <div className="flex h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div className="bg-emerald-500" style={{ width: `${topic.positive}%` }} />
                      <div className="bg-red-400" style={{ width: `${topic.negative}%` }} />
                    </div>

                    {topic.gapCount > 5 && (
                      <button
                        onClick={() => navigate(`/reviews?aspect=${encodeURIComponent(topic.name)}&gap=true`)}
                        className="w-full text-xs text-amber-700 hover:text-amber-800 font-medium text-left"
                      >
                        → {topic.gapCount} oportunidades de mejora
                      </button>
                    )}
                  </div>
              ))}
            </div>
          )}

          {/* Tercero: fortalezas (80%+) */}
          {topics.filter(t => t.positive >= 80).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Fortalezas consolidadas</span>
              </div>
              {topics
                .filter(t => t.positive >= 80)
                .sort((a, b) => b.positive - a.positive)
                .map((topic) => (
                  <div 
                    key={topic.name}
                    className="rounded-lg border border-emerald-200 bg-emerald-50/20 p-3 mb-2 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <h3 className="font-semibold text-gray-900">{topic.name}</h3>
                        {topic.trend === 'up' && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-medium">
                            <TrendingUp className="h-3 w-3" />
                            +{topic.change}%
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-bold text-emerald-700">{topic.positive}%</span>
                    </div>
                    <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                      <div className="bg-emerald-500" style={{ width: `${topic.positive}%` }} />
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4️⃣ Análisis Profundo de Temas */}
      <AspectDeepDive analyses={aspectAnalyses} />

      {/* 5️⃣ Fortalezas y Debilidades */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Fortalezas y debilidades</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Fortalezas */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">A mantener</h3>
            </div>
            <ul className="space-y-1.5">
              {strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 mt-0.5 text-xs">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Debilidades */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">A trabajar</h3>
            </div>
            <ul className="space-y-1.5">
              {weaknesses.map((weakness, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-600 mt-0.5 text-xs">•</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 6️⃣ Resumen compacto */}
      <section className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Resumen de Insights</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-xs text-gray-600 mb-0.5">Total Reviews</div>
            <div className="text-sm font-semibold text-gray-900">
              {reviews.length} analizadas
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-amber-200">
            <div className="text-xs text-gray-600 mb-0.5">Potencial 5★</div>
            <div className="text-sm font-semibold text-amber-700">
              {gapAnalysis.gapToFiveCount} reviews
            </div>
          </div>
        </div>

        <div className="bg-white border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-gray-800 leading-relaxed">
            {strengths[0] && `Tus clientes destacan ${strengths[0].toLowerCase()}.`}
            {weaknesses[0] && ` Trabajá en ${weaknesses[0].toLowerCase()}.`}
            {hasGapData && gapAnalysis.gapToFiveCount > 0 && (
              <> Además, tenés <span className="font-semibold text-amber-700">{gapAnalysis.gapToFiveCount} oportunidades</span> que podrían llevar tu rating a <span className="font-semibold text-emerald-600">{gapAnalysis.potentialRating}★</span>.</>
            )}
          </p>
        </div>
      </section>
    </div>
  );
};

export default Insights;
