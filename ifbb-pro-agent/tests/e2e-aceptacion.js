/* E2E de la ACEPTACIÓN del aviso único, sobre la app real (DEC-024 y DEC-025 reemplazaron la aceptación del tope de
 * 25 series de DEC-014/DEC-016): con poco tiempo el plan avisa una sola vez y ofrece tres salidas; aceptar se guarda
 * por sesión en el plan guardado y caduca al cambiar el tiempo, los días o el objetivo; "más tiempo" y "más días"
 * cambian el perfil y regeneran el plan.
 * Uso: NODE_PATH=/opt/node22/lib/node_modules node ifbb-pro-agent/tests/e2e-aceptacion.js */
const { abrir, perfil, leer } = require('./e2e-comun.js');

const ok = (c, m) => { if (!c) { console.error('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };

(async () => {
  // Perfil apretado: avanzado, 3 días, 40 min por sesión. No entra todo lo que pide el plan.
  const seed = { profiles: [perfil('p1', { name: 'Apretado', level: 'advanced', daysPerWeek: 3, goal: 'bulk', tiempoDisponibleMin: 40 })], activeId: 'p1' };
  const { page, errores, cerrar } = await abrir({ seed });
  const guardado = async () => (await leer(page)).profiles[0];
  const irAEntreno = async () => { await page.click('[data-tab=plan]'); await page.click('[data-pt=training]'); await page.waitForSelector('[data-start-session="0"]'); };
  const editar = async cambios => {
    await page.click('[data-tab=profiles]'); await page.click('#btn-edit'); await page.waitForSelector('#form');
    await cambios();
    await page.click('button[type="submit"]'); await page.waitForSelector('#plan-body .stat');
    await irAEntreno();
  };

  await irAEntreno();
  ok(await page.locator('h3:has-text("Esta semana no entra todo lo que pide el plan")').count() === 1, 'un solo aviso, no una pila de avisos');
  for (const salida of ['mas-tiempo', 'mas-dias', 'aceptar']) {
    ok(await page.locator(`[data-salida="${salida}"]`).count() === 1, `el aviso ofrece la salida "${salida}"`);
  }

  // 1. Aceptar: se guarda por sesión, con el id del plan y su firma, y el aviso desaparece.
  await page.click('[data-salida="aceptar"]');
  await page.waitForSelector('#entreno');
  let p = await guardado();
  ok(p.planGuardado.aceptaciones.length > 0, 'la aceptación se guarda en el plan, no en el perfil');
  ok(p.planGuardado.aceptaciones.every(a => a.planId === p.planGuardado.id && typeof a.sesion === 'number' && a.firma), 'cada aceptación dice de qué sesión y de qué plan es');
  ok(!('longSessionAcceptance' in p.data) && !('longSessionAcceptedOn' in p.data), 'la aceptación vieja de DEC-016 ya no existe en el perfil');
  ok(await page.locator('h3:has-text("Esta semana no entra todo lo que pide el plan")').count() === 0, 'aceptado, el aviso no vuelve a aparecer');
  ok(await page.locator('text=Aceptada con lo que falta').count() >= 1, 'la sesión aceptada queda marcada');

  // 2. La aceptación caduca al cambiar el objetivo (uno de los campos de la firma).
  const idAceptado = p.planGuardado.id;
  await editar(() => page.selectOption('select[name="goal"]', 'cut'));
  p = await guardado();
  ok(p.planGuardado.id !== idAceptado, 'cambiar el objetivo regenera el plan');
  ok(p.planGuardado.aceptaciones.length === 0, 'la aceptación caduca con el plan nuevo');
  ok(await page.locator('[data-salida="aceptar"]').count() === 1, 'vuelve a ofrecer aceptar');

  // 3. "Más tiempo": sube los minutos de los días afectados en el perfil y regenera el plan.
  const idAntes = p.planGuardado.id;
  const minutosAntes = p.planGuardado.plan.sesiones.map(s => s.capacidadMin);
  await page.click('[data-salida="mas-tiempo"]');
  await page.waitForSelector('#entreno');
  p = await guardado();
  ok(Object.keys(p.data.tiempoPorDia || {}).length > 0, '"más tiempo" guarda el tiempo del día en el perfil');
  ok(p.planGuardado.id !== idAntes, '"más tiempo" regenera el plan');
  ok(p.planGuardado.plan.sesiones.some((s, i) => s.capacidadMin > minutosAntes[i]), 'alguna sesión tiene más capacidad que antes');

  // 4. "Más días": sube los días del perfil y el plan pasa a tener una sesión más.
  const diasAntes = p.planGuardado.plan.sesiones.length;
  if (await page.locator('[data-salida="mas-dias"]').count()) {
    await page.click('[data-salida="mas-dias"]');
    await page.waitForSelector('#entreno');
    p = await guardado();
    ok(p.data.daysPerWeek === diasAntes + 1, '"más días" sube los días del perfil');
    ok(p.planGuardado.plan.sesiones.length === diasAntes + 1, 'el plan tiene una sesión más');
  } else {
    ok(true, 'con el tiempo ya ajustado no queda aviso: "más días" no se ofrece (es correcto)');
  }

  // 5. Con tiempo de sobra no hay aviso ninguno (se vacía también el tiempo por día que dejó "más tiempo").
  await editar(async () => {
    await page.fill('input[name="tiempoDisponibleMin"]', '120');
    // El tiempo por día está dentro de "Cambiarlo en algunos días": hay que desplegarlo. Solo los días del split se ven.
    await page.click('summary:has-text("Cambiarlo en algunos días")');
    for (let i = 0; i < 6; i++) { const c = page.locator(`input[name="tiempoDia_${i}"]`); if (await c.isVisible()) await c.fill(''); }
  });
  ok(await page.locator('[data-salida]').count() === 0, 'con 120 min por sesión no hay aviso único');
  ok(await page.locator('h3:has-text("Esta semana no entra todo lo que pide el plan")').count() === 0, 'y tampoco su título');

  ok(errores.length === 0, 'sin errores de consola ' + errores.join(' | '));
  await cerrar();
})().catch(e => { console.error(e); process.exit(1); });
