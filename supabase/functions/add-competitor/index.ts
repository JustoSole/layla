import { admin, corsHeaders } from "../_shared/db.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('❌ No authorization header found');
      return new Response(JSON.stringify({ ok: false, error: "No authorization header. Please sign in." }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Obtener usuario autenticado
    const token = authHeader.replace("Bearer ", "");
    console.log('🔑 Attempting to authenticate with token:', token.substring(0, 20) + '...');
    
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized. Please sign in again." }), {
        status: 401,
        headers: corsHeaders
      });
    }

    console.log('✅ User authenticated:', user.id);

    const { external_place_id, competitor_place_id } = await req.json();

    if (!external_place_id || !competitor_place_id) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "external_place_id and competitor_place_id are required" 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('🏢 Adding competitor:', {
      user_id: user.id,
      external_place_id,
      competitor_place_id
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

    // 2. Verificar que el competidor existe en external_places
    const { data: competitorPlace, error: competitorError } = await admin
      .from("external_places")
      .select("id, name, google_ratings, tripadvisor_ratings")
      .eq("id", competitor_place_id)
      .single();

    if (competitorError || !competitorPlace) {
      console.error('❌ Competitor place not found:', competitorError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "Competitor place not found. Make sure to onboard it first." 
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // 3. Obtener el siguiente rank disponible (1-4)
    const { data: existingCompetitors } = await admin
      .from("business_competitors_fixed")
      .select("rank")
      .eq("business_id", business.id)
      .order("rank", { ascending: true });

    let nextRank = 1;
    if (existingCompetitors && existingCompetitors.length > 0) {
      const usedRanks = new Set(existingCompetitors.map(c => c.rank));
      for (let i = 1; i <= 4; i++) {
        if (!usedRanks.has(i)) {
          nextRank = i;
          break;
        }
      }
      
      if (existingCompetitors.length >= 4) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: "Maximum 4 competitors allowed. Remove one first." 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
    }

    // 4. Extraer rating y votes del competidor
    const googleRatings = competitorPlace.google_ratings as any;
    const tripadvisorRatings = competitorPlace.tripadvisor_ratings as any;
    
    const ratingValue = googleRatings?.rating_value || tripadvisorRatings?.rating_value || null;
    const ratingVotes = (googleRatings?.rating_votes || 0) + (tripadvisorRatings?.rating_votes || 0);

    // 5. Insertar competidor
    const { data: newCompetitor, error: insertError } = await admin
      .from("business_competitors_fixed")
      .insert({
        business_id: business.id,
        rank: nextRank,
        competitor_external_place_id: competitor_place_id,
        competitor_name: competitorPlace.name,
        competitor_rating_value: ratingValue,
        competitor_rating_votes: ratingVotes
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting competitor:', insertError);
      
      // Manejar caso de duplicado
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ 
          ok: false, 
          error: "This competitor is already added to your business" 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      
      throw insertError;
    }

    console.log('✅ Competitor added successfully:', newCompetitor);

    // 6. Devolver el competidor agregado con datos completos
    return new Response(JSON.stringify({
      ok: true,
      competitor: {
        id: newCompetitor.id,
        rank: newCompetitor.rank,
        external_place_id: competitor_place_id,
        name: competitorPlace.name,
        rating: ratingValue,
        totalReviews: ratingVotes,
        created_at: newCompetitor.created_at
      }
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error("Error in add-competitor:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

