/* Recorrido en Chromium móvil de las pantallas del núcleo nuevo (B-039, paso 3.6) sobre la página de prueba (tests/pagina-nucleo-v2.html):
 * crea un perfil con tiempo y prioritarios, revisa el plan, el aviso único y sus tres salidas, regenerar y editar. Se borra con la página en el corte.
 * Uso: NODE_PATH=/opt/node22/lib/node_modules node ifbb-pro-agent/tests/e2e-pantallas.js */
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

  // 1. Sin perfiles abre el formulario con los campos nuevos.
  await page.waitForSelector('#form');
  assert.ok(await page.locator('input[name="tiempoDisponibleMin"]').count());
  assert.equal(await page.locator('select[name="prioritarios"]').count(), 3);

  // 2. Crea un perfil apretado (avanzado, 3 días, 45 min) con un prioritario.
  await page.fill('input[name="name"]', 'Prueba');
  await page.selectOption('#sex', 'M');
  await page.fill('input[name="age"]', '30'); await page.fill('input[name="heightCm"]', '178'); await page.fill('input[name="weightKg"]', '85');
  await page.selectOption('select[name="level"]', 'advanced');
  await page.selectOption('select[name="daysPerWeek"]', '3');
  await page.selectOption('select[name="goal"]', 'bulk');
  await page.fill('input[name="tiempoDisponibleMin"]', '45');
  await page.selectOption('select[name="prioritarios"] >> nth=0', 'quads.squat_back');
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-start-session="0"]');

  // 3. El plan trae 3 sesiones, el cardio y el aviso único con sus salidas.
  assert.equal(await page.locator('.session').count(), 3);
  assert.ok((await page.textContent('#entreno')).includes('Cardio'));
  assert.ok(await page.locator('.card h3', { hasText: 'Esta semana no entra todo' }).count(), 'aviso único');
  let alm = await page.evaluate(() => window.__almacen);
  assert.equal(alm.profiles[0].data.tiempoDisponibleMin, 45);
  assert.deepEqual(alm.profiles[0].data.prioritarios, ['quads.squat_back']);

  // 4. Aceptar: el aviso desaparece para esas sesiones y se guarda la aceptación.
  await page.click('[data-salida="aceptar"]');
  await page.waitForSelector('#entreno');
  alm = await page.evaluate(() => window.__almacen);
  assert.ok(alm.profiles[0].planGuardado.aceptaciones.length > 0);
  assert.equal(await page.locator('.card h3', { hasText: 'Esta semana no entra todo' }).count(), 0);

  // 5. Más días regenera el plan (4 sesiones) y la aceptación caduca (el aviso vuelve, si aplica).
  const idAntes = alm.profiles[0].planGuardado.id;
  await page.click('#btn-editar'); await page.waitForSelector('#form');
  await page.selectOption('select[name="daysPerWeek"]', '4');
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-start-session="3"]');
  alm = await page.evaluate(() => window.__almacen);
  assert.notEqual(alm.profiles[0].planGuardado.id, idAntes, 'cambiar los días regenera el plan');
  assert.equal(await page.locator('.session').count(), 4);

  // 6. Cambiar el nombre no regenera el plan.
  const id4 = alm.profiles[0].planGuardado.id;
  await page.click('#btn-editar'); await page.waitForSelector('#form');
  await page.fill('input[name="name"]', 'Otro nombre');
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-start-session="3"]');
  alm = await page.evaluate(() => window.__almacen);
  assert.equal(alm.profiles[0].planGuardado.id, id4);

  // 7. Regenerar, abrir una sesión y empezarla.
  await page.click('[data-regenerar]');
  await page.waitForSelector('[data-start-session="0"]');
  alm = await page.evaluate(() => window.__almacen);
  assert.notEqual(alm.profiles[0].planGuardado.id, id4);
  await page.click('[data-toggle-day="1"]');
  assert.equal(await page.getAttribute('[data-toggle-day="1"]', 'aria-expanded'), 'true');
  await page.click('[data-start-session="1"]');
  assert.deepEqual(await page.evaluate(() => window.__sesionesIniciadas), [1]);
  await page.waitForSelector('#session-mode-root .session-mode'); // abre el modo sesión
  await page.evaluate(() => { window.__confirmar = true; });
  await page.click('#sm-close');
  await page.waitForSelector('#session-mode-root', { state: 'detached' });

  // 8. Con la bandera de salud entran los funcionales y el cardio pasa a 150 min.
  await page.click('#btn-editar'); await page.waitForSelector('#form');
  await page.check('input[name="healthGoal"]');
  await page.selectOption('select[name="goal"]', 'cut');
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-start-session="0"]');
  const txt = await page.textContent('#entreno');
  assert.ok(/búlgara/i.test(txt) && /granjero/i.test(txt), 'funcionales de la bandera');
  assert.ok(/3 sesiones × 50 min/.test(txt), 'cardio de 150 min');

  // 9. DEC-009: con síntomas y sin autorización médica el plan no se muestra; se llama a la pantalla de pausa.
  await page.click('#btn-editar'); await page.waitForSelector('#form');
  await page.check('input[name="healthSymptoms"]');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#bloqueo');
  assert.equal(await page.locator('.session').count(), 0, 'el plan no se ve con el tamizaje bloqueando');

  // 10. Borrar los datos de salud pide confirmación: si se cancela, no se borra; si se acepta, sí.
  await page.evaluate(() => { window.__bloqueos = 0; });
  alm = await page.evaluate(() => window.__almacen);
  await page.evaluate(() => { window.__almacen.profiles[0].data.health.screening.medicalClearance = true; });
  await page.evaluate(() => window.__montaje.ir('perfil', window.__almacen.profiles[0].id));
  await page.waitForSelector('#btn-clear-health');
  await page.evaluate(() => { window.__confirmar = false; });
  await page.click('#btn-clear-health');
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__almacen.profiles[0].data.health.screening.symptoms), true, 'cancelar no borra');
  await page.evaluate(() => { window.__confirmar = true; });
  await page.click('#btn-clear-health');
  await page.waitForFunction(() => window.__almacen.profiles[0].data.health.screening.symptoms === false);

  // 11. El almacenamiento definitivo persiste: al recargar la página el perfil y su plan guardado siguen, y no se tocan las claves de la app actual ni la definitiva.
  alm = await page.evaluate(() => window.__almacen);
  const planId = alm.profiles[0].planGuardado.id;
  await page.reload();
  await page.waitForSelector('[data-start-session="0"]');
  alm = await page.evaluate(() => window.__almacen);
  assert.equal(alm.profiles.length, 1); assert.equal(alm.profiles[0].planGuardado.id, planId, 'el plan guardado sobrevive a la recarga');
  assert.equal(alm.profiles[0].data.healthGoal, true);
  const claves = await page.evaluate(() => ({ v1: localStorage.getItem('ifbb-agent:v1'), v2: localStorage.getItem('ifbb-agent:v2'), prueba: localStorage.getItem(window.__claveAlmacen) }));
  assert.equal(claves.v1, null); assert.equal(claves.v2, null); assert.ok(claves.prueba);
  // Un estado ilegible se ignora y empieza vacío (sin migraciones); un plan guardado roto se regenera.
  await page.evaluate(() => { const k = window.__claveAlmacen, s = JSON.parse(localStorage.getItem(k)); s.profiles[0].planGuardado = { id: 'roto' }; localStorage.setItem(k, JSON.stringify(s)); });
  await page.reload(); await page.waitForSelector('[data-start-session="0"]');
  assert.notEqual(await page.evaluate(() => window.__almacen.profiles[0].planGuardado.id), 'roto');
  await page.evaluate(() => localStorage.setItem(window.__claveAlmacen, '{basura'));
  await page.reload(); await page.waitForSelector('#form');
  assert.equal(await page.evaluate(() => window.__almacen.profiles.length), 0);

  assert.deepEqual(errores, [], errores.join('\n'));
  await browser.close(); server.close();
  console.log('e2e pantallas (perfil y plan): OK');
})().catch(e => { console.error(e); process.exit(1); });
