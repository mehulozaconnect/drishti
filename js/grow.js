// Investment calculators. All maths is plain compounding; returns are user assumptions.
export const inr = (v, short = true) => {
  if (v == null || isNaN(v)) return '–';
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  if (short && a >= 1e7) return s + '₹' + (a / 1e7).toFixed(a >= 1e9 ? 0 : 2).replace(/\.00$/, '') + ' Cr';
  if (short && a >= 1e5) return s + '₹' + (a / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' L';
  return s + '₹' + Math.round(a).toLocaleString('en-IN');
};
export const dur = (m) => { const y = Math.floor(m / 12), mo = Math.round(m % 12); return [y ? y + (y === 1 ? ' yr' : ' yrs') : '', mo ? mo + ' mo' : ''].filter(Boolean).join(' ') || '1 mo'; };

export const fvSip = (P, ann, n) => { const r = ann / 1200; return r ? P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : P * n; };
export const monthsToGoal = (G, P, ann) => { const r = ann / 1200; return Math.ceil(Math.log(1 + (G * r) / (P * (1 + r))) / Math.log(1 + r)); };
export const sipForGoal = (G, ann, n) => { const r = ann / 1200; return G / (((Math.pow(1 + r, n) - 1) / r) * (1 + r)); };

function sipSeries(P, ann, years, stepPct = 0) {
  const r = ann / 1200; let bal = 0, inv = 0, p = P; const s = [];
  for (let m = 1; m <= years * 12; m++) {
    bal = (bal + p) * (1 + r); inv += p;
    if (m % 12 === 0) { s.push({ y: m / 12, inv, val: bal }); p = p * (1 + stepPct / 100); }
  }
  return s;
}

const money = (v) => inr(v, false);
export const CALCS = [
  { id: 'sip', name: 'SIP', icon: 'repeat', desc: 'What a monthly investment can grow to.',
    fields: [{ k: 'p', l: 'Monthly SIP', min: 500, max: 200000, step: 500, d: 10000, f: money }, { k: 'r', l: 'Expected return a year', min: 4, max: 18, step: 0.5, d: 12, f: (v) => v + '%' }, { k: 'y', l: 'Years', min: 1, max: 40, step: 1, d: 10, f: (v) => v + ' yrs' }],
    run: ({ p, r, y }) => { const s = sipSeries(p, r, y); const l = s[s.length - 1]; return { head: inr(l.val), sub: `after ${y} years`, inv: l.inv, gain: l.val - l.inv, series: s }; } },
  { id: 'stepup', name: 'Step-up SIP', icon: 'trend', desc: 'Raise your SIP every year with your salary.',
    fields: [{ k: 'p', l: 'Starting monthly SIP', min: 500, max: 200000, step: 500, d: 10000, f: money }, { k: 's', l: 'Increase every year', min: 0, max: 25, step: 1, d: 10, f: (v) => v + '%' }, { k: 'r', l: 'Expected return a year', min: 4, max: 18, step: 0.5, d: 12, f: (v) => v + '%' }, { k: 'y', l: 'Years', min: 1, max: 40, step: 1, d: 15, f: (v) => v + ' yrs' }],
    run: ({ p, s: st, r, y }) => { const s = sipSeries(p, r, y, st); const flat = sipSeries(p, r, y); const l = s[s.length - 1]; return { head: inr(l.val), sub: `after ${y} years · ${inr(l.val - flat[flat.length - 1].val)} more than a flat SIP`, inv: l.inv, gain: l.val - l.inv, series: s }; } },
  { id: 'lump', name: 'Lump sum', icon: 'coin', desc: 'Invest once and let it compound.',
    fields: [{ k: 'p', l: 'Amount invested once', min: 1000, max: 5000000, step: 1000, d: 100000, f: money }, { k: 'r', l: 'Expected return a year', min: 4, max: 18, step: 0.5, d: 12, f: (v) => v + '%' }, { k: 'y', l: 'Years', min: 1, max: 40, step: 1, d: 10, f: (v) => v + ' yrs' }],
    run: ({ p, r, y }) => { const s = []; for (let i = 1; i <= y; i++) s.push({ y: i, inv: p, val: p * Math.pow(1 + r / 100, i) }); const l = s[s.length - 1]; return { head: inr(l.val), sub: `after ${y} years · ${(l.val / p).toFixed(1)}× your money`, inv: p, gain: l.val - p, series: s }; } },
  { id: 'goal', name: 'Goal planner', icon: 'target', desc: 'Monthly SIP needed to reach a target.',
    fields: [{ k: 'g', l: 'Target amount', min: 100000, max: 50000000, step: 100000, d: 1000000, f: money }, { k: 'y', l: 'In how many years', min: 1, max: 30, step: 1, d: 5, f: (v) => v + ' yrs' }, { k: 'r', l: 'Expected return a year', min: 4, max: 18, step: 0.5, d: 12, f: (v) => v + '%' }],
    run: ({ g, y, r }) => { const p = sipForGoal(g, r, y * 12); const s = sipSeries(p, r, y); return { head: inr(Math.ceil(p / 100) * 100) + ' / month', sub: `to reach ${inr(g)} in ${y} years`, inv: p * y * 12, gain: g - p * y * 12, series: s }; } },
  { id: 'fd', name: 'Fixed deposit', icon: 'bank', desc: 'Bank FD with quarterly compounding.',
    fields: [{ k: 'p', l: 'Deposit', min: 5000, max: 10000000, step: 5000, d: 100000, f: money }, { k: 'r', l: 'Interest rate', min: 3, max: 9.5, step: 0.05, d: 7, f: (v) => v + '%' }, { k: 'y', l: 'Years', min: 1, max: 10, step: 1, d: 3, f: (v) => v + ' yrs' }],
    run: ({ p, r, y }) => { const s = []; for (let i = 1; i <= y; i++) s.push({ y: i, inv: p, val: p * Math.pow(1 + r / 400, 4 * i) }); const l = s[s.length - 1]; return { head: inr(l.val), sub: `maturity value · interest is taxable at your slab`, inv: p, gain: l.val - p, series: s }; } },
  { id: 'rd', name: 'Recurring deposit', icon: 'calendar', desc: 'Monthly deposit at a bank or post office.',
    fields: [{ k: 'p', l: 'Monthly deposit', min: 500, max: 200000, step: 500, d: 5000, f: money }, { k: 'r', l: 'Interest rate', min: 3, max: 9.5, step: 0.05, d: 6.8, f: (v) => v + '%' }, { k: 'y', l: 'Years', min: 1, max: 10, step: 1, d: 5, f: (v) => v + ' yrs' }],
    run: ({ p, r, y }) => { const n = y * 12; const s = []; let val = 0; for (let m = 1; m <= n; m++) { val += p * Math.pow(1 + r / 400, 4 * ((n - m + 1) / 12)); } for (let i = 1; i <= y; i++) { let v = 0; const nn = i * 12; for (let m = 1; m <= nn; m++) v += p * Math.pow(1 + r / 400, 4 * ((nn - m + 1) / 12)); s.push({ y: i, inv: p * nn, val: v }); } return { head: inr(val), sub: 'maturity value', inv: p * n, gain: val - p * n, series: s }; } },
  { id: 'ppf', name: 'PPF', icon: 'shield', desc: 'Public Provident Fund, 15 years, tax-free.',
    fields: [{ k: 'p', l: 'Yearly deposit (max ₹1.5 L)', min: 500, max: 150000, step: 500, d: 150000, f: money }, { k: 'r', l: 'Interest rate (check current rate)', min: 6, max: 9, step: 0.05, d: 7.1, f: (v) => v + '%' }, { k: 'y', l: 'Years', min: 15, max: 30, step: 5, d: 15, f: (v) => v + ' yrs' }],
    run: ({ p, r, y }) => { let bal = 0; const s = []; for (let i = 1; i <= y; i++) { bal = (bal + p) * (1 + r / 100); s.push({ y: i, inv: p * i, val: bal }); } return { head: inr(bal), sub: 'tax-free at maturity', inv: p * y, gain: bal - p * y, series: s }; } },
  { id: 'emi', name: 'Loan EMI', icon: 'home', desc: 'Monthly EMI and total interest on a loan.',
    fields: [{ k: 'p', l: 'Loan amount', min: 50000, max: 20000000, step: 50000, d: 5000000, f: money }, { k: 'r', l: 'Interest rate', min: 6, max: 20, step: 0.05, d: 8.5, f: (v) => v + '%' }, { k: 'y', l: 'Tenure', min: 1, max: 30, step: 1, d: 20, f: (v) => v + ' yrs' }],
    run: ({ p, r, y }) => { const i = r / 1200, n = y * 12; const e = (p * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1); return { head: inr(e, false) + ' / month', sub: `total interest ${inr(e * n - p)} · total paid ${inr(e * n)}`, inv: p, gain: e * n - p, labels: ['Principal', 'Interest'] }; } },
  { id: 'retire', name: 'Retirement', icon: 'sun', desc: 'Corpus you need and SIP to get there.',
    fields: [{ k: 'e', l: 'Monthly expenses today', min: 10000, max: 500000, step: 5000, d: 60000, f: money }, { k: 'a', l: 'Years to retirement', min: 5, max: 40, step: 1, d: 20, f: (v) => v + ' yrs' }, { k: 'inf', l: 'Inflation', min: 3, max: 9, step: 0.5, d: 6, f: (v) => v + '%' }, { k: 'r', l: 'Return before retirement', min: 6, max: 15, step: 0.5, d: 12, f: (v) => v + '%' }],
    run: ({ e, a, inf, r }) => { const fe = e * Math.pow(1 + inf / 100, a); const corpus = fe * 12 * 25; const p = sipForGoal(corpus, r, a * 12); return { head: inr(corpus), sub: `corpus needed (25× yearly expenses of ${inr(fe * 12)}) · SIP ${inr(Math.ceil(p / 100) * 100, false)}/month`, inv: p * a * 12, gain: corpus - p * a * 12, series: sipSeries(p, r, a) }; } },
  { id: 'inflation', name: 'Inflation', icon: 'flame', desc: 'What things will cost in the future.',
    fields: [{ k: 'c', l: 'Cost today', min: 1000, max: 10000000, step: 1000, d: 100000, f: money }, { k: 'inf', l: 'Inflation', min: 2, max: 12, step: 0.5, d: 6, f: (v) => v + '%' }, { k: 'y', l: 'Years', min: 1, max: 40, step: 1, d: 15, f: (v) => v + ' yrs' }],
    run: ({ c, inf, y }) => { const f = c * Math.pow(1 + inf / 100, y); return { head: inr(f), sub: `in ${y} years · today’s ₹1 lakh will buy only ${inr(1e5 / Math.pow(1 + inf / 100, y))} of goods`, inv: c, gain: f - c, labels: ['Today', 'Extra cost'] }; } },
  { id: 'cagr', name: 'CAGR', icon: 'percent', desc: 'Yearly growth rate between two values.',
    fields: [{ k: 's', l: 'Starting value', min: 1000, max: 10000000, step: 1000, d: 100000, f: money }, { k: 'e', l: 'Ending value', min: 1000, max: 50000000, step: 1000, d: 250000, f: money }, { k: 'y', l: 'Years', min: 1, max: 40, step: 1, d: 7, f: (v) => v + ' yrs' }],
    run: ({ s, e, y }) => { const c = (Math.pow(e / s, 1 / y) - 1) * 100; return { head: c.toFixed(2) + '% a year', sub: `${(e / s).toFixed(2)}× in ${y} years`, inv: s, gain: e - s }; } }
];
