CREATE TABLE public.leads (
  conversation_id text PRIMARY KEY,
  payload jsonb,
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.leads TO anon;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lettura pubblica dei lead" ON public.leads FOR SELECT TO anon USING (true);

INSERT INTO public.leads (conversation_id, payload, updated_at) VALUES
('conv-20260908-0001', '{
  "lead": {"name": "Maria Rossi", "phone": "+39 333 1234567", "address": "Via dei Giardini 12", "city": "Milano", "sqm": 95, "floor": 3, "elevator": true, "condition": "buono", "energy_class": "C", "year_built": 1975, "ownership": "proprietà piena"},
  "readiness": {"class": "pronto_a_mandato", "sale_project": "Trasferimento in casa più piccola dopo il pensionamento", "timeline_declared_months": 3, "timeline_real_months": 3, "blocker": null, "evidence": [{"quote": "Vorrei concludere entro la primavera, la casa è già troppo grande per me", "turn": 7}, {"quote": "Ho già parlato con mio figlio, siamo tutti d''accordo sulla vendita", "turn": 12}]},
  "valuation": {"low": 340000, "high": 385000, "source": "comparabili zona Porta Venezia, Q2 2026", "comparables": [{"address": "Via Maiocchi 8", "price": 365000, "sqm": 92}, {"address": "Via Spallanzani 20", "price": 352000, "sqm": 98}]},
  "appointment": {"agent_id": "agente-bianchi", "slot": "2026-09-11T10:30:00+02:00", "status": "confermato", "reason": null},
  "outcome": "appuntamento_fissato",
  "privacy": {"consent_given": true, "recording_disclosed": true, "marketing_opt_in": false},
  "transcript": "Operatore: Buongiorno, sono il front desk dell''agenzia. Come posso aiutarla?\nMaria Rossi: Buongiorno, vorrei vendere il mio appartamento in Via dei Giardini.\nOperatore: Volentieri. Mi parli dell''immobile?\nMaria Rossi: È un 95 metri quadri al terzo piano, con ascensore. Costruito nel ''75, ma ristrutturato dieci anni fa.\nOperatore: Ha un''idea delle tempistiche?\nMaria Rossi: Vorrei concludere entro la primavera, la casa è già troppo grande per me.\nOperatore: Perfetto. Organizzo un sopralluogo con il nostro agente.\nMaria Rossi: Ho già parlato con mio figlio, siamo tutti d''accordo sulla vendita.\nOperatore: Le confermo giovedì 11 settembre alle 10:30 con l''agente Bianchi."
}'::jsonb, '2026-09-08T18:42:00+02:00'),
('conv-20260908-0002', '{
  "lead": {"name": "Giuseppe Ferri", "phone": "+39 347 9876543", "address": "Corso Trieste 45", "city": "Roma", "sqm": 120, "floor": 1, "elevator": false, "condition": "da ristrutturare", "energy_class": "G", "year_built": 1958, "ownership": "nuda proprietà"},
  "readiness": {"class": "in_valutazione", "sale_project": "Eredità da dividere tra fratelli", "timeline_declared_months": 6, "timeline_real_months": 9, "blocker": "Accordo tra eredi non ancora raggiunto", "evidence": [{"quote": "Devo ancora mettermi d''accordo con mia sorella sul prezzo minimo", "turn": 9}]},
  "valuation": {"low": 410000, "high": 465000, "source": "comparabili quartiere Trieste, Q3 2026", "comparables": [{"address": "Via Nomentana 210", "price": 448000, "sqm": 118}, {"address": "Corso Trieste 60", "price": 425000, "sqm": 112}]},
  "appointment": {"agent_id": "agente-verdi", "slot": null, "status": "da_fissare", "reason": "In attesa di allineamento tra gli eredi"},
  "outcome": "richiamare_due_settimane",
  "privacy": {"consent_given": true, "recording_disclosed": true, "marketing_opt_in": true},
  "transcript": "Operatore: Buonasera, mi dica.\nGiuseppe Ferri: Salve, ho ereditato un appartamento con mia sorella e stiamo pensando di venderlo.\nOperatore: Mi descriva l''immobile.\nGiuseppe Ferri: 120 metri al primo piano, senza ascensore. È del ''58 e va ristrutturato tutto.\nOperatore: C''è una tempistica in mente?\nGiuseppe Ferri: Sei mesi, forse. Devo ancora mettermi d''accordo con mia sorella sul prezzo minimo.\nOperatore: La ricontatto tra due settimane per fissare una valutazione, va bene?\nGiuseppe Ferri: Sì, meglio così."
}'::jsonb, '2026-09-08T20:15:00+02:00'),
('conv-20260909-0003', '{
  "lead": {"name": "Anna Colombo", "phone": "+39 335 5551234", "address": "Via Mazzini 3", "city": "Como", "sqm": 68, "floor": 2, "elevator": true, "condition": "ristrutturato", "energy_class": "B", "year_built": 2005, "ownership": "proprietà piena con usufrutto del genitore"},
  "readiness": {"class": "vincolato", "sale_project": "Vendita seconda casa sul lago", "timeline_declared_months": 12, "timeline_real_months": 12, "blocker": "Usufrutto vitalizio della madre, 84 anni", "evidence": [{"quote": "La casa è intestata a me ma c''è l''usufrutto di mia madre, quindi per ora è complicato", "turn": 6}, {"quote": "Volevo solo capire quanto potrebbe valere, non vendo domani", "turn": 11}]},
  "valuation": {"low": 265000, "high": 295000, "source": "comparabili centro Como, Q3 2026", "comparables": [{"address": "Via Volta 15", "price": 280000, "sqm": 70}, {"address": "Piazza Cavour 2", "price": 289000, "sqm": 72}]},
  "appointment": {"agent_id": null, "slot": null, "status": "non_fissato", "reason": "Vincolo di usufrutto: solo stima orientativa"},
  "outcome": "solo_valutazione_telefonica",
  "privacy": {"consent_given": true, "recording_disclosed": true, "marketing_opt_in": false},
  "transcript": "Operatore: Buongiorno.\nAnna Colombo: Buongiorno, chiamo per una stima di un bilocale a Como.\nOperatore: Certo, mi dia qualche dettaglio.\nAnna Colombo: 68 metri, secondo piano con ascensore, ristrutturato nel 2023.\nOperatore: Sta pensando di vendere?\nAnna Colombo: La casa è intestata a me ma c''è l''usufrutto di mia madre, quindi per ora è complicato.\nOperatore: Capisco. Posso comunque darle una forchetta di valore.\nAnna Colombo: Volevo solo capire quanto potrebbe valere, non vendo domani."
}'::jsonb, '2026-09-09T09:03:00+02:00'),
('conv-20260909-0004', '{
  "lead": {"name": "Luca Marchetti", "phone": "+39 320 7778899", "address": "Via Emilia Ponente 180", "city": "Bologna", "sqm": 55, "floor": 5, "elevator": true, "condition": "buono", "energy_class": "D", "year_built": 1988, "ownership": "in locazione con contratto 4+4 fino al 2027"},
  "readiness": {"class": "esplorativo", "sale_project": "Curiosità sul valore dell''investimento, nessuna vendita pianificata", "timeline_declared_months": null, "timeline_real_months": null, "blocker": "Immobile affittato fino al 2027", "evidence": [{"quote": "In realtà è affittato fino al 2027, volevo solo capire se mi conviene tenere", "turn": 8}]},
  "valuation": {"low": 185000, "high": 210000, "source": "comparabili Bolognina, Q3 2026", "comparables": [{"address": "Via Zanardi 40", "price": 198000, "sqm": 58}, {"address": "Via Emilia Ponente 220", "price": 192000, "sqm": 54}]},
  "appointment": {"agent_id": null, "slot": null, "status": "non_fissato", "reason": "Nessuna intenzione di vendita a breve"},
  "outcome": "newsletter_valutazioni_trimestrali",
  "privacy": {"consent_given": true, "recording_disclosed": true, "marketing_opt_in": true},
  "transcript": "Operatore: Pronto?\nLuca Marchetti: Salve, ho visto il vostro annuncio e mi chiedevo quanto vale il mio bilocale.\nOperatore: Volentieri. Dove si trova?\nLuca Marchetti: Bolognina, 55 metri, quinto piano con ascensore.\nOperatore: Sta valutando una vendita?\nLuca Marchetti: In realtà è affittato fino al 2027, volevo solo capire se mi conviene tenere.\nOperatore: Le lascio una stima indicativa e possiamo sentirci più avanti.\nLuca Marchetti: Perfetto, grazie."
}'::jsonb, '2026-09-09T10:27:00+02:00');