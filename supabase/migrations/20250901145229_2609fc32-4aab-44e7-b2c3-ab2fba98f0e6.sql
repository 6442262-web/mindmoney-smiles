-- Create comprehensive business mode tables

-- Business accounts table (enhanced from existing accounts table)
-- This will extend the current accounts table with business-specific features
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'personal';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS currency text DEFAULT 'THB';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS is_business boolean DEFAULT false;

-- Business profiles table for company information
CREATE TABLE public.business_profiles (
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
CREATE TABLE public.liabilities (
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
CREATE TABLE public.liability_payments (
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
CREATE TABLE public.documents (
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
CREATE TABLE public.business_categories (
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
CREATE TABLE public.projects (
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
CREATE TABLE public.account_transfers (
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
CREATE TABLE public.user_roles (
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
CREATE TABLE public.audit_log (
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
CREATE POLICY "Users can view their own business profiles" ON public.business_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business profiles" ON public.business_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profiles" ON public.business_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for liabilities
CREATE POLICY "Users can view their own liabilities" ON public.liabilities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own liabilities" ON public.liabilities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own liabilities" ON public.liabilities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liabilities" ON public.liabilities
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for liability_payments
CREATE POLICY "Users can view their own liability payments" ON public.liability_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own liability payments" ON public.liability_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for business_categories
CREATE POLICY "Users can view their own business categories" ON public.business_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business categories" ON public.business_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business categories" ON public.business_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business categories" ON public.business_categories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for account_transfers
CREATE POLICY "Users can view their own account transfers" ON public.account_transfers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own account transfers" ON public.account_transfers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own account transfers" ON public.account_transfers
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_roles (more complex - users can see roles for accounts they have access to)
CREATE POLICY "Users can view roles for their accounts" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR 
    account_id IN (
      SELECT account_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Account owners/admins can create user roles" ON public.user_roles
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT account_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Account owners/admins can update user roles" ON public.user_roles
  FOR UPDATE USING (
    account_id IN (
      SELECT account_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Account owners/admins can delete user roles" ON public.user_roles
  FOR DELETE USING (
    account_id IN (
      SELECT account_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for audit_log
CREATE POLICY "Users can view audit logs for their accounts" ON public.audit_log
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (account_id IS NOT NULL AND account_id IN (
      SELECT account_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ))
  );

CREATE POLICY "System can create audit logs" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_liabilities_updated_at
  BEFORE UPDATE ON public.liabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_categories_updated_at
  BEFORE UPDATE ON public.business_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

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
('00000000-0000-0000-0000-000000000000', 'ค่าใช้จ่ายสำนักงาน', 'expense', '6600', true);

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
  AND is_system = true;
  RETURN NEW;
END;
$$;