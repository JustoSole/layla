import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, X, AlertCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { campaignService } from '../services/api';

// Aspect options with icons
const ASPECT_OPTIONS = [
  { id: 'comida', label: 'Comida/Sabor', icon: '🍽️', sub_options: ['Sabor malo', 'Frío/caliente incorrecto', 'Porciones pequeñas', 'Presentación descuidada'] },
  { id: 'servicio', label: 'Servicio', icon: '🙋', sub_options: ['Personal poco amable', 'Tardaron en atender', 'Error en pedido', 'No conocían menú'] },
  { id: 'tiempo_espera', label: 'Tiempo de espera', icon: '⏱️', sub_options: ['Espera muy larga', 'No avisaron demora', 'Prometieron más rápido'] },
  { id: 'limpieza', label: 'Limpieza', icon: '✨', sub_options: ['Mesa sucia', 'Baños descuidados', 'Cubiertos sucios', 'Ambiente descuidado'] },
  { id: 'precio', label: 'Precio/Valor', icon: '💰', sub_options: ['Muy caro', 'No vale lo que cuesta', 'Cargos extras no informados'] },
  { id: 'ambiente', label: 'Ambiente', icon: '🎵', sub_options: ['Muy ruidoso', 'Música molesta', 'Temperatura incómoda', 'Iluminación mala'] }
];

