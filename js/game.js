import { TAU, clamp, rand, angDiff, bus, Grid } from './util.js';
import {
  WEAPONS, PASSIVES, ENEMIES, CHARS, WAVES, EVENTS, RUN_TIME, WEAPON_MAX, SLOT_MAX,
  weaponStats, xpNeed, hpScale,
} from './data.js';
import { sfx, setIntensity } from './audio.js';
import { meta, saveMeta, upLevel, checkAch } from './meta.js';

// ---------------------------------------------------------------- state
export const G = {
  mode: 'title', // title | play | lvintro | levelup | chest | pause | ending | over
  t: 0, realT: 0, ts: 1,
  view: { w: 1280, h: 800, dpr: 1, zoom: 1, ww: 1280, wh: 800, spawnR: 800, despawnR: 1200 },
  cam: { x: 0, y: 0 },
  shake: 0, redFlash: 0, whiteFlash: 0, lvFlash: 0,
  p: null, stats: null, weapons: [], passives: [], char: null,
  level: 1, xp: 0, xpNext: 5, kills: 0, coins: 0, coinFrac: 0,
  combo: 0, comboT: 0, bestCombo: 0, gemCombo: 0, gemComboT: 0,
  pendingLv: 0, lvT: 0, rerolls: 0, revives: 0, options: null,
  boss: null, evtI: 0, waveI: 0, spawnAcc: 0,
  ending: false, won: false, endT: 0, evolved: 0, bossKills: 0, dmgTaken: 0,
  input: { x: 0, y: 0 },
  auto: false, sim: false,
  lowFx: false, perfCap: 700, ptCap: 1400,
  achT: 0, lsAcc: 0, lsT: 0, trailT: 0,
  summary: null,
};

export const E = [];
export const PROJ = [];
export const GEMS = [];
export const PICKS = [];
export const ZONES = [];
export const FX = [];
export const EB = [];
export const NUMS = [];

const MAXE = 900, MAXP = 500, MAXG = 600, MAXK = 80, MAXZ = 90, MAXFX = 320, MAXEB = 420, MAXN = 100, MAXPT = 1800;

function newEnemy() {
  return {
    uid: 0, def: null, type: '', x: 0, y: 0, kx: 0, ky: 0, r: 10, hp: 1, maxHp: 1, speed: 0, dmg: 0, xp: 1,
    flash: 0, elite: false, boss: false, dead: false, slow: 0, slowT: 0, hitT: new Float32Array(8),
    st: 0, timer: 0, timer2: 0, ang: 0, lockVx: 0, lockVy: 0, lockT: 0, fuse: -1, spawn: 0, side: 1,
    kbRes: 1, face: 0, ci: 0, mx: 0, my: 0, cspd: 0, dashX: 0, dashY: 0, cnt: 0,
  };
}
const ePool = []; for (let i = 0; i < MAXE; i++) ePool.push(newEnemy());
const pPool = []; for (let i = 0; i < MAXP; i++) pPool.push({ k: 0, x: 0, y: 0, vx: 0, vy: 0, r: 0, dmg: 0, life: 0, w: null, tgt: null, tuid: 0, retT: 0, spd: 0, boom: 0, ph: 0, trav: 0, range: 0, ang: 0, hitU: new Int32Array(16), hitT: new Float32Array(16), hi: 0, col: 0 });
const gPool = []; for (let i = 0; i < MAXG; i++) gPool.push({ x: 0, y: 0, v: 1, st: 0, sp: 0, t: 0 });
const kPool = []; for (let i = 0; i < MAXK; i++) kPool.push({ k: '', x: 0, y: 0, st: 0, sp: 0, t: 0 });
const zPool = []; for (let i = 0; i < MAXZ; i++) zPool.push({ x: 0, y: 0, r: 0, life: 0, max: 0, tickT: 0, dmg: 0, w: null, seed: 0 });
const fxPool = []; for (let i = 0; i < MAXFX; i++) fxPool.push({ k: 0, x: 0, y: 0, x2: 0, y2: 0, a: 0, r: 0, life: 0, max: 0, col: '', w: 0, pts: new Float32Array(64), n: 0, ref: null });
const ebPool = []; for (let i = 0; i < MAXEB; i++) ebPool.push({ x: 0, y: 0, vx: 0, vy: 0, r: 7, dmg: 0, life: 0 });
const nPool = []; for (let i = 0; i < MAXN; i++) nPool.push({ x: 0, y: 0, vy: 0, life: 0, max: 0, s: '', ty: 0 });

export const PT = {
  n: 0, x: new Float32Array(MAXPT), y: new Float32Array(MAXPT), vx: new Float32Array(MAXPT), vy: new Float32Array(MAXPT),
  life: new Float32Array(MAXPT), max: new Float32Array(MAXPT), size: new Float32Array(MAXPT), col: new Uint8Array(MAXPT),
};
export const PAL = [];
const PALI = new Map();
export function colIdx(c) {
  let i = PALI.get(c);
  if (i === undefined) { i = PAL.length; PAL.push(c); PALI.set(c, i); }
  return i;
}
const CI_WHITE = colIdx('#ffffff');
const CI_GOLD = colIdx('#ffd23f');
const CI_RED = colIdx('#ff3f5a');
const CI_CYAN = colIdx('#38f6ff');
const CI_ORANGE = colIdx('#ffa53a');
const CI_GREEN = colIdx('#5dff9a');
const CI_PINK = colIdx('#ff4fd8');
const CI_FIRE = colIdx('#ff5a3c');

export const FXK = { SLASH: 1, BOLT: 2, BEAM: 3, RING: 4, BOOM: 5, SKY: 6, TELE: 7 };
export const PK = { MISSILE: 1, BOOM: 2 };

const grid = new Grid(4200, 72, MAXE + 64);
const QA = new Int32Array(1024);
const QB = new Int32Array(1024);
const QS = new Int32Array(6);
const chainList = [];
let uidC = 0;

// ---------------------------------------------------------------- helpers
export function addShake(v) {
  if (!meta.save.settings.shake) return;
  G.shake = Math.min(1, G.shake + v);
}

function part(x, y, vx, vy, life, size, ci) {
  if (PT.n >= G.ptCap) return;
  const i = PT.n++;
  PT.x[i] = x; PT.y[i] = y; PT.vx[i] = vx; PT.vy[i] = vy;
  PT.life[i] = life; PT.max[i] = life; PT.size[i] = size; PT.col[i] = ci;
}

export function burst(x, y, ci, n, spd, size, life) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * TAU, s = spd * (0.25 + Math.random() * 0.75);
    part(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.7), ci);
  }
}

function addFx(k, x, y, life, col) {
  let f = fxPool.pop();
  if (!f) { f = FX[0]; FX.splice(0, 1); }
  f.k = k; f.x = x; f.y = y; f.life = life; f.max = life; f.col = col; f.n = 0; f.ref = null; f.a = 0; f.r = 0; f.w = 0; f.x2 = x; f.y2 = y;
  FX.push(f);
  return f;
}

function addNum(x, y, v, ty) {
  let n = nPool.pop();
  if (!n) { n = NUMS[0]; NUMS.splice(0, 1); }
  n.x = x; n.y = y; n.vy = -70 - Math.random() * 30; n.life = n.max = ty === 1 ? 0.9 : 0.65; n.s = '' + v; n.ty = ty;
  NUMS.push(n);
}

export function banner(text, kind) { bus.emit('banner', { text, kind: kind || '' }); }

// ---------------------------------------------------------------- stats
function plv(id) {
  for (const p of G.passives) if (p.id === id) return p.level;
  return 0;
}

export function recalcStats() {
  const b = (G.char && G.char.bonus) || {};
  const s = {
    might: 1 + 0.1 * plv('might') + 0.05 * upLevel('might') + (b.might || 0),
    armor: plv('armor') + upLevel('armor'),
    maxhp: 100 + 20 * plv('maxhp') + 10 * upLevel('maxhp') + (b.maxhp || 0),
    regen: 0.3 * plv('regen') + 0.1 * upLevel('regen'),
    speed: 1 + 0.08 * plv('speed') + 0.05 * upLevel('speed') + (b.speed || 0),
    cd: Math.max(0.4, 1 - 0.07 * plv('cooldown') - 0.03 * upLevel('cooldown') - (b.cooldown || 0)),
    area: 1 + 0.1 * plv('area') + 0.05 * upLevel('area'),
    magnet: 72 * (1 + 0.3 * plv('magnet') + 0.15 * upLevel('magnet')),
    amount: plv('amount'),
    dur: 1 + 0.12 * plv('duration'),
    crit: 0.05 + 0.06 * plv('crit') + (b.crit || 0),
    growth: 1 + 0.08 * plv('growth') + 0.05 * upLevel('growth'),
    greed: 1 + 0.1 * upLevel('greed'),
  };
  const old = G.stats ? G.stats.maxhp : s.maxhp;
  G.stats = s;
  if (G.p) {
    G.p.maxHp = s.maxhp;
    if (s.maxhp > old) G.p.hp += s.maxhp - old;
    if (G.p.hp > s.maxhp) G.p.hp = s.maxhp;
  }
  for (const w of G.weapons) w.st = weaponStats(w.id, w.level, w.evo);
}

