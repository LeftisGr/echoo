import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.echoo.gr",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Rate limit: max N guest accounts ανά IP μέσα στο παράθυρο (anti mass-abuse).
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 ώρα

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("cf-connecting-ip") ?? "unknown"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase configuration is missing." }, 500)
  }

  const ip = getClientIp(req)
  const restHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  }

  // ── Rate limit ανά IP (fail-open: αν το check σκάσει, ΜΗΝ μπλοκάρεις legit guests).
  try {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
    const countRes = await fetch(
      `${supabaseUrl}/rest/v1/guest_bootstrap_log?ip=eq.${encodeURIComponent(ip)}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${RATE_LIMIT_MAX}`,
      { headers: restHeaders },
    )
    if (countRes.ok) {
      const rows = await countRes.json()
      if (Array.isArray(rows) && rows.length >= RATE_LIMIT_MAX) {
        return jsonResponse({ error: "rate_limited" }, 429)
      }
    }
  } catch {
    // ignore — fail-open
  }

  const email = `guest-${crypto.randomUUID()}@presence.local`
  const password = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "")

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: restHeaders,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        is_guest: true,
      },
    }),
  })

  if (!response.ok) {
    return jsonResponse({ error: await response.text() }, response.status)
  }

  // ── Κατέγραψε τη δημιουργία για το rate limit (μη-blocking — δεν ρίχνει το request).
  try {
    await fetch(`${supabaseUrl}/rest/v1/guest_bootstrap_log`, {
      method: "POST",
      headers: { ...restHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ ip }),
    })
  } catch {
    // ignore logging failures
  }

  return jsonResponse({ email, password })
})
