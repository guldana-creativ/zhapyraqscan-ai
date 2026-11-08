/*
 * ЖапырақСкан — «Түс индикаторы» (2-нұсқа)
 * Жапырақ суретіндегі түстерді өлшеп, ұлпаның қандай бөлігі сау, сарғайған, қураған,
 * ақ өңезбен жабылған екенін есептейді. Өсімдік түрін және нақты ауруды AI көру модулі
 * мен анықтағыш кілт анықтайды; бұл модуль – дәлдікті тексеретін «өлшеуіш».
 *
 * 2-нұсқадағы негізгі өзгерістер (нақты фотолармен тексеруден кейін):
 *  1) Фон жапырақтың жасыл «өзегінен» өсіру арқылы бөлінеді (қол, үстел, топырақ кірмейді);
 *  2) жапырақ жиегіндегі 1–2 пиксельдік бозғылт шекара есептен шығарылады;
 *  3) жылтырау (жарқыраған ақ дақ) мен ақ өңез пішіні мен көлемі бойынша ажыратылады;
 *  4) қараңғылық шегі суреттің жарықтығына қарай өзгереді (көлеңке некроз болып саналмайды);
 *  5) «Сау» деген қорытынды тек нақты зақым белгісі болмағанда ғана емес, белгі әлсіз болғанда да беріледі.
 */
