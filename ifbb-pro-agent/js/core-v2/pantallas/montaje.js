/* EN CONSTRUCCIÓN · núcleo v2 (B-039, paso 3.6). Monta las pantallas de PERFIL y de PLAN (pestaña Entreno) del núcleo nuevo sobre un elemento del DOM y
 * conecta sus eventos. El formulario y su cableado (división por sexo, discos, zonas de lesión) están copiados de `renderData` de `app.js`, que se
 * borra en el corte. NO está conectado a la app: lo usa la página de prueba (tests/pagina-nucleo-v2.html); el corte hace que `app.js` solo llame
 * a `montar`.
 *
 * `ctx`: { almacen: { perfiles: [{ id, data, planGuardado, creadoEn }], activoId }, guardar(almacen), ahora() → 'AAAA-MM-DD', id() → texto,
 *          aviso(texto), confirmar(mensaje) → booleano o promesa, pantallaBloqueo(raiz, perfil, salud), alIniciarSesion(indice, perfil) }.
 * `pantallaBloqueo`: el tamizaje de salud (DEC-009) vive en `engine.js` y su pantalla de pausa en `app.js`, que se quedan: si el tamizaje bloquea (síntomas,
 * o condición más sedentarismo, sin autorización médica; o lesiones sin autorización profesional), el plan no se muestra y se llama a esta función. El almacenamiento lo pone quien monta (la página de prueba lo guarda en memoria). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../knowledge.js'), require('../../engine.js'), require('../plan.js'), require('../aviso.js'), require('./perfil.js'), require('./entreno.js'), require('./comun.js'));
  else root.CORE_V2_MONTAJE = factory(root.KNOWLEDGE, root.ENGINE, root.CORE_V2_PLAN, root.CORE_V2_AVISO, root.CORE_V2_PERFIL, root.CORE_V2_ENTRENO, root.CORE_V2_COMUN);
})(typeof self !== 'undefined' ? self : this, function (K, ENGINE, PLAN, AVISO, PERFIL, ENTRENO, COMUN) {
  'use strict';
  const { esc } = COMUN;

  function montar(raiz, ctx) {
    const alm = ctx.almacen;
    const q = sel => raiz.querySelector(sel);
    const activo = () => alm.perfiles.find(p => p.id === alm.activoId) || null;
    const guardar = () => ctx.guardar(alm);
    let vista = alm.perfiles.length ? 'plan' : 'perfil', editandoId = null;

    function ir(v, id) { vista = v; editandoId = id || null; render(); }
    function render() { (vista === 'perfil' ? renderPerfil : renderPlan)(); }

    /* ---------- Perfil ---------- */
    function renderPerfil() {
      const editando = editandoId ? alm.perfiles.find(p => p.id === editandoId) : null;
      raiz.innerHTML = PERFIL.htmlPerfil(editando);
      const form = q('#form');
      const sexo = q('#sex'), division = q('#division');
      const divisiones = Object.values(K.DIVISIONS);
      const opciones = (lista, val) => lista.map(x => `<option value="${esc(x.id)}" ${x.id === val ? 'selected' : ''}>${esc(x.label)}</option>`).join('');
      const ayuda = () => {
        const dv = K.DIVISIONS[division.value];
        q('#division-help').textContent = dv ? `${dv.judging} Grasa en tarima estimada: ${dv.stageBf[0]}-${dv.stageBf[1]} %.` : '';
        q('#classic-wrap').hidden = division.value !== 'classic_m';
      };
      sexo.onchange = () => {
        const actual = division.value;
        division.innerHTML = opciones(divisiones.filter(x => x.sex === sexo.value), K.DIVISIONS[actual] && K.DIVISIONS[actual].sex === sexo.value ? actual : (sexo.value === 'M' ? 'classic_m' : 'bikini_w'));
        ayuda();
      };
      division.onchange = ayuda; ayuda();
      q('#plateUnit').onchange = () => { const u = q('#plateUnit').value; q('#barWeight').placeholder = u === 'lb' ? '45' : '20'; q('#plates-wrap').innerHTML = PERFIL.platesCheckboxes(u, null); };
      raiz.querySelectorAll('.injury-toggle').forEach(cb => cb.onchange = () => { cb.closest('.injury-zone').querySelector('.injury-sub').style.display = cb.checked ? 'flex' : 'none'; });
      // El tiempo por día solo muestra tantos días como tenga el split elegido.
      const dias = q('select[name="daysPerWeek"]');
      dias.onchange = () => raiz.querySelectorAll('#tiempo-por-dia [data-dia]').forEach(el => { el.hidden = Number(el.dataset.dia) >= Number(dias.value); });
      const borrar = q('#btn-clear-health');
      if (borrar) borrar.onclick = async () => {
        if (!(await ctx.confirmar('¿Borrar todos los datos de salud de este perfil? No afecta el resto de los datos.'))) return;
        editando.data.health = { screening: { regularExercise: false, cvMetabolicRenal: false, symptoms: false, medicalClearance: false }, diabetes: { type: 'none', medication: false }, injuries: [] };
        guardar(); ctx.aviso('Datos de salud borrados'); renderPerfil();
      };
      q('#btn-cancel').onclick = () => ir(alm.perfiles.length ? 'plan' : 'perfil');
      form.onsubmit = e => {
        e.preventDefault();
        const fd = new FormData(form), campos = {};
        for (const k of new Set(fd.keys())) campos[k] = PERFIL.CAMPOS_LISTA.includes(k) ? fd.getAll(k) : fd.get(k);
        const r = PERFIL.leerPerfil(campos, editando && editando.data);
        if (r.errores.length) { q('#form-errors').innerHTML = r.errores.map(x => `<div class="alert danger">${esc(x)}</div>`).join(''); return; }
        if (editando) {
          editando.data = r.datos;
          // El plan guardado solo se regenera si cambió algo de lo que lo define (paso 3.1).
          if (PLAN.estadoDelPlan(editando.planGuardado, r.datos).regenerar) editando.planGuardado = PLAN.regenerar(r.datos, { id: ctx.id(), ahora: ctx.ahora() });
          alm.activoId = editando.id;
        } else {
          const p = { id: ctx.id(), creadoEn: ctx.ahora(), data: r.datos };
          p.planGuardado = PLAN.crearPlan(r.datos, { id: ctx.id(), ahora: ctx.ahora() });
          alm.perfiles.push(p); alm.activoId = p.id;
        }
        guardar(); ctx.aviso('Perfil guardado'); ir('plan');
      };
    }

    /* ---------- Plan (pestaña Entreno) ---------- */
    function renderPlan() {
      const p = activo();
      if (!p) { raiz.innerHTML = '<div class="empty"><p>Crea un perfil para ver su plan.</p><button class="btn btn-primary" id="e-new">Nuevo perfil</button></div>'; q('#e-new').onclick = () => ir('perfil'); return; }
      // DEC-009: si el tamizaje bloquea, no se muestra el plan.
      const salud = ENGINE.computeHealthScreen(p.data);
      if (salud.blocked) { raiz.innerHTML = ''; ctx.pantallaBloqueo(raiz, p, salud); return; }
      raiz.innerHTML = `<div class="btn-row"><button class="btn" id="btn-editar">Editar perfil</button><button class="btn" id="btn-nuevo">Nuevo perfil</button></div>
        <div id="entreno">${ENTRENO.htmlEntreno({ datos: p.data, guardado: p.planGuardado, siguiente: ctx.siguiente ? ctx.siguiente(p) : 0 })}</div>`;
      q('#btn-editar').onclick = () => ir('perfil', p.id);
      q('#btn-nuevo').onclick = () => ir('perfil');
      const regenerar = () => { p.planGuardado = PLAN.regenerar(p.data, { id: ctx.id(), ahora: ctx.ahora() }); guardar(); ctx.aviso('Plan regenerado'); renderPlan(); };
      raiz.querySelectorAll('[data-regenerar], [data-aplicar-version]').forEach(b => b.onclick = regenerar);
      raiz.querySelectorAll('[data-salida]').forEach(b => b.onclick = () => {
        const aviso = AVISO.avisoPendiente(AVISO.construirAviso(p.planGuardado.plan), p.data, p.planGuardado);
        const salida = aviso.salidas.find(s => s.id === b.dataset.salida);
        const r = AVISO.aplicarSalida(salida, p.data, p.planGuardado, { ahora: ctx.ahora() });
        p.data = r.perfil; p.planGuardado = r.planGuardado;
        // "Más tiempo" y "más días" cambian el perfil: el plan se regenera (y la aceptación, que caduca, se vuelve a pedir si hace falta).
        if (PLAN.estadoDelPlan(p.planGuardado, p.data).regenerar) p.planGuardado = PLAN.regenerar(p.data, { id: ctx.id(), ahora: ctx.ahora() });
        guardar(); renderPlan();
      });
      raiz.querySelectorAll('[data-toggle-day]').forEach(btn => btn.onclick = () => {
        const cuerpo = raiz.querySelector('#day-body-' + btn.dataset.toggleDay);
        const abierto = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!abierto));
        if (cuerpo) cuerpo.inert = abierto;
      });
      raiz.querySelectorAll('[data-start-session]').forEach(btn => btn.onclick = () => ctx.alIniciarSesion && ctx.alIniciarSesion(Number(btn.dataset.startSession), p));
    }

    render();
    return { render, ir, activo };
  }

  return { montar };
});
