/*
 * Үлгі (синтетикалық) жапырақтар генераторы.
 * Алгоритмді тексеру және платформаны суретсіз сынап көру үшін қолданылады.
 */
(function (global) {
  'use strict';

  function rng(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function between(r, a, b) { return a + (b - a) * r(); }
  function hsl(h, s, l, a) { return 'hsla(' + h + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')'; }

  var CLASSES = [
    { id: 'healthy', name: 'Сау жапырақ' },
    { id: 'nitrogen', name: 'Азот тапшылығы' },
    { id: 'interveinal', name: 'Тамыраралық хлороз' },
    { id: 'mosaic', name: 'Вирустық мозаика' },
    { id: 'edge_scorch', name: 'Жиек күйігі' },
    { id: 'fungal_spot', name: 'Саңырауқұлақ дақтары' },
    { id: 'bacterial_spot', name: 'Бактериялық дақтар' },
    { id: 'rust', name: 'Тат ауруы' },
    { id: 'powdery', name: 'Ұнтақты көгерту' },
    { id: 'blight', name: 'Фитофтороз / шіріну' },
    { id: 'phosphorus', name: 'Фосфор тапшылығы' }
  ];

  function leafPath(ctx, L, W) {
    ctx.beginPath();
    ctx.moveTo(0, -L / 2);
    ctx.bezierCurveTo(W * 1.05, -L * 0.28, W * 0.85, L * 0.32, 0, L / 2);
    ctx.bezierCurveTo(-W * 0.85, L * 0.32, -W * 1.05, -L * 0.28, 0, -L / 2);
    ctx.closePath();
  }

  function veins(ctx, L, W, color, mainW, latW) {
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.lineWidth = mainW;
    ctx.beginPath(); ctx.moveTo(0, L / 2); ctx.lineTo(0, -L / 2 + 10); ctx.stroke();
    ctx.lineWidth = latW;
    for (var k = 0; k < 7; k++) {
      var y0 = L * 0.38 - k * L * 0.11;
      var spread = W * (0.85 - Math.abs(k - 2.5) * 0.08);
      [-1, 1].forEach(function (sg) {
        ctx.beginPath(); ctx.moveTo(0, y0);
        ctx.quadraticCurveTo(sg * spread * 0.5, y0 - L * 0.05, sg * spread * 0.92, y0 - L * 0.13);
        ctx.stroke();
      });
    }
  }

  function blob(ctx, r, x, y, rad, color) {
    ctx.fillStyle = color; ctx.beginPath();
    var n = 9;
    for (var k = 0; k <= n; k++) {
      var a = (k / n) * Math.PI * 2, rr = rad * between(r, 0.7, 1.15);
      var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }

  function randomPointInLeaf(r, L, W) {
    for (var t = 0; t < 50; t++) {
      var y = between(r, -L * 0.42, L * 0.42);
      var rel = 1 - Math.pow(Math.abs((y + L * 0.05) / (L * 0.5)), 1.6);
      var half = Math.max(5, W * 0.85 * rel);
      var x = between(r, -half * 0.85, half * 0.85);
      return [x, y];
    }
    return [0, 0];
  }

  function generate(classId, seed, size, opts) {
    size = size || 512; opts = opts || {};
    var K = opts.stage === 'early' ? 0.4 : 1; // ерте саты: белгілер аз әрі ұсақ
    var r = rng(seed || 1);
    var cv = (typeof document !== 'undefined') ? document.createElement('canvas') : new OffscreenCanvas(size, size);
    cv.width = size; cv.height = size;
    var ctx = cv.getContext('2d');
    var S = size / 512;

    // Фон — ақ қағаз
    var bgL = between(r, 90, 95);
    var grd = ctx.createLinearGradient(0, 0, size, size);
    grd.addColorStop(0, hsl(between(r, 30, 60), 12, bgL));
    grd.addColorStop(1, hsl(between(r, 30, 60), 10, bgL - 5));
    ctx.fillStyle = grd; ctx.fillRect(0, 0, size, size);

    var L = between(r, 360, 430) * S, W = between(r, 120, 160) * S;
    ctx.save();
    ctx.translate(size / 2 + between(r, -20, 20) * S, size / 2 + between(r, -10, 10) * S);
    ctx.rotate(between(r, -0.6, 0.6));

    // сабақ
    ctx.strokeStyle = hsl(95, 35, 35); ctx.lineWidth = 6 * S; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, L / 2 - 4); ctx.lineTo(0, L / 2 + 34 * S); ctx.stroke();

    // көлеңке
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 14 * S; ctx.shadowOffsetX = 6 * S; ctx.shadowOffsetY = 8 * S;
    var gh = between(r, 100, 125), gs = between(r, 45, 60), gl = between(r, 27, 36);
    var base = hsl(gh, gs, gl);
    if (classId === 'nitrogen') { var t = K < 1 ? between(r, 0.4, 0.6) : between(r, 0.65, 1); base = hsl(118 - t * 62, 55 + t * 22, 34 + t * 22); }
    if (classId === 'interveinal') base = K < 1 ? hsl(between(r, 62, 70), 65, between(r, 50, 56)) : hsl(between(r, 50, 60), 78, between(r, 52, 60));
    leafPath(ctx, L, W); ctx.fillStyle = base; ctx.fill();
    ctx.restore();

    ctx.save(); leafPath(ctx, L, W); ctx.clip();

    // текстура
    for (var k = 0; k < 900; k++) {
      var p = randomPointInLeaf(r, L, W);
      ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.arc(p[0], p[1], between(r, 2, 7) * S, 0, 6.283); ctx.fill();
    }

    var veinCol = hsl(gh - 10, 40, gl + 18, 0.55);
    if (classId === 'interveinal') {
      veins(ctx, L, W, hsl(gh, 50, 40, 0.55), 26 * S, 16 * S);
      veins(ctx, L, W, hsl(gh, 55, 33), 10 * S, 7 * S);
    } else if (classId === 'nitrogen') {
      veins(ctx, L, W, 'rgba(255,255,220,0.35)', 4 * S, 2 * S);
    } else {
      veins(ctx, L, W, veinCol, 4 * S, 2 * S);
    }

    var n, i, pt, rad;
    switch (classId) {
      case 'mosaic':
        n = Math.max(2, Math.round(between(r, 7, 13) * K));
        for (i = 0; i < n; i++) {
          pt = randomPointInLeaf(r, L, W); rad = between(r, 26, 55) * S;
          blob(ctx, r, pt[0], pt[1], rad, hsl(between(r, 55, 66), 75, between(r, 58, 66), 0.92));
        }
        break;
      case 'edge_scorch':
        var bw = between(r, 18, 32) * S * (K < 1 ? 0.55 : 1);
        ctx.lineJoin = 'round';
        leafPath(ctx, L, W); ctx.strokeStyle = hsl(52, 75, 55, 0.9); ctx.lineWidth = bw * 2 + 14 * S; ctx.stroke();
        for (i = 0; i < 3; i++) {
          ctx.save(); ctx.translate(between(r, -4, 4) * S, between(r, -4, 4) * S);
          leafPath(ctx, L, W); ctx.strokeStyle = hsl(between(r, 22, 32), 55, between(r, 26, 36)); ctx.lineWidth = bw * 2; ctx.stroke();
          ctx.restore();
        }
        break;
      case 'fungal_spot':
        n = Math.max(2, Math.round(between(r, 6, 16) * K));
        for (i = 0; i < n; i++) {
          pt = randomPointInLeaf(r, L, W); rad = between(r, 7, 15) * S;
          ctx.fillStyle = hsl(54, 80, 55, 0.9); ctx.beginPath(); ctx.arc(pt[0], pt[1], rad * 1.55, 0, 6.283); ctx.fill();
          blob(ctx, r, pt[0], pt[1], rad, hsl(between(r, 22, 30), 55, 30));
          ctx.strokeStyle = hsl(25, 45, 20); ctx.lineWidth = 1.5 * S;
          ctx.beginPath(); ctx.arc(pt[0], pt[1], rad * 0.6, 0, 6.283); ctx.stroke();
          ctx.fillStyle = hsl(20, 40, 15); ctx.beginPath(); ctx.arc(pt[0], pt[1], rad * 0.3, 0, 6.283); ctx.fill();
        }
        break;
      case 'bacterial_spot':
        n = Math.max(6, Math.round(between(r, 30, 65) * K));
        for (i = 0; i < n; i++) {
          pt = randomPointInLeaf(r, L, W); rad = between(r, 2.2, 4.2) * S;
          ctx.fillStyle = hsl(55, 80, 56, 0.9); ctx.beginPath(); ctx.arc(pt[0], pt[1], rad + 3.2 * S, 0, 6.283); ctx.fill();
          ctx.fillStyle = hsl(20, 35, 12); ctx.beginPath(); ctx.arc(pt[0], pt[1], rad, 0, 6.283); ctx.fill();
        }
        break;
      case 'rust':
        n = Math.max(5, Math.round(between(r, 30, 80) * K));
        for (i = 0; i < n; i++) {
          pt = randomPointInLeaf(r, L, W); rad = between(r, 2.5, 5) * S;
          ctx.fillStyle = hsl(60, 70, 55, 0.6); ctx.beginPath(); ctx.arc(pt[0], pt[1], rad + 2.5 * S, 0, 6.283); ctx.fill();
          ctx.fillStyle = hsl(between(r, 24, 32), 92, between(r, 54, 60)); ctx.beginPath(); ctx.arc(pt[0], pt[1], rad, 0, 6.283); ctx.fill();
        }
        break;
      case 'powdery':
        n = Math.max(2, Math.round(between(r, 8, 18) * K));
        for (i = 0; i < n; i++) {
          pt = randomPointInLeaf(r, L, W); rad = between(r, 16, 42) * S;
          blob(ctx, r, pt[0], pt[1], rad * 1.15, 'rgba(236,240,234,0.45)');
          blob(ctx, r, pt[0], pt[1], rad, 'rgba(238,242,236,' + between(r, 0.8, 0.92) + ')');
        }
        break;
      case 'blight':
        n = 1 + (K === 1 && r() < 0.6 ? 1 : 0);
        for (i = 0; i < n; i++) {
          pt = randomPointInLeaf(r, L * 0.75, W * 0.7); rad = between(r, 40, 75) * S * (K < 1 ? 0.6 : 1);
          blob(ctx, r, pt[0], pt[1], rad * 1.25, hsl(55, 65, 50, 0.85));
          blob(ctx, r, pt[0], pt[1], rad * 1.08, hsl(28, 45, 32));
          blob(ctx, r, pt[0], pt[1], rad * 0.85, hsl(between(r, 18, 28), 40, between(r, 13, 20)));
        }
        break;
      case 'phosphorus':
        n = Math.max(2, Math.round(between(r, 5, 9) * K));
        for (i = 0; i < n; i++) {
          pt = randomPointInLeaf(r, L, W); rad = between(r, 30, 60) * S;
          blob(ctx, r, pt[0], pt[1], rad, hsl(between(r, 292, 318), 45, between(r, 36, 44), 0.92));
        }
        break;
    }
    ctx.restore();
    ctx.restore();

    // камера шуы
    var img = ctx.getImageData(0, 0, size, size), d = img.data;
    for (i = 0; i < d.length; i += 4) {
      var nz = (r() - 0.5) * 12;
      d[i] = Math.max(0, Math.min(255, d[i] + nz));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + nz));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + nz));
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  global.LeafSamples = { CLASSES: CLASSES, generate: generate };
})(typeof window !== 'undefined' ? window : globalThis);
