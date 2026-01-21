/**
 * CHATBOT V3 - Arquitetura Modular Profissional
 * 
 * PRINCÍPIOS:
 * 1. Sem dependência de contexto anterior (stateless)
 * 2. Detecção por intenção (contains)
 * 3. Aceita números E texto como entrada
 * 4. Fácil de adicionar novos fluxos
 * 5. Nunca fica sem responder (fallback obrigatório)
 * 
 * ESTRUTURA:
 * - Gatilhos globais (menu, voltar, etc.)
 * - Menus hierárquicos (main -> submenus)
 * - Opções com keywords alternativas
 * - Variáveis dinâmicas ({empresa}, {pix}, etc.)
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== TYPES ==========
interface ChatbotConfig {
  is_enabled: boolean;
  fallback_message: string;
  welcome_message: string;
  response_delay_min: number;
  response_delay_max: number;
  typing_enabled: boolean;
  ignore_groups: boolean;
}

interface Menu {
  id: string;
  menu_key: string;
  title: string;
  message_text: string;
  image_url: string | null;
  parent_menu_key: string | null;
}

interface MenuOption {
  id: string;
  menu_id: string;
  option_number: number;
  option_text: string;
  keywords: string[];
  target_menu_key: string | null;
  action_type: string;
  action_response: string | null;
}

interface GlobalTrigger {
  id: string;
  trigger_name: string;
  keywords: string[];
  action_type: string;
  target_menu_key: string | null;
  response_text: string | null;
  priority: number;
}

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  current_menu_key: string;
  awaiting_human: boolean;
  interaction_count: number;
}

interface Variable {
  variable_key: string;
  variable_value: string;
}

interface GlobalConfig {
  api_url: string;
  api_token: string;
}

// ========== UTILITY FUNCTIONS ==========

function normalizeApiUrl(url: string): string {
  return url.replace(/\/manager\/?$/i, "").replace(/\/+$/, "");
}

function formatPhone(phone: string): string {
  let formatted = (phone || "").replace(/\D/g, "").split("@")[0];
  if (!formatted.startsWith("55") && (formatted.length === 10 || formatted.length === 11)) {
    formatted = `55${formatted}`;
  }
  if (formatted.startsWith("550")) {
    formatted = "55" + formatted.substring(3);
  }
  return formatted;
}

function extractPhone(remoteJid: string): string {
  return remoteJid.split("@")[0].replace(/\D/g, "");
}

function isGroupMessage(remoteJid: string): boolean {
  return remoteJid.includes("@g.us");
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

/**
 * Substitui variáveis no texto ({empresa}, {pix}, etc.)
 */
function replaceVariables(text: string, variables: Variable[]): string {
  if (!text || !variables) return text;
  let result = text;
  for (const v of variables) {
    const regex = new RegExp(`\\{${v.variable_key}\\}`, "gi");
    result = result.replace(regex, v.variable_value || "");
  }
  return result;
}

/**
 * Normaliza entrada do usuário para matching
 * - Lowercase
 * - Remove acentos
 * - Extrai número se começar com dígito
 * - Mapeia emojis numéricos
 */
function normalizeInput(input: string): { text: string; number: number | null } {
  const trimmed = input.toLowerCase().trim();
  
  // Mapeamento de emojis para números
  const emojiMap: Record<string, string> = {
    "1️⃣": "1", "2️⃣": "2", "3️⃣": "3", "4️⃣": "4", "5️⃣": "5",
    "6️⃣": "6", "7️⃣": "7", "8️⃣": "8", "9️⃣": "9", "0️⃣": "0",
  };
  
  // Texto com números por extenso
  const textNumbers: Record<string, number> = {
    "um": 1, "dois": 2, "tres": 3, "três": 3, "quatro": 4,
    "cinco": 5, "seis": 6, "sete": 7, "oito": 8, "nove": 9, "zero": 0,
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9,
  };
  
  // Checar emoji
  for (const [emoji, num] of Object.entries(emojiMap)) {
    if (trimmed.includes(emoji)) {
      return { text: trimmed, number: parseInt(num) };
    }
  }
  
  // Checar texto numérico
  if (textNumbers[trimmed] !== undefined) {
    return { text: trimmed, number: textNumbers[trimmed] };
  }
  
  // Checar se começa com número
  const numMatch = trimmed.match(/^(\d+)/);
  if (numMatch) {
    return { text: trimmed, number: parseInt(numMatch[1]) };
  }
  
  return { text: trimmed, number: null };
}

