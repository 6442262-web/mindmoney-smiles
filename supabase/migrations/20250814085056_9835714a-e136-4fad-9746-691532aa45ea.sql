-- Create user settings table for app configuration
CREATE TABLE public.user_settings (
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
CREATE POLICY "Users can view their own settings" 
ON public.user_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create categories table for expense/income categorization
CREATE TABLE public.categories (
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
CREATE POLICY "Users can view their own categories" 
ON public.categories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for categories
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
('00000000-0000-0000-0000-000000000000', 'เงินลงทุน', 'income', '#9B59B6', 'dollar-sign', true);

-- Function to copy default categories for new users
CREATE OR REPLACE FUNCTION public.copy_default_categories_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color, icon, is_default)
  SELECT NEW.id, name, type, color, icon, is_default
  FROM public.categories
  WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND is_default = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create backup logs table
CREATE TABLE public.backup_logs (
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
CREATE POLICY "Users can view their own backup logs" 
ON public.backup_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own backup logs" 
ON public.backup_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);