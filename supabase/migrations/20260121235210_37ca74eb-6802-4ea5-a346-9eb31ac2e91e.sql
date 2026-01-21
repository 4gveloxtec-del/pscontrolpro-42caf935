-- Add column to profiles table to store client numbers visibility preference per seller
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hide_client_numbers boolean NOT NULL DEFAULT false;