// Interface para elementos de review (para evitar 'any' types)
export interface ReviewItem {
  review_id?: string;
  review_text?: string;
  original_review_text?: string;
  timestamp?: string;
  rating?: { value?: number };
  profile_name?: string;
  profile_url?: string;
  profile_image_url?: string;
  local_guide?: boolean;
  reviews_count?: number;
  photos_count?: number;
  review_url?: string;
  owner_answer?: string;
  original_owner_answer?: string;
  owner_timestamp?: string;
  images?: any[];
  review_images?: any[];
  review_highlights?: any[];
  [key: string]: any; // Para campos adicionales
}

// Tipos mínimos para parsear respuestas de DataForSEO
export type DfsReviewItem = {
    review_id: string;
    review_text?: string;
    original_review_text?: string;
    timestamp?: string; // "yyyy-mm-dd hh-mm-ss +00:00"
    rating?: { value?: number };
    profile_name?: string;
    profile_url?: string;
    profile_image_url?: string;
    local_guide?: boolean;
    reviews_count?: number;
    photos_count?: number;
    review_url?: string;
    owner_answer?: string;
    original_owner_answer?: string;
    owner_timestamp?: string;
    images?: { type?: string; alt?: string; url?: string; image_url?: string }[];
    review_highlights?: { feature: string; assessment: string }[];
  };
  
  export type DfsMyBusinessInfo = {
    title: string;
    original_title?: string;
    description?: string;
    category?: string;
    category_ids?: string[];
    additional_categories?: string[];
    cid?: string;
    feature_id?: string;
    place_id?: string;
    phone?: string;
    url?: string;
    contact_url?: string;
    contributor_url?: string;
    book_online_url?: string;
    domain?: string;
    logo?: string;
    main_image?: string;
    total_photos?: number;
    snippet?: string;
    address?: string;
    address_info?: Record<string, unknown>;
    latitude?: number;
    longitude?: number;
    is_claimed?: boolean;
    price_level?: string;
    hotel_rating?: number;
    rating?: { value?: number; votes_count?: number; rating_max?: number };
    rating_distribution?: Record<string, number>;
    place_topics?: Record<string, number>;
    work_time?: { current_status?: string };
    local_justifications?: unknown;
    attributes?: unknown;
    people_also_search?: Array<{
      cid?: string;
      feature_id?: string;
      title?: string;
      rating?: { value?: number; votes_count?: number; rating_max?: number };
    }>;
  };
  