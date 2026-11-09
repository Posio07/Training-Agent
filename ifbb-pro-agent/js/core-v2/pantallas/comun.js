/* Núcleo del generador · núcleo v2 (B-039, paso 3.6). Utilidades compartidas de las pantallas (esc, n1, icon). Vienen de `app.js`, que las
 * perdió en el corte y usa estas. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CORE_V2_COMUN = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n1 = v => (Math.round(v * 10) / 10).toLocaleString('es');
  const icon = (name, cls) => `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  return { esc, n1, icon };
});
