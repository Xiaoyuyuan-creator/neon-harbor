// audio.js — every sound in Neon Harbor is synthesized with WebAudio.
// No audio files, no network: oscillators and filtered noise only.
// Everything is guarded so the game still runs when audio is unavailable
// (for example in a headless screenshot run with no sound device).

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    sirenTimer: null,
    sirenNodes: null,
    engineNodes: null,
  };

  audio.ensure = function ensure() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      audio.ctx = new Ctor();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
      return true;
    } catch (err) {
      return false;
    }
  };

  function tone(freq, dur, type, vol, slideTo) {
    if (!audio.ctx || audio.muted) return;
    try {
      const t = audio.ctx.currentTime;
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      gain.gain.setValueAtTime(vol || 0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (err) {
      // Sound is garnish; never let it break the game.
    }
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!audio.ctx || audio.muted) return;
    try {
      const t = audio.ctx.currentTime;
      const len = Math.floor(audio.ctx.sampleRate * dur);
      const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audio.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq || 1800;
      const gain = audio.ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(audio.master);
      src.start(t);
    } catch (err) {
      // Sound is garnish; never let it break the game.
    }
  }

  audio.shot = function shot() {
    noiseBurst(0.14, 0.3, 2400);
    tone(160, 0.08, 'square', 0.1, 60);
  };

  audio.punch = function punch() {
    noiseBurst(0.09, 0.22, 700);
  };

  audio.pickup = function pickup() {
    tone(660, 0.09, 'sine', 0.14);
    setTimeout(() => tone(990, 0.12, 'sine', 0.14), 70);
  };

  audio.cash = function cash() {
    tone(880, 0.07, 'triangle', 0.12);
    setTimeout(() => tone(1174, 0.1, 'triangle', 0.12), 60);
  };

  audio.missionDone = function missionDone() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => setTimeout(() => tone(n, 0.16, 'triangle', 0.14), i * 110));
  };

  audio.failed = function failed() {
    tone(220, 0.35, 'sawtooth', 0.1, 110);
  };

  audio.crackTick = function crackTick() {
    tone(1200, 0.05, 'square', 0.07);
  };

  audio.horn = function horn() {
    tone(370, 0.18, 'sawtooth', 0.08);
  };

  audio.crash = function crash() {
    noiseBurst(0.2, 0.3, 500);
    tone(90, 0.18, 'sine', 0.2, 45);
  };

  audio.startSiren = function startSiren() {
    if (!audio.ctx || audio.sirenNodes) return;
    try {
      const osc = audio.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 720;
      const gain = audio.ctx.createGain();
      gain.gain.value = 0.0;
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start();
      let high = false;
      audio.sirenTimer = setInterval(() => {
        if (audio.muted) return;
        high = !high;
        try {
          osc.frequency.setValueAtTime(high ? 950 : 700, audio.ctx.currentTime);
          gain.gain.setValueAtTime(0.035, audio.ctx.currentTime);
        } catch (err) {
          // ignore
        }
      }, 420);
      audio.sirenNodes = { osc, gain };
    } catch (err) {
      // ignore
    }
  };

  audio.stopSiren = function stopSiren() {
    if (audio.sirenTimer) {
      clearInterval(audio.sirenTimer);
      audio.sirenTimer = null;
    }
    if (audio.sirenNodes) {
      try {
        audio.sirenNodes.gain.gain.setValueAtTime(0, audio.ctx.currentTime);
        audio.sirenNodes.osc.stop();
      } catch (err) {
        // ignore
      }
      audio.sirenNodes = null;
    }
  };

  // Continuous engine hum whose pitch follows how fast the car is going.
  audio.engine = function engine(speed01, driving) {
    if (!audio.ctx) return;
    try {
      if (!driving || audio.muted) {
        if (audio.engineNodes) {
          audio.engineNodes.gain.gain.setValueAtTime(0, audio.ctx.currentTime);
        }
        return;
      }
      if (!audio.engineNodes) {
        const osc = audio.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 70;
        const filter = audio.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        const gain = audio.ctx.createGain();
        gain.gain.value = 0.03;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audio.master);
        osc.start();
        audio.engineNodes = { osc, gain };
      }
      audio.engineNodes.osc.frequency.setValueAtTime(65 + speed01 * 130, audio.ctx.currentTime);
      audio.engineNodes.gain.gain.setValueAtTime(0.025 + speed01 * 0.03, audio.ctx.currentTime);
    } catch (err) {
      // ignore
    }
  };

  audio.toggleMute = function toggleMute() {
    audio.muted = !audio.muted;
    if (audio.master) {
      try {
        audio.master.gain.value = audio.muted ? 0 : 0.5;
      } catch (err) {
        // ignore
      }
    }
    return audio.muted;
  };

  return audio;
}
