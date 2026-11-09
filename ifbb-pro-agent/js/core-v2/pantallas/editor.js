/* EN CONSTRUCCIÓN · núcleo v2 (B-039, paso 3.7). Editor mínimo de una serie (peso y repeticiones; Guardar, Borrar y Cancelar), copiado de `app.js`
 * (DEC-015, paso 2). Lo comparten la pantalla de sesión y la de progreso (historial de sesiones). Se borra de `app.js` en el corte.
 * Los avisos y la confirmación de borrado los pone quien lo conecta (`ctx.aviso`, `ctx.confirmar`). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./comun.js'));
  else root.CORE_V2_EDITOR = factory(root.CORE_V2_COMUN);
})(typeof self !== 'undefined' ? self : this, function (COMUN) {
  'use strict';
  const { esc } = COMUN;

  function setEditorHtml(attr, id, weight, reps, unit) {
    return `<form class="set-editor" data-set-editor data-editor-id="${esc(id)}" novalidate>
      <div class="sm-set-row">
        <div class="fieldwrap"><input type="number" inputmode="decimal" step="any" name="weight" value="${esc(weight)}" aria-label="Peso (${esc(unit)})"><div class="unit">peso (${esc(unit)})</div></div>
        <div class="fieldwrap"><input type="number" inputmode="numeric" step="1" name="reps" value="${esc(reps)}" aria-label="Repeticiones"><div class="unit">reps</div></div>
      </div>
      <div class="btn-row" style="margin:.4rem 0 0"><button class="btn btn-primary" type="submit">Guardar</button><button class="btn" type="button" data-editor-delete>Borrar serie</button><button class="btn btn-ghost" type="button" data-editor-cancel>Cancelar</button></div>
    </form>`;
  }
  // Conecta el editor que haya dentro de `root`. onSave(vals) debe devolver { ok, error }.
  function wireSetEditor(root, { onSave, onDelete, onCancel }, ctx) {
    const form = root.querySelector('[data-set-editor]');
    if (!form) return;
    form.onsubmit = e => {
      e.preventDefault();
      const r = onSave({ weight: form.elements.weight.value, reps: form.elements.reps.value });
      if (r && !r.ok) ctx.aviso(r.error);
    };
    form.querySelector('[data-editor-cancel]').onclick = onCancel;
    form.querySelector('[data-editor-delete]').onclick = async () => {
      const ok = await ctx.confirmar('¿Borrar esta serie? Se quita también del historial y de tu progreso.', { confirmLabel: 'Borrar', cancelLabel: 'Cancelar' });
      if (ok) onDelete();
    };
  }

  return { setEditorHtml, wireSetEditor };
});