// ---------------------------------------------------------------- run lifecycle
function clearPools() {
  for (const e of E) ePool.push(e); E.length = 0;
  for (const p of PROJ) pPool.push(p); PROJ.length = 0;
  for (const g of GEMS) gPool.push(g); GEMS.length = 0;
  for (const k of PICKS) kPool.push(k); PICKS.length = 0;
  for (const z of ZONES) zPool.push(z); ZONES.length = 0;
  for (const f of FX) fxPool.push(f); FX.length = 0;
  for (const b of EB) ebPool.push(b); EB.length = 0;
  for (const n of NUMS) nPool.push(n); NUMS.length = 0;
  for (const b of BQ) bqPool.push(b); BQ.length = 0;
  PT.n = 0;
}

export function startRun(charId) {
  clearPools();
  const ch = CHARS.find((c) => c.id === charId) || CHARS[0];
  G.char = ch;
  Object.assign(G, {
    mode: 'play', t: 0, ts: 1, level: 1, xp: 0, xpNext: xpNeed(1), kills: 0, coins: 0, coinFrac: 0,
    combo: 0, comboT: 0, bestCombo: 0, gemCombo: 0, gemComboT: 0, pendingLv: 0, lvT: 0, options: null,
    boss: null, evtI: 0, waveI: 0, spawnAcc: 0, ending: false, won: false, endT: 0, evolved: 0, bossKills: 0,
    dmgTaken: 0, dmgBy: {}, shake: 0, redFlash: 0, whiteFlash: 0, lvFlash: 0, achT: 0, lsAcc: 0, lsT: 0, summary: null,
  });
  G.p = { x: 0, y: 0, r: 13, hp: 100, maxHp: 100, inv: 1, fa: 0, fx: 1, fy: 0, moving: false, dead: false, trail: new Float32Array(24), trailN: 0, regenAcc: 0 };
  G.cam.x = 0; G.cam.y = 0;
  G.weapons = []; G.passives = []; G.stats = null;
  setWave(0);
  addWeapon(ch.weapon);
  recalcStats();
  G.p.hp = G.stats.maxhp;
  G.rerolls = upLevel('reroll');
  G.revives = upLevel('revive');
  meta.save.lastChar = ch.id;
  for (let k = 0; k < 8; k++) { edgePoint(); spawnE('crawler', spx, spy); }
  setIntensity(1);
  bus.emit('runstart');
}

function addWeapon(id) {
  const def = WEAPONS.find((w) => w.id === id);
  const w = { id, def, idx: def.idx, level: 1, evo: false, t: 0.4, dealt: 0, kills: 0, ang: Math.random() * TAU, pend: 0, pendT: 0, pendA: 0, spinT: 0, trailT: 0, side: 1, st: null, bx: new Float32Array(32), by: new Float32Array(32), nb: 0 };
  w.st = weaponStats(id, 1, false);
  G.weapons.push(w);
  return w;
}

function addPassive(id) {
  const def = PASSIVES.find((p) => p.id === id);
  G.passives.push({ id, def, level: 1 });
}

function canEvolve(w) {
  return !w.evo && w.level >= WEAPON_MAX && G.passives.some((p) => p.id === w.def.evo.with);
}

function evolve(w) {
  w.evo = true;
  G.evolved++;
  meta.save.stats.evolutions++;
  recalcStats();
  G.whiteFlash = 0.6;
  addShake(0.4);
  sfx.evolve();
  const f = addFx(FXK.RING, G.p.x, G.p.y, 0.8, '#ffd23f'); f.r = 420;
  burst(G.p.x, G.p.y, CI_GOLD, 60, 420, 5, 0.9);
  banner('进化！' + w.def.evo.name, 'evo');
}

// ---------------------------------------------------------------- level-up options
function describe(o) {
  const out = { kind: o.kind, id: o.id, name: '', desc: '', lv: '', tag: '', icon: o.id, evo: false, color: '#fff' };
  if (o.kind === 'wnew' || o.kind === 'wup' || o.kind === 'evo') {
    const def = WEAPONS.find((w) => w.id === o.id);
    out.color = def.color;
    if (o.kind === 'evo') {
      out.name = def.evo.name; out.desc = def.evo.desc; out.tag = '进化'; out.lv = '终极形态'; out.evo = true;
    } else if (o.kind === 'wnew') {
      out.name = def.name; out.desc = def.desc; out.tag = '新武器'; out.lv = 'Lv.1';
    } else {
      const w = G.weapons.find((x) => x.id === o.id);
      out.name = def.name; out.desc = def.lv[w.level]; out.lv = 'Lv.' + (w.level + 1);
      if (w.level + 1 === WEAPON_MAX) {
        const pdef = PASSIVES.find((p) => p.id === def.evo.with);
        out.hint = '满级 + 「' + pdef.name + '」→ 开宝箱进化';
      }
    }
  } else if (o.kind === 'pnew' || o.kind === 'pup') {
    const def = PASSIVES.find((p) => p.id === o.id);
    out.color = def.color; out.name = def.name; out.desc = def.desc;
    const cur = plv(o.id);
    out.lv = 'Lv.' + (cur + 1);
    if (o.kind === 'pnew') out.tag = '新道具';
    const evoFor = WEAPONS.find((w) => w.evo.with === o.id && G.weapons.some((x) => x.id === w.id && !x.evo));
    if (evoFor && o.kind === 'pnew') out.hint = '进化「' + evoFor.name + '」所需';
  } else if (o.kind === 'heal') {
    out.name = '能量补给'; out.desc = '立即回复 40 生命'; out.icon = 'heal'; out.color = '#ff5c8a';
  } else if (o.kind === 'gold') {
    out.name = '金币袋'; out.desc = '获得 25 金币'; out.icon = 'gold'; out.color = '#ffd23f';
  }
  return out;
}

function buildPool(forChest) {
  const pool = [];
  for (const w of G.weapons) if (!w.evo && w.level < WEAPON_MAX) pool.push({ kind: 'wup', id: w.id, w: forChest ? 4 : 3 });
  for (const p of G.passives) if (p.level < p.def.max) pool.push({ kind: 'pup', id: p.id, w: 2 });
  if (!forChest || pool.length === 0) {
    if (G.weapons.length < SLOT_MAX) {
      for (const d of WEAPONS) if (!G.weapons.some((w) => w.id === d.id)) pool.push({ kind: 'wnew', id: d.id, w: G.weapons.length < 3 ? 2.2 : 1.3 });
    }
    if (G.passives.length < SLOT_MAX) {
      for (const d of PASSIVES) {
        if (G.passives.some((p) => p.id === d.id)) continue;
        const partner = WEAPONS.some((w) => w.evo.with === d.id && G.weapons.some((x) => x.id === w.id));
        pool.push({ kind: 'pnew', id: d.id, w: partner ? 2.2 : 1 });
      }
    }
  }
  return pool;
}

function weightedTake(pool) {
  let tot = 0;
  for (const o of pool) tot += o.w;
  let r = Math.random() * tot;
  for (let i = 0; i < pool.length; i++) {
    r -= pool[i].w;
    if (r <= 0) return pool.splice(i, 1)[0];
  }
  return pool.pop();
}

export function rollOptions() {
  const opts = [];
  const pool = buildPool(false);
  if (G.level <= 6) for (const o of pool) if (o.kind === 'wup' && G.char && o.id === G.char.weapon) o.w = 6;
  while (opts.length < 3 && pool.length) opts.push(weightedTake(pool));
  if (opts.length < 3) opts.push({ kind: 'heal', id: 'heal' });
  if (opts.length < 3) opts.push({ kind: 'gold', id: 'gold' });
  G.options = opts.map(describe);
  return G.options;
}

function applyOption(o) {
  switch (o.kind) {
    case 'wnew': addWeapon(o.id); break;
    case 'wup': { const w = G.weapons.find((x) => x.id === o.id); if (w) w.level++; break; }
    case 'pnew': addPassive(o.id); break;
    case 'pup': { const p = G.passives.find((x) => x.id === o.id); if (p) p.level++; break; }
    case 'evo': { const w = G.weapons.find((x) => x.id === o.id); if (w) evolve(w); break; }
    case 'heal': G.p.hp = Math.min(G.p.maxHp, G.p.hp + 40); addNum(G.p.x, G.p.y - 24, 40, 3); sfx.heal(); break;
    case 'gold': G.coins += 25; sfx.coin(); break;
  }
  recalcStats();
}

export function chooseOption(i) {
  if (G.mode !== 'levelup' || !G.options || !G.options[i]) return;
  applyOption(G.options[i]);
  sfx.pick();
  G.pendingLv--;
  G.options = null;
  if (G.pendingLv > 0) {
    bus.emit('levelup', rollOptions());
  } else {
    G.mode = 'play';
    G.ts = 0.05;
    bus.emit('resume');
  }
}

export function reroll() {
  if (G.mode !== 'levelup' || G.rerolls <= 0) return false;
  G.rerolls--;
  sfx.card();
  bus.emit('levelup', rollOptions());
  return true;
}

function beginLevelUp() {
  G.mode = 'lvintro';
  G.lvT = 0;
  G.lvFlash = 1;
  sfx.levelup();
  const p = G.p;
  const f = addFx(FXK.RING, p.x, p.y, 0.5, '#38f6ff'); f.r = 260;
  burst(p.x, p.y, CI_CYAN, 30, 300, 4, 0.6);
  // shockwave pushes nearby enemies back to give the player room
  for (const e of E) {
    const dx = e.x - p.x, dy = e.y - p.y, d2 = dx * dx + dy * dy;
    if (d2 > 200 * 200) continue;
    const d = Math.sqrt(d2) || 1;
    e.kx += (dx / d) * 420 * e.kbRes; e.ky += (dy / d) * 420 * e.kbRes;
  }
}

