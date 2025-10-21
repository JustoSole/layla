/**
 * EJEMPLOS DE INTEGRACIÓN DE MOCK DATA
 * 
 * Copia y pega estos snippets directamente en tus componentes
 */

// ============================================
// EJEMPLO 1: CompetitorBenchmark.tsx
// ============================================

/*
import { mockCompetitors, generateExtendedMetrics } from '../mocks/competitorMockData';

// Dentro del componente CompetitorBenchmark:

// OPCIÓN A: Usar mocks directamente (para demos)
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
      const USE_MOCK_DATA = true; // Cambiar a false para usar datos reales
      
      if (USE_MOCK_DATA) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 800));
        setManagedCompetitors(mockCompetitors);
        console.log('✅ Loaded MOCK competitors:', mockCompetitors.length);
        setLoadingCompetitors(false);
        return;
      }
      
      // Código real existente...
      const response = await businessService.listCompetitors(currentBusiness.external_place_id);
      
      if (response?.ok && response.list) {
        const competitors = response.list.map((comp: any) => ({
          id: comp.id,
          external_place_id: comp.external_place_id,
          name: comp.name,
          googleUrl: comp.googlePlaceId 
            ? `https://www.google.com/maps/place/?q=place_id:${comp.googlePlaceId}`
            : `https://www.google.com/maps/search/${encodeURIComponent(comp.name)}`,
          tripadvisorUrl: comp.tripadvisorUrl,
          rating: comp.rating,
          totalReviews: comp.totalReviews,
          isActive: comp.isActive !== false,
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
*/

// ============================================
// EJEMPLO 2: CompetitorBenchmark - Enriquecer leaderboard con métricas
// ============================================

/*
import { generateExtendedMetrics } from '../mocks/competitorMockData';

// Enriquecer el leaderboard con métricas calculadas
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
*/

// ============================================
// EJEMPLO 3: Campaigns.tsx
// ============================================

/*
import { mockCampaigns, mockFeedbackItems, getFilteredFeedback } from '../mocks/campaignMockData';

// Dentro del componente Campaigns:

// Load campaigns on mount
useEffect(() => {
  const fetchCampaigns = async () => {
    if (!currentBusiness?.id) {
      setLoading(false);
      return;
    }

    try {
      // 🎬 MODO DEMO: Usar mock data
      const USE_MOCK_DATA = true; // Cambiar a false para usar datos reales
      
      if (USE_MOCK_DATA) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 600));
        setCampaigns(mockCampaigns);
        setLoading(false);
        console.log('✅ Loaded MOCK campaigns:', mockCampaigns.length);
        return;
      }

      // Código real existente...
      const data = await loadCampaigns(currentBusiness.id);
      setCampaigns(data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchCampaigns();
}, [currentBusiness?.id]);
*/

// ============================================
// EJEMPLO 4: Campaigns - Feedback Modal
// ============================================

/*
import { getFilteredFeedback } from '../mocks/campaignMockData';

const handleViewFeedback = async (campaign: Campaign) => {
  setSelectedCampaign(campaign);
  setShowFeedbackModal(true);
  setFeedbackLoading(true);

  try {
    // 🎬 MODO DEMO: Usar mock data
    const USE_MOCK_DATA = true; // Cambiar a false para usar datos reales
    
    if (USE_MOCK_DATA) {
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 400));
      const data = getFilteredFeedback(campaign.id, feedbackFilter);
      setFeedbackItems(data);
      setFeedbackLoading(false);
      console.log(`✅ Loaded MOCK feedback for campaign ${campaign.id}:`, data.length);
      return;
    }

    // Código real existente...
    const filters = feedbackFilter === 'pending' ? { status: 'pending' as const } :
                   feedbackFilter === 'resolved' ? { status: 'resolved' as const } :
                   feedbackFilter === 'critical' ? { critical_only: true } :
                   undefined;

    const data = await loadCampaignFeedback(campaign.id, filters);
    setFeedbackItems(data);
  } catch (error) {
    console.error('Error loading feedback:', error);
  } finally {
    setFeedbackLoading(false);
  }
};
*/

// ============================================
// EJEMPLO 5: BusinessContext - Mock Business
// ============================================

/*
import { mockCurrentBusiness } from '../mocks/competitorMockData';

// Si necesitas mockear el currentBusiness completo en el contexto:
// En BusinessContext.tsx o donde inicialices el business:

const USE_MOCK_BUSINESS = true;

if (USE_MOCK_BUSINESS && !currentBusiness) {
  setCurrentBusiness(mockCurrentBusiness);
}
*/

// ============================================
// EJEMPLO 6: Toggle rápido con variable de entorno
// ============================================

/*
// En un archivo de configuración (ej: src/config/demo.ts):
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || false;

// Luego en tus componentes:
import { DEMO_MODE } from '../config/demo';

if (DEMO_MODE) {
  // Usar mock data
} else {
  // Usar API real
}

// En tu .env.local:
// VITE_DEMO_MODE=true
*/

export {};

