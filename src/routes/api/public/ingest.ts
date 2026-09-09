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

        // Ponytail: merge per top-level section, so a partial re-save (dropped
        // call resumed, final save with only deltas) can never wipe fields the
        // caller already gave. Sections present in the new record win.
        const conversationId = record["conversation_id"] as string;
        const { data: existing } = await supabaseAdmin
          .from("leads")
          .select("payload")
          .eq("conversation_id", conversationId)
          .maybeSingle();
        let merged: Record<string, unknown> = record;
        const prev = existing?.payload as Record<string, unknown> | null;
        if (prev && typeof prev === "object") {
          merged = { ...prev, ...record };
          // lead/readiness sub-objects: merge one level deep too (nulls in the
          // new record DO overwrite — that's the opt-out wipe case)
          for (const k of Object.keys(prev)) {
            if (
              k in record &&
              prev[k] && typeof prev[k] === "object" && !Array.isArray(prev[k]) &&
              record[k] && typeof record[k] === "object" && !Array.isArray(record[k])
            ) {
              merged[k] = {
                ...(prev[k] as object),
                ...(record[k] as object),
              };
            }
          }
        }

        const { error } = await supabaseAdmin.from("leads").upsert(
          {
            conversation_id: conversationId,
            payload: merged as any,
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
            body: JSON.stringify(merged),
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