function openChest() {
  const items = [];
  const evoW = G.weapons.find(canEvolve);
  if (evoW) {
    items.push(describe({ kind: 'evo', id: evoW.id }));
    evolve(evoW);
  } else {
    const roll = Math.random();
    const n = roll < 0.12 ? 5 : roll < 0.42 ? 3 : 1;
    for (let k = 0; k < n; k++) {
      const pool = buildPool(true);
      if (!pool.length) break;
      const o = weightedTake(pool);
      items.push(describe(o));
      applyOption(o);
    }
    if (!items.length) { const o = { kind: 'heal', id: 'heal' }; items.push(describe(o)); applyOption(o); }
  }
  const coins = Math.round(rand(15, 35) * G.stats.greed * (1 + G.t / 600));
  G.coins += coins;
  sfx.chest();
  if (G.sim) return;
  G.mode = 'chest';
  bus.emit('chest', { items, coins });
}

export function closeChest() {
  if (G.mode !== 'chest') return;
  G.mode = 'play';
  G.ts = 0.2;
  bus.emit('resume');
}

export function togglePause(force) {
  if (G.mode === 'play' && force !== false) { G.mode = 'pause'; bus.emit('pause'); return true; }
  if (G.mode === 'pause' && force !== true) { G.mode = 'play'; G.ts = 0.3; bus.emit('resume'); return true; }
  return false;
}

// ---------------------------------------------------------------- spawning
let wTypes = [], wCum = [], wTot = 0;
function setWave(i) {
  G.waveI = i;
  const w = WAVES[i][3];
  wTypes = Object.keys(w); wCum = []; wTot = 0;
  for (const k of wTypes) { wTot += w[k]; wCum.push(wTot); }
}
function rollType() {
  const r = Math.random() * wTot;
  for (let i = 0; i < wCum.length; i++) if (r < wCum[i]) return wTypes[i];
  return wTypes[0];
}

let spx = 0, spy = 0;
// a point just outside the visible rectangle (or at a fixed distance), biased toward where the player is heading
function edgePoint(dist) {
  const p = G.p;
  let a;
  if (p.moving && Math.random() < 0.55) a = p.fa + rand(-1.1, 1.1);
  else a = Math.random() * TAU;
  const c = Math.cos(a), s = Math.sin(a);
  let d = dist;
  if (!d) {
    const hw = G.view.ww / 2 + 50, hh = G.view.wh / 2 + 50;
    d = Math.min(hw / Math.max(1e-3, Math.abs(c)), hh / Math.max(1e-3, Math.abs(s))) + Math.random() * 60;
  }
  spx = p.x + c * d; spy = p.y + s * d;
}

export function spawnE(type, x, y, elite, force) {
  if (!force && E.length >= MAXE - 40) return null;
  const e = ePool.pop();
  if (!e) return null;
  const d = ENEMIES[type];
  const hm = d.boss ? 1 + G.t / 900 : hpScale(G.t);
  e.uid = ++uidC; e.def = d; e.type = type; e.x = x; e.y = y; e.kx = 0; e.ky = 0;
  e.r = d.r; e.hp = e.maxHp = Math.round(d.hp * hm); e.speed = d.speed * rand(0.9, 1.1);
  e.dmg = d.dmg * (1 + G.t / 900 * 0.7); e.xp = d.xp; e.flash = 0; e.dead = false; e.slow = 0; e.slowT = 0;
  e.hitT.fill(-99); e.st = 0; e.timer = rand(0.8, 2.6); e.timer2 = 0; e.ang = 0; e.lockT = 0; e.fuse = -1;
  e.spawn = 0; e.side = Math.random() < 0.5 ? -1 : 1; e.elite = !!elite; e.boss = !!d.boss;
  e.kbRes = d.kbRes === undefined ? 1 : d.kbRes; e.face = Math.random() * TAU; e.ci = colIdx(d.color); e.cnt = 0;
  if (elite) {
    e.hp = e.maxHp = e.maxHp * 10; e.r *= 1.6; e.dmg *= 1.2; e.speed *= 0.85; e.xp *= 12; e.kbRes *= 0.2;
  }
  if (e.boss) { e.timer = 2.5; }
  E.push(e);
  return e;
}

function spawnAtEdge(type) {
  edgePoint();
  if (type === 'swarm') {
    for (let k = 0; k < 6; k++) spawnE('swarm', spx + rand(-40, 40), spy + rand(-40, 40));
  } else spawnE(type, spx, spy);
}

function runEvent(ev) {
  const p = G.p;
  banner(ev.text, ev.kind === 'boss' ? 'boss' : '');
  switch (ev.kind) {
    case 'stream': {
      const a = Math.random() * TAU;
      const dx = Math.cos(a), dy = Math.sin(a);
      const R = G.view.spawnR + 60;
      for (let k = 0; k < ev.n; k++) {
        const off = rand(-260, 260), back = k * 9;
        const x = p.x + dx * (R + back) - dy * off, y = p.y + dy * (R + back) + dx * off;
        const e = spawnE(ev.type, x, y, false, true);
        if (e) { e.lockVx = -dx; e.lockVy = -dy; e.lockT = 14; e.speed *= 1.25; }
      }
      sfx.dash();
      break;
    }
    case 'ring': {
      const R = Math.max(G.view.ww, G.view.wh) / 2 + 60;
      for (let k = 0; k < ev.n; k++) {
        const a = (k / ev.n) * TAU;
        spawnE(ev.type, p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, false, true);
      }
      sfx.warn();
      break;
    }
    case 'elite': {
      for (let k = 0; k < ev.n; k++) { edgePoint(); spawnE(ev.type, spx, spy, true, true); }
      break;
    }
    case 'boss': {
      edgePoint(G.view.spawnR + 40);
      const e = spawnE(ev.type, spx, spy, false, true);
      if (e) { G.boss = e; bus.emit('boss', e); }
      sfx.warn();
      setIntensity(3);
      addShake(0.4);
      break;
    }
  }
}

function spawnUpdate(dt) {
  while (G.waveI + 1 < WAVES.length && G.t >= WAVES[G.waveI + 1][0] * 60) setWave(G.waveI + 1);
  const w = WAVES[G.waveI];
  const nx = WAVES[G.waveI + 1] || w;
  const frac = clamp((G.t - w[0] * 60) / 60, 0, 1);
  const rate = w[1] + (nx[1] - w[1]) * frac;
  const cap = Math.min(w[2] + (nx[2] - w[2]) * frac, G.perfCap);
  G.spawnAcc += rate * dt * (G.boss ? 0.55 : 1);
  while (G.spawnAcc >= 1) {
    G.spawnAcc -= 1;
    if (E.length >= cap) { G.spawnAcc = 0; break; }
    spawnAtEdge(rollType());
  }
  while (G.evtI < EVENTS.length && G.t >= EVENTS[G.evtI].t) runEvent(EVENTS[G.evtI++]);
}

// ---------------------------------------------------------------- combat
function dmgE(e, base, w, kx, ky, kb) {
  if (e.dead) return false;
  const S = G.stats;
  let d = base * S.might * (0.88 + Math.random() * 0.24);
  const crit = Math.random() < S.crit;
  if (crit) d *= 2;
  d = Math.max(1, Math.round(d));
  e.hp -= d;
  e.flash = 0.09;
  if (w) w.dealt += d;
  if (kb && e.kbRes > 0) { const f = kb * e.kbRes; e.kx += kx * f; e.ky += ky * f; }
  if (meta.save.settings.dmgNums && !G.sim) addNum(Math.round(e.x + rand(-6, 6)), e.y - e.r * 0.6, d, crit ? 1 : 0);
  if (!G.sim) sfx.hit();
  if (e.hp <= 0) { killE(e, w, false); return true; }
  return false;
}

function killE(e, w, silent) {
  e.dead = true;
  if (silent) return;
  G.kills++;
  G.combo++; G.comboT = 2.4;
  if (G.combo > G.bestCombo) G.bestCombo = G.combo;
  if (w) w.kills++;
  if (!G.sim) {
    const big = e.boss ? 3 : e.elite ? 2 : e.r > 20 ? 1.4 : 1;
    burst(e.x, e.y, e.ci, G.lowFx ? 3 : Math.round(7 * big), 180 * big, 3.5 * Math.min(2, big), 0.45);
    if (Math.random() < 0.3) part(e.x, e.y, 0, 0, 0.14, e.r * 1.3, CI_WHITE);
    sfx.kill();
  }
  dropGem(e.x, e.y, e.xp);
  if (e.boss) {
    G.bossKills++;
    meta.save.stats.bossKills++;
    if (G.boss === e) G.boss = null;
    bus.emit('bosshp', null);
    addShake(0.8);
    G.whiteFlash = 0.7;
    sfx.bigboom();
    for (let k = 0; k < 24; k++) dropGem(e.x + rand(-90, 90), e.y + rand(-90, 90), Math.ceil(e.xp / 24));
    dropPick('chest', e.x, e.y);
    dropPick('heart', e.x + 40, e.y);
    const f = addFx(FXK.RING, e.x, e.y, 0.9, e.def.color); f.r = 500;
    burst(e.x, e.y, CI_GOLD, 80, 500, 6, 1.2);
    setIntensity(G.t >= 300 ? 2 : 1);
    banner('首领已击破！', 'evo');
    if (e.def.boss === 'void') beginEnding(true);
  } else if (e.elite) {
    dropPick('chest', e.x, e.y);
    addShake(0.25);
  } else {
    const r = Math.random();
    if (r < 0.011) dropPick('heart', e.x, e.y);
    else if (r < 0.0145) dropPick('magnet', e.x, e.y);
    else if (r < 0.0153) dropPick('nuke', e.x, e.y);
    else if (r < 0.043) dropPick('coin', e.x, e.y);
  }
  if (e.def.split) {
    for (let k = 0; k < 3; k++) {
      const m = spawnE(e.def.split, e.x + rand(-12, 12), e.y + rand(-12, 12), false, true);
      if (m) { m.spawn = 0.6; const a = Math.random() * TAU; m.kx = Math.cos(a) * 160; m.ky = Math.sin(a) * 160; }
    }
  }
  if (e.def.ai === 'exploder') queueBoom(e.x, e.y, 82, 26, w, e.ci, false);
  if (w && w.id === 'aura' && w.st.heal && G.lsAcc < 8) {
    G.lsAcc += 0.4;
    G.p.hp = Math.min(G.p.maxHp, G.p.hp + 0.4);
  }
}

