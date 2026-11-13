/* Núcleo del generador · núcleo v2 (B-039, paso 3.2). Conectado a la app en el corte
 * (docs/specs/nucleo-v2.md, paso 7 del algoritmo y "Aceptación").
 *
 * Aviso único: si las demandas mínimas no entran en la capacidad (o la necesidad de un músculo no cabe bajo R1), la app muestra UN solo aviso
 * con tres salidas: más tiempo ese día, más días, o aceptar la sesión con esas demandas sin cubrir. Este módulo arma el aviso a partir de lo
 * que calcula el reparto (`plan.avisoUnico`) y aplica la salida que elige el usuario sobre el perfil y el plan guardado (plan.js, paso 3.1). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./registro.js'), require('./plan.js'), require('./reparto.js'));
  else root.CORE_V2_AVISO = factory(root.CORE_V2_REGISTRO, root.CORE_V2_PLAN, root.CORE_V2_REPARTO);
})(typeof self !== 'undefined' ? self : this, function (REGISTRO, PLAN, REPARTO) {
  'use strict';

  const valor = id => REGISTRO.valor(id);
  const ETIQUETAS = { chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', quads: 'Cuádriceps', hamstrings: 'Isquiotibiales', glutes: 'Glúteos', calves: 'Pantorrillas', biceps: 'Bíceps', triceps: 'Tríceps', abs: 'Abdomen' };
  // Sub-patrones de la cuota (DEC-037) en lenguaje simple para el aviso.
  const SUB_PATRON = { extension_cadera: 'extensión de cadera', abduccion_cadera: 'abducción de cadera', tiron_vertical: 'tirón vertical', tiron_horizontal: 'tirón horizontal', bisagra_cadera: 'bisagra de cadera', flexion_rodilla: 'flexión de rodilla' };
  const MOTIVO = { R1: 'no cabe sin pasar el límite de series por sesión', tiempo: 'no entra en el tiempo disponible', 'sin ejercicios disponibles': 'no hay ejercicios disponibles con tus lesiones y casillas', 'lumbar media': 'no entra sin pasar el tope de series de lumbar media por sesión' };
  // Máximo de días del perfil: el que acepta el reparto (no se repite el número a mano).
  const DIAS_MAX = valor('DIAS_POR_SEMANA')[1];
  const serie = n => (n === 1 ? 'serie' : 'series');
  const n1 = x => String(Math.round(x * 10) / 10).replace('.', ',');

  // Lo que cabe como mínimo en una sesión: el bloque más corto que el reparto puede agregar (un ejercicio nuevo de aislamiento), en minutos,
  // calculado con los números del registro. Una sesión sin ese margen está limitada por el tiempo.
  function bloqueMinimoMin() {
    return Math.ceil(valor('SERIES_MIN_POR_EJERCICIO') * (valor('DESCANSO_AISLAMIENTO_S') + valor('SEGUNDOS_EJECUCION_SERIE')) / 60);
  }
  const limitadaPorTiempo = s => s.capacidadMin - s.minutos < bloqueMinimoMin();

  // El aviso, o `{ hay: false }` si todo entró. `plan` es la salida del reparto (o `planGuardado.plan`).
  function construirAviso(plan) {
    const a = plan.avisoUnico;
    if (!a) return { hay: false };
    const sesiones = new Set();
    a.obligatoriosSinLugar.forEach(x => { const i = plan.sesiones.findIndex(s => s.nombre === x.sesion); if (i >= 0) sesiones.add(i); });
    a.principalReducido.forEach(x => { const i = plan.sesiones.findIndex(s => s.nombre === x.sesion); if (i >= 0) sesiones.add(i); });
    // Lo que no cabe por R1 es semanal y no trae sesión: las sesiones afectadas son aquellas donde ese músculo ya está en el tope por sesión
    // (si no hay ninguna al tope, las que lo entrenan). Así el usuario siempre puede aceptar la sesión.
    const tope = valor('MAX_SERIES_FRACCIONADAS_MUSCULO_SESION');
    a.sinCubrir.filter(x => x.causa === 'R1').forEach(x => {
      const entrenan = plan.sesiones.map((s, i) => [i, (s.fraccionado || {})[x.musculo]]).filter(([, f]) => f > 0);
      const alTope = entrenan.filter(([, f]) => f >= tope - 1e-9);
      (alTope.length ? alTope : entrenan).forEach(([i]) => sesiones.add(i));
    });
    // Frecuencia baja (DEC-036): las sesiones afectadas son las que entrenan ese grupo (si ninguna, todas), para que el usuario pueda aceptarlas.
    (a.frecuenciaBaja || []).forEach(x => {
      const entrenan = plan.sesiones.map((s, i) => [i, (s.fraccionado || {})[x.musculo]]).filter(([, f]) => f > 0).map(([i]) => i);
      (entrenan.length ? entrenan : plan.sesiones.map((s, i) => i)).forEach(i => sesiones.add(i));
    });
    // Cuota por sub-patrón (DEC-037): como la frecuencia baja, es semanal; las sesiones afectadas son las que entrenan ese músculo.
    const cuota = a.cuotaSinCubrir || [];
    cuota.forEach(x => {
      const entrenan = plan.sesiones.map((s, i) => [i, (s.fraccionado || {})[x.musculo]]).filter(([, f]) => f > 0).map(([i]) => i);
      (entrenan.length ? entrenan : plan.sesiones.map((s, i) => i)).forEach(i => sesiones.add(i));
    });
    // Tope de lumbar media (DEC-040): la sesión que lo pasa porque un patrón obligatorio entró igual es una sesión afectada: el usuario puede aceptarla.
    const lumbarMedia = a.lumbarMediaExcedida || [];
    lumbarMedia.forEach(x => { const i = plan.sesiones.findIndex(s => s.nombre === x.sesion); if (i >= 0) sesiones.add(i); });
    const conTiempo = a.sinCubrir.some(x => x.causa === 'tiempo') || a.sinDirecto.length > 0 || cuota.some(x => x.causa === 'tiempo');
    if (conTiempo || sesiones.size === 0) plan.sesiones.forEach((s, i) => { if (limitadaPorTiempo(s)) sesiones.add(i); });
    const afectadas = [...sesiones].sort((x, y) => x - y);

    const lineas = [];
    a.obligatoriosSinLugar.forEach(x => lineas.push(`${x.sesion}: no cabe el patrón ${x.patron} (${x.motivo}).`));
    a.principalReducido.forEach(x => lineas.push(`${x.sesion}: el ejercicio principal queda con ${x.series} series en vez de ${x.deseadas} por falta de tiempo.`));
    a.sinDirecto.forEach(x => lineas.push(`${ETIQUETAS[x.musculo]}: sin ejercicio directo (${x.motivo}).`));
    cuota.forEach(x => lineas.push(`${ETIQUETAS[x.musculo]}: falta un ejercicio de ${SUB_PATRON[x.subPatron] || x.subPatron} para cubrir bien el músculo (${MOTIVO[x.causa] || x.causa}).`));
    lumbarMedia.forEach(x => lineas.push(`${x.sesion}: lleva ${x.series} series de ejercicios de lumbar media y el tope por sesión es ${x.tope} (un patrón obligatorio entra igual).`));
    (a.frecuenciaBaja || []).forEach(x => lineas.push(`${ETIQUETAS[x.musculo]}: se entrena ${x.sesiones} ${x.sesiones === 1 ? 'día' : 'días'} por semana y lo recomendado es al menos ${x.minimo} (el plan no lo fuerza).`));
    a.sinCubrir.forEach(x => {
      const partes = [];
      if (x.falta > 0) partes.push(`faltan ${n1(x.falta)} ${serie(x.falta)} de la necesidad semanal`);
      if (x.faltaReal > 0) partes.push(`faltan ${n1(x.faltaReal)} ${serie(x.faltaReal)} directas del mínimo`);
      lineas.push(`${ETIQUETAS[x.musculo]}: ${partes.join(' y ')} (${MOTIVO[x.causa] || x.causa}).`);
    });

    const dias = plan.perfil.dias;
    const salidas = [
      { id: 'mas-tiempo', texto: 'Más tiempo en esos días (el sugerido es un mínimo: suma un bloque corto; si hace falta más, súbelo tú)', sesiones: afectadas, minutosSugeridos: afectadas.map(i => plan.sesiones[i].capacidadMin + bloqueMinimoMin()) },
      { id: 'mas-dias', texto: 'Más días por semana', disponible: dias < DIAS_MAX, dias: Math.min(DIAS_MAX, dias + 1) },
      { id: 'aceptar', texto: 'Aceptar esas sesiones con las demandas sin cubrir', disponible: afectadas.length > 0, sesiones: afectadas },
    ];
    // Si el problema es solo R1 (hay tiempo de sobra), más tiempo no ayuda: se avisa y la salida queda como no disponible.
    if (!conTiempo && a.obligatoriosSinLugar.length === 0 && a.principalReducido.length === 0) salidas[0].disponible = false;
    else salidas[0].disponible = afectadas.length > 0;
    return { hay: true, titulo: 'Esta semana no entra todo lo que pide el plan', lineas, sesionesAfectadas: afectadas, salidas, soloR1: !conTiempo && a.sinCubrir.length > 0 && a.sinCubrir.every(x => x.causa === 'R1') && !(a.frecuenciaBaja || []).length && cuota.length === 0 && lumbarMedia.length === 0 };
  }

  // Aplica la salida que eligió el usuario. Devuelve { perfil, planGuardado } nuevos (no muta los recibidos); el llamador regenera el plan
  // si `PLAN.estadoDelPlan` lo pide. `opciones`: { minutos: { indiceSesion: min } } para "más tiempo", { ahora } para la aceptación.
  function aplicarSalida(salida, perfil, planGuardado, opciones) {
    const o = opciones || {};
    if (salida.id === 'mas-tiempo') {
      if (salida.disponible === false) throw new Error('Más tiempo no está disponible para este aviso');
      const porDia = Object.assign({}, perfil.tiempoPorDia || {});
      salida.sesiones.forEach((i, k) => { porDia[i] = (o.minutos && o.minutos[i]) || salida.minutosSugeridos[k]; });
      return { perfil: Object.assign({}, perfil, { tiempoPorDia: porDia }), planGuardado };
    }
    if (salida.id === 'mas-dias') {
      if (!salida.disponible) throw new Error('El plan ya tiene el máximo de días');
      return { perfil: Object.assign({}, perfil, { daysPerWeek: salida.dias }), planGuardado };
    }
    if (salida.id === 'aceptar') {
      let g = planGuardado;
      salida.sesiones.forEach(i => { g = PLAN.aceptarSesion(g, i, o.ahora); });
      return { perfil, planGuardado: g };
    }
    throw new Error('Salida desconocida: ' + salida.id);
  }

  // ¿Esa sesión ya está aceptada (y la aceptación sigue vigente)? Para no volver a mostrar el aviso de una sesión aceptada.
  function avisoPendiente(aviso, perfil, planGuardado) {
    if (!aviso.hay) return aviso;
    const faltan = aviso.sesionesAfectadas.filter(i => !PLAN.aceptacionVigente(planGuardado, perfil, i));
    return Object.assign({}, aviso, { hay: faltan.length > 0 || aviso.sesionesAfectadas.length === 0, sesionesAfectadas: faltan });
  }

  return { bloqueMinimoMin, construirAviso, aplicarSalida, avisoPendiente };
});
