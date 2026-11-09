#!/usr/bin/env node
/* EN CONSTRUCCIÓN · núcleo v2, paso 3.10 (B-039). Prueba de aceptación del núcleo nuevo: evalúa, uno por uno, los criterios de aceptación de
 * `docs/specs/nucleo-v2.md` ("Criterios de aceptación") sobre el barrido de 360 planes (90 perfiles × 3, 4, 5 y 6 días) y escribe el informe.
 * Solo LEE: no corrige nada. Si un criterio no se cumple, el informe lo dice y la decisión es de Emanuel.
 *
 *   node scripts/aceptacion-nucleo-v2.js            imprime el informe (Markdown) en la salida estándar
 *   node scripts/aceptacion-nucleo-v2.js --escribir escribe docs/research/aceptacion-nucleo-v2.md
 *   node scripts/aceptacion-nucleo-v2.js --json     imprime el resultado como JSON
 *
 * Cada criterio devuelve { id, titulo, estado, resumen, detalle[] }: estado 'cumple', 'cumple con aviso' (se cumple porque el plan avisa, como pide la
 * spec), 'no cumple' o 'informe' (lo que se pide es reportar un número). `evaluar` es pura y se prueba con planes rotos a propósito
 * (tests/core-v2-aceptacion.test.js): cada criterio debe fallar si se rompe la regla. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.join(__dirname, '..', 'ifbb-pro-agent', 'js', 'core-v2');
const REG = require(path.join(raiz, 'registro.js'));
const CAT = require(path.join(raiz, 'catalogo.js'));
const REP = require(path.join(raiz, 'reparto.js'));
const SES = require(path.join(raiz, 'sesion.js'));
const PLAN = require(path.join(raiz, 'plan.js'));

const EPS = 1e-9;
const DIAS = [3, 4, 5, 6];
const ETQ = { chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', quads: 'Cuádriceps', hamstrings: 'Isquiotibiales', glutes: 'Glúteos', calves: 'Pantorrillas', biceps: 'Bíceps', triceps: 'Tríceps', abs: 'Abdomen' };
const pct = (n, t) => `${Math.round(n / t * 1000) / 10} %`;
const nombrePlan = f => `${f.d} días · ${f.p.sex}/${f.p.division}/${f.p.level}/${f.p.goal}${(f.p.laggingMuscles || []).length ? '/rezagados' : ''}`;

// El barrido: los 90 perfiles de `scripts/simular-reglas-articulares.js` × 3, 4, 5 y 6 días, con el reparto nuevo y el catálogo nuevo.
function barrido(perfiles, opciones) {
  const filas = [];
  DIAS.forEach(d => perfiles.forEach(p => {
    const pl = REP.generarPlan(Object.assign({}, p, { daysPerWeek: d }), opciones);
    filas.push({ d, p, pl, claves: REP.SPLITS[d].map(x => x[1]) });
  }));
  return filas;
}

const tipoDe = (f, i) => REP.TIPOS[f.claves[i]];
const variante = id => CAT.variantePorId(id);
const a2Permitido = f => !!f.p.barbellRow; // A2: con el remo con barra elegido el aviso es la salida (no la restricción)

/* ---------- Criterios ---------- */
function evaluar(filas, ctx) {
  const T = filas.length, c = ctx || {};
  const out = [];
  const crit = (id, titulo, viol, opciones) => {
    const o = opciones || {};
    const estado = o.estado || (viol.length ? 'no cumple' : 'cumple');
    out.push({ id, titulo, estado, resumen: o.resumen || (viol.length ? `${viol.length} caso(s) lo incumplen` : `0 incumplimientos en ${o.sobre || T + ' planes'}`), detalle: viol.slice(0, 8).map(x => (typeof x === 'string' ? x : JSON.stringify(x))).concat(o.extra || []) });
  };

  // 1. Ninguna sesión supera su capacidad en minutos sin la aceptación explícita del usuario.
  {
    const v = [];
    filas.forEach(f => f.pl.sesiones.forEach(s => { if (s.minutos > s.capacidadMin + EPS) v.push(`${nombrePlan(f)} · ${s.nombre}: ${Math.round(s.minutos * 10) / 10} min de ${s.capacidadMin}`); }));
    crit(1, 'Ninguna sesión supera su capacidad en minutos sin la aceptación explícita del usuario', v, { sobre: `${filas.reduce((a, f) => a + f.pl.sesiones.length, 0)} sesiones` });
  }
  // 2. Todo día de tirón tiene tirón vertical y horizontal, y su top set es un tirón.
  {
    const v = []; let dias = 0, conTop = 0;
    filas.forEach(f => f.pl.sesiones.forEach((s, i) => {
      if (!/^tiron/.test(f.claves[i])) return; dias++;
      const pats = s.ejercicios.map(e => e.patron);
      if (!pats.includes('tiron_vertical') || !pats.includes('tiron_horizontal')) v.push(`${nombrePlan(f)} · ${s.nombre}: patrones ${[...new Set(pats)].join(', ')}`);
      s.ejercicios.filter(e => e.topSet).forEach(e => { conTop++; if (!/^tiron/.test(e.patron)) v.push(`${nombrePlan(f)} · ${s.nombre}: top set en ${e.patron}`); });
    }));
    crit(2, 'Todo día de tirón tiene tirón vertical y horizontal, y su top set es un tirón', v, { sobre: `${dias} días de tirón (${conTop} con top set: solo en definición, DEC-002)` });
  }
  // 3. Ninguna sesión tiene el top set fuera del patrón principal de su tipo.
  {
    const v = []; let conTop = 0;
    filas.forEach(f => f.pl.sesiones.forEach((s, i) => s.ejercicios.filter(e => e.topSet).forEach(e => { conTop++; if (e.patron !== tipoDe(f, i).principal) v.push(`${nombrePlan(f)} · ${s.nombre}: top set en ${e.patron}, principal ${tipoDe(f, i).principal}`); })));
    crit(3, 'Ninguna sesión tiene el top set fuera del patrón principal de su tipo', v, { sobre: `${conTop} top sets` });
  }
  // 4. La rutina corta cabe en el tiempo fijado, con los patrones obligatorios primero; si no caben todos, el aviso lo dice.
  {
    const v = []; let n = 0, conAviso = 0;
    const minutos = c.minutosCortos || [20, 30, 45];
    filas.forEach(f => f.pl.sesiones.forEach((s, i) => minutos.forEach(m => {
      n++;
      const r = SES.sesionConTiempo(Object.assign({}, f.p, { daysPerWeek: f.d }), i, m);
      if (r.minutos > m + EPS) v.push(`${nombrePlan(f)} · ${s.nombre} con ${m} min: ${Math.round(r.minutos * 10) / 10} min`);
      const pats = new Set(r.ejercicios.map(e => e.patron)), falt = new Set((r.faltantes || []).map(x => x.patron));
      if (falt.size) conAviso++;
      tipoDe(f, i).obligatorios.forEach(p => { if (!pats.has(p) && !falt.has(p)) v.push(`${nombrePlan(f)} · ${s.nombre} con ${m} min: falta ${p} sin aviso`); });
      // Los obligatorios entran primero: si cabe algún ejercicio, ninguno no obligatorio puede haber desplazado a un obligatorio (todo obligatorio ausente está en `faltantes`).
      if (falt.size && r.avisos.length !== falt.size) v.push(`${nombrePlan(f)} · ${s.nombre} con ${m} min: avisos ≠ faltantes`);
    })));
    crit(4, 'La rutina corta cabe en el tiempo fijado, con los patrones obligatorios primero; si no caben todos, el aviso lo dice', v, { sobre: `${n} rutinas cortas (${minutos.join(', ')} min por cada sesión), ${conAviso} con aviso de patrones que no caben. Mide que todo patrón obligatorio del tipo esté o esté avisado: que los obligatorios entren primero es la estructura del reparto (paso 3), que aquí no se puede observar desde la salida` });
  }
  // 5. Ninguna sesión por defecto tiene dos ejercicios de lumbar alta.
  {
    const v = [];
    filas.forEach(f => f.pl.sesiones.forEach(s => { const n = s.ejercicios.filter(e => (CAT.perfilArticularDe(e.varianteId).lumbar || {}).nivel === 'alta').length; if (n > REG.valor('MAX_LUMBAR_ALTA_POR_SESION') && !a2Permitido(f)) v.push(`${nombrePlan(f)} · ${s.nombre}: ${n} de lumbar alta`); }));
    crit(5, 'Ninguna sesión por defecto tiene dos ejercicios de lumbar alta', v);
  }
  // 6. Ningún músculo supera 11 series fraccionadas por sesión (DEC-025), o queda sin cubrir con el aviso único.
  {
    const R1 = REG.valor('MAX_SERIES_FRACCIONADAS_MUSCULO_SESION'); const exceden = [], sinAviso = [];
    filas.forEach(f => f.pl.sesiones.forEach(s => Object.entries(s.fraccionado).forEach(([m, x]) => {
      if (x <= R1 + EPS) return;
      const hay = (f.pl.avisos.r1Excedido || []).some(a => a.sesion === s.nombre && a.musculos.some(y => y.musculo === m));
      const fila = `${nombrePlan(f)} · ${s.nombre}: ${ETQ[m]} ${x}`;
      exceden.push(fila); if (!hay) sinAviso.push(fila);
    })));
    const estado = sinAviso.length ? 'no cumple' : (exceden.length ? 'cumple con aviso' : 'cumple');
    crit(6, 'Ningún músculo supera 11 series fraccionadas por sesión (DEC-025), o queda sin cubrir con el aviso único', sinAviso, {
      estado, resumen: exceden.length ? `${exceden.length} caso(s) por encima de 11 (de ${filas.reduce((a, f) => a + f.pl.sesiones.length, 0)} sesiones): ${sinAviso.length} sin aviso. Los que pasan de 11 lo hacen porque una demanda mínima gana sobre R1 (DEC-025, punto 4), y el plan lo anota en \`avisos.r1Excedido\`; leído al pie de la letra, el criterio dice que ninguno debería pasar` : '0 sesiones por encima de 11',
      extra: exceden.slice(0, 3).map(x => `ejemplo por encima de 11: ${x}`),
    });
  }
  // 7. Porcentaje de planes en que R1 deja necesidad semanal sin cubrir, por músculo y por número de días.
  {
    const con = filas.filter(f => Object.values(f.pl.semanal).some(x => x.causa === 'R1'));
    const tabla = ['| Músculo | Total | 3 días | 4 días | 5 días | 6 días |', '| --- | --- | --- | --- | --- | --- |'];
    REP.MUSCULOS.forEach(m => {
      const por = d => filas.filter(f => f.d === d && f.pl.semanal[m].causa === 'R1').length, tot = filas.filter(f => f.pl.semanal[m].causa === 'R1').length;
      tabla.push(`| ${ETQ[m]} | ${tot} (${pct(tot, T)}) | ${DIAS.map(d => `${por(d)} de ${filas.filter(f => f.d === d).length}`).join(' | ')} |`);
    });
    out.push({ id: 7, titulo: 'Porcentaje de planes (de los 360) en que R1 deja necesidad semanal sin cubrir, por músculo y por número de días', estado: 'informe', resumen: `${con.length} de ${T} planes (${pct(con.length, T)}) con algún músculo sin cubrir por R1; Emanuel lo revisa`, detalle: [], tabla: tabla.join('\n') });
  }
  // 8. La aceptación de una sesión se guarda en el plan y caduca al regenerarlo o al cambiar tiempo, días u objetivo.
  {
    const v = []; let n = 0;
    filas.forEach((f, k) => {
      if (k % 6) return; n++; // una de cada seis: cada plan guardado cuesta una regeneración
      const perfil = Object.assign({}, f.p, { daysPerWeek: f.d });
      const g = PLAN.crearPlan(perfil, { id: 'a', ahora: '2026-11-09' });
      const ac = PLAN.aceptarSesion(g, 0, '2026-11-09');
      if (!ac.aceptaciones.length || ac.aceptaciones[0].planId !== 'a') v.push(`${nombrePlan(f)}: no se guarda en el plan`);
      if (g.aceptaciones.length) v.push(`${nombrePlan(f)}: aceptar muta el plan recibido`);
      if (!PLAN.aceptacionVigente(ac, perfil, 0)) v.push(`${nombrePlan(f)}: no vigente justo después de aceptar`);
      if (PLAN.aceptacionVigente(Object.assign({}, ac, { id: 'otro' }), perfil, 0)) v.push(`${nombrePlan(f)}: vigente en un plan regenerado (otro id)`);
      if (PLAN.regenerar(perfil, { id: 'b', ahora: '2026-11-10' }).aceptaciones.length) v.push(`${nombrePlan(f)}: regenerar conserva la aceptación`);
      const cambios = { tiempo: Object.assign({}, perfil, { tiempoDisponibleMin: 40 }), dias: Object.assign({}, perfil, { daysPerWeek: f.d === 6 ? 5 : f.d + 1 }), objetivo: Object.assign({}, perfil, { goal: perfil.goal === 'cut' ? 'bulk' : 'cut' }) };
      Object.entries(cambios).forEach(([k2, p2]) => { if (PLAN.aceptacionVigente(ac, p2, 0)) v.push(`${nombrePlan(f)}: sigue vigente al cambiar ${k2}`); });
      if (!PLAN.aceptacionVigente(ac, Object.assign({}, perfil, { name: 'Otro', weightKg: 99 }), 0)) v.push(`${nombrePlan(f)}: caduca por un cambio que no es de tiempo, días u objetivo`);
    });
    crit(8, 'La aceptación de una sesión se guarda en el plan y caduca al regenerarlo o al cambiar tiempo, días u objetivo del perfil', v, { sobre: `${n} planes (uno de cada seis del barrido)` });
  }
  // 9. La frecuencia y las garantías de DEC-014, DEC-017 y DEC-020 se cumplen, o el usuario ve el aviso único.
  {
    const vPiso = [], vReal = [], vFrec = []; let sinAvisoPiso = 0, frecAvisada = 0;
    const frecMin = REG.valor('FRECUENCIA_MINIMA_GRUPOS_MAYORES');
    filas.forEach(f => {
      const av = f.pl.avisoUnico, lista = av ? av.sinCubrir.map(x => x.musculo) : [];
      REP.MUSCULOS.forEach(m => {
        const x = f.pl.semanal[m];
        if (x.cubierto < x.piso - EPS && !lista.includes(m)) { vPiso.push(`${nombrePlan(f)} · ${ETQ[m]}: ${x.cubierto} de ${x.piso} sin aviso`); sinAvisoPiso++; }
        if (x.faltaReal > EPS && !lista.includes(m)) vReal.push(`${nombrePlan(f)} · ${ETQ[m]}: faltan ${x.faltaReal} series directas sin aviso`);
        if (REP.GRUPOS_MAYORES.includes(m) && x.sesiones < frecMin) {
          if (av && (av.frecuenciaBaja || []).some(y => y.musculo === m)) frecAvisada++; // DEC-036: la frecuencia es un aviso dentro del aviso único
          else vFrec.push(`${nombrePlan(f)} · ${ETQ[m]}: ${x.sesiones} sesión(es) por semana sin aviso`);
        }
      });
    });
    const v = vPiso.concat(vReal);
    out.push({
      id: 9, titulo: 'La frecuencia y las garantías de DEC-014, DEC-017 y DEC-020 se cumplen, o el usuario ve el aviso único',
      estado: v.length || vFrec.length ? 'no cumple' : (frecAvisada ? 'cumple con aviso' : 'cumple'),
      resumen: `Pisos (DEC-014/017/020: ${REG.valor('PISO_SEMANAL_GRUPO')} series fraccionadas por semana para los grupos mayores, ${REG.valor('FACTOR_PISO_MANTENIMIENTO') * REG.valor('PISO_SEMANAL_GRUPO')} con énfasis reducido, ${REG.valor('MINIMO_SEMANAL_GRUPO_CHICO')} los chicos) y series reales: ${v.length} sin aviso. Frecuencia mínima de ${frecMin} sesiones por semana en los grupos mayores: ${frecAvisada} caso(s) por debajo con aviso en el aviso único (DEC-036, aviso y no restricción) y ${vFrec.length} sin aviso`,
      detalle: v.slice(0, 5).concat(vFrec.slice(0, 5)),
    });
  }
  // 10. Los ejercicios prioritarios aparecen en todos los días de su patrón, salvo restricción de seguridad avisada.
  {
    const v = []; let n = 0, dias = 0;
    const PRIO = c.prioritarios || ['quads.squat_back', 'chest.bench_press_barbell', 'back.lat_pulldown'];
    filas.forEach((f, k) => {
      if (k % 4) return; n++;
      const pl = REP.generarPlan(Object.assign({}, f.p, { daysPerWeek: f.d, prioritarios: PRIO }));
      const seguridad = new Set((pl.avisos.seguridad || []).map(x => x.varianteId)), sinLugar = new Set(pl.avisos.prioritariosSinLugar || []);
      PRIO.forEach(id => {
        const pat = variante(id).patron;
        pl.sesiones.forEach((s, i) => {
          const T2 = REP.TIPOS[f.claves[i]];
          if (!T2.obligatorios.includes(pat) || T2.excluidos.includes(pat)) return; dias++;
          if (!s.ejercicios.some(e => e.varianteId === id) && !seguridad.has(id) && !sinLugar.has(id)) v.push(`${nombrePlan(f)} · ${s.nombre}: falta ${id}`);
        });
      });
    });
    crit(10, 'Los ejercicios prioritarios aparecen en todos los días de su patrón, salvo restricción de seguridad avisada', v, { sobre: `${n} planes (uno de cada cuatro) con 3 prioritarios (${PRIO.join(', ')}), ${dias} días de su patrón` });
  }
  // 11. El patrón principal de cada sesión tiene al menos 4 series de trabajo, o el aviso único dice que no cupo en el tiempo (DEC-029).
  {
    const MIN = REG.valor('SERIES_MIN_PATRON_PRINCIPAL'), v = []; let reducidos = 0;
    filas.forEach(f => f.pl.sesiones.forEach((s, i) => {
      const pr = tipoDe(f, i).principal, ex = s.ejercicios.filter(e => e.patron === pr), series = ex.reduce((a, e) => a + e.series, 0);
      if (series >= MIN) return;
      const av = f.pl.avisos, dicho = (av.principalReducido || []).some(x => x.sesion === s.nombre) || (av.obligatoriosSinLugar || []).some(x => x.sesion === s.nombre && x.patron === pr);
      if (dicho) reducidos++; else v.push(`${nombrePlan(f)} · ${s.nombre}: ${pr} con ${series} series sin aviso`);
    }));
    crit(11, 'El patrón principal de cada sesión tiene al menos 4 series de trabajo, o el aviso único dice que no cupo en el tiempo (DEC-029)', v, { sobre: `${filas.reduce((a, f) => a + f.pl.sesiones.length, 0)} sesiones (${reducidos} con menos de ${MIN} series y aviso)` });
  }
  // 12. Todo grupo del perfil tiene por semana un ejercicio directo con 2 series o más, o el aviso único lo dice (DEC-029).
  {
    const MIN = REG.valor('EJERCICIO_DIRECTO_SEMANAL_MIN_SERIES'), v = []; let avisados = 0;
    filas.forEach(f => REP.MUSCULOS.forEach(m => {
      const tiene = f.pl.sesiones.some(s => s.ejercicios.some(e => e.grupo === m && e.series >= MIN));
      if (tiene) return;
      const dicho = (f.pl.avisos.sinDirecto || []).some(x => x.musculo === m) || (f.pl.avisoUnico && f.pl.avisoUnico.sinDirecto.some(x => x.musculo === m));
      if (dicho) avisados++; else v.push(`${nombrePlan(f)} · ${ETQ[m]}: sin ejercicio directo de ${MIN}+ series y sin aviso`);
    }));
    crit(12, 'Todo grupo del perfil tiene por semana un ejercicio directo con 2 series o más, o el aviso único lo dice (DEC-029)', v, { sobre: `${T * REP.MUSCULOS.length} grupo-planes (${avisados} con aviso)` });
  }
  // 13. Ningún ejercicio pasa de 5 series en una sesión, salvo que su patrón no tenga otra variante que quepa; el volumen total no baja (DEC-031).
  {
    const TOPE = REG.valor('MAX_SERIES_POR_EJERCICIO'), v = []; let sobre = 0, vol1 = 0, vol0 = 0;
    filas.forEach(f => {
      f.pl.sesiones.forEach(s => s.ejercicios.forEach(e => {
        if (e.series <= TOPE) return; sobre++;
        const dicho = (f.pl.avisos.topeExcedido || []).some(x => x.sesion === s.nombre && x.varianteId === e.varianteId);
        if (!dicho) v.push(`${nombrePlan(f)} · ${s.nombre}: ${e.varianteId} con ${e.series} series sin aviso`);
      }));
      vol1 += f.pl.sesiones.reduce((a, s) => a + s.series, 0);
      const sin = REP.generarPlan(Object.assign({}, f.p, { daysPerWeek: f.d }), { sinTopePorEjercicio: true });
      vol0 += sin.sesiones.reduce((a, s) => a + s.series, 0);
    });
    if (vol1 < vol0 - EPS) v.push(`el volumen total baja: ${vol1} series con el tope frente a ${vol0} sin él`);
    crit(13, 'Ningún ejercicio pasa de 5 series en una sesión, salvo que su patrón no tenga otra variante que quepa; el volumen total no baja (DEC-031)', v, { sobre: `${filas.reduce((a, f) => a + f.pl.sesiones.reduce((b, s) => b + s.ejercicios.length, 0), 0)} ejercicios (${sobre} con más de ${TOPE} series, todos avisados si la lista de incumplimientos está vacía); volumen: ${vol1} series con el tope, ${vol0} sin él. Salvedad: que un ejercicio avisado de verdad no tenga otra variante del patrón que quepa lo declara el reparto ("avisos.topeExcedido"); esta prueba no lo recalcula` });
  }
  // 14. No queda ningún número fuera del registro ni código muerto: lo calcula `revisarCodigo` (lectura del código), no el barrido.
  out.push(Object.assign({ id: 14, titulo: 'No queda ningún número fuera del registro ni código muerto' }, c.codigo || { estado: 'informe', resumen: 'no evaluado', detalle: [] }));
  // 15. El caso del 5 nov no reproduce el día de sentadilla y peso muerto rumano juntos (A3).
  {
    const v = []; let n = 0;
    filas.forEach(f => f.pl.sesiones.forEach(s => { n++; const pats = s.ejercicios.map(e => e.patron); if (pats.includes('sentadilla') && pats.includes('bisagra')) v.push(`${nombrePlan(f)} · ${s.nombre}: sentadilla y bisagra juntas`); }));
    const emanuel = c.casoCincoNov;
    if (emanuel) emanuel.pl.sesiones.forEach(s => { const ids = s.ejercicios.map(e => e.varianteId); if (ids.some(i => /squat/.test(i)) && ids.includes('hamstrings.rdl')) v.push(`caso del 5 nov · ${s.nombre}: sentadilla y peso muerto rumano juntos`); });
    crit(15, 'El caso del 5 nov no reproduce el día de sentadilla y peso muerto rumano juntos', v, { sobre: `${n} sesiones del barrido${emanuel ? ' y el perfil de Emanuel (pierna, definición, 4 días)' : ''}` });
  }
  return out;
}

