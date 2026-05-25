
-- Table: Investment holdings/portfolio
CREATE TABLE public.investments (
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

CREATE POLICY "Users can view own investments" ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investments" ON public.investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investments" ON public.investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own investments" ON public.investments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: Investment transactions (buy/sell/dividend/interest)
CREATE TABLE public.investment_transactions (
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

CREATE POLICY "Users can view own inv txns" ON public.investment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inv txns" ON public.investment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inv txns" ON public.investment_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inv txns" ON public.investment_transactions FOR DELETE USING (auth.uid() = user_id);
