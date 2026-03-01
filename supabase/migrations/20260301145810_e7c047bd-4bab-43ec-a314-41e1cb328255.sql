
-- Tags table for transactions
CREATE TABLE public.transaction_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Junction table for transaction-tag relationships
CREATE TABLE public.transaction_tag_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.transaction_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, tag_id)
);

-- Favorite transactions (templates)
CREATE TABLE public.favorite_transactions (
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
CREATE POLICY "Users can view own tags" ON public.transaction_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON public.transaction_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON public.transaction_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.transaction_tags FOR DELETE USING (auth.uid() = user_id);

-- RLS for transaction_tag_links
ALTER TABLE public.transaction_tag_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tag links" ON public.transaction_tag_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_tag_links.transaction_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own tag links" ON public.transaction_tag_links FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_tag_links.transaction_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own tag links" ON public.transaction_tag_links FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_tag_links.transaction_id AND user_id = auth.uid())
);

-- RLS for favorite_transactions
ALTER TABLE public.favorite_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorites" ON public.favorite_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON public.favorite_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own favorites" ON public.favorite_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorite_transactions FOR DELETE USING (auth.uid() = user_id);
