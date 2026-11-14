// Drishti news builder: runs hourly on GitHub Actions.
// Reads trusted feeds, groups the same story across publishers, ranks what matters,
// adds 60-word summaries (Gemini, optional), market data, and writes data/*.json.

import { XMLParser } from 'fast-xml-parser';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { TRUSTED, SECTIONS, FACTCHECK_FEEDS } from './sources.mjs';

const DATA = new URL('../data/', import.meta.url);
const CACHE = new URL('../.cache/', import.meta.url); // kept between runs by actions/cache, not committed
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODELS = (process.env.GEMINI_MODEL || 'gemini-2.5-flash,gemini-flash-latest,gemini-2.0-flash').split(',');
const YT_KEY = process.env.YOUTUBE_API_KEY || '';
const NTFY_TOPIC = process.env.NTFY_TOPIC || '';
const NOW = Date.now();
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36 DrishtiNewsBot/1.0';
const log = (...a) => console.log(...a);

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#text', cdataPropName: '#cdata', processEntities: false, htmlEntities: false });

// ---------- helpers ----------
async function fetchText(url, ms = 15000, headers = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': UA, 'Accept': '*/*', ...headers }, redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}
async function readJson(name, fallback, dir = DATA) {
  try { return JSON.parse(await readFile(new URL(name, dir), 'utf8')); } catch { return fallback; }
}
async function writeJson(name, obj, dir = DATA) {
  await mkdir(dir, { recursive: true });
  await writeFile(new URL(name, dir), JSON.stringify(obj));
}
const txt = (v) => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return txt(v[0]);
  return txt(v['#cdata'] ?? v['#text'] ?? '');
};
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };
function clean(s) {
  return String(s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isNaN(n) ? ' ' : String.fromCodePoint(n); }
      return ENT[e.toLowerCase()] ?? ' ';
    })
    .replace(/\s+/g, ' ').trim();
}
function domainOf(u) {
  try { return new URL(u).hostname.replace(/^www\./, '').replace(/^m\./, '').replace(/^amp\./, ''); } catch { return ''; }
}
function trustedName(u) {
  const d = domainOf(u);
  if (!d) return null;
  let best = null;
  for (const k of Object.keys(TRUSTED)) if (d === k || d.endsWith('.' + k)) { if (!best || k.length > best.length) best = k; }
  return best ? TRUSTED[best] : null;
}
const STOP = new Set('a an the of to in on for and or but is are was were be been with by at from as it its this that after over into new says said amid will can has have had not no up out than more how why what who when where vs his her their they you your we our all about just also live updates update watch video photos check today latest india indian mumbai'.split(' '));
function tokens(title) {
  return new Set(title.toLowerCase().replace(/[‘’'`]s\b/g, '').replace(/[‘’'`]/g, '').replace(/[^a-z0-9\u0900-\u097f ]+/g, ' ').split(' ')
    .map((w) => (w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .filter((w) => (w.length > 2 || /^\d+$/.test(w)) && !STOP.has(w)));
}
// word rarity across this run's headlines: rare shared words (names, places) count more
const DF = new Map(); let DOCS = 1;
function learnDF(titles) { DOCS = titles.length || 1; DF.clear(); for (const t of titles) for (const w of tokens(t)) DF.set(w, (DF.get(w) || 0) + 1); }
const idf = (w) => Math.log(1 + DOCS / (1 + (DF.get(w) || 0)));
function jaccard(a, b) {
  let i = 0; for (const x of a) if (b.has(x)) i++;
  const u = a.size + b.size - i; return u ? i / u : 0;
}
// same story if word overlap is strong (handles long and short headlines of the same event)
function similar(a, b) {
  let inter = 0, n = 0, wa = 0, wb = 0;
  for (const x of a) { const v = idf(x); wa += v; if (b.has(x)) { inter += v; n++; } }
  for (const x of b) wb += idf(x);
  if (n < 2) return 0;
  const j = inter / (wa + wb - inter);
  const ov = inter / Math.min(wa, wb);
  return Math.max(j, ov * 0.7);
}
const JUNK = /e-?paper|^explained\s.*\bnews\b|latest news, |court rulings & new laws|wishes,? (messages|quotes)|messages,? quotes|images and greetings|shayari|(price|rate|rates) today in (?!mumbai|india)[a-z]|check latest (petrol|diesel|gold|silver)|horoscope|rashifal|lottery|result live|live score|quiz:|crossword|wordle|today's (date|wordle)/i;
const words = (s, n) => { const w = s.split(/\s+/); return w.length <= n ? s : w.slice(0, n).join(' ').replace(/[,;:]$/, '') + '…'; };
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);

// ---------- feed parsing ----------
function pickImage(it, descHtml) {
  const cands = [];
  const push = (v) => { if (!v) return; (Array.isArray(v) ? v : [v]).forEach((x) => cands.push(typeof x === 'string' ? x : x['@url'] || x['@href'])); };
  push(it['media:content']); push(it['media:thumbnail']);
  if (it['media:group']) { push(it['media:group']['media:content']); push(it['media:group']['media:thumbnail']); }
  const enc = it.enclosure; if (enc) (Array.isArray(enc) ? enc : [enc]).forEach((e) => { if (!e['@type'] || /image/.test(e['@type'])) cands.push(e['@url']); });
  if (it.image) cands.push(txt(it.image.url || it.image));
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(descHtml || ''); if (m) cands.push(m[1]);
  const ok = cands.find((u) => u && /^https:\/\//.test(u) && !/\.(gif)(\?|$)/i.test(u) && !/1x1|pixel|spacer|logo/i.test(u));
  return ok || null;
}

function parseFeed(xml, feedUrl) {
  const doc = parser.parse(xml);
  const isG = feedUrl.includes('news.google.com');
  let items = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.['rdf:RDF']?.item ?? [];
  if (!Array.isArray(items)) items = [items];
  const feedPub = trustedName(feedUrl);
  const out = [];
  for (const it of items) {
    let title = clean(txt(it.title));
    let link = typeof it.link === 'string' ? it.link : (Array.isArray(it.link) ? (it.link.find((l) => !l['@rel'] || l['@rel'] === 'alternate')?.['@href'] ?? txt(it.link[0])) : (it.link?.['@href'] ?? txt(it.link)));
    if (!link && it.guid) link = txt(it.guid);
    link = String(link || '').trim().replace(/&amp;/g, '&');
    const descHtml = txt(it['content:encoded']) || txt(it.description) || txt(it.summary) || txt(it.content);
    let publisher = feedPub, pubUrl = link;
    if (isG) {
      const src = it.source; const su = (src?.['@url'] || '').replace(/&amp;/g, '&'); const sn = clean(txt(src));
      publisher = trustedName(su);
      if (!publisher) continue; // not a trusted outlet
      if (sn && title.endsWith(' - ' + sn)) title = title.slice(0, -(sn.length + 3));
      else title = title.replace(/ - [^-]{2,40}$/, '');
      pubUrl = su;
    } else {
      const lp = trustedName(link);
      if (lp) publisher = lp;
      if (!publisher) continue;
    }
    const dateStr = txt(it.pubDate) || txt(it.published) || txt(it.updated) || txt(it['dc:date']);
    const t = Date.parse(dateStr);
    if (!title || !link || isNaN(t) || /(newscomm|#comments)/i.test(link)) continue;
    const desc = isG ? '' : clean(descHtml);
    out.push({ title, link, publisher, pubUrl, time: Math.min(t, NOW), desc: desc.length > 40 && !desc.startsWith(title.slice(0, 30)) ? desc : '', image: isG ? null : pickImage(it, descHtml) });
  }
  return out;
}

const feedStats = [];
async function loadFeed(url) {
  try {
    const xml = await fetchText(url);
    const items = parseFeed(xml, url);
    feedStats.push({ url, ok: true, n: items.length });
    return items;
  } catch (e) {
    feedStats.push({ url, ok: false, err: String(e.message || e) });
    return [];
  }
}

// ---------- clustering and ranking ----------
const BREAKING = /\b(breaking|killed|dead|dies|death toll|blast|explosion|attack|earthquake|flood|cyclone|crash|collapse|fire|war|missile|strike|ceasefire|resigns|arrested|verdict|rbi|repo rate|budget|gst|sensex crash|record high|alert|red alert|orange alert|heavy rain|shut|holiday|mega block|outage)\b/i;

function clusterItems(items) {
  items.sort((a, b) => b.time - a.time);
  const clusters = []; const index = new Map();
  for (const it of items) {
    const tk = tokens(it.title);
    if (tk.size < 2) continue;
    const cand = new Set();
    for (const w of tk) for (const ci of index.get(w) || []) cand.add(ci);
    let best = null, bs = 0;
    for (const ci of cand) { const c = clusters[ci]; const sc = similar(tk, c.tk); if (sc > bs) { bs = sc; best = ci; } }
    if (best != null && bs >= 0.4) {
      const c = clusters[best];
      if (!c.items.some((x) => x.link === it.link)) c.items.push(it);
      for (const w of tk) if (!c.tk.has(w)) { c.tk.add(w); (index.get(w) || index.set(w, []).get(w)).push(best); }
    } else {
      const ci = clusters.push({ tk: new Set(tk), items: [it] }) - 1;
      for (const w of tk) (index.get(w) || index.set(w, []).get(w)).push(ci);
    }
  }
  return clusters;
}

// ---------- which section a story belongs to ----------
const KW = {
  mumbai: /\b(mumbai|thane|navi mumbai|malad|marve|andheri|bandra|borivali|kandivali|goregaon|dadar|kurla|ghatkopar|powai|juhu|colaba|worli|vasai|virar|panvel|kalyan|dombivli|bmc|best (bus|buses|undertaking)|western railway|central railway|harbour line|local trains?|mira road|bhayandar|oshiwara|chembur|sion|mulund|vikhroli|byculla|marine drive|bkc|lokhandwala|versova|santacruz|vile parle|matunga|mahim|lower parel|prabhadevi|cst|churchgate|mmrda|metro line)\b/i,
  world: /\b(us|u\.s\.|usa|america|american|trump|washington|white house|pentagon|china|chinese|beijing|xi|russia|russian|putin|ukraine|kyiv|israel|israeli|gaza|hamas|hezbollah|iran|iranian|tehran|pakistan|pakistani|uk|britain|british|london|europe|european|eu|nato|united nations|un|japan|korea|afghan|taliban|syria|saudi|uae|dubai|qatar|bangladesh|nepal|sri lanka|canada|australia|africa|france|germany|paris|berlin|apec|g20|g7|global|world|international|new orleans|mississippi|faa)\b/i,
  markets: /\b(sensex|nifty|stocks?|shares?|market|markets|ipo|rbi|repo|inflation|gdp|rupee|earnings|profit|revenue|quarter|q[1-4]|sebi|investors?|fii|dii|crude|bonds?|economy|economic|trade deal|tariff|gst|exports?|imports?|dividend|bitcoin|crypto|ltd|limited|company|bank)\b/i,
  money: /\b(mutual funds?|sip|sips|nav|amc|elss|ppf|nps|income tax|itr|tax saving|fixed deposits?|fd rates?|savings|insurance|loan|loans|emi|credit card|personal finance|retirement|pension|epf|investment plan|wealth)\b/i,
  gold: /\b(gold|silver|bullion|jewell?ery|petrol|diesel|lpg|cng|fuel prices?|commodit(y|ies)|crude oil price|vegetable prices|tomato prices?|onion prices?)\b/i,
  bollywood: /\b(bollywood|actor|actress|film|films|movie|box office|trailer|shah rukh|srk|salman|aamir|ranbir|alia|deepika|katrina|akshay|hrithik|kareena|ranveer|kartik|kriti|bigg boss|celebrity|celebs?|star kids?|kapoor|khan|bachchan|singer|song|music|wedding|ramayana)\b/i,
  movies: /\b(review|box office|collection|trailer|teaser|release|releases|ott|netflix|prime video|hotstar|jiohotstar|zee5|sonyliv|film|movie|cinema|ratings?|stars)\b/i,
  viral: /\b(viral|trending|internet|netizens|social media|video shows|caught on camera|instagram|reddit|meme|watch video|goes viral|x users)\b/i,
  phones: /\b(phone|phones|smartphone|iphone|galaxy|pixel|oneplus|xiaomi|redmi|vivo|oppo|realme|poco|motorola|nothing phone|iqoo|honor|huawei|android|ios|tablet|ipad|5g phone|flip|fold)\b/i,
  gadgets: /\b(ai|artificial intelligence|chatgpt|openai|gemini|google|microsoft|apple|meta|tech|technology|software|app|apps|startup|laptop|chip|chips|nvidia|semiconductor|cyber|hack|hackers|outage|robot|ev|electric vehicle|tesla|spacex|isro|satellite|gadget|smartwatch|earbuds|wearable|internet|data centre|elon musk)\b/i,
  health: /\b(health|healthy|hospital|doctors?|disease|dengue|malaria|covid|virus|vaccine|cancer|diabetes|heart|fitness|diet|nutrition|sleep|mental health|yoga|wellness|skin|hair|weight loss|exercise|ayurved\w*|medicine|medical|drug|icmr|lifestyle|food|foods|recipe|parenting|pregnan\w*|aqi|pollution|air quality)\b/i,
  sports: /\b(cricket|ipl|test|odi|t20|bcci|icc|football|fifa|isl|hockey|tennis|badminton|olympics?|kabaddi|chess|f1|formula 1|athlet\w*|wickets?|innings|century|squad|coach|tournament|league|match|medal|world cup|grand prix|boxing|wrestling|kohli|rohit|gill|bumrah|dhoni|asia cup|u-?19|ranji|smat)\b/i
};
const POLITICAL = /\b(bjp|congress|rahul gandhi|modi|amit shah|minister|ministers|mla|mp|cbi|ed raid|police|arrest|arrested|court|judge|custody|election|polls?|murder|killed|scam|betting|thackeray|shiv sena)\b/i;
const FASHION = /\b(fashion|style|stylish|outfit|look|looks|dressed|designer|red carpet|bandhgala|saree|lehenga|brooch(es)?|gown|couture|manish malhotra|sabyasachi|celebrity|celebs?|airport look)\b/i;
const FEED_TRUSTED_TOPIC = new Set(['sports', 'phones', 'markets', 'money']);
const TOPICAL = new Set(['markets', 'money', 'gold', 'bollywood', 'movies', 'viral', 'phones', 'gadgets', 'health', 'sports', 'knowledge', 'spiritual']);
const SEC_BY_ID = Object.fromEntries(SECTIONS.map((x) => [x.id, x]));
function chooseSection(c) {
  const text = c.items.map((i) => i.title).join(' . ');
  const titles = c.items.map((i) => i.title).join(' . ');
  const votes = {};
  for (const i of c.items) votes[i.origin] = (votes[i.origin] || 0) + (i.google ? 1 : 3);
  let best = null, bestScore = -1;
  for (const sec of SECTIONS) {
    const id = sec.id;
    const hits = KW[id] ? (text.match(new RegExp(KW[id].source, 'gi')) || []).length : 0;
    if (sec.exclude && sec.exclude.test(titles)) continue;
    let ok;
    if (id === 'india') ok = true;
    else if (id === 'knowledge' || id === 'spiritual') ok = sec.require.test(titles);
    else if (id === 'mumbai') ok = hits > 0;
    else if (id === 'world') ok = hits > 0 && !KW.mumbai.test(titles);
    else if (POLITICAL.test(titles) && !['markets', 'money', 'sports', 'gold'].includes(id)) ok = false; // politics and crime are news, not lifestyle or tech
    else if (id === 'health' && FASHION.test(titles)) ok = false; // fashion and celebrity style are not health
    else ok = hits >= 2 || (hits >= 1 && (votes[id] || 0) >= 1) || ((votes[id] || 0) >= 3 && FEED_TRUSTED_TOPIC.has(id)); // keyword plus the topic's own feed
    if (!ok) continue;
    let score = (votes[id] || 0) + Math.min(hits, 4) * (TOPICAL.has(id) ? 3 : 2);
    if (id === 'india') score -= 1; // general bucket loses ties
    if (TOPICAL.has(id) && hits < 2 && KW.mumbai.test(titles)) score -= 4; // a Mumbai story with only a passing topic word stays in Mumbai
    if (id === 'knowledge' && sec.require.test(titles)) score += 3;
    if (score > bestScore) { bestScore = score; best = sec; }
  }
  return best || SEC_BY_ID.india;
}

function buildStory(c, section) {
  const pubs = [];
  for (const it of c.items) if (!pubs.some((p) => p.name === it.publisher)) pubs.push({ name: it.publisher, url: it.link });
  const direct = c.items.filter((i) => !i.link.includes('news.google.com'));
  const lead = direct.find((i) => i.image && i.desc) || direct.find((i) => i.desc) || direct[0] || c.items[0];
  const newest = Math.max(...c.items.map((i) => i.time));
  const first = Math.min(...c.items.map((i) => i.time));
  const image = (c.items.find((i) => i.image) || {}).image || null;
  const titleLower = lead.title.toLowerCase();
  const isLocal = section.local && section.local.some((k) => titleLower.includes(k) || (lead.desc || '').toLowerCase().includes(k));
  const ageH = (NOW - newest) / 3.6e6;
  const n = pubs.length;
  let score = (1 + Math.log2(n) * 2.2) * section.weight;
  score *= Math.exp(-ageH / (section.id === 'knowledge' ? 72 : 14));
  if (BREAKING.test(lead.title)) score *= 1.35;
  if (isLocal) score *= 1.5;
  return {
    id: hash(section.id + '|' + [...tokens(lead.title)].sort().join(' ')),
    section: section.id,
    title: lead.title,
    desc: lead.desc ? words(lead.desc, 70) : '',
    link: lead.link,
    image,
    sources: pubs.slice(0, 8),
    n,
    time: newest,
    first,
    links: c.items.map((i) => i.link).filter((l) => !l.includes('news.google.com')).slice(0, 3),
    glinks: c.items.map((i) => i.link).filter((l) => l.includes('news.google.com')).slice(0, 3),
    local: !!isLocal,
    breaking: BREAKING.test(lead.title) && ageH < 6,
    score: Math.round(score * 1000) / 1000
  };
}

// ---------- fact checks ----------
function attachFactChecks(stories, checks) {
  const ct = checks.map((c) => ({ ...c, tk: tokens(c.title) }));
  for (const s of stories) {
    const st = tokens(s.title);
    let best = null, bs = 0;
    for (const c of ct) { const j = jaccard(st, c.tk); if (j > bs) { bs = j; best = c; } }
    if (best && bs >= 0.3) s.factCheck = { title: best.title, source: best.publisher, link: best.link };
  }
}


// ---------- article enrichment: real publisher link, photo and opening text ----------
async function decodeGoogle(url) {
  try {
    const id = url.split('/articles/')[1].split('?')[0];
    const html = await fetchText(`https://news.google.com/rss/articles/${id}`, 10000);
    const sg = /data-n-a-sg="([^"]+)"/.exec(html)?.[1], ts = /data-n-a-ts="([^"]+)"/.exec(html)?.[1];
    if (!sg || !ts) return null;
    const inner = `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sg}"]`;
    const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', inner, null, 'generic']]]));
    const r = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': UA } });
    const t = await r.text();
    const part = t.split('\n\n')[1]; if (!part) return null;
    const u = JSON.parse(JSON.parse(part)[0][2])[1];
    return /^https?:\/\//.test(u) ? u : null;
  } catch { return null; }
}
const BOILER = /(photo:|photo credit|file photo|image:|image credit|representational|screengrab|also read|read more|click here|subscribe|follow us|download the app|all rights reserved|©|cookie|advertisement|newsletter|whatsapp channel|join our|sign up|log in|reported by|edited by|updated on|first published|for more news|stay updated|google news)/i;
function extractArticle(html) {
  const meta = (k) => new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]+content=["']([^"']+)["']`, 'i').exec(html)?.[1] || new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${k}["']`, 'i').exec(html)?.[1];
  let image = meta('og:image') || meta('twitter:image');
  if (image && !/^https:/.test(image)) image = null;
  const ogd = clean(meta('og:description') || meta('description') || '');
  // paragraphs first (cleanest), JSON-LD articleBody as a fallback
  const paras = [];
  const bodyHtml = html.replace(/<(header|footer|nav|aside|figure|figcaption)[\s\S]*?<\/\1>/gi, ' ');
  for (const m of bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = clean(m[1]);
    if (t.length >= 70 && /[.!?]["’”]?$/.test(t) && !BOILER.test(t) && !paras.includes(t)) paras.push(t);
    if (paras.join(' ').length > 1600) break;
  }
  let text = paras.join(' ');
  if (text.length < 200) {
    for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      const ab = /"articleBody"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(m[1]);
      if (!ab) continue;
      let t; try { t = clean(JSON.parse('"' + ab[1] + '"')); } catch { t = clean(ab[1]); }
      const dots = (t.match(/[.!?]/g) || []).length;
      if (t.length > 200 && dots >= t.length / 400) { text = t; break; }
    }
  }
  return { image, ogd, text: text.slice(0, 1800) };
}
function extractive(text, fallback) {
  const src = (text && text.length > 150 ? text : fallback || '').replace(/\s+/g, ' ').replace(/^[A-Z][A-Za-z .]{2,30}:\s/, '').trim();
  if (!src) return '';
  const sents = src.match(/[^.!?]+[.!?]+["’”]?(\s|$)/g) || [src];
  let out = '';
  for (const x of sents) { const next = (out + ' ' + x.trim()).trim(); if (next.split(' ').length > 72 && out) break; out = next; if (out.split(' ').length >= 48) break; }
  return words(out, 75);
}
// drop a repeated headline at the start of a summary ("Headline | Text" or "Headline. Text")
function stripTitle(sum, title) {
  if (!sum) return sum;
  const bar = sum.indexOf(' | ');
  if (bar > 15 && bar < 220 && similar(tokens(sum.slice(0, bar)), tokens(title)) > 0.5) sum = sum.slice(bar + 3);
  const cap = /^(.{10,260}?) \| ([A-Z][\w.&-]*(?:[ ,]+[A-Z][\w.&-]*){0,2}) (?=[A-Z])/.exec(sum); // photo caption + credit
  if (cap && sum.length - cap[0].length > 80) sum = sum.slice(cap[0].length);
  const t = title.toLowerCase().slice(0, 40);
  if (sum.toLowerCase().startsWith(t)) { const cut = sum.slice(title.length).replace(/^[\s.:|–—-]+/, ''); if (cut.length > 60) sum = cut; }
  return sum.trim();
}
const COMMENTS = /(newscomm|\/comments?\/|#comments|comment\.php|\/forum|\/reviews?comm)/i;
async function pool(items, n, fn) { const q = [...items]; await Promise.all(Array.from({ length: n }, async () => { while (q.length) await fn(q.shift()); })); }

async function enrich(stories, cache) {
  const need = stories.filter((s) => !(cache[s.id]?.text != null && (cache[s.id].img || s.image)));
  let ok = 0, dec = 0;
  await pool(need, 8, async (s) => {
    const c = cache[s.id] ||= { n: 0, at: NOW };
    const direct = [...new Set([...(s.link.includes('news.google.com') ? [] : [s.link]), ...(s.links || [])])];
    const tryUrl = async (u) => {
      if (COMMENTS.test(u)) { c.bad = c.bad ?? true; return false; }
      c.bad = false;
      try {
        const a = extractArticle(await fetchText(u, 10000, { Accept: 'text/html' }));
        if (a.image && !c.img) c.img = a.image;
        if (a.ogd && !c.ogd) c.ogd = a.ogd;
        if (a.text.length > 150) { c.text = a.text; c.url = u; ok++; return true; }
      } catch { /* blocked or slow */ }
      return false;
    };
    c.url = direct[0] || null; c.text = '';
    let done = false;
    for (const u of direct.slice(0, 3)) if ((done = await tryUrl(u))) break;
    if (!done) for (const g of (s.glinks || []).slice(0, 2)) {
      const u = await decodeGoogle(g); if (!u) continue; dec++;
      if (!c.url) c.url = u;
      if ((done = await tryUrl(u))) break;
    }
  });
  log(`enrich: ${need.length} new, ${dec} google links decoded, ${ok} articles read`);
  for (const s of stories) {
    const c = cache[s.id]; if (!c) continue;
    if (c.url) { s.link = c.url; if (s.sources[0]) s.sources[0].url = s.sources[0].url.includes('news.google.com') ? c.url : s.sources[0].url; }
    if (!s.image && c.img) s.image = c.img;
    s.body = c.text || '';
    if (!s.desc && c.ogd && c.ogd.length > 60) s.desc = c.ogd;
  }
}

