/* Recorrido en Chromium móvil de la pantalla de SESIÓN del núcleo nuevo (B-039, paso 3.7) sobre la página de prueba (tests/pagina-nucleo-v2.html): registro por
 * variante, back-off válido (A5), dolor por zona (A6) con propuesta de cambio, elegir variante, "hoy tengo X min" y reanudar. Se borra con la página en el corte.
 * Uso: NODE_PATH=/opt/node22/lib/node_modules node ifbb-pro-agent/tests/e2e-sesion.js */
const path = require('path');
const http = require('http');
const fs = require('fs');
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');

const root = path.join(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
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
  const act = () => page.evaluate(() => JSON.parse(Object.values(window.__storage)[0] || 'null'));
  const perfil = () => page.evaluate(() => window.__almacen.perfiles[0]);
  const hecha = async (i, peso, reps, dolor) => {
    await page.fill(`[data-sm-weight="${i}"]`, String(peso)); await page.fill(`[data-sm-reps="${i}"]`, String(reps));
    if (dolor != null) await page.fill(`[data-sm-pain="${i}"]`, String(dolor));
    await page.click(`[data-sm-done="${i}"]`);
    await page.waitForSelector('#sm-timer'); await page.click('#sm-timer-skip');
    await page.waitForSelector('#sm-timer', { state: 'detached' });
  };

  // Perfil de definición, 4 días: el día 2 es pierna con sentadilla (top set).
  await page.waitForSelector('#form');
  await page.fill('input[name="name"]', 'Prueba'); await page.selectOption('#sex', 'M');
  await page.fill('input[name="age"]', '30'); await page.fill('input[name="heightCm"]', '178'); await page.fill('input[name="weightKg"]', '85');
  await page.selectOption('select[name="level"]', 'intermediate'); await page.selectOption('select[name="daysPerWeek"]', '4'); await page.selectOption('select[name="goal"]', 'cut');
  await page.fill('input[name="tiempoDisponibleMin"]', '90');
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-start-session="1"]');
  await page.click('[data-toggle-day="1"]');

  // 1. Empezar el día de pierna: el primer ejercicio es la sentadilla trasera con top set y back-offs, registrada por variante.
  await page.click('[data-start-session="1"]');
  await page.waitForSelector('.sm-exname');
  assert.match(await page.textContent('.sm-exname'), /Sentadilla trasera/);
  let s = await act();
  assert.equal(s.exercises[0].exerciseId, 'quads.squat_back');
  assert.deepEqual(s.exercises[0].sets.map(x => x.setType), ['top', 'backoff', 'backoff', 'backoff']);

  // 2. Top set de 100 × 5; un back-off de 95 pesa más del 90 %: se guarda como serie de trabajo (A5) y se avisa.
  await hecha(0, 100, 5);
  await page.fill('[data-sm-weight="1"]', '95'); await page.fill('[data-sm-reps="1"]', '8'); await page.click('[data-sm-done="1"]');
  assert.match(await page.textContent('#toast'), /90 %/);
  await page.waitForSelector('#sm-timer'); await page.click('#sm-timer-skip');
  await hecha(2, 90, 8);
  s = await act();
  assert.deepEqual(s.exercises[0].sets.map(x => x.setType), ['top', 'normal', 'backoff', 'backoff'], 'A5: el back-off de 95 queda como serie de trabajo; el de 90 vale');
  let p = await perfil();
  assert.deepEqual(p.workouts.map(w => [w.exerciseId, w.setType]).slice(0, 3), [['quads.squat_back', 'top'], ['quads.squat_back', 'normal'], ['quads.squat_back', 'backoff']]);

  // 3. Dolor lumbar de 8 en la tercera serie: la zona queda marcada (A6) con la misma clave que el export ya excluye (painFlags).
  await page.selectOption('[data-sm-zona]', 'lumbar');
  await hecha(3, 90, 7, 8);
  p = await perfil();
  assert.equal(p.painFlags.lumbar.marcada, true);

  // 4. Elegir otra variante del siguiente ejercicio: queda registrada con su propio id.
  await page.click('#sm-next');
  const antes = (await act()).exercises[1].exerciseId;
  await page.click('summary:has-text("Cambiar la variante")');
  const otra = await page.locator('[data-sm-variante]').first();
  const nuevo = await otra.getAttribute('data-sm-variante');
  assert.notEqual(nuevo, antes);
  await otra.click();
  await page.waitForFunction(id => JSON.parse(Object.values(window.__storage)[0]).exercises[1].exerciseId === id, nuevo);
  await hecha(0, 120, 10);
  p = await perfil();
  assert.equal(p.workouts[p.workouts.length - 1].exerciseId, nuevo, 'el progreso se registra por variante');
  assert.equal((await page.textContent('.sm-exmeta')).length > 0, true);

  // 5. Terminar: resumen con el top set del día.
  await page.click('#sm-finish');
  await page.waitForSelector('#sm-back-to-plan');
  assert.match(await page.textContent('#session-mode-root'), /Top sets del día/);
  await page.click('#sm-back-to-plan');
  await page.waitForSelector('[data-start-session="1"]');
  assert.equal((await page.evaluate(() => Object.keys(window.__storage).length)), 0, 'la sesión terminada ya no es reanudable');

  // 6. Con la zona lumbar marcada, la próxima sentadilla ya no lleva top set y propone una variante más suave, con confirmación.
  await page.click('[data-toggle-day="1"]');
  await page.click('[data-start-session="1"]');
  await page.waitForSelector('.sm-exname');
  s = await act();
  assert.equal(s.exercises[0].sets.every(x => x.setType !== 'top'), true, 'sin top set con la zona marcada');
  assert.match(await page.textContent('#session-mode-root'), /zona lumbar/);
  assert.ok(await page.locator('[data-sm-variante]').count() > 0);

  // 7. Cerrar sin terminar deja la sesión reanudable.
  await page.evaluate(() => { window.__confirmar = true; });
  await page.click('#sm-close'); await page.waitForSelector('#session-mode-root', { state: 'detached' });
  await page.evaluate(() => window.__sesion.ofrecerReanudar());
  await page.waitForSelector('#resume-yes'); await page.click('#resume-yes');
  await page.waitForSelector('.sm-exname');
  await page.click('#sm-close'); await page.waitForSelector('#session-mode-root', { state: 'detached' });
  await page.evaluate(() => window.__sesion.ofrecerReanudar());
  await page.waitForSelector('#resume-no'); await page.click('#resume-no');
  await page.waitForSelector('#resume-prompt', { state: 'detached' });
  assert.equal((await page.evaluate(() => Object.keys(window.__storage).length)), 0);

  // 8. "Hoy tengo 25 min": la misma sesión con menos ejercicios, sin tocar el plan guardado.
  const planId = (await perfil()).planGuardado.id;
  await page.fill('[data-hoy-min="1"]', '25');
  await page.click('[data-start-session-short="1"]');
  await page.waitForSelector('.sm-exname');
  s = await act();
  assert.equal(s.short, true);
  assert.ok(s.exercises.length < 5 && s.exercises.length >= 1);
  assert.match(await page.textContent('.prog'), /Rutina corta/);
  await page.evaluate(() => { window.__confirmar = true; });
  await page.click('#sm-close'); await page.waitForSelector('#session-mode-root', { state: 'detached' });
  assert.equal((await perfil()).planGuardado.id, planId);

  assert.deepEqual(errores, [], errores.join('\n'));
  await browser.close(); server.close();
  console.log('e2e sesión: OK');
})().catch(e => { console.error(e); process.exit(1); });
