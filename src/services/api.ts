// Services para comunicarse con las funciones de Supabase
// Usa el cliente de Supabase directamente para mejor integración
import { supabase } from '../lib/supabase';

// Helper para llamadas a Edge Functions
const invokeFunction = async (functionName: string, payload: any) => {
  console.log(`🚀 Calling Supabase function: ${functionName}`, payload);
  
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload
  });

  if (error) {
    console.error(`❌ Function ${functionName} failed:`, error);
    throw new Error(error.message || `Error calling ${functionName}`);
  }

  console.log(`✅ Function ${functionName} success:`, data);
  return data;
};

// Tipos de datos
export interface BusinessInfo {
  external_place_id: string; // UUID from our database
  name: string;
  address?: string;
  rating?: number;
  cid?: string;
  place_id?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  url?: string;
}

export interface ReviewPreview {
  review_id: string;
  author: string;
  rating: number;
  text_preview: string;
  review_text: string; // ← Texto completo agregado
  has_owner_response?: boolean;
  images_count?: number;
}

export interface ReviewAnalysis {
  review_id: string;
  language: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  aspects_count: number;
  top_aspects: string[];
}

export interface OnboardResponse {
  ok: boolean;
  external_place_id: string; // UUID
  business_info?: {
    name: string;
    cid?: string;
    place_id?: string;
    address?: string;
    rating?: number | null;
    phone?: string;
    url?: string;
    latitude?: number;
    longitude?: number;
  };
  error?: string;
}

export interface IngestResponse {
  ok: boolean;
  inserted?: number;
  upserted?: number;
  provider?: string;
  error?: string;
}

export interface AnalyzeResponse {
  ok: boolean;
  analyzed: number;
  total_reviews_found: number;
  processed_reviews: {
    review_id: string;
    sentiment: string;
    aspects_count: number;
  }[];
  error?: string;
}

// Nuevas interfaces para autocompletado
export interface PlaceSuggestion {
  placeId: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
  sessionToken?: string;
}

export interface AutocompleteResponse {
  ok: boolean;
  suggestions: PlaceSuggestion[];
  sessionToken: string;
  query: string;
  count: number;
  error?: string;
}

// Interfaces para Staff
export interface StaffMember {
  staff_member_id: string;
  external_place_id: string;
  name: string;
  role: string | null;
  name_variations: string[];
  total_mentions: number;
  positive_mentions: number;
  neutral_mentions: number;
  negative_mentions: number;
  positive_rate: number;
  last_mention_date: string;
  first_seen_at: string;
  unique_reviews_count: number;
  created_at: string;
  updated_at: string;
}

export interface StaffMentionDetail {
  id: string;
  review_id: string;
  detected_name: string;
  role: string | null;
  sentiment: string;
  evidence_span: string; // Nota: staff_mentions sigue usando evidence_span (singular) según el schema
  created_at: string;
  rating_value: number | null;
  author_name: string | null;
  posted_at: string | null;
  provider: string;
  review_url: string | null;
}

export interface ListStaffResponse {
  ok: boolean;
  staff: StaffMember[];
  total_count: number;
  error?: string;
}

export interface StaffDetailResponse {
  ok: boolean;
  staff_member: StaffMember;
  mentions: StaffMentionDetail[];
  mentions_count: number;
  error?: string;
}

