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
  var vignetteLayer = document.createElement('canvas');  // kept for older code paths; the overlay does the work now

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
    pw: 400,
    ph: 400,
    blocked: [],
    margin: 0,
    decor: null,
    dpr: 1,
    deadEnds: {},
    player: { r: 0, c: 0, x: 0, y: 0 },
    ghosts: [],
    lamps: [],
    lampAcc: 0,
    lampBurst: 0,
    catcher: 'manjulika',
    running: false,
    paused: false,
    time: 0,
    correct: 0,
    moveCooldown: 0,
    heldDir: null,
    holdTime: 0,
    tapQueue: [],
    dist: 99,
    distMap: null,
    heartAcc: 0,
    nearArmed: true,
    whisperAcc: 0,
    staticDirty: true,
    particles: [],
    question: null,
    clock: 0,
    character: 'male'
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
      node.connect(opts.dest || this.master);
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

    // her anklet bells, from her side of the screen
    ghungroo: function (vol, pan) {
      if (!this.ctx || !this.bells.length) { return; }
      var buf = this.bells[Math.floor(Math.random() * this.bells.length)];
      this.playBuffer(buf, vol, {
        rate: 0.9 + Math.random() * 0.14,
        pan: typeof pan === 'number' ? pan : 0,
        wet: 0.8
      });
    },

    // HER heartbeat: a second, deeper and heavier lub-dub that comes from
    // her side of the screen and pounds louder with every step she takes
    // towards you.
    herBeat: function (vol, pan) {
      if (!this.ctx) { return; }
      var t = this.ctx.currentTime + 0.01;
      var opts = { when: t, rate: 0.62, pan: typeof pan === 'number' ? pan : 0, wet: 0.9, lowpass: 420 };
      this.playBuffer(this.heartLub, vol, opts);
      opts.when = t + 0.17;
      opts.rate = 0.66;
      this.playBuffer(this.heartDub, vol * 0.85, opts);
    },

    // distant thunder rolling over the haveli
    thunder: function () {
      var c = this.ctx;
      var t = c.currentTime + 0.25 + Math.random() * 0.4;
      var n = this.noise();
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.18, t + 1.0);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      n.connect(lp); lp.connect(g); g.connect(this.musicBus || this.master);
      var send = c.createGain(); send.gain.value = 0.6;
      g.connect(send); send.connect(this.reverb);
      n.start(t); n.stop(t + 3.3);
    },

    // a heavy, sudden hit: a sub drop with a burst of rubble noise
    boom: function (vol) {
      if (!this.ctx) { return; }
      var c = this.ctx;
      var t = c.currentTime + 0.01;
      var o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 1.2);
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      var drive = this.distortion(25);
      o.connect(drive); drive.connect(g); g.connect(this.master);
      var send = c.createGain(); send.gain.value = 0.8;
      g.connect(send); send.connect(this.reverb);
      o.start(t); o.stop(t + 1.9);
      var n = this.noise();
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      var ng = c.createGain();
      ng.gain.setValueAtTime(vol * 0.8, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      n.connect(lp); lp.connect(ng); ng.connect(this.master);
      n.start(t); n.stop(t + 0.65);
    },

    // ------------------------------------------------------------ ambience
    // Deep-ocean horror ambience: a pressure rumble and a sub drone underneath,
    // with now and then a whale-like moan from the deep, a sonar ping, creaking
    // timbers, water dripping, a distant temple bell, and a faint wordless
    // woman's hum drifting through the halls, over a groaning rumble and an
    // uneasy dissonant hum. It ducks when she is near, so both heartbeats cut through.
    startDrone: function () {
      if (!this.ctx || this.droneOn) { return; }
      this.droneOn = true;
      var c = this.ctx;
      this.musicLevel = 0.5;
      this.musicBus = c.createGain();
      this.musicBus.gain.value = this.musicLevel;
      this.musicBus.connect(this.master);

      // pressure rumble, swelling slowly like the sea
      var rum = this.noise();
      var rlp = c.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 110; rlp.Q.value = 0.8;
      var rg = c.createGain(); rg.gain.value = 0.5;
      var swell = c.createOscillator(); swell.frequency.value = 0.06;
      var swellDepth = c.createGain(); swellDepth.gain.value = 0.32;
      swell.connect(swellDepth); swellDepth.connect(rg.gain);
      rum.connect(rlp); rlp.connect(rg); rg.connect(this.musicBus);
      rum.start(); swell.start();

      // sub drone, two notes beating slowly against each other
      var dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 220;
      var dg = c.createGain(); dg.gain.value = 0.08;
      dlp.connect(dg); dg.connect(this.musicBus);
      var freqs = [43.65, 44.1, 87.3];
      for (var i = 0; i < freqs.length; i++) {
        var o = c.createOscillator();
        o.type = i === 2 ? 'triangle' : 'sine';
        o.frequency.value = freqs[i];
        var og = c.createGain(); og.gain.value = i === 2 ? 0.3 : 1;
        o.connect(og); og.connect(dlp);
        o.start();
      }

      // a second, deeper rumble - the haveli groaning under pressure
      var rum2 = this.noise();
      var r2lp = c.createBiquadFilter(); r2lp.type = 'lowpass'; r2lp.frequency.value = 55; r2lp.Q.value = 2.5;
      var r2g = c.createGain(); r2g.gain.value = 0.6;
      var r2swell = c.createOscillator(); r2swell.frequency.value = 0.023;
      var r2depth = c.createGain(); r2depth.gain.value = 0.45;
      r2swell.connect(r2depth); r2depth.connect(r2g.gain);
      rum2.connect(r2lp); r2lp.connect(r2g); r2g.connect(this.musicBus);
      rum2.start(); r2swell.start();

      // an uneasy, dissonant cluster - two notes a semitone apart, trembling
      var cl = c.createGain(); cl.gain.value = 0.035;
      var trem = c.createOscillator(); trem.frequency.value = 0.31;
      var tremDepth = c.createGain(); tremDepth.gain.value = 0.02;
      trem.connect(tremDepth); tremDepth.connect(cl.gain);
      var cluster = [110, 116.54, 164.81];
      for (var ci = 0; ci < cluster.length; ci++) {
        var co = c.createOscillator();
        co.type = 'triangle';
        co.frequency.value = cluster[ci];
        co.detune.value = (Math.random() - 0.5) * 12;
        co.connect(cl);
        co.start();
      }
      var clp = c.createBiquadFilter(); clp.type = 'lowpass'; clp.frequency.value = 600;
      cl.connect(clp); clp.connect(this.musicBus);
      var cls = c.createGain(); cls.gain.value = 1.2;
      clp.connect(cls); cls.connect(this.reverb);
      trem.start();

      // muffled, underwater hiss
      var hiss = this.noise();
      var hbp = c.createBiquadFilter(); hbp.type = 'bandpass'; hbp.frequency.value = 700; hbp.Q.value = 0.5;
      var hg = c.createGain(); hg.gain.value = 0.02;
      hiss.connect(hbp); hbp.connect(hg); hg.connect(this.musicBus);
      hiss.start();

      // a low pulse that only rises when she is close (see setTension)
      var low = c.createOscillator(); low.type = 'sine'; low.frequency.value = 69.3;
      this.tensionGain = c.createGain(); this.tensionGain.gain.value = 0;
      low.connect(this.tensionGain); this.tensionGain.connect(this.master);
      low.start();

      this.creaks = [this.renderCreak(), this.renderCreak(), this.renderCreak()];
      this.bellBuf = this.renderTempleBell();
      var now = c.currentTime;
      this.nextMoan = now + 4;
      this.nextPing = now + 10;
      this.nextCreak = now + 6;
      this.nextHum = now + 16;
      this.nextBell = now + 24;
      this.nextDrip = now + 2;
      this.nextScrape = now + 9;
      var self = this;
      if (!this.fixedCtx) {
        this.musicTimer = setInterval(function () { self.scheduleMusic(); }, 200);
      }
    },

    scheduleMusic: function () {
      var soon = this.ctx.currentTime + 0.4;
      if (this.nextMoan < soon) { this.moan(this.nextMoan); this.nextMoan += 6 + Math.random() * 6; }
      if (this.nextScrape < soon) { this.scrape(this.nextScrape); this.nextScrape += 13 + Math.random() * 12; }
      if (this.nextPing < soon) { this.sonar(this.nextPing); this.nextPing += 14 + Math.random() * 12; }
      if (this.nextCreak < soon) {
        this.playBuffer(this.creaks[Math.floor(Math.random() * this.creaks.length)], 0.3,
          { when: this.nextCreak, dest: this.musicBus, pan: Math.random() * 1.6 - 0.8, rate: 0.8 + Math.random() * 0.4, wet: 0.7 });
        this.nextCreak += 6 + Math.random() * 9;
      }
      if (this.nextHum < soon) { this.nextHum += this.hum(this.nextHum) + 14 + Math.random() * 14; }
      if (this.nextBell < soon) {
        this.playBuffer(this.bellBuf, 0.16, { when: this.nextBell, dest: this.musicBus, wet: 1.3, rate: 0.9 + Math.random() * 0.2 });
        this.nextBell += 24 + Math.random() * 18;
      }
      if (this.nextDrip < soon) { this.drip(this.nextDrip); this.nextDrip += 2.5 + Math.random() * 6; }
    },

    // send a node to the music bus, panned, with some echo
    toMusic: function (node, pan, wet) {
      var c = this.ctx;
      var out = node;
      if (c.createStereoPanner) {
        var p = c.createStereoPanner();
        p.pan.value = pan;
        node.connect(p);
        out = p;
      }
      out.connect(this.musicBus);
      var send = c.createGain();
      send.gain.value = wet;
      out.connect(send);
      send.connect(this.reverb);
    },

    // a whale-like moan rising out of the deep
    moan: function (t0) {
      var c = this.ctx;
      var dur = 4 + Math.random() * 3;
      var f0 = 55 + Math.random() * 25;
      var n = 200, curve = new Float32Array(n);
      for (var k = 0; k < n; k++) {
        var u = k / (n - 1);
        var f = u < 0.35 ? f0 * (1 + 0.9 * (u / 0.35)) : f0 * (1.9 - 1.1 * ((u - 0.35) / 0.65));
        curve[k] = f * (1 + 0.02 * Math.sin(u * 23));
      }
      var o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueCurveAtTime(curve, t0, dur);
      var f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 380; f1.Q.value = 5;
      var f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 820; f2.Q.value = 7;
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
      var g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.28, t0 + dur * 0.3);
      g.gain.linearRampToValueAtTime(0.18, t0 + dur * 0.7);
      g.gain.linearRampToValueAtTime(0, t0 + dur);
      o.connect(f1); o.connect(f2); f1.connect(lp); f2.connect(lp); lp.connect(g);
      this.toMusic(g, Math.random() * 1.4 - 0.7, 1.4);
      o.start(t0); o.stop(t0 + dur + 0.05);
    },

    // something metal being dragged slowly across stone, far away
    scrape: function (t0) {
      var c = this.ctx;
      var dur = 2.5 + Math.random() * 2;
      var n = this.noise();
      var g = c.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.5, t0 + dur * 0.4);
      g.gain.linearRampToValueAtTime(0, t0 + dur);
      var bands = [1700 + Math.random() * 400, 2600 + Math.random() * 500, 3900];
      var mixer = c.createGain(); mixer.gain.value = 1;
      for (var k = 0; k < bands.length; k++) {
        var bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 28;
        bp.frequency.setValueAtTime(bands[k], t0);
        bp.frequency.linearRampToValueAtTime(bands[k] * (0.85 + Math.random() * 0.3), t0 + dur);
        n.connect(bp); bp.connect(mixer);
      }
      mixer.connect(g);
      this.toMusic(g, Math.random() * 1.6 - 0.8, 1.6);
      n.start(t0); n.stop(t0 + dur + 0.05);
    },

    // a sonar ping, sometimes answered by a second one
    sonar: function (t0) {
      var c = this.ctx;
      var count = Math.random() < 0.4 ? 2 : 1;
      for (var k = 0; k < count; k++) {
        var t = t0 + k * 1.9;
        var o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = 1150;
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(k ? 0.05 : 0.09, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        o.connect(g);
        this.toMusic(g, (Math.random() - 0.5) * 0.6, 1.6);
        o.start(t); o.stop(t + 0.95);
      }
    },

    // a single drop of water into a dark pool
    drip: function (t0) {
      var c = this.ctx;
      var o = c.createOscillator();
      o.type = 'sine';
      var f = 650 + Math.random() * 300;
      o.frequency.setValueAtTime(f, t0);
      o.frequency.exponentialRampToValueAtTime(f * 2.6, t0 + 0.03);
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
      o.connect(g);
      this.toMusic(g, Math.random() * 1.6 - 0.8, 1.0);
      o.start(t0); o.stop(t0 + 0.08);
    },

    // a faint, wordless woman's hum somewhere far away, sliding between
    // dark notes (komal Re, komal Ga, komal Dha, komal Ni). Returns its length.
    hum: function (t0) {
      var c = this.ctx;
      var scale = [0, 1, 3, 5, 7, 8, 10, 12];
      var base = 293.66;
      var notes = [];
      var idx = 2 + Math.floor(Math.random() * 3);
      var count = 3 + Math.floor(Math.random() * 3);
      var total = 0, k;
      for (k = 0; k < count; k++) {
        idx = Math.max(0, Math.min(scale.length - 1, idx + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2))));
        var d = 1.4 + Math.random() * 1.0;
        notes.push([scale[idx], d]);
        total += d;
      }
      notes.push([0, 2.2]);
      total += 2.2;
      var rate = 100, n = Math.floor(total * rate), curve = new Float32Array(n), pos = 0;
      for (k = 0; k < notes.length; k++) {
        var f0 = base * Math.pow(2, notes[k][0] / 12);
        var f1 = k + 1 < notes.length ? base * Math.pow(2, notes[k + 1][0] / 12) : f0;
        var steps = Math.floor(notes[k][1] * rate);
        for (var j = 0; j < steps && pos < n; j++) {
          var u = j / steps;
          var f = u > 0.7 ? f0 * Math.pow(f1 / f0, (u - 0.7) / 0.3) : f0;
          var vib = Math.min(1, j / 40) * 14 * Math.sin(TWO_PI * 4.8 * pos / rate);
          curve[pos++] = f * Math.pow(2, vib / 1200);
        }
      }
      while (pos < n) { curve[pos] = curve[pos - 1]; pos++; }
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.08, t0 + 1.0);
      g.gain.setValueAtTime(0.08, t0 + total - 1.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + total);
      var f1n = c.createBiquadFilter(); f1n.type = 'bandpass'; f1n.frequency.value = 420; f1n.Q.value = 3;
      var f2n = c.createBiquadFilter(); f2n.type = 'bandpass'; f2n.frequency.value = 880; f2n.Q.value = 5;
      var f2g = c.createGain(); f2g.gain.value = 0.4;
      var types = ['triangle', 'sine'];
      for (k = 0; k < types.length; k++) {
        var o = c.createOscillator();
        o.type = types[k];
        o.frequency.setValueCurveAtTime(curve, t0, total);
        o.connect(f1n); o.connect(f2n);
        o.start(t0); o.stop(t0 + total + 0.05);
      }
      f2n.connect(f2g);
      f1n.connect(g); f2g.connect(g);
      var br = this.noise();
      var bbp = c.createBiquadFilter(); bbp.type = 'bandpass'; bbp.frequency.value = 1500; bbp.Q.value = 0.8;
      var bg = c.createGain(); bg.gain.value = 0.03;
      br.connect(bbp); bbp.connect(bg); bg.connect(g);
      br.start(t0); br.stop(t0 + total + 0.05);
      this.toMusic(g, Math.random() < 0.5 ? -0.75 : 0.75, 1.8);
      return total;
    },

    // a creak of old timber or a ship's hull: stick-slip friction
    // exciting three wooden resonances
    renderCreak: function () {
      var c = this.ctx;
      var sr = c.sampleRate;
      var dur = 1.2 + Math.random() * 0.8;
      var len = Math.floor(sr * dur);
      var buf = c.createBuffer(1, len, sr);
      var d = buf.getChannelData(0);
      var x = new Float32Array(len);
      var t = 0, i;
      while (t < dur) {
        var u = t / dur;
        var rateHz = 14 + 40 * Math.sin(Math.PI * u) + (Math.random() - 0.5) * 8;
        var idx = Math.floor(t * sr);
        if (idx < len) { x[idx] = (0.5 + Math.random() * 0.5) * Math.sin(Math.PI * u); }
        t += 1 / Math.max(6, rateHz);
      }
      var f1 = 170 + Math.random() * 130;
      var res = [[f1, 0.035, 1], [f1 * 2.3, 0.025, 0.6], [f1 * 3.9, 0.018, 0.35]];
      for (var r = 0; r < res.length; r++) {
        var w = TWO_PI * res[r][0] / sr;
        var rr = Math.exp(-1 / (res[r][1] * sr));
        var a1 = 2 * rr * Math.cos(w), a2 = -rr * rr;
        var y1 = 0, y2 = 0;
        for (i = 0; i < len; i++) {
          var y = x[i] + a1 * y1 + a2 * y2;
          y2 = y1; y1 = y;
          d[i] += y * res[r][2];
        }
      }
      var peak = 0;
      for (i = 0; i < len; i++) { peak = Math.max(peak, Math.abs(d[i])); }
      for (i = 0; i < len; i++) { d[i] *= 0.7 / (peak || 1); }
      return buf;
    },

    // a large bronze temple bell, struck once, far away
    renderTempleBell: function () {
      var c = this.ctx;
      var sr = c.sampleRate;
      var len = Math.floor(sr * 7);
      var buf = c.createBuffer(2, len, sr);
      var L = buf.getChannelData(0), Rr = buf.getChannelData(1);
      var f0 = 196;
      var parts = [[0.5, 0.45, 6], [1, 1, 4], [1.19, 0.5, 3], [1.56, 0.4, 2.4], [2.0, 0.3, 1.8], [2.74, 0.2, 1.2], [3.76, 0.12, 0.8]];
      for (var p = 0; p < parts.length; p++) {
        for (var side = 0; side < 2; side++) {
          var f = f0 * parts[p][0] * (side ? 1.002 : 1);
          var w = TWO_PI * f / sr;
          var k = 2 * Math.cos(w);
          var s1 = Math.sin(-w), s2 = Math.sin(-2 * w);
          var ch = side ? Rr : L;
          for (var i = 0; i < len; i++) {
            var s0 = k * s1 - s2;
            s2 = s1; s1 = s0;
            ch[i] += s0 * parts[p][1] * Math.exp(-i / (parts[p][2] * sr)) * Math.min(1, i / 60);
          }
        }
      }
      var peak = 0, n;
      for (n = 0; n < len; n++) { peak = Math.max(peak, Math.abs(L[n]), Math.abs(Rr[n])); }
      for (n = 0; n < len; n++) { L[n] *= 0.8 / (peak || 1); Rr[n] *= 0.8 / (peak || 1); }
      return buf;
    },

    // closeness 0..1: the music ducks and a low pulse rises as she nears,
    // so the two heartbeats stand out.
    setTension: function (t) {
      if (!this.musicBus) { return; }
      var now = this.ctx.currentTime;
      this.musicBus.gain.setTargetAtTime(this.musicLevel * (1 - 0.65 * t), now, 0.5);
      this.tensionGain.gain.setTargetAtTime(0.05 * t * t, now, 0.5);
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

  function ghostPan(g) {
    var span = Math.max(1, state.cols / 2);
    return (g.x - state.player.x) / span;
  }

  function makeGhost(kind, name, r, c, speed, wake) {
    return { kind: kind, name: name, r: r, c: c, x: c, y: r, awake: false, wakeIn: wake, moveAcc: 0, speed: speed, dist: 99, frozen: 0 };
  }

  function nearestGhost() {
    var best = null;
    for (var i = 0; i < state.ghosts.length; i++) {
      var g = state.ghosts[i];
      if (g.awake && (!best || g.dist < best.dist)) { best = g; }
    }
    return best;
  }

  // ================================================================== LEVELS
  function startGame() {
    Sound.init();
    Sound.resume();
    Sound.startDrone();
    state.total = 0;
    Backdrop.dim = 0.45;
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
    state.ghosts = [makeGhost('manjulika', 'Manjulika', data.start[0], data.start[1], data.config.ghost_speed, data.config.wake_delay)];
    if (data.spawn2) {
      state.ghosts.push(makeGhost('anjulika', 'Anjulika', data.spawn2[0], data.spawn2[1], data.config.ghost2_speed, data.config.ghost2_wake_delay));
    }
    state.time = 0;
    state.correct = 0;
    state.heldDir = null;
    state.holdTime = 0;
    state.tapQueue = [];
    state.moveCooldown = 0;
    state.nearArmed = true;
    state.whisperAcc = 0;
    state.particles = [];
    state.paused = false;
    state.question = null;
    state.blocked = data.blocked;
    state.lamps = [];
    state.lampAcc = 0;
    state.lampBurst = 0;
    state.lampHinted = false;
    Backdrop.tint = (THEMES[data.config.theme] || THEMES.sandstone).vig;
    state.decor = makeDecor(data);
    state.staticDirty = true;

    $('hud-level').textContent = data.config.level + ' / ' + data.maxLevel;
    $('hud-name').textContent = data.config.name;
    $('hud-score').textContent = state.total;
    resize();

    showMessage('Level ' + data.config.level + ': ' + data.config.name,
      'This floor is <b>' + data.config.layout + '</b>.<br>' +
      'Manjulika wakes in <b>' + data.config.wake_delay + ' seconds</b> and moves at <b>' +
      data.config.ghost_speed + ' steps per second</b>.<br>You have only <b>' +
      data.config.question_time + ' seconds</b> to answer each riddle. Find the glowing white light.' +
      (data.spawn2 ? '<br><br><span style="color:#5dff9a">Her sister <b>Anjulika</b> also hunts these halls - she is coming from the other side.</span>' : '') +
      (data.config.lamps ? '<br><span style="color:#ffd27a">Golden <b>lamps</b> will appear on your path. Grab one and both sisters freeze for ' + data.config.lamp_freeze + ' second.</span>' : ''),
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

  function caught(reason, who) {
    state.catcher = who || 'manjulika';
    if (!state.running && !state.question) { return; }
    // were BOTH sisters on you at once? (the other one is awake and right beside you)
    var faces = [state.catcher];
    if (state.ghosts.length > 1) {
      var near = bfsFromPlayer();
      for (var gi = 0; gi < state.ghosts.length; gi++) {
        var og = state.ghosts[gi];
        var od = near[og.r * state.cols + og.c];
        if (og.kind !== faces[0] && og.awake && od >= 0 && od <= 2) {
          faces.push(og.kind);
          state.catcher = 'both';
          reason = 'Manjulika and Anjulika reached you together. There was nowhere left to run.';
        }
      }
    }
    state.running = false;
    state.paused = false;
    state.heldDir = null;
    $('modal-question').classList.remove('show');
    $('board-wrap').classList.remove('shake');
    startScare(faces);
    redAlarm(true);
    // a short, low, echoing horror scream as she lunges, and a heavy hit on impact
    setTimeout(function () { Sound.scream(0.65, 1.3, { wet: 1.3, pitch: 0.74 }); }, 250);
    if (faces.length > 1) { setTimeout(function () { Sound.scream(0.5, 1.3, { wet: 1.3, pitch: 0.86 }); }, 370); }
    setTimeout(function () { Sound.boom(0.9); }, 480);
    setTimeout(function () {
      stopScare();
      redAlarm(false);
      api('/api/rank', { total: state.total, cleared: state.level - 1 }).then(function (res) {
        showCaught(reason, res.title);
      }).catch(function () { showCaught(reason, ''); });
    }, 2600);
  }

  function showCaught(reason, title) {
    showMessage((state.catcher === 'both' ? 'Manjulika and Anjulika' : (state.catcher === 'anjulika' ? 'Anjulika' : 'Manjulika')) + ' caught you!', reason +
      '<br><br>Score so far: <b>' + state.total + '</b>' + (title ? '<br>Rank: <b>' + title + '</b>' : ''),
      [{ label: 'Retry level ' + state.level, primary: true, onClick: function () {
          state.total = state.levelStartTotal;
          loadLevel(state.level);
        } },
       { label: 'Main menu', onClick: goHome }]);
  }

  function goHome() {
    state.running = false;
    Backdrop.dim = 0;
    showScreen('screen-title');
  }

  // ================================================================== QUESTIONS
  function openQuestion(de) {
    state.paused = true;
    state.heldDir = null;
    state.tapQueue = [];
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
    if (state.ghosts.length) { Sound.herBeat(0.45, ghostPan(state.ghosts[0])); Sound.ghungroo(0.3, ghostPan(state.ghosts[0])); }
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
    state.moveCooldown = Math.max(state.moveCooldown, 0) + 1 / state.cfg.player_speed;
    afterPlayerMove();
    return true;
  }

  function afterPlayerMove() {
    var p = state.player;
    for (var gi = 0; gi < state.ghosts.length; gi++) {
      var g = state.ghosts[gi];
      if (g.awake && p.r === g.r && p.c === g.c) {
        caught('You ran straight into ' + g.name + '\'s arms.', g.kind);
        return;
      }
    }
    if (p.r === state.data.exit[0] && p.c === state.data.exit[1]) {
      levelComplete();
      return;
    }
    if (state.lamps.length) { pickUpLamp(); }
    var de = state.deadEnds[key(p.r, p.c)];
    if (de && !de.solved) { openQuestion(de); }
  }

  // Breadth-first search from any cell (used to find the route to the exit).
  function bfsFrom(sr, sc) {
    var cols = state.cols;
    var dist = new Int16Array(state.rows * cols);
    for (var i = 0; i < dist.length; i++) { dist[i] = -1; }
    var qr = [sr], qc = [sc], head = 0;
    dist[sr * cols + sc] = 0;
    while (head < qr.length) {
      var r = qr[head], c = qc[head];
      head++;
      var cell = state.grid[r][c];
      for (var b = 1; b <= 8; b *= 2) {
        if (cell & b) { continue; }
        var nr = r + DELTA[b][0], nc = c + DELTA[b][1];
        if (dist[nr * cols + nc] === -1) {
          dist[nr * cols + nc] = dist[r * cols + c] + 1;
          qr.push(nr); qc.push(nc);
        }
      }
    }
    return dist;
  }

  // ---- lamps (level 7 and up): one appears a few steps ahead of you on the
  // way to the exit; grab it and the ghosts are frozen for a moment
  function spawnLamp() {
    var exitMap = bfsFrom(state.data.exit[0], state.data.exit[1]);
    var cols = state.cols;
    var r = state.player.r, c = state.player.c;
    var steps = 3 + Math.floor(Math.random() * 5);
    for (var k = 0; k < steps; k++) {
      var cur = exitMap[r * cols + c], next = null;
      var cell = state.grid[r][c];
      for (var b = 1; b <= 8; b *= 2) {
        if (cell & b) { continue; }
        var nr = r + DELTA[b][0], nc = c + DELTA[b][1];
        if (exitMap[nr * cols + nc] >= 0 && exitMap[nr * cols + nc] < cur) { next = [nr, nc]; }
      }
      if (!next) { break; }
      r = next[0]; c = next[1];
    }
    if (r === state.player.r && c === state.player.c) { return; }
    if (r === state.data.exit[0] && c === state.data.exit[1]) { return; }
    for (var i = 0; i < state.lamps.length; i++) {
      if (state.lamps[i].r === r && state.lamps[i].c === c) { return; }
    }
    state.lamps.push({ r: r, c: c, life: state.cfg.lamp_life, born: state.clock });
    if (!state.lampHinted) {
      state.lampHinted = true;
      whisper('A golden lamp glows ahead... grab it to freeze them!');
    }
  }

  function pickUpLamp() {
    for (var i = 0; i < state.lamps.length; i++) {
      var lp = state.lamps[i];
      if (lp.r === state.player.r && lp.c === state.player.c) {
        state.lamps.splice(i, 1);
        for (var gi = 0; gi < state.ghosts.length; gi++) {
          state.ghosts[gi].frozen = state.cfg.lamp_freeze;
        }
        state.lampBurst = 0.7;
        Sound.chime();
        whisper('The lamp burns bright... they cannot move!');
        return;
      }
    }
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

  function stepGhost(g) {
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
      caught(g.name + '\'s cold hands closed around you in the dark.', g.kind);
      return;
    }
    g.dist = state.distMap[g.r * cols + g.c];
    // Her heartbeat pounds and her ghungroo rings with every step -
    // louder and louder as she gets closer.
    if (g.dist <= 18) {
      var near = Math.pow((18 - g.dist) / 18, 1.6);
      Sound.herBeat(0.05 + near * 1.1, ghostPan(g));
      Sound.ghungroo(0.03 + near * 0.6, ghostPan(g));
    }
  }

  // ================================================================== UPDATE
  function update(dt) {
    var p = state.player, gi, g;
    var lerp = Math.min(1, dt * Math.max(18, state.cfg ? state.cfg.player_speed * 2.6 : 18));
    p.x += (p.c - p.x) * lerp;
    p.y += (p.r - p.y) * lerp;
    for (gi = 0; gi < state.ghosts.length; gi++) {
      g = state.ghosts[gi];
      g.x += (g.c - g.x) * Math.min(1, dt * 10);
      g.y += (g.r - g.y) * Math.min(1, dt * 10);
    }

    for (var i = state.particles.length - 1; i >= 0; i--) {
      var pt = state.particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
      if (pt.life <= 0) { state.particles.splice(i, 1); }
    }
    if (state.decor) {
      for (var oi = 0; oi < state.decor.orbs.length; oi++) {
        var ob = state.decor.orbs[oi];
        ob.x += ob.vx * dt; ob.y += ob.vy * dt;
        if (ob.x < 0.3 || ob.x > state.cols - 0.3) { ob.vx = -ob.vx; }
        if (ob.y < 0.3 || ob.y > state.rows - 0.3) { ob.vy = -ob.vy; }
      }
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

    // Player input:
    //   * every tap is exactly one step (taps faster than you can move wait in a short queue)
    //   * holding a key steps once, pauses briefly, then runs at full speed
    //   * a turn pressed just before a junction is remembered for a moment,
    //     so it happens as soon as the opening arrives
    state.moveCooldown = Math.max(state.moveCooldown - dt, -1);
    if (state.heldDir) { state.holdTime += dt; }
    for (var qi = state.tapQueue.length - 1; qi >= 0; qi--) {
      state.tapQueue[qi].ttl -= dt;
      if (state.tapQueue[qi].ttl <= 0) { state.tapQueue.splice(qi, 1); }
    }
    if (state.moveCooldown <= 0) {
      var moved = false;
      if (state.tapQueue.length) {
        if (tryMove(state.tapQueue[0].dir)) {
          state.tapQueue.shift();
          moved = true;
        }
      }
      if (!moved && state.heldDir && state.holdTime >= HOLD_DELAY) {
        moved = tryMove(state.heldDir);
      }
      if (!moved) { state.moveCooldown = 0; }
      if (!state.running || state.paused) { return; }
    }

    state.distMap = bfsFromPlayer();

    // Manjulika (and, deeper in, her sister Anjulika)
    var anyAwake = false, wakeSoonest = 99;
    for (gi = 0; gi < state.ghosts.length; gi++) {
      g = state.ghosts[gi];
      g.dist = state.distMap[g.r * state.cols + g.c];
      if (!g.awake) {
        g.wakeIn -= dt;
        wakeSoonest = Math.min(wakeSoonest, g.wakeIn);
        if (g.wakeIn <= 0) {
          g.awake = true;
          Sound.boom(0.45);
          redFlash();
          whisper(g.kind === 'anjulika' ? pick(state.data.whispers.sister) : pick(state.data.whispers.awake));
          state.whisperAcc = 0;
        }
      } else {
        anyAwake = true;
        if (g.frozen > 0) {
          // held back by the lamp's light
          g.frozen -= dt;
          continue;
        }
        g.moveAcc += dt;
        var interval = 1 / g.speed;
        while (g.moveAcc >= interval && state.running) {
          g.moveAcc -= interval;
          stepGhost(g);
        }
        if (!state.running) { return; }
      }
    }
    var hunter = nearestGhost();
    state.dist = hunter ? hunter.dist : 99;
    if (!anyAwake) {
      $('hud-ghost').textContent = 'Wakes in ' + Math.max(0, wakeSoonest).toFixed(1) + 's';
      $('hud-ghost').classList.remove('awake');
    } else {
      var both = state.ghosts.length > 1 && state.ghosts[1].awake && state.ghosts[0].awake;
      $('hud-ghost').textContent = state.dist <= 4 ? (hunter.name.toUpperCase() + ' IS RIGHT BEHIND YOU') : (both ? 'BOTH SISTERS HUNTING' : 'AWAKE - hunting');
      $('hud-ghost').classList.add('awake');
    }
    g = hunter || state.ghosts[0];

    // Heartbeat: faster and louder as she closes in (about 60 -> 180 bpm)
    var d = hunter ? Math.max(1, state.dist) : 30;
    var closeness = hunter ? Math.max(0, Math.min(1, (20 - d) / 19)) : 0;
    var bpm = 58 + closeness * 132;
    state.heartAcc += dt;
    if (state.heartAcc >= 60 / bpm) {
      state.heartAcc = 0;
      Sound.heartbeat(0.12 + Math.pow(closeness, 1.3) * 0.88, 0.27 - closeness * 0.12);
    }
    Sound.setTension(closeness);

    // Shriek when she is too near
    if (hunter && state.dist <= 2 && state.nearArmed) {
      state.nearArmed = false;
      Sound.scream(0.55, 1.6, { wet: 0.9 });
      whisper(pick(state.data.whispers.near));
    }
    if (state.dist >= 5) { state.nearArmed = true; }
    $('board-wrap').classList.toggle('shake', !!hunter && state.dist <= 3);

    // lamps: a new one every few seconds; old ones burn out
    if (state.cfg.lamps) {
      state.lampAcc += dt;
      if (state.lampAcc >= state.cfg.lamp_every && state.lamps.length < 2) {
        state.lampAcc = 0;
        spawnLamp();
      }
      for (var li = state.lamps.length - 1; li >= 0; li--) {
        state.lamps[li].life -= dt;
        if (state.lamps[li].life <= 0) { state.lamps.splice(li, 1); }
      }
    }
    if (state.lampBurst > 0) { state.lampBurst -= dt; }

    // a red flash now and then, and more often when she is close
    state.redAcc = (state.redAcc || 0) + dt;
    if (!state.nextRed) { state.nextRed = 10 + Math.random() * 12; }
    if (state.redAcc >= state.nextRed) {
      state.redAcc = 0;
      state.nextRed = (hunter && state.dist <= 6 ? 4 : 12) + Math.random() * 12;
      redFlash();
    }

    // Random whispers
    state.whisperAcc += dt;
    if (state.whisperAcc > 10) {
      state.whisperAcc = Math.random() * 3;
      whisper(pick(hunter ? state.data.whispers.awake : state.data.whispers.sleeping));
    }

    $('hud-time').textContent = state.time.toFixed(1);
  }

  // ================================================================== RENDER
  function resize() {
    if (!state.rows) { return; }
    var wrap = $('board-wrap');
    var aw = Math.min(wrap.clientWidth - 28, 1500);
    var ah = wrap.clientHeight - 28;
    var cell = Math.max(8, Math.floor(Math.min(aw / (state.cols + 0.9), ah / (state.rows + 0.9))));
    var m = Math.round(cell * 0.45);
    state.cell = cell;
    state.margin = m;
    state.pw = cell * state.cols + 2 * m;
    state.ph = cell * state.rows + 2 * m;
    // render at least at 2x (up to 3x) for crisp, high-resolution graphics
    state.dpr = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1));
    var w = Math.round(state.pw * state.dpr), h = Math.round(state.ph * state.dpr);
    canvas.width = w; canvas.height = h;
    canvas.style.width = state.pw + 'px';
    canvas.style.height = state.ph + 'px';
    staticLayer.width = w; staticLayer.height = h;
    fogLayer.width = w; fogLayer.height = h;
    placeBoardFx();
    state.staticDirty = true;
  }

  // ================================================================== MAZE STYLE
  // Seeded random numbers, so a level's decorations stay put on resize.
  function seededRandom(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function isBlocked(r, c) {
    if (r < 0 || c < 0 || r >= state.rows || c >= state.cols) { return true; }
    return state.blocked[r].charAt(c) === '#';
  }

  // Every wall around the open cells, each one listed once.
  // Horizontal walls lie on the top edge of cell (r, c), vertical ones on its left edge.
  function wallSegments() {
    var segs = [];
    for (var r = 0; r < state.rows; r++) {
      for (var c = 0; c < state.cols; c++) {
        if (isBlocked(r, c)) { continue; }
        var cell = state.grid[r][c];
        if (cell & N) { segs.push({ h: true, r: r, c: c }); }
        if (cell & W) { segs.push({ h: false, r: r, c: c }); }
        if ((cell & S) && isBlocked(r + 1, c)) { segs.push({ h: true, r: r + 1, c: c }); }
        if ((cell & E) && isBlocked(r, c + 1)) { segs.push({ h: false, r: r, c: c + 1 }); }
      }
    }
    return segs;
  }

  function cellWall(r, c, bit) {
    if (bit === N) { return { h: true, r: r, c: c }; }
    if (bit === S) { return { h: true, r: r + 1, c: c }; }
    if (bit === W) { return { h: false, r: r, c: c }; }
    return { h: false, r: r, c: c + 1 };
  }

  // Decide once per level where the bones, cobwebs and floating lights go.
  function makeDecor(data) {
    var R = seededRandom(data.seed);
    var decor = { bones: [], webs: [], orbs: [], skulls: [], blood: [], candles: [], skeletons: [], corpses: [] };
    var openCount = 0;
    for (var r = 0; r < state.rows; r++) {
      for (var c = 0; c < state.cols; c++) {
        if (isBlocked(r, c)) { continue; }
        openCount++;
        var cell = data.grid[r][c];
        var isDead = false;
        for (var di = 0; di < data.deadEnds.length; di++) {
          if (data.deadEnds[di].r === r && data.deadEnds[di].c === c) { isDead = true; }
        }
        var isEnd = (r === data.start[0] && c === data.start[1]) || (r === data.exit[0] && c === data.exit[1]);
        if (!isDead && !isEnd) {
          // corridors running left-right get props lying left-right, and vice versa
          var flat = !(cell & E) || !(cell & W) ? 0 : Math.PI / 2;
          var roll = R();
          if (roll < 0.07) {
            decor.bones.push({ x: c + 0.2 + R() * 0.6, y: r + 0.2 + R() * 0.6, a: R() * Math.PI, s: 0.32 + R() * 0.12 });
          } else if (roll < 0.12) {
            decor.skulls.push({ x: c + 0.3 + R() * 0.4, y: r + 0.3 + R() * 0.4, a: (R() - 0.5) * 0.8, s: 0.3 + R() * 0.08 });
          } else if (roll < 0.16) {
            decor.blood.push({ x: c + 0.5, y: r + 0.5, r: 0.22 + R() * 0.12, seed: Math.floor(R() * 1e6) });
          } else if (roll < 0.185) {
            decor.candles.push({ x: c + 0.25 + R() * 0.5, y: r + 0.25 + R() * 0.5, n: 2 + Math.floor(R() * 2), phase: R() * 10 });
          } else if (roll < 0.205) {
            decor.skeletons.push({ x: c + 0.5, y: r + 0.5, a: flat + (R() < 0.5 ? 0 : Math.PI), s: 0.8 });
          } else if (roll < 0.22) {
            decor.corpses.push({ x: c + 0.5, y: r + 0.5, a: flat + (R() < 0.5 ? 0 : Math.PI), s: 0.82, seed: Math.floor(R() * 1e6) });
          }
        }
        if ((cell & N) && (cell & W) && R() < 0.3) { decor.webs.push([r, c, 0]); }
        else if ((cell & N) && (cell & E) && R() < 0.2) { decor.webs.push([r, c, 1]); }
      }
    }
    var orbCount = 4 + Math.floor(openCount / 70);
    for (var k = 0; k < orbCount; k++) {
      var ang = R() * Math.PI * 2;
      decor.orbs.push({
        x: 0.5 + R() * (state.cols - 1), y: 0.5 + R() * (state.rows - 1),
        vx: Math.cos(ang) * (0.08 + R() * 0.12), vy: Math.sin(ang) * (0.08 + R() * 0.12),
        r: 0.9 + R() * 0.8, phase: R() * 10
      });
    }
    return decor;
  }

  // ---- colour themes: the stone changes colour from level to level
  var THEMES = {
    sandstone: { floor: [52, 36, 30], floor2: [38, 26, 22], line: [175, 115, 85], wallDark: '#3c2119', wall: '#9b6555', wallLight: '#d29d88', rib: [55, 28, 20], orb: [255, 165, 70], vig: [130, 12, 16], sigil: [160, 22, 32], stone: '#120a08' },
    jade:      { floor: [30, 44, 38], floor2: [20, 32, 27], line: [110, 170, 140], wallDark: '#14281f', wall: '#4f8a6c', wallLight: '#9fd0b2', rib: [15, 40, 28], orb: [170, 255, 150], vig: [10, 70, 40], sigil: [200, 35, 45], stone: '#08110d' },
    lapis:     { floor: [28, 34, 58], floor2: [18, 22, 42], line: [110, 140, 210], wallDark: '#141a33', wall: '#4d64a3', wallLight: '#a3b6ee', rib: [15, 20, 45], orb: [120, 190, 255], vig: [20, 30, 110], sigil: [215, 45, 65], stone: '#080a16' },
    ash:       { floor: [44, 42, 40], floor2: [30, 29, 28], line: [170, 165, 155], wallDark: '#232120', wall: '#8f8a82', wallLight: '#d8d3c8', rib: [30, 28, 26], orb: [240, 230, 210], vig: [70, 70, 70], sigil: [180, 25, 30], stone: '#0d0c0c' },
    amethyst:  { floor: [44, 30, 54], floor2: [30, 20, 38], line: [170, 130, 210], wallDark: '#25163a', wall: '#7f5aa6', wallLight: '#c6a8ec', rib: [30, 15, 45], orb: [210, 140, 255], vig: [80, 20, 110], sigil: [230, 45, 85], stone: '#0e0814' },
    ember:     { floor: [50, 24, 16], floor2: [34, 14, 10], line: [230, 120, 60], wallDark: '#3a1208', wall: '#b5532e', wallLight: '#f2a173', rib: [50, 15, 5], orb: [255, 120, 40], vig: [160, 40, 10], sigil: [240, 190, 60], stone: '#110604' },
    abyss:     { floor: [18, 40, 44], floor2: [10, 26, 30], line: [90, 180, 180], wallDark: '#0c2427', wall: '#3f8f92', wallLight: '#9fe2e0', rib: [8, 30, 32], orb: [110, 240, 230], vig: [10, 70, 80], sigil: [235, 55, 75], stone: '#050f11' },
    gilded:    { floor: [40, 34, 22], floor2: [26, 22, 14], line: [210, 175, 90], wallDark: '#2e2410', wall: '#a8873e', wallLight: '#f0d58e', rib: [40, 30, 10], orb: [255, 215, 120], vig: [110, 80, 10], sigil: [195, 30, 40], stone: '#0f0c06' },
    blood:     { floor: [30, 10, 12], floor2: [18, 6, 8], line: [170, 50, 60], wallDark: '#2a0609', wall: '#7c1f27', wallLight: '#c8606a', rib: [30, 4, 6], orb: [255, 70, 70], vig: [170, 0, 10], sigil: [235, 220, 200], stone: '#0a0203' },
    frost:     { floor: [34, 42, 50], floor2: [22, 28, 34], line: [160, 200, 225], wallDark: '#1b2630', wall: '#7f9db2', wallLight: '#d6ecf8', rib: [20, 30, 40], orb: [200, 235, 255], vig: [40, 80, 120], sigil: [215, 40, 60], stone: '#0a0e12' }
  };

  function theme() { return THEMES[(state.cfg && state.cfg.theme) || 'sandstone'] || THEMES.sandstone; }
  function tc(rgb, a) { return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'; }

  // ---- floor: dark stone tiles, each with a faint carved diamond
  function paintFloor(c, cs, R) {
    var th = theme();
    c.fillStyle = th.stone;
    c.fillRect(-state.margin, -state.margin, state.pw, state.ph);
    for (var r = 0; r < state.rows; r++) {
      for (var col = 0; col < state.cols; col++) {
        var x = col * cs, y = r * cs;
        if (isBlocked(r, col)) {
          // solid stone outside the haveli's floor
          c.fillStyle = th.stone;
          c.fillRect(x, y, cs, cs);
          continue;
        }
        var g = c.createLinearGradient(x, y, x + cs, y + cs);
        var tone = R() * 8;
        g.addColorStop(0, 'rgb(' + Math.round(th.floor[0] + tone) + ',' + Math.round(th.floor[1] + tone) + ',' + Math.round(th.floor[2] + tone) + ')');
        g.addColorStop(1, 'rgb(' + th.floor2[0] + ',' + th.floor2[1] + ',' + th.floor2[2] + ')');
        c.fillStyle = g;
        c.fillRect(x, y, cs, cs);
        // carved diamond
        c.strokeStyle = tc(th.line, 0.16);
        c.lineWidth = Math.max(0.6, cs * 0.02);
        c.beginPath();
        c.moveTo(x + cs / 2, y + cs * 0.12);
        c.lineTo(x + cs * 0.88, y + cs / 2);
        c.lineTo(x + cs / 2, y + cs * 0.88);
        c.lineTo(x + cs * 0.12, y + cs / 2);
        c.closePath();
        c.stroke();
        c.strokeStyle = tc(th.line, 0.09);
        c.beginPath();
        c.moveTo(x + cs / 2, y + cs * 0.3);
        c.lineTo(x + cs * 0.7, y + cs / 2);
        c.lineTo(x + cs / 2, y + cs * 0.7);
        c.lineTo(x + cs * 0.3, y + cs / 2);
        c.closePath();
        c.stroke();
        // grit
        for (var gr = 0; gr < 6; gr++) {
          c.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.25)' : tc(th.line, 0.06);
          c.fillRect(x + R() * cs, y + R() * cs, Math.max(0.8, cs * 0.025), Math.max(0.8, cs * 0.025));
        }
        // grout
        c.strokeStyle = 'rgba(8,4,3,0.7)';
        c.lineWidth = Math.max(0.6, cs * 0.022);
        c.strokeRect(x, y, cs, cs);
      }
    }
  }

  // ---- thin, rounded, ribbed stone walls
  function wallPath(c, segs, cs, ox, oy) {
    c.beginPath();
    for (var k = 0; k < segs.length; k++) {
      var sg = segs[k];
      var x0 = sg.c * cs + ox, y0 = sg.r * cs + oy;
      c.moveTo(x0, y0);
      if (sg.h) { c.lineTo(x0 + cs, y0); } else { c.lineTo(x0, y0 + cs); }
    }
  }

  function paintWalls(c, segs, cs, t) {
    var th = theme();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = 'rgba(0,0,0,0.6)';
    c.lineWidth = t * 1.7;
    wallPath(c, segs, cs, t * 0.3, t * 0.45);
    c.stroke();
    c.strokeStyle = th.wallDark;
    c.lineWidth = t * 1.2;
    wallPath(c, segs, cs, 0, 0);
    c.stroke();
    c.strokeStyle = th.wall;
    c.lineWidth = t;
    wallPath(c, segs, cs, 0, 0);
    c.stroke();
    c.strokeStyle = th.wallLight;
    c.lineWidth = t * 0.32;
    wallPath(c, segs, cs, -t * 0.16, -t * 0.18);
    c.stroke();
    // ribs across the stone
    c.strokeStyle = tc(th.rib, 0.5);
    c.lineWidth = Math.max(0.6, t * 0.13);
    c.lineCap = 'butt';
    var step = cs / 5;
    c.beginPath();
    for (var k = 0; k < segs.length; k++) {
      var sg = segs[k];
      for (var q = 1; q < 5; q++) {
        if (sg.h) {
          var hx = sg.c * cs + q * step, hy = sg.r * cs;
          c.moveTo(hx, hy - t * 0.45); c.lineTo(hx, hy + t * 0.45);
        } else {
          var vx = sg.c * cs, vy = sg.r * cs + q * step;
          c.moveTo(vx - t * 0.45, vy); c.lineTo(vx + t * 0.45, vy);
        }
      }
    }
    c.stroke();
  }

  // ---- red circle-and-triangle sigil marking a riddle dead end
  function paintSigil(c, x, y, cs) {
    var r = cs * 0.3;
    var sg = theme().sigil;
    var glow = c.createRadialGradient(x, y, 0, x, y, r * 1.6);
    glow.addColorStop(0, tc(sg, 0.25));
    glow.addColorStop(1, tc(sg, 0));
    c.fillStyle = glow;
    c.beginPath(); c.arc(x, y, r * 1.6, 0, TWO_PI); c.fill();
    c.strokeStyle = tc(sg, 0.85);
    c.lineWidth = Math.max(0.8, cs * 0.03);
    c.beginPath(); c.arc(x, y, r, 0, TWO_PI); c.stroke();
    c.lineWidth = Math.max(0.6, cs * 0.015);
    c.beginPath(); c.arc(x, y, r * 1.12, 0, TWO_PI); c.stroke();
    c.lineWidth = Math.max(0.8, cs * 0.028);
    c.beginPath();
    for (var k = 0; k < 3; k++) {
      var a = -Math.PI / 2 + k * TWO_PI / 3;
      if (k === 0) { c.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78); }
      else { c.lineTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78); }
    }
    c.closePath();
    c.stroke();
  }

  function paintBone(c, b, cs) {
    var len = b.s * cs;
    c.save();
    c.translate(b.x * cs, b.y * cs);
    c.rotate(b.a);
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fillRect(-len / 2 + len * 0.05, len * 0.05, len, len * 0.14);
    c.globalAlpha = 0.6;
    c.strokeStyle = '#b8ad9a';
    c.lineCap = 'round';
    c.lineWidth = len * 0.13;
    c.beginPath(); c.moveTo(-len * 0.38, 0); c.lineTo(len * 0.38, 0); c.stroke();
    c.fillStyle = '#c4baa8';
    var ends = [-1, 1];
    for (var e = 0; e < 2; e++) {
      c.beginPath(); c.arc(ends[e] * len * 0.42, -len * 0.08, len * 0.1, 0, TWO_PI); c.fill();
      c.beginPath(); c.arc(ends[e] * len * 0.42, len * 0.08, len * 0.1, 0, TWO_PI); c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = len * 0.04;
    c.beginPath(); c.moveTo(-len * 0.3, -len * 0.03); c.lineTo(len * 0.3, -len * 0.03); c.stroke();
    c.restore();
  }

  function paintCobweb(c, x, y, cs, flip) {
    var dx = flip ? -1 : 1;
    var len = cs * 0.45;
    c.strokeStyle = 'rgba(225,225,225,0.3)';
    c.lineWidth = Math.max(0.4, cs * 0.009);
    for (var k = 0; k <= 4; k++) {
      var a = (k / 4) * Math.PI / 2;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + dx * Math.cos(a) * len, y + Math.sin(a) * len);
      c.stroke();
    }
    for (var ring = 1; ring <= 3; ring++) {
      var rl = len * ring / 3.4;
      c.beginPath();
      for (var j = 0; j <= 4; j++) {
        var a2 = (j / 4) * Math.PI / 2;
        var px2 = x + dx * Math.cos(a2) * rl, py2 = y + Math.sin(a2) * rl;
        if (j === 0) { c.moveTo(px2, py2); }
        else {
          var am = ((j - 0.5) / 4) * Math.PI / 2;
          c.quadraticCurveTo(x + dx * Math.cos(am) * rl * 0.8, y + Math.sin(am) * rl * 0.8, px2, py2);
        }
      }
      c.stroke();
    }
  }

  // the exit: a glowing gap in the outer wall
  function exitPoint(cs) {
    var w = cellWall(state.data.exit[0], state.data.exit[1], state.data.exitWall);
    if (w.h) { return { x: (w.c + 0.5) * cs, y: w.r * cs, h: true }; }
    return { x: w.c * cs, y: (w.r + 0.5) * cs, h: false };
  }

  function paintExit(c, cs, t) {
    var e = exitPoint(cs);
    c.save();
    c.translate(e.x, e.y);
    if (!e.h) { c.rotate(Math.PI / 2); }
    var len = cs * 0.72;
    c.lineCap = 'round';
    c.strokeStyle = '#0b0605';
    c.lineWidth = t * 1.8;
    c.beginPath(); c.moveTo(-len / 2, 0); c.lineTo(len / 2, 0); c.stroke();
    var g = c.createLinearGradient(-len / 2, 0, len / 2, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.6)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0.6)');
    c.strokeStyle = g;
    c.lineWidth = t * 1.1;
    c.beginPath(); c.moveTo(-len / 2, 0); c.lineTo(len / 2, 0); c.stroke();
    c.fillStyle = '#c9a14a';
    c.beginPath(); c.arc(-len / 2 - t * 0.6, 0, t * 0.75, 0, TWO_PI); c.fill();
    c.beginPath(); c.arc(len / 2 + t * 0.6, 0, t * 0.75, 0, TWO_PI); c.fill();
    c.restore();
  }

  // ---- the dead of the haveli: skulls, skeletons, shrouded corpses, blood, candles
  var PROP_INK = 'rgba(15,6,6,0.9)';

  function paintSkull(c, k, cs) {
    var s = k.s * cs;
    c.save();
    c.translate(k.x * cs, k.y * cs);
    c.rotate(k.a);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.beginPath(); c.ellipse(s * 0.08, s * 0.12, s * 0.5, s * 0.42, 0, 0, TWO_PI); c.fill();
    var g = c.createRadialGradient(-s * 0.12, -s * 0.18, s * 0.05, 0, 0, s * 0.55);
    g.addColorStop(0, '#efe6d2');
    g.addColorStop(1, '#a89b84');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, -s * 0.05, s * 0.42, Math.PI * 0.85, Math.PI * 2.15);
    c.lineTo(s * 0.26, s * 0.3);
    c.lineTo(-s * 0.26, s * 0.3);
    c.closePath();
    c.fill();
    c.strokeStyle = PROP_INK; c.lineWidth = Math.max(0.6, s * 0.05); c.stroke();
    c.fillStyle = '#120606';
    c.beginPath(); c.ellipse(-s * 0.16, -s * 0.02, s * 0.12, s * 0.14, 0.2, 0, TWO_PI); c.fill();
    c.beginPath(); c.ellipse(s * 0.16, -s * 0.02, s * 0.12, s * 0.14, -0.2, 0, TWO_PI); c.fill();
    c.beginPath(); c.moveTo(0, s * 0.1); c.lineTo(-s * 0.05, s * 0.2); c.lineTo(s * 0.05, s * 0.2); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(20,8,8,0.8)'; c.lineWidth = Math.max(0.5, s * 0.03);
    for (var t = -2; t <= 2; t++) { c.beginPath(); c.moveTo(t * s * 0.08, s * 0.24); c.lineTo(t * s * 0.08, s * 0.32); c.stroke(); }
    c.restore();
  }

  function paintSkeleton(c, k, cs) {
    var s = k.s * cs;
    c.save();
    c.translate(k.x * cs, k.y * cs);
    c.rotate(k.a);
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(0,0,0,0.4)';
    c.lineWidth = s * 0.14;
    c.beginPath(); c.moveTo(-s * 0.4, s * 0.04); c.lineTo(s * 0.45, s * 0.04); c.stroke();
    var bone = '#d8cfbc';
    function b(x1, y1, x2, y2, w) {
      c.strokeStyle = PROP_INK; c.lineWidth = w + Math.max(0.8, s * 0.02);
      c.beginPath(); c.moveTo(x1 * s, y1 * s); c.lineTo(x2 * s, y2 * s); c.stroke();
      c.strokeStyle = bone; c.lineWidth = w;
      c.beginPath(); c.moveTo(x1 * s, y1 * s); c.lineTo(x2 * s, y2 * s); c.stroke();
    }
    var w = Math.max(1, s * 0.045);
    b(-0.25, 0, 0.18, 0, w * 1.2);                    // spine
    for (var r = 0; r < 4; r++) {                     // ribs
      var rx = -0.18 + r * 0.07;
      c.strokeStyle = bone; c.lineWidth = w * 0.8;
      c.beginPath(); c.moveTo(rx * s, 0); c.quadraticCurveTo((rx + 0.03) * s, -0.16 * s, (rx + 0.08) * s, -0.13 * s); c.stroke();
      c.beginPath(); c.moveTo(rx * s, 0); c.quadraticCurveTo((rx + 0.03) * s, 0.16 * s, (rx + 0.08) * s, 0.13 * s); c.stroke();
    }
    b(-0.2, -0.05, -0.02, -0.2, w); b(-0.02, -0.2, 0.14, -0.32, w);   // arms flung out
    b(-0.2, 0.05, -0.05, 0.22, w); b(-0.05, 0.22, 0.05, 0.28, w);
    c.fillStyle = bone;                                               // pelvis
    c.beginPath(); c.ellipse(0.2 * s, 0, 0.06 * s, 0.1 * s, 0, 0, TWO_PI); c.fill();
    c.strokeStyle = PROP_INK; c.lineWidth = Math.max(0.6, s * 0.02); c.stroke();
    b(0.24, -0.05, 0.4, -0.1, w); b(0.4, -0.1, 0.5, -0.06, w);        // legs
    b(0.24, 0.05, 0.38, 0.12, w); b(0.38, 0.12, 0.5, 0.1, w);
    c.restore();
    paintSkull(c, { x: k.x + Math.cos(k.a) * -0.32 * k.s, y: k.y + Math.sin(k.a) * -0.32 * k.s, a: k.a - Math.PI / 2, s: k.s * 0.32 }, cs);
  }

  function paintCorpse(c, k, cs) {
    var s = k.s * cs;
    var R = seededRandom(k.seed);
    c.save();
    c.translate(k.x * cs, k.y * cs);
    c.rotate(k.a);
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.beginPath(); c.ellipse(s * 0.04, s * 0.06, s * 0.48, s * 0.2, 0, 0, TWO_PI); c.fill();
    // grey feet poking out of the shroud
    c.fillStyle = '#8f9690';
    c.beginPath(); c.ellipse(s * 0.45, -s * 0.06, s * 0.05, s * 0.035, 0.3, 0, TWO_PI); c.fill();
    c.beginPath(); c.ellipse(s * 0.45, s * 0.06, s * 0.05, s * 0.035, -0.3, 0, TWO_PI); c.fill();
    // the white shroud, tied at the head and feet
    var g = c.createLinearGradient(0, -s * 0.18, 0, s * 0.18);
    g.addColorStop(0, '#e6e0d3');
    g.addColorStop(1, '#9d968a');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-s * 0.46, 0);
    c.quadraticCurveTo(-s * 0.46, -s * 0.15, -s * 0.3, -s * 0.15);
    c.quadraticCurveTo(-s * 0.15, -s * 0.11, 0, -s * 0.17);
    c.quadraticCurveTo(s * 0.25, -s * 0.15, s * 0.42, -s * 0.08);
    c.lineTo(s * 0.42, s * 0.08);
    c.quadraticCurveTo(s * 0.25, s * 0.15, 0, s * 0.17);
    c.quadraticCurveTo(-s * 0.15, s * 0.11, -s * 0.3, s * 0.15);
    c.quadraticCurveTo(-s * 0.46, s * 0.15, -s * 0.46, 0);
    c.closePath();
    c.fill();
    c.strokeStyle = PROP_INK; c.lineWidth = Math.max(0.6, s * 0.02); c.stroke();
    c.strokeStyle = 'rgba(80,70,60,0.5)'; c.lineWidth = Math.max(0.5, s * 0.012);
    for (var f = 0; f < 4; f++) {
      var fx = -s * 0.15 + f * s * 0.13;
      c.beginPath(); c.moveTo(fx, -s * 0.15); c.quadraticCurveTo(fx + s * 0.03, 0, fx, s * 0.15); c.stroke();
    }
    c.strokeStyle = '#6b5a44'; c.lineWidth = Math.max(0.8, s * 0.025);
    c.beginPath(); c.moveTo(-s * 0.32, -s * 0.15); c.lineTo(-s * 0.32, s * 0.15); c.stroke();
    c.beginPath(); c.moveTo(s * 0.36, -s * 0.1); c.lineTo(s * 0.36, s * 0.1); c.stroke();
    // blood seeping through the cloth
    c.fillStyle = 'rgba(120,0,15,0.75)';
    c.beginPath();
    var bx = s * (0.0 + R() * 0.1), by = s * (R() - 0.5) * 0.08;
    for (var p = 0; p < 9; p++) {
      var a = p / 9 * TWO_PI, rr = s * (0.05 + R() * 0.05);
      if (p === 0) { c.moveTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr); } else { c.lineTo(bx + Math.cos(a) * rr, by + Math.sin(a) * rr); }
    }
    c.closePath(); c.fill();
    c.restore();
  }

  function paintBloodPool(c, k, cs) {
    var R = seededRandom(k.seed);
    var x = k.x * cs, y = k.y * cs, r = k.r * cs;
    c.fillStyle = 'rgba(80,0,10,0.85)';
    c.beginPath();
    for (var p = 0; p < 14; p++) {
      var a = p / 14 * TWO_PI, rr = r * (0.65 + R() * 0.45);
      if (p === 0) { c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75); }
      else { c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75); }
    }
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(160,20,30,0.35)';
    c.beginPath(); c.ellipse(x - r * 0.2, y - r * 0.15, r * 0.35, r * 0.15, -0.3, 0, TWO_PI); c.fill();
    c.fillStyle = 'rgba(80,0,10,0.8)';
    for (var d = 0; d < 6; d++) {
      var da = R() * TWO_PI, dd = r * (1.1 + R() * 0.6);
      c.beginPath(); c.arc(x + Math.cos(da) * dd, y + Math.sin(da) * dd * 0.75, r * (0.04 + R() * 0.07), 0, TWO_PI); c.fill();
    }
  }

  function paintCandles(c, k, cs) {
    var R = seededRandom(Math.floor(k.phase * 1000));
    for (var i = 0; i < k.n; i++) {
      var x = (k.x + (i - (k.n - 1) / 2) * 0.13) * cs, y = (k.y + (i % 2) * 0.06) * cs;
      var h = cs * (0.14 + R() * 0.1), w = cs * 0.06;
      c.fillStyle = 'rgba(0,0,0,0.4)';
      c.beginPath(); c.ellipse(x + w * 0.4, y + w * 0.3, w * 0.8, w * 0.35, 0, 0, TWO_PI); c.fill();
      c.fillStyle = '#d9cfae';
      c.fillRect(x - w / 2, y - h, w, h);
      c.fillStyle = '#efe6c8';
      c.fillRect(x - w / 2, y - h, w * 0.35, h);
      c.beginPath(); c.ellipse(x, y - h, w / 2, w * 0.2, 0, 0, TWO_PI); c.fill();
      c.fillStyle = '#e8ddb8';
      c.beginPath(); c.ellipse(x + w * 0.3, y - h * 0.6, w * 0.12, h * 0.2, 0, 0, TWO_PI); c.fill();
      c.strokeStyle = PROP_INK; c.lineWidth = Math.max(0.5, w * 0.12);
      c.strokeRect(x - w / 2, y - h, w, h);
    }
  }

  // candle flames flicker live and glow through the darkness
  function drawCandleFlames(c, cs, t) {
    var list = state.decor.candles;
    for (var k = 0; k < list.length; k++) {
      var cd = list[k];
      var R = seededRandom(Math.floor(cd.phase * 1000));
      var glow = c.createRadialGradient(cd.x * cs, (cd.y - 0.2) * cs, 0, cd.x * cs, (cd.y - 0.2) * cs, cs * 0.7);
      glow.addColorStop(0, 'rgba(255,170,70,' + (0.22 + 0.05 * Math.sin(t * 9 + cd.phase)) + ')');
      glow.addColorStop(1, 'rgba(255,170,70,0)');
      c.fillStyle = glow;
      c.beginPath(); c.arc(cd.x * cs, (cd.y - 0.2) * cs, cs * 0.7, 0, TWO_PI); c.fill();
      for (var i = 0; i < cd.n; i++) {
        var x = (cd.x + (i - (cd.n - 1) / 2) * 0.13) * cs, y = (cd.y + (i % 2) * 0.06) * cs;
        var h = cs * (0.14 + R() * 0.1);
        var fl = 1 + 0.18 * Math.sin(t * 13 + cd.phase + i * 2);
        var fx = x + Math.sin(t * 5 + i) * cs * 0.008;
        c.fillStyle = 'rgba(255,150,40,0.95)';
        c.beginPath(); c.ellipse(fx, y - h - cs * 0.035 * fl, cs * 0.022, cs * 0.045 * fl, 0, 0, TWO_PI); c.fill();
        c.fillStyle = 'rgba(255,245,200,0.95)';
        c.beginPath(); c.ellipse(fx, y - h - cs * 0.025, cs * 0.01, cs * 0.022 * fl, 0, 0, TWO_PI); c.fill();
      }
    }
  }

  function buildStatic() {
    var c = staticLayer.getContext('2d');
    var cs = state.cell;
    var t = Math.max(3, cs * 0.12);
    var R = seededRandom(state.data.seed + 7);
    var k;
    var m = state.margin;
    c.setTransform(state.dpr, 0, 0, state.dpr, m * state.dpr, m * state.dpr);
    c.clearRect(-m, -m, state.pw, state.ph);

    paintFloor(c, cs, R);
    for (var dk in state.deadEnds) {
      if (state.deadEnds.hasOwnProperty(dk) && !state.deadEnds[dk].solved) {
        paintSigil(c, (state.deadEnds[dk].c + 0.5) * cs, (state.deadEnds[dk].r + 0.5) * cs, cs);
      }
    }
    for (k = 0; k < state.decor.blood.length; k++) { paintBloodPool(c, state.decor.blood[k], cs); }
    for (k = 0; k < state.decor.bones.length; k++) { paintBone(c, state.decor.bones[k], cs); }
    for (k = 0; k < state.decor.corpses.length; k++) { paintCorpse(c, state.decor.corpses[k], cs); }
    for (k = 0; k < state.decor.skeletons.length; k++) { paintSkeleton(c, state.decor.skeletons[k], cs); }
    for (k = 0; k < state.decor.skulls.length; k++) { paintSkull(c, state.decor.skulls[k], cs); }
    for (k = 0; k < state.decor.candles.length; k++) { paintCandles(c, state.decor.candles[k], cs); }
    for (k = 0; k < state.decor.webs.length; k++) {
      var wb = state.decor.webs[k];
      paintCobweb(c, (wb[1] + wb[2]) * cs + (wb[2] ? -t * 0.6 : t * 0.6), wb[0] * cs + t * 0.6, cs, wb[2] === 1);
    }
    paintWalls(c, wallSegments(), cs, t);
    paintExit(c, cs, t);
    state.staticDirty = false;
  }

  // keep the grain + vignette overlay exactly on top of the canvas, tinted for this level
  function placeBoardFx() {
    var fx = $('board-fx');
    if (!fx) { return; }
    fx.style.left = canvas.offsetLeft + 'px';
    fx.style.top = canvas.offsetTop + 'px';
    fx.style.width = canvas.offsetWidth + 'px';
    fx.style.height = canvas.offsetHeight + 'px';
    var v = theme().vig;
    fx.style.setProperty('--vig', v[0] + ',' + v[1] + ',' + v[2]);
    if (!fx.getAttribute('data-grain')) {
      fx.style.setProperty('--grain', 'url(' + grain.toDataURL() + ')');
      fx.setAttribute('data-grain', '1');
    }
  }

  // red edges like the corners of your eyes going dark
  function buildVignette() {
    var c = vignetteLayer.getContext('2d');
    var w = state.pw, h = state.ph;
    c.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    var g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    var vg2 = theme().vig;
    g.addColorStop(0.6, tc([Math.round(vg2[0] * 0.55), Math.round(vg2[1] * 0.55), Math.round(vg2[2] * 0.55)], 0.25));
    g.addColorStop(1, tc(vg2, 0.6));
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }

  // film grain, made once and moved around every frame
  var grain = (function () {
    var cv = document.createElement('canvas');
    cv.width = 160; cv.height = 160;
    var c = cv.getContext('2d');
    var img = c.createImageData(160, 160);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = Math.floor(Math.random() * 255);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
      img.data[i + 3] = Math.random() < 0.5 ? 40 : 0;
    }
    c.putImageData(img, 0, 0);
    return cv;
  })();
  var grainPattern = null;

  function drawOrbs(c, cs, t) {
    var orbs = state.decor.orbs;
    var oc = theme().orb;
    for (var k = 0; k < orbs.length; k++) {
      var o = orbs[k];
      var fl = 0.8 + 0.2 * Math.sin(t * 2.3 + o.phase) + 0.08 * Math.sin(t * 9 + o.phase);
      var x = o.x * cs, y = o.y * cs, r = o.r * cs;
      var g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, tc(oc, 0.55 * fl));
      g.addColorStop(0.35, tc([Math.round(oc[0] * 0.9), Math.round(oc[1] * 0.75), Math.round(oc[2] * 0.6)], 0.28 * fl));
      g.addColorStop(1, tc(oc, 0));
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, TWO_PI); c.fill();
    }
  }

  // ---------------------------------------------------------------- characters
  // The figures are painted in characters.js (window.BBChars) as sprites.
  // Here we only place them, add the live glows and animate the lantern flame.
  var FIGURE_H = 1.45;   // figure height in cells

  function drawGhostSprite(c, cx, cy, cs, t, alpha, kind) {
    var spr = window.BBChars.ghostFrame(t + (kind === 'anjulika' ? 0.37 : 0), kind);
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
    return { left: top, w: w, h: h, x0: cx - w / 2, kind: kind };
  }

  function drawGhostEyes(c, box, t) {
    var glow = 0.75 + Math.sin(t * 9) * 0.25;
    var eyes = window.BBChars.ghostEyes(box.kind);
    var gc = window.BBChars.glow(box.kind);
    c.save();
    c.shadowColor = 'rgb(' + gc.join(',') + ')';
    c.shadowBlur = box.h * 0.06;
    c.fillStyle = 'rgba(' + gc.join(',') + ',' + glow + ')';
    for (var i = 0; i < eyes.length; i++) {
      c.beginPath();
      c.arc(box.x0 + eyes[i][0] * box.w, box.left + eyes[i][1] * box.h, Math.max(1.2, box.h * 0.008), 0, TWO_PI);
      c.fill();
    }
    c.restore();
  }

  function drawPlayerSprite(c, cx, cy, cs, t) {
    var pl = window.BBChars.players[state.character] || window.BBChars.players.male;
    var spr = pl.canvas;
    var h = cs * FIGURE_H * 0.95, w = h * spr.width / spr.height;
    var top = cy - h * 0.6;
    var x0 = cx - w / 2;
    c.drawImage(spr, x0, top, w, h);
    // the phone torch: a hard white point with a cool halo
    var fx = x0 + pl.torch[0] * w, fy = top + pl.torch[1] * h;
    var flick = 1 + Math.sin(t * 23) * 0.04;
    var lg = c.createRadialGradient(fx, fy, 0, fx, fy, cs * 0.55 * flick);
    lg.addColorStop(0, 'rgba(235,245,255,0.75)');
    lg.addColorStop(0.25, 'rgba(200,220,255,0.3)');
    lg.addColorStop(1, 'rgba(200,220,255,0)');
    c.fillStyle = lg;
    c.beginPath(); c.arc(fx, fy, cs * 0.55 * flick, 0, TWO_PI); c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(fx, fy, Math.max(1.2, h * 0.008), 0, TWO_PI); c.fill();
  }

  function render(t) {
    if (!state.data) { return; }
    if (state.staticDirty) { buildStatic(); }
    var cs = state.cell;
    var dpr = state.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(staticLayer, 0, 0);
    var mo = state.margin * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, mo, mo);

    var p = state.player, gi;
    var pcx = (p.x + 0.5) * cs, pcy = (p.y + 0.5) * cs;

    // dust from crumbling walls
    for (var i = 0; i < state.particles.length; i++) {
      var pt = state.particles[i];
      ctx.fillStyle = 'rgba(210,160,130,' + Math.min(1, pt.life) + ')';
      ctx.fillRect(pt.x * cs - 1.5, pt.y * cs - 1.5, 3, 3);
    }

    var boxes = [];
    for (gi = 0; gi < state.ghosts.length; gi++) {
      var gh = state.ghosts[gi];
      boxes.push(drawGhostSprite(ctx, (gh.x + 0.5) * cs, (gh.y + 0.5) * cs, cs, t, gh.awake ? 0.95 : 0.45, gh.kind));
    }
    drawPlayerSprite(ctx, pcx, pcy, cs, t);

    // Darkness with a flickering lantern hole
    var f = fogLayer.getContext('2d');
    f.setTransform(dpr, 0, 0, dpr, mo, mo);
    f.globalCompositeOperation = 'source-over';
    f.clearRect(-state.margin, -state.margin, state.pw, state.ph);
    f.fillStyle = 'rgba(3,1,1,0.96)';
    f.fillRect(-state.margin, -state.margin, state.pw, state.ph);
    f.globalCompositeOperation = 'destination-out';
    var nearFlicker = (nearestGhost() && state.dist <= 4) ? 0.12 : 0.04;
    var rad = state.cfg.light_radius * cs * (1 + nearFlicker * Math.sin(t * 13) + 0.03 * Math.sin(t * 7.3));
    var hole = f.createRadialGradient(pcx, pcy, rad * 0.2, pcx, pcy, rad);
    hole.addColorStop(0, 'rgba(0,0,0,1)');
    hole.addColorStop(0.6, 'rgba(0,0,0,0.7)');
    hole.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = hole;
    f.beginPath(); f.arc(pcx, pcy, rad, 0, TWO_PI); f.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(fogLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, mo, mo);

    // the cool light of the phone torch on everything near you
    var warm = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, rad);
    warm.addColorStop(0, 'rgba(210,225,255,0.13)');
    warm.addColorStop(1, 'rgba(210,225,255,0)');
    ctx.fillStyle = warm;
    ctx.beginPath(); ctx.arc(pcx, pcy, rad, 0, TWO_PI); ctx.fill();

    // floating lights drifting through the dark, and candles burning in the corridors
    drawOrbs(ctx, cs, t);
    drawCandleFlames(ctx, cs, t);
    drawLamps(ctx, cs, t);

    // the exit door, always visible through the darkness
    drawExitDoor(ctx, cs, t);

    // Her red eyes are visible even in the dark once she is awake
    for (gi = 0; gi < state.ghosts.length; gi++) {
      if (state.ghosts[gi].awake) { drawGhostEyes(ctx, boxes[gi], t); }
    }

    // the blood-red vignette and film grain are a CSS overlay (#board-fx) on top of the canvas
  }

  // ---- the exit: a soft white light glowing from the gap in the wall.
  // White shows up on every colour theme and never looks like a gold lamp.
  function drawExitDoor(c, cs, t) {
    var e = exitPoint(cs);
    var pulse = 0.5 + 0.18 * Math.sin(t * 2.2);
    var g = c.createRadialGradient(e.x, e.y, 0, e.x, e.y, cs * 1.25);
    g.addColorStop(0, 'rgba(255,255,255,' + pulse + ')');
    g.addColorStop(0.35, 'rgba(235,240,255,' + (pulse * 0.45) + ')');
    g.addColorStop(1, 'rgba(235,240,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(e.x, e.y, cs * 1.25, 0, TWO_PI); c.fill();
  }

  // ---- the lamps you can grab, glowing through the dark
  function drawLamps(c, cs, t) {
    var i, k;
    for (i = 0; i < state.lamps.length; i++) {
      var lp = state.lamps[i];
      var x = (lp.c + 0.5) * cs, y = (lp.r + 0.55) * cs;
      var fade = Math.min(1, lp.life / 2) * Math.min(1, (state.clock - lp.born) * 3);
      var pulse = 1 + 0.15 * Math.sin(t * 6 + i);
      var halo = c.createRadialGradient(x, y - cs * 0.15, 0, x, y - cs * 0.15, cs * 0.9 * pulse);
      halo.addColorStop(0, 'rgba(255,215,120,' + (0.55 * fade) + ')');
      halo.addColorStop(1, 'rgba(255,170,60,0)');
      c.fillStyle = halo;
      c.beginPath(); c.arc(x, y - cs * 0.15, cs * 0.9 * pulse, 0, TWO_PI); c.fill();
      c.globalAlpha = fade;
      // a brass diya on a little stand
      c.fillStyle = '#6b4a14';
      c.fillRect(x - cs * 0.05, y - cs * 0.02, cs * 0.1, cs * 0.16);
      c.beginPath(); c.ellipse(x, y + cs * 0.15, cs * 0.16, cs * 0.05, 0, 0, TWO_PI); c.fill();
      var bg = c.createLinearGradient(x - cs * 0.2, 0, x + cs * 0.2, 0);
      bg.addColorStop(0, '#7a5312');
      bg.addColorStop(0.5, '#f2c75c');
      bg.addColorStop(1, '#7a5312');
      c.fillStyle = bg;
      c.beginPath();
      c.moveTo(x - cs * 0.22, y - cs * 0.06);
      c.quadraticCurveTo(x, y + cs * 0.12, x + cs * 0.22, y - cs * 0.06);
      c.lineTo(x + cs * 0.28, y - cs * 0.1);
      c.quadraticCurveTo(x, y - cs * 0.02, x - cs * 0.22, y - cs * 0.06);
      c.closePath();
      c.fill();
      var fl = 1 + 0.2 * Math.sin(t * 15 + i * 3);
      c.fillStyle = 'rgba(255,150,40,0.95)';
      c.beginPath(); c.ellipse(x + cs * 0.2, y - cs * 0.2 * fl, cs * 0.05, cs * 0.11 * fl, 0.2, 0, TWO_PI); c.fill();
      c.fillStyle = 'rgba(255,250,215,0.95)';
      c.beginPath(); c.ellipse(x + cs * 0.2, y - cs * 0.16, cs * 0.022, cs * 0.06 * fl, 0.2, 0, TWO_PI); c.fill();
      // sparkles circling it, so it reads as something to grab
      c.fillStyle = 'rgba(255,240,180,0.9)';
      for (k = 0; k < 4; k++) {
        var a = t * 2 + k * Math.PI / 2;
        c.beginPath(); c.arc(x + Math.cos(a) * cs * 0.38, y - cs * 0.15 + Math.sin(a) * cs * 0.38, cs * 0.025, 0, TWO_PI); c.fill();
      }
      c.globalAlpha = 1;
    }
    // ghosts held back by the lamp shimmer gold
    for (i = 0; i < state.ghosts.length; i++) {
      var gh = state.ghosts[i];
      if (gh.awake && gh.frozen > 0) {
        var gx = (gh.x + 0.5) * cs, gy = (gh.y + 0.3) * cs;
        var fr = c.createRadialGradient(gx, gy, 0, gx, gy, cs * 0.9);
        fr.addColorStop(0, 'rgba(255,220,120,0.45)');
        fr.addColorStop(1, 'rgba(255,220,120,0)');
        c.fillStyle = fr;
        c.beginPath(); c.arc(gx, gy, cs * 0.9, 0, TWO_PI); c.fill();
        c.strokeStyle = 'rgba(255,225,140,' + (0.5 + 0.4 * Math.sin(t * 20)) + ')';
        c.lineWidth = Math.max(1.5, cs * 0.05);
        c.beginPath(); c.arc(gx, gy, cs * 0.55, 0, TWO_PI); c.stroke();
      }
    }
    // a warm burst of light around you when you grab a lamp
    if (state.lampBurst > 0) {
      var px = (state.player.x + 0.5) * cs, py = (state.player.y + 0.5) * cs;
      var br = c.createRadialGradient(px, py, 0, px, py, cs * 3);
      br.addColorStop(0, 'rgba(255,220,130,' + (state.lampBurst * 0.6) + ')');
      br.addColorStop(1, 'rgba(255,220,130,0)');
      c.fillStyle = br;
      c.beginPath(); c.arc(px, py, cs * 3, 0, TWO_PI); c.fill();
    }
  }

  // ---------------------------------------------------------------- jumpscare
  // She appears far away in the dark, flickering... then rushes at you until
  // her face fills - and overflows - the whole screen, shaking.
  var scare = { faces: [], imgs: {}, start: 0, running: false };

  function portraitOf(kind) {
    if (!scare.imgs[kind]) {
      var im = document.createElement('canvas');
      im.width = 1600;
      im.height = 1600;
      window.BBChars.drawGhostPortrait(im.getContext('2d'), 1600, 1600, true, kind);
      scare.imgs[kind] = im;
    }
    return scare.imgs[kind];
  }

  // kinds: one ghost, or both sisters side by side when they catch you together
  function startScare(kinds) {
    var sc = $('scare-canvas');
    var dpr = window.devicePixelRatio || 1;
    sc.width = Math.round(window.innerWidth * dpr);
    sc.height = Math.round(window.innerHeight * dpr);
    if (typeof kinds === 'string') { kinds = [kinds]; }
    kinds = kinds && kinds.length ? kinds : ['manjulika'];
    scare.faces = [];
    for (var i = 0; i < kinds.length; i++) { scare.faces.push(portraitOf(kinds[i])); }
    scare.start = performance.now();
    scare.running = true;
    $('jumpscare').classList.add('show');
    requestAnimationFrame(scareFrame);
  }

  // the red lights over the whole screen (the #redlight layer)
  function redFlash() {
    var el = $('redlight');
    if (!el) { return; }
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  function redAlarm(on) {
    var el = $('redlight');
    if (!el) { return; }
    el.classList.remove('flash');
    el.classList.toggle('alarm', on);
  }

  function stopScare() {
    scare.running = false;
    $('jumpscare').classList.remove('show');
  }

  function scareFrame(now) {
    if (!scare.running) { return; }
    var sc = $('scare-canvas');
    var c = sc.getContext('2d');
    var W = sc.width, H = sc.height;
    var t = (now - scare.start) / 1000;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);

    var two = scare.faces.length > 1;
    var base = two ? Math.max(H * 0.82, W * 0.38) : Math.max(H, W * 0.62);
    for (var fi = 0; fi < scare.faces.length; fi++) {
      var img = scare.faces[fi];
      var ft = t - fi * 0.12;                                // the second sister lunges a beat later
      var scale;
      if (ft < 0.22) {
        scale = 0.2 + Math.max(0, ft) * 0.3;                 // far away, barely there
      } else if (ft < 0.55) {
        var k = (ft - 0.22) / 0.33;
        scale = 0.27 + Math.pow(k, 2.4) * 1.55;              // the lunge, faster and faster
      } else if (ft < 0.8) {
        scale = 1.82 - (ft - 0.55) / 0.25 * 0.3;             // bursts past the screen, then settles
      } else {
        scale = 1.52 + Math.sin(ft * 2.5 + fi) * 0.03;       // right in your face
      }
      var size = base * scale;
      var cxf = two ? (fi === 0 ? W * 0.28 : W * 0.72) : W / 2;
      var shake = ft > 0.4 ? base * (ft < 1.4 ? 0.018 : 0.006) : 0;
      var x = cxf - size / 2 + (Math.random() - 0.5) * shake * 2;
      var y = H / 2 - size * 0.46 + (Math.random() - 0.5) * shake * 2;
      var alpha = 1;
      if (ft < 0.55 && Math.random() < 0.3) { alpha = 0.25; }   // flicker as she comes
      if (ft > 0.3 && ft < 0.6) {
        c.globalAlpha = alpha * 0.35;
        var s2 = size * 0.85;
        c.drawImage(img, cxf - s2 / 2, H / 2 - s2 * 0.46, s2, s2);
      }
      c.globalAlpha = alpha;
      c.drawImage(img, x, y, size, size);
      c.globalAlpha = 1;
    }

    // blood-red flash on impact
    if (t > 0.5 && t < 0.85) {
      c.fillStyle = 'rgba(190,0,20,' + (0.5 * (1 - (t - 0.5) / 0.35)) + ')';
      c.fillRect(0, 0, W, H);
    }
    var vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.85)');
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);
    // red warning lights pulsing around every edge of the screen
    if (t > 0.42) {
      var pulse = 0.5 + 0.5 * Math.sin(t * 15);
      var edge = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
      edge.addColorStop(0, 'rgba(255,0,25,0)');
      edge.addColorStop(0.7, 'rgba(255,0,25,' + (0.25 + pulse * 0.3) + ')');
      edge.addColorStop(1, 'rgba(255,10,40,' + (0.6 + pulse * 0.4) + ')');
      c.fillStyle = edge;
      c.fillRect(0, 0, W, H);
      // and a hard red strobe for the first moments
      if (t < 1.3 && Math.floor(t * 8) % 2 === 0) {
        c.fillStyle = 'rgba(200,0,20,0.28)';
        c.fillRect(0, 0, W, H);
      }
    }
    requestAnimationFrame(scareFrame);
  }

  // ================================================================== BACKDROP
  // The animated scene behind everything: a blood-tinged night sky, a huge
  // moon with clouds sliding over it, the silhouette of the haveli with its
  // domes and a few lit windows, dead trees, bats, rolling fog, and lightning.
  var Backdrop = {
    cv: null, c: null, scene: null, fogTex: null,
    w: 0, h: 0, dpr: 1, bats: [], clouds: [], flash: 0, nextFlash: 8, dim: 0, tint: [130, 12, 16],

    init: function () {
      this.cv = document.getElementById('bg');
      if (!this.cv) { return; }
      this.c = this.cv.getContext('2d');
      var R = seededRandom(20261023);
      for (var k = 0; k < 9; k++) {
        this.bats.push({ x: R(), y: 0.08 + R() * 0.35, v: 0.012 + R() * 0.03, size: 6 + R() * 10, phase: R() * 10, dir: R() < 0.5 ? -1 : 1, bob: R() * 6 });
      }
      for (k = 0; k < 5; k++) {
        this.clouds.push({ x: R(), y: 0.08 + R() * 0.28, w: 0.25 + R() * 0.3, v: 0.004 + R() * 0.006, a: 0.5 + R() * 0.4 });
      }
      this.fogTex = this.makeFog();
      this.resize();
    },

    resize: function () {
      if (!this.cv) { return; }
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.cv.width = Math.round(this.w * this.dpr);
      this.cv.height = Math.round(this.h * this.dpr);
      this.scene = this.paintScene();
    },

    makeFog: function () {
      var cv = document.createElement('canvas');
      cv.width = 1024; cv.height = 256;
      var c = cv.getContext('2d');
      var R = seededRandom(77);
      for (var k = 0; k < 70; k++) {
        var x = R() * 1024, y = 90 + R() * 150, r = 40 + R() * 90;
        for (var dx = -1024; dx <= 1024; dx += 1024) {
          var g = c.createRadialGradient(x + dx, y, 0, x + dx, y, r);
          g.addColorStop(0, 'rgba(190,180,200,0.10)');
          g.addColorStop(1, 'rgba(190,180,200,0)');
          c.fillStyle = g;
          c.beginPath(); c.arc(x + dx, y, r, 0, TWO_PI); c.fill();
        }
      }
      return cv;
    },

    // a dead tree, drawn as recursive branches
    tree: function (c, x, y, len, ang, width, depth, R) {
      if (depth <= 0 || len < 4) { return; }
      var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      c.strokeStyle = '#040206';
      c.lineWidth = width;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo((x + x2) / 2 + (R() - 0.5) * len * 0.3, (y + y2) / 2, x2, y2);
      c.stroke();
      var n = 2 + (R() < 0.35 ? 1 : 0);
      for (var k = 0; k < n; k++) {
        this.tree(c, x2, y2, len * (0.62 + R() * 0.18), ang + (R() - 0.5) * 1.2, width * 0.65, depth - 1, R);
      }
    },

    paintScene: function () {
      var w = this.w, h = this.h;
      var cv = document.createElement('canvas');
      cv.width = Math.round(w * this.dpr); cv.height = Math.round(h * this.dpr);
      var c = cv.getContext('2d');
      c.scale(this.dpr, this.dpr);
      var R = seededRandom(1993);
      var k;
      // sky
      var sky = c.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#05030a');
      sky.addColorStop(0.45, '#160a1c');
      sky.addColorStop(0.75, '#2b0d16');
      sky.addColorStop(1, '#0a0406');
      c.fillStyle = sky;
      c.fillRect(0, 0, w, h);
      for (k = 0; k < 140; k++) {
        c.fillStyle = 'rgba(255,240,230,' + (0.15 + R() * 0.5) + ')';
        c.fillRect(R() * w, R() * h * 0.55, R() < 0.9 ? 1 : 2, R() < 0.9 ? 1 : 2);
      }
      // moon with a sickly halo and craters
      var mr = Math.min(w, h) * 0.11, mx = w * 0.8, my = h * 0.2;
      var halo = c.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 4.5);
      halo.addColorStop(0, 'rgba(255,190,170,0.35)');
      halo.addColorStop(0.4, 'rgba(160,40,60,0.12)');
      halo.addColorStop(1, 'rgba(160,40,60,0)');
      c.fillStyle = halo;
      c.fillRect(0, 0, w, h);
      var mg = c.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      mg.addColorStop(0, '#fff6e2');
      mg.addColorStop(0.7, '#ecd9bd');
      mg.addColorStop(1, '#c9a98e');
      c.fillStyle = mg;
      c.beginPath(); c.arc(mx, my, mr, 0, TWO_PI); c.fill();
      for (k = 0; k < 9; k++) {
        var ca = R() * TWO_PI, cd = R() * mr * 0.7;
        c.fillStyle = 'rgba(150,120,100,0.25)';
        c.beginPath(); c.arc(mx + Math.cos(ca) * cd, my + Math.sin(ca) * cd, mr * (0.06 + R() * 0.12), 0, TWO_PI); c.fill();
      }
      // distant hills
      c.fillStyle = '#12070d';
      c.beginPath();
      c.moveTo(0, h * 0.72);
      for (var x = 0; x <= w; x += w / 12) { c.lineTo(x, h * (0.66 + R() * 0.06)); }
      c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
      // the haveli silhouette
      var base = h * 0.86, hw = Math.min(w * 0.7, h * 1.3), hx = w * 0.5 - hw / 2;
      c.fillStyle = '#07030a';
      c.fillRect(hx, base - hw * 0.22, hw, hw * 0.22 + h);
      // central tower and big dome with a finial
      var tx = w * 0.5, tw = hw * 0.22;
      c.fillRect(tx - tw / 2, base - hw * 0.36, tw, hw * 0.2);
      c.beginPath();
      c.moveTo(tx - tw * 0.48, base - hw * 0.36);
      c.bezierCurveTo(tx - tw * 0.6, base - hw * 0.5, tx - tw * 0.1, base - hw * 0.52, tx, base - hw * 0.58);
      c.bezierCurveTo(tx + tw * 0.1, base - hw * 0.52, tx + tw * 0.6, base - hw * 0.5, tx + tw * 0.48, base - hw * 0.36);
      c.closePath(); c.fill();
      c.fillRect(tx - 1.5, base - hw * 0.64, 3, hw * 0.07);
      // side chhatris (small domed pavilions)
      var spots = [0.12, 0.3, 0.7, 0.88];
      for (k = 0; k < spots.length; k++) {
        var cxp = hx + hw * spots[k], cw2 = hw * 0.07, ctop = base - hw * 0.22;
        c.fillRect(cxp - cw2 / 2, ctop - hw * 0.07, cw2, hw * 0.07);
        c.beginPath();
        c.moveTo(cxp - cw2 * 0.6, ctop - hw * 0.07);
        c.quadraticCurveTo(cxp, ctop - hw * 0.16, cxp + cw2 * 0.6, ctop - hw * 0.07);
        c.closePath(); c.fill();
        c.fillRect(cxp - 1, ctop - hw * 0.18, 2, hw * 0.03);
      }
      // rows of arched windows: most dark, a few lit, one with a figure
      var rows2 = 2, cols2 = 11;
      for (var rr = 0; rr < rows2; rr++) {
        for (var cc = 0; cc < cols2; cc++) {
          var wx = hx + hw * (0.06 + cc * 0.088), wy = base - hw * (0.18 - rr * 0.09);
          var ww = hw * 0.035, wh = hw * 0.055;
          var lit = R() < 0.18;
          c.fillStyle = lit ? 'rgba(255,150,60,0.85)' : '#1c0d18';
          c.beginPath();
          c.moveTo(wx - ww / 2, wy + wh / 2);
          c.lineTo(wx - ww / 2, wy - wh * 0.1);
          c.arc(wx, wy - wh * 0.1, ww / 2, Math.PI, 0);
          c.lineTo(wx + ww / 2, wy + wh / 2);
          c.closePath(); c.fill();
          if (lit && R() < 0.5) {
            c.fillStyle = '#07030a';
            c.beginPath(); c.arc(wx, wy - wh * 0.05, ww * 0.16, 0, TWO_PI); c.fill();
            c.fillRect(wx - ww * 0.18, wy + wh * 0.05, ww * 0.36, wh * 0.45);
          }
        }
      }
      // dead trees framing the scene
      this.tree(c, w * 0.04, h * 1.02, h * 0.2, -Math.PI / 2 + 0.12, Math.max(6, h * 0.018), 7, R);
      this.tree(c, w * 0.97, h * 1.02, h * 0.22, -Math.PI / 2 - 0.15, Math.max(6, h * 0.02), 7, R);
      // ground
      c.fillStyle = '#030104';
      c.fillRect(0, h * 0.95, w, h * 0.05);
      return cv;
    },

    drawBat: function (c, x, y, s, flap) {
      var wing = Math.sin(flap) * 0.8;
      c.fillStyle = '#020103';
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x - s * 0.6, y - s * (0.6 + wing), x - s * 1.4, y - s * wing * 0.6);
      c.quadraticCurveTo(x - s * 0.9, y + s * 0.1, x - s * 0.7, y + s * 0.3);
      c.quadraticCurveTo(x - s * 0.4, y + s * 0.05, x, y + s * 0.3);
      c.quadraticCurveTo(x + s * 0.4, y + s * 0.05, x + s * 0.7, y + s * 0.3);
      c.quadraticCurveTo(x + s * 0.9, y + s * 0.1, x + s * 1.4, y - s * wing * 0.6);
      c.quadraticCurveTo(x + s * 0.6, y - s * (0.6 + wing), x, y);
      c.fill();
      c.beginPath(); c.arc(x, y + s * 0.1, s * 0.22, 0, TWO_PI); c.fill();
    },

    // one soft cloud, painted once
    makeCloud: function () {
      var cv = document.createElement('canvas');
      cv.width = 512; cv.height = 194;
      var c = cv.getContext('2d');
      for (var p = 0; p < 5; p++) {
        var x = 97 + p * 80, y = 97 + Math.sin(p) * 8;
        var g = c.createRadialGradient(x, y, 0, x, y, 97);
        g.addColorStop(0, 'rgba(18,8,18,0.8)');
        g.addColorStop(1, 'rgba(18,8,18,0)');
        c.fillStyle = g;
        c.fillRect(x - 97, 0, 194, 194);
      }
      return cv;
    },

    frame: function (t, dt) {
      if (!this.cv || !this.scene) { return; }
      // behind the dimmed game the sky only needs ~15 updates a second
      this.skip = (this.skip || 0) + dt;
      if (this.dim > 0 && this.skip < 0.066) { return; }
      dt = this.skip;
      this.skip = 0;
      var c = this.c, w = this.w, h = this.h, k;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(this.scene, 0, 0);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // clouds drifting across the moon
      for (k = 0; k < this.clouds.length; k++) {
        var cl = this.clouds[k];
        cl.x += cl.v * dt;
        if (cl.x > 1.3) { cl.x = -0.4; }
        var cx = cl.x * w, cy = cl.y * h, cw = cl.w * w;
        if (!this.cloudTex) { this.cloudTex = this.makeCloud(); }
        c.globalAlpha = cl.a;
        c.drawImage(this.cloudTex, cx - cw * 0.22, cy - cw * 0.22, cw * 1.16, cw * 0.44);
        c.globalAlpha = 1;
      }
      // bats
      for (k = 0; k < this.bats.length; k++) {
        var b = this.bats[k];
        b.x += b.v * b.dir * dt;
        if (b.x > 1.1) { b.x = -0.1; }
        if (b.x < -0.1) { b.x = 1.1; }
        this.drawBat(c, b.x * w, b.y * h + Math.sin(t * 1.5 + b.phase) * b.bob, b.size, t * 14 + b.phase);
      }
      // rolling fog near the ground, tinted with this level's colour
      var fw = Math.max(w, 1024);
      for (k = 0; k < 2; k++) {
        var off = ((t * (12 + k * 9)) % fw);
        c.globalAlpha = 0.9 - k * 0.3;
        c.drawImage(this.fogTex, -off, h * (0.62 + k * 0.12), fw, h * 0.32);
        c.drawImage(this.fogTex, fw - off, h * (0.62 + k * 0.12), fw, h * 0.32);
      }
      c.globalAlpha = 1;
      var tg = c.createLinearGradient(0, h * 0.5, 0, h);
      tg.addColorStop(0, 'rgba(0,0,0,0)');
      tg.addColorStop(1, 'rgba(' + this.tint[0] + ',' + this.tint[1] + ',' + this.tint[2] + ',0.22)');
      c.fillStyle = tg;
      c.fillRect(0, h * 0.5, w, h * 0.5);
      // lightning
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) {
        this.flash = 1;
        this.nextFlash = 12 + Math.random() * 14;
        if (Sound.ctx && Sound.droneOn) { Sound.thunder(); }
      }
      if (this.flash > 0) {
        var f = this.flash;
        var a = f > 0.7 ? 0.55 : (f > 0.55 ? 0.1 : (f > 0.4 ? 0.35 : f * 0.4));
        c.fillStyle = 'rgba(220,215,255,' + a + ')';
        c.fillRect(0, 0, w, h);
        this.flash -= dt * 1.6;
      }
      // darken behind the game so the maze stands out
      if (this.dim > 0) {
        c.fillStyle = 'rgba(0,0,0,' + this.dim + ')';
        c.fillRect(0, 0, w, h);
      }
    }
  };

  // ================================================================== LOOP
  var last = 0;
  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    state.clock = ts / 1000;
    Backdrop.frame(state.clock, dt);
    if (state.data) {
      update(dt);
      render(state.clock);
    }
    requestAnimationFrame(loop);
  }

  // ================================================================== INPUT
  var HOLD_DELAY = 0.22;   // seconds a key must be held before it starts running
  var TURN_MEMORY = 0.3;   // how long a tap that hit a wall is remembered (for corners)

  function press(name) {
    Sound.resume();
    if (!state.running || state.paused) { return; }
    state.heldDir = name;
    state.holdTime = 0;
    if (state.moveCooldown <= 0 && !state.tapQueue.length && tryMove(name)) { return; }
    // not able to step right now (still moving, or a wall in the way): remember the tap
    if (state.tapQueue.length < 4) { state.tapQueue.push({ dir: name, ttl: TURN_MEMORY }); }
  }

  function release(name) {
    if (state.heldDir === name) { state.heldDir = null; state.holdTime = 0; }
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
  window.addEventListener('blur', function () { state.heldDir = null; state.holdTime = 0; });

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

  // ---- character picker on the title screen
  try {
    var saved = window.localStorage.getItem('bb-character');
    if (saved === 'male' || saved === 'female') { state.character = saved; }
  } catch (e) { /* storage may be blocked; the default is fine */ }
  var cards = document.querySelectorAll('.char-card');
  for (var ci = 0; ci < cards.length; ci++) {
    (function (card) {
      var name = card.getAttribute('data-char');
      var cv = card.querySelector('canvas');
      var cc = cv.getContext('2d');
      cc.drawImage(window.BBChars.players[name].canvas, 0, 0, cv.width, cv.height);
      card.classList.toggle('selected', name === state.character);
      card.addEventListener('click', function () {
        state.character = name;
        for (var k = 0; k < cards.length; k++) {
          cards[k].classList.toggle('selected', cards[k].getAttribute('data-char') === name);
        }
        try { window.localStorage.setItem('bb-character', name); } catch (e) { /* ignore */ }
      });
    })(cards[ci]);
  }

  $('btn-start').addEventListener('click', startGame);
  $('btn-mute').addEventListener('click', function () {
    Sound.init();
    var muted = Sound.toggleMute();
    $('btn-mute').innerHTML = muted ? '&#128263;' : '&#128264;';
  });
  window.addEventListener('resize', function () { resize(); Backdrop.resize(); });
  Backdrop.init();

  requestAnimationFrame(loop);
})();
