/* Sonido, vibración y voz de los mocks: un sintetizador mínimo sobre Web Audio. Cada dirección arma con esto sus propios efectos.
 * El audio se desbloquea con el primer toque (los navegadores no dejan sonar antes). */
(function () {
  'use strict';
  let ctx = null, salida = null;
  const S = { activo: true };

  S.desbloquear = function () {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ctx) { ctx = new AC(); salida = ctx.createGain(); salida.gain.value = 0.9; salida.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { /* sin audio */ }
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, S.desbloquear, { passive: true }));

  const listo = () => S.activo && ctx && salida;
  S.ahora = () => (ctx ? ctx.currentTime : 0);

  // Una nota: { f, f2 (barrido hasta), dur, tipo, gan, cuando (s desde ya), ataque }
  S.tono = function (o) {
    if (!listo()) return;
    const t = ctx.currentTime + (o.cuando || 0) + 0.01, dur = o.dur || 0.2;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.tipo || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gan || 0.2, t + (o.ataque || 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(salida); osc.start(t); osc.stop(t + dur + 0.05);
  };

  // Ruido filtrado: { dur, f (frecuencia del filtro), f2 (barrido), q, filtro ('lowpass'|'bandpass'|'highpass'), gan, cuando, ataque }
  let bufRuido = null;
  S.ruido = function (o) {
    if (!listo()) return;
    if (!bufRuido) { bufRuido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = bufRuido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ctx.currentTime + (o.cuando || 0) + 0.01, dur = o.dur || 0.3;
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = bufRuido; src.loop = true;
    fl.type = o.filtro || 'bandpass'; fl.frequency.setValueAtTime(o.f || 1000, t); fl.Q.value = o.q || 1;
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gan || 0.2, t + (o.ataque || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(salida); src.start(t); src.stop(t + dur + 0.05);
  };

  // Los tres tonos del fin de descanso de la app (880, 880, 1175 Hz), con el timbre que elija la dirección.
  S.tresTonos = (tipo, gan) => [0, 0.28, 0.56].forEach((dt, i) => S.tono({ f: i === 2 ? 1175 : 880, dur: 0.22, tipo: tipo || 'sine', gan: gan || 0.3, cuando: dt }));

  S.vibrar = p => { try { if (S.activo && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* noop */ } };

  S.decir = function (texto, o) {
    try {
      if (!S.activo || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-ES'; u.rate = (o && o.rate) || 0.95; u.pitch = (o && o.pitch) || 0.7; u.volume = 1;
      const v = speechSynthesis.getVoices().find(x => /^es/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* sin voz */ }
  };
  S.callar = () => { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { /* noop */ } };

  window.MOCK_SONIDO = S;
})();
