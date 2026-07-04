import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Listen for auth changes FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    // กันแอปหมุนค้างตลอดกาลถ้าเซิร์ฟเวอร์ auth ไม่ตอบ (เช่น DB ถูก pause) — เกิน 8 วิให้แสดงหน้า login
    const failsafe = setTimeout(() => setLoading(false), 8000);

    return () => {
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }

    toast({
      title: "เข้าสู่ระบบสำเร็จ",
      description: "ยินดีต้อนรับสู่ MoneyMind",
    });

    return { data, error: null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast({
        title: "สมัครสมาชิกไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }

    toast({
      title: "สมัครสมาชิกสำเร็จ",
      description: "กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี",
    });

    return { data, error: null };
  };

  const signOut = async (clearRememberedData: boolean = false) => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        title: "ออกจากระบบไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    // Clear remembered data if requested or if remember me was not checked
    if (clearRememberedData || localStorage.getItem('remember_me') !== 'true') {
      localStorage.removeItem('remembered_email');
      localStorage.removeItem('remember_me');
    }

    toast({
      title: "ออกจากระบบสำเร็จ",
      description: "ขอบคุณที่ใช้บริการ MoneyMind",
    });

    return { error: null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });

    if (error) {
      toast({
        title: "ส่งอีเมลรีเซ็ตรหัสผ่านไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "ส่งอีเมลรีเซ็ตรหัสผ่านสำเร็จ",
      description: "กรุณาตรวจสอบอีเมลของคุณ",
    });

    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "เปลี่ยนรหัสผ่านไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "เปลี่ยนรหัสผ่านสำเร็จ",
      description: "คุณได้เปลี่ยนรหัสผ่านเรียบร้อยแล้ว",
    });

    return { error: null };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }

    return { data, error: null };
  };

  const signInAsGuest = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      toast({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }

    toast({
      title: "เข้าสู่ระบบสำเร็จ",
      description: "ยินดีต้อนรับ Guest",
    });

    return { data, error: null };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInAsGuest,
    signInWithGoogle,
    resetPassword,
    updatePassword,
  };
}