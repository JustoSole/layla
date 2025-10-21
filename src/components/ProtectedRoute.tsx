import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBusinessContext } from '../contexts/BusinessContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { currentBusiness, isLoading: businessLoading } = useBusinessContext();

  if (import.meta.env.DEV) {
    console.log('🔒 ProtectedRoute check:', {
      authLoading,
      businessLoading,
      hasUser: !!user,
      hasBusiness: !!currentBusiness,
      userId: user?.id?.slice(0, 8) + '...' || null
    });
  }

  // Mostrar loading mientras se carga el estado de autenticación
  if (authLoading) {
    if (import.meta.env.DEV) console.log('🔒 ProtectedRoute: Auth loading...');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir a la landing page
  if (!user) {
    if (import.meta.env.DEV) console.log('🔒 ProtectedRoute: No user, redirecting to landing');
    return <Navigate to="/" replace />;
  }

  // Mostrar loading mientras se carga el business (solo después de tener usuario)
  if (businessLoading) {
    if (import.meta.env.DEV) console.log('🔒 ProtectedRoute: Business loading...');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando configuración del negocio...</p>
        </div>
      </div>
    );
  }

  // Si hay usuario pero no business, redirigir al onboarding
  if (!currentBusiness) {
    if (import.meta.env.DEV) console.log('🏢 ProtectedRoute: No business, redirecting to onboarding');
    return <Navigate to="/onboarding" replace />;
  }

  // Todo OK - mostrar contenido protegido
  if (import.meta.env.DEV) console.log('✅ ProtectedRoute: Access granted');
  return <>{children}</>;
};

export default ProtectedRoute;
