/* EN CONSTRUCCIÓN · núcleo v2 (B-039, paso 3.8). Pantalla de PROGRESO POR VARIANTE del núcleo nuevo: lo único de la pestaña Progreso que cambia con el registro por
 * variante (el `exerciseId` de cada serie es el id de la variante): la sección "Fuerza" (selector de variante y gráfico del top set) y las "Sesiones registradas"
 * (historial con editor de series). Copiado y adaptado de `app.js` (`strengthSection`, `strengthChart`, `htmlSessionHistory`, `wireSessionHistory`), que se borra en el
 * corte. El peso, las medidas y el gráfico de peso NO cambian y se quedan en `app.js` (no se copian). NO está conectado a la app: lo monta la página de prueba
 * (tests/pagina-nucleo-v2.html) y el corte lo conecta dentro de la pestaña Progreso. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../sessionStore.js'), require('../catalogo.js'), require('./comun.js'), require('./editor.js'));
  else root.CORE_V2_PROGRESO = factory(root.SESSION_STORE, root.CORE_V2_CATALOGO, root.CORE_V2_COMUN, root.CORE_V2_EDITOR);
})(typeof self !== 'undefined' ? self : this, function (SS, CATALOGO, COMUN, EDITOR) {
  'use strict';
  const { esc, n1 } = COMUN;
  const { setEditorHtml, wireSetEditor } = EDITOR;
  const fmtDate = iso => { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const LIMITE_HISTORIAL = 30;

  /* ---------- Fuerza por variante ---------- */

  // Variantes con series registradas (de más a menos recientes), con su nombre del catálogo (si la fila es de una variante que ya no existe, el nombre guardado).
  function variantesRegistradas(workouts) {
    const vistas = new Map();
    (workouts || []).forEach(w => {
      if (!w.exerciseId) return;
      const antes = vistas.get(w.exerciseId);
      if (!antes || (w.date || '') >= antes.fecha) vistas.set(w.exerciseId, { id: w.exerciseId, nombre: (CATALOGO.variantePorId(w.exerciseId) || { nombre: w.exercise || w.exerciseId }).nombre, fecha: w.date || '' });
    });
    return [...vistas.values()].sort((a, b) => b.fecha.localeCompare(a.fecha) || a.nombre.localeCompare(b.nombre));
  }

  // Un punto por día: el top set o, si no hubo, la serie más pesada (como en app.js), solo de ESA variante.
  function puntosDeFuerza(workouts, varianteId) {
    const porDia = {};
    (workouts || []).filter(w => w.exerciseId === varianteId).forEach(w => { (porDia[w.date] = porDia[w.date] || []).push(w); });
    return Object.keys(porDia).sort().map(date => {
      const series = porDia[date];
      const mejor = series.find(s => s.setType === 'top') || series.slice().sort((a, b) => b.weight - a.weight)[0];
      return { date, weight: mejor.weight, reps: mejor.reps, short: series.some(s => s.short) };
    });
  }

  function graficoFuerza(points) {
    const W = 340, H = 160, L = 36, R = 8, T = 10, B = 24;
    const xs = points.map(p => new Date(p.date + 'T00:00:00').getTime());
    const ys = points.map(p => p.weight);
    const x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 7 * 86400000);
    const yMin = Math.min(...ys) - 2.5, yMax = Math.max(...ys) + 2.5;
    const X = x => L + (x - x0) / (x1 - x0) * (W - L - R);
    const Y = y => T + (yMax - y) / (yMax - yMin) * (H - T - B);
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join(' ');
    const dots = points.map((p, i) => `<circle class="${p.short ? 'dot-short' : 'dot'}" cx="${X(xs[i]).toFixed(1)}" cy="${Y(ys[i]).toFixed(1)}" r="3.5"><title>${fmtDate(p.date)}: ${n1(p.weight)} kg × ${p.reps}${p.short ? ' (sesión corta)' : ''}</title></circle>`).join('');
    const ticks = [yMin + 1, (yMin + yMax) / 2, yMax - 1].map(v => `<text x="${L - 4}" y="${Y(v) + 3}" text-anchor="end">${n1(v)}</text>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del top set">
      <line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/><line class="axis" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/>
      ${ticks}<path class="line" pathLength="100" d="${path}"/>${dots}
      <text x="${L}" y="${H - 6}">${fmtDate(points[0].date)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${fmtDate(points[points.length - 1].date)}</text>
    </svg>`;
  }


  function htmlFuerza(workouts, varianteId) {
    const vars = variantesRegistradas(workouts);
    if (!vars.length) return '<p class="muted">Completa dos sesiones para ver tu evolución de fuerza.</p>';
    const elegida = vars.some(v => v.id === varianteId) ? varianteId : vars[0].id;
    const selector = `<label class="help" for="strength-exercise-select">Variante</label><select id="strength-exercise-select">${vars.map(v => `<option value="${esc(v.id)}" ${v.id === elegida ? 'selected' : ''}>${esc(v.nombre)}</option>`).join('')}</select>`;
    const puntos = puntosDeFuerza(workouts, elegida);
    if (puntos.length < 2) return `${selector}<p class="muted">Completa dos sesiones con esta variante para ver tu evolución de fuerza.</p>`;
    return `${selector}${graficoFuerza(puntos)}<p class="help">Marca hueca = rutina corta. El progreso es de cada variante: si cambias de variante, empieza su propia línea.</p>`;
  }

  /* ---------- Historial de sesiones ---------- */

  // `estado`: { editandoId (fila en edición), abiertaId (sesión desplegada), sesionActivaId (la sesión en curso no se lista) }.
  function htmlHistorial(perfil, estado) {
    const e = estado || {};
    const lista = SS.listSessions(perfil.workouts || [], perfil.sessions || [], e.sesionActivaId || null);
    const unit = perfil.data.plateUnit || 'kg';
    if (!lista.length) return '<div class="card"><h3>Sesiones registradas</h3><p class="muted">Todavía no registraste ninguna sesión.</p></div>';
    const fila = w => {
      const id = SS.rowId(w);
      const etiqueta = { top: 'Top set', backoff: 'Back-off', normal: `Serie ${w.setNumber}` }[w.setType] || `Serie ${w.setNumber}`;
      if (e.editandoId === id) return `<li class="hist-row editing"><div class="muted">${esc(w.exercise)} · ${esc(etiqueta)}</div>${setEditorHtml('hist', id, w.weight, w.reps, unit)}</li>`;
      return `<li class="hist-row"><button class="btn btn-ghost" data-hist-edit="${esc(id)}" aria-label="Editar o borrar: ${esc(w.exercise)}, ${esc(etiqueta)}"><b>${esc(w.exercise)}</b> · ${esc(etiqueta)} · ${n1(w.weight)} ${esc(unit)} × ${esc(w.reps)}</button></li>`;
    };
    return `<div class="card"><h3>Sesiones registradas</h3>
      <p class="help">Toca una serie para corregir su peso o repeticiones, o para borrarla.</p>
      ${lista.slice(0, LIMITE_HISTORIAL).map(x => `<details class="hist-session" data-sid="${esc(x.sessionId)}"${x.sessionId === e.abiertaId || x.rows.some(r => SS.rowId(r) === e.editandoId) ? ' open' : ''}>
        <summary>${fmtDate(x.date)} · ${esc(x.dayName)} · ${x.rows.length} series${x.status === 'sin_estado' ? ' <span class="muted">(sin estado)</span>' : ''}</summary>
        <ul class="hist-rows">${x.rows.length ? x.rows.map(fila).join('') : '<li class="muted">Sin series.</li>'}</ul>
      </details>`).join('')}
      ${lista.length > LIMITE_HISTORIAL ? `<p class="muted">Se muestran las ${LIMITE_HISTORIAL} sesiones más recientes.</p>` : ''}
    </div>`;
  }

  /* ---------- Montaje ---------- */
  // `ctx`: { perfil() → el perfil activo, guardar(), ahora(), reloj(), aviso(texto), confirmar(mensaje, opciones) → promesa, sesionActivaId() → id o null }.
  function montarProgreso(raiz, ctx) {
    let varianteId = null, editandoId = null, abiertaId = null;
    function render() {
      const p = ctx.perfil();
      if (!p) { raiz.innerHTML = '<div class="empty"><p>Abre un perfil para ver su progreso.</p></div>'; return; }
      const vars = variantesRegistradas(p.workouts);
      if (!vars.some(v => v.id === varianteId)) varianteId = vars[0] ? vars[0].id : null;
      raiz.innerHTML = `<div class="card"><h3>Fuerza</h3>${htmlFuerza(p.workouts, varianteId)}</div>${htmlHistorial(p, { editandoId, abiertaId, sesionActivaId: ctx.sesionActivaId() })}`;
      const sel = raiz.querySelector('#strength-exercise-select');
      if (sel) sel.onchange = () => { varianteId = sel.value; render(); };
      raiz.querySelectorAll('.hist-session').forEach(d => d.ontoggle = () => { if (d.open) abiertaId = d.dataset.sid; else if (abiertaId === d.dataset.sid) abiertaId = null; });
      raiz.querySelectorAll('[data-hist-edit]').forEach(b => b.onclick = () => { editandoId = b.dataset.histEdit; render(); });
      if (!editandoId) return;
      const id = editandoId;
      wireSetEditor(raiz, {
        onSave: vals => {
          const r = SS.editRow(p.workouts || [], id, vals, ctx.reloj());
          if (r.ok) { p.updatedAt = ctx.ahora(); ctx.guardar(); editandoId = null; render(); }
          return r;
        },
        onDelete: () => {
          const r = SS.deleteRow(p.workouts || [], p.sessions = p.sessions || [], id, ctx.reloj());
          if (!r.ok) { ctx.aviso(r.error); return; }
          p.updatedAt = ctx.ahora(); ctx.guardar(); editandoId = null; ctx.aviso('Serie borrada'); render();
        },
        onCancel: () => { editandoId = null; render(); },
      }, ctx);
    }
    render();
    return { render };
  }

  return { variantesRegistradas, puntosDeFuerza, htmlFuerza, htmlHistorial, graficoFuerza, montarProgreso };
});