function hurtPlayer(d, src) {
  const p = G.p;
  if (p.inv > 0 || G.ending || G.mode !== 'play' || G.god) return;
  d = Math.max(1, Math.round(d - G.stats.armor));
  const key = src || 'other';
  G.dmgBy[key] = (G.dmgBy[key] || 0) + d;
  G.dmgTaken += Math.min(d, Math.max(0, p.hp));
  p.hp -= d;
  p.inv = 0.6;
  G.redFlash = 0.4;
  addShake(0.3);
  sfx.hurt();
  if (!G.sim) addNum(Math.round(p.x), p.y - 22, d, 2);
  if (p.hp <= 0) playerDown();
}

function playerDown() {
  const p = G.p;
  if (G.revives > 0) {
    G.revives--;
    p.hp = p.maxHp;
    p.inv = 2.5;
    G.whiteFlash = 0.8;
    addShake(0.6);
    sfx.evolve();
    banner('复活！', 'evo');
    const f = addFx(FXK.RING, p.x, p.y, 0.8, '#fff04a'); f.r = 520;
    const n = grid.query(p.x, p.y, 420, QA);
    for (let j = 0; j < n; j++) {
      const e = E[QA[j]];
      if (e.boss) continue;
      dmgE(e, 9999, null, 0, 0, 0);
    }
    return;
  }
  p.hp = 0;
  beginEnding(false);
}

function beginEnding(won) {
  if (G.ending) return;
  G.ending = true;
  G.won = won;
  G.mode = 'ending';
  G.endT = 0;
  const p = G.p;
  if (won) {
    sfx.win();
    G.whiteFlash = 1;
    addShake(0.6);
    for (const e of E) {
      if (e.dead) continue;
      if (!G.sim) burst(e.x, e.y, e.ci, 3, 200, 3, 0.6);
      killE(e, null, true);
    }
    for (const b of EB) b.life = 0;
    banner('胜利！黎明已至', 'evo');
  } else {
    p.dead = true;
    sfx.death();
    addShake(0.7);
    burst(p.x, p.y, CI_CYAN, 70, 380, 5, 1.2);
    burst(p.x, p.y, CI_WHITE, 30, 200, 4, 0.8);
  }
  bus.emit('ending', won);
}

function finishRun() {
  G.mode = 'over';
  const s = meta.save;
  const bonus = Math.round((Math.floor(G.t / 10) + Math.floor(G.kills / 40) + G.bossKills * 30 + (G.won ? 150 : 0)) * G.stats.greed);
  const coinsRun = Math.floor(G.coins);
  const total = coinsRun + bonus;
  s.coins += total;
  s.stats.runs++;
  if (G.won) s.stats.wins++;
  s.stats.totalKills += G.kills;
  s.stats.totalCoins += total;
  const rec = { time: G.t > s.stats.bestTime, kills: G.kills > s.stats.bestKills, level: G.level > s.stats.bestLevel };
  s.stats.bestTime = Math.max(s.stats.bestTime, G.t);
  s.stats.bestKills = Math.max(s.stats.bestKills, G.kills);
  s.stats.bestLevel = Math.max(s.stats.bestLevel, G.level);
  s.stats.bestCombo = Math.max(s.stats.bestCombo, G.bestCombo);
  saveMeta();
  const ach = checkAch(runInfo(true));
  G.summary = {
    won: G.won, time: G.t, kills: G.kills, level: G.level, coinsRun, bonus, total, bestCombo: G.bestCombo,
    evolved: G.evolved, bossKills: G.bossKills, dmgTaken: G.dmgTaken, rec, ach, char: G.char,
    weapons: G.weapons.map((w) => ({ id: w.id, name: w.evo ? w.def.evo.name : w.def.name, color: w.def.color, dealt: Math.round(w.dealt), kills: w.kills, level: w.level, evo: w.evo })).sort((a, b) => b.dealt - a.dealt),
  };
  setIntensity(0);
  bus.emit('over', G.summary);
}

function runInfo(done) {
  return { done, time: G.t, kills: G.kills, level: G.level, evolved: G.evolved, bestCombo: G.bestCombo, weapons: G.weapons.length, won: G.won && done, bossKills: G.bossKills };
}

export function quitRun() {
  if (G.mode === 'over' || G.mode === 'title') return;
  G.ending = true;
  G.won = false;
  finishRun();
}

// explosions are queued so that kills inside a query loop never re-enter the grid query
const BQ = [];
const bqPool = [];
function queueBoom(x, y, r, dmg, w, ci, hurtP) {
  if (BQ.length > 160) return;
  const b = bqPool.pop() || { x: 0, y: 0, r: 0, dmg: 0, w: null, ci: 0, hurtP: false };
  b.x = x; b.y = y; b.r = r; b.dmg = dmg; b.w = w; b.ci = ci; b.hurtP = hurtP;
  BQ.push(b);
}
function processBooms() {
  let guard = 0;
  const p = G.p;
  while (BQ.length && guard++ < 240) {
    const b = BQ.shift();
    if (!G.sim) {
      const f = addFx(FXK.BOOM, b.x, b.y, 0.32, PAL[b.ci]); f.r = b.r;
      burst(b.x, b.y, b.ci, G.lowFx ? 4 : 10, b.r * 3, 4, 0.4);
      sfx.boom();
    }
    const n = grid.query(b.x, b.y, b.r, QB);
    for (let j = 0; j < n; j++) {
      const e = E[QB[j]];
      if (e.dead) continue;
      const dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy) || 1;
      dmgE(e, b.dmg, b.w, dx / d, dy / d, 120);
    }
    if (b.hurtP) {
      const dx = p.x - b.x, dy = p.y - b.y;
      if (dx * dx + dy * dy < (b.r + p.r) * (b.r + p.r)) hurtPlayer(b.dmg, 'boom');
      addShake(0.12);
    }
    bqPool.push(b);
  }
}

function nearest(x, y, R, excl) {
  const n = grid.query(x, y, R, QA);
  let best = null, bd = 1e18;
  for (let j = 0; j < n; j++) {
    const e = E[QA[j]];
    if (e.dead) continue;
    if (excl && excl.indexOf(e) >= 0) continue;
    const dx = e.x - x, dy = e.y - y, d2 = dx * dx + dy * dy;
    if (d2 < bd) { bd = d2; best = e; }
  }
  return best;
}

function randomNear(x, y, R) {
  const n = grid.query(x, y, R, QA);
  if (!n) return null;
  for (let tries = 0; tries < 4; tries++) {
    const e = E[QA[(Math.random() * n) | 0]];
    if (!e.dead) return e;
  }
  return null;
}

function shootEB(x, y, vx, vy, dmg) {
  const b = ebPool.pop();
  if (!b) return;
  b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.dmg = dmg; b.life = 7; b.r = 7;
  EB.push(b);
}

function ringBullets(e, n, spd, dmg, off) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + (off || 0);
    shootEB(e.x, e.y, Math.cos(a) * spd, Math.sin(a) * spd, dmg);
  }
  if (!G.sim) sfx.eshoot();
}

function dropGem(x, y, v) {
  if (GEMS.length >= MAXG) {
    const g = GEMS[(Math.random() * GEMS.length) | 0];
    g.v += v;
    return;
  }
  const g = gPool.pop();
  g.x = x; g.y = y; g.v = v; g.st = 0; g.sp = 0; g.t = Math.random() * 6;
  GEMS.push(g);
}

function dropPick(k, x, y) {
  const o = kPool.pop();
  if (!o) return;
  o.k = k; o.x = x; o.y = y; o.st = 0; o.sp = 0; o.t = Math.random() * 6;
  PICKS.push(o);
}

// ---------------------------------------------------------------- weapons
function hitCircle(x, y, r, dmg, w, kb, tick, slot) {
  const n = grid.query(x, y, r, QA);
  const t = G.t;
  for (let j = 0; j < n; j++) {
    const e = E[QA[j]];
    if (e.dead) continue;
    if (tick && t - e.hitT[slot] < tick) continue;
    e.hitT[slot] = t;
    const dx = e.x - G.p.x, dy = e.y - G.p.y, d = Math.hypot(dx, dy) || 1;
    dmgE(e, dmg, w, dx / d, dy / d, kb);
  }
}