/* ---------- Criterio 14: lectura del código ---------- */
// Decidido por Emanuel (2026-11-09): las exportaciones que nadie usa se borran en el corte; de las que solo usan los tests, se borran las que no prueban
// comportamiento real. Las listas están en docs/backlog/B-057.md. Si aparece una exportación sin uso que no está declarada, el criterio no cumple.
const DECLARADAS_PARA_BORRAR = [
  'almacen.js: `medicionInicial`', 'aviso.js: `ETIQUETAS`', 'aviso.js: `limitadaPorTiempo`', 'pantallas/entreno.js: `htmlSesion`', 'pantallas/entreno.js: `htmlEjercicio`', 'pantallas/entreno.js: `htmlAviso`',
  'pantallas/perfil.js: `prioritariasPosibles`', 'pantallas/progreso.js: `graficoFuerza`', 'plan.js: `CAMPOS_ACEPTACION`', 'plan.js: `perfilParaReparto`', 'plan.js: `firmaDelPerfil`', 'plan.js: `camposCambiados`', 'registro.js: `reglasActivas`',
  'almacen.js: `estadoVacio`', 'textos.js: `IDS`',
];
const SOLO_TESTS_QUE_SE_QUEDAN = [ // prueban comportamiento real: se conservan
  'aviso.js: `bloqueMinimoMin`', 'catalogo.js: `PATRONES`', 'dolor.js: `clasificarBackoff`', 'dolor.js: `aplicarLectura`', 'dolor.js: `zonasMarcadas`', 'pantallas/entreno.js: `avisosDelPlan`', 'pantallas/progreso.js: `variantesRegistradas`',
  'pantallas/progreso.js: `puntosDeFuerza`', 'pantallas/progreso.js: `htmlFuerza`', 'pantallas/progreso.js: `htmlHistorial`', 'pantallas/sesion.js: `htmlVariantes`', 'pantallas/sesion.js: `prepararSesion`', 'pantallas/sesion.js: `tipoDeSerie`',
  'pantallas/sesion.js: `htmlSerie`', 'pantallas/sesion.js: `htmlEjercicioSesion`', 'pantallas/sesion.js: `htmlResumen`', 'plan.js: `CAMPOS`', 'registro.js: `REGLAS`', 'reparto.js: `GRUPOS_CHICOS`', 'sesion.js: `ultimaVariante`',
];
// Números escritos en el código de core-v2 fuera del registro (se ignoran 0, 1, 2, -1, los índices y los que están en comentarios o cadenas) y funciones exportadas
// que nadie usa. Es una lectura aproximada: lista candidatos para que una persona los revise.
function revisarCodigo() {
  const directorio = raiz, archivos = [];
  const recorre = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) recorre(p); else if (e.name.endsWith('.js')) archivos.push(p); });
  recorre(directorio);
  const quita = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/\/\/.*$/gm, '').replace(/`(?:\\.|[^`\\])*`/g, m => m.replace(/\$\{[^}]*\}/g, m2 => `\u0001${m2}\u0002`).replace(/[^\n\u0001\u0002]/g, ' ')).replace(/'(?:\\.|[^'\\\n])*'/g, "''").replace(/"(?:\\.|[^"\\\n])*"/g, '""');
  const numeros = [], exportadas = [];
  archivos.forEach(f => {
    const rel = path.relative(path.join(__dirname, '..'), f), nombre = path.basename(f);
    if (['registro.js', 'perfilArticularVariantes.js'].includes(nombre) || /\/pantallas\//.test(f)) return; // el registro es para reglas de entrenamiento: las pantallas (interfaz) no cuentan
    const src = quita(fs.readFileSync(f, 'utf8')).replace(/\b\d(?:\.\d+)?e-\d+\b/g, ' '); // tolerancias numéricas (1e-9)
    src.split('\n').forEach((l, i) => {
      const t = l.replace(/\u0001[^\u0002]*\u0002/g, m => m.slice(1, -1));
      for (const m of t.matchAll(/(?<![\w.$#])(\d+(?:\.\d+)?)(?![\w.]*\w)/g)) { const x = Number(m[1]); if ([0, 1, 2, 60, 100, 1000, 3600, 86400000].includes(x) || (x === 10 && /Math\.round\(/.test(t))) continue; /* 10 en Math.round: redondeo de lo que se muestra */  /* 60, 1000, 3600 y 86400000: conversiones de unidad */ if (/e\.|^\s*\d+\s*:/.test(t.slice(Math.max(0, m.index - 2), m.index + 2))) continue; numeros.push({ archivo: rel, linea: i + 1, valor: m[1], texto: l.trim().slice(0, 110) }); }
    });
  });
  return { archivos: archivos.map(f => path.relative(path.join(__dirname, '..'), f)), numeros, exportadas };
}

function codigo() {
  const r = revisarCodigo();
  // Funciones exportadas sin ningún uso (fuera de su propio archivo y de los tests).
  const todos = {};
  r.archivos.forEach(f => { todos[f] = fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); });
  const leer = f => { try { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); } catch (e) { return ''; } };
  const app = ['ifbb-pro-agent/js/app.js', 'ifbb-pro-agent/js/engine.js', 'ifbb-pro-agent/js/sessionStore.js', 'ifbb-pro-agent/tests/pagina-nucleo-v2.html', 'scripts/vista-previa-reparto.js', 'scripts/snapshot-core-v2.js'].map(leer).join('\n');
  const tests = fs.readdirSync(path.join(__dirname, '..', 'ifbb-pro-agent', 'tests')).filter(t => /\.(js|html)$/.test(t)).map(t => leer('ifbb-pro-agent/tests/' + t)).join('\n');
  const sinUso = [], soloTests = [];
  r.archivos.forEach(f => {
    const m = todos[f].match(/return\s*\{([^}]*)\};\s*\}\);\s*$/);
    if (!m) return;
    m[1].split(',').map(s => s.trim().split(':')[0].trim()).filter(Boolean).forEach(nom => {
      const re = new RegExp(`\\b${nom}\\b`);
      const usado = r.archivos.some(g => g !== f && re.test(todos[g])) || re.test(app);
      if (!usado) (re.test(tests) ? soloTests : sinUso).push(`${f}: \`${nom}\``);
    });
  });
  const unicos = {}; r.numeros.forEach(n => { const k = `${n.archivo}|${n.valor}`; (unicos[k] = unicos[k] || n); });
  const lista = Object.values(unicos);
  const corto = x => x.replace('ifbb-pro-agent/js/core-v2/', '');
  const sinDeclarar = sinUso.concat(soloTests).map(corto).filter(x => !DECLARADAS_PARA_BORRAR.includes(x) && !SOLO_TESTS_QUE_SE_QUEDAN.includes(x));
  const declaradas = sinUso.concat(soloTests).map(corto).filter(x => DECLARADAS_PARA_BORRAR.includes(x));
  return {
    estado: lista.length || sinDeclarar.length ? 'no cumple' : (declaradas.length ? 'cumple con aviso' : 'cumple'),
    resumen: `${lista.length} número(s) de entrenamiento fuera del registro (no cuentan 0, 1, 2, 100, las conversiones de unidad, las tolerancias ni la interfaz); ${sinUso.length} exportación(es) que nadie usa y ${soloTests.length} que solo usan los tests: ${declaradas.length} declaradas para borrar en el corte (B-057), ${soloTests.length + sinUso.length - declaradas.length - sinDeclarar.length} que prueban comportamiento real y se conservan, ${sinDeclarar.length} sin declarar. Es una lectura automática: son candidatos, no veredictos`,
    detalle: ['por archivo: ' + Object.entries(lista.reduce((o, n) => { o[n.archivo] = (o[n.archivo] || 0) + 1; return o; }, {})).map(([a, k]) => `${a.replace('ifbb-pro-agent/js/core-v2/', '')} ${k}`).join(' · ')]
      .concat(lista.map(n => `número ${n.valor} en ${n.archivo}:${n.linea}  ${n.texto}`), sinUso.map(x => `sin uso: ${x}`), soloTests.map(x => `solo tests: ${x}`)),
    totales: { numeros: lista.length, sinUso: sinUso.length, soloTests: soloTests.length, sinDeclarar },
  };
}

