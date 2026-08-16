# cursor-rules

Catalogo **master** di regole Cursor (`.mdc`) per progetti Next.js + PayloadCMS v3 con architettura a quattro aree: `(payload)`/Admin, `(app)` per i gestori dei dati, `(frontend)` pubblico, e API headless verso LP/siti/webapp esterne.

Questo repository **non è l'istanza di un progetto**: è la fonte da cui si **compone** la cartella `.cursor/rules/` di ogni nuovo progetto reale, scegliendo solo i file pertinenti tra invarianti universali e varianti tecniche (provider auth, database, ambiente cloud).

Origine: estratto e generalizzato dal progetto Event Manager (sessione di analisi 2026-08-16).

## Struttura

```
core/               regole universali, valide per qualunque progetto Cursor, indipendenti dallo stack
  02-proporzionalita.mdc
  06-processo-lavoro-agente.mdc
  07-validazione-testing.mdc
  08-changelog-commit.mdc

payload-pattern/    regole del pattern Payload a 4 aree, sempre incluse se il progetto lo adotta
  01-architettura.mdc
  04-convenzioni-payload.mdc

auth/               invarianti sempre inclusi + UNA variante per progetto
  03-autenticazione-invarianti.mdc
  03a-google-oauth.mdc
  03b-*.mdc          (altri provider, da scrivere quando servirà)

stack/              regole di stile universali + UNA variante per asse (DB, cloud)
  05-stile-codice.mdc         (include pnpm come standard fisso, non variante)
  05a-db-mongodb.mdc
  05a-db-postgres.mdc          (da scrivere quando servirà)
  05b-cloud-gcp.mdc
  05b-cloud-azure.mdc          (da scrivere quando servirà)
  05b-cloud-aws.mdc            (da scrivere quando servirà)
```

## Convenzione di naming

- **Prefisso numerico stabile** = ordine logico di lettura/priorità concettuale (01 architettura, 02 proporzionalità, 03 autenticazione, ecc.).
- **Suffisso lettera** (`a`, `b`, `c`…) = variante alternativa sullo stesso asse, **mutuamente esclusiva**: in un progetto reale se ne include una sola per asse.
- **File senza suffisso lettera** dentro una cartella "a scelta" (es. `03-autenticazione-invarianti.mdc`, `05-stile-codice.mdc`) = parte fissa, sempre inclusa a prescindere dalla variante scelta.

## Come comporre `.cursor/rules/` per un nuovo progetto

Passo preliminare, prima della Fase 1 di sviluppo:

1. Copiare sempre tutto `core/` e tutto `payload-pattern/` (quest'ultimo solo se il progetto adotta l'architettura a 4 aree — altrimenti valutare caso per caso quali regole restano valide).
2. Scegliere una variante da `auth/` (oggi disponibile solo Google OAuth — `03a-google-oauth.mdc`).
3. Scegliere una variante da `stack/` per il DB (oggi solo MongoDB — `05a-db-mongodb.mdc`) e per il cloud (oggi solo GCP/Cloud Run — `05b-cloud-gcp.mdc`).
4. **Package manager**: nessuna scelta da fare — pnpm è fisso, incluso direttamente in `05-stile-codice.mdc`. Se un progetto specifico impone npm/yarn per un vincolo esterno, annotarlo come deviazione locale nel file di quel progetto, non come nuova variante di catalogo, a meno che ricorra su più progetti.
5. Compilare i placeholder specifici di progetto (vedi sotto).
6. Copiare **solo** i file scelti dentro `.cursor/rules/` del progetto reale — non l'intero catalogo.

## Placeholder da compilare per ogni nuovo progetto

- `02-proporzionalita.mdc` — paragrafo di apertura: tipo di progetto, scala attesa, criticità, eventuali vincoli regolatori.
- *(lista aperta — aggiornare qui quando emergono altri placeholder durante la generalizzazione delle fasi 1-3)*

## Catalogo varianti — stato attuale

| Asse | Variante | File | Stato |
|---|---|---|---|
| Auth | Google OAuth + fallback locale super-admin | `03a-google-oauth.mdc` | ✅ pronta |
| Auth | Altro provider (Azure AD, Auth0, magic link…) | `03b-*.mdc` | 🔲 da scrivere quando servirà un progetto reale |
| DB | MongoDB | `05a-db-mongodb.mdc` | ✅ pronta |
| DB | PostgreSQL | `05a-db-postgres.mdc` | 🔲 da scrivere quando servirà |
| Cloud | Google Cloud Run | `05b-cloud-gcp.mdc` | ✅ pronta |
| Cloud | Azure | `05b-cloud-azure.mdc` | 🔲 da scrivere quando servirà |
| Cloud | AWS | `05b-cloud-aws.mdc` | 🔲 da scrivere quando servirà |
| Package manager | pnpm | incluso fisso in `05-stile-codice.mdc` | ✅ (non è una variante) |

## Come aggiungere una nuova variante — checklist

- Verificare che sia richiesta da un **progetto reale in corso**, non scritta "per completezza" — il principio di proporzionalità (`02-proporzionalita.mdc`) vale anche per questo repository.
- Isolare cosa è invariante trasversale (resta nel file fisso, non va duplicato nella variante) da cosa è specifico della nuova opzione tecnica.
- Seguire la stessa struttura del file "gemello" già esistente sullo stesso asse (stesse sezioni, stesso livello di dettaglio).
- Aggiornare la tabella sopra con stato ✅ e data.
- Verificare che `06-processo-lavoro-agente.mdc` e gli altri file di `core/` restino generici senza bisogno di modifiche — dovrebbero già parlare per categoria ("database di produzione", "autenticazione esterna") e non per prodotto specifico.

## Decisioni prese e perché (log sintetico)

- **Struttura ad assi indipendenti**, non un mega-file condizionale ("se usi X allora Y"): riduce il rischio che l'agente applichi la regola sbagliata o si confonda su quale ramo vale per il progetto corrente. Il file esiste solo se la scelta è stata fatta per quel progetto. *(2026-08-16)*
- **Package manager (pnpm) tenuto fisso**, non trattato come variante: è una preferenza di workflow personale, non una caratteristica imposta dal progetto/cliente come lo sono spesso DB e cloud provider. *(2026-08-16)*
- **Nessuna variante scritta in anticipo** per opzioni non ancora richieste da un progetto reale (Postgres, Azure, AWS, provider auth alternativi): coerente con `02-proporzionalita.mdc`. *(2026-08-16)*
- `01-architettura.mdc` e `04-convenzioni-payload.mdc` erano già scritti in modo generico per il pattern Payload a 4 aree: nessuna modifica di sostanza necessaria oltre all'estrazione dal repo Event Manager. *(2026-08-16)*
- `06-processo-lavoro-agente.mdc`: gli esempi di "passaggi esterni" riformulati per categoria (database di produzione, autenticazione esterna, ambiente cloud, DNS) invece che per prodotto specifico, per restare validi senza bisogno di aggiornarli a ogni nuova variante aggiunta al catalogo. *(2026-08-16)*
- `08-changelog-commit.mdc` validato contro `00-come-eseguire-il-piano.md` di Event Manager: nessuna incoerenza; i riferimenti a path (`docs/piano-sviluppo/...`) restano validi perché fanno parte della struttura documentale che si sta standardizzando. *(2026-08-16)*

## Cosa manca ancora, fuori da questo repository

Le fasi 1-3 generalizzate, e i template di `00-piano-generale.md` / `00-come-eseguire-il-piano.md`, sono un lavoro separato (repository o cartella a parte per i template di piano-sviluppo), non fanno parte di questo catalogo di regole.