const ReviewRequestLanding: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  
  // Form state
  const [step, setStep] = useState<number>(1);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [aspectDetails, setAspectDetails] = useState<Record<string, string[]>>({});
  const [cesScore, setCesScore] = useState<number | null>(null);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // UI state
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // Campaign data
  const [campaign, setCampaign] = useState<any>(null);

  // Load campaign data
  useEffect(() => {
    const loadCampaign = async () => {
      if (!shortCode) {
        setError('Código de campaña no válido');
        setLoading(false);
        return;
      }

      try {
        const data = await campaignService.getByShortCode(shortCode);
        setCampaign(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading campaign:', err);
        setError('Campaña no encontrada o inactiva');
        setLoading(false);
      }
    };

    loadCampaign();
  }, [shortCode]);

  // Handle rating selection
  const handleRatingClick = (rating: number) => {
    setSelectedRating(rating);
    
    // If rating is 5, redirect to Google
    if (rating === 5) {
      setIsRedirecting(true);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // In production, redirect to Google Reviews
            // window.location.href = campaign.business.google_url;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (rating <= 3) {
      // Go to aspect selection
      setStep(2);
    } else {
      // Rating 4: show thank you
      setSubmitted(true);
      submitBasicFeedback(rating);
    }
  };

  // Submit basic feedback (for rating 4)
  const submitBasicFeedback = async (rating: number) => {
    try {
      await campaignService.submitFeedback({
        short_code: shortCode!,
        rating_value: rating
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  // Toggle aspect selection
  const toggleAspect = (aspectId: string) => {
    if (selectedAspects.includes(aspectId)) {
      setSelectedAspects(selectedAspects.filter(id => id !== aspectId));
      const newDetails = { ...aspectDetails };
      delete newDetails[aspectId];
      setAspectDetails(newDetails);
    } else {
      setSelectedAspects([...selectedAspects, aspectId]);
    }
  };

  // Toggle aspect detail
  const toggleAspectDetail = (aspectId: string, detail: string) => {
    const current = aspectDetails[aspectId] || [];
    if (current.includes(detail)) {
      setAspectDetails({
        ...aspectDetails,
        [aspectId]: current.filter(d => d !== detail)
      });
    } else {
      setAspectDetails({
        ...aspectDetails,
        [aspectId]: [...current, detail]
      });
    }
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      await campaignService.submitFeedback({
        short_code: shortCode!,
        rating_value: selectedRating!,
        selected_aspects: selectedAspects,
        aspect_details: aspectDetails,
        ces_score: cesScore || undefined,
        nps_score: npsScore || undefined,
        review_text: feedbackText || undefined,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Error al enviar feedback. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Oops!</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            ¡Recibido!
          </h2>
          <p className="text-gray-600 mb-2">
            Gracias por tu feedback.
          </p>
          {selectedRating && selectedRating <= 3 && (
            <p className="text-gray-600">
              Te contactaremos pronto para resolver esto.
            </p>
          )}
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Powered by <span className="font-semibold text-blue-600">ReputacionLocal</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Redirecting state (rating 5)
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Star
                key={rating}
                className="w-8 h-8 text-yellow-400 fill-yellow-400"
              />
            ))}
          </div>

          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎉</span>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            ¡Gracias por tu excelente opinión!
          </h2>
          
          <p className="text-gray-600 mb-6">
            ¿Nos ayudas a compartirla en Google?
          </p>
          
          <button
            onClick={() => {
              // TODO: Add actual Google Reviews URL
              alert('¡Redirigiendo a Google Reviews! (Demo)');
            }}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg mb-3"
          >
            Dejar reseña en Google
          </button>
          
          <button
            onClick={() => {
              setSubmitted(true);
              submitBasicFeedback(5);
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Saltar
          </button>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Redirigiendo en <span className="font-bold text-blue-600">{countdown}</span>s...
            </p>
          </div>

          <div className="mt-6">
            <p className="text-xs text-gray-500">
              Powered by <span className="font-semibold text-blue-600">ReputacionLocal</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const business = campaign?.business;

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Hero Image */}
        {business?.main_image && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={business.main_image}
              alt={business.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Logo */}
            {business.logo && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <img
                  src={business.logo}
                  alt={business.name}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
                />
              </div>
            )}
          </div>
        )}

        <div className="p-8 pt-16">
          {/* Business Name */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {business?.name || 'Negocio'}
          </h1>

          {/* Progress indicator */}
          {step > 1 && step < 6 && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Paso {step - 1} de 4</span>
                <span>{Math.round(((step - 1) / 4) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((step - 1) / 4) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {/* STEP 1: Rating Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <p className="text-center text-gray-600 mb-8">
                ¿Cómo fue tu experiencia?
              </p>
              
              <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRatingClick(rating)}
                    onMouseEnter={() => setHoveredRating(rating)}
                    onMouseLeave={() => setHoveredRating(null)}
                    className="group transition-transform hover:scale-125 active:scale-110"
                  >
                    <Star
                      className={`w-14 h-14 transition-colors ${
                        (hoveredRating && hoveredRating >= rating) ||
                        (selectedRating && selectedRating >= rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              
              <p className="text-center text-sm text-gray-500">
                Toca las estrellas para calificar
              </p>
            </div>
          )}

          {/* STEP 2: Aspect Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <span className="text-3xl mb-3 block">😔</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ¿Qué no funcionó bien?
                </h3>
                <p className="text-sm text-gray-600">
                  Selecciona los aspectos que te decepcionaron
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {ASPECT_OPTIONS.map(aspect => (
                  <button
                    key={aspect.id}
                    onClick={() => toggleAspect(aspect.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedAspects.includes(aspect.id)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{aspect.icon}</div>
                    <div className="text-sm font-medium text-gray-900">{aspect.label}</div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setSelectedRating(null);
                    setStep(1);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedAspects.length === 0}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Aspect Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Cuéntanos más detalles
                </h3>
                <p className="text-sm text-gray-600">
                  ¿Qué específicamente estuvo mal?
                </p>
              </div>

              {selectedAspects.map(aspectId => {
                const aspect = ASPECT_OPTIONS.find(a => a.id === aspectId);
                if (!aspect) return null;

                return (
                  <div key={aspectId} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{aspect.icon}</span>
                      <h4 className="font-medium text-gray-900">{aspect.label}</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {aspect.sub_options.map(option => (
                        <button
                          key={option}
                          onClick={() => toggleAspectDetail(aspectId, option)}
                          className={`p-3 text-sm text-left rounded-lg border transition-all ${
                            aspectDetails[aspectId]?.includes(option)
                              ? 'border-blue-600 bg-blue-50 text-blue-900'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CES & NPS */}
          {step === 4 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                  Dos preguntas rápidas
                </h3>
              </div>

              {/* CES */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  ¿Qué tan fácil fue resolver tu problema?
                </label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      onClick={() => setCesScore(score)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all ${
                        cesScore === score
                          ? 'bg-blue-600 text-white scale-110'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {score === 1 && '😫'}
                      {score === 2 && '😕'}
                      {score === 3 && '😐'}
                      {score === 4 && '🙂'}
                      {score === 5 && '😊'}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2 px-2">
                  <span>Muy difícil</span>
                  <span>Muy fácil</span>
                </div>
              </div>

              {/* NPS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  ¿Recomendarías este lugar? (0-10)
                </label>
                <div className="flex justify-center gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                    <button
                      key={score}
                      onClick={() => setNpsScore(score)}
                      className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium transition-all ${
                        npsScore === score
                          ? 'bg-blue-600 text-white scale-110'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>No lo recomendaría</span>
                  <span>Definitivamente sí</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Additional Feedback & Contact */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ¿Algo más que quieras agregar?
                </h3>
                <p className="text-sm text-gray-600">
                  Opcional pero muy útil
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentarios adicionales
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Cuéntanos tu experiencia..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tu@email.com"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Para que podamos contactarte y resolver el problema
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+54 9 11 xxxx-xxxx"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    'Enviar feedback'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer branding */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-500">
            Powered by <span className="font-semibold text-blue-600">ReputacionLocal</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReviewRequestLanding;
