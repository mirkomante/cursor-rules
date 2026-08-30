#!/usr/bin/env node
/**
 * tools/check-rules.js
 *
 * Verifica meccanica dei file .mdc in cursor-rules (processo-v2-operativo.md, §4.1).
 *
 * Sottocomandi (eseguiti in sequenza obbligata, mai in parallelo):
 *   check-schema  — frontmatter parsabile e conforme. Non richiede fixture.
 *   check-globs   — copertura reale dei pattern glob contro __fixtures__/.
 *                   Presuppone check-schema superato. Usa minimatch (dipendenza
 *                   dichiarata in package.json — decisione esplicita: un matcher
 *                   scritto a mano rischiava di introdurre un proprio bug nello
 *                   script che dovrebbe aumentare l'affidabilità, non il contrario).
 *
 *   check-globs ha due modalità:
 *     - discovery (default, quando __fixtures__/expected-coverage.json non esiste):
 *       calcola la copertura reale e la stampa, senza giudicarla. La decisione
 *       su cosa sia "corretto" resta umana (verifica meccanica vs giudizio di
 *       validità, Boehm 1979/1984, §3 del processo) — lo script non inventa
 *       un'aspettativa, la mostra e aspetta conferma.
 *     - confronto (quando expected-coverage.json esiste): confronta la copertura
 *       attuale con quella confermata l'ultima volta, segnala derive (regole che
 *       hanno iniziato o smesso di coprire un file rispetto alla baseline).
 *     Flag --write-baseline: salva la copertura attuale come nuova baseline
 *     confermata. Da usare solo dopo revisione umana dell'output di discovery,
 *     mai come parte di un'esecuzione automatica.
 *
 * Schema verificato da check-schema (deciso esplicitamente in sessione, non dedotto
 * in autonomia — vedi commenti inline per il perché di ogni regola):
 *
 *   - Delimitatori YAML "---" aperti e chiusi correttamente.
 *   - Campi obbligatori presenti: description, globs, alwaysApply, stato.
 *   - description: stringa non vuota.
 *   - alwaysApply: booleano lowercase (true|false) — non stringa "True"/"False".
 *   - globs: stringa comma-separated (mai sintassi array "[...]").
 *       Vuoto ammesso SOLO se alwaysApply: true (tipo "Always" di Cursor: i globs
 *       sono ignorati comunque). Se alwaysApply: false, globs vuoto è un ERRORE:
 *       produrrebbe silenziosamente una regola "Agent Requested" o "Manual", cioè
 *       il tipo di guasto che questo script deve intercettare (file che Cursor non
 *       carica quando ci si aspetta che lo faccia). Il catalogo cursor-rules non
 *       usa oggi quei due tipi di regola — se in futuro servirà, si riapre la
 *       decisione esplicitamente, non si aggira il controllo in silenzio.
 *   - stato: uno tra bozza | validato | superato.
 *
 * Uso:
 *   node tools/check-rules.js check-schema
 *   node tools/check-rules.js check-globs   (placeholder, non implementato)
 */

const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');

const REPO_ROOT = path.resolve(__dirname, '..');
const VALID_STATI = ['bozza', 'validato', 'superato'];
const SKIP_DIRS = new Set(['.git', 'node_modules', 'tools', '__fixtures__']);
const FIXTURES_DIR = path.join(REPO_ROOT, '__fixtures__');
const BASELINE_PATH = path.join(FIXTURES_DIR, 'expected-coverage.json');

// ---------------------------------------------------------------------------
// Ricerca file .mdc
// ---------------------------------------------------------------------------

function findMdcFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results = results.concat(findMdcFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.mdc')) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Parsing frontmatter (parser minimale, non YAML generico: il frontmatter di
// questi file è sempre "chiave: valore" su una riga — non servono liste,
// oggetti annidati o valori multilinea. Un parser dedicato evita di aggiungere
// una dipendenza esterna per un formato così semplice, e fallisce in modo
// esplicito su qualunque riga che non capisce, invece di indovinare.)
// ---------------------------------------------------------------------------

function parseFrontmatter(content) {
  const errors = [];
  const lines = content.split(/\r?\n/);

  if (lines[0] !== '---') {
    errors.push('Delimitatore di apertura "---" mancante o non sulla prima riga');
    return { errors, fields: null };
  }

  let closingIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      closingIdx = i;
      break;
    }
  }
  if (closingIdx === -1) {
    errors.push('Delimitatore di chiusura "---" non trovato');
    return { errors, fields: null };
  }

  const fields = {};
  for (const line of lines.slice(1, closingIdx)) {
    if (line.trim() === '') continue;
    const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!m) {
      errors.push(`Riga di frontmatter non riconosciuta: "${line}"`);
      continue;
    }
    fields[m[1]] = m[2].trim();
  }

  return { errors, fields };
}

// ---------------------------------------------------------------------------
// Validazione di un singolo file secondo lo schema
// ---------------------------------------------------------------------------

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const problems = [];

  const { errors: parseErrors, fields } = parseFrontmatter(content);
  problems.push(...parseErrors);
  if (!fields) return problems; // frontmatter illeggibile, nessun altro controllo ha senso

  const required = ['description', 'globs', 'alwaysApply', 'stato'];
  for (const key of required) {
    if (!(key in fields)) {
      problems.push(`Campo obbligatorio mancante: "${key}"`);
    }
  }

  if ('description' in fields && fields.description === '') {
    problems.push('"description" è presente ma vuoto');
  }

  let alwaysApplyValue = null;
  if ('alwaysApply' in fields) {
    if (fields.alwaysApply === 'true' || fields.alwaysApply === 'false') {
      alwaysApplyValue = fields.alwaysApply === 'true';
    } else {
      problems.push(
        `"alwaysApply" deve essere booleano lowercase (true/false), trovato: "${fields.alwaysApply}"`
      );
    }
  }

  if ('globs' in fields) {
    const raw = fields.globs;
    if (raw.startsWith('[')) {
      problems.push('"globs" è in sintassi array YAML — deve essere una stringa comma-separated');
    } else if (raw === '' && alwaysApplyValue !== true) {
      problems.push(
        '"globs" è vuoto ma "alwaysApply" non è true — richiesto un valore non vuoto quando alwaysApply: false'
      );
    }
  }

  if ('stato' in fields && !VALID_STATI.includes(fields.stato)) {
    problems.push(`"stato" deve essere uno tra ${VALID_STATI.join(' | ')}, trovato: "${fields.stato}"`);
  }

  return problems;
}

// ---------------------------------------------------------------------------
// check-schema
// ---------------------------------------------------------------------------

function runCheckSchema() {
  const files = findMdcFiles(REPO_ROOT).sort();
  let totalProblems = 0;

  console.log(`check-schema: ${files.length} file .mdc trovati\n`);

  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file);
    const problems = validateFile(file);
    if (problems.length === 0) {
      console.log(`OK    ${rel}`);
    } else {
      totalProblems += problems.length;
      console.log(`FAIL  ${rel}`);
      for (const p of problems) console.log(`      - ${p}`);
    }
  }

  console.log('');
  if (totalProblems > 0) {
    console.log(`check-schema: FALLITO — ${totalProblems} problema/i trovato/i`);
    process.exitCode = 1;
  } else {
    console.log('check-schema: OK — tutti i file conformi');
    process.exitCode = 0;
  }
}

// ---------------------------------------------------------------------------
// check-globs
// ---------------------------------------------------------------------------

function findFixtureFiles(dir, base) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findFixtureFiles(full, base));
    } else if (entry.isFile()) {
      if (entry.name === 'expected-coverage.json') continue; // config, non una fixture
      const rel = path.relative(base, full).split(path.sep).join('/');
      results.push(rel);
    }
  }
  return results;
}

