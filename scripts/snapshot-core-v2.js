#!/usr/bin/env node
/* EN CONSTRUCCIÓN · núcleo v2 (B-039). Genera ifbb-pro-agent/tests/fixtures/core-v2-plan-hashes.json: una huella (SHA-256 de la serialización
 * canónica) del plan que genera core-v2 para 10 perfiles de referencia (los de plan-identity-baseline.json). Sirve para que un cambio
 * accidental en la salida del reparto, el registro o el catálogo haga fallar un test.
 *
 *   node scripts/snapshot-core-v2.js           regenera la huella
 *   node scripts/snapshot-core-v2.js --check   falla si la huella guardada no coincide
 *
 * Si la salida cambió a propósito, hay que subir VERSION_MOTOR en js/core-v2/plan.js ANTES de regenerar: el plan guardado de cada perfil
 * avisa de una versión nueva del motor comparando esa versión. Este script se niega a regenerar con la misma versión. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PLAN = require(path.join(__dirname, '../ifbb-pro-agent/js/core-v2/plan.js'));

const FIXTURES = path.join(__dirname, '../ifbb-pro-agent/tests/fixtures');
const OUT = path.join(FIXTURES, 'core-v2-plan-hashes.json');
const canonical = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, key) => { o[key] = x[key]; return o; }, {}) : x));
const hash = v => crypto.createHash('sha256').update(canonical(v)).digest('hex');

// Los perfiles de entrada viven dentro del propio archivo de huellas (se copian una sola vez de plan-identity-baseline.json, que se
// borra en el corte), así el archivo se basta solo.
function perfiles() {
  if (fs.existsSync(OUT)) return JSON.parse(fs.readFileSync(OUT, 'utf8')).perfiles;
  const base = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'plan-identity-baseline.json'), 'utf8')).cases;
  return Object.keys(base).reduce((o, k) => { o[k] = base[k].profile; return o; }, {});
}

function calcular() {
  const entradas = perfiles(), cases = {};
  Object.keys(entradas).forEach(k => { cases[k] = hash(PLAN.crearPlan(entradas[k], { id: 'x', ahora: '2026-01-01' }).plan); });
  return { versionMotor: PLAN.VERSION_MOTOR, perfiles: entradas, cases };
}

if (require.main === module) {
  const nuevo = calcular();
  const actual = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  if (process.argv.includes('--check')) {
    if (!actual || JSON.stringify(actual) !== JSON.stringify(nuevo)) { console.error('La huella de core-v2 no coincide. Si el cambio es a propósito, sube VERSION_MOTOR y corre: node scripts/snapshot-core-v2.js'); process.exit(1); }
    console.log('Huella de core-v2 al día (' + nuevo.versionMotor + ')');
  } else {
    if (actual && actual.versionMotor === nuevo.versionMotor && JSON.stringify(actual.cases) !== JSON.stringify(nuevo.cases)) {
      console.error('La salida cambió pero VERSION_MOTOR sigue en ' + nuevo.versionMotor + '. Súbela en ifbb-pro-agent/js/core-v2/plan.js y vuelve a correr.'); process.exit(1);
    }
    fs.writeFileSync(OUT, JSON.stringify(nuevo, null, 2) + '\n');
    console.log('Generado ' + path.relative(process.cwd(), OUT));
  }
}
module.exports = { calcular, OUT };
