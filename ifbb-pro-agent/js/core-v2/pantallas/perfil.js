/* EN CONSTRUCCIÓN · núcleo v2 (B-039, paso 3.6). Pantalla de PERFIL del núcleo nuevo: el formulario (copiado de `renderData` de `app.js`, que se
 * borra en el corte) con los campos nuevos (tiempo disponible por sesión y por día, ejercicios prioritarios) y la lectura de sus campos
 * como funciones puras. NO está conectado a la app: lo monta la página de prueba (tests/pagina-nucleo-v2.html) y el corte lo conecta.
 *
 * El perfil guarda, además de lo que ya normaliza el motor (`ENGINE.normalizeProfile`), `tiempoDisponibleMin` (general), `tiempoPorDia`
 * ({ día: min }) y `prioritarios` (ids de variantes); `core-v2/plan.js` los lee tal cual. La aceptación de sesiones largas (DEC-016) ya no
 * vive en el perfil: está en el plan guardado. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../knowledge.js'), require('../../engine.js'), require('../registro.js'), require('../catalogo.js'), require('./comun.js'));
  else root.CORE_V2_PERFIL = factory(root.KNOWLEDGE, root.ENGINE, root.CORE_V2_REGISTRO, root.CORE_V2_CATALOGO, root.CORE_V2_COMUN);
})(typeof self !== 'undefined' ? self : this, function (K, ENGINE, REGISTRO, CATALOGO, COMUN) {
  'use strict';
  const { esc, n1 } = COMUN;

  function platesCheckboxes(unit, selected) {
    const canon = unit === 'lb' ? K.PLATES_LB : K.PLATES_KG;
    const sel = Array.isArray(selected) && selected.length ? selected.map(Number) : canon;
    return canon.map(p => `<label style="display:flex;align-items:center;gap:.4rem;margin:.2rem 0;font-size:.85rem;color:var(--tiza)"><input type="checkbox" name="availablePlates" value="${p}" style="width:auto" ${sel.includes(p) ? 'checked' : ''}> ${n1(p)} ${unit}</label>`).join('');
  }

  /* DEC-009: una fila por zona de lesión, con el diagnóstico y el dolor
   * actual ocultos hasta marcar la zona (JS, puramente visual: lo que
   * decide qué cuenta es normalizeHealth en engine.js). */
  function injuryZoneRow(zone, label, inj) {
    const checked = !!inj;
    // Nota: no usar `hidden` + estilo inline `display` en el mismo
    // elemento. El estilo inline siempre le gana a la regla [hidden] de
    // la hoja del navegador, así que quedaría visible igual. El propio
    // display inline (none/flex) es lo único que hace falta.
    return `<div class="injury-zone" data-zone="${zone}">
      <label style="display:flex;align-items:center;gap:.5rem;margin:.25rem 0"><input type="checkbox" name="injuryZones" value="${zone}" class="injury-toggle" style="width:auto" ${checked ? 'checked' : ''}> ${esc(label)}</label>
      <div class="injury-sub" style="padding-left:1.7rem;display:${checked ? 'flex' : 'none'};gap:1.1rem;flex-wrap:wrap;margin:0 0 .6rem">
        <label style="display:flex;align-items:center;gap:.4rem;font-size:.82rem;color:var(--acero)"><input type="checkbox" name="injuryDiagnosed" value="${zone}" style="width:auto" ${inj && inj.diagnosed ? 'checked' : ''}> Diagnóstico profesional</label>
        <label style="display:flex;align-items:center;gap:.4rem;font-size:.82rem;color:var(--acero)"><input type="checkbox" name="injuryPainNow" value="${zone}" style="width:auto" ${inj && inj.painNow ? 'checked' : ''}> Dolor actualmente</label>
        ${inj && inj.clearanceDate ? `<span style="font-size:.78rem;color:var(--acero)">Autorización profesional registrada el ${esc(inj.clearanceDate)}</span>` : ''}
      </div>
    </div>`;
  }


  // Variantes que el usuario puede pedir como prioritarias: las del catálogo que aportan volumen (sin los funcionales de la bandera).
  const prioritariasPosibles = () => CATALOGO.VARIANTES.filter(v => !v.habilitaPor && !v.sinAporte);
  function opcionesPrioritarios(sel) {
    const porPatron = {};
    prioritariasPosibles().forEach(v => { (porPatron[v.patron] = porPatron[v.patron] || []).push(v); });
    return Object.keys(porPatron).map(p => `<optgroup label="${esc((CATALOGO.patronPorId(p) || { nombre: p }).nombre)}">${porPatron[p].map(v => `<option value="${esc(v.id)}" ${v.id === sel ? 'selected' : ''}>${esc(v.nombre)}</option>`).join('')}</optgroup>`).join('');
  }

  const PERFIL_NUEVO = { sex: 'M', activity: 'moderate', level: 'intermediate', daysPerWeek: 4, goal: 'cut', division: 'classic_m' };

  // El formulario. `editing`: el perfil guardado ({ data }) o null para un perfil nuevo.
  function htmlPerfil(editing) {
    const d = editing ? editing.data : PERFIL_NUEVO;
    const opt = (list, val, fmt) => list.map(x => `<option value="${esc(fmt ? fmt(x).v : x.id)}" ${(fmt ? fmt(x).v : x.id) === val ? 'selected' : ''}>${esc(fmt ? fmt(x).l : x.label)}</option>`).join('');
    const divisions = Object.values(K.DIVISIONS);
    // DEC-009: estructura por defecto si el perfil todavía no tiene datos de salud.
    const h = Object.assign({ screening: {}, diabetes: { type: 'none' }, injuries: [] }, d.health || {});
    h.screening = h.screening || {};
    const injuriesByZone = {};
    (h.injuries || []).forEach(inj => { injuriesByZone[inj.zone] = inj; });
    const hasHealthData = !!(h.screening.regularExercise || h.screening.cvMetabolicRenal || h.screening.symptoms || h.screening.medicalClearance || h.diabetes.type !== 'none' || h.diabetes.medication || (h.injuries || []).length);
    return `
      <form id="form" novalidate>
        <div class="card accent">
          <h2>${editing ? 'Editar datos' : 'Nuevo perfil'}</h2>
          <p class="muted">Cuantos más datos reales aportes, más preciso será el plan. Los campos con * son obligatorios.</p>
        </div>
        <fieldset>
          <legend>Persona</legend>
          <label>Nombre del perfil *</label>
          <input name="name" value="${esc(d.name || '')}" placeholder="Ej. Óscar · Prep 2027" required>
          <div class="row3">
            <div><label>Sexo *</label><select name="sex" id="sex"><option value="M" ${d.sex === 'M' ? 'selected' : ''}>Hombre</option><option value="F" ${d.sex === 'F' ? 'selected' : ''}>Mujer</option></select></div>
            <div><label>Edad *</label><input name="age" type="number" inputmode="numeric" min="14" max="90" value="${esc(d.age || '')}"></div>
            <div><label>Estatura (cm) *</label><input name="heightCm" type="number" inputmode="decimal" step="0.5" value="${esc(d.heightCm || '')}"></div>
          </div>
          <div class="row2">
            <div><label>Peso (kg) *</label><input name="weightKg" type="number" inputmode="decimal" step="0.1" value="${esc(d.weightKg || '')}"></div>
            <div><label>% grasa medido (si lo sabes)</label><input name="bodyFatPct" type="number" inputmode="decimal" step="0.1" value="${esc(d.bodyFatPct || '')}" placeholder="DXA, plicometría…"></div>
          </div>
          <p class="help">Si no tienes % de grasa medido, rellena las circunferencias y se estimará con el método de la US Navy (±3-4 %).</p>
          <div class="row3">
            <div><label>Cuello (cm)</label><input name="neckCm" type="number" inputmode="decimal" step="0.5" value="${esc(d.neckCm || '')}"></div>
            <div><label>Cintura (cm)</label><input name="waistCm" type="number" inputmode="decimal" step="0.5" value="${esc(d.waistCm || '')}"></div>
            <div><label>Cadera (cm)</label><input name="hipCm" type="number" inputmode="decimal" step="0.5" value="${esc(d.hipCm || '')}" placeholder="mujeres"></div>
          </div>
          <p class="help">Cintura: a la altura del ombligo (hombres) o en el punto más estrecho (mujeres). Cuello: justo bajo la laringe. Cadera: en el punto más ancho.</p>
        </fieldset>
        <fieldset>
          <legend>Actividad y experiencia</legend>
          <label>Actividad diaria *</label>
          <select name="activity">${opt(K.ACTIVITY, d.activity)}</select>
          <label>Experiencia en entrenamiento de fuerza *</label>
          <select name="level">
            <option value="novice" ${d.level === 'novice' ? 'selected' : ''}>Principiante (&lt; 1 año seguido)</option>
            <option value="intermediate" ${d.level === 'intermediate' ? 'selected' : ''}>Intermedio (1-4 años)</option>
            <option value="advanced" ${d.level === 'advanced' ? 'selected' : ''}>Avanzado (&gt; 4 años o competidor)</option>
          </select>
          <label>Días de entrenamiento por semana *</label>
          <select name="daysPerWeek">${[3, 4, 5, 6].map(n => `<option value="${n}" ${Number(d.daysPerWeek) === n ? 'selected' : ''}>${n} días</option>`).join('')}</select>
          <label>Grupos musculares rezagados (opcional)</label>
          <p class="help">Reciben un 25 % más de series que el resto, por encima incluso del recorte que les tocaría por tu división.</p>
          <div class="row3">${Object.entries(K.MUSCLE_LABELS).map(([id, label]) => `<label style="display:flex;align-items:center;gap:.4rem;margin:.2rem 0;font-size:.85rem;color:var(--tiza)"><input type="checkbox" name="laggingMuscles" value="${id}" style="width:auto" ${(d.laggingMuscles || []).includes(id) ? 'checked' : ''}> ${esc(label)}</label>`).join('')}</div>
        </fieldset>
        <fieldset>
          <legend>Tiempo y ejercicios prioritarios</legend>
          <label for="tiempoDisponibleMin">Tiempo disponible por sesión (min)</label>
          <input id="tiempoDisponibleMin" name="tiempoDisponibleMin" type="number" inputmode="numeric" min="1" step="5" value="${esc(d.tiempoDisponibleMin || '')}" placeholder="${REGISTRO.valor('TIEMPO_DISPONIBLE_POR_DEFECTO_MIN')}">
          <p class="help">Es la capacidad de cada sesión: el plan reparte las series para que entren en este tiempo. Vacío usa ${REGISTRO.valor('TIEMPO_DISPONIBLE_POR_DEFECTO_MIN')} min.</p>
          <details class="card"><summary>Cambiarlo en algunos días</summary>
            <div class="row3" id="tiempo-por-dia">${[0, 1, 2, 3, 4, 5].map(i => `<div data-dia="${i}" ${i < (Number(d.daysPerWeek) || 4) ? '' : 'hidden'}><label for="tiempoDia_${i}">Día ${i + 1} (min)</label><input id="tiempoDia_${i}" name="tiempoDia_${i}" type="number" inputmode="numeric" min="1" step="5" value="${esc((d.tiempoPorDia || {})[i] || '')}" placeholder="general"></div>`).join('')}</div>
          </details>
          <label>Ejercicios prioritarios (hasta ${REGISTRO.valor('MAX_EJERCICIOS_PRIORITARIOS')}, opcional)</label>
          <p class="help">Entran fijos en los días cuyo tipo de sesión incluye su patrón, antes de repartir el resto. Si una lesión declarada lo contraindica, la seguridad gana y el plan te avisa.</p>
          <div class="row3">${Array.from({ length: REGISTRO.valor('MAX_EJERCICIOS_PRIORITARIOS') }, (_, i) => `<select name="prioritarios" aria-label="Ejercicio prioritario ${i + 1}"><option value="">—</option>${opcionesPrioritarios((d.prioritarios || [])[i])}</select>`).join('')}</div>
        </fieldset>
        <fieldset>
          <legend>Objetivo</legend>
          <label>División IFBB Pro League *</label>
          <select name="division" id="division">${opt(divisions.filter(x => x.sex === d.sex), d.division)}</select>
          <p class="help" id="division-help"></p>
          <label>Fase *</label>
          <select name="goal">
            <option value="cut" ${d.goal === 'cut' ? 'selected' : ''}>Definición / preparación (perder grasa)</option>
            <option value="bulk" ${d.goal === 'bulk' ? 'selected' : ''}>Volumen / off-season (ganar músculo)</option>
            <option value="maintain" ${d.goal === 'maintain' ? 'selected' : ''}>Mantenimiento / recomposición</option>
          </select>
          <div class="row2">
            <div><label>Fecha objetivo (opcional)</label><input name="targetDate" type="date" value="${esc(d.targetDate || '')}"></div>
            <div><label>% grasa objetivo (opcional)</label><input name="targetBf" type="number" inputmode="decimal" step="0.5" value="${esc(d.targetBf || '')}" placeholder="auto según división"></div>
          </div>
          <div id="classic-wrap" ${d.division === 'classic_m' ? '' : 'hidden'}>
            <label>Límite oficial Classic Physique para tu estatura (lb, opcional)</label>
            <input name="classicLimitLb" type="number" inputmode="numeric" value="${esc(d.classicLimitLb || '')}" placeholder="Deja vacío para usar la tabla orientativa">
            <p class="help">La tabla incluida es la de agosto de 2023 y no pudo verificarse contra el reglamento vigente. Si conoces el límite actual, escríbelo aquí.</p>
          </div>
          <label style="display:flex;align-items:center;gap:.5rem;margin-top:1rem"><input type="checkbox" name="healthGoal" style="width:auto" ${d.healthGoal ? 'checked' : ''}> Priorizar salud/funcional sobre estética</label>
          <p class="help">En definición, mantiene el cardio en 150 min/semana (3 sesiones de 50 min) en vez de recortarlo, y suma sentadilla búlgara, step-up con carga y paseo del granjero en los días que entrenan cuádriceps.</p>
          <label style="display:flex;align-items:center;gap:.5rem;margin-top:1rem"><input type="checkbox" name="barbellRow" style="width:auto" ${d.barbellRow ? 'checked' : ''}> Incluir remo con barra</label>
          <p class="help">Por defecto el remo del plan es con apoyo de pecho, que carga menos la espalda baja. No hay estudios que muestren más hipertrofia de espalda con el remo con barra. Si lo incluyes, el plan puede avisarte cuando junte dos ejercicios de mucha demanda lumbar en un día.</p>
        </fieldset>
        <fieldset>
          <legend>Barra cargada</legend>
          <p class="help">Para que el modo sesión te muestre qué discos poner en cada lado, en los ejercicios de barra (sentadilla, press banca, press militar, peso muerto rumano, remo con barra, hip thrust).</p>
          <div class="row2">
            <div><label>Unidad</label><select name="plateUnit" id="plateUnit"><option value="kg" ${(d.plateUnit || 'kg') === 'kg' ? 'selected' : ''}>Kilogramos</option><option value="lb" ${d.plateUnit === 'lb' ? 'selected' : ''}>Libras</option></select></div>
            <div><label>Peso de la barra</label><input name="barWeight" id="barWeight" type="number" inputmode="decimal" step="0.5" value="${esc(d.barWeight || '')}" placeholder="${(d.plateUnit || 'kg') === 'lb' ? '45' : '20'}"></div>
          </div>
          <label>Discos disponibles</label>
          <div class="row3" id="plates-wrap">${platesCheckboxes(d.plateUnit || 'kg', d.availablePlates)}</div>
        </fieldset>
        <fieldset>
          <legend>Salud</legend>
          <p class="help">La app NO reemplaza a un médico, fisioterapeuta ni entrenador certificado. El tamizaje y los avisos de diabetes aplican posicionamientos oficiales. Para lesiones la app no adapta la rutina: te pide la autorización de un profesional y solo evita, como precaución (E4), algunos ejercicios de la zona. Una condición sin regla cargada queda registrada y no cambia nada.</p>
          <label style="display:flex;align-items:center;gap:.5rem"><input type="checkbox" name="healthRegularExercise" style="width:auto" ${h.screening.regularExercise ? 'checked' : ''}> Hago ejercicio planificado ≥30 min, 3 días/semana, desde hace al menos 3 meses</label>
          <label style="display:flex;align-items:center;gap:.5rem"><input type="checkbox" name="healthCvMetabolicRenal" style="width:auto" ${h.screening.cvMetabolicRenal ? 'checked' : ''}> Tengo diagnóstico de enfermedad cardiovascular, metabólica (diabetes) o renal</label>
          <label style="display:flex;align-items:center;gap:.5rem"><input type="checkbox" name="healthSymptoms" style="width:auto" ${h.screening.symptoms ? 'checked' : ''}> Tengo dolor/molestia en el pecho, falta de aire en reposo o con poco esfuerzo, mareo o desmayo, palpitaciones, hinchazón de tobillos, dolor en las piernas al caminar, soplo cardíaco conocido o fatiga inusual</label>
          <label style="display:flex;align-items:center;gap:.5rem;margin-top:.3rem"><input type="checkbox" name="healthMedicalClearance" style="width:auto" ${h.screening.medicalClearance ? 'checked' : ''}> Tengo autorización médica para entrenar a intensidad vigorosa (vigente, últimos 12 meses)</label>
          <p class="help">Si marcaste síntomas, o la condición cardiovascular/metabólica/renal sin entrenar de forma regular, el plan queda oculto hasta marcar esta autorización.</p>

          <label style="margin-top:.8rem">Diabetes</label>
          <select name="diabetesType">
            <option value="none" ${h.diabetes.type === 'none' ? 'selected' : ''}>Ninguna</option>
            <option value="type1" ${h.diabetes.type === 'type1' ? 'selected' : ''}>Tipo 1</option>
            <option value="type2" ${h.diabetes.type === 'type2' ? 'selected' : ''}>Tipo 2</option>
          </select>
          <label style="display:flex;align-items:center;gap:.5rem;margin-top:.4rem"><input type="checkbox" name="healthDiabetesMed" style="width:auto" ${h.diabetes.medication ? 'checked' : ''}> Uso insulina u otro fármaco que baja la glucosa</label>

          <label style="margin-top:.8rem">Lesiones (marcá la zona si tenés una)</label>
          <div id="injury-zones">${K.INJURY_ZONES.map(z => injuryZoneRow(z, K.INJURY_LABELS[z], injuriesByZone[z])).join('')}</div>
          <p class="help">Con cualquier zona marcada, el plan queda en pausa hasta que confirmes que un profesional te autorizó a entrenar con esa lesión (se pide una vez por zona y se vuelve a pedir si agregás otra, si el dolor de una zona aumenta o si cambia su diagnóstico). Como precaución (E4) se evitan algunos ejercicios de la zona: no es una adaptación a tu lesión. En Modo sesión podés registrar el dolor de cada serie que la involucre.</p>

          ${hasHealthData ? '<div class="btn-row"><button type="button" class="btn btn-danger" id="btn-clear-health">Borrar datos de salud</button></div>' : ''}
        </fieldset>
        <div id="form-errors" role="alert"></div>
        <div class="btn-row">
          <button type="submit" class="btn btn-primary btn-block">Guardar y generar plan</button>
        </div>
        <div class="btn-row"><button type="button" class="btn btn-ghost btn-block" id="btn-cancel">Cancelar</button></div>
      </form>`;
  }

  /* ---------- Lectura de los campos ---------- */
  const CAMPOS_LISTA = ['laggingMuscles', 'availablePlates', 'injuryZones', 'injuryDiagnosed', 'injuryPainNow', 'prioritarios'];
  const num = v => { const x = parseFloat(v); return x > 0 ? x : null; };

  // `campos`: los valores del formulario como objeto plano (las casillas y selects repetidos como listas). Devuelve { errores, datos }:
  // `datos` es lo que se guarda en el perfil (lo que normaliza el motor más los campos nuevos), `previo` son los datos anteriores del
  // perfil que se edita (para conservar las autorizaciones profesionales por zona, DEC-011).
  function leerPerfil(campos, previo) {
    const data = Object.assign({}, campos);
    CAMPOS_LISTA.forEach(k => { data[k] = [].concat(campos[k] || []); });
    const errores = ENGINE.validateProfile(data);
    const tiempo = num(campos.tiempoDisponibleMin);
    if (campos.tiempoDisponibleMin && !tiempo) errores.push('El tiempo disponible por sesión debe ser un número de minutos mayor que cero.');
    const porDia = {};
    for (let i = 0; i < 6; i++) {
      const raw = campos['tiempoDia_' + i];
      if (raw && !num(raw)) errores.push(`El tiempo del día ${i + 1} debe ser un número de minutos mayor que cero.`);
      if (num(raw) && i < (Number(data.daysPerWeek) || 4)) porDia[i] = num(raw);
    }
    const posibles = new Set(prioritariasPosibles().map(v => v.id));
    const prioritarios = [...new Set(data.prioritarios.filter(id => id && posibles.has(id)))].slice(0, REGISTRO.valor('MAX_EJERCICIOS_PRIORITARIOS'));
    if (errores.length) return { errores, datos: null };
    const norm = ENGINE.normalizeProfile(data);
    norm.health = ENGINE.reconcileInjuryClearances(previo && previo.health, norm.health); // DEC-011
    delete norm.longSessionAcceptedOn; delete norm.longSessionAcceptance; // DEC-016: la aceptación vive en el plan guardado
    if (tiempo) norm.tiempoDisponibleMin = tiempo;
    if (Object.keys(porDia).length) norm.tiempoPorDia = porDia;
    norm.prioritarios = prioritarios;
    return { errores: [], datos: norm };
  }

  return { htmlPerfil, leerPerfil, prioritariasPosibles, platesCheckboxes, injuryZoneRow, CAMPOS_LISTA };
});