function orbitUpdate(w, st, dt) {
  const p = G.p, S = G.stats;
  const count = Math.min(32, st.count + S.amount);
  w.ang += st.spin * dt;
  const pulse = w.evo ? 1 + 0.5 * Math.sin(G.t * 2.1) : 1;
  const rad = st.radius * S.area * pulse;
  const size = st.size * S.area;
  w.nb = count;
  for (let i = 0; i < count; i++) {
    const a = w.ang + (i * TAU) / count;
    const bx = p.x + Math.cos(a) * rad, by = p.y + Math.sin(a) * rad;
    w.bx[i] = bx; w.by[i] = by;
    hitCircle(bx, by, size, st.dmg, w, st.kb, st.tick, 0);
  }
}

function auraUpdate(w, st, dt) {
  const p = G.p;
  const r = st.r * G.stats.area;
  const n = grid.query(p.x, p.y, r, QA);
  const t = G.t;
  for (let j = 0; j < n; j++) {
    const e = E[QA[j]];
    if (e.dead) continue;
    e.slowT = 0.25; e.slow = st.slow;
    if (t - e.hitT[4] < st.tick) continue;
    e.hitT[4] = t;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
    dmgE(e, st.dmg, w, dx / d, dy / d, 40);
  }
}

function sector(x, y, R, ang, arc, dmg, w, kb) {
  const n = grid.query(x, y, R, QA);
  for (let j = 0; j < n; j++) {
    const e = E[QA[j]];
    if (e.dead) continue;
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
    if (arc < TAU - 0.01) {
      const a = Math.atan2(dy, dx);
      if (Math.abs(angDiff(a, ang)) > arc / 2 + Math.atan2(e.r, d)) continue;
    }
    dmgE(e, dmg, w, dx / d, dy / d, kb);
  }
}

function whipSlash(w, st, k) {
  const p = G.p;
  const R = st.range * G.stats.area;
  const back = k % 2 === 1;
  const a = w.pendA + (back ? Math.PI : 0) + (k >= 2 ? 0.35 * (k % 2 ? -1 : 1) : 0);
  sector(p.x, p.y, R, a, st.arc, st.dmg, w, st.kb);
  if (!G.sim) {
    const f = addFx(FXK.SLASH, p.x, p.y, 0.22, w.evo ? '#ffd0ff' : w.def.color);
    f.a = a; f.r = R; f.w = st.arc; f.ref = p;
    sfx.whip();
    if (w.evo) addShake(0.05);
  }
}

function fireWeapon(w, st) {
  const p = G.p, S = G.stats;
  switch (w.id) {
    case 'whip': {
      w.pendA = p.fa;
      const total = st.count + S.amount;
      whipSlash(w, st, 0);
      w.pend = total - 1; w.pendT = 0.13; w.side = 1;
      break;
    }
    case 'missile': {
      const n = st.count + S.amount;
      for (let k = 0; k < n; k++) {
        const pr = pPool.pop();
        if (!pr) break;
        const a = Math.random() * TAU;
        pr.k = PK.MISSILE; pr.x = p.x; pr.y = p.y; pr.vx = Math.cos(a) * 220; pr.vy = Math.sin(a) * 220;
        pr.r = w.evo ? 6 : 8; pr.dmg = st.dmg; pr.life = 3; pr.w = w; pr.spd = st.speed; pr.boom = st.boom * S.area;
        pr.tgt = randomNear(p.x, p.y, 520); pr.tuid = pr.tgt ? pr.tgt.uid : 0; pr.retT = 0; pr.ang = a;
        PROJ.push(pr);
      }
      if (!G.sim) sfx.launch();
      break;
    }
    case 'chain': {
      const n = st.count + S.amount;
      const firsts = [];
      let any = false;
      for (let b = 0; b < n; b++) {
        const first = nearest(p.x, p.y, 480, firsts);
        if (!first) break;
        firsts.push(first);
        any = true;
        chainList.length = 0;
        const f = G.sim ? null : addFx(FXK.BOLT, p.x, p.y, 0.2, w.evo ? '#e8f6ff' : w.def.color);
        if (f) { f.pts[0] = p.x; f.pts[1] = p.y; f.n = 1; }
        let cur = first, k = 0;
        while (cur && k <= st.jumps) {
          chainList.push(cur);
          if (f && f.n < 32) { f.pts[f.n * 2] = cur.x; f.pts[f.n * 2 + 1] = cur.y; f.n++; }
          const cx = cur.x, cy = cur.y;
          dmgE(cur, st.dmg, w, 0, 0, 0);
          if (!G.sim) burst(cx, cy, CI_WHITE, 3, 120, 2.5, 0.25);
          cur = nearest(cx, cy, st.range * S.area, chainList);
          k++;
        }
      }
      for (let s = 0; s < st.strikes; s++) {
        const e = randomNear(p.x, p.y, 560);
        if (!e) break;
        const ex = e.x, ey = e.y, R = 70 * S.area;
        const nn = grid.query(ex, ey, R, QB);
        for (let j = 0; j < nn; j++) {
          const o = E[QB[j]];
          if (!o.dead) dmgE(o, st.dmg * 1.2, w, 0, 0, 0);
        }
        if (!G.sim) {
          const f = addFx(FXK.SKY, ex, ey, 0.3, '#e8f6ff'); f.r = R;
          burst(ex, ey, CI_CYAN, 8, 260, 3, 0.4);
        }
        any = true;
      }
      if (any && !G.sim) { sfx.zap(); if (st.strikes) sfx.thunder(); }
      break;
    }
    case 'boomerang': {
      const n = st.count + S.amount;
      const tgt = nearest(p.x, p.y, 600, null);
      const base = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : p.fa;
      for (let k = 0; k < n; k++) {
        const pr = pPool.pop();
        if (!pr) break;
        const a = st.all ? base + (k / n) * TAU : base + (k - (n - 1) / 2) * 0.32;
        pr.k = PK.BOOM; pr.x = p.x; pr.y = p.y; pr.vx = Math.cos(a); pr.vy = Math.sin(a);
        pr.r = st.size * S.area; pr.dmg = st.dmg; pr.life = 6; pr.w = w; pr.spd = st.speed; pr.ph = 0; pr.trav = 0;
        pr.range = st.range * S.dur; pr.ang = 0; pr.hitU.fill(0); pr.hi = 0;
        PROJ.push(pr);
      }
      if (!G.sim) sfx.boomer();
      break;
    }
    case 'zone': {
      const n = st.count + S.amount;
      for (let k = 0; k < n; k++) {
        const e = randomNear(p.x, p.y, 340);
        const x = e ? e.x : p.x + rand(-200, 200), y = e ? e.y : p.y + rand(-200, 200);
        addZone(x, y, st.r * S.area, st.dur * S.dur, st.dmg, w);
      }
      if (!G.sim) sfx.fire();
      break;
    }
    case 'laser': {
      if (st.spin) {
        w.spinT = st.dur * S.dur;
        if (!G.sim) sfx.laser();
        break;
      }
      const n = st.count + S.amount;
      const first = nearest(p.x, p.y, 700, null);
      for (let k = 0; k < n; k++) {
        let a;
        const e = k === 0 ? first : randomNear(p.x, p.y, 600);
        if (e) a = Math.atan2(e.y - p.y, e.x - p.x);
        else a = p.fa + k * 0.6;
        if (k > 0 && first && e === first) a += 0.5 * k;
        const wid = st.width * S.area;
        beamHit(p.x, p.y, a, st.len, wid, st.dmg, w, 0);
        if (!G.sim) {
          const f = addFx(FXK.BEAM, p.x, p.y, 0.32, w.def.color); f.a = a; f.r = st.len; f.w = wid;
        }
      }
      if (!G.sim) { sfx.laser(); addShake(0.04); }
      break;
    }
  }
}

function beamHit(x, y, a, len, wid, dmg, w, tick) {
  const c = Math.cos(a), s = Math.sin(a), t = G.t;
  for (let i = 0, n = E.length; i < n; i++) {
    const e = E[i];
    if (e.dead) continue;
    const dx = e.x - x, dy = e.y - y;
    const along = dx * c + dy * s;
    if (along < -e.r || along > len + e.r) continue;
    const perp = Math.abs(-dx * s + dy * c);
    if (perp > wid / 2 + e.r) continue;
    if (tick) { if (t - e.hitT[7] < tick) continue; e.hitT[7] = t; }
    dmgE(e, dmg, w, c, s, tick ? 30 : 90);
  }
}

function addZone(x, y, r, dur, dmg, w) {
  const z = zPool.pop();
  if (!z) return;
  z.x = x; z.y = y; z.r = r; z.life = z.max = dur; z.tickT = 0; z.dmg = dmg; z.w = w; z.seed = Math.random() * 100;
  ZONES.push(z);
}

