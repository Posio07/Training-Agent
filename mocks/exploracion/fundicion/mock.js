/* Fundición. El peso es materia: cada serie registrada es un martillazo que suelta un disco al rojo en el foso (con gravedad), el descanso
 * es la pieza que se enfría, el top set es la colada y el resumen es el montón de hierro que moviste. */
(function () {
  'use strict';
  const D = window.MOCK_DATOS, M = window.MOCK_MOTOR.crear(D), S = window.MOCK_SONIDO, n1 = M.n1;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const escena = $('#escena'), enfriado = $('#enfriado'), crisol = $('#crisol'), placa = $('#placa'), colada = $('#colada'), aviso = $('#aviso');
  let clave = 'completa', anunciado = {}, esperas = [];
  const luego = (fn, ms) => { const t = setTimeout(fn, ms); esperas.push(t); return t; };
  const fechaCorta = iso => new Date(iso + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const sacudir = (el, fuerte) => { el.classList.remove('tiembla', 'tiembla-fuerte'); void el.offsetWidth; el.classList.add(fuerte ? 'tiembla-fuerte' : 'tiembla'); };
  function avisar(txt, ms) { aviso.textContent = txt; aviso.classList.add('ya'); luego(() => aviso.classList.remove('ya'), ms || 3600); }

  /* ---------- El taller suena ---------- */
  const SON = {
    tic: () => S.tono({ f: 320, dur: 0.03, tipo: 'square', gan: 0.12 }),
    clanc: () => { S.tono({ f: 1240, dur: 0.14, tipo: 'triangle', gan: 0.2 }); S.tono({ f: 1830, dur: 0.1, tipo: 'triangle', gan: 0.12 }); },
    golpe(fuerza) { const k = fuerza || 1; S.tono({ f: 95, f2: 38, dur: 0.32, gan: 0.9 }); S.ruido({ dur: 0.09, f: 900, filtro: 'lowpass', gan: 0.5 }); [1900, 2760, 3420].forEach((f, i) => S.tono({ f, dur: 0.25 + k * 0.25, tipo: 'triangle', gan: 0.1 * k / (i + 1) })); },
    siseo: d => S.ruido({ dur: d || 1.3, f: 5200, filtro: 'highpass', gan: 0.22, ataque: 0.03 }),
    fuelle: () => S.ruido({ dur: 0.7, f: 380, f2: 1500, filtro: 'lowpass', gan: 0.35, ataque: 0.25 }),
    rugido: d => S.ruido({ dur: d, f: 160, f2: 950, filtro: 'lowpass', gan: 0.4, ataque: d * 0.8 }),
    trinquete: n => { for (let i = 0; i < n; i++) S.tono({ f: 700 + (i % 2) * 120, dur: 0.025, tipo: 'square', gan: 0.1, cuando: i * 0.075 * (1 + i / n) }); },
    cae: () => S.tono({ f: 520 + Math.random() * 300, dur: 0.07, tipo: 'triangle', gan: 0.1 }),
  };

  /* ---------- Color del metal según su calor (0 frío, 1 blanco) ---------- */
  const ESCALA = [[0, [20, 12, 10]], [0.22, [90, 18, 6]], [0.45, [200, 50, 10]], [0.68, [255, 122, 18]], [0.85, [255, 194, 58]], [1, [255, 241, 201]]];
  function calor(t) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < ESCALA.length; i++) if (t <= ESCALA[i][0]) { const a = ESCALA[i - 1], b = ESCALA[i], k = (t - a[0]) / (b[0] - a[0]); return a[1].map((v, j) => Math.round(v + (b[1][j] - v) * k)); }
    return ESCALA[ESCALA.length - 1][1];
  }
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;

  /* ---------- El foso: discos con gravedad ---------- */
  const lzFoso = $('#foso'), cf = lzFoso.getContext('2d'), lzCh = $('#chispas'), cc = lzCh.getContext('2d');
  let W = 0, H = 0, dpr = 1, discos = [], chispas = [], gx = 0, brasas = 0, vapor = 0, andando = false;
  function medir() { dpr = Math.min(2, window.devicePixelRatio || 1); W = lzFoso.clientWidth; H = lzFoso.clientHeight; [lzFoso, lzCh].forEach(l => { l.width = W * dpr; l.height = H * dpr; }); }
  window.addEventListener('resize', medir); medir();
  function soltar(serie, x, y, vy, escala) {
    const vol = serie.volumen > 0 ? serie.volumen : serie.reps * 12;
    discos.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: vy == null ? -9 : vy, r: (9 + Math.sqrt(vol) * 0.46) * (escala || 1), a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, t: 1, top: serie.tipo === 'top', txt: `${n1(serie.peso)}×${serie.reps}`, quieto: 0 });
    arrancar();
  }
  function saltarChispas(x, y, n, fuerza, color) {
    for (let i = 0; i < n; i++) { const a = -Math.PI * Math.random(), v = (0.25 + Math.random()) * (fuerza || 12); chispas.push({ x, y, px: x, py: y, vx: Math.cos(a) * v * 1.2, vy: Math.sin(a) * v, vida: 40 + Math.random() * 50, g: 0.45, c: color || null, tipo: 'chispa' }); }
    arrancar();
  }
  function nubeVapor(n) { for (let i = 0; i < n; i++) chispas.push({ x: Math.random() * W, y: H * (0.55 + Math.random() * 0.5), vx: (Math.random() - 0.5) * 1.5, vy: -(1.5 + Math.random() * 3.5), vida: 70 + Math.random() * 60, r: 30 + Math.random() * 60, tipo: 'vapor' }); arrancar(); }
  function arrancar() { if (!andando) { andando = true; requestAnimationFrame(cuadro); } }
  function fisica() {
    const piso = H, n = discos.length;
    for (const d of discos) { d.vy += 0.55; d.vx += gx; d.vx *= 0.992; d.vy *= 0.992; d.x += d.vx; d.y += d.vy; d.a += d.va; d.t = Math.max(0, d.t - 0.004); }
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < n; i++) {
        const a = discos[i];
        if (a.y + a.r > piso) { a.y = piso - a.r; if (a.vy > 2.5 && it === 0) SON.cae(); a.vy *= -0.28; a.vx *= 0.9; a.va = a.vx / a.r; }
        if (a.x - a.r < 0) { a.x = a.r; a.vx *= -0.4; } else if (a.x + a.r > W) { a.x = W - a.r; a.vx *= -0.4; }
        for (let j = i + 1; j < n; j++) {
          const b = discos[j], dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r, d2 = dx * dx + dy * dy;
          if (d2 >= min * min || d2 === 0) continue;
          const dist = Math.sqrt(d2), nx = dx / dist, ny = dy / dist, sol = (min - dist), ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
          a.x -= nx * sol * mb / tot; a.y -= ny * sol * mb / tot; b.x += nx * sol * ma / tot; b.y += ny * sol * ma / tot;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) { const imp = -(1.25) * rv / tot; a.vx -= imp * mb * nx; a.vy -= imp * mb * ny; b.vx += imp * ma * nx; b.vy += imp * ma * ny; }
        }
      }
    }
  }
  function pintarDisco(d) {
    cf.save(); cf.translate(d.x, d.y); cf.rotate(d.a);
    const caliente = calor(0.25 + d.t * 0.75), g = cf.createRadialGradient(-d.r * 0.3, -d.r * 0.3, d.r * 0.1, 0, 0, d.r);
    if (d.t > 0.02) { g.addColorStop(0, rgb(calor(0.4 + d.t * 0.6))); g.addColorStop(1, rgb(caliente)); cf.shadowColor = rgb(calor(0.68)); cf.shadowBlur = 22 * d.t; }
    else if (d.top) { g.addColorStop(0, '#ffe59a'); g.addColorStop(1, '#b07a12'); }
    else { g.addColorStop(0, '#c9d3d8'); g.addColorStop(1, '#5f6b71'); }
    cf.fillStyle = g; cf.beginPath(); cf.arc(0, 0, d.r, 0, 6.3); cf.fill(); cf.shadowBlur = 0;
    cf.lineWidth = 1.5; cf.strokeStyle = 'rgba(0,0,0,.65)'; cf.stroke();
    cf.beginPath(); cf.arc(0, 0, d.r * 0.72, 0, 6.3); cf.strokeStyle = 'rgba(0,0,0,.25)'; cf.stroke();
    cf.fillStyle = d.t > 0.3 ? '#2a0700' : '#14181a'; cf.font = `800 ${Math.max(8, d.r * 0.5)}px "Saira Condensed", sans-serif`; cf.textAlign = 'center'; cf.textBaseline = 'middle'; cf.fillText(d.txt, 0, 1);
    cf.restore();
  }
  function cuadro() {
    fisica();
    cf.setTransform(dpr, 0, 0, dpr, 0, 0); cf.clearRect(0, 0, W, H); discos.forEach(pintarDisco);
    cc.setTransform(dpr, 0, 0, dpr, 0, 0); cc.clearRect(0, 0, W, H);
    if (brasas > 0 && Math.random() < brasas) chispas.push({ x: Math.random() * W, y: H + 5, vx: (Math.random() - 0.5), vy: -(1 + Math.random() * 2.5), vida: 120 + Math.random() * 120, tipo: 'brasa', f: Math.random() * 6 });
    chispas = chispas.filter(p => p.vida > 0);
    cc.lineCap = 'round';
    for (const p of chispas) {
      p.vida--;
      if (p.tipo === 'chispa') {
        p.px = p.x; p.py = p.y; p.vy += p.g; p.x += p.vx; p.y += p.vy;
        if (p.y > H - 2) { p.y = H - 2; p.vy *= -0.45; p.vx *= 0.7; }
        const k = Math.min(1, p.vida / 40); cc.strokeStyle = p.c || rgb(calor(0.55 + k * 0.45)); cc.globalAlpha = k; cc.lineWidth = 1 + k * 2.2;
        cc.beginPath(); cc.moveTo(p.px - p.vx, p.py - p.vy); cc.lineTo(p.x, p.y); cc.stroke();
      } else if (p.tipo === 'brasa') {
        p.f += 0.08; p.x += p.vx + Math.sin(p.f) * 0.6; p.y += p.vy; const k = Math.min(1, p.vida / 80);
        cc.globalAlpha = k; cc.fillStyle = rgb(calor(0.5 + k * 0.4)); cc.fillRect(p.x, p.y, 2.5, 2.5);
      } else { // vapor
        p.x += p.vx; p.y += p.vy; p.r += 0.8; const k = Math.min(1, p.vida / 70);
        const g = cc.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, `rgba(235,240,242,${0.28 * k})`); g.addColorStop(1, 'rgba(235,240,242,0)');
        cc.globalAlpha = 1; cc.fillStyle = g; cc.beginPath(); cc.arc(p.x, p.y, p.r, 0, 6.3); cc.fill();
      }
    }
    cc.globalAlpha = 1;
    const vivo = chispas.length || brasas > 0 || discos.some(d => d.t > 0 || Math.abs(d.vx) + Math.abs(d.vy) > 0.6) || Math.abs(gx) > 0.02;
    if (vivo) requestAnimationFrame(cuadro); else andando = false;
  }
  // Inclinar el teléfono mueve el montón.
  window.addEventListener('deviceorientation', ev => { if (ev.gamma == null) return; gx = Math.max(-0.5, Math.min(0.5, ev.gamma / 60)); if (Math.abs(gx) > 0.03) arrancar(); });
  function empujar(x, y, f) { discos.forEach(d => { const dx = d.x - x, dy = d.y - y, dist = Math.hypot(dx, dy) || 1; if (dist < 150) { const k = (1 - dist / 150) * f; d.vx += dx / dist * k; d.vy += dy / dist * k - 2; } }); arrancar(); }

  /* ---------- Colada: la transición ---------- */
  function conColada(pintar) {
    colada.className = ''; void colada.offsetWidth; colada.className = 'baja'; SON.rugido(0.6);
    luego(() => { pintar(); colada.className = 'sale'; SON.siseo(0.7); luego(() => { colada.className = ''; }, 650); }, 520);
  }

  /* ---------- Inicio: la boca del horno ---------- */
  const VOLANTE = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#C0392B" stroke-width="11"/><circle cx="50" cy="50" r="42" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>
    ${[0, 60, 120].map(a => `<rect x="46" y="8" width="8" height="84" rx="3" fill="#A93226" transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="13" fill="#8D9BA3" stroke="#15181a" stroke-width="3"/><circle cx="50" cy="50" r="4" fill="#15181a"/></svg>`;
  function pintarInicio() {
    const hoy = D.semana[D.hoy], seriesPasada = D.historial.reduce((a, h) => a + h.hechas, 0);
    discos = []; brasas = 0.35; arrancar();
    escena.innerHTML = `<section class="pantalla p-inicio">
      <div class="rotulo chapa"><h1 class="plantilla grabado">Fundición ${D.perfil.nombre}</h1><p>${D.perfil.division} · ${D.perfil.objetivo.toLowerCase()} · ${D.perfil.dias} coladas por semana</p></div>
      <div class="horno"><div class="remaches">${Array.from({ length: 16 }, (_, i) => `<i style="transform:rotate(${i * 22.5}deg) translateY(calc(min(84vw, 350px, 46vh) * -0.468))"></i>`).join('')}</div>
        <div class="boca"><span class="turno">Colada de hoy</span><span class="dia calima">${hoy.nombre.split('· ')[1]}</span><span class="dato">${hoy.series} series · ${hoy.minutos} min</span><span class="dato">Top set: ${hoy.topSet}</span></div></div>
      <button class="volante" id="volante" aria-label="Abrir el horno: ver la rutina de hoy">${VOLANTE}</button>
      <p class="instruccion">Gira el volante para abrir el horno</p>
      <div class="lingoteras">${D.semana.map((d, i) => `<button class="lingotera ${i === D.hoy ? 'hoy' : ''}" data-dia="${i}"><b>${i + 1}</b><span>${d.nombre.split('· ')[1].replace(/[()]/g, '')}</span></button>`).join('')}</div>
      <p class="parte-semana">Semana pasada: ${D.historial.length} coladas de ${D.perfil.dias} · ${seriesPasada} series</p>
    </section>`;
    const abrir = () => {
      const v = $('#volante'); if (v.classList.contains('gira')) return;
      v.classList.add('gira'); SON.trinquete(14); S.vibrar([15, 60, 15, 60, 15, 70, 15, 90, 15, 120, 30]);
      luego(() => { SON.golpe(0.6); sacudir(escena); const r = $('.boca').getBoundingClientRect(), o = lzFoso.getBoundingClientRect(); saltarChispas(r.left - o.left + r.width / 2, r.top + r.height / 2, 70, 16); S.vibrar(80); conColada(pintarRutina); }, 1150);
    };
    $('#volante').onclick = abrir;
    $$('.lingotera').forEach(b => b.onclick = () => { SON.clanc(); S.vibrar(15); if (Number(b.dataset.dia) === D.hoy) abrir(); else avisar(`${D.semana[b.dataset.dia].nombre}: ese molde todavía está frío. Hoy se cuela ${hoy.nombre.split('· ')[1]}.`); });
  }

  /* ---------- Rutina: la orden de colada ---------- */
  function pintarRutina() {
    const s = D.sesiones[clave], corta = clave !== 'completa', tope = corta ? s.minutosPedidos : s.capacidad;
    const regla = id => D.reglas.find(r => r.id === id);
    brasas = 0.2; discos = []; arrancar();
    let k = 0;
    const molde = e => {
      const dN = regla(e.tipo === 'multiarticular' ? 'DESCANSO_MULTIARTICULAR_S' : 'DESCANSO_AISLAMIENTO_S'), piso = regla('DESCANSO_PISO_RESPALDADO_S');
      return `<li class="molde"><h2>${e.nombre}</h2>
        <p class="ficha-linea">${e.grupo} · ${e.topSet ? `top set con RIR ${e.topSet.rir[0]}-${e.topSet.rir[1]}, back-off con ${e.topSet.reduccion} % menos · descanso ${e.sets[0].descanso} y ${e.sets[1].descanso}` : `descanso ${e.sets[0].descanso}`}</p>
        <div class="lingotes">${e.sets.map(st => `<div class="lingote ${st.tipo === 'top' ? 'top' : e.tipo === 'aislamiento' ? 'aislado' : ''}" style="animation-delay:${(k++ * 0.07).toFixed(2)}s"><small>${st.tipo === 'top' ? 'top' : st.tipo === 'backoff' ? 'back-off' : 'serie'}</small>${st.reps}</div>`).join('')}</div>
        ${e.evidenciaPorVerificar ? '<div class="etiqueta-aviso"><span>Evidencia por verificar</span></div>' : ''}
        <div class="detalle"><div>
          <p><span class="cuno">${dN.nivel}</span>Descanso de ${e.sets[e.sets.length - 1].descanso}: ${dN.fuente} (${dN.dec}).</p>
          <p><span class="cuno">${piso.nivel}</span>Ningún descanso baja de ${piso.valor} s: Singer et al. 2024, leído en resumen.</p>
          ${e.topSet ? `<p><span class="cuno">E4</span>El top set solo existe en definición (${regla('TOP_SET_SOLO_EN_DEFINICION').dec}).</p>` : ''}
          <p>Relación con ${e.grupo.toLowerCase()}: ${e.evidencia.replace('_', ' ')}.</p></div></div></li>`;
    };
    const marcas = Array.from({ length: 16 }, (_, i) => { const a = (-180 + i * 12) * Math.PI / 180; return `<line x1="${64 + Math.cos(a) * 50}" y1="${70 + Math.sin(a) * 50}" x2="${64 + Math.cos(a) * (i % 5 ? 56 : 60)}" y2="${70 + Math.sin(a) * (i % 5 ? 56 : 60)}" stroke="#15181a" stroke-width="${i % 5 ? 1.5 : 3}"/>`; }).join('');
    escena.innerHTML = `<section class="pantalla p-rutina">
      <div class="cabecera"><button class="tecla" id="volver" aria-label="Volver al horno">‹</button><h1>Orden de colada · ${s.nombre.split('· ')[1]}</h1><span style="width:44px"></span></div>
      <div class="manometro chapa"><svg viewBox="0 0 128 84"><path d="M8 70 A56 56 0 0 1 120 70" fill="#e9eef0" stroke="#15181a" stroke-width="3"/>${marcas}
        <g class="aguja" id="aguja"><polygon points="62,70 64,18 66,70" fill="#C0392B"/></g><circle cx="64" cy="70" r="6" fill="#15181a"/></svg>
        <div class="lectura"><b class="plantilla grabado">${s.minutos} min</b><span>de ${tope} · ${s.series} series</span>${tope > s.minutos ? `<span>${tope - s.minutos === 1 ? 'sobra 1 min' : `sobran ${tope - s.minutos} min`}</span>` : ''}</div></div>
      <div class="palanca ${corta ? 'corta' : ''}"><div class="mango"></div>
        <button data-clave="completa" class="${corta ? '' : 'activo'}">Sesión completa<small>${D.sesiones.completa.minutos} min · ${D.sesiones.completa.series} series</small></button>
        <button data-clave="corta30" class="${corta ? 'activo' : ''}">Hoy tengo 30 min<small>rutina corta · ${D.sesiones.corta30.series} series</small></button></div>
      <ol class="moldes">${s.ejercicios.map(molde).join('')}</ol>
      <button class="encender" id="encender"><div class="carga"></div><span>Empezar sesión</span><small>mantén apretado para encender</small></button>
    </section>`;
    luego(() => { $('#aguja').style.transform = `rotate(${-90 + 180 * s.minutos / tope}deg)`; }, 80);
    $('#volver').onclick = () => { SON.tic(); conColada(pintarInicio); };
    $$('.palanca button').forEach(b => b.onclick = () => { if (b.dataset.clave === clave) return; clave = b.dataset.clave; SON.clanc(); S.vibrar(30); pintarRutina(); });
    $$('.molde').forEach(m => m.onclick = () => { m.classList.toggle('abierto'); SON.tic(); });
    // Mantener apretado para encender: la carga sube, vibra y ruge; soltar antes la apaga.
    const b = $('#encender'), barra = $('.carga', b); let anim = null, pulso = null;
    const soltar_ = () => { if (!anim) return; anim.cancel(); anim = null; clearInterval(pulso); b.classList.remove('cargando'); };
    b.onpointerdown = ev => {
      ev.preventDefault(); if (anim) return;
      b.classList.add('cargando'); SON.rugido(0.75); pulso = setInterval(() => S.vibrar(18), 90);
      anim = barra.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 750, fill: 'forwards', easing: 'cubic-bezier(.5,0,1,.6)' });
      anim.onfinish = () => { clearInterval(pulso); b.classList.remove('cargando'); anim = null; empezar(); };
    };
    b.onpointerup = b.onpointerleave = b.onpointercancel = soltar_;
  }

  /* ---------- Sesión: el yunque ---------- */
  function empezar() {
    M.iniciar(clave); anunciado = {}; discos = [];
    SON.golpe(1); S.vibrar([120, 40, 200]); sacudir(escena, true); saltarChispas(W / 2, H * 0.8, 120, 20);
    conColada(() => { pintarYunque(); entrar(); });
  }
  function entrar() {
    const s = M.estado(), i = s.exIndex, p = M.pendiente(i);
    if (p >= 0 && s.ejercicios[i].sets[p].tipo === 'top' && !anunciado[i]) { anunciado[i] = true; mostrarCrisol(); }
  }
  const DISCO = { 25: ['#D22B2B', 96, 15], 20: ['#2356C9', 90, 13], 15: ['#F2C230', 80, 11], 10: ['#2E9E4F', 68, 9], 5: ['#EDEDED', 52, 7], 2.5: ['#9AA3A8', 40, 6], 1.25: ['#9AA3A8', 32, 5] };
  function barraSvg(peso) { // la barra cargada, con los colores de competición de los discos
    const r = M.discosDe(peso); let x = 0;
    const lado = r.discos.map((d, i) => { const [c, h, w] = DISCO[d]; const o = { c, h, w, x, i }; x += w + 1.5; return o; });
    return `<svg viewBox="0 0 360 104" aria-label="Barra cargada"><rect x="0" y="48" width="360" height="8" rx="3" fill="#8D9BA3"/><rect x="0" y="48" width="360" height="3" rx="1.5" fill="#D3DCE0" opacity=".7"/>
      <rect x="114" y="40" width="8" height="24" rx="2" fill="#4A5358"/><rect x="238" y="40" width="8" height="24" rx="2" fill="#4A5358"/>
      ${lado.map(o => `<rect class="disco izq" style="animation-delay:${o.i * 45}ms" x="${112 - o.x - o.w}" y="${52 - o.h / 2}" width="${o.w}" height="${o.h}" rx="2.5" fill="${o.c}" stroke="#000" stroke-width="1"/><rect class="disco der" style="animation-delay:${o.i * 45}ms" x="${248 + o.x}" y="${52 - o.h / 2}" width="${o.w}" height="${o.h}" rx="2.5" fill="${o.c}" stroke="#000" stroke-width="1"/>`).join('')}</svg>
      <p class="carga-nota">barra ${n1(D.perfil.barra)} + ${r.discos.length ? r.discos.map(n1).join(' + ') + ' por lado' : 'sin discos'}${Math.abs(r.logrado - peso) > 0.01 ? ` (queda en ${n1(r.logrado)} kg)` : ''}</p>`;
  }
  const pesaHtml = peso => `<div class="pesa-asa"></div><div class="pesa" style="transform:scale(${(0.75 + Math.min(0.45, peso / 130)).toFixed(2)})">${n1(peso)} kg</div>`;
  const YUNQUE = `<svg class="base" viewBox="0 0 230 100" preserveAspectRatio="none"><defs><linearGradient id="gy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b4bfc4"/><stop offset=".18" stop-color="#6d797f"/><stop offset="1" stop-color="#2a3033"/></linearGradient></defs>
    <path d="M0 6 Q0 0 8 0 H222 Q230 0 230 6 V22 Q190 26 172 40 V54 H200 V100 H30 V54 H58 V40 Q40 26 0 22 Z" fill="url(#gy)" stroke="#000" stroke-width="2"/></svg>`;
  function pintarYunque() {
    const s = M.estado(), e = M.ejercicio(), i = s.exIndex, p = M.pendiente(i), vals = s.values[i];
    const st = p >= 0 ? e.sets[p] : null, v = p >= 0 ? vals[p] : null, ult = st ? M.ultimaDe(e, st) : null, ultimo = i === s.ejercicios.length - 1, top = st && st.tipo === 'top';
    brasas = top ? 0.6 : 0.12; arrancar();
    escena.innerHTML = `<section class="pantalla p-yunque ${top ? 'top' : ''}">
      <div class="cabecera"><button class="tecla" id="salir" aria-label="Salir de la sesión">✕</button>
        <div class="prog">${s.corta ? 'Rutina corta · ' : ''}Ejercicio <b>${i + 1}</b> de ${s.ejercicios.length} · <b>${M.hechas()}</b>/${M.total()} series</div>
        <button class="terminar" id="terminar">Terminar</button></div>
      <div class="ficha"><span class="tipo">${st ? M.etiqueta(st) : 'Ejercicio completo'}</span><h1>${e.nombre}</h1>
        <p>${e.grupo}${st ? ` · ${st.reps} reps` : ''} · ${st ? (ult ? `última vez (${fechaCorta(e.ultima.fecha)}) <b>${n1(ult.peso)} kg × ${ult.reps}</b>` : 'primera vez') : vals.map(x => `<b>${n1(x.peso)}×${x.reps}</b>`).join(' ')}</p></div>
      <div class="carga-zona" id="carga">${st ? (e.barra ? barraSvg(v.peso) : pesaHtml(v.peso)) : ''}</div>
      ${st ? `<div class="mandos">
        <div class="mando chapa"><button class="tecla" data-d="peso" data-n="-2.5" aria-label="Quitar 2,5 kg">−</button><div class="lee"><b id="v-peso">${n1(v.peso)}</b><span>kg</span></div><button class="tecla" data-d="peso" data-n="2.5" aria-label="Sumar 2,5 kg">+</button></div>
        <div class="mando chapa"><button class="tecla" data-d="reps" data-n="-1" aria-label="Una repetición menos">−</button><div class="lee"><b id="v-reps">${v.reps}</b><span>reps</span></div><button class="tecla" data-d="reps" data-n="1" aria-label="Una repetición más">+</button></div></div>` : ''}
      <div class="ranuras">${e.sets.map((x, j) => `<div class="ranura ${vals[j].done ? 'hecha' : j === p ? 'ahora' : ''}">${vals[j].done ? `${n1(vals[j].peso)}×${vals[j].reps}` : x.tipo === 'top' ? 'TOP' : x.reps}</div>`).join('')}</div>
      <div class="yunque-zona"><button class="tecla" id="ant" ${i === 0 ? 'disabled' : ''} aria-label="Ejercicio anterior">‹</button>
        ${st ? `<div class="yunque" id="yunque" role="button" tabindex="0" aria-label="Serie hecha">${YUNQUE}<div class="martillo" id="martillo"></div><div class="rotulo-golpe">Hecha<small>${top ? 'mantén para cargar el golpe' : 'golpea para registrar'}</small></div></div>`
          : `<button class="siguiente-ej" id="sig-ej">${ultimo ? 'Terminar la sesión' : 'Siguiente ejercicio'}</button>`}
        <button class="tecla" id="sig" ${ultimo ? 'disabled' : ''} aria-label="Ejercicio siguiente">›</button></div>
      <div class="foso-borde"></div>
    </section>`;
    $('#salir').onclick = () => { SON.tic(); M.iniciar(clave); conColada(pintarRutina); };
    $('#terminar').onclick = terminar;
    $('#ant').onclick = () => { SON.tic(); M.anterior(); pintarYunque(); };
    $('#sig').onclick = () => { SON.tic(); M.siguiente(); pintarYunque(); entrar(); };
    if (!st) { $('#sig-ej').onclick = () => { if (ultimo) terminar(); else { SON.clanc(); M.siguiente(); conColada(() => { pintarYunque(); entrar(); }); } }; return; }
    $$('.mando .tecla').forEach(b => b.onclick = () => {
      const campo = b.dataset.d, paso = Number(b.dataset.n), antes = v[campo];
      v[campo] = Math.max(campo === 'reps' ? 1 : 0, Math.round((v[campo] + paso) * 100) / 100);
      const el = $('#v-' + campo); el.textContent = campo === 'peso' ? n1(v.peso) : v.reps; el.classList.remove('salta'); void el.offsetWidth; el.classList.add('salta');
      if (campo === 'peso') { $('#carga').innerHTML = e.barra ? barraSvg(v.peso) : pesaHtml(v.peso); if (v.peso > antes) { SON.clanc(); sacudirSuave(); } else SON.tic(); S.vibrar(v.peso > antes ? 25 : 10); }
      else { SON.tic(); S.vibrar(10); }
    });
    // El martillo: un toque golpea; en el top set, mantener apretado carga el golpe.
    const y = $('#yunque'), m = $('#martillo'); let t0 = 0, sube = null, pulso = null, hecho = false;
    y.onpointerdown = ev => {
      ev.preventDefault(); if (hecho) return; t0 = performance.now(); m.classList.add('cargando');
      sube = m.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${top ? -70 : -22}px)` }], { duration: top ? 1100 : 160, fill: 'forwards', easing: 'ease-out' });
      if (top) { SON.rugido(1.1); pulso = setInterval(() => S.vibrar(14), 80); }
    };
    const golpear = () => {
      if (!t0 || hecho) return; hecho = true; clearInterval(pulso);
      const carga = top ? Math.min(1, (performance.now() - t0) / 1100) : 0.3; if (sube) sube.cancel();
      const cae = y.clientHeight * 0.38 - 44 + 4;
      m.animate([{ transform: `translateY(${top ? -70 * carga : -22}px)` }, { transform: `translateY(${cae}px)`, offset: 0.22, easing: 'cubic-bezier(.7,0,1,.5)' }, { transform: `translateY(${cae - 26}px)`, offset: 0.5 }, { transform: `translateY(${cae}px)` }], { duration: 420, fill: 'forwards' });
      luego(() => hecha(p, carga), 92);
    };
    y.onpointerup = golpear; y.onpointerleave = () => { if (t0 && !hecho) golpear(); };
    y.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { t0 = performance.now(); golpear(); } };
  }
  function sacudirSuave() { const c = $('#carga'); c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(5px)' }, { transform: 'translateY(0)' }], { duration: 140 }); }

  function hecha(setIdx, carga) {
    const s = M.estado(), v = s.values[s.exIndex][setIdx];
    const r = M.registrar(setIdx, { peso: v.peso, reps: v.reps });
    if (!r.ok) { avisar(r.error); return; }
    const y = $('#yunque').getBoundingClientRect(), o = lzFoso.getBoundingClientRect(), px = y.left - o.left + y.width / 2, py = y.top + y.height * 0.38;
    const top = r.serie.tipo === 'top', mejor = r.serie.contraUltima > 1.0001;
    SON.golpe(0.5 + carga); S.vibrar(top ? [60, 30, 180] : [50]); sacudir(escena, top);
    const fl = document.createElement('div'); fl.className = 'destello'; escena.appendChild(fl); luego(() => fl.remove(), 360);
    saltarChispas(px, py, Math.round(30 + carga * 150 + (mejor ? 40 : 0)), 10 + carga * 14);
    soltar(r.serie, px, py - 10, -11 - carga * 6);
    const ran = $$('.ranura')[setIdx]; if (ran) { ran.className = 'ranura hecha'; ran.textContent = `${n1(v.peso)}×${v.reps}`; }
    if (r.a5) avisar(`Un back-off pesa ${n1(r.a5.maximo)} kg o menos (90 % del top set de ${n1(r.a5.top)}). Esta serie se guarda como serie de trabajo.`, 4200);
    else if (mejor && !r.record) avisar(`Mejor que la última vez: ${n1(v.peso)} kg × ${v.reps}.`, 1500);
    luego(() => { if (r.record) mostrarPlaca(r.record, () => despues(r)); else despues(r); }, r.a5 ? 2600 : mejor ? 1500 : 950);
  }
  function despues(r) {
    if (r.serie.sesionCompleta) { terminar(); return; }
    if (M.estado().rest) mostrarEnfriado(); else volverAlYunque();
  }
  function volverAlYunque() {
    const s = M.estado();
    if (M.pendiente(s.exIndex) < 0 && s.exIndex < s.ejercicios.length - 1) M.siguiente();
    pintarYunque(); entrar();
  }

  /* ---------- Enfriado: el descanso ---------- */
  function pintarCalor(fraccion) {
    const t = 1 - fraccion;
    enfriado.style.setProperty('--fondo', rgb(calor(t))); enfriado.style.setProperty('--fondo2', rgb(calor(t * 0.62)));
    enfriado.style.setProperty('--tinta', t > 0.6 ? '#1a0500' : t > 0.3 ? '#fff1c9' : '#ff9a4a');
    const g = $('#grados'); if (g) g.textContent = `${Math.round(20 + t * 1180).toLocaleString('es')} °C`;
    const b = $('#barra-temp'); if (b) b.style.transform = `scaleX(${t})`;
    brasas = t * 0.9;
  }
  function mostrarEnfriado() {
    const s = M.estado(), i = s.exIndex, p = M.pendiente(i);
    let sigue;
    if (p >= 0) { const st = s.ejercicios[i].sets[p], v = s.values[i][p]; sigue = `<b>${M.etiqueta(st)} · ${s.ejercicios[i].nombre}</b>${st.reps} reps con ${n1(v.peso)} kg`; }
    else if (i < s.ejercicios.length - 1) { const e = s.ejercicios[i + 1]; sigue = `<b>${e.nombre}</b>ejercicio ${i + 2} de ${s.ejercicios.length} · ${e.sets.length} series de ${e.sets[0].reps}`; }
    else sigue = '<b>Fin de la sesión</b>';
    enfriado.hidden = false; enfriado.className = '';
    enfriado.innerHTML = `<h2>Descanso · enfriando</h2><div class="grados" id="grados"></div>
      <div class="reloj calima" id="reloj" role="timer">${M.fmt(M.restante())}</div>
      <div class="barra-temp"><i id="barra-temp"></i></div>
      <p class="sigue">Sigue${sigue}</p>
      <div class="botones"><button id="mas">+30 s<small>avivar el fuego</small></button><button id="saltar">Saltar<small>templar ya</small></button></div>
      ${M.demo ? '<p class="nota-demo">Mock: el descanso corre acelerado hasta los últimos 10 segundos.</p>' : ''}`;
    pintarCalor(0); arrancar(); SON.fuelle();
    enfriado.animate([{ opacity: 0, transform: 'scale(1.25)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 280, easing: 'ease-out' });
    $('#mas').onclick = () => { M.extender(30); SON.fuelle(); S.vibrar([20, 30, 40]); saltarChispas(W / 2, H * 0.95, 60, 18); };
    $('#saltar').onclick = () => M.saltar();
  }
  function templar(sonarFin) { // el fin del descanso: la pieza entra al agua
    if (enfriado.hidden) return;
    pintarCalor(1); brasas = 0; nubeVapor(26); SON.siseo(1.4); enfriado.classList.remove('urgente');
    if (sonarFin) { S.tresTonos('triangle', 0.28); S.vibrar([200, 100, 200]); }
    const t = document.createElement('div'); t.className = 'templada'; t.textContent = 'A la barra'; enfriado.appendChild(t);
    $$('#enfriado > :not(.templada)').forEach(x => { x.style.opacity = 0.15; });
    luego(() => { enfriado.hidden = true; enfriado.innerHTML = ''; volverAlYunque(); }, 800);
  }
  M.on('tic', t => {
    const corre = $('#corre'); if (corre) corre.textContent = `El descanso ya corre: ${M.fmt(t.restante)}`;
    const reloj = $('#reloj'); if (!reloj || enfriado.hidden) return;
    pintarCalor(t.fraccion);
    const txt = M.fmt(t.restante);
    if (reloj.textContent !== txt) { reloj.textContent = txt; if (t.restante <= 10) { reloj.classList.remove('tic'); void reloj.offsetWidth; reloj.classList.add('tic'); S.tono({ f: 2100, dur: 0.09, tipo: 'triangle', gan: 0.14 }); S.vibrar(25); } }
  });
  M.on('urgente', () => { if (!enfriado.hidden) { enfriado.classList.add('urgente'); $('#enfriado h2').textContent = 'Casi fría · prepárate'; } });
  M.on('extendido', t => { if (t.restante > 10) { enfriado.classList.remove('urgente'); const h = $('#enfriado h2'); if (h) h.textContent = 'Descanso · enfriando'; } });
  M.on('fin', f => templar(!f.saltado));
  // La calima se mueve: cambia la semilla del ruido unas veces por segundo.
  setInterval(() => { const r = $('#calima-ruido'); if (r && $('.calima')) r.setAttribute('seed', String(1 + Math.floor(Math.random() * 60))); }, 110);

  /* ---------- Crisol: llega el top set ---------- */
  function mostrarCrisol() {
    const e = M.ejercicio(), top = e.ultima.sets.find(x => x.tipo === 'top');
    crisol.hidden = false; brasas = 1; arrancar();
    crisol.innerHTML = `<p class="l l1">Llega la colada</p><p class="l l2 calima">TOP</p><p class="l l2 l2b calima">SET</p>
      <p class="l l3">${e.nombre}</p><p class="l l4">Una sola serie pesada · ${e.topSet.reps[0]}-${e.topSet.reps[1]} reps · RIR ${e.topSet.rir[0]}-${e.topSet.rir[1]}</p>
      ${top ? `<div class="l l5 chapa">A batir<b>${n1(top.peso)} kg × ${top.reps}</b>1RM estimado ${n1(M.epley(top.peso, top.reps))} kg</div>` : ''}
      <button class="a-la-barra" id="a-la-barra">A la barra</button>`;
    crisol.animate([{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }], { duration: 520, easing: 'cubic-bezier(.5,0,.8,.5)' });
    SON.rugido(1.2);
    $$('.l, .a-la-barra', crisol).forEach((el, k) => luego(() => {
      el.classList.add('ya');
      if (k === 1 || k === 2) { SON.golpe(1.2); sacudir(crisol, k === 2); S.vibrar(k === 2 ? [80, 40, 200] : 80); saltarChispas(W / 2, H * 0.4, 90, 20, '#1a0500'); } else SON.clanc();
    }, 600 + k * 420 + (k > 2 ? 250 : 0)));
    $('#a-la-barra').onclick = () => { SON.golpe(0.6); crisol.hidden = true; crisol.innerHTML = ''; brasas = 0.6; };
  }

  /* ---------- Placa: récord del top set, acuñado letra a letra ---------- */
  function mostrarPlaca(rec, alSeguir) {
    placa.hidden = false; placa.className = ''; brasas = 1;
    const sp = txt => txt.split('').map(c => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    placa.innerHTML = `<div class="chapa"><div class="cabeza">Nuevo</div><h2 id="rec-titulo">${sp('RÉCORD')}</h2>
      <p class="ejercicio">${rec.nombre}</p><p class="marca">${sp(`${n1(rec.peso)} kg × ${rec.reps}`)}</p>
      <p class="rm">1RM estimado <b>${n1(rec.e1rm)} kg</b> · antes ${n1(rec.previo.e1rm)} kg (${n1(rec.previo.peso)} × ${rec.previo.reps}) · <b>+${n1(rec.e1rm - rec.previo.e1rm)}</b></p></div>
      <button class="seguir" id="seguir">Seguir la sesión</button><p class="corre" id="corre"></p>`;
    placa.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    // Lluvia de chispas a cámara lenta y, después, los golpes del cuño.
    for (let k = 0; k < 6; k++) luego(() => saltarChispas(W * (0.15 + Math.random() * 0.7), H * (0.25 + Math.random() * 0.3), 70, 9), k * 130);
    S.vibrar([90, 70, 90]); // el patrón de la app
    const letras = $$('#rec-titulo span', placa), cifras = $$('.marca span', placa), chapa = $('.chapa', placa);
    const cunar = (el, fuerte) => { el.classList.add('ya'); SON.golpe(fuerte ? 1.3 : 0.5); sacudir(chapa, false); S.vibrar(fuerte ? 70 : 25); const r = el.getBoundingClientRect(), o = lzFoso.getBoundingClientRect(); saltarChispas(r.left - o.left + r.width / 2, r.top + r.height / 2, fuerte ? 34 : 10, fuerte ? 13 : 8); };
    letras.forEach((el, k) => luego(() => cunar(el, true), 900 + k * 260));
    const t1 = 900 + letras.length * 260 + 250;
    cifras.forEach((el, k) => luego(() => cunar(el, false), t1 + k * 70));
    luego(() => { placa.classList.add('listo'); $('#rec-titulo').classList.add('frio'); SON.siseo(1); nubeVapor(14); S.vibrar([60, 50, 60, 50, 260]); for (let k = 0; k < 4; k++) luego(() => saltarChispas(W * (0.2 + Math.random() * 0.6), H * 0.3, 80, 16), k * 160); }, t1 + cifras.length * 70 + 300);
    $('#seguir').onclick = () => { SON.clanc(); placa.hidden = true; placa.innerHTML = ''; alSeguir(); };
  }

  /* ---------- Resumen: el parte del turno ---------- */
  function terminar() { const r = M.terminar(); cerrarTodo(true); SON.golpe(1); conColada(() => pintarParte(r)); }
  function pintarParte(r) {
    const flecha = t => (t.dir === 'sube' ? `▲ +${n1(t.delta)} kg` : t.dir === 'baja' ? `▼ ${n1(t.delta)} kg` : t.dir === 'igual' ? 'igual que la última vez' : '');
    brasas = 0.25; discos = [];
    escena.innerHTML = `<section class="pantalla p-parte">
      <p class="titulo">Resumen de la sesión · ${r.nombre.split('· ')[1]}${r.corta ? ' · rutina corta' : ''}</p>
      <div class="toneladas plantilla rojo-vivo" id="toneladas">0</div><p class="toneladas-nota">kilos de hierro movidos</p>
      <div class="chapa"><div class="cifras"><div><b class="plantilla">${r.hechas}/${r.total}</b><span>series hechas</span></div><div><b class="plantilla">${r.minutos}</b><span>min reales</span></div></div>
        ${r.tops.length ? `<div class="renglon"><h3>Top sets del día</h3>${r.tops.map(t => `${t.nombre}: ${n1(t.peso)} kg × ${t.reps} <span class="sube">${flecha(t)}</span>${t.record ? ' <span class="sube">· récord</span>' : ''}`).join('<br>')}</div>` : ''}
        <div class="renglon">${r.pendientes.length ? `<h3>Ejercicios con series sin terminar</h3>${r.pendientes.join(' · ')}` : 'Todas las series quedaron registradas.'}</div></div>
      <button class="al-plan" id="al-plan">Volver al plan</button>
      <div class="foso-zona" id="zona"><p>Toca el montón o inclina el teléfono</p></div>
    </section>`;
    // El montón: cada serie hecha cae de nuevo, una por una, y el contador sube con cada disco.
    const series = []; r.porEjercicio.forEach(e => e.sets.forEach(x => { if (x.done) series.push({ tipo: x.tipo, peso: x.peso, reps: x.reps, volumen: x.peso * x.reps }); }));
    let suma = 0; const cont = $('#toneladas');
    series.forEach((x, k) => luego(() => { soltar(x, W * (0.12 + Math.random() * 0.76), -40, 4, 1.6); suma += x.volumen; cont.textContent = Math.round(suma).toLocaleString('es'); if (k % 2 === 0) S.vibrar(12); if (k === series.length - 1) { SON.golpe(1.2); sacudir(escena, true); cont.textContent = r.volumen.toLocaleString('es'); } }, 500 + k * 130));
    $('#al-plan').onclick = () => { SON.clanc(); conColada(pintarInicio); };
    const zona = $('#zona'), o = () => lzFoso.getBoundingClientRect();
    const toque = ev => { empujar(ev.clientX - o().left, ev.clientY, 16); SON.cae(); S.vibrar(15); };
    zona.onpointerdown = ev => { toque(ev); try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {}); } catch (e) { /* noop */ } };
    zona.onpointermove = ev => { if (ev.buttons || ev.pointerType === 'touch') empujar(ev.clientX - o().left, ev.clientY, 3); };
  }

  /* ---------- Enlaces directos del mock ---------- */
  function cerrarTodo(conservarDiscos) {
    esperas.forEach(clearTimeout); esperas = [];
    [enfriado, crisol, placa].forEach(x => { x.hidden = true; x.innerHTML = ''; });
    colada.className = ''; aviso.classList.remove('ya'); chispas = []; if (!conservarDiscos) discos = [];
  }
  function ir(pantalla) {
    cerrarTodo(); clave = 'completa'; M.iniciar(clave); anunciado = {};
    const sembrar = n => { let k = 0; const s = M.estado(); s.ejercicios.forEach((e, i) => e.sets.forEach((st, j) => { if (k++ < n) { const v = s.values[i][j]; soltar({ tipo: st.tipo, peso: v.peso, reps: v.reps, volumen: v.peso * v.reps }, W * (0.1 + Math.random() * 0.8), H - 200, 0); } })); discos.forEach(d => { d.t = 0; }); };
    if (pantalla === 'inicio') pintarInicio();
    else if (pantalla === 'rutina') pintarRutina();
    else if (pantalla === 'sesion') { anunciado[0] = true; M.simular(5); sembrar(5); pintarYunque(); }
    else if (pantalla === 'descanso') { anunciado[0] = true; M.simular(1); sembrar(1); M.descansar(180); pintarYunque(); mostrarEnfriado(); }
    else if (pantalla === 'topset') { pintarYunque(); entrar(); }
    else if (pantalla === 'record') { anunciado[0] = true; pintarYunque(); luego(() => hecha(0, 1), 700); }
    else if (pantalla === 'resumen') { const v = M.estado().values[0][0]; M.registrar(0, { peso: v.peso, reps: v.reps }); M.simular(M.total()); pintarParte(M.terminar()); }
  }

  window.MOCK_MENU.montar({ ir, motor: M });
})();
