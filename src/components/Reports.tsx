import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, TrendingUp, Star, Users, BarChart3, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useBusinessContext } from '../contexts/BusinessContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import EmptyCompetitorsState from './EmptyCompetitorsState';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { currentBusiness: business } = useBusinessContext();
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<'combined' | 'google' | 'tripadvisor'>('combined');
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Datos reales del período seleccionado
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [prevReviews, setPrevReviews] = useState<any[]>([]);
  const [competitorDelta, setCompetitorDelta] = useState<number | null>(null);
  const [competitorSeries, setCompetitorSeries] = useState<Array<{ name: string; value: number }>>([]);
  const [competitorStats, setCompetitorStats] = useState<Array<{ name: string; rating: number; votes: number }>>([]);

  // Cargar datos por rango (si hay business)
  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      if (!business?.external_place_id && !business?.placeId) return;
      try {
        setIsLoadingData(true);
        // Definir rango de fechas
        const now = new Date();
        const end = selectedPeriod === 'custom' && customEnd ? new Date(customEnd) : now;
        let start: Date;
        if (selectedPeriod === 'weekly') start = new Date(end); start.setDate(end.getDate() - 7);
        if (selectedPeriod === 'monthly') start = new Date(end); start.setMonth(end.getMonth() - 1);
        if (selectedPeriod === 'quarterly') start = new Date(end); start.setMonth(end.getMonth() - 3);
        if (selectedPeriod === 'yearly') start = new Date(end); start.setFullYear(end.getFullYear() - 1);
        if (selectedPeriod === 'custom' && customStart) start = new Date(customStart);

        // Cargar data completa y filtrar en frontend por simplicidad
        const { loadCompleteBusinessData } = await import('../lib/dataLayer');
        const placeId = business.external_place_id || business.placeId;
        const complete = await loadCompleteBusinessData(placeId);
        const inRange = (d?: string | null) => {
          if (!d) return false;
          const dt = new Date(d);
          return dt >= start && dt <= end;
        };
        // Rango anterior (misma duración inmediatamente anterior)
        const durationMs = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - durationMs);
        const inPrevRange = (d?: string | null) => {
          if (!d) return false;
          const dt = new Date(d);
          return dt >= prevStart && dt <= prevEnd;
        };
        const providerMatch = (r: any) => selectedSource === 'combined' || r.provider === selectedSource;
        const filteredReviews = complete.reviews.filter((r: any) => inRange(r.posted_at) && providerMatch(r));
        const filteredPrevReviews = complete.reviews.filter((r: any) => inPrevRange(r.posted_at) && providerMatch(r));
        const filteredAnalysis = complete.analysis.filter((a: any) => {
          const r = filteredReviews.find((x: any) => x.id === a.review_id);
          return inRange(r?.posted_at);
        });
        // Vincular con tabla real de competidores
        try {
          const { supabase, supabaseDev } = await import('../lib/supabase');
          const dbClient = import.meta.env.DEV ? supabaseDev : supabase;

          // 1) Obtener business_id a partir de external_place_id
          const { data: bizRow, error: bizErr } = await dbClient
            .from('businesses')
            .select('id')
            .eq('external_place_id', placeId)
            .limit(1)
            .maybeSingle();

          if (!bizErr && bizRow?.id) {
            // 2) Traer vínculos a competidores
            const { data: links, error: linkErr } = await dbClient
              .from('business_competitors_fixed')
              .select('competitor_external_place_id, competitor_name, competitor_rating_value, competitor_rating_votes')
              .eq('business_id', bizRow.id)
              .order('rank', { ascending: true })
              .limit(4);

            if (!linkErr && Array.isArray(links) && links.length) {
              const ids = links.map(l => l.competitor_external_place_id);
              const missingRating = links.some(l => l.competitor_rating_value == null);
              let ratingsMap = new Map<string, { name?: string; rating_value?: number | null; rating_votes?: number | null }>();
              // Prefill with provided names/ratings
              links.forEach(l => ratingsMap.set(l.competitor_external_place_id, { name: l.competitor_name || undefined, rating_value: l.competitor_rating_value as any, rating_votes: l.competitor_rating_votes as any }));

              if (missingRating) {
                const { data: places, error: plErr } = await dbClient
                  .from('external_places')
                  .select('id, name, rating_value, rating_votes_count')
                  .in('id', ids as any);
                if (!plErr && Array.isArray(places)) {
                  places.forEach(p => ratingsMap.set(p.id, { name: p.name, rating_value: p.rating_value, rating_votes: p.rating_votes_count }));
                }
              }

              const myRating = (complete as any).business.rating_value || 0;
              const myVotes = (complete as any).business.rating_votes_count || 0;
              const compArray: Array<{ name: string; value: number }> = [];
              const statArray: Array<{ name: string; rating: number; votes: number }> = [];
              ratingsMap.forEach((v, key) => {
                const nm = (v.name as string) || `Comp ${key.slice(0, 4)}`;
                const rv = typeof v.rating_value === 'number' ? Number(v.rating_value) : 0;
                const vt = typeof v.rating_votes === 'number' ? Number(v.rating_votes) : 0;
                compArray.push({ name: nm, value: rv });
                statArray.push({ name: nm, rating: rv, votes: vt });
              });

              // Delta promedio
              if (compArray.length) {
                const avgPeers = compArray.reduce((s, c) => s + c.value, 0) / compArray.length;
                const delta = Number((myRating - avgPeers).toFixed(2));
                if (!ignore) setCompetitorDelta(delta);
              } else if (!ignore) {
                setCompetitorDelta(null);
              }

              // Serie para gráfico comparativo (mi negocio + competidores)
              const series = [{ name: (complete as any).business.name || '', value: myRating }, ...compArray];
              if (!ignore) { setCompetitorSeries(series); setCompetitorStats([{ name: (complete as any).business.name || '', rating: myRating, votes: myVotes }, ...statArray]); }
            } else {
              if (!ignore) { setCompetitorDelta(null); setCompetitorSeries([]); setCompetitorStats([]); }
            }
          } else {
            if (!ignore) { setCompetitorDelta(null); setCompetitorSeries([]); setCompetitorStats([]); }
          }
        } catch (e) {
          console.warn('Competitor linkage failed:', e);
          if (!ignore) { setCompetitorDelta(null); setCompetitorSeries([]); setCompetitorStats([]); }
        }
        if (!ignore) {
          setReviews(filteredReviews);
          setAnalysis(filteredAnalysis);
          setPrevReviews(filteredPrevReviews);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setIsLoadingData(false);
      }
    };
    fetchData();
    return () => { ignore = true; };
  }, [business?.external_place_id, business?.placeId, selectedPeriod, customStart, customEnd, selectedSource]);

  // KPIs calculados
  const kpis = useMemo(() => {
    if (!reviews.length) {
      return {
        currentRating: +(business?.rating || 0).toFixed(2),
        previousRating: +(business?.rating || 0).toFixed(2),
        totalReviews: 0,
        newReviews: 0,
        responseRate: 0,
        avgResponseTimeStr: '—',
        ratingChange: 0,
        reviewsGrowth: 0,
        healthScore: 0,
        healthScoreDelta: 0,
        topIssues: [],
        recommendations: []
      } as any;
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
    const ratings = reviews.map(r => r.rating_value || 0).filter(Boolean);
    const currentRating = +avg(ratings).toFixed(2);
    const newReviews = reviews.length;
    const prevReviewsCount = prevReviews.length || 1;
    const prevRating = +avg(prevReviews.map(r => r.rating_value || 0).filter(Boolean)).toFixed(2) || currentRating;

    // Tasa y tiempo de respuesta
    const responded = reviews.filter(r => !!r.owner_answer);
    const responseRate = Math.round((responded.length / newReviews) * 100);
    const diffs = responded
      .map(r => {
        const start = r.posted_at ? new Date(r.posted_at).getTime() : 0;
        const end = r.owner_posted_at ? new Date(r.owner_posted_at).getTime() : 0;
        return end > start ? end - start : 0;
      })
      .filter(x => x > 0);
    const median = (arr: number[]) => {
      if (!arr.length) return 0;
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };
    const medianMs = median(diffs);
    const hours = Math.round(medianMs / 36e5);
    const days = Math.round(hours / 24);
    const avgResponseTimeStr = days >= 1 ? `${days} día${days > 1 ? 's' : ''}` : `${hours} h`;

    // Sentiment y temas
    const aspectCounts = new Map<string, number>();
    analysis.forEach(a => {
      const aspects = Array.isArray(a.aspects) ? a.aspects : [];
      aspects.forEach((t: any) => {
        const key = typeof t === 'string' ? t : t?.name || 'otros';
        aspectCounts.set(key, (aspectCounts.get(key) || 0) + 1);
      });
    });
    const topIssues = Array.from(aspectCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue, mentions]) => ({ issue, mentions, trend: 'stable' as const }));

    // Recomendaciones simples basadas en señales
    const recommendations: { priority: 'high' | 'medium' | 'low'; title: string; description: string; impact?: string }[] = [];
    if (responseRate < 90) {
      recommendations.push({
        priority: 'high',
        title: 'Aumentar tasa de respuesta',
        description: 'Responde a todas las reseñas, priorizando negativas y neutrales dentro de 24-48 h.',
        impact: 'Mejora percepción y reduce churn'
      });
    }
    if (days > 2) {
      recommendations.push({
        priority: 'high',
        title: 'Bajar tiempo de respuesta',
        description: 'Define responsables y alertas para responder en menos de 24 h.',
        impact: 'Incrementa conversión y satisfacción'
      });
    }
    if (currentRating < 4.3) {
      recommendations.push({
        priority: 'medium',
        title: 'Solicitar reseñas a clientes satisfechos',
        description: 'Activa campañas post-servicio para captar reseñas positivas.',
        impact: 'Compensa el peso de reseñas negativas'
      });
    }

    // Health Score (Rating 60% + Volumen 40%, normalizado a 200 reseñas)
    const ratingScore = (currentRating / 5) * 60;
    const volumeScore = Math.min((Math.sqrt(newReviews) / Math.sqrt(200)) * 40, 40);
    const healthScore = Math.round(ratingScore + volumeScore);
    const prevRatingScore = (prevRating / 5) * 60;
    const prevVolumeScore = Math.min((Math.sqrt(prevReviewsCount) / Math.sqrt(200)) * 40, 40);
    const prevHealth = Math.round(prevRatingScore + prevVolumeScore);

    return {
      currentRating,
      previousRating: prevRating,
      totalReviews: newReviews,
      newReviews,
      responseRate,
      avgResponseTimeStr,
      ratingChange: +(currentRating - prevRating).toFixed(2),
      reviewsGrowth: Math.round(((newReviews - prevReviewsCount) / (prevReviewsCount || 1)) * 100),
      healthScore,
      healthScoreDelta: healthScore - prevHealth,
      topIssues,
      recommendations
    };
  }, [reviews, prevReviews, analysis]);

  // Series para gráficos
  const trendSeries = useMemo(() => {
    // Agrupar por día
    const byDate = new Map<string, { count: number; ratingSum: number; ratingAvg: number }>();
    reviews.forEach(r => {
      const d = r.posted_at ? new Date(r.posted_at) : null;
      if (!d) return;
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const prev = byDate.get(key) || { count: 0, ratingSum: 0, ratingAvg: 0 };
      byDate.set(key, { count: prev.count + 1, ratingSum: prev.ratingSum + (r.rating_value || 0), ratingAvg: 0 });
    });
    const arr = Array.from(byDate.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, v]) => ({ date: new Date(date).toLocaleDateString('es-ES'), reviews: v.count, rating: +(v.ratingSum / (v.count || 1)).toFixed(2) }));
    if (!arr.length) return [];
    return arr;
  }, [reviews]);

  const sentimentSeries = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 } as Record<'positive'|'neutral'|'negative', number>;
    analysis.forEach(a => { counts[a.sentiment as 'positive'|'neutral'|'negative'] = (counts[a.sentiment as any] || 0) + 1; });
    const total = counts.positive + counts.neutral + counts.negative;
    const data = [
      { name: 'Positivas', value: counts.positive },
      { name: 'Neutrales', value: counts.neutral },
      { name: 'Negativas', value: counts.negative }
    ];
    if (!total) return [];
    return data;
  }, [analysis]);

  const aspectsSeries = useMemo(() => {
    const entries = kpis.topIssues.map(i => ({ name: i.issue, value: i.mentions }));
    if (!entries.length) return [];
    return entries;
  }, [kpis.topIssues]);

  const [toast, setToast] = useState<{ visible: boolean; message: string }>();

  const handleAddCompetitors = () => {
    navigate('/settings?start=competitors');
  };

  const getBusinessSafeName = () => {
    const name = business?.name || '';
    return name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)+/g, '');
  };

  const getDateRangeLabel = (): string => {
    if (selectedPeriod !== 'custom') return selectedPeriod;
    if (customStart && customEnd) return `${customStart}_a_${customEnd}`;
    return 'personalizado';
  };

  const getDateRangeDisplay = (): string => {
    switch (selectedPeriod) {
      case 'weekly': return 'Última semana';
      case 'monthly': return 'Último mes';
      case 'quarterly': return 'Último trimestre';
      case 'yearly': return 'Último año';
      case 'custom':
        if (customStart && customEnd) return `${new Date(customStart).toLocaleDateString('es-ES')} a ${new Date(customEnd).toLocaleDateString('es-ES')}`;
        return 'Período personalizado';
      default: return 'Período';
    }
  };

  const getSourceDisplay = (): string => (
    selectedSource === 'combined' ? 'Todas las fuentes' : selectedSource === 'google' ? 'Google' : 'TripAdvisor'
  );

  const computeReportFilename = (suffix = 'reporte') => {
    const name = getBusinessSafeName();
    const range = getDateRangeLabel();
    return `${name}-${suffix}-${range}.pdf`;
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    if (!reportRef.current) throw new Error('No se encontró el contenido del reporte');
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Escalar la imagen para que quepa en una página
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    const x = (pageWidth - imgWidth) / 2;
    const y = 20; // margen superior
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    return pdf.output('blob');
  };

  const handleDownloadPdf = async () => {
    try {
      setIsWorking(true);
      const blob = await generatePdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = computeReportFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setToast({ visible: true, message: 'Descarga iniciada' });
    } catch (err: any) {
      console.error(err);
      setToast({ visible: true, message: 'No se pudo generar el PDF' });
    } finally {
      setTimeout(() => setToast({ visible: false, message: '' }), 1500);
      setIsWorking(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      setIsWorking(true);
      const blob = await generatePdfBlob();
      const fileName = computeReportFilename();
      const file = new File([blob], fileName, { type: 'application/pdf' });

      const text = `Reporte de ${business?.name || ''} (${getDateRangeLabel()}).`;
      const navAny = navigator as any;
      if (navAny?.canShare && navAny.canShare({ files: [file] })) {
        await navAny.share({ files: [file], title: fileName, text });
        setToast({ visible: true, message: 'Compartiendo…' });
      } else {
        // Fallback: descargamos el PDF y abrimos WhatsApp Web con mensaje
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        const waMsg = `${text} Descargué el PDF y lo adjunto a continuación.`;
        const wa = `https://wa.me/?text=${encodeURIComponent(waMsg)}`;
        window.open(wa, '_blank');
        setToast({ visible: true, message: 'Abriendo WhatsApp…' });
      }
    } catch (err: any) {
      console.error(err);
      setToast({ visible: true, message: 'No se pudo compartir por WhatsApp' });
    } finally {
      setTimeout(() => setToast({ visible: false, message: '' }), 2000);
      setIsWorking(false);
    }
  };

  return (
    <div className="space-y-8">
      {toast?.visible && (
        <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded-md shadow-lg" aria-atomic="true">
          {toast.message}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h2>
          <p className="text-gray-600">Exporta datos y obtén insights accionables sobre tu reputación</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadPdf}
            disabled={isWorking}
            className={`bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${isWorking ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            aria-busy={isWorking}
          >
            <Download className="h-4 w-4" />
            <span>{isWorking ? 'Generando...' : 'Descargar PDF'}</span>
          </button>
          <button
            onClick={handleShareWhatsApp}
            disabled={isWorking}
            className={`border border-green-600 text-green-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${isWorking ? 'opacity-60 cursor-not-allowed' : 'hover:bg-green-50'}`}
            aria-busy={isWorking}
          >
            <Share2 className="h-4 w-4" />
            <span>{isWorking ? 'Preparando...' : 'Compartir por WhatsApp'}</span>
          </button>
        </div>
      </div>

      {/* Report Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurar Reporte</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="weekly">Última semana</option>
              <option value="monthly">Último mes</option>
              <option value="quarterly">Último trimestre</option>
              <option value="yearly">Último año</option>
              <option value="custom">Período personalizado</option>
            </select>
          </div>
          {/* Fuente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fuente</label>
            <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg">
              {(['combined','google','tripadvisor'] as const).map(src => (
                <button
                  key={src}
                  onClick={() => setSelectedSource(src)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${selectedSource === src ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-white'}`}
                  aria-pressed={selectedSource === src}
                >
                  {src === 'combined' ? 'Todas' : src === 'google' ? 'Google' : 'TripAdvisor'}
                </button>
              ))}
            </div>
          </div>
          {/* Rango personalizado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rango de fechas</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                disabled={selectedPeriod !== 'custom'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50"
                aria-label="Fecha inicio"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                disabled={selectedPeriod !== 'custom'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50"
                aria-label="Fecha fin"
              />
            </div>
            {selectedPeriod === 'custom' && (!customStart || !customEnd) && (
              <p className="text-xs text-gray-500 mt-1">Selecciona fecha de inicio y fin para el PDF.</p>
            )}
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div ref={reportRef} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Reporte de {business?.name || ''}</h3>
            <p className="text-sm text-gray-600">{getDateRangeDisplay()} • {getSourceDisplay()}</p>
          </div>
          <div className="text-sm text-gray-500 text-right">
            Generado: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
            <div className="text-xs text-gray-400">Este informe resume reseñas y análisis de reputación.</div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Resumen Ejecutivo</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-800">Rating Actual</p>
                  <p className="text-2xl font-bold text-blue-900">{kpis.currentRating}</p>
                </div>
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-2 flex items-center space-x-1">
                <TrendingUp className={`h-4 w-4 ${kpis.ratingChange >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm ${kpis.ratingChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {kpis.ratingChange >= 0 ? '+' : ''}{kpis.ratingChange} vs período anterior
                </span>
                <span className="text-xs text-gray-500">(prev: {kpis.previousRating})</span>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-800">Nuevas Reseñas</p>
                  <p className="text-2xl font-bold text-green-900">{kpis.newReviews}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-green-700">{kpis.reviewsGrowth >= 0 ? '+' : ''}{kpis.reviewsGrowth}% vs período anterior</span>
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-800">Tasa Respuesta</p>
                  <p className="text-2xl font-bold text-purple-900">{kpis.responseRate}%</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-purple-700">Tiempo promedio: {kpis.avgResponseTimeStr}</span>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-800">vs Competencia</p>
                  <p className="text-2xl font-bold text-orange-900">{typeof competitorDelta === 'number' ? (competitorDelta >= 0 ? `+${competitorDelta}` : `${competitorDelta}`) : '—'}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-orange-700">
                  Diferencia promedio
                </span>
              </div>
            </div>

            {/* Health Score */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-teal-800">Health Score</p>
                  <p className={`text-2xl font-bold ${kpis.healthScore >= 80 ? 'text-green-700' : kpis.healthScore >= 60 ? 'text-orange-700' : 'text-red-700'}`}>{kpis.healthScore}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-teal-600" />
              </div>
              <div className="mt-2 flex items-center space-x-1">
                <TrendingUp className={`h-4 w-4 ${kpis.healthScoreDelta >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm ${kpis.healthScoreDelta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {kpis.healthScoreDelta >= 0 ? '+' : ''}{kpis.healthScoreDelta} pts vs período anterior
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tendencias */}
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Tendencias</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Volumen de reseñas</h5>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="reviews" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Rating promedio</h5>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rating" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Competencia */}
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Comparación con Competencia</h4>
          <div className="border border-gray-200 rounded-lg p-4">
            {competitorSeries.length === 0 ? (
              <EmptyCompetitorsState
                onAddClick={handleAddCompetitors}
                progress={{ current: 0, total: 4 }}
                subtitle="Sumá hasta 4 para comparar rating, reseñas y tiempos de respuesta."
              />
            ) : (
              <>
                <div className="text-sm text-gray-700 mb-2">Diferencia de rating respecto al promedio de negocios similares</div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'Delta', value: typeof competitorDelta === 'number' ? competitorDelta : 0 }]}> 
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[-1, 1]} />
                      <Tooltip />
                      <Bar dataKey="value" fill={typeof competitorDelta === 'number' && competitorDelta >= 0 ? '#22c55e' : '#ef4444'} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Rating comparado</h5>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={competitorSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sentimientos y Aspectos */}
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Sentimientos y Aspectos</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Distribución de sentimientos</h5>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sentimentSeries} dataKey="value" nameKey="name" outerRadius={70} label>
                      {sentimentSeries.map((entry, index) => (
                        <Cell key={`c-${index}`} fill={["#22c55e", "#a3a3a3", "#ef4444"][index % 3]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Temas principales</h5>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aspectsSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Top Issues */}
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Temas Más Mencionados</h4>
          <div className="space-y-3">
            {kpis.topIssues.map((issue, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    #{index + 1}
                  </span>
                  <span className="font-medium text-gray-900">{issue.issue}</span>
                  <span className="text-sm text-gray-600">{issue.mentions} menciones</span>
                </div>
                <div className="flex items-center space-x-1">
                  {issue.trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {issue.trend === 'down' && <TrendingUp className="h-4 w-4 text-green-500 transform rotate-180" />}
                  {issue.trend === 'stable' && <div className="w-4 h-0.5 bg-gray-400"></div>}
                </div>
              </div>
            ))}
            {!kpis.topIssues.length && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">Aún no hay temas frecuentes. Cuando ingresen reseñas, vas a ver aquí los más repetidos.</div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">Recomendaciones de Mejora</h4>
          <div className="space-y-4">
            {kpis.recommendations.map((rec, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    rec.priority === 'high' ? 'bg-red-500' :
                    rec.priority === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-gray-900">{rec.title}</h5>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'medium' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Baja'} prioridad
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                    <p className="text-sm text-blue-600 font-medium">{rec.impact}</p>
                  </div>
                </div>
              </div>
            ))}
            {!kpis.recommendations.length && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">A medida que tengamos más datos, te sugeriremos acciones simples con impacto.</div>
            )}
          </div>
        </div>
        <div className="mt-10 pt-4 border-t border-gray-200 text-xs text-gray-500">
          Fuente: Google y TripAdvisor (según disponibilidad). Este reporte es informativo.
        </div>
      </div>

      {/* Scheduling eliminado por requerimiento */}
    </div>
  );
};

export default Reports;