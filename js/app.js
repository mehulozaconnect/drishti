import { THOUGHTS, TIPS, GUIDE, LEARN } from './content.js';
import { CALCS, inr, dur, monthsToGoal, sipForGoal, fvSip } from './grow.js';

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
  sunrise: '<path d="M12 3v5M5 11l1.5 1.5M19 11l-1.5 1.5M3 18h18M7 18a5 5 0 0 1 10 0M9 6l3-3 3 3"/>'
};
const ic = (n, s = 20, w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
const logo = (s = 34) => `<svg width="${s}" height="${s}" viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" rx="30" fill="var(--card)" stroke="var(--line2)"/><path d="M60 26Q76 52 60 86Q44 52 60 26Z" fill="#FF7A1A"/><path d="M60 86Q30 80 22 52Q48 54 60 86Z" fill="none" stroke="var(--text)" stroke-width="5" stroke-linejoin="round"/><path d="M60 86Q90 80 98 52Q72 54 60 86Z" fill="none" stroke="var(--text)" stroke-width="5" stroke-linejoin="round"/><circle cx="60" cy="58" r="6" fill="var(--card)"/></svg>`;

// ---------- state ----------
const DEFAULT_SECTIONS = ['mumbai', 'india', 'world', 'markets', 'money', 'gold', 'bollywood', 'movies', 'viral', 'phones', 'gadgets', 'health', 'spiritual'];
const S = {
  news: null, markets: null, byId: {}, weather: null, loc: null,
  settings: Object.assign({ name: 'Mehul', theme: 'dark', sections: DEFAULT_SECTIONS, key: '', model: 'gemini-2.5-flash' }, LS.get('settings', {})),
  read: new Set(LS.get('read', [])), saved: LS.get('saved', []), guide: LS.get('guide', []),
  chat: [], range: '1D', moneyTab: 'markets', lastRoute: '#home', installEvt: null
};
const saveSettings = () => LS.set('settings', S.settings);
const markRead = (id) => { if (!S.read.has(id)) { S.read.add(id); LS.set('read', [...S.read].slice(-1500)); } };
document.documentElement.dataset.theme = S.settings.theme;

const secMeta = (id) => (S.news?.sections || []).find((s) => s.id === id) || { id, name: id, short: id, color: '#1B1E25', tint: '#C9CCD3', icon: 'globe' };
const inSection = (s, id) => s.section === id || (s.also || []).includes(id);
const secStories = (id) => (S.news?.stories || []).filter((s) => inSection(s, id)).sort((a, b) => b.score - a.score);

// ---------- data ----------
async function loadData(force) {
  const bust = force ? '?t=' + Date.now() : '?t=' + Math.floor(Date.now() / 3e5);
  try {
    const [n, m] = await Promise.all([fetch('data/news.json' + bust).then((r) => r.ok ? r.json() : null), fetch('data/markets.json' + bust).then((r) => r.ok ? r.json() : null).catch(() => null)]);
    if (n) { S.news = n; S.byId = Object.fromEntries(n.stories.map((s) => [s.id, s])); }
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
const aqiLabel = (a) => a == null ? '' : a <= 50 ? 'Good' : a <= 100 ? 'Moderate' : a <= 150 ? 'Poor for sensitive' : a <= 200 ? 'Unhealthy' : a <= 300 ? 'Very unhealthy' : 'Hazardous';
function getPosition() {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }), () => res(null), { timeout: 8000, maximumAge: 15 * 6e4 });
  });
}
async function loadWeather(force) {
  const cached = LS.get('weather', null);
  if (!force && cached && Date.now() - cached.t < 20 * 6e4) { S.weather = cached; return; }
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
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&current=us_aqi,pm2_5,pm10&timezone=auto`).then((r) => r.json()).catch(() => null)
    ]);
    S.weather = { t: Date.now(), loc, w, aqi: a?.current?.us_aqi ?? null, pm25: a?.current?.pm2_5 ?? null };
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
  return `<div class="art" style="background:${m.color}"><svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><circle cx="72" cy="30" r="${big ? 22 : 26}" fill="${m.tint}" fill-opacity=".16"/><circle cx="20" cy="88" r="30" fill="${m.tint}" fill-opacity=".08"/></svg><span style="position:absolute;color:${m.tint}">${ic(m.icon, big ? 54 : Math.round(size / 3), 1.5)}</span></div>`;
}
const img = (s, sz, big) => s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{innerHTML:window.__art('${s.section}',${sz},${big ? 1 : 0})}).firstChild)">` : art(s.section, sz, big);
window.__art = (sec, sz, big) => art(sec, sz, !!big);
const storyRow = (s) => { const m = secMeta(s.section); return `<a class="story" href="#story/${s.id}"><div class="thumb">${img(s, 84)}</div><div class="col gap4 grow"><span class="tag" style="color:${m.tint}">${esc(m.short)} · ${esc(s.sources[0]?.name || '')}</span><span class="ttl clamp3">${esc(s.headline || s.title)}</span><span class="meta">${ago(s.time)}${s.n > 1 ? ` · <span style="color:var(--ok)">${ic('shield', 12, 2.2)} ${s.n} sources</span>` : ''}${s.factCheck ? ` · <span style="color:var(--bad)">fact-check</span>` : ''}${s.local ? ' · <span style="color:var(--accent-text)">Near you</span>' : ''}</span></div></a>`; };
const navHtml = (on) => `<nav class="nav" aria-label="Main"><div class="in">${[['home', 'home', 'Home'], ['quick', 'bolt', 'Quick 60'], ['money', 'chart', 'Money'], ['ask', 'sparkle', 'Ask'], ['explore', 'grid', 'Explore']].map(([r, i, l]) => `<a href="#${r}" class="${on === r ? 'on' : ''}">${ic(i, 22)}${l}</a>`).join('')}</div></nav>`;
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
  let weather = `<button class="weather" data-act="weather"><div class="skel" style="width:60px;height:40px"></div><div class="col grow gap4"><div class="skel" style="height:14px;width:60%"></div><div class="skel" style="height:12px;width:40%"></div></div></button>`;
  if (w?.w?.current) {
    const c = w.w.current, d = w.w.daily; const [lab, icn] = WMO(c.weather_code, c.is_day);
    weather = `<button class="weather" data-act="weather"><span style="color:var(--accent-text)">${ic(icn, 36, 1.6)}</span><div class="col"><span class="t">${Math.round(c.temperature_2m)}°</span></div><div class="col grow" style="gap:1px"><span style="font-weight:600;font-size:14px" class="row gap4">${ic('pin', 14, 2)}${esc(w.loc.name)}${w.loc.fallback ? ' <span class="xs muted">(allow location)</span>' : ''}</span><span class="small muted">${lab} · H ${Math.round(d.temperature_2m_max[0])}° L ${Math.round(d.temperature_2m_min[0])}° · Rain ${d.precipitation_probability_max[0] ?? 0}%</span>${w.aqi != null ? `<span class="xs" style="color:${w.aqi > 150 ? 'var(--bad)' : w.aqi > 100 ? 'var(--warn)' : 'var(--ok)'}">AQI ${Math.round(w.aqi)} · ${aqiLabel(w.aqi)}</span>` : ''}</div>${ic('chev', 18)}</button>`;
  }
  const tick = [['nifty', 'Nifty 50'], ['sensex', 'Sensex'], ['gold', 'Gold 24K · 10g'], ['silver', 'Silver · 1kg'], ['usdinr', 'USD / INR'], ['brent', 'Brent crude']].filter(([k]) => q[k]).map(([k, l]) => { const x = q[k]; const rupee = k === 'gold' || k === 'silver'; return `<a class="tile" href="#money"><span class="xs muted">${l}</span><span class="v">${rupee ? '₹' + Math.round(x.price).toLocaleString('en-IN') : k === 'brent' ? '$' + num(x.price) : num(x.price, k === 'usdinr' ? 2 : 0)}</span><div class="row sp"><span class="xs ${x.pct >= 0 ? 'up' : 'down'}">${pct(x.pct)}</span>${x.spark?.length > 3 ? `<span style="width:52px;height:18px;display:block">${spark(x.spark, 52, 18, x.pct >= 0 ? 'var(--up)' : 'var(--down)', false)}</span>` : ''}</div></a>`; }).join('');
  if (!n) return `${header()}<div class="col gap4 mt8"><span class="eyebrow">${date}</span><h1 class="h1">${greet}${S.settings.name ? ', ' + esc(S.settings.name) : ''}</h1></div>${weather}<div class="empty mt24">Fetching today’s news…</div>`;
  const must = n.mustKnow.map((id) => S.byId[id]).filter(Boolean);
  const unread = n.quick60.filter((id) => !S.read.has(id)).length;
  const allRead = must.every((s) => S.read.has(s.id));
  const hero = n.stories.filter((s) => s.image && !n.mustKnow.slice(0, 1).includes(s.id)).sort((a, b) => b.score - a.score)[0];
  const fcs = (n.factChecks || []).slice(0, 2);
  const th = THOUGHTS[dayIndex() % THOUGHTS.length]; const tp = TIPS[dayIndex() % TIPS.length];
  const forYou = S.settings.sections.map((id) => { const list = secStories(id).filter((s) => !n.mustKnow.includes(s.id)).slice(0, 3); if (!list.length) return ''; const m = secMeta(id); return `<div class="sec-head"><span class="h2 row gap8"><span style="width:10px;height:10px;border-radius:5px;background:${m.tint}"></span>${esc(m.name)}</span><a href="#section/${id}">See all</a></div><div>${list.map(storyRow).join('')}</div>`; }).join('');
  return `${header()}
  <div class="col gap4 mt8"><span class="eyebrow">${date}</span><h1 class="h1">${greet}${S.settings.name ? ', ' + esc(S.settings.name) : ''}</h1></div>
  ${weather}
  ${tick ? `<div class="ticker hscroll">${tick}</div>` : ''}
  <a class="q60" href="#quick"><span class="ic">${ic('bolt', 22, 2)}</span><span class="col grow" style="gap:1px"><b>${unread ? 'Quick 60 is ready' : 'Quick 60: all read'}</b><span class="small" style="opacity:.8">${unread ? `${unread} stories in 60 words · about ${Math.max(2, Math.round(unread * 0.25))} min` : 'Swipe again any time'}</span></span>${ic('chev', 22, 2)}</a>
  <div class="sec-head"><span class="h2">Must know today</span><span class="xs muted">${must.filter((s) => S.read.has(s.id)).length}/${must.length} read</span></div>
  ${allRead ? `<div class="caught">${ic('check', 20, 2.4)}You’re all caught up on today’s top stories</div>` : ''}
  <div class="card" style="padding:4px 14px">${must.map((s, i) => `<a class="mk ${S.read.has(s.id) ? 'read' : ''}" href="#story/${s.id}"><span class="num">${S.read.has(s.id) ? ic('check', 16, 2.6) : i + 1}</span><div class="col gap4 grow"><span class="ttl">${esc(s.headline || s.title)}</span><span class="meta"><span style="color:${secMeta(s.section).tint}">${esc(secMeta(s.section).short)}</span>· ${ago(s.time)} · ${s.n > 1 ? `<span style="color:var(--ok)">${s.n} sources</span>` : esc(s.sources[0]?.name)}${s.breaking ? ' · <span class="badge b-live">Breaking</span>' : ''}</span></div></a>`).join('')}</div>
  ${hero ? `<div class="sec-head"><span class="h2">Top story</span></div><a class="hero" href="#story/${hero.id}">${img(hero, 220, true)}<div class="ov"><div class="row gap8"><span class="tag" style="color:${secMeta(hero.section).tint}">${esc(secMeta(hero.section).short)} · ${esc(hero.sources[0].name)}</span><span style="margin-left:auto">${verify(hero)}</span></div><span class="ttl">${esc(hero.headline || hero.title)}</span></div></a>` : ''}
  ${fcs.length ? `<div class="sec-head"><span class="h2">Fake news busted</span><a href="#factchecks">See all</a></div>${fcs.map((f) => `<a class="fc mt8" href="${esc(f.link)}" target="_blank" rel="noopener">${ic('alert', 18, 2)}<span class="col"><span>${esc(f.title)}</span><span class="xs" style="opacity:.8">${esc(f.publisher)} · ${ago(f.time)}</span></span></a>`).join('')}` : ''}
  ${forYou}
  <div class="sec-head"><span class="h2">For your day</span></div>
  <div class="quote"><span class="eyebrow" style="color:#FFC48A">${ic('lotus', 14)} Thought of the day</span><p>${esc(th[0])}</p><span class="small muted">— ${esc(th[1])}</span></div>
  <div class="quote mt12"><span class="eyebrow" style="color:var(--ok)">${ic('heart', 14)} Self-care tip</span><p style="font-size:17px">${esc(tp[0])}</p><span class="small muted">${esc(tp[1])}</span></div>
  <div class="updated">Updated ${ago(n.updated)} ago · ${n.stats?.ok || 0} trusted feeds checked<br><button data-act="refresh" class="row gap4" style="margin:8px auto 0;color:var(--accent-text)">${ic('refresh', 14)} Refresh now</button></div>`;
}
const header = () => `<div class="top"><div class="brand">${logo()}<b>Drishti</b></div><div class="row gap8"><a class="ibtn" href="#search" aria-label="Search">${ic('search')}</a><a class="ibtn" href="#settings" aria-label="Settings">${ic('settings')}</a></div></div>`;