// Servicios de API actualizados para usar las funciones reales
export const businessService = {
  // Google Places Autocomplete
  async getPlaceSuggestions(input: string, _regionCode = 'AR', options?: { vertical?: 'gastronomia' | 'retail' | 'servicios'; bbox?: { low:{latitude:number, longitude:number}, high:{latitude:number, longitude:number} }; origin?: { latitude:number, longitude:number } }): Promise<AutocompleteResponse> {
    const sessionToken = crypto.randomUUID();
    const payload: any = {
      input: input.trim(),
      sessionToken,
      vertical: options?.vertical ?? 'gastronomia',
      origin: options?.origin,
      bbox: options?.bbox
    };
    return invokeFunction('google-places-autocomplete', payload);
  },

  // Vincular negocio al usuario autenticado (crea row en businesses y trial si falta)
  async linkBusiness(external_place_id: string, plan: 'trial' | 'pro' = 'trial'): Promise<{ ok: boolean; business_id?: string; external_place_id?: string }>{
    return invokeFunction('link-business', { external_place_id, plan });
  },

  // Onboard usando place_id (recomendado) o CID
  async onboard(params: { place_id?: string; cid?: string; location_name?: string; language_code?: string; tripadvisor_url_path?: string; mode?: 'customer'|'competition' }): Promise<OnboardResponse> {
    return invokeFunction('onboard', params);
  },

  // Onboard usando place_id (método específico)
  async onboardByPlaceId(place_id: string, location_name = 'Argentina', language_code = 'es', tripadvisor_url_path?: string, mode: 'customer'|'competition' = 'customer'): Promise<OnboardResponse> {
    return this.onboard({ place_id, location_name, language_code, tripadvisor_url_path, mode });
  },

  // Onboard usando CID (método específico)
  async onboardByCid(cid: string, mode: 'customer'|'competition' = 'customer', tripadvisor_url_path?: string): Promise<OnboardResponse> {
    return this.onboard({ cid, mode, ...(tripadvisor_url_path ? { tripadvisor_url_path } : {}) });
  },

  // Wrappers explícitos
  async onboardCustomerByPlaceId(place_id: string, location_name = 'Argentina', language_code = 'es', tripadvisor_url_path?: string) {
    return this.onboardByPlaceId(place_id, location_name, language_code, tripadvisor_url_path, 'customer');
  },
  async onboardCompetitionByPlaceId(place_id: string, location_name = 'Argentina', language_code = 'es', tripadvisor_url_path?: string) {
    return this.onboardByPlaceId(place_id, location_name, language_code, tripadvisor_url_path, 'competition');
  },
  async onboardCustomerByCid(cid: string) {
    return this.onboardByCid(cid, 'customer');
  },
  async onboardCompetitionByCid(cid: string) {
    return this.onboardByCid(cid, 'competition');
  },

  // Ingestar reviews de Google
  async ingestGoogleReviews(external_place_id: string, cid: string, depth = 20, since_days?: number): Promise<IngestResponse> {
    return invokeFunction('ingest-google-reviews', { external_place_id, cid, depth, ...(since_days ? { since_days } : {}) });
  },

  // Ingestar reviews de Google (incremental)
  async ingestGoogleReviewsIncremental(external_place_id: string, cid: string, depth = 50, since_days?: number): Promise<IngestResponse> {
    return invokeFunction('ingest-google-reviews-incremental', { external_place_id, cid, depth, ...(since_days ? { since_days } : {}) });
  },

  // Ingestar reviews de TripAdvisor  
  async ingestTripAdvisorReviews(external_place_id: string, tripadvisor_url_path: string, depth = 20, since_days?: number): Promise<IngestResponse> {
    return invokeFunction('ingest-tripadvisor-reviews', { external_place_id, tripadvisor_url_path, depth, ...(since_days ? { since_days } : {}) });
  },

  // Ingestar reviews de TripAdvisor (incremental)
  async ingestTripAdvisorReviewsIncremental(external_place_id: string, tripadvisor_url_path: string, depth = 50, since_days?: number): Promise<IngestResponse> {
    return invokeFunction('ingest-tripadvisor-reviews-incremental', { external_place_id, tripadvisor_url_path, depth, ...(since_days ? { since_days } : {}) });
  },

  // Analizar reviews con OpenAI
  async analyzeReviews(external_place_id: string, limit = 300): Promise<AnalyzeResponse> {
    return invokeFunction('analyze-reviews', { external_place_id, limit });
  },

  async listCompetitors(external_place_id: string): Promise<{ ok: boolean; list: any[] }> {
    return invokeFunction('list-competitors', { external_place_id });
  },

  async addCompetitor(external_place_id: string, competitor_place_id: string): Promise<{ ok: boolean; competitor: any }> {
    return invokeFunction('add-competitor', { external_place_id, competitor_place_id });
  },

  async removeCompetitor(competitor_id: string): Promise<{ ok: boolean; message?: string }> {
    return invokeFunction('remove-competitor', { competitor_id });
  },

  // Staff Management
  async listStaff(external_place_id: string): Promise<ListStaffResponse> {
    console.log('🚀 Calling list-staff with external_place_id:', external_place_id);
    
    // Build URL with query params - Edge Function expects GET request
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ibhxfrmaluxegibwqfiv.supabase.co';
    const url = `${supabaseUrl}/functions/v1/list-staff?external_place_id=${encodeURIComponent(external_place_id)}`;
    
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Error listing staff:', errorData);
      throw new Error(errorData.error || 'Error listing staff');
    }
    
    const data = await response.json();
    console.log('✅ list-staff success:', data);
    return data;
  },

  async getStaffDetail(staff_member_id: string): Promise<StaffDetailResponse> {
    console.log('🚀 Calling list-staff with staff_member_id:', staff_member_id);
    
    // Build URL with query params - Edge Function expects GET request
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ibhxfrmaluxegibwqfiv.supabase.co';
    const url = `${supabaseUrl}/functions/v1/list-staff?staff_member_id=${encodeURIComponent(staff_member_id)}`;
    
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Error getting staff detail:', errorData);
      throw new Error(errorData.error || 'Error getting staff detail');
    }
    
    const data = await response.json();
    console.log('✅ get staff detail success:', data);
    return data;
  },

  // Flujo completo: onboard + ingesta + análisis (usando place_id)
  async setupCompleteBusinessByPlaceId(place_id: string, options?: {
    tripadvisor_url_path?: string;
    google_cid?: string;
    location_name?: string;
    language_code?: string;
    google_depth?: number;
    trip_depth?: number;
    analyze_limit?: number;
  }): Promise<{
    business: OnboardResponse;
    googleReviews?: IngestResponse;
    tripAdvisorReviews?: IngestResponse;
    analysis?: AnalyzeResponse;
  }> {
    console.log('🚀 Iniciando setup completo con orquestación cliente...');
    const business = await this.onboardByPlaceId(
      place_id,
      options?.location_name || 'Argentina',
      options?.language_code || 'es',
      options?.tripadvisor_url_path,
      'customer'
    );

    const external_place_id = business.external_place_id;
    const cid = options?.google_cid || business.business_info?.cid;
    const tripUrl = options?.tripadvisor_url_path;

    let googleReviews: IngestResponse | undefined;
    let tripAdvisorReviews: IngestResponse | undefined;
    let analysis: AnalyzeResponse | undefined;

    if (external_place_id) {
      if (cid) {
        try {
          googleReviews = await this.ingestGoogleReviews(external_place_id, cid, options?.google_depth ?? 200, 3650);
        } catch (err) {
          console.error('❌ Error ingiriendo Google reviews:', err);
        }
      }
      if (tripUrl) {
        try {
          tripAdvisorReviews = await this.ingestTripAdvisorReviews(external_place_id, tripUrl, options?.trip_depth ?? 200, 3650);
        } catch (err) {
          console.error('❌ Error ingiriendo TripAdvisor reviews:', err);
        }
      }
      try {
        analysis = await this.analyzeReviews(external_place_id, options?.analyze_limit ?? 300);
      } catch (err) {
        console.error('❌ Error analizando reseñas:', err);
      }
    }

    return {
      business,
      googleReviews,
      tripAdvisorReviews,
      analysis
    };
  },

  // Flujo completo usando CID (legacy)
  async setupCompleteBusinessByCid(cid: string, tripadvisor_url_path?: string, options?: {
    google_depth?: number;
    trip_depth?: number;
    analyze_limit?: number;
  }): Promise<{
    business: OnboardResponse;
    googleReviews?: IngestResponse;
    tripAdvisorReviews?: IngestResponse;
    analysis?: AnalyzeResponse;
  }> {
    console.log('🚀 Iniciando setup completo por CID (orquestación cliente)...');
    const business = await this.onboardByCid(cid, 'customer', tripadvisor_url_path);
    const external_place_id = business.external_place_id;

    let googleReviews: IngestResponse | undefined;
    let tripAdvisorReviews: IngestResponse | undefined;
    let analysis: AnalyzeResponse | undefined;

    if (external_place_id) {
      try {
        googleReviews = await this.ingestGoogleReviews(external_place_id, cid, options?.google_depth ?? 200, 3650);
      } catch (err) {
        console.error('❌ Error ingiriendo Google reviews:', err);
      }
      if (tripadvisor_url_path) {
        try {
          tripAdvisorReviews = await this.ingestTripAdvisorReviews(external_place_id, tripadvisor_url_path, options?.trip_depth ?? 200, 3650);
        } catch (err) {
          console.error('❌ Error ingiriendo TripAdvisor reviews:', err);
        }
      }
      try {
        analysis = await this.analyzeReviews(external_place_id, options?.analyze_limit ?? 300);
      } catch (err) {
        console.error('❌ Error analizando reseñas:', err);
      }
    }

    return {
      business,
      googleReviews,
      tripAdvisorReviews,
      analysis
    };
  }
};