function updateWeapons(dt) {
  const S = G.stats, p = G.p;
  for (const w of G.weapons) {
    const st = w.st;
    if (w.id === 'orbit') { orbitUpdate(w, st, dt); continue; }
    if (w.id === 'aura') { auraUpdate(w, st, dt); continue; }
    if (w.id === 'whip' && w.pend > 0) {
      w.pendT -= dt;
      if (w.pendT <= 0) {
        const total = st.count + S.amount;
        whipSlash(w, st, total - w.pend);
        w.pend--; w.pendT = 0.13;
      }
    }
    if (w.id === 'laser' && w.spinT > 0) {
      w.spinT -= dt;
      w.ang += 1.8 * dt;
      const n = 4 + S.amount;
      const wid = st.width * S.area;
      for (let k = 0; k < n; k++) beamHit(p.x, p.y, w.ang + (k * TAU) / n, st.len * 0.8, wid, st.dmg, w, st.tick);
      if (w.spinT <= 0) w.t = st.cd * S.cd;
      continue;
    }
    if (w.id === 'zone' && st.trail) {
      w.trailT -= dt;
      if (w.trailT <= 0) { w.trailT = 0.35; addZone(p.x, p.y, st.r * 0.55 * S.area, 2.2 * S.dur, st.dmg * 0.7, w); }
    }
    w.t -= dt;
    if (w.t <= 0) {
      w.t = st.cd * S.cd;
      fireWeapon(w, st);
    }
  }
}

function updateProj(dt) {
  const p = G.p;
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const pr = PROJ[i];
    pr.life -= dt;
    let dead = pr.life <= 0;
    if (pr.k === PK.MISSILE) {
      if (!pr.tgt || pr.tgt.dead || pr.tgt.uid !== pr.tuid) {
        pr.retT -= dt;
        if (pr.retT <= 0) { pr.retT = 0.15; pr.tgt = nearest(pr.x, pr.y, 600, null); pr.tuid = pr.tgt ? pr.tgt.uid : 0; }
      }
      let spd = Math.hypot(pr.vx, pr.vy);
      spd = Math.min(pr.spd, spd + 900 * dt);
      if (pr.tgt && !pr.tgt.dead) {
        const dx = pr.tgt.x - pr.x, dy = pr.tgt.y - pr.y, d = Math.hypot(dx, dy) || 1;
        const tr = Math.min(1, 7 * dt);
        pr.vx += ((dx / d) * spd - pr.vx) * tr;
        pr.vy += ((dy / d) * spd - pr.vy) * tr;
      }
      const v = Math.hypot(pr.vx, pr.vy) || 1;
      pr.vx = (pr.vx / v) * spd; pr.vy = (pr.vy / v) * spd;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      pr.ang = Math.atan2(pr.vy, pr.vx);
      if (!G.sim && !G.lowFx && Math.random() < 0.7) part(pr.x - pr.vx * 0.02, pr.y - pr.vy * 0.02, rand(-20, 20), rand(-20, 20), 0.3, 3.2, CI_ORANGE);
      if (!dead) {
        const n = grid.query(pr.x, pr.y, pr.r, QA);
        for (let j = 0; j < n; j++) if (!E[QA[j]].dead) { dead = true; break; }
      }
      if (dead) queueBoom(pr.x, pr.y, pr.boom, pr.dmg, pr.w, CI_ORANGE, false);
    } else if (pr.k === PK.BOOM) {
      pr.ang += dt * 16;
      if (pr.ph === 0) {
        const sp = pr.spd * Math.max(0.35, 1 - (pr.trav / pr.range) * 0.65);
        pr.x += pr.vx * sp * dt; pr.y += pr.vy * sp * dt;
        pr.trav += sp * dt;
        if (pr.trav >= pr.range) { pr.ph = 1; pr.hitU.fill(0); pr.trav = 0; }
      } else {
        const dx = p.x - pr.x, dy = p.y - pr.y, d = Math.hypot(dx, dy) || 1;
        pr.trav += dt;
        const sp = pr.spd * Math.min(1.5, 0.4 + pr.trav * 1.6);
        pr.x += (dx / d) * sp * dt; pr.y += (dy / d) * sp * dt;
        if (d < 22) dead = true;
      }
      const n = grid.query(pr.x, pr.y, pr.r, QA);
      const t = G.t;
      for (let j = 0; j < n; j++) {
        const e = E[QA[j]];
        if (e.dead) continue;
        let ok = true;
        for (let h = 0; h < 16; h++) if (pr.hitU[h] === e.uid && t - pr.hitT[h] < 0.5) { ok = false; break; }
        if (!ok) continue;
        pr.hitU[pr.hi] = e.uid; pr.hitT[pr.hi] = t; pr.hi = (pr.hi + 1) & 15;
        const dx = e.x - pr.x, dy = e.y - pr.y, d = Math.hypot(dx, dy) || 1;
        dmgE(e, pr.dmg, pr.w, dx / d, dy / d, 120);
      }
      if (pr.w.evo && !G.sim && !G.lowFx && Math.random() < 0.5) part(pr.x, pr.y, 0, 0, 0.3, pr.r * 0.6, colIdx('#fff04a'));
    }
    if (dead) { PROJ[i] = PROJ[PROJ.length - 1]; PROJ.pop(); pr.tgt = null; pPool.push(pr); }
  }
}

function updateZones(dt) {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    const z = ZONES[i];
    z.life -= dt;
    z.tickT -= dt;
    if (z.tickT <= 0) {
      z.tickT = 0.3;
      const n = grid.query(z.x, z.y, z.r, QA);
      for (let j = 0; j < n; j++) {
        const e = E[QA[j]];
        if (!e.dead) dmgE(e, z.dmg, z.w, 0, 0, 0);
      }
    }
    if (!G.sim && !G.lowFx && Math.random() < 0.35) {
      const a = Math.random() * TAU, r = Math.random() * z.r;
      part(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, rand(-10, 10), -rand(30, 80), 0.6, 3, Math.random() < 0.5 ? CI_FIRE : CI_ORANGE);
    }
    if (z.life <= 0) { ZONES[i] = ZONES[ZONES.length - 1]; ZONES.pop(); zPool.push(z); }
  }
}

// ---------------------------------------------------------------- enemies
function bossAI(e, dt, dx, dy, d) {
  e.timer -= dt;
  e.mx = dx; e.my = dy; e.cspd = e.speed;
  const p = G.p;
  switch (e.def.boss) {
    case 'colossus': {
      if (e.st === 0) {
        if (e.timer <= 0) {
          e.st = 1; e.timer = 0.9;
          if (!G.sim) { const f = addFx(FXK.TELE, e.x, e.y, 0.9, '#ff3f5a'); f.ref = e; f.r = 640; }
        }
      } else if (e.st === 1) {
        e.cspd = 0;
        if (e.timer > 0.25) { e.dashX = dx; e.dashY = dy; }
        if (e.timer <= 0) { e.st = 2; e.timer = 0.75; sfx.dash(); }
      } else {
        e.mx = e.dashX; e.my = e.dashY; e.cspd = 580;
        if (!G.sim && Math.random() < 0.6) part(e.x, e.y, rand(-40, 40), rand(-40, 40), 0.5, 7, e.ci);
        if (e.timer <= 0) {
          e.st = 0; e.timer = 2.4; e.cnt++;
          if (e.cnt % 2 === 0) ringBullets(e, 18, 170, 12, 0);
          addShake(0.2);
        }
      }
      break;
    }
    case 'hive': {
      e.cspd = d < 220 ? e.speed * 0.3 : e.speed;
      if (e.timer <= 0) {
        e.timer = 3; e.st ^= 1;
        if (e.st) {
          for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; spawnE('swarm', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, false, true); }
        } else {
          ringBullets(e, 24, 150, 12, e.cnt * 0.13); e.cnt++;
        }
      }
      break;
    }
    case 'void': {
      const enr = e.hp < e.maxHp * 0.5;
      e.timer2 -= dt;
      if (e.st === 0) {
        e.cspd = e.speed * 0.45;
        e.ang += dt * (enr ? 2.2 : 1.6);
        if (e.timer2 <= 0) {
          e.timer2 = enr ? 0.11 : 0.15;
          const arms = enr ? 5 : 4;
          for (let k = 0; k < arms; k++) {
            const a = e.ang + (k * TAU) / arms;
            shootEB(e.x + Math.cos(a) * 50, e.y + Math.sin(a) * 50, Math.cos(a) * 165, Math.sin(a) * 165, 13);
          }
          if (!G.sim) sfx.eshoot();
        }
        if (e.timer <= 0) {
          e.st = 1; e.timer = 1.1;
          for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; spawnE('exploder', p.x + Math.cos(a) * 300, p.y + Math.sin(a) * 300, false, true); }
          banner('虚空召唤！', '');
        }
      } else if (e.st === 1) {
        e.cspd = 0;
        if (e.timer <= 0) {
          e.st = 2; e.timer = 0.85;
          if (!G.sim) { const f = addFx(FXK.TELE, e.x, e.y, 0.85, '#ff3f5a'); f.ref = e; f.r = 700; }
        }
      } else if (e.st === 2) {
        e.cspd = 0;
        if (e.timer > 0.2) { e.dashX = dx; e.dashY = dy; }
        if (e.timer <= 0) { e.st = 3; e.timer = 0.65; sfx.dash(); }
      } else {
        e.mx = e.dashX; e.my = e.dashY; e.cspd = 640;
        if (!G.sim && Math.random() < 0.7) part(e.x, e.y, rand(-40, 40), rand(-40, 40), 0.5, 8, e.ci);
        if (e.timer <= 0) { e.st = 0; e.timer = enr ? 3.6 : 4.6; ringBullets(e, enr ? 28 : 20, 150, 13, 0); addShake(0.25); }
      }
      break;
    }
  }
}

function detonate(e) {
  killE(e, null, true);
  queueBoom(e.x, e.y, 85, e.dmg, null, e.ci, true);
}

