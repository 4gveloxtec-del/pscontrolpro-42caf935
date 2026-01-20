-- Add policy for admin to view all templates
CREATE POLICY "Admins can view all templates"
ON public.whatsapp_templates
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));