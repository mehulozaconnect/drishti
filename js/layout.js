// Splits a newspaper PDF page into stories using the PDF's own text: font sizes and positions.
// Works on the phone in milliseconds, no AI needed. Items: [x, yTop, width, size, text] in page units.

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

export function looksReadable(items) {
  const txt = items.map((t) => t[4]).join(' ');
  if (txt.length < 400) return false;
  const good = (txt.match(/[A-Za-z0-9 ,.'’"“”\-:;()₹%]/g) || []).length;
  return good / txt.length > 0.85 && /\b(the|and|of|to|in)\b/i.test(txt);
}

// PDFs often split one printed line into several pieces (bold words, kerning). Join them back into whole lines.
function joinLines(items) {
  const its = items.filter((t) => t[4] && t[4].trim()).map((t) => [...t]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const lines = []; let band = [];
  for (const t of its) {
    const [x, y, w, sz] = t;
    band = band.filter((l) => y - l[1] < sz * 1.2);
    const l = band.find((l) => Math.abs(l[1] - y) < sz * 0.35 && Math.abs(l[3] - sz) < sz * 0.3 && x >= l[0] + l[2] - sz * 0.6 && x - (l[0] + l[2]) < sz * 1.6);
    if (l) {
      const gap = x - (l[0] + l[2]);
      const sep = /\s$/.test(l[4]) || /^\s/.test(t[4]) || gap < sz * 0.12 ? '' : ' ';
      l[4] += sep + t[4]; l[2] = x + w - l[0];
    } else { const nl = [x, y, w, sz, t[4]]; lines.push(nl); band.push(nl); }
  }
  for (const l of lines) l[4] = l[4].replace(/\s+/g, ' ');
  return lines;
}

export function parsePage(rawItems, W, H) {
  if (!rawItems?.length) return [];
  const items = joinLines(rawItems);
  // body text size: the size that carries the most characters
  const bySize = {};
  for (const t of items) { const k = Math.round(t[3] * 2) / 2; bySize[k] = (bySize[k] || 0) + t[4].length; }
  const B = Number(Object.entries(bySize).sort((a, b) => b[1] - a[1])[0][0]);
  const isHead = (t) => t[3] >= B * 1.4 && t[4].trim().length >= 2;
  const isDrop = (t) => t[3] >= B * 1.6 && /^[A-Z]$/.test(t[4].trim());

  // 1) headline blocks: big text close together
  const heads = items.filter((t) => isHead(t) && !isDrop(t)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const blocks = [];
  for (const t of heads) {
    const [x, y, w, s] = t;
    const b = blocks.find((k) => {
      if (Math.abs(k.s - s) > k.s * 0.3) return false;
      const last = k.items[k.items.length - 1];
      const sameLine = Math.abs(y - last[1]) < s * 0.35;
      if (sameLine) return x - (last[0] + last[2]) < s * 0.6 && x >= last[0]; // next word on the same line
      return y > last[1] && y - k.y1 <= s * 0.9 && x < k.x1 && x + w > k.x0; // next line, overlapping the same columns
    });
    if (b) { b.items.push(t); b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x + w); b.y1 = Math.max(b.y1, y + s); }
    else blocks.push({ items: [t], x0: x, x1: x + w, y0: y, y1: y + s, s });
  }
  for (const b of blocks) {
    b.items.sort((p, q) => (Math.abs(p[1] - q[1]) < b.s * 0.5 ? p[0] - q[0] : p[1] - q[1]));
    b.text = b.items.map((t) => t[4]).join(' ').replace(/\s+/g, ' ').replace(/(\w)- (\w)/g, '$1$2').trim();
  }
  // drop mastheads, page furniture and stray big words
  const heads2 = blocks.filter((b) => b.text.length >= 14 && b.text.length <= 200 && b.text.split(' ').length >= 3 && !(b.y0 < H * 0.08 && b.s > B * 4.5) && !(b.y0 < H * 0.13 && b.text === b.text.toUpperCase() && b.text.split(' ').length <= 5) && !/^(continued|contd|page \d+)/i.test(b.text));

  // a smaller line right under a headline and starting at its left edge is its deck (sub-headline), not a new story
  for (const d of heads2) for (const h of heads2) {
    if (h === d || h.deckOf || d.s >= h.s * 0.8) continue;
    if (d.y0 >= h.y1 - d.s * 0.3 && d.y0 - h.y1 <= d.s * 1.3 && Math.abs(d.x0 - h.x0) <= B * 1.5) { d.deckOf = h; h.deck = (h.deck ? h.deck + ' ' : '') + d.text; h.y1 = Math.max(h.y1, d.y1); break; }
  }
  for (let k = heads2.length - 1; k >= 0; k--) if (heads2[k].deckOf) heads2.splice(k, 1);
  // 2) every body line goes to the nearest headline above it whose width covers it
  const body = items.filter((t) => (!isHead(t) || isDrop(t)) && t[3] <= B * 1.35 || isDrop(t));
  const stories = heads2.map((h) => ({ h, items: [] }));
  for (const t of body) {
    const xc = t[0] + Math.min(t[2], B * 6) / 2;
    let best = null;
    for (const st of stories) {
      const h = st.h; const pad = B * 1.5;
      if (h.y1 - B * 0.6 <= t[1] && xc >= h.x0 - pad && xc <= h.x1 + pad && (!best || h.y1 > best.h.y1)) best = st;
    }
    if (best && t[1] - best.h.y1 < H * 0.6) best.items.push(t);
  }

  // 3) order each story's text: columns left to right, lines top to bottom
  const out = [];
  for (const st of stories) {
    const EMAIL = /@\s?(timesofindia|timesgroup|mid-day|hindustantimes|htlive|expressindia|indianexpress)|^\s*@/i;
    const mails = st.items.filter((t) => EMAIL.test(t[4]));
    let its = st.items.filter((t) => !EMAIL.test(t[4]) && !/^\s*for more,|^\s*\(?p\s?\d+\)?\s*$/i.test(t[4]) && !mails.some((m) => Math.abs(m[0] - t[0]) < B * 3 && m[1] - t[1] > 0 && m[1] - t[1] < m[3] * 2.6 && t[4].length < 32));
    if (!its.length) continue;
    const lineW = median(its.filter((t) => t[2] > B * 6).map((t) => t[2])) || B * 15;
    its.sort((a, b) => a[0] - b[0]);
    const cols = [];
    for (const t of its) { const c = cols.find((c) => Math.abs(c.x - t[0]) < lineW * 0.45); if (c) c.items.push(t); else cols.push({ x: t[0], items: [t] }); }
    cols.sort((a, b) => a.x - b.x);
    let text = ''; let prev = null;
    for (const c of cols) {
      c.items.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      for (const t of c.items) {
        const s = t[4];
        if (prev) {
          const gap = t[1] - prev[1];
          if (prev.drop) text += '';
          else if (gap > prev[3] * 2.2 && prev.col === c) text += '\n\n';
          else if (/-$/.test(text) && /^[a-z]/.test(s)) text = text.slice(0, -1);
          else if (!/\s$/.test(text)) text += ' ';
        }
        text += s;
        prev = t; prev.col = c; prev.drop = isDrop(t);
      }
    }
    text = text.replace(/^(?:[A-Z][\w.’'-]+\s){1,3}(?=(?:[A-Z][a-z]+\s?){1,2}:\s)/, '');
    if (st.h.deck) text = st.h.deck + '\n\n' + text;
    text = text.replace(/[ \t]+/g, ' ').replace(/ ?\n\n ?/g, '\n\n').replace(/\n{3,}/g, '\n\n').trim();
    const words = text.split(/\s+/).length;
    if (words < 35) continue;
    const all = [...st.h.items, ...its];
    const x0 = Math.min(...all.map((t) => t[0])), x1 = Math.max(...all.map((t) => t[0] + t[2])), y0 = Math.min(...all.map((t) => t[1])), y1 = Math.max(...all.map((t) => t[1] + t[3]));
    const r = st.h.s / B;
    out.push({ h: st.h.text, b: text, box: [Math.round((y0 / H) * 1000), Math.round((x0 / W) * 1000), Math.round((y1 / H) * 1000), Math.round((x1 / W) * 1000)], imp: r >= 3.4 ? 5 : r >= 2.5 ? 4 : r >= 1.9 ? 3 : 2, words });
  }
  return out;
}

// a quick plain summary when the AI is not available
export function firstSentences(t, n = 2) {
  const s = t.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+(\s|$)/g) || [t.slice(0, 220)];
  return s.slice(0, n).join('').trim().slice(0, 320);
}
const MUM = /\b(mumbai|bmc|thane|navi mumbai|malad|andheri|borivali|bandra|dadar|powai|goregaon|kandivali|vasai|virar|kalyan|western railway|central railway|local train|metro)\b/i;
export function guessPlace(h, b) {
  const t = h + ' ' + b.slice(0, 600);
  if (MUM.test(t)) return 'Mumbai';
  if (/\b(sensex|nifty|rbi|gdp|ipo|shares|market|rupee|bank|inflation|tax|crore profit)\b/i.test(t)) return 'Business';
  if (/\b(cricket|ipl|match|cup|league|football|tennis|olympic|wicket)\b/i.test(t)) return 'Sports';
  if (/\b(film|actor|actress|bollywood|movie|box office|ott|series)\b/i.test(t)) return 'Entertainment';
  if (/\b(us|china|pakistan|russia|ukraine|iran|israel|trump|un|nato|gaza|europe|uk|japan)\b/i.test(t)) return 'World';
  return 'India';
}

// which part of the paper a page is, from the small header at its top (e.g. TIMES CITY, NATION, SPORT)
const PAGE_SECS = [['Mumbai', /\b(times city|city|mumbai|metro|hello mumbai|mumbai live)\b/i], ['India', /\b(nation|india|times nation|country)\b/i], ['World', /\b(world|global|times global|international|abroad)\b/i], ['Business', /\b(business|biz|times business|economy|markets|money)\b/i], ['Sports', /\b(sport|sports|times sport)\b/i], ['Entertainment', /\b(entertainment|bollywood|delhi times|bombay times|showbiz|cinema)\b/i], ['Opinion', /\b(edit|editorial|opinion|oped|op-ed|comment|the speaking tree|letters)\b/i]];
export function pageSection(items, H) {
  const top = items.filter((t) => t[1] < H * 0.06).map((t) => t[4]).join(' ').replace(/the times of india|times of india|hindustan times|mumbai mirror|mid-day|free press journal|indian express|economic times|the mumbai daily/gi, ' ');
  for (const [name, re] of PAGE_SECS) if (re.test(top)) return name;
  return '';
}
export const MUMBAI_RE = MUM;
