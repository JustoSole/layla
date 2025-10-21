// TIPOS CENTRALIZADOS basados en schema.sql - FUENTE ÚNICA DE VERDAD
// Todos los componentes deben usar estos tipos para consistencia

// 📋 EXTERNAL_PLACES (schema líneas 29-77)
export interface ExternalPlace {
  id: string;
  google_place_id: string | null;
  google_cid: string | null;
  feature_id: string | null;
  tripadvisor_url_path: string | null;
  name: string;
  original_title: string | null;
  description: string | null;
  category: string | null;
  category_ids: string[] | null;
  additional_categories: string[] | null;
  phone: string | null;
  url: string | null;
  contact_url: string | null;
  contributor_url: string | null;
  book_online_url: string | null;
  domain: string | null;
  logo: string | null;
  main_image: string | null;
  total_photos: number | null;
  snippet: string | null;
  address: string | null;
  address_info: any;
  city: string | null;
  zip: string | null;
  region: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_claimed: boolean | null;
  current_status: string | null;
  is_directory_item: boolean | null;
  price_level_text: string | null;
  hotel_rating: number | null;
  extras: any;
  business_info_raw: any;
  qna: any;
  created_at: string;
  updated_at: string;
  place_topics: any;
  google_ratings: any;
  tripadvisor_ratings: any;
}

// 📋 REVIEWS (schema líneas 95-127 + campaign fields)
export interface Review {
  id: string; // ✅ Campo real línea 96
  external_place_id: string;
  business_id: string | null;
  provider: 'google' | 'tripadvisor' | 'campaign'; // ✅ Extended for campaign feedback
  provider_review_id: string | null; // ✅ Nullable for campaign reviews
  rating_value: number | null; // ✅ Campo real línea 101
  review_text: string | null;
  original_review_text: string | null;
  language: string | null;
  original_language: string | null;
  author_name: string | null; // ✅ Campo real línea 106
  profile_url: string | null;
  profile_image_url: string | null;
  local_guide: boolean | null;
  reviewer_reviews_count: number | null;
  reviewer_photos_count: number | null;
  posted_at: string | null; // ✅ Campo real línea 112
  review_url: string | null;
  owner_answer: string | null; // ✅ Campo real línea 114
  original_owner_answer: string | null;
  owner_posted_at: string | null;
  review_highlights: any;
  images: any; // ✅ Campo real línea 118 (jsonb)
  sentiment: 'positive' | 'neutral' | 'negative' | null; // ✅ Campo análisis línea 119
  aspects: any; // ✅ Campo análisis línea 120 (jsonb)
  overall_score: number | null;
  overall_sentiment_confidence: number | null;
  gap_to_five: number | boolean | null;
  gap_reasons: string[] | null;
  critical_flags: string[] | null;
  executive_summary: string | null;
  action_items: string[] | null;
  review_item_raw: any;
  created_at: string;
  updated_at: string;
  // 🆕 Campaign feedback fields
  campaign_id: string | null;
  selected_aspects: string[] | null;
  aspect_details: Record<string, string[]> | null;
  ces_score: number | null; // 1-5
  nps_score: number | null; // 0-10
  customer_email: string | null;
  customer_phone: string | null;
  resolution_status: 'pending' | 'resolved' | 'ignored' | null;
  resolved_at: string | null;
  context_metadata: any;
}

// 📋 CAMPAIGN (nueva tabla)
export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  status: 'active' | 'paused';
  short_code: string;
  views_count: number;
  ratings_captured: number;
  redirected_count: number;
  internal_feedback_count: number;
  created_at: string;
  updated_at: string;
}

// 🎯 INTERFACES PARA COMPONENTES (basadas en schema)
export interface BusinessData {
  id: string;
  name: string;
  google_cid: string | null;
  google_place_id: string | null;
  address: string | null;
  category: string | null;
  total_photos: number | null;
  city: string | null;
  country_code: string | null;
  phone: string | null;
  url: string | null;
  rating_value: number | null;
  rating_votes_count: number | null; // ✅ Campo crítico para votes
  place_topics: any; // ✅ Campo crítico para topics 
  google_ratings: any; // ✅ Campo crítico para ratings de Google
  tripadvisor_ratings: any; // ✅ Campo crítico para ratings de TripAdvisor
  business_info_raw: any;
  reviews_count: number;
  analysis_count: number;
}

// 🎯 INTERFACE PARA REVIEWS EN COMPONENTES (basada en schema)
export interface ReviewData {
  id: string;
  author_name: string | null;
  rating_value: number | null;
  review_text: string | null;
  provider: 'google' | 'tripadvisor' | 'campaign';
  posted_at: string | null;
  owner_answer: string | null;
  owner_posted_at?: string | null;
  images: any;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  aspects: any;
  // 🆕 Campos de Gap Analysis (críticos para Insights)
  overall_score: number | null;
  overall_sentiment_confidence: number | null;
  gap_to_five: number | boolean | null;
  gap_reasons: string[] | null;
  critical_flags: string[] | null;
  executive_summary: string | null;
  action_items: string[] | null;
  // 🆕 Campaign feedback fields
  campaign_id?: string | null;
  selected_aspects?: string[] | null;
  ces_score?: number | null;
  nps_score?: number | null;
  customer_email?: string | null;
  resolution_status?: 'pending' | 'resolved' | 'ignored' | null;
  resolved_at?: string | null;
  // Campos calculados para UI
  has_owner_response?: boolean;
  images_count?: number;
  formatted_date?: string;
}

