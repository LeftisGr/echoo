import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function log(message: string, data?: unknown) {
  if (data !== undefined) {
    console.info("[guest-bootstrap]", message, data);
    return;
  }

  console.info("[guest-bootstrap]", message);
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      log("missing configuration", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
        hasAnonKey: Boolean(anonKey),
      });
      return jsonResponse({ error: "Supabase configuration is missing." }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const auth = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = `guest-${crypto.randomUUID()}@presence.local`;
    const password = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;

    log("creating guest user", { email });

    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { is_guest: true },
    });

    if (createError) {
      log("create user failed", { error: createError.message });
      return jsonResponse({ error: createError.message }, 500);
    }

    log("guest user created", { userId: createdUser.user?.id ?? null });

    const { data: signInData, error: signInError } = await auth.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      log("sign in failed", { error: signInError?.message ?? "missing session" });
      return jsonResponse({
        error: signInError?.message ?? "Failed to create guest session.",
      }, 500);
    }

    log("guest session ready", {
      userId: signInData.session.user.id,
      expiresAt: signInData.session.expires_at,
    });

    return jsonResponse({
      email,
      password,
      session: signInData.session,
    });
  } catch (error) {
    log("unhandled error", { error: error instanceof Error ? error.message : String(error) });
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
