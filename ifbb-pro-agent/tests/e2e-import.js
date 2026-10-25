/* B-001 / DEC-018 · E2E de ida y vuelta: exporta un perfil con entrenamiento, lo importa en el navegador y comprueba que
 * vuelven las series y sesiones (sin dolor ni salud) en un perfil nuevo, con su id nuevo.
 * Uso: node tests/e2e-import.js */
const path = require('path'), http = require('http'), fs = require('fs'), os = require('os');
const { chromium, devices } = require('playwright');
const root = path.join(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(root, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
const ok = (c, m) => { if (!c) { console.error('FALLA:', m); process.exitCode = 1; } else console.log('ok  -', m); };
(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch(); const ctx = await browser.newContext({ ...devices['Pixel 7'], acceptDownloads: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept()); // aviso de perfil local con lesiones parecido (DEC-009)
  const row = (n, pain) => ({ setKey: `s1:0:${n}`, sessionId: 's1', date: '2026-10-01', dayIndex: 0, dayName: 'Día 1', exercise: 'Press banca con barra', exerciseId: 'chest.bench_press_barbell', muscle: 'chest', setType: n ? 'backoff' : 'top', setNumber: 1, weight: 80 - n * 8, reps: 5 + n, pain, short: false, savedAt: 1790000000000 + n });
  const orig = { profiles: [{ id: 'orig1', createdAt: '2026-09-01', updatedAt: '2026-10-20', log: [{ date: '2026-09-01', weightKg: 84, notes: 'Datos iniciales' }],
    data: { name: 'Con entreno', sex: 'M', age: 30, heightCm: 178, weightKg: 85, bodyFatPct: 15, activity: 'moderate', level: 'intermediate', daysPerWeek: 4, division: 'general_m', goal: 'cut', health: { screening: { regularExercise: true, cvMetabolicRenal: false, symptoms: false, medicalClearance: true }, diabetes: { type: 'none', medication: false }, injuries: [{ zone: 'shoulder', diagnosed: false, painNow: true, clearanceDate: '2026-10-01' }] } },
    workouts: [row(0, 3), row(1, null), row(2, 6)],
    sessions: [{ sessionId: 's1', status: 'completada', date: '2026-10-01', dayIndex: 0, dayName: 'Día 1', short: false, startedAt: 1789999000000, finishedAt: 1790001000000, setsDone: 3, setsTotal: 3 }],
    painFlags: { bench_press: { flagged: true, cleanStreak: 0, lastSessionId: 's1', painSessions: [{ sessionId: 's1', date: '2026-10-01' }] } } }], activeId: 'orig1' };
  await page.addInitScript(s => { if (!localStorage.getItem('ifbb-agent:v1')) localStorage.setItem('ifbb-agent:v1', s); }, JSON.stringify(orig));
  await page.goto(base, { waitUntil: 'networkidle' });
  const stored = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('ifbb-agent:v1')));
  await page.click('[data-tab=profiles]');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export')]);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'imp-')), 'export.json');
  await download.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok(exported.workouts.length === 3 && exported.sessions.length === 1, 'el archivo exportado lleva 3 series y 1 sesión');
  ok(!JSON.stringify(exported).match(/"pain":|painFlags|"injuries":\[\{|clearanceDate/), 'el archivo exportado no lleva dolor, painFlags ni lesiones (DEC-009 sin cambios)');
  await page.setInputFiles('#file-import', file);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('ifbb-agent:v1')).profiles.length === 2);
  const st = await stored(); const neu = st.profiles[1];
  ok(neu.id !== 'orig1' && st.activeId === neu.id, 'el perfil importado es nuevo, con id nuevo, y queda activo');
  ok(Array.isArray(neu.workouts) && neu.workouts.length === 3, 'vuelven las 3 series');
  ok(Array.isArray(neu.sessions) && neu.sessions.length === 1 && neu.sessions[0].sessionId === 's1', 'vuelve la sesión');
  ok(neu.workouts.every(w => !('pain' in w)) && !neu.painFlags, 'sin dolor por serie ni painFlags');
  ok(!neu.data.health || !(neu.data.health.injuries || []).length, 'sin lesiones ni datos de salud');
  ok(JSON.stringify(neu.workouts.map(w => [w.setKey, w.weight, w.reps])) === JSON.stringify(exported.workouts.map(w => [w.setKey, w.weight, w.reps])), 'las series son las mismas que se exportaron');
  ok(st.profiles[0].workouts.length === 3 && st.profiles[0].workouts[0].pain === 3 && st.profiles[0].painFlags, 'el perfil original no se toca (conserva su dolor y sus lesiones)');
  await page.click('[data-tab=progress]');
  await page.waitForSelector('.hist-session', { timeout: 5000 });
  ok(await page.locator('text=Sesiones registradas').count() >= 1 && await page.locator('.hist-session').count() === 1, 'Progreso muestra la sesión restaurada');
  ok(errors.length === 0, 'sin errores de consola ' + errors.join(' | '));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
