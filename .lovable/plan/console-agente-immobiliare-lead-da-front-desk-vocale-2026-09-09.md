# Console agente immobiliare — lead da front desk vocale

## Cosa costruisco

Una console interna a pagina singola che legge i lead salvati dal front desk vocale e li mostra in due colonne: coda a sinistra, scheda completa a destra. Nessun login: la pagina è pubblica/anonima.

## Passi

1. **Attivare Lovable Cloud** (database integrato, nessuna configurazione esterna).

2. **Migrazione database** — tabella `leads`:
   - `conversation_id` text, primary key
   - `payload` jsonb
   - `updated_at` timestamptz, default `now()`
   - Permessi di lettura anonimi (GRANT SELECT a `anon` + policy RLS di sola lettura pubblica), visto che non c'è login.
   - Inserimento di alcuni lead di esempio nella migrazione, così la console mostra subito dati realistici (lead con readiness diverse, appuntamenti, transcript).

3. **Pagina unica `/`** — sostituisce il placeholder:
   - **Colonna sinistra — coda lead**: ordinata per `updated_at` decrescente. Ogni riga mostra nome, città, badge colorato di `readiness.class` (pronto_a_mandato verde, in_valutazione giallo, vincolato arancione, esplorativo grigio, non_lavorabile rosso) e `appointment.status`. Click seleziona il lead.
   - **Colonna destra — scheda lead selezionato**: tutti i campi di `payload.lead` (nome, telefono, indirizzo, città, mq, piano, ascensore, condizioni, classe energetica, anno costruzione, proprietà), forchetta di valutazione `valuation.low–high` formattata in euro con fonte e comparabili, classe di readiness con progetto di vendita, timeline dichiarata/reale e blocker, evidence con citazione e turno, stato appuntamento (slot, agente, motivo), flag privacy e trascrizione completa.
   - Lettura tramite server function pubblica (client publishable lato server + policy anon) o direttamente dal browser con il client pubblico; aggiornamento semplice via refresh/refetch.

4. **Stile**: strumento di lavoro interno sobrio, in italiano — tipografia pulita, colori neutri, badge come unico accento cromatico, niente effetti decorativi. Metadati SEO di base in italiano.

## Note tecniche

- Stack esistente: TanStack Start + Tailwind v4.
- `payload` resta un unico JSON: nessuna colonna separata per i campi interni.
- Nessuna autenticazione: niente `_authenticated`, niente middleware auth.
