/* Núcleo del generador · núcleo v2 (B-039, DEC-023). Conectado a la app en el corte (docs/specs/nucleo-v2.md, "El corte").
 *
 * Reparto de un solo paso (docs/specs/nucleo-v2.md, "Algoritmo de reparto"). Ningún paso posterior corrige a uno
 * anterior. Orden: 1 capacidad en minutos (DEC-024) · 2 seguridad · 3 estructura (patrones obligatorios y
 * prioritarios) · 4 necesidad semanal y demandas mínimas · 5 relleno por cobertura marginal con R1 como
 * restricción (DEC-025) · 6 orden (A1) y top set · 7 aviso único.
 *
 * Todo número sale del registro (registro.js). Las tablas de estructura de abajo (tipos de sesión, splits) no son
 * números sino criterio de diseño E4 de la spec y de las decisiones de Emanuel (2026-11-07 y 2026-11-08). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./registro.js'), require('./catalogo.js'));
  else root.CORE_V2_REPARTO = factory(root.CORE_V2_REGISTRO, root.CORE_V2_CATALOGO);
})(typeof self !== 'undefined' ? self : this, function (REGISTRO, CATALOGO) {
  'use strict';

  const valor = id => REGISTRO.valor(id);
  const EPS = 1e-9;
  const MUSCULOS = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'calves', 'biceps', 'triceps', 'abs'];
  const GRUPOS_MAYORES = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes'];
  const GRUPOS_CHICOS = ['biceps', 'triceps', 'calves', 'abs'];

  /* ---------- Tipos de sesión y splits (spec: "Tipos de sesión") ---------- */
  // `grupos`: grupos que pueden entrar en el relleno (compatibilidad de grupos chicos, T6: abdomen y pantorrillas en
  // cualquier día; bíceps con tirón, torso y cuerpo completo; tríceps con empuje, torso y cuerpo completo).
  const G_PIERNA = ['quads', 'hamstrings', 'glutes', 'calves', 'abs'];
  const T = {
    empuje: { etiqueta: 'Empuje', obligatorios: ['empuje_horizontal', 'empuje_vertical'], principal: 'empuje_horizontal', grupos: ['chest', 'shoulders', 'triceps', 'abs', 'calves'], excluidos: [] },
    tiron: { etiqueta: 'Tirón', obligatorios: ['tiron_vertical', 'tiron_horizontal'], principal: 'tiron_vertical', grupos: ['back', 'shoulders', 'biceps', 'abs', 'calves'], excluidos: [] },
    piernaSentadilla: { etiqueta: 'Pierna (sentadilla)', obligatorios: ['sentadilla', 'flexion_rodilla'], principal: 'sentadilla', grupos: G_PIERNA, excluidos: ['bisagra'] },
    piernaBisagra: { etiqueta: 'Pierna (bisagra)', obligatorios: ['bisagra', 'flexion_rodilla'], principal: 'bisagra', grupos: G_PIERNA, excluidos: ['sentadilla'] },
    // Torso: un empuje y un tirón; el top set alterna (E4): el primer torso de la semana, empuje horizontal; el segundo, tirón vertical.
    torsoA: { etiqueta: 'Torso', obligatorios: ['empuje_horizontal', 'tiron_horizontal'], principal: 'empuje_horizontal', grupos: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'abs', 'calves'], excluidos: [] },
    torsoB: { etiqueta: 'Torso', obligatorios: ['empuje_vertical', 'tiron_vertical'], principal: 'tiron_vertical', grupos: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'abs', 'calves'], excluidos: [] },
    // Cuerpo completo ×3: sentadilla el día 1, pierna sin lumbar alta (prensa) el día 2 y bisagra el día 3; el top set rota
    // sentadilla, empuje horizontal, bisagra.
    cc1: { etiqueta: 'Cuerpo completo', obligatorios: ['sentadilla', 'empuje_horizontal', 'tiron_vertical'], principal: 'sentadilla', grupos: MUSCULOS, excluidos: ['bisagra'] },
    cc2: { etiqueta: 'Cuerpo completo', obligatorios: ['prensa', 'empuje_horizontal', 'tiron_horizontal'], principal: 'empuje_horizontal', grupos: MUSCULOS, excluidos: ['bisagra', 'sentadilla'] },
    cc3: { etiqueta: 'Cuerpo completo', obligatorios: ['bisagra', 'empuje_vertical', 'tiron_vertical'], principal: 'bisagra', grupos: MUSCULOS, excluidos: ['sentadilla'] },
  };
  // Splits por defecto (spec). Los nombres incluyen la variante del día y son distintos en cada split (el indicador
  // "Siguiente", DEC-027, reconoce el cambio de split por el nombre del día).
  const SPLITS = {
    3: [['Día 1 · Cuerpo completo A (sentadilla)', 'cc1'], ['Día 2 · Cuerpo completo B (empuje)', 'cc2'], ['Día 3 · Cuerpo completo C (bisagra)', 'cc3']],
    4: [['Día 1 · Torso A', 'torsoA'], ['Día 2 · Pierna A (sentadilla)', 'piernaSentadilla'], ['Día 3 · Torso B', 'torsoB'], ['Día 4 · Pierna B (bisagra)', 'piernaBisagra']],
    5: [['Día 1 · Torso', 'torsoA'], ['Día 2 · Pierna (sentadilla)', 'piernaSentadilla'], ['Día 3 · Empuje', 'empuje'], ['Día 4 · Tirón', 'tiron'], ['Día 5 · Pierna (bisagra)', 'piernaBisagra']],
    6: [['Día 1 · Empuje A', 'empuje'], ['Día 2 · Tirón A', 'tiron'], ['Día 3 · Pierna (sentadilla) A', 'piernaSentadilla'], ['Día 4 · Empuje B', 'empuje'], ['Día 5 · Tirón B', 'tiron'], ['Día 6 · Pierna (bisagra) B', 'piernaBisagra']],
  };

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  /* ---------- Perfil ---------- */
  function normalizarPerfil(src) {
    const s = src || {};
    const dias = clamp(Math.round(parseFloat(s.daysPerWeek)) || valor('DIAS_POR_SEMANA_POR_DEFECTO'), valor('DIAS_POR_SEMANA')[0], valor('DIAS_POR_SEMANA')[1]);
    const zonas = Array.isArray(s.injuryZones) ? s.injuryZones : ((s.health && s.health.injuries) || []).map(i => i.zone);
    const lag = Array.isArray(s.laggingMuscles) ? s.laggingMuscles : (s.laggingMuscles ? [s.laggingMuscles] : []);
    const minutos = Array.isArray(s.tiempoDisponibleMin) ? s.tiempoDisponibleMin : null;
    const general = parseFloat(minutos ? minutos[0] : s.tiempoDisponibleMin) > 0 ? parseFloat(minutos ? minutos[0] : s.tiempoDisponibleMin) : valor('TIEMPO_DISPONIBLE_POR_DEFECTO_MIN');
    return {
      dias,
      level: ['novice', 'intermediate', 'advanced'].includes(s.level) ? s.level : 'intermediate',
      goal: ['cut', 'bulk', 'maintain'].includes(s.goal) ? s.goal : 'cut',
      division: valor('ENFASIS_POR_DIVISION')[s.division] ? s.division : 'general_m',
      laggingMuscles: [...new Set(lag.filter(m => MUSCULOS.includes(m)))],
      zonas, healthGoal: !!s.healthGoal, barbellRow: !!s.barbellRow,
      minutosPorDia: Array.from({ length: dias }, (_, i) => (minutos && parseFloat(minutos[i]) > 0 ? parseFloat(minutos[i]) : general)),
      prioritarios: (Array.isArray(s.prioritarios) ? s.prioritarios : []).slice(0, valor('MAX_EJERCICIOS_PRIORITARIOS')),
    };
  }

  /* ---------- Paso 4 · necesidad semanal y demandas mínimas ---------- */
  // La necesidad se mide en series fraccionadas por semana. Los modificadores (definición, énfasis, rezagados) se
  // aplican UNA sola vez, acá, y nunca como pesos dentro de la cobertura marginal.
  function demandas(perfil) {
    const base = valor('NECESIDAD_SEMANAL_POR_NIVEL')[perfil.level];
    const defin = perfil.goal === 'cut' ? valor('FACTOR_NECESIDAD_DEFINICION') : 1;
    const enf = valor('ENFASIS_POR_DIVISION')[perfil.division];
    const out = {};
    MUSCULOS.forEach(m => {
      const lag = perfil.laggingMuscles.includes(m);
      let n;
      if (lag) n = Math.min(valor('REZAGADOS_TOPE_SERIES'), Math.round(base * defin * valor('FACTOR_NECESIDAD_ENFASIS'))); // DEC-001: el rezagado anula el énfasis de la división
      else {
        let x = base * defin;
        if (GRUPOS_CHICOS.includes(m)) x *= valor('FACTOR_NECESIDAD_GRUPO_CHICO');
        if (enf.up.includes(m)) x *= valor('FACTOR_NECESIDAD_ENFASIS');
        if (enf.down.includes(m)) x *= valor('FACTOR_NECESIDAD_ENFASIS_REDUCIDO');
        n = Math.round(x);
      }
      // Piso: 10 en los grupos mayores (5 si la división los reduce y no son rezagados, DEC-017); mínimo de grupo chico (DEC-020).
      let piso;
      if (GRUPOS_MAYORES.includes(m)) piso = enf.down.includes(m) && !lag ? valor('PISO_SEMANAL_GRUPO') * valor('FACTOR_PISO_MANTENIMIENTO') : valor('PISO_SEMANAL_GRUPO');
      else piso = valor('MINIMO_SEMANAL_GRUPO_CHICO');
      out[m] = { necesidad: n, piso, objetivo: Math.max(n, piso), rezagado: lag };
    });
    return out;
  }

  /* ---------- Conteo fraccionado (DEC-014) ---------- */
  // Cuánto suma UNA serie de la variante a cada músculo: directa 1, indirecta 0,5, ninguna o a_verificar 0. El grupo
  // donde se programa cuenta siempre como directo (DEC-016). Convención global, nunca por ejercicio.
  function pesosDe(cat, id) {
    const w = {};
    cat.aportesDe(id).forEach(r => {
      if (r.evidencia === 'a_verificar') return;
      const x = r.relacion === 'directa' ? valor('PESO_SERIE_DIRECTA') : r.relacion === 'indirecta' ? valor('PESO_SERIE_INDIRECTA') : valor('PESO_SIN_RELACION');
      if (x > 0) w[r.muscle] = x;
    });
    const g = cat.grupoDe(id);
    if (g && !cat.variantePorId(id).sinAporte) w[g] = valor('PESO_SERIE_DIRECTA');
    return w;
  }

  /* Orden de decisión del relleno (DEC-037 punto 5, DEC-039): compara dos claves { evidencia, redundancia, tiempo, lumbar }. Negativo si `x` es mejor
   * que `y`; 0 si empatan en los cuatro criterios. Evidencia y lumbar: índice menor es mejor; redundancia: mayor cobertura por segundo es mejor; tiempo: menor. */
  const compararDecision = (x, y) => (x.evidencia - y.evidencia)
    || (Math.abs(x.redundancia - y.redundancia) > EPS ? y.redundancia - x.redundancia : 0)
    || (Math.abs(x.tiempo - y.tiempo) > EPS ? x.tiempo - y.tiempo : 0)
    || (x.lumbar - y.lumbar);

  /* ---------- Plan ---------- */
  function generarPlan(src, opciones) {
    const cat = (opciones && opciones.catalogo) || CATALOGO;
    const perfil = normalizarPerfil(src);
    const dem = demandas(perfil);
    const pesos = {};
    cat.VARIANTES.forEach(v => { pesos[v.id] = pesosDe(cat, v.id); });
    const lumbarAlta = id => (cat.perfilArticularDe(id).lumbar || {}).nivel === 'alta';
    // A2 (DEC-022): una sola variante de lumbar alta por sesión. Es restricción por defecto; si el usuario eligió el remo con barra, esa variante puede
    // sumarse a otra de lumbar alta y el plan lo avisa (aviso, no restricción).
    const bloqueaA2 = (ses, v) => lumbarAlta(v.id) && ses.nLumbarAlta >= valor('MAX_LUMBAR_ALTA_POR_SESION') && v.habilitaPor !== 'remoConBarra';
    // Tope de lumbar media por sesión (DEC-040): en series, no en ejercicios. `seriesLumbarMedia` cuenta las series de la sesión de variantes de lumbar `media`.
    const TOPE_LUMBAR_MEDIA = valor('MAX_SERIES_LUMBAR_MEDIA_POR_SESION');
    const lumbarMedia = id => (cat.perfilArticularDe(id).lumbar || {}).nivel === 'media';
    const seriesLumbarMedia = ses => ses.ejercicios.reduce((a, e) => a + (lumbarMedia(e.v.id) ? e.series : 0), 0);
    const pasaLumbarMedia = (ses, v, series) => lumbarMedia(v.id) && seriesLumbarMedia(ses) + series > TOPE_LUMBAR_MEDIA;

    // Paso 2 · seguridad y variantes habilitadas por el perfil.
    const elegible = v => {
      if (v.habilitaPor === 'remoConBarra' && !perfil.barbellRow) return false;
      if (v.habilitaPor === 'healthGoal' && !perfil.healthGoal) return false;
      if (v.soloSinRemoConBarra && perfil.barbellRow) return false;
      if (v.soloConLesion && !perfil.zonas.includes(v.soloConLesion)) return false;
      if (cat.excluidaPorLesion(v.id, perfil.zonas)) return false;
      return true;
    };
    // El funcional "paseo del granjero" se agrega aparte y no cuenta como volumen (DEC-005): queda fuera del reparto.
    const candidatas = cat.VARIANTES.filter(v => elegible(v) && !v.sinAporte);

    const split = SPLITS[perfil.dias];
    const sesiones = split.map(([nombre, clave], i) => {
      const spec = T[clave];
      return { indice: i, nombre, clave, spec, capacidadSeg: perfil.minutosPorDia[i] * 60, seg: 0, frac: {}, ejercicios: [], patrones: new Set(), nLumbarAlta: 0, hayTopSet: false };
    });
    const uso = {}; // veces que se usó cada variante en la semana (variedad entre días)
    const diasGrupo = {}; // sesiones de la semana donde aparece cada grupo chico
    const cubierto = {}, directas = {};
    MUSCULOS.forEach(m => { cubierto[m] = 0; directas[m] = 0; diasGrupo[m] = new Set(); });
    const avisos = { obligatoriosSinLugar: [], seguridad: [], prioritariosSinLugar: [], a2: [], r1Excedido: [], principalReducido: [], sinDirecto: [], funcionalesSinLugar: [] };

    // A3 (DEC-022): sentadilla y bisagra pesadas en días distintos; el tipo de sesión excluye el patrón contrario.
    const excluyeA3 = (ses, patron) => valor('SEPARACION_SENTADILLA_BISAGRA') && ses.spec.excluidos.includes(patron);
    const lados = v => (v.unilateral ? valor('FACTOR_UNILATERAL') : 1);
    const descanso = v => (v.tipo === 'multiarticular' ? valor('DESCANSO_MULTIARTICULAR_S') : valor('DESCANSO_AISLAMIENTO_S'));
    const segSerie = v => cat.segundosPorSerie(v.id);
    // El top set solo existe en definición (DEC-002): su primera serie descansa más que una serie normal.
    const extraTopSet = v => lados(v) * (valor('DESCANSO_TOP_SET_S') - valor('DESCANSO_BACKOFF_S'));

    function agregar(ses, v, series, topSet) {
      const ex = { v, series, topSet: !!topSet, pesos: pesos[v.id] };
      ses.ejercicios.push(ex);
      ses.patrones.add(v.patron);
      ses.seg += series * segSerie(v) + (topSet ? extraTopSet(v) : 0);
      if (topSet) ses.hayTopSet = true;
      if (lumbarAlta(v.id)) {
        ses.nLumbarAlta++;
        if (ses.nLumbarAlta > valor('MAX_LUMBAR_ALTA_POR_SESION')) avisos.a2.push({ sesion: ses.nombre, motivo: 'dos variantes de lumbar alta: el remo con barra elegido se suma a otra' });
      }
      sumar(ses, ex, series);
      uso[v.id] = (uso[v.id] || 0) + 1;
      const g = cat.grupoDe(v.id);
      directas[g] = (directas[g] || 0) + series;
      if (GRUPOS_CHICOS.includes(g)) diasGrupo[g].add(ses.indice);
      return ex;
    }
    function sumar(ses, ex, series) {
      Object.keys(ex.pesos).forEach(m => {
        ses.frac[m] = (ses.frac[m] || 0) + ex.pesos[m] * series;
        cubierto[m] += ex.pesos[m] * series;
      });
    }

    const R1 = valor('MAX_SERIES_FRACCIONADAS_MUSCULO_SESION');
    const faltaDe = m => Math.max(0, dem[m].objetivo - cubierto[m]);
    // Garantía de series reales de los grupos mayores (DEC-014): además del piso en fraccionadas, el piso en series DIRECTAS.
    const faltaRealDe = m => (GRUPOS_MAYORES.includes(m) ? Math.max(0, dem[m].piso - directas[m]) : 0);
    // Una demanda mínima sin cubrir (piso en fraccionadas o en series reales) gana sobre R1 (DEC-025, punto 4).
    const minimoSinCubrir = m => cubierto[m] < dem[m].piso - EPS || faltaRealDe(m) > EPS;

    // Paso 3 · estructura: patrones obligatorios del tipo y ejercicios prioritarios del usuario.
    const prior = perfil.prioritarios.map(id => cat.variantePorId(id)).filter(Boolean);
    prior.forEach(p => { if (!sesiones.some(s => s.spec.obligatorios.includes(p.patron))) avisos.prioritariosSinLugar.push(p.id); });
    prior.filter(p => !elegible(p)).forEach(p => avisos.seguridad.push({ varianteId: p.id, motivo: 'lesión declarada o variante no habilitada: la seguridad gana sobre la preferencia' }));
    sesiones.forEach(ses => {
      ses.spec.obligatorios.forEach(patron => {
        const conTopSet = (!valor('TOP_SET_SOLO_EN_DEFINICION') || perfil.goal === 'cut') && ses.spec.principal === patron; // DEC-008: el top set solo va a variantes elegibles
        const todas = candidatas.filter(v => v.patron === patron && !excluyeA3(ses, v.patron) && !bloqueaA2(ses, v));
        // Un prioritario garantiza su lugar: gana sobre la elegibilidad del top set (la sesión queda sin top set si no es elegible).
        const elegidaPrior = prior.find(p => p.patron === patron && todas.includes(p));
        const ops = conTopSet && todas.some(v => v.topSetElegible && !v.sinTopSet) ? todas.filter(v => v.topSetElegible && !v.sinTopSet) : todas;
        const v = elegidaPrior || ops.slice().sort((a, b) => (uso[a.id] || 0) - (uso[b.id] || 0) || (b.preferida ? 1 : 0) - (a.preferida ? 1 : 0))[0];
        if (!v) { avisos.obligatoriosSinLugar.push({ sesion: ses.nombre, patron, motivo: 'sin variante disponible (seguridad o casillas del perfil)' }); return; }
        const topSet = conTopSet && !ses.hayTopSet && v.topSetElegible && !v.sinTopSet;
        // El patrón principal recibe su volumen en la estructura (DEC-029): el top set más sus back-offs. Si no cabe, baja de a una serie
        // (hasta el mínimo de cualquier ejercicio) y el aviso lo dice.
        const principal = ses.spec.principal === patron;
        const deseadas = principal ? valor('SERIES_MIN_PATRON_PRINCIPAL') : valor('SERIES_MIN_POR_EJERCICIO');
        let series = deseadas;
        const costoDe = n => n * segSerie(v) + (topSet ? extraTopSet(v) : 0);
        while (series > valor('SERIES_MIN_POR_EJERCICIO') && ses.seg + costoDe(series) > ses.capacidadSeg + EPS) series--;
        if (ses.seg + costoDe(series) > ses.capacidadSeg + EPS) { avisos.obligatoriosSinLugar.push({ sesion: ses.nombre, patron, motivo: 'no cabe en el tiempo de la sesión' }); return; }
        if (series < deseadas) avisos.principalReducido.push({ sesion: ses.nombre, patron, series, deseadas });
        agregar(ses, v, series, topSet);
      });
    });

    // Paso 3 (estructura) · con la bandera salud/funcional, un ejercicio funcional entra FIJO en cada día que entrena cuádriceps (DEC-005, DEC-035),
    // con el mismo mecanismo de los prioritarios pero sin ocupar sus lugares: búlgara y step-up rotan y el paseo del granjero va el último día de la
    // semana. Búlgara y step-up cuentan como volumen (cuádriceps y glúteo, como cualquier ejercicio); el paseo no aporta a ningún grupo (DEC-010):
    // 2 series aparte que solo gastan tiempo. Si no caben en el tiempo del día no entran y el aviso lo dice (el tope por sesión R1 no se comprueba: 2 series de búlgara o step-up no lo alcanzan en ninguno de los 3456 planes del barrido, y la estructura va antes del relleno).
    if (perfil.healthGoal) {
      const diasCuadriceps = sesiones.filter(ses => ses.spec.grupos.includes('quads'));
      const rotan = ['functional.bulgarian_db', 'functional.step_up'].map(id => cat.variantePorId(id)).filter(v => v && elegible(v));
      const paseo = cat.variantePorId('functional.farmer_carry');
      diasCuadriceps.forEach((ses, k) => {
        const ultimo = k === diasCuadriceps.length - 1;
        const v = ultimo && paseo && elegible(paseo) ? paseo : (rotan.length ? rotan[k % rotan.length] : null);
        if (!v) return;
        const sinVolumen = !!v.sinAporte;
        const series = sinVolumen ? valor('SERIES_EXTRA_FUNCIONAL_SIN_VOLUMEN') : valor('SERIES_MIN_POR_EJERCICIO');
        if (ses.seg + series * segSerie(v) > ses.capacidadSeg + EPS) { avisos.funcionalesSinLugar.push({ sesion: ses.nombre, varianteId: v.id, motivo: 'no cabe en el tiempo de la sesión' }); return; }
        if (sinVolumen) {
          ses.ejercicios.push({ v, series, topSet: false, pesos: pesos[v.id] });
          ses.patrones.add(v.patron);
          ses.seg += series * segSerie(v);
          uso[v.id] = (uso[v.id] || 0) + 1;
        } else agregar(ses, v, series, false);
      });
    }

    // Paso 3 (estructura) · todo grupo del perfil lleva por semana al menos un ejercicio directo con el mínimo de series (DEC-029; equivalente
    // en core-v2 de la regla de DEC-020: nunca se quita el último ejercicio directo de un grupo). Se ubica en la sesión compatible con más
    // tiempo libre y, de ser necesario, gana sobre R1 como cualquier demanda mínima.
    const minDirecto = valor('EJERCICIO_DIRECTO_SEMANAL_MIN_SERIES');
    const mayor = (x, y) => { for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
    const tieneDirecto = m => sesiones.some(ses => ses.ejercicios.some(e => cat.grupoDe(e.v.id) === m && e.series >= minDirecto));
    MUSCULOS.forEach(m => {
      if (tieneDirecto(m)) return;
      let mejorOpcion = null;
      [false, true].forEach(permitir => {
        if (mejorOpcion) return;
        sesiones.forEach(ses => {
          if (!ses.spec.grupos.includes(m)) return;
          if (GRUPOS_CHICOS.includes(m) && !diasGrupo[m].has(ses.indice) && diasGrupo[m].size >= valor('MAX_DIAS_GRUPO_CHICO')) return;
          candidatas.filter(v => cat.grupoDe(v.id) === m && !ses.patrones.has(v.patron) && !excluyeA3(ses, v.patron) && !bloqueaA2(ses, v)).forEach(v => {
            const w = pesos[v.id], seg = minDirecto * segSerie(v);
            if (pasaLumbarMedia(ses, v, minDirecto)) return; // tope de lumbar media (DEC-040)
            if (ses.seg + seg > ses.capacidadSeg + EPS) return;
            if (Object.keys(w).some(x => (ses.frac[x] || 0) + w[x] * minDirecto > R1 + EPS && !(permitir && minimoSinCubrir(x)))) return;
            const resto = ses.capacidadSeg - ses.seg - seg;
            const clave = [resto, -(uso[v.id] || 0), v.preferida ? 1 : 0, -ses.indice];
            if (!mejorOpcion || mayor(clave, mejorOpcion.clave)) mejorOpcion = { ses, v, clave, excede: Object.keys(w).filter(x => (ses.frac[x] || 0) + w[x] * minDirecto > R1 + EPS) };
          });
        });
      });
      if (mejorOpcion) {
        if (mejorOpcion.excede.length) avisos.r1Excedido.push({ sesion: mejorOpcion.ses.nombre, varianteId: mejorOpcion.v.id, musculos: mejorOpcion.excede.map(x => ({ musculo: x, cubiertoAntes: Math.round(cubierto[x] * 100) / 100, piso: dem[x].piso, directasAntes: directas[x] })), motivo: 'una demanda mínima gana sobre R1 (DEC-025)' });
        agregar(mejorOpcion.ses, mejorOpcion.v, minDirecto, false);
      }
      else avisos.sinDirecto.push({ musculo: m, motivo: 'sin sesión compatible con tiempo, seguridad o variantes disponibles' });
    });

    // Paso 5 · relleno. Orden de decisión (DEC-037 punto 5, DEC-039; criterio de diseño E4, lo revisa Emanuel):
    //   1 restricciones duras (acá: capacidad, R1, necesidad por cubrir; antes: seguridad, estructura y cuota por sub-patrón) ·
    //   2 evidencia de la relación del ejercicio con el músculo de su grupo (ORDEN_EVIDENCIA: mejor primero), entre ejercicios del MISMO grupo ·
    //   3 redundancia: la cobertura marginal, necesidad sin cubrir por segundo (o por serie, MEDIDA_REDUNDANCIA; más es menos redundante: lo que ya cubre la sesión no suma) ·
    //   4 tiempo por serie y, a igual tiempo, menor demanda lumbar del perfil de la Fase 3 (no se crea otra regla de fatiga).
    // La evidencia solo ordena candidatos ya factibles: no mueve pesos ni relaciones (regla 4 de CLAUDE.md).
    const ORDEN_EVIDENCIA = valor('ORDEN_EVIDENCIA');
    const NIVEL_LUMBAR = ['baja', 'media', 'alta'];
    const claveDecision = (v, redundancia) => ({
      evidencia: valor('EVIDENCIA_ORDENA_RELLENO') ? ORDEN_EVIDENCIA.indexOf(cat.evidenciaDe(v.id)) : 0, redundancia, tiempo: segSerie(v),
      lumbar: Math.max(0, NIVEL_LUMBAR.indexOf((cat.perfilArticularDe(v.id).lumbar || {}).nivel)),
    });
    const comparar = compararDecision;
    // Evalúa un movimiento (sumar series a un ejercicio de la sesión, o ejercicio nuevo). Devuelve { ok, util, seg, redundancia, motivo, excedeR1 }.
    // `sinNecesidad`: la cuota por sub-patrón se exige aunque la necesidad del músculo ya esté cubierta.
    function evaluar(ses, mov, permitirExceso, sinNecesidad) {
      const w = pesos[mov.v.id], seg = mov.series * segSerie(mov.v);
      if (ses.seg + seg > ses.capacidadSeg + EPS) return { ok: false, motivo: 'capacidad' };
      if (pasaLumbarMedia(ses, mov.v, mov.series)) return { ok: false, motivo: 'lumbarMedia' }; // DEC-040: restricción dura, no cede a nada
      const excedeR1 = [];
      for (const m of Object.keys(w)) {
        if ((ses.frac[m] || 0) + w[m] * mov.series > R1 + EPS) {
          if (!permitirExceso || !minimoSinCubrir(m)) return { ok: false, motivo: 'R1', musculo: m };
          excedeR1.push({ musculo: m, cubiertoAntes: Math.round(cubierto[m] * 100) / 100, piso: dem[m].piso, directasAntes: directas[m] });
        }
      }
      let util = 0;
      Object.keys(w).forEach(m => { util += Math.min(w[m] * mov.series, faltaDe(m)); });
      const g = cat.grupoDe(mov.v.id);
      util += Math.min(mov.series, faltaRealDe(g));
      if (util <= EPS && !sinNecesidad) return { ok: false, motivo: 'sin necesidad' };
      return { ok: true, util, seg, redundancia: valor('MEDIDA_REDUNDANCIA') === 'segundo' ? util / seg : util / mov.series, porSegundo: util / seg, excedeR1 };
    }
    // ¿Puede la variante entrar como ejercicio nuevo en la sesión? Patrón libre, A3, grupo compatible, A2 y días de los grupos chicos.
    function puedeEntrar(ses, v) {
      const g = cat.grupoDe(v.id);
      if (ses.patrones.has(v.patron) || excluyeA3(ses, v.patron)) return false;
      if (!ses.spec.grupos.includes(g)) return false;
      if (bloqueaA2(ses, v)) return false; // A2
      if (GRUPOS_CHICOS.includes(g) && !diasGrupo[g].has(ses.indice) && diasGrupo[g].size >= valor('MAX_DIAS_GRUPO_CHICO')) return false;
      return true;
    }
    function movimientos(ses) {
      const movs = [];
      ses.ejercicios.forEach(ex => movs.push({ ex, v: ex.v, series: 1, nuevo: false }));
      candidatas.forEach(v => {
        if (!puedeEntrar(ses, v)) return;
        movs.push({ v, series: valor('SERIES_MIN_POR_EJERCICIO'), nuevo: true });
      });
      return movs;
    }

    // Paso 4 (cuota) · si el objetivo semanal del músculo llega a UMBRAL_CUOTA_SUB_PATRON, cada sub-patrón del mapa (menos `otros`) lleva al menos un
    // ejercicio programado EN ESE GRUPO (DEC-016) con las series mínimas en la semana (DEC-037 punto 3; cómo se mide, DEC-039). Es una restricción dura:
    // entra antes del relleno, con R1 estricta y dentro de la capacidad; si no cabe, no se incumple en silencio: va al aviso único. No hay superseries.
    avisos.cuotaSinCubrir = [];
    const SIN_CUOTA = 'otros'; // clave reservada del mapa (DEC-037): aporta al músculo, pero no cuenta para ninguna cuota
    const MIN_EJERCICIO = valor('SERIES_MIN_CUOTA_SUB_PATRON');
    const mapaSubPatrones = valor('SUB_PATRONES_POR_MUSCULO');
    const subPatronCubierto = (m, patrones) => sesiones.some(ses => ses.ejercicios.some(ex => cat.grupoDe(ex.v.id) === m && patrones.includes(ex.v.patron) && ex.series >= MIN_EJERCICIO));
    MUSCULOS.forEach(m => {
      if (!mapaSubPatrones[m] || dem[m].objetivo < valor('UMBRAL_CUOTA_SUB_PATRON')) return;
      Object.keys(mapaSubPatrones[m]).forEach(sp => {
        const patrones = mapaSubPatrones[m][sp];
        if (sp === SIN_CUOTA || subPatronCubierto(m, patrones)) return;
        let mejor = null, hayVariante = false, porR1 = false, porLumbarMedia = false;
        sesiones.forEach(ses => candidatas.forEach(v => {
          if (cat.grupoDe(v.id) !== m || !patrones.includes(v.patron) || !puedeEntrar(ses, v)) return;
          hayVariante = true;
          const r = evaluar(ses, { v, series: MIN_EJERCICIO, nuevo: true }, false, true);
          if (!r.ok) { if (r.motivo === 'R1') porR1 = true; if (r.motivo === 'lumbarMedia') porLumbarMedia = true; return; }
          const clave = claveDecision(v, r.redundancia), resto = ses.capacidadSeg - ses.seg;
          const c = mejor ? comparar(clave, mejor.clave) : -1;
          if (!mejor || c < 0 || (c === 0 && resto > mejor.resto + EPS)) mejor = { ses, v, clave, resto };
        }));
        if (mejor) agregar(mejor.ses, mejor.v, MIN_EJERCICIO, false);
        else avisos.cuotaSinCubrir.push({ musculo: m, subPatron: sp, causa: !hayVariante ? 'sin ejercicios disponibles' : porR1 ? 'R1' : porLumbarMedia ? 'lumbar media' : 'tiempo' });
      });
    });

    // Primero con R1 estricta; recién cuando no queda ningún movimiento, y solo si una demanda mínima sigue sin cubrir, R1 cede para esa demanda
    // (DEC-025, punto 4). Así R1 no se pasa mientras otra sesión pueda alojar la serie.
    let permitirExceso = false;
    // Cada vuelta agrega al menos una serie, que cuesta como mínimo lo que la más corta del catálogo: eso acota las vueltas por el tiempo total disponible.
    const maxVueltas = Math.ceil(sesiones.reduce((a, s) => a + s.capacidadSeg, 0) / Math.min(...candidatas.map(segSerie))) + 1;
    for (let guarda = 0; guarda < maxVueltas; guarda++) {
      // Dentro de cada grupo gana el orden de decisión; entre grupos, la necesidad por minuto de siempre (la evidencia de ejercicios de músculos
      // distintos no es comparable: ordenarlos por evidencia dejaría sin tiempo a los músculos cuyo mejor ejercicio es `probable`, DEC-039).
      const porGrupo = {};
      sesiones.forEach(ses => movimientos(ses).forEach(mov => {
        const r = evaluar(ses, mov, permitirExceso);
        if (!r.ok) return;
        const g = cat.grupoDe(mov.v.id), resto = ses.capacidadSeg - ses.seg, clave = claveDecision(mov.v, r.redundancia);
        const c = porGrupo[g] ? comparar(clave, porGrupo[g].clave) : -1;
        if (!porGrupo[g] || c < 0 || (c === 0 && resto > porGrupo[g].resto + EPS)) porGrupo[g] = { ses, mov, r, resto, clave };
      }));
      let mejor = null;
      Object.keys(porGrupo).forEach(g => {
        const x = porGrupo[g], score = x.r.porSegundo;
        if (!mejor || score > mejor.score + EPS || (Math.abs(score - mejor.score) <= EPS && x.resto > mejor.resto + EPS)) mejor = Object.assign({ score }, x);
      });
      if (!mejor) {
        if (!permitirExceso && MUSCULOS.some(minimoSinCubrir)) { permitirExceso = true; continue; }
        break;
      }
      if (mejor.r.excedeR1.length) avisos.r1Excedido.push({ sesion: mejor.ses.nombre, varianteId: mejor.mov.v.id, musculos: mejor.r.excedeR1, motivo: 'una demanda mínima gana sobre R1 (DEC-025)' });
      if (mejor.mov.nuevo) agregar(mejor.ses, mejor.mov.v, mejor.mov.series, false);
      else {
        directas[cat.grupoDe(mejor.mov.v.id)] += 1;
        mejor.mov.ex.series += 1;
        mejor.ses.seg += segSerie(mejor.mov.v);
        sumar(mejor.ses, mejor.mov.ex, 1);
      }
      permitirExceso = false; // tras un movimiento vuelve la restricción estricta
    }

    // Paso 5 (cierre) · tope de series por ejercicio y sesión (DEC-031; el excedente en dos pasos, DEC-037 punto 4). El excedente pasa, en orden, (a) a otra
    // variante del mismo patrón y, si no hay o no cabe, (b) a otro ejercicio del MISMO músculo que entre en la sesión (tiempo, R1, A2, A3 y grupos de la
    // sesión). Mover series a otro día del split queda fuera (cambia el reparto semanal). Si no hay destino, el excedente se queda y el aviso lo dice:
    // el volumen no se recorta. Dentro de cada paso el orden es el de decisión del relleno: evidencia primero; en (a) sigue la variedad entre días
    // (menos usada) y la preferida, y en ambos el menor tiempo y la menor demanda lumbar. Es el único caso en que una sesión lleva dos variantes del
    // mismo patrón (cláusula de DEC-006 que DEC-031 reemplaza desde el corte).
    avisos.topeExcedido = [];
    if (!(opciones && opciones.sinTopePorEjercicio)) {
      const TOPE = valor('MAX_SERIES_POR_EJERCICIO'), MIN = valor('SERIES_MIN_POR_EJERCICIO');
      const claveTope = v => claveDecision(v, 0);
      sesiones.forEach(ses => {
        ses.ejercicios.slice().forEach(ex => {
          if (ex.series <= TOPE) return;
          const g = cat.grupoDe(ex.v.id);
          const mismoPatron = candidatas.filter(v => v.patron === ex.v.patron && v.id !== ex.v.id && cat.grupoDe(v.id) === g && !ses.ejercicios.some(e => e.v.id === v.id)
            && !excluyeA3(ses, v.patron) && !bloqueaA2(ses, v))
            .sort((a, b) => (claveTope(a).evidencia - claveTope(b).evidencia) || (uso[a.id] || 0) - (uso[b.id] || 0) || (b.preferida ? 1 : 0) - (a.preferida ? 1 : 0) || comparar(claveTope(a), claveTope(b)));
          const otroEjercicio = candidatas.filter(v => v.patron !== ex.v.patron && cat.grupoDe(v.id) === g && puedeEntrar(ses, v))
            .sort((a, b) => comparar(claveTope(a), claveTope(b)));
          for (const v of mismoPatron.concat(otroEjercicio)) {
            if (ex.series <= TOPE) break;
            const nuevas = Math.min(TOPE, Math.max(ex.series - TOPE, MIN));
            if (ex.series - nuevas < MIN) continue;
            const dSeg = nuevas * (segSerie(v) - segSerie(ex.v));
            if (!lumbarMedia(ex.v.id) && pasaLumbarMedia(ses, v, nuevas)) continue; // DEC-040: el traspaso no puede pasar el tope de lumbar media (entre dos de lumbar media el total no cambia)
            if (ses.seg + dSeg > ses.capacidadSeg + EPS) continue;
            const wo = ex.pesos, wn = pesos[v.id], delta = {};
            Object.keys(wo).forEach(m => { delta[m] = (delta[m] || 0) - wo[m] * nuevas; });
            Object.keys(wn).forEach(m => { delta[m] = (delta[m] || 0) + wn[m] * nuevas; });
            if (Object.keys(delta).some(m => delta[m] > EPS && (ses.frac[m] || 0) + delta[m] > Math.max(R1, ses.frac[m] || 0) + EPS)) continue; // R1: no se sube un músculo por encima del tope
            ex.series -= nuevas;
            Object.keys(delta).forEach(m => { ses.frac[m] = (ses.frac[m] || 0) + delta[m]; cubierto[m] += delta[m]; });
            ses.seg += dSeg;
            const nuevo = { v, series: nuevas, topSet: false, pesos: wn };
            ses.ejercicios.splice(ses.ejercicios.indexOf(ex) + 1, 0, nuevo);
            ses.patrones.add(v.patron);
            if (lumbarAlta(v.id)) ses.nLumbarAlta++;
            uso[v.id] = (uso[v.id] || 0) + 1;
          }
          if (ex.series > TOPE) avisos.topeExcedido.push({ sesion: ses.nombre, varianteId: ex.v.id, series: ex.series, motivo: 'no hay otra variante del patrón ni otro ejercicio del músculo que quepa (tiempo, R1, A2 o A3)' });
        });
      });
    }

    // Tope de lumbar media (DEC-040): lo que la estructura (patrones obligatorios, prioritarios, funcionales) mete en una sesión no se descarta por el tope, que
    // es una restricción del relleno: si la sesión queda sobre el tope, el aviso único lo dice (nunca se ignora en silencio).
    avisos.lumbarMediaExcedida = sesiones.filter(ses => seriesLumbarMedia(ses) > TOPE_LUMBAR_MEDIA)
      .map(ses => ({ sesion: ses.nombre, series: seriesLumbarMedia(ses), tope: TOPE_LUMBAR_MEDIA }));

    /* Sub-patrones (DEC-037) · la cobertura del músculo, abierta por sub-patrón: `cubierto` en series fraccionadas,
     * `directas` en series reales de ejercicios del grupo y `sesiones` en cuántos días aparece. Sirve para que una cuota
     * pueda exigir volumen en cada sub-patrón; en este paso SOLO SE INFORMA: ninguna regla la usa todavía, así que las
     * SESIONES no cambian (comprobado contra las 1620 del barrido). Lo que sí cambia es la forma del plan guardado, que
     * gana este campo: por eso sube VERSION_MOTOR. Un músculo que no está en el mapa devuelve null. */
    function coberturaPorSubPatron(m) {
      const mapa = valor('SUB_PATRONES_POR_MUSCULO')[m];
      if (!mapa) return null;
      const nombreDe = patron => Object.keys(mapa).find(sp => mapa[sp].includes(patron)) || null;
      const out = {};
      Object.keys(mapa).forEach(sp => { out[sp] = { cubierto: 0, directas: 0, sesiones: 0 }; });
      sesiones.forEach(ses => {
        const vistos = new Set();
        ses.ejercicios.forEach(ex => {
          const w = pesos[ex.v.id][m];
          if (!w) return;
          const sp = nombreDe(ex.v.patron);
          if (!sp) return; // un patrón sin clasificar no cuenta para ninguna cuota; el test de datos exige que no exista
          out[sp].cubierto += w * ex.series;
          if (cat.grupoDe(ex.v.id) === m) out[sp].directas += ex.series;
          vistos.add(sp);
        });
        vistos.forEach(sp => { out[sp].sesiones += 1; });
      });
      Object.keys(out).forEach(sp => { out[sp].cubierto = Math.round(out[sp].cubierto * 100) / 100; });
      return out;
    }

    // Paso 7 · qué quedó sin cubrir y por qué (aviso único).
    const semanal = {};
    MUSCULOS.forEach(m => {
      const falta = faltaDe(m), faltaReal = faltaRealDe(m);
      let causa = null;
      if (falta > EPS || faltaReal > EPS) {
        const motivos = { R1: 0, capacidad: 0, lumbarMedia: 0 };
        let candidatos = 0;
        sesiones.forEach(ses => movimientos(ses).forEach(mov => {
          if (!pesos[mov.v.id][m]) return;
          candidatos++;
          const w = pesos[mov.v.id], seg = mov.series * segSerie(mov.v);
          const bloqueaR1 = Object.keys(w).some(x => (ses.frac[x] || 0) + w[x] * mov.series > R1 + EPS && !minimoSinCubrir(x));
          if (ses.seg + seg > ses.capacidadSeg + EPS) motivos.capacidad++;
          else if (bloqueaR1) motivos.R1++;
          else if (pasaLumbarMedia(ses, mov.v, mov.series)) motivos.lumbarMedia++;
        }));
        // R1 deja la necesidad sin cubrir si alguna sesión tenía tiempo y solo R1 impidió sumar.
        causa = motivos.R1 > 0 ? 'R1' : motivos.lumbarMedia > 0 ? 'lumbar media' : (candidatos === 0 ? 'sin ejercicios disponibles' : 'tiempo');
      }
      semanal[m] = Object.assign({}, dem[m], { cubierto: Math.round(cubierto[m] * 100) / 100, directas: directas[m], faltaReal: Math.round(faltaReal * 100) / 100, sesiones: sesiones.filter(s => (s.frac[m] || 0) > 0).length, falta: Math.round(falta * 100) / 100, causa, porSubPatron: coberturaPorSubPatron(m) });
    });
    const sinCubrir = MUSCULOS.filter(m => semanal[m].falta > EPS || semanal[m].faltaReal > EPS);
    // Frecuencia mínima de los grupos mayores (DEC-036): un grupo mayor que entrena menos días por semana que el mínimo va al aviso único, no se fuerza (no es una restricción).
    const frecuenciaBaja = GRUPOS_MAYORES.filter(m => semanal[m].sesiones < valor('FRECUENCIA_MINIMA_GRUPOS_MAYORES')).map(m => ({ musculo: m, sesiones: semanal[m].sesiones, minimo: valor('FRECUENCIA_MINIMA_GRUPOS_MAYORES') }));
    const avisoUnico = (sinCubrir.length || avisos.cuotaSinCubrir.length || avisos.lumbarMediaExcedida.length || avisos.obligatoriosSinLugar.length || avisos.sinDirecto.length || avisos.principalReducido.length || frecuenciaBaja.length)
      ? { sinCubrir: sinCubrir.map(m => ({ musculo: m, falta: semanal[m].falta, faltaReal: semanal[m].faltaReal, causa: semanal[m].causa })), obligatoriosSinLugar: avisos.obligatoriosSinLugar, sinDirecto: avisos.sinDirecto, principalReducido: avisos.principalReducido, frecuenciaBaja, cuotaSinCubrir: avisos.cuotaSinCubrir, lumbarMediaExcedida: avisos.lumbarMediaExcedida, salidas: ['más tiempo ese día', 'más días', 'aceptar la sesión con esas demandas sin cubrir'] }
      : null;

    // Paso 6 · orden (A1): lumbar alta primero, luego multiarticulares (el hip thrust al final de ellos) y al final los aislamientos;
    // dentro de cada grupo, el patrón principal del tipo primero.
    const ORDEN_A1 = ['lumbar_alta', 'multiarticular', 'puente_cadera', 'aislamiento'];
    const grupoOrden = ex => ORDEN_A1.indexOf(lumbarAlta(ex.v.id) ? 'lumbar_alta' : ex.v.tipo === 'aislamiento' ? 'aislamiento' : ex.v.patron === 'puente_cadera' ? 'puente_cadera' : 'multiarticular');
    const salida = sesiones.map(ses => {
      const ordenados = ses.ejercicios.map((ex, i) => ({ ex, i })).sort(valor('ORDEN_POR_DEMANDA') ? (a, b) => grupoOrden(a.ex) - grupoOrden(b.ex) || ((b.ex.v.patron === ses.spec.principal) - (a.ex.v.patron === ses.spec.principal)) || a.i - b.i : (a, b) => a.i - b.i).map(x => x.ex);
      return {
        indice: ses.indice, nombre: ses.nombre, tipo: ses.spec.etiqueta, principal: ses.spec.principal,
        ejercicios: ordenados.map(ex => ({
          varianteId: ex.v.id, nombre: ex.v.nombre, patron: ex.v.patron, grupo: cat.grupoDe(ex.v.id), tipo: ex.v.tipo, series: ex.series, unilateral: !!ex.v.unilateral,
          topSet: ex.topSet ? { series: 1, repeticiones: valor('TOP_SET_REPETICIONES'), rir: valor('TOP_SET_RIR'), backoffs: ex.series - 1, backoffReduccionPorcentaje: valor('BACKOFF_REDUCCION_PORCENTAJE') } : null,
          heredado: !!ex.v.heredado, lumbarAlta: lumbarAlta(ex.v.id), evidenciaPorVerificar: cat.evidenciaPorVerificar(ex.v.id),
        })),
        series: ses.ejercicios.reduce((a, e) => a + e.series, 0),
        minutos: Math.round(ses.seg / 60), capacidadMin: Math.round(ses.capacidadSeg / 60),
        fraccionado: Object.keys(ses.frac).reduce((o, m) => { o[m] = Math.round(ses.frac[m] * 100) / 100; return o; }, {}),
        lumbarAltaEnSesion: ses.nLumbarAlta,
      };
    });
    return { version: 'core-v2-paso2', catalogo: cat.nombre || 'nuevo', perfil, sesiones: salida, semanal, avisoUnico, avisos };
  }

  return { SPLITS, TIPOS: T, MUSCULOS, GRUPOS_MAYORES, GRUPOS_CHICOS, normalizarPerfil, demandas, pesosDe, compararDecision, generarPlan };
});
