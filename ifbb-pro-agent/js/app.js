/* Interfaz. Los perfiles se guardan en localStorage del dispositivo (nunca salen
 * del teléfono) y se pueden exportar/importar en JSON.
 *
 * El plan de entrenamiento, el formulario del perfil, la sesión y el progreso por
 * variante los pinta el núcleo nuevo (`js/core-v2/pantallas/`), que este archivo
 * monta; acá se quedan los perfiles, el resumen, la dieta, las medidas, los
 * suplementos, el progreso de peso y medidas, y las fuentes (B-047).
 *
 * El almacenamiento es el de `core-v2/almacen.js`: clave nueva y sin migración
 * (DEC-032 y DEC-023). Los datos de la app anterior (`ifbb-agent:v1`) quedan en el
 * dispositivo, ignorados, hasta que un PR aparte los borre (B-046). */
(function () {
  'use strict';

  const ALMACEN = window.CORE_V2_ALMACEN;
  const MONTAJE = window.CORE_V2_MONTAJE;
  const SESION_PANTALLA = window.CORE_V2_SESION_PANTALLA;
  const SS = window.SESSION_STORE;
  const $ = sel => document.querySelector(sel);
  const view = $('#view');

  /* ---------- Estado y persistencia ---------- */
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  // El almacenamiento, sin lógica propia: la clave, la forma y el guardado con aviso salen de core-v2/almacen.js.
  const state = ALMACEN.cargar(storageOrNull());
  const save = ALMACEN.guardador(storageOrNull(), state, msg => toast(msg));
  let ui = { tab: 'profiles', planTab: 'summary', editingId: null };

  // localStorage si el navegador lo permite; si no, un almacenamiento en memoria (la app sigue funcionando sin guardar).
  function storageOrNull() {
    try { localStorage.setItem('__probe', '1'); localStorage.removeItem('__probe'); return localStorage; }
    catch (e) { const mem = {}; return { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } }; }
  }
  const active = () => ALMACEN.activo(state);

  /* ---------- Utilidades ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n1 = v => (Math.round(v * 10) / 10).toLocaleString('es');
  const n0 = v => Math.round(v).toLocaleString('es');
  const n2 = v => (Math.round(v * 100) / 100).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const icon = (name, cls) => `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;

  /* Conteo animado de las métricas grandes del Resumen: solo la primera
   * vez que se visitan en esta sesión de la pestaña (ui.countedOnce);
   * en visitas siguientes, o con prefers-reduced-motion, el número
   * aparece directo en su valor final. */
  ui.countedOnce = ui.countedOnce || new Set();
  const statCount = (value, decimals, suffix) => `<span class="count-num" data-target="${value}" data-decimals="${decimals || 0}">0</span>${suffix ? esc(suffix) : ''}`;
  function wireCounts(container, key) {
    const nodes = container.querySelectorAll('.count-num');
    const already = ui.countedOnce.has(key);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nodes.forEach(el => {
      const target = parseFloat(el.dataset.target) || 0;
      const decimals = Number(el.dataset.decimals) || 0;
      const fmt = v => decimals ? v.toFixed(decimals).replace('.', ',') : Math.round(v).toLocaleString('es');
      if (already || reduced) { el.textContent = fmt(target); return; }
      const start = performance.now(), dur = 600;
      const tick = now => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    ui.countedOnce.add(key);
  }
  const fmtDate = iso => { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const cite = ids => (Array.isArray(ids) ? ids : [ids]).map(id => `<span class="cite" title="${esc(KNOWLEDGE.SOURCES[id] ? KNOWLEDGE.SOURCES[id].short : id)}">${esc(id)}</span>`).join('');

  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* Modal de confirmación con botones a medida (en vez de confirm() nativo,
   * para poder rotular "Recalcular"/"Cancelar" como pide la Fase 6). */
  function confirmModal(message, { confirmLabel = 'Continuar', cancelLabel = 'Cancelar' } = {}) {
    return new Promise(resolve => {
      const root = document.createElement('div');
      root.className = 'modal-overlay';
      root.innerHTML = `<div class="modal-card">
        <p>${esc(message)}</p>
        <div class="btn-row">
          <button class="btn" id="modal-cancel">${esc(cancelLabel)}</button>
          <button class="btn btn-primary" id="modal-confirm">${esc(confirmLabel)}</button>
        </div>
      </div>`;
      document.body.appendChild(root);
      const close = ok => { root.remove(); resolve(ok); };
      root.querySelector('#modal-cancel').onclick = () => close(false);
      root.querySelector('#modal-confirm').onclick = () => close(true);
      root.addEventListener('click', e => { if (e.target === root) close(false); });
    });
  }

  /* ---------- Navegación ---------- */
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
  function go(tab) {
    ui.tab = tab;
    const apply = () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      render();
      window.scrollTo({ top: 0 });
    };
    // Fundido corto entre pestañas con la View Transitions API; si el
    // navegador no la soporta (o el usuario pide menos movimiento), el
    // cambio es instantáneo, sin fallback animado propio.
    if (document.startViewTransition && !prefersReducedMotion()) {
      // Si la transición se aborta (recarga, pestaña oculta) la promesa se rechaza: se ignora, el cambio igual se aplica.
      const vt = document.startViewTransition(apply);
      [vt.ready, vt.finished, vt.updateCallbackDone].forEach(pr => pr && pr.catch && pr.catch(() => {}));
    } else apply();
  }

  function render() {
    const p = active();
    $('#active-profile-label').textContent = p ? `Perfil activo: ${p.data.name}` : 'Sin perfil activo';
    if (ui.tab === 'profiles') renderProfiles();
    else if (ui.tab === 'data') renderData();
    else if (ui.tab === 'plan') renderPlan();
    else if (ui.tab === 'progress') renderProgress();
    else renderSources();
  }

  /* ---------- Perfiles ---------- */
  function renderProfiles() {
    const items = state.profiles.map(p => {
      const div = KNOWLEDGE.DIVISIONS[p.data.division];
      const goal = { cut: 'Definición', bulk: 'Volumen', maintain: 'Mantenimiento' }[p.data.goal] || '';
      return `<div class="profile-item ${p.id === state.activeId ? 'active' : ''}" data-id="${p.id}">
        <div>
          <div class="name">${esc(p.data.name)}</div>
          <div class="meta">${esc(div ? div.label : '')} · ${goal} · ${esc(p.data.weightKg)} kg · actualizado ${fmtDate(p.updatedAt)}</div>
        </div>
        <div class="btn-row" style="margin:0">
          <button class="btn" data-act="open">Abrir</button>
        </div>
      </div>`;
    }).join('');

    view.innerHTML = `
      <div class="card accent">
        <h2>Tus perfiles</h2>
        <p class="muted">Guarda tantos perfiles como quieras (tú, distintas fases, otras personas). Todo se guarda en este teléfono.</p>
        <div class="btn-row">
          <button class="btn btn-primary" id="btn-new">＋ Nuevo perfil</button>
          <button class="btn" id="btn-import">Importar JSON</button>
          <input type="file" id="file-import" accept="application/json" hidden>
        </div>
      </div>
      ${items || `<div class="empty"><div class="big">${icon('person')}</div><p>Aún no hay perfiles.<br>Crea el primero para obtener tu plan.</p></div>`}
      ${active() ? `<div class="card">
        <h3>Perfil activo: ${esc(active().data.name)}</h3>
        ${(() => { const hs = ENGINE.computeHealthScreen(ENGINE.normalizeProfile(active().data)); return hs.anyCondition ? `<p class="muted" style="font-size:.78rem">${esc(hs.disclaimer)}</p>` : ''; })()}
        <div class="btn-row">
          <button class="btn" id="btn-edit">Editar datos</button>
          <button class="btn" id="btn-dup">Duplicar</button>
          <button class="btn" id="btn-export">Exportar JSON</button>
          <button class="btn btn-danger" id="btn-del">Eliminar</button>
        </div>
      </div>` : ''}
      <p class="muted" style="font-size:.78rem">${esc(ENGINE.buildPlan({ name: 'x', age: 30, heightCm: 170, weightKg: 70 }).disclaimer)}</p>
    `;

    $('#btn-new').onclick = () => { ui.editingId = null; go('data'); };
    $('#btn-import').onclick = () => $('#file-import').click();
    $('#file-import').onchange = importJson;
    view.querySelectorAll('.profile-item').forEach(el => {
      el.querySelector('[data-act="open"]').onclick = () => { state.activeId = el.dataset.id; save(); go('plan'); };
    });
    if (active()) {
      $('#btn-edit').onclick = () => { ui.editingId = state.activeId; go('data'); };
      $('#btn-dup').onclick = () => {
        const src = active();
        const copy = ALMACEN.crearPerfil(Object.assign({}, src.data, { name: src.data.name + ' (copia)' }), { id: uid(), planId: uid(), ahora: todayIso() });
        state.profiles.push(copy); state.activeId = copy.id; save(); toast('Perfil duplicado'); render();
      };
      $('#btn-export').onclick = exportJson;
      $('#btn-del').onclick = () => {
        const p = active();
        if (!confirm(`¿Eliminar el perfil "${p.data.name}"? Esta acción no se puede deshacer.`)) return;
        state.profiles = state.profiles.filter(x => x.id !== p.id);
        state.activeId = state.profiles.length ? state.profiles[0].id : null;
        save(); toast('Perfil eliminado'); render();
      };
    }
  }

  function exportJson() {
    const p = active(); if (!p) return;
    // DEC-009 (Privacidad): los datos de salud nunca salen del dispositivo.
    const blob = new Blob([JSON.stringify(ENGINE.exportProfile(p), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ifbb-agent-${p.data.name.replace(/[^\w-]+/g, '_')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importJson(ev) {
    const file = ev.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        const list = Array.isArray(obj) ? obj : Array.isArray(obj.profiles) ? obj.profiles : [obj];
        let count = 0, droppedHealth = false, cancelled = false, restoredSets = 0;
        list.forEach(item => {
          if (!item || !item.data || !item.data.name) return;
          const errs = ENGINE.validateProfile(item.data);
          if (errs.length) return;
          // DEC-009 (Privacidad): el import nunca pisa un perfil existente (siempre
          // crea uno nuevo) y nunca trae datos de salud; si ya hay un perfil con
          // lesiones declaradas que se parece, se avisa antes de importar.
          const conflicts = ENGINE.localHealthConflicts(state.profiles, item);
          if (conflicts.length && !confirm(`Ya tenés un perfil "${conflicts[0].data.name}" con lesiones declaradas. Este archivo no trae datos de salud (por privacidad no se exportan), así que se va a importar como un perfil NUEVO sin lesiones declaradas. Tu perfil actual no se modifica y conserva sus lesiones. ¿Importar de todos modos?`)) { cancelled = true; return; }
          const newId = uid();
          const prepared = ENGINE.prepareImportedProfile(item, todayIso(), newId);
          droppedHealth = droppedHealth || prepared.droppedHealth;
          const imported = ALMACEN.crearPerfil(prepared.data, { id: newId, planId: uid(), ahora: todayIso() });
          imported.createdAt = prepared.createdAt; imported.updatedAt = prepared.updatedAt;
          imported.log = prepared.log;
          // B-001: el entrenamiento registrado (series y sesiones, sin dolor) vuelve con el perfil.
          imported.workouts = prepared.workouts; imported.sessions = prepared.sessions;
          restoredSets += prepared.workouts.length;
          state.profiles.push(imported);
          count++;
        });
        if (count) { state.activeId = state.profiles[state.profiles.length - 1].id; save(); }
        toast(count ? `${count} perfil(es) importado(s)${restoredSets ? ` · ${restoredSets} series restauradas` : ''}${droppedHealth ? ' · se ignoraron los datos de salud del archivo' : ''}` : cancelled ? 'Importación cancelada' : 'El archivo no contiene perfiles válidos');
        render();
      } catch (e) { toast('Archivo JSON no válido'); }
    };
    reader.readAsText(file);
  }

  /* ---------- Datos (formulario del perfil) ---------- */
  // El formulario y su cableado viven en core-v2/pantallas/perfil.js; acá solo se monta.
  function renderData() { montarNucleo('perfil', ui.editingId); }

  /* ---------- Plan ---------- */
  function renderPlan() {
    const p = active();
    if (!p) { view.innerHTML = `<div class="empty"><div class="big">${icon('barbell')}</div><p>Crea o abre un perfil para ver su plan.</p><button class="btn btn-primary" id="e-new">Nuevo perfil</button></div>`; $('#e-new').onclick = () => go('data'); return; }
    const plan = ENGINE.buildPlan(p.data, todayIso());
    // DEC-009: si el tamizaje bloquea (síntomas, o condición + sedentarismo,
    // sin autorización médica marcada), no se muestra el plan.
    if (plan.health.blocked) { view.innerHTML = htmlHealthBlock(plan); wireHealthBlock(p); return; }
    const tabs = [['summary', 'Resumen'], ['nutrition', 'Dieta'], ['training', 'Entreno'], ['targets', 'Medidas'], ['supps', 'Suplementos']];
    view.innerHTML = `
      ${plan.health.disclaimer ? `<p class="muted" style="font-size:.78rem">${esc(plan.health.disclaimer)}</p>` : ''}
      <div class="subtabs">${tabs.map(([id, l]) => `<button class="btn ${ui.planTab === id ? 'active' : ''}" data-pt="${id}">${l}</button>`).join('')}</div>
      <div id="plan-body"></div>`;
    view.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { ui.planTab = b.dataset.pt; renderPlan(); });
    const body = $('#plan-body');
    if (ui.planTab === 'summary') { body.innerHTML = htmlSummary(plan, p); wireCounts(body, 'summary:' + p.id); }
    else if (ui.planTab === 'nutrition') body.innerHTML = htmlNutrition(plan);
    else if (ui.planTab === 'training') montarNucleo('plan', null, body); // el entreno lo pinta core-v2/pantallas/entreno.js
    else if (ui.planTab === 'targets') body.innerHTML = htmlTargets(plan);
    else body.innerHTML = htmlSupps(plan);
    const share = $('#btn-share');
    if (share) share.onclick = () => sharePlan(plan, p);
  }

  /* ---------- Montaje del núcleo nuevo ----------
   * Perfil, entreno y progreso por variante los pinta core-v2/pantallas/montaje.js.
   * La navegación sigue siendo de esta barra de pestañas: `navegar` traduce el cambio
   * de pantalla que pide el núcleo a la pestaña que le corresponde. */
  function montarNucleo(vista, editandoId, raiz) {
    const destino = raiz || view;
    if (!raiz) destino.innerHTML = '';
    MONTAJE.montar(destino, {
      almacen: state, guardar: save, ahora: todayIso, reloj: () => Date.now(), id: uid, aviso: toast,
      confirmar: (msg, opciones) => confirmModal(msg, opciones),
      vista, editandoId,
      navegar: (v, id) => {
        if (v === 'perfil') { ui.editingId = id; go('data'); }
        else if (v === 'progreso') go('progress');
        else { ui.editingId = null; ui.planTab = 'summary'; go('plan'); } // guardar o cancelar el perfil vuelve al Resumen, como antes del corte
      },
      siguiente: p => SS.siguienteDia(p.workouts || [], p.sessions || [], p.planGuardado.plan.sesiones.map(x => x.nombre)),
      sesionActivaId: () => { const st = sesion.estado(); return st ? st.sessionId : null; },
      pantallaBloqueo: (destinoRaiz, perfil, salud) => { destinoRaiz.innerHTML = htmlHealthBlock({ health: salud }); wireHealthBlock(perfil); },
      alIniciarSesion: (indice, perfil, minutos) => sesion.iniciar(perfil, indice, minutos),
    });
  }

  /* DEC-009: pantalla de bloqueo cuando el tamizaje lo exige. El motor
   * igual calculó el plan completo (buildPlan es puro); acá se decide no
   * mostrarlo hasta que el usuario marque la autorización médica. */
  function htmlHealthBlock(plan) {
    const h = plan.health;
    const screeningBlocked = !!h.blockReason;
    // Mismo patrón para las dos causas de pausa: advertencia → derivación a un
    // profesional → confirmación explícita. Las lesiones piden la confirmación
    // zona por zona (DEC-011).
    const screeningPart = screeningBlocked ? `
        <div class="alert danger">${esc(h.blockReason)}</div>
        <p class="muted">Esto no es un diagnóstico: es el resultado del tamizaje previo al ejercicio (ACSM/Riebe 2015) que completaste en Datos. Si ya consultaste y tenés autorización para entrenar a intensidad vigorosa, marcala para continuar.</p>
        <div class="btn-row"><button class="btn btn-primary" id="btn-medical-clearance">Tengo autorización médica</button></div>` : '';
    // Zonas que se piden de nuevo por haber empeorado (no la primera autorización).
    const reauthZones = ENGINE.zonesPendingReauthorization(h).map(z => KNOWLEDGE.INJURY_LABELS[z] || z);
    const injuryPart = h.injuryBlockReason ? `
        ${reauthZones.length ? `<div class="alert warn">Se pide de nuevo porque registraste dolor o cambiaste el diagnóstico en ${esc(reauthZones.join(', '))}.</div>` : ''}
        <div class="alert danger">${esc(h.injuryBlockReason)} ${evTag('E4')}</div>
        <p class="muted">Derivación: un médico o fisioterapeuta puede decirte si podés entrenar y cómo. La app no reemplaza esa valoración.</p>
        ${h.injuryClearance.pendingZones.map(z => `
        <div class="card" style="margin:.5rem 0">
          <strong>${esc(KNOWLEDGE.INJURY_LABELS[z] || z)}</strong>
          <p class="muted" style="margin:.3rem 0">¿Un profesional te autorizó a entrenar con esta lesión? Se guarda con la fecha de hoy.</p>
          <button class="btn btn-primary" data-injury-clearance="${esc(z)}">Sí, un profesional me autorizó</button>
        </div>`).join('')}` : '';
    return `
      <div class="card accent" style="border-color:var(--peligro)">
        <h2>Plan en pausa</h2>
        ${screeningPart}
        ${injuryPart}
        <div class="btn-row"><button class="btn" id="btn-edit-health">Revisar mis respuestas</button></div>
      </div>`;
  }
  function wireHealthBlock(profile) {
    const med = $('#btn-medical-clearance');
    if (med) med.onclick = () => {
      profile.data.health = profile.data.health || { screening: {}, diabetes: { type: 'none' }, injuries: [] };
      profile.data.health.screening.medicalClearance = true;
      profile.updatedAt = todayIso(); save(); toast('Autorización registrada'); renderPlan();
    };
    view.querySelectorAll('[data-injury-clearance]').forEach(btn => btn.onclick = () => {
      const inj = ((profile.data.health && profile.data.health.injuries) || []).find(i => i.zone === btn.dataset.injuryClearance);
      if (!inj) return;
      inj.clearanceDate = todayIso();
      delete inj.clearanceInvalidated;
      profile.updatedAt = todayIso(); save(); toast('Autorización registrada'); renderPlan();
    });
    $('#btn-edit-health').onclick = () => { ui.editingId = profile.id; go('data'); };
  }

  function evTag(level) { return `<span class="ev-tag">${esc(level)} · ${level === 'E3' ? 'preprint' : 'heurística'}</span>`; }
  function alerts(list) { return list.map(w => `<div class="alert ${w.level}">${esc(w.text)}${w.evidence ? ' ' + evTag(w.evidence) : ''}</div>`).join(''); }

  function htmlSummary(plan, profile) {
    const m = plan.metrics, t = plan.targets, n = plan.nutrition;
    const dias = profile.planGuardado.plan.sesiones.length;
    const goalLabel = { cut: 'Definición', bulk: 'Volumen', maintain: 'Mantenimiento' }[plan.input.goal];
    return `
      <div class="card accent">
        <h2>${esc(plan.input.name)}</h2>
        <p class="muted">${esc(t.division.label)} · ${goalLabel} · generado ${fmtDate(plan.generatedAt)}</p>
        ${alerts(plan.warnings)}
        <div class="grid">
          <div class="stat"><div class="v">${statCount(n.calories, 0)}</div><div class="l">kcal/día (${esc(n.deltaLabel)})</div></div>
          <div class="stat"><div class="v">${statCount(n.protein, 0, ' g')}</div><div class="l">proteína</div></div>
          <div class="stat"><div class="v">${statCount(n.carbs, 0, ' g')}</div><div class="l">carbohidratos</div></div>
          <div class="stat"><div class="v">${statCount(n.fat, 0, ' g')}</div><div class="l">grasas</div></div>
          <div class="stat"><div class="v">${statCount(m.bodyFat, 1, ' %')}</div><div class="l">grasa actual</div><div class="s">${esc(m.bfMethod)}</div></div>
          <div class="stat"><div class="v">${statCount(t.targetBf, 1, ' %')}</div><div class="l">grasa objetivo</div></div>
          <div class="stat"><div class="v">${statCount(t.targetWeight, 1, ' kg')}</div><div class="l">peso objetivo</div><div class="s">${t.delta >= 0 ? '+' : ''}${n1(t.delta)} kg</div></div>
          <div class="stat"><div class="v">${plan.input.goal === 'maintain' ? '—' : statCount(t.weeksNeeded, 0, ' sem')}</div><div class="l">duración estimada</div><div class="s">${plan.input.goal === 'maintain' ? '' : 'hasta ' + fmtDate(t.estimatedDate)}</div></div>
        </div>
      </div>
      <div class="card">
        <h3>Cómo se calculó</h3>
        <ul>
          <li>Gasto en reposo: <b>${n0(m.bmr)} kcal</b> (${m.bmrMethod === 'KATCH' ? 'Katch-McArdle sobre masa magra' : 'Mifflin-St Jeor'}) ${cite(m.bmrMethod)}. Mifflin: ${n0(m.bmrMifflin)} · Katch: ${n0(m.bmrKatch)}.</li>
          <li>Gasto total: ${n0(m.bmr)} × ${m.activityFactor} (${esc(m.activityLabel)}) = <b>${n0(m.tdee)} kcal</b>.</li>
          <li>${plan.input.goal === 'cut' ? `Ritmo de pérdida ${t.ratePct} % del peso/semana (${n1(t.rateKg * 1000)} g) → déficit ${n0(-n.delta)} kcal/día ${cite('HELMS_NUT')}.` : plan.input.goal === 'bulk' ? `Superávit ${n0(n.delta)} kcal/día para ganar ~${t.ratePct} % del peso/semana ${cite('IRAKI')}.` : 'Calorías de mantenimiento; la recomposición depende de proteína alta y entrenamiento progresivo.'}</li>
          <li>Masa magra ${n1(m.lbm)} kg · masa grasa ${n1(m.fatMass)} kg · FFMI normalizado ${n1(m.ffmiNormalized)} ${cite('KOURI')}.</li>
          <li>Entrenamiento: ${dias} días por semana; el reparto parte del tiempo que tienes en cada sesión ${cite(['SCHOENFELD_VOL', 'HELMS_TRAIN'])}. El detalle está en Entreno.</li>
        </ul>
        <div class="btn-row"><button class="btn" id="btn-share">Compartir / copiar resumen</button></div>
      </div>
      <p class="muted" style="font-size:.78rem">${esc(plan.disclaimer)}</p>`;
  }

  function htmlNutrition(plan) {
    const n = plan.nutrition, p = plan.input;
    const total = n.protein * 4 + n.carbs * 4 + n.fat * 9;
    const pct = v => Math.round(v / total * 100);
    return `
      <div class="card accent">
        <h2>Dieta diaria</h2>
        ${alerts(n.warnings)}
        <div class="grid">
          <div class="stat"><div class="v">${n0(n.calories)}</div><div class="l">kcal/día</div><div class="s">gasto ${n0(n.tdee)} · ${esc(n.deltaLabel)} ${n.delta >= 0 ? '+' : ''}${n0(n.delta)}</div></div>
          <div class="stat"><div class="v">${n.protein} g</div><div class="l">proteína · ${n.proteinPerKg} g/kg</div><div class="s">${esc(n.proteinRule)}</div></div>
          <div class="stat"><div class="v">${n.carbs} g</div><div class="l">carbohidratos · ${n.carbsPerKg} g/kg</div><div class="s">resto de calorías</div></div>
          <div class="stat"><div class="v">${n.fat} g</div><div class="l">grasas · ${n.fatPct} % kcal</div><div class="s">rango 15-30 %</div></div>
          <div class="stat"><div class="v">${n.fiber} g</div><div class="l">fibra</div><div class="s">14 g / 1.000 kcal</div></div>
          <div class="stat"><div class="v">${n.waterL} L</div><div class="l">agua total (bebidas + alimentos)</div><div class="s">ingesta adecuada (EFSA); 20-30 % suele venir de la comida · más si sudas mucho</div></div>
        </div>
        <div class="macro-bar"><span class="p" style="width:${pct(n.protein * 4)}%"></span><span class="c" style="width:${pct(n.carbs * 4)}%"></span><span class="f" style="width:${pct(n.fat * 9)}%"></span></div>
        <div class="legend"><span><i style="background:var(--macro-proteina)"></i>Proteína ${pct(n.protein * 4)} %</span><span><i style="background:var(--macro-carbohidrato)"></i>Carbohidrato ${pct(n.carbs * 4)} %</span><span><i style="background:var(--macro-grasa)"></i>Grasa ${pct(n.fat * 9)} %</span></div>
        <div class="src">Fuentes: ${cite(n.sources)}</div>
      </div>
      <div class="card">
        <h3>Reparto y horario</h3>
        <ul>${n.timing.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <table><tr><th>Comida</th><th class="num">Proteína</th><th class="num">Carbohidrato</th><th class="num">Grasa</th></tr>
        ${mealTable(n, p).map(r => `<tr><td>${esc(r.name)}</td><td class="num">${r.p} g</td><td class="num">${r.c} g</td><td class="num">${r.f} g</td></tr>`).join('')}
        </table>
        <p class="help">Reparto orientativo: la proteína uniforme (0,4-0,55 g/kg por comida) es lo que tiene respaldo; el reparto de carbohidrato y grasa es flexible.</p>
      </div>
      <div class="card">
        <h3>Con qué alimentos cubrirlo</h3>
        <b>Proteína</b><ul>${n.foodGuide.protein.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <b>Carbohidratos</b><ul>${n.foodGuide.carbs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <b>Grasas</b><ul>${n.foodGuide.fat.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
      <div class="card">
        <h3>Cómo ajustar cada semana</h3>
        <ul>
          <li>Pésate en ayunas 3-4 días/semana y usa el promedio semanal, no un día suelto.</li>
          <li>${p.goal === 'cut' ? `Objetivo: −${n1(plan.targets.rateKg * 1000)} g/semana. Si durante 2 semanas pierdes menos de la mitad, resta 100-150 kcal (primero de carbohidrato) o añade 10 min de cardio por sesión.` : p.goal === 'bulk' ? `Objetivo: +${n1(plan.targets.rateKg * 1000)} g/semana. Si ganas más del doble, resta 100-150 kcal; si no ganas en 2 semanas, suma 100-150 kcal de carbohidrato.` : 'Si el peso se desvía más de 1 % en 2 semanas, ajusta ±100-150 kcal.'}</li>
          <li>Mantén la proteína fija; ajusta calorías con carbohidrato y, en segundo lugar, grasa.</li>
          <li>Mide cintura cada 2 semanas en el apartado Progreso: si baja el peso pero no la cintura, revisa la precisión de la dieta.</li>
        </ul>
      </div>`;
  }

  function mealTable(n, p) {
    const pre = p.goal === 'cut' ? 0.35 : 0.3;
    const names = ['Desayuno', 'Comida (pre-entreno)', 'Post-entreno', 'Cena'];
    const cSplit = [0.2, pre, pre, 1 - 0.2 - 2 * pre];
    const fSplit = [0.3, 0.15, 0.15, 0.4];
    return names.map((name, i) => ({ name, p: Math.round(n.protein / 4), c: Math.round(n.carbs * cSplit[i]), f: Math.round(n.fat * fSplit[i]) }));
  }

  // DEC-014 · regla E4: tope de series por sesión. El usuario puede aceptar sesiones más largas (queda con fecha).
  // DEC-016: la aceptación vale para este plan y hasta un máximo de series; si cambia, se vuelve a pedir.
  // También avisa de los grupos que quedan bajo el mínimo semanal (mayores y chicos).
  function htmlTargets(plan) {
    const m = plan.metrics, t = plan.targets, p = plan.input;
    const cl = t.classic;
    const whtr = m.whtr;
    return `
      <div class="card accent">
        <h2>Medidas objetivo</h2>
        ${alerts(t.warnings)}
        <table>
          <tr><th>Medida</th><th class="num">Actual</th><th class="num">Objetivo</th></tr>
          <tr><td>Peso</td><td class="num">${n1(p.weightKg)} kg</td><td class="num">${n1(t.targetWeight)} kg</td></tr>
          <tr><td>% grasa corporal</td><td class="num">${n1(m.bodyFat)} %</td><td class="num">${n1(t.targetBf)} %</td></tr>
          <tr><td>Masa grasa</td><td class="num">${n1(m.fatMass)} kg</td><td class="num">${n1(t.targetFatMass)} kg</td></tr>
          <tr><td>Masa magra</td><td class="num">${n1(m.lbm)} kg</td><td class="num">${p.goal === 'bulk' ? '↑ ' : ''}${n1(t.targetLbm)} kg${p.goal === 'cut' ? ' (conservar)' : ''}</td></tr>
          <tr><td>Cintura</td><td class="num">${p.waistCm ? n1(p.waistCm) + ' cm' : '—'}</td><td class="num">&lt; ${n0(t.waistMaxHealth)} cm (salud)</td></tr>
          <tr><td>IMC</td><td class="num">${n1(m.bmi)}</td><td class="num">${n1(t.targetWeight / Math.pow(p.heightCm / 100, 2))}</td></tr>
          <tr><td>FFMI normalizado</td><td class="num">${n1(m.ffmiNormalized)}</td><td class="num">≤ 25 natural</td></tr>
        </table>
        <div class="src">Grasa en tarima por división: estimación a partir de estudios de caso con DXA ${cite('ROSSOW')} y criterios de juicio ${cite('IFBB_RULES')}. Grasa esencial mínima ${cite('ACE_BF')}. Cintura/estatura ${cite('ASHWELL')}. FFMI ${cite('KOURI')}.</div>
      </div>
      ${cl ? `<div class="card">
        <h3>Classic Physique · límite de peso</h3>
        <p>Estatura ${n1(p.heightCm)} cm → límite <b>${cl.lb} lb (${n1(cl.kg)} kg)</b> <span class="muted">(${esc(cl.source)})</span>.</p>
        <p>Peso objetivo ${n1(t.targetWeight)} kg: ${cl.status === 'ok' ? `<b style="color:var(--exito)">dentro del límite</b> con ${n1(cl.marginKg)} kg de margen.` : `<b style="color:var(--peligro)">supera el límite</b> en ${n1(-cl.marginKg)} kg.`}</p>
        <p class="help">La tabla de la app es la de agosto de 2023 y hubo cambios para 2025. Confirma el límite en el reglamento vigente de la IFBB Pro League e introdúcelo en Datos si difiere.</p>
      </div>` : ''}
      <div class="card">
        <h3>Calendario</h3>
        ${p.goal === 'maintain' ? '<p>Fase de mantenimiento: reevalúa medidas cada 4 semanas.</p>' : `
        <ul>
          <li>Ritmo: ${t.ratePct} % del peso/semana (${n1(t.rateKg * 1000)} g/semana).</li>
          <li>Duración estimada: <b>${n0(t.weeksNeeded)} semanas</b> → ${fmtDate(t.estimatedDate)}.</li>
          ${p.targetDate ? `<li>Fecha objetivo indicada: ${fmtDate(p.targetDate)} → ${t.dateFeasible === false ? '<b style="color:var(--peligro)">no alcanzable con seguridad</b>' : '<b style="color:var(--exito)">alcanzable</b>'}.</li>` : ''}
          ${p.goal === 'cut' ? '<li>Reserva las últimas 1-2 semanas para ajustes finales (peak week) con supervisión: la evidencia sobre manipulación de agua y sodio es limitada y arriesgada.</li><li>Tras la competición, planifica 4-8 semanas de subida gradual de calorías ("reverse diet") para recuperar función hormonal.</li>' : '<li>Cuando alcances el techo de grasa off-season, pasa a una minidefinición de 4-8 semanas antes de seguir en volumen.</li>'}
        </ul>`}
      </div>
      ${whtr ? `<div class="card"><h3>Salud</h3><p>Cintura/estatura actual: <b>${n1(whtr * 100) / 100}</b> (umbral de riesgo: 0,5).</p></div>` : ''}`;
  }

  function htmlSupps(plan) {
    return `
      <div class="card accent">
        <h2>Suplementos con respaldo</h2>
        <p class="muted">Solo se listan los que cuentan con posicionamiento oficial de la International Society of Sports Nutrition o evidencia de revisión. Ninguno es obligatorio; la comida y el descanso pesan mucho más.</p>
        ${plan.supplements.map(s => `<div class="supp-item"><h4>${esc(s.name)} <small>${cite(s.source)}</small></h4><p><b>${esc(s.dose)}</b></p><p class="muted">${esc(s.note)}</p></div>`).join('')}
      </div>
      <div class="card">
        <h3>Qué no incluye este plan y por qué</h3>
        <ul>
          <li>Quemagrasas, "boosters" hormonales, BCAA aislados o glutamina: sin efecto demostrado en atletas que ya cubren su proteína.</li>
          <li>Fármacos y esteroides anabolizantes: fuera del alcance de la app; el FFMI de referencia (≤25) corresponde a atletas naturales.</li>
          <li>Protocolos extremos de deshidratación en la semana final: riesgo cardiovascular documentado sin beneficio consistente.</li>
        </ul>
      </div>`;
  }

  function sharePlan(plan, profile) {
    const n = plan.nutrition, t = plan.targets;
    const text = `Training Agent · ${plan.input.name}\n${t.division.label} · ${plan.input.goal}\n` +
      `Calorías: ${n.calories} kcal (P ${n.protein} g · C ${n.carbs} g · G ${n.fat} g)\n` +
      `Grasa ${Math.round(plan.metrics.bodyFat * 10) / 10} % → ${t.targetBf} % · Peso ${plan.input.weightKg} → ${Math.round(t.targetWeight * 10) / 10} kg en ~${Math.round(t.weeksNeeded)} semanas\n` +
      `Entreno: ${profile.planGuardado.plan.sesiones.length} días/semana`;
    if (navigator.share) navigator.share({ title: 'Plan Training Agent', text }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('Resumen copiado'));
  }

  function htmlProgressHeader(log, plan) {
    const t = plan.targets;
    let avg7 = null, totalChange = null, realRate = null;
    if (log.length) {
      const lastDate = new Date(log[log.length - 1].date + 'T00:00:00').getTime();
      const windowStart = lastDate - 6 * 86400000;
      const inWindow = log.filter(e => new Date(e.date + 'T00:00:00').getTime() >= windowStart);
      avg7 = inWindow.reduce((s, e) => s + e.weightKg, 0) / inWindow.length;
    }
    if (log.length >= 2) {
      totalChange = log[log.length - 1].weightKg - log[0].weightKg;
      const days = (new Date(log[log.length - 1].date + 'T00:00:00') - new Date(log[0].date + 'T00:00:00')) / 86400000;
      if (days > 0) realRate = totalChange / (days / 7);
    }
    const fmtKg = v => v == null ? '—' : `${v > 0 ? '+' : ''}${n1(v)} kg`;
    const fmtRate = v => v == null ? '—' : `${v > 0 ? '+' : ''}${n2(v)} kg/sem`;
    const previstoLabel = plan.input.goal === 'maintain' ? 'previsto 0' : `previsto ${plan.input.goal === 'cut' ? '−' : '+'}${n2(Math.abs(t.rateKg))} kg/sem`;
    return `<div class="grid" style="margin-top:.8rem">
      <div class="stat"><div class="v">${avg7 != null ? n1(avg7) + ' kg' : '—'}</div><div class="l">peso actual</div><div class="s">promedio 7 días</div></div>
      <div class="stat"><div class="v">${fmtKg(totalChange)}</div><div class="l">cambio desde el inicio</div></div>
      <div class="stat"><div class="v">${fmtRate(realRate)}</div><div class="l">ritmo real</div><div class="s">${previstoLabel}</div></div>
      <div class="stat"><div class="v">${plan.input.goal === 'maintain' ? '—' : n0(t.weeksNeeded) + ' sem'}</div><div class="l">estimado al objetivo</div></div>
    </div>`;
  }

  /* ---------- Progreso ---------- */
  function renderProgress() {
    const p = active();
    if (!p) { view.innerHTML = `<div class="empty"><div class="big">${icon('trend-down')}</div><p>Abre un perfil para registrar su progreso.</p></div>`; return; }
    const plan = ENGINE.buildPlan(p.data, todayIso());
    const log = (p.log || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    view.innerHTML = `
      <div class="card accent">
        <h2>Progreso · ${esc(p.data.name)}</h2>
        ${htmlProgressHeader(log, plan)}
        <form id="log-form">
          <div class="row2">
            <div><label>Peso (kg)</label><input name="weightKg" type="number" step="0.1" inputmode="decimal" required autofocus></div>
            <div><label>Fecha</label><input name="date" type="date" value="${todayIso()}" required></div>
          </div>
          <div class="row3">
            <div><label>% grasa</label><input name="bodyFatPct" type="number" step="0.1" inputmode="decimal"></div>
            <div><label>Cintura (cm)</label><input name="waistCm" type="number" step="0.5" inputmode="decimal"></div>
            <div><label>Cuello (cm)</label><input name="neckCm" type="number" step="0.5" inputmode="decimal"></div>
          </div>
          <div class="row2">
            <div><label>Cadera (cm)</label><input name="hipCm" type="number" step="0.5" inputmode="decimal"></div>
          </div>
          <div><label>Notas</label><input name="notes" placeholder="energía, fuerza, sueño…" style="width:100%"></div>
          <div class="btn-row"><button class="btn btn-primary btn-block" type="submit">Guardar medición</button></div>
        </form>
      </div>
      <div class="card">
        <h3>Peso vs. objetivo</h3>
        ${weightChart(log, plan)}
        <p class="help">${rateLabel(plan)}</p>
      </div>
      <div id="progreso-variante"></div>
      <div class="card">
        <h3>Historial</h3>
        ${log.length ? `<table><tr><th>Fecha</th><th class="num">Peso</th><th class="num">% grasa</th><th class="num">Cintura</th><th></th></tr>
        ${log.slice().reverse().map((e, i) => `<tr><td>${fmtDate(e.date)}<br><small>${esc(e.notes || '')}</small></td><td class="num">${n1(e.weightKg)} kg</td><td class="num">${e.bodyFatPct ? n1(e.bodyFatPct) + ' %' : '—'}</td><td class="num">${e.waistCm ? n1(e.waistCm) : '—'}</td><td class="num"><button class="btn btn-ghost" data-del="${log.length - 1 - i}" title="Eliminar">✕</button></td></tr>`).join('')}</table>` : '<p class="muted">Sin mediciones todavía.</p>'}
        ${log.length ? '<div class="btn-row"><button class="btn" id="btn-apply">Usar la última medición y recalcular</button></div>' : ''}
      </div>`;

    $('#log-form').onsubmit = e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target).entries());
      const num = v => { const x = parseFloat(v); return isFinite(x) && x > 0 ? x : null; };
      const entry = { date: d.date, weightKg: num(d.weightKg), bodyFatPct: num(d.bodyFatPct), waistCm: num(d.waistCm), neckCm: num(d.neckCm), hipCm: num(d.hipCm), notes: (d.notes || '').trim() };
      if (!entry.weightKg) { toast('Indica el peso'); return; }
      p.log = p.log || []; p.log.push(entry); p.updatedAt = todayIso(); save(); toast('Medición guardada'); renderProgress();
    };
    view.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const idx = Number(b.dataset.del); const sorted = log; const target = sorted[idx];
      p.log = p.log.filter(x => x !== target); save(); renderProgress();
    });
    // Fuerza por variante y sesiones registradas: los pinta core-v2/pantallas/progreso.js.
    montarNucleo('progreso', null, $('#progreso-variante'));
    const apply = $('#btn-apply');
    if (apply) apply.onclick = async () => {
      const ok = await confirmModal('Esto recalcula calorías y proteína del plan. ¿Continuar?', { confirmLabel: 'Recalcular', cancelLabel: 'Cancelar' });
      if (!ok) return;
      const last = log[log.length - 1];
      p.data.weightKg = last.weightKg;
      if (last.bodyFatPct) p.data.bodyFatPct = last.bodyFatPct;
      if (last.waistCm) p.data.waistCm = last.waistCm;
      if (last.neckCm) p.data.neckCm = last.neckCm;
      if (last.hipCm) p.data.hipCm = last.hipCm;
      p.updatedAt = todayIso(); save(); toast('Datos actualizados'); ui.planTab = 'summary'; go('plan');
    };
  }

  function rateLabel(plan) {
    if (plan.input.goal === 'maintain') return 'Mantenimiento: sin ritmo de cambio de peso proyectado.';
    const sign = plan.input.goal === 'cut' ? '−' : '+';
    return `Ritmo previsto: ${sign}${n2(Math.abs(plan.targets.rateKg))} kg/semana · objetivo ${n1(plan.targets.targetWeight)} kg.`;
  }

  function weightChart(log, plan) {
    const W = 340, H = 180, L = 40, R = 10, T = 10, B = 24;
    if (log.length < 2) return `<p class="muted">Registrá tu peso 3-4 veces por semana, en ayunas, para ver la tendencia.</p>`;
    const target = plan.targets.targetWeight;
    const xs = log.map(e => new Date(e.date + 'T00:00:00').getTime());
    const ys = log.map(e => e.weightKg);
    const projecting = plan.input.goal !== 'maintain';
    const estDate = new Date(plan.targets.estimatedDate + 'T00:00:00').getTime();
    const x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 7 * 86400000, projecting ? estDate : x0);
    const yVals = projecting ? [...ys, target] : ys;
    const yMin = Math.min(...yVals) - 1, yMax = Math.max(...yVals) + 1;
    const X = x => L + (x - x0) / (x1 - x0) * (W - L - R);
    const Y = y => T + (yMax - y) / (yMax - yMin) * (H - T - B);

    // Pesajes casi diarios (mediana del intervalo entre mediciones <= 2 días):
    // la línea principal pasa a ser la media móvil de 7 días, y cada pesaje
    // individual queda como punto tenue de fondo.
    const gaps = []; for (let i = 1; i < xs.length; i++) gaps.push((xs[i] - xs[i - 1]) / 86400000);
    gaps.sort((a, b) => a - b);
    const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : Infinity;
    const nearDaily = log.length >= 5 && medianGap <= 2;

    let mainPath, dotsHtml;
    if (nearDaily) {
      const ma = log.map((e, i) => {
        const windowStart = xs[i] - 6 * 86400000;
        const inWindow = log.filter((_, j) => xs[j] >= windowStart && xs[j] <= xs[i]);
        return inWindow.reduce((s, x) => s + x.weightKg, 0) / inWindow.length;
      });
      mainPath = ma.map((y, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
      dotsHtml = log.map((e, i) => `<circle class="dot-faint" cx="${X(xs[i]).toFixed(1)}" cy="${Y(e.weightKg).toFixed(1)}" r="2.2"><title>${fmtDate(e.date)}: ${n1(e.weightKg)} kg</title></circle>`).join('');
    } else {
      mainPath = log.map((e, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(e.weightKg).toFixed(1)}`).join(' ');
      dotsHtml = log.map((e, i) => `<circle class="dot" cx="${X(xs[i]).toFixed(1)}" cy="${Y(e.weightKg).toFixed(1)}" r="3"><title>${fmtDate(e.date)}: ${n1(e.weightKg)} kg</title></circle>`).join('');
    }
    const projection = projecting ? `<line class="line2" x1="${X(xs[0]).toFixed(1)}" y1="${Y(ys[0]).toFixed(1)}" x2="${X(estDate).toFixed(1)}" y2="${Y(target).toFixed(1)}"/>` : '';
    const ticks = [yMin + 1, (yMin + yMax) / 2, yMax - 1].map(v => `<text x="${L - 4}" y="${Y(v) + 3}" text-anchor="end">${n1(v)}</text>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del peso">
      <line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/><line class="axis" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/>
      <line class="target" x1="${L}" y1="${Y(target)}" x2="${W - R}" y2="${Y(target)}"/>
      ${projection}
      ${ticks}<path class="line" pathLength="100" d="${mainPath}"/>${dotsHtml}
      <text x="${L}" y="${H - 6}">${fmtDate(log[0].date)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${fmtDate(log[log.length - 1].date)}</text>
    </svg>`;
  }

  /* ---------- Fuentes ---------- */
  function renderSources() {
    const list = Object.values(KNOWLEDGE.SOURCES);
    view.innerHTML = `
      <div class="card accent">
        <h2>Fuentes utilizadas</h2>
        <p class="muted">Todas las cifras del plan proceden de estas referencias: revisiones sistemáticas, metaanálisis, posicionamientos oficiales de sociedades científicas (ISSN, ACSM), organismos reguladores y el reglamento federativo. No se usan blogs, foros ni opiniones de influencers. Las reglas de seguridad propias de la app (límite de déficit al 30 % y suelo en el gasto en reposo) se señalan como tales cuando se aplican.</p>
      </div>
      <div class="card">
        ${list.map(s => `<div class="source-item"><div class="k">${esc(s.type)} · ${esc(s.id)}</div><div class="t">${esc(s.short)}</div><div class="muted">${esc(s.title)}</div><a href="${esc(s.url)}" target="_blank" rel="noopener">Ver referencia</a></div>`).join('')}
      </div>
      <div class="card">
        <h3>Limitaciones conocidas</h3>
        <ul>
          <li>Los rangos de grasa "en tarima" por división son estimaciones basadas en estudios de caso y no un criterio oficial de la IFBB.</li>
          <li>La tabla de peso de Classic Physique es la de 2023 y puede haber cambiado: verifícala en el reglamento vigente.</li>
          <li>Las ecuaciones de gasto energético tienen un error individual de ±10 %: la báscula y el ajuste semanal mandan.</li>
          <li>La app no sustituye a un médico, dietista-nutricionista o entrenador certificado.</li>
        </ul>
      </div>
      <p class="muted" style="font-size:.75rem">Training Agent · versión 1.0 · datos guardados solo en este dispositivo.</p>`;
  }

  /* ---------- PWA ---------- */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e; $('#btn-install').hidden = false;
  });
  $('#btn-install').onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice; deferredPrompt = null; $('#btn-install').hidden = true;
  };
  window.addEventListener('appinstalled', () => { $('#btn-install').hidden = true; toast('App instalada'); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  /* ---------- Modo sesión ----------
   * La pantalla de sesión es la del núcleo nuevo (core-v2/pantallas/sesion.js): registra por VARIANTE y
   * guarda la sesión en curso en su propia clave de sessionStore.js (DEC-015). */
  const sesion = SESION_PANTALLA.crearSesion({
    doc: document, storage: storageOrNull(), perfiles: () => state.profiles, guardar: save,
    ahora: todayIso, reloj: () => Date.now(), id: uid, aviso: toast,
    confirmar: (msg, opciones) => confirmModal(msg, opciones),
    alTerminar: () => { ui.planTab = 'training'; go('plan'); },
  });

  /* ---------- Arranque ---------- */
  // Todo perfil tiene su plan guardado: si falta o era ilegible, se genera al abrir (DEC-023: sin migraciones).
  if (state.profiles.map(p => ALMACEN.asegurarPlan(p, { planId: uid(), ahora: todayIso() })).some(Boolean)) save();
  if (active()) ui.tab = 'plan';
  go(ui.tab);
  sesion.ofrecerReanudar(); // DEC-015
})();