/**
 * Verifica se o texto contém alguma das keywords
 */
function matchesKeywords(text: string, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) return false;
  const normalizedText = text.toLowerCase().trim();
  return keywords.some(kw => normalizedText.includes(kw.toLowerCase()));
}

// ========== API FUNCTIONS ==========

async function sendTypingStatus(
  config: GlobalConfig,
  instanceName: string,
  phone: string,
  durationMs: number
): Promise<boolean> {
  try {
    const baseUrl = normalizeApiUrl(config.api_url);
    const formattedPhone = formatPhone(phone);
    
    const response = await fetch(`${baseUrl}/chat/sendPresence/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.api_token,
      },
      body: JSON.stringify({
        number: formattedPhone,
        presence: "composing",
        delay: durationMs,
      }),
    });
    
    if (response.ok) {
      await new Promise(r => setTimeout(r, durationMs));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function sendTextMessage(
  config: GlobalConfig,
  instanceName: string,
  phone: string,
  text: string
): Promise<boolean> {
  try {
    const baseUrl = normalizeApiUrl(config.api_url);
    const formattedPhone = formatPhone(phone);
    
    console.log(`[ChatbotV3] Sending to ${formattedPhone}: ${text.substring(0, 50)}...`);
    
    let response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.api_token,
      },
      body: JSON.stringify({ number: formattedPhone, text }),
    });
    
    // Retry com formatos alternativos se 400
    if (response.status === 400) {
      const alternates = [
        formattedPhone + "@s.whatsapp.net",
        formattedPhone.replace(/^55/, ""),
      ];
      
      for (const alt of alternates) {
        const retryResponse = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.api_token,
          },
          body: JSON.stringify({ number: alt, text }),
        });
        
        if (retryResponse.ok) {
          return true;
        }
      }
    }
    
    return response.ok;
  } catch (error) {
    console.error("[ChatbotV3] sendTextMessage error:", error);
    return false;
  }
}

async function sendImageMessage(
  config: GlobalConfig,
  instanceName: string,
  phone: string,
  text: string,
  imageUrl: string
): Promise<boolean> {
  try {
    const baseUrl = normalizeApiUrl(config.api_url);
    const formattedPhone = formatPhone(phone);
    
    const response = await fetch(`${baseUrl}/message/sendMedia/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.api_token,
      },
      body: JSON.stringify({
        number: formattedPhone,
        mediatype: "image",
        media: imageUrl,
        caption: text,
      }),
    });
    
    return response.ok;
  } catch {
    return false;
  }
}

// ========== CORE LOGIC ==========

interface ProcessResult {
  response: string;
  imageUrl?: string;
  newMenuKey: string;
  triggerMatched?: string;
  isFallback: boolean;
  isHuman: boolean;
}

/**
 * FUNÇÃO PRINCIPAL: Processa a mensagem do usuário
 * 
 * Ordem de prioridade:
 * 1. Gatilhos globais (menu, voltar, etc.)
 * 2. Opção numérica do menu atual
 * 3. Keyword match nas opções do menu atual
 * 4. Fallback
 */
