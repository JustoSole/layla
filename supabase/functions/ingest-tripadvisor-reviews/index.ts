import { admin, corsHeaders } from "../_shared/db.ts";
import { postAndPollTripadvisorReviews } from "../_shared/dfs.ts";
import { resolveExternalPlaceId } from "../_shared/places.ts";
import type { ReviewItem } from "../_shared/types.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { external_place_id, tripadvisor_url_path, depth = 20, since_days = 60 } = await req.json();
    if (!tripadvisor_url_path) {
      return new Response("tripadvisor_url_path requerido", { status: 400, headers: corsHeaders });
    }

    // ✅ Resolver external_place_id por URL de TripAdvisor
    const resolvedExternalPlaceId = await resolveExternalPlaceId({
      external_place_id,
      tripadvisor_url_path
    });
    if (!resolvedExternalPlaceId) {
      return new Response("No se pudo resolver external_place_id para este TripAdvisor URL", { status: 400, headers: corsHeaders });
    }

    const location_code = Number(Deno.env.get("DEFAULT_LOCATION_CODE") || "2076");

    // 🚀 PATRÓN CORRECTO: POST → POLL → GET resultados (OPTIMIZED - usa priority=2 y timeouts reducidos)
    console.log(`🌐 Getting TripAdvisor Reviews for URL ${tripadvisor_url_path}, depth: ${depth} with PRIORITY=2`);
    const dfs = await postAndPollTripadvisorReviews(tripadvisor_url_path, location_code, depth, 100); // 1.7 min timeout para mejor UX

    const res0 = dfs?.tasks?.[0]?.result?.[0];
    const items = res0?.items ?? [];

    console.log(`📋 Got ${items.length} TripAdvisor reviews from DataForSEO`);

    // REAL MODE: Insertar en base de datos real
    const cutoff = new Date(Date.now() - since_days * 24 * 60 * 60 * 1000);
    const rows = items
      .filter((r: ReviewItem) => {
        if (!r.timestamp) return true;
        const d = new Date(r.timestamp.replace(" +00:00","Z"));
        return d >= cutoff;
      })
      .map((r: ReviewItem) => ({
      external_place_id: resolvedExternalPlaceId,
      provider: "tripadvisor",
      provider_review_id: r.review_id ?? r.review_url ?? crypto.randomUUID(),
      rating_value: r.rating?.value ?? null,
      review_text: r.review_text ?? null,
      original_review_text: r.original_review_text ?? null,
      author_name: r.profile_name ?? null,
      profile_url: r.profile_url ?? null,
      profile_image_url: r.profile_image_url ?? null,
      posted_at: r.timestamp ? new Date(r.timestamp.replace(" +00:00","Z")).toISOString() : null,
      review_url: r.review_url ?? null,
      owner_answer: r.owner_answer ?? null,
      original_owner_answer: r.original_owner_answer ?? null,
      owner_posted_at: r.owner_timestamp ? new Date(r.owner_timestamp.replace(" +00:00","Z")).toISOString() : null,
      review_highlights: r.review_highlights ?? null,
      images: r.images ?? r.review_images ?? null,
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
      console.log(`✅ Inserted ${rows.length} TripAdvisor reviews`);
    }

    // Snapshot de rating COMPLETO - USAR COLUMNA tripadvisor_ratings SEPARADA
    if (res0?.rating) {
      const tripAdvisorRatingData = {
        rating_value: res0.rating.value ?? null,
        rating_votes: res0.reviews_count ?? res0.rating.votes_count ?? null, // 🎯 USAR reviews_count como total
        rating_max: res0.rating.rating_max ?? null,
        rating_distribution: res0.rating_distribution ?? null, // 🎯 INCLUIR distribución completa
        pulled_at: new Date().toISOString()
      };
      
      console.log('🏨 Updating TripAdvisor ratings in separate column:', tripAdvisorRatingData);
      
      await admin.from("external_places")
        .update({
          tripadvisor_ratings: tripAdvisorRatingData
        })
        .eq("id", resolvedExternalPlaceId);
        
      console.log(`✅ Updated TripAdvisor ratings: ${res0.rating.value}/5 (${res0.reviews_count || 0} total reviews)`);
      
      if (res0.rating_distribution) {
        const dist = res0.rating_distribution as Record<string, unknown>;
        const values = Object.values(dist).filter((v): v is number => typeof v === "number");
        const totalDistribution = values.reduce((a, b) => a + b, 0);
        console.log(`📈 TripAdvisor distribution: ${JSON.stringify(dist)} (total: ${totalDistribution})`);
      }
    }

    return new Response(JSON.stringify({ ok: true, inserted: rows.length, external_place_id: resolvedExternalPlaceId }), {
      headers: corsHeaders
    });
  } catch (e) {
    console.error("Error in ingest-tripadvisor-reviews function:", e);
    const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), { 
      status: 500, 
      headers: corsHeaders
    });
  }
});