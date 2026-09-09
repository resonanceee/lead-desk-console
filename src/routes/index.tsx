import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function nextAction(p?: LeadPayload): { label: string; tone: string } {
  const cls = p?.readiness?.class ?? "";
  const booked = p?.appointment?.status === "booked" || p?.appointment?.status === "confermato";
  const blocker = p?.readiness?.blocker;
  if (p?.privacy?.opt_out || p?.outcome === "opt_out")
    return { label: "NON CONTATTARE", tone: "text-red-700" };
  switch (cls) {
    case "pronto_a_mandato":
      return booked
        ? { label: "Prepara visita", tone: "text-green-700" }
        : { label: "Prenotare visita", tone: "text-amber-700" };
    case "in_valutazione":
      return { label: "Ricontattare", tone: "text-amber-700" };
    case "vincolato":
      return { label: `Richiamare dopo: ${blocker ?? "vincolo"}`, tone: "text-orange-700" };
    case "esplorativo":
      return { label: "Nessuna azione urgente", tone: "text-gray-500" };
    case "non_lavorabile":
      return { label: "Archiviare", tone: "text-gray-500" };
    default:
      return { label: "—", tone: "text-gray-400" };
  }
}

type Evidence = { quote: string; turn: number };
// real cards: {id, zone, sqm, sold_price, price_per_sqm, sold_at}; seed rows: {address, price, sqm}
type Comparable = {
  id?: string;
  zone?: string;
  sqm?: number;
  sold_price?: number;
  price_per_sqm?: number;
  sold_at?: string;
  address?: string;
  price?: number;
};
// real cards: object; seed rows: plain string
type SaleProject =
  | string
  | {
      reason?: string | null;
      next_step?: string | null;
      already_found_new_home?: boolean;
      other_agency_mandate?: boolean;
      tried_selling_alone?: boolean;
    };

type LeadPayload = {
  lead: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    sqm?: number;
    floor?: number;
    elevator?: boolean;
    condition?: string;
    energy_class?: string;
    year_built?: number;
    ownership?: string;
  };
  readiness?: {
    class?: string;
    sale_project?: SaleProject;
    timeline_declared_months?: number | null;
    timeline_real_months?: number | null;
    blocker?: string | null;
    evidence?: Evidence[];
  };
  valuation?: {
    low?: number;
    high?: number;
    source?: string;
    comparables?: Comparable[];
  };
  appointment?: {
    agent_id?: string | null;
    slot?: string | null;
    status?: string;
    reason?: string | null;
  };
  outcome?: string;
  privacy?: {
    consent?: boolean;
    opt_out?: boolean;
    opt_out_history?: boolean;
    consent_reconfirmed?: boolean;
    consent_given?: boolean;
    recording_disclosed?: boolean;
    marketing_opt_in?: boolean;
  };
  transcript?: string;
};

type LeadRow = {
  conversation_id: string;
  payload: LeadPayload;
  updated_at: string;
};

