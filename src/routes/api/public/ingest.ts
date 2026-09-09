// ============================================================================
// Endpoint che riceve i lead dall'agente vocale (tool salva_lead di ElevenLabs).
//
// Fa due cose, in questo ordine:
//   1. scrive la scheda nel database, che e' quello che la console legge;
//   2. ne manda una copia alla piattaforma, che e' quello che legge il giudice.
//
// Variabili d'ambiente (secrets del progetto):
//   HTP_INGEST_URL     dalla tua area sulla piattaforma
//   HTP_INGEST_TOKEN   personale: identifica te
// ============================================================================

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

export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      OPTIONS: async () => new Response("ok", { headers: cors }),

      POST: async ({ request }) => {
        let record: Record<string, unknown>;
        try {
          record = await request.json();
        } catch {
          return json({ error: "json_non_valido" }, 400);
        }

        if (
          typeof record["conversation_id"] !== "string" ||
          !record["conversation_id"]
        ) {
          return json({ error: "conversation_id_mancante" }, 400);
        }

        // 1. il database della console
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { error } = await supabaseAdmin.from("leads").upsert(
          {
            conversation_id: record["conversation_id"],
            payload: record as unknown as import("@supabase/supabase-js").Json,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "conversation_id" },
        );

        if (error) console.error("scrittura nel database fallita:", error.message);

        // 2. la copia alla piattaforma. Non blocca la risposta all'agente: se la
        //    copia fallisce lo si vede dal contatore, mentre far fallire la
        //    telefonata no.
        const HTP_INGEST_URL = process.env["HTP_INGEST_URL"] ?? "";
        const HTP_INGEST_TOKEN = process.env["HTP_INGEST_TOKEN"] ?? "";

        let copia = "non configurata";
        if (HTP_INGEST_URL && HTP_INGEST_TOKEN) {
          try {
            const res = await fetch(HTP_INGEST_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Ingest-Token": HTP_INGEST_TOKEN,
              },
              body: JSON.stringify(record),
            });
            copia = res.ok ? "inviata" : `rifiutata (${res.status})`;
            if (!res.ok)
              console.error(
                "la piattaforma ha rifiutato la copia:",
                await res.text(),
              );
          } catch (e) {
            copia = "non riuscita";
            console.error("copia alla piattaforma non riuscita:", String(e));
          }
        }

        return json({ ok: !error, copia_alla_piattaforma: copia });
      },
    },
  },
});
