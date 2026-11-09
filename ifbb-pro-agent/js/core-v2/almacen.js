/* Núcleo del generador · núcleo v2 (B-039, paso 3.9). El ALMACENAMIENTO del núcleo nuevo: la clave, la forma de los datos y cómo se leen y se guardan. Lo usa
 * `app.js`, que solo llama a estas funciones (sin lógica de almacenamiento propia). Tiene la misma forma de estado que tenía `app.js`
 * (`{ profiles, activeId }`): el corte cambió la clave (DEC-032) y el perfil ganó el plan guardado.
 *
 * Perfil: { id, createdAt, updatedAt, data, log, workouts, sessions, painFlags, planGuardado }
 *   - `data`: lo que normaliza el motor más los campos nuevos (tiempo disponible, prioritarios);
 *   - `log`: las mediciones de peso y medidas (el progreso de peso se queda en `app.js`);
 *   - `workouts`, `sessions`: las series y las sesiones registradas (el id de la variante es el `exerciseId`);
 *   - `painFlags`: las banderas de dolor por zona, la clave que el export ya excluye (DEC-009);
 *   - `planGuardado`: el plan guardado de `core-v2/plan.js`.
 * Sin migraciones (DEC-023, DEC-032): un estado ilegible o de otra versión se ignora y se empieza vacío; un plan guardado inválido se descarta y se regenera.
 * La sesión en curso (DEC-015) vive aparte, en su propia clave de `sessionStore.js`, que el corte no cambia: una sesión guardada por el modo anterior no se puede
 * reanudar y se descarta (pantalla de sesión). Todo son funciones con el almacenamiento inyectado (`getItem`, `setItem`). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./plan.js'));
  else root.CORE_V2_ALMACEN = factory(root.CORE_V2_PLAN);
})(typeof self !== 'undefined' ? self : this, function (PLAN) {
  'use strict';

  // La clave definitiva (DEC-032): distinta de la de la app actual ('ifbb-agent:v1'), cuyos datos quedan ignorados dos semanas tras el corte.
  const CLAVE = 'ifbb-agent:v2';
  const VERSION = 2;

  const estadoVacio = () => ({ version: VERSION, profiles: [], activeId: null });

  // Un perfil con la forma mínima: lo que falte se completa; si no tiene id o datos, no es un perfil.
  function leerPerfil(p) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id || !p.data || typeof p.data !== 'object') return null;
    return {
      id: p.id, createdAt: typeof p.createdAt === 'string' ? p.createdAt : '', updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : '',
      data: p.data, log: Array.isArray(p.log) ? p.log : [], workouts: Array.isArray(p.workouts) ? p.workouts : [], sessions: Array.isArray(p.sessions) ? p.sessions : [],
      painFlags: p.painFlags && typeof p.painFlags === 'object' ? p.painFlags : {},
      planGuardado: PLAN.leerPlanGuardado(p.planGuardado), // inválido → null: se regenera con `asegurarPlan`
    };
  }

  // El estado guardado, o vacío si no hay nada, no se puede leer o es de otra versión.
  function cargar(storage, clave) {
    try {
      const raw = storage.getItem(clave || CLAVE);
      if (!raw) return estadoVacio();
      const s = JSON.parse(raw);
      if (!s || s.version !== VERSION || !Array.isArray(s.profiles)) return estadoVacio();
      const profiles = s.profiles.map(leerPerfil).filter(Boolean);
      return { version: VERSION, profiles, activeId: profiles.some(p => p.id === s.activeId) ? s.activeId : (profiles[0] ? profiles[0].id : null) };
    } catch (e) { return estadoVacio(); }
  }

  // Devuelve false si el almacenamiento no está disponible o está lleno.
  function guardar(storage, estado, clave) {
    try { storage.setItem(clave || CLAVE, JSON.stringify(Object.assign({}, estado, { version: VERSION }))); return true; } catch (e) { return false; }
  }

  // Un guardado que avisa si falla (almacenamiento lleno o bloqueado): es lo que `app.js` hace hoy con su `save()`. Devuelve una función sin argumentos que guarda
  // `estado` y devuelve true o false.
  function guardador(storage, estado, aviso, clave) {
    return () => { const ok = guardar(storage, estado, clave); if (!ok) aviso('No se pudo guardar: almacenamiento no disponible.'); return ok; };
  }

  const activo = estado => estado.profiles.find(p => p.id === estado.activeId) || null;

  // La primera medición de un perfil nuevo: sus datos iniciales.
  const medicionInicial = (datos, ahora) => ({ date: ahora, weightKg: datos.weightKg, bodyFatPct: datos.bodyFatPct || null, waistCm: datos.waistCm || null, neckCm: datos.neckCm || null, hipCm: datos.hipCm || null, notes: 'Datos iniciales' });

  // Un perfil nuevo con su plan guardado. `opciones`: { id, planId, ahora }.
  function crearPerfil(datos, opciones) {
    const o = opciones || {};
    if (!o.id || !o.planId) throw new Error('crearPerfil necesita un id y un id de plan');
    return { id: o.id, createdAt: o.ahora || '', updatedAt: o.ahora || '', data: datos, log: [medicionInicial(datos, o.ahora || '')], workouts: [], sessions: [], painFlags: {}, planGuardado: PLAN.crearPlan(datos, { id: o.planId, ahora: o.ahora }) };
  }

  // Si el perfil no tiene un plan guardado válido (por ejemplo, el guardado era ilegible), se genera uno. Devuelve true si lo regeneró.
  function asegurarPlan(perfil, opciones) {
    if (perfil.planGuardado) return false;
    perfil.planGuardado = PLAN.crearPlan(perfil.data, { id: opciones.planId, ahora: opciones.ahora });
    return true;
  }

  // Cambia los datos de un perfil: regenera el plan solo si cambió algo que lo define (paso 3.1). Devuelve true si lo regeneró.
  function actualizarDatos(perfil, datos, opciones) {
    perfil.data = datos; perfil.updatedAt = opciones.ahora;
    if (PLAN.estadoDelPlan(perfil.planGuardado, datos).regenerar) { perfil.planGuardado = PLAN.regenerar(datos, { id: opciones.planId, ahora: opciones.ahora }); return true; }
    return false;
  }

  return { CLAVE, VERSION, leerPerfil, cargar, guardar, guardador, activo, crearPerfil, asegurarPlan, actualizarDatos };
});
