import { createClient } from "@supabase/supabase-js";
const url = Deno.env.get("SUPABASE_URL");
const secretKey = Deno.env.get("SECRET_KEY");
export const admin = createClient(url, secretKey, {
  auth: {
    persistSession: false
  }
});
// CORS Headers helper for frontend communication
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Content-Type": "application/json"
};
