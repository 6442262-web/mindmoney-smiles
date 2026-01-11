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