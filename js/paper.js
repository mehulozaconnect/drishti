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
    const vp = page.getViewport({ scale: Math.min(3, 1700 / v.width) });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    let text = '';
    try { text = (await page.getTextContent()).items.map((t) => t.str + (t.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+/g, ' ').trim(); } catch {}
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.74));
    await onPage(blob, i - 1, n, text);
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

// ---------- reading a page with Gemini ----------
const PROMPT = `You are reading one page of an Indian newspaper (photo or e-paper scan).
List every news story, column and article on this page. Skip advertisements, classifieds, obituaries, mastheads, page indexes, weather boxes, puzzles and horoscopes.
Return only JSON in this shape:
{"paper":"name of the newspaper if printed on this page, else empty","label":"what this page is, e.g. Front page, Mumbai, Nation, World, Business, Sports, Entertainment, Editorial","stories":[
 {"h":"headline exactly as printed",
  "k":"section or topic in 1-2 words",
  "b":"the complete story text as printed, in reading order, joined across columns, split into paragraphs with \\n\\n. Fix broken hyphenation. If it says it continues on another page, end with that note.",
  "s":"what happened, in two short, simple sentences",
  "w":"why it matters to a reader living in Mumbai, in one short simple sentence",
  "place":"one of Mumbai, India, World, Business, Sports, Entertainment, Other",
  "imp":"importance from 1 to 5 (5 = lead story of the page, 1 = small brief)",
  "box":[ymin,xmin,ymax,xmax]  // where the whole story (headline + text) sits on the page, numbers 0-1000
 }]}
Use only what is printed. Do not invent anything.`;
const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
async function readPage(key, blob, text) {
  const data = await toB64(blob);
  const parts = [{ inline_data: { mime_type: 'image/jpeg', data } }, { text: PROMPT + (text && text.length > 200 ? `\n\nThe PDF also carries this text layer for the page (may be out of order; use it to get words right):\n${text.slice(0, 24000)}` : '') }];
  for (let attempt = 0; attempt < 4; attempt++) {
    let limited = false;
    for (const model of MODELS) {
      const cfg = { temperature: 0.1, responseMimeType: 'application/json', maxOutputTokens: 30000 };
      if (/2\.5|latest/.test(model)) cfg.thinkingConfig = { thinkingBudget: 0 };
      let r;
      try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: cfg }) }); }
      catch { throw new Error('offline'); }
      if (r.status === 429 || r.status === 503) { limited = true; continue; }
      if (r.status === 400 || r.status === 403) { const t = await r.text(); if (/API key/i.test(t)) throw new Error('key'); continue; }
      if (!r.ok) continue;
      const j = await r.json();
      const out = j.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      try { return JSON.parse(out.replace(/^```(json)?|```$/g, '').trim()); } catch { continue; }
    }
    if (!limited) break;
    await new Promise((r) => setTimeout(r, 35000)); // free limit: wait and try again
  }
  throw new Error('limit');
}
const clampBox = (b) => Array.isArray(b) && b.length === 4 && b.every((x) => typeof x === 'number') ? b.map((x) => Math.max(0, Math.min(1000, Math.round(x)))) : null;

async function readAll(p, key, texts, onUpdate) {
  PAPERS.busy.add(p.id);
  p.status = 'reading'; p.error = ''; await savePaper(p); onUpdate();
  const todo = []; for (let i = 0; i < p.pages; i++) if (!p.readPages.includes(i)) todo.push(i);
  let failed = 0;
  const worker = async () => {
    while (todo.length) {
      const i = todo.shift();
      try {
        const blob = await tx('pages', 'readonly', (s) => s.get(p.id + ':' + i));
        const res = await readPage(key, blob, texts?.[i] || '');
        if (i === 0 && res.paper && res.paper.length < 60) p.name = res.paper.trim();
        p.labels[i] = (res.label || '').slice(0, 40);
        p.stories = p.stories.filter((x) => x.pg !== i);
        (res.stories || []).forEach((x, k) => { if (!x.h || !x.b) return; p.stories.push({ id: `${p.id}-${i}-${k}`, pg: i, h: String(x.h).trim(), k: String(x.k || '').trim(), b: String(x.b).trim(), s: String(x.s || '').trim(), w: String(x.w || '').trim(), place: x.place || 'Other', imp: Math.max(1, Math.min(5, Number(x.imp) || 2)), box: clampBox(x.box) }); });
        p.readPages.push(i);
      } catch (e) { failed++; p.error = e.message === 'key' ? 'Your Gemini key was not accepted. Check it in Settings.' : e.message === 'offline' ? 'You went offline. Tap Continue to finish.' : 'Google’s free AI limit was reached. Tap Continue in a minute to finish.'; if (e.message === 'key' || e.message === 'offline') todo.length = 0; }
      await savePaper(p); onUpdate();
    }
  };
  await Promise.all([worker(), worker()]);
  p.status = p.readPages.length >= p.pages ? 'ready' : 'paused';
  if (p.status === 'ready') p.error = '';
  await savePaper(p); PAPERS.busy.delete(p.id); onUpdate();
}

export async function addPaper(files, key, onUpdate) {
  const isPdf = files.length === 1 && /pdf/i.test(files[0].type || files[0].name);
  const id = 'p' + Date.now();
  const p = { id, name: isPdf ? files[0].name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').slice(0, 50) : 'My newspaper', at: Date.now(), day: today(), pages: 0, readPages: [], labels: [], stories: [], readIds: [], status: 'loading', error: '' };
  PAPERS.list.unshift(p); PAPERS.busy.add(id); onUpdate();
  const texts = [];
  try {
    if (isPdf) await pdfPages(files[0], async (blob, i, n, text) => { await tx('pages', 'readwrite', (s) => s.put(blob, id + ':' + i)); texts[i] = text; p.pages = i + 1; p.total = n; await savePaper(p); onUpdate(); });
    else for (const [i, f] of [...files].entries()) { const b = await photoBlob(f); await tx('pages', 'readwrite', (s) => s.put(b, id + ':' + i)); p.pages = i + 1; await savePaper(p); onUpdate(); }
  } catch (e) { console.warn(e); p.status = 'paused'; p.error = 'Could not open this file. Try the PDF again, or photos of the pages.'; await savePaper(p); PAPERS.busy.delete(id); onUpdate(); return; }
  if (!p.pages) { await removePaper(id); onUpdate(); return; }
  p.texts = texts; // kept so a paused paper can resume with the PDF text
  await readAll(p, key, texts, onUpdate);
}
export async function resumePaper(p, key, onUpdate) { if (PAPERS.busy.has(p.id)) return; await readAll(p, key, p.texts || [], onUpdate); }
export const isBusy = (p) => PAPERS.busy.has(p.id);
