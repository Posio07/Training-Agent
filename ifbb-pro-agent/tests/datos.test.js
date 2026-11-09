/* Datos de ejercicio-músculo (DEC-012, DEC-013) y perfil articular (DEC-021): los CSV de `data/`, sus parsers y los
 * módulos generados. Son los datos que consume el catálogo del núcleo nuevo (`js/core-v2/catalogo.js`), así que estos
 * tests no dependen de ningún motor: antes vivían en engine.test.js, junto al catálogo que el corte borró.
 *
 * "Ejercicio base" es la entrada que describen los CSV; el catálogo nuevo la parte en una o más VARIANTES, cada una con
 * su `hereda` apuntando a la base (B-039). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const K = require('../js/knowledge.js');
const CAT = require('../js/core-v2/catalogo.js');
const MB = require('../../scripts/build-exercise-muscles.js');
const PA = require('../../scripts/build-perfil-articular.js');

const MUSCLE_IDS = Object.keys(K.MUSCLE_LABELS);
const SIN_APORTE = ['functional.farmer_carry']; // funcional sin aporte de hipertrofia (DEC-005, DEC-010): sin filas en el CSV
const csvText = () => fs.readFileSync(MB.CSV_PATH, 'utf8');
const bucketsText = () => fs.readFileSync(MB.BUCKETS_PATH, 'utf8');
const csvRows = () => { const p = MB.parseExerciseMuscles(csvText()); assert.deepEqual(p.errors, [], 'el CSV tiene errores de validación'); return p.rows; };
const csvBuckets = () => { const p = MB.parseBuckets(bucketsText()); assert.deepEqual(p.errors, [], 'el CSV de buckets tiene errores de validación'); return p.buckets; };
// Los ejercicios base del catálogo nuevo: el `hereda` de cada variante.
const catalogIds = () => [...new Set(CAT.VARIANTES.map(v => v.hereda))];
// Las relaciones de un ejercicio base, tal como las trae el CSV.
const relacionesDe = id => Object.fromEntries(csvRows().filter(r => r.exerciseId === id).map(r => [r.muscle, { relacion: r.relacion, evidencia: r.evidencia }]));
const directasDe = id => csvRows().filter(r => r.exerciseId === id && r.relacion === 'directa').map(r => r.muscle);
const paCsv = () => fs.readFileSync(PA.CSV_PATH, 'utf8');
const paCatalog = () => PA.catalogIdsFromBuckets(bucketsText());
const paRows = () => { const p = PA.parsePerfilArticular(paCsv(), paCatalog()); assert.deepEqual(p.errors, [], 'el CSV de perfil articular tiene errores'); return p.rows; };
const paCell = (id, j) => paRows().find(r => r.exerciseId === id && r.articulacion === j);
const JOINTS = ['lumbar', 'hombro', 'rodilla'];


/* ---------- DEC-010 / DEC-013: integridad de la tabla de aporte ---------- */

test('DEC-010: la tabla usa solo los 10 grupos, sin músculos repetidos, y el grupo donde vive el ejercicio es una relación directa', () => {
  const buckets = csvBuckets();
  catalogIds().forEach(id => {
    const rel = relacionesDe(id);
    Object.keys(rel).forEach(m => assert.ok(MUSCLE_IDS.includes(m), `${id}: músculo inválido ${m}`));
    if (SIN_APORTE.includes(id)) { assert.deepEqual(rel, {}, `${id}: declarado sin aporte`); return; }
    assert.ok(directasDe(id).length >= 1, `${id}: al menos una relación directa`);
    assert.ok(directasDe(id).includes(buckets[id]), `${id}: el grupo donde vive (${buckets[id]}) tiene que ser una relación directa`);
  });
  // Cada variante del catálogo nuevo hereda las filas de su base y declara el mismo grupo.
  CAT.VARIANTES.forEach(v => {
    assert.equal(CAT.grupoDe(v.id), buckets[v.hereda], `${v.id}: el grupo sale del bucket de su base`);
    assert.deepEqual(CAT.aportesDe(v.id).map(r => r.muscle).sort(), Object.keys(relacionesDe(v.hereda)).sort(), `${v.id}: mismos músculos que su base`);
  });
});

