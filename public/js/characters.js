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

    function facePath() {
      c.beginPath();
      c.moveTo(0, -1.4 * u);
      c.bezierCurveTo(0.66 * u, -1.4 * u, 1.0 * u, -0.98 * u, 1.0 * u, -0.2 * u);
      c.bezierCurveTo(1.0 * u, 0.5 * u, 0.7 * u, chinY - 0.35 * u, 0.3 * u, chinY - 0.06 * u);
      c.quadraticCurveTo(0, chinY + 0.04 * u, -0.3 * u, chinY - 0.06 * u);
      c.bezierCurveTo(-0.7 * u, chinY - 0.35 * u, -1.0 * u, 0.5 * u, -1.0 * u, -0.2 * u);
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
    for (var l = 0; l < 6; l++) {
      var t = 0.45 + l * 0.1;
      var lx = (1 - t) * (1 - t) * ix + 2 * (1 - t) * t * x + t * t * ox;
      var ly = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y - up * 1.6) + t * t * oy;
      stroke(c, 'rgba(10,4,4,0.8)', 0.012 * u, [lx, ly, lx + side * 0.04 * u, ly - 0.05 * u]);
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
      var thick = (1 - t * 0.7) * 0.05 * u;
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
    var upper = o.ghost ? '#6c5960' : '#874a40';
    var lower = o.ghost ? '#7d696f' : '#9a594c';
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

  // ================================================================== GHOST
  var GHOST_SKIN = [[216, 213, 208], [178, 175, 172], [98, 96, 108]];

  function paintGhost(frame, frames) {
    var W = 320, H = 640, cx = 160;
    var cv = makeCanvas(W, H);
    var c = cv.getContext('2d');
    var R = seeded(1234);
    var phase = TWO_PI * frame / frames;
    var sway = Math.sin(phase) * 7;
    var armSway = Math.sin(phase + 1) * 4;
    var u = 30, fy = 96;
    var k;

    drawLongHairBack(c, cx, fy, u, 430, sway, R);

    // ---- sari skirt with pleats, fading into mist at the bottom
    var hemY = 610;
    var hem = [];
    for (k = 0; k <= 14; k++) {
      var hx = cx - 96 + k * (192 / 14) + sway;
      hem.push([hx, hemY - R() * 9 + Math.sin(phase * 2 + k) * 4]);
    }
    c.beginPath();
    c.moveTo(cx - 50, 268);
    c.bezierCurveTo(cx - 62, 360, cx - 98, 470, hem[0][0], hem[0][1]);
    for (k = 1; k < hem.length; k++) { c.lineTo(hem[k][0], hem[k][1]); }
    c.bezierCurveTo(cx + 98, 470, cx + 62, 360, cx + 50, 268);
    c.closePath();
    var sg = c.createLinearGradient(cx - 100, 0, cx + 100, 0);
    sg.addColorStop(0, '#7f786d');
    sg.addColorStop(0.28, '#cbc4b4');
    sg.addColorStop(0.5, '#ddd6c6');
    sg.addColorStop(0.78, '#b8b1a1');
    sg.addColorStop(1, '#6f695f');
    c.fillStyle = sg;
    c.fill();
    c.save();
    c.clip();
    for (k = 0; k < 10; k++) {
      var x0 = cx - 24 + k * 5, x1 = cx - 66 + k * 12 + sway;
      var x0b = cx - 19 + k * 5, x1b = cx - 54 + k * 12 + sway;
      c.fillStyle = k % 2 ? 'rgba(255,255,255,0.13)' : 'rgba(40,30,20,0.14)';
      c.beginPath();
      c.moveTo(x0, 272); c.lineTo(x0b, 272); c.lineTo(x1b, hemY + 10); c.lineTo(x1, hemY + 10);
      c.closePath(); c.fill();
      stroke(c, 'rgba(60,50,40,0.3)', 1.2, [x0, 272, x1, hemY + 10]);
    }
    for (k = 0; k < 6; k++) {
      var side = k % 2 ? 1 : -1;
      var fx = cx + side * (40 + R() * 40);
      stroke(c, 'rgba(70,60,50,0.25)', 2, [fx, 300 + R() * 60, fx + side * 18, 460, fx + side * (26 + R() * 10) + sway, hemY]);
    }
    for (k = 0; k < 5; k++) {
      softSpot(c, cx + (R() - 0.5) * 140, 330 + R() * 240, 18 + R() * 22, 12 + R() * 18,
        k === 0 ? [90, 20, 20] : [95, 70, 45], 0.16);
    }
    c.restore();
    var band = [];
    for (k = 0; k < hem.length; k++) { band.push([hem[k][0], hem[k][1] - 22]); }
    sariBorder(c, band, 15, R);

    // ---- waist (bare midriff) and blouse
    c.fillStyle = rgba(GHOST_SKIN[1], 1);
    c.beginPath();
    c.moveTo(cx - 54, 240); c.lineTo(cx + 54, 240); c.lineTo(cx + 50, 276); c.lineTo(cx - 50, 276);
    c.closePath(); c.fill();
    softSpot(c, cx + 25, 258, 30, 14, GHOST_SKIN[2], 0.6);
    stroke(c, 'rgba(60,55,60,0.5)', 2, [cx - 6, 262, cx - 4, 266]);

    var bg = c.createLinearGradient(cx - 80, 0, cx + 80, 0);
    bg.addColorStop(0, '#2c080c');
    bg.addColorStop(0.4, '#5a1219');
    bg.addColorStop(1, '#2c080c');
    c.fillStyle = bg;
    c.beginPath();
    c.moveTo(cx - 80, 186);
    c.quadraticCurveTo(cx - 64, 166, cx - 30, 163);
    c.lineTo(cx + 30, 163);
    c.quadraticCurveTo(cx + 64, 166, cx + 80, 186);
    c.lineTo(cx + 62, 244);
    c.lineTo(cx - 62, 244);
    c.closePath();
    c.fill();
    // neckline
    c.fillStyle = rgba(GHOST_SKIN[1], 1);
    c.beginPath();
    c.moveTo(cx - 34, 163);
    c.quadraticCurveTo(cx, 214, cx + 34, 163);
    c.closePath();
    c.fill();
    softSpot(c, cx, 170, 36, 12, GHOST_SKIN[2], 0.5);
    stroke(c, rgba(GHOST_SKIN[2], 0.6), 2, [cx - 30, 172, cx - 14, 176, cx - 4, 178]);
    stroke(c, rgba(GHOST_SKIN[2], 0.6), 2, [cx + 30, 172, cx + 14, 176, cx + 4, 178]);

    // ---- pallu: from the right of the waist, across the chest, over the left shoulder
    var pA = [cx + 58, 300], pB = [cx + 26, 262], pC = [cx - 50, 160], pD = [cx - 86, 194];
    c.beginPath();
    c.moveTo(pA[0], pA[1]); c.lineTo(pB[0], pB[1]); c.lineTo(pC[0], pC[1]); c.lineTo(pD[0], pD[1]);
    c.closePath();
    var pg = c.createLinearGradient(pD[0], pD[1], pB[0], pB[1]);
    pg.addColorStop(0, '#a49d8e');
    pg.addColorStop(0.5, '#ddd6c6');
    pg.addColorStop(1, '#bdb6a6');
    c.fillStyle = pg;
    c.fill();
    c.save();
    c.clip();
    for (k = 1; k < 7; k++) {
      var t1 = k / 7;
      var ax = pD[0] + (pC[0] - pD[0]) * t1, ay = pD[1] + (pC[1] - pD[1]) * t1;
      var bx = pA[0] + (pB[0] - pA[0]) * t1, by = pA[1] + (pB[1] - pA[1]) * t1;
      stroke(c, k % 2 ? 'rgba(255,255,255,0.22)' : 'rgba(50,40,30,0.25)', 3, [ax, ay, bx, by]);
    }
    c.restore();
    sariBorder(c, [pC, pB], 10, R);
    sariBorder(c, [pD, pA], 10, R);
    // the end of the pallu hanging down behind the left shoulder
    c.beginPath();
    c.moveTo(pD[0], pD[1]); c.lineTo(pC[0], pC[1]);
    c.lineTo(cx - 70 + sway * 0.5, 370); c.lineTo(cx - 104 + sway * 0.6, 356);
    c.closePath();
    c.fillStyle = '#b3ac9d';
    c.fill();
    sariBorder(c, [[pD[0], pD[1]], [cx - 104 + sway * 0.6, 356]], 10, R);

    // ---- arms reaching out, with bangles
    var arms = [
      { s: [cx - 74, 194], e: [cx - 104, 268 + armSway], w: [cx - 128, 322 + armSway], ang: 1.2 },
      { s: [cx + 74, 194], e: [cx + 106, 258 - armSway], w: [cx + 134, 306 - armSway], ang: 0.95 }
    ];
    for (k = 0; k < arms.length; k++) {
      var A = arms[k];
      limb(c, A.s[0], A.s[1], A.e[0], A.e[1], 12, 9, GHOST_SKIN[2], GHOST_SKIN[1], GHOST_SKIN[0]);
      limb(c, A.e[0], A.e[1], A.w[0], A.w[1], 9, 6.5, GHOST_SKIN[2], GHOST_SKIN[1], GHOST_SKIN[0]);
      // short blouse sleeve
      limb(c, A.s[0], A.s[1], A.s[0] + (A.e[0] - A.s[0]) * 0.35, A.s[1] + (A.e[1] - A.s[1]) * 0.35, 14, 12,
        [40, 8, 12], [90, 18, 25], [120, 30, 38]);
      var ang = Math.atan2(A.w[1] - A.e[1], A.w[0] - A.e[0]);
      drawBangles(c, A.e[0] + (A.w[0] - A.e[0]) * 0.8, A.e[1] + (A.w[1] - A.e[1]) * 0.8, ang, 7.5);
      drawHand(c, A.w[0], A.w[1], ang, 24, GHOST_SKIN, '#1a0d10');
    }

    // ---- head
    drawNeck(c, cx, fy, u, GHOST_SKIN, true);
    var eyes = drawFace(c, cx, fy, u, { ghost: true, scream: false, rand: seeded(77) });
    drawJhumka(c, cx - eyes.ear, fy + 0.25 * u, u);
    drawJhumka(c, cx + eyes.ear, fy + 0.25 * u, u);
    drawLongHairFront(c, cx, fy, u, 420, sway, R, true);

    // ---- cold, deathly tint over everything, and fade the hem into mist
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(110,135,170,0.14)';
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'destination-out';
    var fade = c.createLinearGradient(0, 470, 0, H);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = fade;
    c.fillRect(0, 470, W, H - 470);
    c.globalCompositeOperation = 'source-over';

    return { canvas: cv, eyes: [[eyes.left[0] / W, eyes.left[1] / H], [eyes.right[0] / W, eyes.right[1] / H]] };
  }

  // ================================================================== PLAYER
  var PLAYER_SKIN = [[205, 150, 108], [172, 116, 78], [108, 64, 40]];

  function paintPlayer() {
    var W = 320, H = 640, cx = 150;
    var cv = makeCanvas(W, H);
    var c = cv.getContext('2d');
    var R = seeded(4321);
    var u = 28, fy = 92;
    var k;

    // ---- churidar legs and mojari shoes
    var legs = [[cx - 22, cx - 24], [cx + 22, cx + 25]];
    for (k = 0; k < 2; k++) {
      limb(c, legs[k][0], 440, legs[k][1], 590, 15, 10, [150, 145, 135], [225, 220, 210], [245, 242, 235]);
      for (var g2 = 0; g2 < 9; g2++) {
        var gy = 540 + g2 * 5.5;
        stroke(c, 'rgba(90,85,75,0.35)', 1.2, [legs[k][1] - 11, gy, legs[k][1], gy + 4, legs[k][1] + 11, gy]);
      }
      var shoeX = legs[k][1];
      var sh = c.createLinearGradient(0, 588, 0, 612);
      sh.addColorStop(0, '#7a4a22');
      sh.addColorStop(1, '#3a200c');
      c.fillStyle = sh;
      c.beginPath();
      c.moveTo(shoeX - 14, 612);
      c.quadraticCurveTo(shoeX - 16, 588, shoeX, 588);
      c.quadraticCurveTo(shoeX + 16, 590, shoeX + 20, 604);
      c.quadraticCurveTo(shoeX + 26, 598, shoeX + 24, 592);
      c.quadraticCurveTo(shoeX + 30, 612, shoeX + 14, 612);
      c.closePath();
      c.fill();
      c.fillStyle = '#d6aa4a';
      for (var e = 0; e < 4; e++) { c.beginPath(); c.arc(shoeX - 6 + e * 5, 598, 1.4, 0, TWO_PI); c.fill(); }
    }

    // ---- kurta, knee length with side slits
    var kg = c.createLinearGradient(cx - 80, 0, cx + 80, 0);
    kg.addColorStop(0, '#8f4a0e');
    kg.addColorStop(0.3, '#e0892a');
    kg.addColorStop(0.55, '#f0a346');
    kg.addColorStop(0.85, '#c8701c');
    kg.addColorStop(1, '#7c3f0b');
    c.fillStyle = kg;
    c.beginPath();
    c.moveTo(cx - 62, 170);
    c.lineTo(cx + 62, 170);
    c.bezierCurveTo(cx + 66, 260, cx + 66, 360, cx + 74, 470);
    c.quadraticCurveTo(cx + 40, 478, cx + 8, 474);
    c.lineTo(cx + 2, 400);
    c.lineTo(cx - 4, 474);
    c.quadraticCurveTo(cx - 40, 478, cx - 74, 470);
    c.bezierCurveTo(cx - 66, 360, cx - 66, 260, cx - 62, 170);
    c.closePath();
    c.fill();
    // creases
    var creases = [[cx - 50, 200, cx - 30, 260, cx - 40, 330], [cx + 46, 196, cx + 30, 250, cx + 38, 320],
      [cx - 30, 330, cx - 40, 400, cx - 52, 465], [cx + 26, 340, cx + 40, 400, cx + 54, 465],
      [cx - 10, 300, cx - 14, 360, cx - 20, 420], [cx + 12, 290, cx + 16, 350, cx + 22, 410]];
    for (k = 0; k < creases.length; k++) {
      stroke(c, 'rgba(110,50,8,0.38)', 2.4, creases[k]);
      stroke(c, 'rgba(255,200,130,0.25)', 1.4,
        [creases[k][0] + 3, creases[k][1], creases[k][2] + 3, creases[k][3], creases[k][4] + 3, creases[k][5]]);
    }
    // placket and buttons
    c.fillStyle = 'rgba(150,75,10,0.45)';
    c.fillRect(cx - 6, 170, 12, 92);
    for (k = 0; k < 4; k++) {
      var by2 = 184 + k * 20;
      var bgr = c.createRadialGradient(cx - 1, by2 - 1, 0, cx, by2, 4);
      bgr.addColorStop(0, '#fff3cf');
      bgr.addColorStop(1, '#a88a4c');
      c.fillStyle = bgr;
      c.beginPath(); c.arc(cx, by2, 3.6, 0, TWO_PI); c.fill();
    }

    // ---- left arm hanging down (full sleeve)
    limb(c, cx - 64, 182, cx - 82, 282, 15, 12, [120, 60, 10], [214, 128, 40], [238, 160, 70]);
    limb(c, cx - 82, 282, cx - 88, 372, 12, 10, [120, 60, 10], [214, 128, 40], [238, 160, 70]);
    drawHand(c, cx - 88, 372, Math.PI / 2 + 0.06, 20, PLAYER_SKIN, '#c99a80');

    // ---- maroon shawl over the left shoulder, falling down the front
    var shg = c.createLinearGradient(cx + 30, 0, cx + 100, 0);
    shg.addColorStop(0, '#3e0d14');
    shg.addColorStop(0.5, '#6e1c28');
    shg.addColorStop(1, '#360a10');
    c.fillStyle = shg;
    c.beginPath();
    c.moveTo(cx + 22, 166);
    c.quadraticCurveTo(cx + 66, 160, cx + 82, 190);
    c.lineTo(cx + 96, 440);
    c.lineTo(cx + 54, 446);
    c.quadraticCurveTo(cx + 40, 300, cx + 22, 166);
    c.closePath();
    c.fill();
    for (k = 0; k < 140; k++) {
      softSpot(c, cx + 40 + R() * 50, 180 + R() * 260, 2, 2, [150, 80, 90], 0.2);
    }
    stroke(c, '#b8913a', 2.5, [cx + 24, 170, cx + 42, 300, cx + 56, 444]);
    stroke(c, '#b8913a', 2.5, [cx + 82, 192, cx + 90, 320, cx + 94, 440]);
    for (k = 0; k < 18; k++) {
      var fx2 = cx + 56 + k * 2.3;
      stroke(c, '#5a1520', 1.4, [fx2, 444, fx2 + (R() - 0.5) * 3, 458 + R() * 4]);
    }

    // ---- right arm bent, holding the lantern
    limb(c, cx + 64, 182, cx + 86, 270, 15, 12, [120, 60, 10], [214, 128, 40], [238, 160, 70]);
    limb(c, cx + 86, 270, cx + 118, 318, 12, 10, [120, 60, 10], [214, 128, 40], [238, 160, 70]);
    var lx = cx + 126, ly = 380;
    // lantern (lalten): handle, cap, glass chimney with guard wires, fuel tank
    stroke(c, '#3c3025', 2.2, [lx - 14, 348, lx, 322, lx + 14, 348]);
    c.fillStyle = '#4a3c2c';
    c.beginPath(); c.ellipse(lx, 350, 15, 5, 0, 0, TWO_PI); c.fill();
    var gl = c.createLinearGradient(lx - 14, 0, lx + 14, 0);
    gl.addColorStop(0, 'rgba(255,200,120,0.35)');
    gl.addColorStop(0.5, 'rgba(255,235,190,0.75)');
    gl.addColorStop(1, 'rgba(255,190,110,0.35)');
    c.fillStyle = gl;
    c.beginPath(); c.ellipse(lx, 378, 13, 25, 0, 0, TWO_PI); c.fill();
    for (k = -1; k <= 1; k++) { stroke(c, 'rgba(60,48,36,0.9)', 1.4, [lx + k * 9, 356, lx + k * 13, 378, lx + k * 9, 400]); }
    var tg2 = c.createLinearGradient(lx - 18, 0, lx + 18, 0);
    tg2.addColorStop(0, '#2c2218');
    tg2.addColorStop(0.5, '#6a5642');
    tg2.addColorStop(1, '#2c2218');
    c.fillStyle = tg2;
    c.beginPath(); c.ellipse(lx, 410, 18, 10, 0, 0, TWO_PI); c.fill();
    drawHand(c, cx + 118, 316, 1.25, 18, PLAYER_SKIN, '#c99a80');

    // ---- head
    drawNeck(c, cx, fy, u, PLAYER_SKIN, false);
    // mandarin collar
    c.fillStyle = '#c96f1e';
    c.beginPath();
    c.moveTo(cx - 22, 152); c.quadraticCurveTo(cx, 164, cx + 22, 152);
    c.lineTo(cx + 24, 168); c.quadraticCurveTo(cx, 178, cx - 24, 168);
    c.closePath(); c.fill();
    stroke(c, 'rgba(110,50,8,0.6)', 1.5, [cx - 24, 168, cx, 178, cx + 24, 168]);
    drawFace(c, cx, fy, u, { ghost: false, scream: false, rand: seeded(99) });
    drawShortHair(c, cx, fy, u, R);

    return { canvas: cv, flame: [lx / W, 380 / H] };
  }

  // ================================================================== PORTRAIT
  // Close-up of Manjulika's face for the jumpscare.
  function drawGhostPortrait(target, w, h, scream) {
    var cv = makeCanvas(w, h);
    var c = cv.getContext('2d');
    var R = seeded(555);
    var u = w * 0.19, cx = w / 2, cy = h * 0.42;

    drawLongHairBack(c, cx, cy, u, h * 1.05, 0, R);
    // shoulders, blouse and pallu at the bottom
    c.fillStyle = '#4a0f15';
    c.beginPath();
    c.moveTo(cx - 2.9 * u, h);
    c.quadraticCurveTo(cx - 2.6 * u, cy + 2.5 * u, cx - 0.9 * u, cy + 2.3 * u);
    c.lineTo(cx + 0.9 * u, cy + 2.3 * u);
    c.quadraticCurveTo(cx + 2.6 * u, cy + 2.5 * u, cx + 2.9 * u, h);
    c.closePath();
    c.fill();
    c.fillStyle = '#d3ccbc';
    c.beginPath();
    c.moveTo(cx - 2.6 * u, cy + 2.6 * u);
    c.lineTo(cx - 1.4 * u, cy + 2.35 * u);
    c.lineTo(cx + 1.6 * u, h);
    c.lineTo(cx + 0.2 * u, h);
    c.closePath();
    c.fill();
    sariBorder(c, [[cx - 1.4 * u, cy + 2.35 * u], [cx + 1.6 * u, h]], 0.18 * u, R);
    drawNeck(c, cx, cy, u, GHOST_SKIN, true);
    var eyes = drawFace(c, cx, cy, u, { ghost: true, scream: scream, rand: seeded(77) });
    drawJhumka(c, cx - eyes.ear, cy + 0.25 * u, u);
    drawJhumka(c, cx + eyes.ear, cy + 0.25 * u, u);
    drawLongHairFront(c, cx, cy, u, h, 0, R, true);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(110,135,170,0.14)';
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
    // glowing pupils
    c.save();
    c.shadowColor = '#ff1a2e';
    c.shadowBlur = u * 0.35;
    c.fillStyle = 'rgba(255,40,60,0.9)';
    for (var i = 0; i < 2; i++) {
      var e = i === 0 ? eyes.left : eyes.right;
      c.beginPath(); c.arc(e[0], e[1], u * 0.035, 0, TWO_PI); c.fill();
    }
    c.restore();

    target.clearRect(0, 0, w, h);
    target.drawImage(cv, 0, 0);
  }

  // ================================================================== BUILD
  var GHOST_FRAMES = 8;
  var ghostFrames = [];
  var ghostEyes = null;
  for (var f = 0; f < GHOST_FRAMES; f++) {
    var gf = paintGhost(f, GHOST_FRAMES);
    ghostFrames.push(gf.canvas);
    ghostEyes = gf.eyes;
  }
  var player = paintPlayer();

  window.BBChars = {
    ghostFrame: function (t) {
      return ghostFrames[Math.floor(t * 5) % GHOST_FRAMES];
    },
    ghostEyes: ghostEyes,
    player: player.canvas,
    playerFlame: player.flame,
    drawGhostPortrait: drawGhostPortrait
  };
})();
