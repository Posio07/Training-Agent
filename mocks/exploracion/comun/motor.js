/* Motor de sesión de los mocks de exploración. No es código de la app: imita, en pequeño, los eventos reales de la pantalla de sesión
 * (`js/core-v2/pantallas/sesion.js` y `js/sessionStore.js`) para que cada dirección de diseño reaccione a lo mismo que reaccionaría la app:
 *   - registrar una serie (peso y repeticiones) y arrancar el descanso de esa serie;
 *   - el descanso: cada tic, los últimos 10 segundos (urgente), el cero, "+30 s" y "Saltar";
 *   - el récord del top set (1RM estimado con Epley contra los top sets anteriores);
 *   - el back-off que pesa de más y pasa a serie de trabajo (A5);
 *   - cambiar de ejercicio, terminar y el resumen (series hechas, minutos reales, top sets del día, pendientes).
 * En modo demo el descanso corre acelerado hasta que faltan 11 segundos y de ahí sigue en tiempo real. */
(function () {
  'use strict';
  const epley = (w, r) => w * (1 + r / 30);
  const r1 = v => Math.round(v * 10) / 10;
  const n1 = v => String(r1(v)).replace('.', ',');
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Reparto de discos por lado, igual que la app: de mayor a menor, y si no da exacto se queda por debajo.
  function discos(total, barra, disponibles) {
    let resto = (total - barra) / 2; const usados = [];
    if (!(resto > 0)) return { discos: [], logrado: barra };
    disponibles.slice().sort((a, b) => b - a).forEach(p => { while (resto >= p - 1e-6) { usados.push(p); resto -= p; } });
    return { discos: usados, logrado: barra + usados.reduce((a, b) => a + b, 0) * 2 };
  }

  function crear(datos) {
    const oyentes = {};
    const on = (ev, fn) => { (oyentes[ev] = oyentes[ev] || []).push(fn); };
    const emitir = (ev, d) => (oyentes[ev] || []).forEach(fn => fn(d));
    let desfase = 0, s = null, reloj_ = null, urgente = false;
    const reloj = () => Date.now() + desfase;
    const m = { demo: true, on, epley, n1, fmt, datos };

    m.estado = () => s;
    m.discosDe = peso => discos(peso, datos.perfil.barra, datos.perfil.discos);

    m.iniciar = function (clave) {
      pararReloj();
      const plan = datos.sesiones[clave || 'completa'];
      s = {
        clave: clave || 'completa', corta: (clave || 'completa') !== 'completa', nombre: plan.nombre,
        ejercicios: JSON.parse(JSON.stringify(plan.ejercicios)), exIndex: 0, startedAt: reloj(), rest: null, records: [], terminado: false,
      };
      s.values = s.ejercicios.map(e => e.sets.map((st, j) => ({ peso: e.sugerido[j].peso, reps: e.sugerido[j].reps, done: false })));
      return s;
    };

    m.total = () => s.values.flat().length;
    m.hechas = () => s.values.flat().filter(v => v.done).length;
    m.pendiente = i => s.values[i].findIndex(v => !v.done); // primera serie sin hacer del ejercicio, o -1
    m.ejercicio = () => s.ejercicios[s.exIndex];
    m.etiqueta = st => ({ top: 'Top set', backoff: `Back-off ${st.n}`, normal: `Serie ${st.n}` }[st.tipo]);
    m.ultimaDe = (e, st) => e.ultima.sets.find(x => x.tipo === st.tipo && x.n === st.n) || null;
    m.volumen = () => s.values.flat().filter(v => v.done).reduce((a, v) => a + v.peso * v.reps, 0);

    // Registrar una serie. Devuelve { ok, error } o { ok, serie, a5, record, descanso }.
    m.registrar = function (setIdx, vals) {
      const e = s.ejercicios[s.exIndex], st = e.sets[setIdx], v = s.values[s.exIndex][setIdx];
      if (!(vals.reps > 0)) return { ok: false, error: 'Pon las repeticiones hechas.' };
      if (v.done) return { ok: false, error: 'Esa serie ya está registrada.' };
      let a5 = null;
      if (st.tipo === 'backoff') { // A5: un back-off pesa como mucho el 90 % del top set registrado
        const top = e.sets.findIndex((x, i) => x.tipo === 'top' && s.values[s.exIndex][i].done);
        if (top >= 0) { const max = s.values[s.exIndex][top].peso * 0.9; if (vals.peso > max + 1e-9) { a5 = { maximo: r1(max), top: s.values[s.exIndex][top].peso }; st.tipo = 'normal'; } }
      }
      v.peso = vals.peso; v.reps = vals.reps; v.done = true; v.doneAt = reloj();
      const ult = m.ultimaDe(e, st);
      const serie = {
        exIndex: s.exIndex, setIdx, tipo: st.tipo, etiqueta: m.etiqueta(st), nombre: e.nombre, peso: v.peso, reps: v.reps, volumen: v.peso * v.reps,
        // Comparación con la misma serie de la última vez (1RM estimado): > 1 es mejor que la última vez.
        contraUltima: ult && ult.peso > 0 ? epley(v.peso, v.reps) / epley(ult.peso, ult.reps) : (ult ? v.reps / ult.reps : 1),
        ejercicioCompleto: s.values[s.exIndex].every(x => x.done), sesionCompleta: s.values.flat().every(x => x.done),
      };
      let record = null;
      if (st.tipo === 'top' && v.peso > 0 && !s.records.includes(e.id)) {
        const previos = e.ultima.sets.filter(x => x.tipo === 'top');
        if (previos.length) {
          const mejor = previos.reduce((a, b) => (epley(a.peso, a.reps) >= epley(b.peso, b.reps) ? a : b));
          if (epley(v.peso, v.reps) > epley(mejor.peso, mejor.reps)) {
            s.records.push(e.id);
            record = { nombre: e.nombre, peso: v.peso, reps: v.reps, e1rm: r1(epley(v.peso, v.reps)), previo: { peso: mejor.peso, reps: mejor.reps, e1rm: r1(epley(mejor.peso, mejor.reps)) } };
          }
        }
      }
      const descanso = serie.sesionCompleta ? null : m.descansar(st.descansoS);
      return { ok: true, serie, a5, record, descanso };
    };

    /* Descanso */
    function pararReloj() { if (reloj_) { clearInterval(reloj_); reloj_ = null; } }
    m.restante = () => (s && s.rest ? Math.min(s.rest.total, Math.max(0, Math.ceil((s.rest.endAt - reloj()) / 1000))) : 0);
    m.descansar = function (segundos) {
      pararReloj(); urgente = false;
      s.rest = { total: segundos, startedAt: reloj(), endAt: reloj() + segundos * 1000 };
      reloj_ = setInterval(tic, 100);
      return s.rest;
    };
    function tic() {
      if (!s || !s.rest) { pararReloj(); return; }
      if (m.demo && m.restante() > 11) desfase += 2400; // demo: unas 25 veces más rápido hasta los últimos segundos
      const r = m.restante();
      emitir('tic', { restante: r, total: s.rest.total, fraccion: 1 - Math.min(1, (s.rest.endAt - reloj()) / (s.rest.total * 1000)) });
      if (r <= 10 && r > 0 && !urgente) { urgente = true; emitir('urgente', { restante: r }); }
      if (r <= 0) { s.rest = null; pararReloj(); emitir('fin', { saltado: false }); }
    }
    m.extender = seg => { if (!s.rest) return; s.rest.endAt += seg * 1000; s.rest.total += seg; if (m.restante() > 10) urgente = false; emitir('extendido', { restante: m.restante() }); };
    m.saltar = () => { if (!s.rest) return; s.rest = null; pararReloj(); emitir('fin', { saltado: true }); };

    /* Navegación entre ejercicios */
    m.irA = i => { s.exIndex = Math.max(0, Math.min(s.ejercicios.length - 1, i)); return s.exIndex; };
    m.siguiente = () => (s.exIndex < s.ejercicios.length - 1 ? m.irA(s.exIndex + 1) : -1);
    m.anterior = () => m.irA(s.exIndex - 1);

    // Para los enlaces directos del mock: deja hechas, en silencio, las primeras `n` series con los valores sugeridos.
    m.simular = function (n) {
      let k = 0;
      s.values.forEach((vs, i) => vs.forEach(v => { if (k < n) { v.done = true; v.doneAt = reloj(); s.exIndex = i; k++; } }));
      if (k && m.pendiente(s.exIndex) < 0 && s.exIndex < s.ejercicios.length - 1) s.exIndex++;
      desfase += n * 150000; // el reloj avanza como si esas series se hubieran hecho
    };

    m.terminar = function () {
      pararReloj(); s.rest = null; s.terminado = true;
      const planos = s.values.flat(), tops = [];
      s.ejercicios.forEach((e, i) => e.sets.forEach((st, j) => {
        const v = s.values[i][j];
        if (st.tipo !== 'top' || !v.done) return;
        const p = e.ultima.sets.find(x => x.tipo === 'top'), d = p ? r1(v.peso - p.peso) : null;
        tops.push({ nombre: e.nombre, peso: v.peso, reps: v.reps, previo: p ? p.peso : null, delta: d, dir: d == null ? null : d > 0 ? 'sube' : d < 0 ? 'baja' : 'igual', record: s.records.includes(e.id), e1rm: r1(epley(v.peso, v.reps)) });
      }));
      return {
        nombre: s.nombre, corta: s.corta, hechas: planos.filter(v => v.done).length, total: planos.length,
        minutos: Math.max(1, Math.round((reloj() - s.startedAt) / 60000)), tops,
        pendientes: s.ejercicios.filter((e, i) => s.values[i].some(v => !v.done)).map(e => e.nombre),
        volumen: Math.round(m.volumen()),
        porEjercicio: s.ejercicios.map((e, i) => ({ nombre: e.nombre, grupo: e.grupo, hechas: s.values[i].filter(v => v.done).length, total: e.sets.length, volumen: s.values[i].filter(v => v.done).reduce((a, v) => a + v.peso * v.reps, 0), sets: s.values[i].map((v, j) => Object.assign({ tipo: e.sets[j].tipo }, v)) })),
      };
    };
    return m;
  }

  window.MOCK_MOTOR = { crear, epley, n1, fmt, discos };
})();
