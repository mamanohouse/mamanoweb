const SUPABASE_URL = "https://qgezkipjnohaavnotono.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0NzLVeckAiUYnyRyj59RmQ_Xufi4a6A";

if (typeof supabase === 'undefined') {
  console.warn("Library Supabase belum termuat. Pastikan CDN atau script library eksternal terpasang dengan benar.");
} else {
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
