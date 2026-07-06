-- ==============================================================
-- MindMoney: setup-fix.sql — เวอร์ชันรันซ้ำได้ (idempotent)
-- ใช้แทน setup-new-project.sql เดิมที่ล้มกลางทางเพราะมีคำสั่งสร้างตารางซ้ำ
-- วิธีใช้: copy ทั้งไฟล์ไปวางใน SQL Editor แล้ว Run ครั้งเดียว
-- ตารางที่มีอยู่แล้วจะถูกข้าม ตารางที่ขาดจะถูกสร้างจนครบ
-- ==============================================================

-- ==============================================================
-- MindMoney: setup schema สำหรับ Supabase โปรเจกต์ใหม่
-- รวมจาก migrations ทั้งหมด 24 ไฟล์ตามลำดับเวลา
-- วิธีใช้: copy ทั้งไฟล์ไปวางใน SQL Editor ของโปรเจกต์ แล้วกด Run ครั้งเดียว
-- ==============================================================

-- ──────────────────────────────────────────────────────────────
-- migration: 20250808151007_a5c4a33a-0ba8-4397-b8c1-0abfcef9f9c8.sql
-- ──────────────────────────────────────────────────────────────
-- Create accounts table for multiple wallets
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4CAF50',
  description TEXT,
  budget_limit DECIMAL(12,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  priority INTEGER CHECK (priority BETWEEN 1 AND 5),
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recurring_transactions table
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  next_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  recurring_reminders BOOLEAN DEFAULT true,
  budget_alerts BOOLEAN DEFAULT true,
  low_balance_alerts BOOLEAN DEFAULT true,
  transaction_reminders BOOLEAN DEFAULT true,
  daily_reminder_time TIME DEFAULT '19:00:00',
  low_balance_threshold DECIMAL(12,2) DEFAULT 1000,
  enable_push BOOLEAN DEFAULT true,
  enable_email BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications_history table
CREATE TABLE IF NOT EXISTS public.notifications_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('recurring_reminder', 'budget_alert', 'low_balance', 'transaction_reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for accounts
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
CREATE POLICY "Users can view their own accounts" 
ON public.accounts FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own accounts" ON public.accounts;
CREATE POLICY "Users can create their own accounts" 
ON public.accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
CREATE POLICY "Users can update their own accounts" 
ON public.accounts FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;
CREATE POLICY "Users can delete their own accounts" 
ON public.accounts FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
CREATE POLICY "Users can create their own transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions" 
ON public.transactions FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
CREATE POLICY "Users can delete their own transactions" 
ON public.transactions FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for recurring_transactions
DROP POLICY IF EXISTS "Users can view their own recurring transactions" ON public.recurring_transactions;
CREATE POLICY "Users can view their own recurring transactions" 
ON public.recurring_transactions FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own recurring transactions" ON public.recurring_transactions;
CREATE POLICY "Users can create their own recurring transactions" 
ON public.recurring_transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recurring transactions" ON public.recurring_transactions;
CREATE POLICY "Users can update their own recurring transactions" 
ON public.recurring_transactions FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recurring transactions" ON public.recurring_transactions;
CREATE POLICY "Users can delete their own recurring transactions" 
ON public.recurring_transactions FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for notification_settings
DROP POLICY IF EXISTS "Users can view their own notification settings" ON public.notification_settings;
CREATE POLICY "Users can view their own notification settings" 
ON public.notification_settings FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own notification settings" ON public.notification_settings;
CREATE POLICY "Users can create their own notification settings" 
ON public.notification_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notification settings" ON public.notification_settings;
CREATE POLICY "Users can update their own notification settings" 
ON public.notification_settings FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for notifications_history
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications_history;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications_history FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications_history;
CREATE POLICY "Users can create their own notifications" 
ON public.notifications_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications_history;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications_history FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_accounts_updated_at ON public.accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_recurring_transactions_updated_at ON public.recurring_transactions;
CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON public.notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- ──────────────────────────────────────────────────────────────
-- migration: 20250812164824-.sql
-- ──────────────────────────────────────────────────────────────
-- Add missing columns to notification_settings table
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS enable_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_income boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_expense boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS summary_frequency text DEFAULT 'weekly' CHECK (summary_frequency IN ('daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS bill_due_reminder time DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS notification_channel text DEFAULT 'in-app' CHECK (notification_channel IN ('in-app', 'email', 'sms', 'all'));

-- Create a function to create default notification settings for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notification_settings (
    user_id,
    enable_notifications,
    notify_on_income,
    notify_on_expense,
    summary_frequency,
    budget_alerts,
    low_balance_alerts,
    transaction_reminders,
    recurring_reminders,
    notification_channel,
    enable_push,
    enable_email,
    daily_reminder_time,
    bill_due_reminder,
    low_balance_threshold
  ) VALUES (
    NEW.id,
    true,
    true,
    true,
    'weekly',
    true,
    true,
    true,
    true,
    'in-app',
    true,
    false,
    '19:00:00',
    '09:00:00',
    1000
  )
ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create notification settings for new users
DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_settings();
-- ──────────────────────────────────────────────────────────────
-- migration: 20250812164846-.sql
-- ──────────────────────────────────────────────────────────────
-- Fix security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notification_settings (
    user_id,
    enable_notifications,
    notify_on_income,
    notify_on_expense,
    summary_frequency,
    budget_alerts,
    low_balance_alerts,
    transaction_reminders,
    recurring_reminders,
    notification_channel,
    enable_push,
    enable_email,
    daily_reminder_time,
    bill_due_reminder,
    low_balance_threshold
  ) VALUES (
    NEW.id,
    true,
    true,
    true,
    'weekly',
    true,
    true,
    true,
    true,
    'in-app',
    true,
    false,
    '19:00:00',
    '09:00:00',
    1000
  )
ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
-- ──────────────────────────────────────────────────────────────
-- migration: 20250812164907-.sql
-- ──────────────────────────────────────────────────────────────
-- Fix the remaining function security warning by setting search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- ──────────────────────────────────────────────────────────────
-- migration: 20250813151106_c20a940d-3607-4e54-80ac-e39fb21375d0.sql
-- ──────────────────────────────────────────────────────────────
-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  priority INTEGER CHECK (priority BETWEEN 1 AND 5),
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
CREATE POLICY "Users can create their own transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions" 
ON public.transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
CREATE POLICY "Users can delete their own transactions" 
ON public.transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create recurring_transactions table
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  next_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for recurring transactions
DROP POLICY IF EXISTS "Users can view their own recurring transactions" ON public.recurring_transactions;
CREATE POLICY "Users can view their own recurring transactions" 
ON public.recurring_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own recurring transactions" ON public.recurring_transactions;
CREATE POLICY "Users can create their own recurring transactions" 
ON public.recurring_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recurring transactions" ON public.recurring_transactions;
CREATE POLICY "Users can update their own recurring transactions" 
ON public.recurring_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recurring transactions" ON public.recurring_transactions;
CREATE POLICY "Users can delete their own recurring transactions" 
ON public.recurring_transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  phone_number TEXT,
  date_of_birth DATE,
  avatar_url TEXT,
  currency TEXT DEFAULT 'THB',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create business_transactions table
CREATE TABLE IF NOT EXISTS public.business_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.business_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for business transactions
DROP POLICY IF EXISTS "Users can view their own business transactions" ON public.business_transactions;
CREATE POLICY "Users can view their own business transactions" 
ON public.business_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own business transactions" ON public.business_transactions;
CREATE POLICY "Users can create their own business transactions" 
ON public.business_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own business transactions" ON public.business_transactions;
CREATE POLICY "Users can update their own business transactions" 
ON public.business_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own business transactions" ON public.business_transactions;
CREATE POLICY "Users can delete their own business transactions" 
ON public.business_transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_recurring_transactions_updated_at ON public.recurring_transactions;
CREATE TRIGGER update_recurring_transactions_updated_at
BEFORE UPDATE ON public.recurring_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_transactions_updated_at ON public.business_transactions;
CREATE TRIGGER update_business_transactions_updated_at
BEFORE UPDATE ON public.business_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'ผู้ใช้ MoneyMind'))
ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ──────────────────────────────────────────────────────────────
-- migration: 20250814085056_9835714a-e136-4fad-9746-691532aa45ea.sql
-- ──────────────────────────────────────────────────────────────
-- Create user settings table for app configuration
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- User Profile Settings
  display_name TEXT,
  phone_number TEXT,
  language TEXT DEFAULT 'th',
  pin_enabled BOOLEAN DEFAULT false,
  touch_id_enabled BOOLEAN DEFAULT false,
  
  -- Currency Settings
  primary_currency TEXT DEFAULT 'THB',
  secondary_currency TEXT DEFAULT 'USD',
  
  -- Notification Settings (budget alerts)
  budget_alerts_enabled BOOLEAN DEFAULT true,
  email_notifications_enabled BOOLEAN DEFAULT false,
  sms_notifications_enabled BOOLEAN DEFAULT false,
  
  -- Backup Settings
  auto_backup_enabled BOOLEAN DEFAULT true,
  
  -- Security Settings
  two_factor_enabled BOOLEAN DEFAULT false,
  
  -- App Theme
  dark_mode_enabled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings" 
ON public.user_settings 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own settings" ON public.user_settings;
CREATE POLICY "Users can create their own settings" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings" 
ON public.user_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create categories table for expense/income categorization
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#4CAF50',
  icon TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
CREATE POLICY "Users can view their own categories" 
ON public.categories 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own categories" ON public.categories;
CREATE POLICY "Users can create their own categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
CREATE POLICY "Users can update their own categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;
CREATE POLICY "Users can delete their own categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories for expenses
INSERT INTO public.categories (user_id, name, type, color, icon, is_default) VALUES
('00000000-0000-0000-0000-000000000000', 'อาหาร', 'expense', '#FF6B6B', 'utensils', true),
('00000000-0000-0000-0000-000000000000', 'ขนส่ง', 'expense', '#4ECDC4', 'car', true),
('00000000-0000-0000-0000-000000000000', 'ซื้อของ', 'expense', '#45B7D1', 'shopping-bag', true),
('00000000-0000-0000-0000-000000000000', 'บิล', 'expense', '#FFA07A', 'file-text', true),
('00000000-0000-0000-0000-000000000000', 'บันเทิง', 'expense', '#98D8C8', 'music', true),
('00000000-0000-0000-0000-000000000000', 'สุขภาพ', 'expense', '#F7DC6F', 'heart', true),
('00000000-0000-0000-0000-000000000000', 'เงินเดือน', 'income', '#2ECC71', 'briefcase', true),
('00000000-0000-0000-0000-000000000000', 'ธุรกิจ', 'income', '#3498DB', 'trending-up', true),
('00000000-0000-0000-0000-000000000000', 'เงินลงทุน', 'income', '#9B59B6', 'dollar-sign', true)
ON CONFLICT DO NOTHING;

-- Function to copy default categories for new users
CREATE OR REPLACE FUNCTION public.copy_default_categories_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color, icon, is_default)
  SELECT NEW.id, name, type, color, icon, is_default
  FROM public.categories
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND is_default = true
ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create backup logs table
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  backup_type TEXT NOT NULL, -- 'auto', 'manual', 'export'
  status TEXT NOT NULL, -- 'success', 'failed', 'in_progress'
  file_size BIGINT,
  file_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for backup logs
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for backup logs
DROP POLICY IF EXISTS "Users can view their own backup logs" ON public.backup_logs;
CREATE POLICY "Users can view their own backup logs" 
ON public.backup_logs 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own backup logs" ON public.backup_logs;
CREATE POLICY "Users can create their own backup logs" 
ON public.backup_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
-- ──────────────────────────────────────────────────────────────
-- migration: 20250901145229_2609fc32-4aab-44e7-b2c3-ab2fba98f0e6.sql
-- ──────────────────────────────────────────────────────────────
-- Create comprehensive business mode tables

-- Business accounts table (enhanced from existing accounts table)
-- This will extend the current accounts table with business-specific features
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'personal';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS currency text DEFAULT 'THB';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS is_business boolean DEFAULT false;

-- Business profiles table for company information
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  company_registration text,
  tax_id text,
  address text,
  phone text,
  email text,
  website text,
  industry text,
  fiscal_year_start date DEFAULT (date_trunc('year', CURRENT_DATE) + interval '1 year' - interval '1 day'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Liabilities management
CREATE TABLE IF NOT EXISTS public.liabilities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  liability_type text NOT NULL CHECK (liability_type IN ('loan', 'trade_payable', 'short_term', 'long_term', 'credit_card', 'other')),
  creditor_name text NOT NULL,
  principal_amount numeric(15,2) NOT NULL,
  current_balance numeric(15,2) NOT NULL,
  interest_rate numeric(5,4) DEFAULT 0,
  start_date date NOT NULL,
  due_date date,
  payment_frequency text DEFAULT 'monthly' CHECK (payment_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  payment_amount numeric(15,2),
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Liability payments history
CREATE TABLE IF NOT EXISTS public.liability_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  liability_id uuid NOT NULL REFERENCES public.liabilities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  payment_amount numeric(15,2) NOT NULL,
  principal_paid numeric(15,2) NOT NULL,
  interest_paid numeric(15,2) NOT NULL,
  payment_date date NOT NULL,
  remaining_balance numeric(15,2) NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Document management
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  account_id uuid,
  transaction_id uuid REFERENCES public.transactions(id),
  liability_id uuid REFERENCES public.liabilities(id),
  document_type text NOT NULL CHECK (document_type IN ('receipt', 'invoice', 'bill', 'contract', 'tax_document', 'bank_statement', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  description text,
  tags text[],
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Business transactions categories (enhanced)
CREATE TABLE IF NOT EXISTS public.business_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'asset', 'liability', 'equity')),
  parent_category_id uuid REFERENCES public.business_categories(id),
  account_code text,
  is_system boolean DEFAULT false,
  color text DEFAULT '#4CAF50',
  icon text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Projects/Departments for cost center tracking
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  description text,
  start_date date,
  end_date date,
  budget numeric(15,2),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
  manager_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enhanced transactions table for business features
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS business_category_id uuid REFERENCES public.business_categories(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference_number text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tax_amount numeric(15,2) DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS currency text DEFAULT 'THB';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS exchange_rate numeric(10,6) DEFAULT 1;

-- Account transfers
CREATE TABLE IF NOT EXISTS public.account_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  from_account_id uuid NOT NULL REFERENCES public.accounts(id),
  to_account_id uuid NOT NULL REFERENCES public.accounts(id),
  amount numeric(15,2) NOT NULL,
  from_currency text DEFAULT 'THB',
  to_currency text DEFAULT 'THB',
  exchange_rate numeric(10,6) DEFAULT 1,
  converted_amount numeric(15,2),
  description text,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  reference_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User roles for multi-user access
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')),
  permissions jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_id)
);

-- Audit log for tracking user activities
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  account_id uuid,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_profiles
DROP POLICY IF EXISTS "Users can view their own business profiles" ON public.business_profiles;
CREATE POLICY "Users can view their own business profiles" ON public.business_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own business profiles" ON public.business_profiles;
CREATE POLICY "Users can create their own business profiles" ON public.business_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own business profiles" ON public.business_profiles;
CREATE POLICY "Users can update their own business profiles" ON public.business_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for liabilities
DROP POLICY IF EXISTS "Users can view their own liabilities" ON public.liabilities;
CREATE POLICY "Users can view their own liabilities" ON public.liabilities
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own liabilities" ON public.liabilities;
CREATE POLICY "Users can create their own liabilities" ON public.liabilities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own liabilities" ON public.liabilities;
CREATE POLICY "Users can update their own liabilities" ON public.liabilities
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own liabilities" ON public.liabilities;
CREATE POLICY "Users can delete their own liabilities" ON public.liabilities
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for liability_payments
DROP POLICY IF EXISTS "Users can view their own liability payments" ON public.liability_payments;
CREATE POLICY "Users can view their own liability payments" ON public.liability_payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own liability payments" ON public.liability_payments;
CREATE POLICY "Users can create their own liability payments" ON public.liability_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for documents
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own documents" ON public.documents;
CREATE POLICY "Users can create their own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for business_categories
DROP POLICY IF EXISTS "Users can view their own business categories" ON public.business_categories;
CREATE POLICY "Users can view their own business categories" ON public.business_categories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own business categories" ON public.business_categories;
CREATE POLICY "Users can create their own business categories" ON public.business_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own business categories" ON public.business_categories;
CREATE POLICY "Users can update their own business categories" ON public.business_categories
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own business categories" ON public.business_categories;
CREATE POLICY "Users can delete their own business categories" ON public.business_categories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for projects
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
CREATE POLICY "Users can create their own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for account_transfers
DROP POLICY IF EXISTS "Users can view their own account transfers" ON public.account_transfers;
CREATE POLICY "Users can view their own account transfers" ON public.account_transfers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own account transfers" ON public.account_transfers;
CREATE POLICY "Users can create their own account transfers" ON public.account_transfers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own account transfers" ON public.account_transfers;
CREATE POLICY "Users can update their own account transfers" ON public.account_transfers
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_roles (more complex - users can see roles for accounts they have access to)
DROP POLICY IF EXISTS "Users can view roles for their accounts" ON public.user_roles;
CREATE POLICY "Users can view roles for their accounts" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR 
    account_id IN (
      SELECT account_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Account owners/admins can create user roles" ON public.user_roles;
CREATE POLICY "Account owners/admins can create user roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Account owners/admins can update user roles" ON public.user_roles;
CREATE POLICY "Account owners/admins can update user roles" ON public.user_roles
  FOR UPDATE USING (
    account_id IN (
      SELECT account_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Account owners/admins can delete user roles" ON public.user_roles;
CREATE POLICY "Account owners/admins can delete user roles" ON public.user_roles
  FOR DELETE USING (
    account_id IN (
      SELECT account_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for audit_log
DROP POLICY IF EXISTS "Users can view audit logs for their accounts" ON public.audit_log;
CREATE POLICY "Users can view audit logs for their accounts" ON public.audit_log
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (account_id IS NOT NULL AND account_id IN (
      SELECT account_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ))
  );

DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_log;
CREATE POLICY "System can create audit logs" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_business_profiles_updated_at ON public.business_profiles;
CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_liabilities_updated_at ON public.liabilities;
CREATE TRIGGER update_liabilities_updated_at
  BEFORE UPDATE ON public.liabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_categories_updated_at ON public.business_categories;
CREATE TRIGGER update_business_categories_updated_at
  BEFORE UPDATE ON public.business_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default business categories
INSERT INTO public.business_categories (user_id, name, type, account_code, is_system) VALUES
('00000000-0000-0000-0000-000000000000', 'รายได้จากการขาย', 'income', '4000', true),
('00000000-0000-0000-0000-000000000000', 'รายได้จากบริการ', 'income', '4100', true),
('00000000-0000-0000-0000-000000000000', 'รายได้อื่นๆ', 'income', '4900', true),
('00000000-0000-0000-0000-000000000000', 'ต้นทุนขาย', 'expense', '5000', true),
('00000000-0000-0000-0000-000000000000', 'ค่าเช่า', 'expense', '6100', true),
('00000000-0000-0000-0000-000000000000', 'ค่าไฟฟ้าน้ำ', 'expense', '6200', true),
('00000000-0000-0000-0000-000000000000', 'ค่าขนส่ง', 'expense', '6300', true),
('00000000-0000-0000-0000-000000000000', 'ค่าโฆษณา', 'expense', '6400', true),
('00000000-0000-0000-0000-000000000000', 'เงินเดือนพนักงาน', 'expense', '6500', true),
('00000000-0000-0000-0000-000000000000', 'ค่าใช้จ่ายสำนักงาน', 'expense', '6600', true)
ON CONFLICT DO NOTHING;

-- Function to copy default business categories for new users
CREATE OR REPLACE FUNCTION public.copy_default_business_categories_for_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.business_categories (user_id, name, type, account_code, is_system, color, icon)
  SELECT NEW.id, name, type, account_code, is_system, color, icon
  FROM public.business_categories
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND is_system = true
ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
-- ──────────────────────────────────────────────────────────────
-- migration: 20250928175316_7882c86a-4615-4707-a46e-5f4819e2c12b.sql
-- ──────────────────────────────────────────────────────────────
-- Create keywords table for user keyword management
CREATE TABLE IF NOT EXISTS public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  keyword TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, keyword)
);

-- Enable Row Level Security
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own keywords" ON public.keywords;
CREATE POLICY "Users can view their own keywords" 
ON public.keywords 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own keywords" ON public.keywords;
CREATE POLICY "Users can create their own keywords" 
ON public.keywords 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own keywords" ON public.keywords;
CREATE POLICY "Users can update their own keywords" 
ON public.keywords 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own keywords" ON public.keywords;
CREATE POLICY "Users can delete their own keywords" 
ON public.keywords 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_keywords_updated_at ON public.keywords;
CREATE TRIGGER update_keywords_updated_at
BEFORE UPDATE ON public.keywords
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_keywords_user_category ON public.keywords(user_id, category);
CREATE INDEX IF NOT EXISTS idx_keywords_usage_count ON public.keywords(usage_count DESC);
-- ──────────────────────────────────────────────────────────────
-- migration: 20250929162326_ab846330-5a3d-4999-a4ed-c4865a81f120.sql
-- ──────────────────────────────────────────────────────────────
-- Fix user_roles RLS infinite recursion by creating security definer functions
-- and updating policies to use them

-- 1. Create security definer function to check user roles safely
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. Create function to check if user is admin/owner for an account
CREATE OR REPLACE FUNCTION public.is_account_admin(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND account_id = _account_id
      AND role IN ('owner', 'admin')
  )
$$;

-- 3. Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Account owners/admins can create user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Account owners/admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Account owners/admins can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles for their accounts" ON public.user_roles;

-- 4. Create new safe policies using security definer functions
DROP POLICY IF EXISTS "Account owners/admins can create user roles" ON public.user_roles;
CREATE POLICY "Account owners/admins can create user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_account_admin(auth.uid(), account_id));

DROP POLICY IF EXISTS "Account owners/admins can update user roles" ON public.user_roles;
CREATE POLICY "Account owners/admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (public.is_account_admin(auth.uid(), account_id));

DROP POLICY IF EXISTS "Account owners/admins can delete user roles" ON public.user_roles;
CREATE POLICY "Account owners/admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (public.is_account_admin(auth.uid(), account_id));

DROP POLICY IF EXISTS "Users can view roles for their accounts" ON public.user_roles;
CREATE POLICY "Users can view roles for their accounts"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id OR 
  public.is_account_admin(auth.uid(), account_id)
);

-- 5. Add missing UPDATE/DELETE policies for backup_logs
DROP POLICY IF EXISTS "Users can update their own backup logs" ON public.backup_logs;
CREATE POLICY "Users can update their own backup logs"
ON public.backup_logs
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own backup logs" ON public.backup_logs;
CREATE POLICY "Users can delete their own backup logs"
ON public.backup_logs
FOR DELETE
USING (auth.uid() = user_id);

-- 6. Add missing UPDATE/DELETE policies for liability_payments
DROP POLICY IF EXISTS "Users can update their own liability payments" ON public.liability_payments;
CREATE POLICY "Users can update their own liability payments"
ON public.liability_payments
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own liability payments" ON public.liability_payments;
CREATE POLICY "Users can delete their own liability payments"
ON public.liability_payments
FOR DELETE
USING (auth.uid() = user_id);

-- 7. Secure existing database functions by adding proper search_path
-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update copy_default_categories_for_user function
CREATE OR REPLACE FUNCTION public.copy_default_categories_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color, icon, is_default)
  SELECT NEW.id, name, type, color, icon, is_default
  FROM public.categories
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND is_default = true
ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Update copy_default_business_categories_for_user function
CREATE OR REPLACE FUNCTION public.copy_default_business_categories_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.business_categories (user_id, name, type, account_code, is_system, color, icon)
  SELECT NEW.id, name, type, account_code, is_system, color, icon
  FROM public.business_categories
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND is_system = true
ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;
-- ──────────────────────────────────────────────────────────────
-- migration: 20250929162449_3b70a463-72bf-40f6-a813-1c0fbe55c77a.sql
-- ──────────────────────────────────────────────────────────────
-- Add PIN hash field to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS pin_hash text NULL;
-- ──────────────────────────────────────────────────────────────
-- migration: 20251023162102_dc9e011f-a9f5-4bcc-a4f9-42fa6e1d19fe.sql
-- ──────────────────────────────────────────────────────────────
-- Create table for recurring transaction execution history
CREATE TABLE IF NOT EXISTS public.recurring_transaction_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_transaction_id UUID NOT NULL,
  user_id UUID NOT NULL,
  transaction_id UUID,
  execution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recurring_transaction_executions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
DROP POLICY IF EXISTS "Users can view their own execution history" ON public.recurring_transaction_executions;
CREATE POLICY "Users can view their own execution history" 
ON public.recurring_transaction_executions 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own execution history" ON public.recurring_transaction_executions;
CREATE POLICY "Users can create their own execution history" 
ON public.recurring_transaction_executions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own execution history" ON public.recurring_transaction_executions;
CREATE POLICY "Users can update their own execution history" 
ON public.recurring_transaction_executions 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own execution history" ON public.recurring_transaction_executions;
CREATE POLICY "Users can delete their own execution history" 
ON public.recurring_transaction_executions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_recurring_transaction_executions_updated_at ON public.recurring_transaction_executions;
CREATE TRIGGER update_recurring_transaction_executions_updated_at
BEFORE UPDATE ON public.recurring_transaction_executions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_recurring_transaction_executions_user_id 
ON public.recurring_transaction_executions(user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_transaction_executions_recurring_id 
ON public.recurring_transaction_executions(recurring_transaction_id);

CREATE INDEX IF NOT EXISTS idx_recurring_transaction_executions_date 
ON public.recurring_transaction_executions(execution_date DESC);
-- ──────────────────────────────────────────────────────────────
-- migration: 20251024161438_6d96db01-5498-421b-9cf4-d9a4d27be8c8.sql
-- ──────────────────────────────────────────────────────────────
-- Add date_of_birth and avatar_url to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
-- ──────────────────────────────────────────────────────────────
-- migration: 20251024161515_992e7c2d-c7a2-4d1e-8eec-6e4563f1421c.sql
-- ──────────────────────────────────────────────────────────────
-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for avatar uploads
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for avatar updates
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for avatar access
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
-- ──────────────────────────────────────────────────────────────
-- migration: 20251025153624_8c05b184-30a7-4ec9-9ec7-9c78d66c9912.sql
-- ──────────────────────────────────────────────────────────────
-- เพิ่มฟิลด์สำหรับบัตรเครดิต
ALTER TABLE public.liabilities
ADD COLUMN IF NOT EXISTS credit_limit numeric,
ADD COLUMN IF NOT EXISTS min_payment numeric,
ADD COLUMN IF NOT EXISTS billing_cycle_day integer,
ADD COLUMN IF NOT EXISTS payment_due_day integer,
ADD COLUMN IF NOT EXISTS statement_date date;

-- เพิ่ม comment อธิบายการใช้งานฟิลด์
COMMENT ON COLUMN public.liabilities.credit_limit IS 'วงเงินบัตรเครดิต (ใช้กับประเภท credit_card)';
COMMENT ON COLUMN public.liabilities.min_payment IS 'ยอดชำระขั้นต่ำรายเดือน';
COMMENT ON COLUMN public.liabilities.billing_cycle_day IS 'วันที่ปิดบิล (1-31)';
COMMENT ON COLUMN public.liabilities.payment_due_day IS 'วันที่ครบกำหนดชำระ (1-31)';
COMMENT ON COLUMN public.liabilities.statement_date IS 'วันที่ออกใบแจ้งหนี้ล่าสุด';
-- ──────────────────────────────────────────────────────────────
-- migration: 20260111050117_5283fab8-6350-49a1-91e1-8449fe7a0b79.sql
-- ──────────────────────────────────────────────────────────────
-- User Settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  language TEXT DEFAULT 'th',
  currency TEXT DEFAULT 'THB',
  theme TEXT DEFAULT 'light',
  pin_hash TEXT,
  pin_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Accounts table (financial accounts like bank, cash, etc.)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash',
  balance DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'THB',
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  icon TEXT,
  color TEXT,
  parent_id UUID REFERENCES public.categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.accounts(id),
  category_id UUID REFERENCES public.categories(id),
  type TEXT NOT NULL DEFAULT 'expense',
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_business BOOLEAN DEFAULT false,
  project_id UUID,
  recurring_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Keywords table for auto-categorization
CREATE TABLE IF NOT EXISTS public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Liabilities table (debts, loans)
CREATE TABLE IF NOT EXISTS public.liabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'loan',
  principal_amount DECIMAL(15,2) NOT NULL,
  current_balance DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  monthly_payment DECIMAL(15,2),
  start_date DATE,
  end_date DATE,
  creditor TEXT,
  note TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Liability payments table
CREATE TABLE IF NOT EXISTS public.liability_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  liability_id UUID NOT NULL REFERENCES public.liabilities(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  principal_amount DECIMAL(15,2),
  interest_amount DECIMAL(15,2),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Account transfers table
CREATE TABLE IF NOT EXISTS public.account_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_account_id UUID NOT NULL REFERENCES public.accounts(id),
  to_account_id UUID NOT NULL REFERENCES public.accounts(id),
  amount DECIMAL(15,2) NOT NULL,
  converted_amount DECIMAL(15,2),
  exchange_rate DECIMAL(10,6) DEFAULT 1,
  fee DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recurring transactions table
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.accounts(id),
  category_id UUID REFERENCES public.categories(id),
  type TEXT NOT NULL DEFAULT 'expense',
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE,
  next_execution DATE,
  last_execution DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recurring executions history
CREATE TABLE IF NOT EXISTS public.recurring_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_id UUID NOT NULL REFERENCES public.recurring_transactions(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id),
  execution_date DATE NOT NULL,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Projects table (for business mode)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  budget DECIMAL(15,2),
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Backup logs table
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  backup_type TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add project_id foreign key to transactions
DO $do$ BEGIN
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

-- Add recurring_id foreign key to transactions
DO $do$ BEGIN
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_recurring_id_fkey 
FOREIGN KEY (recurring_id) REFERENCES public.recurring_transactions(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

-- Enable Row Level Security on all tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for accounts
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.accounts;
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.accounts;
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for categories
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for keywords
DROP POLICY IF EXISTS "Users can view own keywords" ON public.keywords;
CREATE POLICY "Users can view own keywords" ON public.keywords FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own keywords" ON public.keywords;
CREATE POLICY "Users can insert own keywords" ON public.keywords FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own keywords" ON public.keywords;
CREATE POLICY "Users can update own keywords" ON public.keywords FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own keywords" ON public.keywords;
CREATE POLICY "Users can delete own keywords" ON public.keywords FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for liabilities
DROP POLICY IF EXISTS "Users can view own liabilities" ON public.liabilities;
CREATE POLICY "Users can view own liabilities" ON public.liabilities FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own liabilities" ON public.liabilities;
CREATE POLICY "Users can insert own liabilities" ON public.liabilities FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own liabilities" ON public.liabilities;
CREATE POLICY "Users can update own liabilities" ON public.liabilities FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own liabilities" ON public.liabilities;
CREATE POLICY "Users can delete own liabilities" ON public.liabilities FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for liability_payments (via liability ownership)
DROP POLICY IF EXISTS "Users can view own liability payments" ON public.liability_payments;
CREATE POLICY "Users can view own liability payments" ON public.liability_payments FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.liabilities WHERE liabilities.id = liability_payments.liability_id AND liabilities.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert own liability payments" ON public.liability_payments;
CREATE POLICY "Users can insert own liability payments" ON public.liability_payments FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.liabilities WHERE liabilities.id = liability_payments.liability_id AND liabilities.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own liability payments" ON public.liability_payments;
CREATE POLICY "Users can update own liability payments" ON public.liability_payments FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.liabilities WHERE liabilities.id = liability_payments.liability_id AND liabilities.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can delete own liability payments" ON public.liability_payments;
CREATE POLICY "Users can delete own liability payments" ON public.liability_payments FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.liabilities WHERE liabilities.id = liability_payments.liability_id AND liabilities.user_id = auth.uid()));

-- RLS Policies for account_transfers
DROP POLICY IF EXISTS "Users can view own transfers" ON public.account_transfers;
CREATE POLICY "Users can view own transfers" ON public.account_transfers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own transfers" ON public.account_transfers;
CREATE POLICY "Users can insert own transfers" ON public.account_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own transfers" ON public.account_transfers;
CREATE POLICY "Users can update own transfers" ON public.account_transfers FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own transfers" ON public.account_transfers;
CREATE POLICY "Users can delete own transfers" ON public.account_transfers FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recurring_transactions
DROP POLICY IF EXISTS "Users can view own recurring" ON public.recurring_transactions;
CREATE POLICY "Users can view own recurring" ON public.recurring_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own recurring" ON public.recurring_transactions;
CREATE POLICY "Users can insert own recurring" ON public.recurring_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own recurring" ON public.recurring_transactions;
CREATE POLICY "Users can update own recurring" ON public.recurring_transactions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own recurring" ON public.recurring_transactions;
CREATE POLICY "Users can delete own recurring" ON public.recurring_transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recurring_executions (via recurring transaction ownership)
DROP POLICY IF EXISTS "Users can view own executions" ON public.recurring_executions;
CREATE POLICY "Users can view own executions" ON public.recurring_executions FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.recurring_transactions WHERE recurring_transactions.id = recurring_executions.recurring_id AND recurring_transactions.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert own executions" ON public.recurring_executions;
CREATE POLICY "Users can insert own executions" ON public.recurring_executions FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.recurring_transactions WHERE recurring_transactions.id = recurring_executions.recurring_id AND recurring_transactions.user_id = auth.uid()));

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for backup_logs
DROP POLICY IF EXISTS "Users can view own backups" ON public.backup_logs;
CREATE POLICY "Users can view own backups" ON public.backup_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own backups" ON public.backup_logs;
CREATE POLICY "Users can insert own backups" ON public.backup_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own backups" ON public.backup_logs;
CREATE POLICY "Users can update own backups" ON public.backup_logs FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_accounts_updated_at ON public.accounts;
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_keywords_updated_at ON public.keywords;
CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON public.keywords FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_liabilities_updated_at ON public.liabilities;
CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON public.liabilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_recurring_transactions_updated_at ON public.recurring_transactions;
CREATE TRIGGER update_recurring_transactions_updated_at BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON public.keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON public.liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON public.recurring_transactions(user_id);
-- ──────────────────────────────────────────────────────────────
-- migration: 20260111084116_4b0baec2-5e85-42a5-b423-6e52028de0b3.sql
-- ──────────────────────────────────────────────────────────────
-- Add missing columns to accounts table
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS budget_limit DECIMAL(15,2);

-- Add missing columns to categories table
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Add missing columns to keywords table  
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS category_name TEXT;

-- Add missing columns to transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'THB';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6) DEFAULT 1;

