-- Create table to store bulk collection jobs
CREATE TABLE public.bulk_collection_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_clients INTEGER NOT NULL DEFAULT 0,
  processed_clients INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  interval_seconds INTEGER NOT NULL DEFAULT 15,
  clients_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_data JSONB DEFAULT '{}'::jsonb,
  current_index INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bulk_collection_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for seller access
CREATE POLICY "Sellers can view their own jobs" 
ON public.bulk_collection_jobs 
FOR SELECT 
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own jobs" 
ON public.bulk_collection_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own jobs" 
ON public.bulk_collection_jobs 
FOR UPDATE 
USING (auth.uid() = seller_id);

-- Create index for faster queries
CREATE INDEX idx_bulk_collection_jobs_seller_status ON public.bulk_collection_jobs(seller_id, status);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_collection_jobs;