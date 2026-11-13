/* Recorrido en Chromium móvil de la pantalla de SESIÓN del núcleo nuevo, sobre la app real: registro por variante,
 * back-off válido (A5), dolor por zona (A6) con propuesta de cambio, elegir variante, "hoy tengo X min" y reanudar.
 * Uso: NODE_PATH=/opt/node22/lib/node_modules node ifbb-pro-agent/tests/e2e-sesion.js */
const assert = require('node:assert/strict');
const { abrir, leer, leerSesion } = require('./e2e-comun.js');

(async () => {
  const { page, errores, cerrar } = await abrir({});
  const act = () => leerSesion(page);
  const perfil = async () => (await leer(page)).profiles[0];
  const irAEntreno = async () => { await page.click('[data-tab=plan]'); await page.click('[data-pt=training]'); await page.waitForSelector('[data-start-session="1"]'); };
  const hecha = async (i, peso, reps, dolor) => {
    await page.fill(`[data-sm-weight="${i}"]`, String(peso)); await page.fill(`[data-sm-reps="${i}"]`, String(reps));
    if (dolor != null) await page.fill(`[data-sm-pain="${i}"]`, String(dolor));
    await page.click(`[data-sm-done="${i}"]`);
    await page.waitForSelector('#sm-timer'); await page.click('#sm-timer-skip');
    await page.waitForSelector('#sm-timer', { state: 'detached' });
  };

  // Perfil de definición, 4 días: el día 2 es pierna con sentadilla (top set).
  await page.click('#btn-new');
  await page.waitForSelector('#form');
  await page.fill('input[name="name"]', 'Prueba'); await page.selectOption('#sex', 'M');
  await page.fill('input[name="age"]', '30'); await page.fill('input[name="heightCm"]', '178'); await page.fill('input[name="weightKg"]', '85');
  await page.selectOption('select[name="level"]', 'intermediate'); await page.selectOption('select[name="daysPerWeek"]', '4'); await page.selectOption('select[name="goal"]', 'cut');
  await page.fill('input[name="tiempoDisponibleMin"]', '90');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#plan-body .stat');
  await irAEntreno();
  await page.click('[data-toggle-day="1"]');

  // 1. Empezar el día de pierna: el primer ejercicio es la sentadilla trasera con top set y back-offs, registrada por variante.
  await page.click('#day-body-1 [data-start-session]');
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
  await page.fill('[data-sm-weight="3"]', '90'); await page.fill('[data-sm-reps="3"]', '7'); await page.fill('[data-sm-pain="3"]', '8');
  await page.click('[data-sm-done="3"]');
  assert.match(await page.textContent('#toast'), /zona del dolor/);
  assert.equal((await act()).values[0][3].done, false, 'sin zona no se registra un dolor');
  await page.selectOption('[data-sm-zona]', 'lumbar');
  await hecha(3, 90, 7, 8);
  p = await perfil();
  assert.equal(p.painFlags.lumbar.marcada, true);

  // 3b. Corregir una serie ya hecha con el editor: el historial se actualiza; un back-off corregido a más del 90 % pasa a serie de trabajo (A5).
  await page.click('[data-sm-edit="0"]');
  await page.fill('.set-editor input[name="weight"]', '105');
  await page.click('.set-editor button[type="submit"]');
  await page.waitForSelector('.set-editor', { state: 'detached' });
  p = await perfil();
  assert.equal(p.workouts[0].weight, 105);
  await page.click('[data-sm-edit="2"]');
  await page.fill('.set-editor input[name="weight"]', '104');
  await page.click('.set-editor button[type="submit"]');
  await page.waitForSelector('.set-editor', { state: 'detached' });
  assert.equal((await act()).exercises[0].sets[2].setType, 'normal', 'A5 también al corregir el peso de un back-off');
  assert.equal((await perfil()).workouts.find(w => w.setNumber === 2 && w.exerciseId === 'quads.squat_back').setType, 'normal');

  // 4. Elegir otra variante del siguiente ejercicio: queda registrada con su propio id.
  await page.click('#sm-next');
  // El segundo ejercicio puede ser de un patrón de una sola variante (el hip thrust con el reparto de DEC-037): se avanza hasta uno que ofrezca otra.
  let ix = 1;
  while (await page.locator('summary:has-text("Cambiar la variante")').count() === 0 && ix < 5) { await page.click('#sm-next'); ix++; }
  const antes = (await act()).exercises[ix].exerciseId;
  await page.click('summary:has-text("Cambiar la variante")');
  const otra = await page.locator('[data-sm-variante]').first();
  const nuevo = await otra.getAttribute('data-sm-variante');
  assert.notEqual(nuevo, antes);
  await otra.click();
  await page.waitForFunction(([id, i]) => JSON.parse(localStorage.getItem(window.SESSION_STORE.STORAGE_KEY)).exercises[i].exerciseId === id, [nuevo, ix]);
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
  assert.equal(await act(), null, 'la sesión terminada ya no es reanudable');

  // 6. Con la zona lumbar marcada, la próxima sentadilla ya no lleva top set y propone una variante más suave, con confirmación.
  await page.click('[data-toggle-day="1"]');
  await page.click('#day-body-1 [data-start-session]');
  await page.waitForSelector('.sm-exname');
  s = await act();
  assert.equal(s.exercises[0].sets.every(x => x.setType !== 'top'), true, 'sin top set con la zona marcada');
  assert.match(await page.textContent('#session-mode-root'), /zona lumbar/);
  assert.ok(await page.locator('[data-sm-variante]').count() > 0);

  // 7. Cerrar sin terminar deja la sesión reanudable: al recargar la app, aparece el aviso de reanudar.
  await page.click('#sm-close'); await page.click('#modal-confirm');
  await page.waitForSelector('#session-mode-root', { state: 'detached' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#resume-yes'); await page.click('#resume-yes');
  await page.waitForSelector('.sm-exname');
  await page.click('#sm-close'); await page.click('#modal-confirm');
  await page.waitForSelector('#session-mode-root', { state: 'detached' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#resume-no'); await page.click('#resume-no');
  await page.click('#modal-confirm');
  await page.waitForSelector('#resume-prompt', { state: 'detached' });
  assert.equal(await act(), null);

  // 7b. Una sesión guardada por el modo sesión anterior (sin el plan de la sesión) no se puede reanudar: se descarta con un aviso, sin romper.
  await page.evaluate(id => { const rec = { version: 1, status: 'en_curso', sessionId: 'vieja', profileId: id, dayIndex: 0, dayName: 'Día 1', short: false, startedAt: 1, updatedAt: 1, exIndex: 0, finished: false, exercises: [{ name: 'X', sets: [{ setType: 'normal', setNumber: 1, repsLabel: '8', restLabel: '90 s' }] }], values: [[{ weight: '', reps: '', done: false, pain: '', doneAt: null }]], recordShown: [], deletedKeys: [], rest: null }; localStorage.setItem(window.SESSION_STORE.STORAGE_KEY, JSON.stringify(rec)); }, (await perfil()).id);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => /versión anterior/.test(document.getElementById('toast').textContent));
  assert.equal(await page.locator('#resume-prompt').count(), 0);
  assert.equal(await act(), null);

  // 8. "Hoy tengo 25 min": la misma sesión con menos ejercicios, sin tocar el plan guardado.
  const planId = (await perfil()).planGuardado.id;
  await irAEntreno();
  await page.click('[data-toggle-day="1"]');
  await page.fill('[data-hoy-min="1"]', '25');
  await page.click('[data-start-session-short="1"]');
  await page.waitForSelector('.sm-exname');
  s = await act();
  assert.equal(s.short, true);
  assert.ok(s.exercises.length < 5 && s.exercises.length >= 1);
  assert.match(await page.textContent('.prog'), /Rutina corta/);
  await page.click('#sm-close'); await page.click('#modal-confirm');
  await page.waitForSelector('#session-mode-root', { state: 'detached' });
  assert.equal((await perfil()).planGuardado.id, planId);

  assert.deepEqual(errores, [], errores.join('\n'));
  await cerrar();
  console.log('e2e sesión sobre la app real: OK');
})().catch(e => { console.error(e); process.exit(1); });