const READINESS_STYLES: Record<string, { label: string; className: string }> = {
  pronto_a_mandato: {
    label: "Pronto a mandato",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  in_valutazione: {
    label: "In valutazione",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  vincolato: {
    label: "Vincolato",
    className: "bg-orange-100 text-orange-800 border-orange-300",
  },
  esplorativo: {
    label: "Esplorativo",
    className: "bg-gray-100 text-gray-700 border-gray-300",
  },
  non_lavorabile: {
    label: "Non lavorabile",
    className: "bg-red-100 text-red-800 border-red-300",
  },
};

const APPOINTMENT_LABELS: Record<string, string> = {
  booked: "Fissato",
  not_booked: "Non fissato",
  confermato: "Confermato",
  da_fissare: "Da fissare",
  non_fissato: "Non fissato",
  annullato: "Annullato",
  completato: "Completato",
};

const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateTimeFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function saleProjectLines(sp?: SaleProject): string[] {
  if (!sp) return [];
  if (typeof sp === "string") return [sp];
  const lines: string[] = [];
  if (sp.reason) lines.push(`Motivo: ${sp.reason}`);
  if (sp.next_step) lines.push(`Prossimo passo: ${sp.next_step}`);
  const flags: string[] = [];
  if (sp.already_found_new_home) flags.push("casa nuova già trovata");
  if (sp.other_agency_mandate) flags.push("mandato con altra agenzia");
  if (sp.tried_selling_alone) flags.push("ha provato a vendere da solo");
  if (flags.length) lines.push(flags.join(" · "));
  return lines;
}

function readinessBadge(cls?: string) {
  const style = READINESS_STYLES[cls ?? ""] ?? {
    label: cls ?? "—",
    className: "bg-gray-100 text-gray-700 border-gray-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function appointmentLabel(status?: string) {
  return status ? (APPOINTMENT_LABELS[status] ?? status) : "—";
}

function formatSlot(slot?: string | null) {
  if (!slot) return null;
  const d = new Date(slot);
  return Number.isNaN(d.getTime()) ? slot : dateTimeFmt.format(d);
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Console Lead Immobiliari" },
      {
        name: "description",
        content:
          "Console interna per l'agente immobiliare: coda e schede dei lead raccolti dal front desk vocale.",
      },
      { property: "og:title", content: "Console Lead Immobiliari" },
      {
        property: "og:description",
        content:
          "Console interna per l'agente immobiliare: coda e schede dei lead raccolti dal front desk vocale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: leads, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("conversation_id, payload, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadRow[];
    },
    refetchInterval: 30000,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>("");
  const filtered = leads?.filter(
    (l) => !classFilter || l.payload?.readiness?.class === classFilter,
  );
  const selected =
    filtered?.find((l) => l.conversation_id === selectedId) ?? filtered?.[0] ?? null;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">
            Console lead — Front desk vocale
          </h1>
          <p className="text-xs text-muted-foreground">
            {leads ? `${leads.length} lead in coda` : "Caricamento…"} ·
            aggiornata alle{" "}
            {dataUpdatedAt
              ? new Date(dataUpdatedAt).toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
          >
            <option value="">Tutte le classi</option>
            {Object.keys(READINESS_STYLES).map((k) => (
              <option key={k} value={k}>{READINESS_STYLES[k].label}</option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            Aggiorna
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Coda dei lead */}
        <aside className="w-96 shrink-0 overflow-y-auto border-r">
          {isLoading && (
            <p className="p-4 text-sm text-muted-foreground">
              Caricamento dei lead…
            </p>
          )}
          {error && (
            <p className="p-4 text-sm text-destructive">
              Errore nel caricamento dei lead.
            </p>
          )}
          {filtered?.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Nessun lead presente.
            </p>
          )}
          <ul>
            {filtered?.map((row) => {
              const active =
                row.conversation_id === selected?.conversation_id;
              return (
                <li key={row.conversation_id}>
                  <button
                    onClick={() => setSelectedId(row.conversation_id)}
                    className={`block w-full border-b px-4 py-3 text-left transition-colors ${
                      active ? "bg-accent" : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {row.payload?.lead?.name ?? "Senza nome"}
                      </span>
                      {readinessBadge(row.payload?.readiness?.class)}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{row.payload?.lead?.city ?? "—"}</span>
                      <span>
                        Appuntamento:{" "}
                        {appointmentLabel(row.payload?.appointment?.status)}
                      </span>
                    </div>
                    <div className={`mt-1 text-xs font-medium ${nextAction(row.payload).tone}`}>
                      {nextAction(row.payload).label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground/70">
                      Aggiornato:{" "}
                      {dateTimeFmt.format(new Date(row.updated_at))}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Scheda lead */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {selected ? (
            <LeadDetail row={selected} />
          ) : (
            !isLoading && (
              <p className="p-6 text-sm text-muted-foreground">
                Seleziona un lead dalla coda.
              </p>
            )
          )}
        </main>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b px-6 py-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function SaleProjectView({ sp }: { sp?: SaleProject }) {
  const lines = saleProjectLines(sp);
  if (!lines.length) return <>—</>;
  return (
    <span className="block space-y-0.5 font-normal">
      {lines.map((l, i) => (
        <span key={i} className="block">{l}</span>
      ))}
    </span>
  );
}

function TranscriptView({ transcript, evidence }: { transcript: string; evidence?: Evidence[] }) {
  const quotes = (evidence ?? []).map((e) => e.quote).filter(Boolean);
  // highlight every evidence quote occurrence (whitespace-tolerant)
  let parts: Array<{ text: string; hit: boolean }> = [{ text: transcript, hit: false }];
  const usedQuotes: string[] = [];
  for (const q of quotes) {
    if (usedQuotes.includes(q)) continue;
    usedQuotes.push(q);
    const next: typeof parts = [];
    const norm = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
    for (const part of parts) {
      if (part.hit) { next.push(part); continue; }
      let rest = part.text;
      for (;;) {
        const idx = norm(rest).indexOf(norm(q));
        if (idx === -1) break;
        if (idx > 0) next.push({ text: rest.slice(0, idx), hit: false });
        next.push({ text: rest.slice(idx, idx + q.length), hit: true });
        rest = rest.slice(idx + q.length);
      }
      if (rest) next.push({ text: rest, hit: false });
    }
    parts = next;
  }
  const wasHighlighted = new Set<string>();
  for (const part of parts) if (part.hit) wasHighlighted.add(part.text);
  return (
    <div className="space-y-3">
      {quotes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {wasHighlighted.size === quotes.length
            ? `${quotes.length} evidence evidenziate nel testo`
            : `${wasHighlighted.size}/${quotes.length} evidence trovate nel testo`}
        </p>
      )}
      <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-4 font-sans text-sm leading-relaxed">
        {parts.map((p, i) =>
          p.hit ? (
            <mark key={i} className="rounded-sm bg-yellow-200 px-0.5">{p.text}</mark>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </pre>
    </div>
  );
}

function LeadDetail({ row }: { row: LeadRow }) {
  const queryClient = useQueryClient();
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [revoking, setRevoking] = useState(false);
  const p = row.payload;
  const l = p?.lead ?? {};
  const r = p?.readiness;
  const v = p?.valuation;
  const a = p?.appointment;
  const privacy = p?.privacy;

  async function revokeConsent() {
    setRevoking(true);
    const newPayload = {
      ...(p as object),
      privacy: { ...(privacy as object ?? {}), opt_out: true },
    };
    await supabase
      .from("leads")
      .update({ payload: newPayload, updated_at: new Date().toISOString() })
      .eq("conversation_id", row.conversation_id);
    setRevoking(false);
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  }

  const sp = r?.sale_project && typeof r.sale_project === "object" ? r.sale_project : null;

  return (
    <div>
      <div className="border-b px-6 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">
            {l.name ?? "Senza nome"}
          </h2>
          {readinessBadge(r?.class)}
          <span className={`ml-auto text-sm font-semibold ${nextAction(p).tone}`}>
            {nextAction(p).label}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {l.address ?? "—"}, {l.city ?? "—"} · {l.phone ?? "—"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">
          Conversazione {row.conversation_id} · aggiornata{" "}
          {dateTimeFmt.format(new Date(row.updated_at))}
        </p>
      </div>

      <Section title="Pronto per la visita (lettura 2 minuti)">
        <dl className="grid grid-cols-1 gap-y-3 sm:grid-cols-2">
          <Field label="Perché vende" value={sp?.reason ?? undefined} />
          <Field label="Cosa succede dopo" value={sp?.next_step ?? undefined} />
          <Field
            label="Tempi"
            value={
              r?.timeline_declared_months != null || r?.timeline_real_months != null
                ? `dichiarati ${r?.timeline_declared_months ?? "?"} mesi · reali ${r?.timeline_real_months ?? (r?.blocker ? "non determinabili (vincolo)" : "?")}`
                : undefined
            }
          />
          <Field label="Vincolo" value={r?.blocker ?? "nessuno"} />
          <Field
            label="Appuntamento"
            value={
              a?.status
                ? `${appointmentLabel(a.status)}${a.agent_id ? ` · ${a.agent_id}` : ""}${a.slot ? ` · ${formatSlot(a.slot)}` : ""}`
                : undefined
            }
          />
          <Field
            label="Da chiedere per primo"
            value={
              r?.blocker
                ? `Stato del vincolo: ${r.blocker}`
                : "Conferma dati immobile e aspettative di prezzo"
            }
          />
        </dl>
        {a?.reason && (
          <p className="mt-3 text-sm text-muted-foreground">
            Motivo mancato appuntamento: {a.reason}
          </p>
        )}
      </Section>

      <Section title="Immobile">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Indirizzo" value={l.address} />
          <Field label="Città" value={l.city} />
          <Field
            label="Superficie"
            value={l.sqm != null ? `${l.sqm} mq` : undefined}
          />
          <Field
            label="Piano"
            value={l.floor != null ? String(l.floor) : undefined}
          />
          <Field
            label="Ascensore"
            value={
              l.elevator == null ? undefined : l.elevator ? "Sì" : "No"
            }
          />
          <Field label="Condizioni" value={l.condition} />
          <Field label="Classe energetica" value={l.energy_class} />
          <Field label="Anno di costruzione" value={l.year_built} />
          <Field label="Titolarità" value={l.ownership} />
        </dl>
      </Section>

      <Section title="Valutazione">
        <p className="text-lg font-semibold tabular-nums">
          {v?.low != null && v?.high != null
            ? `${eur.format(v.low)} – ${eur.format(v.high)}`
            : "—"}
        </p>
        {v?.source && (
          <p className="mt-1 text-xs text-muted-foreground">
            Fonte: {v.source}
          </p>
        )}
        {v?.comparables && v.comparables.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {v.comparables.map((c, i) => {
              const where = c.address ?? `${c.zone ?? "—"}${c.id ? ` (${c.id})` : ""}`;
              const price = c.sold_price ?? c.price;
              return (
                <li key={i} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{where}</span>
                  <span className="tabular-nums">
                    {price != null ? eur.format(price) : "—"}
                    {c.sqm != null ? ` · ${c.sqm} mq` : ""}
                    {c.price_per_sqm != null ? ` · ${eur.format(c.price_per_sqm)}/mq` : ""}
                    {c.sold_at ? ` · ${c.sold_at}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Readiness">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Classe" value={readinessBadge(r?.class)} />
          <Field label="Progetto di vendita" value={<SaleProjectView sp={r?.sale_project} />} />
          <Field
            label="Timeline dichiarata"
            value={
              r?.timeline_declared_months != null
                ? `${r.timeline_declared_months} mesi`
                : undefined
            }
          />
          <Field
            label="Timeline reale"
            value={
              r?.timeline_real_months != null
                ? `${r.timeline_real_months} mesi`
                : undefined
            }
          />
          <Field label="Blocco" value={r?.blocker ?? undefined} />
        </dl>
        {r?.evidence && r.evidence.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Evidence
            </p>
            {r.evidence.map((e, i) => {
              const inTranscript = !!p?.transcript && !!e.quote &&
                p.transcript.replace(/\s+/g, " ").toLowerCase()
                  .includes(e.quote.replace(/\s+/g, " ").toLowerCase());
              return (
                <button
                  key={i}
                  onClick={() => transcriptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  title={inTranscript ? "Vai al punto nella trascrizione" : "Citazione non trovata nella trascrizione"}
                  className="block w-full cursor-pointer rounded-md border-l-2 border-primary/60 bg-muted/50 px-3 py-2 text-left text-sm italic transition hover:bg-muted"
                >
                  “{e.quote}”
                  <span className="ml-2 text-xs not-italic text-muted-foreground">
                    — turno {e.turn} · {inTranscript ? "evidenziata ↓" : "non trovata nella trascrizione"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Appuntamento">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Stato" value={appointmentLabel(a?.status)} />
          <Field label="Agente" value={a?.agent_id ?? undefined} />
          <Field label="Slot" value={formatSlot(a?.slot) ?? undefined} />
          <Field label="Motivo" value={a?.reason ?? undefined} />
        </dl>
        {p?.outcome && (
          <p className="mt-3 text-sm">
            <span className="text-xs text-muted-foreground">Esito: </span>
            <span className="font-medium">{p.outcome}</span>
          </p>
        )}
      </Section>

      <Section title="Privacy">
        <div className="flex flex-wrap gap-2 text-xs">
          <PrivacyFlag
            label="Consenso al ricontatto"
            value={privacy?.consent ?? privacy?.consent_given}
          />
          <PrivacyFlag label="Opt-out" value={privacy?.opt_out} />
          <PrivacyFlag label="Opt-out passato" value={privacy?.opt_out_history} />
          <PrivacyFlag
            label="Consenso riconfermato"
            value={privacy?.consent_reconfirmed}
          />
          <PrivacyFlag
            label="Registrazione comunicata"
            value={privacy?.recording_disclosed}
          />
          <PrivacyFlag
            label="Consenso marketing"
            value={privacy?.marketing_opt_in}
          />
        </div>
        {!privacy?.opt_out && (
          <button
            onClick={revokeConsent}
            disabled={revoking}
            className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {revoking ? "Revoca in corso…" : "Revoca consenso (opt-out)"}
          </button>
        )}
      </Section>

      <div ref={transcriptRef}>
        <Section title="Trascrizione">
          {p?.transcript ? (
            <TranscriptView transcript={p.transcript} evidence={r?.evidence} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Nessuna trascrizione disponibile.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

function PrivacyFlag({
  label,
  value,
}: {
  label: string;
  value: boolean | undefined;
}) {
  if (value == null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${
        value
          ? "border-green-300 bg-green-50 text-green-800"
          : "border-gray-300 bg-gray-50 text-gray-600"
      }`}
    >
      {value ? "✓" : "✕"} {label}
    </span>
  );
}
