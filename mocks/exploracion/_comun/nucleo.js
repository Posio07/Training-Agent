/* Exploración visual · datos y eventos de ejemplo con la FORMA de los reales de la app.
 * No importa ni toca nada de ifbb-pro-agent: copia la forma de sessionStore.js (series con setType top/backoff/normal,
 * values {weight, reps, done}), de core-v2/sesion.js (repsLabel, restLabel, descansos 180/150/150/75 s), de dolor.js (A5) y del
 * récord por 1RM Epley (peso × (1 + reps/30)). Cada dirección visual se suscribe a los eventos y los traduce a su propio universo.
 *
 * Eventos (S.on): serie, descanso, tick, descansoFin, record, a5, ejercicio, fin.
 * ?vel=1 → descansos en tiempo real; por defecto van 6× más rápido para poder recorrer el mock. */
(function () {
  'use strict';
  const DIV_EPLEY = 30, RED_BACKOFF = 0.10;
  const DESC = { top: 180, backoff: 150, multi: 150, aisl: 75 };
  const q = new URLSearchParams(location.search);
  const VEL = parseFloat(q.get('vel')) || 6;
  const fmtS = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const e1rm = (w, r) => Math.round(w * (1 + r / DIV_EPLEY) * 10) / 10;
  const a2_5 = x => Math.round(x / 2.5) * 2.5;
  const n1 = x => (Math.round(x * 10) / 10).toString().replace('.', ',');

  const EV = {
    top: { nivel: 'E4', titulo: 'Top set 4–6 reps, RIR 1–2', dec: 'DEC-002', nota: 'Solo en definición y solo en variantes elegibles.' },
    descTop: { nivel: 'E4', titulo: 'Descanso 3 min tras el top set', dec: 'DEC-024', nota: 'Criterio de diseño dentro del rango de los datos.' },
    descMulti: { nivel: 'E4', titulo: 'Descanso 2,5 min en multiarticulares', dec: 'DEC-024', nota: 'Piso respaldado: 60 s (E2, Singer et al. 2024, leído en resumen).' },
    descAisl: { nivel: 'E4', titulo: 'Descanso 75 s en aislamiento', dec: 'DEC-024', nota: 'Zona ambigua de 60–90 s.' },
    rir: { nivel: 'E4', titulo: 'Series con 1–3 RIR', dec: 'DEC-033', nota: 'ACSM 2026: esfuerzo suficiente cerca del fallo.' },
    backoff: { nivel: 'E4', titulo: 'Back-off −10 % del top set', dec: 'DEC-002', nota: 'Mantiene intensidad con menos volumen.' },
  };

  const DIA = {
    nombre: 'Torso A', fase: 'Definición', minutos: 62, siguiente: 'Pierna A',
    semana: ['Torso A', 'Pierna A', 'Descanso', 'Torso B', 'Pierna B'],
    ejercicios: [
      { name: 'Press de banca con barra', muscle: 'Pecho', tipo: 'multi', barra: true, top: true, series: 4, reps: [6, 10], topReps: [4, 6], u: [[100, 5], [90, 8], [90, 8], [90, 7]], mejorE1: e1rm(100, 5) },
      { name: 'Press inclinado con mancuernas', muscle: 'Pecho', tipo: 'multi', series: 3, reps: [8, 12], u: [[36, 10], [36, 9], [34, 9]] },
      { name: 'Remo con barra', muscle: 'Espalda', tipo: 'multi', barra: true, series: 3, reps: [8, 12], u: [[80, 10], [80, 9], [80, 8]] },
      { name: 'Elevaciones laterales', muscle: 'Hombro', tipo: 'aisl', series: 3, reps: [12, 20], u: [[10, 16], [10, 14], [10, 13]] },
      { name: 'Extensión de tríceps en polea', muscle: 'Tríceps', tipo: 'aisl', series: 3, reps: [10, 15], u: [[35, 13], [35, 12], [32.5, 12]] },
    ],
  };

  /* ---------- Audio (WebAudio, sin archivos) y háptica ---------- */
  const A = (function () {
    let ctx = null, on = true;
    const c = () => { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); } if (ctx.state === 'suspended') ctx.resume(); return ctx; };
    function tono(f, d, tipo, v, t0, f2) {
      const x = c(); if (!x || !on) return; d = d || .12; t0 = t0 || 0; v = v == null ? .14 : v;
      const o = x.createOscillator(), g = x.createGain(), t = x.currentTime + t0;
      o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(x.destination); o.start(t); o.stop(t + d + .03);
    }
    function ruido(d, v, f, t0, tipo) {
      const x = c(); if (!x || !on) return; d = d || .2; t0 = t0 || 0;
      const b = x.createBuffer(1, Math.max(1, x.sampleRate * d), x.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      const s = x.createBufferSource(), fl = x.createBiquadFilter(), g = x.createGain(), t = x.currentTime + t0;
      s.buffer = b; fl.type = tipo || 'bandpass'; fl.frequency.value = f || 1500; g.gain.setValueAtTime(v == null ? .2 : v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      s.connect(fl); fl.connect(g); g.connect(x.destination); s.start(t);
    }
    return {
      get on() { return on; }, set on(v) { on = !!v; }, c, tono, ruido,
      clang(f) { f = f || 1; tono(220 * f, .5, 'square', .1); tono(331 * f, .45, 'triangle', .12); tono(587 * f, .3, 'sawtooth', .05); ruido(.12, .3, 4000); },
      boom() { tono(140, .7, 'sine', .5, 0, 28); ruido(.5, .4, 300, 0, 'lowpass'); },
      thunk() { tono(180, .12, 'sine', .4, 0, 50); ruido(.06, .25, 900); },
      coin() { tono(988, .08, 'square', .09); tono(1319, .35, 'square', .09, .08); },
      hit(n) { tono(300 + (n || 0) * 70, .09, 'square', .11, 0, 90); ruido(.05, .15, 3000); },
      fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tono(f, .22, 'square', .1, i * .11)); },
      pop() { tono(520, .1, 'triangle', .25, 0, 1400); ruido(.1, .25, 2500); },
      riser(d) { tono(80, d || 1, 'sawtooth', .08, 0, 900); },
      bell() { tono(1318, .9, 'sine', .22); tono(1976, .7, 'sine', .1, .02); },
      tick() { tono(1800, .02, 'square', .04); },
    };
  })();
  const haptic = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* noop */ } };

  /* ---------- Sesión (misma forma que sessionStore.newSession / markDone) ---------- */
  function crearSesion() {
    const ls = {}, S = {
      dia: DIA, vel: VEL, empezada: Date.now(), finalizada: false, esc: 0,
      on(n, f) { (ls[n] = ls[n] || []).push(f); return S; }, off() { Object.keys(ls).forEach(k => { ls[k] = []; }); },
      emit(n, d) { (ls[n] || []).slice().forEach(f => f(d)); },
    };
    S.ex = DIA.ejercicios.map((e, ei) => {
      const sets = []; const topW = e.top ? a2_5(e.u[0][0] + 2.5) : 0;
      if (e.top) {
        sets.push({ setType: 'top', setNumber: 1, repsLabel: e.topReps.join('-'), restS: DESC.top, w: topW, r: 5 });
        for (let k = 0; k < e.series - 1; k++) sets.push({ setType: 'backoff', setNumber: k + 1, repsLabel: e.reps.join('-'), restS: DESC.backoff, w: a2_5(topW * (1 - RED_BACKOFF)), r: e.u[k + 1][1] });
      } else for (let k = 0; k < e.series; k++) sets.push({ setType: 'normal', setNumber: k + 1, repsLabel: e.reps.join('-'), restS: DESC[e.tipo], w: e.u[k][0], r: e.u[k][1] });
      return Object.assign({}, e, { ei, sets, mejor: e.mejorE1 || 0, ultimaVol: e.u.reduce((a, s) => a + s[0] * s[1], 0) });
    });
    S.v = S.ex.map(e => e.sets.map(() => ({ weight: '', reps: '', done: false })));
    S.records = []; S.a5s = []; S.hechas = 0; S.total = S.ex.reduce((a, e) => a + e.sets.length, 0);
    S.pos = { ei: 0, si: 0 };

    S.evidencia = (ei, si) => {
      const e = S.ex[ei], st = e.sets[si], out = [];
      if (st.setType === 'top') out.push(EV.top, EV.descTop); else if (st.setType === 'backoff') out.push(EV.backoff, EV.descMulti); else out.push(e.tipo === 'multi' ? EV.descMulti : EV.descAisl);
      out.push(EV.rir); return out;
    };
    S.sug = (ei, si) => { const s = S.ex[ei].sets[si]; return { weight: s.w, reps: s.r }; };
    S.restante = () => { const e = S.ex[S.pos.ei]; return e ? e.sets[S.pos.si] : null; };
    function siguientePos() {
      for (let ei = 0; ei < S.ex.length; ei++) for (let si = 0; si < S.ex[ei].sets.length; si++) if (!S.v[ei][si].done) return { ei, si };
      return null;
    }

    S.registrar = (ei, si, vals, silencio) => {
      const e = S.ex[ei], st = e.sets[si], v = S.v[ei][si]; if (v.done) return null;
      const weight = Number(vals.weight) || 0, reps = Number(vals.reps) || 1;
      let a5 = false;
      if (st.setType === 'backoff') { const top = S.v[ei][0]; if (top.done && weight > top.weight * (1 - RED_BACKOFF) + .01) { st.setType = 'normal'; a5 = true; } } // A5
      v.weight = weight; v.reps = reps; v.done = true; v.doneAt = Date.now(); S.hechas++;
      const e1 = e1rm(weight, reps);
      const esTop = st.setType === 'top';
      const rec = esTop && weight > 0 && e1 > e.mejor; if (rec) { e.mejor = e1; S.records.push({ ei, name: e.name, weight, reps, e1 }); }
      S.pos = siguientePos() || S.pos;
      const compl = S.v[ei].every(x => x.done), todo = S.hechas === S.total;
      const p = { ei, si, ex: e, set: st, weight, reps, vol: weight * reps, e1, esTop, esBackoff: st.setType === 'backoff', a5, rec, hechas: S.hechas, total: S.total, pct: S.hechas / S.total, compl, todo, fraccionEj: S.v[ei].filter(x => x.done).length / st.length };
      p.fraccionEj = S.v[ei].filter(x => x.done).length / e.sets.length;
      if (silencio) return p;
      S.emit('serie', p); if (a5) S.emit('a5', p); if (rec) S.emit('record', p); if (compl) S.emit('ejercicio', p);
      if (todo) S.finalizar(); else S.iniciarDescanso(st.restS, st.setType);
      return p;
    };

    let timer = null;
    S.iniciarDescanso = (real, tipo) => {
      clearInterval(timer); const dur = real / S.vel * 1000, t0 = performance.now();
      S.descanso = { real, tipo, dur, t0 }; S.emit('descanso', S.descanso);
      timer = setInterval(() => {
        const f = Math.min(1, (performance.now() - t0) / dur); S.descanso.f = f;
        S.emit('tick', { f, restante: real * (1 - f), real, label: fmtS(real * (1 - f)) });
        if (f >= 1) { clearInterval(timer); const d = S.descanso; S.descanso = null; S.emit('descansoFin', { natural: true, real: d.real }); }
      }, 80);
    };
    S.saltar = () => { if (!S.descanso) return; clearInterval(timer); const d = S.descanso; S.descanso = null; S.emit('descansoFin', { natural: false, real: d.real }); };
    S.autocompletar = (hasta) => { // rellena con lo planificado (más una repetición) sin eventos: para saltar directo al resumen
      S.ex.forEach((e, ei) => e.sets.forEach((st, si) => { if (!S.v[ei][si].done && (hasta == null || ei < hasta || (ei === hasta && si < 0))) S.registrar(ei, si, { weight: st.w, reps: st.r + (st.setType === 'top' ? 0 : 1) }, true); }));
    };
    S.finalizar = () => {
      if (S.finalizada) return; S.finalizada = true; clearInterval(timer); S.descanso = null; S.emit('fin', S.resumen());
    };
    S.resumen = () => {
      const filas = []; let vol = 0, volAnt = 0, segs = 0;
      S.ex.forEach((e, ei) => {
        let vEx = 0, mejor = null;
        e.sets.forEach((st, si) => { const v = S.v[ei][si]; if (!v.done) return; vEx += v.weight * v.reps; segs += st.restS + 40; const e1 = e1rm(v.weight, v.reps); if (!mejor || e1 > mejor.e1) mejor = { weight: v.weight, reps: v.reps, e1 }; });
        vol += vEx; volAnt += e.ultimaVol; filas.push({ name: e.name, muscle: e.muscle, vol: vEx, volAnt: e.ultimaVol, mejor, series: S.v[ei].filter(x => x.done).length, de: e.sets.length });
      });
      const sets = S.hechas, completo = sets === S.total;
      const nota = completo && S.records.length ? 'S' : completo ? 'A' : sets / S.total > .6 ? 'B' : 'C';
      return { filas, vol: Math.round(vol), volAnt, delta: volAnt ? Math.round((vol / volAnt - 1) * 100) : 0, sets, total: S.total, minutos: Math.round(segs / 60), records: S.records.slice(), nota, topSets: S.v.reduce((a, vs, i) => a + (S.ex[i].sets[0].setType === 'top' && vs[0].done ? 1 : 0), 0) };
    };
    /* Discos por lado (greedy, mayor a menor), como htmlPlateBar de la app. */
    S.discos = (peso, barra) => {
      barra = barra || 20; let r = Math.max(0, (peso - barra) / 2); const out = [];
      [25, 20, 15, 10, 5, 2.5, 1.25].forEach(d => { while (r + 1e-6 >= d) { out.push(d); r -= d; } }); return out;
    };
    return S;
  }

  /* Enrutador por hash. rutas: { nombre: fn(params) } */
  function router(rutas, def) {
    const go = () => { const h = (location.hash || '#' + def).slice(1).split('?')[0]; (rutas[h] || rutas[def])(h); };
    addEventListener('hashchange', go); go();
  }
  window.IFBB = { DIA, A, haptic, crearSesion, router, fmtS, e1rm, n1, EV, VEL, rnd: (a, b) => a + Math.random() * (b - a), clamp: (x, a, b) => Math.min(b, Math.max(a, x)) };
})();
