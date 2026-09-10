# Casavo Voice Front Desk

An AI voice agent that answers homeowners who want to sell, understands how ready
they really are, prices the property through the Casavo valuation service, books a
visit with the right agent — and hands that agent a ready dossier. Built in one
day at Hack The Peak 2026 (Bolzano).

**Stack:** ElevenLabs (voice agent, Italian) · Casavo Mock API (listings,
valuations, agents, slots, booking) · Lovable Cloud (Supabase DB + console web app
+ API routes) · TypeScript / TanStack Start / React.

## How a call flows

```
Caller ──▶ ElevenLabs agent (system prompt: Casavo KB policies encoded)
             │  agenti_citta · cerca_immobile · valuta_immobile
             │  slot_liberi · prenota_appuntamento        (X-Participant-Key)
             ▼
          salva_lead ──▶ POST /api/public/ingest (Lovable app)
             │             1. upsert+merge into `leads` table
             │             2. transcript fallback via ElevenLabs API if omitted
             │             3. copy to event platform (X-Ingest-Token)
             ▼
          Console: queue · dossier · bilingual transcript · privacy controls
```

Design decisions that carry the weight:

- **Readiness over fields.** The agent reconstructs the sale project (reason,
  next step, what must happen first) and classifies the caller against the five
  Casavo maturity classes, distinguishing *declared* timeline from *real*
  timeline — with one to three literal caller quotes as evidence.
- **Policies as behavior.** Casavo never buys properties and makes no cash
  offers; ranges are always ranges, never promises; no third-party sales data;
  no booking for anyone who cannot actually sell; opt-out means purge.
- **Chaos-proofing the card.** The card is saved mid-call *and* at close
  (idempotent on `conversation_id`); the ingest route merges payload sections so
  a partial save never wipes data; opt-out is terminal (personal data purged, no
  merge); a missing transcript is fetched from the ElevenLabs API server-side.
- **Drop-and-resume by construction.** Same conversation → same card, updated.

## Repository layout

| Path | Content |
|---|---|
| `lovable-app/` | Console app + API routes (synced with Lovable) |
| `lovable-app/src/routes/api/public/ingest.ts` | Webhook endpoint: upsert/merge, purge, transcript fallback, platform copy |
| `lovable-app/src/routes/api/public/revoke.ts` | Operator-side consent revocation (purges) |
| `lovable-app/src/routes/api/public/cleanup.ts` | Admin batch delete (token-protected) |
| `lovable-app/src/routes/index.tsx` | Console UI: queue, dossier, evidence highlight, dual-language transcript |
| `elevenlabs/agent.json` | Agent definition (6 tools, cascade config, timezone) |
| `docs/system-prompt.md` | The system prompt (source of truth) |
| `docs/casavo-openapi.json` | Codified copy of the Mock API spec |
| `scripts/push-agent.sh` | Push prompt+config to prod and test agents |
| `scripts/el-tests.py` | Regression battery: 12 ElevenLabs-native simulation tests |
| `scripts/test-ingest.sh` `test-merge.sh` `read-leads.sh` | Loop/idempotency/merge checks + platform card reader |
| `scripts/seed-demo.sh` | Four-to-five well-formed demo leads covering every queue lane |
| `docs/submission.md` | Submission form content, feature proofs, free-zone text |
| `EXECUTION_PLAN.md` | The sprint plan used on the day |

## Running it locally

```bash
cp .env.example .env   # HTP_INGEST_TOKEN, INGEST_FUNCTION_URL,
                       # ELEVENLABS_API_KEY, AGENT_ID, SIM_AGENT_ID
scripts/push-agent.sh              # deploy prompt/config to ElevenLabs
scripts/test-ingest.sh             # C0 loop + idempotency
scripts/el-tests.py create --recreate && scripts/el-tests.py run
                                   # create + run the 12-scenario battery
```

## Regression battery

Twelve simulation tests created through the ElevenLabs agent-testing API
(`scripts/el-tests.py`), each with an Italian simulated caller and 3–5
LLM-graded success criteria: baseline seller · timeline trap · cash-offer
question · mid-call opt-out · non-owner caller · co-heir in disagreement ·
exploratory caller · range dispute · exclusive mandate · naive/elderly caller ·
manipulation & pressure · fabricated address. Re-run after any prompt change:

```bash
scripts/el-tests.py run            # all, concurrently
scripts/el-tests.py run --only "S4 opt-out"
```

## Findings from the scored run

The system scored **22/75** in the final automatic run, well below what the same
components demonstrated hours earlier in isolation. Reviewing the day, the loss
concentrates in the environment around the agent rather than in any single
missing feature:

**Test bookings drained the live slot pool.** The Mock API's appointment slots
are shared and finite — across **all 50+ teams** in the hackathon, not just ours.
Thirty-four real appointments were consumed while running our regression battery,
and every other team was consuming the same pool at the same time: by
mid-afternoon entire cities had no free slot within 72 hours. With fifty-plus
teams hammering one inventory, the pool at 17:00 was structurally exhausted
whoever you were. Scenarios whose reference answer was "booked" likely received
the policy fallback callback (the *correct* behavior for the state the pool was
in, but not the scored one). Booking should have been tested against a stub
from the start, with a single live booking kept as smoke test — and a shared
scarcity resource this visible should have been treated as infrastructure, not
data.

**One-shot card generation is fragile on long calls.** The full card schema is a
single large tool-call payload; on long conversations the final save repeatedly
failed to generate ("all LLM attempts exhausted"), precisely on the
resume-after-drop pattern that was known to be a scored scenario. Early mid-call
saves and a capped transcript mitigated it, but a cleaner split into compact
section tools (lead / readiness / appointment, merged server-side — the merge
logic already exists) would have removed the failure mode structurally.

**Migrating the LLM mid-event costs more than the deprecation it avoids.** A
deprecation notice prompted a switch to a preview model half-way through the
day; from then on, intermittent generation failures, one repeated closing
message and one pressure-induced booking error appeared. The model it replaced
remained available well past the event. Pin the model first, configure the
cascade on day one, and don't chase deprecations before their actual date.

**Date arithmetic is a hazard class.** Without a timezone injection the agent
invented day names for future dates; the fix (Europe/Rome `system__time` plus a
strict "repeat the slot exactly as returned" rule) works, but slots being a
scarce shared resource deserves the same mistrust as hallucination-prone
arithmetic.

**What held up.** The data loop (verified live end-to-end), the opt-out purge
path, the reassignment policy firing naturally in a real conversation, the
transcript fallback, and the twelve-scenario test harness itself — which caught
every regression listed above before 17:00 except the ones the environment
created on purpose.
