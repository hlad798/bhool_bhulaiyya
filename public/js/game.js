/* ==================================================================
   Bhool Bhulaiyya: The Escape Hunt - browser side
   ------------------------------------------------------------------
   The Python server (app.py) builds the maze, picks and grades the
   questions, sets the difficulty and calculates the score.
   This file only draws the haveli, plays the sounds and moves
   the player and Manjulika.
   ================================================================== */
(function () {
  'use strict';

  // ---------------------------------------------------------------- constants
  var N = 1, E = 2, S = 4, W = 8;
  var DIRS = {
    up:    { bit: N, dr: -1, dc: 0 },
    right: { bit: E, dr: 0,  dc: 1 },
    down:  { bit: S, dr: 1,  dc: 0 },
    left:  { bit: W, dr: 0,  dc: -1 }
  };
  var DELTA = {};
  DELTA[N] = [-1, 0]; DELTA[E] = [0, 1]; DELTA[S] = [1, 0]; DELTA[W] = [0, -1];
  var OPP = {};
  OPP[N] = S; OPP[S] = N; OPP[E] = W; OPP[W] = E;
  var KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };
  var TWO_PI = Math.PI * 2;

  // ---------------------------------------------------------------- dom
  function $(id) { return document.getElementById(id); }
  var canvas = $('board');
  var ctx = canvas.getContext('2d');
  var staticLayer = document.createElement('canvas');
  var fogLayer = document.createElement('canvas');

  // ---------------------------------------------------------------- state
  var state = {
    level: 1,
    total: 0,
    levelStartTotal: 0,
    data: null,
    cfg: null,
    grid: null,
    rows: 0,
    cols: 0,
    cell: 20,
    px: 400,
    dpr: 1,
    deadEnds: {},
    player: { r: 0, c: 0, x: 0, y: 0 },
    ghost: { r: 0, c: 0, x: 0, y: 0, awake: false, wakeIn: 0, moveAcc: 0 },
    running: false,
    paused: false,
    time: 0,
    correct: 0,
    moveCooldown: 0,
    heldDir: null,
    pendingDir: null,
    dist: 99,
    distMap: null,
    heartAcc: 0,
    nearArmed: true,
    whisperAcc: 0,
    staticDirty: true,
    particles: [],
    question: null,
    clock: 0
  };

  // ================================================================== AUDIO
  // All sounds are built in the browser with the Web Audio API - no sound files.
  // The heartbeat and the ghungroo bells are pre-rendered once into sample
  // buffers (like tiny recordings), and the scream is a voice shaped by
  // vowel formants. Everything except the heartbeat echoes through a
  // stone-hall reverb so it sounds like it is inside the haveli.
  var Sound = {
    ctx: null,
    master: null,
    reverb: null,
    noiseBuf: null,
    droneFilter: null,
    droneOn: false,
    muted: false,
    heartLub: null,
    heartDub: null,
    bells: [],

    init: function (customCtx) {
      if (this.ctx) { return; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!customCtx && !AC) { return; }
      var c = customCtx || new AC();
      this.ctx = c;

      // A compressor stops the loud scream from distorting the speakers.
      var comp = c.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.25;
      comp.connect(c.destination);
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(comp);

      var len = c.sampleRate * 2;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      var data = this.noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) { data[i] = Math.random() * 2 - 1; }

      this.reverb = c.createConvolver();
      this.reverb.buffer = this.makeHallImpulse(3.2);
      var wet = c.createGain();
      wet.gain.value = 0.55;
      this.reverb.connect(wet);
      wet.connect(this.master);

      this.heartLub = this.renderHeartThump(true);
      this.heartDub = this.renderHeartThump(false);
      this.bells = [];
      for (var b = 0; b < 5; b++) { this.bells.push(this.renderGhungroo()); }
    },

    resume: function () {
      if (this.ctx && this.ctx.state === 'suspended') { this.ctx.resume(); }
    },

    toggleMute: function () {
      this.muted = !this.muted;
      if (this.master) { this.master.gain.value = this.muted ? 0 : 0.9; }
      return this.muted;
    },

    noise: function () {
      var src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      return src;
    },

    distortion: function (amount) {
      var n = 1024;
      var curve = new Float32Array(n);
      for (var i = 0; i < n; i++) {
        var x = i * 2 / n - 1;
        curve[i] = (3 + amount) * x * 20 * (Math.PI / 180) / (Math.PI + amount * Math.abs(x));
      }
      var shaper = this.ctx.createWaveShaper();
      shaper.curve = curve;
      return shaper;
    },

    // Stone-hall echo: stereo decaying noise that gets darker as it fades.
    makeHallImpulse: function (seconds) {
      var c = this.ctx;
      var sr = c.sampleRate;
      var len = Math.floor(sr * seconds);
      var buf = c.createBuffer(2, len, sr);
      for (var ch = 0; ch < 2; ch++) {
        var d = buf.getChannelData(ch);
        var lp = 0;
        for (var i = 0; i < len; i++) {
          var u = i / len;
          var x = (Math.random() * 2 - 1) * Math.pow(1 - u, 2.6);
          var a = 0.55 - 0.47 * u;
          lp += a * (x - lp);
          d[i] = lp;
        }
        // a few early reflections off the walls
        var taps = [0.011, 0.023, 0.037, 0.052, 0.071];
        for (var k = 0; k < taps.length; k++) {
          var idx = Math.floor((taps[k] + ch * 0.003) * sr);
          if (idx < len) { d[idx] += 0.5 / (k + 1); }
        }
      }
      return buf;
    },

    // One heart sound: a soft, muffled low thud with a pitch drop,
    // like a real heartbeat heard from inside the chest.
    renderHeartThump: function (isLub) {
      var c = this.ctx;
      var sr = c.sampleRate;
      var len = Math.floor(sr * 0.3);
      var buf = c.createBuffer(1, len, sr);
      var d = buf.getChannelData(0);
      var fStart = isLub ? 78 : 95;
      var fEnd = isLub ? 50 : 60;
      var tau = isLub ? 0.048 : 0.036;
      var phase = 0, lpn = 0, i, t;
      for (i = 0; i < len; i++) {
        t = i / sr;
        var f = fEnd + (fStart - fEnd) * Math.exp(-t / 0.035);
        phase += TWO_PI * f / sr;
        var env = (1 - Math.exp(-t / 0.006)) * Math.exp(-t / tau);
        var tone = Math.sin(phase) + 0.7 * Math.sin(phase * 2.02) + 0.25 * Math.sin(phase * 3.1);
        lpn += 0.04 * ((Math.random() * 2 - 1) - lpn);
        var thud = lpn * 6 * (1 - Math.exp(-t / 0.002)) * Math.exp(-t / (tau * 0.45));
        d[i] = (tone * env + thud * 0.6);
      }
      // two-pole low-pass at ~320 Hz: the chest muffles everything bright,
      // but enough low-mid stays in for phone and laptop speakers to play it
      var a = 1 - Math.exp(-TWO_PI * 320 / sr);
      var y1 = 0, y2 = 0, peak = 0;
      for (i = 0; i < len; i++) {
        y1 += a * (d[i] - y1);
        y2 += a * (y1 - y2);
        d[i] = Math.tanh(y2 * 2.6);
        if (Math.abs(d[i]) > peak) { peak = Math.abs(d[i]); }
      }
      var gain = (isLub ? 0.95 : 0.7) / (peak || 1);
      for (i = 0; i < len; i++) { d[i] *= gain; }
      return buf;
    },

    // One "step" of ghungroo: dozens of tiny brass bells struck together,
    // each with metallic (inharmonic) overtones plus the rattle of its pellet.
    renderGhungroo: function () {
      var c = this.ctx;
      var sr = c.sampleRate;
      var len = Math.floor(sr * 0.9);
      var buf = c.createBuffer(2, len, sr);
      var L = buf.getChannelData(0), R = buf.getChannelData(1);
      var ratios = [1, 1.51, 2.33, 3.07];
      var amps = [1, 0.55, 0.32, 0.18];
      var taus = [0.13, 0.085, 0.055, 0.035];
      var count = 24 + Math.floor(Math.random() * 14);
      for (var b = 0; b < count; b++) {
        // most bells strike together, some settle a moment later
        var onset = Math.random() < 0.72 ? Math.random() * 0.03 : 0.06 + Math.random() * 0.09;
        var start = Math.floor(onset * sr);
        var f0 = 2300 + Math.random() * 2800;
        var vol = (0.25 + Math.random() * 0.75) * (onset > 0.05 ? 0.55 : 1);
        var spread = Math.random();
        var decayScale = 0.7 + Math.random() * 0.6;
        var beat = 6 + Math.random() * 14;
        for (var p = 0; p < ratios.length; p++) {
          var w = TWO_PI * f0 * ratios[p] / sr;
          if (f0 * ratios[p] > sr * 0.45) { continue; }
          var tau = taus[p] * decayScale;
          var stop = Math.min(len, start + Math.floor(tau * 7 * sr));
          var k = 2 * Math.cos(w);
          var ph = Math.random() * TWO_PI;
          var s1 = Math.sin(ph - w), s2 = Math.sin(ph - 2 * w);
          for (var i = start; i < stop; i++) {
            var s0 = k * s1 - s2;
            s2 = s1; s1 = s0;
            var t = (i - start) / sr;
            var env = Math.min(1, t * 1500) * Math.exp(-t / tau) * (1 + 0.25 * Math.sin(TWO_PI * beat * t));
            var v = s0 * env * amps[p] * vol;
            L[i] += v * (1 - spread * 0.6);
            R[i] += v * (0.4 + spread * 0.6);
          }
        }
        // pellet rattle: a few tiny bright clicks
        var clicks = 2 + Math.floor(Math.random() * 3);
        for (var q = 0; q < clicks; q++) {
          var cs = start + Math.floor(Math.random() * 0.025 * sr);
          var prev = 0;
          for (var j = 0; j < 70 && cs + j < len; j++) {
            var nz = Math.random() * 2 - 1;
            var hp = (nz - prev) * Math.exp(-j / 18) * 0.35 * vol;
            prev = nz;
            L[cs + j] += hp * (1 - spread * 0.5);
            R[cs + j] += hp * (0.5 + spread * 0.5);
          }
        }
      }
      var peak = 0, n;
      for (n = 0; n < len; n++) { peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n])); }
      var g = 0.9 / (peak || 1);
      for (n = 0; n < len; n++) { L[n] *= g; R[n] *= g; }
      return buf;
    },

    playBuffer: function (buf, vol, opts) {
      if (!this.ctx || !buf) { return; }
      opts = opts || {};
      var c = this.ctx;
      var src = c.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate || 1;
      var g = c.createGain();
      g.gain.value = Math.max(0, vol);
      src.connect(g);
      var node = g;
      if (typeof opts.pan === 'number' && c.createStereoPanner) {
        var pan = c.createStereoPanner();
        pan.pan.value = Math.max(-0.9, Math.min(0.9, opts.pan));
        g.connect(pan);
        node = pan;
      }
      if (opts.lowpass) {
        var lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = opts.lowpass;
        node.connect(lp);
        node = lp;
      }
      node.connect(this.master);
      if (opts.wet) {
        var send = c.createGain();
        send.gain.value = opts.wet;
        node.connect(send);
        send.connect(this.reverb);
      }
      src.start(opts.when || c.currentTime);
    },

    // lub ... dub. The gap between them shrinks as the heart races.
    heartbeat: function (vol, gap) {
      if (!this.ctx) { return; }
      var t = this.ctx.currentTime + 0.01;
      this.playBuffer(this.heartLub, vol, { when: t });
      this.playBuffer(this.heartDub, vol, { when: t + gap });
    },

    ghungroo: function (vol, pan) {
      if (!this.ctx || !this.bells.length) { return; }
      var buf = this.bells[Math.floor(Math.random() * this.bells.length)];
      this.playBuffer(buf, vol, {
        rate: 0.93 + Math.random() * 0.14,
        pan: typeof pan === 'number' ? pan : 0,
        wet: 0.7
      });
    },

    startDrone: function () {
      if (!this.ctx || this.droneOn) { return; }
      this.droneOn = true;
      var c = this.ctx;
      var g = c.createGain();
      g.gain.value = 0.06;
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 150;
      f.Q.value = 5;
      var o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;
      var o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 55.6;
      var o3 = c.createOscillator(); o3.type = 'sine'; o3.frequency.value = 82.4;
      o1.connect(f); o2.connect(f); o3.connect(f);
      f.connect(g); g.connect(this.master);
      var wind = this.noise();
      var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 450; bp.Q.value = 0.6;
      var wg = c.createGain(); wg.gain.value = 0.02;
      var lfo = c.createOscillator(); lfo.frequency.value = 0.13;
      var lfoG = c.createGain(); lfoG.gain.value = 0.012;
      lfo.connect(lfoG); lfoG.connect(wg.gain);
      wind.connect(bp); bp.connect(wg); wg.connect(this.master);
      var ws = c.createGain(); ws.gain.value = 0.5;
      wg.connect(ws); ws.connect(this.reverb);
      o1.start(); o2.start(); o3.start(); wind.start(); lfo.start();
      this.droneFilter = f;
    },

    setTension: function (t) {
      if (!this.droneFilter) { return; }
      this.droneFilter.frequency.setTargetAtTime(150 + 800 * t, this.ctx.currentTime, 0.4);
    },

    // A screaming voice: two slightly mismatched voices on a sawtooth source,
    // shaped through "aaah" vowel formants, with a shaking pitch, breath
    // noise and rasp, ringing through the haveli's echo.
    // opts.pitch lowers/raises the voice, opts.wet = how much echo.
    scream: function (vol, dur, opts) {
      if (!this.ctx) { return; }
      opts = opts || {};
      var c = this.ctx;
      var t = c.currentTime + 0.02;
      var pitch = opts.pitch || 1;

      var out = c.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(vol, t + 0.07);
      out.gain.setValueAtTime(vol, t + dur * 0.55);
      out.gain.linearRampToValueAtTime(vol * 0.8, t + dur * 0.8);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      out.connect(this.master);
      var send = c.createGain();
      send.gain.value = typeof opts.wet === 'number' ? opts.wet : 0.7;
      out.connect(send);
      send.connect(this.reverb);

      var rasp = this.distortion(35);
      rasp.connect(out);

      var bus = c.createGain();
      bus.gain.value = 1;
      var growl = c.createOscillator();
      growl.frequency.value = 38;
      var growlDepth = c.createGain();
      growlDepth.gain.value = 0.22;
      growl.connect(growlDepth);
      growlDepth.connect(bus.gain);
      growl.start(t);
      growl.stop(t + dur + 0.1);

      var formants = [
        { f: 950, q: 5, g: 1.0 },
        { f: 1550, q: 7, g: 0.7 },
        { f: 2850, q: 9, g: 0.45 },
        { f: 4100, q: 11, g: 0.22 }
      ];
      for (var i = 0; i < formants.length; i++) {
        var bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = formants[i].f * (0.9 + 0.1 * pitch);
        bp.Q.value = formants[i].q;
        var fg = c.createGain();
        fg.gain.value = formants[i].g * 3;
        bus.connect(bp);
        bp.connect(fg);
        fg.connect(rasp);
      }

      var voices = [{ ratio: 1, delay: 0, gain: 0.6 }, { ratio: 1.065, delay: 0.07, gain: 0.35 }];
      for (var v = 0; v < voices.length; v++) {
        var vd = voices[v];
        var vDur = dur - vd.delay;
        var steps = 240;
        var curve = new Float32Array(steps);
        var jitter = 0;
        for (var k = 0; k < steps; k++) {
          var u = k / (steps - 1);
          var f;
          if (u < 0.06) {
            f = 520 + (1180 - 520) * (u / 0.06);
          } else if (u < 0.74) {
            f = 1180 + 150 * Math.sin((u - 0.06) * 4.2);
          } else {
            f = 1250 * (1 - 0.45 * Math.pow((u - 0.74) / 0.26, 1.4));
          }
          jitter = jitter * 0.85 + (Math.random() - 0.5) * 0.035;
          f *= 1 + 0.028 * Math.sin(TWO_PI * 5.6 * u * vDur) + jitter;
          curve[k] = f * vd.ratio * pitch;
        }
        var osc = c.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueCurveAtTime(curve, t + vd.delay, vDur);
        var vg = c.createGain();
        vg.gain.value = vd.gain;
        osc.connect(vg);
        vg.connect(bus);
        osc.start(t + vd.delay);
        osc.stop(t + dur + 0.05);
      }

      var breath = this.noise();
      var bbp = c.createBiquadFilter();
      bbp.type = 'bandpass';
      bbp.frequency.value = 3000;
      bbp.Q.value = 0.7;
      var bg = c.createGain();
      bg.gain.value = 0.3;
      breath.connect(bbp);
      bbp.connect(bg);
      bg.connect(out);
      breath.start(t);
      breath.stop(t + dur + 0.05);
    },

    crumble: function () {
      if (!this.ctx) { return; }
      var c = this.ctx;
      var t = c.currentTime;
      var n = this.noise();
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
      var g = c.createGain();
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      n.connect(lp); lp.connect(g); g.connect(this.master);
      var send = c.createGain(); send.gain.value = 0.6;
      g.connect(send); send.connect(this.reverb);
      n.start(t); n.stop(t + 1.05);
      this.playBuffer(this.heartLub, 1, { rate: 0.6, wet: 0.5 });
    },

    wrong: function () {
      if (!this.ctx) { return; }
      var c = this.ctx;
      var t = c.currentTime;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.6);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.7);
    },

    chime: function () {
      if (!this.ctx) { return; }
      var c = this.ctx;
      var notes = [392, 494, 587, 784];
      for (var i = 0; i < notes.length; i++) {
        var t = c.currentTime + i * 0.13;
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = 'triangle';
        o.frequency.value = notes[i];
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        o.connect(g); g.connect(this.master);
        var s = c.createGain(); s.gain.value = 0.4;
        g.connect(s); s.connect(this.reverb);
        o.start(t); o.stop(t + 0.85);
      }
    }
  };
  window.BBSound = Sound;

  // ================================================================== HELPERS
  function showScreen(id) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) { screens[i].classList.remove('active'); }
    $(id).classList.add('active');
  }

  function api(url, body) {
    var opts = body ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    } : {};
    return fetch(url, opts).then(function (res) {
      if (!res.ok) { throw new Error('Server said ' + res.status); }
      return res.json();
    });
  }

  function key(r, c) { return r + ',' + c; }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function showMessage(title, body, buttons) {
    $('m-title').textContent = title;
    $('m-body').innerHTML = body;
    var box = $('m-buttons');
    box.innerHTML = '';
    for (var i = 0; i < buttons.length; i++) {
      (function (b) {
        var el = document.createElement('button');
        el.className = 'btn' + (b.primary ? ' btn-primary' : '');
        el.textContent = b.label;
        el.addEventListener('click', function () {
          $('modal-message').classList.remove('show');
          b.onClick();
        });
        box.appendChild(el);
      })(buttons[i]);
    }
    $('modal-message').classList.add('show');
  }

  var whisperTimer = null;
  function whisper(text) {
    var el = $('whisper');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(whisperTimer);
    whisperTimer = setTimeout(function () { el.classList.remove('show'); }, 3600);
  }

  function ghostPan() {
    var span = Math.max(1, state.cols / 2);
    return (state.ghost.x - state.player.x) / span;
  }

  // ================================================================== LEVELS
  function startGame() {
    Sound.init();
    Sound.resume();
    Sound.startDrone();
    state.total = 0;
    showScreen('screen-game');
    loadLevel(1);
  }

  function loadLevel(n) {
    state.running = false;
    state.level = n;
    state.levelStartTotal = state.total;
    $('loading').classList.add('show');
    api('/api/level/' + n).then(function (data) {
      $('loading').classList.remove('show');
      setupLevel(data);
    }).catch(function (err) {
      $('loading').classList.remove('show');
      showMessage('The haveli is silent...', 'Could not reach the server (' + err.message + ').', [
        { label: 'Try again', primary: true, onClick: function () { loadLevel(n); } }
      ]);
    });
  }

  function setupLevel(data) {
    var i;
    state.data = data;
    state.cfg = data.config;
    state.rows = data.config.rows;
    state.cols = data.config.cols;
    state.grid = [];
    for (i = 0; i < data.grid.length; i++) { state.grid.push(data.grid[i].slice()); }
    state.deadEnds = {};
    for (i = 0; i < data.deadEnds.length; i++) {
      var de = data.deadEnds[i];
      de.solved = false;
      state.deadEnds[key(de.r, de.c)] = de;
    }
    var p = state.player;
    p.r = data.start[0]; p.c = data.start[1]; p.x = p.c; p.y = p.r;
    var g = state.ghost;
    g.r = data.start[0]; g.c = data.start[1]; g.x = g.c; g.y = g.r;
    g.awake = false;
    g.wakeIn = data.config.wake_delay;
    g.moveAcc = 0;
    state.time = 0;
    state.correct = 0;
    state.heldDir = null;
    state.pendingDir = null;
    state.moveCooldown = 0;
    state.nearArmed = true;
    state.whisperAcc = 0;
    state.particles = [];
    state.paused = false;
    state.question = null;
    state.staticDirty = true;

    $('hud-level').textContent = data.config.level + ' / ' + data.maxLevel;
    $('hud-name').textContent = data.config.name;
    $('hud-score').textContent = state.total;
    resize();

    showMessage('Level ' + data.config.level + ': ' + data.config.name,
      'Manjulika wakes in <b>' + data.config.wake_delay + ' seconds</b> and moves at <b>' +
      data.config.ghost_speed + ' steps per second</b>.<br>You have only <b>' +
      data.config.question_time + ' seconds</b> to answer each riddle. Find the glowing door.',
      [{ label: 'Begin', primary: true, onClick: function () {
        Sound.resume();
        state.running = true;
        whisper(pick(state.data.whispers.sleeping));
      } }]);
  }

  function levelComplete() {
    state.running = false;
    state.heldDir = null;
    Sound.chime();
    $('board-wrap').classList.remove('shake');
    api('/api/score', {
      level: state.level,
      seconds: state.time,
      correct: state.correct,
      parSteps: state.data.parSteps,
      total: state.total
    }).then(function (res) {
      state.total = res.total;
      $('hud-score').textContent = state.total;
      if (res.finished) {
        showMessage('You escaped the haveli!',
          'Manjulika screams into the night as the last door slams behind you.<br><br>' +
          'Final score: <b>' + res.total + '</b><br>Rank: <b>' + res.title + '</b>',
          [{ label: 'Play again', primary: true, onClick: startGame },
           { label: 'Main menu', onClick: goHome }]);
      } else {
        showMessage('You escaped ' + state.cfg.name + '!',
          'Time: <b>' + state.time.toFixed(1) + 's</b> &middot; Riddles solved: <b>' + state.correct +
          '</b><br>Points this level: <b>' + res.points + '</b> &middot; Total: <b>' + res.total +
          '</b><br><br>But she is faster now... and she sleeps less.',
          [{ label: 'Next level', primary: true, onClick: function () { loadLevel(state.level + 1); } }]);
      }
    }).catch(function () {
      showMessage('You escaped!', 'The score keeper could not be reached, but you survived.',
        [{ label: 'Next level', primary: true, onClick: function () { loadLevel(Math.min(state.level + 1, state.data.maxLevel)); } }]);
    });
  }

  function caught(reason) {
    if (!state.running && !state.question) { return; }
    state.running = false;
    state.paused = false;
    state.heldDir = null;
    $('modal-question').classList.remove('show');
    $('board-wrap').classList.remove('shake');
    Sound.scream(1.0, 3.6, { wet: 0.6 });
    drawScare();
    $('jumpscare').classList.add('show');
    setTimeout(function () {
      $('jumpscare').classList.remove('show');
      api('/api/rank', { total: state.total, cleared: state.level - 1 }).then(function (res) {
        showCaught(reason, res.title);
      }).catch(function () { showCaught(reason, ''); });
    }, 2600);
  }

  function showCaught(reason, title) {
    showMessage('Manjulika caught you!', reason +
      '<br><br>Score so far: <b>' + state.total + '</b>' + (title ? '<br>Rank: <b>' + title + '</b>' : ''),
      [{ label: 'Retry level ' + state.level, primary: true, onClick: function () {
          state.total = state.levelStartTotal;
          loadLevel(state.level);
        } },
       { label: 'Main menu', onClick: goHome }]);
  }

  function goHome() {
    state.running = false;
    showScreen('screen-title');
  }

  // ================================================================== QUESTIONS
  function openQuestion(de) {
    state.paused = true;
    state.heldDir = null;
    state.pendingDir = null;
    var q = de.question;
    state.question = { de: de, remaining: state.cfg.question_time, waiting: false };
    $('q-text').textContent = q.text;
    $('q-feedback').textContent = '';
    $('q-timer-fill').style.width = '100%';
    var box = $('q-options');
    box.innerHTML = '';
    for (var i = 0; i < q.options.length; i++) {
      (function (opt) {
        var b = document.createElement('button');
        b.className = 'option-btn';
        b.textContent = opt;
        b.addEventListener('click', function () { submitAnswer(opt); });
        box.appendChild(b);
      })(q.options[i]);
    }
    $('modal-question').classList.add('show');
    Sound.ghungroo(0.55, ghostPan());
  }

  function setOptionsDisabled(flag) {
    var btns = $('q-options').querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) { btns[i].disabled = flag; }
  }

  function submitAnswer(choice) {
    var q = state.question;
    if (!q || q.waiting) { return; }
    q.waiting = true;
    setOptionsDisabled(true);
    $('q-feedback').textContent = 'The walls are listening...';
    api('/api/answer', { id: q.de.question.id, choice: choice === null ? '' : choice }).then(function (res) {
      var btns = $('q-options').querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        if (btns[i].textContent === res.answer) { btns[i].classList.add('right'); }
        else if (btns[i].textContent === choice) { btns[i].classList.add('wrong'); }
      }
      if (res.correct) {
        $('q-feedback').textContent = res.message;
        state.correct += 1;
        breakWall(q.de);
        Sound.crumble();
        setTimeout(function () {
          $('modal-question').classList.remove('show');
          state.question = null;
          state.paused = false;
        }, 900);
      } else {
        Sound.wrong();
        $('q-feedback').textContent = (choice === null ? 'Time is up! ' : '') + 'The answer was "' + res.answer + '".';
        setTimeout(function () {
          caught(choice === null ? 'You froze at the dead end and ran out of time.' :
            'Wrong answer. The wall stayed shut... and she was right behind you.');
          state.question = null;
        }, 1300);
      }
    }).catch(function () {
      q.waiting = false;
      setOptionsDisabled(false);
      $('q-feedback').textContent = 'The haveli lost its voice (network problem). Choose again.';
    });
  }

  function breakWall(de) {
    var w = de.breakWall;
    var r = de.r, c = de.c;
    var nr = r + DELTA[w][0], nc = c + DELTA[w][1];
    state.grid[r][c] &= ~w;
    state.grid[nr][nc] &= ~OPP[w];
    de.solved = true;
    state.staticDirty = true;
    var cx = c + 0.5 + DELTA[w][1] * 0.5;
    var cy = r + 0.5 + DELTA[w][0] * 0.5;
    for (var i = 0; i < 26; i++) {
      state.particles.push({
        x: cx, y: cy,
        vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
        life: 0.6 + Math.random() * 0.6
      });
    }
  }

  // ================================================================== MOVEMENT
  function canMove(r, c, dir) {
    return !(state.grid[r][c] & dir.bit);
  }

  function tryMove(name) {
    var dir = DIRS[name];
    var p = state.player;
    if (!canMove(p.r, p.c, dir)) { return false; }
    p.r += dir.dr;
    p.c += dir.dc;
    state.moveCooldown = 1 / state.cfg.player_speed;
    afterPlayerMove();
    return true;
  }

  function afterPlayerMove() {
    var p = state.player;
    var g = state.ghost;
    if (g.awake && p.r === g.r && p.c === g.c) {
      caught('You ran straight into her arms.');
      return;
    }
    if (p.r === state.data.exit[0] && p.c === state.data.exit[1]) {
      levelComplete();
      return;
    }
    var de = state.deadEnds[key(p.r, p.c)];
    if (de && !de.solved) { openQuestion(de); }
  }

  // Breadth-first search from the player: gives Manjulika the shortest way to you.
  function bfsFromPlayer() {
    var rows = state.rows, cols = state.cols;
    var dist = new Int16Array(rows * cols);
    for (var i = 0; i < dist.length; i++) { dist[i] = -1; }
    var qr = [state.player.r], qc = [state.player.c];
    dist[state.player.r * cols + state.player.c] = 0;
    var head = 0;
    while (head < qr.length) {
      var r = qr[head], c = qc[head];
      head++;
      var cell = state.grid[r][c];
      for (var b = 1; b <= 8; b *= 2) {
        if (cell & b) { continue; }
        var nr = r + DELTA[b][0], nc = c + DELTA[b][1];
        var idx = nr * cols + nc;
        if (dist[idx] === -1) {
          dist[idx] = dist[r * cols + c] + 1;
          qr.push(nr); qc.push(nc);
        }
      }
    }
    return dist;
  }

  function stepGhost() {
    var g = state.ghost;
    var cols = state.cols;
    var map = state.distMap;
    var best = null;
    var bestD = map[g.r * cols + g.c];
    var cell = state.grid[g.r][g.c];
    for (var b = 1; b <= 8; b *= 2) {
      if (cell & b) { continue; }
      var nr = g.r + DELTA[b][0], nc = g.c + DELTA[b][1];
      var d = map[nr * cols + nc];
      if (d >= 0 && d < bestD) { bestD = d; best = [nr, nc]; }
    }
    if (best) { g.r = best[0]; g.c = best[1]; }
    if (g.r === state.player.r && g.c === state.player.c) {
      caught('Her cold hands closed around you in the dark.');
      return;
    }
    state.distMap = bfsFromPlayer();
    state.dist = state.distMap[g.r * cols + g.c];
    // Her anklet bells ring with every step - louder as she gets closer.
    if (state.dist <= 12) {
      Sound.ghungroo(0.08 + Math.pow((12 - state.dist) / 12, 1.6) * 0.75, ghostPan());
    }
  }

  // ================================================================== UPDATE
  function update(dt) {
    var p = state.player, g = state.ghost;
    var lerp = Math.min(1, dt * 16);
    p.x += (p.c - p.x) * lerp;
    p.y += (p.r - p.y) * lerp;
    g.x += (g.c - g.x) * Math.min(1, dt * 10);
    g.y += (g.r - g.y) * Math.min(1, dt * 10);

    for (var i = state.particles.length - 1; i >= 0; i--) {
      var pt = state.particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
      if (pt.life <= 0) { state.particles.splice(i, 1); }
    }

    // Question countdown (game is paused while you think)
    if (state.question && !state.question.waiting) {
      state.question.remaining -= dt;
      var frac = Math.max(0, state.question.remaining / state.cfg.question_time);
      $('q-timer-fill').style.width = (frac * 100) + '%';
      state.heartAcc += dt;
      var qBeat = 0.75 - (1 - frac) * 0.4;
      if (state.heartAcc >= qBeat) { state.heartAcc = 0; Sound.heartbeat(0.6 + (1 - frac) * 0.35, 0.2); }
      if (state.question.remaining <= 0) { submitAnswer(null); }
      return;
    }

    if (!state.running || state.paused) { return; }

    state.time += dt;

    // Player input
    state.moveCooldown -= dt;
    if (state.moveCooldown <= 0) {
      var dir = state.pendingDir || state.heldDir;
      state.pendingDir = null;
      if (dir) {
        tryMove(dir);
        if (!state.running || state.paused) { return; }
      }
    }

    state.distMap = bfsFromPlayer();
    state.dist = state.distMap[g.r * state.cols + g.c];

    // Manjulika
    if (!g.awake) {
      g.wakeIn -= dt;
      $('hud-ghost').textContent = 'Wakes in ' + Math.max(0, g.wakeIn).toFixed(1) + 's';
      $('hud-ghost').classList.remove('awake');
      if (g.wakeIn <= 0) {
        g.awake = true;
        Sound.scream(0.32, 2.6, { wet: 1.4, pitch: 0.82 });
        whisper(pick(state.data.whispers.awake));
        state.whisperAcc = 0;
      }
    } else {
      g.moveAcc += dt;
      var interval = 1 / state.cfg.ghost_speed;
      while (g.moveAcc >= interval && state.running) {
        g.moveAcc -= interval;
        stepGhost();
      }
      if (!state.running) { return; }
      $('hud-ghost').textContent = state.dist <= 4 ? 'RIGHT BEHIND YOU' : 'AWAKE - hunting';
      $('hud-ghost').classList.add('awake');
    }

    // Heartbeat: faster and louder as she closes in (about 60 -> 180 bpm)
    var d = g.awake ? Math.max(1, state.dist) : 20;
    var closeness = g.awake ? Math.max(0, Math.min(1, (16 - d) / 15)) : 0;
    var bpm = 60 + closeness * 120;
    state.heartAcc += dt;
    if (state.heartAcc >= 60 / bpm) {
      state.heartAcc = 0;
      Sound.heartbeat(0.35 + closeness * 0.65, 0.26 - closeness * 0.11);
    }
    Sound.setTension(closeness);

    // Shriek when she is too near
    if (g.awake && state.dist <= 2 && state.nearArmed) {
      state.nearArmed = false;
      Sound.scream(0.55, 1.6, { wet: 0.9 });
      whisper(pick(state.data.whispers.near));
    }
    if (state.dist >= 5) { state.nearArmed = true; }
    $('board-wrap').classList.toggle('shake', g.awake && state.dist <= 3);

    // Random whispers
    state.whisperAcc += dt;
    if (state.whisperAcc > 10) {
      state.whisperAcc = Math.random() * 3;
      whisper(pick(g.awake ? state.data.whispers.awake : state.data.whispers.sleeping));
    }

    $('hud-time').textContent = state.time.toFixed(1);
  }

  // ================================================================== RENDER
  function resize() {
    if (!state.rows) { return; }
    var wrap = $('board-wrap');
    var avail = Math.min(wrap.clientWidth - 8, wrap.clientHeight - 8, 760);
    var cell = Math.max(10, Math.floor(avail / state.cols));
    state.cell = cell;
    state.px = cell * state.cols;
    state.dpr = window.devicePixelRatio || 1;
    var size = Math.round(state.px * state.dpr);
    canvas.width = size; canvas.height = size;
    canvas.style.width = state.px + 'px';
    canvas.style.height = state.px + 'px';
    staticLayer.width = size; staticLayer.height = size;
    fogLayer.width = size; fogLayer.height = size;
    state.staticDirty = true;
  }

  function buildStatic() {
    var c = staticLayer.getContext('2d');
    var cs = state.cell;
    c.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    c.clearRect(0, 0, state.px, state.px);
    var r, col;
    // Floor tiles
    for (r = 0; r < state.rows; r++) {
      for (col = 0; col < state.cols; col++) {
        c.fillStyle = (r + col) % 2 === 0 ? '#22100f' : '#1b0c0c';
        c.fillRect(col * cs, r * cs, cs, cs);
        c.strokeStyle = 'rgba(201,161,74,0.05)';
        c.strokeRect(col * cs + cs * 0.2, r * cs + cs * 0.2, cs * 0.6, cs * 0.6);
      }
    }
    // Riddle marks on unsolved dead ends
    for (var k in state.deadEnds) {
      if (!state.deadEnds.hasOwnProperty(k)) { continue; }
      var de = state.deadEnds[k];
      if (de.solved) { continue; }
      var x = de.c * cs + cs / 2, y = de.r * cs + cs / 2;
      c.save();
      c.translate(x, y);
      c.rotate(Math.PI / 4);
      c.strokeStyle = 'rgba(224,40,58,0.7)';
      c.lineWidth = Math.max(1, cs * 0.05);
      c.strokeRect(-cs * 0.14, -cs * 0.14, cs * 0.28, cs * 0.28);
      c.restore();
      c.fillStyle = 'rgba(224,40,58,0.85)';
      c.font = 'bold ' + Math.floor(cs * 0.3) + 'px Georgia';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('?', x, y + 1);
    }
    // Exit door
    var ex = state.data.exit[1] * cs, ey = state.data.exit[0] * cs;
    c.fillStyle = '#3d6b3a';
    c.beginPath();
    c.moveTo(ex + cs * 0.25, ey + cs * 0.9);
    c.lineTo(ex + cs * 0.25, ey + cs * 0.4);
    c.arc(ex + cs * 0.5, ey + cs * 0.4, cs * 0.25, Math.PI, 0);
    c.lineTo(ex + cs * 0.75, ey + cs * 0.9);
    c.closePath();
    c.fill();
    c.strokeStyle = '#c9a14a';
    c.lineWidth = Math.max(1, cs * 0.06);
    c.stroke();
    // Walls
    c.lineCap = 'round';
    var passes = [
      { color: '#4a3415', width: Math.max(3, cs * 0.22) },
      { color: '#a07c36', width: Math.max(1.5, cs * 0.1) }
    ];
    for (var pi = 0; pi < passes.length; pi++) {
      c.strokeStyle = passes[pi].color;
      c.lineWidth = passes[pi].width;
      c.beginPath();
      for (r = 0; r < state.rows; r++) {
        for (col = 0; col < state.cols; col++) {
          var cell = state.grid[r][col];
          var x0 = col * cs, y0 = r * cs;
          if (cell & N) { c.moveTo(x0, y0); c.lineTo(x0 + cs, y0); }
          if (cell & W) { c.moveTo(x0, y0); c.lineTo(x0, y0 + cs); }
          if (r === state.rows - 1 && (cell & S)) { c.moveTo(x0, y0 + cs); c.lineTo(x0 + cs, y0 + cs); }
          if (col === state.cols - 1 && (cell & E)) { c.moveTo(x0 + cs, y0); c.lineTo(x0 + cs, y0 + cs); }
        }
      }
      c.stroke();
    }
    state.staticDirty = false;
  }

  // ---------------------------------------------------------------- characters
  // The figures are painted in characters.js (window.BBChars) as sprites.
  // Here we only place them, add the live glows and animate the lantern flame.
  var FIGURE_H = 1.45;   // figure height in cells

  function drawGhostSprite(c, cx, cy, cs, t, alpha) {
    var spr = window.BBChars.ghostFrame(t);
    var h = cs * FIGURE_H, w = h * spr.width / spr.height;
    var bob = Math.sin(t * 3) * cs * 0.04;
    var top = cy - h * 0.6 + bob;
    c.save();
    c.globalAlpha = alpha;
    var aura = c.createRadialGradient(cx, cy - h * 0.15, 0, cx, cy - h * 0.15, h * 0.6);
    aura.addColorStop(0, 'rgba(255,50,70,0.25)');
    aura.addColorStop(1, 'rgba(255,50,70,0)');
    c.fillStyle = aura;
    c.beginPath(); c.arc(cx, cy - h * 0.15, h * 0.6, 0, TWO_PI); c.fill();
    c.drawImage(spr, cx - w / 2, top, w, h);
    c.restore();
    return { left: top, w: w, h: h, x0: cx - w / 2 };
  }

  function drawGhostEyes(c, box, t) {
    var glow = 0.75 + Math.sin(t * 9) * 0.25;
    var eyes = window.BBChars.ghostEyes;
    c.save();
    c.shadowColor = '#ff1a2e';
    c.shadowBlur = box.h * 0.06;
    c.fillStyle = 'rgba(255,40,60,' + glow + ')';
    for (var i = 0; i < eyes.length; i++) {
      c.beginPath();
      c.arc(box.x0 + eyes[i][0] * box.w, box.left + eyes[i][1] * box.h, Math.max(1.2, box.h * 0.008), 0, TWO_PI);
      c.fill();
    }
    c.restore();
  }

  function drawPlayerSprite(c, cx, cy, cs, t) {
    var spr = window.BBChars.player;
    var h = cs * FIGURE_H * 0.95, w = h * spr.width / spr.height;
    var top = cy - h * 0.6;
    var x0 = cx - w / 2;
    var fx = x0 + window.BBChars.playerFlame[0] * w, fy = top + window.BBChars.playerFlame[1] * h;
    var lg = c.createRadialGradient(fx, fy, 1, fx, fy, cs * 0.6);
    lg.addColorStop(0, 'rgba(255,170,70,0.55)');
    lg.addColorStop(1, 'rgba(255,170,70,0)');
    c.fillStyle = lg;
    c.beginPath(); c.arc(fx, fy, cs * 0.6, 0, TWO_PI); c.fill();
    c.drawImage(spr, x0, top, w, h);
    var flick = 1 + Math.sin(t * 17) * 0.12 + Math.sin(t * 6.3) * 0.08;
    c.fillStyle = 'rgba(255,190,90,0.9)';
    c.beginPath(); c.ellipse(fx, fy, h * 0.011 * flick, h * 0.022 * flick, 0, 0, TWO_PI); c.fill();
    c.fillStyle = 'rgba(255,248,215,0.95)';
    c.beginPath(); c.ellipse(fx, fy + h * 0.004, h * 0.005, h * 0.011 * flick, 0, 0, TWO_PI); c.fill();
  }

  function render(t) {
    if (!state.data) { return; }
    if (state.staticDirty) { buildStatic(); }
    var cs = state.cell;
    var dpr = state.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(staticLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var p = state.player, g = state.ghost;
    var pcx = (p.x + 0.5) * cs, pcy = (p.y + 0.5) * cs;
    var gcx = (g.x + 0.5) * cs, gcy = (g.y + 0.5) * cs;

    // dust from crumbling walls
    for (var i = 0; i < state.particles.length; i++) {
      var pt = state.particles[i];
      ctx.fillStyle = 'rgba(201,161,74,' + Math.min(1, pt.life) + ')';
      ctx.fillRect(pt.x * cs - 1.5, pt.y * cs - 1.5, 3, 3);
    }

    var ghostBox = drawGhostSprite(ctx, gcx, gcy, cs, t, g.awake ? 0.95 : 0.45);
    drawPlayerSprite(ctx, pcx, pcy, cs, t);

    // Darkness with a flickering lantern hole
    var f = fogLayer.getContext('2d');
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, state.px, state.px);
    f.fillStyle = 'rgba(2,0,1,0.95)';
    f.fillRect(0, 0, state.px, state.px);
    f.globalCompositeOperation = 'destination-out';
    var nearFlicker = (g.awake && state.dist <= 4) ? 0.12 : 0.04;
    var rad = state.cfg.light_radius * cs * (1 + nearFlicker * Math.sin(t * 13) + 0.03 * Math.sin(t * 7.3));
    var hole = f.createRadialGradient(pcx, pcy, rad * 0.25, pcx, pcy, rad);
    hole.addColorStop(0, 'rgba(0,0,0,1)');
    hole.addColorStop(0.7, 'rgba(0,0,0,0.65)');
    hole.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = hole;
    f.beginPath(); f.arc(pcx, pcy, rad, 0, TWO_PI); f.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fogLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // The exit door's light seeps through the darkness
    var ex = (state.data.exit[1] + 0.5) * cs, ey = (state.data.exit[0] + 0.5) * cs;
    var pulse = 0.35 + Math.sin(t * 2.5) * 0.15;
    var eg = ctx.createRadialGradient(ex, ey, 1, ex, ey, cs * 1.2);
    eg.addColorStop(0, 'rgba(140,230,140,' + pulse + ')');
    eg.addColorStop(1, 'rgba(140,230,140,0)');
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(ex, ey, cs * 1.2, 0, TWO_PI); ctx.fill();

    // Her red eyes are visible even in the dark once she is awake
    if (g.awake) { drawGhostEyes(ctx, ghostBox, t); }
  }

  function drawScare() {
    var sc = $('scare-canvas');
    window.BBChars.drawGhostPortrait(sc.getContext('2d'), sc.width, sc.height, true);
  }

  // ================================================================== LOOP
  var last = 0;
  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    state.clock = ts / 1000;
    if (state.data) {
      update(dt);
      render(state.clock);
    }
    requestAnimationFrame(loop);
  }

  // ================================================================== INPUT
  function press(name) {
    Sound.resume();
    if (!state.running || state.paused) { return; }
    state.heldDir = name;
    if (state.moveCooldown <= 0) {
      tryMove(name);
    } else {
      state.pendingDir = name;
    }
  }

  function release(name) {
    if (state.heldDir === name) { state.heldDir = null; }
  }

  document.addEventListener('keydown', function (e) {
    var name = KEYMAP[e.key];
    if (!name) { return; }
    e.preventDefault();
    if (e.repeat) { return; }
    press(name);
  });
  document.addEventListener('keyup', function (e) {
    var name = KEYMAP[e.key];
    if (name) { release(name); }
  });
  window.addEventListener('blur', function () { state.heldDir = null; });

  var pads = document.querySelectorAll('.dpad-btn');
  for (var i = 0; i < pads.length; i++) {
    (function (btn) {
      var name = btn.getAttribute('data-dir');
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        btn.classList.add('pressed');
        press(name);
      });
      var up = function () { btn.classList.remove('pressed'); release(name); };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('pointercancel', up);
    })(pads[i]);
  }

  // Swipe on the board (one step per swipe)
  var touchStart = null;
  canvas.addEventListener('touchstart', function (e) {
    var tt = e.touches[0];
    touchStart = { x: tt.clientX, y: tt.clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', function (e) {
    if (!touchStart) { return; }
    var tt = e.changedTouches[0];
    var dx = tt.clientX - touchStart.x, dy = tt.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { return; }
    var name = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    press(name);
    release(name);
  });

  $('btn-start').addEventListener('click', startGame);
  $('btn-mute').addEventListener('click', function () {
    Sound.init();
    var muted = Sound.toggleMute();
    $('btn-mute').innerHTML = muted ? '&#128263;' : '&#128264;';
  });
  window.addEventListener('resize', resize);

  requestAnimationFrame(loop);
})();
