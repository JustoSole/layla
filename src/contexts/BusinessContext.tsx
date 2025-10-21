import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { businessService, transformToBusinessContext, currentBusinessData as legacyBusinessData } from '../services/api';
import { loadCompleteBusinessData, loadRealBusinesses, transformRealBusinessToContext, loadRealReviews, loadUserPrimaryBusiness } from '../lib/dataLayer';
import { useAuth } from './AuthContext';
import { BusinessData } from '../types/schema';

export interface Business {
  name: string;
  placeId: string;
  external_place_id?: string | null;
  google_cid?: string | null;
  google_place_id?: string | null;
  rating: number;
  totalReviews: number;
  scrapedReviews?: number; // Número de reseñas que obtuvimos para procesar
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  // ✅ Campos de ratings (estandarizados)
  rating_votes_count?: number | null; // Alias de totalReviews (para compatibilidad con schema)
  votes_count?: number | null; // Deprecated: usar rating_votes_count
  place_topics?: any;
  google_ratings?: any;
  tripadvisor_ratings?: any;
  hasBusinessData?: boolean;
  hasRealReviews?: boolean;
  hasAnalysis?: boolean;
  lastSync: string;
}

interface BusinessContextType {
  currentBusiness: Business | null;
  setCurrentBusiness: (business: Business | null) => void;
  isLoading: boolean;
  setupMockBusiness: () => Promise<void>;
  businessData: typeof legacyBusinessData;
  // Nuevas funciones para datos reales
  loadRealBusinessData: (external_place_id: string) => Promise<any>;
  realBusinesses: any[];
  loadAvailableBusinesses: () => Promise<void>;
  // Nueva función para limpiar datos
  clearBusinessData: () => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

interface BusinessProviderProps {
  children: ReactNode;
}

export const BusinessProvider: React.FC<BusinessProviderProps> = ({ children }) => {
  const [currentBusiness, setCurrentBusinessState] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [realBusinesses, setRealBusinesses] = useState<any[]>([]);
  const [backendBusinessData, setBackendBusinessData] = useState<typeof legacyBusinessData>({
    business: null,
    reviews: { google: null, tripadvisor: null } as any,
    analysis: null
  });

  // Cargar datos del localStorage al inicializar
  useEffect(() => {
    try {
      const savedBusiness = localStorage.getItem('reputacionlocal_business');
      if (savedBusiness) {
        const parsedBusiness = JSON.parse(savedBusiness);
        setCurrentBusinessState(parsedBusiness);
      }
    } catch (error) {
      console.error('Error loading business from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { user } = useAuth();

  // Re-vincular automáticamente el negocio seleccionado al usuario (idempotente)
  useEffect(() => {
    const relink = async () => {
      const ep = currentBusiness?.external_place_id || currentBusiness?.placeId;
      if (!user || !ep) return;
      try {
        await businessService.linkBusiness(ep);
      } catch (e) {
        if (import.meta.env.DEV) console.warn('linkBusiness auto failed (ignored):', e);
      }
    };
    relink();
  }, [user?.id, currentBusiness?.external_place_id, currentBusiness?.placeId]);

  // Primero: si hay usuario, intentar cargar su negocio primario
  useEffect(() => {
    const run = async () => {
      if (!user || currentBusiness) return;
      try {
        const b = await loadUserPrimaryBusiness(user.id);
        if (b) {
          const mapped = transformRealBusinessToContext(b, b.reviews_count);
          setCurrentBusiness(mapped);
        }
      } catch (e) {
        console.warn('No se pudo cargar negocio del usuario:', e);
      }
    };
    run();
  }, [user?.id, currentBusiness]);

  // Fallback: si no hay negocio seleccionado ni usuario, elegir el más reciente de la BD
  useEffect(() => {
    const pickFirstAvailable = async () => {
      if (currentBusiness || user) return; // evitar elegir aleatorio cuando hay usuario
      try {
        const list = await loadRealBusinesses(20);
        if (list && list.length > 0) {
          // Priorizar negocios con reviews > 0
          const withReviews = list.find((b: any) => (b.reviews_count || 0) > 0) || list[0];
          const b = withReviews;
          const mapped = transformRealBusinessToContext(b, b.reviews_count);
          setCurrentBusiness(mapped);
        }
      } catch (e) {
        console.warn('No se pudo auto-seleccionar un negocio:', e);
      }
    };
    if (!isLoading && !currentBusiness) {
      pickFirstAvailable();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, currentBusiness, user?.id]);

  // Función para actualizar el business y persistir en localStorage
  const setCurrentBusiness = (business: Business | null) => {
    if (import.meta.env.DEV) console.log(business ? `🏢 Setting business: ${business.name}` : '🗑️ Clearing business');
    
    try {
      setCurrentBusinessState(business);
      
      if (business) {
        localStorage.setItem('reputacionlocal_business', JSON.stringify(business));
        if (import.meta.env.DEV) console.log('✅ Business saved to localStorage');
      } else {
        localStorage.removeItem('reputacionlocal_business');
        if (import.meta.env.DEV) console.log('✅ Business removed from localStorage');
      }
    } catch (error) {
      console.error('❌ Error saving business to localStorage:', error);
    }
  };

  // Función para limpiar datos al hacer logout
  const clearBusinessData = () => {
    if (import.meta.env.DEV) console.log('🧹 Clearing all business data');
    setCurrentBusinessState(null);
    localStorage.removeItem('reputacionlocal_business');
  };

  // Función para configurar un business de prueba con datos reales de las APIs
  const setupMockBusiness = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Configurando business de prueba...');
      
      const result = await businessService.setupCompleteBusinessByCid(
        '5626408847077113933', // CID de Hedonism Wines
        'Hotel_Review-g60763-d23462501-Reviews-Margaritaville_Times_Square-New_York_City_New_York.html' // TripAdvisor URL
      );

      // Actualizar el estado global
      backendBusinessData.business = result.business as any;
      (backendBusinessData.reviews as any).google = result.googleReviews || null;
      (backendBusinessData.reviews as any).tripadvisor = result.tripAdvisorReviews || null;
      backendBusinessData.analysis = result.analysis || null as any;

      // Transformar a formato del contexto
      const businessInfo = transformToBusinessContext(result.business, {
        google: result.googleReviews,
        tripadvisor: result.tripAdvisorReviews
      });
      setCurrentBusiness(businessInfo);

      console.log('✅ Business configurado exitosamente:', businessInfo);
    } catch (error) {
      console.error('❌ Error configurando business:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función CORREGIDA para cargar datos reales completos de un negocio
  const loadRealBusinessData = async (external_place_id: string) => {
    try {
      setIsLoading(true);
      console.log('🚀 Cargando datos reales completos...');
      
      const completeData = await loadCompleteBusinessData(external_place_id);
      
      // ✅ CORRECCIÓN: Usar BusinessData correctamente formateado
      const businessData: BusinessData = {
        ...completeData.business,
        reviews_count: completeData.stats.total_reviews,
        analysis_count: completeData.stats.total_analysis
      };

      // Transformar al formato del contexto usando datos consistentes
      const businessInfo = transformRealBusinessToContext(businessData, completeData.stats.total_reviews);

      setCurrentBusiness(businessInfo);

      // 🔗 Exponer datos también en el shape usado por Dashboard/DataStats (compatibilidad)
      const googleReviews = completeData.reviews.filter((r: any) => r.provider === 'google');
      const taReviews = completeData.reviews.filter((r: any) => r.provider === 'tripadvisor');
      const gRatings = (completeData.business as any).google_ratings || {};
      const taRatings = (completeData.business as any).tripadvisor_ratings || {};
      const safeNum = (v: any, d = 0) => typeof v === 'number' ? v : d;

      setBackendBusinessData({
        business: {
          ok: true,
          external_place_id: businessData.id,
          business_info: {
            name: businessData.name,
            rating: safeNum(gRatings.rating_value, businessData.rating_value || 0),
            rating_distribution: gRatings.rating_distribution || null,
            phone: businessData.phone || undefined,
            url: businessData.url || undefined,
            latitude: null as any,
            longitude: null as any
          }
        } as any,
        reviews: {
          google: {
            ok: true,
            inserted: safeNum(gRatings.rating_votes, googleReviews.length),
            rating_summary: {
              average: safeNum(gRatings.rating_value, 0),
              total_reviews: safeNum(gRatings.rating_votes, googleReviews.length)
            }
          } as any,
          tripAdvisor: {
            ok: true,
            inserted: safeNum(taRatings.rating_votes, taReviews.length),
            rating_summary: {
              average: safeNum(taRatings.rating_value, 0),
              total_reviews: safeNum(taRatings.rating_votes, taReviews.length)
            }
          } as any
        } as any,
        analysis: {
          ok: true,
          analyzed: completeData.stats.total_analysis,
          total_reviews_found: completeData.stats.total_reviews,
          processed_reviews: []
        } as any
      });

      // 🌱 Si no hay reseñas aún, intentar una ingesta automática (hasta 1 año)
      if (completeData.stats.total_reviews === 0) {
        const place = completeData.business as any;
        const googleCid = place.google_cid as string | null;
        const taPath = place.tripadvisor_url_path as string | null;
        console.log('🔄 No hay reviews. Intentando ingesta automática...', { googleCid, taPath });
        try {
          const tasks: Promise<any>[] = [];
          if (googleCid) {
            tasks.push(
              businessService.ingestGoogleReviewsIncremental(businessData.id, googleCid, 50, 365)
            );
          }
          if (taPath) {
            tasks.push(
              businessService.ingestTripAdvisorReviewsIncremental(businessData.id, taPath, 50, 365)
            );
          }
          if (tasks.length) {
            await Promise.allSettled(tasks);
            // Recalcular stats con reviews reales
            const rows = await loadRealReviews(businessData.id, 500);
            setBackendBusinessData(prev => ({
              ...prev,
              reviews: {
                google: {
                  ...(prev.reviews as any)?.google,
                  inserted: rows.filter((r: any) => r.provider === 'google').length
                },
                tripAdvisor: {
                  ...(prev.reviews as any)?.tripAdvisor,
                  inserted: rows.filter((r: any) => r.provider === 'tripadvisor').length
                }
              } as any
            }));
          }
        } catch (autoIngestError) {
          console.warn('⚠️ Auto-ingesta fallida o no disponible:', autoIngestError);
        }
      }
      
      console.log('✅ Datos reales cargados:', completeData.stats);
      return completeData;
    } catch (error) {
      console.error('❌ Error cargando datos reales:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-cargar datos reales cuando se seleccione un negocio
  useEffect(() => {
    const ep = currentBusiness?.external_place_id || currentBusiness?.placeId;
    if (ep) {
      loadRealBusinessData(ep).catch(() => {});
    } else {
      setBackendBusinessData({ business: null, reviews: { google: null, tripadvisor: null } as any, analysis: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.external_place_id, currentBusiness?.placeId]);

  // Función para cargar negocios disponibles en la BD
  const loadAvailableBusinesses = async () => {
    try {
      const businesses = await loadRealBusinesses(20);
      setRealBusinesses(businesses);
      console.log(`✅ Cargados ${businesses.length} negocios disponibles`);
    } catch (error) {
      console.error('❌ Error cargando negocios disponibles:', error);
    }
  };

  const value: BusinessContextType = {
    currentBusiness,
    setCurrentBusiness,
    isLoading,
    setupMockBusiness,
    businessData: backendBusinessData,
    // Nuevas funciones para datos reales
    loadRealBusinessData,
    realBusinesses,
    loadAvailableBusinesses,
    // Nueva función para limpiar datos
    clearBusinessData
  };

  return (
    <BusinessContext.Provider value={value}>
      {/* Exponer id para componentes sin acceso directo (e.g., TrendChart) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.currentExternalPlaceId = ${JSON.stringify(currentBusiness?.external_place_id || currentBusiness?.placeId || '')};`
        }}
      />
      {children}
    </BusinessContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useBusinessContext = (): BusinessContextType => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }
  return context;
};