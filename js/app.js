import { THOUGHTS, TIPS, GUIDE, LEARN } from './content.js';
import { CALCS, inr, dur, monthsToGoal, sipForGoal, fvSip } from './grow.js';
import { PLACES, COST, COST_HINT } from './todo.js';
import { PAPERS, today, loadPapers, removePaper, pageUrl, getPaper, markPaperRead, addPaper, resumePaper, isBusy, ensureBody, explainStory } from './paper.js';

// ---------- small helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem('drishti.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('drishti.' + k, JSON.stringify(v)); } catch {} }
};
const dayIndex = () => Math.floor((Date.now() + 5.5 * 3.6e6) / 864e5);
const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 6e4)); if (m < 60) return m + ' min'; const h = Math.round(m / 60); if (h < 24) return h + ' hr'; return Math.round(h / 24) + ' d'; };
const num = (v, d = 2) => v == null ? '–' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (v) => v == null || isNaN(v) ? '' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + '%';
const toast = (m) => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); };

// ---------- icons ----------
const P = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  bolt: '<path d="M13 3L4 14h7l-1 7 9-11h-7z"/>',
  chart: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  back: '<path d="M15 6l-6 6 6 6"/>', chev: '<path d="M9 6l6 6-6 6"/>', up: '<path d="M6 15l6-6 6 6"/>',
  ext: '<path d="M7 17L17 7M9 7h8v8"/>', bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>',
  psun: '<path d="M8 4.5V3M3.5 8H2M4.8 4.8l-1-1M12.3 4.8l1-1"/><path d="M5 9.5A3.5 3.5 0 0 1 11.5 7"/><path d="M9 20h8.5a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 8.5 12 3.8 3.8 0 0 0 9 20z"/>',
  rain: '<path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 6.5 4.3 4.3 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  storm: '<path d="M7 14h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 5.5 4.3 4.3 0 0 0 7 14z"/><path d="M12 14l-2 4h4l-2 4"/>',
  fog: '<path d="M4 9h16M3 13h18M5 17h14"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
  pin: '<path d="M12 21s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  send: '<path d="M4 12l16-8-6 16-3-6z"/><path d="M11 14l9-10"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  city: '<path d="M4 20V10l4-3v13M10 20V6l5-3v17M17 20v-9l3-2v11M2 20h20"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3"/>',
  gem: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3l3 18 3-18"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  film: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M7 6l2-3M13 6l2-3"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  lotus: '<path d="M12 21c-4-2-7-5-7-9 3 0 5 1 7 4 2-3 4-4 7-4 0 4-3 7-7 9z"/><path d="M12 16c-1.5-2.5-1.5-6 0-9 1.5 3 1.5 6.5 0 9z"/>',
  repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', coin: '<circle cx="12" cy="12" r="9"/><path d="M9 8h6M9 11h6M13 8c2 0 2 6-1 6H9l5 4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  bank: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  flame: '<path d="M12 21a7 7 0 0 0 7-7c0-5-7-11-7-11s-7 6-7 11a7 7 0 0 0 7 7z"/><path d="M12 21a3 3 0 0 1-3-3c0-2 3-5 3-5s3 3 3 5a3 3 0 0 1-3 3z"/>',
  percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5"/><path d="M20 3v5.5h-5.5"/>',
  book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  ticket: '<path d="M4 7a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4z"/><path d="M10 5v14" stroke-dasharray="2 2"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/>',
  sunrise: '<path d="M12 3v5M5 11l1.5 1.5M19 11l-1.5 1.5M3 18h18M7 18a5 5 0 0 1 10 0M9 6l3-3 3 3"/>'
};
const ic = (n, s = 20, w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
const logo = (s = 34) => `<svg width="${s}" height="${s}" viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" rx="30" fill="var(--card)" stroke="var(--line2)"/><path d="M60 26Q76 52 60 86Q44 52 60 26Z" fill="#FF7A1A"/><path d="M60 86Q30 80 22 52Q48 54 60 86Z" fill="none" stroke="var(--text)" stroke-width="5" stroke-linejoin="round"/><path d="M60 86Q90 80 98 52Q72 54 60 86Z" fill="none" stroke="var(--text)" stroke-width="5" stroke-linejoin="round"/><circle cx="60" cy="58" r="6" fill="var(--card)"/></svg>`;

// ---------- state ----------
const DEFAULT_SECTIONS = ['mumbai', 'events', 'india', 'world', 'markets', 'money', 'gold', 'knowledge', 'health', 'sports', 'gadgets', 'phones', 'bollywood', 'movies', 'viral', 'spiritual'];
const S = {
  news: null, markets: null, byId: {}, weather: null, loc: null,
  settings: Object.assign({ name: 'Mehul', theme: 'paper', v: 2, sections: DEFAULT_SECTIONS, key: '', model: 'gemini-2.5-flash' }, LS.get('settings', {})),
  read: new Set(LS.get('read', [])), saved: LS.get('saved', []), guide: LS.get('guide', []),
  chat: [], range: '1D', moneyTab: 'markets', lastRoute: '#home', installEvt: null
};
const saveSettings = () => LS.set('settings', S.settings);
if ((S.settings.v || 1) < 3 && !S.settings.sections.includes('events')) { S.settings.sections.splice(1, 0, 'events'); S.settings.v = 3; LS.set('settings', S.settings); }
if ((S.settings.v || 1) < 2) { for (const id of ['knowledge', 'sports']) if (!S.settings.sections.includes(id)) S.settings.sections.push(id); S.settings.sections = DEFAULT_SECTIONS.filter((x) => S.settings.sections.includes(x)); S.settings.v = 2; LS.set('settings', S.settings); }
if ((S.settings.v || 1) < 4) { S.settings.theme = 'paper'; S.settings.v = 4; LS.set('settings', S.settings); }
S.history = LS.get('history', []);
const markRead = (id) => {
  if (S.read.has(id)) return;
  S.read.add(id); LS.set('read', [...S.read].slice(-1500));
  const s = S.byId[id];
  if (s) { S.history = [{ id, title: s.headline || s.title, section: s.section, source: s.sources[0]?.name || '', link: s.link, image: s.image, at: Date.now() }, ...S.history.filter((h) => h.id !== id)].slice(0, 300); LS.set('history', S.history); }
};
const unread = (list) => list.filter((s) => !S.read.has(s.id));
// ---------- simple language (rewritten on this phone with the user's own Gemini key) ----------
S.simple = LS.get('simple', {});
for (const k of Object.keys(S.simple)) if (Date.now() - (S.simple[k].at || 0) > 4 * 864e5) delete S.simple[k];
const LANG = () => S.settings.lang || 'en';
const simpleOn = () => S.settings.simple !== false && !!S.settings.key;
const simp = (s) => (simpleOn() ? S.simple[s.id + ':' + LANG()] : null);
const H = (s) => simp(s)?.h || (LANG() === 'en' && s.bh) || s.headline || s.title;
const T = (s) => simp(s)?.t || (LANG() === 'en' && s.bs) || s.summary || '';
// the day's brief: chosen by the AI editor on the server, or on this phone with the user's key
S.brief = LS.get('brief', null);
function briefIds() {
  const n = S.news; if (!n) return [];
  if (n.brief?.length) return n.brief.filter((id) => S.byId[id]);
  if (S.brief?.u === n.updated && S.brief.lang === LANG()) return S.brief.ids.filter((id) => S.byId[id]);
  return [];
}
const DARK_THEMES = ['dark', 'midnight'];
function applyTheme() { const d = document.documentElement; d.dataset.theme = S.settings.theme; d.dataset.mode = DARK_THEMES.includes(S.settings.theme) ? 'dark' : 'light'; d.dataset.accent = S.settings.accent || 'saffron'; const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getComputedStyle(d).getPropertyValue('--bg').trim() || '#0D0E12'; }
applyTheme();

const HUES = { events: 290, mumbai: 172, india: 30, world: 214, markets: 256, money: 282, gold: 44, knowledge: 226, health: 145, sports: 98, gadgets: 192, phones: 202, bollywood: 330, movies: 300, viral: 356, spiritual: 18 };
const ICONS = { sports: 'trophy', knowledge: 'bulb', events: 'ticket' };
function secColors(id) {
  const h = HUES[id] ?? 220; const light = document.documentElement.dataset.mode === 'light';
  return light ? { color: `hsl(${h} 78% 93%)`, tint: `hsl(${h} 62% 30%)`, solid: `hsl(${h} 62% 44%)` } : { color: `hsl(${h} 34% 17%)`, tint: `hsl(${h} 72% 76%)`, solid: `hsl(${h} 60% 55%)` };
}
const secMeta = (id) => { const base = (S.news?.sections || []).find((s) => s.id === id) || { id, name: id, short: id, icon: ICONS[id] || 'globe' }; return { ...base, icon: ICONS[id] || base.icon, ...secColors(id) }; };
const inSection = (s, id) => s.section === id; // each story lives in one section only
const secStories = (id) => (S.news?.stories || []).filter((s) => inSection(s, id)).sort((a, b) => b.score - a.score);

// ---------- data ----------
const cleanSum = (t) => (t || '').replace(/<\/?[a-z][^>]*>?/gi, ' ').replace(/^[\w-]*"\s*\/>\s*/, '').replace(/\b(share via|copy ?link|whatsapp-stroke|copylink|google info)\b/gi, ' ').replace(/\bAdd [A-Z][\w ]{1,30}? on Google\b/g, ' ').replace(/\bBy [A-Z][\w. ]{2,40}? Published On \d{1,2} \w{3} \d{4}( \d{1,2} \w{3} \d{4})?/g, ' ').replace(/\s{2,}/g, ' ').trim();
async function loadData(force) {
  const bust = force ? '?t=' + Date.now() : '?t=' + Math.floor(Date.now() / 3e5);
  try {
    const [n, m] = await Promise.all([fetch('data/news.json' + bust).then((r) => r.ok ? r.json() : null), fetch('data/markets.json' + bust).then((r) => r.ok ? r.json() : null).catch(() => null)]);
    if (n) {
      for (const s of n.stories) { const sm = s.summary || ''; const bar = sm.indexOf(' | '); if (bar > 15 && bar < 220 && s.title.toLowerCase().includes(sm.slice(0, Math.min(bar, 30)).toLowerCase())) s.summary = sm.slice(bar + 3); const cap = /^(.{10,260}?) \| ([A-Z][\w.&-]*(?:[ ,]+[A-Z][\w.&-]*){0,2}) (?=[A-Z])/.exec(s.summary || ''); if (cap && s.summary.length - cap[0].length > 80) s.summary = s.summary.slice(cap[0].length); }
      for (const s of n.stories) { s.summary = cleanSum(s.summary); if (s.image) { const m = /\/(20\d\d)[\/-](\d\d)[\/-]/.exec(s.image); if (/default|placeholder|no[-_]?image|\/logo\/tech/i.test(s.image) || (m && s.time - Date.UTC(+m[1], +m[2] - 1, 28) > 45 * 864e5)) s.image = null; } } // stock or old file photos are dropped
      S.news = n; S.byId = Object.fromEntries(n.stories.map((s) => [s.id, s]));
    }
    if (m) S.markets = m;
  } catch (e) { console.warn(e); }
}

// ---------- weather ----------
const WMO = (c, day = 1) => {
  if (c === 0) return [day ? 'Clear' : 'Clear night', day ? 'sun' : 'moon'];
  if (c <= 2) return ['Partly cloudy', 'psun']; if (c === 3) return ['Cloudy', 'cloud'];
  if (c <= 48) return ['Hazy', 'fog']; if (c <= 57) return ['Drizzle', 'rain']; if (c <= 67) return ['Rain', 'rain'];
  if (c <= 77) return ['Snow', 'cloud']; if (c <= 82) return ['Showers', 'rain']; return ['Thunderstorm', 'storm'];
};
const aqiLabel = (a) => a == null ? '' : a <= 50 ? 'Good' : a <= 100 ? 'Satisfactory' : a <= 200 ? 'Moderate' : a <= 300 ? 'Poor' : a <= 400 ? 'Very poor' : 'Severe';
const aqiColor = (a) => a == null ? 'var(--muted)' : a <= 100 ? 'var(--ok)' : a <= 200 ? 'var(--warn)' : 'var(--bad)';
// India's National AQI (CPCB): highest sub-index of 24-hour average PM2.5 and PM10
function subIndex(c, bp) { for (const [lo, hi, ilo, ihi] of bp) if (c <= hi) return ilo + ((ihi - ilo) * (c - lo)) / (hi - lo); return 500; }
const BP25 = [[0, 30, 0, 50], [30, 60, 50, 100], [60, 90, 100, 200], [90, 120, 200, 300], [120, 250, 300, 400], [250, 380, 400, 500]];
const BP10 = [[0, 50, 0, 50], [50, 100, 50, 100], [100, 250, 100, 200], [250, 350, 200, 300], [350, 430, 300, 400], [430, 510, 400, 500]];
function indianAqi(a) {
  const h = a?.hourly; if (!h) return null;
  const now = Date.now(); const idx = h.time.map((t, i) => [new Date(t).getTime(), i]).filter(([t]) => t <= now && t > now - 864e5).map(([, i]) => i);
  const avg = (arr) => { const v = idx.map((i) => arr[i]).filter((x) => x != null); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
  const p25 = avg(h.pm2_5), p10 = avg(h.pm10);
  if (p25 == null && p10 == null) return null;
  return { aqi: Math.round(Math.max(p25 != null ? subIndex(p25, BP25) : 0, p10 != null ? subIndex(p10, BP10) : 0)), pm25: p25, pm10: p10, main: (p25 != null ? subIndex(p25, BP25) : 0) >= (p10 != null ? subIndex(p10, BP10) : 0) ? 'PM2.5' : 'PM10' };
}
function getPosition() {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }), () => res(null), { timeout: 8000, maximumAge: 15 * 6e4 });
  });
}
async function loadWeather(force) {
  const cached = LS.get('weather', null);
  if (!force && cached && cached.v === 2 && Date.now() - cached.t < 20 * 6e4) { S.weather = cached; return; }
  let loc = await getPosition();
  const last = LS.get('loc', null);
  if (!loc) loc = last || { lat: 19.1869, lon: 72.8484, name: 'Malad West', fallback: true };
  if (!loc.name || !last || Math.abs(last.lat - loc.lat) > 0.01 || Math.abs(last.lon - loc.lon) > 0.01) {
    try {
      const g = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.lat}&longitude=${loc.lon}&localityLanguage=en`).then((r) => r.json());
      loc.name = g.locality || g.city || g.principalSubdivision || 'Your location';
      loc.city = g.city || '';
    } catch { loc.name = loc.name || 'Your location'; }
  } else { loc.name = last.name; loc.city = last.city; }
  LS.set('loc', loc);
  try {
    const [w, a] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=7`).then((r) => r.json()),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&hourly=pm2_5,pm10&past_days=1&forecast_days=1&timezone=auto`).then((r) => r.json()).catch(() => null)
    ]);
    const ia = indianAqi(a); S.weather = { t: Date.now(), loc, w, aqi: ia?.aqi ?? null, pm25: ia?.pm25 ?? null, pm10: ia?.pm10 ?? null, aqiMain: ia?.main || '', v: 2 };
    LS.set('weather', S.weather);
  } catch (e) { S.weather = cached; }
}

// ---------- shared bits ----------
const AV_COLORS = ['#FF8A3D', '#E8E6E1', '#E05252', '#C9A227', '#5BA4F5', '#7BD88F', '#C7BAFF', '#FF9CC6', '#7FE3E0'];
const initials = (n) => n.replace(/^The /, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const avColor = (n) => AV_COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];
const avatars = (srcs, max = 4) => `<div class="row" style="gap:0">${srcs.slice(0, max).map((s) => `<span class="av" style="background:${avColor(s.name)}">${esc(initials(s.name))}</span>`).join('')}</div>`;
const verify = (s) => s.factCheck ? `<span class="badge b-bad">${ic('alert', 12, 2.2)}Related fact-check</span>` : s.n >= 2 ? `<span class="badge b-ok">${ic('shield', 12, 2.2)}Confirmed by ${s.n} sources</span>` : `<span class="badge b-one">Single source</span>`;
function art(sec, size = 84, big = false) {
  const m = secMeta(sec);
  return `<div class="art" style="background:${m.color}"><svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><circle cx="72" cy="30" r="${big ? 22 : 26}" fill="${m.tint}" fill-opacity=".16"/><circle cx="20" cy="88" r="30" fill="${m.tint}" fill-opacity=".08"/></svg><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:${m.tint}">${ic(m.icon, big ? 54 : Math.round(size / 3), 1.5)}</span></div>`;
}
const img = (s, sz, big) => s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{innerHTML:window.__art('${s.section}',${sz},${big ? 1 : 0})}).firstChild)">` : art(s.section, sz, big);
window.__art = (sec, sz, big) => art(sec, sz, !!big);
const storyRow = (s) => { const m = secMeta(s.section); return `<a class="story" href="#story/${s.id}"><div class="thumb">${img(s, 84)}</div><div class="col gap4 grow"><span class="tag" style="color:${m.tint}">${esc(m.short)} · ${esc(s.sources[0]?.name || '')}</span><span class="ttl clamp3" data-sh="${s.id}">${esc(H(s))}</span>${s.summary ? `<span class="small muted clamp2" data-ss="${s.id}">${esc(T(s))}</span>` : ''}<span class="meta">${ago(s.time)}${s.n > 1 ? ` · <span style="color:var(--ok)">${ic('shield', 12, 2.2)} ${s.n} sources</span>` : ''}${s.factCheck ? ` · <span style="color:var(--bad)">fact-check</span>` : ''}${s.local ? ' · <span style="color:var(--accent-text)">Near you</span>' : ''}</span></div></a>`; };
const navHtml = (on) => `<nav class="nav" aria-label="Main"><div class="in">${[['edition', 'sunrise', 'Today'], ['paper', 'book', 'Paper'], ['sections', 'grid', 'Sections'], ['markets', 'chart', 'Markets'], ['ask', 'sparkle', 'Ask']].map(([r, i, l]) => `<a href="#${r}" class="${on === r ? 'on' : ''}">${ic(i, 22)}${l}</a>`).join('')}</div></nav>`;
const backBar = (label = 'Back') => `<div class="top" style="padding-top:8px"><button class="back" data-act="back">${ic('back', 20, 2)}${label}</button></div>`;
function spark(vals, w = 300, h = 90, color = 'var(--up)', fill = true) {
  if (!vals || vals.length < 2) return '';
  const mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - 6 - ((v - mn) / rg) * (h - 12)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${fill ? `<path d="${d}L${w} ${h}L0 ${h}Z" fill="${color}" fill-opacity=".12"/>` : ''}<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}
function marketStatus() {
  const d = new Date(Date.now() + 5.5 * 3.6e6); const day = d.getUTCDay(); const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (day >= 1 && day <= 5 && mins >= 555 && mins < 930) return ['Market open', true];
  if (day >= 1 && day <= 5 && mins < 555) return ['Opens today 9:15 am', false];
  return [day === 5 || day === 6 || day === 0 ? 'Closed · opens Mon 9:15 am' : 'Closed · opens 9:15 am', false];
}

