/* Recorrido en Chromium móvil de las pantallas de PERFIL y PLAN del núcleo nuevo, sobre la app real: crea un perfil
 * con tiempo y prioritarios, revisa el plan, el aviso único y sus tres salidas, regenerar, editar y el almacenamiento.
 * Uso: NODE_PATH=/opt/node22/lib/node_modules node ifbb-pro-agent/tests/e2e-pantallas.js */
const assert = require('node:assert/strict');
const { abrir, leer, CLAVE, CLAVE_VIEJA } = require('./e2e-comun.js');

(async () => {
  const { page, errores, cerrar } = await abrir({});
  const perfilGuardado = async () => (await leer(page)).profiles[0];
  const irAEntreno = async () => { await page.click('[data-tab=plan]'); await page.click('[data-pt=training]'); await page.waitForSelector('[data-start-session="0"]'); };
  // Editar el perfil activo: Perfiles → "Editar datos" (la pestaña Datos sola abre un perfil nuevo, como antes del corte).
  const editarPerfil = async () => { await page.click('[data-tab=profiles]'); await page.click('#btn-edit'); await page.waitForSelector('#form'); };

  // 1. Sin perfiles, "Nuevo perfil" abre el formulario con los campos nuevos.
  await page.click('#btn-new');
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
  await page.waitForSelector('#plan-body .stat'); // guardar vuelve al Resumen
  await irAEntreno();

  // 3. El plan trae 3 sesiones, el cardio y el aviso único con sus salidas.
  assert.equal(await page.locator('.session').count(), 3);
  assert.ok((await page.textContent('#entreno')).includes('Cardio'));
  assert.ok(await page.locator('.card h3', { hasText: 'Esta semana no entra todo' }).count(), 'aviso único');
  let p = await perfilGuardado();
  assert.equal(p.data.tiempoDisponibleMin, 45);
  assert.deepEqual(p.data.prioritarios, ['quads.squat_back']);

  // 4. Aceptar: el aviso desaparece para esas sesiones y se guarda la aceptación.
  await page.click('[data-salida="aceptar"]');
  await page.waitForSelector('#entreno');
  p = await perfilGuardado();
  assert.ok(p.planGuardado.aceptaciones.length > 0);
  assert.equal(await page.locator('.card h3', { hasText: 'Esta semana no entra todo' }).count(), 0);

  // 5. Más días regenera el plan (4 sesiones) y la aceptación caduca.
  const idAntes = p.planGuardado.id;
  await editarPerfil();
  await page.selectOption('select[name="daysPerWeek"]', '4');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#plan-body .stat');
  await irAEntreno();
  p = await perfilGuardado();
  assert.notEqual(p.planGuardado.id, idAntes, 'cambiar los días regenera el plan');
  assert.equal(await page.locator('.session').count(), 4);
  assert.deepEqual(p.planGuardado.aceptaciones, [], 'regenerar borra las aceptaciones');

  // 6. Cambiar el nombre no regenera el plan.
  const id4 = p.planGuardado.id;
  await editarPerfil();
  await page.fill('input[name="name"]', 'Otro nombre');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#plan-body .stat');
  assert.equal((await perfilGuardado()).planGuardado.id, id4);

  // 7. Regenerar, desplegar una sesión y empezarla.
  await irAEntreno();
  await page.click('[data-regenerar]');
  await page.waitForSelector('[data-start-session="0"]');
  assert.notEqual((await perfilGuardado()).planGuardado.id, id4);
  await page.click('[data-toggle-day="1"]');
  assert.equal(await page.getAttribute('[data-toggle-day="1"]', 'aria-expanded'), 'true');
  await page.click('#day-body-1 [data-start-session]');
  await page.waitForSelector('#session-mode-root .session-mode'); // abre el modo sesión
  // Se termina sin registrar nada, para no dejar una sesión en curso que el resto del recorrido tendría que reanudar.
  await page.click('#sm-finish'); await page.waitForSelector('#sm-back-to-plan');
  await page.click('#sm-back-to-plan');
  await page.waitForSelector('#session-mode-root', { state: 'detached' });

  // 8. Con la bandera de salud entran los funcionales y el cardio pasa a 150 min.
  await editarPerfil();
  await page.check('input[name="healthGoal"]');
  await page.selectOption('select[name="goal"]', 'cut');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#plan-body .stat');
  await irAEntreno();
  const txt = await page.textContent('#entreno');
  assert.ok(/búlgara/i.test(txt) && /granjero/i.test(txt), 'funcionales de la bandera');
  assert.ok(/3 sesiones × 50 min/.test(txt), 'cardio de 150 min');

  // 9. DEC-009: con síntomas y sin autorización médica el plan no se muestra.
  await editarPerfil();
  await page.check('input[name="healthSymptoms"]');
  await page.click('button[type="submit"]');
  await page.waitForSelector('#btn-medical-clearance');
  assert.equal(await page.locator('.subtabs').count(), 0, 'el plan no se ve con el tamizaje bloqueando');
  assert.equal(await page.locator('.session').count(), 0);

  // 10. Borrar los datos de salud pide confirmación: si se cancela, no se borra; si se acepta, sí.
  await page.click('#btn-edit-health'); await page.waitForSelector('#btn-clear-health');
  await page.click('#btn-clear-health'); await page.click('#modal-cancel');
  await page.waitForTimeout(100);
  assert.equal((await perfilGuardado()).data.health.screening.symptoms, true, 'cancelar no borra');
  await page.click('#btn-clear-health'); await page.click('#modal-confirm');
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k)).profiles[0].data.health.screening.symptoms === false, CLAVE);

  // 11. El almacenamiento persiste: al recargar, el perfil y su plan guardado siguen, y la clave vieja no se toca.
  const planId = (await perfilGuardado()).planGuardado.id;
  await page.reload({ waitUntil: 'networkidle' });
  await irAEntreno();
  p = await perfilGuardado();
  assert.equal((await leer(page)).profiles.length, 1);
  assert.equal(p.planGuardado.id, planId, 'el plan guardado sobrevive a la recarga');
  assert.equal(p.data.healthGoal, true);
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).sort()), [CLAVE], 'la app solo escribe su clave nueva (DEC-032)');
  assert.equal(await page.evaluate(k => localStorage.getItem(k), CLAVE_VIEJA), null, 'la clave de la app anterior no se escribe');
  // Un plan guardado roto se regenera; un estado ilegible se ignora y se empieza vacío (sin migraciones).
  await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.profiles[0].planGuardado = { id: 'roto' }; localStorage.setItem(k, JSON.stringify(s)); }, CLAVE);
  await page.reload({ waitUntil: 'networkidle' });
  await irAEntreno();
  assert.notEqual((await perfilGuardado()).planGuardado.id, 'roto');
  await page.evaluate(k => localStorage.setItem(k, '{basura'), CLAVE);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#btn-new');
  assert.equal(await page.locator('.profile-item').count(), 0, 'un estado ilegible se ignora y la app arranca vacía');
  assert.ok(/Aún no hay perfiles/.test(await page.textContent('#view')));

  assert.deepEqual(errores, [], errores.join('\n'));
  await cerrar();
  console.log('e2e pantallas (perfil y plan) sobre la app real: OK');
})().catch(e => { console.error(e); process.exit(1); });