function processMessage(
  messageText: string,
  currentMenuKey: string,
  triggers: GlobalTrigger[],
  menus: Menu[],
  options: MenuOption[],
  config: ChatbotConfig,
  variables: Variable[]
): ProcessResult {
  const { text: normalizedText, number: inputNumber } = normalizeInput(messageText);
  
  // 1. GATILHOS GLOBAIS (maior prioridade)
  const sortedTriggers = [...triggers].sort((a, b) => b.priority - a.priority);
  
  for (const trigger of sortedTriggers) {
    if (matchesKeywords(normalizedText, trigger.keywords)) {
      console.log(`[ChatbotV3] Trigger matched: ${trigger.trigger_name}`);
      
      if (trigger.action_type === "goto_menu" && trigger.target_menu_key) {
        const targetMenu = menus.find(m => m.menu_key === trigger.target_menu_key);
        if (targetMenu) {
          return {
            response: replaceVariables(targetMenu.message_text, variables),
            imageUrl: targetMenu.image_url || undefined,
            newMenuKey: targetMenu.menu_key,
            triggerMatched: trigger.trigger_name,
            isFallback: false,
            isHuman: false,
          };
        }
      }
      
      if (trigger.action_type === "message" && trigger.response_text) {
        return {
          response: replaceVariables(trigger.response_text, variables),
          newMenuKey: currentMenuKey,
          triggerMatched: trigger.trigger_name,
          isFallback: false,
          isHuman: false,
        };
      }
      
      if (trigger.action_type === "human") {
        return {
          response: "Aguarde, você será atendido por um de nossos atendentes. 👤",
          newMenuKey: currentMenuKey,
          triggerMatched: trigger.trigger_name,
          isFallback: false,
          isHuman: true,
        };
      }
    }
  }
  
  // Encontrar menu atual
  const currentMenu = menus.find(m => m.menu_key === currentMenuKey) || menus.find(m => m.menu_key === "main");
  if (!currentMenu) {
    return {
      response: replaceVariables(config.fallback_message, variables),
      newMenuKey: "main",
      isFallback: true,
      isHuman: false,
    };
  }
  
  // Opções do menu atual
  const menuOptions = options.filter(o => o.menu_id === currentMenu.id);
  
  // 2. MATCH POR NÚMERO
  if (inputNumber !== null) {
    const matchedOption = menuOptions.find(o => o.option_number === inputNumber);
    
    if (matchedOption) {
      return handleOptionMatch(matchedOption, menus, config, variables, currentMenuKey);
    }
  }
  
  // 3. MATCH POR KEYWORD
  for (const option of menuOptions) {
    if (option.keywords && matchesKeywords(normalizedText, option.keywords)) {
      return handleOptionMatch(option, menus, config, variables, currentMenuKey);
    }
  }
  
  // 4. FALLBACK - Mensagem não reconhecida
  console.log(`[ChatbotV3] No match found, sending fallback`);
  return {
    response: replaceVariables(config.fallback_message, variables),
    newMenuKey: currentMenuKey,
    isFallback: true,
    isHuman: false,
  };
}

function handleOptionMatch(
  option: MenuOption,
  menus: Menu[],
  config: ChatbotConfig,
  variables: Variable[],
  currentMenuKey: string
): ProcessResult {
  console.log(`[ChatbotV3] Option matched: ${option.option_number} - ${option.option_text}`);
  
  switch (option.action_type) {
    case "menu":
      if (option.target_menu_key) {
        const targetMenu = menus.find(m => m.menu_key === option.target_menu_key);
        if (targetMenu) {
          return {
            response: replaceVariables(targetMenu.message_text, variables),
            imageUrl: targetMenu.image_url || undefined,
            newMenuKey: targetMenu.menu_key,
            isFallback: false,
            isHuman: false,
          };
        }
      }
      break;
      
    case "message":
      return {
        response: replaceVariables(option.action_response || "Mensagem recebida!", variables),
        newMenuKey: currentMenuKey,
        isFallback: false,
        isHuman: false,
      };
      
    case "human":
      return {
        response: replaceVariables(option.action_response || "Aguarde, você será atendido por um de nossos atendentes. 👤", variables),
        newMenuKey: currentMenuKey,
        isFallback: false,
        isHuman: true,
      };
      
    case "end":
      return {
        response: replaceVariables(option.action_response || "Obrigado pelo contato! Até a próxima. 👋", variables),
        newMenuKey: "main",
        isFallback: false,
        isHuman: false,
      };
  }
  
  // Fallback se action_type não reconhecido
  return {
    response: replaceVariables(config.fallback_message, variables),
    newMenuKey: currentMenuKey,
    isFallback: true,
    isHuman: false,
  };
}