-- Add missing columns to account_transfers table
ALTER TABLE public.account_transfers ADD COLUMN IF NOT EXISTS from_currency TEXT DEFAULT 'THB';
ALTER TABLE public.account_transfers ADD COLUMN IF NOT EXISTS to_currency TEXT DEFAULT 'THB';

-- Add missing columns to recurring_transactions table
ALTER TABLE public.recurring_transactions ADD COLUMN IF NOT EXISTS day_of_month INTEGER;
ALTER TABLE public.recurring_transactions ADD COLUMN IF NOT EXISTS day_of_week INTEGER;

-- Add missing columns to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id UUID;

-- Add missing columns to user_settings table
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'dd/MM/yyyy';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS auto_backup BOOLEAN DEFAULT false;
-- ──────────────────────────────────────────────────────────────
-- migration: 20260128160412_d587c035-e4fc-408f-bcef-4bec253c0340.sql
-- ──────────────────────────────────────────────────────────────
-- Create enum for app roles
DO $do$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'developer', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin or developer
CREATE OR REPLACE FUNCTION public.is_admin_or_developer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'developer')
  )
$$;

-- RLS Policies for user_roles table
-- Users can view their own roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can insert roles
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update roles
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
-- ──────────────────────────────────────────────────────────────
-- migration: 20260129132724_01e39ae3-9c56-4ab7-9426-4163432736dc.sql
-- ──────────────────────────────────────────────────────────────
-- Create feedback table for user feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
CREATE POLICY "Users can view own feedback" 
ON public.feedback 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own feedback
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback;
CREATE POLICY "Users can insert own feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins/developers can view all feedback
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
CREATE POLICY "Admins can view all feedback" 
ON public.feedback 
FOR SELECT 
USING (public.is_admin_or_developer(auth.uid()));

