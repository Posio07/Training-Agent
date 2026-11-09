/* Lo que comparten las pruebas de punta a punta: el servidor estático de la app, el navegador y la siembra del
 * almacenamiento. Desde el corte todas corren sobre la app real (`index.html`), no sobre una página de prueba.
 *
 * La clave del almacenamiento es la del núcleo nuevo (`core-v2/almacen.js`, DEC-032) y el estado sembrado tiene que
 * llevar su `version`, o la app lo ignora y arranca vacía (DEC-023: sin migraciones). El plan guardado no hace falta
 * sembrarlo: la app lo genera al abrir si el perfil no lo trae. */
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium, devices } = require('playwright');
const ALMACEN = require('../js/core-v2/almacen.js');

const RAIZ = path.join(__dirname, '..');
const CLAVE = ALMACEN.CLAVE;
const CLAVE_VIEJA = 'ifbb-agent:v1'; // la de la app anterior al corte: queda ignorada (DEC-032, B-046)
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

// Servidor estático de la app, en un puerto libre. Devuelve { base, cerrar }.
async function servir() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, r));
  return { base: `http://localhost:${server.address().port}/`, cerrar: () => server.close() };
}

/* Abre la app en Chromium móvil. `opciones`: { seed: estado a sembrar, reloj: true para poder desplazar Date.now,
 * descargas: true para aceptar descargas, abrir: false para no navegar todavía }.
 * Devuelve { browser, ctx, page, errores, base, cerrar }. `errores` junta los errores de consola y de página. */
async function abrir(opciones) {
  const o = opciones || {};
  const { base, cerrar } = await servir();
  const browser = await chromium.launch();
  const ctx = await browser.newContext(Object.assign({}, devices['Pixel 7'], o.descargas ? { acceptDownloads: true } : {}));
  // Reloj desplazable para simular tiempo transcurrido con la pantalla bloqueada (sin ticks de por medio).
  if (o.reloj) await ctx.addInitScript(() => { const real = Date.now.bind(Date); window.__off = 0; Date.now = () => real() + window.__off; });
  // La clave del almacenamiento, también del lado de la página, para que las pruebas puedan leerla sin repetir el literal.
  await ctx.addInitScript(k => { window.__CLAVE = k; }, CLAVE);
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|Failed to load resource/.test(m.text())) errores.push('console: ' + m.text()); });
  if (o.seed) await page.addInitScript(([clave, s]) => { if (!localStorage.getItem(clave)) localStorage.setItem(clave, s); }, [CLAVE, JSON.stringify(estado(o.seed))]);
  if (o.abrir !== false) await page.goto(base, { waitUntil: 'networkidle' });
  return { browser, ctx, page, errores, base, cerrar: async () => { await browser.close(); cerrar(); } };
}

// Un estado del almacenamiento con su versión (lo que la app sabe leer).
const estado = ({ profiles, activeId }) => ({ version: ALMACEN.VERSION, profiles, activeId: activeId || (profiles[0] && profiles[0].id) || null });

// Un perfil mínimo y válido. `datos` se mezcla con los campos obligatorios; el plan guardado lo genera la app.
const perfil = (id, datos) => ({
  id, createdAt: '2026-10-01', updatedAt: '2026-10-20', log: [], workouts: [], sessions: [], painFlags: {}, planGuardado: null,
  data: Object.assign({ name: id, sex: 'M', age: 30, heightCm: 178, weightKg: 85, bodyFatPct: 15, activity: 'moderate', level: 'intermediate', daysPerWeek: 4, division: 'general_m', goal: 'cut' }, datos),
});

// Lee el estado guardado en el navegador.
const leer = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), CLAVE);
// Lee la sesión en curso (DEC-015, su propia clave).
const leerSesion = page => page.evaluate(() => { const k = window.SESSION_STORE.STORAGE_KEY; const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; });

module.exports = { servir, abrir, estado, perfil, leer, leerSesion, CLAVE, CLAVE_VIEJA, RAIZ };
