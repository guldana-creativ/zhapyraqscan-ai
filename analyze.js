// ЖапырақСкан — AI көру модулі (Vercel сервер функциясы).
// Кілттер Vercel → Settings → Environment Variables бөлімінде беріледі:
//   GEMINI_API_KEY    – Google AI Studio (тегін): өсімдік түрі, ауру, зиянкес, су мен қорек тапшылығы
//   PLANTNET_API_KEY  – Pl@ntNet (тегін, күніне 500 сұраныс): ботаникалық түр анықтау (дәлдігін арттырады)
//   ANTHROPIC_API_KEY – Gemini орнына Claude моделін қолдану үшін (міндетті емес)

const MAX_BYTES = 4 * 1024 * 1024;
const GROUPS = ['дәнді-астық', 'көкөніс', 'бақша', 'жеміс-жидек', 'техникалық', 'мал азықтық', 'ағаш-бұта', 'бөлме өсімдігі', 'сәндік гүл', 'дәрілік', 'арамшөп', 'улы', 'жабайы', 'басқа'];

function buildPrompt(body, plantnet, nImages) {
  const kb = body.kb || {};
  const list = (arr) => (arr || []).map((x) => `${x.id}=${x.name}`).join('; ');
  return [
    'Сен – тәжірибелі ботаник, агроном, фитопатолог және энтомологсың. Пайдаланушы өсімдіктің жапырағын суретке түсірді' + (nImages > 1 ? ` (${nImages} сурет: жапырақтың үсті, асты немесе бүкіл өсімдік)` : '') + '.',
    'ТАПСЫРМА 1 – ӨСІМДІКТІ ТАНУ. Жапырақтың пішінін, жиегін, жүйкеленуін, түсін, түктерін, сағағын, суретте көрінсе сабағын, гүлін, жемісін мұқият қара. Ең ықтимал түрді (немесе ең болмаса туысты) ата. Бұл қандай топқа жататынын көрсет: ' + GROUPS.join(', ') + '. Ұқсас 1–2 түр болса, оларды alternatives тізіміне жаз. Сенімің 60%-дан төмен болса, need_more_photos=true қойып, тағы не түсіру керегін айт. Ойдан атау қоспа.',
    'ТАПСЫРМА 2 – ДЕНСАУЛЫҚТЫ БАҒАЛАУ. Аурулар (саңырауқұлақ, бактерия, вирус), зиянкестер мен олардың жұмыртқалары, қоректік зат тапшылығы (N, P, K, Mg, Fe, Ca), су режимі (су тапшылығы немесе артық суару), күн күйігі, суық, тұздану, күтім қателері. Әр қорытындыға суреттегі нақты белгіні дәлел ретінде көрсет. Белгі көрінбесе – ойдан қоспа. Пайдалы жәндікті (қаңқыз, алтынкөз) зиянкес деп атама.',
    'ТАПСЫРМА 3 – ЗАҚЫМ ПАЙЫЗЫ. Жапырақ тақтасының неше пайызы зақымданғанын бағала. Браузердегі түс индикаторы өлшеген мәнді ескер, бірақ суретке сүйен.',
    'ТАПСЫРМА 4 – ШАРАЛАР. Осы өсімдік пен осы мәселеге нақты, қарапайым тілмен жазылған шаралар: шұғыл қадамдар, қауіпсіз (биологиялық, агротехникалық) шаралар, химиялық шара (тек ересектерге, тіркелген препарат түрі), алдын алу.',
    body.plantHint ? `Пайдаланушы көрсеткен өсімдік: «${body.plantHint}» (тексеріп шық, қате болуы мүмкін).` : '',
    plantnet && plantnet.length ? `Pl@ntNet ботаникалық сервисінің болжамы: ${plantnet.map((p) => `${p.latin}${p.common && p.common.length ? ' (' + p.common.join(', ') + ')' : ''} – ${p.score}%`).join('; ')}. Бұл болжамды жапырақтың белгілерімен салыстырып тексер.` : '',
    body.local ? `Түс индикаторының өлшемдері: ${JSON.stringify(body.local)}.` : '',
    kb.plants ? `Біздің каталогтағы өсімдіктер (kb_id=атауы): ${list(kb.plants)}.` : '',
    kb.disorders ? `Анықтамалықтағы аурулар мен бұзылыстар: ${list(kb.disorders)}.` : '',
    kb.pests ? `Зиянкестер: ${list(kb.pests)}. Пайдалы жәндіктер: ${list(kb.beneficial)}.` : '',
    'Сәйкес келетін анықтамалық жазбасы болса, kb_id өрісіне оның идентификаторын жаз, болмаса null. Каталогта жоқ өсімдік те, ауру да болуы мүмкін – оны да атай бер.',
    'summary өрісіне 2–4 сөйлемнен тұратын қорытынды жаз, үлгісі: «Бұл – қызанақ (Solanum lycopersicum) жапырағы. Жапырақта альтернариоз белгілері бар: айналасы сары, ішінде шеңберлері бар қоңыр дақтар. Жапырақтың шамамен 15%-ы зақымданған, бұл – ерте саты. Ауру жапырақтарды жұлып, түбінен суарыңыз.»',
    'Барлық мәтінді ҚАЗАҚ тілінде, Ә, Ғ, Қ, Ң, Ө, Ұ, Ү, Һ, І әріптерін дұрыс қолданып жаз. Жауапты ТЕК JSON түрінде бер:',
    '{"is_plant": true/false,',
    ' "plant": {"kk": "қазақша атауы", "latin": "латынша атауы", "ru": "орысша атауы", "kb_id": "...|null", "group": "' + GROUPS.join('|') + '", "groups": ["қосымша топтар"], "poisonous": 0-2, "confidence": 0-100, "why": "қай белгілеріне қарап таныдың", "alternatives": [{"kk": "...", "latin": "...", "confidence": 0-100}]},',
    ' "need_more_photos": true/false, "what_to_photograph": "тағы не түсіру керек",',
    ' "overall": "сау|ауру|зиянкес|физиологиялық бұзылыс|бірнеше мәселе|анықтау мүмкін емес",',
    ' "findings": [{"kb_id": "...|null", "name": "атауы", "kind": "ауру|зиянкес|жұмыртқа|пайдалы жәндік|қоректік зат|су режимі|ауа райы|топырақ|күтім", "confidence": 0-100, "evidence": "суретте нақты не көрінеді", "stage": "ерте|орташа|кеш"}],',
    ' "severity_percent": 0-100, "urgency": 0-3, "summary": "қорытынды",',
    ' "actions_now": ["..."], "actions_safe": ["..."], "actions_chemical": ["..."], "prevention": ["..."],',
    ' "photo_tips": "суретті қалай жақсартуға болады", "note": "маңызды ескерту"}',
    'Сурет өсімдік болмаса is_plant=false қой. Сау өсімдікке findings бос тізім бер. Адамға, балаға, малға улы өсімдік болса, note өрісінде міндетті түрде ескерт. Карантиндік зиянкес не ауру (шегіртке, бактериялық күйік т.б.) болса, фитосанитарлық инспекцияға хабарлау керегін жаз.'
  ].filter(Boolean).join('\n');
}

