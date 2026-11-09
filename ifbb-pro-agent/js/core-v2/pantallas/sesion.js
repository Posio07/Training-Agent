/* EN CONSTRUCCIÓN · núcleo v2 (B-039, paso 3.7). Pantalla de SESIÓN del núcleo nuevo: el modo sesión de `app.js` (que se borra en el corte)
 * rehecho sobre `core-v2/sesion.js` y `core-v2/dolor.js`: la sesión sale del plan guardado y se registra POR VARIANTE (el id de la variante es el
 * `exerciseId` de cada serie). Trae lo nuevo de la spec: elegir la variante de cada ejercicio (por defecto, la última usada), "hoy tengo X min",
 * back-off válido (A5), bandera de dolor por zona (A6, DEC-034) con propuesta de cambio y confirmación, y tope de hombro (A4).
 * El cronómetro de descanso, el bloqueo de pantalla, el tono, las tarjetas de discos, el récord y el resumen están copiados de `app.js`.
 * NO está conectado a la app: lo monta la página de prueba (tests/pagina-nucleo-v2.html) y el corte lo conecta.
 *
 * Privacidad (DEC-009): las banderas de dolor se guardan en `perfil.painFlags` (por zona), la misma clave que el export ya excluye. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../knowledge.js'), require('../../engine.js'), require('../../sessionStore.js'), require('../registro.js'), require('../catalogo.js'), require('../sesion.js'), require('../dolor.js'), require('./comun.js'), require('./editor.js'));
  else root.CORE_V2_SESION_PANTALLA = factory(root.KNOWLEDGE, root.ENGINE, root.SESSION_STORE, root.CORE_V2_REGISTRO, root.CORE_V2_CATALOGO, root.CORE_V2_SESION, root.CORE_V2_DOLOR, root.CORE_V2_COMUN, root.CORE_V2_EDITOR);
})(typeof self !== 'undefined' ? self : this, function (K, ENGINE, SS, REGISTRO, CATALOGO, SESION, DOLOR, COMUN, EDITOR) {
  'use strict';
  const { esc, n1, icon } = COMUN;
  const { setEditorHtml, wireSetEditor } = EDITOR;
  const IMAGENES = (typeof EXERCISE_IMAGES !== 'undefined') ? EXERCISE_IMAGES : null;
  const fmtDate = iso => { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }); };

  /* ---------- Copiado de app.js: descansos, barra cargada, imagen ---------- */
  function parseRestSeconds(label) {
    // Los descansos del núcleo nuevo pueden traer decimales con coma ("2,5 min"): el original de app.js los leía como 2.
    const m = String(label || '').match(/(\d+(?:[.,]\d+)?)/);
    const n = m ? parseFloat(m[1].replace(',', '.')) : 90;
    return Math.round(/min/.test(label || '') ? n * 60 : n);
  }
  function fmtTimer(s) { const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, '0')}`; }

  /* ---------- Barra cargada (Fase 5) ----------
   * Reparto de discos por lado: greedy de mayor a menor denominación entre
   * los discos disponibles del perfil. Si no da exacto, se queda en el
   * valor más cercano POR DEBAJO y se muestra la diferencia. */
  function platesForWeight(totalWeight, barWeight, availablePlates) {
    const perSide = (totalWeight - barWeight) / 2;
    if (!(perSide > 0)) return { plates: [], achieved: barWeight, diff: round2(totalWeight - barWeight) };
    const sorted = availablePlates.slice().sort((a, b) => b - a);
    const used = []; let remaining = perSide;
    sorted.forEach(p => { while (remaining >= p - 1e-6) { used.push(p); remaining -= p; } });
    const achieved = barWeight + used.reduce((a, b) => a + b, 0) * 2;
    return { plates: used, achieved: round2(achieved), diff: round2(totalWeight - achieved) };
  }
  function round2(v) { return Math.round(v * 100) / 100; }

  function svgBarbell(result, unit) {
    const canon = unit === 'lb' ? K.PLATES_LB : K.PLATES_KG;
    const colorFor = w => { const idx = canon.findIndex(p => Math.abs(p - w) < 1e-6); return K.PLATE_COLORS[idx === -1 ? canon.length - 1 : idx]; };
    const heightFor = w => Math.min(64, 24 + w * (unit === 'lb' ? 0.55 : 1.2));
    const widthFor = w => (unit === 'lb' ? w >= 35 : w >= 10) ? 11 : 7;
    let x = 96, i = 0; // arranca pegado al manguito, hacia afuera
    const rects = result.plates.map(w => {
      const h = heightFor(w), wd = widthFor(w);
      const delay = `style="animation-delay:${i * 40}ms"`;
      const svg = `<rect class="plate-rect plate-rect-l" ${delay} x="${x}" y="${(100 - h) / 2}" width="${wd}" height="${h}" rx="2" fill="${colorFor(w)}" stroke="#1a1d20" stroke-width="1"></rect><rect class="plate-rect plate-rect-r" ${delay} x="${292 - x - wd}" y="${(100 - h) / 2}" width="${wd}" height="${h}" rx="2" fill="${colorFor(w)}" stroke="#1a1d20" stroke-width="1"></rect>`;
      x += wd + 1.5; i++;
      return svg;
    }).join('');
    return `<svg class="platebar" viewBox="0 0 292 100" width="100%" height="64" role="img" aria-label="Carga de la barra">
      <rect x="0" y="46" width="292" height="8" rx="2" fill="var(--acero)"></rect>
      <rect x="86" y="30" width="10" height="40" rx="2" fill="var(--superficie-2)" stroke="var(--borde)"></rect>
      <rect x="196" y="30" width="10" height="40" rx="2" fill="var(--superficie-2)" stroke="var(--borde)"></rect>
      ${rects}
    </svg>`;
  }

  /* Fase 7: imagen ilustrativa (posición inicial/final) del ejercicio,
   * solo si hay un equivalente mapeado en EXERCISE_IMAGES. Alterna entre
   * ambas por CSS (sin JS); con prefers-reduced-motion queda fija en la
   * primera. Puramente decorativa/informativa: no participa de ningún
   * cálculo ni se guarda en ningún lado. */
  function htmlExerciseImage(ex) {
    const imgs = IMAGENES ? IMAGENES[ex.name] : null;
    if (!imgs) return '';
    return `<div class="sm-image-wrap">
      <img class="sm-image sm-image-a" src="${esc(imgs[0])}" alt="${esc(ex.name)} · posición inicial" loading="lazy" width="140" height="140">
      <img class="sm-image sm-image-b" src="${esc(imgs[1])}" alt="${esc(ex.name)} · posición final" loading="lazy" width="140" height="140">
    </div>`;
  }

  function htmlPlateBarsForExercise(profile, ex, last) {
    if (!K.BARBELL_PATTERNS.has(ex.pattern)) return '';
    const hasTop = ex.sets.some(s => s.setType === 'top');
    const findLast = (type, num) => last && last.sets.find(s => s.setType === type && s.setNumber === num);
    if (hasTop) {
      const topW = findLast('top', 1); const boW = findLast('backoff', 1);
      return `<div class="card" id="platebar-top" style="margin-bottom:.8rem"><h3 style="font-size:.85rem;margin-bottom:.3rem">Carga · Top set</h3>${htmlPlateBar(profile, ex.pattern, topW && topW.weight)}</div>` +
        (ex.sets.some(s => s.setType === 'backoff') ? `<div class="card" style="margin-bottom:.8rem"><h3 style="font-size:.85rem;margin-bottom:.3rem">Carga · Back-off</h3>${htmlPlateBar(profile, ex.pattern, boW && boW.weight)}</div>` : '');
    }
    const firstW = findLast('normal', 1);
    return `<div class="card" style="margin-bottom:.8rem"><h3 style="font-size:.85rem;margin-bottom:.3rem">Carga sugerida</h3>${htmlPlateBar(profile, ex.pattern, firstW && firstW.weight)}</div>`;
  }

  function htmlPlateBar(profile, pattern, weight) {
    if (!K.BARBELL_PATTERNS.has(pattern)) return '';
    if (!weight || weight <= 0) return `<div class="platebar-wrap"><p class="platebar-note">Registrá tu primera sesión para ver la carga.</p></div>`;
    const unit = profile.data.plateUnit || 'kg';
    const bar = profile.data.barWeight || (unit === 'lb' ? 45 : 20);
    const plates = profile.data.availablePlates && profile.data.availablePlates.length ? profile.data.availablePlates : (unit === 'lb' ? K.PLATES_LB : K.PLATES_KG);
    const res = platesForWeight(weight, bar, plates);
    const exact = Math.abs(res.diff) < 0.01;
    return `<div class="platebar-wrap">
      ${svgBarbell(res, unit)}
      <div class="platebar-weight">${n1(exact ? weight : res.achieved)} ${unit}${!exact ? ` <span class="muted" style="font-size:.8rem">(objetivo ${n1(weight)} ${unit}, −${n1(Math.abs(res.diff))} ${unit})</span>` : ''}</div>
      <div class="platebar-note">barra ${n1(bar)} ${unit} + ${res.plates.length ? res.plates.map(p => n1(p)).join(' + ') + ' por lado' : 'sin discos'}</div>
    </div>`;
  }

  /* ---------- Preparar la sesión (puro) ---------- */

  const ZONAS_ETIQUETA = { lumbar: 'zona lumbar', hombro: 'hombro', rodilla: 'rodilla' };
  // Zona donde el ejercicio exige más: la primera con demanda alta, si no media, si no la primera zona.
  function zonaPorDefecto(varianteId) {
    const p = CATALOGO.perfilArticularDe(varianteId);
    return ['alta', 'media'].map(n => DOLOR.ZONAS.find(z => (p[z] || {}).nivel === n)).find(Boolean) || DOLOR.ZONAS[0];
  }

  // La sesión lista para registrar, sin DOM. `perfil`: { data, planGuardado, workouts, painFlags }. `opciones`: { minutos, hoy, elecciones }.
  // Devuelve { planSesion, ejercicios, avisos, restricciones }:
  //  - `planSesion`: la sesión del plan guardado, o la de "hoy tengo X min" (el plan guardado no se toca);
  //  - `ejercicios`: en el formato de `sessionStore.newSession`, con el id de la VARIANTE (la última usada si sigue habilitada);
  //  - `restricciones`: por cada ejercicio de demanda alta en una zona con dolor marcado: sin top set (DEC-009) y con las variantes más
  //    suaves que se proponen (siempre con confirmación, nunca se cambia solo).
  function prepararSesion(perfil, indiceDia, opciones) {
    const o = opciones || {};
    const base = o.minutos ? SESION.sesionConTiempo(perfil.data, indiceDia, o.minutos) : perfil.planGuardado.plan.sesiones[indiceDia];
    if (!base) throw new Error('Sesión inexistente: ' + indiceDia);
    const workouts = perfil.workouts || [], banderas = perfil.painFlags || {};
    const elecciones = Object.assign({}, o.elecciones);
    base.ejercicios.forEach((e, i) => { if (!elecciones[i]) { const v = SESION.varianteInicial(base, i, perfil.data, workouts); if (v !== e.varianteId) elecciones[i] = v; } });
    const restricciones = DOLOR.restriccionesPorDolor(base, banderas, perfil.data);
    // Sin top set en lo que la zona marcada exige mucho (DEC-009).
    const sinTop = new Set(restricciones.map(r => r.indice));
    const planSesion = Object.assign({}, base, { ejercicios: base.ejercicios.map((e, i) => (sinTop.has(i) ? Object.assign({}, e, { topSet: null }) : e)) });
    const ejercicios = SESION.ejerciciosParaSesion(planSesion, elecciones).map((e, i) => {
      const r = restricciones.find(x => x.indice === i);
      return Object.assign(e, {
        muscleLabel: K.MUSCLE_LABELS[e.muscle] || 'Funcional', zonaDolor: r ? r.zona : zonaPorDefecto(e.exerciseId),
        restriccion: r ? { zona: r.zona, texto: r.texto, sustituciones: r.sustituciones } : null,
        painAdvice: r && DOLOR.recomendarProfesional(banderas[r.zona], o.hoy).recomendar ? { zona: r.zona, sesiones: DOLOR.recomendarProfesional(banderas[r.zona], o.hoy).sesiones } : null,
      });
    });
    const avisos = [].concat(base.avisos || [], [DOLOR.avisoTopeHombro(planSesion, banderas)].filter(Boolean));
    return { planSesion, ejercicios, avisos, restricciones, elecciones };
  }

  // A5: al registrar un back-off, si pesa más de lo permitido frente al top set ya registrado del mismo ejercicio, se guarda como serie de trabajo.
  function tipoDeSerie(ex, valores, setIdx, peso) {
    const st = ex.sets[setIdx];
    if (st.setType !== 'backoff') return { tipo: st.setType, aviso: null };
    const topIdx = ex.sets.findIndex((s, i) => s.setType === 'top' && valores[i].done);
    if (topIdx < 0) return { tipo: 'backoff', aviso: null };
    const r = DOLOR.corregirBackoffs([{ setType: 'top', weight: parseFloat(valores[topIdx].weight) || 0 }, { setType: 'backoff', weight: peso, setNumber: st.setNumber }]);
    return r.avisos.length ? { tipo: 'normal', aviso: r.avisos[0].texto } : { tipo: 'backoff', aviso: null };
  }

  /* ---------- HTML ---------- */
  const SET_ETIQUETA = st => ({ top: 'Top set', backoff: 'Back-off', normal: `Serie ${st.setNumber}` }[st.setType]);

  function htmlSerie(st, i, v, unit, ctxEd) {
    const label = SET_ETIQUETA(st);
    if (v.done && ctxEd && ctxEd.set === i) return `<div class="sm-set editing" data-set="${i}"><div class="sm-set-title">${esc(label)} · editar</div>${setEditorHtml('sm', `${ctxEd.ex}:${i}`, v.weight, v.reps, unit)}</div>`;
    return `<div class="sm-set ${v.done ? 'done' : ''}" data-set="${i}">
      <div class="sm-set-row">
        <div class="idx">${st.setType === 'normal' ? st.setNumber : (st.setType === 'top' ? icon('trophy') : '↓')}</div>
        <div class="fieldwrap"><input type="number" inputmode="decimal" placeholder="${esc(unit)}" value="${esc(v.weight || '')}" data-sm-weight="${i}" aria-label="Peso (${esc(unit)})" ${v.done ? 'disabled' : ''}><div class="unit">peso (${esc(unit)})</div></div>
        <div class="fieldwrap"><input type="number" inputmode="numeric" placeholder="${esc(st.repsLabel)}" value="${esc(v.reps || '')}" data-sm-reps="${i}" aria-label="Repeticiones" ${v.done ? 'disabled' : ''}><div class="unit">reps</div></div>
        ${v.done ? `<button class="btn done-btn" data-sm-edit="${i}" aria-label="Editar o borrar esta serie">${icon('check', 'check-draw')} Editar</button>` : `<button class="btn btn-primary done-btn" data-sm-done="${i}">Hecha</button>`}
      </div>
      ${v.done ? '' : `<div class="fieldwrap sm-pain"><input type="number" inputmode="numeric" min="0" max="10" placeholder="0-10" value="${v.pain === '' || v.pain == null ? '' : esc(v.pain)}" data-sm-pain="${i}" aria-label="Dolor de 0 a 10 (opcional)"><div class="unit">dolor (opcional)</div></div>`}
    </div>`;
  }

  // Selector de variante de un ejercicio: las del mismo patrón, habilitadas y que no estén ya en la sesión.
  function htmlVariantes(opciones, hechas) {
    if (hechas) return '<p class="help">No se puede cambiar la variante con series ya registradas.</p>';
    if (opciones.length < 2) return '';
    return `<details class="card"><summary>Cambiar la variante</summary><div class="btn-row" style="flex-wrap:wrap">${opciones.map(o => `<button class="btn${o.planificada ? ' active' : ''}" data-sm-variante="${esc(o.varianteId)}">${esc(o.nombre)}${o.ultimaUsada ? ' · la última vez' : ''}</button>`).join('')}</div></details>`;
  }

  function htmlEjercicioSesion(sm, perfil, ctxEd, opcionesVariante, ultima) {
    const ex = sm.exercises[sm.exIndex], vals = sm.values[sm.exIndex], unit = perfil.data.plateUnit || 'kg';
    const hechas = vals.some(v => v.done);
    return `
      <h2 class="sm-exname">${esc(ex.name)}</h2>
      <div class="sm-exmeta">${esc(ex.muscleLabel)} ${sm.short ? `· ~${ex.durationMin} min` : ''}</div>
      ${ex.cambiadaDe ? `<div class="alert info">Elegiste esta variante en lugar de "${esc(ex.cambiadaDe)}".</div>` : ''}
      ${ex.restriccion ? `<div class="alert warn">${esc(ex.restriccion.texto)} <span class="ev-tag">E4 · heurística</span> Sin top set ni subida de carga mientras siga marcado.</div>` : ''}
      ${ex.painAdvice ? `<div class="alert danger">Registraste dolor por encima del umbral en ${esc(ZONAS_ETIQUETA[ex.painAdvice.zona])} en ${ex.painAdvice.sesiones} sesiones distintas de las últimas 4 semanas. Te recomendamos consultar a un profesional antes de seguir cargando este movimiento. <span class="ev-tag">E4 · heurística</span></div>` : ''}
      ${htmlVariantes(opcionesVariante, hechas)}
      ${ex.restriccion && ex.restriccion.sustituciones.length && !hechas ? `<div class="card"><p>Variantes más suaves para ${esc(ZONAS_ETIQUETA[ex.restriccion.zona])}:</p><div class="btn-row" style="flex-wrap:wrap">${ex.restriccion.sustituciones.map(s => `<button class="btn" data-sm-variante="${esc(s.varianteId)}">${esc(s.nombre)}</button>`).join('')}</div></div>` : ''}
      ${htmlExerciseImage(ex)}
      ${ultima ? `<div class="sm-last ${ultima.sets.some(s => s.setType === 'top') ? 'sm-last-top' : ''}"><b>Última vez</b> (${fmtDate(ultima.date)}): ${ultima.sets.map(s => `${s.setType === 'top' ? icon('trophy') + ' ' : ''}<span class="v">${n1(s.weight)} ${esc(unit)} × ${s.reps}</span>`).join(' · ')}</div>` : '<div class="sm-last">Primera vez que registras esta variante.</div>'}
      ${htmlPlateBarsForExercise(perfil, { pattern: ex.pattern, sets: ex.sets }, ultima)}
      <label class="help" for="sm-zona">Zona del dolor, si lo registras</label>
      <select id="sm-zona" data-sm-zona>${DOLOR.ZONAS.map(z => `<option value="${z}" ${ex.zonaDolor === z ? 'selected' : ''}>${esc(ZONAS_ETIQUETA[z])}</option>`).join('')}</select>
      ${ex.sets.map((st, i) => htmlSerie(st, i, vals[i], unit, ctxEd)).join('')}`;
  }

  function htmlResumen(sm, perfil, ahora) {
    const planos = sm.values.flat(), hechas = planos.filter(v => v.done).length;
    const pendientes = sm.exercises.filter((e, i) => sm.values[i].some(v => !v.done)).map(e => e.name);
    const minutos = Math.max(1, Math.round((ahora - sm.startedAt) / 60000));
    const tops = [];
    sm.exercises.forEach((e, i) => e.sets.forEach((st, j) => {
      const v = sm.values[i][j];
      if (st.setType === 'top' && v.done) { const u = SESION.ultimaVez((perfil.workouts || []).filter(w => w.setType === 'top'), e.exerciseId, sm.sessionId); tops.push({ name: e.name, weight: v.weight, reps: v.reps, prior: u && u.sets[0] ? u.sets[0].weight : null }); }
    }));
    const fila = t => {
      let cmp = '';
      if (t.prior != null) { const d = round2(t.weight - t.prior), dir = d > 0 ? 'up' : d < 0 ? 'down' : 'flat'; cmp = `<span class="topset-cmp cmp-${dir}">${icon(dir === 'up' ? 'arrow-up' : dir === 'down' ? 'arrow-down' : 'arrow-flat')} ${d === 0 ? 'igual' : (d > 0 ? '+' : '') + n1(d) + ' kg'}</span>`; }
      return `<li><b>${esc(t.name)}</b>: ${n1(t.weight)} kg × ${esc(t.reps)} ${cmp}</li>`;
    };
    return `<div class="session-mode"><div class="session-mode-head"><div></div><div class="prog">Resumen de la sesión</div><div></div></div>
      <div class="session-mode-body">
        <div class="card accent"><h2>${esc(sm.dayName)} ${sm.short ? '· rutina corta' : ''}</h2>
          <div class="grid"><div class="stat"><div class="v">${hechas}/${planos.length}</div><div class="l">series hechas</div></div><div class="stat"><div class="v">${minutos}</div><div class="l">min reales</div></div></div></div>
        ${tops.length ? `<div class="card"><h3>Top sets del día</h3><ul>${tops.map(fila).join('')}</ul></div>` : ''}
        ${pendientes.length ? `<div class="card"><h3>Ejercicios con series sin terminar</h3><ul>${pendientes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : '<div class="card"><p class="muted">Todas las series quedaron registradas.</p></div>'}
        <button class="btn btn-primary btn-block btn-lg" id="sm-back-to-plan">Volver al plan</button>
      </div></div>`;
  }

  /* ---------- Controlador ---------- */
  // `ctx`: { doc (document), storage (con getItem/setItem/removeItem: la sesión en curso, DEC-015), perfiles() → lista, guardar(), ahora() → 'AAAA-MM-DD',
  //          reloj() → ms, id(), aviso(texto), confirmar(mensaje, { confirmLabel, cancelLabel }) → promesa de booleano, alTerminar() }.
  function crearSesion(ctx) {
    const doc = ctx.doc, win = doc.defaultView || window;
    let sm = null, perfil = null, editando = null, timer = null, bloqueo = null, bloqueoSoportado = true, audio = null;
    const raiz = () => { let r = doc.getElementById('session-mode-root'); if (!r) { r = doc.createElement('div'); r.id = 'session-mode-root'; doc.body.appendChild(r); } return r; };
    const $ = sel => doc.querySelector(sel);
    const persistir = () => { if (sm && sm.status === SS.STATUS.ACTIVE && !SS.saveActive(ctx.storage, sm, ctx.reloj())) ctx.aviso('No se pudo guardar la sesión en curso.'); };
    const nav = win.navigator;

    /* Bloqueo de pantalla (copiado de app.js) */
    async function pedirBloqueo() {
      if (!('wakeLock' in nav)) { bloqueoSoportado = false; return; }
      if (bloqueo) return;
      try { const l = await nav.wakeLock.request('screen'); bloqueo = l; l.addEventListener('release', () => { if (bloqueo === l) bloqueo = null; }); bloqueoSoportado = true; } catch (e) { bloqueoSoportado = false; }
    }
    function soltarBloqueo() { try { if (bloqueo) { bloqueo.release(); bloqueo = null; } } catch (e) { /* noop */ } }

    /* Tono y cronómetro de descanso (copiados de app.js) */
    const RADIO = 52, CIRC = 2 * Math.PI * RADIO;
    function desbloquearAudio() { try { const AC = win.AudioContext || win.webkitAudioContext; if (!AC) return; if (!audio) audio = new AC(); if (audio.state === 'suspended') audio.resume(); } catch (e) { /* sin audio */ } }
    function tono() {
      try {
        if (!audio) return; if (audio.state === 'suspended') audio.resume();
        const t0 = audio.currentTime + 0.02;
        [0, 0.28, 0.56].forEach((dt, i) => { const osc = audio.createOscillator(), g = audio.createGain(); osc.type = 'sine'; osc.frequency.value = i === 2 ? 1175 : 880; g.gain.setValueAtTime(0.0001, t0 + dt); g.gain.exponentialRampToValueAtTime(0.35, t0 + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.2); osc.connect(g); g.connect(audio.destination); osc.start(t0 + dt); osc.stop(t0 + dt + 0.22); });
      } catch (e) { /* noop */ }
    }
    function cerrarCronometro() { if (timer) { clearInterval(timer); timer = null; } const ov = $('#sm-timer'); if (ov) ov.remove(); }
    function iniciarDescanso(etiqueta) { SS.startRest(sm, parseRestSeconds(etiqueta), ctx.reloj()); persistir(); desbloquearAudio(); mostrarDescanso(); }
    function mostrarDescanso() {
      if (!sm || !sm.rest) return;
      cerrarCronometro();
      const ov = doc.createElement('div'); ov.className = 'timer-overlay'; ov.id = 'sm-timer';
      ov.innerHTML = `<div class="timer-label">Descanso</div>
        <div class="timer-ring-wrap" id="sm-timer-ring-wrap"><svg class="timer-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-bg" cx="60" cy="60" r="${RADIO}"></circle><circle class="ring-fg" id="sm-timer-ring-fg" cx="60" cy="60" r="${RADIO}" stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="0"></circle></svg>
        <div class="timer-num-wrap"><div class="timer-num" id="sm-timer-num" role="timer">${fmtTimer(SS.restRemaining(sm, ctx.reloj()))}</div></div></div>
        <div class="timer-actions"><button class="btn btn-lg" id="sm-timer-plus30">+30 s</button><button class="btn btn-primary btn-lg" id="sm-timer-skip">Saltar</button></div>
        <p class="help timer-note">Con la pantalla bloqueada el aviso al llegar a cero puede no sonar ni vibrar; al desbloquear verás el tiempo correcto.</p>`;
      raiz().appendChild(ov);
      $('#sm-timer-plus30').onclick = () => { SS.extendRest(sm, 30); persistir(); tic(); };
      $('#sm-timer-skip').onclick = () => { SS.clearRest(sm); persistir(); cerrarCronometro(); };
      tic();
      if (sm && sm.rest) timer = setInterval(tic, 250);
    }
    function tic(opts) {
      if (!sm || !sm.rest) { cerrarCronometro(); return; }
      const r = SS.restRemaining(sm, ctx.reloj());
      const num = $('#sm-timer-num'); if (num) num.textContent = fmtTimer(r);
      const fg = $('#sm-timer-ring-fg'); if (fg) fg.style.strokeDashoffset = (CIRC * (1 - Math.min(1, r / sm.rest.total))).toFixed(1);
      const anillo = $('#sm-timer .timer-ring'); if (anillo) anillo.classList.toggle('urgent', r <= 10 && r > 0);
      if (r > 0) return;
      const tarde = opts && opts.silent;
      SS.clearRest(sm); persistir();
      if (timer) { clearInterval(timer); timer = null; }
      if (!tarde) { tono(); if (nav.vibrate) nav.vibrate([200, 100, 200]); const w = $('#sm-timer-ring-wrap'); if (w) { w.classList.add('pulse'); setTimeout(cerrarCronometro, 500); return; } }
      cerrarCronometro();
    }
    doc.addEventListener('visibilitychange', () => {
      if (doc.visibilityState !== 'visible' || !sm || sm.status !== SS.STATUS.ACTIVE || sm.finished) return;
      pedirBloqueo();
      if (sm.rest) { if (!$('#sm-timer') && SS.restRemaining(sm, ctx.reloj()) > 0) mostrarDescanso(); else tic({ silent: true }); }
    });

    /* Variantes */
    const opcionesDe = i => SESION.variantesDelEjercicio(sm.planSesion, i, perfil.data, perfil.workouts || []);
    async function cambiarVariante(i, varianteId) {
      if (sm.values[i].some(v => v.done)) return;
      if (varianteId === sm.exercises[i].exerciseId) return;
      const ev = SESION.evaluarCambio(sm.planSesion, i, varianteId, perfil.data);
      if (!ev.permitido) { ctx.aviso(ev.avisos[0].texto); return; }
      if (ev.avisos.length && !(await ctx.confirmar(ev.avisos.map(a => a.texto).join(' ') + ' ¿Cambiar igual?', { confirmLabel: 'Cambiar', cancelLabel: 'Dejar como está' }))) return;
      const prep = prepararSesion(perfil, sm.dayIndex, { minutos: sm.short ? sm.minutos : 0, hoy: ctx.ahora(), elecciones: Object.assign({}, sm.elecciones, { [i]: varianteId }) });
      sm.elecciones = prep.elecciones; sm.planSesion = prep.planSesion;
      sm.exercises[i] = prep.ejercicios[i];
      sm.values[i] = sm.exercises[i].sets.map(() => ({ weight: '', reps: '', done: false, pain: '', doneAt: null }));
      persistir(); render();
    }

    /* Registrar series */
    function logDolor(ex, dolor) {
      perfil.painFlags = DOLOR.registrarDolor(perfil.painFlags || {}, { zona: ex.zonaDolor, dolor }, sm.sessionId, ctx.ahora());
    }
    function registrarSerie(setIdx) {
      const ex = sm.exercises[sm.exIndex], st = ex.sets[setIdx], v = sm.values[sm.exIndex][setIdx];
      const reps = parseInt(v.reps, 10);
      if (!reps || reps <= 0) { ctx.aviso('Pon las repeticiones hechas.'); return; }
      if (v.done) return;
      const peso = parseFloat(v.weight) || 0;
      let dolor = null;
      if (v.pain !== '' && v.pain != null) { dolor = Math.min(10, Math.max(0, parseInt(v.pain, 10) || 0)); logDolor(ex, dolor); }
      const t = tipoDeSerie(ex, sm.values[sm.exIndex], setIdx, peso);
      if (t.aviso) { ctx.aviso(t.aviso); st.setType = 'normal'; } // A5: queda como serie de trabajo
      SS.markDone(sm, sm.exIndex, setIdx, { weight: peso, reps, pain: dolor }, ctx.reloj());
      perfil.workouts = perfil.workouts || [];
      SS.upsertWorkout(perfil.workouts, SS.workoutRow(sm, sm.exIndex, setIdx, ctx.ahora()));
      perfil.updatedAt = ctx.ahora(); ctx.guardar(); persistir(); render();
      iniciarDescanso(st.restLabel);
      if (st.setType === 'top') mostrarRecord(ex, peso, reps);
    }
    function mostrarRecord(ex, peso, reps) {
      sm.recordShown = sm.recordShown || [];
      if (sm.recordShown.includes(ex.exerciseId) || !peso) return;
      const previos = (perfil.workouts || []).filter(w => w.exerciseId === ex.exerciseId && w.setType === 'top' && w.sessionId !== sm.sessionId);
      if (!previos.length) return;
      const epley = (w, r) => w * (1 + r / 30);
      if (epley(peso, reps) <= Math.max(...previos.map(w => epley(w.weight, w.reps)))) return;
      sm.recordShown.push(ex.exerciseId); persistir();
      if (nav.vibrate) nav.vibrate([90, 70, 90]);
      const banner = doc.createElement('div'); banner.className = 'record-banner';
      banner.innerHTML = `${icon('trophy')}<span>Nuevo récord: ${n1(peso)} ${esc(perfil.data.plateUnit || 'kg')} × ${reps}</span>`;
      raiz().appendChild(banner);
      win.requestAnimationFrame(() => win.requestAnimationFrame(() => banner.classList.add('show')));
      setTimeout(() => { banner.classList.remove('show'); setTimeout(() => banner.remove(), 300); }, 2000);
    }
    function editarSerie(ex, set, vals) {
      const r = SS.editActiveSet(sm, ex, set, vals, ctx.reloj());
      if (!r.ok) return r;
      persistir(); SS.syncRow(sm, perfil.workouts = perfil.workouts || [], ex, set, ctx.ahora());
      perfil.updatedAt = ctx.ahora(); ctx.guardar(); editando = null; render(); return r;
    }
    function borrarSerie(ex, set) {
      const r = SS.deleteActiveSet(sm, ex, set);
      if (!r.ok) { ctx.aviso(r.error); return; }
      persistir(); SS.removeRow(perfil.workouts = perfil.workouts || [], r.key);
      perfil.updatedAt = ctx.ahora(); ctx.guardar(); editando = null; render();
    }
    function terminar() {
      if (sm.status === SS.STATUS.ACTIVE) {
        SS.clearRest(sm); cerrarCronometro();
        perfil.sessions = perfil.sessions || []; perfil.workouts = perfil.workouts || [];
        SS.complete(sm, perfil.sessions, perfil.workouts, ctx.reloj(), ctx.ahora());
        perfil.updatedAt = ctx.ahora(); ctx.guardar(); SS.clearActive(ctx.storage);
      }
      sm.finished = true; render();
    }
    function cerrar() { cerrarCronometro(); soltarBloqueo(); const r = doc.getElementById('session-mode-root'); if (r) r.remove(); sm = null; editando = null; }

    /* Pintar */
    function render() {
      const r = raiz();
      if (!sm) return;
      if (sm.finished) { r.innerHTML = htmlResumen(sm, perfil, ctx.reloj()); $('#sm-back-to-plan').onclick = () => { cerrar(); ctx.alTerminar && ctx.alTerminar(); }; return; }
      const ex = sm.exercises[sm.exIndex];
      const hechas = sm.values.flat().filter(v => v.done).length, total = sm.values.flat().length;
      const ultima = SESION.ultimaVez(perfil.workouts || [], ex.exerciseId, sm.sessionId);
      r.innerHTML = `<div class="session-mode">
        <div class="session-mode-head"><button class="btn btn-icon" id="sm-close" aria-label="Cerrar sesión">✕</button>
          <div class="prog">${sm.short ? 'Rutina corta · ' : ''}Ejercicio ${sm.exIndex + 1} de ${sm.exercises.length} · ${hechas}/${total} series</div><button class="btn" id="sm-finish">Terminar</button></div>
        <div class="session-mode-body">
          ${(!('wakeLock' in nav) || !bloqueoSoportado) ? '<p class="help" id="sm-wakelock-note">Tu navegador no puede mantener la pantalla encendida. Desactiva el bloqueo automático mientras entrenas.</p>' : ''}
          ${(sm.avisos || []).map(a => `<div class="alert warn">${esc(a.texto)}</div>`).join('')}
          ${htmlEjercicioSesion(sm, perfil, editando, opcionesDe(sm.exIndex), ultima)}
        </div>
        <div class="session-mode-foot"><button class="btn btn-icon" id="sm-prev" ${sm.exIndex === 0 ? 'disabled' : ''} aria-label="Ejercicio anterior">‹</button>
          <button class="btn btn-primary" id="sm-next" style="flex:1">${sm.exIndex === sm.exercises.length - 1 ? 'Finalizar ejercicios' : 'Siguiente ejercicio'}</button>
          <button class="btn btn-icon" id="sm-next-arrow" ${sm.exIndex === sm.exercises.length - 1 ? 'disabled' : ''} aria-label="Ejercicio siguiente">›</button></div></div>`;
      conectar();
    }
    function conectar() {
      const r = raiz();
      $('#sm-close').onclick = async () => { if (await ctx.confirmar('¿Salir del modo sesión? La sesión queda guardada y podrás reanudarla.', { confirmLabel: 'Salir', cancelLabel: 'Seguir' })) cerrar(); };
      $('#sm-finish').onclick = terminar;
      $('#sm-prev').onclick = () => { sm.exIndex = Math.max(0, sm.exIndex - 1); persistir(); render(); };
      const sig = () => { if (sm.exIndex < sm.exercises.length - 1) { sm.exIndex++; persistir(); render(); } else terminar(); };
      $('#sm-next').onclick = sig;
      const flecha = $('#sm-next-arrow'); if (flecha) flecha.onclick = () => { if (sm.exIndex < sm.exercises.length - 1) { sm.exIndex++; persistir(); render(); } };
      r.querySelectorAll('[data-sm-weight]').forEach(i => i.oninput = () => { sm.values[sm.exIndex][Number(i.dataset.smWeight)].weight = i.value; persistir(); });
      r.querySelectorAll('[data-sm-reps]').forEach(i => i.oninput = () => { sm.values[sm.exIndex][Number(i.dataset.smReps)].reps = i.value; persistir(); });
      r.querySelectorAll('[data-sm-pain]').forEach(i => i.oninput = () => { sm.values[sm.exIndex][Number(i.dataset.smPain)].pain = i.value; persistir(); });
      const zona = $('[data-sm-zona]'); if (zona) zona.onchange = () => { sm.exercises[sm.exIndex].zonaDolor = zona.value; persistir(); };
      r.querySelectorAll('[data-sm-done]').forEach(b => b.onclick = () => registrarSerie(Number(b.dataset.smDone)));
      r.querySelectorAll('[data-sm-edit]').forEach(b => b.onclick = () => { editando = { ex: sm.exIndex, set: Number(b.dataset.smEdit) }; render(); });
      r.querySelectorAll('[data-sm-variante]').forEach(b => b.onclick = () => cambiarVariante(sm.exIndex, b.dataset.smVariante));
      if (editando) { const { ex, set } = editando; wireSetEditor(r, { onSave: vals => editarSerie(ex, set, vals), onDelete: () => borrarSerie(ex, set), onCancel: () => { editando = null; render(); } }, ctx); }
    }

    /* Empezar y reanudar */
    // `minutos`: "hoy tengo X min" (rutina corta); sin él, la sesión completa del plan guardado.
    function iniciar(p, indiceDia, minutos) {
      if (SS.loadActive(ctx.storage)) { ctx.aviso('Tienes una sesión en curso: reanúdala o descártala primero.'); ofrecerReanudar(); return; }
      const prep = prepararSesion(p, indiceDia, { minutos: minutos || 0, hoy: ctx.ahora() });
      if (!prep.ejercicios.length) { ctx.aviso('Con ese tiempo no entra ningún ejercicio.'); return; }
      perfil = p;
      sm = SS.newSession({ profileId: p.id, sessionId: ctx.id(), dayIndex: indiceDia, dayName: prep.planSesion.nombre, short: !!minutos, exercises: prep.ejercicios, now: ctx.reloj() });
      sm.planSesion = prep.planSesion; sm.elecciones = prep.elecciones; sm.avisos = prep.avisos; sm.minutos = minutos || 0;
      persistir(); pedirBloqueo(); render();
    }
    function ofrecerReanudar() {
      if (doc.getElementById('resume-prompt')) return;
      if (SS.peekCorrupt(ctx.storage)) { ctx.aviso('Hay una sesión guardada que no se pudo leer.'); return; }
      const rec = SS.loadActive(ctx.storage);
      if (!rec) return;
      const p = ctx.perfiles().find(x => x.id === rec.profileId);
      if (!p) { SS.clearActive(ctx.storage); return; }
      const pr = SS.progress(rec);
      const ov = doc.createElement('div'); ov.id = 'resume-prompt'; ov.className = 'card accent'; ov.setAttribute('role', 'alertdialog');
      ov.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:60;box-shadow:0 8px 30px rgba(0,0,0,.35)';
      ov.innerHTML = `<h3>Tienes una sesión en curso</h3><p>${esc(rec.dayName)}${rec.short ? ' · rutina corta' : ''} · ${pr.done}/${pr.total} series hechas · empezó ${esc(new Date(rec.startedAt).toLocaleString('es'))}.</p>
        <div class="btn-row"><button class="btn btn-primary" id="resume-yes">Reanudar</button><button class="btn" id="resume-no">Descartar</button></div>`;
      doc.body.appendChild(ov);
      $('#resume-yes').onclick = () => {
        ov.remove(); perfil = p;
        if (SS.reconcile(rec, p.workouts = p.workouts || [], ctx.ahora())) { p.updatedAt = ctx.ahora(); ctx.guardar(); }
        sm = rec; persistir(); pedirBloqueo(); render();
        if (sm.rest) { if (SS.restRemaining(sm, ctx.reloj()) > 0) mostrarDescanso(); else { SS.clearRest(sm); persistir(); } }
      };
      $('#resume-no').onclick = async () => {
        const n = pr.done;
        if (!(await ctx.confirmar(n ? `Se descartará la sesión y se borrarán sus ${n} series registradas. ¿Continuar?` : '¿Descartar la sesión en curso?', { confirmLabel: 'Descartar', cancelLabel: 'Cancelar' }))) return;
        ov.remove();
        if (SS.discard(rec, p.workouts = p.workouts || [])) { p.updatedAt = ctx.ahora(); ctx.guardar(); }
        SS.clearActive(ctx.storage); ctx.aviso('Sesión descartada');
      };
    }
    return { iniciar, ofrecerReanudar, estado: () => sm };
  }

  return { crearSesion, htmlVariantes, prepararSesion, tipoDeSerie, htmlSerie, htmlEjercicioSesion, htmlResumen, platesForWeight, parseRestSeconds, zonaPorDefecto };
});
