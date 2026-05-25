-- Create keywords table for user keyword management
CREATE TABLE public.keywords (
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
CREATE POLICY "Users can view their own keywords" 
ON public.keywords 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own keywords" 
ON public.keywords 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keywords" 
ON public.keywords 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keywords" 
ON public.keywords 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_keywords_updated_at
BEFORE UPDATE ON public.keywords
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_keywords_user_category ON public.keywords(user_id, category);
CREATE INDEX idx_keywords_usage_count ON public.keywords(usage_count DESC);