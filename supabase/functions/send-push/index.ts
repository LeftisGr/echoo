import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface PushRequestBody {
  // Server-to-server (cron): trusted payload, may target "ALL".
  target_user_id?: string;
  // Client calls: send an event_type (+ room_id where needed) — NOT a target.
  event_type?: "admin_login_alert" | "match_found";
  room_id?: string;
  language?: "en" | "el";
  // Content (used only for cron; for client events the function sets its own copy).
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

// Επίτρεψε μόνο same-origin paths (anti-phishing) — κόβει absolute/external URLs.
function sanitizeUrl(url: string | undefined): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/";
  return url;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@echoo.gr";
  const cronSecret = Deno.env.get("CRON_SECRET");

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  // Service-role client (full access) για subscriptions + server-side target resolution.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: PushRequestBody;
  try {
    body = (await req.json()) as PushRequestBody;
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  // Trusted server-to-server call (cron/Sunday Nights): αναγνωρίζεται είτε από το
  // service-role key στο Authorization (το έχει μόνο η βάση/backend, ΠΟΤΕ ο client),
  // είτε — προαιρετικά — από ένα x-cron-secret. Έτσι το cron δουλεύει χωρίς αλλαγές.
  const rawAuth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const isCronCall =
    rawAuth === serviceKey ||
    (!!cronSecret && req.headers.get("x-cron-secret") === cronSecret);

  let targetUserIds: string[] | "ALL" = [];
  let title = "Echoo";
  let msgBody = "";
  let url = "/";
  let tag: string | undefined;

  if (isCronCall) {
    // ── Server-to-server (cron/Sunday Nights): εμπιστευόμαστε το payload, incl. "ALL".
    targetUserIds = body.target_user_id === "ALL"
      ? "ALL"
      : (body.target_user_id ? [body.target_user_id] : []);
    title = body.title ?? "Echoo";
    msgBody = body.body ?? "";
    url = sanitizeUrl(body.url);
    tag = body.tag;
  } else {
    // ── Client call: πρέπει να είναι authenticated χρήστης (verify JWT).
    // Ίδιο pattern με το `content` function που δουλεύει: getUser(token) πάνω
    // στον service-role client (δεν εξαρτάται από SUPABASE_ANON_KEY env).
    const { data: userResult, error: authError } = await admin.auth.getUser(rawAuth);
    const user = userResult?.user;
    if (authError || !user) {
      return json({ error: "unauthorized" }, 401);
    }

    const lang = body.language === "en" ? "en" : "el";

    if (body.event_type === "admin_login_alert") {
      // Ο server βρίσκει μόνος του τους admins (service role). Skip αν ο caller είναι admin.
      const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
      const adminIds = (admins ?? []).map((a: { id: string }) => a.id);
      if (adminIds.includes(user.id)) {
        return json({ sent: 0, skipped: "caller_is_admin" });
      }
      targetUserIds = adminIds;
      title = "Echoo 👀";
      msgBody = lang === "en" ? "Someone just joined — come in too!" : "Κάποιος μόλις μπήκε — μπες κι εσύ!";
      url = "/queue";
      tag = "admin-login-alert";
    } else if (body.event_type === "match_found") {
      const roomId = body.room_id;
      if (!roomId) return json({ error: "missing_room_id" }, 400);

      // Επιβεβαίωσε ότι ο caller είναι όντως συμμετέχων· target = ο ΑΛΛΟΣ συμμετέχων.
      const { data: room } = await admin
        .from("rooms")
        .select("user_a, user_b")
        .eq("id", roomId)
        .maybeSingle();
      if (!room) return json({ error: "room_not_found" }, 404);
      if (room.user_a !== user.id && room.user_b !== user.id) {
        return json({ error: "not_a_participant" }, 403);
      }
      const partnerId = room.user_a === user.id ? room.user_b : room.user_a;
      targetUserIds = [partnerId];
      title = "Echoo 📞";
      msgBody = lang === "en" ? "Someone is waiting for you." : "Κάποιος σε περιμένει.";
      url = `/session/${roomId}`;
      tag = "match";
    } else {
      return json({ error: "unknown_event_type" }, 400);
    }
  }

  // ── Φόρτωσε subscriptions για τα targets.
  const subsQuery = admin.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (targetUserIds !== "ALL") {
    if (targetUserIds.length === 0) return json({ sent: 0 });
    subsQuery.in("user_id", targetUserIds);
  }

  const { data: subs, error } = await subsQuery;
  if (error || !subs?.length) return json({ sent: 0 });

  const notification = JSON.stringify({ title, body: msgBody, url, tag });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification,
      );
      sent++;
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }

  return json({ sent });
});
