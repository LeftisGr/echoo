import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function log(message: string, data?: unknown) {
  if (data !== undefined) {
    console.info("[cleanup-ephemeral-media]", message, data);
    return;
  }

  console.info("[cleanup-ephemeral-media]", message);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    log("missing configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    return new Response(JSON.stringify({ error: "Missing Supabase configuration." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const bucketName = "echoo-media";

  log("cleanup started", { bucketName });

  const { data: cleanupCount, error: cleanupError } = await admin.rpc("cleanup_expired_messages");
  if (cleanupError) {
    log("cleanup rpc failed", { error: cleanupError.message });
    return new Response(JSON.stringify({ error: cleanupError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: mediaRows, error: mediaRowsError } = await admin
    .from("messages")
    .select("media_bucket, media_path")
    .not("media_path", "is", null);

  if (mediaRowsError) {
    log("media rows query failed", { error: mediaRowsError.message });
    return new Response(JSON.stringify({ error: mediaRowsError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const livePathsByBucket = new Map<string, Set<string>>();
  for (const row of mediaRows ?? []) {
    const bucket = (row as { media_bucket?: string | null }).media_bucket ?? bucketName;
    const path = (row as { media_path?: string | null }).media_path;
    if (!path) {
      continue;
    }

    if (!livePathsByBucket.has(bucket)) {
      livePathsByBucket.set(bucket, new Set<string>());
    }

    livePathsByBucket.get(bucket)?.add(path);
  }

  let orphanCount = 0;
  const deletedOrphans: Array<{ bucket: string; path: string }> = [];

  for (const [bucket, livePaths] of livePathsByBucket.entries()) {
    const storage = admin.storage.from(bucket);
    const { data: roomFolders, error: folderError } = await storage.list("rooms", { limit: 1000 });
    if (folderError) {
      log("folder listing failed", { bucket, error: folderError.message });
      continue;
    }

    for (const folder of roomFolders ?? []) {
      const folderPath = `rooms/${folder.name}`;
      const { data: objects, error: objectError } = await storage.list(folderPath, { limit: 1000 });
      if (objectError) {
        log("object listing failed", { bucket, folderPath, error: objectError.message });
        continue;
      }

      const orphanPaths = (objects ?? [])
        .map((object) => `${folderPath}/${object.name}`)
        .filter((path) => !livePaths.has(path));

      if (!orphanPaths.length) {
        continue;
      }

      const { error: removeError } = await storage.remove(orphanPaths);
      if (removeError) {
        log("orphan removal failed", { bucket, orphanPaths, error: removeError.message });
        continue;
      }

      orphanCount += orphanPaths.length;
      deletedOrphans.push(...orphanPaths.map((path) => ({ bucket, path })));
      log("orphan files removed", { bucket, folderPath, orphanCount: orphanPaths.length });
    }
  }

  log("cleanup finished", {
    deletedExpiredRows: cleanupCount ?? 0,
    deletedOrphanFiles: orphanCount,
    deletedOrphans,
  });

  return new Response(
    JSON.stringify({
      deletedExpiredRows: cleanupCount ?? 0,
      deletedOrphanFiles: orphanCount,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
