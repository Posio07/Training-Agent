/* EN CONSTRUCCIÓN · núcleo v2 (B-039, paso 3.5). Este módulo NO está conectado a la interfaz ni al motor actual: el PR del corte lo conecta.
 *
 * Los tres textos fijos del plan (intensidad, progresión y descarga), armados desde el registro de reglas: ningún número vive acá. Reemplazan
 * los textos escritos a mano en engine.js. `fuentesDeTextos` dice qué fuentes respaldan las reglas activas de estos textos (requisito de
 * B-039: una fuente aparece solo cuando la regla que respalda está activa). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./registro.js'));
  else root.CORE_V2_TEXTOS = factory(root.CORE_V2_REGISTRO);
})(typeof self !== 'undefined' ? self : this, function (REGISTRO) {
  'use strict';

  const valor = id => REGISTRO.valor(id);
  const rango = r => `${r[0]}-${r[1]}`;
  const semanas = n => (n === 1 ? 'una semana' : `${n} semanas`);

  function intensidad() {
    return `La mayoría de series en ${rango(valor('INTENSIDAD_REPETICIONES_PRINCIPAL'))} repeticiones al ${rango(valor('INTENSIDAD_PORCENTAJE_1RM'))} % del 1RM, terminando a ${rango(valor('INTENSIDAD_RIR'))} repeticiones del fallo (RIR). Aislamientos hasta ${valor('INTENSIDAD_REPETICIONES_MAX_AISLAMIENTO')} repeticiones.`;
  }

  function progresion() {
    const cargas = `${rango(valor('PROGRESION_CARGA_TREN_SUPERIOR'))} % (tren superior) o ${rango(valor('PROGRESION_CARGA_TREN_INFERIOR'))} % (tren inferior)`;
    return valor('PROGRESION_DOBLE')
      ? `Doble progresión: cuando completes el rango alto de repeticiones en todas las series con buena técnica, sube la carga ${cargas} y vuelve al rango bajo.`
      : `Sube la carga ${cargas} cuando el ejercicio te resulte fácil con buena técnica.`;
  }

  function descarga() {
    const p = valor('DESCARGA_REDUCCION_VOLUMEN_PORCENTAJE');
    return `Cada ${rango(valor('DESCARGA_INTERVALO_SEMANAS'))} semanas, o cuando el rendimiento caiga ${valor('DESCARGA_CAIDAS_DE_RENDIMIENTO_SESIONES')} sesiones seguidas, reduce el volumen ${p === 50 ? 'a la mitad' : `al ${p} %`} durante ${semanas(valor('DESCARGA_DURACION_SEMANAS'))} manteniendo la carga.`;
  }

  const IDS = ['INTENSIDAD_REPETICIONES_PRINCIPAL', 'INTENSIDAD_PORCENTAJE_1RM', 'INTENSIDAD_RIR', 'INTENSIDAD_REPETICIONES_MAX_AISLAMIENTO',
    'PROGRESION_CARGA_TREN_SUPERIOR', 'PROGRESION_CARGA_TREN_INFERIOR', 'PROGRESION_DOBLE',
    'DESCARGA_INTERVALO_SEMANAS', 'DESCARGA_CAIDAS_DE_RENDIMIENTO_SESIONES', 'DESCARGA_REDUCCION_VOLUMEN_PORCENTAJE', 'DESCARGA_DURACION_SEMANAS'];

  // Fuentes (ids de KNOWLEDGE.SOURCES) de las reglas activas de estos textos, para el perfil dado.
  function fuentesDeTextos(perfil) {
    const ids = new Set();
    IDS.map(id => REGISTRO.regla(id)).filter(r => REGISTRO.estaActiva(r, perfil)).forEach(r => r.fuentes.forEach(f => ids.add(f)));
    return [...ids].sort();
  }

  return { intensidad, progresion, descarga, fuentesDeTextos, IDS };
});
