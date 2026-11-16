/* El Gran Circo del Hierro. La sesión es una función: cada ejercicio es un número, el top set es el número principal,
 * el descanso es el intermedio con el telón cerrado y cada serie se mide en el martillo de feria contra la última vez. */
(function () {
  'use strict';
  const D = window.MOCK_DATOS, M = window.MOCK_MOTOR.crear(D), S = window.MOCK_SONIDO, n1 = M.n1;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const escena = $('#escena'), telon = $('#telon'), intermedio = $('#intermedio'), anuncio = $('#anuncio'), fiesta = $('#fiesta'), pregon = $('#pregon');
  let clave = 'completa', anunciado = {}, esperas = [], redobleId = null;
  const luego = (fn, ms) => { const t = setTimeout(fn, ms); esperas.push(t); return t; };
  const fechaCorta = iso => new Date(iso + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const letras = (txt, d0, paso) => txt.split('').map((c, i) => (c === ' ' ? ' ' : `<span class="letra" style="animation-delay:${(d0 + i * (paso || 0.07)).toFixed(2)}s">${c}</span>`)).join('');
  const palabras = (txt, d0) => { let k = 0; return txt.split(' ').map(p => { const h = `<span class="pal">${letras(p, d0 + k * 0.06, 0.06)}</span>`; k += p.length; return h; }).join(''); };

  /* ---------- La banda: los sonidos de la función ---------- */
  const SON = {
    clac: () => S.tono({ f: 950, f2: 520, dur: 0.05, tipo: 'triangle', gan: 0.25 }),
    zum: () => S.ruido({ dur: 0.5, f: 300, f2: 2400, q: 0.8, gan: 0.18, ataque: 0.2 }),
    bombo: () => { S.tono({ f: 130, f2: 45, dur: 0.3, gan: 0.7 }); S.ruido({ dur: 0.08, f: 200, filtro: 'lowpass', gan: 0.3 }); },
    platillo: () => { S.ruido({ dur: 1.4, f: 6500, filtro: 'highpass', gan: 0.3 }); S.tono({ f: 150, f2: 50, dur: 0.35, gan: 0.6 }); },
    campana: () => [1, 2.01, 2.76, 4.1].forEach((p, i) => S.tono({ f: 1320 * p, dur: 1.3 - i * 0.25, gan: 0.22 / (i + 1) })),
    casi: () => S.tono({ f: 420, f2: 180, dur: 0.35, tipo: 'sawtooth', gan: 0.12 }),
    fanfarria: () => [[523, 0], [659, 0.13], [784, 0.26], [1047, 0.39], [784, 0.6], [1047, 0.72]].forEach(([f, t], i) => S.tono({ f, dur: i === 5 ? 0.9 : 0.16, tipo: 'sawtooth', gan: 0.16, cuando: t })),
    aplauso: () => { for (let i = 0; i < 60; i++) S.ruido({ dur: 0.07, f: 1400 + Math.random() * 1600, q: 1.2, gan: 0.05 + Math.random() * 0.1, cuando: Math.random() * 3.2 }); },
    redoble(seg) { // caja que acelera y crece
      SON.finRedoble(); let t = 0; const total = seg * 1000, t0 = Date.now();
      const golpe = () => { const k = Math.min(1, (Date.now() - t0) / total); S.ruido({ dur: 0.045, f: 2600, q: 0.7, gan: 0.06 + k * 0.2 }); t = 70 - k * 34; redobleId = setTimeout(golpe, t); };
      golpe();
    },
    finRedoble: () => { if (redobleId) { clearTimeout(redobleId); redobleId = null; } },
  };

  function pregonar(txt, ms) { pregon.textContent = txt; pregon.classList.add('ya'); luego(() => pregon.classList.remove('ya'), ms || 3200); }
  function focos(el, n) { // bombillas de marquesina alrededor de un elemento
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / n * 4, f = document.createElement('i'); f.className = 'foco';
      const [x, y] = t < 1 ? [t, 0] : t < 2 ? [1, t - 1] : t < 3 ? [3 - t, 1] : [0, 4 - t];
      f.style.left = (x * 100) + '%'; f.style.top = (y * 100) + '%'; el.appendChild(f); out.push(f);
    }
    return out;
  }
  function pum(txt, donde) { const p = document.createElement('div'); p.className = 'pum'; p.textContent = txt; (donde || escena).appendChild(p); luego(() => p.remove(), 950); }
  function sacudir(el) { el.classList.remove('tiembla'); void el.offsetWidth; el.classList.add('tiembla'); }

  /* ---------- Telón ---------- */
  function conTelon(pintar) {
    telon.classList.add('cerrado'); SON.zum();
    luego(() => { pintar(); luego(() => { telon.classList.remove('cerrado'); SON.zum(); }, 120); }, 540);
  }

  /* ---------- Papelitos (confeti de papel y estrellas) ---------- */
  const lienzo = $('#papelitos'), cx = lienzo.getContext('2d'); let papeles = [], animando = false;
  function medir() { lienzo.width = lienzo.clientWidth * devicePixelRatio; lienzo.height = lienzo.clientHeight * devicePixelRatio; }
  window.addEventListener('resize', medir); medir();
  function lanzar(n, x, y, fuerza) {
    const col = ['#D3261C', '#1F3F94', '#F7B90F', '#FFF6DC', '#1B1410'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * (fuerza || 14) * devicePixelRatio;
      papeles.push({ x: x * lienzo.width, y: y * lienzo.height, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6 * devicePixelRatio, g: Math.random() * 6, vg: (Math.random() - 0.5) * 0.5, t: (5 + Math.random() * 9) * devicePixelRatio, c: col[i % col.length], estrella: i % 7 === 0, vida: 260 + Math.random() * 120 });
    }
    if (!animando) { animando = true; requestAnimationFrame(cuadro); }
  }
  function cuadro() {
    cx.clearRect(0, 0, lienzo.width, lienzo.height);
    papeles = papeles.filter(p => p.vida > 0 && p.y < lienzo.height + 40);
    papeles.forEach(p => {
      p.vy += 0.32 * devicePixelRatio; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx + Math.sin(p.g) * 1.5; p.y += p.vy; p.g += p.vg; p.vida--;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.g); cx.fillStyle = p.c;
      if (p.estrella) { cx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? p.t * 0.45 : p.t; cx.lineTo(Math.cos(k * Math.PI / 5) * r, Math.sin(k * Math.PI / 5) * r); } cx.fill(); }
      else cx.fillRect(-p.t / 2, -p.t / 4 * Math.cos(p.g * 2), p.t, p.t / 2 * Math.cos(p.g * 2) + 1);
      cx.restore();
    });
    if (papeles.length) requestAnimationFrame(cuadro); else { animando = false; cx.clearRect(0, 0, lienzo.width, lienzo.height); }
  }

  /* ---------- Inicio: el cartel de la semana ---------- */
  function pintarInicio() {
    const hoy = D.semana[D.hoy], hechasPasada = D.historial.length;
    escena.innerHTML = `<section class="pantalla p-inicio">
      <div class="rayos"></div>
      <div class="banderines">${'<i></i>'.repeat(16)}</div>
      <p class="script">Damas y caballeros, con ustedes…</p>
      <h1 class="madera"><span>${letras('EL GRAN', 0.1)}</span><b>${letras(D.perfil.nombre.toUpperCase(), 0.5, 0.11)}</b></h1>
      <p class="cinta">${D.perfil.division} · en ${D.perfil.objetivo.toLowerCase()} · ${D.perfil.dias} funciones por semana</p>
      <button class="boleto" id="ir-rutina">
        <span class="hoy">ESTA NOCHE</span>
        <strong>${hoy.nombre.split('· ')[1]}</strong>
        <span class="linea">${hoy.ejercicios} números · ${hoy.series} series · unos ${hoy.minutos} minutos</span>
        <span class="estelar">Número principal: ${hoy.topSet}</span>
        <em>Ver el programa</em>
      </button>
      <div class="gira">${D.semana.map((d, i) => `<button class="${i === D.hoy ? 'hoy' : ''}" data-dia="${i}"><b>${i + 1}</b><span>${d.nombre.split('· ')[1]}</span><small>${d.series} series · ${d.minutos} min</small></button>`).join('')}</div>
      <p class="sello">Semana pasada: ${hechasPasada} funciones de ${D.perfil.dias}</p>
    </section>`;
    focos($('.boleto'), 26);
    $('#ir-rutina').onclick = () => { SON.bombo(); S.vibrar(30); conTelon(pintarRutina); };
    $$('.gira button').forEach(b => b.onclick = () => {
      SON.clac(); sacudir(b);
      if (Number(b.dataset.dia) === D.hoy) { conTelon(pintarRutina); return; }
      pregonar(`${D.semana[b.dataset.dia].nombre}: esa función todavía no se estrena. Hoy toca ${hoy.nombre.split('· ')[1]}.`);
    });
    luego(() => { SON.bombo(); sacudir(escena); S.vibrar(40); }, 1100);
  }

  /* ---------- Rutina: el programa de mano ---------- */
  function pintarRutina() {
    const s = D.sesiones[clave], corta = clave !== 'completa';
    const ordinal = i => ['1.er', '2.º', '3.er', '4.º', '5.º', '6.º', '7.º', '8.º'][i] + ' número';
    const regla = id => D.reglas.find(r => r.id === id);
    const acto = (e, i) => {
      const dTop = regla('DESCANSO_TOP_SET_S'), dN = regla(e.tipo === 'multiarticular' ? 'DESCANSO_MULTIARTICULAR_S' : 'DESCANSO_AISLAMIENTO_S'), piso = regla('DESCANSO_PISO_RESPALDADO_S');
      const detalle = `<div class="detalle"><div>
        <p><span class="nivel">${dN.nivel}</span>Descanso de ${e.sets[e.sets.length - 1].descanso}: ${dN.fuente} (${dN.dec}).</p>
        <p><span class="nivel">${piso.nivel}</span>Ningún descanso baja de ${piso.valor} s: Singer et al. 2024, leído en resumen.</p>
        ${e.topSet ? `<p><span class="nivel">${dTop.nivel}</span>El top set solo existe en definición (${regla('TOP_SET_SOLO_EN_DEFINICION').dec}).</p>` : ''}
        <p>Relación con ${e.grupo.toLowerCase()}: ${e.evidencia.replace('_', ' ')}.</p></div></div>`;
      if (e.topSet) return `<li class="acto estelar" style="animation-delay:${0.15 + i * 0.09}s"><span class="orden">★ Número principal ★</span><h2>${e.nombre}</h2>
        <p>Una sola serie de ${e.topSet.reps[0]}-${e.topSet.reps[1]} repeticiones, al límite (RIR ${e.topSet.rir[0]}-${e.topSet.rir[1]})</p>
        <p class="chico">y ${e.topSet.backoffs} series de respaldo (back-off) de ${e.sets[1].reps} con ${e.topSet.reduccion} % menos de carga · ${e.grupo}</p>${detalle}</li>`;
      return `<li class="acto" style="animation-delay:${0.15 + i * 0.09}s"><span class="orden">${ordinal(i)}</span><h2>${e.nombre}</h2>
        <p>${e.sets.length} series de ${e.sets[0].reps} · descanso ${e.sets[0].descanso}</p><p class="chico">${e.grupo}</p>
        ${e.evidenciaPorVerificar ? '<span class="sello-ev">Evidencia por verificar</span>' : ''}${detalle}</li>`;
    };
    escena.innerHTML = `<section class="pantalla p-rutina">
      <div class="rayos"></div>
      <div class="cabecera"><button class="redondo" id="volver" aria-label="Volver al cartel">‹</button><p class="script">Programa de la función</p><span style="width:44px"></span></div>
      <h1 class="madera">${letras(s.nombre.split('· ')[1].toUpperCase(), 0.05, 0.08)}</h1>
      <p class="cinta">${s.series} series · ${s.minutos} de ${corta ? s.minutosPedidos : s.capacidad} min${!corta && s.capacidad > s.minutos ? ` · sobran ${s.capacidad - s.minutos}` : ''}</p>
      <div class="taquilla">
        <button data-clave="completa" class="${corta ? '' : 'activo'}"><b>Función completa</b>${D.sesiones.completa.minutos} min · ${D.sesiones.completa.series} series</button>
        <button data-clave="corta30" class="${corta ? 'activo' : ''}"><b>Hoy tengo 30 min</b>rutina corta · ${D.sesiones.corta30.series} series</button>
      </div>
      <ol class="actos">${s.ejercicios.map(acto).join('')}</ol>
      <button class="gran-boton late" id="empezar">¡Empezar la función!</button>
    </section>`;
    $('#volver').onclick = () => { SON.clac(); conTelon(pintarInicio); };
    $$('.taquilla button').forEach(b => b.onclick = () => { if (b.dataset.clave === clave) return; clave = b.dataset.clave; SON.bombo(); S.vibrar(20); pintarRutina(); });
    $$('.acto').forEach(a => a.onclick = () => { a.classList.toggle('abierto'); SON.clac(); });
    $('#empezar').onclick = empezar;
  }

  /* ---------- Sesión ---------- */
  function empezar() {
    M.iniciar(clave); anunciado = {};
    SON.redoble(0.9); S.vibrar([30, 40, 30, 40, 60]);
    luego(() => { SON.finRedoble(); SON.platillo(); }, 900);
    conTelon(() => { pintarPista(); entrar(); });
  }
  // Al llegar a un ejercicio: si lo que sigue es su top set, primero el anuncio.
  function entrar() {
    const s = M.estado(), i = s.exIndex, p = M.pendiente(i);
    if (p >= 0 && s.ejercicios[i].sets[p].tipo === 'top' && !anunciado[i]) { anunciado[i] = true; mostrarAnuncio(); }
  }
  function haltera(peso) {
    const r = 26 + Math.min(30, peso / 4.5);
    return `<svg class="haltera" viewBox="-10 -14 320 148" aria-hidden="true">
      <rect x="36" y="56" width="228" height="8" rx="4" fill="#1B1410"/>
      <circle class="bola" cx="52" cy="60" r="${r}" fill="#1B1410"/><circle class="bola" cx="248" cy="60" r="${r}" fill="#1B1410"/>
      <circle cx="${52 - r * 0.35}" cy="${60 - r * 0.35}" r="${r * 0.22}" fill="#FFF6DC" opacity=".85"/><circle cx="${248 - r * 0.35}" cy="${60 - r * 0.35}" r="${r * 0.22}" fill="#FFF6DC" opacity=".85"/>
      <text x="52" y="66" text-anchor="middle" font-family="Alfa Slab One, serif" font-size="${r * 0.52}" fill="#F7B90F">${n1(peso)}</text>
      <text x="248" y="66" text-anchor="middle" font-family="Alfa Slab One, serif" font-size="${r * 0.52}" fill="#F7B90F">KG</text></svg>`;
  }
  function textoDiscos(e, peso) {
    if (!e.barra) return '';
    const r = M.discosDe(peso);
    return `barra ${n1(D.perfil.barra)} + ${r.discos.length ? r.discos.map(n1).join(' + ') + ' por lado' : 'sin discos'}`;
  }
  function pintarPista() {
    const s = M.estado(), e = M.ejercicio(), i = s.exIndex, p = M.pendiente(i), vals = s.values[i];
    const st = p >= 0 ? e.sets[p] : null, v = p >= 0 ? vals[p] : null, ult = st ? M.ultimaDe(e, st) : null;
    const ultimo = i === s.ejercicios.length - 1, estelar = st && st.tipo === 'top';
    escena.innerHTML = `<section class="pantalla p-pista ${estelar ? 'estelar' : ''}">${estelar ? '' : '<div class="rayos"></div>'}
      <div class="cabecera"><button class="redondo" id="salir" aria-label="Salir de la sesión">✕</button>
        <div class="prog">${s.corta ? 'Rutina corta · ' : ''}Número <b>${i + 1}</b> de ${s.ejercicios.length} · <b>${M.hechas()}</b>/${M.total()} series</div>
        <button class="terminar" id="terminar">Terminar</button></div>
      <div class="cuerpo">
        <div class="centro">
          <div class="tipo-serie">${st ? (st.tipo === 'top' ? '★ Top set ★' : M.etiqueta(st) + (st.tipo === 'normal' ? ` de ${e.sets.length}` : ` de ${e.sets.filter(x => x.tipo === 'backoff').length}`)) : 'Número cumplido'}</div>
          <h1>${e.nombre}</h1>
          <p class="grupo">${e.grupo}${st ? ` · ${st.reps} repeticiones` : ''}</p>
          ${st ? `<div class="retador">${ult ? `La marca a batir (${fechaCorta(e.ultima.fecha)}): <b>${n1(ult.peso)} kg × ${ult.reps}</b>` : 'Primera vez que registras esta serie.'}</div>
          <div id="haltera">${haltera(v.peso)}</div>
          <p class="discos" id="discos">${textoDiscos(e, v.peso)}</p>
          <div class="diales">
            <div class="dial"><div class="valor"><span id="v-peso">${n1(v.peso)}</span></div><div class="rotulo">kilos</div><button data-d="peso" data-n="-2.5" aria-label="Quitar 2,5 kg">−</button><button data-d="peso" data-n="2.5" aria-label="Sumar 2,5 kg">+</button></div>
            <div class="dial"><div class="valor"><span id="v-reps">${v.reps}</span></div><div class="rotulo">repeticiones</div><button data-d="reps" data-n="-1" aria-label="Una repetición menos">−</button><button data-d="reps" data-n="1" aria-label="Una repetición más">+</button></div>
          </div>` : `<div class="retador">${vals.map(x => `<b>${n1(x.peso)} × ${x.reps}</b>`).join(' · ')}</div><div id="haltera" style="flex:1"></div>`}
          <div class="luces">${e.sets.map((x, j) => `<i class="${x.tipo === 'top' ? 'top ' : ''}${vals[j].done ? 'lista' : j === p ? 'ahora' : ''}"></i>`).join('')}</div>
        </div>
        <div class="torre"><div class="campana" id="campana"></div>
          <div class="carril"><span style="bottom:90%">leyenda</span><span style="bottom:62%">forzudo</span><span style="bottom:32%">aprendiz</span><div class="taco" id="taco"></div></div><div class="base"></div></div>
      </div>
      <div class="pie"><button class="redondo" id="ant" ${i === 0 ? 'disabled' : ''} aria-label="Número anterior">‹</button>
        <button class="hecha ${st ? '' : 'otra'}" id="hecha">${st ? '¡Hecha!' : ultimo ? 'Terminar la función' : 'Siguiente número'}</button>
        <button class="redondo" id="sig" ${ultimo ? 'disabled' : ''} aria-label="Número siguiente">›</button></div>
    </section>`;
    $('#salir').onclick = () => { SON.clac(); M.iniciar(clave); conTelon(pintarRutina); };
    $('#terminar').onclick = terminar;
    $('#ant').onclick = () => { SON.clac(); M.anterior(); pintarPista(); };
    $('#sig').onclick = () => { SON.clac(); M.siguiente(); pintarPista(); entrar(); };
    $('#hecha').onclick = st ? () => hecha(p) : () => { if (ultimo) terminar(); else { SON.bombo(); M.siguiente(); conTelon(() => { pintarPista(); entrar(); }); } };
    $$('.dial button').forEach(b => b.onclick = () => {
      const campo = b.dataset.d, paso = Number(b.dataset.n);
      v[campo] = Math.max(campo === 'reps' ? 1 : 0, Math.round((v[campo] + paso) * 100) / 100);
      const el = $('#v-' + campo); el.textContent = campo === 'peso' ? n1(v.peso) : v.reps; el.classList.remove('cae'); void el.offsetWidth; el.classList.add('cae');
      if (campo === 'peso') { $('#haltera').innerHTML = haltera(v.peso); $('#discos').textContent = textoDiscos(e, v.peso); }
      SON.clac(); S.vibrar(12);
    });
  }

  function hecha(setIdx) {
    const s = M.estado(), v = s.values[s.exIndex][setIdx];
    const r = M.registrar(setIdx, { peso: v.peso, reps: v.reps });
    if (!r.ok) { pregonar(r.error); return; }
    $('#hecha').disabled = true;
    // El martillo de feria: igualar o superar la última vez toca la campana.
    const c = r.serie.contraUltima, toca = c >= 1, alto = toca ? 1 : Math.max(0.12, Math.min(0.92, 0.92 - (1 - c) * 6));
    const taco = $('#taco'), carril = taco.parentElement;
    SON.bombo(); S.vibrar(toca ? [40, 60, 120] : 40); sacudir(escena);
    $('.haltera') && $('.haltera').classList.add('arriba');
    taco.animate([{ bottom: '0' }, { bottom: `calc(${alto * 100}% - 16px)`, offset: 0.3, easing: 'cubic-bezier(.1,.8,.3,1)' }, { bottom: `calc(${alto * 100}% - 16px)`, offset: 0.45 }, { bottom: '0', easing: 'cubic-bezier(.6,0,.9,.4)' }], { duration: 1100 });
    luego(() => {
      if (toca) { $('#campana').classList.add('suena'); SON.campana(); pum(r.serie.tipo === 'top' ? '¡TOMA!' : '¡DING!'); lanzar(26, 0.86, 0.14, 9); }
      else { SON.casi(); pum('¡CASI!'); }
      const luz = $$('.luces i')[setIdx]; if (luz) { luz.classList.remove('ahora'); luz.classList.add('lista'); }
      void carril;
    }, 330);
    if (r.a5) luego(() => pregonar(`¡Atención! Un back-off pesa ${n1(r.a5.maximo)} kg o menos (90 % del top set de ${n1(r.a5.top)}). Esta serie se guarda como serie de trabajo.`, 4200), 500);
    luego(() => {
      if (r.record) mostrarFiesta(r.record, () => despues(r));
      else despues(r);
    }, r.a5 ? 2400 : 1150);
  }
  function despues(r) {
    if (r.serie.sesionCompleta) { terminar(); return; }
    if (M.estado().rest) mostrarIntermedio(); else volverALaPista();
  }
  function volverALaPista() {
    const s = M.estado();
    if (M.pendiente(s.exIndex) < 0 && s.exIndex < s.ejercicios.length - 1) M.siguiente(); // número cumplido: entra el siguiente
    pintarPista(); entrar();
  }

  /* ---------- Intermedio: el descanso, con el telón cerrado ---------- */
  let bombillas = [];
  function mostrarIntermedio() {
    const s = M.estado(), i = s.exIndex, p = M.pendiente(i);
    let sigue;
    if (p >= 0) { const st = s.ejercicios[i].sets[p], v = s.values[i][p]; sigue = `<b>${M.etiqueta(st)} · ${s.ejercicios[i].nombre}</b>${st.reps} repeticiones con ${n1(v.peso)} kg`; }
    else if (i < s.ejercicios.length - 1) { const e = s.ejercicios[i + 1]; sigue = `<b>${e.nombre}</b>número ${i + 2} de ${s.ejercicios.length} · ${e.sets.length} series de ${e.sets[0].reps}`; }
    else sigue = '<b>El saludo final</b>';
    telon.classList.add('cerrado'); SON.zum();
    intermedio.className = ''; intermedio.hidden = false;
    intermedio.innerHTML = `<div class="cartel-colgante"><h2>Intermedio</h2>
      <div class="reloj" id="reloj" role="timer">${M.fmt(M.restante())}</div>
      <p class="sigue">A continuación${sigue}</p>
      <div class="botones"><button id="mas">+30 s</button><button id="saltar" class="lleno">Saltar</button></div>
      ${M.demo ? '<p class="nota-demo">Mock: el descanso corre acelerado hasta los últimos 10 segundos.</p>' : ''}</div>`;
    bombillas = focos($('.cartel-colgante'), 36);
    $('#mas').onclick = () => { M.extender(30); SON.clac(); S.vibrar(15); pum('+30', intermedio); };
    $('#saltar').onclick = () => { SON.clac(); M.saltar(); };
  }
  function cerrarIntermedio(conPlatillo) {
    SON.finRedoble(); telon.classList.remove('tiembla-telon');
    if (intermedio.hidden) return;
    intermedio.classList.add('fuera');
    if (conPlatillo) { SON.platillo(); S.tresTonos('triangle', 0.25); S.vibrar([200, 100, 200]); }
    luego(() => { intermedio.hidden = true; volverALaPista(); luego(() => { telon.classList.remove('cerrado'); SON.zum(); }, 80); }, 360);
  }
  M.on('tic', t => {
    const corre = $('#corre'); if (corre) corre.textContent = `El descanso ya corre: ${M.fmt(t.restante)}`;
    const reloj = $('#reloj'); if (!reloj || intermedio.hidden) return;
    const txt = M.fmt(t.restante);
    if (reloj.textContent !== txt) { reloj.textContent = txt; if (t.restante <= 10) { reloj.classList.remove('tic'); void reloj.offsetWidth; reloj.classList.add('tic'); S.tono({ f: 660, dur: 0.06, tipo: 'square', gan: 0.08 }); S.vibrar(20); } }
    const apagadas = Math.floor(t.fraccion * bombillas.length); // las bombillas se apagan con el tiempo: son el anillo de progreso
    bombillas.forEach((b, k) => b.classList.toggle('apagado', k < apagadas));
  });
  M.on('urgente', () => { if (intermedio.hidden) return; intermedio.classList.add('urgente'); telon.classList.add('tiembla-telon'); $('.cartel-colgante h2').textContent = '¡A escena!'; SON.redoble(10); });
  M.on('extendido', t => { if (t.restante > 10) { intermedio.classList.remove('urgente'); telon.classList.remove('tiembla-telon'); SON.finRedoble(); const h = $('.cartel-colgante h2'); if (h) h.textContent = 'Intermedio'; } });
  M.on('fin', f => cerrarIntermedio(!f.saltado));

  /* ---------- El anuncio: llega el top set ---------- */
  function mostrarAnuncio() {
    const e = M.ejercicio(), top = e.ultima.sets.find(x => x.tipo === 'top');
    anuncio.hidden = false;
    anuncio.innerHTML = `<div class="foco-luz"></div><div class="foco-luz b"></div>
      <p class="linea l1">Damas y caballeros…</p>
      <p class="linea l2">el número más difícil de la noche:<br>una sola serie, ${e.topSet.reps[0]} a ${e.topSet.reps[1]} repeticiones, al límite</p>
      <p class="linea l3">Top set</p>
      <p class="linea l4">${e.nombre}</p>
      ${top ? `<p class="linea l5">La marca a batir: <b>${n1(top.peso)} kg × ${top.reps}</b><br>1RM estimado ${n1(M.epley(top.peso, top.reps))} kg</p>` : ''}
      <button class="gran-boton" id="a-la-pista">Salir a la pista</button>`;
    const pasos = $$('.linea, .gran-boton', anuncio);
    SON.redoble(3.4);
    pasos.forEach((el, k) => luego(() => { el.classList.add('ya'); if (k === 2) { SON.finRedoble(); SON.platillo(); sacudir(anuncio); S.vibrar([60, 40, 160]); } else SON.bombo(); }, 500 + k * 750));
    luego(() => S.decir(`Damas y caballeros. El número más difícil de la noche. ${e.nombre}. ${top ? `La marca a batir: ${n1(top.peso)} kilos por ${top.reps}.` : ''}`), 400);
    $('#a-la-pista').onclick = () => { S.callar(); SON.finRedoble(); SON.bombo(); anuncio.hidden = true; anuncio.innerHTML = ''; };
  }

  /* ---------- La fiesta: récord del top set ---------- */
  function mostrarFiesta(rec, alSeguir) {
    fiesta.hidden = false; fiesta.className = 'oscuro';
    fiesta.innerHTML = `<p class="suspenso">Silencio en la carpa…</p><div class="rayos"></div>
      <h2>${palabras('¡NUEVO RÉCORD!', 0.1)}</h2>
      <p class="cinta">${rec.nombre}</p>
      <div class="marca">${n1(rec.peso)} kg × ${rec.reps}</div>
      <p class="rm">1RM estimado: <b>${n1(rec.e1rm)} kg</b> · antes ${n1(rec.previo.e1rm)} (${n1(rec.previo.peso)} × ${rec.previo.reps})</p>
      <button class="gran-boton" id="seguir">Seguir la función</button>
      <p class="corre" id="corre"></p>`;
    SON.redoble(1.5); S.vibrar([20, 30, 20, 30, 20, 30, 20, 30, 20, 30]);
    luego(() => {
      SON.finRedoble(); fiesta.className = 'destello'; SON.platillo(); SON.fanfarria(); SON.aplauso(); S.vibrar([90, 70, 90, 70, 300]); // el patrón de la app, alargado
      lanzar(160, 0.5, 0.45, 20); luego(() => lanzar(90, 0.15, 0.3, 15), 500); luego(() => lanzar(90, 0.85, 0.3, 15), 900); luego(() => lanzar(120, 0.5, 0.2, 17), 1700);
      luego(() => S.decir(`¡Nuevo récord! ${n1(rec.peso)} kilos por ${rec.reps}.`, { pitch: 0.9, rate: 1 }), 500);
      [1900, 2200, 2600].forEach(ms => luego(() => { SON.bombo(); sacudir(fiesta); S.vibrar(40); }, ms));
    }, 1500);
    $('#seguir').onclick = () => { S.callar(); SON.clac(); fiesta.hidden = true; fiesta.innerHTML = ''; alSeguir(); };
  }

  /* ---------- Resumen: el cartel de la mañana siguiente ---------- */
  function terminar() {
    const r = M.terminar();
    cerrarTodo(); SON.platillo();
    conTelon(() => pintarResumen(r));
  }
  function pintarResumen(r) {
    const flecha = t => (t.dir === 'sube' ? `▲ +${n1(t.delta)} kg` : t.dir === 'baja' ? `▼ ${n1(t.delta)} kg` : t.dir === 'igual' ? '● igual que la última vez' : '');
    const completa = r.hechas === r.total;
    escena.innerHTML = `<section class="pantalla p-resumen">
      <div class="rayos"></div>
      <div class="banderines">${'<i></i>'.repeat(16)}</div>
      <p class="script">${r.nombre}${r.corta ? ' · rutina corta' : ''}</p>
      <h1 class="madera">${palabras(completa ? '¡FUNCIÓN CUMPLIDA!' : '¡TELÓN ABAJO!', 0.2)}</h1>
      <div class="cifras">
        <div class="cifra"><b>${r.hechas}/${r.total}</b><span>series hechas</span></div>
        <div class="cifra"><b>${r.minutos}</b><span>min reales</span></div>
        <div class="cifra"><b>${r.volumen.toLocaleString('es')}</b><span>kilos levantados</span></div>
      </div>
      ${r.tops.length ? `<div class="cronica"><h3>Top sets del día</h3>${r.tops.map(t => `<p>${t.nombre}: ${n1(t.peso)} kg × ${t.reps} <span class="sube">${flecha(t)}</span></p>`).join('')}</div>` : ''}
      <div class="cronica" style="animation-delay:2.1s">${r.pendientes.length ? `<h3>Ejercicios con series sin terminar</h3><ul>${r.pendientes.map(n => `<li>${n}</li>`).join('')}</ul>` : '<p>Todas las series quedaron registradas.</p>'}</div>
      ${r.tops.some(t => t.record) ? '<p class="sello">★ Noche de récord ★</p>' : ''}
      <button class="gran-boton" id="al-plan">Volver al plan</button>
    </section>`;
    $('#al-plan').onclick = () => { SON.clac(); conTelon(pintarInicio); };
    luego(() => { SON.fanfarria(); if (completa) { SON.aplauso(); lanzar(140, 0.5, 0.25, 18); } S.vibrar([60, 50, 60, 50, 200]); }, 900);
    [1400, 1700, 2000].forEach(ms => luego(() => { SON.bombo(); S.vibrar(25); }, ms));
  }

  /* ---------- Enlaces directos del mock ---------- */
  function cerrarTodo() {
    esperas.forEach(clearTimeout); esperas = []; SON.finRedoble(); S.callar();
    [intermedio, anuncio, fiesta].forEach(x => { x.hidden = true; x.innerHTML = ''; });
    telon.classList.remove('cerrado', 'tiembla-telon'); pregon.classList.remove('ya'); papeles = [];
  }
  function ir(pantalla) {
    cerrarTodo(); clave = 'completa'; M.iniciar(clave); anunciado = {};
    if (pantalla === 'inicio') pintarInicio();
    else if (pantalla === 'rutina') pintarRutina();
    else if (pantalla === 'sesion') { anunciado[0] = true; M.simular(5); pintarPista(); }
    else if (pantalla === 'descanso') { anunciado[0] = true; M.simular(1); M.descansar(180); pintarPista(); mostrarIntermedio(); }
    else if (pantalla === 'topset') { pintarPista(); entrar(); }
    else if (pantalla === 'record') { anunciado[0] = true; pintarPista(); luego(() => hecha(0), 700); }
    else if (pantalla === 'resumen') { const v = M.estado().values[0][0]; M.registrar(0, { peso: v.peso, reps: v.reps }); M.simular(M.total()); pintarResumen(M.terminar()); }
  }

  window.MOCK_MENU.montar({ ir, motor: M });
})();