function updateEnemies(dt) {
  const p = G.p;
  const desp = G.view.despawnR, desp2 = desp * desp;
  const kd = Math.exp(-8 * dt);
  const contact = p.r * 0.75;
  for (let i = 0, n = E.length; i < n; i++) {
    const e = E[i];
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.spawn < 1) e.spawn = Math.min(1, e.spawn + dt * 3.5);
    let dx = p.x - e.x, dy = p.y - e.y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2) || 1;
    dx /= d; dy /= d;
    let spd = e.speed;
    if (e.slowT > 0) { e.slowT -= dt; spd *= 1 - e.slow; }
    let mx = dx, my = dy;
    if (e.lockT > 0) {
      e.lockT -= dt; mx = e.lockVx; my = e.lockVy;
      if (e.lockT <= 0 && d > desp * 0.8) { killE(e, null, true); continue; }
    } else if (e.boss) {
      bossAI(e, dt, dx, dy, d);
      mx = e.mx; my = e.my; spd = e.cspd * (e.slowT > 0 ? 1 - e.slow * 0.3 : 1);
      if (G.boss === e) bus.emit('bosshp', e);
    } else if (e.def.ai === 'ranged') {
      if (d < 230) { mx = -dx; my = -dy; spd *= 0.7; }
      else if (d < 330) { mx = -dy * e.side; my = dx * e.side; spd *= 0.6; }
      e.timer -= dt;
      if (e.timer <= 0 && d < 560) {
        e.timer = rand(2.4, 3.4);
        const bs = e.elite ? 220 : 190;
        if (e.elite) { for (let k = -1; k <= 1; k++) { const a = Math.atan2(dy, dx) + k * 0.25; shootEB(e.x, e.y, Math.cos(a) * bs, Math.sin(a) * bs, e.dmg); } }
        else shootEB(e.x, e.y, dx * bs, dy * bs, e.dmg);
        if (!G.sim) sfx.eshoot();
      }
    } else if (e.def.ai === 'exploder') {
      if (e.fuse >= 0) {
        e.fuse -= dt; spd = 0;
        if (e.fuse < 0) { detonate(e); continue; }
      } else if (d < e.r + p.r + 34 && !p.dead) e.fuse = 0.55;
    }
    // soft separation so hordes read as crowds
    if (!e.boss && e.lockT <= 0) {
      const nn = grid.query(e.x, e.y, e.r * 0.9, QS);
      let sx = 0, sy = 0;
      for (let j = 0; j < nn; j++) {
        const o = E[QS[j]];
        if (o === e) continue;
        const ox = e.x - o.x, oy = e.y - o.y;
        const rr = (e.r + o.r) * 0.8;
        const dd = ox * ox + oy * oy;
        if (dd < rr * rr && dd > 0.01) {
          const dl = Math.sqrt(dd);
          const push = ((rr - dl) / dl) * (o.boss ? 1 : 0.5);
          sx += ox * push; sy += oy * push;
        }
      }
      e.x += sx * 0.4; e.y += sy * 0.4;
    }
    e.x += (mx * spd + e.kx) * dt;
    e.y += (my * spd + e.ky) * dt;
    e.kx *= kd; e.ky *= kd;
    const sh = e.def.shape;
    if (sh === 'tri' || sh === 'diamond') e.face = Math.atan2(my, mx);
    else e.face += dt * (sh === 'hex' ? 0.8 : sh === 'star' ? 2 : 1.2);
    if (d < e.r + contact && !p.dead) hurtPlayer(e.dmg, e.boss ? e.type : e.elite ? 'elite-' + e.type : e.type);
    if (d2 > desp2 && !e.boss && e.lockT <= 0) {
      edgePoint();
      e.x = spx; e.y = spy;
    } else if (e.boss && d2 > desp2 * 1.4) {
      edgePoint(G.view.spawnR);
      e.x = spx; e.y = spy;
    }
  }
}

function updateEB(dt) {
  const p = G.p;
  for (let i = EB.length - 1; i >= 0; i--) {
    const b = EB[i];
    b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    const dx = p.x - b.x, dy = p.y - b.y;
    let dead = b.life <= 0;
    if (!dead && dx * dx + dy * dy < (b.r + p.r * 0.8) * (b.r + p.r * 0.8) && !p.dead) { hurtPlayer(b.dmg, 'bullet'); dead = true; }
    if (dead) { EB[i] = EB[EB.length - 1]; EB.pop(); ebPool.push(b); }
  }
}

// ---------------------------------------------------------------- pickups
function updateGems(dt) {
  const p = G.p;
  const mr = G.stats.magnet, mr2 = mr * mr;
  for (let i = GEMS.length - 1; i >= 0; i--) {
    const g = GEMS[i];
    g.t += dt;
    const dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
    if (g.st === 0) {
      if (d2 < mr2) { g.st = 1; g.sp = -160; }
      continue;
    }
    g.sp = Math.min(1200, g.sp + 2400 * dt);
    const d = Math.sqrt(d2) || 1;
    g.x += (dx / d) * g.sp * dt; g.y += (dy / d) * g.sp * dt;
    if (d < p.r + 10 && g.sp > 0) {
      G.xp += g.v * G.stats.growth;
      G.gemCombo++; G.gemComboT = 0.4;
      if (!G.sim) sfx.gem(G.gemCombo);
      GEMS[i] = GEMS[GEMS.length - 1]; GEMS.pop(); gPool.push(g);
    }
  }
  while (G.xp >= G.xpNext) {
    G.xp -= G.xpNext;
    G.level++;
    G.xpNext = xpNeed(G.level);
    G.pendingLv++;
  }
}

export function vacuum() {
  for (const g of GEMS) if (g.st === 0) { g.st = 1; g.sp = -200; }
}

function nukeAll() {
  G.whiteFlash = 1;
  addShake(0.8);
  sfx.nuke();
  const p = G.p;
  const hw = G.view.ww / 2 + 40, hh = G.view.wh / 2 + 40;
  for (const e of E) {
    if (e.dead) continue;
    if (Math.abs(e.x - p.x) > hw || Math.abs(e.y - p.y) > hh) continue;
    if (e.boss) dmgE(e, e.maxHp * 0.08 / G.stats.might, null, 0, 0, 0);
    else dmgE(e, 99999, null, 0, 0, 0);
  }
  const f = addFx(FXK.RING, p.x, p.y, 0.8, '#ffffff'); f.r = 900;
}

function updatePicks(dt) {
  const p = G.p;
  const mr = G.stats.magnet;
  for (let i = PICKS.length - 1; i >= 0; i--) {
    const k = PICKS[i];
    k.t += dt;
    const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1;
    const range = k.k === 'chest' ? 34 : mr;
    if (k.st === 0 && d < range) { k.st = 1; k.sp = -120; }
    if (k.st === 1) {
      k.sp = Math.min(900, k.sp + 1800 * dt);
      k.x += (dx / d) * k.sp * dt; k.y += (dy / d) * k.sp * dt;
      if (d < p.r + 12 && k.sp > 0) {
        collect(k);
        PICKS[i] = PICKS[PICKS.length - 1]; PICKS.pop(); kPool.push(k);
        if (G.mode !== 'play') return;
      }
    }
  }
}

function collect(k) {
  const p = G.p;
  switch (k.k) {
    case 'heart': {
      const v = 30;
      p.hp = Math.min(p.maxHp, p.hp + v);
      if (!G.sim) { addNum(Math.round(p.x), p.y - 24, v, 3); burst(p.x, p.y, CI_GREEN, 14, 160, 3, 0.5); }
      sfx.heal();
      break;
    }
    case 'magnet': vacuum(); sfx.magnet(); banner('全屏吸取！', ''); break;
    case 'nuke': nukeAll(); break;
    case 'coin': {
      G.coinFrac += G.stats.greed;
      const whole = Math.floor(G.coinFrac);
      G.coins += whole; G.coinFrac -= whole;
      if (!G.sim) burst(p.x, p.y, CI_GOLD, 5, 120, 2.5, 0.35);
      sfx.coin();
      break;
    }
    case 'chest': openChest(); break;
  }
}

// ---------------------------------------------------------------- cosmetic
function updateCosmetic(dt) {
  for (let i = FX.length - 1; i >= 0; i--) {
    const f = FX[i];
    f.life -= dt;
    if (f.k === FXK.TELE && f.ref && !f.ref.dead) { f.x = f.ref.x; f.y = f.ref.y; f.a = Math.atan2(f.ref.dashY, f.ref.dashX); }
    if (f.life <= 0) { FX[i] = FX[FX.length - 1]; FX.pop(); f.ref = null; fxPool.push(f); }
  }
  const n0 = PT.n;
  const drag = Math.exp(-3 * dt);
  for (let i = n0 - 1; i >= 0; i--) {
    PT.life[i] -= dt;
    if (PT.life[i] <= 0) {
      const l = --PT.n;
      PT.x[i] = PT.x[l]; PT.y[i] = PT.y[l]; PT.vx[i] = PT.vx[l]; PT.vy[i] = PT.vy[l];
      PT.life[i] = PT.life[l]; PT.max[i] = PT.max[l]; PT.size[i] = PT.size[l]; PT.col[i] = PT.col[l];
      continue;
    }
    PT.x[i] += PT.vx[i] * dt; PT.y[i] += PT.vy[i] * dt;
    PT.vx[i] *= drag; PT.vy[i] *= drag;
  }
  for (let i = NUMS.length - 1; i >= 0; i--) {
    const n = NUMS[i];
    n.life -= dt;
    n.y += n.vy * dt; n.vy *= Math.exp(-4 * dt);
    if (n.life <= 0) { NUMS[i] = NUMS[NUMS.length - 1]; NUMS.pop(); nPool.push(n); }
  }
}

