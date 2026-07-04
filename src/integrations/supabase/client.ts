import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ค่าเชื่อมต่อดึงจาก .env (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)
// แก้ที่ .env ที่เดียวพอ — anon key เป็น public key ฝั่ง client เปิดเผยได้
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://xhhtkrfcjhgnwatuetqc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wJ4y46-O1pBhDTFRRr21ZQ_o0XL1Beu";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});
