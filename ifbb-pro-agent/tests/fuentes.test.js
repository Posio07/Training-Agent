/* Tipografías servidas desde el propio origen: la app no le pide nada a un CDN, el service worker las precarga (sin conexión se ven igual),
 * cada una trae al lado su licencia y su origen, y la hoja de estilos conserva la tipografía del sistema como reserva. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const hojas = () => fs.readdirSync(path.join(RAIZ, 'css')).filter(f => f.endsWith('.css')).map(f => leer('css/' + f)).join('\n');
// Las caras que declara css/fuentes.css: { familia, archivo (relativo a la raíz de la app), regla }.
const caras = () => [...leer('css/fuentes.css').matchAll(/@font-face\s*\{([^}]*)\}/g)].map(m => {
  const urls = [...m[1].matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map(u => u[1]);
  return { familia: (m[1].match(/font-family:\s*'([^']+)'/) || [])[1], urls, archivo: (urls[0] || '').replace(/^\.\.\//, ''), regla: m[1] };
});

test('index.html y las hojas de estilo no piden nada a otro origen: ni tipografías, ni estilos, ni scripts', () => {
  const externas = [...leer('index.html').matchAll(/<(?:link|script|img)\b[^>]*\b(?:href|src)="([^"]+)"/g)].map(m => m[1]).filter(u => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(u));
  assert.deepEqual(externas, [], 'index.html no enlaza recursos de otro origen');
  assert.ok(!/url\(\s*['"]?(?:https?:)?\/\//i.test(hojas()) && !/@import/i.test(hojas()), 'ninguna hoja de estilos trae recursos de otro origen');
});

test('cada tipografía de css/fuentes.css es un woff2 local que existe y que el service worker precarga', () => {
  const html = leer('index.html'), sw = leer('sw.js');
  assert.ok(html.includes('href="css/fuentes.css"') && html.indexOf('css/fuentes.css') < html.indexOf('css/styles.css'), 'index.html carga fuentes.css antes de styles.css');
  assert.ok(sw.includes("'./css/fuentes.css'"), 'sw.js precachea fuentes.css');
  assert.deepEqual(caras().map(c => c.familia).sort(), ['Big Shoulders Display', 'Source Sans 3']);
  caras().forEach(c => {
    assert.equal(c.urls.length, 1, `${c.familia}: un solo archivo`);
    assert.match(c.urls[0], /^\.\.\/fonts\/[\w.-]+\.woff2$/, `${c.familia}: woff2 de la carpeta fonts`);
    assert.ok(fs.statSync(path.join(RAIZ, c.archivo)).size > 10000, `${c.archivo} existe y no está vacío`);
    assert.ok(sw.includes(`'./${c.archivo}'`), `sw.js precachea ${c.archivo}`);
    assert.match(c.regla, /font-display:\s*swap/, `${c.familia}: el texto se ve con la tipografía de reserva mientras carga`);
    // Son fuentes variables: el rango de pesos declarado tiene que cubrir los que usa la app (400 a 700), o el navegador inventa la negrita.
    const pesos = (c.regla.match(/font-weight:\s*(\d+)\s+(\d+)/) || []).slice(1).map(Number);
    assert.ok(pesos.length === 2 && pesos[0] <= 400 && pesos[1] >= 700, `${c.familia}: el rango de pesos cubre de 400 a 700`);
  });
});

test('Source Sans 3 conserva la altura de línea de la versión que servía Google: los tres ajustes de métricas siguen en su cara', () => {
  const regla = caras().find(c => c.familia === 'Source Sans 3').regla;
  assert.match(regla, /ascent-override:\s*102\.4%/); assert.match(regla, /descent-override:\s*40%/); assert.match(regla, /line-gap-override:\s*0%/);
});

test('las dos familias conservan la tipografía del sistema como reserva', () => {
  caras().forEach(c => assert.match(hojas(), new RegExp(`'${c.familia}',\\s*system-ui`), `${c.familia} seguida de system-ui`));
});

test('cada archivo de fuente es el que anota fonts/LEEME.md (mismo SHA-256) y trae al lado su licencia OFL 1.1', () => {
  const leeme = leer('fonts/LEEME.md');
  const enCarpeta = fs.readdirSync(path.join(RAIZ, 'fonts')).filter(f => f.endsWith('.woff2')).sort();
  assert.deepEqual(enCarpeta, caras().map(c => path.basename(c.archivo)).sort(), 'en fonts/ están los woff2 declarados y ninguno más');
  enCarpeta.forEach(f => {
    const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(RAIZ, 'fonts', f))).digest('hex');
    assert.ok(leeme.includes('`' + f + '`'), `LEEME.md nombra ${f}`);
    assert.ok(leeme.includes(sha), `LEEME.md anota el SHA-256 de ${f}`);
  });
  const licencias = fs.readdirSync(path.join(RAIZ, 'fonts')).filter(f => /^LICENCIA-/.test(f));
  assert.equal(licencias.length, 2, 'una licencia por familia');
  licencias.forEach(f => {
    // La licencia entera, no solo su título: el aviso de copyright y las cuatro partes del texto.
    ['Copyright', 'SIL OPEN FONT LICENSE Version 1.1', 'PREAMBLE', 'DEFINITIONS', 'PERMISSION & CONDITIONS', 'TERMINATION', 'DISCLAIMER'].forEach(parte => assert.ok(leer('fonts/' + f).includes(parte), `${f}: falta «${parte}»`));
    assert.ok(leeme.includes('`' + f + '`'), `LEEME.md nombra ${f}`);
  });
});
