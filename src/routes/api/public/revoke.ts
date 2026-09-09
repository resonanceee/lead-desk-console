// Revoca consenso registrata dalla console (operatore umano).
// Stessa semantica dell'opt-out in chiamata: la scheda conserva solo lo stato
// di opt-out, i dati personali vengono eliminati.
import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/revoke")({
  server: {
    handlers: {
      OPTIONS: async () => new Response("ok", { headers: cors }),

      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return json({ error: "json_non_valido" }, 400);
        }
        const conversationId = body["conversation_id"];
        if (typeof conversationId !== "string" || !conversationId) {
          return json({ error: "conversation_id_mancante" }, 400);
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data: existing } = await supabaseAdmin
          .from("leads")
          .select("payload")
          .eq("conversation_id", conversationId)
          .maybeSingle();
        if (!existing) return json({ error: "lead_non_trovato" }, 404);

        const purged = {
          conversation_id: conversationId,
          outcome: "opt_out",
          readiness: { blocker: "opt_out_richiesto" },
          privacy: { opt_out: true, consent: false },
        };
        const { error } = await supabaseAdmin
          .from("leads")
          .update({ payload: purged, updated_at: new Date().toISOString() })
          .eq("conversation_id", conversationId);

        return json({ ok: !error });
      },
    },
  },
});
