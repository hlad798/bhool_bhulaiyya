/* ==================================================================
   Bhool Bhulaiyya: The Escape Hunt - character painter
   ------------------------------------------------------------------
   Paints the two characters as human figures with shaded skin,
   real facial features, strand-by-strand hair and draped cloth.
   The full-body figures are painted once into hidden canvases
   ("sprites") when the page loads, so the game only has to copy them.

   window.BBChars.ghostFrame(t)       -> animated sprite of Manjulika
   window.BBChars.ghostEyes           -> where her eyes are (0..1 of sprite)
   window.BBChars.player              -> sprite of the player
   window.BBChars.playerFlame         -> where the lantern flame is (0..1)
   window.BBChars.drawGhostPortrait(c, w, h, scream) -> jumpscare close-up
   ================================================================== */
(function () {
  'use strict';

  var TWO_PI = Math.PI * 2;

  // ---------------------------------------------------------------- helpers
  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCanvas(w, h) {
    var cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    return cv;
  }

  function rgba(rgb, a) {
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  function mix(a, b, t) {
    return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
  }

  // A soft, blurred patch of colour - used for all the skin and cloth shading.
  function softSpot(c, x, y, rx, ry, rgb, alpha) {
    if (rx <= 0 || ry <= 0) { return; }
    c.save();
    c.translate(x, y);
    c.scale(1, ry / rx);
    var g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, rgba(rgb, alpha));
    g.addColorStop(1, rgba(rgb, 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, rx, 0, TWO_PI);
    c.fill();
    c.restore();
  }

  function stroke(c, color, width, pts) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    if (pts.length === 4) { c.lineTo(pts[2], pts[3]); }
    else if (pts.length === 6) { c.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); }
    else { c.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); }
    c.stroke();
  }

  // A tapered limb (arm, leg, sleeve) from p1 to p2, shaded across its width.
  function limb(c, x1, y1, x2, y2, w1, w2, dark, mid, light) {
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var nx = -Math.sin(ang), ny = Math.cos(ang);
    c.beginPath();
    c.moveTo(x1 + nx * w1, y1 + ny * w1);
    c.lineTo(x2 + nx * w2, y2 + ny * w2);
    c.arc(x2, y2, w2, ang + Math.PI / 2, ang - Math.PI / 2, true);
    c.lineTo(x1 - nx * w1, y1 - ny * w1);
    c.arc(x1, y1, w1, ang - Math.PI / 2, ang + Math.PI / 2, true);
    c.closePath();
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, w = Math.max(w1, w2);
    var g = c.createLinearGradient(mx + nx * w, my + ny * w, mx - nx * w, my - ny * w);
    g.addColorStop(0, rgba(dark, 1));
    g.addColorStop(0.45, rgba(mid, 1));
    g.addColorStop(0.7, rgba(light, 1));
    g.addColorStop(1, rgba(dark, 1));
    c.fillStyle = g;
    c.fill();
  }

  // ================================================================== FACE
  // u = half the face width; the face is centred on (cx, cy) and runs from
  // about cy - 1.4u (hairline) to cy + 1.38u (chin).
  function drawFace(c, cx, cy, u, o) {
    var R = o.rand;
    var ghost = o.ghost, scream = o.scream;
    var skinL = ghost ? [216, 213, 208] : [205, 150, 108];
    var skinM = ghost ? [178, 175, 172] : [172, 116, 78];
    var skinD = ghost ? [98, 96, 108] : [108, 64, 40];
    var chinY = scream ? 1.8 * u : 1.38 * u;
    var i, side;

    c.save();
    c.translate(cx, cy);

    // ears
    for (i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      c.fillStyle = rgba(skinM, 1);
      c.beginPath();
      c.ellipse(side * 0.97 * u, 0.02 * u, 0.17 * u, 0.3 * u, side * 0.15, 0, TWO_PI);
      c.fill();
      softSpot(c, side * 0.99 * u, 0.04 * u, 0.1 * u, 0.2 * u, skinD, 0.7);
    }

    var jw = o.female ? 0.22 : (o.male ? 0.36 : 0.3);
    var jc = o.female ? 0.6 : (o.male ? 0.86 : 0.7);
    function facePath() {
      c.beginPath();
      c.moveTo(0, -1.4 * u);
      c.bezierCurveTo(0.66 * u, -1.4 * u, 1.0 * u, -0.98 * u, 1.0 * u, -0.2 * u);
      c.bezierCurveTo(1.0 * u, 0.5 * u, jc * u, chinY - 0.35 * u, jw * u, chinY - 0.06 * u);
      c.quadraticCurveTo(0, chinY + 0.04 * u, -jw * u, chinY - 0.06 * u);
      c.bezierCurveTo(-jc * u, chinY - 0.35 * u, -1.0 * u, 0.5 * u, -1.0 * u, -0.2 * u);
      c.bezierCurveTo(-1.0 * u, -0.98 * u, -0.66 * u, -1.4 * u, 0, -1.4 * u);
      c.closePath();
    }

    facePath();
    var fg = c.createRadialGradient(-0.15 * u, -0.3 * u, 0.1 * u, 0, 0, 1.8 * u);
    fg.addColorStop(0, rgba(skinL, 1));
    fg.addColorStop(0.5, rgba(skinM, 1));
    fg.addColorStop(1, rgba(skinD, 1));
    c.fillStyle = fg;
    c.fill();

    // ---- modelling: light from the upper left, shadows under the bones
    c.save();
    facePath();
    c.clip();
    var sideShade = c.createLinearGradient(-u, 0, u, 0);
    sideShade.addColorStop(0, 'rgba(255,255,255,0.07)');
    sideShade.addColorStop(0.55, 'rgba(0,0,0,0)');
    sideShade.addColorStop(1, rgba(skinD, 0.5));
    c.fillStyle = sideShade;
    c.fillRect(-1.2 * u, -1.6 * u, 2.4 * u, 3.8 * u);
    for (i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      softSpot(c, side * 0.85 * u, -0.55 * u, 0.32 * u, 0.5 * u, skinD, 0.35);
      softSpot(c, side * 0.66 * u, 0.48 * u, 0.3 * u, 0.42 * u, skinD, ghost ? 0.5 : 0.22);
      softSpot(c, side * 0.5 * u, 0.12 * u, 0.26 * u, 0.16 * u, skinL, 0.35);
      if (!ghost) { softSpot(c, side * 0.52 * u, 0.3 * u, 0.25 * u, 0.15 * u, [190, 90, 80], 0.12); }
    }
    softSpot(c, -0.12 * u, -0.95 * u, 0.5 * u, 0.25 * u, skinL, 0.45);
    softSpot(c, 0, chinY + 0.05 * u, 0.85 * u, 0.32 * u, skinD, 0.55);
    softSpot(c, 0, chinY - 0.28 * u, 0.22 * u, 0.12 * u, skinL, 0.3);
    if (ghost) {
      // blue veins at the temples
      c.lineCap = 'round';
      for (i = 0; i < 2; i++) {
        side = i === 0 ? -1 : 1;
        for (var v = 0; v < 4; v++) {
          var vx = side * (0.68 + R() * 0.2) * u, vy = (-0.85 + R() * 0.5) * u;
          stroke(c, 'rgba(70,80,125,0.35)', 0.014 * u,
            [vx, vy, vx + side * (R() * 0.15) * u, vy + (0.1 + R() * 0.15) * u, vx + side * (R() * 0.1 - 0.05) * u, vy + (0.25 + R() * 0.2) * u]);
        }
      }
    }
    c.restore();

    var eyeY = -0.12 * u, eyeX = 0.42 * u;
    for (i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      softSpot(c, side * eyeX, eyeY + 0.03 * u, 0.36 * u, 0.26 * u,
        ghost ? [35, 15, 30] : [95, 55, 38], ghost ? 0.9 : 0.32);
    }
    for (i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      drawEye(c, side * eyeX, eyeY, u, side, o);
      drawBrow(c, side * eyeX, eyeY, u, side, o);
    }
    drawNose(c, u, skinD, skinL);
    drawMouth(c, u, chinY, o, skinD);

    if (ghost) {
      // kohl running down from the eyes like black tears
      c.lineCap = 'round';
      for (i = 0; i < 2; i++) {
        side = i === 0 ? -1 : 1;
        for (var k = 0; k < 3; k++) {
          var sx = side * eyeX + (k - 1) * 0.08 * u + (R() - 0.5) * 0.04 * u;
          var sy = eyeY + 0.12 * u;
          var len = (0.35 + R() * 0.55) * u;
          stroke(c, 'rgba(18,6,10,' + (0.35 + R() * 0.3) + ')', (0.018 + R() * 0.015) * u,
            [sx, sy, sx + (R() - 0.5) * 0.12 * u, sy + len * 0.5, sx + (R() - 0.5) * 0.08 * u, sy + len]);
        }
      }
      // smudged bindi with a thin drip
      softSpot(c, 0, -0.7 * u, 0.12 * u, 0.1 * u, [120, 10, 22], 0.6);
      c.fillStyle = '#6e0a14';
      c.beginPath(); c.arc(0, -0.7 * u, 0.06 * u, 0, TWO_PI); c.fill();
      stroke(c, 'rgba(110,10,20,0.7)', 0.018 * u, [0, -0.66 * u, 0.01 * u, -0.55 * u, 0, -0.42 * u]);
    }
    c.restore();
    return { left: [cx - eyeX, cy + eyeY], right: [cx + eyeX, cy + eyeY], ear: 0.97 * u };
  }

  function drawEye(c, x, y, u, side, o) {
    var R = o.rand;
    var w = 0.25 * u;
    var up = (o.scream ? 0.27 : 0.17) * u;
    var dn = (o.scream ? 0.15 : 0.11) * u;
    var ix = x - side * w, ox = x + side * w, oy = y - 0.03 * u;
    function eyePath() {
      c.beginPath();
      c.moveTo(ix, y);
      c.quadraticCurveTo(x, y - up * 1.6, ox, oy);
      c.quadraticCurveTo(x, y + dn * 1.6, ix, y);
      c.closePath();
    }
    eyePath();
    var sc = c.createRadialGradient(x, y, 0, x, y, w * 1.1);
    if (o.ghost) {
      sc.addColorStop(0, '#e9ddd2');
      sc.addColorStop(1, '#a8646a');
    } else {
      sc.addColorStop(0, '#f4ede4');
      sc.addColorStop(1, '#c9b2a2');
    }
    c.fillStyle = sc;
    c.fill();

    c.save();
    eyePath();
    c.clip();
    softSpot(c, x, y - up * 0.7, w * 1.1, up * 0.9, [60, 35, 35], 0.4);
    if (o.ghost) {
      for (var k = 0; k < 7; k++) {
        var vx = (R() < 0.5 ? ix : ox), vy = y + (R() - 0.5) * 0.06 * u;
        stroke(c, 'rgba(150,20,30,0.65)', 0.01 * u,
          [vx, vy, vx + (x - vx) * (0.3 + R() * 0.3), vy + (R() - 0.5) * 0.08 * u]);
      }
    }
    var irisR = 0.105 * u * (o.scream ? 0.75 : 1);
    var ig = c.createRadialGradient(x, y, 0, x, y, irisR);
    if (o.ghost) {
      ig.addColorStop(0, '#f2efe9');
      ig.addColorStop(0.7, '#c7c2bb');
      ig.addColorStop(1, '#6f6a66');
    } else {
      ig.addColorStop(0, '#6a4428');
      ig.addColorStop(0.7, '#3b2212');
      ig.addColorStop(1, '#1a0d06');
    }
    c.fillStyle = ig;
    c.beginPath(); c.arc(x, y, irisR, 0, TWO_PI); c.fill();
    c.fillStyle = o.ghost ? '#3a0006' : '#050302';
    c.beginPath(); c.arc(x, y, (o.ghost ? 0.02 : 0.047) * u, 0, TWO_PI); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath(); c.arc(x - 0.03 * u, y - 0.035 * u, 0.02 * u, 0, TWO_PI); c.fill();
    c.restore();

    // lash line, lid crease and lashes
    c.lineCap = 'round';
    stroke(c, o.ghost ? '#0e0406' : '#170b06', 0.035 * u, [ix, y, x, y - up * 1.6, ox, oy]);
    stroke(c, 'rgba(40,20,15,0.35)', 0.016 * u,
      [ix + side * 0.03 * u, y - 0.09 * u, x, y - up * 1.6 - 0.13 * u, ox, oy - 0.08 * u]);
    stroke(c, 'rgba(60,30,25,0.3)', 0.014 * u, [ix, y + 0.01 * u, x, y + dn * 1.7, ox, oy + 0.01 * u]);
    var lashLen = o.female ? 0.08 : 0.05;
    for (var l = 0; l < 6; l++) {
      var t = 0.45 + l * 0.1;
      var lx = (1 - t) * (1 - t) * ix + 2 * (1 - t) * t * x + t * t * ox;
      var ly = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y - up * 1.6) + t * t * oy;
      stroke(c, 'rgba(10,4,4,0.8)', 0.012 * u, [lx, ly, lx + side * lashLen * 0.8 * u, ly - lashLen * u]);
    }
    if (o.female) {
      stroke(c, '#0d0604', 0.03 * u, [ox, oy, ox + side * 0.1 * u, oy - 0.07 * u]);
    }
  }

  function drawBrow(c, x, y, u, side, o) {
    var ix = x - side * 0.27 * u, iy = y - (o.ghost ? 0.24 : 0.36) * u;
    var px = x + side * 0.03 * u, py = y - 0.42 * u;
    var ox = x + side * 0.3 * u, oy = y - 0.3 * u;
    c.lineCap = 'round';
    for (var k = 0; k < 22; k++) {
      var t = k / 21;
      var bx = (1 - t) * (1 - t) * ix + 2 * (1 - t) * t * px + t * t * ox;
      var by = (1 - t) * (1 - t) * iy + 2 * (1 - t) * t * py + t * t * oy;
      var thick = (1 - t * 0.7) * 0.05 * u * (o.female ? 0.7 : (o.male ? 1.2 : 1));
      stroke(c, o.ghost ? 'rgba(20,12,14,0.75)' : 'rgba(25,14,8,0.8)', thick,
        [bx, by, bx + side * 0.05 * u, by - 0.012 * u]);
    }
  }

  function drawNose(c, u, skinD, skinL) {
    c.lineCap = 'round';
    stroke(c, rgba(skinD, 0.35), 0.05 * u, [-0.12 * u, -0.05 * u, -0.16 * u, 0.3 * u, -0.15 * u, 0.48 * u]);
    stroke(c, rgba(skinD, 0.2), 0.04 * u, [0.12 * u, -0.05 * u, 0.15 * u, 0.3 * u, 0.15 * u, 0.48 * u]);
    softSpot(c, 0.01 * u, 0.48 * u, 0.15 * u, 0.13 * u, skinL, 0.55);
    softSpot(c, 0.0, 0.1 * u, 0.06 * u, 0.3 * u, skinL, 0.25);
    stroke(c, rgba(skinD, 0.55), 0.026 * u, [-0.12 * u, 0.5 * u, -0.23 * u, 0.6 * u, -0.12 * u, 0.67 * u]);
    stroke(c, rgba(skinD, 0.45), 0.026 * u, [0.12 * u, 0.5 * u, 0.23 * u, 0.6 * u, 0.12 * u, 0.67 * u]);
    c.fillStyle = rgba(mix(skinD, [0, 0, 0], 0.5), 0.8);
    c.beginPath(); c.ellipse(-0.075 * u, 0.645 * u, 0.055 * u, 0.025 * u, -0.3, 0, TWO_PI); c.fill();
    c.beginPath(); c.ellipse(0.075 * u, 0.645 * u, 0.055 * u, 0.025 * u, 0.3, 0, TWO_PI); c.fill();
    softSpot(c, 0, 0.74 * u, 0.22 * u, 0.06 * u, skinD, 0.4);
  }

  function drawMouth(c, u, chinY, o, skinD) {
    var R = o.rand;
    var my = 0.95 * u;
    var upper = o.ghost ? '#6c5960' : (o.female ? '#9c4f4f' : '#874a40');
    var lower = o.ghost ? '#7d696f' : (o.female ? '#b4615c' : '#9a594c');
    c.lineCap = 'round';
    if (!o.scream) {
      c.fillStyle = upper;
      c.beginPath();
      c.moveTo(-0.36 * u, my);
      c.quadraticCurveTo(-0.18 * u, my - 0.13 * u, -0.05 * u, my - 0.1 * u);
      c.quadraticCurveTo(0, my - 0.07 * u, 0.05 * u, my - 0.1 * u);
      c.quadraticCurveTo(0.18 * u, my - 0.13 * u, 0.36 * u, my);
      c.quadraticCurveTo(0, my + 0.03 * u, -0.36 * u, my);
      c.fill();
      c.fillStyle = lower;
      c.beginPath();
      c.moveTo(-0.33 * u, my + 0.01 * u);
      c.quadraticCurveTo(0, my + 0.23 * u, 0.33 * u, my + 0.01 * u);
      c.quadraticCurveTo(0, my + 0.04 * u, -0.33 * u, my + 0.01 * u);
      c.fill();
      stroke(c, 'rgba(30,8,8,0.8)', 0.022 * u, [-0.36 * u, my, 0, my + 0.045 * u, 0.36 * u, my]);
      softSpot(c, 0, my + 0.1 * u, 0.12 * u, 0.04 * u, [255, 255, 255], 0.16);
      softSpot(c, 0, my + 0.29 * u, 0.2 * u, 0.07 * u, skinD, 0.4);
      if (o.ghost) {
        for (var k = 0; k < 6; k++) {
          var cx2 = (R() - 0.5) * 0.5 * u;
          stroke(c, 'rgba(40,20,25,0.5)', 0.008 * u, [cx2, my + 0.03 * u, cx2 + (R() - 0.5) * 0.02 * u, my + 0.12 * u]);
        }
      }
      return;
    }
    // screaming mouth, wide open
    var top = my - 0.12 * u, bot = chinY - 0.28 * u;
    function mouthPath() {
      c.beginPath();
      c.moveTo(-0.34 * u, top + 0.06 * u);
      c.quadraticCurveTo(0, top - 0.08 * u, 0.34 * u, top + 0.06 * u);
      c.bezierCurveTo(0.42 * u, (top + bot) / 2, 0.25 * u, bot, 0, bot);
      c.bezierCurveTo(-0.25 * u, bot, -0.42 * u, (top + bot) / 2, -0.34 * u, top + 0.06 * u);
      c.closePath();
    }
    mouthPath();
    var mg = c.createRadialGradient(0, (top + bot) / 2, 0, 0, (top + bot) / 2, (bot - top) * 0.7);
    mg.addColorStop(0, '#000000');
    mg.addColorStop(0.6, '#1c0204');
    mg.addColorStop(1, '#3d070b');
    c.fillStyle = mg;
    c.fill();
    c.save();
    mouthPath();
    c.clip();
    c.fillStyle = '#4a0a10';
    c.beginPath(); c.ellipse(0, bot - 0.05 * u, 0.24 * u, 0.12 * u, 0, 0, TWO_PI); c.fill();
    for (var tth = -3; tth <= 3; tth++) {
      var tx = tth * 0.085 * u;
      var tg = c.createLinearGradient(0, top, 0, top + 0.13 * u);
      tg.addColorStop(0, '#d6ccb1');
      tg.addColorStop(1, '#8c8068');
      c.fillStyle = tg;
      c.beginPath();
      c.moveTo(tx - 0.038 * u, top - 0.02 * u);
      c.lineTo(tx + 0.038 * u, top - 0.02 * u);
      c.lineTo(tx + 0.03 * u, top + (0.09 + Math.abs(tth) * -0.008 + (tth === 0 ? 0.02 : 0)) * u);
      c.quadraticCurveTo(tx, top + 0.13 * u, tx - 0.03 * u, top + 0.09 * u);
      c.closePath();
      c.fill();
      if (Math.abs(tth) < 3) {
        c.fillStyle = '#9e937a';
        c.fillRect(tx - 0.03 * u, bot - 0.12 * u, 0.06 * u, 0.09 * u);
      }
    }
    c.restore();
    c.strokeStyle = upper;
    c.lineWidth = 0.07 * u;
    mouthPath();
    c.stroke();
    stroke(c, 'rgba(255,255,255,0.08)', 0.02 * u, [-0.3 * u, bot + 0.02 * u, 0, bot + 0.07 * u, 0.3 * u, bot + 0.02 * u]);
  }

  // ================================================================== HAIR
  var HAIR_TONES = ['#140f10', '#1f1718', '#2c2121', '#0b0808', '#3a2b28'];

  function drawLongHairBack(c, cx, cy, u, bottom, sway, R) {
    var top = cy - 1.4 * u;
    c.fillStyle = '#0b0809';
    c.beginPath();
    c.moveTo(cx - 1.05 * u, cy - 0.2 * u);
    c.bezierCurveTo(cx - 1.3 * u, top - 0.3 * u, cx + 1.3 * u, top - 0.3 * u, cx + 1.05 * u, cy - 0.2 * u);
    c.bezierCurveTo(cx + 1.6 * u, cy + 1.5 * u, cx + 1.5 * u + sway, bottom - 0.6 * u, cx + 1.3 * u + sway, bottom);
    c.quadraticCurveTo(cx + sway * 0.5, bottom + 0.25 * u, cx - 1.3 * u + sway, bottom);
    c.bezierCurveTo(cx - 1.5 * u + sway, bottom - 0.6 * u, cx - 1.6 * u, cy + 1.5 * u, cx - 1.05 * u, cy - 0.2 * u);
    c.closePath();
    c.fill();
    c.lineCap = 'round';
    for (var k = 0; k < 280; k++) {
      var a = Math.PI * (1.05 + R() * 0.9);
      var sx = cx + Math.cos(a) * 1.05 * u, sy = cy - 0.4 * u + Math.sin(a) * 1.05 * u;
      var dir = Math.cos(a);
      var ex = cx + dir * (1.0 + R() * 0.45) * u + sway * (0.4 + R() * 0.8);
      var ey = bottom - R() * 0.9 * u;
      stroke(c, HAIR_TONES[Math.floor(R() * HAIR_TONES.length)], (0.012 + R() * 0.018) * u,
        [sx, sy, cx + dir * 1.55 * u, cy + 1.2 * u, ex, ey]);
    }
  }

  function drawLongHairFront(c, cx, cy, u, bottom, sway, R, ghost) {
    var top = cy - 1.4 * u;
    var k, side, i;
    // crown with a centre parting, covering the top of the forehead
    for (i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      c.fillStyle = '#0d0a0a';
      c.beginPath();
      c.moveTo(cx, top - 0.06 * u);
      c.bezierCurveTo(cx + side * 0.7 * u, top - 0.08 * u, cx + side * 1.05 * u, top + 0.5 * u, cx + side * 1.06 * u, cy - 0.1 * u);
      c.lineTo(cx + side * 0.9 * u, cy - 0.1 * u);
      c.bezierCurveTo(cx + side * 0.86 * u, top + 0.7 * u, cx + side * 0.5 * u, top + 0.28 * u, cx + side * 0.03 * u, top + 0.24 * u);
      c.closePath();
      c.fill();
    }
    c.lineCap = 'round';
    for (i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      for (k = 0; k < 110; k++) {
        var sx = cx + side * (0.02 + R() * 0.04) * u, sy = top + (0.02 + R() * 0.2) * u;
        var ex = cx + side * (0.88 + R() * 0.2) * u, ey = cy + (-0.3 + R() * 0.4) * u;
        stroke(c, HAIR_TONES[Math.floor(R() * HAIR_TONES.length)], (0.01 + R() * 0.012) * u,
          [sx, sy, cx + side * 0.75 * u, top + 0.05 * u, ex, ey]);
      }
      // long locks falling past the face, over the shoulders and chest
      for (k = 0; k < 90; k++) {
        var lx = cx + side * (0.86 + R() * 0.24) * u, ly = cy + (-0.5 + R() * 0.6) * u;
        var fx = cx + side * (1.15 + R() * 0.85) * u + sway * (0.5 + R());
        var fy = cy + (2.4 + R() * 0.4) * u + (bottom - cy - 2.6 * u) * R() * 0.8;
        stroke(c, HAIR_TONES[Math.floor(R() * HAIR_TONES.length)], (0.012 + R() * 0.02) * u,
          [lx, ly, cx + side * 1.25 * u, cy + 1.5 * u, fx, fy]);
      }
    }
    if (ghost) {
      // sindoor in the parting
      stroke(c, 'rgba(150,15,25,0.85)', 0.04 * u, [cx, top - 0.02 * u, cx, top + 0.3 * u]);
      // a few stray strands across the face
      for (k = 0; k < 9; k++) {
        side = R() < 0.5 ? -1 : 1;
        var hx = cx + side * (0.15 + R() * 0.3) * u;
        stroke(c, 'rgba(12,8,8,' + (0.5 + R() * 0.4) + ')', (0.01 + R() * 0.01) * u,
          [hx, top + 0.15 * u, hx + side * 0.25 * u, cy - 0.2 * u, hx + side * (0.35 + R() * 0.4) * u + sway * 0.3, cy + (1.0 + R() * 1.2) * u]);
      }
    }
  }

  function drawShortHair(c, cx, cy, u, R) {
    c.fillStyle = '#120c09';
    c.beginPath();
    c.moveTo(cx - 1.0 * u, cy - 0.3 * u);
    c.quadraticCurveTo(cx - 1.12 * u, cy - 1.62 * u, cx, cy - 1.66 * u);
    c.quadraticCurveTo(cx + 1.12 * u, cy - 1.62 * u, cx + 1.0 * u, cy - 0.3 * u);
    c.quadraticCurveTo(cx + 0.92 * u, cy - 0.92 * u, cx + 0.5 * u, cy - 1.08 * u);
    c.quadraticCurveTo(cx + 0.05 * u, cy - 1.2 * u, cx - 0.45 * u, cy - 1.02 * u);
    c.quadraticCurveTo(cx - 0.92 * u, cy - 0.92 * u, cx - 1.0 * u, cy - 0.3 * u);
    c.closePath();
    c.fill();
    c.lineCap = 'round';
    for (var k = 0; k < 200; k++) {
      var a = Math.PI * (1.05 + R() * 0.9);
      var rr = 0.6 + R() * 0.45;
      var sx = cx + Math.cos(a) * rr * u, sy = cy - 0.75 * u + Math.sin(a) * rr * 0.85 * u;
      var col = R() < 0.25 ? '#3a2a20' : '#22170f';
      stroke(c, col, (0.012 + R() * 0.012) * u,
        [sx, sy, sx + (Math.cos(a) * 0.12 + 0.05) * u, sy + (0.08 + R() * 0.08) * u]);
    }
    softSpot(c, cx - 0.35 * u, cy - 1.35 * u, 0.4 * u, 0.15 * u, [120, 100, 90], 0.25);
    c.fillStyle = '#1a110b';
    c.fillRect(cx - 1.0 * u, cy - 0.45 * u, 0.1 * u, 0.42 * u);
    c.fillRect(cx + 0.9 * u, cy - 0.45 * u, 0.1 * u, 0.42 * u);
  }

  function drawNeck(c, cx, cy, u, skin, ghost) {
    var g = c.createLinearGradient(cx - 0.5 * u, 0, cx + 0.5 * u, 0);
    g.addColorStop(0, rgba(skin[2], 1));
    g.addColorStop(0.4, rgba(skin[1], 1));
    g.addColorStop(1, rgba(skin[2], 1));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(cx - 0.45 * u, cy + 0.7 * u);
    c.quadraticCurveTo(cx - 0.42 * u, cy + 1.7 * u, cx - 0.7 * u, cy + 2.3 * u);
    c.lineTo(cx + 0.7 * u, cy + 2.3 * u);
    c.quadraticCurveTo(cx + 0.42 * u, cy + 1.7 * u, cx + 0.45 * u, cy + 0.7 * u);
    c.closePath();
    c.fill();
    softSpot(c, cx, cy + 1.55 * u, 0.5 * u, 0.25 * u, skin[2], ghost ? 0.8 : 0.6);
    stroke(c, rgba(skin[2], 0.4), 0.04 * u, [cx - 0.3 * u, cy + 1.6 * u, cx - 0.12 * u, cy + 2.0 * u, cx - 0.05 * u, cy + 2.25 * u]);
    stroke(c, rgba(skin[2], 0.4), 0.04 * u, [cx + 0.3 * u, cy + 1.6 * u, cx + 0.12 * u, cy + 2.0 * u, cx + 0.05 * u, cy + 2.25 * u]);
  }

  function drawJhumka(c, x, y, u) {
    var g = c.createRadialGradient(x - 0.03 * u, y + 0.05 * u, 0, x, y + 0.08 * u, 0.16 * u);
    g.addColorStop(0, '#f2d27a');
    g.addColorStop(0.6, '#b8862f');
    g.addColorStop(1, '#5e4012');
    c.fillStyle = '#c99a3c';
    c.beginPath(); c.arc(x, y, 0.05 * u, 0, TWO_PI); c.fill();
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - 0.14 * u, y + 0.22 * u);
    c.quadraticCurveTo(x - 0.12 * u, y + 0.04 * u, x, y + 0.04 * u);
    c.quadraticCurveTo(x + 0.12 * u, y + 0.04 * u, x + 0.14 * u, y + 0.22 * u);
    c.closePath();
    c.fill();
    c.fillStyle = '#e6c46b';
    for (var b = -2; b <= 2; b++) {
      c.beginPath(); c.arc(x + b * 0.06 * u, y + 0.26 * u, 0.025 * u, 0, TWO_PI); c.fill();
    }
  }

  function drawHand(c, x, y, ang, s, skin, nails) {
    // a long, bony hand pointing along the angle ang
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    var g = c.createLinearGradient(0, -s * 0.5, 0, s * 0.5);
    g.addColorStop(0, rgba(skin[0], 1));
    g.addColorStop(1, rgba(skin[2], 1));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(s * 0.35, 0, s * 0.42, s * 0.3, 0, 0, TWO_PI);
    c.fill();
    c.lineCap = 'round';
    var fingers = [[-0.21, 0.95, 0.25], [-0.07, 1.08, 0.1], [0.07, 1.02, -0.05], [0.19, 0.85, -0.2]];
    for (var f = 0; f < fingers.length; f++) {
      var fy = fingers[f][0] * s, flen = fingers[f][1] * s, curl = fingers[f][2] * s;
      var fx0 = s * 0.6;
      c.strokeStyle = rgba(skin[1], 1);
      c.lineWidth = s * 0.12;
      c.beginPath();
      c.moveTo(fx0, fy);
      c.quadraticCurveTo(fx0 + flen * 0.55, fy - curl * 0.2, fx0 + flen * 0.85, fy + curl);
      c.stroke();
      c.strokeStyle = rgba(skin[2], 0.6);
      c.lineWidth = s * 0.03;
      c.beginPath();
      c.moveTo(fx0 + flen * 0.35, fy - s * 0.04);
      c.lineTo(fx0 + flen * 0.4, fy + s * 0.04);
      c.stroke();
      c.fillStyle = nails;
      c.beginPath();
      c.arc(fx0 + flen * 0.85, fy + curl, s * 0.05, 0, TWO_PI);
      c.fill();
    }
    c.strokeStyle = rgba(skin[1], 1);
    c.lineWidth = s * 0.14;
    c.beginPath();
    c.moveTo(s * 0.25, -s * 0.25);
    c.quadraticCurveTo(s * 0.5, -s * 0.55, s * 0.8, -s * 0.5);
    c.stroke();
    c.restore();
  }

  function drawBangles(c, x, y, ang, r) {
    var colors = ['#8e0f1f', '#c9a03e', '#1e5a2e', '#8e0f1f', '#c9a03e', '#8e0f1f'];
    for (var b = 0; b < colors.length; b++) {
      var off = (b - 2.5) * r * 0.32;
      c.save();
      c.translate(x + Math.cos(ang) * off, y + Math.sin(ang) * off);
      c.rotate(ang);
      c.strokeStyle = colors[b];
      c.lineWidth = r * 0.28;
      c.beginPath();
      c.ellipse(0, 0, r * 0.3, r * 1.12, 0, 0, TWO_PI);
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = r * 0.08;
      c.beginPath();
      c.ellipse(0, 0, r * 0.3, r * 1.12, 0, Math.PI * 1.1, Math.PI * 1.5);
      c.stroke();
      c.restore();
    }
  }

  // ================================================================== SARI
  function sariBorder(c, pts, width, R) {
    // maroon border with gold lines and small gold motifs along a polyline
    c.lineCap = 'round';
    c.lineJoin = 'round';
    var p;
    c.strokeStyle = '#5a1218';
    c.lineWidth = width;
    c.beginPath();
    for (p = 0; p < pts.length; p++) {
      if (p === 0) { c.moveTo(pts[p][0], pts[p][1]); } else { c.lineTo(pts[p][0], pts[p][1]); }
    }
    c.stroke();
    c.strokeStyle = 'rgba(190,150,70,0.85)';
    c.lineWidth = Math.max(1, width * 0.12);
    c.stroke();
    c.fillStyle = 'rgba(205,165,80,0.8)';
    for (p = 1; p < pts.length; p++) {
      var x0 = pts[p - 1][0], y0 = pts[p - 1][1], x1 = pts[p][0], y1 = pts[p][1];
      var segLen = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
      var steps = Math.floor(segLen / (width * 1.1));
      for (var s = 0; s < steps; s++) {
        var t = s / Math.max(1, steps);
        var mx = x0 + (x1 - x0) * t, my = y0 + (y1 - y0) * t;
        c.beginPath();
        c.moveTo(mx, my - width * 0.3);
        c.lineTo(mx + width * 0.22, my);
        c.lineTo(mx, my + width * 0.3);
        c.lineTo(mx - width * 0.22, my);
        c.closePath();
        c.fill();
      }
    }
  }

  // ================================================================== GHOST (cartoon)
  // Manjulika (and her sister Anjulika): a human ghost drawn in a cartoon
  // style - normal proportions, long hair over her face, dead skin, smoky
  // eyes with glowing pupils, kajal tears, a full-length tattered sari that
  // floats above the floor, long claws, and her jewellery: maang tikka, nath
  // with its chain, jhumkas, a choker and a long haar, bajubands and bangles.
  var INK = '#1b0f1c';

  function ink(c, w) {
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.strokeStyle = INK;
    c.lineWidth = w;
    c.stroke();
  }

  function bead(c, x, y, r, color) {
    c.beginPath(); c.arc(x, y, r, 0, TWO_PI);
    c.fillStyle = color; c.fill();
    c.lineWidth = Math.max(0.8, r * 0.35); c.strokeStyle = INK; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TWO_PI); c.fill();
  }

  // a chain of beads hanging between two points
  function beadChain(c, x1, y1, x2, y2, sag, count, r, color) {
    for (var k = 0; k <= count; k++) {
      var t = k / count;
      var x = x1 + (x2 - x1) * t;
      var y = y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * sag;
      bead(c, x, y, r, k % 3 === 1 ? TOON.ruby : (k % 3 === 2 ? TOON.pearl : TOON.gold));
    }
  }

  function drawToonJhumka(c, x, y, s, swing) {
    c.save();
    c.translate(x, y);
    c.rotate(swing);
    bead(c, 0, 0, s * 0.07, TOON.ruby);
    c.beginPath();
    c.moveTo(-s * 0.2, s * 0.32);
    c.quadraticCurveTo(-s * 0.18, s * 0.06, 0, s * 0.06);
    c.quadraticCurveTo(s * 0.18, s * 0.06, s * 0.2, s * 0.32);
    c.closePath();
    c.fillStyle = TOON.gold; c.fill();
    ink(c, s * 0.03);
    c.fillStyle = TOON.goldShade;
    c.fillRect(-s * 0.2, s * 0.27, s * 0.4, s * 0.05);
    for (var k = -2; k <= 2; k++) { bead(c, k * s * 0.09, s * 0.38, s * 0.035, TOON.pearl); }
    c.restore();
  }

  // The two sisters' colours. TOON points at whichever one is being painted.
  var PALETTES = {
    manjulika: {
      skin: '#b7c8bf', skinShade: '#7f958d', skinDeep: '#4e6158',
      sari: '#e2d6c0', sariShade: '#a5967e', border: '#7a1020', gold: '#e3b24a', goldShade: '#a87a1e',
      blouse: '#5e0d1c', blouseShade: '#3a0812', hair: '#0b080f', hairHi: '#2b2440',
      ruby: '#c8102e', pearl: '#efe8da', lips: '#240810', eyeWhite: '#050002',
      glow: '#ff2238', glowRGB: [255, 34, 56], aura: [150, 20, 60], blood: '#7d0011', bangle3: '#1e7a46'
    },
    anjulika: {
      skin: '#9aa3b4', skinShade: '#6a7387', skinDeep: '#444c5e',
      sari: '#2a2a33', sariShade: '#15151c', border: '#2e7d4f', gold: '#c9ced8', goldShade: '#7c8291',
      blouse: '#1d3b2c', blouseShade: '#0f2219', hair: '#d9dbe4', hairHi: '#ffffff',
      ruby: '#22b35e', pearl: '#efe8da', lips: '#141821', eyeWhite: '#020305',
      glow: '#3dff8a', glowRGB: [61, 255, 138], aura: [30, 160, 110], blood: '#6a0012', bangle3: '#7a1020'
    }
  };
  var TOON = PALETTES.manjulika;

  // points along a quadratic curve
  function qpt(x0, y0, x1, y1, x2, y2, t) {
    var a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
    return [a * x0 + b * x1 + d * x2, a * y0 + b * y1 + d * y2];
  }

  // a streak of blood running down, ending in a drop
  function bloodStreak(c, x, y, len, w, wob) {
    c.strokeStyle = TOON.blood;
    c.lineCap = 'round';
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x + wob, y + len * 0.35, x - wob, y + len * 0.65, x + wob * 0.5, y + len);
    c.stroke();
    c.fillStyle = TOON.blood;
    c.beginPath(); c.arc(x + wob * 0.5, y + len + w * 0.4, w * 0.9, 0, TWO_PI); c.fill();
  }

  function hexRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---------------------------------------------------------------- scary face
  // A human face drawn in a cartoon style: soft shading and thin ink lines,
  // dead pale skin, smoky black sockets with pin-prick glowing pupils,
  // kajal running down like black tears, and a thin, wrong little smile.
  function drawScaryFace(c, cx, cy, s, scream) {
    var R = seeded(4242);
    var chin = scream ? 1.66 * s : 1.36 * s;
    var sL = hexRgb(TOON.skin), sS = hexRgb(TOON.skinShade), sD = hexRgb(TOON.skinDeep);
    var i, side, k;
    c.save();
    c.translate(cx, cy);
    c.lineCap = 'round';
    c.lineJoin = 'round';

    for (i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      c.beginPath();
      c.ellipse(side * 0.95 * s, 0.05 * s, 0.14 * s, 0.26 * s, side * 0.15, 0, TWO_PI);
      c.fillStyle = TOON.skinShade; c.fill();
      ink(c, s * 0.03);
    }

    function facePath() {
      c.beginPath();
      c.moveTo(0, -1.38 * s);
      c.bezierCurveTo(0.68 * s, -1.38 * s, 0.98 * s, -0.95 * s, 0.98 * s, -0.2 * s);
      c.bezierCurveTo(0.98 * s, 0.45 * s, 0.72 * s, chin - 0.32 * s, 0.3 * s, chin - 0.05 * s);
      c.quadraticCurveTo(0, chin + 0.04 * s, -0.3 * s, chin - 0.05 * s);
      c.bezierCurveTo(-0.72 * s, chin - 0.32 * s, -0.98 * s, 0.45 * s, -0.98 * s, -0.2 * s);
      c.bezierCurveTo(-0.98 * s, -0.95 * s, -0.68 * s, -1.38 * s, 0, -1.38 * s);
      c.closePath();
    }
    facePath();
    var fg = c.createRadialGradient(-0.18 * s, -0.35 * s, 0.1 * s, 0, 0, 1.8 * s);
    fg.addColorStop(0, rgba(sL, 1));
    fg.addColorStop(0.62, rgba(sS, 1));
    fg.addColorStop(1, rgba(sD, 1));
    c.fillStyle = fg;
    c.fill();

    c.save();
    facePath();
    c.clip();
    var sh = c.createLinearGradient(-s, 0, s, 0);
    sh.addColorStop(0, 'rgba(255,255,255,0.06)');
    sh.addColorStop(0.55, 'rgba(0,0,0,0)');
    sh.addColorStop(1, rgba(sD, 0.55));
    c.fillStyle = sh;
    c.fillRect(-1.2 * s, -1.6 * s, 2.4 * s, 3.6 * s);
    for (i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      softSpot(c, side * 0.84 * s, -0.55 * s, 0.3 * s, 0.48 * s, sD, 0.4);
      softSpot(c, side * 0.62 * s, 0.5 * s, 0.28 * s, 0.36 * s, sD, 0.35);
      softSpot(c, side * 0.5 * s, 0.12 * s, 0.24 * s, 0.14 * s, sL, 0.35);
    }
    softSpot(c, -0.1 * s, -0.95 * s, 0.5 * s, 0.22 * s, sL, 0.45);
    softSpot(c, 0, chin + 0.05 * s, 0.8 * s, 0.3 * s, sD, 0.6);
    // hairline cracks and veins under dead skin
    c.strokeStyle = 'rgba(30,10,20,0.45)';
    c.lineWidth = s * 0.014;
    var cracks = [[-0.78, -0.75], [0.8, -0.35], [-0.55, 0.85]];
    for (k = 0; k < cracks.length; k++) {
      var px = cracks[k][0] * s, py = cracks[k][1] * s;
      c.beginPath();
      c.moveTo(px, py);
      for (var q = 0; q < 4; q++) {
        px += (R() - 0.5) * 0.18 * s - cracks[k][0] * 0.05 * s;
        py += (R() - 0.4) * 0.16 * s;
        c.lineTo(px, py);
      }
      c.stroke();
    }
    c.strokeStyle = 'rgba(70,40,110,0.35)';
    c.lineWidth = s * 0.016;
    for (i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      c.beginPath();
      c.moveTo(side * 0.93 * s, -0.35 * s);
      c.quadraticCurveTo(side * 0.74 * s, -0.55 * s, side * 0.72 * s, -0.85 * s);
      c.moveTo(side * 0.8 * s, -0.5 * s);
      c.lineTo(side * 0.62 * s, -0.47 * s);
      c.stroke();
    }
    c.restore();
    facePath();
    ink(c, s * 0.03);

    // ---- eyes
    var ey = -0.12 * s, ex = 0.4 * s;
    var up = (scream ? 0.25 : 0.15) * s, dn = (scream ? 0.15 : 0.1) * s;
    var eyes = [];
    for (i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      var x = side * ex;
      var sock = c.createRadialGradient(x, ey, 0, x, ey, 0.42 * s);
      sock.addColorStop(0, 'rgba(8,0,6,0.92)');
      sock.addColorStop(0.6, 'rgba(25,5,20,0.6)');
      sock.addColorStop(1, 'rgba(25,5,20,0)');
      c.fillStyle = sock;
      c.beginPath(); c.ellipse(x, ey + 0.04 * s, 0.42 * s, 0.32 * s, 0, 0, TWO_PI); c.fill();

      var inner = x - side * 0.24 * s, outer = x + side * 0.26 * s, oy = ey - 0.04 * s;
      var eyePath = function () {
        c.beginPath();
        c.moveTo(inner, ey);
        c.quadraticCurveTo(x, ey - up * 1.6, outer, oy);
        c.quadraticCurveTo(x, ey + dn * 1.6, inner, ey);
        c.closePath();
      };
      eyePath();
      c.fillStyle = scream ? '#e8e0d4' : '#cfc8bf';
      c.fill();
      c.save();
      eyePath();
      c.clip();
      c.strokeStyle = 'rgba(160,20,35,0.7)';
      c.lineWidth = s * 0.012;
      for (k = 0; k < 6; k++) {
        var vx = k % 2 ? inner : outer;
        c.beginPath();
        c.moveTo(vx, ey + (R() - 0.5) * 0.06 * s);
        c.lineTo(vx + (x - vx) * (0.3 + R() * 0.35), ey + (R() - 0.5) * 0.1 * s);
        c.stroke();
      }
      softSpot(c, x, ey - up * 0.6, 0.3 * s, up, [40, 20, 30], 0.45);
      c.shadowColor = TOON.glow;
      c.shadowBlur = s * 0.3;
      var ig = c.createRadialGradient(x, ey, 0, x, ey, 0.1 * s);
      ig.addColorStop(0, '#ffffff');
      ig.addColorStop(0.35, TOON.glow);
      ig.addColorStop(1, 'rgba(' + TOON.glowRGB.join(',') + ',0)');
      c.fillStyle = ig;
      c.beginPath(); c.arc(x, ey, 0.1 * s, 0, TWO_PI); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#000';
      c.beginPath(); c.arc(x, ey, (scream ? 0.018 : 0.025) * s, 0, TWO_PI); c.fill();
      c.restore();
      // heavy kajal on the upper lid with a sharp wing, reddened lower lid
      c.beginPath();
      c.moveTo(inner, ey);
      c.quadraticCurveTo(x, ey - up * 1.65, outer, oy);
      c.lineTo(outer + side * 0.14 * s, oy - 0.1 * s);
      ink(c, s * 0.05);
      c.beginPath();
      c.moveTo(inner, ey);
      c.quadraticCurveTo(x, ey + dn * 1.6, outer, oy);
      c.strokeStyle = 'rgba(140,10,30,0.85)';
      c.lineWidth = s * 0.022;
      c.stroke();
      // thin, menacing brow
      c.beginPath();
      c.moveTo(x - side * 0.26 * s, ey - 0.24 * s);
      c.quadraticCurveTo(x + side * 0.05 * s, ey - 0.44 * s, x + side * 0.3 * s, ey - 0.36 * s);
      ink(c, s * 0.045);
      // kajal running down like black tears
      for (k = 0; k < 2; k++) {
        var tx = x + (k - 0.5) * 0.12 * s, ty = ey + dn * 1.1;
        var len = (0.5 + R() * 0.45 + (scream ? 0.25 : 0)) * s;
        c.beginPath();
        c.moveTo(tx, ty);
        c.bezierCurveTo(tx + 0.04 * s, ty + len * 0.35, tx - 0.04 * s, ty + len * 0.7, tx + 0.02 * s, ty + len);
        c.strokeStyle = 'rgba(10,2,8,0.75)';
        c.lineWidth = s * (0.028 - k * 0.008);
        c.stroke();
        c.fillStyle = 'rgba(10,2,8,0.75)';
        c.beginPath(); c.arc(tx + 0.02 * s, ty + len, s * 0.022, 0, TWO_PI); c.fill();
      }
      if (i === 1) { bloodStreak(c, x - 0.08 * s, ey + dn * 1.1, 0.42 * s, s * 0.025, s * 0.03); }
      eyes.push([cx + x, cy + ey]);
    }

    // ---- a human nose and the nath with its chain to the ear
    c.strokeStyle = rgba(sD, 0.45);
    c.lineWidth = s * 0.035;
    c.beginPath(); c.moveTo(-0.1 * s, -0.02 * s); c.quadraticCurveTo(-0.14 * s, 0.25 * s, -0.12 * s, 0.42 * s); c.stroke();
    softSpot(c, 0.0, 0.47 * s, 0.12 * s, 0.1 * s, sL, 0.6);
    c.beginPath();
    c.moveTo(-0.12 * s, 0.44 * s); c.quadraticCurveTo(-0.2 * s, 0.53 * s, -0.1 * s, 0.57 * s);
    c.moveTo(0.12 * s, 0.44 * s); c.quadraticCurveTo(0.2 * s, 0.53 * s, 0.1 * s, 0.57 * s);
    ink(c, s * 0.022);
    c.fillStyle = 'rgba(20,6,12,0.85)';
    c.beginPath(); c.ellipse(-0.065 * s, 0.56 * s, 0.045 * s, 0.02 * s, -0.25, 0, TWO_PI); c.fill();
    c.beginPath(); c.ellipse(0.065 * s, 0.56 * s, 0.045 * s, 0.02 * s, 0.25, 0, TWO_PI); c.fill();
    c.beginPath();
    c.arc(0.11 * s, 0.6 * s, 0.12 * s, -2.3, 1.9);
    c.strokeStyle = TOON.gold;
    c.lineWidth = s * 0.03;
    c.stroke();
    bead(c, 0.11 * s + Math.cos(1.2) * 0.12 * s, 0.6 * s + Math.sin(1.2) * 0.12 * s, s * 0.035, TOON.ruby);
    beadChain(c, 0.23 * s, 0.55 * s, 0.95 * s, 0.12 * s, 0.22 * s, 9, s * 0.018, TOON.gold);

    // ---- mouth
    var my = 0.9 * s;
    if (!scream) {
      // a thin, closed-lip smile that is just slightly wrong
      c.fillStyle = TOON.lips;
      c.beginPath();
      c.moveTo(-0.32 * s, my - 0.04 * s);
      c.quadraticCurveTo(-0.15 * s, my - 0.12 * s, -0.04 * s, my - 0.08 * s);
      c.quadraticCurveTo(0, my - 0.05 * s, 0.04 * s, my - 0.08 * s);
      c.quadraticCurveTo(0.15 * s, my - 0.12 * s, 0.34 * s, my - 0.07 * s);
      c.quadraticCurveTo(0.1 * s, my + 0.18 * s, -0.32 * s, my - 0.04 * s);
      c.fill();
      c.beginPath();
      c.moveTo(-0.36 * s, my - 0.08 * s);
      c.quadraticCurveTo(0, my + 0.06 * s, 0.38 * s, my - 0.12 * s);
      ink(c, s * 0.03);
      softSpot(c, 0, my + 0.2 * s, 0.18 * s, 0.06 * s, sD, 0.5);
      bloodStreak(c, 0.33 * s, my - 0.06 * s, 0.38 * s, s * 0.028, s * 0.025);
    } else {
      // jaw dropped far too wide
      var top = 0.72 * s, bot = chin - 0.2 * s;
      var mouth = function () {
        c.beginPath();
        c.moveTo(-0.4 * s, top);
        c.quadraticCurveTo(0, top - 0.12 * s, 0.4 * s, top);
        c.bezierCurveTo(0.5 * s, (top + bot) / 2, 0.26 * s, bot, 0, bot);
        c.bezierCurveTo(-0.26 * s, bot, -0.5 * s, (top + bot) / 2, -0.4 * s, top);
        c.closePath();
      };
      mouth();
      var mg = c.createRadialGradient(0, (top + bot) / 2, 0, 0, (top + bot) / 2, (bot - top) * 0.7);
      mg.addColorStop(0, '#000000');
      mg.addColorStop(1, '#2a030b');
      c.fillStyle = mg;
      c.fill();
      c.save();
      mouth();
      c.clip();
      c.fillStyle = '#5a0a18';
      c.beginPath(); c.ellipse(0, bot, 0.26 * s, 0.16 * s, 0, 0, TWO_PI); c.fill();
      // human teeth, with two long canines
      for (k = -4; k <= 4; k++) {
        var tw = 0.085 * s, txx = k * tw;
        var tl = (Math.abs(k) === 3 ? 0.2 : 0.1) * s;
        c.fillStyle = '#e9e1cc';
        c.beginPath();
        c.moveTo(txx - tw * 0.45, top - 0.12 * s);
        c.lineTo(txx + tw * 0.45, top - 0.12 * s);
        c.lineTo(txx + tw * 0.4, top - 0.06 * s + tl);
        c.quadraticCurveTo(txx, top - 0.02 * s + tl + (Math.abs(k) === 3 ? 0.04 * s : 0), txx - tw * 0.4, top - 0.06 * s + tl);
        c.closePath();
        c.fill();
        c.strokeStyle = 'rgba(60,40,20,0.6)'; c.lineWidth = s * 0.008; c.stroke();
        if (Math.abs(k) <= 3) {
          c.fillStyle = '#d8cfb8';
          c.fillRect(txx - tw * 0.42, bot - 0.1 * s - (Math.abs(k) === 3 ? 0.06 * s : 0), tw * 0.84, 0.12 * s);
        }
      }
      c.restore();
      mouth();
      c.strokeStyle = TOON.lips;
      c.lineWidth = s * 0.06;
      c.stroke();
      ink(c, s * 0.025);
      bloodStreak(c, -0.3 * s, bot - 0.04 * s, 0.32 * s, s * 0.035, s * 0.03);
      bloodStreak(c, 0.28 * s, bot - 0.02 * s, 0.22 * s, s * 0.03, -s * 0.03);
    }

    // smeared bindi
    bead(c, 0, -0.66 * s, s * 0.05, TOON.ruby);
    bloodStreak(c, 0, -0.61 * s, 0.16 * s, s * 0.02, s * 0.01);
    c.restore();
    return { eyes: eyes, ear: 0.96 * s };
  }

  // ---------------------------------------------------------------- long ghost hair
  function drawGhostHairBack(c, cx, cy, s, bottom, sway) {
    c.beginPath();
    c.moveTo(cx - 0.98 * s, cy - 0.1 * s);
    c.bezierCurveTo(cx - 1.25 * s, cy - 1.75 * s, cx + 1.25 * s, cy - 1.75 * s, cx + 0.98 * s, cy - 0.1 * s);
    c.bezierCurveTo(cx + 1.5 * s, cy + 1.5 * s, cx + 1.4 * s + sway, bottom - 0.8 * s, cx + 1.45 * s + sway, bottom);
    for (var k = 0; k <= 8; k++) {
      var bx = cx + 1.45 * s - k * (2.9 * s / 8) + sway;
      c.lineTo(bx, bottom + (k % 2 ? 0.25 * s : 0));
    }
    c.bezierCurveTo(cx - 1.4 * s + sway, bottom - 0.8 * s, cx - 1.5 * s, cy + 1.5 * s, cx - 0.98 * s, cy - 0.1 * s);
    c.closePath();
    c.fillStyle = TOON.hair;
    c.fill();
    ink(c, s * 0.03);
    c.strokeStyle = TOON.hairHi;
    c.globalAlpha = 0.35;
    c.lineWidth = s * 0.02;
    for (k = 0; k < 16; k++) {
      var hx = cx + (k / 15 - 0.5) * 2.4 * s;
      c.beginPath();
      c.moveTo(cx + (k / 15 - 0.5) * 1.4 * s, cy - 1.3 * s);
      c.quadraticCurveTo(hx * 1.0 + (hx - cx) * 0.25, cy + 1.2 * s, hx + (hx - cx) * 0.15 + sway, bottom - 0.2 * s);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  function drawGhostHairFront(c, cx, cy, s, bottom, sway) {
    var i, side;
    for (i = 0; i < 2; i++) {
      side = i === 0 ? -1 : 1;
      c.beginPath();
      c.moveTo(cx, cy - 1.45 * s);
      c.bezierCurveTo(cx + side * 0.75 * s, cy - 1.45 * s, cx + side * 1.08 * s, cy - 0.95 * s, cx + side * 1.04 * s, cy - 0.2 * s);
      c.bezierCurveTo(cx + side * 1.02 * s, cy + 0.8 * s, cx + side * 1.15 * s + sway, cy + 1.8 * s, cx + side * 1.1 * s + sway, bottom);
      c.lineTo(cx + side * 0.82 * s + sway, bottom - 0.15 * s);
      c.lineTo(cx + side * 0.7 * s + sway * 0.6, bottom + 0.05 * s);
      c.bezierCurveTo(cx + side * 0.7 * s, cy + 1.6 * s, cx + side * 0.68 * s, cy + 0.9 * s, cx + side * 0.74 * s, cy + 0.2 * s);
      c.bezierCurveTo(cx + side * 0.8 * s, cy - 0.5 * s, cx + side * 0.55 * s, cy - 1.05 * s, cx + side * 0.03 * s, cy - 1.12 * s);
      c.closePath();
      c.fillStyle = TOON.hair;
      c.fill();
      ink(c, s * 0.03);
      c.strokeStyle = TOON.hairHi;
      c.globalAlpha = 0.4;
      c.lineWidth = s * 0.022;
      for (var k = 0; k < 4; k++) {
        c.beginPath();
        c.moveTo(cx + side * (0.15 + k * 0.18) * s, cy - 1.35 * s + k * 0.04 * s);
        c.quadraticCurveTo(cx + side * (0.95 + k * 0.03) * s, cy - 0.6 * s, cx + side * (0.88 + k * 0.05) * s + sway * 0.6, cy + (0.9 + k * 0.4) * s);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    // a few lank strands falling across the face
    var strands = [[-0.12, -1.1, -0.45, 0.0, -0.38, 1.2], [-0.05, -1.12, -0.18, 0.2, -0.22, 0.95], [0.1, -1.1, 0.42, 0.3, 0.32, 1.35], [0.2, -1.05, 0.62, 0.1, 0.58, 1.1]];
    c.strokeStyle = TOON.hair;
    for (var st = 0; st < strands.length; st++) {
      var S2 = strands[st];
      c.lineWidth = s * (0.035 - st * 0.004);
      c.beginPath();
      c.moveTo(cx + S2[0] * s, cy + S2[1] * s);
      c.quadraticCurveTo(cx + S2[2] * s + sway * 0.3, cy + S2[3] * s, cx + S2[4] * s + sway * 0.5, cy + S2[5] * s);
      c.stroke();
    }
    // sindoor in the parting, maang tikka chain and pendant
    c.beginPath(); c.moveTo(cx, cy - 1.46 * s); c.lineTo(cx, cy - 1.12 * s);
    c.strokeStyle = '#c0182c'; c.lineWidth = s * 0.05; c.stroke();
    beadChain(c, cx, cy - 1.46 * s, cx, cy - 1.0 * s, 0, 4, s * 0.025, TOON.gold);
    c.beginPath();
    c.moveTo(cx, cy - 1.0 * s);
    c.quadraticCurveTo(cx + 0.12 * s, cy - 0.88 * s, cx, cy - 0.76 * s);
    c.quadraticCurveTo(cx - 0.12 * s, cy - 0.88 * s, cx, cy - 1.0 * s);
    c.fillStyle = TOON.gold; c.fill();
    ink(c, s * 0.02);
    bead(c, cx, cy - 0.89 * s, s * 0.042, TOON.ruby);
    bead(c, cx, cy - 0.72 * s, s * 0.026, TOON.pearl);
    beadChain(c, cx - 0.04 * s, cy - 1.28 * s, cx - 0.72 * s, cy - 0.98 * s, 0.1 * s, 6, s * 0.018, TOON.gold);
    beadChain(c, cx + 0.04 * s, cy - 1.28 * s, cx + 0.72 * s, cy - 0.98 * s, 0.1 * s, 6, s * 0.018, TOON.gold);
  }

  function toonLimb(c, x1, y1, x2, y2, w1, w2, fill, shade) {
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var nx = -Math.sin(ang), ny = Math.cos(ang);
    c.beginPath();
    c.moveTo(x1 + nx * w1, y1 + ny * w1);
    c.lineTo(x2 + nx * w2, y2 + ny * w2);
    c.arc(x2, y2, w2, ang + Math.PI / 2, ang - Math.PI / 2, true);
    c.lineTo(x1 - nx * w1, y1 - ny * w1);
    c.arc(x1, y1, w1, ang - Math.PI / 2, ang + Math.PI / 2, true);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.save();
    c.clip();
    c.beginPath();
    c.moveTo(x1 - nx * w1 * 0.2, y1 - ny * w1 * 0.2);
    c.lineTo(x2 - nx * w2 * 0.2, y2 - ny * w2 * 0.2);
    c.lineTo(x2 - nx * w2 * 2, y2 - ny * w2 * 2);
    c.lineTo(x1 - nx * w1 * 2, y1 - ny * w1 * 2);
    c.closePath();
    c.fillStyle = shade;
    c.fill();
    c.restore();
    c.beginPath();
    c.moveTo(x1 + nx * w1, y1 + ny * w1);
    c.lineTo(x2 + nx * w2, y2 + ny * w2);
    c.arc(x2, y2, w2, ang + Math.PI / 2, ang - Math.PI / 2, true);
    c.lineTo(x1 - nx * w1, y1 - ny * w1);
    ink(c, 3.5);
  }

  function drawClawHand(c, x, y, ang, s) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.beginPath(); c.ellipse(s * 0.3, 0, s * 0.36, s * 0.28, 0, 0, TWO_PI);
    c.fillStyle = TOON.skin; c.fill(); ink(c, 3);
    var fingers = [-0.22, -0.07, 0.08, 0.22];
    for (var f = 0; f < fingers.length; f++) {
      var fy = fingers[f] * s;
      c.beginPath();
      c.moveTo(s * 0.55, fy);
      c.quadraticCurveTo(s * 0.95, fy - s * 0.05, s * 1.15, fy + s * 0.12);
      c.strokeStyle = INK; c.lineWidth = s * 0.16; c.stroke();
      c.strokeStyle = TOON.skin; c.lineWidth = s * 0.1; c.stroke();
      c.beginPath();
      c.moveTo(s * 1.12, fy + s * 0.1);
      c.lineTo(s * 1.32, fy + s * 0.24);
      c.strokeStyle = '#4a0614'; c.lineWidth = s * 0.07; c.stroke();
    }
    c.beginPath();
    c.moveTo(s * 0.2, -s * 0.22);
    c.quadraticCurveTo(s * 0.45, -s * 0.5, s * 0.72, -s * 0.46);
    c.strokeStyle = INK; c.lineWidth = s * 0.17; c.stroke();
    c.strokeStyle = TOON.skin; c.lineWidth = s * 0.11; c.stroke();
    c.restore();
  }

  function drawToonBangles(c, x, y, ang, r) {
    var colors = [TOON.ruby, TOON.gold, TOON.ruby, TOON.gold, '#1e7a46', TOON.gold];
    for (var b = 0; b < colors.length; b++) {
      var off = (b - 2.5) * r * 0.36;
      c.save();
      c.translate(x + Math.cos(ang) * off, y + Math.sin(ang) * off);
      c.rotate(ang);
      c.beginPath(); c.ellipse(0, 0, r * 0.32, r * 1.15, 0, 0, TWO_PI);
      c.strokeStyle = INK; c.lineWidth = r * 0.42; c.stroke();
      c.strokeStyle = colors[b]; c.lineWidth = r * 0.26; c.stroke();
      c.restore();
    }
  }

  function paintGhost(frame, frames, kind) {
    TOON = PALETTES[kind] || PALETTES.manjulika;
    var W = 320, H = 640, cx = 160, SR = 2;
    var cv = makeCanvas(W * SR, H * SR);
    var c = cv.getContext('2d');
    c.scale(SR, SR);
    var phase = TWO_PI * frame / frames;
    var sway = Math.sin(phase) * 6;
    var s = 38, fy = 108;
    var k;

    var aura = c.createRadialGradient(cx, 300, 20, cx, 300, 250);
    aura.addColorStop(0, 'rgba(' + TOON.aura.join(',') + ',0.3)');
    aura.addColorStop(1, 'rgba(' + TOON.aura.join(',') + ',0)');
    c.fillStyle = aura;
    c.fillRect(0, 0, W, H);

    drawGhostHairBack(c, cx, fy, s, 370, sway);

    // the pallu hanging down her back, lifting in a cold wind
    c.beginPath();
    c.moveTo(cx - 54, 186);
    c.bezierCurveTo(cx - 92, 230, cx - 104 + sway, 330, cx - 96 + sway * 1.4, 440);
    c.lineTo(cx - 72 + sway, 432);
    c.bezierCurveTo(cx - 74, 330, cx - 66, 250, cx - 40, 200);
    c.closePath();
    c.fillStyle = TOON.sariShade; c.fill(); ink(c, 2);
    c.beginPath(); c.moveTo(cx - 96 + sway * 1.4, 438); c.lineTo(cx - 72 + sway, 430);
    c.strokeStyle = TOON.border; c.lineWidth = 7; c.stroke();

    // full-length sari, tattered at the hem, floating above the floor
    var hem = [];
    for (k = 0; k <= 12; k++) {
      hem.push([cx - 72 + k * 12 + sway * 0.4, 598 + (k % 2 ? 10 : -4) + Math.sin(phase * 2 + k) * 3]);
    }
    function skirtPath() {
      c.beginPath();
      c.moveTo(cx - 42, 262);
      c.bezierCurveTo(cx - 58, 300, cx - 60, 420, hem[0][0], hem[0][1]);
      for (var h = 1; h < hem.length; h++) { c.lineTo(hem[h][0], hem[h][1]); }
      c.bezierCurveTo(cx + 62, 420, cx + 58, 300, cx + 42, 262);
      c.closePath();
    }
    skirtPath();
    var sg = c.createLinearGradient(cx - 72, 0, cx + 72, 0);
    sg.addColorStop(0, TOON.sariShade);
    sg.addColorStop(0.3, TOON.sari);
    sg.addColorStop(0.6, TOON.sari);
    sg.addColorStop(1, TOON.sariShade);
    c.fillStyle = sg;
    c.fill();
    c.save();
    c.clip();
    // front pleats
    for (k = 0; k < 7; k++) {
      var x0 = cx - 14 + k * 4.5, x1 = cx - 34 + k * 11 + sway * 0.5;
      c.beginPath(); c.moveTo(x0, 268); c.lineTo(x1, 610);
      c.strokeStyle = k % 2 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
      c.lineWidth = 3; c.stroke();
    }
    var stains = [[cx - 26, 380, 12], [cx + 30, 470, 10], [cx - 8, 540, 9]];
    for (k = 0; k < stains.length; k++) {
      c.fillStyle = TOON.blood;
      c.globalAlpha = 0.7;
      c.beginPath();
      for (var sp = 0; sp < 10; sp++) {
        var sa = sp / 10 * TWO_PI;
        var sr = stains[k][2] * (0.6 + 0.5 * Math.abs(Math.sin(sp * 2.7 + k)));
        if (sp === 0) { c.moveTo(stains[k][0] + Math.cos(sa) * sr, stains[k][1] + Math.sin(sa) * sr); }
        else { c.lineTo(stains[k][0] + Math.cos(sa) * sr, stains[k][1] + Math.sin(sa) * sr); }
      }
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
    }
    // border band near the hem
    c.beginPath();
    c.moveTo(cx - 75, 560);
    c.quadraticCurveTo(cx, 574, cx + 78, 558);
    c.strokeStyle = TOON.border; c.lineWidth = 12; c.stroke();
    c.strokeStyle = TOON.gold; c.lineWidth = 2; c.stroke();
    c.restore();
    skirtPath();
    ink(c, 2.2);

    // blouse, bare midriff
    c.beginPath();
    c.moveTo(cx - 58, 194);
    c.quadraticCurveTo(cx - 40, 180, cx - 16, 178);
    c.lineTo(cx + 16, 178);
    c.quadraticCurveTo(cx + 40, 180, cx + 58, 194);
    c.lineTo(cx + 46, 244); c.lineTo(cx - 46, 244);
    c.closePath();
    c.fillStyle = TOON.blouse; c.fill(); ink(c, 2.2);
    c.beginPath();
    c.moveTo(cx - 46, 244); c.lineTo(cx + 46, 244); c.lineTo(cx + 42, 264); c.lineTo(cx - 42, 264);
    c.closePath();
    c.fillStyle = TOON.skinShade; c.fill(); ink(c, 2);
    // neckline
    c.beginPath();
    c.moveTo(cx - 22, 178); c.quadraticCurveTo(cx, 214, cx + 22, 178);
    c.closePath();
    c.fillStyle = TOON.skin; c.fill(); ink(c, 1.8);

    // the pallu across the chest, from the right hip to the left shoulder
    c.beginPath();
    c.moveTo(cx + 44, 268); c.lineTo(cx + 16, 270); c.lineTo(cx - 58, 196); c.lineTo(cx - 30, 180);
    c.closePath();
    c.fillStyle = TOON.sari; c.fill(); ink(c, 2);
    for (k = 1; k < 4; k++) {
      c.beginPath();
      c.moveTo(cx - 58 + k * 7, 196 - k * 4); c.lineTo(cx + 16 + k * 7, 270 - k * 0.5);
      c.strokeStyle = k % 2 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)'; c.lineWidth = 2; c.stroke();
    }
    c.beginPath(); c.moveTo(cx - 30, 182); c.lineTo(cx + 42, 266);
    c.strokeStyle = TOON.border; c.lineWidth = 6; c.stroke();
    c.strokeStyle = TOON.gold; c.lineWidth = 1.5; c.stroke();

    // long arms reaching forward, claws out
    var arms = [
      { s: [cx - 56, 198], e: [cx - 82, 268], w: [cx - 106, 318 + sway * 0.4] },
      { s: [cx + 56, 198], e: [cx + 84, 262], w: [cx + 112, 304 - sway * 0.4] }
    ];
    for (k = 0; k < arms.length; k++) {
      var A = arms[k];
      toonLimb(c, A.s[0], A.s[1], A.e[0], A.e[1], 8, 6.5, TOON.skin, TOON.skinShade);
      toonLimb(c, A.e[0], A.e[1], A.w[0], A.w[1], 6.5, 5, TOON.skin, TOON.skinShade);
      // short blouse sleeve
      toonLimb(c, A.s[0], A.s[1], A.s[0] + (A.e[0] - A.s[0]) * 0.32, A.s[1] + (A.e[1] - A.s[1]) * 0.32, 10, 9, TOON.blouse, TOON.blouseShade);
      var upAng = Math.atan2(A.e[1] - A.s[1], A.e[0] - A.s[0]);
      drawToonBangles(c, A.s[0] + (A.e[0] - A.s[0]) * 0.55, A.s[1] + (A.e[1] - A.s[1]) * 0.55, upAng, 3.5);
      var fa = Math.atan2(A.w[1] - A.e[1], A.w[0] - A.e[0]);
      drawToonBangles(c, A.e[0] + (A.w[0] - A.e[0]) * 0.75, A.e[1] + (A.w[1] - A.e[1]) * 0.75, fa, 5);
      drawClawHand(c, A.w[0], A.w[1], fa, 17);
    }

    // neck, choker, long haar
    c.beginPath();
    c.moveTo(cx - 12, fy + 40); c.lineTo(cx - 15, 184); c.lineTo(cx + 15, 184); c.lineTo(cx + 12, fy + 40);
    c.closePath();
    c.fillStyle = TOON.skin; c.fill(); ink(c, 1.8);
    c.fillStyle = TOON.skinShade;
    c.fillRect(cx - 11, fy + 50, 22, 8);
    c.beginPath();
    c.moveTo(cx - 14, 172); c.quadraticCurveTo(cx, 181, cx + 14, 172);
    c.strokeStyle = INK; c.lineWidth = 7; c.stroke();
    c.strokeStyle = TOON.gold; c.lineWidth = 4.5; c.stroke();
    for (k = -2; k <= 2; k++) { bead(c, cx + k * 5.5, 178 + (2 - Math.abs(k)) * 1.2, 2.3, k === 0 ? TOON.ruby : TOON.bangle3); }
    beadChain(c, cx - 18, 184, cx + 18, 184, 40, 16, 2, TOON.gold);
    c.beginPath();
    c.moveTo(cx - 7, 222); c.lineTo(cx + 7, 222); c.lineTo(cx, 235); c.closePath();
    c.fillStyle = TOON.gold; c.fill(); ink(c, 1.5);
    bead(c, cx, 226, 2.6, TOON.ruby);

    var face = drawScaryFace(c, cx, fy, s, false);
    drawGhostHairFront(c, cx, fy, s, 330, sway);
    drawToonJhumka(c, cx - face.ear - 2, fy + 0.2 * s, s * 0.9, Math.sin(phase) * 0.15);
    drawToonJhumka(c, cx + face.ear + 2, fy + 0.2 * s, s * 0.9, -Math.sin(phase) * 0.15);

    // she floats: the hem dissolves into mist
    c.globalCompositeOperation = 'destination-out';
    var fade = c.createLinearGradient(0, 500, 0, H);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,0.95)');
    c.fillStyle = fade;
    c.fillRect(0, 500, W, H - 500);
    c.globalCompositeOperation = 'source-over';

    return { canvas: cv, eyes: [[face.eyes[0][0] / W, face.eyes[0][1] / H], [face.eyes[1][0] / W, face.eyes[1][1] / H]] };
  }

  // ================================================================== PLAYERS
  // Two modern visitors to choose from, each lighting the way with a phone torch.
  var PLAYER_SKIN = [[206, 152, 112], [176, 120, 82], [112, 68, 44]];

  function drawSneaker(c, x, y, s, flip) {
    var d = flip ? -1 : 1;
    c.save();
    c.translate(x, y);
    c.scale(d, 1);
    // chunky sole
    c.fillStyle = '#b9b6b0';
    c.beginPath();
    c.moveTo(-s * 0.5, 0); c.lineTo(s * 0.95, 0);
    c.quadraticCurveTo(s * 1.1, -s * 0.05, s * 1.0, -s * 0.22);
    c.lineTo(-s * 0.5, -s * 0.22);
    c.closePath();
    c.fill();
    // white upper
    var g = c.createLinearGradient(0, -s * 0.8, 0, -s * 0.2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#d9d6d0');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-s * 0.45, -s * 0.2);
    c.lineTo(-s * 0.42, -s * 0.78);
    c.quadraticCurveTo(-s * 0.1, -s * 0.86, s * 0.15, -s * 0.7);
    c.quadraticCurveTo(s * 0.7, -s * 0.5, s * 0.98, -s * 0.24);
    c.closePath();
    c.fill();
    // laces and a coloured stripe
    c.strokeStyle = 'rgba(120,120,120,0.8)';
    c.lineWidth = s * 0.04;
    for (var k = 0; k < 4; k++) {
      c.beginPath();
      c.moveTo(-s * 0.05 + k * s * 0.12, -s * 0.72 + k * s * 0.08);
      c.lineTo(s * 0.12 + k * s * 0.12, -s * 0.66 + k * s * 0.08);
      c.stroke();
    }
    c.strokeStyle = '#c0392b';
    c.lineWidth = s * 0.07;
    c.beginPath();
    c.moveTo(-s * 0.3, -s * 0.35);
    c.quadraticCurveTo(s * 0.2, -s * 0.48, s * 0.6, -s * 0.3);
    c.stroke();
    c.restore();
  }

  // Denim legs from the hips to the ankles; ripped knees if asked.
  function drawJeans(c, cx, top, hipW, legGap, footY, dark, mid, light, ripped, R) {
    var legs = [-1, 1];
    for (var i = 0; i < 2; i++) {
      var side = legs[i];
      var hx = cx + side * (legGap + hipW * 0.5);
      var kx = cx + side * (legGap + hipW * 0.55);
      var ax = cx + side * (legGap + hipW * 0.55);
      limb(c, hx, top + 12, kx, top + 140, hipW * 0.66, hipW * 0.48, dark, mid, light);
      limb(c, kx, top + 140, ax, footY - 18, hipW * 0.48, hipW * 0.38, dark, mid, light);
      // outer seam
      stroke(c, rgba(light, 0.55), 1.3,
        [hx + side * hipW * 0.6, top + 18, kx + side * hipW * 0.44, top + 140, ax + side * hipW * 0.35, footY - 20]);
      // knee shine and ankle creases
      softSpot(c, kx, top + 140, hipW * 0.28, hipW * 0.4, light, 0.35);
      for (var q = 0; q < 3; q++) {
        var yy = footY - 32 + q * 6;
        stroke(c, rgba(dark, 0.7), 1.2, [ax - hipW * 0.36, yy, ax, yy + 3, ax + hipW * 0.36, yy]);
      }
      if (ripped) {
        c.fillStyle = 'rgba(225,220,210,0.85)';
        c.beginPath(); c.ellipse(kx, top + 138, hipW * 0.2, hipW * 0.11, 0, 0, TWO_PI); c.fill();
        for (var th = 0; th < 4; th++) {
          stroke(c, 'rgba(240,238,232,0.9)', 1, [kx - hipW * 0.2, top + 133 + th * 3, kx + hipW * 0.2, top + 133 + th * 3]);
        }
      }
    }
    // seat / crotch
    var g = c.createLinearGradient(cx - hipW, 0, cx + hipW, 0);
    g.addColorStop(0, rgba(dark, 1));
    g.addColorStop(0.5, rgba(mid, 1));
    g.addColorStop(1, rgba(dark, 1));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(cx - legGap - hipW * 0.95, top);
    c.lineTo(cx + legGap + hipW * 0.95, top);
    c.lineTo(cx + legGap + hipW * 0.95, top + 50);
    c.lineTo(cx, top + 62);
    c.lineTo(cx - legGap - hipW * 0.95, top + 50);
    c.closePath();
    c.fill();
    stroke(c, rgba(light, 0.6), 1.2, [cx, top + 4, cx + 2, top + 30, cx, top + 54]);
    // waistband and belt loops
    c.fillStyle = rgba(dark, 1);
    c.fillRect(cx - legGap - hipW * 0.95, top - 2, (legGap + hipW * 0.95) * 2, 9);
    c.fillStyle = rgba(light, 0.8);
    for (var b = -2; b <= 2; b++) { c.fillRect(cx + b * hipW * 0.42 - 1.5, top - 2, 3, 10); }
  }

  // The hand that holds the phone, with the torch LED at the top.
  function drawPhoneHand(c, x, y, s) {
    c.save();
    c.translate(x, y);
    c.rotate(-0.25);
    c.fillStyle = '#121418';
    c.beginPath();
    c.moveTo(-s * 0.32, -s * 0.9); c.lineTo(s * 0.32, -s * 0.9);
    c.lineTo(s * 0.32, s * 0.3); c.lineTo(-s * 0.32, s * 0.3);
    c.closePath();
    c.fill();
    c.strokeStyle = '#3a3e46';
    c.lineWidth = s * 0.06;
    c.stroke();
    c.fillStyle = '#2b2f37';
    c.beginPath(); c.arc(-s * 0.12, -s * 0.72, s * 0.08, 0, TWO_PI); c.fill();
    c.fillStyle = '#fffbe8';
    c.beginPath(); c.arc(s * 0.1, -s * 0.72, s * 0.06, 0, TWO_PI); c.fill();
    // fingers wrapped around the phone
    var g = c.createLinearGradient(-s * 0.4, 0, s * 0.4, 0);
    g.addColorStop(0, rgba(PLAYER_SKIN[2], 1));
    g.addColorStop(0.5, rgba(PLAYER_SKIN[1], 1));
    g.addColorStop(1, rgba(PLAYER_SKIN[0], 1));
    c.fillStyle = g;
    c.beginPath(); c.ellipse(0, s * 0.1, s * 0.42, s * 0.3, 0, 0, TWO_PI); c.fill();
    c.strokeStyle = rgba(PLAYER_SKIN[2], 0.8);
    c.lineWidth = s * 0.03;
    for (var f = 0; f < 3; f++) {
      c.beginPath(); c.moveTo(-s * 0.3, -s * 0.02 + f * s * 0.1); c.lineTo(s * 0.3, -s * 0.02 + f * s * 0.1); c.stroke();
    }
    c.fillStyle = rgba(PLAYER_SKIN[1], 1);
    c.beginPath(); c.ellipse(-s * 0.35, -s * 0.3, s * 0.1, s * 0.25, 0.3, 0, TWO_PI); c.fill();
    c.restore();
    var lx = x + Math.cos(-0.25 - Math.PI / 2) * s * 0.74 + Math.cos(-0.25) * s * 0.1;
    var ly = y + Math.sin(-0.25 - Math.PI / 2) * s * 0.74 + Math.sin(-0.25) * s * 0.1;
    return [lx, ly];
  }

  function drawModernMaleHair(c, cx, cy, u, R) {
    // short faded sides
    var sideG = c.createLinearGradient(0, cy - 1.0 * u, 0, cy - 0.2 * u);
    sideG.addColorStop(0, 'rgba(25,16,10,0.95)');
    sideG.addColorStop(1, 'rgba(60,40,28,0.35)');
    c.fillStyle = sideG;
    c.fillRect(cx - 1.02 * u, cy - 1.0 * u, 0.2 * u, 0.75 * u);
    c.fillRect(cx + 0.82 * u, cy - 1.0 * u, 0.2 * u, 0.75 * u);
    // volume on top, swept up and to the side
    c.fillStyle = '#140d09';
    c.beginPath();
    c.moveTo(cx - 1.0 * u, cy - 0.85 * u);
    c.quadraticCurveTo(cx - 1.08 * u, cy - 1.75 * u, cx - 0.2 * u, cy - 1.95 * u);
    c.quadraticCurveTo(cx + 0.75 * u, cy - 2.05 * u, cx + 1.05 * u, cy - 1.35 * u);
    c.quadraticCurveTo(cx + 1.06 * u, cy - 1.0 * u, cx + 0.98 * u, cy - 0.85 * u);
    c.quadraticCurveTo(cx + 0.6 * u, cy - 1.22 * u, cx + 0.1 * u, cy - 1.2 * u);
    c.quadraticCurveTo(cx - 0.55 * u, cy - 1.18 * u, cx - 1.0 * u, cy - 0.85 * u);
    c.closePath();
    c.fill();
    c.lineCap = 'round';
    for (var k = 0; k < 170; k++) {
      var sx = cx + (R() * 1.8 - 0.95) * u;
      var sy = cy - (1.25 + R() * 0.55) * u;
      stroke(c, R() < 0.3 ? '#3b2a1f' : '#21160f', (0.015 + R() * 0.015) * u,
        [sx, sy, sx + (0.12 + R() * 0.12) * u, sy - (0.12 + R() * 0.15) * u]);
    }
    softSpot(c, cx - 0.2 * u, cy - 1.75 * u, 0.45 * u, 0.12 * u, [140, 120, 105], 0.3);
  }

  function drawPonytail(c, cx, cy, u, R) {
    // the ponytail, falling behind the right shoulder
    c.fillStyle = '#16100d';
    c.beginPath();
    c.moveTo(cx + 0.55 * u, cy - 1.25 * u);
    c.bezierCurveTo(cx + 1.6 * u, cy - 1.1 * u, cx + 1.5 * u, cy + 1.2 * u, cx + 1.25 * u, cy + 3.4 * u);
    c.quadraticCurveTo(cx + 0.95 * u, cy + 2.2 * u, cx + 0.75 * u, cy - 0.6 * u);
    c.closePath();
    c.fill();
    c.lineCap = 'round';
    for (var k = 0; k < 90; k++) {
      var t = R();
      stroke(c, R() < 0.3 ? '#3e2a1f' : '#241812', (0.012 + R() * 0.015) * u,
        [cx + 0.7 * u, cy - 1.15 * u, cx + (1.45 + R() * 0.2) * u, cy + 0.2 * u, cx + (0.95 + t * 0.35) * u, cy + (2.0 + t * 1.4) * u]);
    }
  }

  function drawFemaleHairFront(c, cx, cy, u, R) {
    var top = cy - 1.45 * u;
    c.fillStyle = '#16100d';
    c.beginPath();
    c.moveTo(cx - 1.02 * u, cy - 0.2 * u);
    c.quadraticCurveTo(cx - 1.12 * u, top - 0.05 * u, cx - 0.3 * u, top - 0.1 * u);
    c.quadraticCurveTo(cx + 0.9 * u, top - 0.08 * u, cx + 1.03 * u, cy - 0.35 * u);
    c.quadraticCurveTo(cx + 0.95 * u, cy - 1.0 * u, cx + 0.3 * u, cy - 1.12 * u);
    c.quadraticCurveTo(cx - 0.25 * u, cy - 1.2 * u, cx - 0.3 * u, top + 0.15 * u);
    c.quadraticCurveTo(cx - 0.75 * u, cy - 1.0 * u, cx - 0.88 * u, cy - 0.2 * u);
    c.closePath();
    c.fill();
    c.lineCap = 'round';
    for (var k = 0; k < 120; k++) {
      var side = R() < 0.35 ? -1 : 1;
      var ex = side < 0 ? cx - (0.85 + R() * 0.15) * u : cx + (0.8 + R() * 0.2) * u;
      stroke(c, R() < 0.3 ? '#4a3224' : '#271a13', (0.01 + R() * 0.012) * u,
        [cx - 0.3 * u, top - 0.02 * u, cx + side * 0.5 * u, top + 0.05 * u, ex, cy - (0.3 + R() * 0.7) * u]);
    }
    // face-framing strands
    stroke(c, '#1d140f', 0.04 * u, [cx - 0.9 * u, cy - 0.7 * u, cx - 1.02 * u, cy + 0.3 * u, cx - 0.88 * u, cy + 1.0 * u]);
    stroke(c, '#1d140f', 0.035 * u, [cx + 0.9 * u, cy - 0.7 * u, cx + 1.02 * u, cy + 0.2 * u, cx + 0.92 * u, cy + 0.8 * u]);
    // hair tie
    c.fillStyle = '#7a1f2b';
    c.beginPath(); c.ellipse(cx + 0.72 * u, cy - 1.2 * u, 0.1 * u, 0.14 * u, 0.5, 0, TWO_PI); c.fill();
    softSpot(c, cx + 0.2 * u, top + 0.1 * u, 0.5 * u, 0.12 * u, [170, 140, 120], 0.3);
  }

  function paintMale() {
    var W = 320, H = 640, cx = 160, SR = 2;
    var cv = makeCanvas(W * SR, H * SR);
    var c = cv.getContext('2d');
    c.scale(SR, SR);
    var R = seeded(4321);
    var u = 27, fy = 92;
    var HD = [24, 26, 31], HM = [51, 55, 63], HL = [80, 86, 98];

    drawJeans(c, cx, 330, 30, 3, 600, [26, 44, 78], [48, 82, 134], [92, 124, 178], false, R);
    drawSneaker(c, cx - 22, 604, 34, true);
    drawSneaker(c, cx + 22, 604, 34, false);

    // hoodie body
    var hg = c.createLinearGradient(cx - 80, 0, cx + 80, 0);
    hg.addColorStop(0, rgba(HD, 1));
    hg.addColorStop(0.35, rgba(HM, 1));
    hg.addColorStop(0.55, rgba(HL, 1));
    hg.addColorStop(1, rgba(HD, 1));
    c.fillStyle = hg;
    c.beginPath();
    c.moveTo(cx - 70, 172);
    c.quadraticCurveTo(cx - 40, 152, cx, 152);
    c.quadraticCurveTo(cx + 40, 152, cx + 70, 172);
    c.lineTo(cx + 64, 338);
    c.lineTo(cx - 64, 338);
    c.closePath();
    c.fill();
    // ribbed hem
    c.fillStyle = rgba(HD, 1);
    c.fillRect(cx - 64, 322, 128, 18);
    for (var k = 0; k < 32; k++) { stroke(c, rgba(HL, 0.25), 1, [cx - 62 + k * 4, 324, cx - 62 + k * 4, 338]); }
    // kangaroo pocket
    c.fillStyle = rgba(HD, 0.45);
    c.beginPath();
    c.moveTo(cx - 38, 252); c.lineTo(cx + 38, 252); c.lineTo(cx + 50, 318); c.lineTo(cx - 50, 318);
    c.closePath(); c.fill();
    stroke(c, rgba(HL, 0.5), 1.4, [cx - 38, 252, cx + 38, 252]);
    stroke(c, rgba([10, 10, 12], 0.7), 2, [cx - 38, 254, cx - 50, 316]);
    stroke(c, rgba([10, 10, 12], 0.7), 2, [cx + 38, 254, cx + 50, 316]);
    // folds
    var folds = [[cx - 48, 200, cx - 30, 240, cx - 44, 300], [cx + 44, 196, cx + 30, 236, cx + 44, 296], [cx - 10, 210, cx - 18, 240, cx - 8, 252]];
    for (k = 0; k < folds.length; k++) { stroke(c, rgba([12, 12, 15], 0.45), 2.2, folds[k]); }

    // left arm, relaxed
    limb(c, cx - 66, 178, cx - 80, 256, 16, 14, HD, HM, HL);
    limb(c, cx - 80, 256, cx - 84, 322, 14, 12, HD, HM, HL);
    c.fillStyle = rgba(HD, 1);
    c.fillRect(cx - 97, 314, 26, 14);
    drawHand(c, cx - 84, 330, Math.PI / 2 + 0.05, 27, PLAYER_SKIN, '#d6aa90');
    // right arm, raised, holding the phone torch
    limb(c, cx + 66, 178, cx + 86, 248, 16, 14, HD, HM, HL);
    limb(c, cx + 86, 248, cx + 106, 286, 14, 12, HD, HM, HL);
    var torch = drawPhoneHand(c, cx + 112, 292, 32);

    // hood bunched around the neck
    c.strokeStyle = rgba(HM, 1);
    c.lineWidth = 15;
    c.beginPath(); c.ellipse(cx, 156, 38, 15, 0, Math.PI * 0.95, Math.PI * 2.05, true); c.stroke();
    c.strokeStyle = rgba(HD, 0.8);
    c.lineWidth = 3;
    c.beginPath(); c.ellipse(cx, 160, 30, 10, 0, Math.PI * 0.95, Math.PI * 2.05, true); c.stroke();
    drawNeck(c, cx, fy, u, PLAYER_SKIN, false);
    // drawstrings
    stroke(c, '#d8d8d8', 2.5, [cx - 12, 168, cx - 14, 196, cx - 16, 226]);
    stroke(c, '#d8d8d8', 2.5, [cx + 12, 168, cx + 13, 196, cx + 15, 222]);
    c.fillStyle = '#9a9a9a';
    c.fillRect(cx - 18, 224, 4, 8);
    c.fillRect(cx + 13, 220, 4, 8);

    drawFace(c, cx, fy, u, { ghost: false, male: true, scream: false, rand: seeded(99) });
    drawModernMaleHair(c, cx, fy, u, R);
    return { canvas: cv, torch: [torch[0] / W, torch[1] / H] };
  }

  function paintFemale() {
    var W = 320, H = 640, cx = 160, SR = 2;
    var cv = makeCanvas(W * SR, H * SR);
    var c = cv.getContext('2d');
    c.scale(SR, SR);
    var R = seeded(8765);
    var u = 26, fy = 96;
    var JD = [46, 52, 32], JM = [91, 100, 64], JL = [126, 138, 92];

    drawPonytail(c, cx, fy, u, R);
    drawJeans(c, cx, 316, 27, 1, 600, [18, 18, 22], [40, 42, 50], [78, 82, 94], true, R);
    drawSneaker(c, cx - 18, 604, 30, true);
    drawSneaker(c, cx + 18, 604, 30, false);

    // white tee, tucked in
    var tg = c.createLinearGradient(cx - 50, 0, cx + 50, 0);
    tg.addColorStop(0, '#bdb9b2');
    tg.addColorStop(0.5, '#f4f2ee');
    tg.addColorStop(1, '#c9c5be');
    c.fillStyle = tg;
    c.beginPath();
    c.moveTo(cx - 48, 168);
    c.quadraticCurveTo(cx, 156, cx + 48, 168);
    c.quadraticCurveTo(cx + 40, 250, cx + 44, 318);
    c.lineTo(cx - 44, 318);
    c.quadraticCurveTo(cx - 40, 250, cx - 48, 168);
    c.closePath();
    c.fill();
    stroke(c, 'rgba(120,115,108,0.5)', 1.6, [cx - 20, 168, cx, 182, cx + 20, 168]);
    stroke(c, 'rgba(150,145,138,0.5)', 1.4, [cx - 30, 260, cx, 270, cx + 30, 258]);

    // open olive utility jacket
    var panels = [-1, 1];
    for (var i = 0; i < 2; i++) {
      var side = panels[i];
      var jg = c.createLinearGradient(cx + side * 70, 0, cx + side * 18, 0);
      jg.addColorStop(0, rgba(JD, 1));
      jg.addColorStop(0.6, rgba(JM, 1));
      jg.addColorStop(1, rgba(JL, 1));
      c.fillStyle = jg;
      c.beginPath();
      c.moveTo(cx + side * 22, 160);
      c.quadraticCurveTo(cx + side * 50, 154, cx + side * 66, 172);
      c.lineTo(cx + side * 62, 336);
      c.lineTo(cx + side * 28, 340);
      c.quadraticCurveTo(cx + side * 22, 250, cx + side * 26, 200);
      c.closePath();
      c.fill();
      // lapel
      c.fillStyle = rgba(JD, 0.9);
      c.beginPath();
      c.moveTo(cx + side * 22, 160); c.lineTo(cx + side * 36, 162); c.lineTo(cx + side * 30, 214); c.lineTo(cx + side * 26, 200);
      c.closePath(); c.fill();
      // chest pocket with flap and button
      c.fillStyle = rgba(JD, 0.55);
      c.fillRect(cx + side * 34 - (side < 0 ? 22 : 0), 214, 22, 26);
      c.fillStyle = rgba(JD, 1);
      c.fillRect(cx + side * 34 - (side < 0 ? 22 : 0), 212, 22, 8);
      c.fillStyle = '#c8b27a';
      c.beginPath(); c.arc(cx + side * 45, 217, 1.8, 0, TWO_PI); c.fill();
      // stitch line and fold
      stroke(c, rgba(JL, 0.5), 1, [cx + side * 27, 205, cx + side * 26, 270, cx + side * 30, 336]);
      stroke(c, rgba([20, 22, 12], 0.4), 2, [cx + side * 55, 250, cx + side * 48, 290, cx + side * 54, 330]);
    }
    // left arm, relaxed
    limb(c, cx - 62, 178, cx - 74, 256, 14, 12, JD, JM, JL);
    limb(c, cx - 74, 256, cx - 78, 320, 12, 10, JD, JM, JL);
    c.fillStyle = rgba(JD, 1);
    c.fillRect(cx - 89, 314, 22, 10);
    drawHand(c, cx - 78, 326, Math.PI / 2 + 0.05, 23, PLAYER_SKIN, '#b85a5a');
    // right arm holding the phone torch
    limb(c, cx + 62, 178, cx + 80, 246, 14, 12, JD, JM, JL);
    limb(c, cx + 80, 246, cx + 98, 282, 12, 10, JD, JM, JL);
    var torch = drawPhoneHand(c, cx + 104, 288, 28);

    drawNeck(c, cx, fy, u, PLAYER_SKIN, false);
    drawFace(c, cx, fy, u, { ghost: false, female: true, scream: false, rand: seeded(98) });
    // small gold studs
    c.fillStyle = '#e2bd58';
    c.beginPath(); c.arc(cx - 0.97 * u, fy + 0.25 * u, 2.2, 0, TWO_PI); c.fill();
    c.beginPath(); c.arc(cx + 0.97 * u, fy + 0.25 * u, 2.2, 0, TWO_PI); c.fill();
    drawFemaleHairFront(c, cx, fy, u, R);
    return { canvas: cv, torch: [torch[0] / W, torch[1] / H] };
  }

  // ================================================================== PORTRAIT
  // Close-up of the ghost's face for the jumpscare.
  function drawGhostPortrait(target, w, h, scream, kind) {
    TOON = PALETTES[kind] || PALETTES.manjulika;
    var cv = makeCanvas(w, h);
    var c = cv.getContext('2d');
    var s = w * 0.2, cx = w / 2, cy = h * 0.4;
    var glow = c.createRadialGradient(cx, cy, s * 0.5, cx, cy, w * 0.7);
    glow.addColorStop(0, 'rgba(' + TOON.aura.join(',') + ',0.4)');
    glow.addColorStop(1, 'rgba(' + TOON.aura.join(',') + ',0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
    drawGhostHairBack(c, cx, cy, s, h * 1.05, 0);
    // shoulders, blouse and pallu
    c.beginPath();
    c.moveTo(cx - 2.6 * s, h + 10);
    c.quadraticCurveTo(cx - 2.4 * s, cy + 2.5 * s, cx - 0.6 * s, cy + 2.3 * s);
    c.lineTo(cx + 0.6 * s, cy + 2.3 * s);
    c.quadraticCurveTo(cx + 2.4 * s, cy + 2.5 * s, cx + 2.6 * s, h + 10);
    c.closePath();
    c.fillStyle = TOON.blouse; c.fill(); ink(c, s * 0.04);
    c.beginPath();
    c.moveTo(cx - 2.3 * s, cy + 2.6 * s); c.lineTo(cx - 1.2 * s, cy + 2.35 * s); c.lineTo(cx + 1.6 * s, h + 10); c.lineTo(cx + 0.3 * s, h + 10);
    c.closePath();
    c.fillStyle = TOON.sari; c.fill(); ink(c, s * 0.035);
    c.beginPath(); c.moveTo(cx - 1.2 * s, cy + 2.38 * s); c.lineTo(cx + 1.55 * s, h + 10);
    c.strokeStyle = TOON.border; c.lineWidth = s * 0.14; c.stroke();
    c.strokeStyle = TOON.gold; c.lineWidth = s * 0.035; c.stroke();
    // neck and choker
    c.beginPath();
    c.moveTo(cx - 0.34 * s, cy + 1.2 * s); c.lineTo(cx - 0.42 * s, cy + 2.4 * s); c.lineTo(cx + 0.42 * s, cy + 2.4 * s); c.lineTo(cx + 0.34 * s, cy + 1.2 * s);
    c.closePath();
    c.fillStyle = TOON.skinShade; c.fill(); ink(c, s * 0.035);
    c.beginPath(); c.moveTo(cx - 0.42 * s, cy + 2.05 * s); c.quadraticCurveTo(cx, cy + 2.25 * s, cx + 0.42 * s, cy + 2.05 * s);
    c.strokeStyle = INK; c.lineWidth = s * 0.15; c.stroke();
    c.strokeStyle = TOON.gold; c.lineWidth = s * 0.1; c.stroke();
    for (var k = -2; k <= 2; k++) { bead(c, cx + k * 0.15 * s, cy + 2.17 * s + (2 - Math.abs(k)) * 0.03 * s, s * 0.05, k === 0 ? TOON.ruby : TOON.bangle3); }
    var face = drawScaryFace(c, cx, cy, s, scream);
    drawGhostHairFront(c, cx, cy, s, h * 1.02, 0);
    drawToonJhumka(c, cx - face.ear - s * 0.06, cy + 0.2 * s, s * 0.9, 0.12);
    drawToonJhumka(c, cx + face.ear + s * 0.06, cy + 0.2 * s, s * 0.9, -0.12);
    target.clearRect(0, 0, w, h);
    target.drawImage(cv, 0, 0);
  }

  // ================================================================== BUILD
  var GHOST_FRAMES = 8;
  var ghosts = {};
  var kinds = ['manjulika', 'anjulika'];
  for (var gk = 0; gk < kinds.length; gk++) {
    var set = { frames: [], eyes: null };
    for (var f = 0; f < GHOST_FRAMES; f++) {
      var gf = paintGhost(f, GHOST_FRAMES, kinds[gk]);
      set.frames.push(gf.canvas);
      set.eyes = gf.eyes;
    }
    ghosts[kinds[gk]] = set;
  }
  var male = paintMale();
  var female = paintFemale();

  window.BBChars = {
    ghostFrame: function (t, kind) {
      var set = ghosts[kind] || ghosts.manjulika;
      return set.frames[Math.floor(t * 5) % GHOST_FRAMES];
    },
    ghostEyes: function (kind) { return (ghosts[kind] || ghosts.manjulika).eyes; },
    glow: function (kind) { return (PALETTES[kind] || PALETTES.manjulika).glowRGB; },
    players: { male: male, female: female },
    drawGhostPortrait: drawGhostPortrait
  };
})();
