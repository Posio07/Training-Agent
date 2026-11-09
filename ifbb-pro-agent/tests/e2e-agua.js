/* DEC-019 · E2E de la tarjeta de agua de la pestaña Dieta: dice "agua total (bebidas + alimentos)", no usa "≥" ni
 * el "+ lo perdido por sudor" que EFSA no respalda, y avisa que 20-30 % viene de la comida.
 * Uso: NODE_PATH=/opt/node22/lib/node_modules node ifbb-pro-agent/tests/e2e-agua.js */
const { abrir, perfil, CLAVE } = require('./e2e-comun.js');

const ok = (c, m) => { if (!c) { console.error('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };

(async () => {
  const seed = {
    profiles: [
      perfil('h1', { name: 'Hombre', sex: 'M', goal: 'maintain' }),
      perfil('m1', { name: 'Mujer', sex: 'F', heightCm: 165, weightKg: 60, division: 'general_w', goal: 'maintain' }),
    ],
    activeId: 'h1',
  };
  const { page, errores, cerrar } = await abrir({ seed });
  const tarjeta = async () => {
    await page.click('[data-pt=nutrition]');
    await page.waitForSelector('.stat:has-text("agua")');
    return (await page.locator('.stat:has-text("agua")').first().innerText()).replace(/\s+/g, ' ');
  };
  await page.click('[data-tab=plan]');
  let t = await tarjeta();
  ok(/2[.,]5 L/.test(t), 'hombre: 2,5 L (la cifra no cambia): ' + t);
  ok(/agua total \(bebidas \+ alimentos\)/.test(t), 'rotula la cifra como agua total (bebidas + alimentos)');
  ok(/20-30 %/.test(t) && /comida/.test(t), 'avisa que 20-30 % suele venir de la comida');
  ok(!/≥/.test(t) && !/lo perdido por sudor/.test(t), 'sin "≥" ni "+ lo perdido por sudor"');
  ok(/más si sudas mucho/.test(t), 'dice que se necesita más si se suda mucho, sin dar una cifra inventada');
  await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.activeId = 'm1'; localStorage.setItem(k, JSON.stringify(s)); }, CLAVE);
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('[data-tab=plan]');
  t = await tarjeta();
  ok(/(^|\s)2([.,]0)? L/.test(t) && /agua total/.test(t), 'mujer: 2 L (la cifra no cambia), también como agua total: ' + t);
  ok(errores.length === 0, 'sin errores de consola ' + errores.join(' | '));
  await cerrar();
})().catch(e => { console.error(e); process.exit(1); });