// ---------- views ----------
function viewHome() {
  const n = S.news; const w = S.weather; const q = S.markets?.quotes || {};
  const hr = new Date().getHours(); const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  // one compact line for weather and air
  let wx = `<span class="chip skel" style="width:170px;height:34px"></span>`;
  if (w?.w?.current) {
    const c = w.w.current, d = w.w.daily; const [lab, icn] = WMO(c.weather_code, c.is_day); const rain = d.precipitation_probability_max[0] ?? 0;
    wx = `<button class="chip wxchip" data-act="weather">${ic(icn, 16, 2)}<b>${Math.round(c.temperature_2m)}°</b>${esc(w.loc.name)}</button>${w.aqi != null ? `<button class="chip wxchip" data-act="weather" style="color:${aqiColor(w.aqi)}">AQI ${w.aqi} · ${aqiLabel(w.aqi)}</button>` : ''}${rain >= 30 ? `<button class="chip wxchip" data-act="weather" style="color:#3B82C4">${ic('rain', 14, 2)}${rain}%</button>` : ''}`;
  }
  const mk = [['nifty', 'Nifty'], ['sensex', 'Sensex'], ['gold', 'Gold 10g']].filter(([k]) => q[k]).map(([k, l]) => { const x = q[k]; return `<a class="mini" href="#money"><span class="xs muted">${l}</span><b>${k === 'gold' ? '₹' + Math.round(x.price).toLocaleString('en-IN') : num(x.price, 0)}</b><span class="xs ${x.pct >= 0 ? 'up' : 'down'}">${pct(x.pct)}</span></a>`; }).join('');
  const top = `${header()}<div class="col gap4 mt8"><span class="eyebrow">${date}</span><h1 class="h1">${greet}${S.settings.name ? ', ' + esc(S.settings.name) : ''}</h1></div><div class="row gap8 mt12" style="flex-wrap:wrap">${wx}</div>${mk ? `<div class="minis mt12">${mk}</div>` : ''}`;
  if (!n) return `${top}<div class="empty mt24">Fetching today’s news…</div>`;
  // top 5: must-know first, then the freshest well-confirmed stories; unread only
  const pool5 = [...briefIds().map((id) => S.byId[id]), ...n.mustKnow.map((id) => S.byId[id]).filter(Boolean), ...n.stories.filter((s) => s.n >= 2).sort((a, b) => b.score - a.score)];
  const top5 = []; for (const s of pool5) { if (top5.length >= 5) break; if (!S.read.has(s.id) && !top5.includes(s)) top5.push(s); }
  const q60 = unread((briefIds().length ? briefIds() : n.quick60).map((id) => S.byId[id]).filter(Boolean)).length;
  const upd = new Date(n.updated).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const topics = DEFAULT_SECTIONS.map((id) => { const m = secMeta(id); const c = unread(secStories(id)).length; return `<a class="topic" href="${id === 'events' ? '#todo' : '#section/' + id}" style="background:${m.color};color:${m.tint}">${ic(m.icon, 18, 2)}<span>${esc(m.short)}</span>${c ? `<em>${c}</em>` : ''}</a>`; }).join('');
  const th = THOUGHTS[dayIndex() % THOUGHTS.length];
  return `${top}
  <a class="q60" href="#quick"><span class="ic">${ic('bolt', 22, 2)}</span><span class="col grow" style="gap:1px"><b>${q60 ? (briefIds().length ? 'Your brief is ready' : 'Start your Quick 60') : 'All caught up'}</b><span class="small" style="opacity:.85">${q60 ? `${q60} stories${briefIds().length ? ' picked for you' : ''} · about ${Math.max(2, Math.round(q60 * 0.25))} min` : 'New stories arrive every 30 minutes'}</span></span>${ic('chev', 22, 2)}</a>
  <div class="sec-head"><span class="h2">Top 5 right now</span><button class="xs muted row gap4" data-act="refresh" aria-label="Refresh news">${upd} ${ic('refresh', 14)}</button></div>
  ${top5.length ? `<div class="card" style="padding:2px 14px">${top5.map((s, i) => `<a class="mk" href="#read/${s.id}"><span class="num">${i + 1}</span><div class="col gap4 grow"><span class="ttl" data-sh="${s.id}">${esc(H(s))}</span><span class="meta"><span style="color:${secMeta(s.section).solid};font-weight:600">${esc(secMeta(s.section).short)}</span>· ${ago(s.time)}${s.n > 1 ? ` · <span style="color:var(--ok)">${s.n} sources</span>` : ''}${s.breaking && s.n >= 3 ? ' · <span class="badge b-live">Breaking</span>' : ''}</span></div></a>`).join('')}</div>` : `<div class="caught">${ic('check', 20, 2.4)}You’re all caught up</div>`}
  ${(() => { const p = todoPicks('all')[0]; if (!p) return ''; const m = secMeta('events'); return `<a class="card row gap12 mt16" href="#todo" style="background:${m.color};border-color:transparent"><span class="sdot" style="width:44px;height:44px;border-radius:14px;background:var(--card);color:${m.tint}">${ic('ticket', 22, 2)}</span><span class="col grow" style="gap:2px"><b style="color:${m.tint}">Today in Mumbai</b><span class="small" style="color:var(--text)">${esc(p.n)}${p.cost ? '' : ' · free'}</span><span class="xs muted">${todoInfo().label} · tap for more ideas and events</span></span>${ic('chev', 20, 2)}</a>`; })()}
  <div class="sec-head"><span class="h2">Browse by topic</span><a href="#explore">More</a></div>
  <div class="topics">${topics}</div>
  <div class="quote mt24"><span class="eyebrow" style="color:${secMeta('spiritual').solid}">${ic('lotus', 14)} Thought of the day</span><p>${esc(th[0])}</p><span class="small muted">— ${esc(th[1])}</span></div>
  <div class="updated">Updated ${upd} · refreshes every 30 minutes · <a href="#history" style="color:var(--accent-text)">Read history</a></div>`;
}
const header = () => `<div class="top"><div class="brand">${logo()}<b>Drishti</b></div><div class="row gap8"><button class="ibtn" data-act="refresh" aria-label="Refresh news" id="rfb">${ic('refresh')}</button><a class="ibtn" href="#search" aria-label="Search">${ic('search')}</a><a class="ibtn" href="#settings" aria-label="Settings">${ic('settings')}</a></div></div>`;

const FEED_TABS = [['all', 'My brief'], ['mumbai', 'Mumbai'], ['india', 'India'], ['world', 'World'], ['knowledge', 'Knowledge'], ['events', 'Things to do'], ['markets', 'Markets'], ['money', 'SIP and MF'], ['gold', 'Gold'], ['health', 'Health'], ['sports', 'Sports'], ['gadgets', 'Tech'], ['phones', 'Phones'], ['bollywood', 'Bollywood'], ['movies', 'Movies'], ['viral', 'Viral'], ['spiritual', 'Spiritual']];
const hasBody = (s) => (s.summary || '').length > 90;
function viewQuick(tab = 'all') {
  const n = S.news; if (!n) return `<div class="empty">Loading…</div>`;
  // read stories leave the feed (they live in Read history); the list is fixed when the feed opens
  const bIds = briefIds();
  let list = tab === 'all' ? (bIds.length ? bIds : n.quick60).map((id) => S.byId[id]).filter(Boolean) : secStories(tab);
  if (tab === 'all' && !bIds.length) { const more = n.stories.filter((s) => hasBody(s) && !n.quick60.includes(s.id)).sort((a, b) => b.score - a.score); list = list.concat(more); }
  list = unread(list);
  const full = list.filter(hasBody); if (full.length >= 3) list = full;
  list = list.slice(0, 80);
  const startAt = 0;
  const cards = list.map((s, i) => {
    const m = secMeta(s.section); const src = s.sources[0]?.name || '';
    return `<section class="qcard" data-id="${s.id}" data-i="${i}"><div class="qimg">${img(s, 200, true)}
      <span class="qsrc">${avatars(s.sources, 1)}<span>${esc(src)}</span>${s.n > 1 ? `<span class="xs" style="color:var(--ok)">+${s.n - 1}</span>` : ''}</span>
      <span class="qtools"><button data-act="save" data-id="${s.id}" aria-label="Save">${ic('bookmark', 20)}</button><button data-act="share" data-id="${s.id}" aria-label="Share">${ic('share', 20)}</button></span></div>
      <div class="qbody">
      <h2 data-sh="${s.id}">${esc(H(s))}</h2>
      <p data-ss="${s.id}">${esc(T(s) || 'Tap below to read the full report.')}</p>
      <div class="row gap8" style="flex-wrap:wrap"><span class="xs muted">${ago(s.time)} ago</span>${verify(s)}<span class="badge" style="background:${m.color};color:${m.tint}">${esc(m.short)}</span></div>
      ${s.factCheck ? `<a class="fc" href="#web/${encodeURIComponent(s.factCheck.link)}">${ic('alert', 18, 2)}<span>Related fact-check by ${esc(s.factCheck.source)}: ${esc(s.factCheck.title)}</span></a>` : ''}
      </div>
      <a class="qmore" href="#read/${s.id}"><span class="col"><b>Read full story</b><span class="xs">at ${esc(src)}${s.n > 1 ? ` · also ${esc(s.sources.slice(1, 3).map((x) => x.name).join(', '))}` : ''}</span></span>${ic('chev', 20, 2)}</a>
    </section>`;
  }).join('');
  const done = `<section class="qcard" style="align-items:center;justify-content:center;text-align:center;padding:24px"><span style="color:var(--ok)">${ic('check', 56, 2)}</span><h2 class="h1 mt16">All caught up</h2><p class="muted">You’ve seen everything new${tab === 'all' ? '' : ' in ' + esc(secMeta(tab).short)}. Fresh stories arrive every 30 minutes.</p><a class="btn btn-acc mt16" href="#home">Back to home</a><a class="btn btn-line mt8" href="#history">${ic('history', 18)} Read history</a></section>`;
  setTimeout(() => setupQuick(startAt, list.length, tab), 0);
  return `<div class="qbar"><div class="row gap8"><a class="ibtn" href="#home" aria-label="Back to home" style="width:40px;height:40px;flex-shrink:0">${ic('back', 20, 2)}</a><div class="qtabs" id="qt">${FEED_TABS.map(([id, l]) => `<a href="#quick/${id}" class="${tab === id ? 'on' : ''}">${l}</a>`).join('')}</div><span class="xs muted" id="qc" style="flex-shrink:0;min-width:38px;text-align:right">1/${list.length}</span></div><div class="qprog"><i id="qp" style="width:0"></i></div></div><div class="qwrap" id="qw">${list.length ? cards + done : done}</div>`;
}
function setupQuick(start, total, tab) {
  const w = $('#qw'); if (!w) return;
  $('#qt .on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  if (start > 0) w.scrollTop = start * w.clientHeight;
  const io = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (e.isIntersecting && e.intersectionRatio > 0.6) {
      const i = Number(e.target.dataset.i); const id = e.target.dataset.id;
      if (id) { simplifyVisible(); markRead(id); $('#qc').textContent = `${i + 1}/${total}`; $('#qp').style.width = ((i + 1) / total) * 100 + '%'; }
      else { $('#qp').style.width = '100%'; }
    }
  }), { root: w, threshold: [0.6] });
  w.querySelectorAll('.qcard').forEach((c) => io.observe(c));
}
const storyCard = (s) => { const m = secMeta(s.section); return `<article class="scard"><a href="#story/${s.id}" class="scimg">${img(s, 200, true)}<span class="qsrc" style="bottom:10px;left:10px">${avatars(s.sources, 1)}<span>${esc(s.sources[0]?.name || '')}</span></span></a><a href="#story/${s.id}" class="col gap6" style="padding:14px 16px 4px"><span class="sct" data-sh="${s.id}">${esc(H(s))}</span>${s.summary ? `<span class="scs" data-ss="${s.id}">${esc(T(s))}</span>` : ''}</a><div class="row gap8" style="padding:6px 16px 14px;flex-wrap:wrap">${s.price ? `<span class="badge" style="background:var(--accent-soft);color:var(--accent-text)">${ic('ticket', 12, 2)} ${esc(s.price)}</span>` : ''}<span class="xs muted">${ago(s.time)} ago</span>${verify(s)}${s.local ? '<span class="badge b-warn">Near you</span>' : ''}<a class="xs" style="margin-left:auto;color:var(--accent-text)" href="#read/${s.id}">Read full story ${ic('chev', 12, 2)}</a></div></article>`; };

function viewStory(id) {
  const s = S.byId[id]; if (!s) return `${backBar()}<div class="empty">This story is no longer in today’s feed.</div>`;
  markRead(id); const m = secMeta(s.section);
  const related = secStories(s.section).filter((x) => x.id !== id).slice(0, 4);
  return `${backBar()}
  <div class="dimg">${img(s, 220, true)}</div>
  <div class="row gap8 mt16" style="flex-wrap:wrap"><a class="badge" href="#section/${s.section}" style="background:${m.color};color:${m.tint}">${esc(m.short)}</a>${verify(s)}${s.breaking ? '<span class="badge b-live">Breaking</span>' : ''}<span class="xs muted">${ago(s.time)} ago</span></div>
  <h1 class="h1 mt12" style="font-size:27px;line-height:1.2">${esc(s.headline || s.title)}</h1>
  ${s.summary ? `<p style="font-size:16px;line-height:1.65;color:var(--text2)">${esc(s.summary)}</p>` : ''}
  ${s.ai ? `<p class="xs muted">${ic('sparkle', 12)} Summary written by AI from the outlets below. Tap a source for the full report.</p>` : ''}
  ${s.factCheck ? `<a class="fc mt12" href="#web/${encodeURIComponent(s.factCheck.link)}">${ic('alert', 18, 2)}<span><b>Fact-check:</b> ${esc(s.factCheck.title)} <span class="xs">(${esc(s.factCheck.source)})</span></span></a>` : ''}
  <div class="row gap8 mt16"><a class="btn btn-main" href="#read/${s.id}">Read full story ${ic('chev', 16, 2)}</a><button class="btn btn-ghost" data-act="save" data-id="${s.id}" aria-label="Save">${ic('bookmark', 20)}</button><button class="btn btn-ghost" data-act="share" data-id="${s.id}" aria-label="Share">${ic('share', 20)}</button></div>
  <a class="btn btn-line mt8" style="width:100%" href="#ask" data-act="askabout" data-id="${s.id}">${ic('sparkle', 18)} Ask Drishti about this</a>
  <div class="sec-head"><span class="h2">Reported by ${s.n} ${s.n === 1 ? 'outlet' : 'outlets'}</span></div>
  ${s.sources.map((x, i) => `<a class="srcrow" href="#read/${s.id}/${i}"><span class="row gap8"><span class="av" style="background:${avColor(x.name)};margin:0">${esc(initials(x.name))}</span><span style="font-weight:500">${esc(x.name)}</span></span>${ic('ext', 16)}</a>`).join('')}
  ${related.length ? `<div class="sec-head"><span class="h2">More in ${esc(m.short)}</span></div>${related.map(storyRow).join('')}` : ''}`;
}

function viewSection(id) {
  const m = secMeta(id); const allList = secStories(id); const list = unread(allList); const readN = allList.length - list.length;
  let top = '';
  if (id === 'spiritual') { const th = THOUGHTS[dayIndex() % THOUGHTS.length]; top = `<div class="quote mt12"><span class="eyebrow" style="color:#FFC48A">Thought of the day</span><p>${esc(th[0])}</p><span class="small muted">— ${esc(th[1])}</span></div>`; }
  if (id === 'health') { const tp = TIPS[dayIndex() % TIPS.length]; const tp2 = TIPS[(dayIndex() + 7) % TIPS.length]; top = `<div class="quote mt12"><span class="eyebrow" style="color:var(--ok)">Today’s self-care</span><p style="font-size:17px">${esc(tp[0])}</p><span class="small muted">${esc(tp[1])}</span><p style="font-size:17px;margin-top:14px">${esc(tp2[0])}</p><span class="small muted">${esc(tp2[1])}</span></div>`; }
  if (id === 'gold' || id === 'markets') top = `<a class="card row mt12" href="#money">${ic('chart', 20)}<span class="grow">Live rates and charts in Money</span>${ic('chev', 18)}</a>`;
  if (id === 'viral' && S.news?.videos?.length) top = `<a class="card row mt12" href="#videos">${ic('play', 20)}<span class="grow">Trending YouTube videos in India</span>${ic('chev', 18)}</a>`;
  return `${backBar('Explore')}<div class="row gap12 mt8"><span style="width:48px;height:48px;border-radius:14px;background:${m.color};color:${m.tint};display:flex;align-items:center;justify-content:center">${ic(m.icon, 24)}</span><div class="col"><h1 class="h1" style="font-size:26px">${esc(m.name)}</h1><span class="small muted">${list.length} new stories · updated ${S.news ? ago(S.news.updated) : ''} ago</span></div></div>${top}<a class="q60" href="#quick/${id}" style="margin-top:14px">${ic('bolt', 22, 2)}<span class="col grow"><b style="font-size:16px">Swipe through ${esc(m.short)}</b><span class="small" style="opacity:.8">One story per screen, 60 words each</span></span>${ic('chev', 20, 2)}</a><div class="col gap16 mt16">${list.length ? list.slice(0, 40).map((x) => (x.summary ? storyCard(x) : storyRow(x))).join('') : '<div class="caught">' + ic('check', 20, 2.4) + 'All caught up in ' + esc(m.short) + '</div>'}</div>${readN ? `<a class="card row mt16" href="#history">${ic('history', 20)}<span class="grow">${readN} stories you’ve read are in Read history</span>${ic('chev', 18)}</a>` : ''}`;
}

