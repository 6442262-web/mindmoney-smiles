-- Add PIN hash field to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN pin_hash text NULL;