// ---------- summaries ----------
async function gemini(prompt) {
  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.trim()}:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.25, responseMimeType: 'application/json' } })
      });
      if (r.status === 404) continue;
      if (!r.ok) { log('gemini', model, r.status, (await r.text()).slice(0, 200)); if (r.status === 429) return null; continue; }
      const j = await r.json();
      return j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || null;
    } catch (e) { log('gemini error', model, e.message); }
  }
  return null;
}

async function summarise(stories, cache) {
  const need = stories.filter((s) => !cache[s.id]?.summary || cache[s.id].n < s.n);
  log(`summaries: ${stories.length - need.length} cached, ${need.length} to write, gemini=${GEMINI_KEY ? 'on' : 'off'}`);
  if (GEMINI_KEY) {
    for (let i = 0; i < need.length && i < 160; i += 8) {
      const batch = need.slice(i, i + 8);
      const prompt = `You write the "Quick 60" section of an Indian morning news app. For each story below, write a neutral, factual summary of 50 to 60 words in plain English, using ONLY the facts given (headlines and snippets from trusted outlets). Do not invent numbers, names or quotes. Lead with what happened, then why it matters. Also write a short headline (max 12 words).
Return JSON: [{"id":"...","headline":"...","summary":"..."}]

${batch.map((s) => JSON.stringify({ id: s.id, headlines: [s.title, ...(s.alt || [])].slice(0, 4), snippet: s.desc, article_start: (s.body || '').slice(0, 1200), outlets: s.sources.map((x) => x.name) })).join('\n')}`;
      const out = await gemini(prompt);
      if (!out) break;
      try {
        const arr = JSON.parse(out.replace(/^```json|```$/g, ''));
        for (const x of arr) if (x.id && x.summary) Object.assign(cache[x.id] ||= {}, { headline: x.headline, summary: x.summary.trim(), n: (stories.find((s) => s.id === x.id) || {}).n || 1, at: NOW, ai: true });
      } catch (e) { log('gemini parse fail', e.message); }
    }
  }
  for (const s of stories) {
    const c = cache[s.id];
    if (c?.summary) { s.summary = c.summary; if (c.headline) s.headline = c.headline; s.ai = !!c.ai; }
    else s.summary = extractive(s.body, s.desc);
    s.summary = stripTitle(s.summary, s.title);
  }
  // drop cache entries older than 4 days
  for (const k of Object.keys(cache)) { if (NOW - (cache[k].at || 0) > 3 * 864e5) delete cache[k]; else if (cache[k].text) cache[k].text = cache[k].text.slice(0, 1300); }
}

