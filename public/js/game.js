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
  // Every sound is synthesised live with the Web Audio API - no sound files needed.
  var Sound = {
    ctx: null,
    master: null,
    noiseBuf: null,
    droneFilter: null,
    droneOn: false,
    muted: false,

    init: function () {
      if (this.ctx) { return; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { return; }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      var len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      var data = this.noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) { data[i] = Math.random() * 2 - 1; }
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

    startDrone: function () {
      if (!this.ctx || this.droneOn) { return; }
      this.droneOn = true;
      var c = this.ctx;
      var g = c.createGain();
      g.gain.value = 0.07;
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 160;
      f.Q.value = 6;
      var o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;
      var o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 55.7;
      var o3 = c.createOscillator(); o3.type = 'sine'; o3.frequency.value = 82.4;
      o1.connect(f); o2.connect(f); o3.connect(f);
      f.connect(g); g.connect(this.master);
      var wind = this.noise();
      var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
      var wg = c.createGain(); wg.gain.value = 0.018;
      wind.connect(bp); bp.connect(wg); wg.connect(this.master);
      o1.start(); o2.start(); o3.start(); wind.start();
      this.droneFilter = f;
    },

    setTension: function (t) {
      if (!this.droneFilter) { return; }
      this.droneFilter.frequency.setTargetAtTime(160 + 900 * t, this.ctx.currentTime, 0.4);
    },

    thump: function (t, vol, freq) {
      var c = this.ctx;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq * 1.8, t);
      o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.25);
    },

    heartbeat: function (vol) {
      if (!this.ctx) { return; }
      var t = this.ctx.currentTime;
      this.thump(t, vol, 62);
      this.thump(t + 0.16, vol * 0.7, 52);
    },

    ghungroo: function (vol) {
      if (!this.ctx) { return; }
      var c = this.ctx;
      for (var i = 0; i < 5; i++) {
        var t = c.currentTime + Math.random() * 0.16;
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = 'sine';
        o.frequency.value = 3000 + Math.random() * 1900;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * 0.25), t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        o.connect(g); g.connect(this.master);
        o.start(t); o.stop(t + 0.16);
      }
    },

    shriek: function (vol, dur) {
      if (!this.ctx) { return; }
      var c = this.ctx;
      var t = c.currentTime;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
      g.gain.setValueAtTime(vol, t + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      g.connect(this.master);

      var shaper = this.distortion(300);
      shaper.connect(g);
      var ratios = [1, 1.26, 1.49];
      for (var i = 0; i < ratios.length; i++) {
        var o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(520 * ratios[i], t);
        o.frequency.exponentialRampToValueAtTime(1500 * ratios[i], t + dur * 0.25);
        o.frequency.exponentialRampToValueAtTime(800 * ratios[i], t + dur);
        var lfo = c.createOscillator();
        lfo.frequency.value = 9 + i * 2;
        var lg = c.createGain();
        lg.gain.value = 60;
        lfo.connect(lg); lg.connect(o.frequency);
        var og = c.createGain();
        og.gain.value = 0.25;
        o.connect(og); og.connect(shaper);
        o.start(t); o.stop(t + dur);
        lfo.start(t); lfo.stop(t + dur);
      }
      var n = this.noise();
      var bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(1200, t);
      bp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.3);
      var ng = c.createGain();
      ng.gain.value = 0.7;
      n.connect(bp); bp.connect(ng); ng.connect(g);
      n.start(t); n.stop(t + dur);
    },

    crumble: function () {
      if (!this.ctx) { return; }
      var c = this.ctx;
      var t = c.currentTime;
      var n = this.noise();
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      var g = c.createGain();
      g.gain.setValueAtTime(0.8, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      n.connect(lp); lp.connect(g); g.connect(this.master);
      n.start(t); n.stop(t + 0.85);
      this.thump(t, 0.9, 38);
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
      g.gain.setValueAtTime(0.35, t);
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
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        o.connect(g); g.connect(this.master);
        o.start(t); o.stop(t + 0.75);
      }
    }
  };

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
      data.config.ghost_speed + ' steps per second</b>.<br>You have <b>' +
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
    Sound.shriek(1.0, 1.7);
    drawScare();
    $('jumpscare').classList.add('show');
    setTimeout(function () {
      $('jumpscare').classList.remove('show');
      api('/api/rank', { total: state.total, cleared: state.level - 1 }).then(function (res) {
        showCaught(reason, res.title);
      }).catch(function () { showCaught(reason, ''); });
    }, 1700);
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
    Sound.ghungroo(0.6);
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
    if (state.dist <= 9) { Sound.ghungroo(0.15 + (9 - state.dist) * 0.05); }
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
      if (state.heartAcc >= 0.45) { state.heartAcc = 0; Sound.heartbeat(0.5); }
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
        Sound.shriek(0.35, 0.9);
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

    // Heartbeat: faster and louder as she closes in
    var d = g.awake ? Math.max(1, state.dist) : 20;
    var closeness = g.awake ? Math.max(0, Math.min(1, (16 - d) / 15)) : 0;
    var bpm = 62 + closeness * 128;
    state.heartAcc += dt;
    if (state.heartAcc >= 60 / bpm) {
      state.heartAcc = 0;
      Sound.heartbeat(0.25 + closeness * 0.75);
    }
    Sound.setTension(closeness);

    // Scream when she is too near
    if (g.awake && state.dist <= 2 && state.nearArmed) {
      state.nearArmed = false;
      Sound.shriek(0.5, 0.75);
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

  // An original spectral figure: pale face, long dark hair, glowing red eyes.
  function drawGhost(c, cx, cy, s, t, alpha, scream) {
    c.save();
    c.globalAlpha = alpha;
    c.translate(cx, cy + Math.sin(t * 3) * s * 0.04);

    var aura = c.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 0.85);
    aura.addColorStop(0, 'rgba(255,50,70,0.35)');
    aura.addColorStop(1, 'rgba(255,50,70,0)');
    c.fillStyle = aura;
    c.beginPath(); c.arc(0, 0, s * 0.85, 0, Math.PI * 2); c.fill();

    // flowing robe
    var robe = c.createLinearGradient(0, -s * 0.2, 0, s * 0.55);
    robe.addColorStop(0, 'rgba(236,230,224,0.95)');
    robe.addColorStop(1, 'rgba(236,230,224,0.04)');
    c.fillStyle = robe;
    c.beginPath();
    c.moveTo(-s * 0.18, -s * 0.08);
    c.quadraticCurveTo(-s * 0.36, s * 0.2, -s * 0.33, s * 0.5);
    for (var i = 0; i <= 6; i++) {
      var hx = -s * 0.33 + i * (s * 0.66 / 6);
      var hy = s * 0.5 + Math.sin(t * 6 + i * 1.3) * s * 0.05 + (i % 2 ? s * 0.06 : 0);
      c.lineTo(hx, hy);
    }
    c.quadraticCurveTo(s * 0.36, s * 0.2, s * 0.18, -s * 0.08);
    c.closePath();
    c.fill();

    // long dark hair behind the face
    c.fillStyle = '#060203';
    c.beginPath();
    c.ellipse(0, -s * 0.2, s * 0.19, s * 0.22, 0, 0, Math.PI * 2);
    c.fill();
    var sway = Math.sin(t * 2.4) * s * 0.03;
    c.beginPath();
    c.moveTo(-s * 0.19, -s * 0.2);
    c.quadraticCurveTo(-s * 0.26, s * 0.1, -s * 0.2 + sway, s * 0.34);
    c.lineTo(-s * 0.08, s * 0.05);
    c.lineTo(s * 0.08, s * 0.05);
    c.lineTo(s * 0.2 + sway, s * 0.34);
    c.quadraticCurveTo(s * 0.26, s * 0.1, s * 0.19, -s * 0.2);
    c.closePath();
    c.fill();

    // pale face
    c.fillStyle = '#d8d2cc';
    c.beginPath();
    c.ellipse(0, -s * 0.17, s * 0.12, s * 0.15, 0, 0, Math.PI * 2);
    c.fill();
    // hair falling over the forehead
    c.fillStyle = '#060203';
    c.beginPath();
    c.ellipse(0, -s * 0.31, s * 0.15, s * 0.08, 0, 0, Math.PI * 2);
    c.fill();
    // dark sunken eye sockets
    c.fillStyle = 'rgba(30,0,4,0.9)';
    c.beginPath(); c.ellipse(-s * 0.05, -s * 0.2, s * 0.035, s * 0.028, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(s * 0.05, -s * 0.2, s * 0.035, s * 0.028, 0, 0, Math.PI * 2); c.fill();
    drawEyes(c, 0, 0, s, t);
    // mouth
    c.fillStyle = '#1a0003';
    c.beginPath();
    c.ellipse(0, -s * 0.09, s * (scream ? 0.05 : 0.025), s * (scream ? 0.07 : 0.012), 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawEyes(c, cx, cy, s, t) {
    var glow = 0.75 + Math.sin(t * 9) * 0.25;
    c.save();
    c.shadowColor = '#ff1a2e';
    c.shadowBlur = s * 0.25;
    c.fillStyle = 'rgba(255,40,60,' + glow + ')';
    c.beginPath(); c.arc(cx - s * 0.05, cy - s * 0.2, s * 0.018, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx + s * 0.05, cy - s * 0.2, s * 0.018, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  function drawPlayer(c, cx, cy, s, t) {
    // lantern glow
    var lg = c.createRadialGradient(cx + s * 0.2, cy, 1, cx + s * 0.2, cy, s * 0.5);
    lg.addColorStop(0, 'rgba(255,170,70,0.7)');
    lg.addColorStop(1, 'rgba(255,170,70,0)');
    c.fillStyle = lg;
    c.beginPath(); c.arc(cx + s * 0.2, cy, s * 0.5, 0, Math.PI * 2); c.fill();
    // body
    c.fillStyle = '#2d4a6b';
    c.beginPath();
    c.moveTo(cx - s * 0.18, cy + s * 0.3);
    c.lineTo(cx, cy - s * 0.08);
    c.lineTo(cx + s * 0.18, cy + s * 0.3);
    c.closePath(); c.fill();
    // head
    c.fillStyle = '#e2b98a';
    c.beginPath(); c.arc(cx, cy - s * 0.15, s * 0.12, 0, Math.PI * 2); c.fill();
    // lantern flame
    c.fillStyle = '#ffd27a';
    c.beginPath(); c.arc(cx + s * 0.22, cy + Math.sin(t * 14) * s * 0.01, s * 0.06, 0, Math.PI * 2); c.fill();
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

    drawGhost(ctx, gcx, gcy, cs * 1.1, t, g.awake ? 0.95 : 0.4, false);
    drawPlayer(ctx, pcx, pcy, cs, t);

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
    f.beginPath(); f.arc(pcx, pcy, rad, 0, Math.PI * 2); f.fill();
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
    ctx.beginPath(); ctx.arc(ex, ey, cs * 1.2, 0, Math.PI * 2); ctx.fill();

    // Her red eyes are visible even in the dark once she is awake
    if (g.awake) {
      ctx.save();
      ctx.translate(gcx, gcy + Math.sin(t * 3) * cs * 0.044);
      drawEyes(ctx, 0, 0, cs * 1.1, t);
      ctx.restore();
    }
  }

  function drawScare() {
    var sc = $('scare-canvas');
    var c = sc.getContext('2d');
    c.clearRect(0, 0, sc.width, sc.height);
    drawGhost(c, sc.width / 2, sc.height * 0.62, sc.width * 1.6, state.clock, 1, true);
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