function getRuleGlobs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { fields } = parseFrontmatter(content);
  if (!fields || !('alwaysApply' in fields)) return null;
  if (fields.alwaysApply === 'true') return null; // globs ignorati da Cursor, niente da verificare
  if (!fields.globs) return [];
  return fields.globs.split(',').map((g) => g.trim()).filter(Boolean);
}

function computeCoverage(mdcFiles, fixtures) {
  const coverage = {}; // rel path regola -> array di fixture matchate
  for (const file of mdcFiles) {
    const rel = path.relative(REPO_ROOT, file);
    const globs = getRuleGlobs(file);
    if (globs === null) continue; // alwaysApply: true, esclusa dal check-globs
    const matched = fixtures.filter((fx) =>
      globs.some((pattern) => minimatch(fx, pattern, { dot: true }))
    );
    coverage[rel] = matched.sort();
  }
  return coverage;
}

function runCheckGlobs(writeBaseline) {
  if (!fs.existsSync(FIXTURES_DIR)) {
    console.log('check-globs: cartella __fixtures__/ non trovata.');
    process.exitCode = 2;
    return;
  }

  const fixtures = findFixtureFiles(FIXTURES_DIR, FIXTURES_DIR).sort();
  const mdcFiles = findMdcFiles(REPO_ROOT).sort();
  const coverage = computeCoverage(mdcFiles, fixtures);

  const hasBaseline = fs.existsSync(BASELINE_PATH);

  if (writeBaseline) {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(coverage, null, 2) + '\n');
    console.log(`check-globs: baseline scritta in ${path.relative(REPO_ROOT, BASELINE_PATH)}`);
    process.exitCode = 0;
    return;
  }

  if (!hasBaseline) {
    console.log(`check-globs: modalità discovery — nessuna baseline confermata (${path.relative(REPO_ROOT, BASELINE_PATH)} non esiste).\n`);
    console.log(`${fixtures.length} fixture, ${Object.keys(coverage).length} regole con glob concreti.\n`);
    for (const [rule, matched] of Object.entries(coverage)) {
      console.log(`${rule}`);
      if (matched.length === 0) {
        console.log('      (nessuna fixture coperta)');
      } else {
        for (const m of matched) console.log(`      + ${m}`);
      }
      console.log('');
    }
    console.log('Nessun giudizio automatico: rivedere questa copertura, poi rilanciare con --write-baseline per confermarla.');
    process.exitCode = 3;
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  let driftFound = false;

  console.log('check-globs: confronto con baseline confermata\n');

  const allRules = new Set([...Object.keys(baseline), ...Object.keys(coverage)]);
  for (const rule of [...allRules].sort()) {
    const before = new Set(baseline[rule] || []);
    const now = new Set(coverage[rule] || []);
    const added = [...now].filter((f) => !before.has(f));
    const removed = [...before].filter((f) => !now.has(f));
    if (added.length === 0 && removed.length === 0) {
      console.log(`OK    ${rule}`);
    } else {
      driftFound = true;
      console.log(`DRIFT ${rule}`);
      for (const f of removed) console.log(`      - non più coperto: ${f}`);
      for (const f of added) console.log(`      + coperto in più: ${f}`);
    }
  }

  console.log('');
  if (driftFound) {
    console.log('check-globs: FALLITO — copertura diversa dalla baseline confermata');
    process.exitCode = 1;
  } else {
    console.log('check-globs: OK — copertura invariata rispetto alla baseline');
    process.exitCode = 0;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  const subcommand = process.argv[2];

  if (subcommand === 'check-schema') {
    runCheckSchema();
  } else if (subcommand === 'check-globs') {
    const writeBaseline = process.argv.includes('--write-baseline');
    runCheckGlobs(writeBaseline);
  } else {
    console.log('Uso: node tools/check-rules.js <check-schema|check-globs>');
    process.exitCode = 2;
  }
}

main();
