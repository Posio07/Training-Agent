/* Núcleo del generador · núcleo v2 (B-039, paso 3.6). Pantalla de PLAN, pestaña "Entreno", del núcleo nuevo: arma el HTML desde el plan guardado
 * (`core-v2/plan.js`). Viene de las tarjetas de sesión de `app.js` (`htmlSessionCard`, `htmlExRow`, `htmlExercise`,
 * `htmlTraining`), que el corte borró. Resumen, dieta, medidas y suplementos NO se tocan: siguen en `app.js` junto a esta pestaña.
 *
 * Todo son funciones puras que devuelven HTML; los eventos los conecta `montaje.js` con los atributos `data-*`:
 *   data-regenerar · data-aplicar-version · data-salida="mas-tiempo|mas-dias|aceptar" · data-toggle-day · data-start-session. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../knowledge.js'), require('../registro.js'), require('../catalogo.js'), require('../plan.js'), require('../aviso.js'), require('../textos.js'), require('../cardio.js'), require('./comun.js'));
  else root.CORE_V2_ENTRENO = factory(root.KNOWLEDGE, root.CORE_V2_REGISTRO, root.CORE_V2_CATALOGO, root.CORE_V2_PLAN, root.CORE_V2_AVISO, root.CORE_V2_TEXTOS, root.CORE_V2_CARDIO, root.CORE_V2_COMUN);
})(typeof self !== 'undefined' ? self : this, function (K, REGISTRO, CATALOGO, PLAN, AVISO, TEXTOS, CARDIO, COMUN) {
  'use strict';
  const { esc, n1, icon } = COMUN;
  const cite = ids => (Array.isArray(ids) ? ids : [ids]).map(id => `<span class="cite" title="${esc(K.SOURCES[id] ? K.SOURCES[id].short : id)}">${esc(id)}</span>`).join('');
  const rango = r => `${r[0]}-${r[1]}`;
  const etiquetaGrupo = g => K.MUSCLE_LABELS[g] || g || 'Funcional';

  function htmlEjercicio(e) {
    const v = CATALOGO.variantePorId(e.varianteId);
    const clase = e.tipo === 'multiarticular' ? 'type-compound' : 'type-isolation';
    const fila = (extra, nombre, reps, series, descanso, rir, etiqueta) => `<div class="ex-row ${extra}">
      <div class="ex-main">
        <div class="ex-name">${esc(nombre)}${etiqueta ? ' <span class="ex-tag">Top set</span>' : ''}</div>
        <div class="ex-fields">
          <span class="f ex-muscle">${esc(etiquetaGrupo(e.grupo))}</span>
          ${rir ? `<span class="f">${icon('gauge')} RIR ${esc(rango(rir))}</span>` : ''}
          <span class="f">${icon('clock')} ${esc(descanso)}</span>
          ${e.evidenciaPorVerificar && nombre === e.nombre ? '<span class="ex-tag ex-tag-evidencia" title="La relación de este ejercicio con el músculo no tiene una fuente leída (DEC-038)">Evidencia por verificar</span>' : ''}
        </div>
      </div>
      <div class="ex-sets"><span class="n">${esc(series)}</span> <span class="x">×</span> <span class="n">${esc(reps)}</span></div>
    </div>`;
    const reps = v ? rango(v.reps) : '';
    const descanso = `${REGISTRO.valor(e.tipo === 'multiarticular' ? 'DESCANSO_MULTIARTICULAR_S' : 'DESCANSO_AISLAMIENTO_S')} s`;
    if (e.topSet) {
      const top = fila('type-top', e.nombre, rango(e.topSet.repeticiones), '1', `${REGISTRO.valor('DESCANSO_TOP_SET_S')} s`, e.topSet.rir, true);
      const back = e.topSet.backoffs > 0 ? `<div class="backoff">${fila(clase, `Back-off (−${e.topSet.backoffReduccionPorcentaje} % carga)`, reps, e.topSet.backoffs, `${REGISTRO.valor('DESCANSO_BACKOFF_S')} s`, null, false)}</div>` : '';
      return `<div class="ex-group">${top}${back}</div>`;
    }
    return `<div class="ex-group">${fila(clase, e.nombre, reps, e.series, descanso, null, false)}</div>`;
  }

  function htmlSesion(s, i, esSiguiente, aceptada) {
    const conteo = { top: 0, compound: 0, isolation: 0 };
    s.ejercicios.forEach(e => {
      const resto = e.topSet ? e.series - 1 : e.series;
      if (e.topSet) conteo.top += 1;
      conteo[e.tipo === 'multiarticular' ? 'compound' : 'isolation'] += resto;
    });
    const pct = n => (s.series ? (n / s.series * 100) : 0);
    const musculos = [...new Set(s.ejercicios.map(e => etiquetaGrupo(e.grupo)))];
    // Leyenda de la barra: qué significa cada color y cuántas series hay de cada tipo (solo los tipos que el día tiene).
    const leyenda = [['top', conteo.top, 'top set'], ['compound', conteo.compound, 'multiarticular'], ['isolation', conteo.isolation, 'aislamiento']].filter(x => x[1] > 0);
    // El tiempo de la sesión, con los mismos minutos redondeados que se muestran: cuánto usa, de cuánto, y cuánto sobra.
    const usa = Math.round(s.minutos), tiene = Math.round(s.capacidadMin), sobra = tiene - usa;
    const margen = sobra > 0 ? `<span class="session-spare">${sobra === 1 ? 'sobra 1 min' : `sobran ${sobra} min`}</span>` : sobra < 0 ? `<span class="session-spare over">${-sobra} min de más</span>` : '';
    return `<div class="session${esSiguiente ? ' session-next' : ''}">
      <button type="button" class="session-head" data-toggle-day="${i}" aria-expanded="${esSiguiente}" aria-controls="day-body-${i}">
        <div class="session-head-main">
          <h4>${esc(s.nombre)}${esSiguiente ? ' <span class="day-tag">Siguiente</span>' : ''}${aceptada ? ' <span class="day-tag day-tag-aceptada">Aceptada con lo que falta</span>' : ''}</h4>
          <div class="session-time">
            <span class="session-time-used">${icon('clock')} <b>~${usa}</b> de ${tiene} min</span>
            ${margen}
          </div>
          <div class="session-volume">
            <div class="session-bar" aria-hidden="true">
              <span class="top" style="width:${pct(conteo.top)}%"></span>
              <span class="compound" style="width:${pct(conteo.compound)}%"></span>
              <span class="isolation" style="width:${pct(conteo.isolation)}%"></span>
            </div>
            <span class="session-series"><b>${s.series}</b> series</span>
          </div>
          <div class="session-legend">${leyenda.map(([clase, n, tipo]) => `<span class="ley ${clase}">${n} ${tipo}</span>`).join('')}</div>
          <div class="session-muscles">${musculos.map(m => `<span class="chip">${esc(m)}</span>`).join('')}</div>
        </div>
        ${icon('chevron', 'chev')}
      </button>
      <div class="session-body" id="day-body-${i}" ${esSiguiente ? '' : 'inert'}>
        <div class="session-body-inner">
          <div class="ex-list">${s.ejercicios.map(htmlEjercicio).join('')}</div>
          <button class="btn btn-primary btn-lg btn-block session-start" data-start-session="${i}">Empezar sesión</button>
          <div class="session-short">
            <label class="session-short-label" for="hoy-min-${i}">hoy tengo (min)</label>
            <div class="session-short-row">
              <input id="hoy-min-${i}" type="number" inputmode="numeric" min="1" step="5" data-hoy-min="${i}" placeholder="min" aria-label="Minutos que tienes hoy">
              <button class="btn" data-start-session-short="${i}">Rutina corta</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // El aviso único (paso 3.2): un solo bloque con las tres salidas.
  function htmlAviso(aviso) {
    if (!aviso.hay) return '';
    const botones = aviso.salidas.filter(s => s.disponible !== false).map(s => {
      const extra = s.id === 'mas-dias' ? ` (${s.dias})` : '';
      return `<button class="btn${s.id === 'mas-tiempo' ? ' btn-primary' : ''}" data-salida="${esc(s.id)}">${esc(s.texto)}${extra}</button>`;
    }).join('');
    return `<div class="card card-aviso">
      <h3>${esc(aviso.titulo)}</h3>
      <ul>${aviso.lineas.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="btn-row">${botones}</div>
    </div>`;
  }

  // Avisos del reparto que el usuario debe ver (lenguaje simple). Los que van al aviso único no se repiten acá.
  function avisosDelPlan(plan) {
    const a = plan.avisos, nombre = id => (CATALOGO.variantePorId(id) || { nombre: id }).nombre;
    const out = [];
    (a.seguridad || []).forEach(x => out.push(`${nombre(x.varianteId)}: no entra en el plan (lesión declarada o variante no habilitada). La seguridad gana sobre la preferencia.`));
    (a.prioritariosSinLugar || []).forEach(id => out.push(`${nombre(id)}: ningún día de este split incluye su patrón, así que no pudo entrar como prioritario.`));
    (a.funcionalesSinLugar || []).forEach(x => out.push(`${x.sesion}: ${nombre(x.varianteId)} no entra (${x.motivo}).`));
    (a.a2 || []).forEach(x => out.push(`${x.sesion}: ${x.motivo}.`));
    (a.topeExcedido || []).forEach(x => out.push(`${x.sesion}: ${nombre(x.varianteId)} queda con ${x.series} series (${x.motivo}).`));
    return out;
  }

  // La pestaña. `ctx`: { datos (perfil), guardado (plan guardado), siguiente (índice del día que sigue, por defecto 0) }.
  function htmlEntreno(ctx) {
    const g = ctx.guardado, plan = g.plan, datos = ctx.datos;
    const estado = PLAN.estadoDelPlan(g, datos);
    const aviso = AVISO.avisoPendiente(AVISO.construirAviso(plan), datos, g);
    const cardio = CARDIO.prescribirCardio(datos);
    const siguiente = ctx.siguiente || 0;
    const filasSemana = Object.keys(plan.semanal).map(m => `<tr><td>${esc(K.MUSCLE_LABELS[m] || m)}${plan.semanal[m].rezagado ? ' <span class="cite" title="Grupo rezagado: +25 % de series">rezagado</span>' : ''}</td><td class="num">${n1(plan.semanal[m].cubierto)}</td><td class="num">${n1(plan.semanal[m].objetivo)}</td></tr>`).join('');
    const avisos = avisosDelPlan(plan);
    return `
      ${estado.versionNueva ? `<div class="card card-aviso"><p>Hay una versión nueva del generador. Tu plan sigue como está hasta que decidas aplicarla.</p><div class="btn-row"><button class="btn btn-primary" data-aplicar-version>Aplicar la versión nueva</button></div></div>` : ''}
      ${htmlAviso(aviso)}
      ${avisos.length ? `<div class="card"><h3>Avisos del plan</h3><ul>${avisos.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      <h2 class="plan-title">Entrenamiento · ${plan.sesiones.length} días por semana</h2>
      ${plan.sesiones.map((s, i) => htmlSesion(s, i, i === siguiente, PLAN.aceptacionVigente(g, datos, i))).join('')}
      <div class="card">
        <p class="muted">Plan generado el ${esc(g.creadoEn)} (generador ${esc(g.versionMotor)}). No cambia solo: se regenera cuando cambias el tiempo, los días, el objetivo, el nivel, la división, los rezagados, los prioritarios, las lesiones, el remo con barra o la bandera de salud, o cuando lo pides.</p>
        <ul>
          <li><b>Intensidad:</b> ${esc(TEXTOS.intensidad())} ${cite(['HELMS_TRAIN', 'ACSM_RT'])}</li>
          <li><b>Progresión:</b> ${esc(TEXTOS.progresion())} ${cite('ACSM_RT')}</li>
          <li><b>Descarga:</b> ${esc(TEXTOS.descarga())}</li>
        </ul>
        <div class="src">Fuentes: ${cite(TEXTOS.fuentesDeTextos(datos))}</div>
        <div class="btn-row"><button class="btn" data-regenerar>Regenerar el plan</button></div>
      </div>
      <div class="card">
        <h3>Cardio</h3>
        <p><b>${cardio.sesiones} sesiones × ${cardio.minutos} min</b> · ${esc(cardio.tipo)}</p>
        <p class="muted">${esc(cardio.regla)} ${cite(cardio.fuentes)}</p>
      </div>
      <details class="card"><summary>Series semanales por grupo muscular</summary>
        <table><tr><th>Músculo</th><th class="num">Cubiertas</th><th class="num">Objetivo</th></tr>${filasSemana}</table>
        <p class="help">Series fraccionadas por semana (directa 1, indirecta 0,5) frente al objetivo de cada grupo.</p>
      </details>`;
  }

  return { htmlEntreno, avisosDelPlan };
});
