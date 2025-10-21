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

    const { competitor_id } = await req.json();

    if (!competitor_id) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "competitor_id is required" 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log('🗑️ Removing competitor:', {
      user_id: user.id,
      competitor_id
    });

    // 1. Verificar que el competidor pertenece a un negocio del usuario
    const { data: competitor, error: competitorError } = await admin
      .from("business_competitors_fixed")
      .select(`
        id,
        business_id,
        businesses!inner(owner_user_id)
      `)
      .eq("id", competitor_id)
      .single();

    if (competitorError || !competitor) {
      console.error('❌ Competitor not found:', competitorError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "Competitor not found" 
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Verificar ownership
    const ownerUserId = (competitor as any).businesses?.owner_user_id;
    if (ownerUserId !== user.id) {
      console.error('❌ User does not own this competitor');
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "You don't have permission to remove this competitor" 
      }), {
        status: 403,
        headers: corsHeaders
      });
    }

    // 2. Eliminar competidor
    const { error: deleteError } = await admin
      .from("business_competitors_fixed")
      .delete()
      .eq("id", competitor_id);

    if (deleteError) {
      console.error('❌ Error deleting competitor:', deleteError);
      throw deleteError;
    }

    console.log('✅ Competitor removed successfully');

    return new Response(JSON.stringify({
      ok: true,
      message: "Competitor removed successfully"
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error("Error in remove-competitor:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

