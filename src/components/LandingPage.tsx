import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Shield, Zap, ArrowRight, CheckCircle, TrendingUp, MessageSquare, Menu, X, Clock, Award, Phone, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBusinessContext } from '../contexts/BusinessContext';
import GoogleLoginButton from './GoogleLoginButton';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { currentBusiness } = useBusinessContext();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showRedirectToast, setShowRedirectToast] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  
  // Redirigir automáticamente al onboarding después del login
  useEffect(() => {
    if (user && !authLoading) {
      setShowRedirectToast(true);
      const timeout = setTimeout(() => {
        navigate('/onboarding');
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [user, authLoading, navigate]);
  
  const handleStartTrial = async () => {
    if (user) {
      if (currentBusiness) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
      return;
    }
    await signInWithGoogle();
  };
  const primaryCtaClasses =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';
  const secondaryCtaClasses =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-base font-semibold text-gray-700 transition-all duration-150 hover:-translate-y-0.5 hover:border-gray-400 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

  const primaryCtaLabel = 'Solicitar mi reporte gratis';

  const secondaryCtaLabel = 'Ver ejemplo de análisis';

  const trustSignals = [
    {
      icon: Shield,
      label: 'Reporte gratuito',
      description: 'Análisis completo sin costo ni compromiso'
    },
    {
      icon: CheckCircle,
      label: 'En menos de 24hs',
      description: 'Tu reporte personalizado por email'
    },
    {
      icon: BarChart3,
      label: 'IA especializada',
      description: 'Específicamente entrenada para gastronomía'
    }
  ];

  const features = [
    {
      icon: <MessageSquare className="h-6 w-6 text-blue-600" />,
      title: 'Respuestas Semi-Automáticas con IA',
      description: 'Genera respuestas personalizadas para cada review en segundos. Solo revisás y enviás.',
      benefit: 'Respondé 10x más rápido con calidad profesional'
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
      title: 'Visión Holística 360°',
      description: 'Dashboard completo: rating, tendencias, competencia, staff y alertas críticas en una sola vista',
      benefit: 'Tomá decisiones informadas, no por intuición'
    },
    {
      icon: <Shield className="h-6 w-6 text-blue-600" />,
      title: 'Encuestas Internas QR',
      description: 'Capturá feedback negativo ANTES de que llegue a Google con encuestas en mesa',
      benefit: 'Prevení reviews negativas, recuperá clientes insatisfechos'
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-blue-600" />,
      title: 'Análisis de Tendencias + Competencia',
      description: 'Seguí tu evolución mensual y comparate con 4 competidores directos en tiempo real',
      benefit: 'Sabé dónde estás parado y hacia dónde ir'
    },
    {
      icon: <Award className="h-6 w-6 text-blue-600" />,
      title: 'Detección Automática de Staff',
      description: 'Identificá qué empleados mencionan los clientes y su desempeño individual',
      benefit: 'Gestión de equipo basada en voz del cliente'
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-blue-600" />,
      title: 'Insights Accionables Específicos',
      description: 'No te dice "mejorá el servicio", te dice "problema concentrado viernes-sábado 20:00-22:00"',
      benefit: 'Patrones específicos, no consejos genéricos'
    }
  ];

  const faqs = [
    {
      question: '¿Cómo funciona el análisis de IA para restaurantes?',
      answer:
        'Analizamos tus reviews de Google y TripAdvisor con IA especializada en gastronomía. Identificamos 12+ aspectos específicos (comida, servicio, ambiente, etc.) y te decimos exactamente qué mejorar para subir tu rating.'
    },
    {
      question: '¿Qué incluye el reporte gratuito?',
      answer:
        'Análisis completo de tus reviews actuales, identificación de patrones y problemas específicos, gap analysis para llegar a 5★, detección de staff mencionado, y 3-5 insights accionables específicos sobre dónde enfocar mejoras.'
    },
    {
      question: '¿Cuándo estará disponible la plataforma completa?',
      answer:
        'Estamos en fase beta con restaurantes seleccionados. Si te anotas en la lista de espera, tendrás acceso prioritario cuando abramos nuevos cupos.'
    },
    {
      question: '¿Solo funciona para restaurantes?',
      answer:
        'Por ahora estamos especializados 100% en gastronomía: restaurantes, cafeterías, bares, food trucks. La IA está entrenada específicamente para entender el lenguaje y problemas del sector gastronómico.'
    },
    {
      question: '¿Qué diferencia tienen de otras herramientas de reviews?',
      answer:
        'Somos los únicos con IA especializada en gastronomía que detecta automáticamente staff, hace gap analysis 4★→5★, e identifica patrones específicos como "problema concentrado viernes-sábado 20:00-22:00" en lugar de decir genéricamente "mejorá el servicio".'
    },
    {
      question: '¿El reporte gratuito tiene algún compromiso?',
      answer:
        'Absolutamente ninguno. Es un reporte completo que te enviamos por email sin costo, sin solicitar tarjeta de crédito, y sin compromiso de compra. Solo queremos mostrarte el valor que podemos aportar.'
    }
  ];

  // Removing testimonials to avoid legal issues with fictional businesses

  const waitlistFeatures = [
    'Reporte gratuito completo de tu restaurante',
    'Análisis con IA especializada en gastronomía',
    'Gap analysis: cómo llegar a 5★',
    'Detección automática de staff mencionado',
    'Insights específicos sobre patrones y oportunidades',
    'Acceso prioritario a la plataforma beta'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Redirect toast */}
      {showRedirectToast && (
        <div 
          className="fixed top-4 right-4 z-[60] bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg"
          role="status" 
          aria-live="polite"
        >
          Ingresaste con Google. Te llevamos a configurar tu negocio…
        </div>
      )}
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ReputacionLocal</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Características</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Lista de Espera</a>
              <button 
                onClick={() => {
                  const formSection = document.getElementById('waitlist-form');
                  formSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-blue-600 text-white px-4 py-2 text-sm rounded-lg shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {primaryCtaLabel}
              </button>
            </div>
            
            {/* Mobile Navigation Toggle */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-all duration-150 hover:-translate-y-0.5 hover:text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                aria-label={showMobileMenu ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
              >
                {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
          
          {/* Mobile Navigation Menu */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-100 py-4">
              <div className="flex items-center space-x-3 px-1 pb-4 text-sm font-medium text-gray-900">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>ReputacionLocal</span>
              </div>
              <div className="space-y-4">
                <a 
                  href="#features" 
                  className="block text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Características
                </a>
                <a 
                  href="#pricing" 
                  className="block text-gray-600 hover:text-gray-900 transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Lista de Espera
                </a>
                <div className="pt-2 border-t border-gray-100">
                  <button 
                    onClick={() => {
                      setShowMobileMenu(false);
                      const formSection = document.getElementById('waitlist-form');
                      formSection?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 text-sm rounded-lg shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    {primaryCtaLabel}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                <Zap className="mr-1 h-4 w-4" />
                IA Especializada en Restaurantes
              </div>

              <h1 className="mt-6 text-4xl font-bold leading-tight text-gray-900 lg:text-5xl">
                Descubrí exactamente por qué tu restaurante no llega a 5 estrellas
              </h1>

              <p className="mt-4 text-lg leading-relaxed text-gray-600 lg:text-xl">
                La primera IA especializada en gastronomía que analiza tus reviews y te dice QUÉ hacer mañana para pasar de 4.2★ a 4.6★. No consejos genéricos: recomendaciones específicas para restaurantes.
              </p>

              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <button 
                  onClick={() => {
                    const formSection = document.getElementById('waitlist-form');
                    formSection?.scrollIntoView({ behavior: 'smooth' });
                  }} 
                  className={primaryCtaClasses}
                >
                  <span>{primaryCtaLabel}</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    const section = document.getElementById('features');
                    section?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={secondaryCtaClasses}
                >
                  <span>{secondaryCtaLabel}</span>
                </button>
              </div>

              <div className="mt-8 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                {trustSignals.map(({ icon: Icon, label, description }) => (
                  <div key={label} className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                      <Icon className="h-4 w-4 text-blue-600" />
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{label}</p>
                      <p>{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Ejemplo: Pizzería Centro</h3>
                  <p className="text-sm text-gray-500">Esto es lo que descubriríamos sobre tu restaurante</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  IA en acción
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-red-900">🕐 Tiempo de espera: 6.2/10</p>
                      <p className="mt-1 text-xs text-red-700">"Tardaron 45 minutos" - 23 menciones en viernes-sábado</p>
                      <p className="mt-1 text-xs font-medium text-red-800">💡 Patrón detectado: Problema concentrado en horario pico</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-yellow-900">👥 Staff detectado: María (mesera)</p>
                      <p className="mt-1 text-xs text-yellow-700">15 menciones, 87% positivas - "María muy atenta"</p>
                      <p className="mt-1 text-xs font-medium text-yellow-800">💡 Insight: Tu mejor evaluada, clientes la buscan específicamente</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">🎯 Gap Analysis: 18 clientes satisfechos</p>
                      <p className="mt-1 text-xs text-green-700">Te dieron 4★ pero mencionaron "pocos postres opciones"</p>
                      <p className="mt-1 text-xs font-medium text-green-800">💡 Oportunidad: Menú de postres es punto débil vs competencia</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Main Focus */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 mb-6">
              <TrendingUp className="mr-2 h-4 w-4" />
              Datos de la industria
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Por qué importa tu reputación online
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Los números que todo dueño de restaurante debería conocer para entender el impacto real de las reviews en su negocio
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-4xl font-bold text-blue-600 mb-3">87%</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">lee reviews antes de ir</div>
              <div className="text-sm text-gray-600">de los clientes consulta Google Maps antes de elegir restaurante</div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-4xl font-bold text-blue-600 mb-3">+0.5★</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">= 50% más visitas</div>
              <div className="text-sm text-gray-600">mejorar rating de 4.0 a 4.5 estrellas aumenta tráfico significativamente</div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-4xl font-bold text-blue-600 mb-3">73%</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">nunca vuelve</div>
              <div className="text-sm text-gray-600">de clientes insatisfechos no regresa si no se resuelve su problema</div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-4xl font-bold text-blue-600 mb-3">4.0★</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">rating mínimo</div>
              <div className="text-sm text-gray-600">debajo de 4.0 estrellas la mayoría de clientes ni considera el restaurante</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">El problema: No sabés qué mejorar específicamente</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-red-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Reviews genéricas</h4>
                <p className="text-gray-600 text-sm">"El servicio fue lento" - ¿Pero cuándo? ¿Por qué? ¿Qué días específicamente?</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Tiempo perdido</h4>
                <p className="text-gray-600 text-sm">Horas leyendo reviews manualmente sin poder identificar patrones claros</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Decisiones por intuición</h4>
                <p className="text-gray-600 text-sm">Sin datos específicos, las mejoras son adivinanzas costosas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para destacar
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Herramientas profesionales diseñadas para negocios locales que quieren crecer
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div key={index} className="rounded-xl border border-gray-100 bg-gray-50/60 p-6 transition-all duration-150 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-md">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-3">
                  {feature.description}
                </p>
                <div className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full inline-block">
                  {feature.benefit}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Social Proof Section - Honest approach */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              ¿Por qué los negocios locales eligen ReputacionLocal?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Una plataforma simple y honesta para gestionar tu reputación online sin complicaciones
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[{
              icon: Clock,
              title: 'Configuración en minutos',
              copy: 'Conecta tu negocio y obtén tu primer reporte inmediatamente.'
            }, {
              icon: BarChart3,
              title: 'Datos reales y accionables',
              copy: 'Nada inflado: priorizamos métricas claras para tomar decisiones.'
            }, {
              icon: MessageSquare,
              title: 'Responde sin fricción',
              copy: 'Plantillas listas para enviar en Google y TripAdvisor.'
            }].map(({ icon: Icon, title, copy }) => (
              <article key={title} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-150 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>


      {/* Waitlist Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Únete a la lista de espera
            </h2>
            <p className="text-xl text-gray-600">
              Obtené tu reporte gratuito • Acceso prioritario a la plataforma beta
            </p>
          </div>
          
          <div className="flex justify-center">
            <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="rounded-full bg-blue-500 px-4 py-1 text-sm font-medium text-white shadow">
                  Reporte en menos de 24hs
                </span>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">ReputacionLocal</h3>
                <p className="text-gray-600 mb-4">La primera IA especializada en restaurantes</p>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-3xl font-bold text-blue-600">GRATIS</span>
                </div>
                <p className="text-sm text-gray-500">Reporte completo sin costo • Sin compromiso</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                {waitlistFeatures.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={() => {
                  // Scroll to form or handle waitlist signup
                  const formSection = document.getElementById('waitlist-form');
                  formSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Solicitar mi reporte gratuito
              </button>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              ¿Tenés un grupo de restaurantes? Hablemos.
            </p>
            <a 
              href="mailto:sales@reputacionlocal.com?subject=Consulta%20para%20múltiples%20restaurantes"
              className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              Contactar para volumen →
            </a>
          </div>
        </div>
      </section>

      {/* Waitlist Form Section */}
      <section id="waitlist-form" className="py-20 bg-blue-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Solicita tu reporte gratuito
            </h2>
            <p className="text-xl text-gray-600">
              Completá el formulario y te enviaremos el análisis completo de tu restaurante en menos de 24 horas
            </p>
          </div>
          
          <form 
            name="contact" 
            method="POST" 
            data-netlify="true"
            className="bg-white rounded-2xl shadow-lg p-8 space-y-6"
          >
            {/* Hidden field for Netlify spam protection */}
            <input type="hidden" name="form-name" value="contact" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="owner-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Tu nombre *
                </label>
                <input
                  type="text"
                  id="owner-name"
                  name="owner-name"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Ej: Juan Perez"
                />
              </div>
              
              <div>
                <label htmlFor="restaurant-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del restaurante *
                </label>
                <input
                  type="text"
                  id="restaurant-name"
                  name="restaurant-name"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Ej: La Pizzería del Centro"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="google-maps-url" className="block text-sm font-medium text-gray-700 mb-2">
                Link de Google Maps de tu restaurante *
              </label>
              <input
                type="url"
                id="google-maps-url"
                name="google-maps-url"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="https://maps.google.com/..."
              />
              <p className="text-sm text-gray-500 mt-1">
                💡 Tip: Buscá tu restaurante en Google Maps y copiá la URL completa
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email de contacto *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="tu@email.com"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp (opcional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="+54 11 1234-5678"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="current-challenges" className="block text-sm font-medium text-gray-700 mb-2">
                ¿Cuál es tu mayor desafío con las reviews? (opcional)
              </label>
              <textarea
                id="current-challenges"
                name="current-challenges"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
                placeholder="Ej: Tenemos muchas reviews negativas sobre tiempo de espera, no sabemos cómo mejorar..."
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-semibold shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              📧 Enviar solicitud (te responderemos en menos de 24hs)
            </button>
            
            <p className="text-center text-sm text-gray-500">
              ✅ Sin costo • ✅ Sin compromiso • ✅ Tu reporte será 100% personalizado
            </p>
          </form>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Preguntas frecuentes
            </h2>
            <p className="text-xl text-gray-600">
              Respuestas claras a las dudas más comunes
            </p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.question} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-white"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                  >
                    <span className="text-base font-semibold">{faq.question}</span>
                    <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : 'text-gray-500'}`} />
                  </button>
                  <div
                    id={`faq-panel-${index}`}
                    className={`grid transition-all duration-200 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden px-6 pb-6 text-sm text-gray-600">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ¿Listo para saber qué piensan realmente de tu restaurante?
            </h2>
            <p className="text-gray-600 mb-8">
              Solicita tu reporte gratuito y descubrí las oportunidades específicas que tu competencia no ve.
            </p>
            
            <button 
              onClick={() => {
                const formSection = document.getElementById('waitlist-form');
                formSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              📧 Solicitar mi reporte gratuito ahora
            </button>
            
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 mt-6">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span>100% gratuito</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-green-500 mr-1" />
                <span>Sin compromiso</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-green-500 mr-1" />
                <span>En menos de 24hs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {user && (
        <section className="py-20 bg-blue-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              ¡Bienvenido de vuelta!
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Configura tu negocio y comienza a gestionar tu reputación
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleStartTrial}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
              >
                <span>Continuar donde lo dejé</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="h-6 w-6 text-blue-400" />
                <span className="text-lg font-bold">ReputacionLocal</span>
              </div>
              <p className="text-gray-400">
                La plataforma más simple para gestionar tu reputación online.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Características</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Precios</a></li>
                <li><a href="mailto:api@reputacionlocal.com" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="mailto:help@reputacionlocal.com" className="hover:text-white transition-colors">Centro de ayuda</a></li>
                <li><a href="mailto:contact@reputacionlocal.com" className="hover:text-white transition-colors flex items-center space-x-1"><Phone className="h-3 w-3" /><span>Contacto</span></a></li>
                <li><a href="https://status.reputacionlocal.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">Estado del servicio</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="mailto:legal@reputacionlocal.com?subject=Solicitud%20de%20pol%C3%ADtica%20de%20privacidad"
                    className="hover:text-white transition-colors"
                    title="Próximamente disponible en web"
                  >
                    Privacidad
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:legal@reputacionlocal.com?subject=Consulta%20sobre%20t%C3%A9rminos%20de%20servicio"
                    className="hover:text-white transition-colors"
                    title="Próximamente disponible en web"
                  >
                    Términos
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:legal@reputacionlocal.com?subject=Consulta%20sobre%20pol%C3%ADtica%20de%20cookies"
                    className="hover:text-white transition-colors"
                    title="Próximamente disponible en web"
                  >
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ReputacionLocal. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Mobile fixed CTA (only when logged out) */}
      {!user && (
        <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
          <div className="m-4 overflow-hidden rounded-xl shadow-xl">
            <button 
              onClick={() => {
                const formSection = document.getElementById('waitlist-form');
                formSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full bg-blue-600 py-3 text-base font-semibold text-white transition-all duration-150 hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              aria-label="Solicitar reporte gratuito"
            >
              📧 Solicitar reporte gratuito
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;