// ---------------------------------------------------------------- autoplay (testing bot)
function autoMove() {
  const p = G.p;
  let ax = 0, ay = 0, danger = 0;
  const n = grid.query(p.x, p.y, 260, QA);
  for (let j = 0; j < n; j++) {
    const e = E[QA[j]];
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) + 1;
    const w = (e.boss ? 8 : e.elite ? 6 : 1) * Math.max(0, 260 - d) / 260 / d;
    ax += dx * w; ay += dy * w; danger += w;
  }
  for (const b of EB) {
    const dx = p.x - b.x, dy = p.y - b.y, d = Math.sqrt(dx * dx + dy * dy) + 1;
    if (d < 170) { const w = (2 * (170 - d)) / 170 / d; ax += dx * w; ay += dy * w; danger += w; }
  }
  const rep = Math.hypot(ax, ay);
  if (rep > 0) { ax /= rep; ay /= rep; const tx = -ay, ty = ax; ax = ax * 0.85 + tx * 0.4; ay = ay * 0.85 + ty * 0.4; }
  const dz = Math.min(1, danger * 3);
  let best = null, bd = 1e18;
  for (const k of PICKS) {
    const d2 = (k.x - p.x) ** 2 + (k.y - p.y) ** 2;
    if (k.k === 'chest' || k.k === 'magnet' || (k.k === 'heart' && p.hp < p.maxHp * 0.7)) { if (d2 < bd) { bd = d2; best = k; } }
  }
  if (!best) {
    for (let i = 0; i < GEMS.length; i++) { const g = GEMS[i]; if (g.st) continue; const d2 = (g.x - p.x) ** 2 + (g.y - p.y) ** 2; if (d2 < bd) { bd = d2; best = g; } }
  }
  let gx = 0, gy = 0;
  if (best) { const dx = best.x - p.x, dy = best.y - p.y, d = Math.hypot(dx, dy) || 1; gx = dx / d; gy = dy / d; }
  G.input.x = ax * dz + gx * (1 - dz * 0.8);
  G.input.y = ay * dz + gy * (1 - dz * 0.8);
}

export function autoPick() {
  const opts = G.options || rollOptions();
  let bi = 0, bs = -1;
  opts.forEach((o, i) => {
    let s = 0;
    if (o.kind === 'evo') s = 100;
    else if (o.kind === 'wup') s = 50;
    else if (o.kind === 'wnew') s = G.weapons.length < 4 ? 45 : 15;
    else if (o.kind === 'pnew') s = o.hint ? 55 : 30;
    else if (o.kind === 'pup') s = 25;
    s += Math.random() * 10;
    if (s > bs) { bs = s; bi = i; }
  });
  return bi;
}

// ---------------------------------------------------------------- main update
export function update(dt) {
  const p = G.p, S = G.stats;
  G.t += dt;
  grid.build(E, E.length, p.x, p.y);
  if (G.auto && !p.dead) autoMove();
  let ix = p.dead ? 0 : G.input.x, iy = p.dead ? 0 : G.input.y;
  const len = Math.hypot(ix, iy);
  if (len > 1) { ix /= len; iy /= len; }
  const spd = 150 * S.speed;
  p.x += ix * spd * dt; p.y += iy * spd * dt;
  p.moving = len > 0.12;
  if (p.moving) { p.fa = Math.atan2(iy, ix); p.fx = Math.cos(p.fa); p.fy = Math.sin(p.fa); }
  if (p.inv > 0) p.inv -= dt;
  if (S.regen > 0 && !p.dead && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + S.regen * dt);
  G.trailT -= dt;
  if (G.trailT <= 0) {
    G.trailT = 0.035;
    p.trail.copyWithin(2, 0, 22);
    p.trail[0] = p.x; p.trail[1] = p.y;
    if (p.trailN < 12) p.trailN++;
  }
  G.lsT += dt;
  if (G.lsT >= 1) { G.lsT = 0; G.lsAcc = 0; }
  G.cam.x = p.x; G.cam.y = p.y;

  if (!G.ending) spawnUpdate(dt);
  updateEnemies(dt);
  if (!p.dead) updateWeapons(dt);
  updateProj(dt);
  updateZones(dt);
  processBooms();
  updateEB(dt);
  updateGems(dt);
  if (G.mode === 'play' || G.mode === 'lvintro') updatePicks(dt);
  updateCosmetic(dt);

  // compact enemy list
  let wI = 0;
  for (let i = 0, n = E.length; i < n; i++) {
    const e = E[i];
    if (e.dead) ePool.push(e); else E[wI++] = e;
  }
  E.length = wI;
  grid.list = null; // indices are stale after compaction; queries return nothing until the next build

  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  if (G.gemComboT > 0) { G.gemComboT -= dt; if (G.gemComboT <= 0) G.gemCombo = 0; }
  G.achT -= dt;
  if (G.achT <= 0 && !G.sim) { G.achT = 3; checkAch(runInfo(false)); }
  if (G.t >= 300 && G.t - dt < 300 && !G.boss) setIntensity(2);
  if (G.t >= RUN_TIME && !G.ending) beginEnding(true);
}

// called once per animation frame with real elapsed seconds
export function frame(dtR) {
  G.realT += dtR;
  switch (G.mode) {
    case 'play':
      if (G.ts < 1) G.ts = Math.min(1, G.ts + dtR * 2.6);
      update(dtR * G.ts);
      if (G.mode === 'play' && G.pendingLv > 0 && !G.ending) beginLevelUp();
      break;
    case 'lvintro':
      G.lvT += dtR;
      G.ts = Math.max(0, 1 - G.lvT / 0.3);
      if (G.ts > 0.001) update(dtR * G.ts);
      if (G.lvT >= 0.38) {
        G.mode = 'levelup';
        G.ts = 0;
        if (G.auto) { G.options = rollOptions(); chooseOption(autoPick()); } else bus.emit('levelup', rollOptions());
      }
      break;
    case 'ending':
      G.endT += dtR;
      update(dtR * (G.won ? 0.5 : 0.25));
      if (G.endT > 2.4) finishRun();
      break;
    case 'title':
      G.cam.x += dtR * 30; G.cam.y += dtR * 12;
      updateCosmetic(dtR);
      break;
    default:
      break;
  }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dtR * 1.6);
  if (G.redFlash > 0) G.redFlash -= dtR;
  if (G.whiteFlash > 0) G.whiteFlash -= dtR * 1.5;
  if (G.lvFlash > 0) G.lvFlash -= dtR * 2;
}

// fast-forward for headless testing: fixed steps, auto-picks cards, no rendering
export function simulate(seconds, auto = true) {
  const prevAuto = G.auto;
  G.sim = true; G.auto = auto;
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (G.mode === 'over' || G.mode === 'title') break;
    if (G.mode === 'ending') { G.endT += 1 / 60; update(1 / 60); if (G.endT > 2.4) finishRun(); continue; }
    if (G.mode !== 'play') G.mode = 'play';
    update(1 / 60);
    while (G.pendingLv > 0 && G.mode === 'play') {
      G.options = rollOptions();
      G.mode = 'levelup';
      chooseOption(autoPick());
    }
    if (G.mode === 'chest') G.mode = 'play';
  }
  G.sim = false; G.auto = prevAuto;
  G.ts = 1;
}

export function debugGiveXP(n) { G.xp += n; updateGemsOnlyLevel(); }
function updateGemsOnlyLevel() {
  while (G.xp >= G.xpNext) { G.xp -= G.xpNext; G.level++; G.xpNext = xpNeed(G.level); G.pendingLv++; }
}

export function debugHorde(n, type) {
  const p = G.p;
  let c = 0;
  for (let k = 0; k < n; k++) {
    const a = Math.random() * TAU, r = rand(G.view.spawnR * 0.45, G.view.spawnR * 1.05);
    const tp = type || ['crawler', 'fast', 'tank', 'swarm', 'splitter', 'ranged', 'exploder'][k % 7];
    if (spawnE(tp, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, false, true)) c++;
  }
  return c;
}

export function debugMaxWeapon(id) {
  let w = G.weapons.find((x) => x.id === id);
  if (!w) {
    if (G.weapons.length >= SLOT_MAX) return 'no slot';
    w = addWeapon(id);
  }
  w.level = WEAPON_MAX;
  const need = w.def.evo.with;
  if (!G.passives.some((p) => p.id === need)) {
    if (G.passives.length >= SLOT_MAX) return 'no passive slot';
    addPassive(need);
  }
  recalcStats();
  return 'ok';
}

export function debugDropChest() {
  dropPick('chest', G.p.x + 30, G.p.y);
}

export function debugSkip(sec) {
  G.t += sec;
  while (G.evtI < EVENTS.length && EVENTS[G.evtI].t < G.t - 1) G.evtI++;
}

export function debugEvent(i) { runEvent(EVENTS[i]); }

export function debugDie() {
  if (!G.p || G.mode !== 'play') return;
  G.p.inv = 0; G.revives = 0;
  hurtPlayer(99999, 'debug');
}

setWave(0);
