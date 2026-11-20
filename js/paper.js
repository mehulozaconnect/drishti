// Today's Paper: newspapers you upload (e-paper PDF or photos of pages), read page by page on this phone.
// Pages and stories stay on this phone (IndexedDB). E-paper PDFs are split into stories on the phone;
// photos are read by Gemini with your own key, which also writes the simple summaries.
import { parsePage, looksReadable, firstSentences, guessPlace } from './layout.js';

const DB = 'drishti-paper';
let dbp;
function db() {
  return dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('papers', { keyPath: 'id' }); d.createObjectStore('pages'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
}
async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction(store, mode); const req = fn(t.objectStore(store)); t.oncomplete = () => res(req?.result); t.onerror = () => rej(t.error); });
}

export const PAPERS = { list: [], busy: new Set() };
export const today = () => new Date(Date.now() + 5.5 * 3.6e6).toISOString().slice(0, 10);

export async function loadPapers() {
  try {
    const all = await tx('papers', 'readonly', (s) => s.getAll()) || [];
    const cut = Date.now() - 8 * 864e5;
    for (const p of all.filter((p) => p.at < cut)) await removePaper(p.id, p);
    PAPERS.list = all.filter((p) => p.at >= cut).sort((a, b) => b.at - a.at);
    for (const p of PAPERS.list) if (p.status === 'reading' || p.status === 'loading') { p.status = p.pages && p.readPages.length >= p.pages ? 'ready' : 'paused'; p.error = p.status === 'paused' ? 'Reading stopped when the app was closed.' : ''; }
  } catch (e) { console.warn('papers', e); }
  return PAPERS.list;
}
const savePaper = (p) => tx('papers', 'readwrite', (s) => s.put(JSON.parse(JSON.stringify(p))));
export async function removePaper(id, known) {
  const p = known || PAPERS.list.find((x) => x.id === id);
  await tx('papers', 'readwrite', (s) => s.delete(id));
  if (p) await tx('pages', 'readwrite', (s) => { for (let i = 0; i < (p.pages || 0); i++) s.delete(id + ':' + i); });
  PAPERS.list = PAPERS.list.filter((x) => x.id !== id);
}
const urls = {};
export async function pageUrl(id, i) {
  const k = id + ':' + i; if (urls[k]) return urls[k];
  const b = await tx('pages', 'readonly', (s) => s.get(k));
  return b ? (urls[k] = URL.createObjectURL(b)) : '';
}
export const getPaper = (id) => PAPERS.list.find((p) => p.id === id);
export function markPaperRead(p, sid) { p.readIds = p.readIds || []; if (!p.readIds.includes(sid)) { p.readIds.push(sid); savePaper(p); } }

// ---------- turning files into page images ----------
const PDFJS = new URL('./vendor/', import.meta.url).href;
async function pdfPages(file, onPage) {
  const pdfjs = await import(PDFJS + 'pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const n = Math.min(doc.numPages, 60);
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const v = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: Math.min(3, 1600 / v.width) });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    // the PDF's own text with positions (0-1000 on both axes), so story text never has to be retyped by the AI
    let tl = [];
    try {
      const tc = await page.getTextContent();
      for (const t of tc.items) {
        if (!t.str || !t.str.trim()) continue;
        const [a, b, c2, d, e, f] = t.transform; if (Math.abs(b) > 0.01 || Math.abs(c2) > 0.01) continue; // skip rotated text
        const size = Math.hypot(c2, d) || Math.abs(d) || t.height || 8;
        const [x, yb] = v.convertToViewportPoint(e, f);
        tl.push([Math.round(x * 10) / 10, Math.round((yb - size * 0.85) * 10) / 10, Math.round((t.width || 0) * 10) / 10, Math.round(size * 10) / 10, t.str]);
      }
    } catch {}
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.72));
    await onPage(blob, i - 1, n, tl, [v.width, v.height]);
    page.cleanup();
  }
}
async function photoBlob(file) {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
}
const toB64 = (blob) => new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });

