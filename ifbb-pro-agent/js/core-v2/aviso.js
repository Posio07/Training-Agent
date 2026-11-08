/* EN CONSTRUCCIÓN · núcleo v2 (B-039, paso 3.2). Este módulo NO está conectado a la interfaz ni al motor actual: el PR del corte lo conecta
 * (docs/specs/nucleo-v2.md, paso 7 del algoritmo y "Aceptación").
 *
 * Aviso único: si las demandas mínimas no entran en la capacidad (o la necesidad de un músculo no cabe bajo R1), la app muestra UN solo aviso
 * con tres salidas: más tiempo ese día, más días, o aceptar la sesión con esas demandas sin cubrir. Este módulo arma el aviso a partir de lo
 * que calcula el reparto (`plan.avisoUnico`) y aplica la salida que elige el usuario sobre el perfil y el plan guardado (plan.js, paso 3.1). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./registro.js'), require('./plan.js'));
  else root.CORE_V2_AVISO = factory(root.CORE_V2_REGISTRO, root.CORE_V2_PLAN);
})(typeof self !== 'undefined' ? self : this, function (REGISTRO, PLAN) {
  'use strict';

  const valor = id => REGISTRO.valor(id);
  const ETIQUETAS = { chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', quads: 'Cuádriceps', hamstrings: 'Isquiotibiales', glutes: 'Glúteos', calves: 'Pantorrillas', biceps: 'Bíceps', triceps: 'Tríceps', abs: 'Abdomen' };
  const MOTIVO = { R1: 'no cabe sin pasar el límite de series por sesión', tiempo: 'no entra en el tiempo disponible', 'sin ejercicios disponibles': 'no hay ejercicios disponibles con tus lesiones y casillas' };
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
    const conTiempo = a.sinCubrir.some(x => x.causa === 'tiempo') || a.sinDirecto.length > 0;
    if (conTiempo || sesiones.size === 0) plan.sesiones.forEach((s, i) => { if (limitadaPorTiempo(s)) sesiones.add(i); });
    const afectadas = [...sesiones].sort((x, y) => x - y);

    const lineas = [];
    a.obligatoriosSinLugar.forEach(x => lineas.push(`${x.sesion}: no cabe el patrón ${x.patron} (${x.motivo}).`));
    a.principalReducido.forEach(x => lineas.push(`${x.sesion}: el ejercicio principal queda con ${x.series} series en vez de ${x.deseadas} por falta de tiempo.`));
    a.sinDirecto.forEach(x => lineas.push(`${ETIQUETAS[x.musculo]}: sin ejercicio directo (${x.motivo}).`));
    a.sinCubrir.forEach(x => {
      const partes = [];
      if (x.falta > 0) partes.push(`faltan ${n1(x.falta)} series de la necesidad semanal`);
      if (x.faltaReal > 0) partes.push(`faltan ${n1(x.faltaReal)} series directas del mínimo`);
      lineas.push(`${ETIQUETAS[x.musculo]}: ${partes.join(' y ')} (${MOTIVO[x.causa] || x.causa}).`);
    });

    const dias = plan.perfil.dias;
    const salidas = [
      { id: 'mas-tiempo', texto: 'Más tiempo en esos días', sesiones: afectadas, minutosSugeridos: afectadas.map(i => plan.sesiones[i].capacidadMin + bloqueMinimoMin()) },
      { id: 'mas-dias', texto: 'Más días por semana', disponible: dias < 6, dias: Math.min(6, dias + 1) },
      { id: 'aceptar', texto: 'Aceptar esas sesiones con las demandas sin cubrir', disponible: afectadas.length > 0, sesiones: afectadas },
    ];
    // Si el problema es solo R1 (hay tiempo de sobra), más tiempo no ayuda: se avisa y la salida queda como no disponible.
    if (!conTiempo && a.obligatoriosSinLugar.length === 0 && a.principalReducido.length === 0) salidas[0].disponible = false;
    else salidas[0].disponible = afectadas.length > 0;
    return { hay: true, titulo: 'Esta semana no entra todo lo que pide el plan', lineas, sesionesAfectadas: afectadas, salidas, soloR1: !conTiempo && a.sinCubrir.every(x => x.causa === 'R1') };
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

  return { ETIQUETAS, bloqueMinimoMin, limitadaPorTiempo, construirAviso, aplicarSalida, avisoPendiente };
});
