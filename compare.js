/* ЖапырақСкан — салыстырмалы зерттеу модулі.
   Мамандар белгілеген 100 сурет бойынша үш тәсіл салыстырылады:
   1) адамның көзбен бағалауы, 2) түс индикаторы, 3) AI көру модулі.
   Эталон – PlantVillage және PlantDoc жиынтықтарындағы маман қойған диагноз. */
(function () {
  'use strict';
  var T = window.LEAF_TEST || [], KP = window.KB_PLANTS, A = window.LeafAnalyzer;
  var KEY = 'zhs_compare_v1', tab = 'eye', running = false, stopFlag = false;
  var $ = function (id) { return document.getElementById(id); };
  function Z() { return window.ZHS; }
  function esc(s) { return Z().esc(s); }
  var st = (function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  st.eye = st.eye || {}; st.ci = st.ci || {}; st.ai = st.ai || {}; st.cur = st.cur || 0; st.rater = st.rater || '';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* жеке режимде сақталмауы мүмкін */ } }
  var PL = {}; KP.PLANTS.forEach(function (p) { PL[p.id] = p; });
  var TEST_PLANTS = []; T.forEach(function (t) { if (TEST_PLANTS.indexOf(t.plant) < 0) TEST_PLANTS.push(t.plant); });
  TEST_PLANTS.sort(function (a, b) { return PL[a].kk.localeCompare(PL[b].kk, 'kk'); });

  function nameOf(id) {
    if (!id) return '—'; if (id === 'healthy') return 'Сау'; if (id === 'unknown') return 'Білмеймін';
    if (id.charAt(0) === '?') return id.slice(1);
    var it = Z().kbItem(id); return it ? (it.d.name || it.d.kk) : id;
  }
  var SYN = { alma: ['malus'], shie: ['prunus cerasus', 'prunus avium'], shabdaly: ['prunus persica'], kartop: ['solanum tuberosum'], kyzanak: ['solanum lycopersicum', 'lycopersicon'],
    burysh: ['capsicum'], zhuzim: ['vitis'], zhugeri: ['zea mays'], kulpynai: ['fragaria'], tankurai: ['rubus'], soya: ['glycine max'], askabak: ['cucurbita'], kokzhidek: ['vaccinium'], apelsin: ['citrus'] };
  function aiPlantOk(r, plantId) {
    if (!r) return false; if (r.plant_kb === plantId) return true;
    var lat = String(r.latin || '').toLowerCase(); return (SYN[plantId] || []).some(function (s) { return lat.indexOf(s) === 0; });
  }
  function kappa(pairs) {
    var n = pairs.length; if (!n) return null;
    var agree = 0, cr = {}, cp = {};
    pairs.forEach(function (p) { if (p[0] === p[1]) agree++; cr[p[0]] = (cr[p[0]] || 0) + 1; cp[p[1]] = (cp[p[1]] || 0) + 1; });
    var po = agree / n, pe = 0; Object.keys(cr).forEach(function (k) { pe += (cr[k] / n) * ((cp[k] || 0) / n); });
    return pe >= 1 ? 1 : (po - pe) / (1 - pe);
  }
  function kText(k) { return k == null ? '–' : k.toFixed(2).replace('.', ',') + ' (' + (k > 0.8 ? 'өте жоғары' : k > 0.6 ? 'едәуір' : k > 0.4 ? 'орташа' : k > 0.2 ? 'әлсіз' : 'өте әлсіз') + ')'; }
  function P(a, b) { return b ? Math.round(a / b * 1000) / 10 : null; }
  function pT(x) { return x == null ? '–' : String(x).replace('.', ',') + '%'; }

  function loadImg(src) { return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = src; }); }

  /* ---------- 1. көзбен бағалау ---------- */
  function plantOptions(sel) {
    var o = '<option value="">— өсімдікті таңдаңыз —</option><optgroup label="Сынақтағы дақылдар">' + TEST_PLANTS.map(function (id) { return '<option value="' + id + '"' + (sel === id ? ' selected' : '') + '>' + esc(PL[id].kk) + '</option>'; }).join('') + '</optgroup>';
    o += '<optgroup label="Басқа өсімдіктер">' + KP.PLANTS.filter(function (p) { return TEST_PLANTS.indexOf(p.id) < 0; }).map(function (p) { return '<option value="' + p.id + '"' + (sel === p.id ? ' selected' : '') + '>' + esc(p.kk) + '</option>'; }).join('') + '</optgroup>';
    return o + '<option value="unknown"' + (sel === 'unknown' ? ' selected' : '') + '>Білмеймін</option>';
  }
  function condOptions(plantId, sel) {
    var risks = plantId && PL[plantId] ? PL[plantId].risks : [];
    var all = Object.keys(window.KB_DIS.DISORDERS).filter(function (k) { return k !== 'healthy'; });
    var opt = function (id) { return '<option value="' + id + '"' + (sel === id ? ' selected' : '') + '>' + esc(nameOf(id)) + '</option>'; };
    var o = '<option value="">— жағдайын таңдаңыз —</option>' + opt('healthy');
    if (risks.length) o += '<optgroup label="Бұл өсімдікке тән">' + risks.map(opt).join('') + '</optgroup>';
    o += '<optgroup label="Басқа аурулар мен бұзылыстар">' + all.filter(function (k) { return risks.indexOf(k) < 0; }).sort(function (a, b) { return nameOf(a).localeCompare(nameOf(b), 'kk'); }).map(opt).join('') + '</optgroup>';
    return o + opt('unknown');
  }
  function renderEye() {
    var done = T.filter(function (t) { return st.eye[t.id]; }).length, i = Math.min(st.cur, T.length - 1), t = T[i], e = st.eye[t.id] || {};
    var h = '<div class="cmp-card"><p class="muted">Суретті мұқият қарап, өсімдік түрі мен оның жағдайын таңдаңыз. Дұрыс жауап бағалау біткенде ғана «Нәтижелер» бетінде көрінеді. Әр суретке 20–30 секунд жеткілікті.</p>' +
      '<label class="field"><span>Бағалаушы (мысалы: «Оқушы» немесе «Биология мұғалімі»)</span><input type="text" id="cmpRater" value="' + esc(st.rater) + '" maxlength="40"></label>' +
      '<div class="cmp-progress"><div style="width:' + (done / T.length * 100) + '%"></div></div><p class="small">' + done + ' / ' + T.length + ' сурет бағаланды · қазір ' + (i + 1) + '-сурет</p>' +
      '<div class="cmp-eye"><img src="' + Z().imgSrc(t.file) + '" alt="Сынақ суреті ' + (i + 1) + '"><div class="cmp-form">' +
      '<label class="field"><span>Өсімдік түрі</span><select id="eyePlant">' + plantOptions(e.plant) + '</select></label>' +
      '<label class="field"><span>Жағдайы (ауру немесе сау)</span><select id="eyeCond">' + condOptions(e.plant, e.label) + '</select></label>' +
      '<div class="save-actions"><button class="btn primary" id="eyeSave" type="button">Сақтап, келесіге өту</button><button class="btn" id="eyePrev" type="button">Артқа</button><button class="btn ghost" id="eyeNext" type="button">Өткізу</button></div>' +
      (e.plant ? '<p class="small muted">Бұл сурет бағаланған: ' + esc(nameOf(e.plant === 'unknown' ? 'unknown' : e.plant)) + ' – ' + esc(nameOf(e.label)) + '</p>' : '') + '</div></div></div>';
    $('cmpBody').innerHTML = h;
    $('eyePlant').addEventListener('change', function () { $('eyeCond').innerHTML = condOptions(this.value, ''); });
    $('cmpRater').addEventListener('change', function () { st.rater = this.value.trim(); save(); });
    $('eyeSave').addEventListener('click', function () {
      var pl = $('eyePlant').value, c = $('eyeCond').value;
      if (!pl || !c) { alert('Өсімдік түрін де, жағдайын да таңдаңыз («Білмеймін» деп белгілеуге болады).'); return; }
      st.eye[t.id] = { plant: pl, label: c, ts: Date.now() }; st.cur = Math.min(T.length - 1, i + 1); save(); renderEye();
      if (done + 1 >= T.length && !st.eyeDoneShown) { st.eyeDoneShown = 1; save(); alert('Барлық 100 сурет бағаланды! «Нәтижелер» бетін ашыңыз.'); }
    });
    $('eyePrev').addEventListener('click', function () { st.cur = Math.max(0, i - 1); save(); renderEye(); });
    $('eyeNext').addEventListener('click', function () { st.cur = Math.min(T.length - 1, i + 1); save(); renderEye(); });
  }

  /* ---------- 2. платформаның тексеруі ---------- */
  function analyzeLocal(im) {
    var cv = Z().drawScaled(im, im.naturalWidth, im.naturalHeight, 512);
    var d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height);
    return A.analyze(d, {});
  }
  function runCI() {
    var i = 0;
    function next() {
      if (i >= T.length) { save(); renderAuto(); return; }
      var t = T[i++];
      loadImg(Z().imgSrc(t.file)).then(function (im) {
        var r = analyzeLocal(im);
        st.ci[t.id] = r.ok ? { sick: r.diagnoses[0].id !== 'healthy', group: r.diagnoses[0].id, sev: r.severity, hi: r.healthIndex } : { sick: null, error: 1 };
        $('ciProg').textContent = i + ' / ' + T.length; setTimeout(next, 0);
      }).catch(function () { setTimeout(next, 0); });
    }
    next();
  }
  function compactAI(j) {
    var r = j.result || {}, p = r.plant || {}, fs = (r.findings || []).slice().sort(function (a, b) { return (b.confidence || 0) - (a.confidence || 0); });
    return { plant_kb: p.kb_id || null, latin: p.latin || '', kk: p.kk || '', pconf: p.confidence, is_plant: r.is_plant !== false,
      label: fs.length ? (fs[0].kb_id || '?' + fs[0].name) : 'healthy', label2: fs[1] ? (fs[1].kb_id || '?' + fs[1].name) : null, conf: fs.length ? fs[0].confidence : null,
      sick: fs.length > 0, sev: r.severity_percent, pn: j.plantnet && j.plantnet[0] ? j.plantnet[0].latin : null, model: j.model };
  }
  function runAIAll() {
    if (running) return; running = true; stopFlag = false; renderAuto();
    var todo = T.filter(function (t) { return !st.ai[t.id] || st.ai[t.id].error; }), k = 0;
    function step() {
      if (stopFlag || k >= todo.length) { running = false; save(); renderAuto(); return; }
      var t = todo[k];
      loadImg(Z().imgSrc(t.file)).then(function (im) {
        var r = analyzeLocal(im), url = Z().drawScaled(im, im.naturalWidth, im.naturalHeight, 1024).toDataURL('image/jpeg', 0.9);
        return Z().callAI([url], '', Z().localSummary(r));
      }).then(function (j) {
        st.ai[t.id] = compactAI(j); k++; save(); updateAIProgress(); setTimeout(step, 4500);
      }).catch(function (e) {
        var msg = String(e && e.message || e);
        if (/quota|429|бос емес|rate|exhaust/i.test(msg)) { $('aiProg').textContent = 'Сұраныс шегіне жеттік, 40 секунд күтеміз…'; setTimeout(step, 40000); return; }
        st.ai[t.id] = { error: msg.slice(0, 120) }; k++; save(); updateAIProgress(); setTimeout(step, 3000);
      });
    }
    step();
  }
  function updateAIProgress() {
    var n = T.filter(function (t) { return st.ai[t.id] && !st.ai[t.id].error; }).length, el = $('aiProg');
    if (el) el.textContent = n + ' / ' + T.length + ' сурет тексерілді' + (running ? ' (жүріп жатыр…)' : '');
  }
  function renderAuto() {
    var nci = T.filter(function (t) { return st.ci[t.id]; }).length, nai = T.filter(function (t) { return st.ai[t.id] && !st.ai[t.id].error; }).length;
    var ready = Z().aiReady();
    $('cmpBody').innerHTML = '<div class="cmp-card"><h3>Түс индикаторы</h3><p>100 суретті телефонның өзінде талдайды (5–10 секунд).</p><p><button class="btn primary" id="btnCI" type="button">Түс индикаторын тексеру</button> <span id="ciProg" class="muted">' + nci + ' / ' + T.length + '</span></p></div>' +
      '<div class="cmp-card"><h3>AI көру модулі</h3>' + (ready ? '<p>Әр сурет AI-ға «соқыр» түрде жіберіледі: өсімдіктің атауы да, дұрыс жауап та айтылмайды. Тегін кілттің шегіне байланысты 100 сурет шамамен 10–15 минут тексеріледі. Бетті жаппаңыз; тоқтап қалса, қайта бастағанда жалғасады.</p>' +
        '<p><button class="btn primary" id="btnAI" type="button"' + (running ? ' disabled' : '') + '>' + (nai ? 'Тексеруді жалғастыру' : 'AI тексеруін бастау') + '</button> <button class="btn" id="btnAIStop" type="button"' + (running ? '' : ' disabled') + '>Тоқтату</button> <span id="aiProg" class="muted"></span></p>'
        : '<p class="alert">AI кілті қосылмаған. Vercel-де <code>GEMINI_API_KEY</code> қосқан соң бұл тексеру іске қосылады.</p>') +
      '<p class="small"><button class="link" id="btnReset" type="button">Барлық салыстыру деректерін өшіру</button></p></div>';
    updateAIProgress();
    $('btnCI').addEventListener('click', function () { this.disabled = true; runCI(); });
    if ($('btnAI')) $('btnAI').addEventListener('click', runAIAll);
    if ($('btnAIStop')) $('btnAIStop').addEventListener('click', function () { stopFlag = true; });
    $('btnReset').addEventListener('click', function () { if (confirm('Көзбен бағалау, түс индикаторы және AI нәтижелерінің бәрі өшеді. Жалғастырасыз ба?')) { st = { eye: {}, ci: {}, ai: {}, cur: 0, rater: st.rater }; save(); renderAuto(); } });
  }

  /* ---------- 3. нәтижелер ---------- */
  function compute() {
    var M = { eye: { sp: [0, 0], ds: [0, 0], bin: [0, 0], kb: [], kd: [] }, ci: { bin: [0, 0], kb: [] }, ai: { sp: [0, 0], ds: [0, 0], bin: [0, 0], kb: [], kd: [] } };
    var bySrc = {}, agree = [], rows = [];
    T.forEach(function (t) {
      var refSick = t.label !== 'healthy', e = st.eye[t.id], c = st.ci[t.id], a = st.ai[t.id];
      var row = { t: t, e: e, c: c, a: a };
      var S = bySrc[t.src] = bySrc[t.src] || { eye: [0, 0, 0, 0], ci: [0, 0], ai: [0, 0, 0, 0] };
      if (e) {
        var es = e.label !== 'healthy' && e.label !== 'unknown';
        row.eSp = e.plant === t.plant; row.eDs = e.label === t.label; row.eBin = e.label !== 'unknown' && es === refSick;
        M.eye.sp[1]++; if (row.eSp) M.eye.sp[0]++; M.eye.ds[1]++; if (row.eDs) M.eye.ds[0]++; M.eye.bin[1]++; if (row.eBin) M.eye.bin[0]++;
        M.eye.kb.push([refSick ? 1 : 0, e.label === 'unknown' ? 'u' : (es ? 1 : 0)]); M.eye.kd.push([t.label, e.label]);
        S.eye[0] += row.eDs ? 1 : 0; S.eye[1]++; S.eye[2] += row.eBin ? 1 : 0; S.eye[3]++;
      }
      if (c && c.sick != null) {
        row.cBin = c.sick === refSick; M.ci.bin[1]++; if (row.cBin) M.ci.bin[0]++; M.ci.kb.push([refSick ? 1 : 0, c.sick ? 1 : 0]);
        S.ci[0] += row.cBin ? 1 : 0; S.ci[1]++;
      }
      if (a && !a.error) {
        row.aSp = aiPlantOk(a, t.plant); row.aDs = a.label === t.label; row.aBin = a.sick === refSick;
        M.ai.sp[1]++; if (row.aSp) M.ai.sp[0]++; M.ai.ds[1]++; if (row.aDs) M.ai.ds[0]++; M.ai.bin[1]++; if (row.aBin) M.ai.bin[0]++;
        M.ai.kb.push([refSick ? 1 : 0, a.sick ? 1 : 0]); M.ai.kd.push([t.label, a.label]);
        S.ai[0] += row.aDs ? 1 : 0; S.ai[1]++; S.ai[2] += row.aBin ? 1 : 0; S.ai[3]++;
      }
      if (e && a && !a.error) agree.push([e.label, a.label]);
      rows.push(row);
    });
    return { M: M, bySrc: bySrc, agree: agree, rows: rows };
  }
  function bars(items) {
    var W = 560, H = 210, P0 = 34, bw = 26, groups = items.length, gw = (W - P0 - 10) / groups, cols = ['#7a6aa8', '#e0ad0c', '#2e8b4a'];
    var g = '';
    [0, 25, 50, 75, 100].forEach(function (v) { var y = H - 30 - (H - 50) * v / 100; g += '<line x1="' + P0 + '" x2="' + (W - 4) + '" y1="' + y + '" y2="' + y + '" stroke="currentColor" stroke-opacity=".12"/><text x="4" y="' + (y + 4) + '" font-size="11">' + v + '</text>'; });
    items.forEach(function (it, i) {
      var x0 = P0 + i * gw + (gw - 3 * bw - 8) / 2;
      it.v.forEach(function (v, j) {
        if (v == null) return; var hh = (H - 50) * v / 100, x = x0 + j * (bw + 4), y = H - 30 - hh;
        g += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + hh + '" fill="' + cols[j] + '" rx="3"/><text x="' + (x + bw / 2) + '" y="' + (y - 4) + '" font-size="10" text-anchor="middle">' + Math.round(v) + '</text>';
      });
      g += '<text x="' + (P0 + i * gw + gw / 2) + '" y="' + (H - 10) + '" font-size="11" text-anchor="middle">' + esc(it.l) + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img" aria-label="Тәсілдердің дәлдігі" style="color:var(--ink)">' + g + '</svg><p class="small"><i class="lg" style="background:#7a6aa8"></i> Көзбен бағалау <i class="lg" style="background:#e0ad0c"></i> Түс индикаторы <i class="lg" style="background:#2e8b4a"></i> AI көру модулі</p>';
  }
  function reportText(R) {
    var M = R.M, ne = M.eye.sp[1], na = M.ai.sp[1], nc = M.ci.bin[1];
    var s = 'Салыстырмалы зерттеуге мамандар белгілеген ' + T.length + ' жапырақ суреті алынды (PlantVillage – 50, PlantDoc – 50). ';
    if (ne) s += 'Көзбен бағалауда (' + (st.rater || 'бағалаушы') + ', ' + ne + ' сурет) өсімдік түрі ' + pT(P(M.eye.sp[0], ne)) + ', ауру ' + pT(P(M.eye.ds[0], ne)) + ' жағдайда дұрыс анықталды, сау мен ауруды ажырату дәлдігі ' + pT(P(M.eye.bin[0], ne)) + ' болды. ';
    if (nc) s += 'Түс индикаторы сау мен ауруды ' + pT(P(M.ci.bin[0], nc)) + ' жағдайда дұрыс ажыратты (Коэн каппасы ' + kText(kappa(M.ci.kb)) + '). ';
    if (na) s += 'AI көру модулі (' + na + ' сурет) өсімдік түрін ' + pT(P(M.ai.sp[0], na)) + ', ауруды ' + pT(P(M.ai.ds[0], na)) + ' жағдайда дұрыс атады, сау мен ауруды ажырату дәлдігі ' + pT(P(M.ai.bin[0], na)) + ' (каппа ' + kText(kappa(M.ai.kb)) + '). ';
    if (R.agree.length) s += 'Көзбен бағалау мен AI қорытындысының сәйкестігі: ' + pT(P(R.agree.filter(function (p) { return p[0] === p[1]; }).length, R.agree.length)) + ' (каппа ' + kText(kappa(R.agree)) + ').';
    return s;
  }
  function renderRes() {
    var R = compute(), M = R.M;
    var row = function (name, m, ci) {
      return '<tr><td>' + name + '</td><td>' + (ci ? '–' : pT(P(m.sp[0], m.sp[1]))) + '</td><td>' + (ci ? '–' : pT(P(m.ds[0], m.ds[1]))) + '</td><td>' + pT(P(m.bin[0], m.bin[1])) + '</td><td>' + kText(kappa(m.kb)) + '</td><td>' + (ci ? '–' : kText(kappa(m.kd))) + '</td><td>' + m.bin[1] + '</td></tr>';
    };
    var h = '<div class="cmp-card"><h3>Тәсілдерді салыстыру (эталон – маманның диагнозы)</h3><div class="tbl-wrap"><table class="cmp-table"><thead><tr><th>Тәсіл</th><th>Өсімдік түрі дұрыс</th><th>Ауру дұрыс</th><th>Сау/ауру дұрыс</th><th>Каппа (сау/ауру)</th><th>Каппа (диагноз)</th><th>Сурет саны</th></tr></thead><tbody>' +
      row('Көзбен бағалау' + (st.rater ? ' (' + esc(st.rater) + ')' : ''), M.eye) + row('Түс индикаторы', M.ci, true) + row('AI көру модулі', M.ai) + '</tbody></table></div>' +
      bars([{ l: 'Өсімдік түрі', v: [P(M.eye.sp[0], M.eye.sp[1]), null, P(M.ai.sp[0], M.ai.sp[1])] }, { l: 'Ауру', v: [P(M.eye.ds[0], M.eye.ds[1]), null, P(M.ai.ds[0], M.ai.ds[1])] }, { l: 'Сау / ауру', v: [P(M.eye.bin[0], M.eye.bin[1]), P(M.ci.bin[0], M.ci.bin[1]), P(M.ai.bin[0], M.ai.bin[1])] }]) +
      '<p class="small muted">Каппа – кездейсоқ сәйкестікті шегеріп есептелетін келісім көрсеткіші (Коэн, 1960): 0,8-ден жоғары – өте жоғары, 0,6–0,8 – едәуір, 0,4–0,6 – орташа келісім.</p></div>';
    var src = Object.keys(R.bySrc).map(function (k) { var S = R.bySrc[k]; return '<tr><td>' + esc(k) + (k === 'PlantDoc' ? ' (табиғи орта)' : ' (зертхана фоны)') + '</td><td>' + pT(P(S.eye[0], S.eye[1])) + '</td><td>' + pT(P(S.ai[0], S.ai[1])) + '</td><td>' + pT(P(S.eye[2], S.eye[3])) + '</td><td>' + pT(P(S.ci[0], S.ci[1])) + '</td><td>' + pT(P(S.ai[2], S.ai[3])) + '</td></tr>'; }).join('');
    h += '<div class="cmp-card"><h3>Сурет көзі бойынша</h3><div class="tbl-wrap"><table class="cmp-table"><thead><tr><th>Жиынтық</th><th>Диагноз: көз</th><th>Диагноз: AI</th><th>Сау/ауру: көз</th><th>Сау/ауру: түс индикаторы</th><th>Сау/ауру: AI</th></tr></thead><tbody>' + src + '</tbody></table></div></div>';
    h += '<div class="cmp-card"><h3>Жобаға арналған қорытынды мәтін</h3><p id="cmpText">' + esc(reportText(R)) + '</p><p><button class="btn" id="btnCopy" type="button">Мәтінді көшіру</button> <button class="btn" id="btnCmpCsv" type="button">CSV (Excel) жүктеу</button></p></div>';
    var mark = function (v) { return v == null ? '' : v ? ' <span class="ok">✓</span>' : ' <span class="bad">✗</span>'; };
    h += '<details class="cmp-card"><summary><b>Әр суреттің нәтижесі</b></summary><div class="tbl-wrap"><table class="cmp-table small"><thead><tr><th>Сурет</th><th>Эталон</th><th>Көзбен</th><th>Түс индикаторы</th><th>AI</th></tr></thead><tbody>' +
      R.rows.map(function (r) {
        var t = r.t;
        return '<tr><td><img src="' + Z().imgSrc(t.file) + '" alt="" loading="lazy" class="cmp-thumb"><br><span class="muted">' + t.id + ' · ' + esc(t.src) + '</span></td><td>' + esc(PL[t.plant].kk) + '<br>' + esc(nameOf(t.label)) + '</td>' +
          '<td>' + (r.e ? esc(nameOf(r.e.plant)) + mark(r.eSp) + '<br>' + esc(nameOf(r.e.label)) + mark(r.eDs) : '—') + '</td>' +
          '<td>' + (r.c && r.c.sick != null ? (r.c.sick ? 'ауру' : 'сау') + mark(r.cBin) + '<br><span class="muted">' + String(r.c.sev).replace('.', ',') + '% зақым</span>' : '—') + '</td>' +
          '<td>' + (r.a && !r.a.error ? esc(r.a.kk || r.a.latin) + mark(r.aSp) + '<br>' + esc(nameOf(r.a.label)) + mark(r.aDs) : r.a && r.a.error ? '<span class="muted">қате</span>' : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></details>';
    $('cmpBody').innerHTML = h;
    $('btnCopy').addEventListener('click', function () { var t = $('cmpText').textContent; if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { $('btnCopy').textContent = 'Көшірілді'; }); });
    $('btnCmpCsv').addEventListener('click', function () { csv(R); });
  }
  function csv(R) {
    var head = ['Сурет', 'Жиынтық', 'Эталон: өсімдік', 'Эталон: жағдайы', 'Көзбен: өсімдік', 'Көзбен: жағдайы', 'Түс индикаторы', 'Зақым %', 'AI: өсімдік', 'AI: жағдайы', 'AI сенімділігі %'];
    var rows = R.rows.map(function (r) {
      var t = r.t; return [t.id, t.src, PL[t.plant].kk, nameOf(t.label), r.e ? nameOf(r.e.plant) : '', r.e ? nameOf(r.e.label) : '', r.c && r.c.sick != null ? (r.c.sick ? 'ауру' : 'сау') : '', r.c ? r.c.sev : '',
        r.a && !r.a.error ? (r.a.kk || r.a.latin) : '', r.a && !r.a.error ? nameOf(r.a.label) : '', r.a && !r.a.error ? r.a.conf : ''];
    });
    var text = [head].concat(rows).map(function (r) { return r.map(function (v) { v = v == null ? '' : String(v).replace('.', ','); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })); a.download = 'zhapyraqscan-salystyru.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  var loadingImgs = false;
  function render() {
    if (!T.length) { $('cmpBody').innerHTML = '<p>Сынақ жиынтығы жүктелмеді.</p>'; return; }
    if (!window.LEAF_TEST_LOADED) {
      $('cmpBody').innerHTML = '<p class="muted"><span class="spinner"></span>100 сурет жүктелуде (4 МБ)…</p>';
      if (!loadingImgs) { loadingImgs = true; var sc = document.createElement('script'); sc.src = 'test_images.js'; sc.onload = render; sc.onerror = function () { loadingImgs = false; $('cmpBody').innerHTML = '<p class="alert">Суреттер жүктелмеді. Интернетті тексеріп, бетті жаңартыңыз.</p>'; }; document.body.appendChild(sc); }
      return;
    }
    document.querySelectorAll('#cmpTabs button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.cmp === tab ? 'true' : 'false'); });
    if (tab === 'eye') renderEye(); else if (tab === 'auto') renderAuto(); else renderRes();
  }
  document.addEventListener('DOMContentLoaded', function () {
    var tabs = $('cmpTabs'); if (!tabs) return;
    tabs.addEventListener('click', function (e) { var b = e.target.closest('[data-cmp]'); if (!b) return; tab = b.dataset.cmp; render(); });
  });
  window.ZHS_COMPARE = { render: render, compute: compute, kappa: kappa, state: function () { return st; } };
})();