// ---------- markets ----------
async function yahoo(sym, range = '1d', interval = '5m') {
  for (const host of ['query1', 'query2']) {
    try {
      const j = JSON.parse(await fetchText(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`, 12000, { Accept: 'application/json' }));
      const r = j?.chart?.result?.[0]; if (!r) continue;
      const m = r.meta; const closes = (r.indicators?.quote?.[0]?.close || []).filter((v) => v != null);
      const price = m.regularMarketPrice ?? closes[closes.length - 1];
      const prev = range === '1d' ? (m.chartPreviousClose ?? m.previousClose) : closes[0];
      const step = Math.max(1, Math.floor(closes.length / 40));
      return { price, prev, change: price - prev, pct: prev ? ((price - prev) / prev) * 100 : 0, spark: closes.filter((_, i) => i % step === 0 || i === closes.length - 1).map((v) => Math.round(v * 100) / 100), time: (m.regularMarketTime || 0) * 1000 };
    } catch (e) { /* try next */ }
  }
  return null;
}

const MOVERS = ['RELIANCE', 'HDFCBANK', 'ICICIBANK', 'INFY', 'TCS', 'BHARTIARTL', 'ITC', 'LT', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'HINDUNILVR', 'BAJFINANCE', 'MARUTI', 'M&M', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'NTPC', 'POWERGRID', 'TATASTEEL', 'ADANIENT', 'ADANIPORTS', 'ASIANPAINT', 'HCLTECH', 'WIPRO', 'TECHM', 'NESTLEIND', 'ONGC', 'COALINDIA', 'JSWSTEEL', 'GRASIM', 'CIPLA', 'DRREDDY', 'EICHERMOT', 'HEROMOTOCO', 'BAJAJ-AUTO', 'BRITANNIA', 'APOLLOHOSP', 'INDUSINDBK', 'SHRIRAMFIN', 'TRENT', 'BEL', 'HDFCLIFE', 'SBILIFE', 'TATACONSUM', 'BAJAJFINSV', 'ETERNAL', 'JIOFIN', 'TMPV'];
const NAMES = { RELIANCE: 'Reliance', HDFCBANK: 'HDFC Bank', ICICIBANK: 'ICICI Bank', INFY: 'Infosys', TCS: 'TCS', BHARTIARTL: 'Bharti Airtel', ITC: 'ITC', LT: 'L&T', SBIN: 'SBI', AXISBANK: 'Axis Bank', KOTAKBANK: 'Kotak Bank', HINDUNILVR: 'HUL', BAJFINANCE: 'Bajaj Finance', MARUTI: 'Maruti Suzuki', 'M&M': 'Mahindra', SUNPHARMA: 'Sun Pharma', TITAN: 'Titan', ULTRACEMCO: 'UltraTech', NTPC: 'NTPC', POWERGRID: 'Power Grid', TATASTEEL: 'Tata Steel', ADANIENT: 'Adani Ent', ADANIPORTS: 'Adani Ports', ASIANPAINT: 'Asian Paints', HCLTECH: 'HCL Tech', WIPRO: 'Wipro', TECHM: 'Tech Mahindra', NESTLEIND: 'Nestle', ONGC: 'ONGC', COALINDIA: 'Coal India', JSWSTEEL: 'JSW Steel', GRASIM: 'Grasim', CIPLA: 'Cipla', DRREDDY: "Dr Reddy's", EICHERMOT: 'Eicher', HEROMOTOCO: 'Hero Moto', 'BAJAJ-AUTO': 'Bajaj Auto', BRITANNIA: 'Britannia', APOLLOHOSP: 'Apollo Hosp', INDUSINDBK: 'IndusInd', SHRIRAMFIN: 'Shriram Fin', TRENT: 'Trent', BEL: 'BEL', HDFCLIFE: 'HDFC Life', SBILIFE: 'SBI Life', TATACONSUM: 'Tata Consumer', BAJAJFINSV: 'Bajaj Finserv', ETERNAL: 'Eternal (Zomato)', JIOFIN: 'Jio Financial', TMPV: 'Tata Motors' };

async function markets(prev) {
  const want = {
    nifty: ['^NSEI', 'Nifty 50'], sensex: ['^BSESN', 'Sensex'], bank: ['^NSEBANK', 'Bank Nifty'], it: ['^CNXIT', 'Nifty IT'],
    usdinr: ['INR=X', 'USD / INR'], brent: ['BZ=F', 'Brent crude'], goldusd: ['GC=F', 'Gold (USD/oz)'], silverusd: ['SI=F', 'Silver (USD/oz)'],
    dow: ['^DJI', 'Dow Jones'], nasdaq: ['^IXIC', 'Nasdaq'], btc: ['BTC-USD', 'Bitcoin']
  };
  const out = { updated: NOW, quotes: {}, movers: { gainers: [], losers: [] }, nifty: {} };
  await Promise.all(Object.entries(want).map(async ([k, [sym, name]]) => { const q = await yahoo(sym); if (q) out.quotes[k] = { name, ...q }; }));
  const [m1, y1] = await Promise.all([yahoo('^NSEI', '1mo', '1d'), yahoo('^NSEI', '1y', '1wk')]);
  out.nifty = { '1D': out.quotes.nifty?.spark || [], '1M': m1?.spark || [], '1Y': y1?.spark || [], '1Mpct': m1?.pct, '1Ypct': y1?.pct };
  // Indicative Indian gold and silver rates from international price, rupee, and duty + GST.
  const u = out.quotes.usdinr?.price, gu = out.quotes.goldusd, su = out.quotes.silverusd;
  const DUTY = Number(process.env.GOLD_DUTY || 0.06), GST = 0.03, OZ = 31.1035;
  if (u && gu) { const p = (gu.price / OZ) * 10 * u * (1 + DUTY) * (1 + GST); const pp = (gu.prev / OZ) * 10 * (out.quotes.usdinr.prev || u) * (1 + DUTY) * (1 + GST); out.quotes.gold = { name: 'Gold 24K · 10g', price: Math.round(p), prev: Math.round(pp), change: p - pp, pct: ((p - pp) / pp) * 100, spark: gu.spark.map((v) => Math.round((v / OZ) * 10 * u * (1 + DUTY) * (1 + GST))), indicative: true }; out.quotes.gold22 = { name: 'Gold 22K · 10g', price: Math.round(p * 0.916), indicative: true }; }
  if (u && su) { const p = (su.price / OZ) * 1000 * u * (1 + DUTY) * (1 + GST); const pp = (su.prev / OZ) * 1000 * (out.quotes.usdinr.prev || u) * (1 + DUTY) * (1 + GST); out.quotes.silver = { name: 'Silver · 1kg', price: Math.round(p), prev: Math.round(pp), change: p - pp, pct: ((p - pp) / pp) * 100, spark: su.spark.map((v) => Math.round((v / OZ) * 1000 * u * (1 + DUTY) * (1 + GST))), indicative: true }; }
  const res = [];
  for (let i = 0; i < MOVERS.length; i += 10) {
    const part = await Promise.all(MOVERS.slice(i, i + 10).map(async (s) => { const q = await yahoo(s + '.NS', '1d', '15m'); return q ? { sym: s, name: NAMES[s] || s, price: q.price, pct: q.pct } : null; }));
    res.push(...part.filter(Boolean));
  }
  res.sort((a, b) => b.pct - a.pct);
  out.movers.gainers = res.slice(0, 5); out.movers.losers = res.slice(-5).reverse();
  out.breadth = { up: res.filter((r) => r.pct > 0).length, down: res.filter((r) => r.pct < 0).length };
  if (!out.quotes.nifty && prev?.quotes) return { ...prev, stale: true };
  return out;
}

// ---------- viral videos ----------
async function videos() {
  if (!YT_KEY) return [];
  try {
    const j = JSON.parse(await fetchText(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=IN&maxResults=30&key=${YT_KEY}`));
    return (j.items || []).map((v) => ({ id: v.id, title: v.snippet.title, channel: v.snippet.channelTitle, thumb: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url, views: Number(v.statistics?.viewCount || 0), time: Date.parse(v.snippet.publishedAt), cat: v.snippet.categoryId }));
  } catch (e) { log('youtube', e.message); return []; }
}

// ---------- alerts (ntfy) ----------
async function ntfy(title, body, click, tags = 'newspaper', priority = 3) {
  if (!NTFY_TOPIC) return;
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, { method: 'POST', body, headers: { Title: title, Click: click, Tags: tags, Priority: String(priority) } });
  } catch (e) { log('ntfy', e.message); }
}

