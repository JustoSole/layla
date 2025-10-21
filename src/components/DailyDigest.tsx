import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ReviewData } from '../types/schema';
import { DEMO_MODE } from '../config/demo';

interface DailyDigestProps {
  reviews: ReviewData[];
  selectedPeriod: string; // '3M', '6M', '12M', 'Global', 'Pers.'
  selectedSource: 'combined' | 'google' | 'tripadvisor';
  lastUpdated?: string;
}

interface DigestMetrics {
  new24h: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    vs24hAgo: number;
  };
  ratingTrend: {
    current: number;
    previous: number;
    delta: number;
    trend: 'up' | 'down' | 'stable';
  };
}

const DailyDigest: React.FC<DailyDigestProps> = ({ 
  reviews, 
  selectedPeriod,
  selectedSource,
  lastUpdated 
}) => {
  
  const metrics = useMemo<DigestMetrics>(() => {
    // Filtrar por source
    const filteredReviews = selectedSource === 'combined' 
      ? reviews 
      : reviews.filter(r => r.provider === selectedSource);

    // Para modo demo, usar fecha base consistente con mock data  
    const baseDate = DEMO_MODE.enabled 
      ? new Date('2025-08-20T12:00:00Z').getTime()
      : Date.now();
    const last24h = baseDate - 24 * 60 * 60 * 1000;
    const last48h = baseDate - 48 * 60 * 60 * 1000;

    // Nuevas reviews últimas 24h
    const reviewsLast24h = filteredReviews.filter(r => 
      r.posted_at && new Date(r.posted_at).getTime() > last24h
    );

    // Reviews 24h-48h (para comparación)
    const reviews24hAgo = filteredReviews.filter(r => {
      if (!r.posted_at) return false;
      const ts = new Date(r.posted_at).getTime();
      return ts > last48h && ts <= last24h;
    });

    // Calcular delta
    const vs24hAgo = reviewsLast24h.length - reviews24hAgo.length;

    // ✅ Clasificar por sentimiento usando análisis NLP
    const positive = reviewsLast24h.filter(r => r.sentiment === 'positive').length;
    const negative = reviewsLast24h.filter(r => r.sentiment === 'negative').length;
    const neutral = reviewsLast24h.filter(r => r.sentiment === 'neutral' || !r.sentiment).length;

    // Rating trend basado en período seleccionado
    let periodDays = 90; // Default 3M
    if (selectedPeriod === '6M') periodDays = 180;
    else if (selectedPeriod === '12M') periodDays = 365;
    else if (selectedPeriod === 'Global') periodDays = 10000; // Todos
    else if (selectedPeriod === '3M') periodDays = 90;

    const periodMs = periodDays * 24 * 60 * 60 * 1000;
    const periodStart = baseDate - periodMs;
    const previousPeriodStart = baseDate - periodMs * 2;

    // Reviews del período actual
    const currentPeriodReviews = filteredReviews.filter(r => 
      r.posted_at && new Date(r.posted_at).getTime() > periodStart
    );

    // Reviews del período anterior
    const previousPeriodReviews = filteredReviews.filter(r => {
      if (!r.posted_at) return false;
      const ts = new Date(r.posted_at).getTime();
      return ts > previousPeriodStart && ts <= periodStart;
    });

    // Calcular rating promedio
    const calcAvg = (revs: ReviewData[]) => {
      if (revs.length === 0) return 0;
      const sum = revs.reduce((acc, r) => acc + (r.rating_value || 0), 0);
      return sum / revs.length;
    };

    const currentAvg = calcAvg(currentPeriodReviews);
    const previousAvg = calcAvg(previousPeriodReviews);
    const delta = currentAvg - previousAvg;

    const trend: 'up' | 'down' | 'stable' = 
      delta > 0.1 ? 'up' : delta < -0.1 ? 'down' : 'stable';

    return {
      new24h: {
        total: reviewsLast24h.length,
        positive,
        neutral,
        negative,
        vs24hAgo
      },
      ratingTrend: {
        current: currentAvg,
        previous: previousAvg,
        delta,
        trend
      }
    };
  }, [reviews, selectedPeriod, selectedSource]);

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '3M': return 'vs 3M anteriores';
      case '6M': return 'vs 6M anteriores';
      case '12M': return 'vs 12M anteriores';
      case 'Global': return 'vs período anterior';
      default: return 'vs período anterior';
    }
  };

  const formatDelta = (delta: number) => {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}`;
  };

  // Mostrar solo si hay datos suficientes
  const hasEnoughData = metrics.ratingTrend.current > 0 || metrics.new24h.total > 0;

  if (!hasEnoughData) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Timestamp de actualización */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Actualizado: {lastUpdated || 'hace unos momentos'}
        </p>
      </div>

      {/* Métricas compactas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Nuevas reviews 24h */}
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50/50 to-white p-4 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-600 mb-2">Nuevas reseñas</p>
          
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900">
              {metrics.new24h.total}
            </span>
            <span className="text-sm text-gray-600">últimas 24h</span>
            {metrics.new24h.vs24hAgo !== 0 && (
              <div className={`flex items-center gap-1 ${
                metrics.new24h.vs24hAgo > 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {metrics.new24h.vs24hAgo > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-sm font-semibold">
                  {metrics.new24h.vs24hAgo > 0 ? '+' : ''}
                  {metrics.new24h.vs24hAgo}
                </span>
              </div>
            )}
          </div>
          
          {metrics.new24h.total > 0 ? (
            <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs">
              <div className="flex items-center gap-1 whitespace-nowrap">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-700">{metrics.new24h.positive} pos</span>
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="text-gray-700">{metrics.new24h.neutral} neu</span>
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-gray-700">{metrics.new24h.negative} neg</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Sin reseñas nuevas</p>
          )}
        </div>

        {/* Card 2: Rating Trend */}
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50/50 to-white p-4 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-gray-600 mb-2">Rating promedio</p>
          
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900">
              {metrics.ratingTrend.current.toFixed(1)}
            </span>
            <span className="text-lg text-gray-500">★</span>
            {metrics.ratingTrend.trend !== 'stable' && (
              <div className={`flex items-center gap-1 ${
                metrics.ratingTrend.trend === 'up'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {metrics.ratingTrend.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-sm font-semibold">{formatDelta(metrics.ratingTrend.delta)}</span>
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-600">
            {metrics.ratingTrend.previous > 0 && (
              <div className="mb-1">
                {metrics.ratingTrend.previous.toFixed(1)}★ → {metrics.ratingTrend.current.toFixed(1)}★
              </div>
            )}
            <div className="text-gray-500">
              {getPeriodLabel()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyDigest;