-- Admins can update feedback status
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
CREATE POLICY "Admins can update feedback" 
ON public.feedback 
FOR UPDATE 
USING (public.is_admin_or_developer(auth.uid()));
-- ──────────────────────────────────────────────────────────────
-- migration: 20260130143627_dcd96111-042b-4f95-9dc5-29e2adb0bb6f.sql
-- ──────────────────────────────────────────────────────────────
-- Create invite_codes table for developer registration
CREATE TABLE IF NOT EXISTS public.invite_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    role app_role NOT NULL DEFAULT 'developer',
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invite codes
DROP POLICY IF EXISTS "Admins can view all invite codes" ON public.invite_codes;
CREATE POLICY "Admins can view all invite codes"
ON public.invite_codes
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can create invite codes" ON public.invite_codes;
CREATE POLICY "Admins can create invite codes"
ON public.invite_codes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update invite codes" ON public.invite_codes;
CREATE POLICY "Admins can update invite codes"
ON public.invite_codes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete invite codes" ON public.invite_codes;
CREATE POLICY "Admins can delete invite codes"
ON public.invite_codes
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create a security definer function to redeem invite code
-- This bypasses RLS so normal users can redeem codes
CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite_code RECORD;
    v_user_id UUID;
    v_existing_role RECORD;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'ไม่ได้เข้าสู่ระบบ');
    END IF;
    
    -- Find the invite code
    SELECT * INTO v_invite_code
    FROM public.invite_codes
    WHERE code = p_code
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR current_uses < max_uses);
    
    IF v_invite_code IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'รหัสไม่ถูกต้องหรือหมดอายุ');
    END IF;
    
    -- Check if user already has this role
    SELECT * INTO v_existing_role
    FROM public.user_roles
    WHERE user_id = v_user_id AND role = v_invite_code.role;
    
    IF v_existing_role IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'คุณมี role นี้อยู่แล้ว');
    END IF;
    
    -- Insert the user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, v_invite_code.role)
