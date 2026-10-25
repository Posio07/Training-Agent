/* DEC-016 · E2E de la aceptación acotada: migra la fecha vieja al arrancar, vale mientras no cambie el plan, se invalida al cambiar
 * los días, se vuelve a pedir y se puede revertir. Además comprueba el aviso de grupos bajo el mínimo.
 * Uso: node tests/e2e-aceptacion.js */
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require('playwright');
const root = path.join(__dirname, '..');
const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json' };
const server = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.join(root,p); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();} res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(res); });
const ok = (c, m) => { if (!c) { console.error('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch(); const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type()==='error') errors.push('console: '+m.text()); });
  // Estado "de antes": perfil con la aceptación vieja (solo fecha) y 3 días.
  const legacy = { profiles: [{ id: 'p1', createdAt: '2026-10-01', updatedAt: '2026-10-20', log: [], data: { name:'Vieja', sex:'M', age:30, heightCm:178, weightKg:85, bodyFatPct:15, activity:'moderate', level:'intermediate', daysPerWeek:3, division:'general_m', goal:'cut', longSessionAcceptedOn:'2026-10-20' } }], activeId: 'p1' };
  await page.addInitScript(s => { if (!localStorage.getItem('ifbb-agent:v1')) localStorage.setItem('ifbb-agent:v1', s); }, JSON.stringify(legacy));
  await page.goto(base, { waitUntil: 'networkidle' });
  const stored = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('ifbb-agent:v1'))).profiles[0].data;
  let d = await stored();
  ok(d.longSessionAcceptedOn === '' && d.longSessionAcceptance && d.longSessionAcceptance.maxSets === 35 && /dias=3;division=general_m;objetivo=cut/.test(d.longSessionAcceptance.signature), 'al arrancar migra la fecha vieja: firma y máximo (35) del plan vigente');
  await page.click('[data-pt=training]');
  ok(await page.locator('text=Sesiones más largas aceptadas').count() === 1, 'Entreno muestra la aceptación vigente');
  ok(await page.locator('text=hasta 35 series por sesión').count() === 1, 'dice el máximo aceptado');
  ok(await page.locator('[data-accept-long]').count() === 0, 'sin botón de aceptar mientras vale');
  ok(await page.locator('[data-change-split]').count() === 1, 'grupos chicos bajo el mínimo: ofrece cambiar de split (hay aviso)');
  // Editar el perfil: 3 → 4 días. La firma cambia y la aceptación deja de valer.
  await page.click('[data-tab=profiles]'); await page.click('#btn-edit');
  await page.selectOption('select[name=daysPerWeek]', '4');
  await page.click('#form button[type=submit]');
  await page.waitForSelector('[data-pt=training]'); await page.click('[data-pt=training]');
  d = await stored();
  ok(d.daysPerWeek === 4 && d.longSessionAcceptance && d.longSessionAcceptance.maxSets === 35, 'editar el perfil conserva la aceptación guardada (la firma decide)');
  ok(await page.locator('text=Sesiones más largas aceptadas').count() === 0, 'al cambiar los días la aceptación ya no vale');
  ok(await page.locator('text=ya no aplica').count() >= 1, 'la interfaz avisa que ya no aplica');
  ok(await page.locator('[data-accept-long]').count() >= 1, 'vuelve a ofrecer aceptar');
  await page.locator('[data-accept-long]').first().click();
  d = await stored();
  ok(/dias=4;/.test(d.longSessionAcceptance.signature) && d.longSessionAcceptance.maxSets === 32, 'aceptar de nuevo guarda la firma de 4 días y su máximo (32)');
  ok(await page.locator('text=Sesiones más largas aceptadas').count() === 1, 'vuelve a quedar aceptada');
  await page.locator('[data-revoke-long]').first().click();
  d = await stored(); ok(d.longSessionAcceptance === null, 'revertir quita la aceptación');
  await page.click('[data-pt=summary]');
  ok(await page.locator('.alert:has-text("por debajo de 10 series fraccionadas")').count() >= 1, 'el Resumen muestra el aviso de grupos bajo el mínimo');
  ok(errors.length === 0, 'sin errores de consola ' + errors.join(' | '));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
