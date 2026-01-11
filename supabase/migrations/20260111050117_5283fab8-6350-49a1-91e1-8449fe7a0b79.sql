-- User Settings table
CREATE TABLE public.user_settings (
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
CREATE TABLE public.accounts (
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
CREATE TABLE public.categories (
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
CREATE TABLE public.transactions (
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
CREATE TABLE public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Liabilities table (debts, loans)
CREATE TABLE public.liabilities (
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
CREATE TABLE public.liability_payments (
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
CREATE TABLE public.account_transfers (
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
CREATE TABLE public.recurring_transactions (
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
CREATE TABLE public.recurring_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_id UUID NOT NULL REFERENCES public.recurring_transactions(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id),
  execution_date DATE NOT NULL,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
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
CREATE TABLE public.projects (
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
CREATE TABLE public.backup_logs (
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
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id);

-- Add recurring_id foreign key to transactions
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_recurring_id_fkey 
FOREIGN KEY (recurring_id) REFERENCES public.recurring_transactions(id);

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
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for accounts
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for categories
CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for keywords
CREATE POLICY "Users can view own keywords" ON public.keywords FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keywords" ON public.keywords FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keywords" ON public.keywords FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own keywords" ON public.keywords FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for liabilities
CREATE POLICY "Users can view own liabilities" ON public.liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own liabilities" ON public.liabilities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own liabilities" ON public.liabilities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own liabilities" ON public.liabilities FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for liability_payments (via liability ownership)
CREATE POLICY "Users can view own liability payments" ON public.liability_payments FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.liabilities WHERE liabilities.id = liability_payments.liability_id AND liabilities.user_id = auth.uid()));
CREATE POLICY "Users can insert own liability payments" ON public.liability_payments FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.liabilities WHERE liabilities.id = liability_payments.liability_id AND liabilities.user_id = auth.uid()));
CREATE POLICY "Users can update own liability payments" ON public.liability_payments FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.liabilities WHERE liabilities.id = liability_payments.liability_id AND liabilities.user_id = auth.uid()));
CREATE POLICY "Users can delete own liability payments" ON public.liability_payments FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.liabilities WHERE liabilities.id = liability_payments.liability_id AND liabilities.user_id = auth.uid()));

-- RLS Policies for account_transfers
CREATE POLICY "Users can view own transfers" ON public.account_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transfers" ON public.account_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transfers" ON public.account_transfers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transfers" ON public.account_transfers FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recurring_transactions
CREATE POLICY "Users can view own recurring" ON public.recurring_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring" ON public.recurring_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring" ON public.recurring_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring" ON public.recurring_transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recurring_executions (via recurring transaction ownership)
CREATE POLICY "Users can view own executions" ON public.recurring_executions FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.recurring_transactions WHERE recurring_transactions.id = recurring_executions.recurring_id AND recurring_transactions.user_id = auth.uid()));
CREATE POLICY "Users can insert own executions" ON public.recurring_executions FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.recurring_transactions WHERE recurring_transactions.id = recurring_executions.recurring_id AND recurring_transactions.user_id = auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for projects
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for backup_logs
CREATE POLICY "Users can view own backups" ON public.backup_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own backups" ON public.backup_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
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
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON public.keywords FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON public.liabilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recurring_transactions_updated_at BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_keywords_user_id ON public.keywords(user_id);
CREATE INDEX idx_liabilities_user_id ON public.liabilities(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_recurring_transactions_user_id ON public.recurring_transactions(user_id);