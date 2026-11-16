/* Jefe Final. La sesión es una fase de un juego de rol de 16 bits: cada ejercicio es un enemigo con tantos puntos de vida como series,
 * cada serie registrada hace un daño igual a sus kilos por repeticiones, el top set es el jefe, el descanso es la hoguera donde la
 * partida queda guardada y el resumen es la pantalla de fase superada. */
(function () {
  'use strict';
  const D = window.MOCK_DATOS, M = window.MOCK_MOTOR.crear(D), S = window.MOCK_SONIDO, n1 = M.n1;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const escena = $('#escena'), hoguera = $('#hoguera'), alerta = $('#alerta'), record = $('#record'), sistema = $('#texto-sistema');
  let clave = 'completa', anunciado = {}, esperas = [], combo = 0, tecleo = null;
  const luego = (fn, ms) => { const t = setTimeout(fn, ms); esperas.push(t); return t; };
  const fechaCorta = iso => new Date(iso + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const sacudir = (el, fuerte) => { el.classList.remove('tiembla', 'tiembla-fuerte'); void el.offsetWidth; el.classList.add(fuerte ? 'tiembla-fuerte' : 'tiembla'); };
  function decir(txt, ms) { sistema.textContent = txt; sistema.classList.add('ya'); luego(() => sistema.classList.remove('ya'), ms || 3400); }

  /* ---------- Sprites: píxeles escritos a mano ---------- */
  const PAL = { k: '#0B0A1A', w: '#FFFFFF', s: '#F2B38A', r: '#FF3B3B', b: '#3D6BFF', y: '#FFD23F', g: '#9AA3B5', d: '#4A4F66', p: '#FF4F9A', c: '#3DF2FF', n: '#8A4B2A', v: '#4BE36A', o: '#FF8A1F', m: '#7A3BFF' };
  const SPR = {
    heroe: ['....kkkkkk......', '...krrrrrrk.....', '...kssssssk.....', '...kskssksk.....', '...kssssssk.....', '....kskksk......', '.kkkkkssskkkkk..', 'ksskwwwwwwwkssk.', 'ksskwwwwwwwkssk.', 'kssk.kwwwwk.kssk', '.kk..kwwwwk..kk.', '.....kbbbbk.....', '.....kbkkbk.....', '....kssk.kssk...', '....kssk.kssk...', '....kkkk.kkkk...'],
    sentado: ['................', '....kkkkkk......', '...krrrrrrk.....', '...kssssssk.....', '...ksssksks.....', '...kssssssk.....', '....kssssk......', '..kkkwwwwkk.....', '.kskwwwwwwksk...', '.kskwwwwwwkssk..', '.kkkwwwwwwkkssk.', '...kbbbbbbbkkk..', '...kbbbbbbbbbk..', '...kkkkkkksssk..', '..........kkkk..'],
    barra: ['..kkk..............kkk..', '.krrrk............krrrk.', '.krrrk............krrrk.', '.krrrk...kkkkkk...krrrk.', '.krrrk..kddddddk..krrrk.', '.krrrk.kdwkddkwdk.krrrk.', 'kkrrrkkkdwwddwwdkkkrrrkk', 'kgrrrgggdkkddkkdgggrrrgk', 'kkrrrkkkddddddddkkkrrrkk', '.krrrk.kdkwkwkwdk.krrrk.', '.krrrk.kdwkwkwkdk.krrrk.', '.krrrk..kddddddk..krrrk.', '.krrrk...kkkkkk...krrrk.', '.krrrk............krrrk.', '.krrrk............krrrk.', '..kkk..............kkk..'],
    robot: ['......kkkk......', '......kyyk......', '...kkkkkkkkkk...', '..kggggggggggk..', '..kgkkggggkkgk..', '..kgkrggggkrgk..', '..kggggggggggk..', '..kgkwkwkwkwgk..', '..kggggggggggk..', 'kkkkkkkkkkkkkkkk', 'kdkkddddddddkkdk', 'kdk.kddccddk.kdk', 'kkk.kddddddk.kkk', '....kkkkkkkk....', '....kdk..kdk....', '...kkkk..kkkk...'],
    murcielago: ['k..............k', 'kk....k..k....kk', 'kmk..kmkkmk..kmk', 'kmmkkmmmmmmkkmmk', 'kmmmmmwmmwmmmmmk', 'kmmmmmkmmkmmmmmk', 'kmmmmmmmmmmmmmmk', '.kmmkmwkkwmkmmk.', '..kk.kmmmmk.kk..', '......kmmk......', '.......kk.......'],
    mancuerna: ['.kk..........kk.', 'kbbk........kbbk', 'kbbkkkkkkkkkkbbk', 'kbbkwkggggkwkbbk', 'kbbkkkggggkkkbbk', 'kbbkggkwwkggkbbk', 'kbbkkkkkkkkkkbbk', 'kbbk........kbbk', '.kk..........kk.'],
    fuego: ['.....o......', '....oyo.....', '...oyyo.o...', '..oyyyyoo...', '..oywwyyo...', '.oyywwyyyo..', '.oyywwwyyo..', '..oyyyyyo...', 'knnkoookknnk', '.knnnnnnnnk.', '..kkkkkkkk..'],
    trofeo: ['kkkkkkkkkkkk', 'kyyyyyyyyyyk', 'kykyyyyyykyk', 'kykyywyyykyk', '.kkyywyyykk.', '..kyyyyyyk..', '...kyyyyk...', '....kyyk....', '....kyyk....', '...kkyykk...', '..kyyyyyyk..', '..kkkkkkkk..'],
  };
  const cache = {};
  function sprite(nombre, espejo) {
    const id = nombre + (espejo ? ':e' : ''); if (cache[id]) return cache[id];
    const filas = SPR[nombre], w = Math.max(...filas.map(f => f.length)), h = filas.length, c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    filas.forEach((f, j) => f.split('').forEach((ch, i) => { if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(espejo ? w - 1 - i : i, j, 1, 1); } }));
    return (cache[id] = { url: c.toDataURL(), w, h });
  }
  const img = (nombre, px, extra, espejo) => { const s = sprite(nombre, espejo); return `<img class="px" alt="" src="${s.url}" style="width:${s.w * px}px;height:${s.h * px}px;${extra || ''}">`; };
  // Qué bicho es cada ejercicio: barra, máquina o polea (robot), colgarse (murciélago) o mancuernas. El matiz cambia el color.
  const BICHO = { 'chest.bench_press_barbell': ['barra', 0], 'back.row_chest_supported_machine': ['robot', 0], 'back.pull_up': ['murcielago', 0], 'biceps.curl_barbell': ['barra', 200], 'chest.fly_cable': ['robot', 140], 'shoulders.lateral_raise_db': ['mancuerna', 0], 'calves.calf_raise_seated': ['robot', 280] };
  const bicho = (e, px) => { const b = BICHO[e.id] || ['robot', 60]; return img(b[0], px, b[1] ? `filter:hue-rotate(${b[1]}deg)` : ''); };

  /* ---------- Chip de sonido ---------- */
  const SON = {
    cursor: () => S.tono({ f: 880, dur: 0.04, tipo: 'square', gan: 0.1 }),
    ok: () => { S.tono({ f: 660, dur: 0.07, tipo: 'square', gan: 0.12 }); S.tono({ f: 1320, dur: 0.1, tipo: 'square', gan: 0.12, cuando: 0.07 }); },
    error: () => S.tono({ f: 150, dur: 0.22, tipo: 'square', gan: 0.14 }),
    golpe: () => { S.ruido({ dur: 0.1, f: 1300, filtro: 'lowpass', gan: 0.4 }); S.tono({ f: 240, f2: 70, dur: 0.14, tipo: 'square', gan: 0.16 }); },
    critico: () => { SON.golpe(); S.tono({ f: 1760, f2: 330, dur: 0.3, tipo: 'sawtooth', gan: 0.14, cuando: 0.05 }); S.ruido({ dur: 0.4, f: 500, filtro: 'lowpass', gan: 0.35, cuando: 0.05 }); },
    moneda: c => { S.tono({ f: 988, dur: 0.07, tipo: 'square', gan: 0.1, cuando: c || 0 }); S.tono({ f: 1319, dur: 0.22, tipo: 'square', gan: 0.1, cuando: (c || 0) + 0.07 }); },
    cae: () => [660, 520, 390, 260, 130].forEach((f, i) => S.tono({ f, dur: 0.09, tipo: 'square', gan: 0.12, cuando: i * 0.08 })),
    sirena: n => { for (let i = 0; i < n; i++) S.tono({ f: i % 2 ? 587 : 440, dur: 0.24, tipo: 'square', gan: 0.13, cuando: i * 0.25 }); },
    fanfarria: () => [[523, 0], [523, 0.12], [523, 0.24], [659, 0.36], [784, 0.54], [659, 0.66], [784, 0.78], [1047, 0.96]].forEach(([f, t], i) => { S.tono({ f, dur: i === 7 ? 0.7 : 0.11, tipo: 'square', gan: 0.12, cuando: t }); S.tono({ f: f / 2, dur: i === 7 ? 0.7 : 0.11, tipo: 'triangle', gan: 0.14, cuando: t }); }),
    tac: () => S.tono({ f: 1250, dur: 0.02, tipo: 'square', gan: 0.07 }),
    paso: () => S.tono({ f: 110, dur: 0.12, tipo: 'square', gan: 0.2 }),
  };

  /* ---------- Píxeles sueltos: monedas y explosiones ---------- */
  const lz = $('#pixeles'), cx = lz.getContext('2d'), cor = $('#cortina'), cc = cor.getContext('2d');
  let W = 0, H = 0, trozos = [], andando = false;
  function medir() { W = lz.clientWidth; H = lz.clientHeight; [lz, cor].forEach(l => { l.width = W; l.height = H; }); }
  window.addEventListener('resize', medir); medir();
  function estallar(x, y, n, colores, fuerza) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = (0.3 + Math.random()) * (fuerza || 9); trozos.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, t: 8, c: colores[i % colores.length], vida: 50 + Math.random() * 40 }); }
    if (!andando) { andando = true; requestAnimationFrame(cuadro); }
  }
  const monedas = (x, y, n) => estallar(x, y, n, ['#FFD23F', '#FFD23F', '#FF8A1F', '#FFFFFF'], 11);
  function cuadro() {
    cx.clearRect(0, 0, W, H); trozos = trozos.filter(p => p.vida-- > 0 && p.y < H + 20);
    trozos.forEach(p => { p.vy += 0.5; p.x += p.vx; p.y += p.vy; cx.fillStyle = p.c; cx.fillRect(Math.round(p.x / 4) * 4, Math.round(p.y / 4) * 4, p.t, p.t); });
    if (trozos.length) requestAnimationFrame(cuadro); else andando = false;
  }
  // Transición en mosaico: bloques negros que tapan en diagonal, se cambia la pantalla, y destapan.
  function conMosaico(pintar) {
    const T = 48, cols = Math.ceil(W / T), filas = Math.ceil(H / T), pasos = 7; let k = 0;
    const dibuja = tapa => { cc.clearRect(0, 0, W, H); cc.fillStyle = '#0B0A1A'; for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) { const u = (i / cols + j / filas) / 2, dentro = tapa ? u <= k / pasos : u > k / pasos; if (dentro) cc.fillRect(i * T, j * T, T, T); } };
    SON.cae();
    const tapar = setInterval(() => { k++; dibuja(true); if (k > pasos) { clearInterval(tapar); pintar(); k = 0; const destapar = setInterval(() => { k++; dibuja(false); if (k > pasos) { clearInterval(destapar); cc.clearRect(0, 0, W, H); } }, 45); } }, 45);
  }
  function teclear(el, txt) { // el texto de la ventana aparece letra a letra, con su pitido
    clearInterval(tecleo); let i = 0; el.textContent = '';
    tecleo = setInterval(() => { i += 2; el.textContent = txt.slice(0, i); if (i % 6 === 0) S.tono({ f: 520, dur: 0.015, tipo: 'square', gan: 0.05 }); if (i >= txt.length) clearInterval(tecleo); }, 22);
  }
  const barra = (n, llenos, clase, oro) => `<div class="barra-seg">${Array.from({ length: n }, (_, i) => `<i class="${i < llenos ? (oro === i ? 'oro' : clase || 'on') : ''}"></i>`).join('')}</div>`;

  /* ---------- Inicio: título y mapa ---------- */
  function pintarInicio() {
    const hoy = D.semana[D.hoy], pos = [[12, 62], [31, 26], [50, 62], [69, 26], [88, 62]];
    escena.innerHTML = `<section class="pantalla p-titulo">
      <div class="estrellas">${Array.from({ length: 26 }, (_, i) => `<i style="left:${(i * 37) % 100}%;top:${(i * 53) % 100}%;animation-delay:-${(i % 7) * 0.2}s"></i>`).join('')}</div>
      <h1 class="logo">${'JEFE'.split('').map((c, i) => `<span style="animation-delay:-${i * 0.15}s">${c}</span>`).join('')}<br>${'FINAL'.split('').map((c, i) => `<span style="animation-delay:-${(i + 4) * 0.15}s">${c}</span>`).join('')}</h1>
      <p class="jugador">1 jugador · ${D.perfil.nombre} · nivel ${D.perfil.nivel}<br>clase ${D.perfil.division} · modo ${D.perfil.objetivo}</p>
      <div class="mapa"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pos.map(p => p.join(',')).join(' ')}" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/></svg>
        ${pos.map((p, i) => `<button class="nodo ${i === D.hoy ? 'hoy' : ''}" data-dia="${i}" style="left:${p[0]}%;top:${p[1]}%">${i + 1}<small>${D.semana[i].nombre.split('· ')[1].replace(/ \((.+)\)/, ' $1').split(' ')[0]}</small></button>`).join('')}
        <div class="heroe" style="left:${pos[D.hoy][0]}%;top:${pos[D.hoy][1]}%">${img('heroe', 3)}</div></div>
      <div class="ventana"><h2>Mundo 1-${D.hoy + 1} · ${hoy.nombre.split('· ')[1]}</h2>${hoy.ejercicios} enemigos · ${hoy.series} series · ${hoy.minutos} min<br>Jefe: <b>${hoy.topSet}</b> (top set)</div>
      <button class="boton" id="start"><span class="parpadea">▶</span> Ver la fase de hoy</button>
      <p class="pie-titulo">Semana pasada: ${D.historial.length} fases de ${D.perfil.dias} superadas</p>
    </section>`;
    $('#start').onclick = () => { SON.ok(); S.vibrar(30); conMosaico(pintarFase); };
    $$('.nodo').forEach(b => b.onclick = () => { if (Number(b.dataset.dia) === D.hoy) { SON.ok(); conMosaico(pintarFase); } else { SON.error(); S.vibrar([40, 30, 40]); sacudir(b.parentElement); decir(`Mundo 1-${Number(b.dataset.dia) + 1} bloqueado. Primero supera ${hoy.nombre.split('· ')[1]}.`); } });
  }

  /* ---------- Rutina: la fase y su bestiario ---------- */
  function pintarFase() {
    const s = D.sesiones[clave], corta = clave !== 'completa', tope = corta ? s.minutosPedidos : s.capacidad, regla = id => D.reglas.find(r => r.id === id);
    const fila = (e, i) => {
      const dN = regla(e.tipo === 'multiarticular' ? 'DESCANSO_MULTIARTICULAR_S' : 'DESCANSO_AISLAMIENTO_S'), piso = regla('DESCANSO_PISO_RESPALDADO_S');
      return `<li class="bicho ${e.topSet ? 'jefe' : ''}" style="animation-delay:${i * 0.08}s"><div class="retrato">${bicho(e, e.id.includes('barbell') ? 2 : 3)}</div>
        <div>${e.topSet ? '<span class="sello-jefe">Jefe · top set</span>' : ''}<h2>${e.nombre}</h2><div class="dato">${e.grupo} · descanso ${e.topSet ? `${e.sets[0].descanso} y ${e.sets[1].descanso}` : e.sets[0].descanso}</div></div>
        <div class="vida">${barra(e.sets.length, e.sets.length, 'on', e.topSet ? 0 : -1)}<span>${e.topSet ? `1×${e.topSet.reps.join('-')} + ${e.topSet.backoffs}×${e.sets[1].reps}` : `${e.sets.length}×${e.sets[0].reps}`}</span></div>
        ${e.evidenciaPorVerificar ? '<span class="sin-datos">??? Evidencia por verificar</span>' : ''}
        <div class="ficha-datos">${e.topSet ? `<p>RIR ${e.topSet.rir.join('-')} en el top set. Back-off con ${e.topSet.reduccion} % menos de carga.</p><p><b>E4</b>El top set solo existe en definición (${regla('TOP_SET_SOLO_EN_DEFINICION').dec}).</p>` : ''}
          <p><b>${dN.nivel}</b>Descanso de ${e.sets[e.sets.length - 1].descanso}: ${dN.fuente} (${dN.dec}).</p><p><b>${piso.nivel}</b>Ningún descanso baja de ${piso.valor} s: Singer et al. 2024, leído en resumen.</p>
          <p>Relación con ${e.grupo}: ${e.evidencia.replace('_', ' ')}.</p></div></li>`;
    };
    escena.innerHTML = `<section class="pantalla p-fase">
      <div class="cabecera"><button class="chico" id="volver" aria-label="Volver al mapa">◀</button><h1>Mundo 1-${D.hoy + 1}<br>${s.nombre.split('· ')[1]}</h1><span style="width:52px"></span></div>
      <div class="ventana tiempo"><span>Tiempo</span>${barra(15, Math.round(15 * s.minutos / tope), 'cian')}<span>${s.minutos}/${tope} min</span><span>Series</span>${barra(20, s.series)}<span>${s.series}</span></div>
      <div class="ventana dificultad">
        <button data-clave="completa" class="${corta ? '' : 'activo'}">Sesión completa · ${D.sesiones.completa.minutos} min</button>
        <button data-clave="corta30" class="${corta ? 'activo' : ''}">Hoy tengo 30 min · rutina corta</button></div>
      <ol class="bestiario">${s.ejercicios.map(fila).join('')}</ol>
      <button class="boton" id="empezar" style="margin-top:14px"><span class="parpadea">▶</span> Empezar sesión</button>
    </section>`;
    $('#volver').onclick = () => { SON.cursor(); conMosaico(pintarInicio); };
    $$('.dificultad button').forEach(b => b.onclick = () => { if (b.dataset.clave === clave) return; clave = b.dataset.clave; SON.ok(); S.vibrar(20); pintarFase(); });
    $$('.bicho').forEach(b => b.onclick = () => { b.classList.toggle('abierto'); SON.cursor(); });
    $('#empezar').onclick = () => { M.iniciar(clave); anunciado = {}; combo = 0; SON.fanfarria(); S.vibrar([40, 40, 40, 40, 120]); conMosaico(() => { pintarCombate(); entrar(); }); };
  }

  /* ---------- Sesión: el combate ---------- */
  function entrar() {
    const s = M.estado(), i = s.exIndex, p = M.pendiente(i);
    if (p >= 0 && s.ejercicios[i].sets[p].tipo === 'top' && !anunciado[i]) { anunciado[i] = true; mostrarAlerta(); }
  }
  function pintarCombate(mensaje) {
    const s = M.estado(), e = M.ejercicio(), i = s.exIndex, p = M.pendiente(i), vals = s.values[i];
    const st = p >= 0 ? e.sets[p] : null, v = p >= 0 ? vals[p] : null, ult = st ? M.ultimaDe(e, st) : null, ultimo = i === s.ejercicios.length - 1, jefe = st && st.tipo === 'top';
    const vivas = vals.filter(x => !x.done).length, grande = BICHO[e.id] && BICHO[e.id][0] === 'barra' ? (jefe ? 7 : 5) : 7;
    escena.innerHTML = `<section class="pantalla p-combate ${jefe ? 'jefe' : ''}">
      <div class="hud"><button class="chico" id="salir" aria-label="Salir de la sesión">✕</button>
        <div class="prog">${s.corta ? 'Rutina corta<br>' : ''}Enemigo <b>${i + 1}</b>/${s.ejercicios.length}<br>Series <b>${M.hechas()}</b>/${M.total()}</div>
        <button class="terminar" id="terminar">Terminar</button></div>
      <div class="arena" id="arena">
        <div class="placa-enemigo"><span class="tipo">${st ? (jefe ? 'Jefe · top set' : M.etiqueta(st)) : 'Derrotado'}</span><h1>${e.nombre}</h1>
          <div class="barra-seg" id="vida">${e.sets.map((x, j) => `<i class="${vals[j].done ? '' : x.tipo === 'top' ? 'oro' : 'on'}"></i>`).join('')}</div></div>
        <div class="combo" id="combo" ${combo > 1 ? '' : 'hidden'}>Racha<b>×${combo}</b></div>
        ${vivas ? `<div class="enemigo" id="enemigo">${bicho(e, grande)}</div>` : ''}
        <div class="heroe-c" id="heroe">${img('heroe', 5)}</div>
      </div>
      <div class="ventana mensaje" id="mensaje"></div>
      ${st ? `<div class="comandos">
        <div class="fila-cmd"><label>Peso</label><button class="chico" data-d="peso" data-n="-2.5" aria-label="Quitar 2,5 kg">◀</button><div class="valor" id="v-peso">${n1(v.peso)} <small>kg</small></div><button class="chico" data-d="peso" data-n="2.5" aria-label="Sumar 2,5 kg">▶</button></div>
        <div class="fila-cmd"><label>Reps</label><button class="chico" data-d="reps" data-n="-1" aria-label="Una repetición menos">◀</button><div class="valor" id="v-reps">${v.reps} <small>de ${st.reps}</small></div><button class="chico" data-d="reps" data-n="1" aria-label="Una repetición más">▶</button></div></div>` : ''}
      <div class="pie-combate"><button class="chico" id="ant" ${i === 0 ? 'disabled' : ''} aria-label="Ejercicio anterior">◀</button>
        <button class="boton ${jefe ? 'rosa' : ''}" id="hecha">${st ? '▶ ¡Hecha!' : ultimo ? '▶ Terminar la sesión' : '▶ Siguiente ejercicio'}</button>
        <button class="chico" id="sig" ${ultimo ? 'disabled' : ''} aria-label="Ejercicio siguiente">▶</button></div>
    </section>`;
    teclear($('#mensaje'), mensaje || (st ? `${jefe ? '¡El jefe' : '¡Un'} ${e.nombre} ${jefe ? 'te desafía!' : 'salvaje!'} ${M.etiqueta(st)}: ${st.reps} reps. ${ult ? `Última vez (${fechaCorta(e.ultima.fecha)}): ${n1(ult.peso)} kg × ${ult.reps}.` : 'Primera vez.'}` : `${e.nombre} derrotado: ${vals.map(x => `${n1(x.peso)}×${x.reps}`).join(', ')}.`));
    $('#salir').onclick = () => { SON.cursor(); M.iniciar(clave); conMosaico(pintarFase); };
    $('#terminar').onclick = terminar;
    $('#ant').onclick = () => { SON.cursor(); M.anterior(); pintarCombate(); };
    $('#sig').onclick = () => { SON.cursor(); M.siguiente(); pintarCombate(); entrar(); };
    $('#hecha').onclick = st ? () => hecha(p) : () => { if (ultimo) terminar(); else { SON.ok(); M.siguiente(); conMosaico(() => { pintarCombate(); entrar(); }); } };
    $$('.fila-cmd .chico').forEach(b => b.onclick = () => {
      const campo = b.dataset.d, paso = Number(b.dataset.n);
      v[campo] = Math.max(campo === 'reps' ? 1 : 0, Math.round((v[campo] + paso) * 100) / 100);
      const el = $('#v-' + campo); el.firstChild.textContent = (campo === 'peso' ? n1(v.peso) : v.reps) + ' '; el.classList.remove('salta'); void el.offsetWidth; el.classList.add('salta');
      SON.cursor(); S.vibrar(10);
    });
  }

  function hecha(setIdx) {
    const s = M.estado(), e = M.ejercicio(), v = s.values[s.exIndex][setIdx];
    const r = M.registrar(setIdx, { peso: v.peso, reps: v.reps });
    if (!r.ok) { SON.error(); decir(r.error); return; }
    $('#hecha').disabled = true;
    const top = r.serie.tipo === 'top', mejor = r.serie.contraUltima > 1.0001, igual = r.serie.contraUltima >= 0.9999;
    combo = igual ? combo + 1 : 0; // la racha: series seguidas que igualan o superan la última vez
    const arena = $('#arena'), dano = Math.round(r.serie.volumen) || v.reps;
    const impacto = () => {
      const en = $('#enemigo'), he = $('#heroe');
      he.classList.add('ataca'); SON.paso();
      luego(() => {
        (top ? SON.critico : SON.golpe)(); S.vibrar(top ? [50, 30, 50, 30, 160] : mejor ? [40, 30, 80] : 40); sacudir(escena, top);
        if (en) { en.classList.remove('golpeado'); void en.offsetWidth; en.classList.add('golpeado'); }
        const fl = document.createElement('div'); fl.className = 'flash'; arena.appendChild(fl); luego(() => fl.remove(), 320);
        const d = document.createElement('div'); d.className = 'dano' + (top || mejor ? ' critico' : ''); d.innerHTML = `−${dano.toLocaleString('es')}${top ? '<small>¡Golpe crítico!</small>' : mejor ? '<small>¡Mejor que la última vez!</small>' : ''}`; arena.appendChild(d); luego(() => d.remove(), 950);
        const seg = $$('#vida i')[setIdx]; if (seg) seg.className = '';
        const c = $('#combo'); if (combo > 1) { c.hidden = false; c.querySelector('b').textContent = '×' + combo; c.classList.remove('sube'); void c.offsetWidth; c.classList.add('sube'); } else c.hidden = true;
        const o = arena.getBoundingClientRect(), base = lz.getBoundingClientRect();
        estallar(o.left - base.left + o.width * 0.75, o.top + o.height * 0.45, top ? 40 : 14, ['#FFFFFF', '#FF3B3B', '#FFD23F'], top ? 12 : 8);
        teclear($('#mensaje'), `${D.perfil.nombre} usa ${r.serie.etiqueta}: ${n1(v.peso)} kg × ${v.reps}. ${dano.toLocaleString('es')} de daño.${r.a5 ? ` Ojo: un back-off pesa ${n1(r.a5.maximo)} kg o menos (90 % del top set de ${n1(r.a5.top)}); se guarda como serie de trabajo.` : ''}`);
        if (r.serie.ejercicioCompleto && en) luego(() => { en.classList.add('cae'); SON.cae(); monedas(o.left - base.left + o.width * 0.75, o.top + o.height * 0.5, 30); SON.moneda(0.3); teclear($('#mensaje'), `¡${e.nombre} derrotado! Ganas ${Math.round(M.estado().values[s.exIndex].reduce((a, x) => a + x.peso * x.reps, 0)).toLocaleString('es')} puntos de experiencia.`); }, 500);
      }, 180);
    };
    if (top) { // corte de cámara antes del golpe del top set
      const c = document.createElement('div'); c.className = 'corte'; c.innerHTML = `${img('heroe', 8)}<b>¡¡TOP<br>SET!!</b>`; escena.firstElementChild.appendChild(c); SON.sirena(2); S.vibrar(30);
      luego(() => { c.remove(); impacto(); }, 760);
    } else impacto();
    const espera = (top ? 760 : 0) + (r.serie.ejercicioCompleto ? 1900 : r.a5 ? 2600 : 1200);
    luego(() => { if (r.record) mostrarRecord(r.record, () => despues(r)); else despues(r); }, espera);
  }
  function despues(r) {
    if (r.serie.sesionCompleta) { terminar(); return; }
    if (M.estado().rest) mostrarHoguera(); else volverAlCombate();
  }
  function volverAlCombate() {
    const s = M.estado();
    if (M.pendiente(s.exIndex) < 0 && s.exIndex < s.ejercicios.length - 1) M.siguiente();
    pintarCombate(); entrar();
  }

  /* ---------- Hoguera: el descanso ---------- */
  function mostrarHoguera() {
    const s = M.estado(), i = s.exIndex, p = M.pendiente(i);
    let sigue;
    if (p >= 0) { const st = s.ejercicios[i].sets[p], v = s.values[i][p]; sigue = `<b>${M.etiqueta(st)} · ${s.ejercicios[i].nombre}</b>${st.reps} reps con ${n1(v.peso)} kg`; }
    else if (i < s.ejercicios.length - 1) { const e = s.ejercicios[i + 1]; sigue = `<b>${e.nombre}</b>enemigo ${i + 2} de ${s.ejercicios.length} · ${e.sets.length} series de ${e.sets[0].reps}`; }
    else sigue = '<b>Fin de la fase</b>';
    hoguera.hidden = false; hoguera.className = '';
    hoguera.innerHTML = `<div><h2>Descanso</h2><p class="guardado"><span class="parpadea">●</span> Sesión guardada: puedes reanudarla</p><div class="reloj" id="reloj" role="timer">${M.fmt(M.restante())}</div></div>
      <div class="campamento"><div class="luz"></div><div class="sentado">${img('sentado', 5)}</div><div class="fuego">${img('fuego', 8)}${img('fuego', 8, '', true)}</div></div>
      <div style="width:100%"><div class="energia">Energía<div class="barra-seg" id="energia">${'<i></i>'.repeat(20)}</div></div>
        <p class="sigue">Sigue${sigue}</p>
        <div class="botones"><button class="boton rosa" id="mas">+30 s</button><button class="boton" id="saltar">Saltar ▶</button></div>
        ${M.demo ? '<p class="nota-demo">Mock: el descanso corre acelerado hasta los últimos 10 segundos.</p>' : ''}</div>`;
    SON.moneda();
    $('#mas').onclick = () => { M.extender(30); SON.ok(); S.vibrar(20); decir('+30 s de descanso.', 1200); };
    $('#saltar').onclick = () => { SON.cursor(); M.saltar(); };
  }
  M.on('tic', t => {
    const corre = $('#corre'); if (corre) corre.textContent = `El descanso ya corre: ${M.fmt(t.restante)}`;
    const reloj = $('#reloj'); if (!reloj || hoguera.hidden) return;
    const urgente = hoguera.classList.contains('urgente'), txt = urgente ? String(t.restante) : M.fmt(t.restante);
    if (reloj.textContent !== txt) { reloj.textContent = txt; if (urgente) { reloj.classList.remove('tic'); void reloj.offsetWidth; reloj.classList.add('tic'); S.tono({ f: 440, dur: 0.09, tipo: 'square', gan: 0.14 }); S.vibrar(30); } }
    const llenos = Math.round(t.fraccion * 20); $$('#energia i').forEach((b, k) => { const on = k < llenos; if (on && !b.classList.contains('on')) SON.tac(); b.className = on ? (llenos >= 17 ? 'on' : 'cian') : ''; });
  });
  M.on('urgente', () => { if (hoguera.hidden) return; hoguera.classList.add('urgente'); $('#hoguera h2').textContent = '¿Listo? Vuelves en'; SON.sirena(2); });
  M.on('extendido', t => { if (t.restante > 10) { hoguera.classList.remove('urgente'); const h = $('#hoguera h2'); if (h) h.textContent = 'Descanso'; } });
  M.on('fin', f => {
    if (hoguera.hidden) return;
    if (!f.saltado) { S.tresTonos('square', 0.16); S.vibrar([200, 100, 200]); } // los tres tonos de la app, en onda cuadrada
    hoguera.classList.remove('urgente'); const r = $('#reloj'); if (r) { r.textContent = '¡YA!'; r.classList.add('parpadea'); }
    luego(() => conMosaico(() => { hoguera.hidden = true; hoguera.innerHTML = ''; volverAlCombate(); }), f.saltado ? 0 : 500);
  });

  /* ---------- Alerta: llega el jefe (top set) ---------- */
  function mostrarAlerta() {
    const e = M.ejercicio(), top = e.ultima.sets.find(x => x.tipo === 'top');
    alerta.hidden = false; alerta.className = 'rojo';
    alerta.innerHTML = `<div class="franja arriba"></div><div class="franja abajo"></div>
      <h2>¡ALERTA!</h2><p class="se-acerca" id="se-acerca"></p>
      <div class="jefe-entra" id="jefe-entra">${bicho(e, 9)}</div>
      <div class="ventana" id="ficha-jefe"><h3>Top set · ${e.nombre}</h3>Una sola serie pesada: ${e.topSet.reps.join('-')} reps, RIR ${e.topSet.rir.join('-')}.${top ? `<br>Punto débil: superar <b>${n1(top.peso)} kg × ${top.reps}</b> (1RM estimado ${n1(M.epley(top.peso, top.reps))} kg).` : ''}</div>
      <button class="boton rosa" id="luchar">▶ Luchar</button>`;
    SON.sirena(8); S.vibrar([200, 100, 200, 100, 200, 100, 200]);
    luego(() => teclear($('#se-acerca'), 'Se acerca un jefe: el top set'), 500);
    luego(() => { $('#jefe-entra').classList.add('ya'); for (let k = 0; k < 6; k++) luego(() => { SON.paso(); sacudir(alerta); S.vibrar(40); }, k * 166); }, 1500);
    luego(() => { alerta.className = ''; $('#ficha-jefe').classList.add('ya'); SON.critico(); sacudir(alerta, true); }, 2600);
    luego(() => $('#luchar').classList.add('ya'), 3100);
    $('#luchar').onclick = () => { SON.ok(); alerta.hidden = true; alerta.innerHTML = ''; };
  }

  /* ---------- Récord del top set ---------- */
  function mostrarRecord(rec, alSeguir) {
    record.hidden = false;
    const antes = Math.round(18 * rec.previo.e1rm / rec.e1rm) - 1;
    record.innerHTML = `<div class="rayos"></div><h2>¡NUEVO<br>RÉCORD!</h2>
      <div class="trofeo">${img('trofeo', 9)}</div>
      <div class="marca">${n1(rec.peso)} kg × ${rec.reps}</div>
      <div class="ventana"><div class="rm"><span>1RM estimado</span><span id="rm-num">${n1(rec.previo.e1rm)} kg</span></div>
        <div class="barra-seg" id="rm-barra">${Array.from({ length: 18 }, (_, k) => `<i class="${k < antes ? 'cian' : ''}"></i>`).join('')}</div>
        <p>${rec.nombre}. Antes: ${n1(rec.previo.peso)} kg × ${rec.previo.reps}. <b>¡Subes de nivel!</b></p></div>
      <button class="boton" id="seguir">▶ Seguir la sesión</button><p class="corre" id="corre"></p>`;
    SON.fanfarria(); S.vibrar([90, 70, 90, 70, 90, 70, 300]); // el patrón de la app, alargado
    for (let k = 0; k < 5; k++) luego(() => { monedas(W * (0.2 + Math.random() * 0.6), H * 0.3, 40); SON.moneda(); }, 200 + k * 350);
    // La barra del 1RM estimado se llena del valor anterior al nuevo, segmento a segmento.
    $$('#rm-barra i').forEach((b, k) => { if (k >= antes) luego(() => { b.className = 'oro'; SON.tac(); S.vibrar(15); $('#rm-num').textContent = `${n1(rec.previo.e1rm + (rec.e1rm - rec.previo.e1rm) * (k - antes + 1) / (18 - antes))} kg`; }, 1300 + (k - antes) * 260); });
    luego(() => { SON.ok(); sacudir(record, true); monedas(W / 2, H * 0.55, 80); }, 1300 + (18 - antes) * 260 + 100);
    $('#seguir').onclick = () => { SON.ok(); record.hidden = true; record.innerHTML = ''; alSeguir(); };
  }

  /* ---------- Resumen: fase superada ---------- */
  function terminar() { const r = M.terminar(); cerrarTodo(); conMosaico(() => pintarFin(r)); }
  function pintarFin(r) {
    const pct = r.hechas / r.total, rango = pct >= 1 ? 'S' : pct >= 0.85 ? 'A' : pct >= 0.6 ? 'B' : 'C';
    const flecha = t => (t.dir === 'sube' ? `▲ +${n1(t.delta)} kg` : t.dir === 'baja' ? `▼ ${n1(t.delta)} kg` : t.dir === 'igual' ? '= igual que la última vez' : '');
    escena.innerHTML = `<section class="pantalla p-fin">
      <h1>${pct >= 1 ? '¡FASE<br>SUPERADA!' : 'FIN DE<br>LA FASE'}</h1>
      <p class="sub">Resumen de la sesión · ${r.nombre.split('· ')[1]}${r.corta ? ' · rutina corta' : ''}</p>
      <div class="ventana">
        <div class="cuenta" data-n="${r.hechas}" data-suf="/${r.total}"><span>Series hechas</span><b>0</b></div>
        <div class="cuenta" data-n="${r.minutos}"><span>Min reales</span><b>0</b></div>
        <div class="cuenta" data-n="${r.volumen}" data-suf=" kg"><span>Daño total</span><b>0</b></div>
        ${r.tops.map(t => `<div class="cuenta top">Top set · ${t.nombre}: ${n1(t.peso)} kg × ${t.reps}<b>${flecha(t)}${t.record ? ' · récord' : ''}</b></div>`).join('')}
        <div class="cuenta nota">${r.pendientes.length ? `Ejercicios con series sin terminar: ${r.pendientes.join(', ')}.` : 'Todas las series quedaron registradas.'}</div>
      </div>
      <div class="rango" id="rango"><span>Rango<br>de la fase</span><b>${rango}</b></div>
      <button class="boton" id="al-plan"><span class="parpadea">▶</span> Volver al plan</button>
    </section>`;
    $('#al-plan').onclick = () => { SON.ok(); conMosaico(pintarInicio); };
    // El recuento: cada línea aparece y cuenta hacia arriba, con su tac.
    let t = 500;
    $$('.cuenta').forEach(c => {
      const b = c.querySelector('b'), n = Number(c.dataset.n), suf = c.dataset.suf || '';
      luego(() => { c.classList.add('ya'); SON.cursor(); }, t);
      if (c.dataset.n) { for (let k = 1; k <= 12; k++) luego(() => { b.textContent = Math.round(n * k / 12).toLocaleString('es') + suf; SON.tac(); }, t + k * 45); t += 12 * 45; }
      t += 350;
    });
    luego(() => { $('#rango').classList.add('ya'); SON.critico(); sacudir(escena, true); S.vibrar([60, 40, 200]); monedas(W / 2, H * 0.6, 60); if (pct >= 1) luego(SON.fanfarria, 300); }, t + 200);
  }

  /* ---------- Enlaces directos del mock ---------- */
  function cerrarTodo() {
    esperas.forEach(clearTimeout); esperas = []; clearInterval(tecleo);
    [hoguera, alerta, record].forEach(x => { x.hidden = true; x.innerHTML = ''; });
    sistema.classList.remove('ya'); trozos = [];
  }
  function ir(pantalla) {
    cerrarTodo(); clave = 'completa'; M.iniciar(clave); anunciado = {}; combo = 0;
    if (pantalla === 'inicio') pintarInicio();
    else if (pantalla === 'rutina') pintarFase();
    else if (pantalla === 'sesion') { anunciado[0] = true; M.simular(5); combo = 5; pintarCombate(); }
    else if (pantalla === 'descanso') { anunciado[0] = true; M.simular(1); M.descansar(180); pintarCombate(); mostrarHoguera(); }
    else if (pantalla === 'topset') { pintarCombate(); entrar(); }
    else if (pantalla === 'record') { anunciado[0] = true; pintarCombate(); luego(() => hecha(0), 700); }
    else if (pantalla === 'resumen') { const v = M.estado().values[0][0]; M.registrar(0, { peso: v.peso, reps: v.reps }); M.simular(M.total()); pintarFin(M.terminar()); }
  }

  window.MOCK_MENU.montar({ ir, motor: M });
})();
