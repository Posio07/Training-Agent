/* Menú del mock: una pestaña discreta en el borde derecho para saltar a cualquier pantalla clave, apagar el sonido o el modo demo y
 * volver al índice de direcciones. No forma parte de ningún diseño: es el andamio para recorrerlos.
 * Cada dirección llama a MOCK_MENU.montar({ ir(pantalla), motor }) y atiende el hash de la URL (#inicio, #rutina, #sesion, #descanso,
 * #topset, #record, #resumen). */
(function () {
  'use strict';
  const PANTALLAS = [['inicio', 'Inicio'], ['rutina', 'Rutina del día'], ['sesion', 'Sesión activa'], ['descanso', 'Descanso'], ['topset', 'Llega el top set'], ['record', 'Récord del top set'], ['resumen', 'Resumen']];

  function montar(o) {
    const css = document.createElement('style');
    css.textContent = `
      #mock-menu-tab{position:fixed;right:0;top:42%;z-index:99990;transform:rotate(-90deg);transform-origin:100% 100%;background:rgba(0,0,0,.55);color:#fff;border:1px solid rgba(255,255,255,.35);border-bottom:0;border-radius:8px 8px 0 0;font:600 11px/1 system-ui,sans-serif;letter-spacing:.08em;padding:6px 10px;cursor:pointer;opacity:.55}
      #mock-menu{position:fixed;inset:0;z-index:99991;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;font:15px/1.3 system-ui,sans-serif}
      #mock-menu.abierto{display:flex}
      #mock-menu .caja{background:#fff;color:#111;border-radius:14px;padding:18px;width:min(320px,88vw);max-height:88vh;overflow:auto}
      #mock-menu h2{font:700 16px/1.2 system-ui,sans-serif;margin:0 0 10px}
      #mock-menu button,#mock-menu a{display:block;width:100%;text-align:left;background:#f1f1f1;color:#111;border:0;border-radius:9px;padding:11px 12px;margin:6px 0;font:inherit;text-decoration:none;cursor:pointer;box-sizing:border-box}
      #mock-menu .fila{display:flex;gap:6px}
      #mock-menu .fila button{text-align:center}
      #mock-menu .on{background:#111;color:#fff}`;
    document.head.appendChild(css);
    const tab = document.createElement('button'); tab.id = 'mock-menu-tab'; tab.textContent = 'MOCK'; tab.setAttribute('aria-label', 'Menú del mock');
    const menu = document.createElement('div'); menu.id = 'mock-menu';
    document.body.append(tab, menu);
    const S = window.MOCK_SONIDO;
    function pintar() {
      menu.innerHTML = `<div class="caja"><h2>Saltar a una pantalla</h2>
        ${PANTALLAS.map(p => `<button data-ir="${p[0]}">${p[1]}</button>`).join('')}
        <div class="fila"><button data-sonido class="${S.activo ? 'on' : ''}">Sonido ${S.activo ? 'sí' : 'no'}</button><button data-demo class="${o.motor.demo ? 'on' : ''}">Descanso ${o.motor.demo ? 'acelerado' : 'real'}</button></div>
        <a href="../index.html">← Todas las direcciones</a></div>`;
    }
    tab.onclick = () => { pintar(); menu.classList.add('abierto'); };
    menu.onclick = ev => {
      const b = ev.target.closest('button');
      if (!b) { if (ev.target === menu) menu.classList.remove('abierto'); return; }
      if (b.dataset.ir) { menu.classList.remove('abierto'); history.replaceState(null, '', '#' + b.dataset.ir); o.ir(b.dataset.ir); }
      else if ('sonido' in b.dataset) { S.activo = !S.activo; if (!S.activo) S.callar(); pintar(); }
      else if ('demo' in b.dataset) { o.motor.demo = !o.motor.demo; pintar(); }
    };
    const h = (location.hash || '').slice(1);
    o.ir(PANTALLAS.some(p => p[0] === h) ? h : 'inicio');
  }

  window.MOCK_MENU = { montar };
})();
