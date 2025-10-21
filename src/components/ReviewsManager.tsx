import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star, Search, Clock, AlertTriangle, CheckCircle, MessageSquare, ArrowUpRight, X, ClipboardCheck } from 'lucide-react';
import { useBusinessContext } from '../contexts/BusinessContext';
import { loadRealReviews } from '../lib/dataLayer';
import PlatformIcon from './PlatformIcons';
import { buildGoogleReviewUrl } from '../utils/reviewLinks';
import { normalizeSubAspect } from '../utils/gapAnalysis';
import ProgressDashboard from './ProgressDashboard';
import { mockReviewsData } from '../mocks';
import { DEMO_MODE, MOCK_NETWORK_DELAY } from '../config/demo';


interface Review {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  author: string;
  platform: 'Google' | 'Facebook' | 'TripAdvisor';
  datetimeUtc: string;
  responded: boolean;
  ownerResponse?: { text: string; datetimeUtc: string };
  urgent?: boolean;
  topics: string[];
  sentiment?: 'positive' | 'neutral' | 'negative'; // ← Agregado sentiment
  images?: { url: string; thumbUrl: string }[];
  thumbsUpCount?: number;
  language?: string;
  responseStatus: 'responded' | 'pending';
  aspectsData?: any[]; // Datos completos de aspectos incluyendo sub_aspect
}

type SortOption = 'recent' | 'worst' | 'withPhotos' | 'longest' | 'mostHelpful';

type Sentiment = NonNullable<Review['sentiment']>;

const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: 'Positiva',
  neutral: 'Neutra',
  negative: 'Negativa'
};

const SENTIMENT_BADGE_STYLES: Record<Sentiment, { active: string; inactive: string }> = {
  positive: {
    active: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    inactive: 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'
  },
  neutral: {
    active: 'border-gray-300 bg-gray-50 text-gray-700',
    inactive: 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
  },
  negative: {
    active: 'border-red-300 bg-red-50 text-red-700',
    inactive: 'border-red-200 bg-white text-red-600 hover:bg-red-50'
  }
};

