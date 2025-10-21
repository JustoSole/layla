// Helper functions para acceso directo a datos de la BD
// CORREGIDO para usar tipos centralizados y consistentes
import { supabase, supabaseDev } from './supabase';
import { ExternalPlace, Review, BusinessData, ReviewData, AnalysisData, transformReviewForUI, transformBusinessForUI } from '../types/schema';

// Usar cliente específico para desarrollo
const dbClient = import.meta.env.DEV ? supabaseDev : supabase;

// Cargar negocios reales usando tipos del schema centralizado
export const loadRealBusinesses = async (limit = 10): Promise<BusinessData[]> => {
  try {
    console.log('🔍 Cargando negocios reales según schema centralizado...');
    
    if (!dbClient) {
      console.warn('⚠️ Database client not available, returning empty data');
      return [];
    }
    
    // Query con campos exactos según schema
    const { data, error } = await dbClient
      .from('external_places')
      .select(`
        id,
        name,
        google_cid,
        google_place_id,
        address,
        category,
        total_photos,
        city,
        country_code,
        phone,
        url,
        google_ratings,
        tripadvisor_ratings,
        place_topics,
        business_info_raw
      `)
      .not('name', 'is', null)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error query external_places:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No se encontraron negocios en external_places');
      return [];
    }

    console.log(`🎯 Encontrados ${data.length} negocios base en external_places`);

    // Enriquecer con conteos reales de reviews y análisis
    const enrichedBusinesses = await Promise.all(
      data.map(async (business) => {
        try {
          // Query unificada para conteos
          const { data: reviewsData, error: reviewError } = await dbClient
            .from('reviews')
            .select('id, sentiment')
            .eq('external_place_id', business.id);

          if (reviewError) {
            console.log(`⚠️ Reviews query failed for ${business.name}:`, reviewError.message);
            return {
              ...transformBusinessForUI(business as ExternalPlace),
              reviews_count: 0,
              analysis_count: 0
            };
          }

          const reviewsCount = reviewsData?.length || 0;
          const analysisCount = reviewsData?.filter(r => r.sentiment).length || 0;

          if (reviewsCount > 0) {
            console.log(`📊 ${business.name}: ${reviewsCount} reviews, ${analysisCount} análisis`);
          }

          return {
            ...transformBusinessForUI(business as ExternalPlace),
            reviews_count: reviewsCount,
            analysis_count: analysisCount
          };
          
        } catch (error) {
          console.log(`⚠️ Error processing ${business.name}:`, error);
          return {
            ...transformBusinessForUI(business as ExternalPlace),
            reviews_count: 0,
            analysis_count: 0
          };
        }
      })
    );

    console.log(`✅ Cargados ${enrichedBusinesses.length} negocios con conteos reales`);
    return enrichedBusinesses;
    
  } catch (error) {
    console.error('❌ Error crítico en loadRealBusinesses:', error);
    return [];
  }
};

// Cargar el negocio principal del usuario autenticado
export const loadUserPrimaryBusiness = async (userId: string): Promise<BusinessData | null> => {
  try {
    // Usar cliente autenticado para respetar RLS
    const client = supabase;
    const { data, error } = await client
      .from('businesses')
      .select('id, external_place_id, external_places(*)')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const place = (data as any)?.external_places as ExternalPlace | undefined;
    if (!place) return null;
    const ui = transformBusinessForUI(place);
    // Enriquecer con conteos reales
    const { data: reviews } = await client
      .from('reviews')
      .select('id, sentiment')
      .eq('external_place_id', ui.id);
    return {
      ...ui,
      reviews_count: reviews?.length || 0,
      analysis_count: reviews?.filter((r: any) => r.sentiment).length || 0
    } as BusinessData;
  } catch (e) {
    console.warn('loadUserPrimaryBusiness failed:', e);
    return null;
  }
};

