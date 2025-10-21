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
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from '../contexts/BusinessContext';
import { type Period, type Source } from '../contexts/FilterContext';
import { DEMO_MODE, MOCK_NETWORK_DELAY } from '../config/demo';

interface SentimentTrendChartProps {
  className?: string;
  loading?: boolean;
  // Controlled props from parent
  selectedPeriod: Period;
  selectedSource: Source;
  customRange: { from: string; to: string };
}

const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({ 
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

  // Generar datos mock de sentiment trend para modo demo
  const generateMockSentimentTrend = (period: Period) => {
    const baseDate = new Date('2025-08-20T12:00:00Z');
    const data: { date: Date; ts: number; score: number; count: number }[] = [];
    
    let days = 30; // Default
    if (period === '3m') days = 90;
    else if (period === '6m') days = 180;  
    else if (period === '12m' || period === 'global') days = 365;

    // Generar datos diarios con tendencia realista basada en mock reviews
    for (let i = days; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() - i);
      
      // Simular variación de sentiment score (65-85 range, promedio ~75)
      const baseScore = 75;
      const variation = Math.sin(i / 10) * 8 + Math.random() * 10 - 5;
      const score = Math.max(60, Math.min(90, baseScore + variation));
      
      // Simular conteo de reviews (0-3 por día, algunas sin reviews)
      const count = Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
      
      data.push({
        date: new Date(date),
        ts: date.getTime(),
        score: Math.round(score * 10) / 10, // 1 decimal
        count
      });
    }
    
    return data;
  };

  // Cargar datos de sentiment desde overall_score
  const [fullDaily, setFullDaily] = useState<{ date: Date; ts: number; score: number; count: number }[]>([]);
  const { currentBusiness } = useBusinessContext();
  
  useEffect(() => {
    (async () => {
      try {
        // 🎬 MODO DEMO: Usar datos mock
        if (DEMO_MODE.enabled) {
          await new Promise(resolve => setTimeout(resolve, MOCK_NETWORK_DELAY));
          
          // Generar datos mock para el trend de sentimiento
          const mockTrendData = generateMockSentimentTrend(selectedPeriod);
          setFullDaily(mockTrendData);
          console.log(`✅ Using MOCK sentiment trend data (${mockTrendData.length} points)`);
          return;
        }

        // Modo producción: cargar datos reales
        const { loadSentimentTrend } = await import('../lib/dataLayer');
        const baseDate = new Date(); // En producción usar fecha real
        let fromDate: Date;
        
        if (selectedPeriod === 'global' || selectedPeriod === '12m') {
          fromDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - 11, 1);
        } else if (selectedPeriod === '6m') {
          fromDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - 5, 1);
        } else if (selectedPeriod === '3m') {
          fromDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - 2, 1);
        } else {
          fromDate = new Date(customRange.from);
        }
        
        const to = formatYMD(baseDate);
        const from = formatYMD(fromDate);
        const gran = selectedPeriod === 'global' || selectedPeriod === '12m' ? 'monthly' : 'daily';
        const ep = currentBusiness?.external_place_id || currentBusiness?.placeId || '';
        
        if (!ep) { 
          setFullDaily([]); 
          return; 
        }
        
        const series = await loadSentimentTrend(ep, { from, to, source: selectedSource, granularity: gran });
        setFullDaily(series.map(s => ({ date: s.date, ts: s.ts, score: s.score, count: s.count })));
      } catch (e) {
        console.error('Error cargando sentiment trend:', e);
        setFullDaily([]);
      }
    })();
  }, [selectedSource, selectedPeriod, currentBusiness?.external_place_id, currentBusiness?.placeId, customRange.from, customRange.to]);

  const aggregateMonthly = (data: { date: Date; ts: number; score: number; count: number }[]) => {
    const map = new Map<string, { date: Date; ts: number; scoreSum: number; countSum: number; days: number }>();
    data.forEach(d => {
      const key = `${d.date.getFullYear()}-${d.date.getMonth()}`;
      const firstOfMonth = new Date(d.date.getFullYear(), d.date.getMonth(), 1, 12);
      const ts = firstOfMonth.getTime();
      const rec = map.get(key) || { date: firstOfMonth, ts, scoreSum: 0, countSum: 0, days: 0 };
      rec.scoreSum += d.score;
      rec.countSum += d.count;
      rec.days += 1;
      map.set(key, rec);
    });
    return Array.from(map.values())
      .sort((a, b) => a.ts - b.ts)
      .map(r => ({ date: r.date, ts: r.ts, score: Math.round(r.scoreSum / r.days), count: r.countSum }));
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
  
  const avgScore = useMemo(() => {
    if (currentData.length === 0) return 0;
    const sum = currentData.reduce((acc, d) => acc + d.score, 0);
    return Math.round(sum / currentData.length);
  }, [currentData]);
  
  // Calcular tendencia
  const firstScore = currentData[0]?.score || 0;
  const lastScore = currentData[currentData.length - 1]?.score || 0;
  const scoreChange = lastScore - firstScore;
  const isPositiveTrend = scoreChange >= 0;

  // Identificar mes con mayor cambio
  const monthWithMaxChange = useMemo(() => {
    if (currentData.length < 2) return null;
    let maxChange = 0;
    let maxMonth = '';
    for (let i = 1; i < currentData.length; i++) {
      const change = Math.abs(currentData[i].score - currentData[i-1].score);
      if (change > maxChange) {
        maxChange = change;
        const d = currentData[i].date;
        maxMonth = isDailyGranularity 
          ? `${monthLabels[d.getMonth()]} ${d.getDate()}`
          : `${monthLabels[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      }
    }
    return maxMonth;
  }, [currentData, isDailyGranularity, monthLabels]);

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as { ts: number; score: number; count: number };
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
              <span className="text-sm text-gray-600">Sentiment: <span className="font-medium">{data.score}/100</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-300 rounded"></div>
              <span className="text-sm text-gray-600">Reviews: <span className="font-medium">{data.count}</span></span>
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

  // Estado vacío cuando no hay datos
  const hasData = currentData.length > 0;
  if (!hasData) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolución del Sentiment Index</h3>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-gray-900 font-medium mb-2">No hay datos de sentiment aún</p>
          <p className="text-sm text-gray-600 max-w-md mb-4">
            Las reviews deben ser analizadas primero para poder mostrar la evolución del sentimiento.
          </p>
          <button
            onClick={() => navigate('/reviews')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Ir a Reviews para analizar →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>
      {/* Header simplificado - sin controles */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Evolución del Sentiment Index</h3>
        {/* Promedio y cantidad junto al título */}
        <div className="flex items-center gap-1 text-gray-800">
          <span className="text-xl font-bold text-gray-900">{avgScore}</span>
          <span className="text-sm text-gray-500">/100</span>
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
            {scoreChange > 0 ? '+' : ''}{scoreChange} pts
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
              <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
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
              domain={[0, 100]}
              width={32}
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Línea de referencia en 70 (score "bueno") */}
            <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5} />
            
            {/* Línea de sentiment score */}
            <Line
              type="monotone"
              dataKey="score"
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Insight textual - ORO ✨ */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3.5">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-7 h-7 rounded-full ${isPositiveTrend ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
            {isPositiveTrend ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Tu reputación {isPositiveTrend ? 'creció' : 'bajó'} {Math.abs(scoreChange)} pts en {
                selectedPeriod === '3m' ? '3 meses' : 
                selectedPeriod === '6m' ? '6 meses' : 
                selectedPeriod === '12m' ? '12 meses' : 
                selectedPeriod === 'global' ? 'el período total' : 'el período seleccionado'
              }
            </p>
            {monthWithMaxChange && (
              <p className="text-xs text-blue-800 mt-1">
                Mayor cambio en {monthWithMaxChange}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentTrendChart;