const ReviewsManager: React.FC = () => {
  const navigate = useNavigate();
  const { businessData, currentBusiness } = useBusinessContext();
  const location = useLocation();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTopics, setActiveTopics] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showResponsePanel, setShowResponsePanel] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>();
  const [sourceFilter, setSourceFilter] = useState<'all' | 'google' | 'tripadvisor'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | Sentiment>('all');
  const [topicSearchTerm, setTopicSearchTerm] = useState('');
  const [dbReviews, setDbReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [subAspectFilter, setSubAspectFilter] = useState<string>('');
  
  useEffect(() => {
    let timer: number | undefined;
    if (toast?.visible) {
      // @ts-ignore - setTimeout in DOM returns number
      timer = setTimeout(() => setToast({ visible: false, message: '' }), 1600);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [toast?.visible]);

  // Constants
  const SLA_HOURS = 48;
  const CRITICAL_KEYWORDS = ['sucio', 'grosero', 'terrible', 'pésimo', 'horrible', 'nunca más'];

  // Helper functions
  const hoursSince = useCallback((isoString: string): number => {
    return Math.floor((Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60));
  }, []);

  const isUrgent = useCallback((review: Review): boolean => {
    // ✅ Usar análisis NLP real en lugar de solo rating
    const isNegativeSentiment = review.sentiment === 'negative';
    const age = hoursSince(review.datetimeUtc);
    const slaBreached = !review.responded && age > SLA_HOURS;
    
    // Una review es urgente si:
    // 1. Es negativa según NLP Y no está respondida
    // 2. O ha excedido el SLA de respuesta (48h) Y no está respondida
    return (isNegativeSentiment && !review.responded) || slaBreached;
  }, [hoursSince]);

  // Load reviews (real or mock depending on demo mode)
  useEffect(() => {
    const loadReviews = async () => {
      setReviewsLoading(true);
      
      try {
        // 🎬 MODO DEMO: Usar mock data
        if (DEMO_MODE.enabled) {
          await new Promise(resolve => setTimeout(resolve, MOCK_NETWORK_DELAY));
          
          const mapped: Review[] = mockReviewsData.map((r: any) => ({
            id: r.id,
            rating: Math.max(1, Math.min(5, Math.round(r.rating_value || 0))) as 1|2|3|4|5,
            text: r.review_text || '',
            author: r.author_name || 'Anonymous',
            platform: r.provider === 'tripadvisor' ? 'TripAdvisor' : 'Google',
            datetimeUtc: r.posted_at || new Date().toISOString(),
            responded: !!r.owner_answer,
            ownerResponse: r.owner_answer ? { text: r.owner_answer, datetimeUtc: r.owner_posted_at || r.posted_at || new Date().toISOString() } : undefined,
            urgent: false,
            topics: Array.isArray(r.aspects) 
              ? Array.from(new Set(r.aspects.map((a: any) => a?.aspect).filter(Boolean)))
              : [],
            sentiment: r.sentiment || undefined,
            images: Array.isArray(r.images) ? r.images.map((img: any) => ({ url: img.image_url || img.url || img, thumbUrl: img.image_url || img.url || img })) : [],
            thumbsUpCount: undefined,
            language: r.language || undefined,
            responseStatus: r.owner_answer ? 'responded' : 'pending',
            // Guardar aspectos completos para poder filtrar por sub_aspect
            aspectsData: r.aspects || []
          }));
          
          setDbReviews(mapped);
          console.log(`✅ Loaded ${mapped.length} MOCK reviews for ReviewsManager`);
          setReviewsLoading(false);
          return;
        }

        // Modo producción: cargar datos reales
        const ep = currentBusiness?.external_place_id || currentBusiness?.placeId;
        if (!ep) {
          setReviewsLoading(false);
          return;
        }
        
        const rows = await loadRealReviews(ep, 400);
        const mapped: Review[] = rows.map((r: any) => ({
          id: r.id,
          rating: Math.max(1, Math.min(5, Math.round(r.rating_value || 0))) as 1|2|3|4|5,
          text: r.review_text || '',
          author: r.author_name || 'Anonymous',
          platform: r.provider === 'tripadvisor' ? 'TripAdvisor' : 'Google',
          datetimeUtc: r.posted_at || new Date().toISOString(),
          responded: !!r.owner_answer,
          ownerResponse: r.owner_answer ? { text: r.owner_answer, datetimeUtc: r.owner_posted_at || r.posted_at || new Date().toISOString() } : undefined,
          urgent: false,
          topics: Array.isArray(r.aspects) 
            ? Array.from(new Set(r.aspects.map((a: any) => a?.aspect).filter(Boolean)))
            : [],
          sentiment: r.sentiment || undefined,
          images: Array.isArray(r.images) ? r.images.map((img: any) => ({ url: img.image_url || img.url || img, thumbUrl: img.image_url || img.url || img })) : [],
          thumbsUpCount: undefined,
          language: r.language || undefined,
          responseStatus: r.owner_answer ? 'responded' : 'pending',
          // Guardar aspectos completos para poder filtrar por sub_aspect
          aspectsData: r.aspects || []
        }));
        setDbReviews(mapped);
      } catch (error) {
        console.error('Error loading reviews:', error);
        setDbReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };
    
    loadReviews();
  }, [currentBusiness?.external_place_id, currentBusiness?.placeId]);

  // Transform backend previews (if present) to Review format; otherwise use dbReviews
  const transformBackendDataToReviews = useCallback((): Review[] => {
    const transformedReviews: Review[] = [];
    const googleData = (businessData.reviews as any)?.google;
    const tripAdvisorData = ((businessData.reviews as any)?.tripAdvisor || (businessData.reviews as any)?.tripadvisor);

    // Process Google Reviews
    const analyzedReviews = ((businessData.analysis as any)?.analyzed_reviews
      || (businessData.analysis as any)?.processed_reviews
      || []) as any[];

    if (googleData?.reviews_preview) {
      googleData.reviews_preview.forEach((googleReview: any, index: number) => {
        // Find corresponding analysis
        const analysis = analyzedReviews.find(
          (analyzed: any) => analyzed.review_id === googleReview.review_id
        );
        
        transformedReviews.push({
          id: googleReview.review_id || `google-${index}`,
          rating: googleReview.rating?.value || googleReview.rating || 5,
          text: googleReview.review_text || googleReview.text_preview || 'Review text not available',
          author: googleReview.profile_name || googleReview.author || 'Anonymous',
          platform: 'Google',
          datetimeUtc: googleReview.datetime_utc || googleReview.review_datetime_utc || new Date().toISOString(),
          responded: false,
          urgent: false,
          topics: analysis?.top_aspects || [],
          sentiment: analysis?.sentiment || undefined,
          language: analysis?.language || 'es',
          responseStatus: 'pending',
          aspectsData: analysis?.aspects || []
        });
      });
    }
    
    // Process TripAdvisor Reviews  
    if (tripAdvisorData?.reviews_preview) {
      tripAdvisorData.reviews_preview.forEach((taReview: any, index: number) => {
        // Find corresponding analysis
        const analysis = analyzedReviews.find(
          (analyzed: any) => analyzed.review_id === taReview.review_id
        );
        
        transformedReviews.push({
          id: taReview.review_id || `tripadvisor-${index}`,
          rating: taReview.rating?.value || taReview.rating || 5,
          text: taReview.review_text || taReview.text_preview || 'Review text not available',
          author: taReview.user?.name || taReview.author || 'Anonymous',
          platform: 'TripAdvisor',
          datetimeUtc: taReview.datetime_utc || taReview.review_datetime_utc || new Date().toISOString(),
          responded: taReview.has_owner_response || false,
          urgent: false,
          topics: analysis?.top_aspects || [],
          sentiment: analysis?.sentiment || undefined,
          language: analysis?.language || 'es',
          responseStatus: taReview.has_owner_response ? 'responded' : 'pending',
          aspectsData: analysis?.aspects || []
        });
      });
    }
    
    if (transformedReviews.length > 0) return transformedReviews;
    return dbReviews;
  }, [businessData, dbReviews]);

  // Get reviews from backend data only (sin mocks)
  const reviews: Review[] = useMemo(() => {
    const backendReviews = transformBackendDataToReviews();
    return backendReviews;
  }, [transformBackendDataToReviews]);

  // Métricas para Progress Dashboard
  const progressMetrics = useMemo(() => {
    const totalReviews = reviews.length;
    const reviewsWithResponse = reviews.filter(r => r.responded).length;
    
    return {
      totalReviews,
      reviewsWithResponse
    };
  }, [reviews]);

  // Enhanced filtering with topics and sorting
  const filteredAndSortedReviews = useMemo(() => {
    let filtered = reviews.filter(review => {
      // Mark urgent status dynamically
      review.urgent = isUrgent(review);
      
      const matchesFilter = filter === 'all' || 
        (filter === 'urgent' && review.urgent) ||
        (filter === 'unanswered' && !review.responded) ||
        (filter === 'low' && review.rating <= 3) ||
        (filter === 'high' && review.rating >= 4);
      
      const matchesSearch = searchTerm === '' ||
        review.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSource = sourceFilter === 'all' ||
        (sourceFilter === 'google' && review.platform === 'Google') ||
        (sourceFilter === 'tripadvisor' && review.platform === 'TripAdvisor');

      // Si hay filtro de sub-aspecto, NO aplicar filtro de topics (el subaspect ya lo incluye)
      const matchesTopics = subAspectFilter ? true : (
        activeTopics.length === 0 ||
        activeTopics.some(activeTopic => review.topics.includes(activeTopic))
      );
      const matchesSentiment = sentimentFilter === 'all' || review.sentiment === sentimentFilter;
      
      // Filtrar por sub-aspecto si está especificado
      const matchesSubAspect = !subAspectFilter || 
        (review.aspectsData && review.aspectsData.some((asp: any) => {
          if (!asp.sub_aspect) return false;
          // Usar la misma función de normalización que se usa para agrupar sub-aspectos
          const normalizedAspect = normalizeSubAspect(asp.sub_aspect);
          const normalizedFilter = normalizeSubAspect(subAspectFilter);
          
          return normalizedAspect === normalizedFilter;
        }));
      
      return matchesFilter && matchesSearch && matchesSource && matchesTopics && matchesSentiment && matchesSubAspect;
    });

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.datetimeUtc).getTime() - new Date(a.datetimeUtc).getTime());
        break;
      case 'worst':
        filtered.sort((a, b) => a.rating - b.rating);
        break;
      case 'withPhotos':
        filtered.sort((a, b) => (b.images?.length || 0) - (a.images?.length || 0));
        break;
      case 'longest':
        filtered.sort((a, b) => b.text.length - a.text.length);
        break;
      case 'mostHelpful':
        filtered.sort((a, b) => (b.thumbsUpCount || 0) - (a.thumbsUpCount || 0));
        break;
      default:
        break;
    }

    return filtered;
  }, [reviews, filter, searchTerm, activeTopics, sortBy, isUrgent, sourceFilter, sentimentFilter, subAspectFilter]);



  // Enhanced stats calculation
  const stats = useMemo(() => {
    const reviewsWithUrgency = reviews.map(r => ({ ...r, urgent: isUrgent(r) }));
    const responded30d = reviewsWithUrgency.filter(r => r.responded);
    const avgResponseTimeHours = responded30d.length > 0 ? 
      responded30d.reduce((acc, r) => {
        if (r.ownerResponse?.datetimeUtc) {
          const responseTime = (new Date(r.ownerResponse.datetimeUtc).getTime() - new Date(r.datetimeUtc).getTime()) / (1000 * 60 * 60);
          return acc + responseTime;
        }
        return acc;
      }, 0) / responded30d.length : 0;

    return {
      total: reviews.length,
      urgent: reviewsWithUrgency.filter(r => r.urgent && !r.responded).length,
      unanswered: reviews.filter(r => !r.responded).length,
      avgRating: reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length,
      responseRate: Math.round((responded30d.length / reviews.length) * 100),
      avgResponseTimeHours: Math.round(avgResponseTimeHours),
      withPhotos: reviews.filter(r => r.images && r.images.length > 0).length
    };
  }, [reviews, isUrgent]);

  const filterOptions = [
    { id: 'all', label: 'Todas', count: stats.total },
    { id: 'urgent', label: 'Urgentes', count: stats.urgent },
    { id: 'unanswered', label: 'Sin responder', count: stats.unanswered },
    { id: 'low', label: '≤ 3★', count: reviews.filter(r => r.rating <= 3).length },
    { id: 'high', label: '≥ 4★', count: reviews.filter(r => r.rating >= 4).length }
  ];

  // Initialize filter from query string - MEJORADO CON MÁS PARÁMETROS
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    // Filter básico
    const initialFilter = params.get('filter');
    const allowed = new Set(['urgent', 'low', 'high', 'unanswered', 'all', 'negative', 'positive']);
    if (initialFilter && allowed.has(initialFilter)) {
      // Mapear filter a sentiment si es necesario
      if (initialFilter === 'negative' || initialFilter === 'positive') {
        setSentimentFilter(initialFilter as 'negative' | 'positive');
        setFilter('all');
      } else {
        setFilter(initialFilter);
      }
      setTimeout(() => {
        document.getElementById('reviews-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
    
    // Sub-aspecto (filtrado específico desde Insights) - PROCESAR PRIMERO
    const subaspect = params.get('subaspect');
    
    // Topic/Aspect (soporta ambos) - SOLO SI NO HAY SUBASPECT
    const topic = params.get('topic') || params.get('aspect');
    if (topic && !subaspect) {
      // Solo establecer activeTopics si NO estamos filtrando por sub-aspecto
      setActiveTopics([topic]);
      setTimeout(() => {
        document.getElementById('reviews-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
    
    // Source
    const src = params.get('source');
    if (src === 'google' || src === 'tripadvisor') {
      setSourceFilter(src);
      setTimeout(() => {
        document.getElementById('reviews-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
    
    // Sentiment directo
    const sentiment = params.get('sentiment');
    if (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral') {
      setSentimentFilter(sentiment);
      setTimeout(() => {
        document.getElementById('reviews-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
    
    // Gap filter (reviews con oportunidades 5★)
    const gap = params.get('gap');
    if (gap === 'true') {
      // Filtrar por reviews 4★ con comentarios
      setFilter('high');
      setTimeout(() => {
        document.getElementById('reviews-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
    
    // Search term (para sub-aspectos)
    const search = params.get('search');
    if (search) {
      setSearchTerm(search);
      setTimeout(() => {
        document.getElementById('reviews-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
    
    // Sub-aspecto ya procesado arriba
    if (subaspect) {
      setSubAspectFilter(subaspect);
      // Si hay aspecto padre, también mostrarlo en la UI pero NO filtrar por él
      if (topic) {
        // Guardarlo para mostrar en la UI pero no filtrar
        setActiveTopics([topic]);
      }
      setTimeout(() => {
        document.getElementById('reviews-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Consejo rápido (top) basado en filtro actual
  const QuickTips = () => (
    <div className="mb-4">
      {filter === 'low' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-xs">
          Prioriza responder con empatía y ofrecer solución. La rapidez reduce impacto en el rating.
        </div>
      )}
      {filter === 'unanswered' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800 text-xs">
          Responde primero las más recientes. Activa plantillas rápidas para ahorrar tiempo.
        </div>
      )}
      {filter === 'urgent' && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800 text-xs">
          Impacto alto: responde hoy mismo y, si aplica, invita a continuar por privado.
        </div>
      )}
    </div>
  );

  const renderQuickTips = filter !== 'all' ? <QuickTips /> : null;

  // Compute topic counts for chips
  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reviews.forEach(r => (r.topics || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [reviews]);

  const filteredTopicCounts = useMemo(() => {
    if (!topicSearchTerm) return topicCounts;
    return topicCounts.filter(([topic]) => topic.toLowerCase().includes(topicSearchTerm.toLowerCase()));
  }, [topicCounts, topicSearchTerm]);

  const sentimentCounts = useMemo(() => {
    return reviews.reduce(
      (acc, review) => {
        if (review.sentiment) {
          acc[review.sentiment] = (acc[review.sentiment] || 0) + 1;
        }
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 } as Record<Sentiment, number>
    );
  }, [reviews]);

  const toggleTopic = useCallback((topic: string) => {
    setActiveTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  }, []);

  // Highlight helper for search matches
  const highlightMatch = useCallback((text: string, term: string) => {
    if (!term) return text;
    try {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`, 'ig');
      const parts = text.split(regex);
      return parts.map((part, i) => regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">{part}</mark>
      ) : (<span key={i}>{part}</span>));
    } catch {
      return text;
    }
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilter('all');
    setSearchTerm('');
    setActiveTopics([]);
    setSortBy('recent');
    setSourceFilter('all');
    setSentimentFilter('all');
    setTopicSearchTerm('');
    setSubAspectFilter('');
  }, []);

  // Handle review response
  const handleReviewResponse = useCallback((review: Review) => {
    setSelectedReview(review);
    setShowResponsePanel(true);
    navigate(`/review/${review.id}`);
  }, [navigate]);

  // Quick respond helpers
  const buildReviewUrl = useCallback((review: Review): string => {
    if (review.platform === 'Google') {
      return buildGoogleReviewUrl(
        currentBusiness?.google_place_id || null,
        currentBusiness?.name || null,
        (currentBusiness as any)?.google_cid || null
      );
    }
    if (review.platform === 'TripAdvisor') {
      const query = currentBusiness?.name || '';
      return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(query)}`;
    }
    const fallback = currentBusiness?.name ? `${currentBusiness.name} reviews` : 'business reviews';
    return `https://www.google.com/search?q=${encodeURIComponent(fallback)}`;
  }, [currentBusiness?.google_place_id, currentBusiness?.name, (currentBusiness as any)?.google_cid]);

  const buildQuickTemplate = useCallback((review: Review): string => {
    const firstName = review.author?.split(' ')[0] || 'cliente';
    const biz = currentBusiness?.name || 'nuestro negocio';
    if (review.rating <= 2) {
      return `Hola ${firstName}, lamentamos tu experiencia en ${biz}. Gracias por avisarnos: ya estamos revisándolo para mejorar. Si querés, escribinos por privado para resolverlo.`;
    }
    if (review.rating === 3) {
      return `Gracias ${firstName} por tu reseña. Tomamos nota para mejorar y esperamos poder darte una mejor experiencia en ${biz} la próxima.`;
    }
    return `¡Gracias ${firstName}! Nos alegra que hayas tenido una buena experiencia en ${biz}. Tu comentario nos ayuda a seguir mejorando.`;
  }, [currentBusiness?.name]);

  const handleQuickRespond = useCallback(async (e: React.MouseEvent, review: Review) => {
    e.stopPropagation();
    try {
      const text = buildQuickTemplate(review);
      await navigator.clipboard.writeText(text);
      setToast({ visible: true, message: 'Plantilla copiada' });
    } catch (err) {
      // noop si clipboard falla
    }
    const url = buildReviewUrl(review);
    window.open(url, '_blank');
  }, [buildQuickTemplate, buildReviewUrl]);




  // Separate urgent from regular reviews for better UX
  const urgentReviews = filteredAndSortedReviews.filter(review => review.urgent && !review.responded);
  const regularReviews = filteredAndSortedReviews.filter(review => !(review.urgent && !review.responded));

  // Determine next review to act on (urgent first, otherwise first pending)
  const nextReviewToAct = useMemo(() => {
    const ordered = filter === 'all' ? [...urgentReviews, ...regularReviews] : filteredAndSortedReviews;
    return ordered.find(r => r.responseStatus !== 'responded');
  }, [filter, urgentReviews, regularReviews, filteredAndSortedReviews]);

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      {/* Action-First Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Centro de Respuestas</h2>
        <p className="text-gray-600">
          {urgentReviews.length > 0 
            ? `${urgentReviews.length} reseñas críticas necesitan respuesta inmediata`
            : 'Todas las críticas están gestionadas ✅'
          }
        </p>
        {filter === 'all' && nextReviewToAct && (
          <button
            onClick={() => navigate(`/review/${nextReviewToAct.id}`)}
            className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Seguimiento sugerido: {nextReviewToAct.author}
          </button>
        )}
        
        {/* Progress Dashboard - debajo del header */}
        <div className="mt-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4">
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Tu progreso</h3>
            <p className="text-xs text-gray-600">Métricas de gestión</p>
          </div>
          
          <ProgressDashboard 
            totalReviews={progressMetrics.totalReviews}
            reviewsWithResponse={progressMetrics.reviewsWithResponse}
            urgentCount={urgentReviews.length}
            onViewUrgent={() => {
              setFilter('urgent');
              setTimeout(() => {
                document.getElementById('reviews-list')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            isLoading={false}
          />
        </div>
      </div>

      {reviewsLoading && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <Clock className="h-4 w-4 animate-spin" /> Cargando reseñas ...
        </div>
      )}

      {/* Simplified Filters - Only the essentials */}
      <div className="flex items-center justify-between mb-4">
        {filter !== 'all' && (
          <button 
            onClick={() => setFilter('all')}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowUpRight className="h-4 w-4 rotate-180" />
            <span>← Volver a vista principal</span>
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Essential Filter Tabs */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            {filterOptions.slice(0, 4).map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-1 ${
                  filter === option.id
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <span>{option.label}</span>
                {option.count > 0 && (
                  <span className={`px-1 py-0.5 rounded-full text-xs ${
                    filter === option.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {option.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Search Only */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por autor o contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {renderQuickTips}

        {/* Topic chips */}
        {topicCounts.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <input
                type="text"
                placeholder="Buscar temas..."
                value={topicSearchTerm}
                onChange={(e) => setTopicSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
              {topicSearchTerm && (
                <button
                  onClick={() => setTopicSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredTopicCounts.slice(0, 12).map(([topic, count]) => (
                <button
                  key={topic}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTopic(topic);
                  }}
                  className={`px-2 py-1 rounded-full text-xs border transition-all ${
                    activeTopics.includes(topic)
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                  aria-pressed={activeTopics.includes(topic)}
                  aria-label={`Filtrar por ${topic} (${count})`}
                >
                  #{topic} ({count})
                </button>
              ))}
              {filteredTopicCounts.length === 0 && (
                <span className="text-xs text-gray-500">Sin temas que coincidan</span>
              )}
            </div>
          </div>
        )}
        {/* Source chips */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">Plataforma:</span>
          {(['all','google','tripadvisor'] as const).map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-2 py-1 rounded-full text-xs border transition-all ${
                sourceFilter === src ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
              aria-pressed={sourceFilter === src}
            >
              {src === 'all' ? 'Todas' : src === 'google' ? 'Google' : 'TripAdvisor'}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">Sentimiento:</span>
          {(['all', 'positive', 'neutral', 'negative'] as const).map((sent) => {
            const isActive = sentimentFilter === sent;
            const count = sent === 'all' ? reviews.length : sentimentCounts[sent as Sentiment];
            const sentimentStyle = sent !== 'all' ? SENTIMENT_BADGE_STYLES[sent as Sentiment] : null;

            return (
              <button
                key={sent}
                onClick={() => setSentimentFilter(sent)}
                className={`px-2 py-1 rounded-full text-xs border transition-all ${
                  sent === 'all'
                    ? isActive
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    : isActive
                      ? sentimentStyle?.active
                      : sentimentStyle?.inactive
                }`}
                aria-pressed={isActive}
              >
                {sent === 'all' ? 'Todas' : SENTIMENT_LABELS[sent as Sentiment]} ({count})
              </button>
            );
          })}
        </div>

        {/* Active filter summary */}
        {(filter !== 'all' || searchTerm || sentimentFilter !== 'all' || activeTopics.length > 0 || sourceFilter !== 'all' || subAspectFilter) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Mostrando {filteredAndSortedReviews.length} de {reviews.length} reseñas</span>
              {filter !== 'all' && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                  {filterOptions.find(f => f.id === filter)?.label}
                </span>
              )}
              {searchTerm && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                  "{searchTerm}"
                </span>
              )}
              {sentimentFilter !== 'all' && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                  {SENTIMENT_LABELS[sentimentFilter as Sentiment]}
                </span>
              )}
              {activeTopics.length > 0 && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                  #{activeTopics.join(', #')}
                </span>
              )}
              {sourceFilter !== 'all' && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                  {sourceFilter === 'google' ? 'Google' : 'TripAdvisor'}
                </span>
              )}
              {subAspectFilter && (
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                  <span>📍</span> {subAspectFilter}
                </span>
              )}
            </div>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
      {/* Regular Reviews List */}
      <div id="reviews-list" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {filter === 'urgent' ? 'Reseñas Críticas' :
             urgentReviews.length > 0 && filter === 'all' ? 'Otras Reseñas' : 
             'Reseñas'}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>{filteredAndSortedReviews.length} total</span>
          </div>
        </div>

        {(filter === 'all' ? regularReviews : filteredAndSortedReviews).map((review) => {
          const urgentStatus = review.urgent || isUrgent(review);
          const sentimentStyle = review.sentiment ? SENTIMENT_BADGE_STYLES[review.sentiment] : undefined;

          return (
            <article
              key={review.id}
              onClick={() => navigate(`/review/${review.id}`)}
              className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{review.author}</span>
                    {review.sentiment && sentimentStyle && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${sentimentStyle.active}`}
                      >
                        {SENTIMENT_LABELS[review.sentiment]}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <PlatformIcon platform={review.platform} size={14} />
                      {review.platform}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span>{new Date(review.datetimeUtc).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    {review.language && review.language !== 'es' && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                        {review.language.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-gray-700 line-clamp-3">{highlightMatch(review.text, searchTerm) as any}</p>

                  {review.topics && review.topics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {review.topics.slice(0, 3).map((topic, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTopic(topic);
                          }}
                          className={`rounded-full border px-2 py-1 text-[11px] transition-all ${
                            activeTopics.includes(topic)
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                          aria-pressed={activeTopics.includes(topic)}
                          aria-label={`Filtrar por ${topic}`}
                        >
                          {highlightMatch(topic, searchTerm) as any}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="flex flex-wrap justify-end gap-1">
                    {review.responseStatus === 'responded' ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Respondida</span>
                    ) : (
                      <>
                        {urgentStatus && (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">Urgente</span>
                        )}
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">Sin responder</span>
                      </>
                    )}
                  </div>
                  {review.responseStatus !== 'responded' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReviewResponse(review);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Responder
                      </button>
                      <button
                        onClick={(e) => handleQuickRespond(e, review)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
                        aria-label="Copiar plantilla y abrir reseña"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" /> Copiar y abrir
                      </button>
                    </>
                  )}
                  <ArrowUpRight className="mt-1 h-4 w-4 text-gray-300 sm:mt-2" />
                </div>
              </div>
            </article>
          );
        })}
        
        {filteredAndSortedReviews.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No encontramos reseñas</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || activeTopics.length > 0 ? 
                'Probá con otros términos o limpiá los filtros.' : 
                'Sin resultados con esta vista. Podés ver todas las reseñas.'
              }
            </p>
            <div className="flex items-center justify-center gap-2">
              {(searchTerm || activeTopics.length > 0 || filter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
              <button
                onClick={() => navigate('/dashboard')}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Volver al dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Response Panel Sidebar */}
      {showResponsePanel && selectedReview && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowResponsePanel(false)}
            />
            
            {/* Panel */}
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="w-screen max-w-md">
                <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                  <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-medium text-gray-900">
                          Responder reseña
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                          {selectedReview.author} • {selectedReview.rating}★
                        </p>
                      </div>
                      <div className="ml-3 flex h-7 items-center">
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onClick={() => setShowResponsePanel(false)}
                        >
                          <span className="sr-only">Cerrar panel</span>
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-6">
                      {/* Review display */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < selectedReview.rating 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-gray-800">{selectedReview.text}</p>
                        
                        {selectedReview.images && selectedReview.images.length > 0 && (
                          <div className="mt-3 flex space-x-2">
                            {selectedReview.images.map((image, index) => (
                              <img
                                key={index}
                                src={image.thumbUrl}
                                alt="Review"
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Response templates */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Plantillas sugeridas
                        </label>
                        <div className="space-y-2">
                          {selectedReview.rating <= 2 ? (
                            <>
                              <button 
                                className="w-full text-left p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm"
                                onClick={() => {
                      const textarea = document.getElementById('response-textarea') as HTMLTextAreaElement;
                      if (textarea) {
                        textarea.value = `Estimado/a ${selectedReview.author}, lamentamos profundamente su experiencia. Su feedback es muy valioso para nosotros y tomaremos las medidas necesarias para mejorar. Por favor, contáctenos directamente para resolver esta situación. Gracias por darnos la oportunidad de mejorar.`;
                      }
                                }}
                              >
                                Disculpa por experiencia negativa
                              </button>
                              <button 
                                className="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                                onClick={() => {
                                  const textarea = document.getElementById('response-textarea') as HTMLTextAreaElement;
                                  if (textarea) {
                                    textarea.value = `Gracias ${selectedReview.author} por su comentario. Valoramos su feedback y lo utilizaremos para seguir mejorando nuestro servicio. Esperamos tener la oportunidad de brindarle una mejor experiencia en el futuro.`;
                                  }
                                }}
                              >
                                Agradecimiento por feedback
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                className="w-full text-left p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm"
                                onClick={() => {
                                  const textarea = document.getElementById('response-textarea') as HTMLTextAreaElement;
                                  if (textarea) {
                                    textarea.value = `¡Muchas gracias ${selectedReview.author} por su reseña positiva! Nos alegra saber que disfrutó su experiencia. Esperamos verle pronto de nuevo.`;
                                  }
                                }}
                              >
                                Agradecimiento positivo
                              </button>
                              <button 
                                className="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                                onClick={() => {
                                  const textarea = document.getElementById('response-textarea') as HTMLTextAreaElement;
                                  if (textarea) {
                                    textarea.value = `Estimado/a ${selectedReview.author}, ¡gracias por elegirnos y por tomarse el tiempo de compartir su experiencia! Comentarios como el suyo nos motivan a seguir mejorando cada día.`;
                                  }
                                }}
                              >
                                Agradecimiento formal
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Response text area */}
                      <div className="mb-6">
                        <label htmlFor="response-textarea" className="block text-sm font-medium text-gray-700 mb-2">
                          Tu respuesta
                        </label>
                        <textarea
                          id="response-textarea"
                          rows={6}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Escribe tu respuesta aquí..."
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Recomendamos mantener un tono profesional y constructivo.
                        </p>
                      </div>

                      {/* Topics mentioned */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Temas mencionados
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {selectedReview.topics.map((topic, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex-shrink-0 border-t border-gray-200 px-4 py-4 sm:px-6">
                    <div className="flex justify-between space-x-3">
                      <button
                        type="button"
                        className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        onClick={() => {
                          const textarea = document.getElementById('response-textarea') as HTMLTextAreaElement;
                          if (textarea) {
                            navigator.clipboard.writeText(textarea.value);
                            // Aquí podrías añadir un toast de confirmación
                          }
                        }}
                      >
                        📋 Copiar
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        onClick={() => setShowResponsePanel(false)}
                      >
                        ✓ Marcar para seguimiento
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast?.visible && (
        <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded-md shadow-lg">
          {toast.message}
        </div>
      )}

    </div>
  );
};

export default ReviewsManager;