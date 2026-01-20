import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GlobalConfig {
  api_url: string;
  api_token: string;
  is_active: boolean;
}

// AES-256-GCM decryption - same logic as crypto Edge Function
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

async function getDecryptionKey(): Promise<CryptoKey> {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not configured');
  }
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
}

async function decryptValue(ciphertext: string): Promise<string> {
  try {
    if (!ENCRYPTION_KEY || !ciphertext) {
      return ciphertext || '';
    }
    
    // Check if the data looks like base64-encoded encrypted data
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(ciphertext) || ciphertext.length < 20) {
      // Data doesn't look encrypted, return as-is
      return ciphertext;
    }
    
    const key = await getDecryptionKey();
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    
    // Validate minimum length (12 bytes IV + at least some encrypted data)
    if (combined.length < 13) {
      return ciphertext;
    }
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.log('[decrypt] Failed to decrypt, returning original value:', error);
    // If decryption fails, the data might not be encrypted - return original
    return ciphertext;
  }
}

// Send message via Evolution API
async function sendEvolutionMessage(
  globalConfig: GlobalConfig,
  instanceName: string,
  phone: string,
  message: string
): Promise<boolean> {
  try {
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55') && (formattedPhone.length === 10 || formattedPhone.length === 11)) {
      formattedPhone = '55' + formattedPhone;
    }

    const url = `${globalConfig.api_url}/message/sendText/${instanceName}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': globalConfig.api_token,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    console.log(`Welcome message sent to ${formattedPhone}: ${response.ok}`);
    return response.ok;
  } catch (error) {
    console.error('Error sending welcome message:', error);
    return false;
  }
}

// Replace template variables
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

// Format date to DD/MM/YYYY
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clientId, sellerId } = await req.json();

    if (!clientId || !sellerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing clientId or sellerId' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-welcome-message] Processing welcome message for client ${clientId}`);

    // Get global config
    const { data: globalConfig } = await supabase
      .from('whatsapp_global_config')
      .select('*')
      .maybeSingle();

    if (!globalConfig || !globalConfig.is_active) {
      console.log('[send-welcome-message] WhatsApp API is inactive');
      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp API inactive' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get seller instance
    const { data: sellerInstance } = await supabase
      .from('whatsapp_seller_instances')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('is_connected', true)
      .eq('instance_blocked', false)
      .maybeSingle();

    if (!sellerInstance) {
      console.log('[send-welcome-message] Seller has no connected instance');
      return new Response(
        JSON.stringify({ success: false, error: 'No connected instance' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client data
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (!client || !client.phone) {
      console.log('[send-welcome-message] Client not found or has no phone');
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found or no phone' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CRITICAL: Decrypt login and password in backend before sending
    console.log('[send-welcome-message] Decrypting credentials...');
    const [decryptedLogin, decryptedPassword] = await Promise.all([
      decryptValue(client.login || ''),
      decryptValue(client.password || '')
    ]);
    console.log('[send-welcome-message] Credentials decrypted successfully');

    // Get seller profile
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sellerId)
      .single();

    // Get welcome template
    const categoryLower = (client.category || 'iptv').toLowerCase();
    const { data: templates } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('type', 'welcome');

    const template = templates?.find(t => t.name.toLowerCase().includes(categoryLower)) 
      || templates?.[0];

    if (!template) {
      console.log('[send-welcome-message] No welcome template found');
      return new Response(
        JSON.stringify({ success: false, error: 'No welcome template' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get MAC address - check gerencia_app_mac first, then from devices if available
    let macAddress = client.gerencia_app_mac || '';
    
    // If no gerencia_app_mac, try to get from gerencia_app_devices array
    if (!macAddress && client.gerencia_app_devices && Array.isArray(client.gerencia_app_devices)) {
      const deviceMacs = client.gerencia_app_devices
        .filter((d: { mac?: string }) => d && d.mac)
        .map((d: { mac: string }) => d.mac);
      if (deviceMacs.length > 0) {
        macAddress = deviceMacs.join(', ');
      }
    }

    // Replace variables in message - using DECRYPTED values
    const message = replaceVariables(template.message, {
      nome: client.name,
      empresa: sellerProfile?.company_name || sellerProfile?.full_name || '',
      login: decryptedLogin,         // Decrypted login
      senha: decryptedPassword,       // Decrypted password
      login_plain: decryptedLogin,    // Alias for backwards compatibility
      senha_plain: decryptedPassword, // Alias for backwards compatibility
      vencimento: formatDate(client.expiration_date),
      valor: String(client.plan_price || 0),
      plano: client.plan_name || '',
      servidor: client.server_name || '',
      pix: sellerProfile?.pix_key || '',
      servico: client.category || 'IPTV',
      dns: '',  // Remove DNS from message - always empty
      mac: macAddress,  // Add MAC address
    });

    // Send welcome message
    const sent = await sendEvolutionMessage(
      globalConfig as GlobalConfig,
      sellerInstance.instance_name,
      client.phone,
      message
    );

    if (sent) {
      // Log to message history
      await supabase.from('message_history').insert({
        client_id: clientId,
        seller_id: sellerId,
        phone: client.phone,
        message_content: message,
        message_type: 'welcome',
        template_id: template.id,
      });

      console.log(`[send-welcome-message] Welcome message sent to ${client.name}`);
    }

    return new Response(
      JSON.stringify({ success: sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[send-welcome-message] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
