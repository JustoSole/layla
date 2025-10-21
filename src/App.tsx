import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useBusinessContext } from './contexts/BusinessContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Insights from './components/Insights';
import Onboarding from './components/Onboarding';
import ReviewDetail from './components/ReviewDetail';
import CompetitorBenchmark from './components/CompetitorBenchmark';
import ReviewsManager from './components/ReviewsManager';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import CookieConsent from './components/CookieConsent';
import Campaigns from './components/Campaigns';
import ReviewRequestLanding from './components/ReviewRequestLanding';
import StaffDashboard from './components/StaffDashboard';
// Removed legal pages

function App() {
  const { user, loading } = useAuth();
  const { currentBusiness } = useBusinessContext();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Landing page - solo para usuarios no autenticados */}
        <Route 
          path="/" 
          element={
            user ? 
              (currentBusiness ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />) :
              <LandingPage />
          } 
        />
        {/* Legal pages removed */}
        
        {/* Onboarding - redirige al dashboard si ya está configurado */}
        <Route 
          path="/onboarding" 
          element={
            user && currentBusiness ? 
              <Navigate to="/dashboard" replace /> : 
              <Onboarding />
          } 
        />

        {/* Rutas protegidas que requieren business configurado */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Dashboard />
            </main>
          </ProtectedRoute>
        } />

        <Route path="/insights" element={
          <ProtectedRoute>
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Insights />
            </main>
          </ProtectedRoute>
        } />

        <Route path="/reviews" element={
          <ProtectedRoute>
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <ReviewsManager />
            </main>
          </ProtectedRoute>
        } />

        <Route path="/competitors" element={
          <ProtectedRoute>
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <CompetitorBenchmark />
            </main>
          </ProtectedRoute>
        } />


        <Route path="/reports" element={
          <ProtectedRoute>
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Reports />
            </main>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Settings />
            </main>
          </ProtectedRoute>
        } />

        <Route path="/review/:reviewId" element={
          <ProtectedRoute>
            <Navigation />
            <ReviewDetail />
          </ProtectedRoute>
        } />

        <Route path="/campaigns" element={
          <ProtectedRoute>
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Campaigns />
            </main>
          </ProtectedRoute>
        } />

        <Route path="/team" element={
          <ProtectedRoute>
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <StaffDashboard />
            </main>
          </ProtectedRoute>
        } />

        {/* Public landing page - no authentication required */}
        <Route path="/r/:shortCode" element={<ReviewRequestLanding />} />
        
        {/* Temporary route to preview landing page */}
        <Route path="/preview-landing" element={<LandingPage />} />

        {/* Ruta por defecto - redirigir apropiadamente basado en estado */}
        <Route 
          path="*" 
          element={
            user ? 
              (currentBusiness ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />) :
              <Navigate to="/" replace />
          } 
        />
      </Routes>
      <CookieConsent />
    </div>
  );
}

export default App;