function viewExplore() {
  const n = S.news;
  const tile = (href, hue, icon, title, sub) => { const light = document.documentElement.dataset.mode === 'light'; const bg = light ? `hsl(${hue} 78% 93%)` : `hsl(${hue} 34% 17%)`; const ink = light ? `hsl(${hue} 62% 30%)` : `hsl(${hue} 72% 76%)`; return `<a class="stile" href="${href}" style="background:${bg}"><span class="ic" style="color:${ink}">${ic(icon, 20)}</span><span class="col" style="gap:2px"><b>${esc(title)}</b><span class="xs" style="color:${ink}">${esc(sub)}</span></span></a>`; };
  const tiles = DEFAULT_SECTIONS.map((id) => { const m = secMeta(id); const c = unread(secStories(id)).length; return `<a class="stile" href="${id === 'events' ? '#todo' : '#section/' + id}" style="background:${m.color}"><span class="ic" style="color:${m.tint}">${ic(m.icon, 20)}</span><span class="col" style="gap:2px"><b>${esc(m.name)}</b><span class="xs" style="color:${m.tint}">${c} new</span></span></a>`; }).join('');
  return `<div class="top"><h1 class="h1">Explore</h1><a class="ibtn" href="#settings" aria-label="Settings">${ic('settings')}</a></div>
  <a class="search mt8" href="#search">${ic('search', 18)}<span class="muted">Search all news</span></a>
  <div class="sec-head"><span class="h2">Topics</span><span class="xs muted">${n?.stats?.ok || 0} trusted sources</span></div>
  <div class="grid2">${tiles}</div>
  <div class="sec-head"><span class="h2">Your stuff</span></div>
  <div class="grid2">${tile('#history', 200, 'history', 'Read history', S.history.length + ' read')}${tile('#saved', 44, 'bookmark', 'Saved', S.saved.length + ' stories')}</div>
  <div class="sec-head"><span class="h2">Tools</span></div>
  <div class="grid2">${tile('#factchecks', 0, 'alert', 'Fake news busted', (n?.factChecks?.length || 0) + ' checks')}${tile('#grow', 270, 'target', 'Grow your money', 'Calculators and guides')}${n?.videos?.length ? tile('#videos', 356, 'play', 'Trending videos', 'YouTube India') : ''}${tile('#ask', 30, 'sparkle', 'Ask Drishti', 'AI answers')}</div>`;
}
function todoInfo() {
  const d = new Date(); const day = d.getDay(); const h = d.getHours(); const weekend = day === 0 || day === 6;
  const w = S.weather?.w; const rain = w ? Math.max(w.daily?.precipitation_probability_max?.[0] ?? 0, 0) >= 50 || [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(w.current?.weather_code) : false;
  const temp = w?.current ? Math.round(w.current.temperature_2m) : null;
  const slot = h < 11 ? 'morning' : h < 16 ? 'day' : 'evening';
  const label = [d.toLocaleDateString('en-IN', { weekday: 'long' }), temp != null ? temp + '°' : '', rain ? 'rain likely' : '', weekend ? 'weekend' : ''].filter(Boolean).join(' · ');
  return { weekend, rain, slot, hot: temp != null && temp >= 33, label };
}
function todoPicks(who) {
  const t = todoInfo(); const seed = dayIndex();
  return PLACES.map((p, i) => {
    let sc = 0;
    if (who === 'free') sc += p.cost === 0 ? 4 : -9; else if (who !== 'all') sc += p.who.includes(who) ? 4 : -9;
    if (p.when === t.slot || p.when === 'any') sc += 2; else if (t.slot === 'evening' && p.when === 'day') sc -= 2; else if (t.slot !== 'morning' && p.when === 'morning') sc -= 3;
    if (t.rain) sc += p.indoor ? 4 : -6;
    if (t.hot && !p.indoor && p.when === 'day') sc -= 2;
    if (p.weekend) sc += t.weekend ? 2 : -5;
    if (p.near) sc += 1.5;
    sc += ((i * 7 + seed) % 10) / 10; // gentle daily rotation
    return { ...p, sc };
  }).filter((p) => p.sc > 0).sort((a, b) => b.sc - a.sc);
}
const placeCard = (p) => `<div class="card col gap6"><div class="row gap8" style="align-items:flex-start"><span class="col grow" style="gap:2px"><b style="font-size:16px">${esc(p.n)}</b><span class="xs muted">${ic('pin', 12, 2)} ${esc(p.a)}${p.near ? ' · near you' : ''}</span></span><span class="badge" style="background:${p.cost ? 'var(--accent-soft)' : 'var(--ok-bg)'};color:${p.cost ? 'var(--accent-text)' : 'var(--ok)'}" title="${COST_HINT[p.cost]}">${COST[p.cost]}</span></div><span class="small" style="color:var(--text2);line-height:1.55">${esc(p.d)}</span><div class="row gap6" style="flex-wrap:wrap">${p.who.map((w) => `<span class="chip" style="padding:3px 9px;font-size:11px">${w === 'kids' ? 'Kids' : w[0].toUpperCase() + w.slice(1)}</span>`).join('')}${p.indoor ? '<span class="chip" style="padding:3px 9px;font-size:11px">Indoor</span>' : ''}<a class="xs" style="margin-left:auto;color:var(--accent-text)" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.n + ', ' + p.a + ', Mumbai')}" target="_blank" rel="noopener">${ic('map', 12, 2)} Directions</a></div></div>`;
function viewTodo(who = 'all') {
  const t = todoInfo(); const m = secMeta('events');
  const picks = todoPicks(who).slice(0, 3);
  const events = unread(secStories('events')).filter((s) => who === 'all' || (who === 'free' ? s.price === 'Free' : new RegExp({ kids: 'kid|child|family|young', family: 'family|kid|child', couple: 'couple|date|music|comedy|theatre|play|dinner|gig', solo: 'walk|talk|exhibition|workshop|art|gig|comedy|museum' }[who] || '.', 'i').test(s.title + ' ' + (s.summary || ''))));
  const more = PLACES.filter((p) => (who === 'all' || (who === 'free' ? p.cost === 0 : p.who.includes(who))) && !picks.some((x) => x.n === p.n)).sort((a, b) => (b.near ? 1 : 0) - (a.near ? 1 : 0) || a.cost - b.cost);
  const chips = [['all', 'All'], ['family', 'Family'], ['kids', 'Kids'], ['couple', 'Couple'], ['solo', 'Solo'], ['free', 'Free']].map(([id, l]) => `<a class="chip" href="#todo/${id}" style="${who === id ? `background:${m.color};color:${m.tint};border-color:transparent;font-weight:600` : ''}">${l}</a>`).join('');
  return `${backBar()}<div class="row gap12 mt8"><span style="width:48px;height:48px;border-radius:14px;background:${m.color};color:${m.tint};display:flex;align-items:center;justify-content:center">${ic('ticket', 24)}</span><div class="col"><h1 class="h1" style="font-size:26px">Things to do in Mumbai</h1><span class="small muted">${esc(t.label)}</span></div></div>
  <div class="row gap6 mt16" style="flex-wrap:wrap">${chips}</div>
  <div class="sec-head"><span class="h2">Today’s picks</span><span class="xs muted">${t.rain ? 'Indoor ideas, rain likely' : t.slot === 'evening' ? 'For this evening' : t.slot === 'morning' ? 'For this morning' : 'For today'}</span></div>
  <div class="col gap12">${picks.length ? picks.map(placeCard).join('') : '<div class="empty">No matching ideas right now.</div>'}</div>
  <div class="sec-head"><span class="h2">Happening this week</span><span class="xs muted">from Mid-day, HT, Time Out and more</span></div>
  ${events.length ? `<div class="col gap16">${events.slice(0, 12).map(storyCard).join('')}</div>` : `<div class="card small muted">No new event listings ${who === 'all' ? '' : 'for this filter '}right now. They refresh every 30 minutes.</div>`}
  <div class="sec-head"><span class="h2">More ideas</span><span class="xs muted">${COST_HINT.map((h, i) => COST[i] + ' ' + h).slice(1).join(' · ')}</span></div>
  <div class="col gap12">${more.map(placeCard).join('')}</div>
  <p class="note">Costs are rough per-person guides. Timings, fees and closing days change, so check before you go.</p>`;
}
function viewHistory() {
  const h = S.history;
  const groups = {}; for (const x of h) { const d = new Date(x.at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }); (groups[d] ||= []).push(x); }
  return `${backBar()}<div class="row sp mt8"><h1 class="h1">Read history</h1>${h.length ? '<button class="xs muted" data-act="clearhist">Clear</button>' : ''}</div><p class="small muted">Stories you’ve opened or swiped past. They no longer appear in your feeds.</p>
  ${h.length ? Object.entries(groups).map(([d, list]) => `<div class="sec-head" style="margin-top:18px"><span class="eyebrow">${esc(d)}</span></div>${list.map((x) => { const m = secMeta(x.section); const live = !!S.byId[x.id]; return `<a class="story" href="${live ? '#read/' + x.id : '#web/' + encodeURIComponent(x.link)}"><div class="thumb" style="width:64px;height:64px">${x.image ? `<img src="${esc(x.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : art(x.section, 64)}</div><div class="col gap4 grow"><span class="tag" style="color:${m.solid}">${esc(m.short)} · ${esc(x.source)}</span><span class="ttl clamp2" style="font-size:15px">${esc(x.title)}</span><span class="xs muted">Read at ${new Date(x.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span></div></a>`; }).join('')}`).join('') : '<div class="empty">Nothing read yet. Stories you open will appear here.</div>'}`;
}
function viewSearch(q = '') {
  q = decodeURIComponent(q);
  const res = q.length > 1 ? (S.news?.stories || []).filter((s) => (s.title + ' ' + (s.headline || '') + ' ' + (s.summary || '') + ' ' + s.sources.map((x) => x.name).join(' ')).toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.score - a.score) : [];
  setTimeout(() => { const i = $('#sq'); if (i && !q) i.focus(); }, 50);
  return `${backBar()}<form class="search" data-form="search">${ic('search', 18)}<input id="sq" name="q" value="${esc(q)}" placeholder="Search Malad, gold, iPhone, Iran…" autocomplete="off" aria-label="Search news"></form>
  <div class="mt12">${q.length > 1 ? (res.length ? res.slice(0, 60).map(storyRow).join('') : `<div class="empty">Nothing in today’s news for “${esc(q)}”.<br><a href="#ask" data-act="askq" data-q="${esc(q)}" style="color:var(--accent-text)">Ask Drishti instead</a></div>`) : `<div class="row gap8 mt8" style="flex-wrap:wrap">${['Malad', 'Western Railway', 'Gold', 'Sensex', 'Iran', 'iPhone', 'Samsung', 'Dengue', 'Box office', 'RBI'].map((t) => `<a class="chip" href="#search/${encodeURIComponent(t)}">${t}</a>`).join('')}</div>`}</div>`;
}

function viewSaved() {
  const list = S.saved.map((id) => S.byId[id]).filter(Boolean);
  return `${backBar('Explore')}<h1 class="h1 mt8">Saved</h1><div class="mt12">${list.length ? list.map(storyRow).join('') : '<div class="empty">Tap the bookmark on any story to keep it here. Saved stories stay while they are in the feed (about 2 days).</div>'}</div>`;
}
function viewFactchecks() {
  const f = S.news?.factChecks || [];
  return `${backBar('Explore')}<h1 class="h1 mt8">Fake news busted</h1><p class="small muted">Latest checks by BOOM, Alt News, Factly and PIB Fact Check. Before you forward something on WhatsApp, look here.</p>${f.map((x) => `<a class="fc mt8" href="#web/${encodeURIComponent(x.link)}">${ic('alert', 18, 2)}<span class="col"><span>${esc(x.title)}</span><span class="xs" style="opacity:.8">${esc(x.publisher)} · ${ago(x.time)} ago</span></span></a>`).join('') || '<div class="empty">No new fact-checks right now.</div>'}`;
}
function viewVideos() {
  const v = S.news?.videos || [];
  return `${backBar('Explore')}<h1 class="h1 mt8">Trending videos</h1><p class="small muted">Most popular on YouTube in India right now.</p><div class="col gap12 mt12">${v.map((x) => `<a class="vcard" href="https://www.youtube.com/watch?v=${esc(x.id)}" target="_blank" rel="noopener"><img src="${esc(x.thumb)}" alt="" loading="lazy"><div style="padding:10px 12px"><div style="font-weight:600;font-size:14px" class="clamp2">${esc(x.title)}</div><div class="xs muted mt8">${esc(x.channel)} · ${x.views >= 1e6 ? (x.views / 1e6).toFixed(1) + 'M' : Math.round(x.views / 1e3) + 'K'} views</div></div></a>`).join('') || '<div class="empty">Add a YouTube key to see trending videos.</div>'}</div>`;
}


const LANG_NAME = { en: 'very simple, everyday English (like explaining to a friend; short sentences; no jargon, and if a hard word is needed, explain it in brackets)', hinglish: 'simple Hinglish (Hindi written in English letters mixed with common English words, the way people chat on WhatsApp in Mumbai)', hi: 'simple, everyday Hindi in Devanagari script (avoid difficult Sanskrit words)' };
// rewriting uses the fast, high-limit model first; if one model is busy or at its limit, try the next
async function gem(prompt, json = true) {
  const models = ['gemini-2.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash', S.settings.model].filter((v, i, a) => v && a.indexOf(v) === i);
  let limited = false;
  for (const model of models) {
    const cfg = { temperature: 0.3, ...(json ? { responseMimeType: 'application/json' } : {}) };
    if (/2\.5/.test(model)) cfg.thinkingConfig = { thinkingBudget: 0 };
    let r;
    try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(S.settings.key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: cfg }) }); }
    catch { throw new Error('offline'); }
    if (r.status === 429 || r.status === 503) { limited = true; continue; }
    if (!r.ok) continue;
    const j = await r.json();
    const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (t) return t;
  }
  throw new Error(limited ? 'limit' : 'no model');
}
function simpStatus(msg) {
  let el = $('#simpst');
  if (!msg) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'simpst'; el.className = 'simpst'; document.body.appendChild(el); }
  el.innerHTML = msg;
}
const EDITOR_LANG = { en: 'very simple, everyday English', hinglish: 'simple Hinglish (Hindi in English letters, mixed with common English words)', hi: 'simple everyday Hindi in Devanagari script' };
let editorBusy = false;
async function clientEditor() {
  const n = S.news;
  if (!n || n.brief?.length || !S.settings.key || editorBusy) return;
  if (S.brief?.u === n.updated && S.brief.lang === LANG()) return;
  editorBusy = true; simpStatus(`${ic('sparkle', 14)} Picking today’s best stories…`);
  try {
    const cands = n.stories.filter((s) => (s.summary || '').split(/\s+/).length >= 40).sort((a, b) => b.score - a.score).slice(0, 150);
    const prompt = `You are the chief editor of a short-news app (like Inshorts) for one reader: ${S.settings.name || 'the reader'}, a working professional in Malad, Mumbai, who has 10 minutes in the morning. Interests: Mumbai and Malad local news, India, world (Iran, Israel, US), markets, SIP and personal money, gold and fuel prices, phones and tech/AI, health, sports (mainly cricket), Bollywood and new films, spiritual.
From the candidates below pick the 30 he most needs or would most enjoy knowing today.
Pick: big national and world events, anything that hits his wallet or daily life (prices, fuel, taxes, rules, trains, weather, civic news in Mumbai), clear market moves, notable launches, firsts and records, major sports results, big entertainment buzz, genuinely interesting science and tech.
Skip: duplicates of the same event, political mud-slinging and rhetoric, opinion pieces, minor crime, celebrity gossip, how-to and listicles, vague or clickbait headlines.
Order by importance, with variety (no more than 5 from one section).
For each pick write in ${EDITOR_LANG[LANG()]}, using ONLY the facts given (never add facts or numbers):
"h": crisp, specific headline, at most 12 words, like Inshorts ("CNG prices in Mumbai hiked for 2nd time in 15 days")
"t": 50 to 60 word summary in 3 or 4 short sentences: what happened, key numbers, why it matters.
Return JSON only: [{"id":"...","h":"...","t":"..."}]

CANDIDATES:
${cands.map((s) => JSON.stringify({ id: s.id, section: s.section, outlets: s.n, title: s.title, summary: (s.summary || '').slice(0, 300) })).join('\n')}`;
    const arr = JSON.parse((await gem(prompt)).replace(/^```json|```$/g, '')).filter((x) => x.id && S.byId[x.id]);
    if (arr.length >= 10) {
      for (const x of arr) if (x.h && x.t) S.simple[x.id + ':' + LANG()] = { h: x.h, t: x.t, at: Date.now() };
      LS.set('simple', S.simple);
      S.brief = { u: n.updated, lang: LANG(), ids: arr.map((x) => x.id) }; LS.set('brief', S.brief);
      const [r] = route(); const qw = $('#qw');
      if (r === 'home' || r === '' || (r === 'quick' && (!qw || qw.scrollTop < 50))) render();
    }
    simpStatus('');
  } catch (e) {
    simpStatus(e.message === 'limit' ? 'Google’s free AI limit reached, picking again shortly' : '');
    setTimeout(() => simpStatus(''), 4000);
    if (e.message === 'limit') setTimeout(() => { editorBusy = false; clientEditor(); }, 60000);
  }
  editorBusy = false;
}
let simpBusy = false, simpRetry = null;
async function simplifyVisible() {
  if (!simpleOn() || simpBusy) return;
  // stories on screen first, then the ones just below
  const els = [...document.querySelectorAll('[data-sh]')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.sh, d: r.top < 0 ? 5000 - r.top : r.top }; }).sort((a, b) => a.d - b.d);
  const ids = [...new Set(els.map((e) => e.id))];
  const todo = ids.map((id) => S.byId[id]).filter((s) => s && !simp(s) && !(LANG() === 'en' && s.bh)).slice(0, 8);
  if (!todo.length) { simpStatus(''); return; }
  simpBusy = true; simpStatus(`${ic('sparkle', 14)} Making it simple…`);
  try {
    const out = await gem(`Rewrite each news item below in ${LANG_NAME[LANG()]}. The reader is busy and wants to understand it in one quick read.
Rules: keep every fact exactly as given, do not add anything new; headline max 10 words; summary 40 to 60 words in 3 or 4 short sentences; say what happened, then why it matters to an ordinary person in India.
Return JSON: [{"id":"...","h":"headline","t":"summary"}]

${todo.map((s) => JSON.stringify({ id: s.id, headline: s.headline || s.title, summary: s.summary })).join('\n')}`);
    const arr = JSON.parse(out.replace(/^```json|```$/g, ''));
    for (const x of arr) if (x.id && x.t) {
      S.simple[x.id + ':' + LANG()] = { h: x.h, t: x.t, at: Date.now() };
      document.querySelectorAll(`[data-sh="${x.id}"]`).forEach((e) => { if (x.h) e.textContent = x.h; });
      document.querySelectorAll(`[data-ss="${x.id}"]`).forEach((e) => { e.textContent = x.t; });
    }
    LS.set('simple', S.simple);
  } catch (e) {
    simpBusy = false; console.warn('simplify', e.message);
    const wait = e.message === 'limit' ? 40 : 15;
    simpStatus(e.message === 'limit' ? `Google’s free AI limit reached, trying again in ${wait}s` : e.message === 'offline' ? 'No internet for simple words' : 'Simple words will retry shortly');
    clearTimeout(simpRetry); simpRetry = setTimeout(() => { simpStatus(''); simplifyVisible(); }, wait * 1000);
    return;
  }
  simpBusy = false; simpStatus('');
  setTimeout(simplifyVisible, 1200); // next batch
}
async function explainSimply(s, articleText) {
  const box = $('#explain'); if (!box || !simpleOn()) return;
  const key = s.id + ':x:' + LANG();
  const show = (html) => { if ($('#explain') === box) box.innerHTML = `<div class="card mt16" style="background:var(--accent-soft);border-color:transparent"><span class="eyebrow" style="color:var(--accent-text)">${ic('sparkle', 14)} In simple words</span><div class="bub" style="margin-top:6px;font-size:16px;line-height:1.6">${html}</div></div>`; };
  if (S.simple[key]) return show(md(S.simple[key].t));
  show('<span class="typing"><span></span><span></span><span></span></span>');
  try {
    const out = await gem(`Explain this news story in ${LANG_NAME[LANG()]}, for someone who has 30 seconds.
Use exactly this shape, short bullet points, no more than 110 words in total:
**What happened:** one or two lines
**Why it matters:** one or two lines
**What it means for you:** one line (for a common person in Mumbai or India; say "Not much directly" if it does not affect them)
Use only facts from the story below. Do not add anything.

Headline: ${s.headline || s.title}
Summary: ${s.summary}
Article: ${(articleText || '').slice(0, 5000)}`, false);
    S.simple[key] = { t: out.trim(), at: Date.now() }; LS.set('simple', S.simple);
    show(md(out.trim()));
  } catch (e) { if ($('#explain') === box) { if (e.message === 'limit') { box.innerHTML = `<p class="xs muted mt12">Simple explanation paused: Google’s free AI limit was reached. Retrying in 40 seconds…</p>`; setTimeout(() => { if ($('#explain') === box) explainSimply(s, articleText); }, 40000); } else box.innerHTML = ''; } }
}

