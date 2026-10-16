export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

export function angDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
}

export const bus = {
  h: {},
  on(n, f) { (this.h[n] || (this.h[n] = [])).push(f); },
  emit(n, a) { const l = this.h[n]; if (l) for (const f of l) f(a); },
};

// ---- storage (always wrapped: private mode / blocked storage must not break the game) ----
const KEY = 'swarm-survivor-save-v1';

function deepMerge(def, o) {
  if (typeof def !== 'object' || def === null || Array.isArray(def)) {
    if (o === undefined || o === null) return def;
    if (typeof def === 'number' && typeof o !== 'number') return def;
    if (typeof def === 'boolean' && typeof o !== 'boolean') return def;
    return o;
  }
  const out = {};
  const src = o && typeof o === 'object' ? o : {};
  for (const k in def) out[k] = deepMerge(def[k], src[k]);
  for (const k in src) if (!(k in out)) out[k] = src[k];
  return out;
}

export function loadSave(def) {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return deepMerge(def, {});
    return deepMerge(def, JSON.parse(s));
  } catch (e) {
    return deepMerge(def, {});
  }
}

export function writeSave(o) {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

// ---- spatial hash grid centred on the player ----
// Entities with r > BIG_R are kept in a side list so queries can use a small margin.
const BIG_R = 40;
export class Grid {
  constructor(size, cell, maxItems) {
    this.cell = cell;
    this.n = Math.ceil(size / cell);
    this.size = this.n * cell;
    const cells = this.n * this.n;
    this.start = new Int32Array(cells + 1);
    this.cnt = new Int32Array(cells);
    this.items = new Int32Array(maxItems);
    this.ic = new Int32Array(maxItems);
    this.big = new Int32Array(64);
    this.nBig = 0;
    this.ox = 0; this.oy = 0;
    this.list = null;
  }

  build(list, count, cx, cy) {
    const n = this.n, cell = this.cell;
    this.list = list;
    const ox = (this.ox = cx - this.size / 2);
    const oy = (this.oy = cy - this.size / 2);
    const cnt = this.cnt, ic = this.ic;
    cnt.fill(0);
    this.nBig = 0;
    for (let i = 0; i < count; i++) {
      const e = list[i];
      if (e.dead) { ic[i] = -1; continue; }
      if (e.r > BIG_R) {
        ic[i] = -1;
        if (this.nBig < 64) this.big[this.nBig++] = i;
        continue;
      }
      const fx = e.x - ox, fy = e.y - oy;
      if (fx < 0 || fy < 0) { ic[i] = -1; continue; }
      const gx = (fx / cell) | 0, gy = (fy / cell) | 0;
      if (gx >= n || gy >= n) { ic[i] = -1; continue; }
      const c = gy * n + gx;
      ic[i] = c;
      cnt[c]++;
    }
    const st = this.start;
    let acc = 0;
    const cells = n * n;
    for (let c = 0; c < cells; c++) { st[c] = acc; acc += cnt[c]; }
    st[cells] = acc;
    cnt.fill(0);
    const items = this.items;
    for (let i = 0; i < count; i++) {
      const c = ic[i];
      if (c < 0) continue;
      items[st[c] + cnt[c]++] = i;
    }
  }

  // Fills `out` with indices of entities whose circle overlaps (x,y,r). Returns count.
  query(x, y, r, out) {
    const list = this.list;
    if (!list) return 0;
    const cell = this.cell, n = this.n, max = out.length;
    const m = r + BIG_R;
    let x0 = Math.floor((x - m - this.ox) / cell), x1 = Math.floor((x + m - this.ox) / cell);
    let y0 = Math.floor((y - m - this.oy) / cell), y1 = Math.floor((y + m - this.oy) / cell);
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0;
    if (x1 >= n) x1 = n - 1; if (y1 >= n) y1 = n - 1;
    let k = 0;
    const st = this.start, cnt = this.cnt, items = this.items;
    for (let b = 0; b < this.nBig; b++) {
      const i = this.big[b];
      const e = list[i];
      if (!e || e.dead) continue;
      const dx = e.x - x, dy = e.y - y, rr = r + e.r;
      if (dx * dx + dy * dy < rr * rr) { out[k++] = i; if (k >= max) return k; }
    }
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const c = gy * n + gx;
        const s = st[c], e2 = s + cnt[c];
        for (let j = s; j < e2; j++) {
          const i = items[j];
          const e = list[i];
          if (e.dead) continue;
          const dx = e.x - x, dy = e.y - y, rr = r + e.r;
          if (dx * dx + dy * dy < rr * rr) { out[k++] = i; if (k >= max) return k; }
        }
      }
    }
    return k;
  }
}
