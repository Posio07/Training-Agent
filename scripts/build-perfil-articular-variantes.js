#!/usr/bin/env node
/* EN CONSTRUCCIÓN · núcleo v2 (B-039, B-031). Lee data/perfil-articular-variantes.csv (perfil articular propio de cada
 * variante partida; mismo formato y mismas reglas que data/perfil-articular.csv) y genera
 * ifbb-pro-agent/js/core-v2/perfilArticularVariantes.js.
 *
 *   node scripts/build-perfil-articular-variantes.js           regenera el módulo
 *   node scripts/build-perfil-articular-variantes.js --check   falla si el módulo no coincide con el CSV
 *
 * Que cada id del CSV sea una variante del catálogo, y viceversa, lo comprueba tests/core-v2.test.js. */
'use strict';
const fs = require('fs');
const path = require('path');
const { parsePerfilArticular } = require('./build-perfil-articular.js');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'data', 'perfil-articular-variantes.csv');
const MODULE_PATH = path.join(ROOT, 'ifbb-pro-agent', 'js', 'core-v2', 'perfilArticularVariantes.js');

function buildModuleSource(rows) {
  return [
    '/* GENERADO por scripts/build-perfil-articular-variantes.js a partir de data/perfil-articular-variantes.csv (B-031).',
    ' * No editar a mano: cambiar el CSV y volver a correr `node scripts/build-perfil-articular-variantes.js`.',
    ' * Un test comprueba que este archivo coincide con el CSV. EN CONSTRUCCIÓN: núcleo v2 (B-039). */',
    '(function (root, factory) {',
    "  if (typeof module === 'object' && module.exports) module.exports = factory();",
    '  else root.CORE_V2_PERFIL_ARTICULAR_VARIANTES = factory();',
    "})(typeof self !== 'undefined' ? self : this, function () {",
    "  'use strict';",
    '  return {',
    "    source: 'data/perfil-articular-variantes.csv',",
    '    rows: [',
    rows.map(r => '    ' + JSON.stringify(r)).join(',\n'),
    '    ],',
    '  };',
    '});',
    '',
  ].join('\n');
}

function buildFromCsvText(text) {
  // Los ids válidos son los del propio CSV: cada uno debe traer las tres articulaciones.
  const ids = [...new Set(text.split('\n').slice(1).map(l => l.split(',')[0].trim()).filter(Boolean))];
  const parsed = parsePerfilArticular(text, ids);
  if (parsed.errors.length) throw new Error('data/perfil-articular-variantes.csv inválido:\n - ' + parsed.errors.join('\n - '));
  return buildModuleSource(parsed.rows);
}

if (require.main === module) {
  try {
    const source = buildFromCsvText(fs.readFileSync(CSV_PATH, 'utf8'));
    if (process.argv.includes('--check')) {
      const current = fs.existsSync(MODULE_PATH) ? fs.readFileSync(MODULE_PATH, 'utf8') : '';
      if (current !== source) { console.error('perfilArticularVariantes.js no coincide con el CSV. Correr: node scripts/build-perfil-articular-variantes.js'); process.exit(1); }
      console.log('perfilArticularVariantes.js coincide con el CSV');
    } else {
      fs.writeFileSync(MODULE_PATH, source);
      console.log('Generado ifbb-pro-agent/js/core-v2/perfilArticularVariantes.js');
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { CSV_PATH, MODULE_PATH, buildModuleSource, buildFromCsvText };