ON CONFLICT DO NOTHING;
    
    -- Update usage count
    UPDATE public.invite_codes
    SET current_uses = current_uses + 1,
        updated_at = now()
    WHERE id = v_invite_code.id;
    
    RETURN json_build_object('success', true, 'role', v_invite_code.role::text);
END;
$$;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_invite_codes_updated_at ON public.invite_codes;
CREATE TRIGGER update_invite_codes_updated_at
BEFORE UPDATE ON public.invite_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default developer invite code (can be changed later)
INSERT INTO public.invite_codes (code, role, max_uses, is_active)
VALUES ('DEV-2024-MONEYMIND', 'developer', 100, true)
ON CONFLICT DO NOTHING;
-- ──────────────────────────────────────────────────────────────
-- migration: 20260214152121_7dab2612-50ca-45d7-8777-10adb21b1098.sql
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS time text DEFAULT NULL;
-- ──────────────────────────────────────────────────────────────
-- migration: 20260216170020_0c3bf1dd-5a83-45f4-8ee8-0d7acb6c1d6b.sql
-- ──────────────────────────────────────────────────────────────

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule recurring transactions processing at midnight Thai time (17:00 UTC)
SELECT cron.schedule(
  'process-recurring-transactions-midnight',
  '0 17 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://vpoldjlbrkzvxqlgwvgk.supabase.co/functions/v1/process-recurring-transactions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwb2xkamxicmt6dnhxbGd3dmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwOTYxMTksImV4cCI6MjA4MzY3MjExOX0.BoYlulzDqHy7R_OdAFMducaO0xDB3UewREMgg5vYats"}'::jsonb,
        body:='{"time": "midnight-thai"}'::jsonb
    ) AS request_id;
  $$
);

