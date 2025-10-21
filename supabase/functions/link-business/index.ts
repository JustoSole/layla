import { admin, corsHeaders } from "../_shared/db.ts";

// Simple helper: get user id from Authorization header (Supabase JWT)
async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) return null;
  try {
    // Verify token via auth.getUser on the admin client
    const token = auth.split(" ")[1];
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const external_place_id = body?.external_place_id as string | undefined;
    const plan = (body?.plan as string | undefined) || "trial";
    if (!external_place_id) {
      return new Response(JSON.stringify({ ok: false, error: "external_place_id required" }), { status: 400, headers: corsHeaders });
    }

    // 1) Validate place exists
    const { data: place, error: placeErr } = await admin
      .from("external_places")
      .select("id")
      .eq("id", external_place_id)
      .single();
    if (placeErr || !place?.id) {
      return new Response(JSON.stringify({ ok: false, error: "external_place not found" }), { status: 404, headers: corsHeaders });
    }

    // 2) Upsert into businesses (unique pair owner_user_id + external_place_id is not enforced, so do: delete duplicates then insert)
    const { data: existingBiz } = await admin
      .from("businesses")
      .select("id")
      .eq("owner_user_id", userId)
      .eq("external_place_id", external_place_id)
      .maybeSingle();

    let businessId = existingBiz?.id as string | undefined;
    if (!businessId) {
      const { data: inserted, error: insErr } = await admin
        .from("businesses")
        .insert({ owner_user_id: userId, external_place_id, plan })
        .select("id")
        .single();
      if (insErr) throw insErr;
      businessId = inserted.id;
    }

    // 3) Ensure a subscription (trial if not exists)
    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (!existingSub) {
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      await admin.from("subscriptions").insert({ user_id: userId, status: "trial", trial_ends_at: trialEnd });
    }

    return new Response(JSON.stringify({ ok: true, business_id: businessId, external_place_id }), { headers: corsHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: corsHeaders });
  }
});


