/* Recorrido de punta a punta del núcleo nuevo en Chromium móvil (paso 3.10, prueba de aceptación), sobre la página de prueba y el almacenamiento definitivo:
 * perfil → plan → aviso único y aceptación → regenerar → sesión (top set, A5, A6) → recargar → progreso por variante → privacidad del export → reanudar.
 * Cada tramo dice qué criterio de aceptación de docs/specs/nucleo-v2.md toca. Se borra con la página en el corte (las pruebas de punta a punta pasan a la app real).
 * Uso: NODE_PATH=/opt/node22/lib/node_modules node ifbb-pro-agent/tests/e2e-recorrido.js */
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
  const perfil = () => page.evaluate(() => window.__almacen.profiles[0]);
  const act = () => page.evaluate(() => JSON.parse(window.__storage[window.SESSION_STORE.STORAGE_KEY] || 'null'));
  const guardado = () => page.evaluate(() => JSON.parse(localStorage.getItem(window.__claveAlmacen)));
  const editar = async cambios => { await page.click('#btn-editar'); await page.waitForSelector('#form'); await cambios(); await page.click('button[type="submit"]'); await page.waitForSelector('[data-start-session="0"]'); };
  const hecha = async (i, peso, reps, dolor) => {
    await page.fill(`[data-sm-weight="${i}"]`, String(peso)); await page.fill(`[data-sm-reps="${i}"]`, String(reps));
    if (dolor != null) await page.fill(`[data-sm-pain="${i}"]`, String(dolor));
    await page.click(`[data-sm-done="${i}"]`); await page.waitForSelector('#sm-timer'); await page.click('#sm-timer-skip'); await page.waitForSelector('#sm-timer', { state: 'detached' });
  };

  // 1. Perfil con los campos nuevos y la bandera de salud; el plan sale del núcleo nuevo.
  await page.waitForSelector('#form');
  await page.fill('input[name="name"]', 'Recorrido'); await page.selectOption('#sex', 'M');
  await page.fill('input[name="age"]', '30'); await page.fill('input[name="heightCm"]', '178'); await page.fill('input[name="weightKg"]', '85');
  await page.selectOption('select[name="level"]', 'intermediate'); await page.selectOption('select[name="daysPerWeek"]', '4'); await page.selectOption('select[name="goal"]', 'cut');
  await page.fill('input[name="tiempoDisponibleMin"]', '90'); await page.selectOption('select[name="prioritarios"] >> nth=0', 'quads.squat_back'); await page.check('input[name="healthGoal"]');
  await page.click('button[type="submit"]'); await page.waitForSelector('[data-start-session="3"]');
  let p = await perfil();
  assert.equal(p.planGuardado.plan.sesiones.length, 4);
  // criterios 1, 3 y 11: la capacidad se respeta, el top set es del patrón principal y el principal tiene 4 series o más
  p.planGuardado.plan.sesiones.forEach(s => assert.ok(s.minutos <= s.capacidadMin + 1e-9, 'criterio 1: ' + s.nombre));
  const diaSent = p.planGuardado.plan.sesiones.find(s => /sentadilla/.test(s.nombre));
  assert.equal(diaSent.ejercicios.find(e => e.topSet).patron, 'sentadilla', 'criterio 3');
  assert.ok(diaSent.ejercicios.filter(e => e.patron === 'sentadilla').reduce((a, e) => a + e.series, 0) >= 4, 'criterio 11');
  assert.ok(diaSent.ejercicios.some(e => e.varianteId === 'quads.squat_back'), 'criterio 10: el prioritario está en su día');
  assert.ok(/3 sesiones × 50 min/.test(await page.textContent('#entreno')), 'la bandera de salud: cardio de 150 min');

  // 2. Poco tiempo: aparece el aviso único; aceptar guarda la aceptación en el plan (criterio 8); cambiar el objetivo la hace caducar.
  await editar(() => page.fill('input[name="tiempoDisponibleMin"]', '35'));
  assert.ok(await page.locator('[data-salida="aceptar"]').count(), 'aviso único con poco tiempo');
  await page.click('[data-salida="aceptar"]'); await page.waitForSelector('#entreno');
  p = await perfil(); assert.ok(p.planGuardado.aceptaciones.length > 0, 'criterio 8: la aceptación se guarda en el plan');
  const id35 = p.planGuardado.id;
  await editar(() => page.selectOption('select[name="goal"]', 'bulk'));
  p = await perfil(); assert.notEqual(p.planGuardado.id, id35); assert.equal(p.planGuardado.aceptaciones.length, 0, 'criterio 8: caduca al cambiar el objetivo');
  await editar(async () => { await page.fill('input[name="tiempoDisponibleMin"]', '90'); await page.selectOption('select[name="goal"]', 'cut'); });

  // 3. Sesión de pierna: top set, A5 (back-off de más), A6 (dolor lumbar con su zona), registro por variante.
  await page.click('[data-toggle-day="1"]'); await page.click('[data-start-session="1"]'); await page.waitForSelector('.sm-exname');
  await hecha(0, 100, 5);
  await page.fill('[data-sm-weight="1"]', '98'); await page.fill('[data-sm-reps="1"]', '8'); await page.click('[data-sm-done="1"]'); await page.waitForSelector('#sm-timer'); await page.click('#sm-timer-skip');
  assert.equal((await act()).exercises[0].sets[1].setType, 'normal', 'A5');
  await page.selectOption('[data-sm-zona]', 'lumbar'); await hecha(2, 85, 8, 8);
  assert.equal((await perfil()).painFlags.lumbar.marcada, true, 'A6');
  await page.click('#sm-finish'); await page.waitForSelector('#sm-back-to-plan'); await page.click('#sm-back-to-plan'); await page.waitForSelector('[data-start-session="1"]');

  // 4. Recargar: todo persiste en el almacenamiento definitivo; el progreso es por variante.
  await page.reload(); await page.waitForSelector('[data-start-session="1"]');
  p = await perfil();
  assert.ok(p.workouts.length >= 3 && p.workouts.every(w => w.exerciseId), 'las series quedan por variante');
  await page.click('#btn-progreso'); await page.waitForSelector('#strength-exercise-select');
  assert.ok((await page.locator('#strength-exercise-select option').allTextContents()).includes('Sentadilla trasera'));
  assert.ok(await page.locator('.hist-session').count() >= 1); await page.click('#btn-volver'); await page.waitForSelector('[data-start-session="1"]');

  // 5. Con la zona lumbar marcada, la próxima sentadilla ya no lleva top set (DEC-009) y la rutina corta cabe en el tiempo (criterio 4).
  await page.click('[data-toggle-day="1"]'); await page.click('[data-start-session="1"]'); await page.waitForSelector('.sm-exname');
  assert.ok((await act()).exercises[0].sets.every(x => x.setType !== 'top'), 'sin top set con la zona marcada');
  await page.evaluate(() => { window.__confirmar = true; }); await page.click('#sm-close'); await page.waitForSelector('#session-mode-root', { state: 'detached' });
  await page.evaluate(() => window.__sesion.ofrecerReanudar()); await page.waitForSelector('#resume-no'); await page.click('#resume-no'); await page.waitForSelector('#resume-prompt', { state: 'detached' });
  await page.fill('[data-hoy-min="1"]', '25'); await page.click('[data-start-session-short="1"]'); await page.waitForSelector('.sm-exname');
  const corta = await act(); assert.equal(corta.short, true); assert.ok(corta.planSesion.minutos <= 25 + 1e-9, 'criterio 4');
  await page.click('#sm-close'); await page.waitForSelector('#session-mode-root', { state: 'detached' });
  await page.evaluate(() => window.__sesion.ofrecerReanudar()); await page.waitForSelector('#resume-no'); await page.click('#resume-no'); await page.waitForSelector('#resume-prompt', { state: 'detached' });

  // 6. Privacidad (DEC-009): el export del motor no lleva las banderas de dolor, ni la salud, ni el plan guardado con las lesiones.
  const exp = await page.evaluate(() => window.ENGINE.exportProfile(window.__almacen.profiles[0]));
  assert.ok(!('painFlags' in exp) && !('planGuardado' in exp) && !('health' in exp.data));
  assert.ok(!/"zonas"|"lesiones"|"pain"/.test(JSON.stringify(exp)));
  // 7. El almacenamiento definitivo no tocó las claves de la app actual.
  const claves = await page.evaluate(() => ({ v1: localStorage.getItem('ifbb-agent:v1'), v2: localStorage.getItem('ifbb-agent:v2') }));
  assert.equal(claves.v1, null); assert.equal(claves.v2, null);
  assert.ok((await guardado()).profiles[0].planGuardado);

  assert.deepEqual(errores, [], errores.join('\n'));
  await browser.close(); server.close();
  console.log('e2e recorrido de punta a punta: OK');
})().catch(e => { console.error(e); process.exit(1); });