// ---------- main ----------
async function main() {
  const prevNews = await readJson('news.json', null);
  const prevMarkets = await readJson('markets.json', null);
  const cache = await readJson('summaries.json', {}, CACHE);
  const state = await readJson('state.json', { alerted: [], briefDate: '' }, CACHE);

  const sectionItems = await Promise.all(SECTIONS.map(async (sec) => {
    const lists = await Promise.all(sec.feeds.map(async (u) => (await loadFeed(u)).map((i) => ({ ...i, origin: sec.id, google: u.includes('news.google.com') }))));
    const maxAge = sec.id === 'knowledge' ? 168 : (sec.id === 'movies' || sec.id === 'spiritual' || sec.id === 'phones') ? 96 : 48;
    return lists.flat().filter((i) => NOW - i.time < maxAge * 3.6e6 && !JUNK.test(i.title) && (!sec.exclude || !sec.exclude.test(i.title)));
  }));
  const checkItems = (await Promise.all(FACTCHECK_FEEDS.map(loadFeed))).flat().filter((i) => NOW - i.time < 7 * 864e5);
  learnDF([...sectionItems.flat(), ...checkItems].map((i) => i.title));

  // one pool for all feeds: the same event from any feed becomes one story, then each story gets the one section it fits best
  const clusters = clusterItems(sectionItems.flat());
  const bySection = Object.fromEntries(SECTIONS.map((x) => [x.id, []]));
  for (const c of clusters) {
    const sec = chooseSection(c);
    const st = buildStory(c, sec); st.alt = c.items.map((i) => i.title).filter((t) => t !== st.title).slice(0, 3);
    bySection[sec.id].push(st);
  }
  let all = [];
  const sections = [];
  for (const sec of SECTIONS) {
    const top = bySection[sec.id].sort((a, b) => b.score - a.score).slice(0, 40);
    sections.push({ id: sec.id, name: sec.name, short: sec.short, color: sec.color, tint: sec.tint, icon: sec.icon, count: top.length });
    all.push(...top);
  }

  const checks = clusterItems(checkItems).map((c) => c.items[0]).slice(0, 25).map((c) => ({ title: c.title, publisher: c.publisher, link: c.link, time: c.time }));
  // fact-checks from Google News: turn redirect links into the real BOOM / Alt News / PIB article links
  await pool(checks.slice(0, 15).filter((c) => c.link.includes('news.google.com')), 5, async (c) => { const u = await decodeGoogle(c.link); if (u) c.link = u; });
  attachFactChecks(all, checks.map((c) => ({ ...c })));

  // Must know: best stories overall, at most 3 per section, multi-source preferred
  const mustKnow = [];
  const perSec = {};
  for (const s of [...all].sort((a, b) => (b.score * (b.n > 1 ? 1.3 : 1)) - (a.score * (a.n > 1 ? 1.3 : 1)))) {
    if (mustKnow.length >= 10) break;
    if ((perSec[s.section] || 0) >= 2) continue;
    if (mustKnow.some((id) => similar(tokens(all.find((x) => x.id === id).title), tokens(s.title)) >= 0.2)) continue;
    perSec[s.section] = (perSec[s.section] || 0) + 1;
    mustKnow.push(s.id);
  }
  // Quick 60: must-know first, then top 3-4 per section
  const q = new Set(mustKnow);
  const bySec = SECTIONS.map((sec) => all.filter((x) => x.section === sec.id));
  for (let r = 0; r < 8; r++) for (const [k, list] of bySec.entries()) { const take = SECTIONS[k].id === 'mumbai' ? 2 : 1; for (const s of list.slice(r * take, r * take + take)) q.add(s.id); }
  const quick60 = [...q].slice(0, 90);

  const topPerSec = new Set(SECTIONS.flatMap((sec) => all.filter((x) => x.section === sec.id).slice(0, 12).map((x) => x.id)));
  const toSummarise = all.filter((s) => q.has(s.id) || topPerSec.has(s.id) || s.n >= 3).slice(0, 220);
  await enrich(toSummarise, cache);
  { const bad = new Set(toSummarise.filter((x) => cache[x.id]?.bad || COMMENTS.test(x.link)).map((x) => x.id)); if (bad.size) { all = all.filter((x) => !bad.has(x.id)); log('dropped comment-page stories', bad.size); } }
  await summarise(toSummarise, cache);
  for (const s of all) { if (!s.summary) s.summary = s.desc ? extractive('', s.desc) : ''; delete s.desc; delete s.alt; delete s.body; delete s.links; delete s.glinks; }

  const [mk, vids] = await Promise.all([markets(prevMarkets), videos()]);

  const news = { updated: NOW, sections, mustKnow, quick60, stories: all, factChecks: checks.slice(0, 15), videos: vids, stats: { feeds: feedStats.length, ok: feedStats.filter((f) => f.ok).length, items: sectionItems.flat().length } };

  // Safety: never replace good data with an empty run
  if (all.length < 20 && prevNews?.stories?.length) { log('Too few stories this run, keeping previous news'); }
  else await writeJson('news.json', news);
  await writeJson('markets.json', mk);
  await writeJson('summaries.json', cache, CACHE);

  // Alerts
  const ist = new Date(NOW + 5.5 * 3.6e6);
  const today = ist.toISOString().slice(0, 10);
  const site = process.env.SITE_URL || '';
  if (ist.getUTCHours() >= 6 && ist.getUTCHours() <= 8 && state.briefDate !== today && all.length >= 20) {
    const byId = Object.fromEntries(all.map((s) => [s.id, s]));
    const lines = mustKnow.slice(0, 5).map((id, i) => `${i + 1}. ${byId[id].headline || byId[id].title}`).join('\n');
    const n = mk?.quotes?.nifty; const gld = mk?.quotes?.gold;
    const mline = [n && `Nifty ${Math.round(n.price).toLocaleString('en-IN')} (${n.pct >= 0 ? '+' : ''}${n.pct.toFixed(2)}%)`, gld && `Gold ₹${gld.price.toLocaleString('en-IN')}`].filter(Boolean).join(' · ');
    await ntfy('Your Drishti morning brief', `${lines}${mline ? '\n\n' + mline : ''}`, site, 'sunrise', 4);
    state.briefDate = today;
  }
  for (const s of all) {
    if (s.breaking && s.n >= 4 && !state.alerted.includes(s.id) && (NOW - s.first) < 3 * 3.6e6) {
      await ntfy('Breaking · ' + s.sources.slice(0, 3).map((x) => x.name).join(', '), s.headline || s.title, site ? `${site}#story/${s.id}` : s.link, 'rotating_light', 5);
      state.alerted.push(s.id);
    }
  }
  state.alerted = state.alerted.slice(-200);
  await writeJson('state.json', state, CACHE);

  log(`feeds ok ${news.stats.ok}/${news.stats.feeds}, items ${news.stats.items}, stories ${all.length}, checks ${checks.length}, quotes ${Object.keys(mk?.quotes || {}).length}, videos ${vids.length}`);
  for (const f of feedStats) if (!f.ok || f.n === 0) log('  feed issue:', f.ok ? '0 items' : f.err, f.url.slice(0, 110));
  for (const sec of sections) log(`  ${sec.id}: ${sec.count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
