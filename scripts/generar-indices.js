#!/usr/bin/env node
/* Genera, a pedido, un índice de los DEC (docs/decisions/) y de los ítems del backlog (docs/backlog/) en `docs/indices.generado.md`,
 * un archivo ignorado por git: los índices NO se guardan en el repo (GitHub ya lista las carpetas por nombre).
 *
 *   node scripts/generar-indices.js            escribe docs/indices.generado.md
 *   node scripts/generar-indices.js --validar  falla (código 1) si algún archivo está mal formado (encabezado, estado del DEC o fila del ítem); no escribe nada (lo corre el CI) */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const SALIDA = 'docs/indices.generado.md';
const leer = p => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const archivos = d => fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith('.md'));
// Orden natural: DEC-003 antes que DEC-003-v2 y DEC-010; PRINCIPIO-RECTOR al final.
const clave = f => { const m = f.match(/^(?:DEC|B)-(\d+)(.*)\.md$/); return m ? [0, Number(m[1]), m[2]] : [1, 0, f]; };
const orden = (a, b) => { const x = clave(a), y = clave(b); return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0); };

// Estado de un DEC (lo que sigue a "**Estado del DEC:**" hasta " — "). Obligatorio, salvo en el principio rector, que no es un DEC.
function estadoDe(archivo, texto) {
  const e = (texto.match(/\*\*Estado del DEC:\*\* (.*?) — /) || [])[1];
  if (!e && archivo !== 'PRINCIPIO-RECTOR.md') throw new Error(`${archivo}: falta la línea "**Estado del DEC:** X — **Decidido por:** ..."`);
  return e || '—';
}

// Celdas de la fila de un ítem de backlog: exactamente 7 (ID, Ítem, Estado, Dueño, PR / DEC, Actualizado, Notas). Un "|" dentro del texto se escribe "\|".
function celdasDe(archivo, id, texto) {
  const fila = texto.split('\n').find(l => l.startsWith(`| ${id} | `));
  if (!fila) throw new Error(`${archivo}: falta la fila "| ${id} | ..."`);
  const c = fila.trim().replace(/^\|\s*/, '').replace(/\s*\|$/, '').split(' | ');
  if (c.length !== 7) throw new Error(`${archivo}: la fila tiene ${c.length} celdas en vez de 7 (un "|" dentro del texto se escribe "\\|")`);
  return c;
}

function indiceDecisiones() {
  const filas = archivos('docs/decisions').sort(orden).map(f => {
    const t = leer('docs/decisions/' + f);
    const h = t.split('\n')[0].match(/^## (.+?) · (.+)$/);
    if (!h) throw new Error(`${f}: el encabezado debe ser "## CÓDIGO · Título"`);
    return `| [${h[1]}](decisions/${f}) | ${h[2]} | ${estadoDe(f, t)} |`;
  });
  return ['| DEC | Título | Estado |', '| --- | --- | --- |'].concat(filas).join('\n');
}

function indiceBacklog() {
  const filas = archivos('docs/backlog').sort(orden).map(f => {
    const id = f.replace('.md', '');
    const c = celdasDe(f, id, leer('docs/backlog/' + f));
    return `| [${id}](backlog/${f}) | ${c[1]} | ${c[2]} | ${c[5]} |`;
  });
  return ['| ID | Ítem | Estado | Actualizado |', '| --- | --- | --- | --- |'].concat(filas).join('\n');
}

const generar = () => `# Índices generados (no se guardan en el repo)\n\n## Decisiones\n\n${indiceDecisiones()}\n\n## Backlog\n\n${indiceBacklog()}\n`;

if (require.main === module) {
  const texto = generar(); // lanza si algún archivo está mal formado
  if (process.argv.includes('--validar')) console.log('Archivos de DEC y de backlog bien formados');
  else { fs.writeFileSync(path.join(RAIZ, SALIDA), texto); console.log('Escrito ' + SALIDA); }
}

module.exports = { estadoDe, celdasDe, indiceDecisiones, indiceBacklog, generar, SALIDA };
