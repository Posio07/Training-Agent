/* Recorrido en Chromium móvil de la pantalla de PROGRESO POR VARIANTE del núcleo nuevo (B-039, paso 3.8) sobre la página de prueba (tests/pagina-nucleo-v2.html):
 * la fuerza se separa por variante y el historial permite corregir o borrar series. Se borra con la página en el corte.
 * Uso: NODE_PATH=/opt/node22/lib/node_modules node ifbb-pro-agent/tests/e2e-progreso.js */
const path = require('path');
const http = require('http');
const fs = require('fs');
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');

const root = path.join(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/tests/pagina-nucleo-v2.html`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|Failed to load resource/.test(m.text())) errores.push('console: ' + m.text()); });
  await page.goto(url);
  const perfil = () => page.evaluate(() => window.__almacen.perfiles[0]);

  await page.waitForSelector('#form');
  await page.fill('input[name="name"]', 'Prueba'); await page.selectOption('#sex', 'M');
  await page.fill('input[name="age"]', '30'); await page.fill('input[name="heightCm"]', '178'); await page.fill('input[name="weightKg"]', '85');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#btn-progreso');

  // Sin series registradas: mensajes de "completa dos sesiones" y sin historial.
  await page.click('#btn-progreso'); await page.waitForSelector('#progreso');
  assert.match(await page.textContent('#progreso'), /Completa dos sesiones/);
  assert.match(await page.textContent('#progreso'), /Todavía no registraste ninguna sesión/);
  await page.click('#btn-volver'); await page.waitForSelector('#btn-progreso');

  // Series de dos variantes en tres sesiones (las filas llevan el id de la variante, como las que guarda la pantalla de sesión).
  await page.evaluate(() => {
    const p = window.__almacen.perfiles[0];
    const f = (sessionId, date, exerciseId, exercise, setType, setNumber, weight, reps, savedAt) => ({ sessionId, date, exerciseId, exercise, setType, setNumber, weight, reps, savedAt, setKey: `${sessionId}|${exerciseId}|${setType}|${setNumber}` });
    p.workouts = [
      f('s1', '2026-11-01', 'quads.squat_back', 'Sentadilla trasera', 'top', 1, 100, 5, 1), f('s1', '2026-11-01', 'chest.bench_press_barbell', 'Press banca con barra', 'normal', 1, 60, 8, 2),
      f('s2', '2026-11-05', 'quads.squat_back', 'Sentadilla trasera', 'top', 1, 105, 5, 3),
      f('s3', '2026-11-08', 'quads.squat_hack', 'Sentadilla hack', 'normal', 1, 120, 10, 4),
    ];
    p.sessions = [{ sessionId: 's1', dayName: 'Día 2', date: '2026-11-01', startedAt: 1, completedAt: 2 }, { sessionId: 's2', dayName: 'Día 2', date: '2026-11-05', startedAt: 1, completedAt: 2 }, { sessionId: 's3', dayName: 'Día 2', date: '2026-11-08', startedAt: 1, completedAt: 2 }];
  });
  await page.click('#btn-progreso'); await page.waitForSelector('#strength-exercise-select');

  // 1. La fuerza es por variante: la más reciente primero (hack, 1 punto); la sentadilla trasera tiene 2 puntos y dibuja el gráfico; el press, 1.
  const opciones = await page.locator('#strength-exercise-select option').allTextContents();
  assert.equal(opciones.length, 3); assert.equal(opciones[0], 'Sentadilla en hack'); assert.ok(opciones.includes('Press banca con barra') && opciones.includes('Sentadilla trasera'), 'una opción por variante');
  assert.ok(!(await page.locator('svg.chart').count()), 'con un solo punto no hay gráfico');
  await page.selectOption('#strength-exercise-select', 'quads.squat_back');
  assert.equal(await page.locator('svg.chart circle').count(), 2, 'la sentadilla trasera tiene sus dos sesiones y no mezcla el hack');

  // 2. El historial lista las 3 sesiones; se abre una, se corrige una serie y se actualiza.
  assert.equal(await page.locator('.hist-session').count(), 3);
  await page.click('.hist-session[data-sid="s2"] summary');
  await page.click('.hist-session[data-sid="s2"] [data-hist-edit]');
  await page.fill('.set-editor input[name="weight"]', '110');
  await page.click('.set-editor button[type="submit"]');
  await page.waitForSelector('.set-editor', { state: 'detached' });
  assert.equal((await perfil()).workouts.find(w => w.sessionId === 's2').weight, 110);
  assert.match(await page.textContent('#progreso'), /110/);

  // 3. Borrar pide confirmación: cancelar no borra; aceptar borra la serie y el gráfico vuelve a un solo punto.
  await page.click('.hist-session[data-sid="s2"] [data-hist-edit]');
  await page.evaluate(() => { window.__confirmar = false; });
  await page.click('[data-editor-delete]'); await page.waitForTimeout(100);
  assert.equal((await perfil()).workouts.filter(w => w.sessionId === 's2').length, 1, 'cancelar no borra');
  await page.evaluate(() => { window.__confirmar = true; });
  await page.click('[data-editor-delete]');
  await page.waitForFunction(() => !window.__almacen.perfiles[0].workouts.some(w => w.sessionId === 's2'));
  await page.waitForSelector('.set-editor', { state: 'detached' });
  assert.ok(!(await page.locator('svg.chart').count()));

  assert.deepEqual(errores, [], errores.join('\n'));
  await browser.close(); server.close();
  console.log('e2e progreso: OK');
})().catch(e => { console.error(e); process.exit(1); });