// Funciones helper para transformar datos
export const transformToBusinessContext = (onboardResponse: OnboardResponse, reviewsData?: { google?: IngestResponse; tripadvisor?: IngestResponse }) => {
  return {
    name: onboardResponse.business_info?.name || '',
    placeId: onboardResponse.external_place_id,
    external_place_id: onboardResponse.external_place_id,
    rating: onboardResponse.business_info?.rating || 0,
    totalReviews: (reviewsData?.google?.inserted || 0) + (reviewsData?.tripadvisor?.inserted || 0),
    address: onboardResponse.business_info?.address,
    phone: onboardResponse.business_info?.phone,
    url: onboardResponse.business_info?.url,
    cid: onboardResponse.business_info?.cid,
    place_id: onboardResponse.business_info?.place_id,
    lastSync: new Date().toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  };
};

// Estado global simple para desarrollo
export let currentBusinessData = {
  business: null as OnboardResponse | null,
  reviews: {
    google: null as IngestResponse | null,
    tripadvisor: null as IngestResponse | null
  },
  analysis: null as AnalyzeResponse | null
};

export const setCurrentBusinessData = (data: typeof currentBusinessData) => {
  currentBusinessData = { ...data };
};

// Helper para verificar si el business está completamente configurado
export const isBusinessFullyConfigured = (data: typeof currentBusinessData): boolean => {
  return !!(data.business && 
    data.business.external_place_id && 
    (data.reviews.google || data.reviews.tripadvisor));
};