-- ──────────────────────────────────────────────────────────────
-- migration: 20260219151515_d307823b-9a82-4dd1-989f-fa75006e5808.sql
-- ──────────────────────────────────────────────────────────────

-- Table: Investment holdings/portfolio
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT,
  asset_type TEXT NOT NULL DEFAULT 'stock',
  quantity NUMERIC NOT NULL DEFAULT 0,
  avg_cost NUMERIC NOT NULL DEFAULT 0,
  current_price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'THB',
  note TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own investments" ON public.investments;
CREATE POLICY "Users can view own investments" ON public.investments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own investments" ON public.investments;
CREATE POLICY "Users can insert own investments" ON public.investments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own investments" ON public.investments;
CREATE POLICY "Users can update own investments" ON public.investments FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own investments" ON public.investments;
CREATE POLICY "Users can delete own investments" ON public.investments FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_investments_updated_at ON public.investments;
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: Investment transactions (buy/sell/dividend/interest)
CREATE TABLE IF NOT EXISTS public.investment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL DEFAULT 'buy',
  quantity NUMERIC NOT NULL DEFAULT 0,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  fee NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own inv txns" ON public.investment_transactions;
CREATE POLICY "Users can view own inv txns" ON public.investment_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own inv txns" ON public.investment_transactions;
CREATE POLICY "Users can insert own inv txns" ON public.investment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own inv txns" ON public.investment_transactions;
CREATE POLICY "Users can update own inv txns" ON public.investment_transactions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own inv txns" ON public.investment_transactions;
CREATE POLICY "Users can delete own inv txns" ON public.investment_transactions FOR DELETE USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- migration: 20260301145810_e7c047bd-4bab-43ec-a314-41e1cb328255.sql
-- ──────────────────────────────────────────────────────────────

