import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusinessContext } from '../contexts/BusinessContext';
import { ArrowLeft, Star, ExternalLink, Copy, MessageSquare, Calendar, User, CheckCircle, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import PlatformIcon from './PlatformIcons';
import { loadReviewById } from '../lib/dataLayer';
import { buildGoogleReviewUrl } from '../utils/reviewLinks';
import { mockReviewsData } from '../mocks';
import { DEMO_MODE, MOCK_NETWORK_DELAY } from '../config/demo';

interface DetailedReview {
  id: string;
  author: string;
  date: string;
  rating: number;
  text: string;
  platform: 'Google' | 'TripAdvisor';
  sentiment?: 'positive' | 'neutral' | 'negative';
  topics: string[];
  images?: { url: string; thumbUrl: string }[];
  responded: boolean;
  ownerResponse?: { text: string; datetimeUtc: string };
}

const ReviewDetail: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const { currentBusiness, businessData } = useBusinessContext();
  const businessName = currentBusiness?.name || '';
  const safeBusinessName = businessName || currentBusiness?.name || 'nuestro negocio';
  const externalPlaceId = currentBusiness?.external_place_id || currentBusiness?.placeId;

  const [dbReview, setDbReview] = useState<DetailedReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Extraer reviews reales del backend data o mock data
  const realReviews = useMemo((): { [key: string]: DetailedReview } => {
    const reviewsMap: { [key: string]: DetailedReview } = {};
    
    // 🎬 MODO DEMO: Usar mock data
    if (DEMO_MODE.enabled) {
      mockReviewsData.forEach(mockReview => {
        reviewsMap[mockReview.id] = {
          id: mockReview.id,
          author: mockReview.author_name,
          date: mockReview.posted_at,
          rating: mockReview.rating_value,
          text: mockReview.review_text,
          platform: mockReview.provider === 'tripadvisor' ? 'TripAdvisor' : 'Google',
          sentiment: mockReview.sentiment as 'positive' | 'neutral' | 'negative',
          topics: Array.isArray(mockReview.aspects) 
            ? mockReview.aspects.map((a: any) => typeof a === 'string' ? a : a.aspect).filter(Boolean)
            : [],
          images: Array.isArray(mockReview.images) 
            ? mockReview.images.map(img => ({
                url: img.image_url || img.url || img,
                thumbUrl: img.thumb_url || img.image_url || img.url || img
              }))
            : undefined,
          responded: !!mockReview.owner_answer,
          ownerResponse: mockReview.owner_answer 
            ? {
                text: mockReview.owner_answer,
                datetimeUtc: mockReview.owner_posted_at || mockReview.posted_at
              }
            : undefined
        };
      });
      return reviewsMap;
    }
    
    // Modo producción: Process Google Reviews
    const googleData = (businessData.reviews as any)?.google;
    const tripAdvisorData = ((businessData.reviews as any)?.tripAdvisor || (businessData.reviews as any)?.tripadvisor);
    const analyzedReviews = ((businessData.analysis as any)?.analyzed_reviews
      || (businessData.analysis as any)?.processed_reviews
      || []) as any[];

    if (googleData?.reviews_preview) {
      googleData.reviews_preview.forEach((googleReview: any, index: number) => {
        // Find corresponding analysis
        const analysis = analyzedReviews.find(
          (analyzed: any) => analyzed.review_id === googleReview.review_id
        );
        
        const reviewId = googleReview.review_id || `google-${index}`;
        reviewsMap[reviewId] = {
          id: reviewId,
          author: googleReview.profile_name || googleReview.author || 'Anonymous',
          date: googleReview.datetime_utc || googleReview.review_datetime_utc || new Date().toISOString(),
          rating: googleReview.rating?.value || googleReview.rating || 5,
          text: googleReview.review_text || googleReview.text_preview || 'Review text not available',
          platform: 'Google',
          sentiment: analysis?.sentiment || undefined,
          topics: analysis?.top_aspects || [],
          images: Array.isArray(googleReview.images)
            ? googleReview.images.map((img: any) => ({
                url: img.image_url || img.url || img,
                thumbUrl: img.image_url || img.url || img
              }))
            : undefined,
          responded: !!googleReview.owner_answer,
          ownerResponse: googleReview.owner_answer
            ? {
                text: googleReview.owner_answer,
                datetimeUtc: googleReview.owner_posted_at || googleReview.datetime_utc || googleReview.review_datetime_utc || new Date().toISOString()
              }
            : undefined
        };
      });
    }
    
    // Process TripAdvisor Reviews
    if (tripAdvisorData?.reviews_preview) {
      tripAdvisorData.reviews_preview.forEach((taReview: any, index: number) => {
        // Find corresponding analysis
        const analysis = analyzedReviews.find(
          (analyzed: any) => analyzed.review_id === taReview.review_id
        );
        
        const reviewId = taReview.review_id || `tripadvisor-${index}`;
        reviewsMap[reviewId] = {
          id: reviewId,
          author: taReview.user?.name || taReview.author || 'Anonymous',
          date: taReview.datetime_utc || taReview.review_datetime_utc || new Date().toISOString(),
          rating: taReview.rating?.value || taReview.rating || 5,
          text: taReview.review_text || taReview.text_preview || 'Review text not available',
          platform: 'TripAdvisor',
          sentiment: analysis?.sentiment || undefined,
          topics: analysis?.top_aspects || [],
          images: Array.isArray(taReview.images)
            ? taReview.images.map((img: any) => ({
                url: img.image_url || img.url || img,
                thumbUrl: img.image_url || img.url || img
              }))
            : undefined,
          responded: !!taReview.has_owner_response,
          ownerResponse: taReview.has_owner_response && taReview.owner_answer
            ? {
                text: taReview.owner_answer,
                datetimeUtc: taReview.owner_posted_at || taReview.datetime_utc || taReview.review_datetime_utc || new Date().toISOString()
              }
            : undefined
        };
      });
    }
    
    return reviewsMap;
  }, [businessData, reviewId]);

  // Priorizar datos reales sobre mock data con protección adicional
  const review = useMemo(() => {
    const targetId = reviewId || '1';
    
    // Intentar encontrar en datos reales primero (datos precargados desde backend)
    if (realReviews[targetId]) {
      return realReviews[targetId];
    }
    
    // Si no está en la cache del contexto, usar la versión cargada desde la BD
    if (dbReview && dbReview.id === targetId) {
      return dbReview;
    }
    return dbReview;
  }, [realReviews, dbReview, reviewId]);

  // Cargar detalle directamente de la BD o mock data si no está disponible en el contexto
  useEffect(() => {
    const shouldLoad = !!reviewId && !realReviews[reviewId];
    if (!shouldLoad) return;

    let mounted = true;
    setLoading(true);
    setLoadError(null);

    const loadReview = async () => {
      try {
        // 🎬 MODO DEMO: Buscar en mock data
        if (DEMO_MODE.enabled) {
          await new Promise(resolve => setTimeout(resolve, MOCK_NETWORK_DELAY));
          
          const mockReview = mockReviewsData.find(r => r.id === reviewId);
          if (!mounted) return;
          
          if (!mockReview) {
            setDbReview(null);
            setLoadError('No encontramos la reseña en los datos de demo.');
            return;
          }

          const formatted: DetailedReview = {
            id: mockReview.id,
            author: mockReview.author_name || 'Usuario Anónimo',
            date: mockReview.posted_at || new Date().toISOString(),
            rating: typeof mockReview.rating_value === 'number' ? Math.max(1, Math.min(5, Math.round(mockReview.rating_value))) : 0,
            text: mockReview.review_text || 'Texto de reseña no disponible',
            platform: mockReview.provider === 'tripadvisor' ? 'TripAdvisor' : 'Google',
            sentiment: mockReview.sentiment as 'positive' | 'neutral' | 'negative' | undefined,
            topics: Array.isArray(mockReview.aspects)
              ? Array.from(new Set(mockReview.aspects.map((a: any) => (typeof a === 'string' ? a : a?.aspect)).filter(Boolean)))
              : [],
            images: Array.isArray(mockReview.images)
              ? mockReview.images.map((img: any) => ({
                  url: img.image_url || img.url || img,
                  thumbUrl: img.thumb_url || img.image_url || img.url || img
                }))
              : undefined,
            responded: !!mockReview.owner_answer,
            ownerResponse: mockReview.owner_answer
              ? {
                  text: mockReview.owner_answer,
                  datetimeUtc: mockReview.owner_posted_at || mockReview.posted_at || new Date().toISOString()
                }
              : undefined
          };

          setDbReview(formatted);
          console.log(`✅ Loaded MOCK review detail for ${reviewId}`);
          return;
        }

        // Modo producción: cargar desde BD
        if (!externalPlaceId) {
          setLoadError('ID del negocio requerido para cargar reseña.');
          return;
        }

        const result = await loadReviewById(externalPlaceId as string, reviewId as string);
        if (!mounted) return;
        if (!result) {
          setDbReview(null);
          setLoadError('No encontramos la reseña en la base de datos.');
          return;
        }

        const formatted: DetailedReview = {
          id: result.id,
          author: result.author_name || 'Usuario Anónimo',
          date: result.posted_at || new Date().toISOString(),
          rating: typeof result.rating_value === 'number' ? Math.max(1, Math.min(5, Math.round(result.rating_value))) : 0,
          text: result.review_text || 'Texto de reseña no disponible',
          platform: result.provider === 'tripadvisor' ? 'TripAdvisor' : 'Google',
          sentiment: result.sentiment || undefined,
          topics: Array.isArray(result.aspects)
            ? Array.from(new Set(result.aspects.map((a: any) => (typeof a === 'string' ? a : a?.aspect)).filter(Boolean)))
            : [],
          images: Array.isArray(result.images)
            ? result.images.map((img: any) => ({
                url: img.image_url || img.url || img,
                thumbUrl: img.thumb_url || img.image_url || img.url || img
              }))
            : undefined,
          responded: !!result.owner_answer,
          ownerResponse: result.owner_answer
            ? {
                text: result.owner_answer,
                datetimeUtc: result.owner_posted_at || result.posted_at || new Date().toISOString()
              }
            : undefined
        };

        setDbReview(formatted);
        console.log(`✅ Loaded review detail for ${reviewId} from database`);
      } catch (error) {
        if (!mounted) return;
        console.error('❌ Error cargando detalle de reseña:', error);
        setLoadError('Ocurrió un error al cargar la reseña.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadReview();

    return () => {
      mounted = false;
    };
  }, [externalPlaceId, reviewId, realReviews]);

  const [responseText, setResponseText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>();
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Reset image index when review changes or has no images
  useEffect(() => {
    if (!review?.images || review.images.length === 0) {
      setCurrentImageIndex(0);
    } else {
      // Ensure index is within bounds
        setCurrentImageIndex(prev => Math.min(prev, (review.images?.length || 0) - 1));
    }
  }, [review?.id, review?.images]);

  // Move focus to image container to keep focus visible when image changes
  useEffect(() => {
    imageContainerRef.current?.focus();
  }, [currentImageIndex]);

  // Early return si no hay review
  if (!review) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center space-x-4 mb-8">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Error</h1>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {loading ? (
              <p className="text-gray-600">Cargando reseña...</p>
            ) : (
              <p className="text-gray-600">
                {loadError || 'No se pudo cargar la información de la reseña. Por favor, intenta nuevamente.'}
              </p>
            )}
            <button
              onClick={() => navigate(-1)}
              className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Generar URL de la reseña (fallback seguro)
  const reviewUrl = buildGoogleReviewUrl(
    currentBusiness?.google_place_id || null,
    businessName,
    (currentBusiness as any)?.google_cid || null
  );

  // Variables para los templates
  const firstName = review?.author?.split(' ')[0] || 'cliente';
  const biz = safeBusinessName;

  const templates = [
    // Negativas (1–3 ★) — al menos una variante resolutiva
    ...(((review?.rating || 0) <= 3) ? [
      {
        id: 'negativa_breve_empatica',
        name: 'Negativa — breve y empática',
        text: `Hola ${firstName}, lamentamos que tu experiencia en ${biz} no haya sido la esperada. Tomamos en serio tus comentarios y ya estamos revisando internamente. Gracias por contarlo.`
      },
      {
        id: 'negativa_contacto_opcional',
        name: 'Negativa — con contacto opcional',
        text: `Gracias ${firstName} por avisarnos. Entendemos tu malestar y queremos mejorar. Si querés, escribinos por privado para seguirlo; mientras tanto, ya estamos ajustando procesos en ${biz}.`
      },
      {
        id: 'negativa_proactiva_contacto',
        name: 'Negativa — proactiva con contacto',
        text: `Hola ${firstName}, nos tomamos muy en serio tu comentario y queremos solucionarlo. Vamos a ponernos en contacto contigo para resolver lo que pasó en ${biz}. Tu experiencia es importante para nosotros.`
      },
      {
        id: 'negativa_resolutiva',
        name: 'Negativa — resolutiva',
        text: `Hola ${firstName}, gracias por tu reseña. Siento que hubo un error de nuestra parte. Queremos invitarte a volver con un descuento / beneficio para que veas la diferencia. Si te parece, hablamos personalmente para coordinar.`
      }
    ] : [
      // Positivas (4–5 ★)
      {
        id: 'positiva_agradecida',
        name: 'Positiva — agradecida',
        text: `¡Gracias ${firstName}! Nos alegra que hayas tenido una buena experiencia en ${biz}. Tus comentarios nos motivan a seguir mejorando. ¡Te esperamos pronto!`
      },
      {
        id: 'positiva_cercana',
        name: 'Positiva — cercana',
        text: `Hola ${firstName}, muchas gracias por calificarnos. Qué bueno saber que la pasaste bien en ${biz}. Cuando quieras, volvés.`
      }
    ]),

    // Neutral / mixta (opcional)
    {
      id: 'neutral_equilibrada',
      name: 'Neutral — equilibrada',
      text: `Gracias ${firstName} por tu reseña. Nos alegra lo positivo y tomamos nota de lo que podemos mejorar. Ojalá podamos darte una mejor experiencia en ${biz} la próxima.`
    },

    // Universal corta y profesional
    {
      id: 'corta_profesional',
      name: 'Corta — profesional',
      text: `Gracias ${firstName} por tu comentario. Lo valoramos mucho. Saludos de ${biz}.`
    }
  ];

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template.id);
    setResponseText(template.text);
  };

  const handleGoToReview = () => {
    if (!responseText.trim()) return;
    
    // Abrir la URL de la reseña en una nueva pestaña
    window.open(reviewUrl, '_blank');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(responseText);
      setCopySuccess(true);
      setToast({ visible: true, message: 'Texto copiado' });
      setTimeout(() => {
        setCopySuccess(false);
        setToast({ visible: false, message: '' });
      }, 2000); // Reset después de 2 segundos
    } catch (err) {
      console.error('Error copiando texto:', err);
    }
  };

  // Funciones para el carrousel de imágenes
  const nextImage = () => {
    if (review?.images && review.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % review.images!.length);
    }
  };

  const prevImage = () => {
    if (review?.images && review.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + review.images!.length) % review.images!.length);
    }
  };

  const detectedTheme = (review?.rating || 0) <= 3 
    ? (review?.text || '').toLowerCase().includes('lento') ? 'Servicio lento'
    : (review?.text || '').toLowerCase().includes('frío') ? 'Calidad de comida'
    : (review?.text || '').toLowerCase().includes('precio') ? 'Relación precio-valor'
    : 'Experiencia general'
    : 'Experiencia positiva';

  // Detectar temas automáticamente del texto
  const detectTopics = () => {
    if (review?.topics && review.topics.length > 0) {
      return review.topics;
    }

    const text = (review?.text || '').toLowerCase();
    const detectedTopics: string[] = [];
    
    if (text.includes('servicio') || text.includes('atención') || text.includes('personal')) {
      detectedTopics.push('Servicio');
    }
    if (text.includes('comida') || text.includes('plato') || text.includes('sabor')) {
      detectedTopics.push('Comida');
    }
    if (text.includes('precio') || text.includes('caro') || text.includes('barato')) {
      detectedTopics.push('Precio');
    }
    if (text.includes('ambiente') || text.includes('lugar') || text.includes('música')) {
      detectedTopics.push('Ambiente');
    }
    if (text.includes('limpio') || text.includes('sucio') || text.includes('higiene')) {
      detectedTopics.push('Higiene');
    }
    if (text.includes('tiempo') || text.includes('espera') || text.includes('rápido') || text.includes('lento')) {
      detectedTopics.push('Tiempo de espera');
    }

    return detectedTopics.length > 0 ? detectedTopics : ['Experiencia general'];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Detalle de Reseña</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda - Reseña */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  {/* Línea superior: Solo el nombre del autor */}
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{review?.author || 'Usuario Anónimo'}</h3>
                  </div>
                  
                  {/* Línea inferior: Plataforma y fecha */}
                  <div className="flex items-center space-x-2 mb-3">
                    {/* Platform indicator */}
                    {review?.platform && (
                      <div className="flex items-center space-x-1.5">
                        <PlatformIcon platform={review.platform} size={16} />
                        <span className="text-sm font-medium text-gray-600">{review.platform}</span>
                      </div>
                    )}
                    
                    <span className="text-sm text-gray-400">•</span>
                    
                    {/* Date */}
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {review?.date 
                          ? (() => {
                              try {
                                return new Date(review.date).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              } catch (error) {
                                console.warn('Error formatting date:', review.date, error);
                                return 'Fecha inválida';
                              }
                            })()
                          : 'Fecha no disponible'
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < (review?.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-gray-900">{review?.rating || 0}/5</span>
                  </div>
                  
                  <p className="text-gray-800 leading-relaxed">{review?.text || 'Texto de reseña no disponible'}</p>
                </div>
              </div>
            </div>

            {/* Carrousel de imágenes */}
            {review?.images && review.images.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" role="group" aria-label="Imágenes de la reseña" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'ArrowRight') nextImage(); if (e.key === 'ArrowLeft') prevImage(); }}
            >
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <span>Imágenes de la reseña</span>
                  {(review.images?.length || 0) > 1 && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({currentImageIndex + 1}/{review.images?.length || 0})
                    </span>
                  )}
                </h4>
                
                <div className="relative">
                <div ref={imageContainerRef} className="relative overflow-hidden rounded-lg bg-gray-100 focus:outline-none" style={{ paddingBottom: '56.25%' }} tabIndex={0}>
                    {review.images && review.images[currentImageIndex] && (
                      <img
                        src={review.images[currentImageIndex].url || review.images[currentImageIndex].thumbUrl}
                        alt={`Imagen ${currentImageIndex + 1} de la reseña`}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback si la imagen no carga
                          e.currentTarget.src = review.images?.[currentImageIndex]?.thumbUrl || '';
                        }}
                      />
                    )}
                    
                    {/* Controles del carrousel */}
                    {(review.images?.length || 0) > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors focus:outline-none"
                        aria-label="Anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors focus:outline-none"
                        aria-label="Siguiente"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Indicadores de imagen */}
                  {(review.images?.length || 0) > 1 && (
                  <div className="flex justify-center mt-4 space-x-2" role="tablist" aria-label="Seleccionar imagen">
                      {review.images?.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentImageIndex ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        role="tab"
                        aria-selected={index === currentImageIndex}
                        aria-label={`Imagen ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Análisis automático */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-blue-900 mb-3">Análisis Automático</h4>
              <div className="space-y-3">
                {/* Sentiment */}
                {review?.sentiment && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">Sentimiento:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      review.sentiment === 'positive' 
                        ? 'bg-green-100 text-green-800'
                        : review.sentiment === 'negative'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {review.sentiment === 'positive' ? '😊 Positivo' : 
                       review.sentiment === 'negative' ? '😞 Negativo' : 
                       '😐 Neutral'}
                    </span>
                  </div>
                )}
                
                {/* Temas detectados */}
                <div>
                  <span className="text-sm text-blue-800 block mb-2">Temas detectados:</span>
                  <div className="flex flex-wrap gap-1">
                    {(review?.topics && review.topics.length > 0 ? review.topics : detectTopics()).map((topic, index) => (
                      <span key={index} className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        <Tag className="h-3 w-3 mr-1" />
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">Tema principal:</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    {(review?.topics && review.topics.length > 0) ? review.topics[0] : detectedTheme}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">Urgencia:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    (review?.rating || 0) <= 2 
                      ? 'bg-red-100 text-red-800'
                      : (review?.rating || 0) === 3 
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                  }`}>
                    {(review?.rating || 0) <= 2 ? 'Alta' : (review?.rating || 0) === 3 ? 'Media' : 'Baja'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h5 className="font-medium text-yellow-900 mb-3">💡 Consejos para responder</h5>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li>• Copia el texto de respuesta generado</li>
                <li>• Haz clic en "Ir a la reseña" para abrir el link directo</li>
                <li>• Pega tu respuesta en la plataforma oficial</li>
                <li>• Responde dentro de 24 horas para máximo impacto</li>
                <li>• Mantén un tono profesional y empático</li>
                <li>• Agradece el feedback, incluso si es negativo</li>
              </ul>
            </div>
          </div>

          {/* Columna derecha - Respuesta */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <h4 className="text-lg font-semibold text-gray-900">Responder Reseña</h4>
              </div>

              {/* Templates sugeridas */}
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Plantillas sugeridas:</h5>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="font-medium mb-1">{template.name}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {template.text.substring(0, 100)}...
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Área de texto para respuesta */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tu respuesta:
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Escribe tu respuesta personalizada aquí..."
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {responseText.length} caracteres
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className={`flex items-center space-x-1 text-xs transition-all duration-200 ${
                        copySuccess 
                          ? 'text-green-600 hover:text-green-700' 
                          : 'text-blue-600 hover:text-blue-700'
                      }`}
                    >
                      {copySuccess ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                        <button
                          type="button"
                          onClick={async () => { await handleCopyText(); handleGoToReview(); }}
                          disabled={!responseText.trim()}
                          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 hover:shadow-md"
                          aria-label="Copiar y abrir reseña"
                          title="Copiar y abrir reseña"
                        >
                          <ExternalLink className="h-5 w-5" />
                          <span>Copiar y abrir reseña</span>
                        </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast?.visible && (
        <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded-md shadow-lg">
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default ReviewDetail;