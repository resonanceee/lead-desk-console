// Manutenzione: cancella lead per conversation_id (cleanup pre-valutazione).
// Accessibile solo con lo stesso HTP_INGEST_TOKEN nel header X-Admin-Token.
import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/cleanup")({
  server: {
    handlers: {
      OPTIONS: async () => new Response("ok", { headers: cors }),

      POST: async ({ request }) => {
        const token = process.env["HTP_INGEST_TOKEN"] ?? "";
        if (!token || request.headers.get("x-admin-token") !== token) {
          return json({ error: "non_autorizzato" }, 401);
        }
        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return json({ error: "json_non_valido" }, 400);
        }
        const ids = body["conversation_ids"];
        if (!Array.isArray(ids) || !ids.every((i) => typeof i === "string")) {
          return json({ error: "conversation_ids_invalidi" }, 400);
        }
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { error, count } = await supabaseAdmin
          .from("leads")
          .delete({ count: "exact" })
          .in("conversation_id", ids);
        return json({ ok: !error, deleted: count ?? 0 });
      },
    },
  },
});
