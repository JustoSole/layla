import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from '../contexts/BusinessContext';
import { businessService } from '../services/api';

// Tipos para las sugerencias
export type PlaceSuggestion = {
  placeId: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
};

// Estados centralizados para onboarding
interface OnboardingState {
  // Estados básicos
  step: 1 | 2;
  searchText: string;
  tripAdvisorUrl: string;
  error: string | null;
  // Entrada manual alternativa
  manualPlaceId: string;
  manualMode: boolean;
  
  // Estados de loading
  isLoading: boolean;
  isSaving: boolean;
  
  // Estados para autocompletado
  suggestions: PlaceSuggestion[];
  showSuggestions: boolean;
  loadingSuggestions: boolean;
  selectedSuggestion: PlaceSuggestion | null;
  highlightedIndex: number;
  
  // Estados de datos del negocio
  businessCard: any;
  businessMetrics: any;
  businessTopics: any[];
  
  // Estados de progreso
  loadingReviews: boolean;
  reviewsStep: string;
}

export const useOnboarding = () => {
  const navigate = useNavigate();
  const { setCurrentBusiness } = useBusinessContext();
  
  // Estado centralizado
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    searchText: "",
    tripAdvisorUrl: "",
    error: null,
    manualPlaceId: "",
    manualMode: false,
    isLoading: false,
    isSaving: false,
    suggestions: [],
    showSuggestions: false,
    loadingSuggestions: false,
    selectedSuggestion: null,
    highlightedIndex: -1,
    businessCard: null,
    businessMetrics: null,
    businessTopics: [],
    loadingReviews: false,
    reviewsStep: ""
  });
  
  // Referencias
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup para evitar memory leaks
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Manejar clicks fuera del autocomplete para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!state.showSuggestions) return;
      
      const target = event.target as Node;
      const searchInput = searchInputRef.current;
      const suggestionsContainer = suggestionsRef.current;
      
      // Si el click fue fuera del input y fuera del contenedor de sugerencias
      if (
        searchInput && !searchInput.contains(target) &&
        suggestionsContainer && !suggestionsContainer.contains(target)
      ) {
        updateState({ 
          showSuggestions: false, 
          highlightedIndex: -1 
        });
      }
    };

    // Solo agregar el listener si las sugerencias están abiertas
    if (state.showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [state.showSuggestions]);
  
  // Helper para actualizar estado
  const updateState = (updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };
  
  // Función simplificada para obtener sugerencias
  const fetchSuggestions = async (input: string) => {
    if (!input.trim() || input.length < 2) {
      updateState({ 
        suggestions: [], 
        showSuggestions: false 
      });
      return;
    }

    try {
      updateState({ loadingSuggestions: true });
      
      const response = await businessService.getPlaceSuggestions(input.trim(), 'AR', { vertical: 'gastronomia' });

      if (response?.ok && response.suggestions) {
        // Filtrar lugares geográficos adicionales como seguridad
        const filteredSuggestions = response.suggestions.filter((suggestion: PlaceSuggestion) => {
          const mainText = suggestion.structured_formatting.main_text.toLowerCase();
          const secondaryText = suggestion.structured_formatting.secondary_text.toLowerCase();
          
          // Excluir lugares geográficos comunes
          const geographicTerms = [
            'provincia',
            'ciudad',
            'barrio',
            'distrito',
            'municipio',
            'localidad',
            'partido',
            'comuna',
            'región',
            'argentina',
            'buenos aires (provincia)',
            'caba',
            'capital federal'
          ];
          
          // Excluir si es puramente geográfico (sin tipos de negocio claros)
          const hasBusinessType = (suggestion.types || []).some(t => [
            'restaurant','cafe','bar','bakery','meal_takeaway','meal_delivery','food','establishment','supermarket','clothing_store','electronics_store','furniture_store','department_store','bank','lawyer','accounting','real_estate_agency','insurance_agency'
          ].includes(t));
          const isGeographic = !hasBusinessType && geographicTerms.some(term => 
            mainText.includes(term) || 
            secondaryText.includes(term)
          );
          
          // Excluir direcciones sin nombre de negocio
          const isJustAddress = /^\d+/.test(mainText) && !mainText.includes(' ');
          
          return !isGeographic && !isJustAddress;
        });

        updateState({ 
          suggestions: filteredSuggestions, 
          showSuggestions: true,
          highlightedIndex: -1 
        });
      } else {
        // Fallback suggestion mejorada para negocios
        const fallback: PlaceSuggestion = {
          placeId: "fallback",
          description: `${input} - No encontrado como negocio`,
          structured_formatting: {
            main_text: input,
            secondary_text: "Buscar solo entre establecimientos comerciales"
          },
          types: ["establishment"]
        };
        updateState({ 
          suggestions: [fallback], 
          showSuggestions: true 
        });
      }
    } catch (error) {
      console.error('❌ Error fetching suggestions:', error);
      updateState({ 
        suggestions: [], 
        showSuggestions: false,
        error: 'Error al obtener sugerencias'
      });
    } finally {
      updateState({ loadingSuggestions: false });
    }
  };

  // Función de debounce para búsqueda
  const handleInputChange = (value: string) => {
    updateState({ 
      searchText: value, 
      selectedSuggestion: null 
    });
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Seleccionar sugerencia
  const handleSuggestionSelect = (suggestion: PlaceSuggestion) => {
    updateState({
      selectedSuggestion: suggestion,
      searchText: suggestion.structured_formatting.main_text,
      showSuggestions: false,
      highlightedIndex: -1
    });
    
    searchInputRef.current?.focus();
  };

  // Navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!state.showSuggestions || state.suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        updateState({
          highlightedIndex: state.highlightedIndex < state.suggestions.length - 1 
            ? state.highlightedIndex + 1 
            : state.highlightedIndex
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        updateState({
          highlightedIndex: state.highlightedIndex > 0 
            ? state.highlightedIndex - 1 
            : -1
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (state.highlightedIndex >= 0) {
          handleSuggestionSelect(state.suggestions[state.highlightedIndex]);
        }
        break;
      case 'Escape':
        updateState({
          showSuggestions: false,
          highlightedIndex: -1
        });
        break;
    }
  };

  // Búsqueda simplificada
  const handleSearch = async () => {
    const placeIdToUse = state.manualPlaceId.trim() || state.selectedSuggestion?.placeId || "";
    const finalSearchText = state.selectedSuggestion?.structured_formatting.main_text || state.searchText.trim() || '';
    if (!placeIdToUse || placeIdToUse === "fallback") {
      updateState({ error: 'Introduce un Place ID válido o elige una sugerencia' });
      return;
    }

      updateState({ 
        isLoading: true, 
        error: null,
        showSuggestions: false,
        loadingReviews: false,
        reviewsStep: ''
      });

    try {
      console.log(`🔍 Starting business setup: "${finalSearchText}"`);
      
      const result = await businessService.onboardByPlaceId(
        placeIdToUse,
        'Argentina', 
        'es',
        state.tripAdvisorUrl.trim() || undefined
      );

      if (!result?.ok) {
        throw new Error(result?.error || 'No se encontró el negocio');
      }

      // 🔍 STEP 5: DEBUG EN useOnboarding
      console.log('🔍 STEP 5: Processing data in useOnboarding...');
      console.log('  - result.business_info:', result.business_info);

      // ✅ DATOS CORREGIDOS: Ahora el backend envía votes_count y place_topics
      const businessInfo = result.business_info;
      const externalPlaceId = result.external_place_id;
      const googleCid = businessInfo?.cid || null;
      const tripadvisorUrl = state.tripAdvisorUrl.trim() || undefined;
      // 🔍 COMBINAR DATOS DE GOOGLE Y TRIPADVISOR INTELIGENTEMENTE - Versión robusta
      const businessData = businessInfo as any; // Tipo seguro para evitar errores de TypeScript
      
      console.log('🔍 STEP 6: Procesando datos corregidos del backend (Google + TripAdvisor)...');
      console.log('✅ Datos recibidos del backend:', {
        votes_count: businessData?.votes_count,
        place_topics: Object.keys(businessData?.place_topics || {}).length,
        rating: businessData?.rating,
        has_distribution: !!businessData?.rating_distribution,
        // TripAdvisor data
        tripadvisor_rating: businessData?.tripadvisor_rating,
        tripadvisor_votes_count: businessData?.tripadvisor_votes_count,
        has_google: businessData?.has_google,
        has_tripadvisor: businessData?.has_tripadvisor
      });

      // Convertir place_topics de objeto a array si es necesario
      const topicsArray = businessData?.place_topics 
        ? Object.entries(businessData.place_topics).map(([label, value]) => ({
            label,
            value: typeof value === 'number' ? value : 0
          })).sort((a, b) => b.value - a.value).slice(0, 6)
        : [];

      // 🔍 COMBINAR DATOS DE GOOGLE Y TRIPADVISOR INTELIGENTEMENTE
      const googleVotes = businessData?.votes_count || 0;
      const tripadvisorVotes = businessData?.tripadvisor_votes_count || 0;
      const totalVotes = googleVotes + tripadvisorVotes;
      
      // Calcular rating combinado ponderado si tenemos ambas fuentes
      let combinedRating = businessData?.rating || 0;
      let combinedMethod = 'google_only';
      
      if (businessData?.has_google && businessData?.has_tripadvisor && googleVotes > 0 && tripadvisorVotes > 0) {
        const googleWeight = googleVotes / totalVotes;
        const tripWeight = tripadvisorVotes / totalVotes;
        combinedRating = (businessData.rating * googleWeight) + (businessData.tripadvisor_rating * tripWeight);
        combinedMethod = 'weighted_average';
        console.log('🔄 Combined rating calculated:', { 
          googleRating: businessData.rating, 
          googleWeight: googleWeight.toFixed(2),
          tripRating: businessData.tripadvisor_rating,
          tripWeight: tripWeight.toFixed(2),
          combinedRating: combinedRating.toFixed(1)
        });
      } else if (businessData?.has_tripadvisor && !businessData?.has_google) {
        combinedRating = businessData.tripadvisor_rating || 0;
        combinedMethod = 'tripadvisor_only';
      }

      const finalBusinessMetrics = {
        rating: Number(combinedRating.toFixed(1)),
        totalVotes: totalVotes || googleVotes || tripadvisorVotes || 0,
        scrapedReviews: 0,
        distribution: businessData?.rating_distribution || {},
        _providers: {
          hasGoogle: businessData?.has_google || false,
          googleVotes: googleVotes,
          googleRating: businessData?.rating || 0,
          hasTripAdvisor: businessData?.has_tripadvisor || false,
          tripAdvisorVotes: tripadvisorVotes,
          tripAdvisorRating: businessData?.tripadvisor_rating || 0,
          combinedMethod: combinedMethod
        }
      };

      updateState({
        businessCard: {
          name: businessData?.name || finalSearchText,
          category: businessData?.category || "Negocio",
          address: businessData?.address || null,
          photo: businessData?.main_image || generateBusinessIcon(finalSearchText),
          isOpenNow: true,
          phone: businessData?.phone || null,
          website: businessData?.url || null,
          external_place_id: result.external_place_id,
          hasBusinessData: true
        },
        businessMetrics: finalBusinessMetrics,
        businessTopics: topicsArray,
        step: 2
      });

      // 🚀 Ejecutar ingesta + NLP en background controlado
      if (externalPlaceId) {
        updateState({ loadingReviews: true, reviewsStep: 'Cargando reseñas (Google/TripAdvisor)...' });

        (async () => {
          const ingestResults: { provider: string; count: number }[] = [];
          try {
            if (googleCid) {
              try {
                const googleRes = await businessService.ingestGoogleReviews(externalPlaceId, googleCid, 200, 3650);
                const count = googleRes?.inserted ?? googleRes?.upserted ?? 0;
                ingestResults.push({ provider: 'Google', count });
              } catch (googleErr) {
                console.error('❌ Error ingiriendo Google reviews:', googleErr);
              }
            }

            if (tripadvisorUrl) {
              try {
                const tripRes = await businessService.ingestTripAdvisorReviews(externalPlaceId, tripadvisorUrl, 200, 3650);
                const count = tripRes?.inserted ?? tripRes?.upserted ?? 0;
                ingestResults.push({ provider: 'TripAdvisor', count });
              } catch (tripErr) {
                console.error('❌ Error ingiriendo TripAdvisor reviews:', tripErr);
              }
            }

            const totalIngested = ingestResults.reduce((acc, cur) => acc + (cur.count || 0), 0);
            if (totalIngested > 0) {
              updateState(prev => ({
                businessMetrics: {
                  ...prev.businessMetrics,
                  scrapedReviews: (prev.businessMetrics?.scrapedReviews || 0) + totalIngested,
                  totalVotes: (prev.businessMetrics?.totalVotes || 0) + totalIngested
                }
              }));
            }

            updateState({ reviewsStep: 'Analizando reseñas...' });
            try {
              const analysisRes = await businessService.analyzeReviews(externalPlaceId, 300);
              console.log('✅ NLP completado:', analysisRes);
            } catch (analysisErr) {
              console.error('❌ Error corriendo NLP:', analysisErr);
            }

          } finally {
            updateState({ loadingReviews: false, reviewsStep: ingestResults.length ? 'Análisis finalizado' : '' });
          }
        })();
      }
      
    } catch (err) {
      console.error('❌ Error in business setup:', err);
      updateState({ 
        error: err instanceof Error ? err.message : 'Error configurando el negocio' 
      });
    } finally {
      updateState({ isLoading: false });
    }
  };

  // Confirmar negocio - soluci\u00f3n mejorada para navegaci\u00f3n
  const handleConfirm = async () => {
    updateState({ isSaving: true });
    
    try {
      // Crear objeto business completo con todos los campos requeridos
      const businessData = {
        name: state.businessCard?.name || '',
        placeId: state.businessCard?.external_place_id || '',
        external_place_id: state.businessCard?.external_place_id || null,
        google_place_id: state.businessCard?.external_place_id || null,
        rating: state.businessMetrics?.rating || 0,
        totalReviews: state.businessMetrics?.totalVotes || 0,
        scrapedReviews: state.businessMetrics?.scrapedReviews || 0,
        address: state.businessCard?.address || '',
        phone: state.businessCard?.phone || null,
        website: state.businessCard?.website || null,
        category: state.businessCard?.category || 'Negocio',
        // Incluir campos cr\u00edticos para ratings y datos
        votes_count: state.businessMetrics?.totalVotes || 0,
        place_topics: state.businessTopics?.reduce((acc: any, topic: any) => {
          acc[topic.label] = topic.value;
          return acc;
        }, {}),
        google_ratings: state.businessMetrics?.distribution || {},
        tripadvisor_ratings: state.businessMetrics?._providers?.tripAdvisorRating || {},
        hasBusinessData: true,
        hasRealReviews: false,
        hasAnalysis: state.businessTopics.length > 0,
        lastSync: new Date().toISOString()
      };
      
      console.log('🏢 Configurando business para navegaci\u00f3n:', {
        name: businessData.name,
        totalReviews: businessData.totalReviews,
        hasAnalysis: businessData.hasAnalysis,
        topics: state.businessTopics.length
      });
      
      // Vincular este negocio al usuario en la BD (businesses + trial)
      try {
        await businessService.linkBusiness(businessData.external_place_id || businessData.placeId);
      } catch (linkErr) {
        console.warn('linkBusiness failed (continuing locally):', linkErr);
      }

      // Asegurar que el business se guarde antes de navegar
      setCurrentBusiness(businessData);
      
      // Usar setTimeout para asegurar que el estado se actualice antes de navegar
      setTimeout(() => {
        console.log('🚀 Navegando al dashboard...');
        navigate('/dashboard', { replace: true });
      }, 100);
      
    } catch (error) {
      console.error('❌ Error configurando business:', error);
      updateState({ error: 'Error configurando el negocio' });
    } finally {
      updateState({ isSaving: false });
    }
  };

  // Helper para generar icono
  const generateBusinessIcon = (name: string) => {
    const initials = name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    const color = colors[name.length % colors.length];
    
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='${encodeURIComponent(color)}' rx='12'/%3E%3Ctext x='32' y='40' text-anchor='middle' fill='white' font-size='18' font-weight='bold'%3E${initials}%3C/text%3E%3C/svg%3E`;
  };

  return {
    // Estado
    state,
    refs: {
      searchInputRef,
      suggestionsRef,
      debounceRef
    },
    
    // Acciones
    actions: {
      updateState,
      handleInputChange,
      handleSuggestionSelect,
      handleKeyDown,
      handleSearch,
      handleConfirm,
      setManualPlaceId: (value: string) => updateState({ manualPlaceId: value }),
      toggleManualMode: () => updateState({ manualMode: !state.manualMode }),
      setTripAdvisorUrl: (url: string) => updateState({ tripAdvisorUrl: url }),
      closeSuggestions: () => updateState({ showSuggestions: false, highlightedIndex: -1 })
    }
  };
};
