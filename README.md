# cursor-rules

Catalogo **master** di regole Cursor (`.mdc`) per progetti Next.js + PayloadCMS v3 con architettura a quattro aree: `(payload)`/Admin, `(app)` per i gestori dei dati, `(frontend)` pubblico, e API headless verso LP/siti/webapp esterne.

Questo repository **non è l'istanza di un progetto**: è la fonte da cui si **compone** la cartella `.cursor/rules/` di ogni nuovo progetto reale, scegliendo solo i file pertinenti tra invarianti universali e varianti tecniche (provider auth, provider email, database, ambiente cloud).

**`core/` è indipendente da Payload e dallo stack**: è scritto per qualunque progetto Cursor (React, Vue, un'app iOS, ecc.), non solo per questo pattern — puoi copiarlo così com'è anche in un progetto che non usa Payload. `payload-pattern/`, `auth/`, `email/` e `stack/` sono invece specifici di questo pattern architetturale.

Origine: estratto e generalizzato dal progetto Event Manager (sessione di analisi 2026-08-16).

## Struttura

```
core/               regole universali, valide per qualunque progetto Cursor, indipendenti dallo stack
  01-proporzionalita.mdc
  02-processo-lavoro-agente.mdc
  03-validazione-testing.mdc
  04-changelog-commit.mdc

payload-pattern/    regole del pattern Payload a 4 aree, sempre incluse se il progetto lo adotta
  01-architettura.mdc
  02-convenzioni-payload.mdc

auth/               invarianti sempre inclusi + UNA variante per progetto
  01-autenticazione-invarianti.mdc
  01a-google-oauth.mdc
  01a-*.mdc          (altri provider, stessa lettera = stesso asse "provider auth"; da scrivere quando servirà)

email/              invarianti sempre inclusi + UNA variante per progetto
  01-email-invarianti.mdc
  01a-resend.mdc
  01a-*.mdc          (altri provider, stessa lettera = stesso asse "provider email"; da scrivere quando servirà)

stack/              regole di stile universali + UNA variante per asse (DB, cloud)
  01-stile-codice.mdc         (include pnpm e shadcn/ui come standard fissi, non varianti)
  01a-db-mongodb.mdc
  01a-db-postgres.mdc          (da scrivere quando servirà — stessa lettera "a" = asse database)
  01b-cloud-gcp.mdc
  01b-cloud-azure.mdc          (da scrivere quando servirà — stessa lettera "b" = asse cloud)
  01b-cloud-aws.mdc            (da scrivere quando servirà)
```

## Convenzione di naming

- **La numerazione è locale a ciascuna cartella**, non una sequenza unica attraverso tutto il catalogo: ogni cartella riparte da `01`. Il numero indica l'ordine di lettura *dentro quella cartella*; la cartella stessa indica lo scope (universale / pattern Payload / variante). Cartelle diverse possono avere entrambe un file `01-*`, senza conflitto: sono percorsi distinti.
- **Suffisso lettera** (`a`, `b`, `c`…) = a quale **asse di variante** appartiene il file, non a quale opzione specifica. Tutte le opzioni alternative sullo stesso asse condividono la stessa lettera e si distinguono per nome (es. `01a-db-mongodb.mdc` e `01a-db-postgres.mdc` sono entrambe sull'asse "database" — lettera `a`; `01b-cloud-gcp.mdc` e `01b-cloud-azure.mdc` sono entrambe sull'asse "cloud" — lettera `b`). In un progetto reale se ne include **una sola per lettera/asse**.
- **File senza suffisso lettera** dentro una cartella "a scelta" (es. `01-autenticazione-invarianti.mdc`, `01-stile-codice.mdc`) = parte fissa, sempre inclusa a prescindere dalla variante scelta su quell'asse.
- **Le sottocartelle vanno mantenute anche in `.cursor/rules/` del progetto reale**, non appiattite in un'unica cartella. Una volta copiati, coesisteranno file con lo stesso prefisso numerico in cartelle diverse (es. `auth/01a-google-oauth.mdc`, `email/01a-resend.mdc`, `stack/01a-db-mongodb.mdc`): non è un conflitto, il nome completo li distingue — ma la convenzione "lettera = asse" vale solo *dentro* la cartella di origine, non come indice univoco su tutto il progetto. Cursor supporta sottocartelle in `.cursor/rules/`; non c'è motivo di appiattire.

## Come comporre `.cursor/rules/` per un nuovo progetto

Passo preliminare, prima della Fase 1 di sviluppo:

1. Copiare sempre tutto `core/` e tutto `payload-pattern/` (quest'ultimo solo se il progetto adotta l'architettura a 4 aree — altrimenti valutare caso per caso quali regole restano valide).
2. Scegliere una variante da `auth/` (oggi disponibile solo Google OAuth — `01a-google-oauth.mdc`).
3. Scegliere una variante da `email/` (oggi disponibile solo Resend — `01a-resend.mdc`).
4. Scegliere una variante da `stack/` per il DB (oggi solo MongoDB — `01a-db-mongodb.mdc`) e per il cloud (oggi solo GCP/Cloud Run — `01b-cloud-gcp.mdc`).
5. **Package manager e UI kit di base**: nessuna scelta da fare — pnpm e shadcn/ui sono fissi, inclusi direttamente in `01-stile-codice.mdc`. Se un progetto specifico impone un'alternativa per un vincolo esterno, annotarlo come deviazione locale nel file di quel progetto, non come nuova variante di catalogo, a meno che ricorra su più progetti.
6. Compilare i placeholder specifici di progetto (vedi sotto).
7. Copiare **solo** i file scelti dentro `.cursor/rules/` del progetto reale — non l'intero catalogo, **mantenendo la struttura a sottocartelle** (vedi "Convenzione di naming" sopra: non appiattire).

## Placeholder da compilare per ogni nuovo progetto

- `01-proporzionalita.mdc` — paragrafo di apertura: tipo di progetto, scala attesa, criticità, eventuali vincoli regolatori.
- *(lista aperta — aggiornare qui quando emergono altri placeholder durante la generalizzazione delle fasi 1-3)*

## Catalogo varianti — stato attuale

| Asse | Variante | File | Stato |
|---|---|---|---|
| Auth | Google OAuth + fallback locale super-admin | `01a-google-oauth.mdc` | ✅ pronta |
| Auth | Altro provider (Azure AD, Auth0, magic link…) | `01a-*.mdc` | 🔲 da scrivere quando servirà un progetto reale |
| DB | MongoDB | `01a-db-mongodb.mdc` | ✅ pronta |
| DB | PostgreSQL | `01a-db-postgres.mdc` | 🔲 da scrivere quando servirà |
| Cloud | Google Cloud Run | `01b-cloud-gcp.mdc` | ✅ pronta |
| Cloud | Azure | `01b-cloud-azure.mdc` | 🔲 da scrivere quando servirà |
| Cloud | AWS | `01b-cloud-aws.mdc` | 🔲 da scrivere quando servirà |
| Email | Resend | `01a-resend.mdc` | ✅ pronta |
| Email | Altro provider (SendGrid, Postmark…) | `01a-*.mdc` | 🔲 da scrivere quando servirà un progetto reale |
| Package manager | pnpm | incluso fisso in `01-stile-codice.mdc` | ✅ (non è una variante) |
| UI kit di base | shadcn/ui | incluso fisso in `01-stile-codice.mdc` | ✅ (non è una variante) |
| Containerizzazione | Dockerfile multi-stage + Node LTS | incluso fisso in `01-stile-codice.mdc` | ✅ (non è una variante, indipendente dal cloud) |

## Come aggiungere una nuova variante — checklist

- Verificare che sia richiesta da un **progetto reale in corso**, non scritta "per completezza" — il principio di proporzionalità (`01-proporzionalita.mdc`) vale anche per questo repository.
- Isolare cosa è invariante trasversale (resta nel file fisso, non va duplicato nella variante) da cosa è specifico della nuova opzione tecnica.
- Seguire la stessa struttura del file "gemello" già esistente sullo stesso asse (stesse sezioni, stesso livello di dettaglio).
- Aggiornare la tabella sopra con stato ✅ e data.
- Verificare che `02-processo-lavoro-agente.mdc` e gli altri file di `core/` restino generici senza bisogno di modifiche — dovrebbero già parlare per categoria ("database di produzione", "autenticazione esterna") e non per prodotto specifico.

## Decisioni prese e perché (log sintetico)

- **Struttura ad assi indipendenti**, non un mega-file condizionale ("se usi X allora Y"): riduce il rischio che l'agente applichi la regola sbagliata o si confonda su quale ramo vale per il progetto corrente. Il file esiste solo se la scelta è stata fatta per quel progetto. *(2026-08-16)*
- **Package manager (pnpm) tenuto fisso**, non trattato come variante: è una preferenza di workflow personale, non una caratteristica imposta dal progetto/cliente come lo sono spesso DB e cloud provider. *(2026-08-16)*
- **Nessuna variante scritta in anticipo** per opzioni non ancora richieste da un progetto reale (Postgres, Azure, AWS, provider auth alternativi): coerente con `01-proporzionalita.mdc`. *(2026-08-16)*
- `01-architettura.mdc` e `02-convenzioni-payload.mdc` erano già scritti in modo generico per il pattern Payload a 4 aree: nessuna modifica di sostanza necessaria oltre all'estrazione dal repo Event Manager. *(2026-08-16)*
- `02-processo-lavoro-agente.mdc`: gli esempi di "passaggi esterni" riformulati per categoria (database di produzione, autenticazione esterna, ambiente cloud, DNS) invece che per prodotto specifico, per restare validi senza bisogno di aggiornarli a ogni nuova variante aggiunta al catalogo. *(2026-08-16)*
- `04-changelog-commit.mdc` validato contro `00-come-eseguire-il-piano.md` di Event Manager: nessuna incoerenza; i riferimenti a path (`docs/piano-sviluppo/...`) restano validi perché fanno parte della struttura documentale che si sta standardizzando. *(2026-08-16)*
- **Rinumerazione a numerazione locale per cartella** (ogni cartella riparte da `01`), al posto della sequenza globale 01-08 ereditata da Event Manager: la sequenza globale mescolava file universali e file specifici del pattern Payload in un ordine che non rifletteva più la nuova organizzazione a cartelle. Contestualmente, `02-processo-lavoro-agente.mdc` (ex `06`) è stato ripulito da riferimenti hardcoded a `stack/`/`auth/`/nomi di file specifici di questo catalogo, per essere genuinamente riusabile anche fuori da progetti Payload (es. React, Vue, iOS). *(2026-08-16)*
- **shadcn/ui aggiunto allo stack fisso** in `01-stile-codice.mdc`, come pnpm: è la base dei componenti UI in ogni progetto di questo catalogo, non una variante per progetto. Librerie UI aggiuntive legate a una feature specifica (Tremor per dashboard, vaul per bottom sheet, sonner per toast) restano invece scelte da confermare quando la feature lo richiede, non stack fisso — coerente con la decisione, presa a proposito di Fase 1, che l'installazione di librerie UI non infrastrutturali non appartiene al setup di progetto ma alla fase/sessione in cui la feature viene introdotta. *(2026-08-16)*
- **Nuovo asse `email/`**, emerso analizzando Fase 2 (login): il provider email transazionale (Resend in Event Manager) non è invariante come inizialmente assunto, va trattato come auth/DB/cloud. Split in invarianti (`01-email-invarianti.mdc`: usare l'adapter Payload ufficiale, verificare sempre nella pratica la durata reale dei token invece di fidarsi della documentazione, agganciare via hook l'invio se `disableLocalStrategy` è attivo) e addendum Resend (`01a-resend.mdc`: pacchetto, variabili d'ambiente, limite noto sugli allegati CID, vincoli di piano prima di un invio massivo). *(2026-08-16)*
- **Containerizzazione (Dockerfile multi-stage + Node LTS) aggiunta allo stack fisso**, emerso analizzando Fase 3 (deploy): costruire il container non dipende da *quale* cloud lo ospiterà, solo la configurazione/deploy del servizio dipende dal provider — quindi la ricetta Docker resta invariante in `01-stile-codice.mdc`, mentre le varianti cloud (`01b-cloud-*.mdc`) coprono solo come si configura/deploya quel container sul provider scelto. *(2026-08-16)*
- **Glob allargati per auth/ ed email/**, dopo una revisione esterna (Cursor Composer): `middleware.ts`, `lib/session*`, `lib/auth*` aggiunti agli invarianti/addendum auth; `payload.config.ts` aggiunto agli invarianti/addendum email — i glob precedenti rischiavano di non far caricare la regola sui file dove la logica auth/email vive davvero. Aggiunta anche la nota esplicita sul mantenimento delle sottocartelle in `.cursor/rules/` del progetto reale (Convenzione di naming), non appiattirle. *(2026-08-17)*
- **Secondo giro di correzione glob auth**, dopo verifica del fix precedente (Cursor Composer): aggiunto `payload.config.ts` anche ai glob auth (stesso gap già risolto per email — è lì che si configurano le istanze del plugin OAuth, e nessuno dei glob precedenti lo intercettava); aggiunto `login/**` all'addendum Google OAuth per simmetria con gli invarianti, dato che la pagina di login custom contiene sia il bottone SSO sia il form locale nello stesso file. Aggiunto anche il rimando incrociato nel punto 7 della procedura di composizione, verso la nota sulle sottocartelle. *(2026-08-17)*

## Cosa manca ancora, fuori da questo repository

Le fasi 1-3 generalizzate, e i template di `00-piano-generale.md` / `00-come-eseguire-il-piano.md`, sono un lavoro separato (repository o cartella a parte per i template di piano-sviluppo), non fanno parte di questo catalogo di regole.
