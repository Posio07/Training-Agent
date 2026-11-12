/* Sub-patrones del músculo (DEC-037, paso 1): el mapa del registro y la cobertura por sub-patrón que el plan expone.
 * En este paso NINGUNA regla usa la cobertura, así que el plan generado no cambia: eso lo fija la huella de los 10
 * perfiles de referencia en core-v2-plan.test.js. Acá se prueban el dato y el conteo. */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/core-v2/registro.js');
const C = require('../js/core-v2/catalogo.js');
const REP = require('../js/core-v2/reparto.js');

const MAPA = () => R.valor('SUB_PATRONES_POR_MUSCULO');
const OTROS = 'otros'; // clave reservada: aporta al músculo pero no cuenta para ninguna cuota
// Patrones que aportan a un músculo (peso > 0), sea como grupo del ejercicio o de forma indirecta.
const patronesQueAportan = m => [...new Set(C.VARIANTES.filter(v => REP.pesosDe(C, v.id)[m]).map(v => v.patron))];
const plan = d => REP.generarPlan(Object.assign({ sex: 'M', age: 30, heightCm: 178, weightKg: 85, activity: 'moderate', level: 'intermediate', division: 'general_m', goal: 'cut', daysPerWeek: 4 }, d));

/* ---------- El mapa ---------- */

test('DEC-037: el mapa abre los tres músculos decididos, con sus sub-patrones y sin inventar nombres', () => {
  assert.deepEqual(Object.keys(MAPA()).sort(), ['back', 'glutes', 'hamstrings']);
  assert.deepEqual(Object.keys(MAPA().glutes).sort(), ['abduccion_cadera', 'extension_cadera']);
  assert.deepEqual(Object.keys(MAPA().back).sort(), ['otros', 'tiron_horizontal', 'tiron_vertical']);
  assert.deepEqual(Object.keys(MAPA().hamstrings).sort(), ['bisagra_cadera', 'flexion_rodilla']);
  // La patada de glúteo es extensión de cadera, no abducción: solo la máquina de abducción cuenta como abducción.
  assert.deepEqual(MAPA().glutes.abduccion_cadera, ['abduccion_cadera']);
  assert.ok(MAPA().glutes.extension_cadera.includes('patada_gluteo'));
  // El pullover no es tirón vertical ni horizontal: queda sin cuota.
  assert.deepEqual(MAPA().back.otros, ['pullover']);
});

test('DEC-037: todo patrón que aporta a un músculo del mapa está en exactamente una lista (ningún patrón se cuela sin clasificar)', () => {
  Object.keys(MAPA()).forEach(m => {
    const listas = MAPA()[m];
    const clasificados = Object.values(listas).flat();
    assert.equal(new Set(clasificados).size, clasificados.length, `${m}: un patrón aparece en dos sub-patrones`);
    patronesQueAportan(m).forEach(p => assert.ok(clasificados.includes(p), `${m}: el patrón ${p} aporta al músculo y no está clasificado`));
    // Y ninguna lista nombra un patrón que no exista o que no aporte a ese músculo.
    clasificados.forEach(p => {
      assert.ok(C.PATRONES.some(x => x.id === p), `${m}: el patrón ${p} no existe en el catálogo`);
      assert.ok(patronesQueAportan(m).includes(p), `${m}: el patrón ${p} no aporta a ${m}`);
    });
  });
});

test('DEC-037: el mapa es una regla del registro, E4, con su DEC de origen y pendiente de validar', () => {
  const r = R.regla('SUB_PATRONES_POR_MUSCULO');
  assert.equal(r.nivel, 'E4');
  assert.equal(r.dec, 'DEC-037');
  assert.equal(r.estado, 'implementada', 'el reparto la lee para informar la cobertura');
  assert.match(r.nota, /[Pp]endiente de validar/);
  assert.deepEqual(r.fuentes, [], 'criterio de diseño: no cita una fuente que no se leyó');
});

/* ---------- La cobertura que expone el plan ---------- */

test('DEC-037: cada músculo del mapa expone su cobertura por sub-patrón, y los que no están en el mapa devuelven null', () => {
  const pl = plan({});
  Object.keys(MAPA()).forEach(m => {
    const por = pl.semanal[m].porSubPatron;
    assert.ok(por, `${m}: falta la cobertura por sub-patrón`);
    assert.deepEqual(Object.keys(por).sort(), Object.keys(MAPA()[m]).sort(), `${m}: sub-patrones`);
    Object.values(por).forEach(x => assert.deepEqual(Object.keys(x).sort(), ['cubierto', 'directas', 'sesiones']));
  });
  ['chest', 'shoulders', 'quads', 'calves', 'biceps', 'triceps', 'abs'].forEach(m => assert.equal(pl.semanal[m].porSubPatron, null, m));
});

