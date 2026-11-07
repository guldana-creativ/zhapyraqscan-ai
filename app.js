/* ЖапырақСкан AI — интерфейс (2-нұсқа) */
(function () {
  'use strict';
  var A = window.LeafAnalyzer, SMP = window.LeafSamples;
  var KP = window.KB_PLANTS, KD = window.KB_DIS, KX = window.KB_PESTS, KK = window.KB_KEY;
  var PLANTS = KP.PLANTS, CATS = KP.CATS, DIS = KD.DISORDERS, TYPES = KD.TYPES, PESTS = KX.PESTS, BEN = KX.BENEFICIAL, SRC = KX.SOURCES;
  var $ = function (id) { return document.getElementById(id); };
  var JOURNAL_KEY = 'zhapyraqscan_journal_v2';
  var ANALYSIS_MAX = 512, AI_MAX = 1024;
  var state = { orig: null, overlay: null, result: null, aiImage: null, thumb: null, ai: null, plantnet: null, aiStatus: null, aiLoading: false, extra: [] };
  var REF = window.LEAF_REF || {}, PEST_GROUPS = KX.PEST_GROUPS || {};
  function imgSrc(f) { return (window.LEAF_IMG && window.LEAF_IMG[f]) || f; }

  var LOCAL_NAMES = {
    healthy: 'Зақым белгісі байқалмады', nitrogen: 'Біркелкі бозару, сарғаю', interveinal: 'Тамыраралық сарғаю («тор» өрнегі)',
    mosaic: 'Ала-құла сарғаю (мозаика)', edge_scorch: 'Жиек пен ұштың қурауы', fungal_spot: 'Дөңгелек қоңыр дақтар',
    bacterial_spot: 'Көптеген ұсақ қара дақтар', rust: 'Қызғылт сары (тат түсті) томпақтар', powdery: 'Ақ ұнтақ, өңез',
    blight: 'Ірі қара-қоңыр дақтар', phosphorus: 'Күлгін-қызыл реңк'
  };
  var KIND_COLORS = { 'ауру': '#8a5a2b', 'зиянкес': '#b8462b', 'жұмыртқа': '#c0702a', 'пайдалы жәндік': '#2e8b4a', 'қоректік зат': '#c08a10', 'су режимі': '#2a6fb0', 'ауа райы': '#d0632a', 'топырақ': '#7a5a3a', 'күтім': '#4a7a7a' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pct(x, d) { return (x * 100).toFixed(d == null ? 1 : d).replace('.', ','); }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDay(ts) { var d = new Date(ts); return two(d.getDate()) + '.' + two(d.getMonth() + 1) + '.' + d.getFullYear(); }
  function fmtDate(ts) { var d = new Date(ts); return fmtDay(ts) + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()); }
  function list(arr) { return arr && arr.length ? '<ul>' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------------- анықтамалық көмекшілері ---------------- */
  function kbItem(id) {
    if (DIS[id]) return { kind: 'disorder', id: id, d: DIS[id] };
    if (PESTS[id]) return { kind: 'pest', id: id, d: PESTS[id] };
    if (BEN[id]) return { kind: 'beneficial', id: id, d: BEN[id] };
    var p = PLANTS.filter(function (x) { return x.id === id; })[0];
    return p ? { kind: 'plant', id: id, d: p } : null;
  }
  function findPlant(text) {
    if (!text) return null;
    var t = String(text).toLowerCase().trim();
    var exact = PLANTS.filter(function (p) { return p.kk.toLowerCase() === t || p.lat.toLowerCase() === t || p.id === t; })[0];
    if (exact) return exact;
    var genus = t.split(/[\s,]+/)[0];
    return PLANTS.filter(function (p) {
      return p.kk.toLowerCase().indexOf(t) === 0 || p.lat.toLowerCase().split(/[\s,]+/)[0] === genus || (p.ru && p.ru.toLowerCase().indexOf(t) === 0);
    })[0] || null;
  }
  function catChips(cats) { return (cats || []).map(function (c) { var k = CATS[c]; return k ? '<span class="chip-tag" style="--c:' + k.color + '">' + esc(k.name) + '</span>' : ''; }).join(''); }
  var POISON = ['', 'Абай болыңыз: кейбір бөлігі зиянды', 'Улы өсімдік! Балалар мен малдан алыс ұстаңыз'];

  /* ---------------- суреттер (Уикипедия) және белгішелер ---------------- */
  var ICONS = {
    fungus: '<path d="M8 30c0-12 10-20 24-20s24 8 24 20H8z" fill="#c99a6b"/><circle cx="22" cy="22" r="3" fill="#fff8"/><circle cx="38" cy="18" r="4" fill="#fff8"/><rect x="27" y="30" width="10" height="22" rx="4" fill="#efe3cf"/>',
    bacteria: '<rect x="12" y="20" width="40" height="22" rx="11" fill="#c77ba6"/><circle cx="24" cy="31" r="3" fill="#fff9"/><circle cx="38" cy="29" r="2" fill="#fff9"/>',
    virus: '<circle cx="32" cy="32" r="14" fill="#9a7ac7"/><g stroke="#9a7ac7" stroke-width="3">' + [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { var r = a * Math.PI / 180; return '<line x1="' + (32 + 14 * Math.cos(r)) + '" y1="' + (32 + 14 * Math.sin(r)) + '" x2="' + (32 + 22 * Math.cos(r)) + '" y2="' + (32 + 22 * Math.sin(r)) + '"/>'; }).join('') + '</g>',
    nutrient: '<path d="M32 8C20 22 16 32 18 42c2 7 7 12 14 12s12-5 14-12c2-10-2-20-14-34z" fill="#e3c25a"/><path d="M32 18v34" stroke="#8a7a2a" stroke-width="2"/>',
    water: '<path d="M32 8C24 22 16 30 16 40a16 16 0 0032 0c0-10-8-18-16-32z" fill="#6aa7e0"/>',
    sun: '<circle cx="32" cy="32" r="12" fill="#f0a93a"/><g stroke="#f0a93a" stroke-width="3">' + [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { var r = a * Math.PI / 180; return '<line x1="' + (32 + 17 * Math.cos(r)) + '" y1="' + (32 + 17 * Math.sin(r)) + '" x2="' + (32 + 25 * Math.cos(r)) + '" y2="' + (32 + 25 * Math.sin(r)) + '"/>'; }).join('') + '</g>',
    soil: '<rect x="8" y="34" width="48" height="18" rx="3" fill="#9a7a5a"/><circle cx="20" cy="42" r="2" fill="#fff"/><circle cx="34" cy="46" r="2" fill="#fff"/><circle cx="46" cy="40" r="2" fill="#fff"/><path d="M32 34V16M32 22l-8-6M32 26l8-6" stroke="#3f9b48" stroke-width="3" fill="none"/>',
    care: '<rect x="18" y="30" width="28" height="22" rx="3" fill="#c98a5a"/><path d="M32 30c0-10-10-14-14-20 10 0 14 6 14 12 0-6 4-12 14-12-4 6-14 10-14 20z" fill="#3f9b48"/>',
    insect: '<ellipse cx="32" cy="36" rx="10" ry="14" fill="#7a4a2a"/><circle cx="32" cy="18" r="6" fill="#5a3a2a"/><g stroke="#5a3a2a" stroke-width="2.5">' + '<line x1="22" y1="30" x2="10" y2="24"/><line x1="42" y1="30" x2="54" y2="24"/><line x1="22" y1="38" x2="9" y2="40"/><line x1="42" y1="38" x2="55" y2="40"/><line x1="23" y1="46" x2="12" y2="54"/><line x1="41" y1="46" x2="52" y2="54"/><line x1="29" y1="13" x2="24" y2="5"/><line x1="35" y1="13" x2="40" y2="5"/></g>',
    ladybug: '<circle cx="32" cy="36" r="16" fill="#d23b2b"/><line x1="32" y1="20" x2="32" y2="52" stroke="#222" stroke-width="2"/><circle cx="32" cy="20" r="7" fill="#222"/><circle cx="25" cy="32" r="3" fill="#222"/><circle cx="39" cy="32" r="3" fill="#222"/><circle cx="26" cy="43" r="3" fill="#222"/><circle cx="38" cy="43" r="3" fill="#222"/>',
    leaf: '<path d="M32 6C18 18 12 30 14 42c2 9 9 15 18 16 9-1 16-7 18-16 2-12-4-24-18-36z" fill="#5fae6a"/><path d="M32 14v44" stroke="#e5f3df" stroke-width="2"/>'
  };
  function iconFor(item) {
    if (!item) return ICONS.leaf;
    if (item.kind === 'plant') return ICONS.leaf;
    if (item.kind === 'beneficial') return ICONS.ladybug;
    if (item.kind === 'pest') return ICONS.insect;
    var t = TYPES[item.d.type]; return ICONS[(t && t.icon) || 'leaf'] || ICONS.leaf;
  }
  function thumbHTML(item, cls) {
    var w = item && item.d && item.d.wiki, art = item && window.PEST_ART && window.PEST_ART[item.id];
    if (art) return '<div class="thumb art ' + (cls || '') + '"' + (w ? ' data-wiki="' + esc(w) + '"' : '') + '>' + art + '</div>';
    return '<div class="thumb ' + (cls || '') + '"' + (w ? ' data-wiki="' + esc(w) + '"' : '') + '><svg viewBox="0 0 64 64" aria-hidden="true">' + iconFor(item) + '</svg></div>';
  }
  var wikiCache = {};
  try { wikiCache = JSON.parse(store('zhs_wiki') || '{}') || {}; } catch (e) { wikiCache = {}; }
  function loadThumb(el) {
    var t = el.getAttribute('data-wiki'); if (!t || el.dataset.loaded) return; el.dataset.loaded = '1';
    var put = function (u) { if (!u) return; var img = new Image(); img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.onload = function () { el.innerHTML = ''; el.appendChild(img); el.classList.add('has-img'); }; img.src = u; };
    if (wikiCache[t] !== undefined) { put(wikiCache[t]); return; }
    if (location.protocol === 'file:') return;
    fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(t.replace(/ /g, '_'))).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var u = j && j.thumbnail && j.thumbnail.source || ''; wikiCache[t] = u; store('zhs_wiki', JSON.stringify(wikiCache)); put(u);
    }).catch(function () { /* сурет жүктелмесе, белгіше қалады */ });
  }
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { loadThumb(e.target); io.unobserve(e.target); } }); }, { rootMargin: '200px' }) : null;
  function hydrateThumbs(root) { (root || document).querySelectorAll('.thumb[data-wiki]').forEach(function (el) { if (io) io.observe(el); else loadThumb(el); }); }

  /* ---------------- толық анықтама терезесі ---------------- */
  function detailHTML(item) {
    if (!item) return '';
    var d = item.d, h = '';
    if (item.kind === 'plant') {
      h += thumbHTML(item, 'big') + '<h2 id="modalTitle">' + esc(d.kk) + '</h2><p class="latin">' + esc(d.lat) + (d.ru ? ' · ' + esc(d.ru) : '') + '</p><p>' + catChips(d.cat) + '</p>';
      if (d.poison) h += '<p class="poison p' + d.poison + '">' + esc(POISON[d.poison]) + '</p>';
      h += '<p>' + esc(d.about) + '</p>';
      if (d.risks && d.risks.length) h += '<h4>Жиі кездесетін аурулар мен зиянкестер</h4><div class="mini-grid">' + d.risks.map(function (r) { var it = kbItem(r); return it ? '<button class="mini" data-open="' + r + '">' + thumbHTML(it) + '<span>' + esc(it.d.name) + '</span></button>' : ''; }).join('') + '</div>';
    } else if (item.kind === 'disorder') {
      var t = TYPES[d.type];
      h += thumbHTML(item, 'big') + '<h2 id="modalTitle">' + esc(d.name) + '</h2><p><span class="chip-tag" style="--c:' + t.color + '">' + esc(t.name) + '</span></p><p>' + esc(d.short) + '</p>';
      h += '<h4>Белгілері</h4>' + list(d.signs) + (d.causes.length ? '<h4>Себептері</h4>' + list(d.causes) : '');
      h += '<h4>Шұғыл шара</h4>' + list(d.now) + '<h4>Қауіпсіз шаралар</h4>' + list(d.bio) + (d.chem.length ? '<h4>Химиялық шара</h4>' + list(d.chem) : '') + '<h4>Алдын алу</h4>' + list(d.prevention);
      if (d.plants && d.plants.length) h += '<h4>Қай өсімдіктерде</h4><p>' + d.plants.map(function (p) { var it = kbItem(p); return it ? '<button class="link" data-open="' + p + '">' + esc(it.d.kk) + '</button>' : ''; }).join(', ') + '</p>';
    } else if (item.kind === 'pest') {
      h += thumbHTML(item, 'big') + '<h2 id="modalTitle">' + esc(d.name) + '</h2><p class="latin">' + esc(d.lat) + ' · ' + esc(d.kind) + '</p>';
      h += '<h4>Қалай көрінеді</h4><p>' + esc(d.look) + '</p><h4>Жұмыртқасы</h4><p>' + esc(d.eggs) + '</p><h4>Зияны</h4><p>' + esc(d.damage) + '</p>';
      h += '<h4>Белгілері</h4>' + list(d.signs) + '<h4>Қолмен күресу</h4>' + list(d.mech) + '<h4>Қауіпсіз шаралар</h4>' + list(d.bio) + (d.chem.length ? '<h4>Химиялық шара</h4>' + list(d.chem) : '') + '<h4>Алдын алу</h4>' + list(d.prevention);
      if (d.enemies && d.enemies.length) h += '<h4>Табиғи жаулары (оларды сақтаңыз)</h4><p>' + d.enemies.map(function (e) { return '<button class="link" data-open="' + e + '">' + esc(BEN[e].name) + '</button>'; }).join(', ') + '</p>';
      if (d.plants && d.plants.length) h += '<h4>Қай өсімдіктерде</h4><p>' + d.plants.map(function (p) { var it = kbItem(p); return it ? '<button class="link" data-open="' + p + '">' + esc(it.d.kk) + '</button>' : ''; }).join(', ') + '</p>';
    } else {
      h += thumbHTML(item, 'big') + '<h2 id="modalTitle">' + esc(d.name) + '</h2><p class="latin">' + esc(d.lat) + '</p><p class="good">Пайдалы жәндік – жоймаңыз!</p>';
      h += '<h4>Қалай көрінеді</h4><p>' + esc(d.look) + '</p><h4>Жұмыртқасы</h4><p>' + esc(d.eggs) + '</p><h4>Пайдасы</h4><p>' + esc(d.benefit) + '</p><h4>Қалай қорғаймыз</h4><p>' + esc(d.protect) + '</p>';
    }
    var refs = (REF[item.id] || []);
    if (refs.length) h += '<h4>Жинақтағы нақты суреттер</h4><div class="ref-grid">' + refs.slice(0, 8).map(function (r) { var pl = kbItem(r.plant); return '<figure><img src="' + imgSrc(r.file) + '" alt="" loading="lazy"><figcaption>' + esc(pl ? pl.d.kk : '') + ' · ' + esc(r.src) + '</figcaption></figure>'; }).join('') + '</div>';
    var srcs = (d.src || []).map(function (s) { return SRC[s]; }).filter(Boolean);
    if (refs.length) srcs.push('Үлгі суреттер: PlantVillage (Hughes, Salathé, 2015) және PlantDoc (Singh et al., 2020, CC BY 4.0).');
    srcs.push(SRC.wiki);
    h += '<p class="src">Дереккөздер: ' + srcs.map(esc).join(' ') + '</p>';
    return h;
  }
  function openDetail(id) {
    var it = kbItem(id); if (!it) return;
    $('modalBody').innerHTML = detailHTML(it); $('modal').hidden = false; hydrateThumbs($('modalBody'));
    $('modalClose').focus();
  }

  /* ---------------- маршрут ---------------- */
  function route() {
    var v = (location.hash || '#analyze').slice(1);
    if (!document.querySelector('.view[data-view="' + v + '"]')) v = 'analyze';
    document.querySelectorAll('.view').forEach(function (el) { el.hidden = el.dataset.view !== v; });
    document.querySelectorAll('.tabs a').forEach(function (a) { if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (v === 'journal') renderJournal();
    if (v === 'library') renderLibrary();
    if (v === 'key' && !keyState.started) keyStart('start');
    if (v === 'about') renderAbout();
    if (v === 'compare' && window.ZHS_COMPARE) window.ZHS_COMPARE.render();
    window.scrollTo(0, 0);
  }

  /* ---------------- сурет жүктеу және талдау ---------------- */
  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) { alert('Сурет файлын таңдаңыз (JPG немесе PNG).'); return; }
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () { processImage(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); };
    img.onerror = function () { alert('Бұл суретті ашу мүмкін болмады. JPG немесе PNG пішімін қолданыңыз.'); };
    img.src = url;
  }
  function drawScaled(src, w, h, max) {
    var k = Math.min(1, max / Math.max(w, h)), cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
    var ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(src, 0, 0, cv.width, cv.height);
    return cv;
  }
  function processImage(src, w, h) {
    var cv = drawScaled(src, w, h, ANALYSIS_MAX);
    state.orig = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height);
    state.aiImage = drawScaled(src, w, h, AI_MAX).toDataURL('image/jpeg', 0.85);
    state.thumb = drawScaled(src, w, h, 180).toDataURL('image/jpeg', 0.72);
    state.ai = null; state.plantnet = null; state.extra = []; renderExtra();
    $('drop').hidden = true; $('stage').hidden = false;
    runAnalysis();
    var sp = $('specimen').getBoundingClientRect();
    if (sp.top < 0 || sp.top > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + sp.top - 70, behavior: 'smooth' });
  }
  function runAnalysis() {
    if (!state.orig) return;
    var t0 = performance.now();
    var r = A.analyze(state.orig, { wholeImage: $('wholeImage').checked });
    r.ms = Math.round(performance.now() - t0);
    state.result = r; state.overlay = buildOverlay(r, state.orig);
    var main = $('cvMain'); main.width = state.orig.width; main.height = state.orig.height;
    renderCompare();
    $('lblDate').textContent = fmtDay(Date.now());
    renderAll();
    if ($('useAI').checked && state.aiStatus && state.aiStatus.ai && r.ok) runAI();
  }
  function buildOverlay(r, orig) {
    var out = new ImageData(orig.width, orig.height), d = orig.data, o = out.data, cls = r.classMap || new Uint8Array(orig.width * orig.height);
    for (var i = 0, n = orig.width * orig.height; i < n; i++) {
      var k = cls[i], R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2], g = (R + G + B) / 3;
      if (k === 0) { o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = 205 + g * 0.18; }
      else if (k === 1) { o[i * 4] = 80 + g * 0.12; o[i * 4 + 1] = 160 + g * 0.12; o[i * 4 + 2] = 90 + g * 0.12; }
      else { var c = (A.CLASS_INFO[k] || A.CLASS_INFO[9]).color; o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; }
      o[i * 4 + 3] = 255;
    }
    return out;
  }
  function renderCompare() {
    if (!state.orig) return;
    var cv = $('cvMain'), ctx = cv.getContext('2d'), split = +$('split').value / 100, xs = Math.round(cv.width * split);
    ctx.putImageData(state.orig, 0, 0);
    if (state.overlay && xs < cv.width) ctx.putImageData(state.overlay, 0, 0, xs, 0, cv.width - xs, cv.height);
    $('compareLine').style.left = (split * 100) + '%';
    $('compareLine').style.display = (split <= 0 || split >= 1) ? 'none' : 'block';
  }

  /* ---------------- нәтиже ---------------- */
  function hiColor(hi) { return hi >= 85 ? '#2e9e4c' : hi >= 60 ? '#7ea83a' : hi >= 35 ? '#d9a21b' : '#b8462b'; }
  function currentPlant() {
    var a = state.ai && state.ai.plant;
    if (a) { var p = (a.kb_id && kbItem(a.kb_id) && kbItem(a.kb_id).kind === 'plant') ? kbItem(a.kb_id).d : findPlant(a.latin) || findPlant(a.kk); return { kb: p, ai: a }; }
    if (state.plantnet && state.plantnet[0]) { return { kb: findPlant(state.plantnet[0].latin), pn: state.plantnet[0] }; }
    var typed = $('plantInput').value; return { kb: findPlant(typed), typed: typed };
  }
  function localTop() { var r = state.result; if (!r || !r.ok) return null; var t = r.diagnoses[0]; return t.score < 0.2 && t.id !== 'healthy' ? { id: 'unclear', score: t.score } : t; }
  function localGroups() {
    var d = state.result && state.result.ok ? state.result.diagnoses : [], lt = localTop();
    if (!lt || lt.id === 'unclear') return [];
    var g = [lt.id];
    var plant = currentPlant().kb, risky = function (grp) { return plant && plant.risks.some(function (x) { return DIS[x] && DIS[x].local === grp; }); };
    if (lt.id !== 'healthy' && d[1] && d[1].id !== 'healthy' && ((d[1].score >= 0.2 && d[1].score >= 0.45 * d[0].score) || (d[1].score >= 0.12 && risky(d[1].id)))) g.push(d[1].id);
    return g;
  }
  function candidatesFor(groups, plant) {
    if (typeof groups === 'string') groups = [groups];
    groups = (groups || []).filter(function (g) { return g && g !== 'unclear' && g !== 'healthy'; });
    if (!groups.length) return [];
    var ids = [];
    groups.forEach(function (g) {
      Object.keys(DIS).forEach(function (k) { if (DIS[k].local === g && k !== 'healthy') ids.push(k); });
      if (g === 'mosaic' || g === 'nitrogen' || g === 'interveinal') ids.push('spider_mite');
      if (g === 'mosaic') ids.push('thrips');
    });
    var risks = plant && plant.risks || [];
    ids = ids.filter(function (x, i) { return ids.indexOf(x) === i && kbItem(x); });
    if (plant) { // өсімдікке тән емес ауруларды алып тастау (мысалы, бактериялық күйік қызанақта болмайды)
      var fit = ids.filter(function (x) { var d = kbItem(x).d; return risks.indexOf(x) >= 0 || !d.plants || !d.plants.length || d.plants.indexOf(plant.id) >= 0; });
      if (fit.length) ids = fit;
    }
    ids.sort(function (a, b) { return (risks.indexOf(b) >= 0) - (risks.indexOf(a) >= 0); });
    return ids.slice(0, 6);
  }

  function renderAll() {
    var r = state.result;
    $('resultEmpty').hidden = true; $('result').hidden = false; $('saveMsg').textContent = '';
    renderSummary(); renderPlant(); renderDx(); renderColor(); renderAdvice();
    $('btnSave').disabled = !(r && r.ok);
    hydrateThumbs($('result'));
  }

  function topFindings() {
    var ai = state.ai; if (!ai || ai.is_plant === false) return [];
    return (ai.findings || []).filter(function (f) { return f.kind !== 'пайдалы жәндік'; }).sort(function (a, b) { return (b.confidence || 0) - (a.confidence || 0); });
  }
  function renderSummary() {
    var el = $('summaryCard'), r = state.result, cp = currentPlant(), ai = state.ai, h = '<p class="card-kicker">Қорытынды</p>';
    if (!r.ok && !ai) { el.hidden = true; return; } el.hidden = false;
    if (state.aiLoading && !ai) { el.innerHTML = h + '<p><span class="spinner"></span>Өсімдік пен ауру анықталып жатыр…</p>'; return; }
    if (ai && ai.is_plant === false) { el.innerHTML = h + '<h3>Суретте өсімдік табылмады</h3><p>Жапырақты жақыннан, жарық жерде түсіріңіз.</p>'; return; }
    var name = cp.ai ? (cp.ai.kk || (cp.kb && cp.kb.kk)) : cp.kb ? cp.kb.kk : null, lat = cp.ai ? cp.ai.latin : cp.kb ? cp.kb.lat : '';
    var groups = cp.kb ? cp.kb.cat.map(function (c) { return CATS[c] ? CATS[c].name.toLowerCase() : ''; }).filter(Boolean).join(', ') : (cp.ai && cp.ai.group) || '';
    var s1 = name ? 'Бұл – <b>' + esc(name) + '</b>' + (lat ? ' (<i>' + esc(lat) + '</i>)' : '') + ' жапырағы' + (groups ? ' [' + esc(groups) + ']' : '') + '.' : 'Өсімдік түрі анықталмады' + (state.aiStatus && state.aiStatus.ai ? '.' : ' (AI кілті қосылмаған).');
    var fs = topFindings(), lt = localTop(), s2;
    if (ai) s2 = fs.length ? 'Анықталған мәселе: ' + fs.slice(0, 2).map(function (f) { return '<b>' + esc(f.name) + '</b> (' + esc(f.confidence) + '%)'; }).join(', ') + '.' : 'Ауру мен зиянкес белгілері <b>көрінбейді</b>.';
    else s2 = lt && lt.id !== 'unclear' ? (lt.id === 'healthy' ? 'Түс индикаторы зақым белгісін таппады.' : 'Түс индикаторы тапқан белгі: <b>' + esc(LOCAL_NAMES[lt.id].toLowerCase()) + '</b>.') : 'Белгілер анық емес.';
    var s3 = '';
    var aiHealthy = ai && !fs.length && ai.overall !== 'анықтау мүмкін емес';
    if (r.ok && aiHealthy && r.severity >= 5) {
      // AI зақым таппады, ал түс индикаторы қоңыр/сары аймақ тапты: бұл көбіне жеміс, сабақ, көлеңке немесе фон
      s3 = 'Жапырақ сау көрінеді. <span class="muted">Түс индикаторы ' + String(r.severity).replace('.', ',') + '% қоңыр немесе сары аймақ тапты, бірақ бұл суреттегі жеміс, сабақ, көлеңке немесе фон болуы мүмкін. Күмәнді болса, анықтағышпен нақтылаңыз.</span>';
    } else if (r.ok) {
      s3 = 'Жапырақтың <b>' + String(r.severity).replace('.', ',') + '%</b>-ы зақымданған (' + r.severityClass.name.toLowerCase() + ').';
      if (ai && ai.severity_percent != null && Math.abs(ai.severity_percent - r.severity) > 15) s3 += ' <span class="muted">AI бағасы: шамамен ' + esc(ai.severity_percent) + '%.</span>';
    }
    h += '<p class="sum-text">' + s1 + ' ' + s2 + ' ' + s3 + '</p>';
    var acts = ai ? (ai.actions_now || []).concat(ai.actions_safe || []).slice(0, 3) : [];
    if (acts.length) h += '<p class="small"><b>Не істеу керек:</b></p>' + list(acts);
    if (ai && ai.need_more_photos) h += '<p class="agree a1">Сенімділік жеткіліксіз. ' + esc(ai.what_to_photograph || 'Жапырақтың астын немесе бүкіл өсімдікті қосымша түсіріңіз.') + ' Төмендегі «+» батырмасы арқылы сурет қосыңыз.</p>';
    if (cp.ai && cp.ai.alternatives && cp.ai.alternatives.length) h += '<p class="small muted">Ұқсас түрлер: ' + cp.ai.alternatives.map(function (a2) { return esc(a2.kk || a2.latin) + (a2.confidence ? ' ' + esc(a2.confidence) + '%' : ''); }).join(', ') + '</p>';
    var top = fs[0], refs = top && top.kb_id && REF[top.kb_id] ? REF[top.kb_id] : [];
    if (refs.length && cp.kb) { var same = refs.filter(function (x) { return x.plant === cp.kb.id; }); if (same.length) refs = same; }
    if (refs.length) h += '<p class="small"><b>Салыстырыңыз:</b> жинақтағы осы аурудың нақты суреттері</p><div class="ref-grid small">' + refs.slice(0, 4).map(function (x) { return '<figure><img src="' + imgSrc(x.file) + '" alt="" loading="lazy"><figcaption>' + esc(x.src) + '</figcaption></figure>'; }).join('') + '</div>';
    if (ai && ai.summary) h += '<details class="tech"><summary>AI-дың толық түсіндірмесі</summary><p>' + esc(ai.summary) + '</p></details>';
    el.innerHTML = h;
  }

  function renderPlant() {
    var cp = currentPlant(), el = $('plantCard'), h = '<p class="card-kicker">1. Өсімдік</p>';
    if (state.aiLoading) h += '<p><span class="spinner"></span>AI көру модулі өсімдікті танып жатыр…</p>';
    if (cp.ai) {
      var a = cp.ai;
      if (state.ai.is_plant === false) h += '<h3>Суретте өсімдік табылмады</h3>';
      else {
        h += '<div class="plant-row">' + (cp.kb ? thumbHTML({ kind: 'plant', d: cp.kb }) : '') + '<div><h3>' + esc(a.kk || (cp.kb && cp.kb.kk) || 'Белгісіз өсімдік') + '</h3><p class="latin">' + esc(a.latin || '') + (a.confidence != null ? ' · сенімділік ' + esc(a.confidence) + '%' : '') + '</p>';
        h += '<p>' + (cp.kb ? catChips(cp.kb.cat) : (a.group ? '<span class="chip-tag">' + esc(a.group) + '</span>' : '')) + '</p></div></div>';
        var pz = Math.max(+a.poisonous || 0, cp.kb ? cp.kb.poison : 0);
        if (pz) h += '<p class="poison p' + pz + '">' + esc(POISON[pz]) + '</p>';
        if (a.why) h += '<p class="muted small">Неге: ' + esc(a.why) + '</p>';
        if (cp.kb) h += '<p class="small">' + esc(cp.kb.about) + ' <button class="link" data-open="' + cp.kb.id + '">Толығырақ</button></p>';
      }
    } else if (cp.pn) {
      h += '<h3>' + esc(cp.kb ? cp.kb.kk : cp.pn.latin) + '</h3><p class="latin">' + esc(cp.pn.latin) + ' · Pl@ntNet ' + cp.pn.score + '%</p>' + (cp.kb ? '<p>' + catChips(cp.kb.cat) + '</p>' : '');
    } else if (cp.kb) {
      h += '<div class="plant-row">' + thumbHTML({ kind: 'plant', d: cp.kb }) + '<div><h3>' + esc(cp.kb.kk) + '</h3><p class="latin">' + esc(cp.kb.lat) + ' · сіз көрсеттіңіз</p><p>' + catChips(cp.kb.cat) + '</p></div></div>';
      if (cp.kb.poison) h += '<p class="poison p' + cp.kb.poison + '">' + esc(POISON[cp.kb.poison]) + '</p>';
    } else if (!state.aiLoading) {
      h += '<p class="muted">Өсімдік түрі белгісіз. Жоғарыдағы өріске атауын жазыңыз немесе AI көру модулін қосыңыз (README нұсқаулығы).</p>';
    }
    if (state.plantnet && state.plantnet.length) h += '<p class="small muted">Pl@ntNet ботаникалық болжамы: ' + state.plantnet.map(function (p) { return '<i>' + esc(p.latin) + '</i> ' + p.score + '%'; }).join(', ') + '</p>';
    el.innerHTML = h;
    $('lblPlant').textContent = cp.kb ? cp.kb.kk : (cp.ai && cp.ai.kk) || cp.typed || '—';
  }

  function agreement(aiFindings, lt) {
    if (!lt) return null;
    if (!aiFindings.length) return lt.id === 'healthy' ? { ok: 2, t: 'Екі тексеру де жапырақты сау деп тапты.' } : { ok: 0, t: 'AI ешқандай мәселе таппады, бірақ түс индикаторы «' + (LOCAL_NAMES[lt.id] || 'анық емес белгі') + '» көрсетті. Анықтағышпен тексеріңіз.' };
    var groups = aiFindings.map(function (f) { var it = f.kb_id && kbItem(f.kb_id); return it && it.kind === 'disorder' ? it.d.local : null; });
    if (groups.indexOf(lt.id) >= 0) return { ok: 2, t: 'AI мен түс индикаторы бір белгіні көрсетті – қорытындыға сенуге болады.' };
    if (lt.id === 'healthy') return { ok: 1, t: 'Түс индикаторы зақымның аз екенін көрсетті – бұл ерте сатының белгісі болуы мүмкін.' };
    return { ok: 1, t: 'Тексерулер ішінара сәйкес. Анықтағыш кілтпен нақтылаңыз.' };
  }

  function renderDx() {
    var el = $('dxCard'), r = state.result, h = '<p class="card-kicker">2. Диагноз</p>', lt = localTop();
    if (!r.ok) { el.innerHTML = h + '<h3>Жапырақ табылмады</h3><p>' + esc(r.error) + '</p>'; return; }
    var ai = state.ai;
    if (ai && ai.is_plant !== false) {
      var fs = (ai.findings || []).slice().sort(function (a, b) { return (b.confidence || 0) - (a.confidence || 0); });
      var ov = ai.overall || (fs.length ? 'Мәселе табылды' : 'Сау'); h += '<h3>' + esc(ov.charAt(0).toUpperCase() + ov.slice(1)) + '</h3>';
      if (!fs.length) h += '<p>Ауру, зиянкес және бұзылыс белгілері көрінбейді.</p>';
      h += fs.map(function (f) {
        var it = f.kb_id && kbItem(f.kb_id), col = KIND_COLORS[f.kind] || '#666';
        return '<div class="finding">' + (it ? thumbHTML(it) : '') + '<div class="f-body"><div class="f-head"><span class="chip-tag" style="--c:' + col + '">' + esc(f.kind || '') + '</span><b>' + esc(f.name || (it && it.d.name)) + '</b><span class="f-pct">' + esc(f.confidence) + '%</span></div>' +
          '<div class="bar"><span style="width:' + (+f.confidence || 0) + '%"></span></div>' + (f.evidence ? '<p class="small">Суретте: ' + esc(f.evidence) + (f.stage ? ' (' + esc(f.stage) + ' саты)' : '') + '</p>' : '') +
          (it ? '<button class="link" data-open="' + f.kb_id + '">Анықтамалықта ашу</button>' : '') + '</div></div>';
      }).join('');
      var ag = agreement(fs.filter(function (f) { return f.kind !== 'пайдалы жәндік'; }), lt);
      if (ag) h += '<p class="agree a' + ag.ok + '">' + esc(ag.t) + '</p>';
      if (ai.note) h += '<p class="note">' + esc(ai.note) + '</p>';
    } else {
      if (state.aiLoading) h += '<p><span class="spinner"></span>AI ауру мен зиянкесті іздеп жатыр…</p>';
      var cp = currentPlant();
      if (!lt || lt.id === 'unclear') h += '<h3>Белгілер анық емес</h3><p>Түс индикаторы нақты белгі таппады. Суретті жақсы жарықта қайта түсіріңіз немесе анықтағышты қолданыңыз.</p>';
      else if (lt.id === 'healthy') h += '<h3>Зақым белгісі байқалмады</h3>' + (r.diagnoses[1] && r.diagnoses[1].id !== 'healthy' && r.diagnoses[1].score >= 0.35 ? '<p class="agree a1">Әлсіз белгі бар: «' + esc(LOCAL_NAMES[r.diagnoses[1].id].toLowerCase()) + '». Бұл аурудың ең ерте сатысы болуы мүмкін – өсімдікті 3–5 күннен кейін қайта тексеріп, журналға сақтаңыз.</p>' : '') + '<p class="small">Түс индикаторы тек түстерді өлшейді: су тапшылығы, зиянкестер мен вирустардың кейбір белгілері түспен көрінбеуі мүмкін.</p>';
      else {
        var lg = localGroups();
        h += '<h3>' + esc(LOCAL_NAMES[lt.id]) + '</h3>' + (lg[1] ? '<p class="small muted">Қосымша белгі: ' + esc(LOCAL_NAMES[lg[1]].toLowerCase()) + '</p>' : '') + '<p class="small">Бұл белгі мына себептердің біріне тән' + (cp.kb ? ' (' + esc(cp.kb.kk) + ' үшін жиі кездесетіндері бірінші тұр)' : '') + ':</p>';
        h += '<div class="mini-grid">' + candidatesFor(lg, cp.kb).map(function (id) { var it = kbItem(id); return '<button class="mini" data-open="' + id + '">' + thumbHTML(it) + '<span>' + esc(it.d.name) + '</span></button>'; }).join('') + '</div>';
      }
      h += '<p><a class="btn small" href="#key" data-keyfrom="' + (lt ? lt.id : 'healthy') + '">Анықтағышпен нақтылау</a></p>';
    }
    el.innerHTML = h;
  }

  function renderColor() {
    var r = state.result;
    if (!r.ok) { $('colorCard').hidden = true; return; }
    $('colorCard').hidden = false;
    $('hiNum').textContent = r.healthIndex;
    var g = $('gaugeVal'); g.style.stroke = hiColor(r.healthIndex); g.style.strokeDashoffset = (314.16 * (1 - r.healthIndex / 100)).toFixed(1);
    var lt = localTop();
    $('localGroup').textContent = lt ? (lt.id === 'unclear' ? 'Белгі анық емес' : LOCAL_NAMES[lt.id]) : '—';
    $('sevText').textContent = 'Зақымданған аудан: ' + String(r.severity).replace('.', ',') + '% (' + r.severityClass.name.toLowerCase() + ')';
    var w = r.warnings.slice();
    if (lt && lt.id !== 'healthy' && lt.id !== 'unclear' && r.severity < 15) w.unshift('Ерте саты: белгілер жапырақтың аз ғана бөлігінде. Қазір шара қолданса, тоқтату оңай.');
    $('warnings').innerHTML = w.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('');
    var keys = ['healthy', 'chlorosis', 'necrosis', 'dark', 'rust', 'powdery', 'purple', 'gray', 'other'], bar = '', leg = '';
    keys.forEach(function (k) {
      var idx = A.CLASS_INFO.findIndex(function (c) { return c.key === k; }), f = r.fractions[k] || 0, col = 'rgb(' + A.CLASS_INFO[idx].color.join(',') + ')';
      if (f > 0.001) bar += '<div style="width:' + (f * 100) + '%;background:' + col + '" title="' + esc(A.CLASS_INFO[idx].name) + '"></div>';
      if (f >= 0.002) leg += '<li><i style="background:' + col + '"></i>' + esc(A.CLASS_INFO[idx].name) + ': <b>' + pct(f) + '%</b></li>';
    });
    $('stackBar').innerHTML = bar; $('stackLegend').innerHTML = leg;
    var f = r.features;
    var rows = [['Жапырақтың кадрдағы үлесі', pct(r.leafFraction) + '%'], ['Дақтар саны', f.spotCount], ['Ең үлкен дақтың ауданы', pct(f.largestLesion, 2) + '%'],
      ['Зақымның жиекке шоғырлануы', pct(f.edgeShare, 0) + '%'], ['Дақ айналасындағы сары жиек (гало)', pct(f.halo, 0) + '%'], ['Жылтырау (есептелмеді)', pct(f.glare, 1) + '%'],
      ['Жасыл ұлпаның орташа реңкі', f.greenHue.toFixed(0) + '°'], ['GLI жасылдық индексі', f.GLI.toFixed(3)], ['VARI жасылдық индексі', f.VARI.toFixed(3)], ['Талдау уақыты', r.ms + ' мс']];
    $('featTable').innerHTML = rows.map(function (x) { return '<tr><td>' + esc(x[0]) + '</td><td>' + esc(x[1]) + '</td></tr>'; }).join('');
  }

  function renderAdvice() {
    var el = $('adviceCard'), r = state.result, h = '<p class="card-kicker">3. Не істеу керек</p>', ai = state.ai;
    if (!r.ok) { el.hidden = true; return; } el.hidden = false;
    var now = [], safe = [], chem = [], prev = [];
    if (ai && ai.is_plant !== false) { now = ai.actions_now || []; safe = ai.actions_safe || []; chem = ai.actions_chemical || []; prev = ai.prevention || []; }
    if (!now.length && !safe.length) {
      var lt = localTop(), cp = currentPlant(), id = lt && lt.id !== 'unclear' ? (lt.id === 'healthy' ? 'healthy' : candidatesFor(localGroups(), cp.kb)[0]) : null, it = id && kbItem(id);
      if (it && it.kind === 'disorder') { now = it.d.now; safe = it.d.bio; chem = it.d.chem; prev = it.d.prevention; h += '<p class="small muted">Ең ықтимал себеп бойынша: <b>' + esc(it.d.name) + '</b></p>'; }
      else if (it && it.kind === 'pest') { now = it.d.mech; safe = it.d.bio; chem = it.d.chem; prev = it.d.prevention; }
    }
    if (!now.length && !safe.length) { el.innerHTML = h + '<p class="muted">Нақты себеп анықталған соң ұсыныс шығады.</p>'; return; }
    h += (now.length ? '<h4>Шұғыл</h4>' + list(now) : '') + (safe.length ? '<h4>Қауіпсіз, биологиялық шаралар</h4>' + list(safe) : '') +
      (chem.length ? '<h4>Химиялық шара</h4>' + list(chem) + '<p class="warn-chem">Химиялық препаратпен тек ересектер, қолғап пен маска киіп, нұсқаулық бойынша жұмыс істейді.</p>' : '') +
      (prev.length ? '<h4>Алдын алу</h4>' + list(prev) : '');
    if (ai && ai.photo_tips) h += '<p class="small muted">Сурет туралы кеңес: ' + esc(ai.photo_tips) + '</p>';
    el.innerHTML = h;
  }

  /* ---------------- AI көру модулі ---------------- */
  function checkAI() {
    var el = $('aiStatus');
    var set = function (st, text) {
      state.aiStatus = st; el.textContent = text; $('useAI').disabled = !st.ai; $('useAI').checked = !!st.ai; $('lblMode').textContent = st.ai ? 'AI + түс индикаторы' : 'Түс индикаторы';
      var b = $('aiBanner'); if (b) { b.hidden = !!st.ai; b.innerHTML = st.ai ? '' : '<b>AI көру модулі қосылмаған.</b> Өсімдіктің түрін және ауруын суреттен тану үшін Vercel-де <code>GEMINI_API_KEY</code> кілтін қосыңыз (тегін, README нұсқаулығы). Қазір тек түс индикаторы, анықтағыш және анықтамалық жұмыс істейді.'; }
    };
    if (location.protocol === 'file:') { set({ ai: false }, '(файлдан ашқанда жұмыс істемейді)'); return; }
    var ctrl = new AbortController(); setTimeout(function () { ctrl.abort(); }, 6000);
    fetch('api/status', { signal: ctrl.signal }).then(function (r) { return r.json(); }).then(function (j) {
      var parts = []; if (j.vision) parts.push(j.vision); if (j.plantnet) parts.push('Pl@ntNet');
      set(j, j.ai ? '(қосылған: ' + parts.join(' + ') + ')' : '(кілт бапталмаған – README қараңыз)');
    }).catch(function () { set({ ai: false }, '(сервер қолжетімсіз)'); });
  }
  function kbBrief() {
    return {
      plants: PLANTS.map(function (p) { return { id: p.id, name: p.kk + ' / ' + p.lat }; }),
      disorders: Object.keys(DIS).map(function (k) { return { id: k, name: DIS[k].name }; }),
      pests: Object.keys(PESTS).map(function (k) { return { id: k, name: PESTS[k].name }; }),
      beneficial: Object.keys(BEN).map(function (k) { return { id: k, name: BEN[k].name }; })
    };
  }
  function renderExtra() {
    var el = $('extraList'); if (!el) return;
    el.innerHTML = state.extra.map(function (u, i) { return '<span class="extra"><img src="' + u + '" alt="Қосымша сурет"><button type="button" data-delextra="' + i + '" aria-label="Өшіру">×</button></span>'; }).join('');
  }
  function addExtra(file) {
    if (!file || !/^image\//.test(file.type) || state.extra.length >= 2) return;
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () { state.extra.push(drawScaled(img, img.naturalWidth, img.naturalHeight, AI_MAX).toDataURL('image/jpeg', 0.85)); URL.revokeObjectURL(url); renderExtra(); if ($('useAI').checked && state.aiStatus && state.aiStatus.ai && state.result && state.result.ok) runAI(); };
    img.src = url;
  }
  function localSummary(r) {
    if (!r || !r.ok) return null;
    var lt = r.diagnoses[0];
    return { health_index: r.healthIndex, damaged_percent: r.severity, color_sign: LOCAL_NAMES[lt.id] || 'анық емес',
      tissue: { yellow: Math.round(r.fractions.chlorosis * 1000) / 10, brown: Math.round((r.fractions.necrosis + r.fractions.dark) * 1000) / 10, white: Math.round(r.fractions.powdery * 1000) / 10, orange: Math.round(r.fractions.rust * 1000) / 10 } };
  }
  function callAI(images, plantHint, local) {
    return fetch('api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: images, plantHint: plantHint || '', local: local, kb: kbBrief() }) })
      .then(function (x) { return x.json().catch(function () { return { ok: false, error: x.status === 504 ? 'AI уақытында жауап бермеді (504). Бір минуттан кейін қайталаңыз' : 'Сервер қатесі (' + x.status + ')' }; }); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'AI жауап бермеді'); return j; });
  }
  function runAI() {
    var r = state.result; state.aiLoading = true; renderSummary(); renderPlant(); renderDx();
    var lt = localTop(), local = r.ok ? { health_index: r.healthIndex, damaged_percent: r.severity, color_sign: lt ? (LOCAL_NAMES[lt.id] || 'анық емес') : null,
      tissue: { yellow: +pct(r.fractions.chlorosis).replace(',', '.'), brown: +pct(r.fractions.necrosis + r.fractions.dark).replace(',', '.'), white: +pct(r.fractions.powdery).replace(',', '.'), orange: +pct(r.fractions.rust).replace(',', '.') } } : null;
    callAI([state.aiImage].concat(state.extra), $('plantInput').value || '', local)
      .then(function (j) {
        state.aiLoading = false;
        state.ai = j.result; state.plantnet = j.plantnet || null; renderAll();
      }).catch(function (e) {
        state.aiLoading = false; renderAll();
        $('dxCard').insertAdjacentHTML('beforeend', '<p class="note">AI модулі жауап бермеді: ' + esc(e.message) + '. Түс индикаторы мен анықтағыш жұмыс істей береді.</p>');
      });
  }

  /* ---------------- анықтағыш кілт ---------------- */
  var keyState = { started: false, path: [] };
  function keyStart(node) { keyState.started = true; keyState.path = [{ node: node }]; renderKey(); }
  function renderKey() {
    var cur = keyState.path[keyState.path.length - 1], K = KK.KEY;
    $('keyPath').innerHTML = keyState.path.slice(0, -1).map(function (p, i) { return '<li><button class="link" data-keyback="' + i + '">' + esc(K[p.node].q) + '</button> → ' + esc(p.ans) + '</li>'; }).join('');
    if (cur.result) {
      var it = kbItem(cur.result), cp = findPlant($('plantInput').value), extra = '';
      if (cp && it && it.d.plants && it.d.plants.indexOf(cp.id) >= 0) extra = '<p class="agree a2">Бұл ' + esc(cp.kk) + ' үшін жиі кездесетін мәселе.</p>';
      $('keyCard').innerHTML = '<p class="card-kicker">Қорытынды</p>' + extra + detailHTML(it) + '<p><button class="btn" data-keyrestart="1">Басынан бастау</button></p>';
      hydrateThumbs($('keyCard')); return;
    }
    var n = K[cur.node];
    $('keyCard').innerHTML = '<p class="card-kicker">' + (keyState.path.length) + '-сұрақ</p><h2>' + esc(n.q) + '</h2><div class="key-answers">' +
      n.a.map(function (a, i) { return '<button class="key-ans" data-ans="' + i + '">' + esc(a.t) + '</button>'; }).join('') + '</div>' +
      (keyState.path.length > 1 ? '<p><button class="btn ghost small" data-keyback="' + (keyState.path.length - 2) + '">Артқа</button></p>' : '');
  }
  function keyAnswer(i) {
    var cur = keyState.path[keyState.path.length - 1], a = KK.KEY[cur.node].a[i];
    cur.ans = a.t; keyState.path.push(a.result ? { result: a.result } : { node: a.next }); renderKey(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------- анықтамалық ---------------- */
  var libState = { tab: 'plants', filter: 'all', q: '' };
  function renderLibrary() {
    $('libStats').textContent = PLANTS.length + ' өсімдік, ' + (Object.keys(DIS).length - 1) + ' ауру мен физиологиялық бұзылыс, ' + Object.keys(PESTS).length + ' зиянкес және ' + Object.keys(BEN).length + ' пайдалы жәндік. Әр жазбада белгілері, себебі, күресу жолдары және дереккөзі бар.';
    document.querySelectorAll('#libTabs button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.lib === libState.tab ? 'true' : 'false'); });
    var filters = [['all', 'Барлығы']];
    if (libState.tab === 'plants') Object.keys(CATS).forEach(function (c) { filters.push([c, CATS[c].name]); });
    if (libState.tab === 'disorders') Object.keys(TYPES).forEach(function (t) { filters.push([t, TYPES[t].short]); });
    if (libState.tab === 'pests') Object.keys(PEST_GROUPS).forEach(function (g2) { filters.push([g2, PEST_GROUPS[g2]]); });
    $('libFilter').innerHTML = filters.map(function (f) { return '<button class="chip' + (libState.filter === f[0] ? ' on' : '') + '" data-filter="' + f[0] + '">' + esc(f[1]) + '</button>'; }).join('');
    var q = libState.q.toLowerCase(), items = [];
    if (libState.tab === 'plants') PLANTS.forEach(function (p) { if ((libState.filter === 'all' || p.cat.indexOf(libState.filter) >= 0) && (!q || (p.kk + ' ' + p.lat + ' ' + p.ru).toLowerCase().indexOf(q) >= 0)) items.push({ kind: 'plant', id: p.id, d: p }); });
    if (libState.tab === 'disorders') Object.keys(DIS).forEach(function (k) { var d = DIS[k]; if (k !== 'healthy' && (libState.filter === 'all' || d.type === libState.filter) && (!q || d.name.toLowerCase().indexOf(q) >= 0)) items.push({ kind: 'disorder', id: k, d: d }); });
    if (libState.tab === 'pests') Object.keys(PESTS).forEach(function (k) { var d = PESTS[k]; if ((libState.filter === 'all' || d.group === libState.filter) && (!q || (d.name + ' ' + d.lat).toLowerCase().indexOf(q) >= 0)) items.push({ kind: 'pest', id: k, d: d }); });
    if (libState.tab === 'beneficial') Object.keys(BEN).forEach(function (k) { var d = BEN[k]; if (!q || (d.name + ' ' + d.lat).toLowerCase().indexOf(q) >= 0) items.push({ kind: 'beneficial', id: k, d: d }); });
    $('libList').innerHTML = items.length ? items.map(function (it) {
      var d = it.d, title = it.kind === 'plant' ? d.kk : d.name, sub = it.kind === 'plant' ? d.lat : it.kind === 'disorder' ? TYPES[d.type].name : d.lat;
      var body = it.kind === 'plant' ? catChips(d.cat) + (d.poison === 2 ? '<span class="chip-tag" style="--c:#b8302b">Улы</span>' : '') : it.kind === 'disorder' ? esc(d.short) : it.kind === 'pest' ? esc(d.damage) : esc(d.benefit);
      return '<button class="lib-card" data-open="' + it.id + '">' + thumbHTML(it) + '<span class="lc-body"><b>' + esc(title) + '</b><i>' + esc(sub) + '</i><span class="lc-text">' + body + '</span></span></button>';
    }).join('') : '<p class="muted">Ештеңе табылмады.</p>';
    hydrateThumbs($('libList'));
  }

  /* ---------------- журнал ---------------- */
  function loadJournal() { try { return JSON.parse(store(JOURNAL_KEY) || '[]') || []; } catch (e) { return []; } }
  function saveJournal(arr) { try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(arr)); return true; } catch (e) { return false; } }
  function saveEntry() {
    var r = state.result; if (!r || !r.ok) return;
    var cp = currentPlant(), lt = localTop(), ai = state.ai, top = ai && ai.findings && ai.findings[0];
    var fr = {}; Object.keys(r.fractions).forEach(function (k) { fr[k] = Math.round(r.fractions[k] * 1000) / 10; });
    var e = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(),
      label: ($('label').value || '').trim() || (cp.kb ? cp.kb.kk : 'Белгісіз өсімдік'), plant: cp.kb ? cp.kb.kk : (cp.ai && cp.ai.kk) || '',
      hi: r.healthIndex, severity: r.severity, local: lt ? lt.id : '', ai: top ? top.name : (ai ? 'сау' : ''), frac: fr, thumb: state.thumb };
    var arr = loadJournal(); arr.push(e);
    if (!saveJournal(arr)) { e.thumb = ''; arr[arr.length - 1] = e; if (!saveJournal(arr)) { $('saveMsg').textContent = 'Сақтау мүмкін болмады: браузер жады толы немесе жеке режим қосулы.'; return; } }
    store('zhs_last_label', e.label);
    $('saveMsg').innerHTML = 'Сақталды: «' + esc(e.label) + '». <a href="#journal">Журналды ашу</a>';
  }
  function chartSVG(items) {
    var W = 600, H = 170, P = 30, n = items.length;
    var xs = function (i) { return n === 1 ? W / 2 : P + (W - 2 * P) * i / (n - 1); }, ys = function (v) { return H - P + 6 - (H - 2 * P) * v / 100; };
    var grid = [0, 50, 85, 100].map(function (v) { return '<line x1="' + P + '" x2="' + (W - 8) + '" y1="' + ys(v) + '" y2="' + ys(v) + '" stroke="currentColor" stroke-opacity=".15"/><text x="4" y="' + (ys(v) + 4) + '">' + v + '</text>'; }).join('');
    var pts = items.map(function (e, i) { return xs(i) + ',' + ys(e.hi); }).join(' ');
    var dots = items.map(function (e, i) { return '<circle cx="' + xs(i) + '" cy="' + ys(e.hi) + '" r="4.5" fill="' + hiColor(e.hi) + '"><title>' + esc(fmtDate(e.ts)) + ': ' + e.hi + '</title></circle>'; }).join('');
    var labels = items.map(function (e, i) { if (n > 8 && i % Math.ceil(n / 8)) return ''; var d = new Date(e.ts); return '<text x="' + xs(i) + '" y="' + (H - 4) + '" text-anchor="middle">' + d.getDate() + '.' + (d.getMonth() + 1) + '</text>'; }).join('');
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Денсаулық индексінің өзгеруі" style="color:var(--ink)">' + grid + '<polyline points="' + pts + '" fill="none" stroke="var(--leaf)" stroke-width="2.5"/>' + dots + labels + '</svg>';
  }
  function trendNote(items) {
    if (items.length < 2) return '<p class="ok-note">Динамиканы көру үшін осы өсімдікті 3–7 күннен кейін қайта тексеріңіз.</p>';
    var last = items[items.length - 1], prev = items[items.length - 2], first = items[0], drop = prev.hi - last.hi;
    if (drop >= 8) return '<p class="alert"><b>Ерте ескерту:</b> денсаулық индексі ' + drop + ' ұпайға төмендеді (' + prev.hi + ' → ' + last.hi + '). Өсімдікті мұқият қарап, анықтағышпен тексеріңіз.</p>';
    if (items.length >= 3 && items[items.length - 3].hi > prev.hi && prev.hi > last.hi) return '<p class="alert"><b>Ерте ескерту:</b> индекс үш тексеру қатарынан төмендеп келеді.</p>';
    if (last.hi - first.hi >= 8) return '<p class="ok-note">Жақсы нәтиже: индекс ' + (last.hi - first.hi) + ' ұпайға артты.</p>';
    return '<p class="ok-note">Күрт өзгеріс жоқ. Бақылауды жалғастырыңыз.</p>';
  }
  function renderJournal() {
    var arr = loadJournal(), body = $('journalBody');
    if (!arr.length) { body.innerHTML = '<div class="journal-empty"><p>Журнал әзірге бос.</p><p>Жапырақты талдап, «Журналға сақтау» батырмасын басыңыз.</p><a class="btn primary" href="#analyze">Талдауға өту</a></div>'; return; }
    var groups = {}; arr.forEach(function (e) { (groups[e.label] = groups[e.label] || []).push(e); });
    body.innerHTML = Object.keys(groups).map(function (label) {
      var items = groups[label].sort(function (a, b) { return a.ts - b.ts; }), last = items[items.length - 1];
      return '<section class="plant-group"><div class="pg-head"><h2>' + esc(label) + '</h2><span class="muted">' + items.length + ' тексеру, соңғы индекс: <b>' + last.hi + '</b></span></div>' + trendNote(items) + chartSVG(items) +
        '<div class="entries">' + items.slice().reverse().map(function (e) {
          return '<div class="entry">' + (e.thumb ? '<img src="' + e.thumb + '" alt="Жапырақ суреті">' : '') + '<button type="button" data-del="' + e.id + '" aria-label="Жазбаны өшіру">×</button><div><b style="color:' + hiColor(e.hi) + '">' + e.hi + '</b> индекс<br>' + esc(fmtDate(e.ts)) + '<br>' + esc(e.ai || LOCAL_NAMES[e.local] || '') + '</div></div>';
        }).join('') + '</div></section>';
    }).join('');
  }
  function exportCSV() {
    var arr = loadJournal(); if (!arr.length) { alert('Журнал бос.'); return; }
    var head = ['Күні', 'Белгі', 'Өсімдік', 'Денсаулық индексі', 'Зақымданған аудан %', 'Сау %', 'Сарғайған %', 'Қураған %', 'Қара %', 'Тат түсті %', 'Ақ өңез %', 'Күлгін %', 'Түс индикаторының белгісі', 'AI қорытындысы'];
    var rows = arr.sort(function (a, b) { return a.ts - b.ts; }).map(function (e) { var f = e.frac || {}; return [fmtDate(e.ts), e.label, e.plant, e.hi, e.severity, f.healthy, f.chlorosis, f.necrosis, f.dark, f.rust, f.powdery, f.purple, LOCAL_NAMES[e.local] || '', e.ai]; });
    var csv = [head].concat(rows).map(function (r) { return r.map(function (v) { v = v == null ? '' : String(v).replace('.', ','); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'zhapyraqscan-journal-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------------- жоба туралы ---------------- */
  function renderAbout() {
    $('aboutBody').innerHTML = '<h1>Жоба туралы</h1><p class="lead">«Жасанды интеллект көмегімен әртүрлі өсімдіктер жапырақтарының визуалды белгілерін талдау және олардың аурулары мен физиологиялық бұзылыстарын ерте анықтау» ғылыми жобасының платформасы.</p>' +
      '<dl class="meta"><dt>Автор</dt><dd>Болат Аделья, Е. Бозғұлов атындағы №249 мектеп-лицейі</dd><dt>Ғылыми жетекші</dt><dd>Сараман Гүлдана Жанболатқызы, биология пәнінің мұғалімі, жаратылыстану ғылымдарының магистрі</dd><dt>Мекенжайы</dt><dd>Қазалы ауданы, Қызылорда облысы</dd></dl>' +
      '<h2>Үш тексеру</h2><ol class="steps"><li><b>AI көру модулі</b> (Gemini, қосымша Pl@ntNet) өсімдік түрін, ауруды, зиянкесті және су мен қоректің жетіспеуін атайды, әр қорытындыға суреттегі дәлелді көрсетеді.</li><li><b>Түс индикаторы</b> телефонның өзінде жұмыс істейді: жапырақты фоннан бөліп, әр нүктені түсіне қарай сау, сарғайған, қураған, ақ өңез т.б. топтарға бөледі және денсаулық индексін есептейді.</li><li><b>Анықтағыш кілт</b> – биологтардың ежелгі әдісі: сұрақтарға жауап бере отырып себепті нақтылаймыз. Интернетсіз де жұмыс істейді.</li></ol>' +
      '<h2>Білім қоры</h2><p>' + PLANTS.length + ' өсімдік (дәнді, көкөніс, бақша, жеміс, ағаш, бөлме өсімдігі, сәндік гүл, дәрілік, арамшөп, улы өсімдік), ' + (Object.keys(DIS).length - 1) + ' ауру мен бұзылыс, ' + Object.keys(PESTS).length + ' зиянкес (жұмыртқаларымен, 7 топқа бөлінген), ' + Object.keys(BEN).length + ' пайдалы жәндік. Анықтамалықта PlantVillage мен PlantDoc жиынтықтарынан алынған 132 нақты сурет бар. Дереккөздер: Agrios, Marschner, Taiz, CABI, EPPO, UC IPM, Penn State Extension.</p>' +
      '<h2>Тексеру нәтижелері</h2><ul><li>Платформаны жасау мен тексеруге 9 074 сурет пайдаланылды: PlantVillage (6 496) және PlantDoc (2 578) ғылыми жиынтықтары.</li><li>Баптауға қатыспаған 475 нақты фотода түс индикаторының бірінші нұсқасы сау жапырақтың тек 7,3%-ын сау деп таныды, қазіргі нұсқасы – 86,1%-ын; жалған дабыл 140-тан 21-ге азайды. Ауру жапырақтардың 75,5%-ында мәселе байқалды.</li><li>Ешқашан көрмеген 5 546 PlantVillage фотосында: сезімталдық 76,0%, ерекшелік 83,9%.</li><li>Табиғи ортада түсірілген PlantDoc суреттерінде түс индикаторы сау жапырақты нашар таниды (24,1%), сондықтан жапырақты ақ қағаз үстінде түсіру керек, ал түр мен ауруды AI анықтайды.</li><li>880 синтетикалық суретте: айқын белгілерде 94,5%, ерте сатыда 82,3% дәлдік; сау жапырақ ауру деп танылмады.</li><li>«Салыстыру» бетінде көзбен бағалау, түс индикаторы және AI мамандар белгілеген 100 сурет бойынша салыстырылады.</li></ul>' +
      '<h2>Жақсы сурет түсіру ережесі</h2><ul class="tips"><li>Жапырақты ақ қағаздың үстіне қойыңыз немесе қолмен ұстап, фон бір түсті болсын.</li><li>Күндізгі шашыраңқы жарықта, тікелей күн сәулесінсіз түсіріңіз.</li><li>Жапырақтың үстін де, астын да түсіріңіз – зиянкестер көбіне астында болады.</li><li>Бір өсімдікті әр 3–7 күн сайын тексеріп, журналға сақтаңыз.</li></ul>' +
      '<p class="disclaimer">Платформа – оқу-зерттеу құралы. Нақты диагнозды агроном немесе фитосанитарлық зертхана қояды. Шегіртке, бактериялық күйік сияқты карантиндік қауіп байқалса, аудандық фитосанитарлық инспекцияға хабарлаңыз.</p>';
  }

  /* ---------------- салыстыру модуліне арналған функциялар ---------------- */
  window.ZHS = { imgSrc: imgSrc, callAI: callAI, kbItem: kbItem, drawScaled: drawScaled, localSummary: localSummary, esc: esc, LOCAL_NAMES: LOCAL_NAMES, aiReady: function () { return !!(state.aiStatus && state.aiStatus.ai); }, store: store, openDetail: openDetail };

  /* ---------------- іске қосу ---------------- */
  function init() {
    $('plantList').innerHTML = PLANTS.map(function (p) { return '<option value="' + esc(p.kk) + '">' + esc(p.lat) + '</option>'; }).join('');
    $('legend').innerHTML = A.CLASS_INFO.slice(1, 9).map(function (c) { return '<li><i style="background:rgb(' + c.color.join(',') + ')"></i>' + esc(c.name) + '</li>'; }).join('');
    $('sampleChips').innerHTML = SMP.CLASSES.map(function (c) { return '<button class="chip" type="button" data-sample="' + c.id + '">' + esc(c.name) + '</button>'; }).join('');
    $('sampleChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-sample]'); if (!b) return;
      var cv = SMP.generate(b.dataset.sample, Math.floor(Math.random() * 1e6), 512, { stage: Math.random() < 0.35 ? 'early' : 'normal' });
      $('label').value = 'Үлгі: ' + b.textContent; processImage(cv, cv.width, cv.height);
    });
    $('fileExtra').addEventListener('change', function (e) { if (e.target.files[0]) addExtra(e.target.files[0]); e.target.value = ''; });
    $('extraList').addEventListener('click', function (e) { var b = e.target.closest('[data-delextra]'); if (!b) return; state.extra.splice(+b.dataset.delextra, 1); renderExtra(); });
    ['fileCamera', 'fileGallery'].forEach(function (id) { $(id).addEventListener('change', function (e) { if (e.target.files[0]) loadFile(e.target.files[0]); e.target.value = ''; }); });
    var drop = $('drop');
    drop.addEventListener('click', function (e) { if (e.target === drop || e.target.closest('svg,p')) $('fileGallery').click(); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fileGallery').click(); } });
    ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
    document.addEventListener('paste', function (e) { var it = [].slice.call((e.clipboardData || {}).items || []).filter(function (x) { return /^image\//.test(x.type); })[0]; if (it) loadFile(it.getAsFile()); });
    $('split').addEventListener('input', renderCompare);
    $('btnNew').addEventListener('click', function () { $('stage').hidden = true; $('drop').hidden = false; $('result').hidden = true; $('resultEmpty').hidden = false; state.orig = null; state.ai = null; });
    $('plantInput').addEventListener('change', function () { store('zhs_plant', $('plantInput').value); if (state.result) renderAll(); });
    $('wholeImage').addEventListener('change', runAnalysis);
    $('useAI').addEventListener('change', function () { if ($('useAI').checked && state.result && state.result.ok && !state.ai) runAI(); });
    $('btnSave').addEventListener('click', saveEntry);
    $('btnPrint').addEventListener('click', function () { window.print(); });
    $('btnCsv').addEventListener('click', exportCSV);
    $('btnClear').addEventListener('click', function () { if (confirm('Журналдағы барлық жазбаны өшіресіз бе?')) { saveJournal([]); renderJournal(); } });
    $('journalBody').addEventListener('click', function (e) { var b = e.target.closest('[data-del]'); if (!b || !confirm('Бұл жазбаны өшіресіз бе?')) return; saveJournal(loadJournal().filter(function (x) { return x.id !== b.dataset.del; })); renderJournal(); });
    $('libTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-lib]'); if (!b) return; libState.tab = b.dataset.lib; libState.filter = 'all'; renderLibrary(); });
    $('libFilter').addEventListener('click', function (e) { var b = e.target.closest('[data-filter]'); if (!b) return; libState.filter = b.dataset.filter; renderLibrary(); });
    $('libSearch').addEventListener('input', function () { libState.q = $('libSearch').value; renderLibrary(); });
    document.addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); openDetail(o.dataset.open); return; }
      var kf = e.target.closest('[data-keyfrom]'); if (kf) { keyStart(KK.START_FROM_LOCAL[kf.dataset.keyfrom] || 'start'); return; }
      var ka = e.target.closest('[data-ans]'); if (ka) { keyAnswer(+ka.dataset.ans); return; }
      var kb = e.target.closest('[data-keyback]'); if (kb) { keyState.path = keyState.path.slice(0, +kb.dataset.keyback + 1); delete keyState.path[keyState.path.length - 1].ans; renderKey(); return; }
      if (e.target.closest('[data-keyrestart]')) { keyStart('start'); return; }
    });
    $('modalClose').addEventListener('click', function () { $('modal').hidden = true; });
    $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) $('modal').hidden = true; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('modal').hidden = true; });
    var lp = store('zhs_plant'); if (lp) $('plantInput').value = lp;
    var ll = store('zhs_last_label'); if (ll) $('label').value = ll;
    window.addEventListener('hashchange', route);
    route(); checkAI();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
