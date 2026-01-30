import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with service role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is admin or developer
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin or developer role
    const { data: isAuthorized } = await supabaseAdmin.rpc('is_admin_or_developer', { _user_id: user.id });
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin or Developer role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all stats using service role (bypasses RLS)
    const [
      usersRes,
      transactionsRes,
      accountsRes,
      categoriesRes,
      feedbackRes,
      userRolesRes,
      inviteCodesRes,
      userSettingsRes
    ] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers(),
      supabaseAdmin.from('transactions').select('id, type, amount, date, description, user_id, created_at'),
      supabaseAdmin.from('accounts').select('id, name, type, balance, currency, user_id, created_at'),
      supabaseAdmin.from('categories').select('id, name, type, user_id'),
      supabaseAdmin.from('feedback').select('*').order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('user_roles').select('*'),
      supabaseAdmin.from('invite_codes').select('*'),
      supabaseAdmin.from('user_settings').select('user_id, language, currency, theme, created_at')
    ]);

    // Calculate stats
    const users = usersRes.data?.users || [];
    const transactions = transactionsRes.data || [];
    const accounts = accountsRes.data || [];
    const categories = categoriesRes.data || [];
    const feedback = feedbackRes.data || [];
    const userRoles = userRolesRes.data || [];
    const inviteCodes = inviteCodesRes.data || [];
    const userSettings = userSettingsRes.data || [];

    // Calculate user stats
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    // Users by sign-up date (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newUsersLast30Days = users.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length;

    // Active users (users with transactions in last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const activeUserIds = new Set(
      transactions
        .filter(t => new Date(t.created_at) >= sevenDaysAgo)
        .map(t => t.user_id)
    );

    // User details with activity info
    const userDetails = users.map(u => {
      const userTransactions = transactions.filter(t => t.user_id === u.id);
      const userAccounts = accounts.filter(a => a.user_id === u.id);
      const userRole = userRoles.find(r => r.user_id === u.id);
      const settings = userSettings.find(s => s.user_id === u.id);
      
      return {
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || '-',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        is_anonymous: u.is_anonymous,
        transaction_count: userTransactions.length,
        account_count: userAccounts.length,
        total_income: userTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
        total_expense: userTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
        role: userRole?.role || 'user',
        language: settings?.language || 'th',
        theme: settings?.theme || 'light'
      };
    });

    // Feedback stats
    const pendingFeedback = feedback.filter(f => f.status === 'pending').length;
    const resolvedFeedback = feedback.filter(f => f.status === 'resolved').length;

    const response = {
      stats: {
        totalUsers: users.length,
        newUsersLast30Days,
        activeUsersLast7Days: activeUserIds.size,
        guestUsers: users.filter(u => u.is_anonymous).length,
        totalTransactions: transactions.length,
        totalAccounts: accounts.length,
        totalCategories: categories.length,
        totalIncome,
        totalExpense,
        pendingFeedback,
        resolvedFeedback,
        totalFeedback: feedback.length,
        adminCount: userRoles.filter(r => r.role === 'admin').length,
        developerCount: userRoles.filter(r => r.role === 'developer').length,
        activeInviteCodes: inviteCodes.filter(c => c.is_active).length
      },
      users: userDetails.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      feedback: feedback,
      userRoles: userRoles,
      inviteCodes: inviteCodes,
      recentTransactions: transactions.slice(0, 50)
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
