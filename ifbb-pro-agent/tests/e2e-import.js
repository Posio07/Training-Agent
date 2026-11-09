/* B-001 / DEC-018 · E2E de ida y vuelta: exporta un perfil con entrenamiento, lo importa en la app y comprueba que
 * vuelven las series y sesiones (sin dolor ni salud) en un perfil nuevo, con su id nuevo y con su plan guardado.
 * Uso: NODE_PATH=/opt/node22/lib/node_modules node ifbb-pro-agent/tests/e2e-import.js */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { abrir, perfil, leer } = require('./e2e-comun.js');

const ok = (c, m) => { if (!c) { console.error('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };

(async () => {
  // Series con `setKey`: desde el corte una fila sin él no se importa (DEC-023 reemplaza la cláusula de DEC-018).
  const fila = (n, dolor) => ({ setKey: `s1:0:${n}`, sessionId: 's1', date: '2026-10-01', dayIndex: 0, dayName: 'Día 1 · Torso A', exercise: 'Press banca con barra', exerciseId: 'chest.bench_press_barbell', muscle: 'chest', setType: n ? 'backoff' : 'top', setNumber: 1, weight: 80 - n * 8, reps: 5 + n, pain: dolor, short: false, savedAt: 1790000000000 + n });
  const origen = perfil('orig1', {
    name: 'Con entreno',
    health: { screening: { regularExercise: true, cvMetabolicRenal: false, symptoms: false, medicalClearance: true }, diabetes: { type: 'none', medication: false }, injuries: [{ zone: 'shoulder', diagnosed: false, painNow: true, clearanceDate: '2026-10-01' }] },
  });
  origen.log = [{ date: '2026-09-01', weightKg: 84, notes: 'Datos iniciales' }];
  origen.workouts = [fila(0, 3), fila(1, null), fila(2, 6)];
  origen.sessions = [{ sessionId: 's1', status: 'completada', date: '2026-10-01', dayIndex: 0, dayName: 'Día 1 · Torso A', short: false, startedAt: 1789999000000, finishedAt: 1790001000000, setsDone: 3, setsTotal: 3 }];
  origen.painFlags = { hombro: { flagged: true, cleanStreak: 0, lastSessionId: 's1', painSessions: [{ sessionId: 's1', date: '2026-10-01' }] } };

  const { page, errores, cerrar } = await abrir({ seed: { profiles: [origen], activeId: 'orig1' }, descargas: true });
  page.on('dialog', d => d.accept()); // aviso de perfil local con lesiones parecido (DEC-009)

  await page.click('[data-tab=profiles]');
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export')]);
  const archivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'imp-')), 'export.json');
  await descarga.saveAs(archivo);
  const exportado = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  ok(exportado.workouts.length === 3 && exportado.sessions.length === 1, 'el archivo exportado lleva 3 series y 1 sesión');
  ok(!JSON.stringify(exportado).match(/"pain":|painFlags|"injuries":\[\{|clearanceDate/), 'el archivo exportado no lleva dolor, painFlags ni lesiones (DEC-009 sin cambios)');
  ok(!JSON.stringify(exportado).includes('planGuardado'), 'el export no lleva el plan guardado (DEC-009: las lesiones lo moldean)');

  await page.setInputFiles('#file-import', archivo);
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k)).profiles.length === 2, require('./e2e-comun.js').CLAVE);
  const st = await leer(page);
  const nuevo = st.profiles[1];
  ok(nuevo.id !== 'orig1' && st.activeId === nuevo.id, 'el perfil importado es nuevo, con id nuevo, y queda activo');
  ok(Array.isArray(nuevo.workouts) && nuevo.workouts.length === 3, 'vuelven las 3 series');
  ok(Array.isArray(nuevo.sessions) && nuevo.sessions.length === 1 && nuevo.sessions[0].sessionId === 's1', 'vuelve la sesión');
  ok(nuevo.workouts.every(w => !('pain' in w)) && !Object.keys(nuevo.painFlags || {}).length, 'sin dolor por serie ni banderas de dolor');
  ok(!nuevo.data.health || !(nuevo.data.health.injuries || []).length, 'sin lesiones ni datos de salud');
  ok(nuevo.planGuardado && nuevo.planGuardado.plan.sesiones.length === 4, 'el perfil importado nace con su plan guardado');
  ok(JSON.stringify(nuevo.workouts.map(w => [w.setKey, w.weight, w.reps])) === JSON.stringify(exportado.workouts.map(w => [w.setKey, w.weight, w.reps])), 'las series son las mismas que se exportaron');
  ok(st.profiles[0].workouts.length === 3 && st.profiles[0].workouts[0].pain === 3 && Object.keys(st.profiles[0].painFlags).length, 'el perfil original no se toca (conserva su dolor y sus lesiones)');

  await page.click('[data-tab=progress]');
  await page.waitForSelector('.hist-session', { timeout: 5000 });
  ok(await page.locator('text=Sesiones registradas').count() >= 1 && await page.locator('.hist-session').count() === 1, 'Progreso muestra la sesión restaurada');
  ok(errores.length === 0, 'sin errores de consola ' + errores.join(' | '));
  await cerrar();
})().catch(e => { console.error(e); process.exit(1); });
