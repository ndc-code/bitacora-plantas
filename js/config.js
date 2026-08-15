const SUPABASE_URL = 'https://ehtqmxtleaclzljaizjy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UKmpcVrhJzFi5QSmIAxoVA_opVNp1_3';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
