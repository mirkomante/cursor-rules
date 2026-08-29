#!/usr/bin/env node
/**
 * tools/check-rules.js
 *
 * Verifica meccanica dei file .mdc in cursor-rules (processo-v2-operativo.md, §4.1).
 *
 * Sottocomandi (eseguiti in sequenza obbligata, mai in parallelo):
 *   check-schema  — frontmatter parsabile e conforme. Non richiede fixture.
 *   check-globs   — copertura reale dei pattern glob. Presuppone check-schema superato.
 *                   (non ancora implementato — task successivo di §4.1)
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

const REPO_ROOT = path.resolve(__dirname, '..');
const VALID_STATI = ['bozza', 'validato', 'superato'];
const SKIP_DIRS = new Set(['.git', 'node_modules', 'tools', '__fixtures__']);

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
// check-globs — placeholder
// ---------------------------------------------------------------------------

function runCheckGlobs() {
  console.log('check-globs: non ancora implementato.');
  console.log('Presuppone check-schema superato e la cartella __fixtures__/ (§4.1, task successivo).');
  process.exitCode = 2;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  const subcommand = process.argv[2];

  if (subcommand === 'check-schema') {
    runCheckSchema();
  } else if (subcommand === 'check-globs') {
    runCheckGlobs();
  } else {
    console.log('Uso: node tools/check-rules.js <check-schema|check-globs>');
    process.exitCode = 2;
  }
}

main();