function viewQuick() {
  const n = S.news; if (!n) return `<div class="empty">Loading…</div>`;
  const list = n.quick60.map((id) => S.byId[id]).filter(Boolean);
  const startAt = Math.max(0, list.findIndex((s) => !S.read.has(s.id)));
  const cards = list.map((s, i) => {
    const m = secMeta(s.section);
    return `<section class="qcard" data-id="${s.id}" data-i="${i}"><div class="qimg">${img(s, 200, true)}</div><div class="qbody">
      <div class="row gap8" style="flex-wrap:wrap"><span class="badge" style="background:${m.color};color:${m.tint}">${esc(m.short)}</span>${verify(s)}<span class="xs muted">${ago(s.time)} ago</span></div>
      <h2>${esc(s.headline || s.title)}</h2>
      <p>${esc(s.summary || 'Open the full story for details.')}</p>
      ${s.factCheck ? `<a class="fc" href="${esc(s.factCheck.link)}" target="_blank" rel="noopener">${ic('alert', 18, 2)}<span>Related fact-check by ${esc(s.factCheck.source)}: ${esc(s.factCheck.title)}</span></a>` : ''}
      <div class="srcs">${avatars(s.sources)}<span class="xs muted clamp2">${esc(s.sources.map((x) => x.name).join(', '))}</span></div>
      <div class="qact"><a class="btn btn-main" href="${esc(s.link)}" target="_blank" rel="noopener">Read full story ${ic('ext', 16, 2)}</a><button class="btn btn-ghost" data-act="save" data-id="${s.id}" aria-label="Save">${ic('bookmark', 20)}</button><button class="btn btn-ghost" data-act="share" data-id="${s.id}" aria-label="Share" style="color:var(--up)">${ic('wa', 20)}</button></div>
      <div class="xs muted" style="text-align:center">${i < list.length - 1 ? `${ic('up', 14, 2)} Swipe up · ${i + 2} of ${list.length}` : 'That’s everything for now'}</div>
    </div></section>`;
  }).join('');
  const done = `<section class="qcard" style="align-items:center;justify-content:center;text-align:center;padding:24px"><span style="color:var(--ok)">${ic('check', 56, 2)}</span><h2 class="h1 mt16">All caught up</h2><p class="muted">You’ve seen today’s ${list.length} key stories.</p><a class="btn btn-acc mt16" href="#home">Back to home</a></section>`;
  setTimeout(() => setupQuick(startAt, list.length), 0);
  return `<div class="qbar"><div class="qprog"><i id="qp" style="width:0"></i></div><div class="qtop"><a class="glass row" href="#home" style="height:40px;padding:0 12px 0 8px" aria-label="Back to home">${ic('back', 20, 2)}<span class="small">Home</span></a><span class="glass small" style="padding:7px 12px;display:flex;align-items:center;gap:6px">${ic('bolt', 14, 2.2)}Quick 60</span><span class="glass small" id="qc" style="padding:7px 12px">1/${list.length}</span></div></div><div class="qwrap" id="qw">${cards}${done}</div>`;
}
function setupQuick(start, total) {
  const w = $('#qw'); if (!w) return;
  if (start > 0) w.scrollTop = start * w.clientHeight;
  const io = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (e.isIntersecting && e.intersectionRatio > 0.6) {
      const i = Number(e.target.dataset.i); const id = e.target.dataset.id;
      if (id) { markRead(id); $('#qc').textContent = `${i + 1}/${total}`; $('#qp').style.width = ((i + 1) / total) * 100 + '%'; }
      else { $('#qp').style.width = '100%'; }
    }
  }), { root: w, threshold: [0.6] });
  w.querySelectorAll('.qcard').forEach((c) => io.observe(c));
}

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
  ${s.factCheck ? `<a class="fc mt12" href="${esc(s.factCheck.link)}" target="_blank" rel="noopener">${ic('alert', 18, 2)}<span><b>Fact-check:</b> ${esc(s.factCheck.title)} <span class="xs">(${esc(s.factCheck.source)})</span></span></a>` : ''}
  <div class="row gap8 mt16"><a class="btn btn-main" href="${esc(s.link)}" target="_blank" rel="noopener">Read full story ${ic('ext', 16, 2)}</a><button class="btn btn-ghost" data-act="save" data-id="${s.id}" aria-label="Save">${ic('bookmark', 20)}</button><button class="btn btn-ghost" data-act="share" data-id="${s.id}" aria-label="Share">${ic('share', 20)}</button></div>
  <a class="btn btn-line mt8" style="width:100%" href="#ask" data-act="askabout" data-id="${s.id}">${ic('sparkle', 18)} Ask Drishti about this</a>
  <div class="sec-head"><span class="h2">Reported by ${s.n} ${s.n === 1 ? 'outlet' : 'outlets'}</span></div>
  ${s.sources.map((x) => `<a class="srcrow" href="${esc(x.url)}" target="_blank" rel="noopener"><span class="row gap8"><span class="av" style="background:${avColor(x.name)};margin:0">${esc(initials(x.name))}</span><span style="font-weight:500">${esc(x.name)}</span></span>${ic('ext', 16)}</a>`).join('')}
  ${related.length ? `<div class="sec-head"><span class="h2">More in ${esc(m.short)}</span></div>${related.map(storyRow).join('')}` : ''}`;
}

function viewSection(id) {
  const m = secMeta(id); const list = secStories(id);
  let top = '';
  if (id === 'spiritual') { const th = THOUGHTS[dayIndex() % THOUGHTS.length]; top = `<div class="quote mt12"><span class="eyebrow" style="color:#FFC48A">Thought of the day</span><p>${esc(th[0])}</p><span class="small muted">— ${esc(th[1])}</span></div>`; }
  if (id === 'health') { const tp = TIPS[dayIndex() % TIPS.length]; const tp2 = TIPS[(dayIndex() + 7) % TIPS.length]; top = `<div class="quote mt12"><span class="eyebrow" style="color:var(--ok)">Today’s self-care</span><p style="font-size:17px">${esc(tp[0])}</p><span class="small muted">${esc(tp[1])}</span><p style="font-size:17px;margin-top:14px">${esc(tp2[0])}</p><span class="small muted">${esc(tp2[1])}</span></div>`; }
  if (id === 'gold' || id === 'markets') top = `<a class="card row mt12" href="#money">${ic('chart', 20)}<span class="grow">Live rates and charts in Money</span>${ic('chev', 18)}</a>`;
  if (id === 'viral' && S.news?.videos?.length) top = `<a class="card row mt12" href="#videos">${ic('play', 20)}<span class="grow">Trending YouTube videos in India</span>${ic('chev', 18)}</a>`;
  return `${backBar('Explore')}<div class="row gap12 mt8"><span style="width:48px;height:48px;border-radius:14px;background:${m.color};color:${m.tint};display:flex;align-items:center;justify-content:center">${ic(m.icon, 24)}</span><div class="col"><h1 class="h1" style="font-size:26px">${esc(m.name)}</h1><span class="small muted">${list.length} stories · updated ${S.news ? ago(S.news.updated) : ''} ago</span></div></div>${top}<div class="mt12">${list.length ? list.map(storyRow).join('') : '<div class="empty">No fresh stories right now.</div>'}</div>`;
}

function viewExplore() {
  const n = S.news; const order = DEFAULT_SECTIONS;
  const tiles = order.map((id) => { const m = secMeta(id); const c = secStories(id).length; return `<a class="stile" href="#section/${id}" style="background:${m.color}"><span class="ic" style="color:${m.tint}">${ic(m.icon, 20)}</span><span class="col" style="gap:2px"><b>${esc(m.name)}</b><span class="xs" style="color:${m.tint}">${c} stories</span></span></a>`; }).join('');
  return `<div class="top"><h1 class="h1">Explore</h1><a class="ibtn" href="#settings" aria-label="Settings">${ic('settings')}</a></div>
  <a class="search mt8" href="#search">${ic('search', 18)}<span class="muted">Search all news</span></a>
  <div class="trust mt12"><span style="width:38px;height:38px;border-radius:12px;background:var(--bg);color:var(--ok);display:flex;align-items:center;justify-content:center;flex-shrink:0">${ic('shield', 20, 2)}</span><span class="col"><span style="font-weight:600;font-size:14px;color:var(--ok)">Only trusted sources</span><span class="xs muted">${n?.stats?.ok || 0} feeds from established publishers, cross-checked every 30 minutes, with fact-check flags on viral claims.</span></span></div>
  <div class="grid2 mt16">
    <a class="stile" href="#saved" style="background:#2A2410"><span class="ic" style="color:#FFD66B">${ic('bookmark', 20)}</span><span class="col" style="gap:2px"><b>Saved</b><span class="xs" style="color:#FFD66B">${S.saved.length} stories</span></span></a>
    <a class="stile" href="#factchecks" style="background:#401A1A"><span class="ic" style="color:#FF9B9B">${ic('alert', 20)}</span><span class="col" style="gap:2px"><b>Fake news busted</b><span class="xs" style="color:#FF9B9B">${n?.factChecks?.length || 0} checks</span></span></a>
    ${tiles}
    ${n?.videos?.length ? `<a class="stile" href="#videos" style="background:#3A1414"><span class="ic" style="color:#FF9B9B">${ic('play', 20)}</span><span class="col" style="gap:2px"><b>Trending videos</b><span class="xs" style="color:#FF9B9B">YouTube India</span></span></a>` : ''}
    <a class="stile" href="#grow" style="background:#221A3F"><span class="ic" style="color:#C7BAFF">${ic('target', 20)}</span><span class="col" style="gap:2px"><b>Grow your money</b><span class="xs" style="color:#C7BAFF">Guides and calculators</span></span></a>
  </div>`;
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
  return `${backBar('Explore')}<h1 class="h1 mt8">Fake news busted</h1><p class="small muted">Latest checks by BOOM, Alt News, Factly and PIB Fact Check. Before you forward something on WhatsApp, look here.</p>${f.map((x) => `<a class="fc mt8" href="${esc(x.link)}" target="_blank" rel="noopener">${ic('alert', 18, 2)}<span class="col"><span>${esc(x.title)}</span><span class="xs" style="opacity:.8">${esc(x.publisher)} · ${ago(x.time)} ago</span></span></a>`).join('') || '<div class="empty">No new fact-checks right now.</div>'}`;
}
function viewVideos() {
  const v = S.news?.videos || [];
  return `${backBar('Explore')}<h1 class="h1 mt8">Trending videos</h1><p class="small muted">Most popular on YouTube in India right now.</p><div class="col gap12 mt12">${v.map((x) => `<a class="vcard" href="https://www.youtube.com/watch?v=${esc(x.id)}" target="_blank" rel="noopener"><img src="${esc(x.thumb)}" alt="" loading="lazy"><div style="padding:10px 12px"><div style="font-weight:600;font-size:14px" class="clamp2">${esc(x.title)}</div><div class="xs muted mt8">${esc(x.channel)} · ${x.views >= 1e6 ? (x.views / 1e6).toFixed(1) + 'M' : Math.round(x.views / 1e3) + 'K'} views</div></div></a>`).join('') || '<div class="empty">Add a YouTube key to see trending videos.</div>'}</div>`;
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
  const msgs = S.chat.map((m) => m.role === 'user' ? `<div class="msg-u">${esc(m.text)}</div>` : `<div class="msg-a">${logo(28)}<div class="bub">${m.pending ? '<span class="typing"><span></span><span></span><span></span></span>' : md(m.text)}${m.sources?.length ? `<div class="row gap6 mt8" style="flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--line)">${m.sources.slice(0, 5).map((s) => `<a class="chip" href="${esc(s.uri)}" target="_blank" rel="noopener" style="font-size:11px;padding:4px 8px">${esc(s.title.slice(0, 28))}</a>`).join('')}</div>` : ''}</div></div>`).join('');
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
  const w = S.weather?.w?.current ? `Weather in ${S.weather.loc.name}: ${Math.round(S.weather.w.current.temperature_2m)}°C, ${WMO(S.weather.w.current.weather_code)[0]}, AQI ${Math.round(S.weather.aqi ?? 0)}.` : '';
  return `Today is ${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })} IST. User lives in Mumbai (Malad West). ${w}\nMarkets: ${mk}\n\nToday's verified news (section | headline | summary | outlets):\n${top.map((s) => `- ${s.section} | ${s.headline || s.title} | ${s.summary || ''} | ${s.sources.map((x) => x.name).join(', ')}`).join('\n')}`;
}
async function ask(qText) {
  if (!S.settings.key) { toast('Add your free Gemini key first'); return; }
  S.chat.push({ role: 'user', text: qText }); const ans = { role: 'model', text: '', pending: true }; S.chat.push(ans); render();
  const sys = `You are Drishti, a personal news and money assistant for an Indian user in Mumbai. Reply in short, mobile-friendly answers (under 180 words unless asked for more), with bullets where helpful. Use the verified news below first and name the outlets you rely on. If the news below does not cover it, use Google Search results and say so. Never make up facts, prices or quotes. For investing: explain options, risks and how things work in simple terms, but never tell the user to buy or sell a specific stock or fund; suggest a SEBI-registered adviser for personal advice. Reply in Hindi if the user writes in Hindi or asks for it.\n\n${newsContext()}`;
  const contents = S.chat.filter((m) => !m.pending).slice(-10).map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  const models = [S.settings.model, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'].filter((v, i, a) => v && a.indexOf(v) === i);
  let err = '';
  outer: for (const model of models) {
    for (const tools of [[{ google_search: {} }], null]) {
      try {
        const body = { system_instruction: { parts: [{ text: sys }] }, contents, generationConfig: { temperature: 0.4, maxOutputTokens: 1200 } };
        if (tools) body.tools = tools;
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(S.settings.key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json();
        if (!r.ok) { err = j?.error?.message || ('Error ' + r.status); if (r.status === 400 && /API key/i.test(err)) break outer; if (r.status === 429) break outer; continue; }
        const c = j.candidates?.[0];
        ans.text = c?.content?.parts?.map((p) => p.text || '').join('').trim() || 'I could not find an answer to that.';
        ans.sources = (c?.groundingMetadata?.groundingChunks || []).map((g) => g.web).filter(Boolean);
        ans.pending = false; render(); return;
      } catch (e) { err = e.message; }
    }
  }
  ans.pending = false; ans.text = /API key/i.test(err) ? 'Your Gemini key looks invalid. Check it in Settings.' : /quota|429|exhaust/i.test(err) ? 'The free AI limit is used up for now. Try again in a minute.' : 'Could not reach the AI right now (' + err.slice(0, 120) + '). Check your internet and try again.';
  render();
}

// ---------- settings ----------
function viewSettings() {
  const st = S.settings;
  return `${backBar()}<h1 class="h1 mt8">Settings</h1>
  <div class="field"><label for="nm">Your name</label><input class="inp" id="nm" data-set="name" value="${esc(st.name)}" placeholder="Your name"></div>
  <div class="toggle mt12"><span>Light theme</span><button class="sw ${st.theme === 'light' ? 'on' : ''}" data-act="theme" aria-label="Light theme" aria-pressed="${st.theme === 'light'}"></button></div>
  <div class="sec-head"><span class="h2">Sections on Home</span></div>
  ${DEFAULT_SECTIONS.map((id) => `<div class="toggle"><span>${esc(secMeta(id).name)}</span><button class="sw ${st.sections.includes(id) ? 'on' : ''}" data-act="sec" data-id="${id}" aria-label="${esc(secMeta(id).name)}" aria-pressed="${st.sections.includes(id)}"></button></div>`).join('')}
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
  const hrs = h.time.slice(nowI, nowI + 24).map((t, i) => { const k = nowI + i; return `<div class="hr"><span class="muted">${i ? new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric' }) : 'Now'}</span><span style="color:var(--accent-text)">${ic(WMO(h.weather_code[k], h.is_day[k])[1], 20)}</span><b>${Math.round(h.temperature_2m[k])}°</b><span style="color:#5BA4F5">${h.precipitation_probability[k] ?? 0}%</span></div>`; }).join('');
  const days = d.time.map((t, i) => `<div class="row" style="padding:9px 0;border-bottom:1px solid var(--line)"><span style="width:56px" class="small">${i ? new Date(t).toLocaleDateString('en-IN', { weekday: 'short' }) : 'Today'}</span><span style="color:var(--accent-text)">${ic(WMO(d.weather_code[i])[1], 18)}</span><span class="xs" style="color:#5BA4F5;width:40px">${d.precipitation_probability_max[i] ?? 0}%</span><span class="grow"></span><span class="small muted">${Math.round(d.temperature_2m_min[i])}°</span><span style="width:60px;height:4px;border-radius:2px;background:linear-gradient(90deg,#5BA4F5,#FF7A1A)"></span><span class="small" style="font-weight:600">${Math.round(d.temperature_2m_max[i])}°</span></div>`).join('');
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-label="Weather"><div class="row sp"><span class="row gap6 small muted">${ic('pin', 14, 2)}${esc(w.loc.name)}${w.loc.city && w.loc.city !== w.loc.name ? ', ' + esc(w.loc.city) : ''}</span><button class="ibtn" data-close aria-label="Close">${ic('x')}</button></div>
  <div class="row gap12 mt8"><span style="color:var(--accent-text)">${ic(icn, 52, 1.5)}</span><div class="col"><span style="font-size:48px;font-weight:600;letter-spacing:-2px;line-height:1">${Math.round(c.temperature_2m)}°</span><span class="small muted">${lab} · feels like ${Math.round(c.apparent_temperature)}°</span></div></div>
  <div class="grid3 mt16"><div class="mtile"><span class="xs muted">${ic('drop', 12)} Humidity</span><span class="v">${c.relative_humidity_2m}%</span></div><div class="mtile"><span class="xs muted">${ic('wind', 12)} Wind</span><span class="v">${Math.round(c.wind_speed_10m)} <span class="xs">km/h</span></span></div><div class="mtile"><span class="xs muted">AQI (US)</span><span class="v" style="color:${(w.aqi ?? 0) > 150 ? 'var(--bad)' : (w.aqi ?? 0) > 100 ? 'var(--warn)' : 'var(--ok)'}">${w.aqi != null ? Math.round(w.aqi) : '–'}</span></div></div>
  ${w.aqi > 150 ? `<div class="fc mt12">${ic('alert', 18, 2)}<span>Air quality is poor. Wear an N95 mask outdoors and avoid outdoor exercise today.</span></div>` : ''}
  ${(d.precipitation_probability_max[0] ?? 0) >= 60 ? `<div class="fc mt12" style="background:#13233F;color:#9DB8F5">${ic('rain', 18, 2)}<span>High chance of rain today. Carry an umbrella and check local train updates.</span></div>` : ''}
  <div class="sec-head" style="margin-top:18px"><span class="h2" style="font-size:17px">Next 24 hours</span></div><div class="hrs">${hrs}</div>
  <div class="sec-head" style="margin-top:18px"><span class="h2" style="font-size:17px">7 days</span><span class="xs muted">UV max ${Math.round(d.uv_index_max[0])}</span></div>${days}
  <div class="row sp small muted mt12"><span>${ic('sunrise', 14)} Sunrise ${new Date(d.sunrise[0]).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span><span>Sunset ${new Date(d.sunset[0]).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span></div>
  <button class="btn btn-line mt16" style="width:100%" data-act="relocate">${ic('pin', 16)} Update my location</button></div>`;
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) bg.remove(); });
  document.body.appendChild(bg);
}

// ---------- router ----------
function route() { return (location.hash || '#home').slice(1).split('/'); }
function render() {
  const [r, a] = route(); const v = $('#view');
  const map = { home: viewHome, quick: viewQuick, money: viewMoney, grow: viewGrow, ask: viewAsk, explore: viewExplore, settings: viewSettings, saved: viewSaved, factchecks: viewFactchecks, videos: viewVideos, guide: viewGuide };
  let html;
  if (r === 'story') html = viewStory(a); else if (r === 'section') html = viewSection(a); else if (r === 'calc') html = viewCalc(a); else if (r === 'learn') html = viewLearn(a); else if (r === 'search') html = viewSearch(a || ''); else html = (map[r] || viewHome)();
  const tab = { home: 'home', quick: 'quick', money: 'money', grow: 'money', calc: 'money', guide: 'money', learn: 'money', ask: 'ask' }[r] || (r === 'story' ? S.lastTab : 'explore');
  if (r !== 'story') S.lastTab = tab;
  v.className = r === 'quick' ? 'full' : '';
  v.innerHTML = html;
  $('#navwrap').innerHTML = r === 'quick' ? '' : navHtml(tab || 'home');
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
  if (act === 'back') { if (history.length > 1) history.back(); else location.hash = '#home'; }
  else if (act === 'weather') weatherSheet();
  else if (act === 'relocate') { b.closest('.sheet-bg')?.remove(); toast('Finding your location…'); await loadWeather(true); render(); }
  else if (act === 'refresh') { toast('Refreshing…'); await Promise.all([loadData(true), loadWeather(true)]); render(); toast('Up to date'); }
  else if (act === 'save') { const i = S.saved.indexOf(id); if (i >= 0) { S.saved.splice(i, 1); toast('Removed from saved'); } else { S.saved.unshift(id); toast('Saved'); } LS.set('saved', S.saved.slice(0, 200)); }
  else if (act === 'share') { const s = S.byId[id]; if (!s) return; const text = `${s.headline || s.title}\n\n${s.summary || ''}\n\n${s.link}`; if (navigator.share) navigator.share({ title: s.headline || s.title, text: `${s.headline || s.title}\n\n${s.summary || ''}`, url: s.link }).catch(() => {}); else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'); }
  else if (act === 'range') { S.range = b.dataset.r; render(); }
  else if (act === 'guide') { const i = Number(b.dataset.i); S.guide = S.guide.includes(i) ? S.guide.filter((x) => x !== i) : [...S.guide, i]; LS.set('guide', S.guide); render(); }
  else if (act === 'askq') { e.preventDefault(); if (!location.hash.startsWith('#ask')) location.hash = '#ask'; setTimeout(() => ask(b.dataset.q), 60); }
  else if (act === 'askabout') { e.preventDefault(); const s = S.byId[id]; location.hash = '#ask'; setTimeout(() => ask(`Tell me more about this story and why it matters: "${s.headline || s.title}"`), 60); }
  else if (act === 'clearchat') { S.chat = []; render(); }
  else if (act === 'mic') {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; const rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = false;
    b.style.background = 'var(--accent)'; b.style.color = 'var(--accent-ink)';
    rec.onresult = (ev) => { const t = ev.results[0][0].transcript; ask(t); };
    rec.onend = () => { b.style.background = 'var(--card)'; b.style.color = 'var(--text)'; };
    rec.start();
  }
  else if (act === 'theme') { S.settings.theme = S.settings.theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = S.settings.theme; saveSettings(); render(); }
  else if (act === 'sec') { const s = S.settings.sections; S.settings.sections = s.includes(id) ? s.filter((x) => x !== id) : DEFAULT_SECTIONS.filter((x) => x === id || s.includes(x)); saveSettings(); render(); }
  else if (act === 'install' && S.installEvt) { S.installEvt.prompt(); S.installEvt = null; }
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
document.addEventListener('change', (e) => { const k = e.target.dataset?.set; if (!k) return; S.settings[k] = e.target.value.trim(); saveSettings(); if (k === 'key') toast('Key saved'); });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && S.news && Date.now() - S.news.updated > 25 * 6e4 && !location.hash.startsWith('#quick') && !location.hash.startsWith('#ask')) { await loadData(true); render(); }
});

// ---------- start ----------
(async function start() {
  render();
  await loadData();
  render();
  loadWeather().then(() => { const [r] = route(); if (r === 'home' || r === '') render(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