// ---------- Gemini ----------
async function gemini(key, parts, json, maxOut, lite) {
  const models = lite ? ['gemini-2.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'] : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];
  for (let attempt = 0; attempt < 4; attempt++) {
    let limited = false;
    for (const model of models) {
      const cfg = { temperature: 0.1, maxOutputTokens: maxOut, ...(json ? { responseMimeType: 'application/json' } : {}) };
      if (/2\.5|latest/.test(model)) cfg.thinkingConfig = { thinkingBudget: 0 };
      let r;
      try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: cfg }) }); }
      catch { throw new Error('offline'); }
      if (r.status === 429 || r.status === 503) { limited = true; continue; }
      if (r.status === 400 || r.status === 403) { const t = await r.text(); if (/API key/i.test(t)) throw new Error('key'); continue; }
      if (!r.ok) continue;
      const j = await r.json();
      const out = j.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      if (!out) continue;
      if (!json) return out.trim();
      try { return JSON.parse(out.replace(/^```(json)?|```$/g, '').trim()); } catch { continue; }
    }
    if (!limited) break;
    if (attempt >= 1) break; // do not keep the reader waiting
    await new Promise((r) => setTimeout(r, 20000)); // free limit: wait once and try again
  }
  throw new Error('limit');
}
// Step 1 (fast): find the stories on a page. No full text here, so each page takes seconds.
const FIND = `You are looking at one page of an Indian newspaper. Find every news story, column and article on it. Skip advertisements, classifieds, obituaries, mastheads, page indexes, weather boxes, puzzles and horoscopes.
Return only JSON: {"paper":"newspaper name if printed on this page, else empty","label":"what this page is in 1-2 words, e.g. Front page, Mumbai, Nation, World, Business, Sports, Entertainment, Editorial","stories":[{"h":"headline as printed","k":"topic in 1-2 words","s":"what happened, in two short simple sentences","w":"why it matters to a reader in Mumbai, one short sentence","place":"Mumbai|India|World|Business|Sports|Entertainment|Other","imp":1-5 (5 = lead story of the page, 1 = small brief),"box":[ymin,xmin,ymax,xmax] (the whole story incl. headline and text, each 0-1000)}]}
Use only what is printed. Do not invent anything.`;
async function findStories(key, blob) {
  return gemini(key, [{ inline_data: { mime_type: 'image/jpeg', data: await toB64(blob) } }, { text: FIND }], true, 6000);
}
const clampBox = (b) => Array.isArray(b) && b.length === 4 && b.every((x) => typeof x === 'number') ? b.map((x) => Math.max(0, Math.min(1000, Math.round(x)))) : null;
// Step 2 (only when you open a story without PDF text, e.g. a photo): type out the full text from a crop of the page
export async function ensureBody(p, x, key) {
  if (x.b) return x.b;
  const blob = await tx('pages', 'readonly', (s) => s.get(p.id + ':' + x.pg));
  let img = blob;
  if (x.box) {
    const bmp = await createImageBitmap(blob); const [y0, x0, y1, x1] = x.box; const pad = 15;
    const sx = Math.max(0, (x0 - pad) / 1000) * bmp.width, sy = Math.max(0, (y0 - pad) / 1000) * bmp.height;
    const sw = Math.min(1, (x1 + pad) / 1000) * bmp.width - sx, sh = Math.min(1, (y1 + pad) / 1000) * bmp.height - sy;
    const c = document.createElement('canvas'); c.width = Math.round(sw); c.height = Math.round(sh);
    c.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
    img = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
  }
  const t = await gemini(key, [{ inline_data: { mime_type: 'image/jpeg', data: await toB64(img) } }, { text: `Type out the full text of the news story titled "${x.h}" from this newspaper clipping, in reading order, joining text across columns. Fix broken hyphenation. Separate paragraphs with a blank line. Leave out the headline, photo captions and anything that belongs to other stories. Return plain text only.` }], false, 8000);
  x.b = t; await savePaper(p); return t;
}

function addStories(p, i, list) {
  p.stories = p.stories.filter((x) => x.pg !== i);
  list.forEach((x, k) => p.stories.push({ id: `${p.id}-${i}-${k}`, pg: i, h: x.h, k: x.k || '', b: x.b || '', s: x.s || '', w: x.w || '', place: x.place || 'Other', imp: x.imp || 2, box: x.box || null }));
}
// PDF page with real text: split on the phone, instantly
function parseLocal(p, i) {
  const [W, H] = p.dims[i];
  const found = parsePage(p.tl[i], W, H);
  addStories(p, i, found.map((x) => ({ ...x, s: firstSentences(x.b), place: guessPlace(x.h, x.b) })));
  if (!p.readPages.includes(i)) p.readPages.push(i);
}
// AI touch: simple summary, why it matters, topic and importance (text only, small and fast)
async function enrichPage(p, key, i) {
  const st = p.stories.filter((x) => x.pg === i); if (!st.length) { p.enriched.push(i); return; }
  const list = st.map((x, k) => ({ i: k, h: x.h, t: x.b.slice(0, 700) }));
  const res = await gemini(key, [{ text: `These are the news stories from one page of an Indian newspaper. For each, write in very simple everyday English:
"s": what happened, two short sentences; "w": why it matters to a reader living in Mumbai, one short sentence; "k": topic in 1-2 words; "place": Mumbai, India, World, Business, Sports, Entertainment or Other; "imp": importance 1-5.
Also give "label": what this page is in 1-2 words (Front page, Mumbai, Nation, World, Business, Sports, Entertainment, Editorial...).
Return only JSON: {"label":"","stories":[{"i":0,"s":"","w":"","k":"","place":"","imp":3}]}
Use only facts in the text.

${JSON.stringify(list)}` }], true, 4000, true);
  if (res.label) p.labels[i] = String(res.label).slice(0, 30);
  for (const r of res.stories || []) { const x = st[r.i]; if (!x) continue; if (r.s) x.s = String(r.s); if (r.w) x.w = String(r.w); if (r.k) x.k = String(r.k); if (r.place) x.place = r.place; if (r.imp) x.imp = Math.max(1, Math.min(5, Number(r.imp) || x.imp)); }
  p.enriched.push(i);
}
// photo, or a PDF without usable text: Gemini finds the stories in the picture
async function readVision(p, key, i) {
  const blob = await tx('pages', 'readonly', (s) => s.get(p.id + ':' + i));
  const res = await findStories(key, blob);
  if (i === 0 && res.paper && res.paper.length < 60) p.name = res.paper.trim();
  p.labels[i] = (res.label || '').slice(0, 30);
  addStories(p, i, (res.stories || []).filter((x) => x.h).map((x) => ({ h: String(x.h).trim(), k: String(x.k || ''), s: String(x.s || ''), w: String(x.w || ''), place: x.place || 'Other', imp: Math.max(1, Math.min(5, Number(x.imp) || 2)), box: clampBox(x.box) })));
  if (!p.readPages.includes(i)) p.readPages.push(i);
  p.enriched.push(i);
}
const errText = (e) => e.message === 'key' ? 'Your Gemini key was not accepted. Check it in Settings.' : e.message === 'offline' ? 'You went offline. Tap Continue to finish.' : 'Google’s free AI limit was reached for now. Tap Continue later to finish.';

