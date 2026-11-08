/* EN CONSTRUCCIÓN · núcleo v2 (B-039, paso 3.3). Este módulo NO está conectado a la interfaz ni al motor actual: el PR del corte
 * lo conecta (docs/specs/nucleo-v2.md, "Modelo de datos" y "Rutina corta").
 *
 * Sesión por variantes: lo que la pantalla de sesión necesita del núcleo nuevo, como funciones puras.
 *   - la variante de cada ejercicio (por defecto, la última que usó el usuario; el usuario puede elegir otra del mismo patrón);
 *   - los ejercicios de la sesión en el formato que consume sessionStore (`newSession`), con el id de la VARIANTE: el progreso se
 *     registra por variante;
 *   - la última vez y el progreso de una variante, a partir de las series registradas (`profile.workouts`);
 *   - "hoy tengo X min" (rutina corta): la misma sesión generada con el tiempo del día, sin tocar el plan guardado.
 * A5 (back-off válido) y A6 (bandera de dolor) viven en dolor.js (paso 3.4). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./registro.js'), require('./catalogo.js'), require('./reparto.js'));
  else root.CORE_V2_SESION = factory(root.CORE_V2_REGISTRO, root.CORE_V2_CATALOGO, root.CORE_V2_REPARTO);
})(typeof self !== 'undefined' ? self : this, function (REGISTRO, CATALOGO, REPARTO) {
  'use strict';

  const valor = id => REGISTRO.valor(id);
  const fmtSeg = s => (s % 60 === 0 ? `${s / 60} min` : (s > 120 ? `${String(s / 60).replace('.', ',')} min` : `${s} s`));

  // ¿La variante está habilitada para este perfil? Mismas reglas que el reparto (casillas del perfil y lesiones declaradas).
  function habilitada(v, perfil, cat) {
    const n = REPARTO.normalizarPerfil(perfil || {});
    if (v.habilitaPor === 'remoConBarra' && !n.barbellRow) return false;
    if (v.habilitaPor === 'healthGoal' && !n.healthGoal) return false;
    if (v.soloSinRemoConBarra && n.barbellRow) return false;
    if (v.soloConLesion && !n.zonas.includes(v.soloConLesion)) return false;
    return !cat.excluidaPorLesion(v.id, n.zonas);
  }

  const lumbarAlta = (cat, id) => (cat.perfilArticularDe(id).lumbar || {}).nivel === 'alta';

  // Variantes que el usuario puede elegir para un ejercicio de la sesión: las del mismo patrón y habilitadas, menos las que ya están en
  // la sesión. Con la planificada y la última usada marcadas.
  function variantesDelEjercicio(planSesion, indice, perfil, workouts, catalogo) {
    const cat = catalogo || CATALOGO;
    const ej = planSesion.ejercicios[indice];
    if (!ej) throw new Error('Ejercicio inexistente: ' + indice);
    const enSesion = new Set(planSesion.ejercicios.map(e => e.varianteId));
    const ultima = ultimaVariante(workouts, ej.patron, cat);
    return cat.VARIANTES.filter(v => v.patron === ej.patron && habilitada(v, perfil, cat) && (v.id === ej.varianteId || !enSesion.has(v.id)))
      .map(v => ({ varianteId: v.id, nombre: v.nombre, planificada: v.id === ej.varianteId, ultimaUsada: v.id === ultima }));
  }

  // La última variante usada de un patrón según las series registradas (la fila más reciente por fecha y hora), o null.
  function ultimaVariante(workouts, patron, catalogo) {
    const cat = catalogo || CATALOGO;
    let mejor = null;
    (workouts || []).forEach(w => {
      const v = cat.variantePorId(w.exerciseId);
      if (!v || v.patron !== patron) return;
      const clave = [w.date || '', w.savedAt || 0];
      if (!mejor || clave[0] > mejor.clave[0] || (clave[0] === mejor.clave[0] && clave[1] >= mejor.clave[1])) mejor = { id: v.id, clave };
    });
    return mejor && mejor.id;
  }

  // La variante con la que arranca cada ejercicio: la última usada si sigue habilitada y no está ya en la sesión; si no, la planificada.
  function varianteInicial(planSesion, indice, perfil, workouts, catalogo) {
    const opciones = variantesDelEjercicio(planSesion, indice, perfil, workouts, catalogo);
    const ultima = opciones.find(o => o.ultimaUsada);
    return (ultima || opciones.find(o => o.planificada) || { varianteId: planSesion.ejercicios[indice].varianteId }).varianteId;
  }

  // ¿Qué pasa si el usuario cambia la variante? Nunca bloquea (el usuario decide): avisa. A2 (dos de lumbar alta, aviso) y el top set,
  // que solo va a variantes elegibles (DEC-008): el ejercicio lo pierde si la nueva no lo es.
  function evaluarCambio(planSesion, indice, varianteId, perfil, catalogo) {
    const cat = catalogo || CATALOGO;
    const ej = planSesion.ejercicios[indice], nueva = cat.variantePorId(varianteId);
    if (!ej || !nueva) throw new Error('Cambio inválido');
    const opciones = variantesDelEjercicio(planSesion, indice, perfil, [], cat);
    const avisos = [];
    if (!opciones.some(o => o.varianteId === varianteId)) avisos.push({ regla: 'no-disponible', texto: 'Esa variante no está disponible para este perfil o ya está en la sesión.' });
    const otrasAltas = planSesion.ejercicios.filter((e, i) => i !== indice && lumbarAlta(cat, e.varianteId)).length;
    if (lumbarAlta(cat, varianteId) && otrasAltas >= valor('MAX_LUMBAR_ALTA_POR_SESION')) avisos.push({ regla: 'A2', texto: 'Con esta variante la sesión tendría dos ejercicios de demanda lumbar alta.' });
    if (ej.topSet && !nueva.topSetElegible) avisos.push({ regla: 'top-set', texto: 'Esta variante no es elegible para el top set (DEC-008): el ejercicio pasa a series normales.' });
    return { permitido: avisos.every(a => a.regla !== 'no-disponible'), avisos };
  }

  // Los ejercicios de la sesión en el formato de sessionStore.newSession: `exerciseId` es el id de la variante. `elecciones` es
  // { indiceEjercicio: varianteId } con lo que eligió el usuario; sin elección, la planificada.
  function ejerciciosParaSesion(planSesion, elecciones, catalogo) {
    const cat = catalogo || CATALOGO;
    const el = elecciones || {};
    return planSesion.ejercicios.map((e, i) => {
      const v = cat.variantePorId(el[i] || e.varianteId);
      const cambia = v.id !== e.varianteId;
      const topSet = e.topSet && v.topSetElegible ? e.topSet : null; // DEC-008
      const series = e.series;
      const reps = `${v.reps[0]}-${v.reps[1]}`;
      const restoNormal = fmtSeg(v.tipo === 'multiarticular' ? valor('DESCANSO_MULTIARTICULAR_S') : valor('DESCANSO_AISLAMIENTO_S'));
      const sets = [];
      if (topSet) {
        sets.push({ setType: 'top', setNumber: 1, repsLabel: `${topSet.repeticiones[0]}-${topSet.repeticiones[1]}`, restLabel: fmtSeg(valor('DESCANSO_TOP_SET_S')) });
        for (let k = 0; k < series - 1; k++) sets.push({ setType: 'backoff', setNumber: k + 1, repsLabel: reps, restLabel: fmtSeg(valor('DESCANSO_BACKOFF_S')) });
      } else for (let k = 0; k < series; k++) sets.push({ setType: 'normal', setNumber: k + 1, repsLabel: reps, restLabel: restoNormal });
      const segundos = cat.segundosPorSerie(v.id) * series + (topSet ? (v.unilateral ? 2 : 1) * (valor('DESCANSO_TOP_SET_S') - valor('DESCANSO_BACKOFF_S')) : 0);
      return {
        name: v.nombre, exerciseId: v.id, bucket: cat.grupoDe(v.id), muscle: cat.grupoDe(v.id), type: v.tipo === 'multiarticular' ? 'compound' : 'isolation',
        pattern: v.patron, unilateral: !!v.unilateral, barra: !!v.barra, durationMin: Math.round(segundos / 60), sets,
        cambiadaDe: cambia ? e.nombre : null, // el usuario eligió otra variante que la del plan
      };
    });
  }

  // La última vez de una variante: las series de su sesión más reciente (por fecha y hora), con carga y repeticiones.
  function ultimaVez(workouts, varianteId, sesionActualId) {
    const filas = (workouts || []).filter(w => w.exerciseId === varianteId && w.sessionId !== sesionActualId);
    if (!filas.length) return null;
    const clave = w => [w.date || '', w.savedAt || 0];
    const ult = filas.reduce((m, w) => { const a = clave(w), b = clave(m); return a[0] > b[0] || (a[0] === b[0] && a[1] >= b[1]) ? w : m; });
    return { sessionId: ult.sessionId, date: ult.date, sets: filas.filter(w => w.sessionId === ult.sessionId).sort((a, b) => (a.setNumber || 0) - (b.setNumber || 0)).map(w => ({ setType: w.setType, setNumber: w.setNumber, weight: w.weight, reps: w.reps })) };
  }

  // Progreso de una variante: por sesión, la mejor serie por 1RM estimado (Epley), de la más vieja a la más nueva.
  const epley = (w, r) => w * (1 + r / 30);
  function progreso(workouts, varianteId) {
    const porSesion = {};
    (workouts || []).filter(w => w.exerciseId === varianteId && w.weight > 0 && w.reps > 0).forEach(w => {
      const s = porSesion[w.sessionId] || (porSesion[w.sessionId] = { sessionId: w.sessionId, date: w.date, mejor: null });
      const e = epley(w.weight, w.reps);
      if (!s.mejor || e > s.mejor.e1rm) s.mejor = { weight: w.weight, reps: w.reps, e1rm: Math.round(e * 10) / 10 };
    });
    return Object.values(porSesion).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  // "Hoy tengo X min" (rutina corta): la misma sesión generada con ese tiempo, fijado al empezarla. No toca el plan guardado ni el perfil.
  // Devuelve la sesión del plan (con la misma forma que `plan.sesiones[i]`). La rutina corta se define solo por tiempo (decidido por Emanuel el
  // 2026-11-08): sin tope ni piso de ejercicios; los patrones obligatorios del tipo entran primero y, si el tiempo no alcanza para todos,
  // `avisos` los nombra (`faltantes`).
  function sesionConTiempo(perfil, indice, minutos) {
    const m = parseFloat(minutos);
    if (!(m > 0)) throw new Error('Minutos inválidos');
    const n = REPARTO.normalizarPerfil(perfil || {});
    const porDia = (perfil && perfil.tiempoPorDia) || {};
    // Minutos de cada día: los cambios por día del perfil, el general para el resto, y el de hoy en la sesión pedida.
    const minutosDelDia = n.minutosPorDia.map((general, i) => (i === indice ? m : (parseFloat(porDia[i]) > 0 ? parseFloat(porDia[i]) : general)));
    const plan = REPARTO.generarPlan(Object.assign({}, perfil, { tiempoDisponibleMin: minutosDelDia }));
    const sesion = plan.sesiones[indice];
    if (!sesion) throw new Error('Sesión inexistente: ' + indice);
    const faltantes = plan.avisos.obligatoriosSinLugar.filter(x => x.sesion === sesion.nombre);
    // El reparto nunca pasa de la capacidad: sesion.minutos <= m.
    return Object.assign({}, sesion, { rutinaCorta: true, minutosFijados: m, faltantes, avisos: faltantes.map(x => ({ regla: 'obligatorio-sin-lugar', patron: x.patron, texto: `Con ${m} min no cabe el patrón ${x.patron}: ${x.motivo}.` })) });
  }

  return { habilitada, variantesDelEjercicio, ultimaVariante, varianteInicial, evaluarCambio, ejerciciosParaSesion, ultimaVez, progreso, sesionConTiempo };
});
