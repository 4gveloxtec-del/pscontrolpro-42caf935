-- Update Sanplay's instance to match the Evolution API name
-- First, let's see all instances and their names
-- We'll add original_instance_name if it doesn't exist

-- Check if original_instance_name column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'whatsapp_seller_instances' 
        AND column_name = 'original_instance_name'
    ) THEN
        ALTER TABLE public.whatsapp_seller_instances 
        ADD COLUMN original_instance_name TEXT;
        
        COMMENT ON COLUMN public.whatsapp_seller_instances.original_instance_name IS 'Nome da instância como aparece na Evolution API (para casos de criação manual)';
    END IF;
END $$;

-- Update Sanplay's instance - find by partial match on instance_name containing the seller prefix
-- This sets original_instance_name to 'Sanplay' for any instance that might be his
UPDATE public.whatsapp_seller_instances
SET original_instance_name = 'Sanplay',
    updated_at = now()
WHERE instance_name LIKE 'seller_c4f9e3be%' 
   OR instance_name ILIKE '%sanplay%'
   OR original_instance_name ILIKE '%sanplay%';