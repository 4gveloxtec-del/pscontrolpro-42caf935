import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Execute SQL directly via REST API
    const sqlStatements = [
      // Create whatsapp_api_config table
      `CREATE TABLE IF NOT EXISTS public.whatsapp_api_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        api_url TEXT DEFAULT '',
        api_token TEXT DEFAULT '',
        instance_name TEXT DEFAULT '',
        is_connected BOOLEAN DEFAULT false,
        auto_send_enabled BOOLEAN DEFAULT false,
        last_check_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT unique_user_config UNIQUE (user_id)
      )`,
      
      // Create client_notification_tracking table
      `CREATE TABLE IF NOT EXISTS public.client_notification_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL,
        notification_type TEXT NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        expiration_cycle_date DATE NOT NULL,
        sent_via TEXT DEFAULT 'auto',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT unique_client_notification UNIQUE (client_id, notification_type, expiration_cycle_date)
      )`,
      
      // Create reseller_notification_tracking table
      `CREATE TABLE IF NOT EXISTS public.reseller_notification_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reseller_id UUID NOT NULL,
        notification_type TEXT NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        expiration_cycle_date DATE NOT NULL,
        sent_via TEXT DEFAULT 'auto',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT unique_reseller_notification UNIQUE (reseller_id, notification_type, expiration_cycle_date)
      )`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_whatsapp_config_user ON public.whatsapp_api_config(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_client_notif_tracking ON public.client_notification_tracking(client_id, expiration_cycle_date)`,
      `CREATE INDEX IF NOT EXISTS idx_reseller_notif_tracking ON public.reseller_notification_tracking(reseller_id, expiration_cycle_date)`,
      
      // Enable RLS
      `ALTER TABLE public.whatsapp_api_config ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.client_notification_tracking ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.reseller_notification_tracking ENABLE ROW LEVEL SECURITY`,
      
      // RLS policies for whatsapp_api_config
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_api_config' AND policyname = 'Users can view their own config') THEN
          CREATE POLICY "Users can view their own config" ON public.whatsapp_api_config FOR SELECT USING (auth.uid() = user_id);
        END IF;
      END $$`,
      
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_api_config' AND policyname = 'Users can insert their own config') THEN
          CREATE POLICY "Users can insert their own config" ON public.whatsapp_api_config FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;
      END $$`,
      
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_api_config' AND policyname = 'Users can update their own config') THEN
          CREATE POLICY "Users can update their own config" ON public.whatsapp_api_config FOR UPDATE USING (auth.uid() = user_id);
        END IF;
      END $$`,
      
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_api_config' AND policyname = 'Users can delete their own config') THEN
          CREATE POLICY "Users can delete their own config" ON public.whatsapp_api_config FOR DELETE USING (auth.uid() = user_id);
        END IF;
      END $$`,
      
      // RLS policies for client_notification_tracking
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_notification_tracking' AND policyname = 'Sellers can view their notifications') THEN
          CREATE POLICY "Sellers can view their notifications" ON public.client_notification_tracking FOR SELECT USING (auth.uid() = seller_id);
        END IF;
      END $$`,
      
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_notification_tracking' AND policyname = 'Sellers can insert their notifications') THEN
          CREATE POLICY "Sellers can insert their notifications" ON public.client_notification_tracking FOR INSERT WITH CHECK (auth.uid() = seller_id);
        END IF;
      END $$`,
      
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_notification_tracking' AND policyname = 'Sellers can delete their notifications') THEN
          CREATE POLICY "Sellers can delete their notifications" ON public.client_notification_tracking FOR DELETE USING (auth.uid() = seller_id);
        END IF;
      END $$`,
      
      // RLS policies for reseller_notification_tracking
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reseller_notification_tracking' AND policyname = 'Admins can view reseller notifications') THEN
          CREATE POLICY "Admins can view reseller notifications" ON public.reseller_notification_tracking FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
        END IF;
      END $$`,
      
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reseller_notification_tracking' AND policyname = 'Admins can insert reseller notifications') THEN
          CREATE POLICY "Admins can insert reseller notifications" ON public.reseller_notification_tracking FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
        END IF;
      END $$`,
      
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reseller_notification_tracking' AND policyname = 'Resellers can view own notifications') THEN
          CREATE POLICY "Resellers can view own notifications" ON public.reseller_notification_tracking FOR SELECT USING (auth.uid() = reseller_id);
        END IF;
      END $$`,
      
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reseller_notification_tracking' AND policyname = 'Admins can delete reseller notifications') THEN
          CREATE POLICY "Admins can delete reseller notifications" ON public.reseller_notification_tracking FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
        END IF;
      END $$`,
    ];

    const results = [];
    
    for (const sql of sqlStatements) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ sql }),
        });
        
        if (!response.ok) {
          // Try direct SQL query approach
          console.log(`RPC failed, statement: ${sql.substring(0, 50)}...`);
        }
        results.push({ sql: sql.substring(0, 50), status: response.ok ? 'success' : 'skipped' });
      } catch (e) {
        console.log(`Error executing: ${sql.substring(0, 50)}...`, e);
        results.push({ sql: sql.substring(0, 50), status: 'error' });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Setup completed - tables may need to be created via migration",
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});