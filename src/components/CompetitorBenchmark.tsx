import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from '../contexts/BusinessContext';
import {
  AlertTriangle,
  Star,
  TrendingUp,
  TrendingDown,
  Settings,
  BarChart3,
  MessageCircle,
  Clock,
  CheckCircle2,
  Plus,
  ExternalLink,
  Trash2,
  MapPin,
  Globe,
  Link as LinkIcon,
  Pencil,
  X,
  Search,
  Building2,
  Loader2,
  Sparkles
} from 'lucide-react';
import EmptyCompetitorsState from './EmptyCompetitorsState';
import { useCompetitorOnboarding } from '../hooks/useCompetitorOnboarding';
import PlatformSelector from './PlatformSelector';
import { businessService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { mockCompetitors, generateExtendedMetrics } from '../mocks';
import { DEMO_MODE, MOCK_NETWORK_DELAY } from '../config/demo';

interface ManagedCompetitor {
  id: string;
  name: string;
  googleUrl: string;
  tripadvisorUrl?: string;
  rating?: number;
  totalReviews?: number;
  isActive: boolean;
  external_place_id?: string;
  rank?: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  recentRating: number;
  ratingDelta: number;
  totalReviews: number;
  reviewsPerMonth: number;
  negativePercent: number;
  responseRate: number;
  avgResponseTime: string;
  confidenceLevel: string;
  topics: string[];
  priceLevel: string;
  distance: string;
  category: string;
}

const CompetitorBenchmark: React.FC = () => {
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessContext();
  const { user, session } = useAuth();
  const businessName = currentBusiness?.name || '';

  // Hook de onboarding de competidor
  const competitorOnboarding = useCompetitorOnboarding();

  const [managedCompetitors, setManagedCompetitors] = useState<ManagedCompetitor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loadingCompetitors, setLoadingCompetitors] = useState(true);
  const [competitorsError, setCompetitorsError] = useState<string | null>(null);

  // Cargar competidores desde la BD al iniciar
  useEffect(() => {
    const loadCompetitors = async () => {
      if (!currentBusiness?.external_place_id) {
        setLoadingCompetitors(false);
        return;
      }

      try {
        setLoadingCompetitors(true);
        setCompetitorsError(null);
        
        // 🎬 MODO DEMO: Usar mock data
        if (DEMO_MODE.competitors) {
          await new Promise(resolve => setTimeout(resolve, MOCK_NETWORK_DELAY));
          setManagedCompetitors(mockCompetitors);
          console.log(`✅ Loaded ${mockCompetitors.length} MOCK competitors`);
          setLoadingCompetitors(false);
          return;
        }
        
        const response = await businessService.listCompetitors(currentBusiness.external_place_id);
        
        if (response?.ok && response.list) {
          // Transformar datos de la BD al formato del componente
          const competitors: ManagedCompetitor[] = response.list.map((comp: any) => ({
            id: comp.id,
            external_place_id: comp.external_place_id,
            name: comp.name,
            googleUrl: comp.googlePlaceId 
              ? `https://www.google.com/maps/place/?q=place_id:${comp.googlePlaceId}`
              : `https://www.google.com/maps/search/${encodeURIComponent(comp.name)}`,
            tripadvisorUrl: comp.tripadvisorUrl,
            rating: comp.rating,
            totalReviews: comp.totalReviews,
            isActive: comp.isActive !== false, // Default true si no está definido
            rank: comp.rank
          }));
          
          setManagedCompetitors(competitors);
          console.log(`✅ Loaded ${competitors.length} competitors from database`);
        }
      } catch (error) {
        console.error('❌ Error loading competitors:', error);
        setCompetitorsError('Error al cargar competidores. Intenta recargar la página.');
      } finally {
        setLoadingCompetitors(false);
      }
    };

    loadCompetitors();
  }, [currentBusiness?.external_place_id]);

  const activeCompetitors = useMemo(
    () => managedCompetitors.filter((competitor) => competitor.isActive),
    [managedCompetitors]
  );

  const leaderboardEntries: LeaderboardEntry[] = useMemo(
    () =>
      activeCompetitors.map((competitor) => {
        const metrics = generateExtendedMetrics(
          competitor.rating ?? 0,
          competitor.totalReviews ?? 0
        );
        
        return {
          id: competitor.id,
          name: competitor.name,
          recentRating: competitor.rating ?? 0,
          totalReviews: competitor.totalReviews ?? 0,
          ...metrics
        };
      }),
    [activeCompetitors]
  );

  const hasCompetitors = leaderboardEntries.length > 0;

  const myBusinessMetrics = useMemo(() => {
    return generateExtendedMetrics(
      currentBusiness?.rating || 0,
      currentBusiness?.totalReviews || 0
    );
  }, [currentBusiness?.rating, currentBusiness?.totalReviews]);

  const benchmarkData = {
    myBusiness: {
      name: businessName || '',
      recentRating: currentBusiness?.rating || 0,
      totalReviews: currentBusiness?.totalReviews || 0,
      ...myBusinessMetrics,
      distance: '0 km'
    },
    competitors: leaderboardEntries
  };

  const calculateHealthScore = (business: LeaderboardEntry | (typeof benchmarkData)['myBusiness']) => {
    const rating = business.recentRating;
    const totalReviews = business.totalReviews;
    const ratingScore = (rating / 5) * 60;
    const volumeScore = Math.min((Math.sqrt(totalReviews) / Math.sqrt(200)) * 40, 40);
    return Math.round(ratingScore + volumeScore);
  };

  const maxReviewsPerMonth = Math.max(
    benchmarkData.myBusiness.reviewsPerMonth,
    ...benchmarkData.competitors.map((competitor) => competitor.reviewsPerMonth ?? 0)
  );

  const generateGoogleMapsUrl = (name: string) =>
    `https://www.google.com/maps/search/${encodeURIComponent(name)}`;

  const myBusinessWithScore = {
    ...benchmarkData.myBusiness,
    healthScore: calculateHealthScore(benchmarkData.myBusiness)
  };
  const allBusinessesSorted = [
    myBusinessWithScore,
    ...benchmarkData.competitors.map((competitor) => ({
      ...competitor,
      healthScore: calculateHealthScore(competitor)
    }))
  ].sort((a, b) => b.healthScore - a.healthScore);

  const myPosition = allBusinessesSorted.findIndex((business) => business.name === businessName) + 1;
  const leaderScore = allBusinessesSorted[0]?.healthScore ?? 0;
  const myScore = myBusinessWithScore.healthScore;
  const gapToLeader = myPosition === 1 ? 0 : leaderScore - myScore;
  const leaderName = allBusinessesSorted[0]?.name === businessName ? 'Tú' : allBusinessesSorted[0]?.name ?? '';

  useEffect(() => {
  try {
    if (myPosition > 1) {
        const target = allBusinessesSorted[Math.max(0, myPosition - 2)];
        if (target) {
      const payload = {
        name: target.name,
        rating: target.recentRating,
        totalReviews: target.totalReviews
      };
      localStorage.setItem('reputacionlocal_next_competitor', JSON.stringify(payload));
        }
    } else {
      localStorage.removeItem('reputacionlocal_next_competitor');
    }
    } catch {
      // ignore persistence issues
    }
  }, [allBusinessesSorted, myPosition]);

  const openAddModal = () => {
    // Verificar autenticación antes de abrir el modal
    if (!user || !session) {
      alert('Debes iniciar sesión para agregar competidores');
      return;
    }
    
    setEditingId(null);
    competitorOnboarding.actions.reset();
    setShowModal(true);
  };

  const openEditModal = (competitor: ManagedCompetitor) => {
    // Para edición manual simple mantenemos un path diferente
    // TODO: Implementar edición con autosuggest si es necesario
    setEditingId(competitor.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    competitorOnboarding.actions.reset();
  };

  const handleSaveCompetitor = async () => {
    // Verificar autenticación
    if (!user || !session) {
      competitorOnboarding.actions.updateState({ 
        error: 'Debes iniciar sesión para agregar competidores' 
      });
      return;
    }

    if (!currentBusiness?.external_place_id) {
      competitorOnboarding.actions.updateState({ 
        error: 'No se encontró el negocio principal' 
      });
      return;
    }

    // Ejecutar búsqueda y carga del competidor (esto ya hace onboard + ingesta de reviews)
    const competitorData = await competitorOnboarding.actions.handleSearch();
    
    if (!competitorData) {
      return; // Error ya manejado en el hook
    }

    try {
      // Agregar competidor a la BD
      console.log('💾 Saving competitor to database:', {
        external_place_id: currentBusiness.external_place_id,
        competitor_place_id: competitorData.external_place_id
      });

      const response = await businessService.addCompetitor(
        currentBusiness.external_place_id,
        competitorData.external_place_id
      );

      if (!response?.ok) {
        throw new Error(response?.error || 'Error al agregar competidor');
      }

      console.log('✅ Competitor saved to database:', response.competitor);

      // Agregar al estado local
      const newCompetitor: ManagedCompetitor = {
        id: response.competitor.id,
        external_place_id: competitorData.external_place_id,
        name: competitorData.name,
        googleUrl: competitorData.google_place_id 
          ? `https://www.google.com/maps/place/?q=place_id:${competitorData.google_place_id}`
          : `https://www.google.com/maps/search/${encodeURIComponent(competitorData.name)}`,
        tripadvisorUrl: competitorOnboarding.state.tripAdvisorUrl.trim() || undefined,
        rating: competitorData.rating,
        totalReviews: competitorData.totalReviews,
        isActive: true,
        rank: response.competitor.rank
      };

      setManagedCompetitors((prev) => [...prev, newCompetitor]);
      closeModal();
    } catch (error) {
      console.error('❌ Error saving competitor:', error);
      competitorOnboarding.actions.updateState({
        error: error instanceof Error ? error.message : 'Error al guardar competidor en la base de datos'
      });
    }
  };

  const handleToggleActive = (id: string) => {
    // Para ahora solo manejamos activo/inactivo localmente
    // TODO: Agregar column is_active en BD si se necesita
    setManagedCompetitors((prev) =>
      prev.map((competitor) =>
        competitor.id === id ? { ...competitor, isActive: !competitor.isActive } : competitor
      )
    );
  };

  const handleDeleteCompetitor = async (id: string) => {
    try {
      console.log('🗑️ Deleting competitor from database:', id);
      
      const response = await businessService.removeCompetitor(id);
      
      if (!response?.ok) {
        throw new Error('Error al eliminar competidor');
      }

      console.log('✅ Competitor deleted from database');
      
      // Eliminar del estado local
      setManagedCompetitors((prev) => prev.filter((competitor) => competitor.id !== id));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('❌ Error deleting competitor:', error);
      alert('Error al eliminar el competidor. Por favor intenta de nuevo.');
    }
  };

  const avgNegativeCompetitors = leaderboardEntries.length
    ? Math.round(
        leaderboardEntries.reduce((sum, competitor) => sum + (competitor.negativePercent ?? 0), 0) /
          leaderboardEntries.length
      )
    : 0;

  const competitorsWithLessNegatives = leaderboardEntries.filter(
    (competitor) => competitor.negativePercent < benchmarkData.myBusiness.negativePercent
  ).length;

  const handleOnboardCompetitionDev = () => {
  openAddModal();
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        {/* Auth Warning */}
        {!user && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">Inicia sesión para gestionar competidores</p>
              <p className="text-xs text-yellow-700 mt-1">Necesitas estar autenticado para agregar y gestionar competidores.</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/reviews')}
            className="text-sm text-purple-700 hover:text-purple-900"
            aria-label="Volver a reseñas"
          >
            ← Volver a reseñas
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOnboardCompetitionDev}
              className="hidden sm:inline-flex text-xs bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
              title="Gestionar competidores"
              disabled={!user}
            >
              Gestionar competidores
            </button>
          </div>
        </div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Análisis Competitivo</h1>
          <div className="text-lg text-gray-700">
            {myPosition === 1 ? (
              <span className="text-green-700 font-semibold">🥇 Eres el LÍDER local</span>
            ) : (
              <span>
                Estás <span className="font-bold text-purple-700">#{myPosition} de {allBusinessesSorted.length}</span> • Gap de{' '}
                <span className="font-bold text-red-600">{gapToLeader} puntos</span> con {leaderName}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
          <button className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors">
            📈 Plan para subir posición
          </button>
          <button 
            onClick={openAddModal}
            className="flex-1 bg-white text-purple-700 border border-purple-300 px-4 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors inline-flex items-center justify-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar competidor</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" /> Ranking Competitivo Local
          </h3>
        </div>
        
        {/* Loading state */}
        {loadingCompetitors && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-3 text-gray-600">Cargando competidores...</span>
          </div>
        )}

        {/* Error state */}
        {competitorsError && !loadingCompetitors && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {competitorsError}
          </div>
        )}

        {/* Empty state */}
        {!loadingCompetitors && !competitorsError && !hasCompetitors ? (
          <EmptyCompetitorsState
            onAddClick={openAddModal}
            progress={{ current: managedCompetitors.length, total: Math.max(4, managedCompetitors.length || 4) }}
            subtitle="Agrega competidores activos para ver el ranking, brechas y metas sugeridas."
          />
        ) : !loadingCompetitors && !competitorsError ? (
          <div className="space-y-4">
          {allBusinessesSorted.map((business, index) => {
            const isMyBusiness = business.name === businessName;
            const rank = index + 1;
            const managed = !isMyBusiness && 'id' in business
              ? managedCompetitors.find((competitor) => competitor.id === (business as LeaderboardEntry).id)
              : undefined;
            
            return (
                <div
                  key={`${business.name}-${rank}`}
                  className={`relative p-5 rounded-xl border-2 transition-all ${
                isMyBusiness 
                  ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300 shadow-md' 
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${
                      rank === 1
                        ? 'bg-yellow-500'
                        : rank === 2
                        ? 'bg-gray-400'
                        : rank === 3
                        ? 'bg-orange-600'
                        : 'bg-gray-600'
                    }`}
                  >
                  {rank}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                  <div className="md:col-span-1 min-w-0">
                    {isMyBusiness ? (
                      <div className="font-bold text-purple-900 mb-1 truncate">{business.name}</div>
                    ) : (
                        <div className="flex flex-col gap-1">
                      <a
                            href={managed?.googleUrl || generateGoogleMapsUrl(business.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                            className="font-bold text-gray-900 hover:text-blue-600 hover:underline transition-colors inline-flex items-center group truncate"
                      >
                        <span className="truncate">{business.name}</span>
                            <svg
                              className="ml-1 h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                        </svg>
                      </a>
                          {managed?.tripadvisorUrl && (
                            <a
                              href={managed.tripadvisorUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-600 hover:underline truncate"
                            >
                              TripAdvisor
                            </a>
                          )}
                        </div>
                    )}
                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-1 mt-1">
                      <span>{business.distance}</span>
                      <span>•</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full whitespace-nowrap text-[10px] ${
                            business.confidenceLevel === 'alta'
                              ? 'bg-green-100 text-green-700'
                              : business.confidenceLevel === 'media'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                        {business.confidenceLevel}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                              i < Math.floor(business.recentRating)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="font-bold text-lg">{business.recentRating.toFixed(1)}</div>
                    <div className="text-xs text-gray-500 mb-1">({business.totalReviews} reviews)</div>
                      <div
                        className={`flex items-center justify-center text-xs mt-1 ${
                      business.ratingDelta >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {business.ratingDelta >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {business.ratingDelta >= 0 ? '+' : ''}
                        {business.ratingDelta.toFixed(1)}
                      </div>
                    </div>
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <MessageCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="font-bold">{business.reviewsPerMonth.toFixed(1)}</span>
                    </div>
                    <div className="text-xs text-gray-500">rev/mes</div>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Clock className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span className="text-xs whitespace-nowrap">{business.avgResponseTime}</span>
                    </div>
                      <div
                        className={`text-xs ${
                          business.responseRate >= 90
                            ? 'text-green-600'
                            : business.responseRate >= 70
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                      {business.responseRate}%
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                      <div
                        className={`text-3xl font-bold ${
                          business.healthScore >= 80
                            ? 'text-green-600'
                            : business.healthScore >= 60
                            ? 'text-orange-600'
                            : 'text-red-600'
                        }`}
                      >
                      {business.healthScore}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">Health Score</div>
                      <div
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          business.negativePercent <= 10
                            ? 'bg-green-100 text-green-700'
                            : business.negativePercent <= 20
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                      {business.negativePercent}% neg
                      </div>
                    </div>
                  </div>
                {isMyBusiness && business.topics && business.topics.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">Tus temas frecuentes:</div>
                    <div className="flex flex-wrap gap-1">
                      {business.topics.slice(0, 3).map((topic, idx) => (
                        <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        ) : null}
        
        {hasCompetitors && !loadingCompetitors && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
              <span className="font-semibold">Resumen:</span>{' '}
              {myPosition === 1
                ? 'Mantén tu liderazgo vigilando las métricas clave'
                : `Para alcanzar el #1 necesitas ${gapToLeader} puntos más. Focus en rating y volumen de reseñas.`}
          </div>
        </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-600" /> Plan de Acción Competitivo
        </h3>
        <div className="space-y-6">
          {myPosition > 1 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 text-lg mb-2">CRÍTICO: Cerrar gap de rating</h4>
                  <p className="text-red-800 mb-3">
                    Te faltan <span className="font-bold">{gapToLeader} puntos</span> para igualar a {leaderName}
                  </p>
                  <div className="bg-white rounded-lg p-4 mb-3">
                    <div className="text-sm font-semibold text-red-800 mb-2">📋 Acciones inmediatas</div>
                    <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                      <li>Apunta a +0.1 en rating en 30 días</li>
                      <li>Consigue 5-10 reseñas nuevas/semana</li>
                      <li>Responde 100% de reseñas en 24h</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          {benchmarkData.myBusiness.negativePercent > 15 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-orange-900 text-lg mb-2">Reducir reseñas negativas</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-2xl font-bold text-orange-600">
                        {benchmarkData.myBusiness.negativePercent}%
                      </div>
                      <div className="text-sm text-orange-700">Tus negativas</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-600">{avgNegativeCompetitors}%</div>
                      <div className="text-sm text-gray-600">Promedio competencia</div>
                    </div>
                  </div>
                  <div className="bg-orange-100 rounded-lg p-3">
                    <div className="text-sm text-orange-700">
                      📊 <span className="font-semibold">{competitorsWithLessNegatives} de {leaderboardEntries.length} competidores</span> tienen menos negativas que tú
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {benchmarkData.myBusiness.reviewsPerMonth < maxReviewsPerMonth * 0.7 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-900 text-lg mb-2">Acelerar momentum de reseñas</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">
                        {benchmarkData.myBusiness.reviewsPerMonth.toFixed(1)}
                      </div>
                      <div className="text-sm text-blue-700">Tus rev/mes</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">
                        {maxReviewsPerMonth.toFixed(1)}
                      </div>
                      <div className="text-sm text-green-700">
                        Líder ({leaderboardEntries.find((competitor) => competitor.reviewsPerMonth === maxReviewsPerMonth)?.name || 'competidor'})
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <div className="text-sm text-blue-700">
                      📈 <span className="font-semibold">Gap: {(maxReviewsPerMonth - benchmarkData.myBusiness.reviewsPerMonth).toFixed(1)} reseñas/mes</span> menos que el más activo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {benchmarkData.myBusiness.responseRate < 90 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-900 text-lg mb-2">Mejorar tasa de respuesta</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">{benchmarkData.myBusiness.responseRate}%</div>
                      <div className="text-sm text-green-700">Respondidas</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">{benchmarkData.myBusiness.avgResponseTime}</div>
                      <div className="text-sm text-blue-700">Tiempo promedio</div>
                    </div>
                  </div>
                  <div className="bg-green-100 rounded-lg p-3">
                    <div className="text-sm text-green-700">
                      🎯 <span className="font-semibold">Meta:</span> 95% respondidas en máximo 1 día
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {myPosition === 1 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-center">
              <div className="text-yellow-800">
                <div className="text-2xl mb-2">🥇</div>
                <div className="font-bold text-lg mb-1">¡LÍDER LOCAL!</div>
                <div className="text-sm">Mantén el momentum para defender tu posición</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-purple-600" /> Mis competidores
            </h3>
            <p className="text-sm text-gray-600">
              Gestiona los negocios que querés comparar. Los que estén activos aparecen en el ranking anterior.
            </p>
          </div>
          <button 
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" /> Nuevo competidor
          </button>
        </div>
        {managedCompetitors.length === 0 ? (
          <div className="border border-dashed border-purple-300 rounded-xl p-6 text-center text-sm text-purple-800 bg-purple-50/60">
            <p className="font-medium">Todavía no cargaste competidores.</p>
            <p className="mt-2">Agrega al menos uno para desbloquear el ranking competitivo.</p>
            <button
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" /> Agregar ahora
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {managedCompetitors.map((competitor) => (
              <div
                key={competitor.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{competitor.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        competitor.isActive
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {competitor.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      <a
                        href={competitor.googleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600"
                      >
                        Google
                      </a>
                    </span>
                    {competitor.tripadvisorUrl && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        <a
                          href={competitor.tripadvisorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-emerald-600"
                        >
                          TripAdvisor
                        </a>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      {competitor.rating != null ? `${competitor.rating.toFixed(1)}★` : 'Sin rating cargado'}
                    </span>
                    <span className="flex items-center gap-1">
                      <LinkIcon className="h-3.5 w-3.5 text-gray-500" />
                      {competitor.totalReviews != null
                        ? `${competitor.totalReviews} reseñas`
                        : 'Reseñas no informadas'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(competitor.googleUrl, '_blank', 'noopener,noreferrer')}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Abrir Google"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  {competitor.tripadvisorUrl && (
                    <button
                      onClick={() => window.open(competitor.tripadvisorUrl, '_blank', 'noopener,noreferrer')}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      title="Abrir TripAdvisor"
                    >
                      <MapPin className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleActive(competitor.id)}
                    className={`p-2 rounded ${
                      competitor.isActive
                        ? 'text-green-600 hover:bg-green-100'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={competitor.isActive ? 'Desactivar del ranking' : 'Activar en el ranking'}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(competitor)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(competitor.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && !editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  Agregar nuevo competidor
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Busca el negocio competidor y cargaremos automáticamente sus datos y reseñas.
                </p>
              </div>
              <button onClick={closeModal} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Buscador con autosuggest */}
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar negocio competidor
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    ref={competitorOnboarding.refs.searchInputRef}
                    type="text"
                    value={competitorOnboarding.state.searchText}
                    onChange={(e) => competitorOnboarding.actions.handleInputChange(e.target.value)}
                    onKeyDown={competitorOnboarding.actions.handleKeyDown}
                    onFocus={() => {
                      if (competitorOnboarding.state.suggestions.length > 0) {
                        competitorOnboarding.actions.updateState({ showSuggestions: true });
                      }
                    }}
                    placeholder="ej. Restaurante La Competencia, Hotel Rival"
                    className={`w-full rounded-xl border-2 bg-white pl-12 pr-12 py-3 text-base transition-all duration-200 ${
                      competitorOnboarding.state.selectedSuggestion 
                        ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500' 
                        : 'border-gray-200 focus:border-purple-500 focus:ring-purple-500'
                    } focus:ring-2 focus:ring-opacity-20 outline-none`}
                    disabled={competitorOnboarding.state.isLoading}
                    role="combobox"
                    aria-expanded={competitorOnboarding.state.showSuggestions}
                    aria-controls="competitor-suggestions-listbox"
                    aria-autocomplete="list"
                  />
                  
                  {/* Loading indicator */}
                  {competitorOnboarding.state.loadingSuggestions && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                    </div>
                  )}
                  
                  {/* Success indicator */}
                  {competitorOnboarding.state.selectedSuggestion && !competitorOnboarding.state.loadingSuggestions && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {competitorOnboarding.state.showSuggestions && competitorOnboarding.state.suggestions.length > 0 && (
                  <div 
                    ref={competitorOnboarding.refs.suggestionsRef}
                    className="absolute z-50 w-full mt-2 max-h-[40vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl transition-all duration-150"
                    id="competitor-suggestions-listbox"
                    role="listbox"
                  >
                    {competitorOnboarding.state.suggestions.map((suggestion, index) => (
                      <div
                        key={suggestion.placeId}
                        onClick={() => competitorOnboarding.actions.handleSuggestionSelect(suggestion)}
                        className={`cursor-pointer border-b border-gray-100 p-4 transition-colors last:border-b-0 ${
                          index === competitorOnboarding.state.highlightedIndex 
                            ? 'bg-purple-50 border-purple-100' 
                            : 'hover:bg-gray-50'
                        }`}
                        role="option"
                        aria-selected={index === competitorOnboarding.state.highlightedIndex}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-purple-600" />
                            </div>
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {suggestion.structured_formatting.main_text}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {suggestion.structured_formatting.secondary_text}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirmación de selección */}
              {competitorOnboarding.state.selectedSuggestion && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        <CheckCircle2 className="h-5 w-5" /> Competidor listo para cargar
                      </p>
                      <p className="mt-2 text-sm text-emerald-700">
                        {competitorOnboarding.state.selectedSuggestion.structured_formatting.main_text}
                      </p>
                      <p className="text-xs text-emerald-700/80">
                        {competitorOnboarding.state.selectedSuggestion.structured_formatting.secondary_text}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                      <Sparkles className="h-4 w-4" /> Seleccionado
                    </span>
                  </div>
                </div>
              )}

              {/* Platform Selector (opcional para TripAdvisor) */}
              {competitorOnboarding.state.selectedSuggestion && (
                <div className="space-y-3">
                  <PlatformSelector
                    hasGoogleBusiness={!!competitorOnboarding.state.selectedSuggestion}
                    tripAdvisorUrl={competitorOnboarding.state.tripAdvisorUrl}
                    onTripAdvisorChange={competitorOnboarding.actions.setTripAdvisorUrl}
                    businessName={competitorOnboarding.state.selectedSuggestion.structured_formatting.main_text}
                  />
                  {!competitorOnboarding.state.tripAdvisorUrl && (
                    <p className="text-xs text-slate-500">
                      TripAdvisor es opcional. Puedes agregarlo después.
                    </p>
                  )}
                </div>
              )}

              {/* Modo manual */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                <button
                  type="button"
                  onClick={competitorOnboarding.actions.toggleManualMode}
                  className="text-sm font-medium text-purple-600 transition-colors hover:text-purple-700"
                >
                  {competitorOnboarding.state.manualMode ? '← Buscar por nombre' : 'Tengo el Place ID'}
                </button>
              </div>

              {competitorOnboarding.state.manualMode && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Place ID de Google (formato "ChIJ...")
                  </label>
                  <input
                    type="text"
                    value={competitorOnboarding.state.manualPlaceId}
                    onChange={(e) => competitorOnboarding.actions.setManualPlaceId(e.target.value)}
                    placeholder="ChIJxxxxxxxxxxxxxxxxx"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Estado de progreso */}
              {competitorOnboarding.state.loadingReviews && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Cargando datos del competidor...</p>
                      <p className="text-xs text-blue-700 mt-1">{competitorOnboarding.state.reviewsStep}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {competitorOnboarding.state.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
                  {competitorOnboarding.state.error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                disabled={competitorOnboarding.state.isLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCompetitor}
                disabled={competitorOnboarding.state.isLoading || !competitorOnboarding.state.selectedSuggestion}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {competitorOnboarding.state.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Agregar competidor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Eliminar competidor</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Esta acción no se puede deshacer. Eliminaremos el competidor y dejará de aparecer en tus comparativas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteCompetitor(confirmDeleteId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorBenchmark;