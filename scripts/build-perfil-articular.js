#!/usr/bin/env node
/* Lee data/perfil-articular.csv (formato largo: una fila por ejercicio y articulación), lo valida contra el
 * catálogo (data/exercise-buckets.csv) y genera ifbb-pro-agent/js/perfilArticular.js (el módulo que carga la app;
 * GitHub Pages solo publica la carpeta ifbb-pro-agent/). DEC-021.
 *
 *   node scripts/build-perfil-articular.js           regenera el módulo
 *   node scripts/build-perfil-articular.js --check   falla si el módulo no coincide con el CSV
 *
 * Mismo formato de CSV que data/exercise-muscles.csv (coma o punto y coma, comillas, BOM, CRLF). */
'use strict';
const fs = require('fs');
const path = require('path');
const { parseCsv, detectDelimiter } = require('./build-exercise-muscles.js');

const COLUMNS = ['exerciseId', 'articulacion', 'nivel', 'evidencia', 'origen', 'ambiguo', 'fuente', 'notes', 'review_date'];
const JOINTS = ['lumbar', 'hombro', 'rodilla'];
const LEVELS = ['alta', 'media', 'baja'];
// Una clasificación de demanda articular nunca llega a `verificado` (esa etiqueta exige medir hipertrofia).
const EVIDENCE = ['probable', 'a_verificar'];
const ORIGINS = ['spec_inicial', 'criterio_e4'];
const AMBIGUOUS = ['si', 'no'];

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'data', 'perfil-articular.csv');
const BUCKETS_PATH = path.join(ROOT, 'data', 'exercise-buckets.csv');
const MODULE_PATH = path.join(ROOT, 'ifbb-pro-agent', 'js', 'perfilArticular.js');

// Devuelve { rows, errors }. `catalogIds` = ids del catálogo: cada uno debe tener las tres articulaciones, y ninguna
// fila puede ser de un ejercicio que no existe (un ejercicio sin perfil no puede pasar en silencio).
function parsePerfilArticular(text, catalogIds) {
  const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const table = parseCsv(text, detectDelimiter(clean));
  const errors = [];
  if (!table.length) return { rows: [], errors: ['El CSV está vacío'] };
  const header = table[0].map(h => h.trim());
  const missing = COLUMNS.filter(c => !header.includes(c));
  const extra = header.filter(c => c !== '' && !COLUMNS.includes(c));
  if (missing.length) errors.push(`Faltan columnas: ${missing.join(', ')}`);
  if (extra.length) errors.push(`Columnas desconocidas: ${extra.join(', ')}`);
  if (missing.length) return { rows: [], errors };
  const idx = Object.fromEntries(COLUMNS.map(c => [c, header.indexOf(c)]));
  const rows = [], seen = new Set();
  table.slice(1).forEach((cells, n) => {
    const get = c => (cells[idx[c]] === undefined ? '' : cells[idx[c]]).trim();
    const row = Object.fromEntries(COLUMNS.map(c => [c, get(c)]));
    const where = `fila ${n + 2} (${row.exerciseId || 'sin exerciseId'}, ${row.articulacion || 'sin articulacion'})`;
    if (!row.exerciseId) errors.push(`${where}: exerciseId vacío`);
    if (catalogIds && row.exerciseId && !catalogIds.includes(row.exerciseId)) errors.push(`${where}: el ejercicio no existe en el catálogo`);
    if (!JOINTS.includes(row.articulacion)) errors.push(`${where}: articulacion inválida "${row.articulacion}" (${JOINTS.join(', ')})`);
    if (!LEVELS.includes(row.nivel)) errors.push(`${where}: nivel inválido "${row.nivel}" (${LEVELS.join(', ')})`);
    if (!EVIDENCE.includes(row.evidencia)) errors.push(`${where}: evidencia inválida "${row.evidencia}" (${EVIDENCE.join(', ')})`);
    if (row.evidencia === 'probable' && !row.fuente) errors.push(`${where}: probable sin fuente`);
    if (!ORIGINS.includes(row.origen)) errors.push(`${where}: origen inválido "${row.origen}" (${ORIGINS.join(', ')})`);
    if (!AMBIGUOUS.includes(row.ambiguo)) errors.push(`${where}: ambiguo inválido "${row.ambiguo}" (si o no)`);
    if (row.ambiguo === 'si' && !row.notes) errors.push(`${where}: una fila ambigua necesita una nota con el motivo`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.review_date) || isNaN(Date.parse(row.review_date))) errors.push(`${where}: review_date debe ser AAAA-MM-DD, no "${row.review_date}"`);
    const key = `${row.exerciseId}|${row.articulacion}`;
    if (seen.has(key)) errors.push(`${where}: fila repetida para ese ejercicio y articulación`);
    seen.add(key);
    rows.push(row);
  });
  if (catalogIds) {
    catalogIds.forEach(id => JOINTS.forEach(j => { if (!seen.has(`${id}|${j}`)) errors.push(`${id}: falta el perfil de ${j} (todo el catálogo lleva perfil articular)`); }));
  }
  return { rows, errors };
}