-- Tags table for transactions
CREATE TABLE IF NOT EXISTS public.transaction_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Junction table for transaction-tag relationships
CREATE TABLE IF NOT EXISTS public.transaction_tag_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.transaction_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, tag_id)
);

-- Favorite transactions (templates)
CREATE TABLE IF NOT EXISTS public.favorite_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  amount NUMERIC NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for transaction_tags
ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tags" ON public.transaction_tags;
CREATE POLICY "Users can view own tags" ON public.transaction_tags FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own tags" ON public.transaction_tags;
CREATE POLICY "Users can insert own tags" ON public.transaction_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own tags" ON public.transaction_tags;
CREATE POLICY "Users can update own tags" ON public.transaction_tags FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own tags" ON public.transaction_tags;
CREATE POLICY "Users can delete own tags" ON public.transaction_tags FOR DELETE USING (auth.uid() = user_id);

-- RLS for transaction_tag_links
ALTER TABLE public.transaction_tag_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tag links" ON public.transaction_tag_links;
CREATE POLICY "Users can view own tag links" ON public.transaction_tag_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_tag_links.transaction_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can insert own tag links" ON public.transaction_tag_links;
CREATE POLICY "Users can insert own tag links" ON public.transaction_tag_links FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_tag_links.transaction_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can delete own tag links" ON public.transaction_tag_links;
CREATE POLICY "Users can delete own tag links" ON public.transaction_tag_links FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_tag_links.transaction_id AND user_id = auth.uid())
);

