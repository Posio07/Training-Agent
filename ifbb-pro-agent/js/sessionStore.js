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
      recordShown: [],
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

  function loadActive(storage) {
    let raw = null;
    try { raw = storage.getItem(STORAGE_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try {
      const rec = JSON.parse(raw);
      if (isValid(rec)) return rec;
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
    return v;
  }

  // Reconcilia la sesión activa con `profile.workouts` en los dos sentidos, porque la
  // sesión y las filas se guardan en dos escrituras y un corte puede dejar una sola:
  //  - serie hecha en la sesión sin fila → se crea la fila;
  //  - fila con el sessionId y setKey de la sesión que la sesión no tiene como hecha → se marca hecha.
  // Idempotente: reconciliar dos veces da lo mismo. Devuelve cuántos cambios hizo.
  function reconcile(rec, workouts, date) {
    let changes = 0;
    rec.values.forEach((vs, ei) => vs.forEach((v, si) => {
      const key = setKey(rec.sessionId, ei, si);
      const row = workouts.find(w => w.setKey === key);
      if (v.done && !row) { workouts.push(workoutRow(rec, ei, si, date)); changes++; }
      else if (!v.done && row) {
        v.done = true; v.weight = row.weight; v.reps = row.reps; v.pain = row.pain == null ? '' : row.pain; v.doneAt = row.savedAt || null;
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

  // Cuántas series ya tiene hechas una sesión (para el texto de "Reanudar").
  const progress = rec => ({ done: rec.values.flat().filter(v => v.done).length, total: rec.values.flat().length });

  return { STORAGE_KEY, VERSION, STATUS, setKey, newSession, isValid, loadActive, peekCorrupt, saveActive, clearActive, upsertWorkout, workoutRow, markDone, reconcile, complete, discard, progress };
});