/* ---------- Informe ---------- */
function informe(filas, resultados, extra) {
  const marca = { cumple: '✅', 'cumple con aviso': '⚠️', 'no cumple': '❌', informe: 'ℹ️' };
  const cuenta = e => resultados.filter(r => r.estado === e).length;
  const L = [];
  L.push('# Prueba de aceptación del núcleo v2 (paso 3.10, B-039)', '');
  L.push(`Generado por \`node scripts/aceptacion-nucleo-v2.js --escribir\`. Solo lee: **no corrige nada**. Si un criterio no se cumple, este informe lo dice y la decisión es de Emanuel.`, '');
  L.push(`Criterios de \`docs/specs/nucleo-v2.md\` ("Criterios de aceptación") evaluados sobre el barrido de **${filas.length} planes** (90 perfiles de \`scripts/simular-reglas-articulares.js\` × 3, 4, 5 y 6 días), con el reparto nuevo y el catálogo nuevo, sin cambiar el tiempo por defecto (${REG.valor('TIEMPO_DISPONIBLE_POR_DEFECTO_MIN')} min por sesión). Motor del plan guardado: \`${PLAN.VERSION_MOTOR}\`.`, '');
  L.push(`**Resultado: ${cuenta('cumple')} cumplen · ${cuenta('cumple con aviso')} cumplen con aviso · ${cuenta('no cumple')} no cumplen · ${cuenta('informe')} son un informe.**`, '');
  L.push('| # | Criterio | Resultado |', '| --- | --- | --- |');
  resultados.forEach(r => L.push(`| ${r.id} | ${r.titulo} | ${marca[r.estado]} ${r.estado} |`));
  L.push('');
  resultados.forEach(r => {
    L.push(`## ${r.id}. ${r.titulo}`, '', `**${marca[r.estado]} ${r.estado}.** ${r.resumen}.`, '');
    if (r.tabla) L.push(r.tabla, '');
    if (r.detalle && r.detalle.length) { r.detalle.forEach(d => L.push(`- ${d.replace(/\|/g, '\\|')}`)); L.push(''); }
  });
  if (extra) L.push(extra);
  return L.join('\n');
}

function ejecutar() {
  const { profiles } = require('./simular-reglas-articulares.js');
  const filas = barrido(profiles);
  const emanuelPerfil = require(path.join(__dirname, '..', 'ifbb-pro-agent', 'tests', 'fixtures', 'core-v2-plan-hashes.json')).perfiles.emanuel_legs_cut_4d;
  const casoCincoNov = emanuelPerfil ? { pl: REP.generarPlan(emanuelPerfil) } : null;
  const resultados = evaluar(filas, { codigo: codigo(), casoCincoNov });
  return { filas, resultados };
}

if (require.main === module) {
  const { filas, resultados } = ejecutar();
  const md = informe(filas, resultados);
  if (process.argv.includes('--json')) console.log(JSON.stringify(resultados, null, 2));
  else if (process.argv.includes('--escribir')) { fs.writeFileSync(path.join(__dirname, '..', 'docs', 'research', 'aceptacion-nucleo-v2.md'), md + '\n'); console.log('Escrito docs/research/aceptacion-nucleo-v2.md'); resultados.forEach(r => console.log(`${r.id}. ${r.estado} · ${r.titulo.slice(0, 80)}`)); }
  else console.log(md);
}

module.exports = { barrido, evaluar, codigo, informe, ejecutar };
