/* EN CONSTRUCCIÓN · núcleo v2 (B-039, paso 3.2b / B-049). Este módulo NO está conectado a la interfaz ni al motor actual: el PR del corte lo
 * conecta (docs/specs/nucleo-v2.md, "Fuera del núcleo v2" y "El corte").
 *
 * Prescripción de cardio, armada desde el registro (DEC-005, DEC-026): en definición con la bandera salud/funcional el cardio no se
 * minimiza y respeta el piso de 150 min por semana (OMS 2020); en definición sin la bandera es el mínimo necesario; en mantenimiento y
 * volumen son 2 sesiones de 25 min. Hasta el corte, los textos y los números son idénticos a los de `computeTraining` del motor actual. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./registro.js'), require('./reparto.js'));
  else root.CORE_V2_CARDIO = factory(root.CORE_V2_REGISTRO, root.CORE_V2_REPARTO);
})(typeof self !== 'undefined' ? self : this, function (REGISTRO, REPARTO) {
  'use strict';

  const valor = id => REGISTRO.valor(id);

  // { sesiones, minutos, minutosSemana, tipo, regla, cumpleMinimoOms, fuentes }. `cumpleMinimoOms` solo existe con la bandera en definición.
  function prescribirCardio(perfil) {
    const n = REPARTO.normalizarPerfil(perfil || {});
    const [fcMin, fcMax] = valor('CARDIO_INTENSIDAD_PORCENTAJE_FCMAX');
    let sesiones, minutos, tipo, regla, minimo = null;
    if (n.goal === 'cut' && n.healthGoal) {
      sesiones = valor('CARDIO_SALUD_SESIONES'); minutos = valor('CARDIO_SALUD_MINUTOS'); minimo = valor('CARDIO_MINIMO_SALUD');
      tipo = `Cardio moderado (caminata, bici, elíptica) al ${fcMin}-${fcMax} % FC máx.`;
      regla = `Objetivo "salud/funcional" activo: el cardio no se recorta por estar en definición; se mantiene el piso de ${minimo} min/semana recomendado para la salud cardiovascular, aunque interfiera algo más con la ganancia de fuerza.`;
    } else if (n.goal === 'cut') {
      sesiones = n.level === 'advanced' ? valor('CARDIO_DEFINICION_SESIONES_AVANZADO') : valor('CARDIO_DEFINICION_SESIONES'); minutos = valor('CARDIO_DEFINICION_MINUTOS');
      tipo = `LISS (caminata inclinada, bici, elíptica) al ${fcMin}-${fcMax} % FC máx.; opcional 1 sesión HIIT de 10-15 min`;
      regla = 'La mínima cantidad necesaria para mantener el ritmo de pérdida; añade 10 min/sesión solo si el peso se estanca 2 semanas. Sepáralo del entrenamiento de fuerza o hazlo después.';
    } else {
      sesiones = valor('CARDIO_MANTENIMIENTO_SESIONES'); minutos = valor('CARDIO_MANTENIMIENTO_MINUTOS');
      tipo = 'Cardio moderado por salud cardiovascular';
      regla = `Sin objetivo de gasto: ${sesiones} sesiones de ${minutos} min (${sesiones * minutos} min por semana) para mantener la capacidad aeróbica. Es un criterio de diseño de la app (E4), no una recomendación de la OMS. No interfiere con la hipertrofia a este volumen.`;
    }
    // Las fuentes salen de las reglas activas del perfil (requisito de B-039): la OMS solo con la bandera en definición.
    const activas = new Set(REGISTRO.fuentesActivas({ goal: n.goal, healthGoal: n.healthGoal }));
    const fuentes = ['ACSM_CARDIO', 'WHO_PA'].filter(f => activas.has(f));
    return { sesiones, minutos, minutosSemana: sesiones * minutos, tipo, regla, cumpleMinimoOms: minimo === null ? null : sesiones * minutos >= minimo, fuentes };
  }

  return { prescribirCardio };
});
