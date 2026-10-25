/* DEC-019 · E2E de la tarjeta de agua de la pestaña Dieta: dice "agua total (bebidas + alimentos)", no usa "≥" ni
 * el "+ lo perdido por sudor" que EFSA no respalda, y avisa que 20-30 % viene de la comida.
 * Uso: node tests/e2e-agua.js */
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require('playwright');
const root = path.join(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(root, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
const ok = (c, m) => { if (!c) { console.error('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch(); const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const mk = (id, name, sex, division) => ({ id, createdAt: '2026-10-01', updatedAt: '2026-10-20', log: [], data: { name, sex, age: 30, heightCm: sex === 'M' ? 178 : 165, weightKg: sex === 'M' ? 85 : 60, bodyFatPct: 15, activity: 'moderate', level: 'intermediate', daysPerWeek: 4, division, goal: 'maintain' } });
  const seed = { profiles: [mk('h1', 'Hombre', 'M', 'general_m'), mk('m1', 'Mujer', 'F', 'general_w')], activeId: 'h1' };
  await page.addInitScript(s => { if (!localStorage.getItem('ifbb-agent:v1')) localStorage.setItem('ifbb-agent:v1', s); }, JSON.stringify(seed));
  await page.goto(base, { waitUntil: 'networkidle' });
  const card = async () => { await page.click('[data-pt=nutrition]'); await page.waitForSelector('.stat:has-text("agua")'); return (await page.locator('.stat:has-text("agua")').first().innerText()).replace(/\s+/g, ' '); };
  await page.click('[data-tab=plan]');
  let t = await card();
  ok(/2[.,]5 L/.test(t), 'hombre: 2,5 L (la cifra no cambia): ' + t);
  ok(/agua total \(bebidas \+ alimentos\)/.test(t), 'rotula la cifra como agua total (bebidas + alimentos)');
  ok(/20-30 %/.test(t) && /comida/.test(t), 'avisa que 20-30 % suele venir de la comida');
  ok(!/≥/.test(t) && !/lo perdido por sudor/.test(t), 'sin "≥" ni "+ lo perdido por sudor"');
  ok(/más si sudas mucho/.test(t), 'dice que se necesita más si se suda mucho, sin dar una cifra inventada');
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ifbb-agent:v1')); s.activeId = 'm1'; localStorage.setItem('ifbb-agent:v1', JSON.stringify(s)); });
  await page.reload({ waitUntil: 'networkidle' }); await page.click('[data-tab=plan]');
  t = await card();
  ok(/(^|\s)2([.,]0)? L/.test(t) && /agua total/.test(t), 'mujer: 2 L (la cifra no cambia), también como agua total: ' + t);
  ok(errors.length === 0, 'sin errores de consola ' + errors.join(' | '));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
