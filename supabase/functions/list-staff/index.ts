// supabase/functions/list-staff/index.ts
import { admin, corsHeaders } from "../_shared/db.ts";

interface StaffMember {
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

interface StaffMentionDetail {
  id: string;
  review_id: string;
  detected_name: string;
  role: string | null;
  sentiment: string;
  evidence_span: string;
  created_at: string;
  // Datos de la review
  rating_value: number | null;
  author_name: string | null;
  posted_at: string | null;
  provider: string;
  review_url: string | null;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const external_place_id = url.searchParams.get("external_place_id");
    const staff_member_id = url.searchParams.get("staff_member_id");

    if (!external_place_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "external_place_id requerido" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Caso 1: Listar todos los staff members de un negocio
    if (!staff_member_id) {
      const { data, error } = await admin
        .from("staff_performance_stats")
        .select("*")
        .eq("external_place_id", external_place_id)
        .order("total_mentions", { ascending: false });

      if (error) {
        console.error("Error fetching staff:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({
          ok: true,
          staff: data as StaffMember[],
          total_count: data?.length ?? 0
        }),
        { headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Caso 2: Obtener detalles de un staff member específico con sus menciones
    const { data: staffData, error: staffError } = await admin
      .from("staff_performance_stats")
      .select("*")
      .eq("staff_member_id", staff_member_id)
      .single();

    if (staffError) {
      console.error("Error fetching staff member:", staffError);
      throw staffError;
    }

    // Obtener menciones individuales con datos de la review
    const { data: mentionsData, error: mentionsError } = await admin
      .from("staff_mentions")
      .select(`
        id,
        detected_name,
        role,
        sentiment,
        evidence_span,
        created_at,
        review_id,
        reviews!inner (
          rating_value,
          author_name,
          posted_at,
          provider,
          review_url
        )
      `)
      .eq("staff_member_id", staff_member_id)
      .order("created_at", { ascending: false });

    if (mentionsError) {
      console.error("Error fetching mentions:", mentionsError);
      throw mentionsError;
    }

    // Transformar datos
    const mentions: StaffMentionDetail[] = (mentionsData ?? []).map((m: any) => ({
      id: m.id,
      review_id: m.review_id,
      detected_name: m.detected_name,
      role: m.role,
      sentiment: m.sentiment,
      evidence_span: m.evidence_span,
      created_at: m.created_at,
      rating_value: m.reviews?.rating_value ?? null,
      author_name: m.reviews?.author_name ?? null,
      posted_at: m.reviews?.posted_at ?? null,
      provider: m.reviews?.provider ?? "unknown",
      review_url: m.reviews?.review_url ?? null
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        staff_member: staffData as StaffMember,
        mentions,
        mentions_count: mentions.length
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );

  } catch (e) {
    console.error("Error in list-staff function:", e);
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: corsHeaders }
    );
  }
});