// ---------- in-app reader ----------
const READER_BAD = /(subscription|subscribe|newsletter|see all|sign in|log in|loading\.\.\.|premium stor|unlock|cookie|download (the|our) app|already a (member|subscriber)|e-?paper|terms of use|privacy policy|all rights reserved|follow us on|join our|whatsapp channel|recommended for you|you may also like|trending now|copyright)/i;
const HEAD_JUNK = /^(latest|trending|related|recommended|more (from|stories|news|in)|also (read|see)|top (stories|news|videos|photos)|web stories|photos|videos|popular|most (read|viewed|popular)|you may|read next|what to read|editor'?s picks|tags|topics|follow|share|comments?)\b/i;
const tidyHeads = (parts) => parts.filter((p, i) => !(p.startsWith('<h3') && (i === parts.length - 1 || parts[i + 1].startsWith('<h3'))));
const camelJunk = (t) => (t.match(/[a-z][A-Z][a-z]/g) || []).length >= 2;
const READER_JUNK = /^(advertisement|also read|read more|read also|recommended|trending|follow us|subscribe|sign in|log ?in|share|copy link|whatsapp|facebook|twitter|telegram|google news|story continues|click here|download|for more|stay updated|first published|updated:|last updated|published:|edited by|written by|by\s|photo:|image:|file photo|representational|catch all|get the latest|you may also like|related|tags?:|topics?:|disclaimer|©)(\b|\s|$)/i;
function readerHtml(md, title) {
  const out = []; let words = 0; const seen = new Set();
  const lines = md.replace(/\r/g, '').split('\n');
  for (let raw of lines) {
    let ln = raw.trim();
    if (!ln) continue;
    if (/^!\[/.test(ln) || /^\[!\[/.test(ln)) continue; // images
    ln = ln.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '').replace(/\*\*|__/g, '').trim();
    if (!ln || seen.has(ln)) continue; seen.add(ln);
    const h = /^#{1,4}\s+(.*)/.exec(ln);
    if (h) { const t = h[1].trim(); if (t.length > 8 && t.length < 140 && words > 0 && t !== title && !READER_JUNK.test(t) && !HEAD_JUNK.test(t)) out.push(`<h3 class="rh">${esc(t)}</h3>`); continue; }
    const li = /^[-*•]\s+(.*)/.exec(ln);
    const text = (li ? li[1] : ln).replace(/^>\s*/, '').trim();
    if (READER_JUNK.test(text) || READER_BAD.test(text) || camelJunk(text) || text === title) continue;
    if (text.length < 60 && !/[.!?”"]$/.test(text)) continue; // menus, labels, link lists
    if ((text.match(/\|/g) || []).length > 2) continue;
    out.push(li ? `<p class="rp">• ${esc(text)}</p>` : `<p class="rp">${esc(text)}</p>`);
    words += text.split(/\s+/).length;
    if (words > 2500) break;
  }
  return words > 60 ? tidyHeads(out).join('') : '';
}
let ReadabilityMod = null;
async function readable(url) {
  const key = 'arth:' + url;
  let html = null;
  try { html = sessionStorage.getItem(key); } catch {}
  if (!html) {
    const r = await fetch('https://r.jina.ai/' + url, { headers: { 'X-Return-Format': 'html' } });
    if (!r.ok) throw new Error('reader ' + r.status);
    html = await r.text();
    try { sessionStorage.setItem(key, html); } catch {}
  }
  ReadabilityMod ||= (await import('https://esm.sh/@mozilla/readability@0.5.0')).Readability;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const base = doc.createElement('base'); base.href = url; doc.head?.prepend(base);
  const art = new ReadabilityMod(doc, { charThreshold: 300 }).parse();
  if (!art?.content) return '';
  const box = new DOMParser().parseFromString(art.content, 'text/html');
  const out = []; let words = 0; const seen = new Set();
  box.querySelectorAll('p, h2, h3, h4, li, blockquote').forEach((el) => {
    if (el.closest('li') && el.tagName !== 'LI') return;
    if (el.tagName === 'P' && el.closest('blockquote')) return;
    const t = el.textContent.replace(/\s+/g, ' ').trim();
    if (!t || seen.has(t) || READER_BAD.test(t) || READER_JUNK.test(t) || camelJunk(t)) return;
    seen.add(t);
    if (/^H[234]$/.test(el.tagName)) { if (t.length > 6 && t.length < 140 && words && !HEAD_JUNK.test(t)) out.push(`<h3 class="rh">${esc(t)}</h3>`); return; }
    if (t.length < 40 && !/[.!?”"]$/.test(t)) return;
    out.push(el.tagName === 'LI' ? `<p class="rp">• ${esc(t)}</p>` : el.tagName === 'BLOCKQUOTE' ? `<p class="rp" style="border-left:3px solid var(--accent);padding-left:12px;border-radius:0">${esc(t)}</p>` : `<p class="rp">${esc(t)}</p>`);
    words += t.split(' ').length;
  });
  return words > 120 ? tidyHeads(out).join('') : '';
}
async function loadArticle(url) {
  const key = 'art:' + url;
  try { const c = sessionStorage.getItem(key); if (c) return c; } catch {}
  const r = await fetch('https://r.jina.ai/' + url);
  if (!r.ok) throw new Error('reader ' + r.status);
  const t = await r.text();
  const title = (/^Title:\s*(.*)$/m.exec(t) || [])[1] || ''; const md = 'Title: ' + title + '\n' + (t.includes('Markdown Content:') ? t.split('Markdown Content:')[1] : t);
  try { sessionStorage.setItem(key, md); } catch {}
  return md;
}
async function articleHtml(url, title) {
  if (/(newscomm|#comments|\/comments?\/)/i.test(url)) return '';
  try { return await readable(url); } catch (e) { console.warn('readability', e); return ''; }
}
function viewRead(id, srcIdx) {
  const s = S.byId[id]; if (!s) return `${backBar()}<div class="empty">This story is no longer in today’s feed.</div>`;
  markRead(id);
  const src = srcIdx != null && s.sources[srcIdx] ? s.sources[srcIdx] : { name: s.sources[0]?.name || '', url: s.link };
  const url = srcIdx != null && s.sources[srcIdx] && !s.sources[srcIdx].url.includes('news.google.com') ? s.sources[srcIdx].url : s.link;
  const m = secMeta(s.section);
  setTimeout(async () => {
    const box = $('#rbody'); if (!box) return;
    try {
      const html = await articleHtml(url, s.title);
      if ($('#rbody') !== box) return;
      explainSimply(s, new DOMParser().parseFromString(html || '', 'text/html').body.textContent);
      box.innerHTML = html || readerFallback(s, url, 'The full article could not be shown here, so this is the summary.');
    } catch (e) { if ($('#rbody') === box) box.innerHTML = readerFallback(s, url, 'Could not load the full article right now.'); explainSimply(s, ''); }
  }, 0);
  return `${npBack(secName(s.section), '#section/' + s.section)}<div class="rule2"></div>
  <div class="kick red mt12">${esc(secName(s.section))}${s.breaking ? ' · Breaking' : ''}${s.local ? ' · Near you' : ''}</div>
  <h1 class="art-h" data-sh="${s.id}">${esc(H(s))}</h1>
  ${T(s) ? `<p class="art-deck">${esc((T(s).match(/^.{40,240}?[.!?](\s|$)/) || [T(s).slice(0, 220)])[0].trim())}</p>` : ''}
  <div class="art-ver">${s.n > 1 ? `<b class="okc">✓ Confirmed by ${s.n} outlets</b>` : '<b>Single source</b>'}<span class="np-m">${esc(s.sources.slice(0, 3).map((x) => x.name).join(', '))} · ${ago(s.time)} ago</span></div>
  ${s.factCheck ? `<a class="fc mt12" href="#web/${encodeURIComponent(s.factCheck.link)}">${ic('alert', 18, 2)}<span><b>Fact-check:</b> ${esc(s.factCheck.title)} <span class="xs">(${esc(s.factCheck.source)})</span></span></a>` : ''}
  ${s.image ? `<div class="np-img mt12">${img(s, 220, true)}</div>` : ''}
  <div id="explain"></div>
  <div class="np-m mt16">Full report from <b>${esc(src.name)}</b></div>
  <div id="rbody" class="np-art dc mt8"><div class="col gap8">${[100, 96, 98, 70, 100, 92, 60].map((w) => `<div class="skel" style="height:14px;width:${w}%"></div>`).join('')}</div><p class="xs muted mt12">Loading the full story…</p></div>
  <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:18px"><button class="np-chip" data-act="save" data-id="${s.id}">${ic('bookmark', 14)} Save</button><button class="np-chip" data-act="share" data-id="${s.id}">${ic('share', 14)} Share</button><a class="np-chip" href="#ask" data-act="askabout" data-id="${s.id}">${ic('sparkle', 14)} Ask about this</a></div>
  ${s.n > 1 ? `<div class="rule1 mt20"></div><div class="np-st">Read it from another outlet</div>${s.sources.map((x, i) => i === (srcIdx ?? 0) ? '' : `<a class="np-idx" href="#read/${s.id}/${i}"><span>${esc(x.name)}</span>${ic('chev', 16)}</a>`).join('')}` : ''}
  ${(() => { const rel = unread(secStories(s.section)).filter((x) => x.id !== s.id).slice(0, 4); return rel.length ? `<div class="rule1 mt20"></div><div class="np-st">More in ${esc(secName(s.section))}</div>${rel.map((x) => npRow(x, esc(x.sources[0]?.name || ''))).join('')}` : ''; })()}
  <p class="np-note" style="text-align:center">Article by ${esc(src.name)}, shown in reading view. <a href="${esc(url)}" target="_blank" rel="noopener">Open original page</a></p>`;
}
function viewWeb(enc) {
  const url = decodeURIComponent(enc || '');
  setTimeout(async () => {
    const box = $('#rbody'); if (!box) return;
    try { const html = await articleHtml(url, ''); if ($('#rbody') === box) box.innerHTML = html || readerFallback({}, url, 'This page could not be shown in reading view.'); }
    catch { if ($('#rbody') === box) box.innerHTML = readerFallback({}, url, 'Could not load this page right now.'); }
  }, 0);
  return `${backBar()}<span class="eyebrow mt8" style="display:block">${esc(domainName(url))}</span><div id="rbody" class="mt16"><div class="col gap8">${[100, 96, 98, 70, 100, 92].map((w) => `<div class="skel" style="height:14px;width:${w}%"></div>`).join('')}</div></div><p class="xs muted mt16" style="text-align:center"><a href="${esc(url)}" target="_blank" rel="noopener" style="color:var(--accent-text)">Open original page</a></p>`;
}
const domainName = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
function readerFallback(s, url, why) {
  return `${s.summary ? `<p class="rp">${esc(s.summary)}</p>` : ''}<div class="card mt12 small muted">${why} <a href="${esc(url)}" target="_blank" rel="noopener" style="color:var(--accent-text)">Open the original page</a> or try another outlet below.</div>`;
}

// ---------- money ----------
function viewMoney() {
  const mk = S.markets; const q = mk?.quotes || {}; const [st, open] = marketStatus();
  const seg = `<div class="seg"><a href="#money" class="on">Markets</a><a href="#grow">Grow</a></div>`;
  if (!mk) return `<div class="top"><h1 class="h1">Money</h1>${seg}</div><div class="empty">Loading markets…</div>`;
  const nf = q.nifty; const series = mk.nifty?.[S.range] || [];
  const rp = S.range === '1D' ? nf?.pct : S.range === '1M' ? mk.nifty['1Mpct'] : mk.nifty['1Ypct'];
  const t = (k, label, fmt, sub) => q[k] ? `<div class="mtile"><span class="xs muted">${label}</span><span class="v">${fmt(q[k].price)}</span><span class="xs ${q[k].pct >= 0 ? 'up' : 'down'}">${pct(q[k].pct)}${sub ? ' · ' + sub : ''}</span></div>` : '';
  const rs = (v) => '₹' + Math.round(v).toLocaleString('en-IN');
  const mv = (r, upc) => `<div class="mover"><span style="width:38px;height:38px;border-radius:10px;background:${upc ? 'var(--up-bg)' : 'var(--down-bg)'};color:${upc ? 'var(--up)' : 'var(--down)'};font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">${esc(r.sym.slice(0, 3))}</span><div class="col grow"><span style="font-weight:500">${esc(r.name)}</span><span class="xs muted">₹${num(r.price)}</span></div><span class="pill ${upc ? 'p-up' : 'p-down'}">${pct(r.pct)}</span></div>`;
  return `<div class="top"><h1 class="h1">Money</h1>${seg}</div>
  <div class="small muted row gap6"><span style="width:8px;height:8px;border-radius:4px;background:${open ? 'var(--up)' : 'var(--muted)'}"></span>${st} · updated ${ago(mk.updated)} ago</div>
  ${nf ? `<div class="card mt12" style="padding:16px 16px 8px"><div class="row sp"><span class="small muted">Nifty 50</span><div class="row" style="gap:2px">${['1D', '1M', '1Y'].map((r) => `<button data-act="range" data-r="${r}" class="xs" style="padding:5px 9px;border-radius:8px;${S.range === r ? 'background:var(--card2);color:var(--text);font-weight:600' : 'color:var(--muted)'}">${r}</button>`).join('')}</div></div><div class="row gap8" style="align-items:baseline;margin-top:4px"><span style="font-size:30px;font-weight:600;letter-spacing:-.5px">${num(nf.price)}</span><span class="${rp >= 0 ? 'up' : 'down'}" style="font-weight:500">${S.range === '1D' ? (nf.change >= 0 ? '+' : '−') + num(Math.abs(nf.change)) + ' ' : ''}(${pct(rp)})</span></div><div class="mt8">${spark(series, 300, 96, rp >= 0 ? 'var(--up)' : 'var(--down)')}</div></div>` : ''}
  <div class="grid2 mt12">${t('sensex', 'Sensex', (v) => num(v, 0))}${t('bank', 'Bank Nifty', (v) => num(v, 0))}${t('gold', 'Gold 24K · 10g', rs, 'indicative')}${t('silver', 'Silver · 1kg', rs, 'indicative')}${t('usdinr', 'USD / INR', (v) => num(v))}${t('brent', 'Brent crude', (v) => '$' + num(v))}</div>
  ${q.gold22 ? `<p class="note">Gold 22K ≈ ₹${Math.round(q.gold22.price).toLocaleString('en-IN')} / 10g. Gold and silver are indicative rates (international price + import duty + 3% GST); your jeweller’s rate will differ slightly.</p>` : ''}
  ${mk.movers?.gainers?.length ? `<div class="sec-head"><span class="h2">Top gainers</span><span class="xs muted">${mk.breadth ? `${mk.breadth.up} up · ${mk.breadth.down} down` : ''}</span></div><div class="card" style="padding:2px 14px">${mk.movers.gainers.map((r) => mv(r, true)).join('')}</div><div class="sec-head"><span class="h2">Top losers</span></div><div class="card" style="padding:2px 14px">${mk.movers.losers.map((r) => mv(r, false)).join('')}</div>` : ''}
  <div class="sec-head"><span class="h2">Global</span></div><div class="grid2">${t('dow', 'Dow Jones', (v) => num(v, 0))}${t('nasdaq', 'Nasdaq', (v) => num(v, 0))}${t('it', 'Nifty IT', (v) => num(v, 0))}${t('btc', 'Bitcoin', (v) => '$' + num(v, 0))}</div>
  <a class="card row mt16" href="#grow" style="background:var(--violet-bg);border-color:transparent"><span style="color:var(--violet)">${ic('target', 22)}</span><span class="col grow"><span style="font-weight:600">Plan your investments</span><span class="xs muted">Goal planner, 11 calculators and a step-by-step guide</span></span>${ic('chev', 18)}</a>
  <div class="sec-head"><span class="h2">Market news</span><a href="#section/markets">See all</a></div>${secStories('markets').slice(0, 5).map(storyRow).join('')}
  <div class="sec-head"><span class="h2">SIP and mutual funds</span><a href="#section/money">See all</a></div>${secStories('money').slice(0, 5).map(storyRow).join('')}
  <p class="note">Market data from Yahoo Finance, may be delayed. Drishti shares news and education, not investment advice.</p>`;
}

function viewGrow() {
  const g = LS.get('planner', { g: 1000000, p: 10000, r: 12 });
  const done = S.guide.length;
  setTimeout(() => bindPlanner(), 0);
  return `<div class="top"><h1 class="h1">Grow</h1><div class="seg"><a href="#money">Markets</a><a href="#grow" class="on">Grow</a></div></div>
  <div class="card mt8" style="padding:16px" id="planner">
    <div class="row sp"><span class="h2" style="font-size:19px">Goal planner</span><span class="xs muted">Monthly SIP</span></div>
    <div class="row gap6 mt12" id="goals">${[[500000, '₹5 L'], [1000000, '₹10 L'], [2500000, '₹25 L'], [5000000, '₹50 L'], [10000000, '₹1 Cr']].map(([v, l]) => `<button data-goal="${v}" class="chip" style="flex:1;justify-content:center;${g.g === v ? 'border-color:var(--accent);background:var(--accent-soft);color:var(--accent-text);font-weight:600' : ''}">${l}</button>`).join('')}</div>
    <div class="field"><label for="pp">Monthly SIP <b id="ppv"></b></label><input id="pp" type="range" min="500" max="200000" step="500" value="${g.p}"></div>
    <div class="field"><label for="pr">Expected return a year <b id="prv"></b></label><input id="pr" type="range" min="6" max="16" step="0.5" value="${g.r}"></div>
    <div class="result" id="pres"></div>
    <p class="note">Returns are assumptions, not guaranteed. Equity can fall sharply in some years; this is for learning, not investment advice.</p>
  </div>
  <div class="card mt12" id="tbl"></div>
  <div class="sec-head"><span class="h2">Calculators</span></div>
  <div class="grid3">${CALCS.map((c) => `<a class="calc" href="#calc/${c.id}"><span style="color:var(--accent-text)">${ic(c.icon, 20)}</span>${esc(c.name)}</a>`).join('')}</div>
  <a class="q60 mt16" href="#guide"><span class="ic" style="font-family:var(--serif);font-weight:600;font-size:15px">${done}/${GUIDE.length}</span><span class="col grow" style="gap:1px"><b style="font-size:16px">Start investing, step by step</b><span class="small" style="opacity:.8">${done >= GUIDE.length ? 'All steps done. Review yearly.' : 'Next: ' + esc(GUIDE[Math.min(done, GUIDE.length - 1)].t)}</span></span>${ic('chev', 20, 2)}</a>
  <div class="sec-head"><span class="h2">Learn in 3 minutes</span></div>
  ${LEARN.map((l) => `<a class="story" href="#learn/${l.id}"><div class="thumb" style="width:52px;height:52px;border-radius:14px;background:var(--violet-bg);color:var(--violet);display:flex;align-items:center;justify-content:center">${ic('book', 22)}</div><div class="col grow" style="justify-content:center"><span class="ttl" style="font-size:15px">${esc(l.title)}</span><span class="xs muted">${l.mins} min read</span></div></a>`).join('')}
  <div class="card mt16 small muted">Need personal advice on what to buy? Talk to a SEBI-registered investment adviser. Never act on stock tips from WhatsApp or Telegram groups.</div>`;
}
function bindPlanner() {
  const el = $('#planner'); if (!el) return;
  const st = LS.get('planner', { g: 1000000, p: 10000, r: 12 });
  const upd = () => {
    st.p = Number($('#pp').value); st.r = Number($('#pr').value); LS.set('planner', st);
    $('#ppv').textContent = inr(st.p, false); $('#prv').textContent = st.r + '%';
    const n = monthsToGoal(st.g, st.p, st.r); const invested = Math.min(st.g, st.p * n); const share = Math.round((invested / st.g) * 100);
    $('#pres').innerHTML = `<span class="small" style="color:var(--violet)">You reach ${inr(st.g)} in</span><div class="big">${dur(n)}</div><div class="bar"><i style="width:${share}%"></i></div><div class="row sp xs"><span style="color:var(--violet)">Your money ${inr(invested)}</span><span style="color:var(--accent-text)">Growth ${inr(st.g - invested)}</span></div>`;
    $('#tbl').innerHTML = `<div class="row sp"><span style="font-weight:600">Monthly SIP needed for ${inr(st.g)}</span><span class="xs muted">at ${st.r}%</span></div><table class="t mt8"><tr><th>In</th><th>Per month</th><th>You invest</th></tr>${[3, 5, 7, 10, 15].map((y) => { const p = sipForGoal(st.g, st.r, y * 12); return `<tr><td>${y} years</td><td><b>${inr(Math.ceil(p / 100) * 100, false)}</b></td><td>${inr(p * y * 12)}</td></tr>`; }).join('')}</table><p class="note">One-time ₹10,000 at ${st.r}% becomes ${inr(10000 * Math.pow(1 + st.r / 100, 10))} in 10 years and ${inr(10000 * Math.pow(1 + st.r / 100, 20))} in 20. Regular investing does the heavy lifting.</p>`;
  };
  el.addEventListener('input', upd);
  $('#goals').addEventListener('click', (e) => { const b = e.target.closest('[data-goal]'); if (!b) return; st.g = Number(b.dataset.goal); LS.set('planner', st); $('#goals').querySelectorAll('button').forEach((x) => x.setAttribute('style', 'flex:1;justify-content:center;' + (x === b ? 'border-color:var(--accent);background:var(--accent-soft);color:var(--accent-text);font-weight:600' : ''))); upd(); });
  upd();
}

function viewCalc(id) {
  const c = CALCS.find((x) => x.id === id); if (!c) return viewGrow();
  setTimeout(() => bindCalc(c), 0);
  return `${backBar('Grow')}<div class="row gap12 mt8"><span style="width:48px;height:48px;border-radius:14px;background:var(--violet-bg);color:var(--violet);display:flex;align-items:center;justify-content:center">${ic(c.icon, 24)}</span><div class="col"><h1 class="h1" style="font-size:26px">${esc(c.name)} calculator</h1><span class="small muted">${esc(c.desc)}</span></div></div>
  <div class="card mt16" id="calc">${c.fields.map((f) => `<div class="field"><label for="f_${f.k}">${esc(f.l)} <b id="v_${f.k}"></b></label><input id="f_${f.k}" data-k="${f.k}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${LS.get('calc.' + c.id, {})[f.k] ?? f.d}"></div>`).join('')}<div id="cres"></div></div>
  <p class="note">Assumed rates, for planning only. Actual returns vary; past returns do not guarantee future results.</p>`;
}
function bindCalc(c) {
  const box = $('#calc'); if (!box) return;
  const upd = () => {
    const v = {}; c.fields.forEach((f) => { v[f.k] = Number($('#f_' + f.k).value); $('#v_' + f.k).textContent = f.f(v[f.k]); });
    LS.set('calc.' + c.id, v);
    const r = c.run(v); const lab = r.labels || ['Invested', 'Growth']; const tot = r.inv + Math.max(0, r.gain); const share = tot ? Math.round((r.inv / tot) * 100) : 100;
    let chart = '';
    if (r.series && r.series.length > 1) {
      const mx = Math.max(...r.series.map((s) => s.val)); const n = r.series.length; const bw = 300 / n;
      chart = `<svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none" class="mt12" aria-hidden="true">${r.series.map((s, i) => { const h1 = (s.val / mx) * 112, h2 = (s.inv / mx) * 112; return `<rect x="${i * bw + bw * 0.15}" y="${120 - h1}" width="${bw * 0.7}" height="${h1}" rx="2" fill="var(--accent)"/><rect x="${i * bw + bw * 0.15}" y="${120 - h2}" width="${bw * 0.7}" height="${h2}" rx="2" fill="var(--violet)"/>`; }).join('')}</svg><div class="row sp xs muted"><span>Year 1</span><span>Year ${r.series[n - 1].y}</span></div>`;
    }
    $('#cres').innerHTML = `<div class="result"><div class="big">${r.head}</div><div class="small muted">${esc(r.sub)}</div><div class="bar"><i style="width:${share}%"></i></div><div class="row sp xs"><span style="color:var(--violet)">${lab[0]} ${inr(r.inv)}</span><span style="color:var(--accent-text)">${lab[1]} ${inr(Math.max(0, r.gain))}</span></div>${chart}</div>`;
  };
  box.addEventListener('input', upd); upd();
}

function viewGuide() {
  return `${backBar('Grow')}<h1 class="h1 mt8">Start investing, step by step</h1><p class="small muted">Tick each step as you finish it. Most people can complete steps 1–6 in a month.</p>
  <div>${GUIDE.map((g, i) => `<button class="step ${S.guide.includes(i) ? 'done' : ''}" data-act="guide" data-i="${i}" style="width:100%;text-align:left"><span class="ck">${S.guide.includes(i) ? ic('check', 16, 3) : `<span class="xs muted">${i + 1}</span>`}</span><span class="col gap4"><span style="font-weight:600">${esc(g.t)}</span><span class="small muted">${esc(g.d)}</span></span></button>`).join('')}</div>
  <a class="btn btn-acc mt16" style="width:100%" href="#calc/goal">${ic('target', 18)} Plan a goal</a>`;
}
function viewLearn(id) {
  const l = LEARN.find((x) => x.id === id); if (!l) return viewGrow();
  return `${backBar('Grow')}<span class="eyebrow mt8" style="display:block">${l.mins} min read</span><h1 class="h1 mt8">${esc(l.title)}</h1>${l.body.map((p) => `<p style="font-size:16px;line-height:1.7;color:var(--text2)">${esc(p)}</p>`).join('')}<a class="btn btn-line mt16" style="width:100%" href="#ask" data-act="askq" data-q="${esc('Explain more about: ' + l.title)}">${ic('sparkle', 18)} Ask a follow-up</a>`;
}

// ---------- ask ----------
function md(t) {
  const lines = esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent-text)">$1</a>').split('\n');
  let out = '', list = null;
  for (const ln of lines) {
    const ul = /^\s*[-•*]\s+(.*)/.exec(ln), ol = /^\s*\d+[.)]\s+(.*)/.exec(ln);
    if (ul || ol) { const tag = ul ? 'ul' : 'ol'; if (list !== tag) { if (list) out += `</${list}>`; out += `<${tag}>`; list = tag; } out += `<li>${(ul || ol)[1]}</li>`; continue; }
    if (list) { out += `</${list}>`; list = null; }
    if (ln.trim().startsWith('#')) out += `<p><b>${ln.replace(/^#+\s*/, '')}</b></p>`;
    else if (ln.trim()) out += `<p>${ln}</p>`;
  }
  if (list) out += `</${list}>`;
  return out;
}
function viewAsk() {
  const hasKey = !!S.settings.key;
  const sugg = ['Why did the market move today?', 'Gold price trend this week', 'Best phone under ₹30,000 right now', 'What’s happening with Iran and Israel?', 'Explain today’s top news in Hindi', 'How do I start a SIP with ₹5,000?'];
  const msgs = S.chat.map((m) => m.role === 'user' ? `<div class="msg-u">${esc(m.text)}</div>` : `<div class="msg-a">${logo(28)}<div class="bub">${m.pending ? '<span class="typing"><span></span><span></span><span></span></span>' : md(m.text)}${m.note ? `<p class="xs muted" style="margin-top:8px">${esc(m.note)}</p>` : ''}${m.sources?.length ? `<div class="row gap6 mt8" style="flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--line)">${m.sources.slice(0, 5).map((s) => `<a class="chip" href="${esc(s.uri)}" target="_blank" rel="noopener" style="font-size:11px;padding:4px 8px">${esc(s.title.slice(0, 28))}</a>`).join('')}</div>` : ''}</div></div>`).join('');
  setTimeout(() => { window.scrollTo(0, document.body.scrollHeight); }, 30);
  return `<div class="top"><div class="row gap8">${logo(40)}<div class="col"><h1 class="h1" style="font-size:24px">Ask Drishti</h1><span class="xs muted">Answers from today’s verified news${hasKey ? ' and the web' : ''}</span></div></div>${S.chat.length ? `<button class="ibtn" data-act="clearchat" aria-label="New chat">${ic('refresh')}</button>` : ''}</div>
  ${!hasKey ? `<div class="card mt12" style="border-color:var(--accent)"><b>Turn on Ask Drishti</b><p class="small muted" style="margin:6px 0 10px">It uses Google’s free Gemini AI. Get a free key in 1 minute at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--accent-text)">aistudio.google.com/apikey</a>, then paste it here. It stays only on this phone.</p><form data-form="key" class="row gap8"><input class="inp" name="key" placeholder="Paste Gemini API key" autocomplete="off" aria-label="Gemini API key"><button class="btn btn-acc">Save</button></form></div>` : ''}
  ${!S.chat.length ? `<div class="row gap8 mt16" style="flex-wrap:wrap">${sugg.map((s) => `<button class="chip" style="font-size:13px;padding:9px 12px" data-act="askq" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div><p class="note">For investing questions Drishti explains options and trade-offs, but does not tell you what to buy.</p>` : ''}
  <div class="chat">${msgs}</div><div style="height:90px"></div>
  <form class="askbar" data-form="ask"><div class="in"><textarea name="q" rows="1" placeholder="Ask anything…" aria-label="Your question"></textarea>${'webkitSpeechRecognition' in window || 'SpeechRecognition' in window ? `<button type="button" class="round" data-act="mic" aria-label="Speak" style="background:var(--card);color:var(--text);border:1px solid var(--line2)">${ic('mic', 22, 2)}</button>` : ''}<button class="round" aria-label="Send">${ic('send', 20, 2)}</button></div></form>`;
}
function newsContext() {
  const n = S.news; const q = S.markets?.quotes || {};
  const top = (n?.stories || []).slice().sort((a, b) => b.score - a.score).slice(0, 70);
  const mk = ['nifty', 'sensex', 'bank', 'gold', 'silver', 'usdinr', 'brent'].filter((k) => q[k]).map((k) => `${q[k].name}: ${Math.round(q[k].price * 100) / 100} (${pct(q[k].pct)})`).join('; ');
  const w = S.weather?.w?.current ? `Weather in ${S.weather.loc.name}: ${Math.round(S.weather.w.current.temperature_2m)}°C, ${WMO(S.weather.w.current.weather_code)[0]}, India AQI ${S.weather.aqi ?? 'n/a'} (${aqiLabel(S.weather.aqi)}).` : '';
  return `Today is ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })} IST. User lives in Mumbai (Malad West). ${w}\nMarkets: ${mk}\n\nToday's verified news (section | headline | summary | outlets):\n${top.map((s) => `- ${s.section} | ${s.headline || s.title} | ${s.summary || ''} | ${s.sources.map((x) => x.name).join(', ')}`).join('\n')}`;
}
async function ask(qText, ctx = '') {
  if (!S.settings.key) { toast('Add your free Gemini key first'); return; }
  S.chat.push({ role: 'user', text: qText, ctx }); const ans = { role: 'model', text: '', pending: true }; S.chat.push(ans); render();
  if (typeof ctx === 'function') { try { ctx = await ctx(); } catch { ctx = ''; } S.chat[S.chat.length - 2].ctx = ctx; }
  const sys = `You are Drishti, a friendly personal news and money assistant for an Indian reader in Mumbai.
Style: answer directly in plain language, mobile-friendly, under 170 words unless asked for more, bullets where they help. Never start with phrases like "Based on the verified news provided" or "According to the context"; just answer. Name outlets naturally when it helps ("Mint reports…").
Accuracy: stay on exactly the topic the user asked about. If the user's message includes a STORY block, that story is the topic: explain it, why it matters and what happens next, using the article text given. If you don't have enough information, use Google Search; if you still can't find it, say briefly that details aren't available yet. Never swap in a different story or product. Never invent facts, prices or quotes.
Money: explain options, risks and how things work; never tell the user to buy or sell a specific stock or fund; suggest a SEBI-registered adviser for personal advice.
Language: reply in Hindi if the user writes in Hindi or asks for it.

Background (today's verified headlines, use when relevant):
${newsContext()}`;
  const contents = S.chat.filter((m) => !m.pending).slice(-10).map((m) => ({ role: m.role, parts: [{ text: m.role === 'user' && m.ctx ? `${m.ctx}\n\nQuestion: ${m.text}` : m.text }] }));
  const models = [S.settings.model, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'].filter((v, i, a) => v && a.indexOf(v) === i);
  let err = '', searchErr = '';
  outer: for (const model of models) {
    for (const tools of (S.noSearch ? [null] : [[{ google_search: {} }], null])) {
      try {
        const body = { system_instruction: { parts: [{ text: sys }] }, contents, generationConfig: { temperature: 0.3, maxOutputTokens: 1400 } };
        if (tools) body.tools = tools;
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(S.settings.key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json();
        if (!r.ok) {
          err = j?.error?.message || ('Error ' + r.status);
          if (tools) { searchErr = err; console.warn('Gemini with search failed:', err); continue; } // retry without search
          if (/API key/i.test(err)) break outer;
          continue;
        }
        const c = j.candidates?.[0];
        ans.text = c?.content?.parts?.map((p) => p.text || '').join('').trim() || 'I couldn’t find an answer to that yet.';
        ans.sources = (c?.groundingMetadata?.groundingChunks || []).map((g) => g.web).filter(Boolean);
        if (!tools && searchErr) { ans.note = 'Web search was unavailable for this answer.'; if (/not supported|not enabled|permission/i.test(searchErr)) S.noSearch = true; }
        ans.pending = false; render(); return;
      } catch (e) { err = e.message; }
    }
  }
  ans.pending = false; ans.text = /API key/i.test(err) ? 'Your Gemini key looks invalid. Check it in Settings.' : /quota|429|exhaust/i.test(err) ? 'The free AI limit is used up for now. Try again in a minute.' : 'Could not reach the AI right now (' + err.slice(0, 120) + '). Check your internet and try again.';
  render();
}
// full story text for "Ask about this", so answers stay on the right story
async function storyContext(s) {
  let text = '';
  try {
    const html = await Promise.race([articleHtml(s.link, s.title), new Promise((r) => setTimeout(() => r(''), 9000))]);
    text = new DOMParser().parseFromString(html || '', 'text/html').body.textContent.replace(/\s+/g, ' ').trim().slice(0, 6000);
  } catch {}
  return `STORY
Headline: ${s.headline || s.title}
Section: ${secMeta(s.section).name}
Reported by: ${s.sources.map((x) => x.name).join(', ')}
Published: ${new Date(s.time).toLocaleString('en-IN')}
Summary: ${s.summary || ''}
Link: ${s.link}
Article text: ${text || '(not available, use the summary and search the web)'}`;
}

// ---------- settings ----------
function viewSettings() {
  const st = S.settings;
  return `${backBar()}<h1 class="h1 mt8">Settings</h1>
  <div class="field"><label for="nm">Your name</label><input class="inp" id="nm" data-set="name" value="${esc(st.name)}" placeholder="Your name"></div>
  <div class="sec-head"><span class="h2">Look</span></div>
  <div class="themes">${[['paper', 'Newsprint', '#F4EFE4', '#1B1915', '#1B1915'], ['light', 'Light', '#F7F5F0', '#16171B', '#E6E2D9'], ['sepia', 'Sepia', '#F4ECDD', '#2B2217', '#E3D6BE'], ['dark', 'Dark', '#0D0E12', '#F4F2EE', '#23262E'], ['midnight', 'Midnight', '#0B1220', '#EEF2FA', '#233050']].map(([id, name, bg, fg, ln]) => `<button class="thm ${st.theme === id ? 'on' : ''}" data-act="settheme" data-v="${id}" style="background:${bg};color:${fg};box-shadow:inset 0 0 0 1px ${ln}"><b style="font-size:14px">${name}</b><i style="background:${fg};opacity:.85;width:70%"></i><i style="background:${fg};opacity:.35;width:90%"></i><i style="background:var(--accent);width:40%"></i></button>`).join('')}</div>
  <div class="small muted mt16">Accent colour</div>
  <div class="accents">${[['saffron', '#E8650A', 'Saffron'], ['ocean', '#1F6FD1', 'Ocean'], ['emerald', '#0E8A5F', 'Emerald'], ['violet', '#6D4AD8', 'Violet'], ['rose', '#D6336C', 'Rose']].map(([id, col, name]) => `<button class="acc ${(st.accent || 'saffron') === id ? 'on' : ''}" data-act="setaccent" data-v="${id}" style="background:${col}" aria-label="${name}">${(st.accent || 'saffron') === id ? ic('check', 18, 3) : ''}</button>`).join('')}</div>
  <div class="sec-head"><span class="h2">Sections on Home</span></div>
  ${DEFAULT_SECTIONS.map((id) => `<div class="toggle"><span>${esc(secMeta(id).name)}</span><button class="sw ${st.sections.includes(id) ? 'on' : ''}" data-act="sec" data-id="${id}" aria-label="${esc(secMeta(id).name)}" aria-pressed="${st.sections.includes(id)}"></button></div>`).join('')}
  <div class="sec-head"><span class="h2">Simple language</span></div>
  <div class="toggle"><span class="col"><span>Rewrite news in simple words</span><span class="xs muted">${st.key ? 'Uses your Gemini key, a few stories at a time' : 'Add your Gemini key below to turn this on'}</span></span><button class="sw ${st.simple !== false ? 'on' : ''}" data-act="simple" aria-label="Simple language" aria-pressed="${st.simple !== false}"></button></div>
  <div class="row gap8 mt12">${[['en', 'Simple English'], ['hinglish', 'Hinglish'], ['hi', 'हिंदी']].map(([id, l]) => `<button class="chip" data-act="lang" data-v="${id}" style="flex:1;justify-content:center;height:40px;${(st.lang || 'en') === id ? 'background:var(--accent-soft);color:var(--accent-text);border-color:var(--accent);font-weight:600' : ''}">${l}</button>`).join('')}</div>
  <div class="sec-head"><span class="h2">Ask Drishti (AI)</span></div>
  <div class="field"><label for="ky">Gemini API key ${st.key ? '<b style="color:var(--ok)">Saved</b>' : ''}</label><input class="inp" id="ky" data-set="key" value="${esc(st.key)}" placeholder="Paste key from aistudio.google.com/apikey" autocomplete="off" type="password"></div>
  <div class="field"><label for="md">AI model</label><input class="inp" id="md" data-set="model" value="${esc(st.model)}"></div>
  <div class="sec-head"><span class="h2">Morning brief and breaking alerts</span></div>
  <div class="card small" style="line-height:1.6">Drishti sends a 7 am brief and alerts for major breaking news through the free <b>ntfy</b> app.<br>1. Install <b>ntfy</b> from the Play Store.<br>2. Tap + and subscribe to your Drishti topic (the name saved as NTFY_TOPIC in your GitHub repo settings).<br>That’s it. Alerts arrive even when Drishti is closed.</div>
  ${S.installEvt ? `<button class="btn btn-acc mt16" style="width:100%" data-act="install">${ic('home', 18)} Install Drishti on this phone</button>` : `<p class="note">To install: open the browser menu and choose “Add to Home screen” or “Install app”.</p>`}
  <button class="btn btn-line mt12" style="width:100%" data-act="clearread">Reset read history</button>
  <p class="note">News from ${S.news?.stats?.ok || 0} trusted feeds, refreshed every 30 minutes. Weather by Open-Meteo. Markets by Yahoo Finance. Drishti is for information and education, not financial advice.</p>`;
}

// ---------- weather sheet ----------
function weatherSheet() {
  const w = S.weather; if (!w?.w) return;
  const c = w.w.current, h = w.w.hourly, d = w.w.daily; const [lab, icn] = WMO(c.weather_code, c.is_day);
  const nowI = h.time.findIndex((t) => new Date(t).getTime() > Date.now() - 36e5);
  const hrs = h.time.slice(nowI, nowI + 24).map((t, i) => { const k = nowI + i; return `<div class="hr"><span class="muted">${i ? new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric' }) : 'Now'}</span><span style="color:var(--accent-text)">${ic(WMO(h.weather_code[k], h.is_day[k])[1], 20)}</span><b>${Math.round(h.temperature_2m[k])}°</b>${(h.precipitation_probability[k] ?? 0) >= 10 ? `<span style="color:#5BA4F5">${ic('drop', 10)}${h.precipitation_probability[k]}%</span>` : ''}</div>`; }).join('');
  const days = d.time.map((t, i) => `<div class="row" style="padding:9px 0;border-bottom:1px solid var(--line)"><span style="width:56px" class="small">${i ? new Date(t).toLocaleDateString('en-IN', { weekday: 'short' }) : 'Today'}</span><span style="color:var(--accent-text)">${ic(WMO(d.weather_code[i])[1], 18)}</span><span class="xs" style="color:#5BA4F5;width:44px">${(d.precipitation_probability_max[i] ?? 0) >= 10 ? d.precipitation_probability_max[i] + '%' : ''}</span><span class="grow"></span><span class="small muted">${Math.round(d.temperature_2m_min[i])}°</span><span style="width:60px;height:4px;border-radius:2px;background:linear-gradient(90deg,#5BA4F5,#FF7A1A)"></span><span class="small" style="font-weight:600">${Math.round(d.temperature_2m_max[i])}°</span></div>`).join('');
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-label="Weather"><div class="row sp"><span class="row gap6 small muted">${ic('pin', 14, 2)}${esc(w.loc.name)}${w.loc.city && w.loc.city !== w.loc.name ? ', ' + esc(w.loc.city) : ''}</span><button class="ibtn" data-close aria-label="Close">${ic('x')}</button></div>
  <div class="row gap12 mt8"><span style="color:var(--accent-text)">${ic(icn, 52, 1.5)}</span><div class="col"><span style="font-size:48px;font-weight:600;letter-spacing:-2px;line-height:1">${Math.round(c.temperature_2m)}°</span><span class="small muted">${lab} · feels like ${Math.round(c.apparent_temperature)}°</span></div></div>
  <div class="grid3 mt16"><div class="mtile"><span class="xs muted">${ic('drop', 12)} Humidity</span><span class="v">${c.relative_humidity_2m}%</span></div><div class="mtile"><span class="xs muted">${ic('wind', 12)} Wind</span><span class="v">${Math.round(c.wind_speed_10m)} <span class="xs">km/h</span></span></div><div class="mtile"><span class="xs muted">AQI</span><span class="v" style="color:${aqiColor(w.aqi)}">${w.aqi ?? '–'}</span><span class="xs" style="color:${aqiColor(w.aqi)}">${aqiLabel(w.aqi)}</span></div></div>
  ${w.aqi != null ? `<p class="xs muted" style="margin:8px 0 0">India AQI (CPCB scale), 24-hour average · PM2.5 ${Math.round(w.pm25 ?? 0)} · PM10 ${Math.round(w.pm10 ?? 0)} µg/m³</p>` : ''}
  ${w.aqi > 200 ? `<div class="fc mt12">${ic('alert', 18, 2)}<span>Air quality is poor. Wear an N95 mask outdoors and avoid outdoor exercise today.</span></div>` : w.aqi > 100 ? `<div class="fc mt12" style="background:var(--warn-bg);color:var(--warn)">${ic('alert', 18, 2)}<span>Moderate air. Children, elders and people with asthma should limit long outdoor activity.</span></div>` : ''}
  ${(d.precipitation_probability_max[0] ?? 0) >= 60 ? `<div class="fc mt12" style="background:#13233F;color:#9DB8F5">${ic('rain', 18, 2)}<span>High chance of rain today. Carry an umbrella and check local train updates.</span></div>` : ''}
  <div class="sec-head" style="margin-top:18px"><span class="h2" style="font-size:17px">Next 24 hours</span></div><div class="hrs">${hrs}</div>
  <div class="sec-head" style="margin-top:18px"><span class="h2" style="font-size:17px">7 days</span><span class="xs muted">UV max ${Math.round(d.uv_index_max[0])}</span></div>${days}
  <div class="row sp small muted mt12"><span>${ic('sunrise', 14)} Sunrise ${new Date(d.sunrise[0]).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span><span>Sunset ${new Date(d.sunset[0]).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span></div>
  <button class="btn btn-line mt16" style="width:100%" data-act="relocate">${ic('pin', 16)} Update my location</button></div>`;
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) bg.remove(); });
  document.body.appendChild(bg);
}

// ---------- newspaper edition ----------
const SEC_NAMES = { mumbai: 'Mumbai', india: 'India', world: 'World', markets: 'Markets', money: 'Money and SIP', gold: 'Gold and bullion', bollywood: 'Bollywood', movies: 'Movies', viral: 'Viral', phones: 'Phones', gadgets: 'Technology', health: 'Health', sports: 'Sports', knowledge: 'Knowledge', events: 'Things to do', spiritual: 'Spiritual' };
const secName = (id) => SEC_NAMES[id] || secMeta(id).short;
const srcLine = (s, k = 3) => `${s.n > 1 ? `<b class="okc">${s.n} sources</b> · ` : ''}${esc(s.sources.slice(0, k).map((x) => x.name).join(', '))} · ${ago(s.time)}`;
const NP_TABS = [['#front', 'Front page'], ['#paper', 'Today’s Paper'], ['#section/mumbai', 'Mumbai'], ['#section/india', 'India'], ['#section/world', 'World'], ['#markets', 'Markets'], ['#markets/bullion', 'Bullion'], ['#section/bollywood', 'Bollywood'], ['#section/sports', 'Sports'], ['#section/gadgets', 'Tech'], ['#section/health', 'Health'], ['#sections', 'All sections']];
const npTabs = (on) => { setTimeout(() => $('#nptabs .on')?.scrollIntoView({ inline: 'center', block: 'nearest' }), 0); return `<nav class="np-tabs" id="nptabs">${NP_TABS.map(([h, l]) => `<a href="${h}" class="${h === on ? 'on' : ''}">${l}</a>`).join('')}</nav>`; };
const wxShort = () => { const w = S.weather; if (!w?.w?.current) return '<span></span>'; return `<button data-act="weather" class="np-wx">${Math.round(w.w.current.temperature_2m)}° ${esc(w.loc.name)}${w.aqi != null ? ` · <span style="color:${aqiColor(w.aqi)}">AQI ${w.aqi}</span>` : ''}</button>`; };
const npDate = () => new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const npTop = () => `<div class="np-meta"><span>${npDate()}</span>${wxShort()}<span class="row" style="gap:0"><a class="np-ib" href="#search" aria-label="Search">${ic('search', 18)}</a><a class="np-ib" href="#settings" aria-label="Settings">${ic('settings', 18)}</a></span></div>`;
const npBack = (label, href) => `<div class="np-bar"><a href="${href}" class="row" style="gap:2px">${ic('back', 18, 2)}${esc(label)}</a></div>`;
const npRow = (s, kick) => `<a class="np-row" href="#read/${s.id}"><div class="grow"><div class="kick">${kick}</div><div class="hl3" data-sh="${s.id}">${esc(H(s))}</div><div class="np-m">${srcLine(s, 2)}</div></div>${s.image ? `<div class="np-th">${img(s, 84)}</div>` : ''}</a>`;
const npLead = (s, kick, big = true) => `<a class="np-lead" href="#read/${s.id}">${kick ? `<div class="kick red">${kick}</div>` : ''}<h2 class="${big ? 'hl1' : 'hl2'}" data-sh="${s.id}">${esc(H(s))}</h2>${s.image ? `<div class="np-img">${img(s, 220, true)}</div>` : ''}<p class="np-p" data-ss="${s.id}">${esc(T(s))}</p><div class="np-m">${srcLine(s)}</div></a>`;
const npBrief = (s) => `<a class="np-brief" href="#read/${s.id}"><div class="hl3" data-sh="${s.id}">${esc(H(s))}</div><p class="np-p sm clamp3" data-ss="${s.id}">${esc(T(s))}</p><div class="np-m">${srcLine(s, 2)}</div></a>`;
const PLACE = { mumbai: ['Mumbai'], india: ['India'], world: ['World'], markets: ['Business'], money: ['Business'], gold: ['Business'], sports: ['Sports'], bollywood: ['Entertainment'], movies: ['Entertainment'] };
const todayPapers = () => PAPERS.list.filter((p) => p.day === today());
const paperStories = (places) => todayPapers().flatMap((p) => p.stories.filter((x) => !places || places.includes(x.place)).map((x) => ({ ...x, pid: p.id, paper: p.name, read: (p.readIds || []).includes(x.id) })));
const pRow = (x) => `<a class="np-row" href="#pstory/${x.id}"><div class="grow"><div class="kick red">In your paper · ${esc(x.paper)} p${x.pg + 1}</div><div class="hl3">${esc(x.h)}</div><div class="np-m">${esc(x.s)}</div></div></a>`;

function frontList() {
  const n = S.news; const out = [];
  for (const id of [...(n.front || []), ...briefIds(), ...n.mustKnow]) { const s = S.byId[id]; if (s && !out.includes(s)) out.push(s); }
  return out;
}
const Q = () => S.markets?.quotes || {};
const rs = (v) => '₹' + Math.round(v).toLocaleString('en-IN');
const pctC = (p) => p == null || isNaN(p) ? '' : `<span class="${p >= 0 ? 'up' : 'down'}">${pct(p)}</span>`;
function ticker() {
  const q = Q(); const cell = (k, l, f) => q[k] ? `<a href="#markets" class="tk"><span>${l}</span><b>${f(q[k].price)}</b>${pctC(q[k].pct)}</a>` : '';
  const cells = [cell('sensex', 'Sensex', (v) => num(v)), cell('nifty', 'Nifty', (v) => num(v)), cell('usdinr', 'US Dollar', (v) => '₹' + num(v)), cell('gold', 'Gold 24K/10g', rs), cell('silver', 'Silver/kg', rs), cell('brent', 'Brent crude', (v) => '$' + num(v))].filter(Boolean);
  return cells.length ? `<div class="ticker">${cells.join('')}</div>` : '';
}

function viewFront() {
  const n = S.news;
  const upd = n ? new Date(n.updated).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
  const head = `${npTop()}<div class="mast"><h1>Drishti</h1></div><div class="rule2"></div><div class="np-meta2"><span>Mumbai edition</span><button data-act="refresh" class="row" style="gap:4px">Updated ${upd} ${ic('refresh', 13)}</button><span class="okc">● Live</span></div>${npTabs('#front')}`;
  if (!n) return head + '<div class="empty">Fetching today’s news…</div>';
  const used = new Set(); const use = (s) => { if (s) used.add(s.id); return s; };
  const fresh = frontList().filter((s) => !S.read.has(s.id));
  const brk = use(fresh.find((s) => (s.breaking && s.n >= 3) || (s.rank != null && s.rank < 3 && s.n >= 2 && Date.now() - s.first < 4 * 3.6e6)));
  const lead = use(fresh.find((s) => !used.has(s.id) && (s.summary || '').length > 80));
  const tops = fresh.filter((s) => !used.has(s.id)).slice(0, 5).map(use);
  const pick = (id, k) => unread(secStories(id)).filter((s) => !used.has(s.id)).slice(0, k).map(use);
  const mum = pick('mumbai', 3), ind = pick('india', 3), wor = pick('world', 3);
  const money = [...pick('markets', 2), ...pick('money', 1), ...pick('gold', 1)].sort((a, b) => b.score - a.score).slice(0, 3);
  const also = ['bollywood', 'sports', 'gadgets', 'health', 'movies', 'phones'].map((id) => [id, pick(id, 1)[0]]).filter(([, s]) => s);
  const pap = paperStories().filter((x) => !x.read).sort((a, b) => b.imp - a.imp || a.pg - b.pg).slice(0, 4);
  const col = (title, href, list) => list.length ? `<div class="np-col"><a class="kick ink" href="${href}">${title} ›</a>${list.map((s, i) => i === 0 ? `<div class="hl3 big" data-sh="${s.id}"><a href="#read/${s.id}">${esc(H(s))}</a></div><p class="np-p sm clamp3" data-ss="${s.id}">${esc(T(s))}</p><div class="np-m">${srcLine(s, 1)}</div>` : `<div class="thin"></div><a class="hl4" href="#read/${s.id}" data-sh="${s.id}">${esc(H(s))}</a><div class="np-m">${srcLine(s, 1)}</div>`).join('')}</div>` : '';
  const block = (title, href, html) => html ? `<div class="rule1"></div><div class="np-sec"><a class="np-st" href="${href}">${title}<span>›</span></a>${html}</div>` : '';
  const inside = DEFAULT_SECTIONS.map((id) => [id, unread(secStories(id)).length]).filter(([, c]) => c).map(([id, c]) => `<a class="np-idx" href="${id === 'events' ? '#todo' : '#section/' + id}"><span>${esc(secName(id))}</span><span class="np-m">${c} new</span></a>`).join('');
  const th = THOUGHTS[dayIndex() % THOUGHTS.length];
  return `${head}
  ${brk ? `<a class="brk" href="#read/${brk.id}"><span class="brk-t">Breaking</span><span data-sh="${brk.id}">${esc(H(brk))}</span></a>` : ''}
  ${ticker()}
  ${lead ? `<div class="np-sec">${npLead(lead, `${esc(secName(lead.section))} · Lead story`)}</div>` : `<div class="caught mt16">${ic('check', 20, 2.4)}You’ve read today’s top stories</div>`}
  ${block('Top stories', '#quick', tops.map(npBrief).join(''))}
  ${mum.length || ind.length ? `<div class="rule1"></div><div class="np-2col">${col('Mumbai', '#section/mumbai', mum)}${col('India', '#section/india', ind)}</div>` : ''}
  ${block('World', '#section/world', wor.map(npBrief).join(''))}
  ${block('From today’s paper', '#paper', pap.length ? pap.map(pRow).join('') : `<a class="np-invite" href="#paper">${ic('book', 22)}<span class="grow"><b>Add today’s newspaper</b><span class="np-m">Upload the e-paper PDF or photos, and read it here page by page.</span></span>${ic('chev', 18)}</a>`)}
  ${block('Money', '#markets', money.map(npBrief).join(''))}
  ${also.length ? `<div class="rule1"></div><div class="np-sec"><div class="np-st">Also today</div><div class="np-grid">${also.map(([id, s]) => `<a href="#read/${s.id}" class="np-cell"><div class="kick">${esc(secName(id))}</div><div class="hl4" data-sh="${s.id}">${esc(H(s))}</div></a>`).join('')}</div></div>` : ''}
  <div class="rule2 mt20"></div>
  <div class="np-sec"><div class="np-st">Inside today</div>${inside}<a class="np-idx" href="#paper"><span>Today’s Paper</span><span class="np-m">${todayPapers().length ? paperStories().length + ' stories' : 'Add'}</span></a></div>
  <div class="np-quote"><p>${esc(th[0])}</p><span class="np-m">— ${esc(th[1])}</span></div>
  <div class="np-foot">Checked ${n.stats?.ok || ''} trusted sources · refreshes every 15 minutes · <a href="#history">Read history</a></div>`;
}

function npSection(id) {
  if (!S.news) return `${npTop()}<div class="empty">Loading…</div>`;
  const all = secStories(id); const list = unread(all); const readN = all.length - list.length;
  const pap = PLACE[id] ? paperStories(PLACE[id]).filter((x) => !x.read).sort((a, b) => b.imp - a.imp) : [];
  let extra = '';
  if (id === 'spiritual') { const th = THOUGHTS[dayIndex() % THOUGHTS.length]; extra = `<div class="np-quote"><div class="kick">Thought of the day</div><p>${esc(th[0])}</p><span class="np-m">— ${esc(th[1])}</span></div>`; }
  if (id === 'health') { const tp = TIPS[dayIndex() % TIPS.length]; extra = `<div class="np-quote"><div class="kick">Today’s self-care</div><p>${esc(tp[0])}</p><span class="np-m">${esc(tp[1])}</span></div>`; }
  if (['gold', 'markets', 'money'].includes(id)) extra = ticker();
  const on = NP_TABS.some(([h]) => h === '#section/' + id) ? '#section/' + id : '#sections';
  return `${npTop()}<div class="mast sm"><h1>${esc(secName(id))}</h1><div class="np-m">${list.length} new stories${pap.length ? ` · ${pap.length} from your paper` : ''} · updated ${ago(S.news.updated)} ago</div></div>${npTabs(on)}
  ${extra}
  ${list[0] ? `<div class="np-sec">${npLead(list[0], esc(list[0].sources[0]?.name || ''))}</div>` : `<div class="caught mt16">${ic('check', 20, 2.4)}All caught up in ${esc(secName(id))}</div>`}
  ${pap.length ? `<div class="rule1"></div><div class="np-sec">${pap.slice(0, 6).map(pRow).join('')}</div>` : ''}
  ${list.length > 1 ? `<div class="rule1"></div><div class="np-sec">${list.slice(1, 40).map((s) => npRow(s, esc(s.sources[0]?.name || ''))).join('')}</div>` : ''}
  ${list.length > 2 ? `<a class="np-invite" href="#quick/${id}">${ic('bolt', 20)}<span class="grow"><b>Swipe through ${esc(secName(id))}</b><span class="np-m">One story a screen, 60 words each</span></span>${ic('chev', 18)}</a>` : ''}
  ${readN ? `<a class="np-invite" href="#history">${ic('history', 20)}<span class="grow">${readN} stories you’ve read are in Read history</span>${ic('chev', 18)}</a>` : ''}`;
}

function npSections() {
  const n = S.news;
  const rows = DEFAULT_SECTIONS.map((id) => { const l = unread(secStories(id)); return `<a class="np-idx tall" href="${id === 'events' ? '#todo' : '#section/' + id}"><span class="col grow" style="gap:2px"><b class="hl4">${esc(secName(id))}</b>${l[0] ? `<span class="np-m clamp1">${esc(H(l[0]))}</span>` : ''}</span><span class="np-m">${l.length || ''}</span></a>`; }).join('');
  const tool = (href, icon, t, sub) => `<a class="np-idx tall" href="${href}"><span class="row grow" style="gap:12px">${ic(icon, 20)}<span class="col" style="gap:1px"><b>${t}</b><span class="np-m">${sub}</span></span></span>${ic('chev', 16)}</a>`;
  return `${npTop()}<div class="mast sm"><h1>Sections</h1><div class="np-m">${n?.stories?.length || 0} stories from ${n?.stats?.ok || 0} trusted sources</div></div>${npTabs('#sections')}
  <a class="np-search" href="#search">${ic('search', 18)}<span>Search all news</span></a>
  <div class="np-sec">${rows}</div>
  <div class="rule1"></div><div class="np-sec"><div class="np-st">Your reading</div>
  ${tool('#quick', 'bolt', 'Quick 60', 'Swipe the day’s news, 60 words a story')}
  ${tool('#history', 'history', 'Read history', S.history.length + ' read')}
  ${tool('#saved', 'bookmark', 'Saved', S.saved.length + ' stories')}
  ${tool('#grow', 'target', 'Grow your money', 'Calculators, SIP planner and guide')}
  ${tool('#factchecks', 'alert', 'Fake news busted', (n?.factChecks?.length || 0) + ' fact-checks')}
  ${n?.videos?.length ? tool('#videos', 'play', 'Trending videos', 'YouTube India') : ''}
  ${tool('#settings', 'settings', 'Settings', 'Look, sections, language, AI key')}</div>`;
}

// ---------- markets ----------
function marketLine(q) {
  const parts = [];
  if (q.sensex) parts.push(`Sensex ${q.sensex.pct >= 0 ? 'up' : 'down'} ${Math.abs(q.sensex.pct).toFixed(2)}% at ${num(q.sensex.price, 0)}`);
  if (q.gold?.pct != null) parts.push(`gold ${q.gold.pct >= 0 ? 'up' : 'down'} at ${rs(q.gold.price)} for 10g`);
  if (q.usdinr) parts.push(`dollar at ₹${num(q.usdinr.price)}`);
  if (q.brent) parts.push(`crude at $${num(q.brent.price)}`);
  const t = parts.join(', '); return t ? t[0].toUpperCase() + t.slice(1) + '.' : '';
}
function npMarkets(tab = 'all') {
  const mk = S.markets; const q = Q(); const [st, open] = marketStatus();
  const tabs = [['all', 'All'], ['stocks', 'Stocks'], ['bullion', 'Bullion'], ['currency', 'Currency'], ['commodities', 'Commodities']];
  const head = `${npTop()}<div class="mast sm"><h1>Markets</h1><div class="np-m"><span style="color:${open ? 'var(--up)' : 'var(--muted)'}">●</span> ${st}${mk ? ' · updated ' + ago(mk.updated) + ' ago' : ''}</div></div><nav class="np-tabs">${tabs.map(([k, l]) => `<a href="#markets/${k}" class="${tab === k ? 'on' : ''}">${l}</a>`).join('')}<a href="#grow">Plan &amp; SIP</a></nav>`;
  if (!mk) return head + '<div class="empty">Loading markets…</div>';
  const row = (k, label, sub, f) => q[k] ? `<tr><td>${label}${sub ? `<div class="np-m">${sub}</div>` : ''}</td><td class="r b">${f(q[k].price)}</td><td class="r w">${pctC(q[k].pct)}</td></tr>` : '';
  const tbl = (title, note, rows) => { const r = rows.join(''); return r ? `<div class="np-tt"><span>${title}</span><span class="np-m">${note || ''}</span></div><table class="np-tbl">${r}</table>` : ''; };
  const n0 = (v) => num(v, 2), d2 = (v) => '$' + num(v), r2 = (v) => '₹' + num(v);
  const idx = tbl('Indian indices', '', [row('sensex', 'Sensex', '', n0), row('nifty', 'Nifty 50', '', n0), row('bank', 'Bank Nifty', '', n0), row('it', 'Nifty IT', '', n0)]);
  const bull = tbl('Bullion', 'Mumbai, incl. duty + GST', [row('gold', 'Gold 24K', 'per 10 g', rs), row('gold22', 'Gold 22K', 'per 10 g', rs), row('silver', 'Silver', 'per kg', rs), row('goldusd', 'Gold (global)', 'per ounce', d2), row('silverusd', 'Silver (global)', 'per ounce', d2)]);
  const cur = tbl('Currency', '₹ for 1 unit', [row('usdinr', 'US Dollar', 'USD', r2), row('eurinr', 'Euro', 'EUR', r2), row('gbpinr', 'British Pound', 'GBP', r2), row('aedinr', 'UAE Dirham', 'AED', r2)]);
  const com = tbl('Commodities', '', [row('brent', 'Brent crude', 'per barrel', d2), row('wti', 'WTI crude', 'per barrel', d2), row('natgas', 'Natural gas', 'per mmBtu', d2), row('copper', 'Copper', 'per pound', d2)]);
  const wld = tbl('World', '', [row('dow', 'Dow Jones', 'US', n0), row('nasdaq', 'Nasdaq', 'US', n0), row('btc', 'Bitcoin', 'USD', (v) => '$' + num(v, 0))]);
  const nf = q.nifty; const series = mk.nifty?.[S.range] || []; const rp = S.range === '1D' ? nf?.pct : S.range === '1M' ? mk.nifty['1Mpct'] : mk.nifty['1Ypct'];
  const chart = nf ? `<div class="np-chart"><div class="row sp"><b>Nifty 50 · ${num(nf.price)}</b><span class="row" style="gap:2px">${['1D', '1M', '1Y'].map((r) => `<button data-act="range" data-r="${r}" class="rg ${S.range === r ? 'on' : ''}">${r}</button>`).join('')}</span></div>${pctC(rp)}${spark(series, 300, 90, rp >= 0 ? 'var(--up)' : 'var(--down)')}</div>` : '';
  const mv = (list) => list.map((r) => `<tr><td>${esc(r.name)}</td><td class="r b">₹${num(r.price)}</td><td class="r w">${pctC(r.pct)}</td></tr>`).join('');
  const movers = mk.movers?.gainers?.length ? `<div class="np-tt"><span>Top gainers</span><span class="np-m">${mk.breadth ? `${mk.breadth.up} up · ${mk.breadth.down} down` : ''}</span></div><table class="np-tbl">${mv(mk.movers.gainers)}</table><div class="np-tt"><span>Top losers</span></div><table class="np-tbl">${mv(mk.movers.losers)}</table>` : '';
  const news = (ids) => ids.flatMap((id) => unread(secStories(id)).slice(0, 4)).sort((a, b) => b.score - a.score).slice(0, 6);
  const newsBlock = (list) => list.length ? `<div class="np-tt"><span>In the news</span></div>${list.map((s) => npRow(s, esc(secName(s.section)))).join('')}` : '';
  const line = marketLine(q);
  const body = {
    all: `${line ? `<div class="np-box"><div class="kick ink">Today in one line</div><p>${esc(line)}</p></div>` : ''}${idx}${bull}${cur}${com}${wld}${newsBlock(news(['markets', 'money', 'gold']))}`,
    stocks: `${chart}${idx}${movers}${wld}${newsBlock(news(['markets', 'money']))}`,
    bullion: `${bull}<p class="np-note">Indicative rates from the international price, rupee, 6% import duty and 3% GST. Your jeweller’s rate will differ slightly, and making charges are extra.</p>${newsBlock(news(['gold']))}`,
    currency: `${cur}<p class="np-note">Rates are market rates; banks and money changers add their margin.</p>`,
    commodities: `${com}${newsBlock(news(['markets']).filter((s) => /crude|oil|gas|copper|commodit|metal|opec/i.test(s.title)))}`
  }[tab] || '';
  return `${head}<div class="np-sec">${body}<a class="np-invite" href="#grow">${ic('target', 20)}<span class="grow"><b>Plan your investments</b><span class="np-m">Goal planner, SIP and 11 calculators</span></span>${ic('chev', 18)}</a><p class="np-note">Market data from Yahoo Finance, may be delayed. News and education only, not investment advice.</p></div>`;
}

// ---------- today's paper ----------
let paperRender = 0;
const paperUpdate = () => { const [r] = route(); if (['paper', 'pdoc', 'page', 'front', 'home', ''].includes(r)) { clearTimeout(paperRender); paperRender = setTimeout(() => { const y = window.scrollY; render(); window.scrollTo(0, y); }, 250); } };
function paperStatus(p) {
  if (p.status === 'loading') return `<span class="np-m">Opening the file…</span>`;
  const done = p.readPages.length;
  const tot = p.total || p.pages; const en = (p.enriched || []).length;
  if ((isBusy(p) || p.status === 'reading') && done < tot) return `<span class="redc b sm">Reading page ${Math.min(done + 1, tot)} of ${tot} · ${p.stories.length} stories so far</span><div class="pbar"><i style="width:${Math.round((done / Math.max(1, tot)) * 100)}%"></i></div>`;
  if (isBusy(p) && en < tot) return `<span class="okc b sm">Ready to read · ${p.stories.length} stories</span><span class="np-m" style="display:block">Adding simple summaries… ${en} of ${tot} pages</span>`;
  if (p.status === 'paused') return `<span class="redc sm">${esc(p.error || 'Paused')}</span><button class="np-btn mt8" data-act="presume" data-id="${p.id}">Continue reading (${done} of ${p.pages} pages done)</button>`;
  const r = (p.readIds || []).length;
  return `<span class="okc b sm">Ready · ${p.stories.length} stories${r ? ` · ${r} read` : ''}</span>`;
}
function viewPaper() {
  const key = !!S.settings.key;
  const up = `<div class="np-up">${ic('book', 34, 1.4)}<h3>Add today’s newspaper</h3><p class="np-m">E-paper PDF works best: it’s ready to read in seconds</p><div class="grid2 mt12"><label class="np-btn solid">Upload PDF<input type="file" accept="application/pdf,.pdf" data-upload="1" hidden></label><label class="np-btn">Photos of pages<input type="file" accept="image/*" multiple data-upload="1" hidden></label></div><p class="np-m mt8">${key ? 'For photos, select all pages together, in page order.' : 'Photos of pages and simple summaries need your free Gemini key. <a href="#settings" style="text-decoration:underline">Add it in Settings</a>.'}</p></div>`;
  const list = PAPERS.list.map((p) => `<div class="np-paper"><a href="#pdoc/${p.id}" class="np-pthumb"><img data-pimg="${p.id}:0" alt=""></a><div class="grow col" style="gap:3px"><a href="#pdoc/${p.id}" class="hl4">${esc(p.name)}</a><span class="np-m">${p.day === today() ? 'Today' : new Date(p.at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${p.pages} pages</span>${paperStatus(p)}</div><button class="np-ib" data-act="pdel" data-id="${p.id}" aria-label="Delete">${ic('x', 16)}</button></div>`).join('');
  return `${npTop()}<div class="mast sm"><h1>Today’s Paper</h1><div class="np-m">Read the newspaper you buy, page by page, right here</div></div>${npTabs('#paper')}
  <div class="np-sec">${up}</div>
  ${list ? `<div class="np-sec"><div class="np-st">This week</div>${list}</div>` : ''}
  <div class="np-sec"><div class="np-box"><div class="kick ink">How it works</div><p class="sm">1 · Each page is read and split into its stories.<br>2 · Read the real page, or tap a story for clean text and a simple explanation.<br>3 · Big stories from your paper also appear on the Front page and in their section, marked “In your paper”.<br>Papers are kept on this phone for 7 days.</p></div></div>`;
}
const PSECS = [['top', 'Top stories'], ['Mumbai', 'Mumbai'], ['India', 'India'], ['World', 'World'], ['Business', 'Business'], ['Sports', 'Sports'], ['Entertainment', 'Entertainment'], ['Opinion', 'Opinion'], ['Other', 'More']];
function viewPaperDoc(pid, sec) {
  const p = getPaper(pid); if (!p) return `${npBack('Today’s Paper', '#paper')}<div class="empty">This paper is no longer on this phone.</div>`;
  const read = p.readIds || []; const tot = p.total || p.pages;
  const placeOf = (x) => PSECS.some(([k]) => k === x.place) ? x.place : 'Other';
  const counts = {}; for (const x of p.stories) counts[placeOf(x)] = (counts[placeOf(x)] || 0) + 1;
  const unreadFirst = (a, b) => (read.includes(a.id) - read.includes(b.id)) || b.imp - a.imp || a.pg - b.pg;
  const tops = [...p.stories].filter((x) => x.imp >= 4 && x.place !== 'Opinion').sort(unreadFirst).slice(0, 12);
  sec = sec && (sec === 'top' || counts[sec]) ? decodeURIComponent(sec) : 'top';
  const list = sec === 'top' ? (tops.length ? tops : [...p.stories].sort(unreadFirst).slice(0, 12)) : p.stories.filter((x) => placeOf(x) === sec).sort(unreadFirst);
  const chips = PSECS.filter(([k]) => k === 'top' || counts[k]).map(([k, l]) => `<a href="#pdoc/${p.id}/${k}" class="${sec === k ? 'on' : ''}">${l}${k !== 'top' ? ` <em>${counts[k]}</em>` : ''}</a>`).join('');
  setTimeout(() => $('#psec .on')?.scrollIntoView({ inline: 'center', block: 'nearest' }), 0);
  const card = (x, i) => `<a class="ps-card ${read.includes(x.id) ? 'rd' : ''} ${i === 0 && !read.includes(x.id) ? 'lead' : ''}" href="#pstory/${x.id}"><div class="kick ${x.imp >= 5 ? 'red' : ''}">${sec === 'top' ? esc(placeOf(x) === 'Other' ? 'News' : placeOf(x)) + ' · ' : ''}Page ${x.pg + 1}${read.includes(x.id) ? ' · read' : ''}</div><div class="${i === 0 ? 'hl2' : 'hl3'}">${esc(x.h)}</div>${x.s ? `<p class="np-p sm ${i === 0 ? '' : 'clamp2'}">${esc(x.s)}</p>` : ''}</a>`;
  const pages = Array.from({ length: p.pages }, (_, i) => { const c = p.stories.filter((x) => x.pg === i).length; return `<a class="pd-pg" href="#page/${p.id}/${i}"><img data-pimg="${p.id}:${i}" alt=""><span><b>${i + 1}</b> ${esc(p.labels[i] || '')}</span><em>${p.readPages.includes(i) ? c + ' stories' : 'reading…'}</em></a>`; }).join('');
  return `${npBack('Today’s Paper', '#paper')}
  <div class="pd-head"><div class="col grow" style="gap:2px"><b class="pd-name">${esc(p.name)}</b><span class="np-m">${tot} pages · ${p.stories.length} stories${read.length ? ` · ${read.length} read` : ''}</span></div><a class="np-btn pd-open" href="#page/${p.id}/0">Pages</a></div>
  ${p.status !== 'ready' || isBusy(p) ? `<div class="mt8">${paperStatus(p)}</div>` : ''}
  <nav class="ps-tabs" id="psec">${chips}</nav>
  <div>${list.length ? list.map(card).join('') : '<div class="empty">No stories here yet.</div>'}</div>
  <div class="rule1 mt20"></div><div class="np-st mt8">Browse pages</div>
  <div class="pd-strip">${pages}</div>`;
}
function viewPage(pid, i) {
  const p = getPaper(pid); i = Number(i) || 0; if (!p) return `${npBack('Today’s Paper', '#paper')}<div class="empty">This paper is no longer on this phone.</div>`;
  const st = p.stories.filter((x) => x.pg === i); const read = p.readIds || [];
  const text = S.pmode !== 'page';
  const boxes = st.filter((x) => x.box && x.box[2] > x.box[0] && x.box[3] > x.box[1]).map((x) => `<a class="pbox ${read.includes(x.id) ? 'rd' : ''}" href="#pstory/${x.id}" aria-label="${esc(x.h)}" style="top:${x.box[0] / 10}%;left:${x.box[1] / 10}%;height:${(x.box[2] - x.box[0]) / 10}%;width:${(x.box[3] - x.box[1]) / 10}%"></a>`).join('');
  const strip = Array.from({ length: p.pages }, (_, k) => `<a href="#page/${pid}/${k}" class="${k === i ? 'on' : ''}"><img data-pimg="${pid}:${k}" alt=""><span>${k + 1}</span></a>`).join('');
  setTimeout(() => $('#pstrip .on')?.scrollIntoView({ inline: 'center', block: 'nearest' }), 50);
  return `<div class="np-bar sp"><a href="#pdoc/${pid}" class="row" style="gap:2px">${ic('back', 18, 2)}Pages</a><b class="sm">${esc(p.name)} · Page ${i + 1} of ${p.pages}</b><span></span></div>
  <div class="row" style="gap:6px;padding:8px 0"><button class="np-chip ${text ? 'on' : ''}" data-act="pmode" data-v="text">Stories</button><button class="np-chip ${text ? '' : 'on'}" data-act="pmode" data-v="page">Original page</button>${text ? '' : `<button class="np-chip" data-act="pzoom">${S.pzoom ? 'Fit to screen' : 'Zoom in'}</button>`}<span class="grow"></span>${i > 0 ? `<a class="np-chip" href="#page/${pid}/${i - 1}">‹</a>` : ''}${i < p.pages - 1 ? `<a class="np-chip" href="#page/${pid}/${i + 1}">›</a>` : ''}</div>
  ${text ? (st.length ? [...st].sort((a, b) => b.imp - a.imp).map((x) => `<a class="pg-story ${read.includes(x.id) ? 'rd' : ''}" href="#pstory/${x.id}"><div class="kick ${x.imp >= 5 ? 'red' : ''}">${esc(x.k || x.place || '')}${read.includes(x.id) ? ' · read' : ''}</div><div class="hl2">${esc(x.h)}</div><p class="np-p">${esc(x.s || '')}</p><span class="np-m">Read full story ›</span></a>`).join('') : `<div class="empty">${p.readPages.includes(i) ? 'No news stories found on this page.' : 'This page is still being read.'}</div>`) :
  `<div class="pp-wrap ${S.pzoom ? 'zoom' : ''}"><div class="pp"><img data-pimg="${pid}:${i}" alt="Page ${i + 1}">${boxes}</div></div><p class="np-m" style="text-align:center;margin:8px 0 0">${st.length ? 'Tap a story on the page to read it' : p.readPages.includes(i) ? 'No news stories found on this page' : 'Finding the stories on this page…'}</p>`}
  <div class="pstrip" id="pstrip">${strip}</div>
  ${!text && st.length ? `<div class="rule1"></div><div class="np-sec"><div class="np-st">On this page</div>${st.map((x) => `<a class="np-row" href="#pstory/${x.id}"><div class="grow"><div class="kick">${esc(x.k)}${read.includes(x.id) ? ' · read' : ''}</div><div class="hl3">${esc(x.h)}</div><div class="np-m">${esc(x.s)}</div></div></a>`).join('')}</div>` : ''}`;
}
const looksBroken = (b) => { const ps = (b || '').split(/\n{2,}/).filter(Boolean); const w = (b || '').split(/\s+/).length; return w < 110 || ps.filter((x) => x.split(/\s+/).length < 7).length >= 2; };
const paraHtml = (b) => (b || '').split(/\n{2,}/).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('');
const exHtml = (t) => t.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => /^(what happened|the background|background|why it matters( to you)?|what happens next|what next)\s*:?$/i.test(l.replace(/[*#]/g, '').trim()) ? `<div class="kick ink mt12">${esc(l.replace(/[*#:]/g, '').trim())}</div>` : `<p>${esc(l.replace(/^[-*•]\s*/, ''))}</p>`).join('');
function viewPStory(sid) {
  const pid = (sid || '').split('-')[0]; const p = getPaper(pid); const x = p?.stories.find((y) => y.id === sid);
  if (!x) return `${npBack('Today’s Paper', '#paper')}<div class="empty">This story is no longer on this phone.</div>`;
  markPaperRead(p, sid);
  const order = [...p.stories].sort((a, b) => a.pg - b.pg || b.imp - a.imp); const k = order.indexOf(x); const nx = order[k + 1];
  const key = S.settings.key;
  const fix = key && !x.fixed && (!x.b || looksBroken(x.b));
  // complete the text from the page picture when the PDF text came out broken or short
  if (fix) setTimeout(async () => { const box = $('#pbody'); if (!box) return; try { await ensureBody(p, x, key, true); x.fixed = 1; if ($('#pbody') === box) { box.innerHTML = paraHtml(x.b); $('#pfix')?.remove(); loadEx(); } } catch (e) { x.fixed = 1; $('#pfix')?.remove(); if (!x.b && $('#pbody') === box) box.innerHTML = `<p class="np-m">Could not get the full text right now. Try again in a minute.</p>`; } }, 0);
  const loadEx = async () => { const box = $('#pex'); if (!box || !key || !x.b) return; try { await explainStory(p, x, key); if ($('#pex') === box) box.innerHTML = `<div class="kick red">Explained</div>${exHtml(x.ex)}`; } catch { if ($('#pex') === box) box.innerHTML = `<button class="np-chip" data-act="pexplain" data-id="${sid}">${ic('sparkle', 14)} Explain this story in detail</button>`; } };
  if (!fix) setTimeout(loadEx, 0);
  const exBox = key ? `<div class="np-box simple" id="pex">${x.ex ? `<div class="kick red">Explained</div>${exHtml(x.ex)}` : `<div class="kick red">Explained</div><div class="col gap8 mt8">${[100, 92, 96, 70].map((w) => `<div class="skel" style="height:13px;width:${w}%"></div>`).join('')}</div>`}</div>` : (x.s ? `<div class="np-box simple"><div class="kick ink">In short</div><p>${esc(x.s)}</p></div>` : '');
  return `${npBack(p.labels[x.pg] ? `Page ${x.pg + 1} · ${p.labels[x.pg]}` : 'Page ' + (x.pg + 1), `#page/${pid}/${x.pg}`)}<div class="rule2"></div>
  <div class="kick red mt12">${esc(p.name)} · Page ${x.pg + 1}${x.k ? ' · ' + esc(x.k) : ''}</div>
  <h1 class="art-h">${esc(x.h)}</h1>
  ${x.w ? `<div class="art-ver"><span><b>For you:</b> ${esc(x.w)}</span></div>` : ''}
  ${exBox}
  <div class="np-st mt20">The full story</div>
  ${fix ? `<p class="np-m" id="pfix">Getting the complete text from the page…</p>` : ''}
  <div class="np-art dc" id="pbody">${x.b ? paraHtml(x.b) : `<div class="col gap8">${[100, 96, 98, 70, 100, 85].map((w) => `<div class="skel" style="height:14px;width:${w}%"></div>`).join('')}</div>`}</div>
  ${!key ? `<p class="np-note">Add your free Gemini key in Settings to get a detailed explanation and the complete text of every story.</p>` : ''}
  <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:16px"><button class="np-chip" data-act="askpaper" data-id="${sid}">${ic('sparkle', 14)} Ask a question</button><button class="np-chip" data-act="pshare" data-id="${sid}">${ic('share', 14)} Share</button></div>
  ${nx ? `<div class="rule1 mt20"></div><a class="np-row" href="#pstory/${nx.id}"><div class="grow"><div class="kick">Next story · page ${nx.pg + 1}</div><div class="hl3">${esc(nx.h)}</div><div class="np-m clamp2">${esc(nx.s || '')}</div></div>${ic('chev', 18)}</a>` : ''}`;
}
async function hydratePages() {
  for (const im of document.querySelectorAll('img[data-pimg]')) { if (im.src) continue; const [id, i] = im.dataset.pimg.split(':'); const u = await pageUrl(id, Number(i)); if (u) im.src = u; else im.style.visibility = 'hidden'; }
}

// ---------- Morning Edition: one finite, swipeable edition a day ----------
const edKey = () => { const d = new Date(Date.now() + 5.5 * 3.6e6); return d.toISOString().slice(0, 10) + (d.getUTCHours() < 15 ? '-m' : '-e'); };
const isMorning = () => edKey().endsWith('-m');
S.ed = LS.get('edition', null);
const saveEd = () => LS.set('edition', S.ed);
const ED_MIX = [['mumbai', 4], ['india', 4], ['world', 3], ['markets', 2], ['money', 1], ['gold', 1], ['sports', 1], ['bollywood', 1], ['gadgets', 1], ['health', 1], ['phones', 1], ['movies', 1]];
function buildEdition(force) {
  const n = S.news; if (!n) return null;
  const key = edKey();
  if (!force && S.ed?.key === key && S.ed.ids?.length) { S.ed.ids = S.ed.ids.filter((id) => id.startsWith('p') || S.byId[id] || id === 'money'); return S.ed; }
  const picked = []; const has = (s) => picked.includes(s);
  const per = {}; const cap = Object.fromEntries(ED_MIX);
  const add = (s) => { if (!s || has(s) || (s.summary || '').length < 80) return false; if (picked.some((x) => similar2(x.title, s.title))) return false; picked.push(s); per[s.section] = (per[s.section] || 0) + 1; return true; };
  // 1) the day's biggest stories (Google's editors' ranking + our must-know)
  for (const s of frontList()) { if (picked.length >= 7) break; if ((per[s.section] || 0) < (cap[s.section] || 1)) add(s); }
  // 2) fill each part of the paper you care about
  for (const [id, k] of ED_MIX) for (const s of secStories(id)) { if ((per[id] || 0) >= k || picked.length >= 18) break; add(s); }
  const ids = picked.slice(0, 18).sort((a, b) => edRank(b) - edRank(a)).map((s) => s.id);
  // 3) your newspaper's lead stories, if you uploaded today's paper
  const pap = paperStories().filter((x) => x.imp >= 5).slice(0, 2).map((x) => x.id);
  ids.splice(2, 0, ...pap);
  ids.splice(Math.min(6, ids.length), 0, 'money');
  S.ed = { key, ids, pos: 0, ai: {}, done: false, started: 0, quiz: null, lang: LANG() };
  saveEd(); return S.ed;
}
const edRank = (s) => s.score * (s.rank != null ? 2 - Math.min(s.rank, 30) / 30 : 1) * (s.n > 1 ? 1.2 : 1);
const words2 = (t) => new Set((t || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3));
function similar2(a, b) { const A = words2(a), B = words2(b); let c = 0; for (const w of A) if (B.has(w)) c++; return c / Math.max(1, Math.min(A.size, B.size)) >= 0.5; }
const edItem = (id) => id === 'money' ? { type: 'money' } : id.startsWith('p') ? (() => { const x = paperStories().find((y) => y.id === id); return x ? { type: 'paper', x } : null; })() : S.byId[id] ? { type: 'story', s: S.byId[id] } : null;
const edItems = () => (S.ed?.ids || []).map(edItem).filter(Boolean);
const sentences = (t) => (t || '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["’”]?(\s|$)/g)?.map((x) => x.trim()) || [t];
function edText(it) {
  if (it.type === 'paper') { const x = it.x; const ss = sentences(x.s || x.b); return { h: x.h, a: ss[0] || '', b: ss[1] || '', y: x.w || '', src: `${x.paper}, page ${x.pg + 1}`, sec: x.place || 'Paper' }; }
  const s = it.s; const ai = S.ed?.ai?.[s.id];
  if (ai) return { h: ai.h || H(s), a: ai.a, b: ai.b, y: ai.y, src: s.sources.slice(0, 2).map((x) => x.name).join(', ') + (s.n > 2 ? ` + ${s.n - 2}` : ''), sec: edSec(s) };
  const ss = sentences(T(s)); return { h: H(s), a: ss[0] || '', b: ss[1] || '', y: '', src: s.sources.slice(0, 2).map((x) => x.name).join(', ') + (s.n > 2 ? ` + ${s.n - 2}` : ''), sec: edSec(s) };
}
let edAiBusy = false;
async function edAi() {
  if (edAiBusy || !S.settings.key || !S.ed) return; const want = edItems().filter((it) => it.type === 'story' && !S.ed.ai[it.s.id]).map((it) => it.s); if (!want.length) return;
  edAiBusy = true;
  try {
    const out = await gem(`You are the editor of a friendly morning news app for a busy reader in Mumbai (Malad West, commutes to Andheri East, invests in SIPs and gold).
For each story write in ${LANG_NAME[LANG()]}:
"h": a clear headline, max 12 words, no clickbait;
"a" and "b": two short sentences that tell what happened and the key detail (max 22 words each);
"y": one line on what it means for this reader in Mumbai, only if it really affects him, else "".
Use only the facts given. Return JSON: [{"id":"","h":"","a":"","b":"","y":""}]

${JSON.stringify(want.map((s) => ({ id: s.id, title: s.title, text: (s.summary || '').slice(0, 600) })))}`);
    const arr = JSON.parse(out.replace(/^```(json)?|```$/g, '').trim());
    for (const r of Array.isArray(arr) ? arr : []) if (r.id && S.byId[r.id]) S.ed.ai[r.id] = { h: r.h, a: r.a, b: r.b, y: r.y };
    saveEd();
    const [r] = route(); if (r === 'edition' || r === 'ed' || r === '' || r === 'listen') render();
  } catch (e) { console.warn('edition ai', e); }
  edAiBusy = false;
}
const SEC_TONE = { Mumbai: ['#E3F1EC', '#0F6B4E', '#1F7A5C', '#5FB89A'], India: ['#FDE8D9', '#9A4A12', '#B5541E', '#E6955A'], World: ['#E2EAF8', '#2A4D8F', '#2E4A7E', '#7A9BD8'], Markets: ['#F3E6F7', '#7A2E8C', '#5A2A6E', '#B07CC6'], 'Money and SIP': ['#F3E6F7', '#7A2E8C', '#5A2A6E', '#B07CC6'], 'Gold and bullion': ['#FFF2C9', '#7A5A00', '#8A6A10', '#E0B84A'], Sports: ['#E5F3DA', '#3F6B12', '#3E6B1E', '#8CC45A'], Bollywood: ['#FBE3EE', '#9A1F5A', '#8A2252', '#E07AA8'], Movies: ['#FBE3EE', '#9A1F5A', '#8A2252', '#E07AA8'], Technology: ['#DFF1F5', '#155E70', '#1E5E70', '#5FB0C6'], Phones: ['#DFF1F5', '#155E70', '#1E5E70', '#5FB0C6'], Health: ['#E3F1EC', '#0F6B4E', '#1F7A5C', '#5FB89A'] };
const tone = (sec) => SEC_TONE[sec] || ['#EEE7DA', '#5E574C', '#4A4032', '#B9A98C'];
const edPhoto = (img, sec, h) => { const t = tone(sec); return `<div class="ed-ph" style="height:${h}px;background:linear-gradient(150deg,${t[2]},${t[3]})">${img ? `<img src="${esc(img)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<i></i></div>`; };

function viewEdition() {
  const n = S.news; const w = S.weather; const q = Q();
  const hr = new Date().getHours(); const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();
  const wx = w?.w?.current ? `<button class="ed-chip light" data-act="weather">${Math.round(w.w.current.temperature_2m)}° ${esc(w.loc.name)}${w.aqi != null ? ` · AQI ${w.aqi}` : ''}</button>` : '';
  const head = `<div class="ed-top"><span>${date}</span><span class="row" style="gap:6px">${wx}<a class="np-ib" href="#settings" aria-label="Settings">${ic('settings', 18)}</a></span></div>`;
  if (!n) return `<div class="ed">${head}<div class="ed-hi">${greet}${S.settings.name ? ',<br>' + esc(S.settings.name) : ''}</div><p class="ed-sub">Getting today’s edition ready…</p></div>`;
  const ed = buildEdition(); setTimeout(edAi, 200);
  const items = edItems(); const stories = items.filter((it) => it.type !== 'money');
  const mins = Math.max(4, Math.round(stories.length * 0.5));
  const lead = items.find((it) => it.type !== 'money'); const L = lead ? edText(lead) : null;
  const leadImg = lead?.type === 'story' ? lead.s.image : null;
  const pos = Math.min(ed.pos || 0, items.length);
  const counts = {}; for (const it of stories) { const sec = edText(it).sec; const k = /Market|Money|Gold/.test(sec) ? 'Money' : ['Mumbai', 'India', 'World'].includes(sec) ? sec : 'More'; counts[k] = (counts[k] || 0) + 1; }
  const chip = (k) => counts[k] ? `<span class="ed-chip" style="background:${tone(k === 'Money' ? 'Markets' : k)[0]};color:${tone(k === 'Money' ? 'Markets' : k)[1]}">${k} ${counts[k]}</span>` : '';
  const tile = (k, l, f) => q[k] ? `<a class="ed-tile" href="#markets"><span>${l}</span><b>${f(q[k].price)}</b><em class="${q[k].pct >= 0 ? 'up' : 'down'}">${q[k].pct >= 0 ? '▲' : '▼'} ${Math.abs(q[k].pct).toFixed(1)}%</em></a>` : '';
  const done = ed.done;
  return `<div class="ed">${head}
  <div class="ed-hi">${greet}${S.settings.name ? ',<br>' + esc(S.settings.name) : ''}</div>
  <p class="ed-sub">${done ? `You’ve finished ${isMorning() ? 'this morning’s' : 'this evening’s'} edition. ${isMorning() ? 'The evening edition arrives after 3 pm.' : 'The next edition arrives tomorrow morning.'}` : `Your ${isMorning() ? 'morning' : 'evening'} edition is ready: <b>${stories.length} stories</b>, about <b>${mins} minutes</b>.${L ? ` Big one today: ${esc(L.h)}.` : ''}`}</p>
  ${L ? `<a class="ed-lead" href="#ed/0">${edPhoto(leadImg, L.sec, 230)}<div class="ed-lead-t"><span class="ed-chip red">LEAD · ${esc(L.sec.toUpperCase())}</span><div>${esc(L.h)}</div></div></a>` : ''}
  <div class="ed-btns"><a class="ed-btn dark" href="#ed/${done ? 0 : pos}">${done ? 'Read again' : pos > 0 ? `Continue · ${Math.min(pos + 1, items.length)} of ${items.length}` : 'Start reading'}</a><a class="ed-btn warm" href="#listen">▶ Listen · ${mins} min</a></div>
  <div class="ed-tiles">${tile('sensex', 'Sensex', (v) => num(v, 0))}${tile('gold', 'Gold 10g', rs)}${tile('usdinr', 'Dollar', (v) => '₹' + num(v))}</div>
  <div class="ed-chips">${chip('Mumbai')}${chip('India')}${chip('World')}${chip('Money')}${chip('More')}</div>
  ${edMore()}
  <div class="np-foot">Picked from ${n.stats?.ok || ''} trusted sources and Google News’ top stories · <a href="#front">Full front page</a> · <button data-act="edrefresh" style="text-decoration:underline;font-size:inherit;color:inherit">Rebuild edition</button></div></div>`;
}
const MONEYISH = /market|sensex|nifty|stock|share|rupee|gold|silver|sip|fund|bank|rbi|price|ipo|crore|economy|tax|sebi|investor|loan|emi|inflation|gdp/i;
const edSec = (s) => ['markets', 'money', 'gold'].includes(s.section) && !MONEYISH.test(s.title) ? 'India' : secName(s.section);
const edMore = () => `<div class="ed-lab">MORE TO EXPLORE</div><div class="ed-more">
  <a href="#paper" style="background:#FFF2C9"><b style="color:#5A4300">Today’s Paper</b><span style="color:#7A5A00">${todayPapers().length ? paperStories().length + ' stories by section' : 'Upload your e-paper'}</span></a>
  <a href="#todo" style="background:#E3F1EC"><b style="color:#0F4F3A">Things to do</b><span style="color:#0F6B4E">Ideas in Mumbai</span></a>
  <a href="#markets" style="background:#E2EAF8"><b style="color:#22406F">Markets</b><span style="color:#2A4D8F">Gold, silver, Sensex, dollar</span></a>
  <a href="#sections" style="background:#F3E6F7"><b style="color:#5E2470">All sections</b><span style="color:#7A2E8C">Bollywood, sports, tech…</span></a></div>`;

function moneyCard() {
  const q = Q(); const g = q.gold, se = q.sensex;
  const head = g?.pct != null && Math.abs(g.pct) >= Math.abs(se?.pct || 0) ? `Gold ${g.pct >= 0 ? 'rose' : 'slipped'} ${Math.abs(g.pct).toFixed(1)}% today` : se ? `Sensex ${se.pct >= 0 ? 'up' : 'down'} ${Math.abs(se.pct).toFixed(1)}% today` : 'Your money minute';
  const sp = (g?.spark || []).filter((x) => x); const mn = Math.min(...sp), mx = Math.max(...sp);
  const chart = sp.length > 4 ? `<svg viewBox="0 0 300 120" preserveAspectRatio="none" style="width:100%;height:120px"><path d="${sp.map((v, i) => (i ? 'L' : 'M') + ((i / (sp.length - 1)) * 300).toFixed(1) + ' ' + (112 - ((v - mn) / (mx - mn || 1)) * 100).toFixed(1)).join('')}" fill="none" stroke="#F2C14E" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg><div class="ed-m" style="color:#A99E8C">Gold price through the day</div>` : '';
  const forYou = g?.pct == null ? '' : g.pct < -0.5 ? 'If you’re planning to buy gold, it’s cheaper than yesterday.' : g.pct > 0.5 ? 'Gold is costlier today; no rush to buy if you can wait.' : 'Gold is steady today.';
  return `<div class="ed-card money"><div class="ed-in"><span class="ed-chip" style="background:#3A2E14;color:#F2C14E">MONEY MINUTE</span>
  <div class="ed-h" style="color:#FBF6EE;margin-top:14px">${esc(head)}</div>
  <p class="ed-p" style="color:#D8CFC0">${esc(marketLine(q))}</p>
  <div style="margin-top:14px">${chart}</div>
  <div class="ed-mt">${g ? `<div><span>Gold 24K · 10g</span><b>${rs(g.price)}</b><em class="${g.pct >= 0 ? 'up' : 'down'}">${pct(g.pct)}</em></div>` : ''}${q.silver ? `<div><span>Silver · 1kg</span><b>${rs(q.silver.price)}</b><em class="${q.silver.pct >= 0 ? 'up' : 'down'}">${pct(q.silver.pct)}</em></div>` : ''}${se ? `<div><span>Sensex</span><b>${num(se.price, 0)}</b><em class="${se.pct >= 0 ? 'up' : 'down'}">${pct(se.pct)}</em></div>` : ''}${q.usdinr ? `<div><span>Dollar</span><b>₹${num(q.usdinr.price)}</b><em class="${q.usdinr.pct <= 0 ? 'up' : 'down'}">${q.usdinr.pct <= 0 ? 'Rupee up' : 'Rupee down'}</em></div>` : ''}</div>
  ${forYou ? `<div class="ed-you dark"><b>For you:</b> ${forYou}</div>` : ''}<a class="ed-m" href="#markets" style="display:block;margin-top:14px;color:#F2C14E">All markets ›</a></div></div>`;
}
function storyCard2(it) {
  const t = edText(it); const tn = tone(t.sec);
  const img = it.type === 'story' ? it.s.image : null;
  const href = it.type === 'story' ? `#read/${it.s.id}` : `#pstory/${it.x.id}`;
  return `<div class="ed-card">${edPhoto(img, t.sec, 380)}<div class="ed-sheet"><div class="row" style="gap:8px"><span class="ed-chip" style="background:${tn[0]};color:${tn[1]}">${esc(t.sec.toUpperCase())}</span><span class="ed-m">${esc(t.src)}${it.type === 'story' ? ' · ' + ago(it.s.time) : ''}</span></div>
  <div class="ed-h">${esc(t.h)}</div>
  <div class="ed-pts">${t.a ? `<div><i style="color:${tn[3]}">●</i><span>${esc(t.a)}</span></div>` : ''}${t.b ? `<div><i style="color:${tn[3]}">●</i><span>${esc(t.b)}</span></div>` : ''}</div>
  ${t.y ? `<div class="ed-you" style="background:${tn[0]};color:${tn[1]}"><b>For you:</b> ${esc(t.y)}</div>` : ''}
  <div class="ed-act">${it.type === 'story' ? `<button data-act="save" data-id="${it.s.id}">♡ Save</button><button data-act="share" data-id="${it.s.id}">↗ Share</button><button data-act="askabout" data-id="${it.s.id}">✦ Ask</button>` : `<button data-act="askpaper" data-id="${it.x.id}">✦ Ask</button>`}<a href="${href}" class="ed-full">Full story ›</a></div></div></div>`;
}
function viewCard(i) {
  if (!S.news) return '<div class="empty">Loading…</div>';
  buildEdition(); const items = edItems(); if (!items.length) { location.hash = '#edition'; return ''; }
  i = Math.max(0, Math.min(Number(i) || 0, items.length));
  S.ed.pos = i; if (!S.ed.started) S.ed.started = Date.now(); saveEd();
  if (i >= items.length) return viewEdDone();
  const it = items[i]; if (it.type === 'story') markRead(it.s.id); if (it.type === 'paper') { const p = getPaper(it.x.pid); if (p) markPaperRead(p, it.x.id); }
  const bars = items.map((_, k) => `<i class="${k < i ? 'd' : k === i ? 'c' : ''}"></i>`).join('');
  setTimeout(edSwipe, 0); setTimeout(edAi, 300);
  return `<div class="ed-stage ${it.type === 'money' ? 'dark' : ''}" id="edstage" data-i="${i}" data-n="${items.length}"><div class="ed-bars">${bars}</div><div class="ed-hd"><span>${i + 1} of ${items.length}</span><a href="#edition" aria-label="Close">${ic('x', 20, 2.2)}</a></div>${it.type === 'money' ? moneyCard() : storyCard2(it)}<div class="ed-hint">Tap right or swipe for next</div></div>`;
}
function edSwipe() {
  const st = $('#edstage'); if (!st || st.dataset.b) return; st.dataset.b = 1;
  const i = Number(st.dataset.i); const go = (k) => { location.hash = '#ed/' + k; };
  let x0 = null, y0 = null, t0 = 0;
  st.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); }, { passive: true });
  st.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { e.preventDefault(); go(dx < 0 ? i + 1 : Math.max(0, i - 1)); } else if (dy < -70 && Math.abs(dy) > Math.abs(dx)) go(i + 1); });
  st.addEventListener('click', (e) => { if (e.target.closest('a,button')) return; const w = window.innerWidth; const x = e.clientX; if (x > w * 0.62) go(i + 1); else if (x < w * 0.3) go(Math.max(0, i - 1)); });
}
document.addEventListener('keydown', (e) => { const st = $('#edstage'); if (!st) return; const i = Number(st.dataset.i); if (e.key === 'ArrowRight') location.hash = '#ed/' + (i + 1); if (e.key === 'ArrowLeft') location.hash = '#ed/' + Math.max(0, i - 1); });

// quiz from today's headlines: guess the missing name
const QUIZ_SKIP = new Set('The This What Why How After With From When Will Has Have New First Three Two Four Five Early Late Strong Opposition Big Top Leaders Mother Father Dies Death Live Watch Video Photos Check Here November December January February March April June July August September October Friday Saturday Sunday Monday Tuesday Wednesday Thursday India Indian Mumbai Court Supreme Govt Government Police State Centre City World News Today Says Said Over Amid Plan Plans Report Know Explained Express Condolences Attack Case'.split(' '));
function makeQuiz() {
  const items = edItems().filter((it) => it.type === 'story').map((it) => it.s).filter((s) => { const w = s.title.split(/\s+/); return w.filter((x) => /^[A-Z]/.test(x)).length / w.length < 0.55; });
  const namesIn = (h) => (h.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2}\b/g) || []).map((x) => x.split(' ').filter((w) => !QUIZ_SKIP.has(w)).join(' ')).filter((x) => x.length >= 4 && !QUIZ_SKIP.has(x));
  const pool = [...new Set(items.flatMap((s) => namesIn(s.title)))];
  const qs = [];
  for (const s of items) {
    if (qs.length >= 3) break;
    const ans = namesIn(s.title).sort((a, b) => b.split(' ').length - a.split(' ').length)[0]; if (!ans || !s.title.includes(ans)) continue;
    const others = pool.filter((w) => w !== ans && !s.title.includes(w)).sort(() => Math.random() - 0.5).slice(0, 3);
    if (others.length < 3) continue;
    qs.push({ q: s.title.replace(ans, '_____'), a: ans, o: [ans, ...others].sort(() => Math.random() - 0.5), pick: null });
  }
  return qs;
}
function viewEdDone() {
  const ed = S.ed; if (!ed.done) { ed.done = true; const days = LS.get('streak', []); const today = new Date().toISOString().slice(0, 10); if (!days.includes(today)) days.push(today); LS.set('streak', days.slice(-60)); }
  if (!ed.quiz) ed.quiz = makeQuiz(); saveEd();
  const days = new Set(LS.get('streak', [])); let streak = 0; for (let d = new Date(); days.has(d.toISOString().slice(0, 10)); d = new Date(d - 864e5)) streak++;
  const n = edItems().filter((it) => it.type !== 'money').length; const mins = ed.started ? Math.max(1, Math.round((Date.now() - ed.started) / 6e4)) : null;
  const quiz = ed.quiz.map((q, k) => `<div class="ed-q"><div class="ed-lab">QUESTION ${k + 1} OF ${ed.quiz.length}</div><div class="ed-qq">${esc(q.q)}</div><div class="ed-qo">${q.o.map((o) => `<button data-act="quiz" data-q="${k}" data-v="${esc(o)}" class="${q.pick == null ? '' : o === q.a ? 'ok' : o === q.pick ? 'no' : ''}">${esc(o)}${q.pick != null && o === q.a ? ' ✓' : ''}</button>`).join('')}</div></div>`).join('');
  const score = ed.quiz.filter((q) => q.pick === q.a).length; const answered = ed.quiz.every((q) => q.pick != null);
  return `<div class="ed" style="padding-top:34px"><div class="ed-tick">✓</div><div class="ed-hi" style="text-align:center;font-size:30px">You’re done for the ${isMorning() ? 'morning' : 'evening'}</div><p class="ed-sub" style="text-align:center">${n} stories${mins ? ` in ${mins} min` : ''}${streak > 1 ? ` · ${streak}-day streak 🔥` : ''}</p>
  ${quiz ? `<div class="ed-quiz"><div class="ed-lab">QUICK QUIZ${answered ? ` · YOU GOT ${score} OF ${ed.quiz.length}` : ''}</div>${quiz}</div>` : ''}
  ${edMore()}<a class="ed-btn dark" style="margin-top:18px" href="#edition">Back to today</a><div class="np-foot">${isMorning() ? 'Evening edition after 3 pm' : 'Next edition tomorrow morning'}</div></div>`;
}

// ---------- listen: the edition read aloud ----------
const TTS = { on: false, i: 0, rate: Number(LS.get('ttsRate', 1)) };
function ttsScript() {
  const items = edItems(); const n = items.filter((it) => it.type !== 'money').length;
  const out = [{ t: `${new Date().getHours() < 12 ? 'Good morning' : 'Hello'} ${S.settings.name || ''}. Here is your Drishti ${isMorning() ? 'morning' : 'evening'} edition, with ${n} stories.`, h: 'Introduction', sec: '' }];
  let k = 0;
  for (const it of items) {
    if (it.type === 'money') { out.push({ t: 'Your money minute. ' + marketLine(Q()), h: 'Money minute', sec: 'Money' }); continue; }
    const t = edText(it); k++;
    out.push({ t: `Story ${k}. ${t.sec}. ${t.h}. ${t.a} ${t.b} ${t.y ? 'What it means for you: ' + t.y : ''}`, h: t.h, sec: t.sec });
  }
  out.push({ t: 'That’s your edition. Have a great day.', h: 'The end', sec: '' });
  return out;
}
function ttsVoice() { const vs = speechSynthesis.getVoices(); return vs.find((v) => /en[-_]IN/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null; }
function ttsSpeak(i) {
  const sc = ttsScript(); if (i >= sc.length) { TTS.on = false; refreshListen(); return; }
  TTS.i = Math.max(0, i); TTS.on = true; speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(sc[TTS.i].t); const v = ttsVoice(); if (v) u.voice = v; u.lang = v?.lang || 'en-IN'; u.rate = TTS.rate;
  u.onend = () => { if (TTS.on && TTS.cur === u) ttsSpeak(TTS.i + 1); };
  TTS.cur = u; speechSynthesis.speak(u); refreshListen();
}
function ttsStop() { TTS.on = false; TTS.cur = null; speechSynthesis.cancel(); refreshListen(); }
function refreshListen() { if (location.hash.startsWith('#listen')) { const y = window.scrollY; render(); window.scrollTo(0, y); } }
function viewListen() {
  if (!S.news) return `<div class="ed">Loading…</div>`;
  buildEdition(); setTimeout(edAi, 200);
  const sc = ttsScript(); const cur = sc[TTS.i] || sc[0]; const ok = 'speechSynthesis' in window;
  const total = Math.round(sc.reduce((a, x) => a + x.t.split(' ').length, 0) / (150 * TTS.rate));
  const list = sc.slice(1, -1).map((x, k) => `<button class="ed-row ${TTS.i === k + 1 ? 'on' : ''}" data-act="ttsgo" data-i="${k + 1}"><span>${TTS.i === k + 1 && TTS.on ? '▶' : k + 1}</span><div><b>${esc(x.h)}</b><em>${esc(x.sec)}</em></div></button>`).join('');
  return `<div class="ed-radio"><div class="ed-hd" style="position:static;color:#A99E8C"><a href="#edition">${ic('back', 20, 2)}</a><b style="letter-spacing:.6px;font-size:12px">DRISHTI RADIO</b><span style="width:20px"></span></div>
  <div class="ed-cover"><div>${isMorning() ? 'Morning' : 'Evening'}<br>Edition</div><span>${new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${sc.length - 2} parts · ${total} min</span></div>
  <div class="ed-now">${esc(cur.h)}</div><div class="ed-m" style="text-align:center;color:#A99E8C">${TTS.i > 0 && TTS.i < sc.length - 1 ? `${TTS.i} of ${sc.length - 2}` : ''}${cur.sec ? ' · ' + esc(cur.sec) : ''}</div>
  ${ok ? `<div class="ed-ctl"><button data-act="ttsgo" data-i="${Math.max(0, TTS.i - 1)}" aria-label="Previous">⏮</button><button class="play" data-act="${TTS.on ? 'ttsstop' : 'ttsplay'}" aria-label="${TTS.on ? 'Pause' : 'Play'}">${TTS.on ? '❚❚' : '▶'}</button><button data-act="ttsgo" data-i="${TTS.i + 1}" aria-label="Next">⏭</button></div>
  <div class="ed-speed">${[0.9, 1, 1.15, 1.3].map((r) => `<button data-act="ttsrate" data-v="${r}" class="${TTS.rate === r ? 'on' : ''}">${r}×</button>`).join('')}</div>
  <p class="ed-m" style="text-align:center;color:#8E846F;margin-top:10px">Keep the screen on while listening; some phones pause speech when the screen locks.</p>` : '<p class="ed-sub" style="color:#D8CFC0">This browser can’t read aloud.</p>'}
  <div class="ed-list">${list}</div></div>`;
}

// ---------- router ----------
function route() { return (location.hash || '#edition').slice(1).split('/'); }
const TAB_OF = { edition: 'edition', ed: 'edition', listen: 'edition', '': 'edition', front: 'sections', home: 'edition', paper: 'paper', pdoc: 'paper', page: 'paper', pstory: 'paper', sections: 'sections', section: 'sections', explore: 'sections', todo: 'sections', history: 'sections', saved: 'sections', factchecks: 'sections', videos: 'sections', search: 'sections', settings: 'sections', quick: 'sections', markets: 'markets', money: 'markets', grow: 'markets', calc: 'markets', guide: 'markets', learn: 'markets', ask: 'ask' };
function render() {
  const [r, a, c] = route(); const v = $('#view');
  const map = { history: viewHistory, home: viewEdition, edition: viewEdition, listen: viewListen, front: viewFront, quick: viewQuick, grow: viewGrow, ask: viewAsk, explore: npSections, sections: npSections, settings: viewSettings, saved: viewSaved, factchecks: viewFactchecks, videos: viewVideos, guide: viewGuide, paper: viewPaper };
  let html;
  if (r === 'todo' || (r === 'section' && a === 'events')) html = viewTodo(r === 'todo' ? (a || 'all') : 'all'); else if (r === 'quick') html = viewQuick(a || 'all'); else if (r === 'web') html = viewWeb(a); else if (r === 'read' || r === 'story') html = viewRead(a, c != null ? Number(c) : null); else if (r === 'section') html = npSection(a); else if (r === 'markets' || r === 'money') html = npMarkets(a || 'all'); else if (r === 'pdoc') html = viewPaperDoc(a, c); else if (r === 'ed') html = viewCard(a); else if (r === 'page') html = viewPage(a, c); else if (r === 'pstory') html = viewPStory(a); else if (r === 'calc') html = viewCalc(a); else if (r === 'learn') html = viewLearn(a); else if (r === 'search') html = viewSearch(a || ''); else html = (map[r] || viewEdition)();
  const tab = r === 'read' || r === 'web' || r === 'story' ? S.lastTab : TAB_OF[r] || 'sections';
  if (!['story', 'read', 'web'].includes(r)) S.lastTab = tab;
  v.className = r === 'quick' || r === 'ed' ? 'full' : r === 'listen' ? 'radio' : '';
  v.innerHTML = html;
  hydratePages();
  setTimeout(() => { clientEditor().then(simplifyVisible); }, 300);
  $('#navwrap').innerHTML = r === 'quick' || r === 'ed' || r === 'listen' ? '' : navHtml(tab || 'edition');
}
let lastHash = '';
window.addEventListener('hashchange', () => {
  const keep = location.hash.startsWith('#ask') && lastHash.startsWith('#ask');
  render(); if (!keep) window.scrollTo(0, 0); lastHash = location.hash;
});

// ---------- events ----------
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act; const id = b.dataset.id;
  if (act === 'back') { if (history.length > 1) history.back(); else location.hash = '#edition'; }
  else if (act === 'weather') weatherSheet();
  else if (act === 'relocate') { b.closest('.sheet-bg')?.remove(); toast('Finding your location…'); await loadWeather(true); render(); }
  else if (act === 'refresh') { const before = S.news?.updated; b.classList.add('spin'); await Promise.all([loadData(true), loadWeather(true)]); render(); toast(S.news?.updated !== before ? 'Latest news loaded' : 'You’re up to date'); }
  else if (act === 'clearhist') { S.history = []; LS.set('history', []); render(); }
  else if (act === 'save') { const i = S.saved.indexOf(id); if (i >= 0) { S.saved.splice(i, 1); toast('Removed from saved'); } else { S.saved.unshift(id); toast('Saved'); } LS.set('saved', S.saved.slice(0, 200)); }
  else if (act === 'share') { const s = S.byId[id]; if (!s) return; const text = `${s.headline || s.title}\n\n${s.summary || ''}\n\n${s.link}`; if (navigator.share) navigator.share({ title: s.headline || s.title, text: `${s.headline || s.title}\n\n${s.summary || ''}`, url: s.link }).catch(() => {}); else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); }
  else if (act === 'range') { S.range = b.dataset.r; render(); }
  else if (act === 'guide') { const i = Number(b.dataset.i); S.guide = S.guide.includes(i) ? S.guide.filter((x) => x !== i) : [...S.guide, i]; LS.set('guide', S.guide); render(); }
  else if (act === 'askq') { e.preventDefault(); if (!location.hash.startsWith('#ask')) location.hash = '#ask'; setTimeout(() => ask(b.dataset.q), 60); }
  else if (act === 'askabout') { e.preventDefault(); const st = S.byId[id]; if (!st) return; location.hash = '#ask'; setTimeout(() => ask(`Tell me more about: ${st.headline || st.title}`, () => storyContext(st)), 60); }
  else if (act === 'clearchat') { S.chat = []; render(); }
  else if (act === 'mic') {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; const rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = false;
    b.style.background = 'var(--accent)'; b.style.color = 'var(--accent-ink)';
    rec.onresult = (ev) => { const t = ev.results[0][0].transcript; ask(t); };
    rec.onend = () => { b.style.background = 'var(--card)'; b.style.color = 'var(--text)'; };
    rec.start();
  }
  else if (act === 'simple') { S.settings.simple = S.settings.simple === false; saveSettings(); render(); }
  else if (act === 'lang') { S.settings.lang = b.dataset.v; saveSettings(); render(); }
  else if (act === 'settheme') { S.settings.theme = b.dataset.v; applyTheme(); saveSettings(); render(); }
  else if (act === 'setaccent') { S.settings.accent = b.dataset.v; applyTheme(); saveSettings(); render(); }
  else if (act === 'sec') { const s = S.settings.sections; S.settings.sections = s.includes(id) ? s.filter((x) => x !== id) : DEFAULT_SECTIONS.filter((x) => x === id || s.includes(x)); saveSettings(); render(); }
  else if (act === 'install' && S.installEvt) { S.installEvt.prompt(); S.installEvt = null; }
  else if (act === 'pexplain') { const p = getPaper(id.split('-')[0]); const x = p?.stories.find((y) => y.id === id); if (x) { b.textContent = 'Explaining…'; try { await explainStory(p, x, S.settings.key); render(); } catch { toast('AI is busy, try again in a minute'); b.textContent = 'Explain this story in detail'; } } }
  else if (act === 'pmode') { S.pmode = b.dataset.v; render(); }
  else if (act === 'pzoom') { S.pzoom = !S.pzoom; render(); }
  else if (act === 'presume') { const p = getPaper(id); if (p) resumePaper(p, S.settings.key, paperUpdate); render(); }
  else if (act === 'pdel') { const p = getPaper(id); if (p && confirm(`Delete ${p.name} from this phone?`)) { await removePaper(id); render(); } }
  else if (act === 'askpaper' || act === 'pshare') { const p = getPaper(id.split('-')[0]); const x = p?.stories.find((y) => y.id === id); if (!x) return; if (act === 'pshare') { const t = `${x.h}\n\n${x.s}\n\n— ${p.name}, page ${x.pg + 1}`; if (navigator.share) navigator.share({ title: x.h, text: t }).catch(() => {}); else window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank'); } else { location.hash = '#ask'; setTimeout(() => ask(`Explain this story from my newspaper: ${x.h}`, `STORY (from ${p.name}, page ${x.pg + 1}):\n${x.h}\n${x.b.slice(0, 6000)}`), 60); } }
  else if (act === 'edrefresh') { buildEdition(true); render(); toast('Fresh edition built'); }
  else if (act === 'quiz') { const q = S.ed?.quiz?.[Number(b.dataset.q)]; if (q && q.pick == null) { q.pick = b.dataset.v; saveEd(); const y = window.scrollY; render(); window.scrollTo(0, y); } }
  else if (act === 'ttsplay') ttsSpeak(TTS.i || 0);
  else if (act === 'ttsstop') ttsStop();
  else if (act === 'ttsgo') ttsSpeak(Number(b.dataset.i));
  else if (act === 'ttsrate') { TTS.rate = Number(b.dataset.v); LS.set('ttsRate', TTS.rate); if (TTS.on) ttsSpeak(TTS.i); else refreshListen(); }
  else if (act === 'clearread') { S.read = new Set(); LS.set('read', []); toast('Read history cleared'); }
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
  const kind = f.dataset.form; const val = new FormData(f).get(kind === 'search' ? 'q' : kind === 'key' ? 'key' : 'q')?.toString().trim();
  if (kind === 'search') location.hash = '#search/' + encodeURIComponent(val || '');
  else if (kind === 'key' && val) { S.settings.key = val; saveSettings(); toast('Key saved'); render(); }
  else if (kind === 'ask' && val) ask(val);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && e.target.matches('.askbar textarea')) { e.preventDefault(); e.target.form.requestSubmit(); } });
document.addEventListener('change', (e) => { if (e.target.dataset?.upload && e.target.files?.length) { const files = [...e.target.files]; e.target.value = ''; toast('Adding your newspaper…'); addPaper(files, S.settings.key, paperUpdate); setTimeout(render, 100); } });
document.addEventListener('change', (e) => { const k = e.target.dataset?.set; if (!k) return; S.settings[k] = e.target.value.trim(); saveSettings(); if (k === 'key') toast('Key saved'); });
let scrollT; window.addEventListener('scroll', () => { clearTimeout(scrollT); scrollT = setTimeout(simplifyVisible, 400); }, { passive: true });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && S.news && Date.now() - S.news.updated > 25 * 6e4 && !location.hash.startsWith('#quick') && !location.hash.startsWith('#ask')) { await loadData(true); render(); }
});

// ---------- start ----------
(async function start() {
  await loadPapers();
  render();
  await loadData();
  render();
  loadWeather().then(() => { const [r] = route(); if (['home', 'edition', 'front', ''].includes(r)) render(); });
  if ('serviceWorker' in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => { reg.update(); setInterval(() => reg.update(), 30 * 6e4); }).catch(() => {});
    // when a new version of the app is installed, reload once so it shows straight away
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }
  // check for fresh news every 5 minutes; the server refreshes every 30
  setInterval(async () => {
    if (document.visibilityState !== 'visible') return;
    const before = S.news?.updated; await loadData(true);
    if (S.news?.updated !== before) { const [r] = route(); if (['home', 'edition', 'front', 'section', 'sections', 'markets', ''].includes(r)) { const y = window.scrollY; render(); window.scrollTo(0, y); } toast('Fresh news just arrived'); }
  }, 5 * 6e4);
})();