function extractJSON(text) {
  if (!text) throw new Error('Модель бос жауап қайтарды');
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

// Vercel функциясы 60 секундтан ұзақ жұмыс істей алмайды (vercel.json → maxDuration).
// Сондықтан әр модельге уақыт шегі қойылады: жауап кешіксе, жылдамырақ модельге ауысамыз.
const T_TOTAL = +process.env.AI_TOTAL_MS || 54000;   // барлық әрекетке
const T_ATTEMPT = +process.env.AI_ATTEMPT_MS || 30000; // бір модельге

async function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(1000, ms));
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(timer); }
}

async function callPlantNet(key, imgs) {
  const form = new FormData();
  imgs.forEach((im, i) => {
    form.append('organs', 'auto');
    form.append('images', new Blob([Buffer.from(im.b64, 'base64')], { type: im.mime }), `leaf${i}.jpg`);
  });
  const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(key)}&nb-results=5&lang=ru&include-related-images=false`;
  const r = await fetchWithTimeout(url, { method: 'POST', body: form }, 10000);
  if (r.status === 404) return []; // түр табылмады
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j && j.message) || `Pl@ntNet қатесі: ${r.status}`);
  return (j.results || []).slice(0, 5).map((x) => ({
    latin: x.species && x.species.scientificNameWithoutAuthor,
    family: x.species && x.species.family && x.species.family.scientificNameWithoutAuthor,
    common: (x.species && x.species.commonNames || []).slice(0, 2),
    score: Math.round((x.score || 0) * 100)
  })).filter((x) => x.score >= 2);
}

// Gemini модельдерінің тізімі: алдымен ең жақсысы, кешіксе – жылдам «lite» модельдер.
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

async function callGemini(key, imgs, prompt, deadline) {
  const models = [...new Set([process.env.GEMINI_MODEL].concat(GEMINI_MODELS).filter(Boolean))];
  const parts = [{ text: prompt }].concat(imgs.map((im) => ({ inline_data: { mime_type: im.mime, data: im.b64 } })));
  let lastErr = null, onlyLite = false;
  for (const model of models) {
    if (onlyLite && !/lite/.test(model)) continue;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    let thinking = true; // ойлану деңгейі «low» – жауап тез келеді
    for (let attempt = 0; attempt < 2; attempt++) {
      const left = deadline - Date.now();
      if (left < 5000) throw lastErr || new Error('AI уақытында жауап бермеді, бір минуттан кейін қайталаңыз');
      const generationConfig = { temperature: 0.1, responseMimeType: 'application/json' };
      if (thinking) generationConfig.thinkingConfig = { thinkingLevel: 'low' };
      let r;
      try {
        r = await fetchWithTimeout(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig })
        }, Math.min(T_ATTEMPT, left - 2000));
      } catch (e) {
        if (e.name === 'AbortError') { lastErr = new Error('AI уақытында жауап бермеді, бір минуттан кейін қайталаңыз'); onlyLite = true; }
        else lastErr = new Error('Gemini серверіне қосылу мүмкін болмады: ' + e.message);
        break;
      }
      const j = await r.json().catch(() => ({}));
      const msg = (j.error && j.error.message) || '';
      if (r.status === 400 && thinking && /thinking/i.test(msg)) { thinking = false; continue; } // бұл модель ойлану деңгейін қолдамайды
      if (r.status === 404 || r.status === 403) { lastErr = new Error(msg || `Модель қолжетімсіз: ${model}`); break; }
      if (r.status === 429 || r.status >= 500) { lastErr = new Error(msg || 'Gemini уақытша бос емес, бір минуттан кейін қайталаңыз'); break; }
      if (!r.ok) throw new Error(msg || `Gemini қатесі: ${r.status}`);
      const text = ((((j.candidates || [])[0] || {}).content || {}).parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
      try { return { model, result: extractJSON(text) }; } catch (e) { lastErr = e; break; }
    }
  }
  throw lastErr || new Error('Gemini моделі қолжетімсіз');
}

async function callClaude(key, imgs, prompt, deadline) {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
  const content = imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mime, data: im.b64 } })).concat([{ type: 'text', text: prompt }]);
  const r = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 2500, temperature: 0.1, messages: [{ role: 'user', content }] })
  }, Math.max(5000, deadline - Date.now() - 2000));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || `Claude қатесі: ${r.status}`);
  return { model, result: extractJSON((j.content || []).map((c) => c.text || '').join('')) };
}

function parseImages(body) {
  const raw = Array.isArray(body.images) && body.images.length ? body.images : [body.image];
  const imgs = [];
  let total = 0;
  for (const s of raw.slice(0, 3)) {
    const m = String(s || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!m) continue;
    total += m[2].length * 0.75;
    imgs.push({ mime: m[1], b64: m[2] });
  }
  if (!imgs.length) throw new Error('Сурет жіберілмеді немесе пішімі қолдау көрсетілмейді (JPEG, PNG, WEBP)');
  if (total > MAX_BYTES) throw new Error('Суреттер тым үлкен (барлығы 4 МБ-тан аспауы керек)');
  return imgs;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Тек POST сұранысы қабылданады' }); return; }
  const deadline = Date.now() + T_TOTAL;
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    body = body || {};
    const imgs = parseImages(body);

    let plantnet = null, plantnetError = null;
    if (process.env.PLANTNET_API_KEY) {
      try { plantnet = await callPlantNet(process.env.PLANTNET_API_KEY, imgs); } catch (e) { plantnetError = e.message; }
    }
    const prompt = buildPrompt(body, plantnet, imgs.length);
    let out = null, provider = null;
    if (process.env.GEMINI_API_KEY) { provider = 'Google Gemini'; out = await callGemini(process.env.GEMINI_API_KEY, imgs, prompt, deadline); }
    else if (process.env.ANTHROPIC_API_KEY) { provider = 'Anthropic Claude'; out = await callClaude(process.env.ANTHROPIC_API_KEY, imgs, prompt, deadline); }
    else if (!plantnet) { res.status(503).json({ ok: false, error: 'AI кілті бапталмаған. Vercel параметрлеріне GEMINI_API_KEY қосыңыз (README нұсқаулығы).' }); return; }
    res.status(200).json({ ok: true, provider, model: out && out.model, result: out ? out.result : null, plantnet, plantnetError });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Белгісіз қате' });
  }
}
