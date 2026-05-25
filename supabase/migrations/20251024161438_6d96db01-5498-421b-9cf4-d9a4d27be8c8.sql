-- Add date_of_birth and avatar_url to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;