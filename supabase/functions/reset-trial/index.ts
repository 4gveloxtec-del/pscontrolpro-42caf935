import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Admin client for privileged DB writes
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body first
    const body = await req.json().catch(() => ({} as { user_id?: string; email?: string }));
    const { user_id, email } = body;

    const authHeader = req.headers.get("Authorization");
    
    // If we have an Authorization header, validate the user
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");

      // Client as the requesting user (JWT validation)
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
      if (userError || !userData?.user?.id) {
        console.log("[reset-trial] Invalid token", userError);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentUserId = userData.user.id;
      const targetUserId = user_id || currentUserId;

      // Only admins can reset trials for other users
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (roleError) {
        console.log("[reset-trial] role lookup error", roleError);
      }

      const isAdmin = roleData?.role === "admin";
      if (targetUserId !== currentUserId && !isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reset trial for target user
      const nowIso = new Date().toISOString();
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ created_at: nowIso })
        .eq("id", targetUserId);

      if (updateError) {
        console.log("[reset-trial] profile update error", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[reset-trial] Trial reset OK (authenticated)", { targetUserId, nowIso });
      return new Response(
        JSON.stringify({ success: true, created_at: nowIso, message: "Trial reset" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no auth header but we have email (admin tool call), find and reset by email
    if (email) {
      // Find user by email
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileError || !profile) {
        console.log("[reset-trial] Profile not found for email", email, profileError);
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const nowIso = new Date().toISOString();
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ created_at: nowIso })
        .eq("id", profile.id);

      if (updateError) {
        console.log("[reset-trial] profile update error", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[reset-trial] Trial reset OK (by email)", { email, id: profile.id, nowIso });
      return new Response(
        JSON.stringify({ success: true, created_at: nowIso, message: "Trial reset", user_id: profile.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No auth and no email
    console.log("[reset-trial] No authorization or email provided");
    return new Response(JSON.stringify({ error: "Unauthorized - provide auth token or email" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[reset-trial] Unhandled error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
