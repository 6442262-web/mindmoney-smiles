-- Create feedback table for user feedback
CREATE TABLE public.feedback (
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
CREATE POLICY "Users can view own feedback" 
ON public.feedback 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins/developers can view all feedback
CREATE POLICY "Admins can view all feedback" 
ON public.feedback 
FOR SELECT 
USING (public.is_admin_or_developer(auth.uid()));

-- Admins can update feedback status
CREATE POLICY "Admins can update feedback" 
ON public.feedback 
FOR UPDATE 
USING (public.is_admin_or_developer(auth.uid()));