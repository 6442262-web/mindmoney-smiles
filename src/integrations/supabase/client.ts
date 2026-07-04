import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// ค่าเชื่อมต่อดึงจาก .env (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)
// แก้ที่ .env ที่เดียวพอ — anon key เป็น public key ฝั่ง client เปิดเผยได้
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://nlishvnsbunxuakfhryh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "PASTE_YOUR_ANON_KEY_HERE";

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
