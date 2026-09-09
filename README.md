# Agente Intelligente

Crea un'applicazione per la console di un agente immobiliare che riceve lead da un front desk vocale. Serve Lovable Cloud con database, nessun login.




Tabella `leads` con esattamente queste colonne:

- conversation_id (text, primary key)

- payload (jsonb)

- updated_at (timestamptz, default now())




`payload` contiene la scheda completa del lead come un unico JSON con questi campi di primo livello: lead (oggetto con name, phone, address, city, sqm, floor, elevator, condition, energy_class, year_built, ownership), readiness (class, sale_project, timeline_declared_months, timeline_real_months, blocker, evidence), valuation (low, high, source, comparables), appointment (agent_id, slot, status, reason), outcome, privacy, transcript. Non creare colonne separate per questi campi: stanno tutti dentro payload.




Poi una pagina sola con due colonne, che legge da `leads` interpretando `payload`:

- A sinistra: la coda dei lead, ordinata per updated_at decrescente. Per ogni lead mostra: name, city, readiness.class come badge colorato (pronto_a_mandato verde, in_valutazione giallo, vincolato arancione, esplorativo grigio, non_lavorabile rosso), e appointment.status.

- A destra: la scheda del lead selezionato con tutti i dati di payload.lead, la forchetta di valutazione (valuation.low–high formattata in euro), la classe di readiness, il progetto di vendita, le evidence con citazione e turno, lo stato dell'appuntamento, i flag di privacy e la trascrizione completa (transcript).

Stile sobrio da strumento di lavoro interno, in italiano.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8c1b19ab-2812-4b07-aed6-868287d837e6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
