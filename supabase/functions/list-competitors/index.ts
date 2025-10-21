import { admin, corsHeaders } from "../_shared/db.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "No authorization header" }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Obtener usuario autenticado
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const { external_place_id } = await req.json();

    if (!external_place_id) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "external_place_id is required" 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('📋 Listing competitors for:', {
      user_id: user.id,
      external_place_id
    });

    // 1. Verificar que el external_place_id pertenece al usuario
    const { data: business, error: businessError } = await admin
      .from("businesses")
      .select("id, external_place_id")
      .eq("owner_user_id", user.id)
      .eq("external_place_id", external_place_id)
      .single();

    if (businessError || !business) {
      console.error('❌ Business not found or not owned by user:', businessError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "Business not found or you don't have permission" 
      }), {
        status: 403,
        headers: corsHeaders
      });
    }

    // 2. Obtener datos del negocio principal
    const { data: mainPlace, error: mainPlaceError } = await admin
      .from("external_places")
      .select("id, name, google_ratings, tripadvisor_ratings, google_place_id, tripadvisor_url_path")
      .eq("id", external_place_id)
      .single();

    if (mainPlaceError || !mainPlace) {
      console.error('❌ Main place not found:', mainPlaceError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "Main business place not found" 
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // 3. Obtener competidores con sus datos completos
    const { data: competitors, error: competitorsError } = await admin
      .from("business_competitors_fixed")
      .select(`
        id,
        rank,
        competitor_external_place_id,
        competitor_name,
        competitor_rating_value,
        competitor_rating_votes,
        created_at,
        updated_at
      `)
      .eq("business_id", business.id)
      .order("rank", { ascending: true });

    if (competitorsError) {
      console.error('❌ Error fetching competitors:', competitorsError);
      throw competitorsError;
    }

    // 4. Enriquecer con datos de external_places
    const enrichedCompetitors = await Promise.all(
      (competitors || []).map(async (comp) => {
        const { data: place } = await admin
          .from("external_places")
          .select("google_place_id, tripadvisor_url_path, address, phone, url, main_image")
          .eq("id", comp.competitor_external_place_id)
          .single();

        return {
          id: comp.id,
          rank: comp.rank,
          external_place_id: comp.competitor_external_place_id,
          name: comp.competitor_name,
          rating: comp.competitor_rating_value,
          totalReviews: comp.competitor_rating_votes,
          googlePlaceId: place?.google_place_id,
          tripadvisorUrl: place?.tripadvisor_url_path,
          address: place?.address,
          phone: place?.phone,
          website: place?.url,
          image: place?.main_image,
          isActive: true, // Todos los de BD están activos
          created_at: comp.created_at,
          updated_at: comp.updated_at
        };
      })
    );

    console.log(`✅ Found ${enrichedCompetitors.length} competitors`);

    return new Response(JSON.stringify({
      ok: true,
      list: enrichedCompetitors
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error("Error in list-competitors:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

