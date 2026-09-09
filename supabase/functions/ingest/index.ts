// ============================================================================
// La funzione che riceve i lead dal tuo agente vocale.
//
// Fa due cose, in questo ordine:
//   1. scrive la scheda nel TUO database, che e' quello che la tua console legge;
//   2. ne manda una copia alla piattaforma, che e' quello che legge il giudice.
//
// La copia e' la parte che non puoi saltare: alle 17:00 il giudice non viene a
// bussare al tuo progetto, legge quello che gli e' arrivato. Nella tua area sulla
// piattaforma vedi il contatore delle schede ricevute: se resta a zero mentre il tuo
// agente parla, il ciclo non si sta chiudendo e te ne accorgi subito.
//
// In Lovable: "crea una edge function chiamata ingest con questo codice", poi
// incolla il file. Il tool salva_lead del tuo agente ElevenLabs punta qui.
//
// Due variabili d'ambiente da mettere nel progetto:
//   HTP_INGEST_URL     lo trovi nella tua area sulla piattaforma
//   HTP_INGEST_TOKEN   idem, e' personale: identifica te
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const HTP_INGEST_URL = Deno.env.get('HTP_INGEST_URL') ?? '';
const HTP_INGEST_TOKEN = Deno.env.get('HTP_INGEST_TOKEN') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let record: Record<string, unknown>;
  try {
    record = await req.json();
  } catch {
    return json({ error: 'json_non_valido' }, 400);
  }

  // 1. il tuo database. Adatta i nomi delle colonne alla tua tabella: quello che
  //    conta e' che la tua console riesca a disegnare la coda e la scheda.
  const { error } = await supabase.from('leads').upsert({
    conversation_id: record.conversation_id,
    payload: record,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'conversation_id' });

  if (error) console.error('scrittura nel database fallita:', error.message);

  // 2. la copia alla piattaforma. Non blocca la risposta all'agente: se la copia
  //    fallisce lo si vede dal contatore, mentre far fallire la telefonata no.
  let copia = 'non configurata';
  if (HTP_INGEST_URL && HTP_INGEST_TOKEN) {
    try {
      const res = await fetch(HTP_INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ingest-Token': HTP_INGEST_TOKEN },
        body: JSON.stringify(record),
      });
      copia = res.ok ? 'inviata' : `rifiutata (${res.status})`;
      if (!res.ok) console.error('la piattaforma ha rifiutato la copia:', await res.text());
    } catch (e) {
      copia = 'non riuscita';
      console.error('copia alla piattaforma non riuscita:', String(e));
    }
  }

  return json({ ok: !error, copia_alla_piattaforma: copia });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
