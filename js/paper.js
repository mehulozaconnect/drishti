// Today's Paper: newspapers you upload (e-paper PDF or photos of pages), read page by page on this phone.
// Pages and stories stay on this phone (IndexedDB). Reading the pages uses your own Gemini key.

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
      tl = tc.items.filter((t) => t.str && t.str.trim()).map((t) => { const [x, y] = v.convertToViewportPoint(t.transform[4], t.transform[5]); const hh = Math.abs(t.transform[3]) || t.height || 8; return [Math.round((x / v.width) * 1000), Math.round(((y - hh / 2) / v.height) * 1000), Math.round((hh / v.height) * 1000), t.str, t.hasEOL ? 1 : 0]; });
    } catch {}
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.72));
    await onPage(blob, i - 1, n, tl);
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
async function gemini(key, parts, json, maxOut) {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];
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
    await new Promise((r) => setTimeout(r, 30000)); // free limit: wait and try again
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
// story text from the PDF text layer inside the story's box
function textFromLayer(tl, box, h) {
  if (!tl?.length || !box) return '';
  const [y0, x0, y1, x1] = box; const m = 8;
  const inside = tl.filter(([x, y]) => x >= x0 - m && x <= x1 + m && y >= y0 - m && y <= y1 + m);
  if (!inside.length) return '';
  // body size = the most common text height; bigger text is headline, smaller is captions/credits
  const hs = {}; for (const t of inside) hs[t[2]] = (hs[t[2]] || 0) + t[3].length;
  const body = Number(Object.entries(hs).sort((a, b) => b[1] - a[1])[0][0]);
  let out = ''; let prev = null;
  for (const t of inside) {
    if (t[2] > body * 1.45) continue; // headline / kicker
    if (prev && (t[1] - prev[1] > body * 1.9 || prev[1] - t[1] > body * 3)) out += t[1] - prev[1] > body * 2.6 ? '\n\n' : ' ';
    else if (prev) out += prev[4] || /\s$/.test(prev[3]) || /^\s/.test(t[3]) ? ' ' : '';
    out += t[3]; prev = t;
  }
  out = out.replace(/(\w)-\s+(\w)/g, '$1$2').replace(/[ \t]+/g, ' ').replace(/ ?\n\n ?/g, '\n\n').trim();
  return out.length > 120 ? out : '';
}
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

async function readOne(p, key, i) {
  const blob = await tx('pages', 'readonly', (s) => s.get(p.id + ':' + i));
  const res = await findStories(key, blob);
  if (i === 0 && res.paper && res.paper.length < 60) p.name = res.paper.trim();
  p.labels[i] = (res.label || '').slice(0, 30);
  const tl = p.tl?.[i];
  p.stories = p.stories.filter((x) => x.pg !== i);
  (res.stories || []).forEach((x, k) => { if (!x.h) return; const box = clampBox(x.box); p.stories.push({ id: `${p.id}-${i}-${k}`, pg: i, h: String(x.h).trim(), k: String(x.k || '').trim(), b: textFromLayer(tl, box, x.h), s: String(x.s || '').trim(), w: String(x.w || '').trim(), place: x.place || 'Other', imp: Math.max(1, Math.min(5, Number(x.imp) || 2)), box }); });
  p.readPages.push(i);
}
const errText = (e) => e.message === 'key' ? 'Your Gemini key was not accepted. Check it in Settings.' : e.message === 'offline' ? 'You went offline. Tap Continue to finish.' : 'Google’s free AI limit was reached. Tap Continue in a minute to finish.';

// pages are read while the rest are still opening, 3 at a time
async function run(p, key, onUpdate, feeder) {
  PAPERS.busy.add(p.id);
  p.status = 'reading'; p.error = ''; await savePaper(p); onUpdate();
  const queue = []; for (let i = 0; i < p.pages; i++) if (!p.readPages.includes(i)) queue.push(i);
  let feeding = !!feeder, stop = false, wake = null;
  const worker = async () => {
    while (!stop) {
      if (!queue.length) { if (!feeding) return; await new Promise((r) => (wake = r)); continue; }
      const i = queue.shift();
      try { await readOne(p, key, i); }
      catch (e) { p.error = errText(e); if (e.message !== 'limit') stop = true; }
      await savePaper(p); onUpdate();
    }
  };
  const workers = [worker(), worker(), worker()];
  if (feeder) {
    try { await feeder((i) => { queue.push(i); wake?.(); wake = null; }); }
    catch (e) { console.warn(e); p.error = 'Could not open every page of this file.'; }
    feeding = false; wake?.();
    setTimeout(() => wake?.(), 50);
  }
  // release any waiting worker
  const tick = setInterval(() => { wake?.(); wake = null; }, 500);
  await Promise.all(workers); clearInterval(tick);
  p.status = p.readPages.length >= p.pages ? 'ready' : 'paused';
  if (p.status === 'ready') p.error = '';
  await savePaper(p); PAPERS.busy.delete(p.id); onUpdate();
}

export async function addPaper(files, key, onUpdate) {
  const isPdf = files.length === 1 && /pdf/i.test(files[0].type || files[0].name);
  const id = 'p' + Date.now();
  const p = { id, name: isPdf ? files[0].name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').slice(0, 50) : 'My newspaper', at: Date.now(), day: today(), pages: 0, readPages: [], labels: [], stories: [], readIds: [], tl: [], status: 'loading', error: '' };
  PAPERS.list.unshift(p); onUpdate();
  const feeder = async (push) => {
    if (isPdf) await pdfPages(files[0], async (blob, i, n, tl) => { await tx('pages', 'readwrite', (s) => s.put(blob, id + ':' + i)); p.tl[i] = tl; p.pages = i + 1; p.total = n; push(i); onUpdate(); });
    else for (const [i, f] of [...files].entries()) { const b = await photoBlob(f); await tx('pages', 'readwrite', (s) => s.put(b, id + ':' + i)); p.pages = i + 1; p.total = files.length; push(i); onUpdate(); }
  };
  await run(p, key, onUpdate, feeder);
  if (!p.pages) { await removePaper(id); p.error = 'Could not open this file. Try the PDF again, or photos of the pages.'; onUpdate(); }
}
export async function resumePaper(p, key, onUpdate) { if (PAPERS.busy.has(p.id)) return; await run(p, key, onUpdate, null); }
export const isBusy = (p) => PAPERS.busy.has(p.id);
