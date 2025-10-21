import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from '../contexts/BusinessContext';

import { type Period, type Source } from '../contexts/FilterContext';

interface TrendChartProps {
  className?: string;
  loading?: boolean;
  // Controlled props from parent
  selectedPeriod: Period;
  selectedSource: Source;
  customRange: { from: string; to: string };
}

const TrendChart: React.FC<TrendChartProps> = ({ 
  className = '', 
  loading = false,
  selectedPeriod,
  selectedSource,
  customRange
}) => {
  const navigate = useNavigate();
  const monthLabels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const formatYMD = (d: Date) => d.toISOString().slice(0, 10);
  const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  // Datos reales: traer serie desde reviews
  const [fullDaily, setFullDaily] = useState<{ date: Date; ts: number; rating: number; count: number }[]>([]);
  const { currentBusiness } = useBusinessContext();
  useEffect(() => {
    (async () => {
      try {
        const { loadReviewTrend } = await import('../lib/dataLayer');
        // Determinar rango según período seleccionado
        const now = new Date();
        let fromDate: Date;
        if (selectedPeriod === 'global' || selectedPeriod === '12m') {
          fromDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        } else if (selectedPeriod === '6m') {
          fromDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        } else if (selectedPeriod === '3m') {
          fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        } else {
          // custom
          fromDate = new Date(customRange.from);
        }
        const to = formatYMD(now);
        const from = formatYMD(fromDate);
        const gran = selectedPeriod === 'global' || selectedPeriod === '12m' ? 'monthly' : 'daily';
        const ep = currentBusiness?.external_place_id || currentBusiness?.placeId || '';
        if (!ep) { setFullDaily([]); return; }
        const series = await loadReviewTrend(ep, { from, to, source: selectedSource, granularity: gran });
        setFullDaily(series.map(s => ({ date: s.date, ts: s.ts, rating: s.rating, count: s.count })));
      } catch (e) {
        // fallback: vacío
        setFullDaily([]);
      }
    })();
  }, [selectedSource, selectedPeriod, currentBusiness?.external_place_id, currentBusiness?.placeId, customRange.from, customRange.to]);

  const aggregateMonthly = (data: { date: Date; ts: number; rating: number; count: number }[]) => {
    const map = new Map<string, { date: Date; ts: number; ratingSum: number; countSum: number; days: number }>();
    data.forEach(d => {
      const key = `${d.date.getFullYear()}-${d.date.getMonth()}`;
      const firstOfMonth = new Date(d.date.getFullYear(), d.date.getMonth(), 1, 12);
      const ts = firstOfMonth.getTime();
      const rec = map.get(key) || { date: firstOfMonth, ts, ratingSum: 0, countSum: 0, days: 0 };
      rec.ratingSum += d.rating;
      rec.countSum += d.count;
      rec.days += 1;
      map.set(key, rec);
    });
    return Array.from(map.values())
      .sort((a, b) => a.ts - b.ts)
      .map(r => ({ date: r.date, ts: r.ts, rating: Math.round((r.ratingSum / r.days) * 10) / 10, count: r.countSum }));
  };

  const daysBetween = (from: Date, to: Date) => Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);

  const isDailyGranularity = useMemo(() => {
    if (selectedPeriod === '3m' || selectedPeriod === '6m') return true;
    if (selectedPeriod === '12m' || selectedPeriod === 'global') return false;
    const from = new Date(customRange.from);
    const to = new Date(customRange.to);
    return daysBetween(from, to) <= 120;
  }, [selectedPeriod, customRange]);

  const currentDataRaw = useMemo(() => {
    if (selectedPeriod === 'global') {
      return aggregateMonthly(fullDaily);
    }
    if (selectedPeriod === '12m') {
      const lastYearDaily = fullDaily.slice(-365);
      return aggregateMonthly(lastYearDaily);
    }
    if (selectedPeriod === '6m' || selectedPeriod === '3m') {
      const days = selectedPeriod === '3m' ? 92 : 185;
      return fullDaily.slice(-days);
    }
    // custom
    const from = new Date(customRange.from);
    const to = new Date(customRange.to);
    const filtered = fullDaily.filter(d => d.date >= from && d.date <= to);
    return isDailyGranularity ? filtered : aggregateMonthly(filtered);
  }, [fullDaily, selectedPeriod, customRange, isDailyGranularity]);

  const totalReviews = useMemo(() => currentDataRaw.reduce((acc, d) => acc + d.count, 0), [currentDataRaw]);
  const currentData = useMemo(() => currentDataRaw, [currentDataRaw]);
  const showDots = useMemo(() => currentData.length <= 36, [currentData]);
  const avgRating = useMemo(() => {
    if (currentData.length === 0) return 0;
    const sum = currentData.reduce((acc, d) => acc + d.rating, 0);
    return Math.round((sum / currentData.length) * 100) / 100;
  }, [currentData]);
  
  // Calcular tendencia
  const firstRating = currentData[0]?.rating || 0;
  const lastRating = currentData[currentData.length - 1]?.rating || 0;
  const ratingChange = lastRating - firstRating;
  const isPositiveTrend = ratingChange >= 0;

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as { ts: number; rating: number; count: number };
      const d = new Date(data.ts);
      const tooltipLabel = isDailyGranularity
        ? `${String(d.getDate()).padStart(2, '0')} ${monthLabels[d.getMonth()]} ${d.getFullYear()}`
        : `${monthLabels[d.getMonth()]} ${d.getFullYear()}`;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{tooltipLabel}</p>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-sm text-gray-600">Rating: <span className="font-medium">{data.rating}★</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-300 rounded"></div>
              <span className="text-sm text-gray-600">Volumen: <span className="font-medium">{data.count} reseñas</span></span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };


  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
          <div className="h-8 w-36 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-64 w-full bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      {/* Header simplificado - sin controles */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Tendencia de Rating</h3>
        {/* Promedio y cantidad junto al título */}
        <div className="flex items-center gap-1 text-gray-800">
          <span className="text-xl font-bold text-gray-900">{avgRating}</span>
          <span aria-hidden>⭐</span>
          <span className="text-sm text-gray-500">({totalReviews})</span>
        </div>
        <div className="flex items-center space-x-1">
          {isPositiveTrend ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${
            isPositiveTrend ? 'text-green-600' : 'text-red-600'
          }`}>
            {ratingChange > 0 ? '+' : ''}{ratingChange.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={currentData}
            margin={{ top: 10, right: 24, left: 0, bottom: 5 }}
            onClick={(state: any) => {
              const idx = state?.activeTooltipIndex;
              if (idx != null && currentData[idx]) {
                const d = currentData[idx].date as Date;
                const from = isDailyGranularity ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : new Date(d.getFullYear(), d.getMonth(), 1);
                const to = isDailyGranularity ? addDays(from, 1) : addMonths(from, 1);
                const qs = new URLSearchParams();
                if (selectedSource !== 'combined') qs.set('source', selectedSource);
                qs.set('from', formatYMD(from));
                qs.set('to', formatYMD(to));
                navigate(`/reviews?${qs.toString()}`);
              }
            }}
          >
            <defs>
              <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            
            <XAxis
              dataKey="ts"
              type="number"
              domain={["dataMin", "dataMax"]}
              padding={{ left: 0, right: 16 }}
              tickFormatter={(ts: number) => {
                const d = new Date(ts);
                return isDailyGranularity ? `${monthLabels[d.getMonth()]} ${d.getDate()}` : `${monthLabels[d.getMonth()]}`;
              }}
              tick={{ fill: '#64748b', fontSize: 12 }}
              minTickGap={24}
              tickMargin={8}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            
            <YAxis
              yAxisId="left"
              domain={[(dataMin: number) => Math.floor(dataMin * 10) / 10, 5]}
              width={32}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            
            {/* Solo eje izquierdo */}
            <Tooltip content={<CustomTooltip />} />
            
            {/* Línea de referencia en 4.0 */}
            {/* Línea de referencia de promedio removida por pedido */}
            
            {/* Línea de rating (eje izquierdo) */}
            {
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="rating"
                stroke="#3b82f6"
                strokeWidth={3}
                strokeLinecap="round"
                dot={showDots ? { fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff', r: 3 } : false}
                activeDot={{ 
                  r: 7, 
                  fill: '#3b82f6',
                  stroke: '#ffffff',
                  strokeWidth: 2
                }}
              />
            }

          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {/* Resumen inferior removido para una UI más limpia */}
    </div>
  );
};

export default TrendChart;