// ========== MAIN HANDLER ==========

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========== DIAGNOSTIC ENDPOINTS ==========
    if (req.method === "GET") {
      const url = new URL(req.url);
      
      if (url.searchParams.get("ping") === "true") {
        return new Response(
          JSON.stringify({ status: "ok", version: "3.0.0", message: "Chatbot V3 is online" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (url.searchParams.get("diagnose") === "true") {
        const { data: configs } = await supabase.from("chatbot_v3_config").select("user_id, is_enabled");
        const { data: menus } = await supabase.from("chatbot_v3_menus").select("user_id, menu_key").limit(20);
        const { data: triggers } = await supabase.from("chatbot_v3_triggers").select("user_id, trigger_name").limit(20);
        
        return new Response(
          JSON.stringify({
            status: "diagnostic",
            version: "3.0.0",
            configs: configs?.length || 0,
            menus: menus?.length || 0,
            triggers: triggers?.length || 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ status: "ok", version: "3.0.0", usage: "POST webhook payload" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== PARSE WEBHOOK PAYLOAD ==========
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalizar payload da Evolution API
    const event = payload.event || payload.type || "";
    const instanceName = payload.instance || payload.instanceName || payload.data?.instance?.instanceName || "";
    
    // Verificar se é evento de mensagem
    const messageEvents = ["messages.upsert", "message", "message.received"];
    const isMessageEvent = messageEvents.some(e => event.toLowerCase().includes(e.toLowerCase()));
    
    if (!isMessageEvent) {
      return new Response(
        JSON.stringify({ status: "ignored", reason: "Not a message event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extrair dados da mensagem
    const message = payload.data || payload.message || payload.messages?.[0];
    const remoteJid = message?.key?.remoteJid;
    const fromMe = message?.key?.fromMe === true;
    const pushName = message?.pushName || "";
    
    if (!remoteJid || !instanceName) {
      return new Response(
        JSON.stringify({ status: "ignored", reason: "No remoteJid or instance" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extrair texto da mensagem
    let messageText = 
      message?.message?.conversation ||
      message?.message?.extendedTextMessage?.text ||
      "";
    
    if (!messageText) {
      return new Response(
        JSON.stringify({ status: "ignored", reason: "No text content" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phone = extractPhone(remoteJid);

    // ========== FIND USER BY INSTANCE ==========
    // Primeiro verificar instância de seller
    let userId: string | null = null;
    
    const { data: sellerInstance } = await supabase
      .from("whatsapp_seller_instances")
      .select("seller_id")
      .ilike("instance_name", instanceName)
      .maybeSingle();
    
    if (sellerInstance) {
      userId = sellerInstance.seller_id;
    } else {
      // Verificar instância global (admin)
      const { data: globalConfig } = await supabase
        .from("whatsapp_global_config")
        .select("admin_user_id, instance_name")
        .eq("is_active", true)
        .maybeSingle();
      
      if (globalConfig && globalConfig.instance_name?.toLowerCase() === instanceName.toLowerCase()) {
        userId = globalConfig.admin_user_id;
      }
    }
    
    if (!userId) {
      return new Response(
        JSON.stringify({ status: "error", reason: "Instance not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== LOAD CHATBOT DATA ==========
    const [
      { data: config },
      { data: menus },
      { data: options },
      { data: triggers },
      { data: variables },
      { data: contact },
      { data: globalApiConfig },
    ] = await Promise.all([
      supabase.from("chatbot_v3_config").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("chatbot_v3_menus").select("*").eq("user_id", userId).eq("is_active", true),
      supabase.from("chatbot_v3_options").select("*").eq("user_id", userId).eq("is_active", true),
      supabase.from("chatbot_v3_triggers").select("*").eq("user_id", userId).eq("is_active", true),
      supabase.from("chatbot_v3_variables").select("variable_key, variable_value").eq("user_id", userId),
      supabase.from("chatbot_v3_contacts").select("*").eq("user_id", userId).eq("phone", phone).maybeSingle(),
      supabase.from("whatsapp_global_config").select("api_url, api_token").eq("is_active", true).maybeSingle(),
    ]);

    // Verificar se chatbot está habilitado
    if (!config?.is_enabled) {
      return new Response(
        JSON.stringify({ status: "ignored", reason: "Chatbot disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ignorar grupos se configurado
    if (config.ignore_groups && isGroupMessage(remoteJid)) {
      return new Response(
        JSON.stringify({ status: "ignored", reason: "Group message" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ignorar próprias mensagens
    if (fromMe) {
      return new Response(
        JSON.stringify({ status: "ignored", reason: "Own message" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!globalApiConfig) {
      return new Response(
        JSON.stringify({ status: "error", reason: "API not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar ou atualizar contato
    let currentMenuKey = contact?.current_menu_key || "main";
    let contactId = contact?.id;
    
    if (!contact) {
      const { data: newContact } = await supabase
        .from("chatbot_v3_contacts")
        .insert({
          user_id: userId,
          phone,
          name: pushName,
          current_menu_key: "main",
          last_message_at: new Date().toISOString(),
          interaction_count: 1,
        })
        .select("id")
        .single();
      
      contactId = newContact?.id;
    }

    // Se contato está aguardando humano, ignorar
    if (contact?.awaiting_human) {
      console.log(`[ChatbotV3] Contact awaiting human, ignoring`);
      return new Response(
        JSON.stringify({ status: "ignored", reason: "Awaiting human" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== PROCESS MESSAGE ==========
    const result = processMessage(
      messageText,
      currentMenuKey,
      triggers || [],
      menus || [],
      options || [],
      config as ChatbotConfig,
      variables || []
    );

    // ========== SEND RESPONSE ==========
    // Typing indicator
    if (config.typing_enabled) {
      const typingDuration = getRandomDelay(config.response_delay_min, config.response_delay_max);
      await sendTypingStatus(globalApiConfig, instanceName, phone, typingDuration);
    } else {
      await new Promise(r => setTimeout(r, getRandomDelay(config.response_delay_min, config.response_delay_max)));
    }

    // Send message
    let sent = false;
    if (result.imageUrl) {
      sent = await sendImageMessage(globalApiConfig, instanceName, phone, result.response, result.imageUrl);
    } else {
      sent = await sendTextMessage(globalApiConfig, instanceName, phone, result.response);
    }

    // ========== UPDATE DATABASE ==========
    const now = new Date().toISOString();
    
    // Update contact
    await supabase
      .from("chatbot_v3_contacts")
      .update({
        current_menu_key: result.newMenuKey,
        last_message_at: now,
        last_response_at: now,
        awaiting_human: result.isHuman,
        interaction_count: (contact?.interaction_count || 0) + 1,
        name: pushName || contact?.name,
      })
      .eq("user_id", userId)
      .eq("phone", phone);

    // Log interaction
    await supabase.from("chatbot_v3_logs").insert({
      user_id: userId,
      contact_phone: phone,
      incoming_message: messageText,
      response_sent: result.response.substring(0, 1000),
      menu_key: result.newMenuKey,
      trigger_matched: result.triggerMatched || null,
      was_fallback: result.isFallback,
    });

    return new Response(
      JSON.stringify({
        status: sent ? "sent" : "failed",
        menuKey: result.newMenuKey,
        triggerMatched: result.triggerMatched,
        isFallback: result.isFallback,
        isHuman: result.isHuman,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[ChatbotV3] Error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
