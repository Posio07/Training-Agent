/* EN CONSTRUCCIÓN · núcleo v2 (B-039, paso 3.4). Este módulo NO está conectado a la interfaz ni al motor actual: el PR del corte lo
 * conecta (docs/specs/validador-fase3.md, A4, A5 y A6; DEC-009, DEC-011, DEC-034).
 *
 * Reglas que dependen de lo que se registra durante la sesión, como funciones puras:
 *   - A5, back-off válido: un back-off pesa 90 % o menos del top set de esa sesión; si pesa igual o más, se guarda como serie de trabajo.
 *   - A6, bandera de dolor por zona (lumbar, hombro, rodilla) con escala 0-10: marca con dolor sobre el umbral, se limpia con dos sesiones
 *     distintas seguidas sin pasarse, y a las 2 sesiones con dolor en 28 días se recomienda consultar a un profesional (DEC-011).
 *     Con la zona marcada, los ejercicios de demanda alta en esa zona no reciben top set ni progresión de carga, y se propone cambiarlos por
 *     variantes de demanda menor del mismo patrón, con confirmación del usuario (nunca se cambia solo).
 *   - A4, tope de hombro: solo con la bandera de hombro activa, máximo dos ejercicios de demanda alta de hombro por sesión (aviso).
 * El dolor por serie no sale del dispositivo (DEC-009): estas funciones no lo exportan ni lo guardan; el llamador decide dónde vive. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./registro.js'), require('./catalogo.js'), require('./sesion.js'));
  else root.CORE_V2_DOLOR = factory(root.CORE_V2_REGISTRO, root.CORE_V2_CATALOGO, root.CORE_V2_SESION);
})(typeof self !== 'undefined' ? self : this, function (REGISTRO, CATALOGO, SESION) {
  'use strict';

  const valor = id => REGISTRO.valor(id);
  const ZONAS = ['lumbar', 'hombro', 'rodilla'];
  const ETIQUETA_ZONA = { lumbar: 'la zona lumbar', hombro: 'el hombro', rodilla: 'la rodilla' };
  const NIVELES = ['ninguna', 'baja', 'media', 'alta'];
  const ORDEN_NIVEL = NIVELES.reduce((o, n, i) => Object.assign(o, { [n]: i }), {});

  /* ---------- A5: back-off válido ---------- */

  // Un back-off es válido si pesa 90 % o menos del top set: 100 − la reducción de DEC-002 (BACKOFF_REDUCCION_PORCENTAJE).
  function clasificarBackoff(pesoBackoff, pesoTopSet) {
    const maximo = pesoTopSet * (100 - valor('BACKOFF_REDUCCION_PORCENTAJE')) / 100;
    const valida = !(pesoTopSet > 0) || !(pesoBackoff > 0) || pesoBackoff <= maximo + 1e-9;
    return { valida, tipo: valida ? 'backoff' : 'normal', maximo: pesoTopSet > 0 ? Math.round(maximo * 100) / 100 : null };
  }

  // Las series registradas de UN ejercicio en UNA sesión: los back-offs que pesan más de lo permitido pasan a serie de trabajo (`normal`) y
  // el aviso lo dice. No muta las filas recibidas. Sin top set en la sesión no hay con qué comparar y no cambia nada.
  function corregirBackoffs(filas) {
    const tops = (filas || []).filter(f => f.setType === 'top' && f.weight > 0).map(f => f.weight);
    const top = tops.length ? Math.max(...tops) : 0;
    const avisos = [];
    const out = (filas || []).map(f => {
      if (f.setType !== 'backoff' || !top) return f;
      const c = clasificarBackoff(f.weight, top);
      if (c.valida) return f;
      avisos.push({ regla: 'A5', setNumber: f.setNumber, texto: `Un back-off debe pesar ${c.maximo} o menos (90 % del top set de ${top}); esta serie pesa ${f.weight} y se guarda como serie de trabajo.` });
      return Object.assign({}, f, { setType: 'normal' });
    });
    return { filas: out, avisos };
  }

  /* ---------- A6: bandera de dolor por zona ---------- */

  const dias = (desde, hasta) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000);
  const recientes = (rec, hoy) => ((rec && rec.sesionesConDolor) || []).filter(s => { const e = dias(s.fecha, hoy); return e >= 0 && e <= valor('DOLOR_VENTANA_DIAS'); });

  // Registra una lectura de dolor (0-10) en el registro de una zona y devuelve el registro nuevo (no muta el anterior). Dolor SOBRE el umbral
  // marca la zona; se desmarca con dos sesiones DISTINTAS seguidas sin pasarse. Dos series con dolor de la misma sesión cuentan una vez.
  function aplicarLectura(rec, dolor, sesionId, hoy) {
    const prev = rec || {};
    const sig = { marcada: !!prev.marcada, sesionesLimpias: prev.sesionesLimpias || 0, ultimaSesion: prev.ultimaSesion || null, sesionesConDolor: (prev.sesionesConDolor || []).slice() };
    const nuevaSesion = sig.ultimaSesion !== sesionId;
    if (dolor > valor('UMBRAL_DOLOR_BANDERA')) {
      sig.marcada = true; sig.sesionesLimpias = 0;
      if (!sig.sesionesConDolor.some(s => s.sesionId === sesionId)) sig.sesionesConDolor.push({ sesionId, fecha: hoy });
    } else if (sig.marcada && nuevaSesion) {
      sig.sesionesLimpias += 1;
      if (sig.sesionesLimpias >= valor('DOLOR_SESIONES_LIMPIAS_DESMARCAR')) { sig.marcada = false; sig.sesionesLimpias = 0; }
    }
    sig.ultimaSesion = sesionId;
    sig.sesionesConDolor = recientes(sig, hoy);
    return sig;
  }

  // Las banderas de todas las zonas (`{ lumbar: registro, ... }`) con una lectura nueva. `lectura`: { zona, dolor }. No muta lo recibido.
  function registrarDolor(banderas, lectura, sesionId, hoy) {
    if (!ZONAS.includes(lectura.zona)) throw new Error('Zona inválida: ' + lectura.zona);
    return Object.assign({}, banderas, { [lectura.zona]: aplicarLectura((banderas || {})[lectura.zona], lectura.dolor, sesionId, hoy) });
  }

  const zonasMarcadas = banderas => ZONAS.filter(z => banderas && banderas[z] && banderas[z].marcada);

  // DEC-011: ¿recomendar consultar a un profesional? Sí con dolor sobre el umbral en 2 o más sesiones DISTINTAS dentro de las últimas 4
  // semanas, no necesariamente seguidas, haya o no marca activa.
  function recomendarProfesional(rec, hoy) {
    const sesiones = recientes(rec, hoy).length;
    return { recomendar: sesiones >= valor('DOLOR_SESIONES_MINIMAS'), sesiones };
  }

  const nivelEn = (cat, varianteId, zona) => ((cat.perfilArticularDe(varianteId)[zona] || {}).nivel) || 'ninguna';

  // Qué cambia en una sesión con zonas marcadas. Por cada ejercicio de demanda ALTA en una zona marcada: sin top set y sin progresión de
  // carga mientras siga marcada (DEC-009) y la lista de variantes de demanda menor del mismo patrón (habilitadas para el perfil y que no
  // están ya en la sesión), de menor a mayor demanda. Siempre `requiereConfirmacion`: la app propone, el usuario decide.
  function restriccionesPorDolor(planSesion, banderas, perfil, catalogo) {
    const cat = catalogo || CATALOGO;
    const marcadas = zonasMarcadas(banderas);
    const enSesion = new Set(planSesion.ejercicios.map(e => e.varianteId));
    const out = [];
    planSesion.ejercicios.forEach((e, indice) => {
      marcadas.forEach(zona => {
        if (nivelEn(cat, e.varianteId, zona) !== 'alta') return;
        const sustituciones = cat.VARIANTES
          .filter(v => v.patron === e.patron && v.id !== e.varianteId && !enSesion.has(v.id) && SESION.habilitada(v, perfil, cat) && ORDEN_NIVEL[nivelEn(cat, v.id, zona)] < ORDEN_NIVEL.alta)
          .map(v => ({ varianteId: v.id, nombre: v.nombre, nivel: nivelEn(cat, v.id, zona) }))
          .sort((a, b) => ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel]);
        out.push({
          indice, varianteId: e.varianteId, zona, sinTopSet: true, sinProgresion: true, sustituciones, requiereConfirmacion: true,
          texto: `Tienes marcado dolor en ${ETIQUETA_ZONA[zona]}: ${e.nombre} exige mucho a esa zona. ${sustituciones.length ? 'Te propongo cambiarlo por una variante más suave; tú decides.' : 'No hay una variante más suave disponible: puedes saltarlo o bajar la carga.'}`,
        });
      });
    });
    return out;
  }

  // A4: con la bandera de hombro activa, máximo dos ejercicios de demanda alta de hombro por sesión. Sin la bandera, nunca avisa.
  function avisoTopeHombro(planSesion, banderas, catalogo) {
    const cat = catalogo || CATALOGO;
    if (!zonasMarcadas(banderas).includes('hombro')) return null;
    const n = planSesion.ejercicios.filter(e => nivelEn(cat, e.varianteId, 'hombro') === 'alta').length;
    const max = valor('MAX_HOMBRO_ALTO_POR_SESION');
    return n > max ? { regla: 'A4', cantidad: n, maximo: max, texto: `Con dolor de hombro marcado, esta sesión tiene ${n} ejercicios que exigen mucho al hombro (lo recomendado es ${max} o menos).` } : null;
  }

  return { ZONAS, clasificarBackoff, corregirBackoffs, aplicarLectura, registrarDolor, zonasMarcadas, recomendarProfesional, restriccionesPorDolor, avisoTopeHombro };
});