(function (global) {
  'use strict';

  var C = { BG: 0, HEALTHY: 1, CHLOROSIS: 2, NECROSIS: 3, DARK: 4, RUST: 5, POWDERY: 6, PURPLE: 7, GRAY: 8, OTHER: 9, RIM: 10, GLARE: 11, WHITE: 12 };

  var CLASS_INFO = [
    { key: 'bg', name: 'Фон', color: [0, 0, 0] },
    { key: 'healthy', name: 'Сау жасыл ұлпа', color: [96, 178, 104] },
    { key: 'chlorosis', name: 'Сарғайған ұлпа (хлороз)', color: [255, 214, 0] },
    { key: 'necrosis', name: 'Қоңыр, қураған ұлпа (некроз)', color: [200, 50, 30] },
    { key: 'dark', name: 'Қара дақтар', color: [60, 20, 90] },
    { key: 'rust', name: 'Қызғылт-сары томпақтар', color: [255, 128, 0] },
    { key: 'powdery', name: 'Ақ ұнтақ, өңез', color: [0, 200, 255] },
    { key: 'purple', name: 'Күлгін-қызыл реңк', color: [200, 60, 220] },
    { key: 'gray', name: 'Сұр, кепкен ұлпа', color: [130, 130, 140] },
    { key: 'other', name: 'Басқа реңк', color: [90, 120, 200] },
    { key: 'rim', name: 'Жиек сызығы (есептелмейді)', color: [205, 225, 205] },
    { key: 'glare', name: 'Жылтырау (есептелмейді)', color: [235, 235, 235] }
  ];

  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function ramp(x, a, b) { return clamp((x - a) / (b - a), 0, 1); }

  function rgb2hsv(r, g, b, out) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, h = 0;
    if (d > 1e-6) {
      if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    out[0] = h; out[1] = max === 0 ? 0 : d / max; out[2] = max;
    return out;
  }

  function distanceTransform(mask, w, h, borderIsZero) {
    var N = w * h, INF = 1e9, d = new Float32Array(N), x, y, i, v, D = 1.4142;
    for (i = 0; i < N; i++) d[i] = mask[i] ? INF : 0;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; if (d[i] === 0) continue; v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1); else if (borderIsZero) v = Math.min(v, 1);
      if (y > 0) { v = Math.min(v, d[i - w] + 1); if (x > 0) v = Math.min(v, d[i - w - 1] + D); if (x < w - 1) v = Math.min(v, d[i - w + 1] + D); }
      else if (borderIsZero) v = Math.min(v, 1);
      d[i] = v;
    }
    for (y = h - 1; y >= 0; y--) for (x = w - 1; x >= 0; x--) {
      i = y * w + x; if (d[i] === 0) continue; v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 1); else if (borderIsZero) v = Math.min(v, 1);
      if (y < h - 1) { v = Math.min(v, d[i + w] + 1); if (x < w - 1) v = Math.min(v, d[i + w + 1] + D); if (x > 0) v = Math.min(v, d[i + w - 1] + D); }
      else if (borderIsZero) v = Math.min(v, 1);
      d[i] = v;
    }
    return d;
  }

  function components(mask, w, h) {
    var N = w * h, label = new Int32Array(N), stack = new Int32Array(N), comps = [], next = 1;
    for (var s = 0; s < N; s++) {
      if (!mask[s] || label[s]) continue;
      var top = 0, area = 0, minx = w, maxx = 0, miny = h, maxy = 0;
      stack[top++] = s; label[s] = next;
      while (top) {
        var p = stack[--top]; area++;
        var px = p % w, py = (p / w) | 0;
        if (px < minx) minx = px; if (px > maxx) maxx = px; if (py < miny) miny = py; if (py > maxy) maxy = py;
        for (var dy = -1; dy <= 1; dy++) {
          var ny = py + dy; if (ny < 0 || ny >= h) continue;
          for (var dx = -1; dx <= 1; dx++) {
            var nx = px + dx; if (nx < 0 || nx >= w) continue;
            var q = ny * w + nx;
            if (mask[q] && !label[q]) { label[q] = next; stack[top++] = q; }
          }
        }
      }
      comps.push({ id: next, area: area, w: maxx - minx + 1, h: maxy - miny + 1 }); next++;
    }
    return { label: label, comps: comps };
  }

  // Шекарадан басталатын толтыру: mask=1 болмайтын, шекарамен байланысқан пикселдер
  function fillHoles(mask, w, h) {
    var N = w * h, seen = new Uint8Array(N), q = new Int32Array(N), qh = 0, qt = 0, i, x, y;
    function push(p) { if (!mask[p] && !seen[p]) { seen[p] = 1; q[qt++] = p; } }
    for (x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (qh < qt) {
      var c = q[qh++], cx = c % w, cy = (c / w) | 0;
      if (cx > 0) push(c - 1); if (cx < w - 1) push(c + 1); if (cy > 0) push(c - w); if (cy < h - 1) push(c + w);
    }
    var out = new Uint8Array(N);
    for (i = 0; i < N; i++) out[i] = seen[i] ? 0 : 1;
    return out;
  }

  function isGreen(hh, s, v) { return hh >= 55 && hh <= 185 && ((s >= 0.14 && v >= 0.08) || (s >= 0.25 && v >= 0.05)); }
  function isPlantColor(hh, s, v) {
    if (v < 0.1 || s < 0.22) return false;
    if (hh >= 12 && hh <= 185) return true;
    if ((hh >= 275 || hh < 12) && s > 0.28 && v > 0.15 && v < 0.85) return true;
    return false;
  }

  // Шекарадағы фонның түсін (хроматикасын) үйреніп, фон емес аймақтарды жапыраққа қосу
  function bgExpand(data, V, S, object, w, h, scale) {
    var N = w * h, i, x, y, cr = [], cg = [], vv = [], ss = [];
    function push(p) { var r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2], t = r + g + b + 1; cr.push(r / t); cg.push(g / t); vv.push(V[p]); ss.push(S[p]); }
    var ins = Math.max(2, Math.round(0.015 * Math.min(w, h)));
    for (x = ins; x < w - ins; x += 2) { push(ins * w + x); push((h - 1 - ins) * w + x); }
    for (y = ins; y < h - ins; y += 2) { push(y * w + ins); push(y * w + w - 1 - ins); }
    var med = function (a) { var b = a.slice().sort(function (m, n) { return m - n; }); return b[b.length >> 1]; };
    var mR = med(cr), mG = med(cg), mV = med(vv), mS = med(ss);
    var dev = cr.map(function (r, k) { return Math.hypot(r - mR, cg[k] - mG); }), mad = med(dev);
    var tC = Math.max(0.03, 4 * mad), outl = 0;
    for (i = 0; i < dev.length; i++) if (dev[i] > tC) outl++;
    // фон біркелкі емес (табиғи орта) немесе жасыл болса – кеңейтпейміз
    if (mad > 0.025 || outl / dev.length > 0.2 || mS > 0.35 || mG > 0.4) return null;
    var fg = new Uint8Array(N), dark = new Uint8Array(N), area0 = 0;
    for (i = 0; i < N; i++) {
      if (object[i]) { fg[i] = 1; area0++; continue; }
      var r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], t = r + g + b + 1, dc = Math.hypot(r / t - mR, g / t - mG), v = V[i];
      var bgLike = dc < tC && v <= mV + 0.12 && v >= 0.25 * mV && S[i] < mS + 0.18;
      if (!bgLike) { fg[i] = 1; if (v < 0.25 * mV && S[i] < 0.3) dark[i] = 1; }
    }
    // қою бейтарап (көлеңке болуы мүмкін) нүктелер тек жапырақтың жанында ғана қосылады
    var notObj = new Uint8Array(N); for (i = 0; i < N; i++) notObj[i] = object[i] ? 0 : 1;
    var dObj = distanceTransform(notObj, w, h, false), K2 = Math.max(3, 0.06 * Math.sqrt(area0));
    for (i = 0; i < N; i++) if (dark[i] && dObj[i] > K2) fg[i] = 0;
    var cc = components(fg, w, h), keepC = {};
    for (i = 0; i < N; i++) if (object[i]) keepC[cc.label[i]] = 1;
    var out = new Uint8Array(N), area = 0, border = 0, bn = 0;
    for (i = 0; i < N; i++) if (fg[i] && keepC[cc.label[i]]) { out[i] = 1; area++; }
    // жаңадан қосылған бөлік сурет шетіне жетсе, ол – фон (көлеңке, үстелдің қараңғы жері)
    var add = new Uint8Array(N); for (i = 0; i < N; i++) add[i] = out[i] && !object[i] ? 1 : 0;
    var ac = components(add, w, h), touch = {};
    for (i = 0; i < N; i++) if (add[i]) { x = i % w; y = (i / w) | 0; if (x <= ins || y <= ins || x >= w - 1 - ins || y >= h - 1 - ins) touch[ac.label[i]] = 1; }
    for (i = 0; i < N; i++) if (add[i] && touch[ac.label[i]]) out[i] = 0;
    // жұқа «жіптерді» (ұсақ фон шуын) алып тастау: 1 пиксельдік эрозия-дилатация
    var dO = distanceTransform(out, w, h, false), er = new Uint8Array(N);
    for (i = 0; i < N; i++) er[i] = dO[i] > 1.5 * scale || object[i] ? 1 : 0;
    var nE = new Uint8Array(N); for (i = 0; i < N; i++) nE[i] = er[i] ? 0 : 1;
    var dEr = distanceTransform(nE, w, h, false);
    for (i = 0; i < N; i++) out[i] = out[i] && (dEr[i] <= 1.5 * scale + 0.5) ? 1 : 0;
    for (x = 0; x < w; x++) { bn += 2; border += out[x] + out[(h - 1) * w + x]; }
    for (y = 0; y < h; y++) { bn += 2; border += out[y * w] + out[y * w + w - 1]; }
    area = 0; for (i = 0; i < N; i++) area += out[i];
    if (area > 0.85 * N || border / bn > 0.35) return null;
    return fillHoles(out, w, h);
  }

  function analyze(img, opts) {
    opts = opts || {};
    var w = img.width, h = img.height, src = img.data, N = w * h, i, x, y;
    var scale = Math.max(w, h) / 256;
    var hsv = [0, 0, 0];

    // --- 0. Ақ балансы: шекара жарық әрі бейтарап болса (қағаз, үстел), оны ақ түске келтіреміз
    var br = [], bgc = [], bb = [];
    var ins0 = Math.max(2, Math.round(0.015 * Math.min(w, h))); // суреттің жұқа қара жиектемесін аттап өтеміз
    for (x = ins0; x < w - ins0; x += 2) { [ins0 * w + x, (h - 1 - ins0) * w + x].forEach(function (p) { br.push(src[p * 4]); bgc.push(src[p * 4 + 1]); bb.push(src[p * 4 + 2]); }); }
    for (y = ins0; y < h - ins0; y += 2) { [y * w + ins0, y * w + w - 1 - ins0].forEach(function (p) { br.push(src[p * 4]); bgc.push(src[p * 4 + 1]); bb.push(src[p * 4 + 2]); }); }
    var med = function (a) { a = a.slice().sort(function (m, n) { return m - n; }); return a[a.length >> 1]; };
    var mr = med(br), mg = med(bgc), mb = med(bb), bh = rgb2hsv(mr, mg, mb, [0, 0, 0]);
    var gr = 1, gg = 1, gb = 1;
    if (bh[2] > 0.45 && bh[1] < 0.22) { var mean = (mr + mg + mb) / 3; gr = clamp(mean / mr, 0.8, 1.25); gg = clamp(mean / mg, 0.8, 1.25); gb = clamp(mean / mb, 0.8, 1.25); }
    var data = new Uint8ClampedArray(N * 4);
    for (i = 0; i < N; i++) { data[i * 4] = src[i * 4] * gr; data[i * 4 + 1] = src[i * 4 + 1] * gg; data[i * 4 + 2] = src[i * 4 + 2] * gb; data[i * 4 + 3] = 255; }

    var H = new Float32Array(N), S = new Float32Array(N), V = new Float32Array(N), core = new Uint8Array(N), cand = new Uint8Array(N), coreCount = 0;
    // фонның реңкі (көлеңке де фонның қараңғы түрі болады)
    var bgw = rgb2hsv(mr * gr, mg * gg, mb * gb, [0, 0, 0]), bgHue = bgw[0], bgSat = bgw[1];
    function hueDist(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
    for (i = 0; i < N; i++) {
      rgb2hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], hsv);
      H[i] = hsv[0]; S[i] = hsv[1]; V[i] = hsv[2];
      if (isGreen(hsv[0], hsv[1], hsv[2])) { core[i] = 1; coreCount++; }
      if (isPlantColor(hsv[0], hsv[1], hsv[2]) && !(bgSat > 0.06 && hueDist(hsv[0], bgHue) < 35 && hsv[1] < bgSat + 0.22 && !(hsv[0] >= 55 && hsv[0] <= 185))) cand[i] = 1;
    }

    var result = { width: w, height: h, warnings: [] };
    var whole = !!opts.wholeImage || coreCount / N > 0.9;

    // --- 1. Жапырақтың жасыл өзегі: ең үлкен жасыл аймақтар
    var cc = components(core, w, h), maxA = 0;
    cc.comps.forEach(function (c) { if (c.area > maxA) maxA = c.area; });
    var keep = {};
    cc.comps.forEach(function (c) { if (c.area >= maxA * 0.15 && c.area >= N * 0.004) keep[c.id] = 1; });
    var coreArea = 0;
    for (i = 0; i < N; i++) { core[i] = keep[cc.label[i]] ? 1 : 0; coreArea += core[i]; }
    if (coreArea < N * 0.02 && !whole) {
      result.ok = false;
      result.error = 'Суретте жасыл жапырақ табылмады. Жапырақты кадрдың ортасына қойып, жақынырақтан түсіріңіз.';
      result.classMap = new Uint8Array(N); return result;
    }

    // --- 2. Өзектен «өсіру»: жапыраққа жалғасқан сары, қоңыр, күлгін бөліктерді қосамыз
    var object;
    if (whole) { object = new Uint8Array(N); for (i = 0; i < N; i++) object[i] = 1; }
    else {
      var notCore = new Uint8Array(N); for (i = 0; i < N; i++) notCore[i] = core[i] ? 0 : 1;
      var dCore = distanceTransform(notCore, w, h, false);
      var K = Math.max(4, 0.12 * Math.sqrt(coreArea));
      var grown = new Uint8Array(N);
      for (i = 0; i < N; i++) {
        if (core[i]) { grown[i] = 1; continue; }
        if (cand[i] && dCore[i] <= K) grown[i] = 1;
        else if (dCore[i] <= K && S[i] < 0.16 && V[i] > 0.55 && (data[i * 4 + 1] - Math.max(data[i * 4], data[i * 4 + 2])) >= 10) grown[i] = 1; // жасылдау ақ өңез
      }
      // тек өзекпен байланысқан бөліктер
      var gc = components(grown, w, h), withCore = {};
      for (i = 0; i < N; i++) if (core[i]) withCore[gc.label[i]] = 1;
      for (i = 0; i < N; i++) grown[i] = withCore[gc.label[i]] ? 1 : 0;
      // кішкене саңылауларды жабу (2 пиксель)
      var notG = new Uint8Array(N); for (i = 0; i < N; i++) notG[i] = grown[i] ? 0 : 1;
      var dG = distanceTransform(notG, w, h, false), dil = new Uint8Array(N);
      for (i = 0; i < N; i++) dil[i] = dG[i] <= 2 * scale ? 1 : 0;
      var dE = distanceTransform(dil, w, h, false);
      for (i = 0; i < N; i++) grown[i] = (dil[i] && dE[i] > 2 * scale) || grown[i] ? 1 : 0;
      object = fillHoles(grown, w, h);
      // --- 2б. Біркелкі фон (қағаз, үстел): фонға ұқсамайтын, жапыраққа жалғасқан бөліктердің бәрі – жапырақ.
      // Бұл қатты зақымданған қоңыр-қара аймақтарды жоғалтпау үшін керек.
      var bgObj = bgExpand(data, V, S, object, w, h, scale);
      if (bgObj) object = bgObj;
    }

    // --- 3. Жиек сызығы: жапырақ шетіндегі 1–2 пиксель есептелмейді
    var dIn = distanceTransform(object, w, h, false);
    var rim = whole ? 0 : Math.max(1.6, 1.4 * scale);

    // --- 4. Жарықтықты теңестіру: қараңғылық шегі жапырақтың өз жарықтығына байланысты
    var vs = [];
    for (i = 0; i < N; i += 3) if (core[i]) vs.push(V[i]);
    vs.sort(function (a, b) { return a - b; });
    var medV = vs.length ? vs[vs.length >> 1] : 0.4;
    var darkT = clamp(0.42 * medV, 0.07, 0.19);
    var hs = [];
    for (i = 0; i < N; i += 3) if (core[i]) hs.push(H[i]);
    hs.sort(function (a, b) { return a - b; });
    var medH = hs.length ? hs[hs.length >> 1] : 100;
    var relY = Math.min(80, medH - 20); // жапырақтың өз жасылынан едәуір сары реңк

    // --- 5. Пикселдерді жіктеу
    var cls = new Uint8Array(N), white = new Uint8Array(N);
    for (i = 0; i < N; i++) {
      if (!object[i]) { cls[i] = C.BG; continue; }
      if (dIn[i] <= rim) { cls[i] = C.RIM; continue; }
      var hh = H[i], s = S[i], v = V[i], k;
      if (v < darkT) k = (hh >= 55 && hh <= 185 && s >= 0.2) ? C.HEALTHY : C.DARK;
      else if (s < 0.16) {
        if (v > 0.58) { k = C.WHITE; white[i] = 1; }
        else if (v < 0.3) k = (hh >= 55 && hh <= 185) ? C.HEALTHY : C.DARK;
        else k = C.GRAY;
      }
      else if (hh >= 280 || hh < 10) k = (v > 0.3 && s > 0.3) ? C.PURPLE : C.NECROSIS;
      else if (hh < 38) k = (hh >= 12 && s > 0.5 && v > 0.42) ? C.RUST : C.NECROSIS;
      else if (hh < 49) k = (s >= 0.45 && v >= 0.4) ? C.RUST : (v < 0.4 ? C.NECROSIS : C.CHLOROSIS);
      else if (hh < 62) k = v < 0.4 ? C.NECROSIS : C.CHLOROSIS;
      else if (hh < relY && v > 0.45 && s > 0.25) k = C.CHLOROSIS;
      else if (hh <= 200) k = C.HEALTHY;
      else k = s < 0.3 ? C.GRAY : C.OTHER;
      cls[i] = k;
    }

    // --- 6. Ақ бөліктер: ақ өңез бе, жылтырау ма, бозғылт тамыр ма?
    var wc = components(white, w, h), dW = distanceTransform(white, w, h, false), wInfo = {};
    for (i = 0; i < N; i++) {
      if (!white[i]) continue;
      var id = wc.label[i], o = wInfo[id] || (wInfo[id] = { thick: 0, sv: 0, n: 0, len: Math.max(wc.comps[id - 1].w, wc.comps[id - 1].h) });
      if (dW[i] > o.thick) o.thick = dW[i]; o.sv += V[i]; o.n++;
    }
    var objArea = 0; for (i = 0; i < N; i++) objArea += object[i];
    var minPow = Math.max(6, objArea * 0.0015);
    for (i = 0; i < N; i++) {
      if (!white[i]) continue;
      var info = wInfo[wc.label[i]];
      var elong = info.len / Math.max(1, 2 * info.thick);
      var isVein = elong > 7 && info.n < objArea * 0.08;
      var isPow = !isVein && info.n >= minPow && info.thick >= 2.2 * scale && info.sv / info.n < 0.95;
      cls[i] = isPow ? C.POWDERY : (isVein ? C.HEALTHY : C.GLARE);
    }

    // --- 7. Үлестер (тек талданатын ұлпа бойынша)
    var counts = new Array(13).fill(0), leafArea = 0, gH = 0, gS = 0, gV = 0, sumGLI = 0, sumVARI = 0, sumExG = 0, sumV = 0;
    for (i = 0; i < N; i++) {
      var c0 = cls[i]; if (c0 === C.BG || c0 === C.RIM || c0 === C.GLARE) continue;
      counts[c0]++; leafArea++;
      if (c0 === C.HEALTHY) { gH += H[i]; gS += S[i]; gV += V[i]; }
      var R = data[i * 4], G = data[i * 4 + 1], B = data[i * 4 + 2];
      var den = 2 * G + R + B; sumGLI += den > 0 ? (2 * G - R - B) / den : 0;
      var dv = G + R - B; sumVARI += Math.abs(dv) > 5 ? clamp((G - R) / dv, -1, 1) : 0;
      var tot = R + G + B; sumExG += tot > 0 ? (2 * G - R - B) / tot : 0;
      sumV += V[i];
    }
    result.classMap = cls; result.leafArea = leafArea; result.leafFraction = objArea / N; result.wholeImage = whole;
    if (leafArea < N * 0.02) { result.ok = false; result.error = 'Жапырақтың талданатын бөлігі тым аз. Жақынырақтан түсіріңіз.'; return result; }
    result.ok = true;
    var frac = {};
    ['healthy', 'chlorosis', 'necrosis', 'dark', 'rust', 'powdery', 'purple', 'gray', 'other'].forEach(function (key, j) { frac[key] = counts[j + 1] / leafArea; });
    var glareN = 0; for (i = 0; i < N; i++) if (cls[i] === C.GLARE) glareN++;
    frac.glare = glareN / (objArea || 1);

    // --- 8. Кеңістіктік белгілер
    var lesion = new Uint8Array(N);
    for (i = 0; i < N; i++) { var c1 = cls[i]; lesion[i] = (c1 === C.NECROSIS || c1 === C.DARK || c1 === C.RUST || c1 === C.GRAY) ? 1 : 0; }
    var lc = components(lesion, w, h), minSpot = Math.max(4, leafArea * 0.0004);
    var spots = lc.comps.filter(function (c) { return c.area >= minSpot; });
    var spotAreas = spots.map(function (c) { return c.area / leafArea; }).sort(function (a, b) { return b - a; });
    var largestLesion = spotAreas.length ? spotAreas[0] : 0;
    var rustMask = new Uint8Array(N); for (i = 0; i < N; i++) rustMask[i] = cls[i] === C.RUST ? 1 : 0;
    var rustSpots = components(rustMask, w, h).comps.filter(function (c) { return c.area >= Math.max(2, leafArea * 0.0001); }).length;
    // ұсақ сары нүктелер (нүктелі хлороз)
    var chlMask = new Uint8Array(N); for (i = 0; i < N; i++) chlMask[i] = cls[i] === C.CHLOROSIS ? 1 : 0;
    var chlComps = components(chlMask, w, h).comps;
    var tinyY = chlComps.filter(function (c) { return c.area >= 2 && c.area <= Math.max(6, leafArea * 0.0006); }).length;
    var stipple = tinyY / Math.max(1, leafArea / 1000);

    // ақшыл «қабық» (ұнтақты көгерту): бозғылт-ақ жасыл пикселдердің шашыраңқы үлесі
    var film = 0, filmN = 0;
    for (i = 0; i < N; i++) {
      var c3 = cls[i]; if (c3 === C.BG || c3 === C.RIM) continue; filmN++;
      if (S[i] < 0.24 && V[i] > 0.55 && V[i] < 0.93 && H[i] >= 50 && H[i] <= 190) film++;
    }
    var smallWhite = wc.comps.filter(function (c) { return c.area >= 2 && c.area < minPow; }).length;
    var speck = smallWhite / Math.max(1, leafArea / 1000);
    var leafDiam = Math.sqrt(objArea), band2 = Math.max(6, leafDiam * 0.12);
    var lesTotal = 0, lesEdge = 0;
    for (i = 0; i < N; i++) if (lesion[i]) { lesTotal++; if (dIn[i] <= band2) lesEdge++; }
    var edgeShare = (lesTotal > 30 && !whole) ? lesEdge / lesTotal : 0;

    var notLes = new Uint8Array(N); for (i = 0; i < N; i++) notLes[i] = lesion[i] ? 0 : 1;
    var dl = distanceTransform(notLes, w, h, false), ring = 0, ringY = 0;
    for (i = 0; i < N; i++) { if (!object[i] || lesion[i] || cls[i] === C.RIM) continue; if (dl[i] <= 3.5 * scale) { ring++; if (cls[i] === C.CHLOROSIS) ringY++; } }
    var halo = ring > 20 ? ringY / ring : 0;

    function gridStats(cell) {
      var vals = [], mixed = 0, total = 0;
      for (var gy = 0; gy + cell <= h; gy += cell) for (var gx = 0; gx + cell <= w; gx += cell) {
        var nLeaf = 0, nY = 0, nG = 0;
        for (var yy = gy; yy < gy + cell; yy++) for (var xx = gx; xx < gx + cell; xx++) {
          var t = cls[yy * w + xx]; if (t === C.BG || t === C.RIM || t === C.GLARE) continue;
          nLeaf++; if (t === C.CHLOROSIS) nY++; else if (t === C.HEALTHY) nG++;
        }
        if (nLeaf < cell * cell * 0.7) continue;
        var fy = nY / nLeaf; vals.push(fy); total++;
        if (fy > 0.15 && nG / nLeaf > 0.15) mixed++;
      }
      var m = vals.reduce(function (a, b) { return a + b; }, 0) / (vals.length || 1);
      var sd = Math.sqrt(vals.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (vals.length || 1));
      return { cv: m > 0.01 ? sd / m : 0, mixed: total ? mixed / total : 0 };
    }
    var fine = gridStats(Math.max(4, Math.round(4 * scale))), coarse = gridStats(Math.max(12, Math.round(20 * scale)));

    var lapSq = 0, lapSum = 0, lapN = 0;
    for (y = 1; y < h - 1; y += 2) for (x = 1; x < w - 1; x += 2) {
      i = y * w + x; if (!object[i]) continue;
      var lap = 4 * V[i] - V[i - 1] - V[i + 1] - V[i - w] - V[i + w]; lapSum += lap; lapSq += lap * lap; lapN++;
    }
    var lapVar = lapN ? (lapSq / lapN - Math.pow(lapSum / lapN, 2)) * 255 * 255 : 0;
    var meanV = sumV / leafArea;
    if (meanV < 0.2) result.warnings.push('Сурет тым қараңғы. Күндізгі жарықта, көлеңкесіз түсіріңіз.');
    if (lapVar < 6) result.warnings.push('Сурет бұлыңғыр болуы мүмкін. Телефонды тұрақты ұстап, жапыраққа фокустаңыз.');
    if (frac.glare > 0.06) result.warnings.push('Жапырақ қатты жылтырап тұр. Тікелей күн сәулесінде емес, көлеңкеде түсіріңіз.');
    if (whole && !opts.wholeImage) result.warnings.push('Фон анықталмады: бүкіл кадр жапырақ ретінде талданды.');

    var weighted = frac.chlorosis * 0.7 + frac.necrosis + frac.dark + frac.rust + frac.powdery * 0.9 + frac.purple * 0.5 + frac.gray * 0.8;
    var healthIndex = Math.round(100 * clamp(1 - weighted * 1.25, 0, 1));
    var severity = Math.round((1 - frac.healthy - frac.other) * 1000) / 10;
    var severityClass = severity < 5 ? { level: 0, name: 'Зақым жоқ немесе өте әлсіз' } : severity < 15 ? { level: 1, name: 'Әлсіз зақым (ерте саты)' } :
      severity < 35 ? { level: 2, name: 'Орташа зақым' } : severity < 60 ? { level: 3, name: 'Күшті зақым' } : { level: 4, name: 'Өте күшті зақым' };

    var features = {
      healthy: frac.healthy, chlorosis: frac.chlorosis, necrosis: frac.necrosis, dark: frac.dark, rust: frac.rust,
      powdery: frac.powdery, purple: frac.purple, gray: frac.gray, glare: frac.glare,
      lesion: frac.necrosis + frac.dark + frac.rust + frac.gray, spotCount: spots.length, rustSpots: rustSpots,
      largestLesion: largestLesion, edgeShare: edgeShare, halo: halo, coarseCV: coarse.cv, fineMix: fine.mixed,
      stipple: stipple, film: filmN ? film / filmN : 0, speck: speck, GLI: sumGLI / leafArea, VARI: sumVARI / leafArea, ExG: sumExG / leafArea, brightness: meanV, sharpness: lapVar,
      greenHue: counts[C.HEALTHY] ? gH / counts[C.HEALTHY] : 0, greenSat: counts[C.HEALTHY] ? gS / counts[C.HEALTHY] : 0,
      greenVal: counts[C.HEALTHY] ? gV / counts[C.HEALTHY] : 0
    };
    result.fractions = frac; result.features = features; result.healthIndex = healthIndex;
    result.severity = severity; result.severityClass = severityClass;
    result.diagnoses = diagnose(features, severity / 100);
    return result;
  }

  // --- 9. Белгілер тобын анықтау (бұлыңғыр ережелер).
  // Шекаралық мәндер синтетикалық және нақты (PlantVillage) суреттердің «оқыту» бөлігінде бапталды.
  var P = { h_sev: [0.1646, 0.448], h_spot: [22.99, 123.7], h_les: [0.1848, 0.1941], h_chl: [0.001408, 0.01157], h_pow: [0.09496, 0.1999], h_pur: [0.03, 0.07], h_stip: [0.345, 0.6037], h_film: [0.672, 0.84], pale_h: [0, 5.816], pale_v: [0.25, 0.31], n_chl: [0.2, 0.5], n_cv: [0.3, 0.6], n_mix: [0.1, 0.22], iv_chl: [0.1, 0.25], iv_mix: [0.12, 0.24], mo_chl: [0.0293, 0.118], mo_cv: [0.45, 0.8], es_les: [0.04508, 0.161], es_edge: [0.9286, 0.9751], fs_spot: [1.521, 2.875], fs_les: [0.0025, 0.0037], fs_big: [0.003017, 0.006494], fs_big2: [0.161, 0.322], bs_spot: [1.7, 4.25], bs_big: [0.004, 0.008], bs_nec: [0.0015, 0.01], ru_frac: [0.002075, 0.1788], ru_spots: [5.554, 68.14], pw_frac: [0.01137, 0.1323], pw_film: [0.168, 0.84], bl_big: [0.015, 0.16], bl_nec: [0.01, 0.025], ph_pur: [0.03, 0.1], st_stip: [1.5, 4] };
  function diagnose(f, sev, PP) {
    PP = PP || P;
    var r = function (k, x) { return ramp(x, PP[k][0], PP[k][1]); };
    var nec = f.necrosis + f.dark, s = {};
    var pale = f.greenHue > 0 ? r('pale_h', 90 - f.greenHue) * r('pale_v', f.greenVal) : 0;
    var powderyScore = Math.max(r('pw_frac', f.powdery), r('pw_film', f.film || 0) * (1 - ramp(f.lesion, 0.04, 0.1)) * (1 - ramp(f.chlorosis, 0.1, 0.3)));
    s.healthy = (1 - r('h_sev', sev)) * (1 - r('h_spot', f.spotCount)) * (1 - r('h_les', f.lesion)) * (1 - r('h_chl', f.chlorosis)) *
      (1 - r('h_pow', f.powdery)) * (1 - r('h_pur', f.purple)) * (1 - r('h_stip', f.stipple)) * (1 - r('h_film', f.film || 0)) * (1 - 0.7 * pale);
    s.nitrogen = Math.max(r('n_chl', f.chlorosis) * (1 - r('n_cv', f.coarseCV)) * (1 - r('n_mix', f.fineMix)), 0.8 * pale * (1 - ramp(f.chlorosis, 0.06, 0.15))) * (1 - ramp(f.lesion, 0.05, 0.18));
    s.interveinal = r('iv_chl', f.chlorosis) * r('iv_mix', f.fineMix) * (1 - ramp(f.lesion, 0.06, 0.2)) * (1 - ramp(f.spotCount, 8, 18)) * (1 - ramp(f.coarseCV, 0.7, 1.0));
    s.mosaic = r('mo_chl', f.chlorosis) * r('mo_cv', f.coarseCV) * (1 - ramp(f.lesion, 0.04, 0.12)) * (1 - ramp(f.spotCount, 6, 14)) * (1 - ramp(f.fineMix, 0.2, 0.35)) * (1 - ramp(f.stipple, 2, 4));
    s.edge_scorch = r('es_les', f.lesion) * r('es_edge', f.edgeShare) * (1 - ramp(f.rust, 0.01, 0.04) * r('ru_spots', f.rustSpots)); // жиектегі біртұтас қоңыр-сары аймақ – тат емес, күйік
    s.fungal_spot = r('fs_spot', f.spotCount) * r('fs_les', f.lesion) * r('fs_big', f.largestLesion) * (1 - r('fs_big2', f.largestLesion)) *
      (1 - r('ru_frac', f.rust) * r('ru_spots', f.rustSpots)) * (0.7 + 0.3 * ramp(f.halo, 0.08, 0.3)) * (1 - r('es_edge', f.edgeShare) * 0.8);
    s.bacterial_spot = r('bs_spot', f.spotCount) * (1 - r('bs_big', f.largestLesion)) * r('bs_nec', nec) * (1 - r('ru_frac', f.rust)) * (0.6 + 0.4 * ramp(f.halo, 0.1, 0.35));
    s.rust = r('ru_frac', f.rust) * r('ru_spots', f.rustSpots);
    s.powdery = powderyScore;
    s.blight = r('bl_big', f.largestLesion) * r('bl_nec', nec + f.gray) * (1 - r('es_edge', f.edgeShare)) * (1 - r('ru_frac', f.rust));
    s.phosphorus = r('ph_pur', f.purple);
    var list = Object.keys(s).map(function (k) { return { id: k, score: Math.round(s[k] * 100) / 100 }; });
    list.sort(function (a, b) { return b.score - a.score; });
    return list;
  }

  global.LeafAnalyzer = { analyze: analyze, diagnose: diagnose, PARAMS: P, CLASS: C, CLASS_INFO: CLASS_INFO, rgb2hsv: rgb2hsv, version: '2.2.0' };
})(typeof window !== 'undefined' ? window : globalThis);