// =====================================================
// 🎯 CAMPAIGN SERVICE
// =====================================================

export const campaignService = {
  // Create a new campaign
  async create(business_id: string, name: string): Promise<any> {
    console.log('🚀 Creating campaign:', { business_id, name });
    
    // Generate short code (8 chars)
    const short_code = crypto.randomUUID().substring(0, 8);
    
    const { data, error } = await supabase
      .from('review_campaigns')
      .insert({
        business_id,
        name,
        short_code,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating campaign:', error);
      throw error;
    }

    console.log('✅ Campaign created:', data);
    return data;
  },

  // Get campaign by short_code (public)
  async getByShortCode(short_code: string): Promise<any> {
    console.log('🔍 Fetching campaign:', short_code);
    
    const { data, error } = await supabase.functions.invoke('get-campaign', {
      body: { short_code }
    });

    if (error) {
      console.error('❌ Error fetching campaign:', error);
      throw error;
    }

    return data;
  },

  // Submit feedback (public)
  async submitFeedback(payload: {
    short_code: string;
    rating_value: number;
    selected_aspects?: string[];
    aspect_details?: Record<string, string[]>;
    ces_score?: number;
    nps_score?: number;
    review_text?: string;
    customer_email?: string;
    customer_phone?: string;
  }): Promise<any> {
    console.log('📝 Submitting campaign feedback:', payload.short_code);
    
    const { data, error } = await supabase.functions.invoke('submit-campaign-feedback', {
      body: payload
    });

    if (error) {
      console.error('❌ Error submitting feedback:', error);
      throw error;
    }

    console.log('✅ Feedback submitted:', data);
    return data;
  },

  // Update campaign status
  async updateStatus(campaign_id: string, status: 'active' | 'paused'): Promise<any> {
    console.log('🔄 Updating campaign status:', { campaign_id, status });
    
    const { data, error } = await supabase
      .from('review_campaigns')
      .update({ status })
      .eq('id', campaign_id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating campaign status:', error);
      throw error;
    }

    console.log('✅ Campaign status updated:', data);
    return data;
  },

  // Generate QR code for campaign
  generateQRCodeURL(short_code: string): string {
    const landingUrl = `${window.location.origin}/r/${short_code}`;
    // Using QR Server API (free, no API key needed)
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(landingUrl)}`;
  },

  // Get campaign landing URL
  getLandingURL(short_code: string): string {
    return `${window.location.origin}/r/${short_code}`;
  }
};
