import { admin, corsHeaders } from "../_shared/db.ts";
import { postAndPollMyBusinessInfo } from "../_shared/dfs.ts";

// Helper: invocar otras edge functions (ingestas / análisis)
async function _invokeEdgeFunction(functionName: string, payload: Record<string, unknown>) {
  const baseUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const url = `${baseUrl}/functions/v1/${functionName}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${functionName} failed ${r.status}: ${t}`);
  }
  return await r.json();
}

type IngestTaskResult = { type: "google" | "tripadvisor"; res?: unknown; error?: string };

// 🚀 SOLO MODO REAL - Mock eliminado completamente

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { cid, place_id, location_name, language_code, tripadvisor_url_path, mode: _mode } = await req.json();
    
    // Validate input - either cid OR place_id is required
    if (!cid && !place_id) {
      return new Response("cid or place_id requerido", { status: 400, headers: corsHeaders });
    }

    let dfs;
    const finalLanguageCode = language_code || "es";
    const priority = 2;
    
    if (place_id) {
      // 🆕 Flow: using place_id with location_name and language_code
      const finalLocationName = location_name || "Argentina";
      const keyword = `place_id:${place_id}`;
      console.log('🚀 POST+POLL DataForSEO My Business Info for place_id:', place_id);
      console.log('📍 Using location_name:', finalLocationName, 'language_code:', finalLanguageCode);
      dfs = await postAndPollMyBusinessInfo(keyword, undefined, finalLocationName, finalLanguageCode, priority);
    } else if (cid) {
      // 🆕 Flow: using cid with location_code and language_code
      const finalLocationCode = Number(Deno.env.get("DEFAULT_LOCATION_CODE") || "2076");
      const keyword = `cid:${cid}`;
      console.log('🚀 POST+POLL DataForSEO My Business Info for cid:', cid);
      console.log('📍 Using location_code:', finalLocationCode, 'language_code:', finalLanguageCode);
      dfs = await postAndPollMyBusinessInfo(keyword, finalLocationCode, undefined, finalLanguageCode, priority);
    }
    
    console.log('📊 DataForSEO Response:', { 
      status: dfs?.status_code, 
      tasks: dfs?.tasks_count,
      hasResults: !!(dfs?.tasks?.[0]?.result?.[0]?.items?.[0])
    });
    
    const item = dfs?.tasks?.[0]?.result?.[0]?.items?.[0];
    if (!item) {
      const identifier = place_id || cid;
      const identifierType = place_id ? 'place_id' : 'CID';
      console.error(`❌ No business data found for ${identifierType}:`, identifier);
      return new Response(JSON.stringify({
        ok: false, 
        error: `No business data found for this ${identifierType}`,
        [place_id ? 'place_id' : 'cid']: identifier
      }), { status: 404, headers: corsHeaders });
    }
    
    console.log('✅ Business found:', { 
      name: item.title, 
      cid: item.cid, 
      place_id: item.place_id,
      identifier_used: place_id || cid
    });

    // 🔍 DIAGNÓSTICO INTENSIVO: Verificar estructura completa de DataForSEO
    console.log('🚨 SENIOR DEV DIAGNOSIS: Complete DataForSEO item structure');
    console.log('📊 item.rating:', JSON.stringify(item.rating, null, 2));
    console.log('📊 item.rating?.votes_count:', item.rating?.votes_count);
    console.log('📊 item.rating?.value:', item.rating?.value);
    console.log('📊 item.place_topics:', JSON.stringify(item.place_topics, null, 2));
    console.log('📊 item.place_topics type:', typeof item.place_topics);
    console.log('📊 item.place_topics keys:', item.place_topics ? Object.keys(item.place_topics) : 'null/undefined');
    
    // 🔍 Buscar en todas las ubicaciones posibles
    const potentialDataSources = {
      'item.rating': item.rating,
      'item.reviews_count': item.reviews_count,
      'item.votes_count': item.votes_count,
      'item.rating_votes_count': item.rating_votes_count,
      'item.rating.votes_count': item.rating?.votes_count,
      'item.rating.rating_votes_count': item.rating?.rating_votes_count,
      'item.place_topics': item.place_topics,
      'item.topics': item.topics,
      'item.business_topics': item.business_topics,
      // 🏨 TripAdvisor data sources
      'item.tripadvisor_rating': item.tripadvisor_rating,
      'item.tripadvisor_ratings': item.tripadvisor_ratings,
      'item.trip_advisor_rating': item.trip_advisor_rating
    };
    
    console.log('🔍 SEARCHING ALL POSSIBLE DATA LOCATIONS:');
    for (const [key, value] of Object.entries(potentialDataSources)) {
      console.log(`  - ${key}:`, typeof value, value !== null && value !== undefined ? (typeof value === 'object' ? Object.keys(value) : value) : 'null/undefined');
    }

    // 🔍 DEBUG: Explorar estructura completa de rating para encontrar distribución
    console.log('🔍 DEBUGGING Google rating structure:');
    console.log('📊 item.rating:', JSON.stringify(item.rating, null, 2));
    console.log('📊 item.rating_distribution:', JSON.stringify(item.rating_distribution, null, 2));
    console.log('📊 item.rating.rating_distribution:', JSON.stringify(item.rating?.rating_distribution, null, 2));
    
    // 🔍 DEBUG: Explorar propiedades que podrían contener distribución
    const ratingKeys = Object.keys(item).filter(key => key.includes('rating'));
    console.log('📊 All rating-related keys:', ratingKeys);
    
    // 🔍 DEBUG: Buscar distribución en lugares potenciales
    const potentialDistributions = {
      'item.rating_distribution': item.rating_distribution,
      'item.rating.rating_distribution': item.rating?.rating_distribution,
      'item.rating.distribution': item.rating?.distribution,
      'item.google_rating_distribution': item.google_rating_distribution,
      'item.reviews_rating_distribution': item.reviews_rating_distribution
    };
    
    console.log('🔍 Potential distribution locations:', JSON.stringify(potentialDistributions, null, 2));
    
    // 🚀 CONTINUAR CON DATOS REALES - NO MOCK

    // ✅ CORRECCIÓN: Buscar rating_distribution ANTES de usarlo
    let ratingDistribution = null;
    
    // Intentar varias ubicaciones posibles para la distribución
    if (item.rating_distribution) {
      ratingDistribution = item.rating_distribution;
      console.log('📊 Found rating_distribution at: item.rating_distribution');
    } else if (item.rating?.rating_distribution) {
      ratingDistribution = item.rating.rating_distribution;
      console.log('📊 Found rating_distribution at: item.rating.rating_distribution');
    } else if (item.rating?.distribution) {
      ratingDistribution = item.rating.distribution;
      console.log('📊 Found rating_distribution at: item.rating.distribution');
    } else {
      console.log('⚠️ No rating_distribution found in any location');
      
      // 🔍 FALLBACK: Intentar construir distribución desde business_info_raw
      if (item.business_info_raw?.rating_distribution) {
        ratingDistribution = item.business_info_raw.rating_distribution;
        console.log('📊 Found rating_distribution in business_info_raw');
      }
    }

    // (helper movido a nivel de módulo)

    // FIXED: Approach más robusto - verificar si existe, luego INSERT o UPDATE
    console.log(`🔍 Checking if place exists with google_place_id: ${item.place_id}`);
    
    // 1. Verificar si ya existe el lugar
    const { data: existingPlace } = await admin
      .from("external_places")
      .select("id, name")
      .eq("google_place_id", item.place_id)
      .single();
    
    let place;
    let operation;
    
    const placeData = {
      google_cid: item.cid ?? null,
      google_place_id: item.place_id ?? null,
      feature_id: item.feature_id ?? null,
      name: item.title,
      original_title: item.original_title ?? null,
      description: item.description ?? null,
      category: item.category ?? null,
      category_ids: item.category_ids ?? null,
      additional_categories: item.additional_categories ?? null,
      phone: item.phone ?? null,
      url: item.url ?? null,
      contact_url: item.contact_url ?? null,
      contributor_url: item.contributor_url ?? null,
      book_online_url: item.book_online_url ?? null,
      domain: item.domain ?? null,
      logo: item.logo ?? null,
      main_image: item.main_image ?? null,
      total_photos: item.total_photos ?? null,
      snippet: item.snippet ?? null,
      address: item.address ?? null,
      address_info: item.address_info ?? null,
      city: item.address_info?.city ?? null,
      zip: item.address_info?.zip ?? null,
      region: item.address_info?.region ?? null,
      country_code: item.address_info?.country_code ?? null,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      is_claimed: item.is_claimed ?? null,
      current_status: item.work_time?.current_status ?? null,
      price_level_text: item.price_level ?? null,
      hotel_rating: item.hotel_rating ?? null,
      place_topics: item.place_topics ?? null,
      tripadvisor_url_path: tripadvisor_url_path ?? null, // 🎯 NUEVA: Guardar TripAdvisor URL
      business_info_raw: item, // 🔥 TODA LA DATA DE DATAFORSEO AQUÍ
      updated_at: new Date().toISOString()
    };
    
    if (existingPlace) {
      // 2a. El lugar YA EXISTE → UPDATE
      console.log(`♻️  Place already exists (${existingPlace.name}). Updating with fresh data...`);
      
      const { data: updatedPlace, error: updateError } = await admin
        .from("external_places")
        .update(placeData)
        .eq("id", existingPlace.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('❌ Error updating existing place:', updateError);
        throw updateError;
      }
      
      place = updatedPlace;
      operation = "UPDATED existing place";
      
    } else {
      // 2b. El lugar NO EXISTE → INSERT
      console.log(`🆕 Place doesn't exist. Creating new record...`);
      
      const { data: newPlace, error: insertError } = await admin
        .from("external_places")
        .insert(placeData)
        .select()
        .single();
        
      if (insertError) {
        console.error('❌ Error inserting new place:', insertError);
        throw insertError;
      }
      
      place = newPlace;
      operation = "CREATED new place";
    }
    
    console.log(`✅ Place processed successfully: ${place?.id} (${item.title})`);
    console.log(`📝 Operation: ${operation}`);
    
    // 🔍 DEBUG: Verificar que el registro se puede leer inmediatamente
    console.log('🧪 Testing immediate read of created/updated place...');
    const { data: testRead, error: testReadError } = await admin
      .from("external_places")
      .select("id, name, google_place_id")
      .eq("id", place.id)
      .single();
    
    if (testReadError) {
      console.error('❌ Cannot read just created/updated place:', testReadError);
    } else {
      console.log('✅ Successfully read place immediately after creation:', testRead);
    }

    // rating por fuente (google) - USAR COLUMNA google_ratings SEPARADA
    if (item?.rating) {
      const googleRatingData = {
        rating_value: item.rating.value ?? null,
        rating_votes: item.rating.votes_count ?? null,
        rating_max: item.rating.rating_max ?? null,
        rating_distribution: ratingDistribution, // ✅ CORRECCIÓN: Usar distribución encontrada
        pulled_at: new Date().toISOString()
      };
      
      console.log('📊 Updating Google ratings in onboard with corrected distribution:');
      console.log(JSON.stringify(googleRatingData, null, 2));
      
      const { error: ratingError } = await admin
        .from("external_places")
        .update({
          google_ratings: googleRatingData
          // NO actualizar campos base - solo columna específica
        })
        .eq("id", place.id);
        
      if (ratingError) {
        console.error('❌ Error updating google_ratings:', ratingError);
      } else {
        console.log('✅ Updated google_ratings successfully');
        
        // 🔍 DEBUG: Verificar que se guardó correctamente
        const { data: savedRatings } = await admin
          .from("external_places")
          .select("google_ratings")
          .eq("id", place.id)
          .single();
          
        console.log('🧪 Verification - Saved google_ratings:', JSON.stringify(savedRatings?.google_ratings, null, 2));
      }
    }

    // Nota: se eliminó la orquestación sincrónica para evitar timeouts (504).
    // Frontend se encargará de ingestas y (si corresponde) NLP después de onboard.

    // 🔍 BÚSQUEDA INTELIGENTE: Encontrar votes_count en cualquier ubicación
    let votesCount = null;
    if (item.rating?.votes_count) {
      votesCount = item.rating.votes_count;
      console.log('🎯 Found votes_count in item.rating.votes_count:', votesCount);
    } else if (item.rating?.rating_votes_count) {
      votesCount = item.rating.rating_votes_count; 
      console.log('🎯 Found votes_count in item.rating.rating_votes_count:', votesCount);
    } else if (item.votes_count) {
      votesCount = item.votes_count;
      console.log('🎯 Found votes_count in item.votes_count:', votesCount);
    } else if (item.reviews_count) {
      votesCount = item.reviews_count;
      console.log('🎯 Found votes_count in item.reviews_count:', votesCount);
    } else {
      console.log('🚨 NO votes_count found in any location!');
    }

    // 🔍 BÚSQUEDA INTELIGENTE: Encontrar place_topics en cualquier ubicación
    let placeTopics = null;
    if (item.place_topics && typeof item.place_topics === 'object') {
      placeTopics = item.place_topics;
      console.log('🎯 Found place_topics in item.place_topics, keys:', Object.keys(placeTopics).length);
    } else if (item.topics && typeof item.topics === 'object') {
      placeTopics = item.topics;
      console.log('🎯 Found place_topics in item.topics, keys:', Object.keys(placeTopics).length);
    } else if (item.business_topics && typeof item.business_topics === 'object') {
      placeTopics = item.business_topics;
      console.log('🎯 Found place_topics in item.business_topics, keys:', Object.keys(placeTopics).length);
    } else {
      console.log('🚨 NO place_topics found in any location!');
    }

    // 🔍 BÚSQUEDA INTELIGENTE: Encontrar TripAdvisor ratings
    let tripadvisorRating = null;
    let tripadvisorVotesCount = null;
    let tripadvisorRatingDistribution = null;
    
    if (item.tripadvisor_rating && typeof item.tripadvisor_rating === 'object') {
      tripadvisorRating = item.tripadvisor_rating.value || item.tripadvisor_rating.rating;
      tripadvisorVotesCount = item.tripadvisor_rating.votes_count || item.tripadvisor_rating.reviews_count;
      tripadvisorRatingDistribution = item.tripadvisor_rating.rating_distribution || item.tripadvisor_rating.distribution;
      console.log('🏨 Found TripAdvisor data in item.tripadvisor_rating');
    } else if (item.tripadvisor_ratings && typeof item.tripadvisor_ratings === 'object') {
      tripadvisorRating = item.tripadvisor_ratings.value || item.tripadvisor_ratings.rating;
      tripadvisorVotesCount = item.tripadvisor_ratings.votes_count || item.tripadvisor_ratings.reviews_count;
      tripadvisorRatingDistribution = item.tripadvisor_ratings.rating_distribution || item.tripadvisor_ratings.distribution;
      console.log('🏨 Found TripAdvisor data in item.tripadvisor_ratings');
    } else if (item.trip_advisor_rating && typeof item.trip_advisor_rating === 'object') {
      tripadvisorRating = item.trip_advisor_rating.value || item.trip_advisor_rating.rating;
      tripadvisorVotesCount = item.trip_advisor_rating.votes_count || item.trip_advisor_rating.reviews_count;
      tripadvisorRatingDistribution = item.trip_advisor_rating.rating_distribution || item.trip_advisor_rating.distribution;
      console.log('🏨 Found TripAdvisor data in item.trip_advisor_rating');
    } else {
      console.log('🚨 NO TripAdvisor rating data found in any location!');
    }

    // Devolver datos completos para el frontend - CORREGIDO con búsqueda inteligente + TripAdvisor
    const businessInfo = {
      name: item.title,
      cid: item.cid,
      place_id: item.place_id,
      address: item.address,
      rating: item.rating?.value || null,
      phone: item.phone,
      url: item.url,
      category: item.category,
      latitude: item.latitude,
      longitude: item.longitude,
      current_status: item.work_time?.current_status,
      main_image: item.main_image,
      rating_distribution: ratingDistribution, // ✅ CORRECCIÓN: Usar distribución encontrada
      // ✅ CAMPOS CRÍTICOS CON BÚSQUEDA INTELIGENTE:
      votes_count: votesCount,        // 🎯 Encontrado dinámicamente
      place_topics: placeTopics,      // 🎯 Encontrado dinámicamente
      // ✅ CAMPOS TRIPADVISOR CON BÚSQUEDA INTELIGENTE:
      tripadvisor_rating: tripadvisorRating,
      tripadvisor_votes_count: tripadvisorVotesCount,
      tripadvisor_rating_distribution: tripadvisorRatingDistribution,
      has_tripadvisor: !!tripadvisorRating,
      has_google: !!(item.rating?.value)
    };

    // 🔍 DEBUG: Verificar datos críticos antes de enviar al frontend
    console.log('🚀 FINAL CHECK: Data being sent to frontend:');
    console.log('  - businessInfo.votes_count:', businessInfo.votes_count);
    console.log('  - businessInfo.place_topics keys:', businessInfo.place_topics ? Object.keys(businessInfo.place_topics).length : 0);
    console.log('  - businessInfo.rating:', businessInfo.rating);
    console.log('  - businessInfo.rating_distribution keys:', businessInfo.rating_distribution ? Object.keys(businessInfo.rating_distribution).length : 0);
    console.log('  - businessInfo.tripadvisor_rating:', businessInfo.tripadvisor_rating);
    console.log('  - businessInfo.tripadvisor_votes_count:', businessInfo.tripadvisor_votes_count);
    console.log('  - businessInfo.has_google:', businessInfo.has_google);
    console.log('  - businessInfo.has_tripadvisor:', businessInfo.has_tripadvisor);

    // 🚨 CRITICAL DEBUG: Log the ENTIRE response before sending
    const finalResponse = { 
      ok: true, 
      external_place_id: place.id,
      business_info: businessInfo
    };
    
    console.log('🚨 ENTIRE RESPONSE BEING SENT TO FRONTEND:');
    console.log(JSON.stringify(finalResponse, null, 2));
    
    // 🔍 Additional verification - check if votes_count and place_topics are in the final response
    console.log('🚨 VERIFICATION - Response contains:');
    console.log('  - response.business_info.votes_count:', finalResponse.business_info.votes_count);
    console.log('  - response.business_info.place_topics:', finalResponse.business_info.place_topics ? 'YES' : 'NO');

    return new Response(JSON.stringify(finalResponse), {
      headers: corsHeaders
    });
  } catch (e) {
    console.error("Error in onboard function:", e);
    const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500, headers: corsHeaders
    });
  }
});