test('DEC-010: los ids y los nombres de las variantes del catálogo son únicos, y ninguna base queda sin variante', () => {
  const ids = CAT.VARIANTES.map(v => v.id), nombres = CAT.VARIANTES.map(v => v.nombre);
  assert.equal(new Set(ids).size, ids.length, 'ids repetidos');
  assert.equal(new Set(nombres).size, nombres.length, 'nombres repetidos');
  assert.deepEqual(catalogIds().slice().sort(), Object.keys(csvBuckets()).sort(), 'toda base del CSV tiene variante y al revés');
  // `patron` no sirve de id: se repite entre variantes.
  const patrones = CAT.VARIANTES.map(v => v.patron);
  assert.ok(new Set(patrones).size < patrones.length, 'si el patrón fuera único no haría falta id');
});
test('DEC-010: correcciones aprobadas de la tabla de aporte', () => {
  // "Aporta" = relación directa o indirecta; `ninguna` y `a_verificar` no suman (DEC-014).
  const aporta = (id, m) => { const r = relacionesDe(id)[m]; return !!r && r.relacion !== 'ninguna'; };
  assert.ok(!aporta('quads.squat_back_or_hack', 'abs'), 'sentadilla sin abs');
  assert.ok(!aporta('hamstrings.rdl', 'back'), 'peso muerto rumano sin back');
  assert.ok(!aporta('shoulders.press_overhead', 'chest'), 'press militar sin chest');
  assert.ok(!aporta('shoulders.press_landmine_neutral', 'chest'), 'press landmine sin chest');
  assert.ok(!aporta('glutes.kickback_cable', 'hamstrings'), 'patada de glúteo sin isquios');
  // DEC-013/014: hip thrust → isquios es 'ninguna' (verificado, 1 estudio): no suma.
  assert.equal(relacionesDe('glutes.hip_thrust').hamstrings.relacion, 'ninguna');
  assert.ok(Object.keys(relacionesDe('glutes.hip_thrust')).every(m => m === 'glutes' || !aporta('glutes.hip_thrust', m)), 'hip thrust solo aporta a glúteos');
  assert.deepEqual(relacionesDe('functional.farmer_carry'), {}, 'paseo del granjero sin ninguna fila (ni abs)');
});
test('DEC-013: el catálogo trae las relaciones del CSV (relacion, evidencia, fuente, nota y fecha) y el grupo de los buckets', () => {
  const rows = csvRows(), buckets = csvBuckets();
  CAT.VARIANTES.forEach(v => {
    const mine = rows.filter(r => r.exerciseId === v.hereda);
    const aportes = CAT.aportesDe(v.id);
    // Las filas viajan con el dato: mismos campos, con la marca `heredadoDe` cuando la variante es partida.
    assert.deepEqual(aportes.map(r => [r.muscle, r.relacion, r.evidencia, r.fuente, r.notes, r.review_date]),
      mine.map(r => [r.muscle, r.relacion, r.evidencia, r.fuente, r.notes, r.review_date]), `${v.id}: relaciones`);
    assert.equal(CAT.grupoDe(v.id), buckets[v.hereda], `${v.id}: grupo`);
  });
  assert.deepEqual(CAT.aportesDe(CAT.VARIANTES.find(v => v.hereda === 'functional.farmer_carry').id), [], 'el paseo del granjero no aporta');
});
test('DEC-013: cada ejercicio tiene al menos una relación directa, salvo el paseo del granjero (ninguna fila)', () => {
  const directas = {};
  csvRows().forEach(r => { if (r.relacion === 'directa') directas[r.exerciseId] = (directas[r.exerciseId] || 0) + 1; });
  catalogIds().forEach(id => {
    if (SIN_APORTE.includes(id)) assert.equal(directas[id] || 0, 0, `${id}: sin filas`);
    else assert.ok(directas[id] >= 1, `${id}: debería tener al menos una fila directa`);
  });
  // Ningún músculo repite en un mismo ejercicio.
  const seen = new Set();
  csvRows().forEach(r => { const k = `${r.exerciseId}|${r.muscle}`; assert.ok(!seen.has(k), `repetido: ${k}`); seen.add(k); });
});
test('DEC-012: todo exerciseId del CSV existe en el catálogo y viceversa (salvo los funcionales sin aporte declarados)', () => {
  const inCsv = new Set(csvRows().map(r => r.exerciseId));
  const inCatalog = new Set(catalogIds());
  [...inCsv].forEach(id => assert.ok(inCatalog.has(id), `el CSV tiene un exerciseId que no existe en el catálogo: ${id}`));
  const exempt = new Set(SIN_APORTE);
  [...inCatalog].forEach(id => {
    if (exempt.has(id)) assert.ok(!inCsv.has(id), `${id} está declarado sin aporte: no puede tener filas en el CSV`);
    else assert.ok(inCsv.has(id), `el ejercicio del catálogo no tiene filas en el CSV: ${id}`);
  });
  assert.deepEqual(SIN_APORTE, ['functional.farmer_carry'], 'el paseo del granjero es el único sin aporte');
  assert.ok(inCatalog.size === 36 && inCsv.size === 35);
});
test('DEC-013: el bucket es un campo único por ejercicio, separado de las relaciones, y coincide con el catálogo', () => {
  const buckets = csvBuckets();
  assert.deepEqual(Object.keys(buckets).sort(), catalogIds().sort(), 'todos los ejercicios del catálogo (y solo ellos) tienen bucket');
  catalogIds().forEach(id => {
    const v = CAT.VARIANTES.find(x => x.hereda === id);
    assert.equal(CAT.grupoDe(v.id), buckets[id], `${id}: el bucket del CSV tiene que ser el grupo donde vive en el catálogo`);
  });
  assert.equal(buckets['glutes.bulgarian_hip'], 'glutes', 'la búlgara de glúteo se programa en glúteo aunque sea directa de cuádriceps');
  assert.ok(!MB.COLUMNS.includes('bucket'), 'el bucket no es una columna de las relaciones');
  // Un ejercicio con bucket duplicado se rechaza.
  assert.match(MB.parseBuckets('exerciseId,bucket\nx,chest\nx,back\n').errors.join(' | '), /campo único/);
  assert.match(MB.parseBuckets('exerciseId,bucket\nx,rodilla\n').errors.join(' | '), /bucket inválido "rodilla"/);
});
test('DEC-013: no hay pesos a medida: ninguna columna numérica y las categorías son solo directa, indirecta o ninguna', () => {
  assert.deepEqual(MB.RELATIONS, ['directa', 'indirecta', 'ninguna']);
  assert.deepEqual(MB.COLUMNS, ['exerciseId', 'muscle', 'relacion', 'evidencia', 'fuente', 'notes', 'review_date']);
  assert.match(MB.parseExerciseMuscles(MB.COLUMNS.join(',') + ',peso\n').errors.join(' | '), /Columnas desconocidas: peso/);
  const src = fs.readFileSync(path.join(__dirname, '../js/exerciseMuscles.js'), 'utf8');
  assert.doesNotMatch(src, /"(peso|weight)"/);
});
test('DEC-012/013: relacion, evidencia, muscle y fecha solo tienen valores válidos; verificado y probable llevan fuente', () => {
  assert.deepEqual(MB.LEVELS, ['verificado', 'verificado (1 estudio)', 'probable', 'a_verificar']);
  assert.deepEqual(MB.MUSCLE_IDS.slice().sort(), Object.keys(K.MUSCLE_LABELS).sort(), 'los ids de músculo del script y de knowledge.js se desalinearon');
  csvRows().forEach(r => {
    const who = `${r.exerciseId} / ${r.muscle}`;
    assert.ok(MB.RELATIONS.includes(r.relacion), `${who}: relacion`);
    assert.ok(MB.LEVELS.includes(r.evidencia), `${who}: evidencia`);
    assert.ok(MB.MUSCLE_IDS.includes(r.muscle), `${who}: muscle`);
    assert.match(r.review_date, /^\d{4}-\d{2}-\d{2}$/, `${who}: review_date`);
    assert.ok(r.notes.length > 0, `${who}: toda fila lleva una nota`);
    if (MB.NEEDS_SOURCE.includes(r.evidencia)) assert.ok(r.fuente.length > 0, `${who}: ${r.evidencia} sin fuente`);
  });
});
test('DEC-012: una fuente citada tiene autor, año y título (no hay citas vacías o a medias en verificado/probable)', () => {
  csvRows().filter(r => r.evidencia !== 'a_verificar').forEach(r => {
    r.fuente.split(' | ').forEach(cite => {
      assert.match(cite, /^[^.]+ et al\.|^[A-ZÁÉÍÓÚ][^.]+\. \d{4}\./, `${r.exerciseId} / ${r.muscle}: cita sin autor y año: ${cite.slice(0, 60)}`);
      assert.match(cite, /\b(19|20)\d{2}\b/, `${r.exerciseId} / ${r.muscle}: cita sin año`);
      assert.ok(cite.length > 60, `${r.exerciseId} / ${r.muscle}: cita demasiado corta para tener título y revista`);
    });
  });
});
test('DEC-012: el parser lee igual un CSV con coma y uno con punto y coma (Excel en español: BOM y CRLF)', () => {
  const comma = MB.parseExerciseMuscles(csvText());
  assert.equal(comma.delimiter, ',');
  const table = MB.parseCsv(csvText(), ',');
  const quote = (c, d) => (new RegExp(`["${d}\\n\\r]`).test(c) ? '"' + c.replace(/"/g, '""') + '"' : c);
  const semicolon = '﻿' + table.map(r => r.map(c => quote(c, ';')).join(';')).join('\r\n') + '\r\n';
  const semi = MB.parseExerciseMuscles(semicolon);
  assert.equal(semi.delimiter, ';');
  assert.deepEqual(semi.errors, []);
  assert.deepEqual(semi.rows, comma.rows, 'coma y punto y coma tienen que dar las mismas filas');
  const crlf = MB.parseExerciseMuscles(table.map(r => r.map(c => quote(c, ',')).join(',')).join('\r\n'));
  assert.deepEqual(crlf.rows, comma.rows);
  assert.equal(comma.rows.length, 64);
  // Lo mismo con el CSV de buckets.
  const bt = MB.parseCsv(bucketsText(), ',');
  const bSemi = MB.parseBuckets('﻿' + bt.map(r => r.join(';')).join('\r\n') + '\r\n');
  assert.equal(bSemi.delimiter, ';');
  assert.deepEqual(bSemi.buckets, csvBuckets());
});
test('DEC-012: el parser respeta comillas, delimitadores y saltos de línea dentro de un campo', () => {
  const tricky = 'a;b "c", d\ne;f';
  const row = ['x.y', 'chest', 'directa', 'probable', tricky, 'nota, con "comillas"; y\nsalto', '2026-10-24'];
  for (const d of [',', ';']) {
    const q = c => '"' + c.replace(/"/g, '""') + '"';
    const text = MB.COLUMNS.join(d) + '\n' + row.map(q).join(d) + '\n';
    const p = MB.parseExerciseMuscles(text);
    assert.equal(p.delimiter, d);
    assert.deepEqual(p.errors, []);
    assert.equal(p.rows[0].fuente, tricky);
    assert.equal(p.rows[0].notes, 'nota, con "comillas"; y\nsalto');
  }
  assert.equal(MB.detectDelimiter('exerciseId;muscle;relacion'), ';');
  assert.equal(MB.detectDelimiter('exerciseId,muscle,relacion'), ',');
  assert.equal(MB.detectDelimiter('"a;b",c,d'), ',', 'un punto y coma dentro de comillas no cuenta como separador');
  assert.throws(() => MB.parseCsv('a,"b', ','), /comillas sin cerrar/);
});
test('DEC-012/013: el parser rechaza datos inválidos con un mensaje que dice la fila y el motivo', () => {
  const head = MB.COLUMNS.join(',') + '\n';
  const ok = 'quads.leg_press,quads,directa,verificado,"Autor A. 2020. Título. Revista 1:1",nota,2026-10-24\n';
  assert.deepEqual(MB.parseExerciseMuscles(head + ok).errors, []);
  const errs = line => MB.parseExerciseMuscles(head + line + '\n').errors.join(' | ');
  assert.match(errs('quads.leg_press,quads,primary,verificado,"S",n,2026-10-24'), /relacion inválida "primary"/);
  assert.match(errs('quads.leg_press,quads,directa,seguro,"S",n,2026-10-24'), /evidencia inválida "seguro"/);
  assert.match(errs('quads.leg_press,rodilla,directa,verificado,"S",n,2026-10-24'), /muscle inválido "rodilla"/);
  assert.match(errs('quads.leg_press,quads,directa,verificado,,n,2026-10-24'), /verificado sin fuente/);
  assert.match(errs('quads.leg_press,quads,directa,verificado (1 estudio),,n,2026-10-24'), /verificado \(1 estudio\) sin fuente/);
  assert.match(errs('quads.leg_press,quads,directa,probable,,n,2026-10-24'), /probable sin fuente/);
  assert.equal(MB.parseExerciseMuscles(head + 'quads.leg_press,quads,directa,a_verificar,,n,2026-10-24\n').errors.length, 0, 'a_verificar puede ir sin fuente');
  assert.equal(MB.parseExerciseMuscles(head + 'quads.leg_press,glutes,ninguna,a_verificar,,n,2026-10-24\n').errors.length, 0, 'ninguna es una relación válida');
  assert.match(errs('quads.leg_press,quads,directa,a_verificar,,n,24/10/2026'), /review_date debe ser AAAA-MM-DD/);
  assert.match(errs('quads.leg_press,quads,directa,a_verificar,,n,2026-13-45'), /review_date/);
  assert.match(errs(',quads,directa,a_verificar,,n,2026-10-24'), /exerciseId vacío/);
  assert.match(MB.parseExerciseMuscles(head + ok + ok).errors.join(' | '), /fila repetida/);
  assert.match(MB.parseExerciseMuscles('exerciseId,muscle\nx,y\n').errors.join(' | '), /Faltan columnas: relacion, evidencia, fuente, notes, review_date/);
  assert.match(MB.parseExerciseMuscles(MB.COLUMNS.join(',') + ',extra\n').errors.join(' | '), /Columnas desconocidas: extra/);
  assert.match(MB.parseExerciseMuscles('').errors.join(' | '), /vacío/);
  assert.throws(() => MB.buildFromCsvText(head + 'x,quads,primary,verificado,,n,2026-10-24\n', 'exerciseId,bucket\nx,quads\n'), /inválido/);
  assert.throws(() => MB.buildFromCsvText(head + ok, 'exerciseId,bucket\nx,rodilla\n'), /bucket inválido/);
});
test('DEC-012/013: ifbb-pro-agent/js/exerciseMuscles.js coincide con los CSV (si se edita uno sin regenerar el otro, falla)', () => {
  assert.equal(fs.readFileSync(MB.MODULE_PATH, 'utf8'), MB.buildFromCsvText(csvText(), bucketsText()),
    'el módulo está desactualizado: correr `node scripts/build-exercise-muscles.js`');
  const EM = require('../js/exerciseMuscles.js');
  assert.deepEqual(EM.rows, csvRows());
  assert.deepEqual(EM.buckets, csvBuckets());
});
test('DEC-013: los cambios de la fase son exactamente los aprobados, cada uno mueve la relación un paso', () => {
  const row = (id, m) => csvRows().find(r => r.exerciseId === id && r.muscle === m);
  // hip thrust → isquios: ninguna (Plotkin 2023, medición directa; prevalece sobre el EMG de Contreras 2015).
  const ht = row('glutes.hip_thrust', 'hamstrings');
  assert.deepEqual([ht.relacion, ht.evidencia], ['ninguna', 'verificado (1 estudio)']);
  assert.match(ht.fuente, /Plotkin DL et al\. 2023/);
  assert.match(ht.notes, /prevalece sobre el EMG/);
  // sentadilla y prensa → glúteo: indirecta.
  assert.equal(row('quads.squat_back_or_hack', 'glutes').relacion, 'indirecta');
  assert.equal(row('quads.leg_press', 'glutes').relacion, 'indirecta');
  assert.equal(row('quads.leg_press', 'glutes').evidencia, 'verificado (1 estudio)', 'la prensa tiene una sola medición (Kinoshita 2026)');
  // búlgara de glúteo → cuádriceps: directa; el bucket sigue siendo glúteo.
  const bq = row('glutes.bulgarian_hip', 'quads');
  assert.deepEqual([bq.relacion, bq.evidencia], ['directa', 'probable']);
  assert.match(bq.fuente, /Pelland JC et al\. 2026/);
  assert.equal(csvBuckets()['glutes.bulgarian_hip'], 'glutes');
  // pullover en polea: sin cambios (sigue directa de dorsal, a_verificar) y registrado como pendiente.
  const pu = row('back.pullover_cable', 'back');
  assert.deepEqual([pu.relacion, pu.evidencia], ['directa', 'a_verificar']);
  assert.match(pu.notes, /^PENDIENTE: .*Di Fonza 2026/);
  // abducción de cadera → glúteos: sigue directa (la única resonancia midió glúteo mayor +5 % y medio/menor +4 %); la etiqueta pasa a "verificado (1 estudio)" (2026-11-08).
  const ab = row('glutes.hip_abduction_machine', 'glutes');
  assert.deepEqual([ab.relacion, ab.evidencia], ['directa', 'verificado (1 estudio)']);
  assert.match(ab.notes, /glúteo mayor y medio\/menor/);
  // Umbral de evidencia: "verificado (1 estudio)" solo aparece en las filas que movió o confirmó un único estudio.
  assert.deepEqual(csvRows().filter(r => r.evidencia === 'verificado (1 estudio)').map(r => `${r.exerciseId}/${r.muscle}`).sort(),
    ['glutes.hip_abduction_machine/glutes', 'glutes.hip_thrust/hamstrings', 'quads.leg_press/glutes']);
});

/* ---------- DEC-021: perfil articular de todo el catálogo ---------- */

test('DEC-021: todo el catálogo tiene las tres articulaciones, con niveles válidos y sin filas de más', () => {
  const ids = catalogIds();
  assert.deepEqual(paCatalog().slice().sort(), ids.slice().sort(), 'el CSV de buckets y el catálogo listan los mismos ejercicios');
  assert.equal(paRows().length, ids.length * 3);
  assert.deepEqual(JOINTS, ['lumbar', 'hombro', 'rodilla']);
  ids.forEach(id => JOINTS.forEach(j => {
    const c = paCell(id, j);
    assert.ok(c, `${id}/${j}: falta la fila`);
    assert.ok(PA.LEVELS.includes(c.nivel), `${id}/${j}: nivel`);
  }));
  assert.deepEqual(PA.LEVELS.slice().sort(), ['alta', 'baja', 'media']);
  // Toda VARIANTE del catálogo nuevo tiene sus tres articulaciones (propias o heredadas de su base).
  CAT.VARIANTES.forEach(v => JOINTS.forEach(j => assert.ok(CAT.perfilArticularDe(v.id)[j], `${v.id}/${j}`)));
  // El paseo del granjero y los sustitutos por lesión también llevan perfil.
  ['functional.farmer_carry', 'shoulders.press_landmine_neutral'].forEach(id => JOINTS.forEach(j => assert.ok(paCell(id, j), `${id}/${j}`)));
});
test('DEC-021: el parser rechaza datos inválidos con la fila y el motivo, y exige perfil completo', () => {
  const head = PA.COLUMNS.join(',') + '\n';
  const ok = 'chest.bench_press_barbell,lumbar,baja,a_verificar,spec_inicial,no,,nota,2026-11-07\n';
  const ids = ['chest.bench_press_barbell'];
  const errs = (line, c) => PA.parsePerfilArticular(head + line + '\n', c || null).errors.join(' | ');
  assert.deepEqual(PA.parsePerfilArticular(head + ok, null).errors, []);
  assert.match(errs('chest.bench_press_barbell,cuello,baja,a_verificar,spec_inicial,no,,n,2026-11-07'), /articulacion inválida "cuello"/);
  assert.match(errs('chest.bench_press_barbell,lumbar,altísima,a_verificar,spec_inicial,no,,n,2026-11-07'), /nivel inválido/);
  assert.match(errs('chest.bench_press_barbell,lumbar,baja,verificado,spec_inicial,no,x,n,2026-11-07'), /evidencia inválida "verificado"/, 'una demanda articular nunca es verificado');
  assert.match(errs('chest.bench_press_barbell,lumbar,baja,probable,spec_inicial,no,,n,2026-11-07'), /probable sin fuente/);
  assert.match(errs('chest.bench_press_barbell,lumbar,baja,a_verificar,otro,no,,n,2026-11-07'), /origen inválido/);
  assert.match(errs('chest.bench_press_barbell,lumbar,baja,a_verificar,spec_inicial,quizá,,n,2026-11-07'), /ambiguo inválido/);
  assert.match(errs('chest.bench_press_barbell,lumbar,baja,a_verificar,criterio_e4,si,,,2026-11-07'), /ambigua necesita una nota/);
  assert.match(errs('chest.bench_press_barbell,lumbar,baja,a_verificar,spec_inicial,no,,n,07/11/2026'), /review_date/);
  assert.match(PA.parsePerfilArticular(head + ok + ok, null).errors.join(' | '), /fila repetida/);
  assert.match(errs('nada.nada,lumbar,baja,a_verificar,spec_inicial,no,,n,2026-11-07', ids), /no existe en el catálogo/);
  // Un ejercicio del catálogo sin alguna articulación no pasa en silencio.
  const missing = PA.parsePerfilArticular(head + ok, ids).errors.join(' | ');
  assert.match(missing, /chest\.bench_press_barbell: falta el perfil de hombro/);
  assert.match(missing, /chest\.bench_press_barbell: falta el perfil de rodilla/);
  assert.match(PA.parsePerfilArticular('exerciseId,articulacion\nx,y\n', null).errors.join(' | '), /Faltan columnas/);
  assert.match(PA.parsePerfilArticular(PA.COLUMNS.join(',') + ',peso\n', null).errors.join(' | '), /Columnas desconocidas: peso/);
  assert.throws(() => PA.buildFromCsvText(head + ok, ids), /inválido/);
});
test('DEC-021: ifbb-pro-agent/js/perfilArticular.js coincide con el CSV y llega al conocimiento', () => {
  assert.equal(fs.readFileSync(PA.MODULE_PATH, 'utf8'), PA.buildFromCsvText(paCsv(), paCatalog()), 'módulo desactualizado: correr `node scripts/build-perfil-articular.js`');
  const mod = require('../js/perfilArticular.js');
  assert.deepEqual(mod.rows, paRows());
  // El dato llega al catálogo nuevo: la variante no partida hereda la fila de su base tal cual.
  const c = paCell('hamstrings.rdl', 'lumbar');
  const v = CAT.VARIANTES.find(x => x.hereda === 'hamstrings.rdl');
  assert.equal(CAT.perfilArticularDe(v.id).lumbar.nivel, c.nivel);
});
test('DEC-021: la tabla inicial de la spec se transcribe tal cual en el catálogo; las variantes que la spec separa y el catálogo une se clasifican por la más exigente (regla 1)', () => {
  const spec = fs.readFileSync(path.join(__dirname, '../../docs/specs/validador-fase3.md'), 'utf8');
  const body = spec.split('| Ejercicio | Lumbar | Hombro | Rodilla |')[1].split('\n\n')[0];
  const specRows = Object.fromEntries(body.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| ---')).map(l => { const c = l.split('|').map(x => x.trim()); return [c[1], [c[2], c[3], c[4]]]; }));
  assert.equal(Object.keys(specRows).length, 18, 'la spec tiene 18 ejercicios iniciales');
  const equal = {
    'Sentadilla trasera': ['quads.squat_back_or_hack'], 'Peso muerto rumano': ['hamstrings.rdl'], 'Remo con barra inclinado': ['back.row_barbell'],
    'Sentadilla búlgara con mancuernas': ['functional.bulgarian_db', 'quads.lunge_or_bulgarian', 'glutes.bulgarian_hip'], 'Hip thrust con barra': ['glutes.hip_thrust'],
    'Press militar de pie': ['shoulders.press_overhead'], 'Prensa de piernas': ['quads.leg_press'], 'Extensión de cuádriceps': ['quads.leg_extension'],
    'Curl femoral tumbado o sentado': ['hamstrings.leg_curl'], 'Press de banca': ['chest.bench_press_barbell'], 'Press inclinado': ['chest.incline_press_db'],
    'Fondos en paralelas': ['chest.dip_or_machine_press', 'triceps.close_grip_or_dips'], 'Jalón al pecho': ['back.vertical_pull'], 'Dominadas': ['back.vertical_pull'],
    'Elevaciones laterales': ['shoulders.lateral_raise_db', 'shoulders.lateral_raise_cable'],
    'Remo con apoyo de pecho': ['back.row_chest_supported'],
  };
  Object.entries(equal).forEach(([name, ids]) => ids.forEach(id => {
    JOINTS.forEach((j, k) => { assert.equal(paCell(id, j).nivel, specRows[name][k], `${name} → ${id} / ${j}`); assert.equal(paCell(id, j).origen, 'spec_inicial', `${id}/${j}: origen`); });
  }));
  // Hack squat, press militar sentado y remo con apoyo de pecho son variantes dentro de una entrada del catálogo: gana la más exigente (regla 1 de desempate).
  const cell = (id, j) => paCell(id, j);
  assert.deepEqual(specRows['Hack squat (máquina)'], ['media', 'baja', 'alta']);
  assert.equal(cell('quads.squat_back_or_hack', 'lumbar').nivel, 'alta'); assert.match(cell('quads.squat_back_or_hack', 'lumbar').notes, /regla 1.*hack/i);
  assert.deepEqual(specRows['Press militar sentado con respaldo'], ['baja', 'alta', 'baja']);
  assert.equal(cell('shoulders.press_overhead', 'lumbar').nivel, 'media'); assert.match(cell('shoulders.press_overhead', 'lumbar').notes, /regla 1.*sentado/i);
  assert.deepEqual(specRows['Remo con apoyo de pecho'], ['baja', 'media', 'baja']);
  assert.equal(cell('back.row_cable', 'lumbar').nivel, 'media'); assert.match(cell('back.row_cable', 'lumbar').notes, /regla 1/i);
  assert.equal(cell('back.row_cable', 'hombro').nivel, 'media'); assert.equal(cell('back.row_cable', 'rodilla').nivel, 'baja');
});
test('DEC-021: probable en las articulaciones (decidido por Emanuel): solo con fuente y exactamente en las 5 celdas sin desempate; verificado no existe', () => {
  const rows = paRows();
  assert.ok(rows.every(r => ['probable', 'a_verificar'].includes(r.evidencia)), 'solo probable o a_verificar');
  assert.ok(rows.every(r => r.nivel && PA.LEVELS.includes(r.nivel)));
  const probables = rows.filter(r => r.evidencia === 'probable').map(r => `${r.exerciseId}/${r.articulacion}`).sort();
  assert.deepEqual(probables, ['back.vertical_pull/hombro', 'chest.bench_press_barbell/hombro', 'hamstrings.rdl/lumbar', 'quads.leg_extension/rodilla', 'quads.squat_back_or_hack/rodilla']);
  rows.filter(r => r.evidencia === 'probable').forEach(r => { assert.match(r.fuente, /PMID \d+/); assert.ok(!/Desempate/.test(r.notes), `${r.exerciseId}/${r.articulacion}: un nivel de desempate no es probable`); });
  // Las celdas con fuente cuyo nivel salió de un desempate, o que la fuente solo confirma de forma indirecta, siguen a_verificar.
  const withSource = rows.filter(r => r.fuente);
  assert.equal(withSource.length, 10);
  withSource.filter(r => r.evidencia === 'a_verificar').forEach(r => assert.match(r.notes, /sigue a_verificar/));
  // Las dos fuentes de "corrección" no se aplican: la tabla inicial manda.
  assert.equal(paCell('functional.bulgarian_db', 'rodilla').nivel, 'alta');
  assert.equal(paCell('functional.bulgarian_db', 'rodilla').evidencia, 'a_verificar');
  // Mismo límite en el parser: probable sin fuente y verificado se rechazan.
  const bad = (ev, f) => PA.parsePerfilArticular(paCsv().split('\n').map((l, k) => (k === 1 ? l.replace(/,(a_verificar|probable),/, `,${ev},`).replace(/,"?[^,]*PMID[^,]*"?,/, ',' + f + ',') : l)).join('\n'), paCatalog());
  assert.ok(PA.parsePerfilArticular(paCsv().replace(/^(chest\.bench_press_barbell,hombro,alta,)probable(,[^\n]*)$/m, '$1verificado$2'), paCatalog()).errors.length > 0, 'verificado se rechaza');
});
test('DEC-021: las reglas de desempate están en la spec y las 27 celdas ambiguas quedaron resueltas con lo que decidió Emanuel', () => {
  const rows = paRows();
  assert.equal(rows.filter(r => r.ambiguo === 'si').length, 0, 'ninguna celda queda ambigua');
  const spec = fs.readFileSync(path.join(__dirname, '../../docs/specs/validador-fase3.md'), 'utf8');
  assert.match(spec, /Reglas de desempate/);
  ['variante más exigente', 'torso inclinado más de 45° con carga externa', 'conflictos reales entre reglas', 'gana sobre la lectura literal', 'carga axial sin bisagra', 'Lumbar media exige carga relevante', 'Nunca se clasifica un ejercicio para conservar su función de sustituto', 'torso inclinado más de 45° con carga externa', 'conflictos reales', 'gana sobre la lectura literal'].forEach(t => assert.ok(spec.includes(t), `la spec dice: ${t}`));
  // Lo decidido, celda por celda (lumbar, hombro, rodilla).
  const decided = {
    'back.row_barbell': ['alta', 'media', 'baja'], 'calves.calf_raise_standing': ['media', 'baja', 'baja'], 'functional.farmer_carry': ['media', 'baja', 'baja'],
    'shoulders.lateral_raise_db': ['baja', 'media', 'baja'], 'shoulders.lateral_raise_cable': ['baja', 'media', 'baja'], 'biceps.curl_barbell': ['baja', 'baja', 'baja'],
    'triceps.pushdown_cable': ['baja', 'baja', 'baja'], 'back.pullover_cable': ['baja', 'media', 'baja'], 'chest.fly_cable_pecdeck': ['baja', 'media', 'baja'],
    'biceps.curl_incline': ['baja', 'media', 'baja'], 'shoulders.press_landmine_neutral': ['media', 'media', 'baja'], 'glutes.hip_thrust': ['media', 'baja', 'baja'],
    'functional.step_up': ['media', 'baja', 'alta'], 'glutes.kickback_cable': ['baja', 'baja', 'baja'], 'abs.hanging_leg_raise': ['media', 'media', 'baja'],
    'quads.squat_back_or_hack': ['alta', 'media', 'alta'], 'shoulders.press_overhead': ['media', 'alta', 'baja'], 'back.row_cable': ['media', 'media', 'baja'],
    'glutes.bulgarian_hip': ['media', 'baja', 'alta'], 'abs.crunch_or_wheel': ['media', 'media', 'baja'], 'shoulders.rear_delt_facepull': ['baja', 'media', 'baja'],
  };
  assert.equal(Object.keys(decided).length, 21);
  Object.entries(decided).forEach(([id, lv]) => JOINTS.forEach((j, k) => assert.equal(paCell(id, j).nivel, lv[k], `${id}/${j}`)));
  // Cada celda resuelta cita su regla; el press landmine no se clasifica por ser sustituto (regla 4).
  const resolved = rows.filter(r => /Emanuel, 2026-11-07|Decidido por Emanuel \(2026-11-07\)/.test(r.notes));
  assert.ok(resolved.length >= 27, `celdas con regla anotada: ${resolved.length}`);
  assert.match(paCell('shoulders.press_landmine_neutral', 'hombro').notes, /No se clasifica por su función de sustituto/);
  assert.ok(!/sustituto del press/i.test(paCell('shoulders.press_landmine_neutral', 'hombro').notes.replace('No se clasifica por su función de sustituto', '')));
});
test('DEC-021: los módulos generados se cargan en index.html antes del catálogo y están en la caché del service worker (offline)', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  ['js/exerciseMuscles.js', 'js/perfilArticular.js'].forEach(f => {
    assert.ok(html.indexOf(f) >= 0 && html.indexOf(f) < html.indexOf('js/core-v2/catalogo.js'), `index.html carga ${f} antes del catálogo`);
    assert.ok(sw.includes(`'./${f}'`), `sw.js precachea ${f}`);
  });
});