// pages are handled while the rest are still opening; AI jobs run 3 at a time
async function run(p, key, onUpdate, feeder) {
  PAPERS.busy.add(p.id);
  p.enriched = p.enriched || []; p.status = 'reading'; p.error = ''; await savePaper(p); onUpdate();
  const queue = []; const waiters = []; let feeding = !!feeder, stop = false;
  const push = (i) => { queue.push(i); while (waiters.length) waiters.shift()(); };
  const plan = (i) => { if (p.text?.[i]) { if (!p.readPages.includes(i)) parseLocal(p, i); if (key && !p.enriched.includes(i)) push(i); } else if (!p.readPages.includes(i) || !p.enriched.includes(i)) push(i); };
  for (let i = 0; i < p.pages; i++) plan(i);
  const worker = async () => {
    while (!stop) {
      if (!queue.length) { if (!feeding) return; await new Promise((r) => waiters.push(r)); continue; }
      const i = queue.shift();
      try { if (p.text?.[i]) await enrichPage(p, key, i); else await readVision(p, key, i); }
      catch (e) { if (!p.text?.[i]) p.error = errText(e); if (e.message === 'key' || e.message === 'offline') stop = true; if (e.message === 'limit' && p.text?.[i]) stop = true; }
      await savePaper(p); onUpdate();
    }
  };
  const workers = key ? [worker(), worker(), worker()] : [];
  if (feeder) {
    try { await feeder((i) => { plan(i); savePaper(p); onUpdate(); }); }
    catch (e) { console.warn(e); p.error = 'Could not open every page of this file.'; }
    feeding = false; while (waiters.length) waiters.shift()();
  }
  await Promise.all(workers);
  p.status = p.readPages.length >= p.pages ? 'ready' : 'paused';
  if (p.status === 'ready' && !p.text?.some(Boolean)) p.error = '';
  if (p.status === 'paused' && !key) p.error = 'Photo pages need your free Gemini key. Add it in Settings, then tap Continue.';
  await savePaper(p); PAPERS.busy.delete(p.id); onUpdate();
}

export async function addPaper(files, key, onUpdate) {
  const isPdf = files.length === 1 && /pdf/i.test(files[0].type || files[0].name);
  const id = 'p' + Date.now();
  const p = { id, name: isPdf ? files[0].name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').slice(0, 50) : 'My newspaper', at: Date.now(), day: today(), pages: 0, readPages: [], labels: [], stories: [], readIds: [], tl: [], dims: [], text: [], enriched: [], status: 'loading', error: '' };
  PAPERS.list.unshift(p); onUpdate();
  const feeder = async (push) => {
    if (isPdf) await pdfPages(files[0], async (blob, i, n, tl, dims) => { await tx('pages', 'readwrite', (s) => s.put(blob, id + ':' + i)); p.tl[i] = tl; p.dims[i] = dims; p.text[i] = looksReadable(tl); p.pages = i + 1; p.total = n; push(i); });
    else for (const [i, f] of [...files].entries()) { const b = await photoBlob(f); await tx('pages', 'readwrite', (s) => s.put(b, id + ':' + i)); p.pages = i + 1; p.total = files.length; push(i); }
  };
  await run(p, key, onUpdate, feeder);
  if (!p.pages) { await removePaper(id); p.error = 'Could not open this file. Try the PDF again, or photos of the pages.'; onUpdate(); }
}
export async function resumePaper(p, key, onUpdate) { if (PAPERS.busy.has(p.id)) return; await run(p, key, onUpdate, null); }
export const isBusy = (p) => PAPERS.busy.has(p.id);