function catalogIdsFromBuckets(bucketsText) {
  const clean = bucketsText.charCodeAt(0) === 0xFEFF ? bucketsText.slice(1) : bucketsText;
  return parseCsv(bucketsText, detectDelimiter(clean)).slice(1).map(r => (r[0] || '').trim()).filter(Boolean);
}

function buildModuleSource(rows) {
  return [
    '/* GENERADO por scripts/build-perfil-articular.js a partir de data/perfil-articular.csv (DEC-021).',
    ' * No editar a mano: cambiar el CSV y volver a correr `node scripts/build-perfil-articular.js`.',
    ' * Un test comprueba que este archivo coincide con el CSV. */',
    '(function (root, factory) {',
    "  if (typeof module === 'object' && module.exports) module.exports = factory();",
    '  else root.PERFIL_ARTICULAR = factory();',
    "})(typeof self !== 'undefined' ? self : this, function () {",
    "  'use strict';",
    '  return {',
    "    source: 'data/perfil-articular.csv',",
    '    rows: [',
    rows.map(r => '    ' + JSON.stringify(r)).join(',\n'),
    '    ],',
    '  };',
    '});',
    '',
  ].join('\n');
}

function buildFromCsvText(text, catalogIds) {
  const parsed = parsePerfilArticular(text, catalogIds);
  if (parsed.errors.length) {
    const e = new Error('data/perfil-articular.csv inválido:\n - ' + parsed.errors.join('\n - '));
    e.errors = parsed.errors;
    throw e;
  }
  return buildModuleSource(parsed.rows);
}

if (require.main === module) {
  try {
    const source = buildFromCsvText(fs.readFileSync(CSV_PATH, 'utf8'), catalogIdsFromBuckets(fs.readFileSync(BUCKETS_PATH, 'utf8')));
    if (process.argv.includes('--check')) {
      const current = fs.existsSync(MODULE_PATH) ? fs.readFileSync(MODULE_PATH, 'utf8') : '';
      if (current !== source) { console.error('ifbb-pro-agent/js/perfilArticular.js no coincide con data/perfil-articular.csv. Correr: node scripts/build-perfil-articular.js'); process.exit(1); }
      console.log('perfilArticular.js coincide con el CSV');
    } else {
      fs.writeFileSync(MODULE_PATH, source);
      console.log('Generado ifbb-pro-agent/js/perfilArticular.js');
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { COLUMNS, JOINTS, LEVELS, EVIDENCE, ORIGINS, AMBIGUOUS, CSV_PATH, BUCKETS_PATH, MODULE_PATH, parsePerfilArticular, catalogIdsFromBuckets, buildModuleSource, buildFromCsvText };
