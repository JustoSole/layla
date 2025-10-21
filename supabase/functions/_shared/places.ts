import { admin } from "./db.ts";

function isUuidV4Like(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
}

export async function resolveExternalPlaceId(params: {
  external_place_id?: string | null;
  google_place_id?: string | null;
  google_cid?: string | null;
  tripadvisor_url_path?: string | null;
}): Promise<string | null> {
  const { external_place_id, google_place_id, google_cid, tripadvisor_url_path } = params;

  // 1) Prefer provider identifiers to avoid trusting a potentially wrong UUID
  if (google_place_id) {
    const { data } = await admin
      .from("external_places")
      .select("id")
      .eq("google_place_id", google_place_id)
      .single();
    if (data?.id) return data.id;
  }

  if (google_cid) {
    const { data } = await admin
      .from("external_places")
      .select("id")
      .eq("google_cid", google_cid)
      .single();
    if (data?.id) return data.id;
  }

  if (tripadvisor_url_path) {
    const { data } = await admin
      .from("external_places")
      .select("id")
      .eq("tripadvisor_url_path", tripadvisor_url_path)
      .single();
    if (data?.id) return data.id;
  }

  // 2) Fallback: accept provided UUID only if it exists
  if (isUuidV4Like(external_place_id)) {
    const { data } = await admin
      .from("external_places")
      .select("id")
      .eq("id", external_place_id)
      .single();
    if (data?.id) return data.id;
  }

  return null;
}


