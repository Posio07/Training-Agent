/* Recorrido en Chromium móvil de la pantalla de PROGRESO POR VARIANTE del núcleo nuevo, sobre la app real: la fuerza
 * se separa por variante y el historial permite corregir o borrar series, dentro de la pestaña Progreso.
 * Uso: NODE_PATH=/opt/node22/lib/node_modules node ifbb-pro-agent/tests/e2e-progreso.js */
const assert = require('node:assert/strict');
const { abrir, perfil, leer } = require('./e2e-comun.js');

const fila = (sessionId, date, exerciseId, exercise, setType, setNumber, weight, reps, savedAt) =>
  ({ sessionId, date, exerciseId, exercise, setType, setNumber, weight, reps, savedAt, setKey: `${sessionId}|${exerciseId}|${setType}|${setNumber}` });

(async () => {
  // Un perfil sin series: la pestaña Progreso tiene que decir qué falta, no romperse.
  const vacio = perfil('p1', { name: 'Prueba' });
  const { page, errores, cerrar } = await abrir({ seed: { profiles: [vacio], activeId: 'p1' } });
  const guardado = async () => (await leer(page)).profiles[0];
  const irAProgreso = async () => { await page.click('[data-tab=progress]'); await page.waitForSelector('#progreso-variante'); };

  await irAProgreso();
  assert.match(await page.textContent('#progreso-variante'), /Completa dos sesiones/);
  assert.match(await page.textContent('#progreso-variante'), /Todavía no registraste ninguna sesión/);

  // Series de dos variantes en tres sesiones (las filas llevan el id de la variante, como las que guarda la pantalla de sesión).
  await page.evaluate(([clave, workouts, sessions]) => {
    const s = JSON.parse(localStorage.getItem(clave));
    s.profiles[0].workouts = workouts; s.profiles[0].sessions = sessions;
    localStorage.setItem(clave, JSON.stringify(s));
  }, [require('./e2e-comun.js').CLAVE, [
    fila('s1', '2026-11-01', 'quads.squat_back', 'Sentadilla trasera', 'top', 1, 100, 5, 1),
    fila('s1', '2026-11-01', 'chest.bench_press_barbell', 'Press banca con barra', 'normal', 1, 60, 8, 2),
    fila('s2', '2026-11-05', 'quads.squat_back', 'Sentadilla trasera', 'top', 1, 105, 5, 3),
    fila('s3', '2026-11-08', 'quads.squat_hack', 'Sentadilla hack', 'normal', 1, 120, 10, 4),
  ], [
    { sessionId: 's1', dayName: 'Día 2', date: '2026-11-01', startedAt: 1, completedAt: 2 },
    { sessionId: 's2', dayName: 'Día 2', date: '2026-11-05', startedAt: 1, completedAt: 2 },
    { sessionId: 's3', dayName: 'Día 2', date: '2026-11-08', startedAt: 1, completedAt: 2 },
  ]]);
  await page.reload({ waitUntil: 'networkidle' });
  await irAProgreso();
  await page.waitForSelector('#strength-exercise-select');

  // 1. La fuerza es por variante: la más reciente primero (hack, 1 punto); la sentadilla trasera tiene 2 puntos y dibuja el gráfico; el press, 1.
  const opciones = await page.locator('#strength-exercise-select option').allTextContents();
  assert.equal(opciones.length, 3);
  assert.equal(opciones[0], 'Sentadilla en hack');
  assert.ok(opciones.includes('Press banca con barra') && opciones.includes('Sentadilla trasera'), 'una opción por variante');
  assert.ok(!(await page.locator('#progreso-variante svg.chart').count()), 'con un solo punto no hay gráfico');
  await page.selectOption('#strength-exercise-select', 'quads.squat_back');
  assert.equal(await page.locator('#progreso-variante svg.chart circle').count(), 2, 'la sentadilla trasera tiene sus dos sesiones y no mezcla el hack');

  // 2. El historial lista las 3 sesiones; se abre una, se corrige una serie y se actualiza.
  assert.equal(await page.locator('.hist-session').count(), 3);
  await page.click('.hist-session[data-sid="s2"] summary');
  await page.click('.hist-session[data-sid="s2"] [data-hist-edit]');
  await page.fill('.set-editor input[name="weight"]', '110');
  await page.click('.set-editor button[type="submit"]');
  await page.waitForSelector('.set-editor', { state: 'detached' });
  assert.equal((await guardado()).workouts.find(w => w.sessionId === 's2').weight, 110);
  assert.match(await page.textContent('#progreso-variante'), /110/);

  // 3. Borrar pide confirmación: cancelar no borra; aceptar borra la serie y el gráfico vuelve a un solo punto.
  await page.click('.hist-session[data-sid="s2"] [data-hist-edit]');
  await page.click('[data-editor-delete]'); await page.click('#modal-cancel');
  await page.waitForTimeout(100);
  assert.equal((await guardado()).workouts.filter(w => w.sessionId === 's2').length, 1, 'cancelar no borra');
  await page.click('[data-editor-delete]'); await page.click('#modal-confirm');
  await page.waitForSelector('.set-editor', { state: 'detached' });
  assert.equal((await guardado()).workouts.filter(w => w.sessionId === 's2').length, 0);
  assert.ok(!(await page.locator('#progreso-variante svg.chart').count()));

  // 4. El peso y las medidas siguen en la pestaña Progreso, junto a la fuerza por variante.
  assert.ok(await page.locator('#log-form input[name="weightKg"]').count(), 'el formulario de medición sigue ahí');
  assert.match(await page.textContent('#view'), /Peso vs\. objetivo/);

  assert.deepEqual(errores, [], errores.join('\n'));
  await cerrar();
  console.log('e2e progreso sobre la app real: OK');
})().catch(e => { console.error(e); process.exit(1); });
