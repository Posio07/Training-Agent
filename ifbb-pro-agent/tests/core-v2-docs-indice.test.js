/* Los índices (DECISIONS.md y docs/BACKLOG.md) listan exactamente los archivos de docs/decisions/ y docs/backlog/ (un archivo por entrada). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
const leer = p => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const archivos = d => fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith('.md')).sort();
const enlaces = (idx, d) => [...idx.matchAll(new RegExp(`\\]\\(${d}/([^)]+)\\)`, 'g'))].map(m => m[1]).sort();

test('DECISIONS.md lista cada archivo de docs/decisions/, y cada archivo empieza con su encabezado', () => {
  assert.deepEqual(enlaces(leer('DECISIONS.md'), 'docs/decisions'), archivos('docs/decisions'));
  archivos('docs/decisions').forEach(f => assert.match(leer('docs/decisions/' + f).split('\n')[0], /^## (DEC-\d+|PRINCIPIO RECTOR)/, f));
});

test('el estado de cada DEC en el índice es el de su archivo', () => {
  const idx = leer('DECISIONS.md');
  archivos('docs/decisions').forEach(f => {
    const estado = (leer('docs/decisions/' + f).match(/\*\*Estado del DEC:\*\* (.*?) — /) || [])[1];
    if (!estado) return; // PRINCIPIO RECTOR no lleva estado
    const fila = idx.split('\n').find(l => l.includes(`(docs/decisions/${f})`));
    assert.ok(fila.trimEnd().endsWith(`| ${estado} |`), `${f}: el índice no dice «${estado}»`);
  });
});

test('docs/BACKLOG.md lista cada archivo de docs/backlog/, y cada archivo trae la fila de su ID', () => {
  assert.deepEqual(enlaces(leer('docs/BACKLOG.md'), 'backlog'), archivos('docs/backlog'));
  archivos('docs/backlog').forEach(f => { const id = f.replace('.md', ''); assert.ok(leer('docs/backlog/' + f).includes(`\n| ${id} | `), f); });
});