test('DEC-037: la cobertura por sub-patrón suma exactamente la del músculo, en los 360 planes del barrido', () => {
  const { profiles } = require('../../scripts/perfiles-barrido.js');
  const r2 = v => Math.round(v * 100) / 100;
  let comprobados = 0;
  profiles.forEach(p => [3, 4, 5, 6].forEach(dias => {
    const pl = REP.generarPlan(Object.assign({}, p, { daysPerWeek: dias }));
    Object.keys(MAPA()).forEach(m => {
      const por = pl.semanal[m].porSubPatron;
      const suma = r2(Object.values(por).reduce((a, x) => a + x.cubierto, 0));
      assert.equal(suma, pl.semanal[m].cubierto, `${m}: la suma de los sub-patrones (${suma}) no da la cobertura del músculo (${pl.semanal[m].cubierto})`);
      const directas = Object.values(por).reduce((a, x) => a + x.directas, 0);
      assert.equal(directas, pl.semanal[m].directas, `${m}: series directas`);
      comprobados++;
    });
  }));
  assert.equal(comprobados, 360 * 3);
});

test('DEC-037: `sesiones` cuenta los días en que el sub-patrón aparece, sin contar dos veces un día con dos ejercicios del mismo sub-patrón', () => {
  // Perfil con isquios en dos días: la bisagra entra un día y la flexión de rodilla en dos.
  const pl = plan({ daysPerWeek: 4, level: 'advanced', goal: 'bulk' });
  const por = pl.semanal.hamstrings.porSubPatron;
  Object.entries(por).forEach(([sp, x]) => {
    const dias = pl.sesiones.filter(s => s.ejercicios.some(e => MAPA().hamstrings[sp].includes(e.patron) && REP.pesosDe(C, e.varianteId).hamstrings)).length;
    assert.equal(x.sesiones, dias, `hamstrings/${sp}`);
    assert.ok(x.sesiones <= pl.sesiones.length);
  });
});

/* ---------- El caso que motiva DEC-037 ---------- */

test('DEC-037 (caso clave, hoy FALLA el objetivo): el glúteo se cubre casi entero con abducción y la extensión de cadera queda sin series directas', () => {
  // Perfil medido el 2026-11-10: avanzado, volumen, physique_m, glúteo rezagado, 5 días, 75 min.
  const pl = plan({ level: 'advanced', goal: 'bulk', division: 'physique_m', laggingMuscles: ['glutes'], daysPerWeek: 5, tiempoDisponibleMin: 75 });
  const por = pl.semanal.glutes.porSubPatron;
  // Lo que el paso 1 deja medido y a la vista. Cuando el paso 2 de DEC-037 entre, estas dos líneas tienen que cambiar
  // de sentido: es el test que fija el problema para que la corrección se note.
  assert.ok(por.abduccion_cadera.cubierto > por.extension_cadera.cubierto * 5,
    `hoy la abducción cubre ${por.abduccion_cadera.cubierto} y la extensión ${por.extension_cadera.cubierto}`);
  assert.equal(por.extension_cadera.directas, 0, 'hoy no hay ninguna serie directa de extensión de cadera');
  // Y el objetivo semanal del glúteo pasa el umbral de la cuota que viene, así que el caso está en su alcance.
  assert.ok(pl.semanal.glutes.objetivo >= 8, `objetivo de glúteo ${pl.semanal.glutes.objetivo}`);
  // El tiempo no era la restricción: la sesión del día de bisagra sobra capacidad.
  const diaBisagra = pl.sesiones.find(s => /bisagra/.test(s.nombre));
  assert.ok(diaBisagra.minutos < diaBisagra.capacidadMin, `${diaBisagra.nombre}: ${diaBisagra.minutos} de ${diaBisagra.capacidadMin} min`);
});

test('DEC-037 (medición del caso): con un objetivo de 10 series de glúteo, hoy entran 11 abducciones (9 en un solo día) y ninguna serie directa de extensión', () => {
  // Novato, mantenimiento, división sin énfasis: el objetivo semanal del glúteo queda en 10 series.
  const pl = plan({ level: 'novice', goal: 'maintain', daysPerWeek: 4, tiempoDisponibleMin: 75 });
  const g = pl.semanal.glutes, por = g.porSubPatron;
  assert.equal(g.objetivo, 10, 'el caso es el del objetivo de 10 series');
  // Lo que hoy pasa, con los números exactos: toda la cobertura directa es abducción y la extensión de cadera no tiene
  // ningún ejercicio propio. El paso 2 de DEC-037 tiene que dar vuelta estas tres líneas.
  assert.equal(por.abduccion_cadera.directas, 11, 'hoy el glúteo se cubre con 11 series de abducción');
  assert.equal(por.extension_cadera.directas, 0, 'hoy no hay ninguna serie directa de extensión de cadera');
  const porDia = pl.sesiones.map(s => s.ejercicios.filter(e => e.patron === 'abduccion_cadera').reduce((a, e) => a + e.series, 0));
  assert.ok(Math.max(...porDia) >= 9, `abducciones por día: ${porDia.join(', ')}`);
});