// 🎯 INTERFACE PARA ANÁLISIS
export interface AnalysisAspect {
  aspect: string;
  sub_aspect?: string; // ✨ Clasificación inteligente de sub-tema (ej: "tamaño_pequeño", "velocidad_lenta")
  sentiment: 'positive' | 'neutral' | 'negative';
  evidence_spans: string[]; // Array de evidencias/citas donde se menciona este aspecto
  severity?: number;
  gap_to_five_contrib?: number;
}

export interface AnalysisData {
  review_id: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  language?: string | null;
  overall_score?: number | null;
  overall_sentiment_confidence?: number | null;
  gap_to_five?: boolean;
  gap_reasons?: string[];
  critical_flags?: string[];
  executive_summary?: string | null;
  action_items?: string[];
  aspects: AnalysisAspect[];
}

// 🎯 HELPERS PARA TRANSFORMAR DATOS
export const transformReviewForUI = (review: Review): ReviewData => ({
  id: review.id,
  author_name: review.author_name,
  rating_value: review.rating_value,
  review_text: review.review_text,
  provider: review.provider,
  posted_at: review.posted_at,
  owner_answer: review.owner_answer,
  owner_posted_at: review.owner_posted_at,
  images: review.images,
  sentiment: review.sentiment,
  aspects: review.aspects,
  // 🆕 Mapear campos de Gap Analysis
  overall_score: review.overall_score,
  overall_sentiment_confidence: review.overall_sentiment_confidence,
  gap_to_five: review.gap_to_five,
  gap_reasons: review.gap_reasons,
  critical_flags: review.critical_flags,
  executive_summary: review.executive_summary,
  action_items: review.action_items,
  // 🆕 Mapear campos de Campaign
  campaign_id: review.campaign_id,
  selected_aspects: review.selected_aspects,
  ces_score: review.ces_score,
  nps_score: review.nps_score,
  customer_email: review.customer_email,
  resolution_status: review.resolution_status,
  resolved_at: review.resolved_at,
  // Campos calculados para UI
  has_owner_response: !!review.owner_answer,
  images_count: Array.isArray(review.images) ? review.images.length : 0,
  formatted_date: review.posted_at ? new Date(review.posted_at).toLocaleDateString('es-ES') : undefined
});

export const transformBusinessForUI = (business: ExternalPlace): BusinessData => ({
  id: business.id,
  name: business.name,
  google_cid: business.google_cid,
  google_place_id: business.google_place_id,
  address: business.address,
  category: business.category,
  total_photos: business.total_photos,
  city: business.city,
  country_code: business.country_code,
  phone: business.phone,
  url: business.url,
  // Derivar rating consolidado para UI: preferir Google y fallback a TripAdvisor
  rating_value: (business.google_ratings?.rating_value ?? business.tripadvisor_ratings?.rating_value ?? null),
  rating_votes_count: (business.google_ratings?.rating_votes ?? business.tripadvisor_ratings?.rating_votes ?? null),
  place_topics: business.place_topics, // ✅ Mapear topics correctamente
  google_ratings: business.google_ratings, // ✅ Mapear Google ratings
  tripadvisor_ratings: business.tripadvisor_ratings, // ✅ Mapear TripAdvisor ratings
  business_info_raw: business.business_info_raw,
  reviews_count: 0, // Se debe calcular
  analysis_count: 0  // Se debe calcular
});

// 📊 RATING HELPERS CENTRALIZADOS
export type RatingSource = 'combined' | 'google' | 'tripadvisor';

export interface RatingSummary {
  value: number | null;
  votes: number;
  distribution: Record<string, number> | null; // normalmente claves '1'..'5'
}

const toSummary = (src: any): RatingSummary => {
  return {
    value: typeof src?.rating_value === 'number' ? src.rating_value : null,
    votes: typeof src?.rating_votes === 'number' ? src.rating_votes : 0,
    distribution: src?.rating_distribution && typeof src.rating_distribution === 'object' ? src.rating_distribution : null
  };
};

const sumDistributions = (a: Record<string, number> | null, b: Record<string, number> | null): Record<string, number> | null => {
  if (!a && !b) return null;
  const res: Record<string, number> = {};
  const keys = new Set([...(a ? Object.keys(a) : []), ...(b ? Object.keys(b) : [])]);
  keys.forEach(k => {
    const av = typeof a?.[k] === 'number' ? a![k] : 0;
    const bv = typeof b?.[k] === 'number' ? b![k] : 0;
    res[k] = av + bv;
  });
  return res;
};

export const getRatingSummary = (business: BusinessData, source: RatingSource): RatingSummary => {
  const g = toSummary(business.google_ratings);
  const t = toSummary(business.tripadvisor_ratings);

  if (source === 'google') return g;
  if (source === 'tripadvisor') return t;

  // combined: promedio ponderado por votos + suma de distribuciones
  const totalVotes = (g.votes || 0) + (t.votes || 0);
  const value = totalVotes > 0
    ? Number((((g.value || 0) * (g.votes || 0)) + ((t.value || 0) * (t.votes || 0))) / totalVotes)
    : null;
  const distribution = sumDistributions(g.distribution, t.distribution);
  return { value, votes: totalVotes, distribution };
};

export const hasAnyRating = (business: BusinessData): boolean => {
  return !!(business.google_ratings?.rating_value || business.tripadvisor_ratings?.rating_value);
};

// ✅ HELPERS DE VALIDACIÓN
export const safeRating = (value: any): number => {
  const num = Number(value);
  return isFinite(num) && num >= 0 && num <= 5 ? num : 0;
};

export const safeCount = (value: any): number => {
  const num = Number(value);
  return isFinite(num) && num >= 0 ? Math.floor(num) : 0;
};

