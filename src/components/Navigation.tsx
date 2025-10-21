import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBusinessContext } from '../contexts/BusinessContext';
import { BarChart3, MessageSquare, Users, Home, Settings as SettingsIcon, LogOut, User, ChevronDown, Menu, X, ArrowRight, Lightbulb, QrCode } from 'lucide-react';
import { getCriticalFeedbackCount } from '../lib/dataLayer';

const Navigation: React.FC = () => {
  const { user, signOut } = useAuth();
  const { currentBusiness, clearBusinessData, businessData } = useBusinessContext();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [criticalFeedbackCount, setCriticalFeedbackCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  const handleSignOut = async () => {
    if (import.meta.env.DEV) console.log('🚪 User signing out, clearing business data...');
    clearBusinessData(); // Limpiar datos del business primero
    await signOut();
    setShowUserMenu(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load critical feedback count
  useEffect(() => {
    const loadCriticalCount = async () => {
      const businessId = currentBusiness?.external_place_id || currentBusiness?.placeId;
      if (businessId) {
        const count = await getCriticalFeedbackCount(businessId);
        setCriticalFeedbackCount(count);
      }
    };

    loadCriticalCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadCriticalCount, 30000);
    return () => clearInterval(interval);
  }, [currentBusiness?.external_place_id, currentBusiness?.placeId]);

  const pendingCount = useMemo(() => {
    const reviewsData = businessData?.reviews as any;

    if (!reviewsData) return 0;

    // ✅ Usar sentiment en lugar de rating para identificar críticas
    const googlePending = reviewsData.google?.reviews_preview?.filter(
      (r: any) => !r.has_owner_response && r.sentiment === 'negative'
    ).length || 0;

    const taSource = reviewsData.tripAdvisor || reviewsData.tripadvisor;
    const taPending = taSource?.reviews_preview?.filter(
      (r: any) => !r.has_owner_response && r.sentiment === 'negative'
    ).length || 0;

    return googlePending + taPending;
  }, [businessData]);

  const navItems = [
    {
      id: 'dashboard',
      path: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="h-4 w-4" />,
      description: 'Vista general y acciones'
    },
    {
      id: 'insights',
      path: '/insights',
      label: 'Insights',
      icon: <Lightbulb className="h-4 w-4" />,
      description: 'Análisis profundo'
    },
    {
      id: 'reviews',
      path: '/reviews',
      label: 'Reseñas',
      icon: <MessageSquare className="h-4 w-4" />,
      description: 'Gestionar respuestas',
      badge: pendingCount > 0 ? pendingCount : undefined
    },
    {
      id: 'campaigns',
      path: '/campaigns',
      label: 'Campañas',
      icon: <QrCode className="h-4 w-4" />,
      description: 'Solicitudes de reseñas',
      badge: criticalFeedbackCount > 0 ? criticalFeedbackCount : undefined
    },
    {
      id: 'competitors',
      path: '/competitors',
      label: 'Competencia',
      icon: <Users className="h-4 w-4" />,
      description: 'Benchmarking'
    }
  ];

  if (!currentBusiness) {
    return null;
  }

  return (
    <header className={`sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur transition-shadow ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">ReputacionLocal</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) => 
                    `relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`
                  }
                  title={item.description}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{item.label}</span>
                  
                  {/* Badge para notificaciones */}
                  {item.badge && (
                    <span
                      className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium"
                      aria-label={`${item.badge} reseñas urgentes sin responder`}
                      role="status"
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Mobile toggle */}
            <button
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-all duration-150 hover:-translate-y-0.5 hover:text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              onClick={() => setShowMobileNav((prev) => !prev)}
              aria-expanded={showMobileNav}
              aria-label={showMobileNav ? 'Cerrar navegación' : 'Abrir navegación'}
            >
              {showMobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt={user.user_metadata.name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
                <span className="hidden sm:inline text-sm font-medium">
                  {currentBusiness?.name}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.user_metadata?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <SettingsIcon className="h-4 w-4" />
                    <span>Configuración</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      

      {/* Mobile sheet */}
      {showMobileNav && (
        <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur">
          <div className="px-4 py-4 flex flex-col gap-3">
            {navItems.map((item) => (
              <NavLink
                key={`mobile-${item.id}`}
                to={item.path}
                onClick={() => setShowMobileNav(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-lg border px-3 py-3 text-sm font-medium transition-all ${
                    isActive ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50'
                  }`
                }
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {item.badge ? (
                  <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-2 text-xs font-semibold text-white">
                    {item.badge}
                  </span>
                ) : (
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                )}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navigation;