// Cargar reviews reales usando tipos del schema
export const loadRealReviews = async (external_place_id: string, limit = 100): Promise<ReviewData[]> => {
  try {
    const { data, error } = await dbClient
      .from('reviews')
      .select(`
        id,
        external_place_id,
        author_name,
        rating_value,
        review_text,
        provider,
        posted_at,
        owner_posted_at,
        owner_answer,
        images,
        sentiment,
        aspects,
        overall_score,
        overall_sentiment_confidence,
        gap_to_five,
        gap_reasons,
        critical_flags,
        executive_summary,
        action_items
      `)
      .eq('external_place_id', external_place_id)
      .limit(limit)
      .order('posted_at', { ascending: false });

    if (error) throw error;
    
    // Transformar usando helper centralizado
    return (data || []).map(review => transformReviewForUI(review as Review));
    
  } catch (error) {
    console.error('❌ Error cargando reviews:', error);
    return [];
  }
};

// Cargar una reseña individual (detalle)
export const loadReviewById = async (external_place_id: string, reviewId: string): Promise<ReviewData | null> => {
  try {
    const { data, error } = await dbClient
      .from('reviews')
      .select(`
        id,
        external_place_id,
        author_name,
        rating_value,
        review_text,
        provider,
        posted_at,
        owner_answer,
        owner_posted_at,
        images,
        sentiment,
        aspects,
        overall_score,
        overall_sentiment_confidence,
        gap_to_five,
        gap_reasons,
        critical_flags,
        executive_summary,
        action_items
      `)
      .eq('external_place_id', external_place_id)
      .eq('id', reviewId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return transformReviewForUI(data as Review);
  } catch (error) {
    console.error('❌ Error cargando reseña individual:', error);
    return null;
  }
};

// Cargar análisis reales desde campos sentiment/aspects en reviews
export const loadRealAnalysis = async (external_place_id: string, limit = 50): Promise<AnalysisData[]> => {
  try {
    const { data, error } = await dbClient
      .from('reviews')
      .select(`
        id,
        sentiment,
        aspects,
        overall_score,
        overall_sentiment_confidence,
        gap_to_five,
        gap_reasons,
        critical_flags,
        executive_summary,
        action_items,
        language
      `)
      .eq('external_place_id', external_place_id)
      .not('sentiment', 'is', null) // Solo reviews con análisis
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(review => ({
      review_id: review.id,
      sentiment: review.sentiment as 'positive' | 'neutral' | 'negative',
      language: review.language,
      overall_score: review.overall_score,
      overall_sentiment_confidence: review.overall_sentiment_confidence,
      gap_to_five: review.gap_to_five,
      gap_reasons: review.gap_reasons,
      critical_flags: review.critical_flags,
      executive_summary: review.executive_summary,
      action_items: review.action_items,
      aspects: review.aspects || []
    }));
    
  } catch (error) {
    console.error('❌ Error cargando análisis:', error);
    return [];
  }
};

// Cargar datos completos con tipos consistentes
export const loadCompleteBusinessData = async (external_place_id: string) => {
  try {
    console.log(`🚀 Cargando datos completos para negocio: ${external_place_id}`);

    const [businessData, reviewsData, analysisData] = await Promise.all([
      dbClient
        .from('external_places')
        .select('*')
        .eq('id', external_place_id)
        .single(),
      loadRealReviews(external_place_id),
      loadRealAnalysis(external_place_id)
    ]);

    if (businessData.error) throw businessData.error;

    const result = {
      business: transformBusinessForUI(businessData.data as ExternalPlace),
      reviews: reviewsData,
      analysis: analysisData,
      stats: {
        total_reviews: reviewsData.length,
        total_analysis: analysisData.length,
        avg_rating: reviewsData.length > 0 
          ? reviewsData.reduce((sum, r) => sum + (r.rating_value || 0), 0) / reviewsData.length 
          : 0,
        sentiment_breakdown: analysisData.reduce((acc, a) => {
          acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };

    console.log(`✅ Datos completos cargados:`, result.stats);
    return result;
  } catch (error) {
    console.error('❌ Error cargando datos completos:', error);
    throw error;
  }
};

// Agregar: serie de tendencia real desde reviews (agregación diaria o mensual)
export const loadReviewTrend = async (
  external_place_id: string,
  options?: { from?: string; to?: string; source?: 'combined' | 'google' | 'tripadvisor'; granularity?: 'daily' | 'monthly' }
) => {
  const from = options?.from ? new Date(options.from) : new Date(Date.now() - 180 * 86400000);
  const to = options?.to ? new Date(options.to) : new Date();
  const source = options?.source || 'combined';
  const gran = options?.granularity || 'daily';

  // Traer columnas mínimas
  const { data, error } = await dbClient
    .from('reviews')
    .select('posted_at, rating_value, provider')
    .eq('external_place_id', external_place_id)
    .gte('posted_at', from.toISOString())
    .lte('posted_at', to.toISOString())
    .order('posted_at', { ascending: true });
  if (error) throw error;

  const rows = (data || []).filter(r => source === 'combined' || r.provider === source);

  const byKey = new Map<string, { ts: number; ratingSum: number; count: number }>();
  rows.forEach((r: any) => {
    const d = r.posted_at ? new Date(r.posted_at) : null;
    if (!d) return;
    const key = gran === 'monthly' ? `${d.getFullYear()}-${d.getMonth()}` : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const ts = gran === 'monthly' ? new Date(d.getFullYear(), d.getMonth(), 1, 12).getTime() : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
    const prev = byKey.get(key) || { ts, ratingSum: 0, count: 0 };
    prev.ratingSum += Number(r.rating_value || 0);
    prev.count += 1;
    byKey.set(key, prev);
  });

  return Array.from(byKey.values())
    .sort((a, b) => a.ts - b.ts)
    .map(v => ({ ts: v.ts, date: new Date(v.ts), rating: +(v.ratingSum / (v.count || 1)).toFixed(2), count: v.count }));
};

// Cargar tendencia de Sentiment Score (0-100) desde overall_score
export const loadSentimentTrend = async (
  external_place_id: string,
  options?: { from?: string; to?: string; source?: 'combined' | 'google' | 'tripadvisor'; granularity?: 'daily' | 'monthly' }
) => {
  const from = options?.from ? new Date(options.from) : new Date(Date.now() - 180 * 86400000);
  const to = options?.to ? new Date(options.to) : new Date();
  const source = options?.source || 'combined';
  const gran = options?.granularity || 'daily';

  // Traer solo reviews con análisis de sentiment
  const { data, error } = await dbClient
    .from('reviews')
    .select('posted_at, overall_score, provider')
    .eq('external_place_id', external_place_id)
    .not('overall_score', 'is', null)
    .gte('posted_at', from.toISOString())
    .lte('posted_at', to.toISOString())
    .order('posted_at', { ascending: true });
  
  if (error) throw error;

  const rows = (data || []).filter(r => source === 'combined' || r.provider === source);

  const byKey = new Map<string, { ts: number; scoreSum: number; count: number }>();
  rows.forEach((r: any) => {
    const d = r.posted_at ? new Date(r.posted_at) : null;
    if (!d) return;
    const key = gran === 'monthly' ? `${d.getFullYear()}-${d.getMonth()}` : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const ts = gran === 'monthly' ? new Date(d.getFullYear(), d.getMonth(), 1, 12).getTime() : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
    const prev = byKey.get(key) || { ts, scoreSum: 0, count: 0 };
    prev.scoreSum += Number(r.overall_score || 0);
    prev.count += 1;
    byKey.set(key, prev);
  });

  return Array.from(byKey.values())
    .sort((a, b) => a.ts - b.ts)
    .map(v => ({ 
      ts: v.ts, 
      date: new Date(v.ts), 
      score: Math.round((v.scoreSum / (v.count || 1)) * 100), // ✅ Convertir 0-1 a 0-100
      count: v.count 
    }));
};

// Helper corregido usando tipos centralizados
export const transformRealBusinessToContext = (business: BusinessData, reviewsCount?: number) => {
  const totalReviews = reviewsCount || business.reviews_count || 0;
  return {
    name: business.name,
    placeId: business.id,
    external_place_id: business.id,
    rating: business.rating_value || 0,
    totalReviews: totalReviews,
    scrapedReviews: totalReviews,
    address: business.address,
    phone: business.phone,
    website: business.url,
    category: business.category,
    // ✅ Campos estandarizados
    rating_votes_count: business.rating_votes_count || totalReviews,
    votes_count: business.rating_votes_count || totalReviews, // Deprecated
    place_topics: business.place_topics,
    google_ratings: business.google_ratings,
    tripadvisor_ratings: business.tripadvisor_ratings,
    hasBusinessData: true,
    hasRealReviews: (business.reviews_count || 0) > 0,
    hasAnalysis: (business.analysis_count || 0) > 0,
    lastSync: new Date().toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  };
};

// Backward compatibility exports
export type RealBusinessData = BusinessData;
export type RealReviewData = ReviewData;
export type RealAnalysisData = AnalysisData;

// =====================================================
// 🎯 CAMPAIGN FUNCTIONS
// =====================================================

/**
 * Load campaigns for a business
 */
export const loadCampaigns = async (business_id: string) => {
  try {
    console.log('🔍 Loading campaigns for business:', business_id);
    
    const { data, error } = await supabase
      .from('review_campaigns')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading campaigns:', error);
      throw error;
    }

    console.log(`✅ Loaded ${data?.length || 0} campaigns`);
    return data || [];
  } catch (error) {
    console.error('❌ Error in loadCampaigns:', error);
    return [];
  }
};

/**
 * Load feedback for a specific campaign
 */
export const loadCampaignFeedback = async (
  campaign_id: string, 
  filters?: {
    status?: 'pending' | 'resolved' | 'ignored';
    critical_only?: boolean;
  }
) => {
  try {
    console.log('🔍 Loading campaign feedback:', campaign_id, filters);
    
    let query = supabase
      .from('reviews')
      .select(`
        id,
        rating_value,
        review_text,
        selected_aspects,
        aspect_details,
        ces_score,
        nps_score,
        customer_email,
        customer_phone,
        sentiment,
        aspects,
        critical_flags,
        executive_summary,
        action_items,
        resolution_status,
        resolved_at,
        context_metadata,
        posted_at,
        created_at
      `)
      .eq('campaign_id', campaign_id)
      .eq('provider', 'campaign');

    // Apply filters
    if (filters?.status) {
      query = query.eq('resolution_status', filters.status);
    }

    if (filters?.critical_only) {
      query = query.or('rating_value.lte.2,critical_flags.not.is.null');
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error loading campaign feedback:', error);
      throw error;
    }

    console.log(`✅ Loaded ${data?.length || 0} feedback items`);
    return data || [];
  } catch (error) {
    console.error('❌ Error in loadCampaignFeedback:', error);
    return [];
  }
};

/**
 * Update feedback resolution status
 */
export const updateFeedbackResolution = async (
  review_id: string,
  status: 'pending' | 'resolved' | 'ignored'
) => {
  try {
    console.log('🔄 Updating feedback resolution:', review_id, status);
    
    const updates: any = {
      resolution_status: status
    };

    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', review_id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating feedback resolution:', error);
      throw error;
    }

    console.log('✅ Feedback resolution updated');
    return data;
  } catch (error) {
    console.error('❌ Error in updateFeedbackResolution:', error);
    throw error;
  }
};

/**
 * Get count of critical pending feedback
 */
export const getCriticalFeedbackCount = async (business_id: string): Promise<number> => {
  try {
    // First get campaign IDs for this business
    const { data: campaigns, error: campaignError } = await supabase
      .from('review_campaigns')
      .select('id')
      .eq('business_id', business_id);

    if (campaignError) {
      console.error('❌ Error getting campaigns:', campaignError);
      return 0;
    }

    if (!campaigns || campaigns.length === 0) {
      return 0;
    }

    const campaignIds = campaigns.map(c => c.id);

    // Now query reviews with those campaign IDs
    const { data, error } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('provider', 'campaign')
      .eq('resolution_status', 'pending')
      .in('campaign_id', campaignIds)
      .or('rating_value.lte.2,critical_flags.not.is.null');

    if (error) {
      console.error('❌ Error getting critical feedback count:', error);
      return 0;
    }

    return (data as any)?.count || 0;
  } catch (error) {
    console.error('❌ Error in getCriticalFeedbackCount:', error);
    return 0;
  }
};