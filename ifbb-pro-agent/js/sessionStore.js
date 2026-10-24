/* Sesión persistente y reanudable (DEC-015). Capa de estado pura y sin DOM: la
 * interfaz de hoy y el rediseño visual que venga la reutilizan tal cual.
 *
 * La sesión en curso vive en su propia clave de localStorage (no dentro del perfil)
 * con estado 'en_curso'. Cada serie registrada también va a `profile.workouts`
 * (de ahí lee Progreso) con una clave estable `setKey`, de modo que registrar o
 * reconciliar dos veces la misma serie NUNCA crea una fila duplicada. Al terminar,
 * la sesión pasa a 'completada': queda una entrada en `profile.sessions` y se borra
 * la clave de la sesión activa.
 *
 * Las funciones reciben un `storage` con la forma de localStorage (getItem,
 * setItem, removeItem) para poder probarlas sin navegador. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SESSION_STORE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'ifbb-agent:session:v1';
  const VERSION = 1;
  const STATUS = { ACTIVE: 'en_curso', DONE: 'completada' };

  // Id estable de una serie dentro de una sesión: no cambia aunque se reanude.
  const setKey = (sessionId, exIndex, setIdx) => `${sessionId}:${exIndex}:${setIdx}`;

  function newSession(a) {
    const now = a.now;
    return {
      version: VERSION, status: STATUS.ACTIVE,
      sessionId: a.sessionId, profileId: a.profileId, dayIndex: a.dayIndex, dayName: a.dayName, short: !!a.short,
      startedAt: now, updatedAt: now, exIndex: 0, finished: false,
      exercises: a.exercises,
      values: a.exercises.map(e => e.sets.map(() => ({ weight: '', reps: '', done: false, pain: '', doneAt: null }))),
      recordShown: [], deletedKeys: [], rest: null,
    };
  }

  // Forma mínima que tiene que cumplir un registro leído del almacenamiento.
  function isValid(rec) {
    return !!rec && typeof rec === 'object' && rec.version === VERSION && rec.status === STATUS.ACTIVE
      && typeof rec.sessionId === 'string' && rec.sessionId && typeof rec.profileId === 'string'
      && Array.isArray(rec.exercises) && Array.isArray(rec.values) && rec.values.length === rec.exercises.length
      && rec.exercises.every((e, i) => e && Array.isArray(e.sets) && Array.isArray(rec.values[i]) && rec.values[i].length === e.sets.length)
      && Number.isInteger(rec.exIndex) && rec.exIndex >= 0 && rec.exIndex < Math.max(1, rec.exercises.length);
  }

  const validRest = r => !!r && isFinite(r.endAt) && isFinite(r.total) && r.total > 0;

  function loadActive(storage) {
    let raw = null;
    try { raw = storage.getItem(STORAGE_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try {
      const rec = JSON.parse(raw);
      if (isValid(rec)) { if (!validRest(rec.rest)) rec.rest = null; return rec; }
    } catch (e) { /* JSON roto: se ignora */ }
    return null; // no se borra: un registro ilegible no se pisa sin avisar (ver peekCorrupt)
  }
  // ¿Hay algo guardado que no se pudo leer? La interfaz puede avisarlo en vez de perderlo en silencio.
  function peekCorrupt(storage) {
    try { return !!storage.getItem(STORAGE_KEY) && !loadActive(storage); } catch (e) { return false; }
  }

  function saveActive(storage, rec, now) {
    rec.updatedAt = now;
    try { storage.setItem(STORAGE_KEY, JSON.stringify(rec)); return true; } catch (e) { return false; }
  }
  function clearActive(storage) { try { storage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ } }

  // Inserta o reemplaza (por setKey) la fila de una serie. Idempotente.
  function upsertWorkout(workouts, row) {
    const i = workouts.findIndex(w => w.setKey === row.setKey);
    if (i === -1) workouts.push(row); else workouts[i] = Object.assign({}, workouts[i], row);
    return workouts;
  }

  // Fila de `profile.workouts` de la serie (exIndex, setIdx) ya registrada.
  function workoutRow(rec, exIndex, setIdx, date) {
    const ex = rec.exercises[exIndex], st = ex.sets[setIdx], v = rec.values[exIndex][setIdx];
    return {
      setKey: setKey(rec.sessionId, exIndex, setIdx),
      sessionId: rec.sessionId, date, dayIndex: rec.dayIndex, dayName: rec.dayName,
      exercise: ex.name, exerciseId: ex.exerciseId, muscle: ex.muscle, setType: st.setType, setNumber: st.setNumber,
      weight: Number(v.weight) || 0, reps: Number(v.reps), pain: v.pain === '' || v.pain == null ? null : Number(v.pain),
      short: rec.short, savedAt: v.doneAt,
    };
  }

  // Marca una serie como hecha en el registro (no toca el almacenamiento).
  function markDone(rec, exIndex, setIdx, vals, now) {
    const v = rec.values[exIndex][setIdx];
    v.weight = vals.weight; v.reps = vals.reps; v.pain = vals.pain == null ? '' : vals.pain;
    v.done = true; v.doneAt = v.doneAt || now;
    if (Array.isArray(rec.deletedKeys)) rec.deletedKeys = rec.deletedKeys.filter(k => k !== setKey(rec.sessionId, exIndex, setIdx));
    return v;
  }

  // Reconcilia la sesión activa con `profile.workouts` en los dos sentidos, porque la
  // sesión y las filas se guardan en dos escrituras y un corte puede dejar una sola:
  //  - serie hecha en la sesión sin fila → se crea la fila;
  //  - fila con el sessionId y setKey de la sesión que la sesión no tiene como hecha → se marca hecha.
  // Idempotente: reconciliar dos veces da lo mismo. Devuelve cuántos cambios hizo.
  function reconcile(rec, workouts, date) {
    let changes = 0;
    // Series borradas: la intención queda en la sesión (se guarda primero), así un corte no las resucita.
    (rec.deletedKeys || []).forEach(key => {
      for (let i = workouts.length - 1; i >= 0; i--) if (workouts[i].setKey === key) { workouts.splice(i, 1); changes++; }
    });
    rec.values.forEach((vs, ei) => vs.forEach((v, si) => {
      const key = setKey(rec.sessionId, ei, si);
      const row = workouts.find(w => w.setKey === key);
      if (v.done && !row) { workouts.push(workoutRow(rec, ei, si, date)); changes++; }
      else if (!v.done && row && !(rec.deletedKeys || []).includes(key)) {
        v.done = true; v.weight = row.weight; v.reps = row.reps; v.pain = row.pain == null ? '' : row.pain; v.doneAt = row.savedAt || null;
        if (row.editedAt) v.editedAt = row.editedAt;
        changes++;
      } else if (v.done && row && (Number(row.weight) !== Number(v.weight) || Number(row.reps) !== Number(v.reps))) {
        // Una edición se guarda primero en la sesión y después en la fila: gana la más reciente.
        const sessionTime = v.editedAt || v.doneAt || 0, rowTime = row.editedAt || row.savedAt || 0;
        if (sessionTime >= rowTime) { row.weight = Number(v.weight) || 0; row.reps = Number(v.reps); if (v.editedAt) row.editedAt = v.editedAt; }
        else { v.weight = row.weight; v.reps = row.reps; v.editedAt = row.editedAt; }
        changes++;
      }
    }));
    return changes;
  }

  // Pasa la sesión a 'completada': una entrada en `sessions` (sin duplicar) y fuera de la clave activa.
  function complete(rec, sessions, workouts, now, date) {
    reconcile(rec, workouts, date);
    const done = rec.values.flat().filter(v => v.done).length;
    const meta = {
      sessionId: rec.sessionId, status: STATUS.DONE, date, dayIndex: rec.dayIndex, dayName: rec.dayName, short: rec.short,
      startedAt: rec.startedAt, finishedAt: now, setsDone: done, setsTotal: rec.values.flat().length,
    };
    const i = sessions.findIndex(s => s.sessionId === rec.sessionId);
    if (i === -1) sessions.push(meta); else sessions[i] = Object.assign({}, sessions[i], meta, { finishedAt: sessions[i].finishedAt || now });
    rec.status = STATUS.DONE;
    return meta;
  }

  // Descartar: quita la sesión y todas sus series de `workouts`. Devuelve cuántas series se borraron.
  function discard(rec, workouts) {
    const before = workouts.length;
    for (let i = workouts.length - 1; i >= 0; i--) if (workouts[i].sessionId === rec.sessionId) workouts.splice(i, 1);
    return before - workouts.length;
  }


  /* ---------- Editar y borrar series (DEC-015, Paso 2) ---------- */

  // Peso (≥ 0, hasta 1000) y repeticiones (entero ≥ 1, hasta 999). No acepta vacíos ni texto.
  function validateSetValues(vals) {
    const weight = vals.weight === '' || vals.weight == null ? 0 : Number(vals.weight);
    const reps = Number(vals.reps);
    if (!isFinite(weight) || weight < 0 || weight > 1000) return { ok: false, error: 'El peso tiene que estar entre 0 y 1000.' };
    if (!Number.isInteger(reps) || reps < 1 || reps > 999) return { ok: false, error: 'Las repeticiones tienen que ser un número entero de 1 a 999.' };
    return { ok: true, weight, reps };
  }

  // Sesión en curso. Orden pensado para que un corte no pierda ni resucite nada: 1) se cambia el
  // registro de la sesión y se guarda; 2) recién ahí se sincroniza la fila del historial (syncRow /
  // removeRow). reconcile completa lo que haya quedado a medias.
  function editActiveSet(rec, exIndex, setIdx, vals, now) {
    const v = rec.values[exIndex] && rec.values[exIndex][setIdx];
    if (!v || !v.done) return { ok: false, error: 'La serie todavía no está registrada.' };
    const c = validateSetValues(vals);
    if (!c.ok) return c;
    v.weight = c.weight; v.reps = c.reps; v.editedAt = now;
    return { ok: true };
  }
  function deleteActiveSet(rec, exIndex, setIdx) {
    const v = rec.values[exIndex] && rec.values[exIndex][setIdx];
    if (!v || !v.done) return { ok: false, error: 'La serie todavía no está registrada.' };
    const key = setKey(rec.sessionId, exIndex, setIdx);
    rec.deletedKeys = (rec.deletedKeys || []).concat(key);
    rec.values[exIndex][setIdx] = { weight: '', reps: '', done: false, pain: '', doneAt: null };
    return { ok: true, key };
  }
  function syncRow(rec, workouts, exIndex, setIdx, date) {
    const row = workoutRow(rec, exIndex, setIdx, date);
    const v = rec.values[exIndex][setIdx];
    if (v.editedAt) row.editedAt = v.editedAt;
    return upsertWorkout(workouts, row);
  }
  function removeRow(workouts, key) {
    const i = workouts.findIndex(w => w.setKey === key);
    if (i !== -1) workouts.splice(i, 1);
    return i !== -1;
  }

  // Historial. Las filas anteriores a DEC-015 no tienen setKey: se identifican por sus datos.
  const rowId = w => w.setKey || `legacy:${w.sessionId}|${w.exercise}|${w.setType}|${w.setNumber}|${w.savedAt}`;
  function editRow(workouts, id, vals, now) {
    const w = workouts.find(x => rowId(x) === id);
    if (!w) return { ok: false, error: 'No se encontró la serie.' };
    const c = validateSetValues(vals);
    if (!c.ok) return c;
    w.weight = c.weight; w.reps = c.reps; w.editedAt = now;
    return { ok: true };
  }
  function deleteRow(workouts, sessions, id, now) {
    const i = workouts.findIndex(x => rowId(x) === id);
    if (i === -1) return { ok: false, error: 'No se encontró la serie.' };
    const [gone] = workouts.splice(i, 1);
    const meta = sessions.find(x => x.sessionId === gone.sessionId);
    if (meta) { meta.setsDone = Math.max(0, (meta.setsDone || 0) - 1); meta.editedAt = now; }
    return { ok: true };
  }
  // Sesiones del historial, la más reciente primero. `completada` si tiene entrada en `sessions`;
  // `sin_estado` si solo hay series sueltas (registros anteriores a DEC-015). La sesión en curso no se lista.
  function listSessions(workouts, sessions, activeSessionId) {
    const byId = {};
    workouts.forEach(w => { if (w.sessionId !== activeSessionId) (byId[w.sessionId] = byId[w.sessionId] || []).push(w); });
    sessions.forEach(m => { if (m.sessionId !== activeSessionId && !byId[m.sessionId]) byId[m.sessionId] = []; });
    return Object.keys(byId).map(id => {
      const rows = byId[id].slice().sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
      const meta = sessions.find(m => m.sessionId === id) || null;
      return {
        sessionId: id, status: meta ? STATUS.DONE : 'sin_estado',
        dayName: (meta && meta.dayName) || (rows[0] && rows[0].dayName) || 'Sesión',
        date: (meta && meta.date) || (rows[0] && rows[0].date) || '', startedAt: meta ? meta.startedAt : ((rows[0] && rows[0].savedAt) || 0), rows,
      };
    }).sort((a, b) => (b.date.localeCompare(a.date)) || (b.startedAt - a.startedAt));
  }

  /* ---------- Cronómetro de descanso (DEC-015, Paso 3) ----------
   * El descanso se guarda como un TIMESTAMP DE FIN (`endAt` = ahora + duración), no como un número que
   * se resta en cada tick: lo que falta se recalcula siempre como `endAt - ahora`, así que no importa
   * cuántos ticks se pierdan con la pantalla bloqueada ni si la app se cierra. Vive dentro de la
   * sesión en curso, por lo que se persiste con ella. */
  function startRest(rec, totalSec, now) {
    rec.rest = { total: totalSec, startedAt: now, endAt: now + totalSec * 1000 };
    return rec.rest;
  }
  // Segundos que faltan (entero hacia arriba, nunca negativo). Se acota a la duración total por si el
  // reloj del dispositivo se atrasa.
  function restRemaining(rec, now) {
    if (!rec || !validRest(rec.rest)) return 0;
    return Math.min(rec.rest.total, Math.max(0, Math.ceil((rec.rest.endAt - now) / 1000)));
  }
  function extendRest(rec, sec) {
    if (!rec.rest) return null;
    rec.rest.endAt += sec * 1000; rec.rest.total += sec;
    return rec.rest;
  }
  function clearRest(rec) { rec.rest = null; }

  // Cuántas series ya tiene hechas una sesión (para el texto de "Reanudar").
  const progress = rec => ({ done: rec.values.flat().filter(v => v.done).length, total: rec.values.flat().length });

  return { startRest, restRemaining, extendRest, clearRest, STORAGE_KEY, VERSION, STATUS, setKey, validateSetValues, editActiveSet, deleteActiveSet, syncRow, removeRow, rowId, editRow, deleteRow, listSessions, newSession, isValid, loadActive, peekCorrupt, saveActive, clearActive, upsertWorkout, workoutRow, markDone, reconcile, complete, discard, progress };
});
