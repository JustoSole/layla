import { admin, corsHeaders } from "../_shared/db.ts";
import { postAndPollGoogleReviews } from "../_shared/dfs.ts";
import { resolveExternalPlaceId } from "../_shared/places.ts";
import type { ReviewItem } from "../_shared/types.ts";

// 🚀 SOLO MODO REAL - Mock eliminado

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { external_place_id, cid, depth = 50, since_days = 60 } = await req.json();
    if (!cid) {
      return new Response("cid requerido", { status: 400, headers: corsHeaders });
    }

    // ✅ Resolver external_place_id con identificadores del proveedor
    const resolvedExternalPlaceId = await resolveExternalPlaceId({
      external_place_id,
      google_cid: cid
    });
    if (!resolvedExternalPlaceId) {
      return new Response("No se pudo resolver external_place_id para este CID", { status: 400, headers: corsHeaders });
    }

    const location_name = Deno.env.get("DEFAULT_LOCATION_NAME") || "Buenos Aires,Argentina";
    const language_code = Deno.env.get("DEFAULT_LANGUAGE_CODE") || "es";

    // 🚀 PATRÓN CORRECTO: POST → POLL → GET resultados (OPTIMIZED - priority=2 y timeouts reducidos)
    console.log(`🌐 Getting Google Incremental Reviews for CID ${cid} in ${location_name}, depth: ${depth} with PRIORITY=2`);
    const dfs = await postAndPollGoogleReviews(cid, location_name, language_code, depth, 120); // 2 min timeout para mejor UX

    const res0 = dfs?.tasks?.[0]?.result?.[0];
    const items = res0?.items ?? [];
    
    console.log(`📋 Got ${items.length} Google incremental reviews from DataForSEO`);
    console.log(`📋 Got ${items.length} Google incremental reviews from DataForSEO`);

    // 🚀 CONTINUAR CON DATOS REALES - NO MOCK

    // REAL MODE: Inserción real con upsert
    // 2) Inserta/actualiza por unique(provider,provider_review_id)
    const cutoff = new Date(Date.now() - since_days * 24 * 60 * 60 * 1000);
    const rows = items
      .filter((r: ReviewItem) => {
        if (!r.timestamp) return true;
        const d = new Date(r.timestamp.replace(" +00:00","Z"));
        return d >= cutoff;
      })
      .map((r: ReviewItem) => ({
      external_place_id: resolvedExternalPlaceId,
      provider: "google",
      provider_review_id: r.review_id,
      rating_value: r.rating?.value ?? null,
      review_text: r.review_text ?? null,
      original_review_text: r.original_review_text ?? null,
      author_name: r.profile_name ?? null,
      profile_url: r.profile_url ?? null,
      profile_image_url: r.profile_image_url ?? null,
      local_guide: r.local_guide ?? null,
      reviewer_reviews_count: r.reviews_count ?? null,
      reviewer_photos_count: r.photos_count ?? null,
      posted_at: r.timestamp ? new Date(r.timestamp.replace(" +00:00","Z")).toISOString() : null,
      review_url: r.review_url ?? null,
      owner_answer: r.owner_answer ?? null,
      original_owner_answer: r.original_owner_answer ?? null,
      owner_posted_at: r.owner_timestamp ? new Date(r.owner_timestamp.replace(" +00:00","Z")).toISOString() : null,
      review_highlights: r.review_highlights ?? null,
      images: r.images ?? null,
      review_item_raw: r
    }));

    if (rows.length) {
      const seen = new Set<string>();
      const deduped = rows.filter((r: any) => {
        const key = `${r.external_place_id}|${r.provider}|${r.provider_review_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const { error } = await admin.from("reviews").upsert(deduped, { onConflict: "external_place_id,provider,provider_review_id" });
      if (error) throw error;
      console.log(`✅ Upserted ${rows.length} Google incremental reviews`);
    }

    // ✅ CORRECCIÓN: Buscar rating_distribution en múltiples ubicaciones
    let ratingDistribution = null;
    
    if (res0?.rating_distribution) {
      ratingDistribution = res0.rating_distribution;
      console.log('📊 Found rating_distribution at: res0.rating_distribution');
    } else if (res0?.rating?.rating_distribution) {
      ratingDistribution = res0.rating.rating_distribution;
      console.log('📊 Found rating_distribution at: res0.rating.rating_distribution');
    } else if (res0?.rating?.distribution) {
      ratingDistribution = res0.rating.distribution;
      console.log('📊 Found rating_distribution at: res0.rating.distribution');
    } else {
      console.log('⚠️ No rating_distribution found for Google incremental');
    }

    // 3) Actualiza snapshot de rating si vino - USAR COLUMNA google_ratings SEPARADA  
    if (res0?.rating) {
      const googleRatingData = {
        rating_value: res0.rating.value ?? null,
        rating_votes: res0.rating.votes_count ?? null,
        rating_max: res0.rating.rating_max ?? null,
        rating_distribution: ratingDistribution, // ✅ CORRECCIÓN: Usar distribución encontrada
        pulled_at: new Date().toISOString()
      };
      
      console.log('📊 Updating Google incremental ratings in separate column (CORRECTED):');
      console.log(JSON.stringify(googleRatingData, null, 2));
      
      await admin.from("external_places")
        .update({
          google_ratings: googleRatingData
          // NO actualizar campos base - solo columna específica
        })
        .eq("id", resolvedExternalPlaceId);
        
      console.log(`📈 Updated Google incremental rating: ${res0.rating.value}/5`);
      
      // 🧪 DEBUG: Verificar que se guardó la distribución
      if (ratingDistribution) {
        console.log('✅ Rating distribution saved successfully');
      } else {
        console.log('⚠️ No rating distribution was saved');
      }
    }

    return new Response(JSON.stringify({ ok: true, upserted: rows.length, external_place_id: resolvedExternalPlaceId }), {
      headers: corsHeaders
    });

  } catch (e) {
    console.error("Error in ingest-google-reviews-incremental function:", e);
    const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500, 
      headers: corsHeaders
    });
  }
});
