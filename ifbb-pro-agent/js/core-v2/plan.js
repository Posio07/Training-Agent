/* EN CONSTRUCCIÓN · núcleo v2 (B-039, paso 3.1). Este módulo NO está conectado a la interfaz ni al motor actual: el PR del
 * corte lo conecta (docs/specs/nucleo-v2.md, "Plan guardado" y "El corte").
 *
 * Plan guardado: el plan generado se GUARDA (con un identificador, la fecha y la versión del motor que lo generó). Hoy se
 * recalcula cada vez que se muestra; en el núcleo nuevo solo se regenera cuando:
 *   - el usuario aprieta "Regenerar", o
 *   - cambia el tiempo disponible, los días, el objetivo, el nivel, la división, los rezagados, los ejercicios prioritarios,
 *     las lesiones declaradas o la casilla del remo con barra (más la bandera salud/funcional: ver nota en `CAMPOS`).
 * Una versión nueva del motor NO regenera el plan sola: `estadoDelPlan` avisa y el usuario decide (`regenerar`).
 * La aceptación de una sesión (DEC-024, punto 4) se guarda en el plan, no en el perfil, y caduca al regenerarlo y al cambiar
 * el tiempo disponible, los días o el objetivo.
 *
 * Todo son funciones puras: no tocan el almacenamiento ni el reloj (el llamador pasa `ahora` y el `id`). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./reparto.js'));
  else root.CORE_V2_PLAN = factory(root.CORE_V2_REPARTO);
})(typeof self !== 'undefined' ? self : this, function (REPARTO) {
  'use strict';

  // Versión del motor que generó el plan. Se sube a mano cada vez que cambia la salida del reparto, del registro o del catálogo; un test
  // con las huellas de 10 perfiles de referencia (tests/fixtures/core-v2-plan-hashes.json) falla si la salida cambia sin que se regenere
  // esa huella, y scripts/snapshot-core-v2.js no la regenera si esta versión no subió.
  const VERSION_MOTOR = 'core-v2.1';

  /* Campos del perfil que, al cambiar, regeneran el plan. La lista de la spec (tiempo, días, objetivo, nivel, división, rezagados,
   * prioritarios, lesiones, remo con barra) más `healthGoal` (bandera salud/funcional): el reparto habilita los funcionales con ella,
   * así que un plan guardado con otra bandera estaría desactualizado. Se agregó por esa razón y Emanuel lo confirma en el PR. */
  const CAMPOS = ['tiempo', 'dias', 'objetivo', 'nivel', 'division', 'rezagados', 'prioritarios', 'lesiones', 'remoConBarra', 'banderaSalud'];
  // La aceptación de una sesión caduca solo con estos tres (DEC-024, punto 4).
  const CAMPOS_ACEPTACION = ['tiempo', 'dias', 'objetivo'];

  const unicosOrdenados = xs => [...new Set(xs)].sort();

  // Perfil → lo que usa el reparto. Un perfil puede traer `tiempoDisponibleMin` (general) y `tiempoPorDia` (cambios por día:
  // lista o { "0": 60 }); el reparto recibe una lista con los minutos de cada día del split.
  function perfilParaReparto(perfil) {
    const p = perfil || {};
    const n = REPARTO.normalizarPerfil(p);
    const porDia = p.tiempoPorDia || {};
    const minutos = n.minutosPorDia.map((general, i) => { const x = parseFloat(porDia[i]); return x > 0 ? x : general; });
    return Object.assign({}, p, { tiempoDisponibleMin: minutos });
  }

  // Lo que cuenta del perfil, normalizado (el reparto ya normaliza días, nivel, objetivo y división). Es la "firma" del plan.
  function firmaDelPerfil(perfil) {
    const n = REPARTO.normalizarPerfil(perfilParaReparto(perfil));
    const general = REPARTO.normalizarPerfil(Object.assign({}, perfil, { tiempoDisponibleMin: perfil && perfil.tiempoDisponibleMin })).minutosPorDia[0];
    const porDia = {};
    n.minutosPorDia.forEach((m, i) => { if (m !== general) porDia[i] = m; });
    return {
      tiempo: { general, porDia }, // el general más los días cambiados: cambiar los días no cambia "el tiempo"

      dias: n.dias,
      objetivo: n.goal,
      nivel: n.level,
      division: n.division,
      rezagados: unicosOrdenados(n.laggingMuscles),
      prioritarios: n.prioritarios.slice(),
      lesiones: unicosOrdenados(n.zonas),
      remoConBarra: n.barbellRow,
      banderaSalud: n.healthGoal,
    };
  }

  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function camposCambiados(firmaA, firmaB, campos) {
    return (campos || CAMPOS).filter(c => !igual(firmaA[c], firmaB[c]));
  }

  // Un plan guardado nuevo. `opciones.id` y `opciones.ahora` (AAAA-MM-DD) los pone el llamador.
  function crearPlan(perfil, opciones) {
    const o = opciones || {};
    if (!o.id) throw new Error('crearPlan necesita un id');
    return {
      id: o.id, creadoEn: o.ahora || '', versionMotor: VERSION_MOTOR,
      firma: firmaDelPerfil(perfil),
      plan: REPARTO.generarPlan(perfilParaReparto(perfil)),
      aceptaciones: [],
    };
  }

  // ¿Hay que regenerar? `motivos` dice qué campos cambiaron. `versionNueva` avisa que hay un motor nuevo, sin regenerar sola.
  function estadoDelPlan(planGuardado, perfil) {
    if (!planGuardado) return { regenerar: true, motivos: ['sin plan'], versionNueva: false };
    const motivos = camposCambiados(planGuardado.firma, firmaDelPerfil(perfil));
    return { regenerar: motivos.length > 0, motivos, versionNueva: planGuardado.versionMotor !== VERSION_MOTOR };
  }

  // Regenerar (botón, cambio de campos o decisión de aplicar una versión nueva): plan nuevo, id nuevo y sin aceptaciones.
  function regenerar(perfil, opciones) { return crearPlan(perfil, opciones); }

  // La aceptación de una sesión CONCRETA de un plan CONCRETO. Devuelve un plan guardado nuevo (no muta el recibido).
  function aceptarSesion(planGuardado, indice, ahora) {
    const sesion = planGuardado.plan.sesiones[indice];
    if (!sesion) throw new Error('Sesión inexistente: ' + indice);
    const firma = {}; CAMPOS_ACEPTACION.forEach(c => { firma[c] = planGuardado.firma[c]; });
    const aceptaciones = planGuardado.aceptaciones.filter(a => a.sesion !== indice).concat([{ sesion: indice, nombre: sesion.nombre, aceptadaEn: ahora || '', planId: planGuardado.id, firma }]);
    return Object.assign({}, planGuardado, { aceptaciones });
  }

  // ¿Sigue vigente la aceptación de esa sesión? Caduca si el plan es otro o si cambió el tiempo, los días o el objetivo.
  function aceptacionVigente(planGuardado, perfil, indice) {
    if (!planGuardado) return false;
    const a = planGuardado.aceptaciones.find(x => x.sesion === indice);
    if (!a || a.planId !== planGuardado.id) return false;
    const actual = firmaDelPerfil(perfil);
    return CAMPOS_ACEPTACION.every(c => igual(a.firma[c], actual[c]));
  }

  // Lee un plan guardado del almacenamiento: forma mínima o nada (sin migraciones, DEC-023: uno inválido se descarta y se regenera).
  function leerPlanGuardado(x) {
    const ok = x && typeof x === 'object' && typeof x.id === 'string' && x.id && typeof x.versionMotor === 'string' && x.firma && typeof x.firma === 'object'
      && x.plan && Array.isArray(x.plan.sesiones) && Array.isArray(x.aceptaciones);
    return ok ? x : null;
  }

  return { VERSION_MOTOR, CAMPOS, CAMPOS_ACEPTACION, perfilParaReparto, firmaDelPerfil, camposCambiados, crearPlan, estadoDelPlan, regenerar, aceptarSesion, aceptacionVigente, leerPlanGuardado };
});