-- RLS for favorite_transactions
ALTER TABLE public.favorite_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorite_transactions;
CREATE POLICY "Users can view own favorites" ON public.favorite_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorite_transactions;
CREATE POLICY "Users can insert own favorites" ON public.favorite_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own favorites" ON public.favorite_transactions;
CREATE POLICY "Users can update own favorites" ON public.favorite_transactions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorite_transactions;
CREATE POLICY "Users can delete own favorites" ON public.favorite_transactions FOR DELETE USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- migration: 20260315073139_03542cce-4a45-4f15-a58f-781b4bee297d.sql
-- ──────────────────────────────────────────────────────────────

-- Savings Goals table
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric NOT NULL DEFAULT 0,
  icon text DEFAULT '🎯',
  color text DEFAULT '#6366f1',
  deadline date,
  is_completed boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own goals" ON public.savings_goals;
CREATE POLICY "Users can view own goals" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own goals" ON public.savings_goals;
CREATE POLICY "Users can insert own goals" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own goals" ON public.savings_goals;
CREATE POLICY "Users can update own goals" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own goals" ON public.savings_goals;
CREATE POLICY "Users can delete own goals" ON public.savings_goals FOR DELETE USING (auth.uid() = user_id);


-- ✅ ตรวจผล: รายชื่อตารางทั้งหมดที่มีตอนนี้ (ควรเห็น ~20 ตาราง รวม liabilities, liability_payments)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;
