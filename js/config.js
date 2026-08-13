/* ==========================================================================
   Supabase project config
   Replace the two values below with your own project's values.
   Find them in Supabase Dashboard -> Project Settings -> API.
   The anon/public key is safe to expose in frontend code — it only works
   within the permissions your Row Level Security policies allow.
   ========================================================================== */

const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// Shared client instance used across every page.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
