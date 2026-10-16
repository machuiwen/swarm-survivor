import { G, E, PROJ, GEMS, PICKS, ZONES, FX, EB, NUMS, PT, PAL, FXK, PK, colIdx } from './game.js';
const CI_GRID = colIdx('#ff4fd8'), CI_CHEST = colIdx('#ffd23f'), CI_TRAIL = colIdx('#38f6ff');
import { ENEMIES } from './data.js';
import { drawIcon, drawHero } from './icons.js';
import { TAU } from './util.js';
import { joy } from './input.js';

const SS = 2; // sprite pixels per world unit

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

function shapePath(c, shape, r) {
  c.beginPath();
  switch (shape) {
    case 'tri':
      c.moveTo(r * 1.05, 0); c.lineTo(-r * 0.8, r * 0.85); c.lineTo(-r * 0.4, 0); c.lineTo(-r * 0.8, -r * 0.85); c.closePath();
      break;
    case 'diamond':
      c.moveTo(r * 1.2, 0); c.lineTo(0, r * 0.62); c.lineTo(-r * 0.95, 0); c.lineTo(0, -r * 0.62); c.closePath();
      break;
    case 'hex':
      for (let k = 0; k < 6; k++) { const a = (k * TAU) / 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath();
      break;
    case 'square': {
      const s = r * 0.82, q = r * 0.25;
      c.moveTo(-s + q, -s); c.lineTo(s - q, -s); c.quadraticCurveTo(s, -s, s, -s + q); c.lineTo(s, s - q);
      c.quadraticCurveTo(s, s, s - q, s); c.lineTo(-s + q, s); c.quadraticCurveTo(-s, s, -s, s - q); c.lineTo(-s, -s + q);
      c.quadraticCurveTo(-s, -s, -s + q, -s); c.closePath();
      break;
    }
    case 'blob':
      for (let k = 0; k <= 30; k++) { const a = (k / 30) * TAU; const rr = r * (1 + 0.11 * Math.sin(a * 5)); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath();
      break;
    case 'star':
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; const rr = k % 2 ? r * 0.58 : r * 1.05; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath();
      break;
    default:
      c.arc(0, 0, r, 0, TAU);
  }
}

// ---------------- sprite caches
const enemyCache = new Map();
function enemySprite(type, variant) {
  const key = type + variant;
  let c = enemyCache.get(key);
  if (c) return c;
  const d = ENEMIES[type];
  const elite = variant >= 2, flash = variant % 2 === 1;
  const r = d.r * (elite ? 1.6 : 1);
  const size = r * 2.9 + 16;
  c = mk(size * SS, size * SS);
  const x = c.getContext('2d');
  x.scale(SS, SS); x.translate(size / 2, size / 2);
  const col = flash ? '#ffffff' : d.color;
  x.lineJoin = 'round';
  if (elite) {
    x.shadowColor = '#ffd23f'; x.shadowBlur = 14; x.strokeStyle = '#ffd23f'; x.lineWidth = 3;
    x.beginPath(); x.arc(0, 0, r * 1.28, 0, TAU); x.stroke();
  }
  x.shadowColor = col; x.shadowBlur = Math.max(6, r * 0.8);
  shapePath(x, d.shape, r);
  x.fillStyle = flash ? 'rgba(255,255,255,0.9)' : hexA(d.color, 0.22);
  x.fill();
  x.lineWidth = Math.max(2.2, r * 0.15); x.strokeStyle = col; x.stroke();
  x.shadowBlur = 0;
  if (!flash) {
    shapePath(x, d.shape, r * 0.55);
    x.fillStyle = hexA(d.color, 0.3); x.fill();
    // eyes give each bug some character
    x.fillStyle = '#ffffff';
    const ex = d.shape === 'tri' || d.shape === 'diamond' ? r * 0.25 : 0;
    const es = Math.max(1.4, r * 0.13);
    x.beginPath(); x.arc(ex, -r * 0.22, es, 0, TAU); x.arc(ex, r * 0.22, es, 0, TAU); x.fill();
    if (d.boss) {
      x.strokeStyle = hexA('#ffffff', 0.7); x.lineWidth = 2;
      shapePath(x, d.shape, r * 0.78); x.stroke();
      x.fillStyle = '#fff'; x.shadowColor = col; x.shadowBlur = 20;
      x.beginPath(); x.arc(0, 0, r * 0.16, 0, TAU); x.fill();
    }
  }
  c.dw = size; c.hw = size / 2;
  enemyCache.set(key, c);
  return c;
}

const dotCache = [];
function dotSprite(ci) {
  let c = dotCache[ci];
  if (c) return c;
  c = mk(32, 32);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, hexA(PAL[ci], 0.95));
  g.addColorStop(0.6, hexA(PAL[ci], 0.25));
  g.addColorStop(1, hexA(PAL[ci], 0));
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  dotCache[ci] = c;
  return c;
}

function glowSprite(size, inner, outer, mid) {
  const c = mk(size, size);
  const x = c.getContext('2d');
  const h = size / 2;
  const g = x.createRadialGradient(h, h, 0, h, h, h);
  g.addColorStop(0, inner);
  g.addColorStop(mid || 0.4, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return c;
}

let S = null; // misc sprites built on first render
function buildSprites() {
  S = {};
  const GEMC = ['#38c8ff', '#5dff9a', '#c77dff', '#ffd23f'];
  S.gems = GEMC.map((col, i) => {
    const r = 5 + i * 1.6, size = r * 4 + 8;
    const c = mk(size * SS, size * SS);
    const x = c.getContext('2d');
    x.scale(SS, SS); x.translate(size / 2, size / 2);
    x.shadowColor = col; x.shadowBlur = 8;
    x.beginPath(); x.moveTo(0, -r * 1.3); x.lineTo(r, 0); x.lineTo(0, r * 1.3); x.lineTo(-r, 0); x.closePath();
    x.fillStyle = hexA(col, 0.55); x.fill();
    x.lineWidth = 1.6; x.strokeStyle = col; x.stroke();
    x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,0.85)';
    x.beginPath(); x.moveTo(0, -r * 0.9); x.lineTo(r * 0.35, -r * 0.1); x.lineTo(0, 0); x.lineTo(-r * 0.35, -r * 0.1); x.closePath(); x.fill();
    c.dw = size; c.hw = size / 2;
    return c;
  });
  S.picks = {};
  for (const id of ['heart', 'magnet', 'nuke', 'coin', 'chest']) {
    const size = id === 'chest' ? 56 : 34;
    const c = mk(size * SS, size * SS);
    const x = c.getContext('2d');
    x.scale(SS, SS); x.translate(size / 2, size / 2);
    const iconId = id === 'heart' ? 'heal' : id === 'nuke' ? 'skull' : id;
    if (id === 'nuke') {
      x.fillStyle = 'rgba(255,63,164,0.18)'; x.beginPath(); x.arc(0, 0, size * 0.42, 0, TAU); x.fill();
    }
    drawIcon(x, iconId, size * 0.78, false);
    c.dw = size; c.hw = size / 2;
    S.picks[id] = c;
  }
  S.bullet = glowSprite(48, 'rgba(255,255,255,1)', 'rgba(255,60,140,0.9)', 0.35);
  S.zone = glowSprite(128, 'rgba(255,150,60,0.5)', 'rgba(255,60,40,0.32)', 0.6);
  S.boom = glowSprite(128, 'rgba(255,240,210,0.8)', 'rgba(255,140,50,0.45)', 0.35);
  S.aura = (() => {
    const size = 256, c = mk(size, size), x = c.getContext('2d'), h = size / 2;
    const g = x.createRadialGradient(h, h, h * 0.2, h, h, h);
    g.addColorStop(0, 'rgba(93,255,154,0.02)');
    g.addColorStop(0.75, 'rgba(93,255,154,0.12)');
    g.addColorStop(0.94, 'rgba(93,255,154,0.45)');
    g.addColorStop(1, 'rgba(93,255,154,0)');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  })();
  S.auraEvo = (() => {
    const size = 256, c = mk(size, size), x = c.getContext('2d'), h = size / 2;
    const g = x.createRadialGradient(h, h, h * 0.2, h, h, h);
    g.addColorStop(0, 'rgba(180,92,255,0.04)');
    g.addColorStop(0.7, 'rgba(93,255,154,0.16)');
    g.addColorStop(0.93, 'rgba(200,120,255,0.55)');
    g.addColorStop(1, 'rgba(93,255,154,0)');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  })();
  const blade = (col) => {
    const size = 48, c = mk(size * SS, size * SS), x = c.getContext('2d');
    x.scale(SS, SS); x.translate(size / 2, size / 2);
    x.shadowColor = col; x.shadowBlur = 10;
    x.beginPath(); x.moveTo(0, -20); x.quadraticCurveTo(8, -4, 3, 20); x.quadraticCurveTo(-6, 4, 0, -20); x.closePath();
    x.fillStyle = hexA(col, 0.6); x.fill(); x.lineWidth = 2; x.strokeStyle = col; x.stroke();
    x.shadowBlur = 0; x.strokeStyle = '#fff'; x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(0, -16); x.quadraticCurveTo(4, -2, 2, 14); x.stroke();
    c.dw = size; c.hw = size / 2;
    return c;
  };
  S.blade = blade('#38f6ff');
  S.bladeEvo = blade('#b7fbff');
  S.missile = (() => {
    const size = 32, c = mk(size * SS, size * SS), x = c.getContext('2d');
    x.scale(SS, SS); x.translate(size / 2, size / 2);
    x.shadowColor = '#ffa53a'; x.shadowBlur = 8;
    x.beginPath(); x.moveTo(10, 0); x.lineTo(2, -4); x.lineTo(-8, -4); x.lineTo(-11, -7); x.lineTo(-11, 7); x.lineTo(-8, 4); x.lineTo(2, 4); x.closePath();
    x.fillStyle = '#ffd9a0'; x.fill(); x.lineWidth = 1.5; x.strokeStyle = '#ffa53a'; x.stroke();
    c.dw = size; c.hw = size / 2;
    return c;
  })();
  S.boomer = (() => {
    const size = 48, c = mk(size * SS, size * SS), x = c.getContext('2d');
    x.scale(SS, SS); x.translate(size / 2, size / 2);
    x.shadowColor = '#fff04a'; x.shadowBlur = 10; x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = '#fff04a'; x.lineWidth = 6;
    x.beginPath(); x.moveTo(-14, 12); x.quadraticCurveTo(0, -2, 0, -16); x.quadraticCurveTo(2, 0, 14, 12); x.stroke();
    x.shadowBlur = 0; x.strokeStyle = '#fff'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(-12, 10); x.quadraticCurveTo(0, -2, 0, -13); x.quadraticCurveTo(2, 0, 12, 10); x.stroke();
    c.dw = size; c.hw = size / 2;
    return c;
  })();
  S.heroes = {};
  S.playerGlow = glowSprite(128, 'rgba(255,255,255,0.9)', 'rgba(56,246,255,0.25)', 0.25);
}

function heroSprite(ch) {
  let c = S.heroes[ch.id];
  if (c) return c;
  const size = 48;
  c = mk(size * SS, size * SS);
  const x = c.getContext('2d');
  x.scale(SS, SS); x.translate(size / 2, size / 2);
  drawHero(x, ch.id, 44, ch.color);
  c.dw = size; c.hw = size / 2;
  S.heroes[ch.id] = c;
  return c;
}

// ---------------- screen-space overlays
let vig = null, vigRed = null, vigW = 0, vigH = 0;
function buildVignettes(w, h) {
  vigW = w; vigH = h;
  const mkV = (rgb, inner, a) => {
    w = Math.ceil(vigW / 3); h = Math.ceil(vigH / 3);
    const c = mk(w, h), x = c.getContext('2d');
    const r = Math.hypot(w, h) / 2;
    const g = x.createRadialGradient(w / 2, h / 2, r * inner, w / 2, h / 2, r);
    g.addColorStop(0, 'rgba(' + rgb + ',0)');
    g.addColorStop(1, 'rgba(' + rgb + ',' + a + ')');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    return c;
  };
  // built at a third of the resolution; it is a smooth gradient so scaling up is invisible
  vig = mkV('0,0,0', 0.45, 0.75);
  vigRed = mkV('255,20,60', 0.35, 0.85);
}

// decorative bugs for the title screen
const deco = [];
for (let i = 0; i < 46; i++) {
  const types = ['crawler', 'fast', 'tank', 'swarm', 'splitter', 'ranged', 'exploder'];
  deco.push({ x: Math.random() * 2000 - 1000, y: Math.random() * 1400 - 700, a: Math.random() * TAU, s: 20 + Math.random() * 40, t: types[i % types.length], sp: Math.random() * 2 });
}

// ---------------- main render
export function render(ctx, cw, ch) {
  if (!S) buildSprites();
  const V = G.view;
  const dpr = V.dpr;
  const k = dpr * V.zoom;
  let sx = 0, sy = 0;
  if (G.shake > 0.001) {
    const m = G.shake * G.shake * 16;
    sx = (Math.random() * 2 - 1) * m; sy = (Math.random() * 2 - 1) * m;
  }
  const camX = G.cam.x + sx, camY = G.cam.y + sy;
  const ox = cw / 2 - camX * k, oy = ch / 2 - camY * k;
  const hw = V.ww / 2, hh = V.wh / 2;
  const t = G.realT;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#07060f';
  ctx.fillRect(0, 0, cw, ch);

  // floor grid
  ctx.setTransform(k, 0, 0, k, ox, oy);
  const x0 = camX - hw - 20, x1 = camX + hw + 20, y0 = camY - hh - 20, y1 = camY + hh + 20;
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(110,70,255,0.13)';
  ctx.beginPath();
  const step = 80;
  for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
  for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,63,164,0.13)';
  ctx.beginPath();
  const big = 400;
  for (let x = Math.floor(x0 / big) * big; x <= x1; x += big) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
  for (let y = Math.floor(y0 / big) * big; y <= y1; y += big) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  const dsp = dotSprite(CI_GRID);
  for (let x = Math.floor(x0 / big) * big; x <= x1; x += big) {
    for (let y = Math.floor(y0 / big) * big; y <= y1; y += big) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.5 + x * 0.01 + y * 0.013);
      ctx.globalAlpha = 0.25 + pulse * 0.3;
      ctx.drawImage(dsp, x - 12, y - 12, 24, 24);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  if (G.mode === 'title' || !G.p) {
    for (const d of deco) {
      d.a += 0.004 * d.sp; d.x += Math.cos(d.a) * 0.4; d.y += Math.sin(d.a) * 0.4;
      const spr = enemySprite(d.t, 0);
      const px = camX + d.x, py = camY + d.y;
      const c = Math.cos(d.a) * k, s = Math.sin(d.a) * k;
      ctx.setTransform(c, s, -s, c, ox + px * k, oy + py * k);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(spr, -spr.hw, -spr.hw, spr.dw, spr.dw);
    }
    ctx.globalAlpha = 1;
    drawOverlays(ctx, cw, ch, dpr);
    return;
  }

  const p = G.p;

  // zones (normal blending so overlapping fires saturate instead of washing out to white)
  ctx.globalCompositeOperation = 'source-over';
  for (const z of ZONES) {
    const lr = z.life / z.max;
    const fl = 0.85 + 0.15 * Math.sin(t * 13 + z.seed);
    const r = z.r * (lr > 0.9 ? 1 - (lr - 0.9) * 4 : 1) * fl;
    ctx.globalAlpha = Math.min(1, lr * 3);
    ctx.setTransform(k, 0, 0, k, ox, oy);
    ctx.drawImage(S.zone, z.x - r * 1.15, z.y - r * 1.15, r * 2.3, r * 2.3);
  }
  // aura
  ctx.globalCompositeOperation = 'lighter';
  for (const w of G.weapons) {
    if (w.id !== 'aura') continue;
    const r = w.st.r * G.stats.area * (1 + 0.04 * Math.sin(t * 5));
    ctx.globalAlpha = 0.9;
    ctx.setTransform(k, 0, 0, k, ox, oy);
    ctx.drawImage(w.evo ? S.auraEvo : S.aura, p.x - r, p.y - r, r * 2, r * 2);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = w.evo ? '#d6a6ff' : '#5dff9a';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.97, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;

  // gems
  ctx.globalCompositeOperation = 'source-over';
  ctx.setTransform(k, 0, 0, k, ox, oy);
  for (let i = 0, n = GEMS.length; i < n; i++) {
    const g = GEMS[i];
    if (Math.abs(g.x - camX) > hw + 20 || Math.abs(g.y - camY) > hh + 20) continue;
    const tier = g.v < 2 ? 0 : g.v < 5 ? 1 : g.v < 20 ? 2 : 3;
    const spr = S.gems[tier];
    const bob = Math.sin(g.t * 4) * 1.5;
    ctx.drawImage(spr, g.x - spr.hw, g.y - spr.hw + bob, spr.dw, spr.dw);
  }
  // pickups
  for (const o of PICKS) {
    const spr = S.picks[o.k];
    const bob = Math.sin(o.t * 3) * 3;
    if (o.k === 'chest') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 4);
      ctx.drawImage(dotSprite(CI_CHEST), o.x - 40, o.y - 40, 80, 80);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(spr, o.x - spr.hw, o.y - spr.hw + bob, spr.dw, spr.dw);
  }

  // enemies
  for (let i = 0, n = E.length; i < n; i++) {
    const e = E[i];
    if (e.dead) continue;
    const m = e.r * 1.6;
    if (Math.abs(e.x - camX) > hw + m || Math.abs(e.y - camY) > hh + m) continue;
    let flash = e.flash > 0 && !e.boss;
    let sc = e.spawn < 1 ? 0.4 + e.spawn * 0.6 : 1;
    if (e.boss && e.flash > 0) sc *= 1 + e.flash * 0.6;
    if (e.fuse >= 0) { flash = ((e.fuse * 18) | 0) % 2 === 0; sc *= 1 + (0.55 - e.fuse) * 0.7; }
    const spr = enemySprite(e.type, (e.elite ? 2 : 0) + (flash ? 1 : 0));
    const kk = k * sc;
    const c = Math.cos(e.face) * kk, s = Math.sin(e.face) * kk;
    if (e.spawn < 1) ctx.globalAlpha = e.spawn;
    ctx.setTransform(c, s, -s, c, ox + e.x * k, oy + e.y * k);
    ctx.drawImage(spr, -spr.hw, -spr.hw, spr.dw, spr.dw);
    if (e.spawn < 1) ctx.globalAlpha = 1;
    if (e.boss) {
      ctx.setTransform(k, 0, 0, k, ox, oy);
      ctx.strokeStyle = e.def.color; ctx.lineWidth = 3; ctx.globalAlpha = 0.6;
      ctx.setLineDash([18, 12]); ctx.lineDashOffset = t * 60;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.45, 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
  }

  // enemy bullets
  ctx.globalCompositeOperation = 'lighter';
  ctx.setTransform(k, 0, 0, k, ox, oy);
  for (const b of EB) {
    if (Math.abs(b.x - camX) > hw + 20 || Math.abs(b.y - camY) > hh + 20) continue;
    ctx.drawImage(S.bullet, b.x - 12, b.y - 12, 24, 24);
  }

  // player projectiles and weapon visuals
  for (const pr of PROJ) {
    if (Math.abs(pr.x - camX) > hw + 40 || Math.abs(pr.y - camY) > hh + 40) continue;
    const spr = pr.k === PK.MISSILE ? S.missile : S.boomer;
    const scl = pr.k === PK.MISSILE ? (pr.w.evo ? 0.8 : 1) : pr.r / 16;
    const c = Math.cos(pr.ang) * k * scl, s = Math.sin(pr.ang) * k * scl;
    ctx.setTransform(c, s, -s, c, ox + pr.x * k, oy + pr.y * k);
    ctx.drawImage(spr, -spr.hw, -spr.hw, spr.dw, spr.dw);
  }
  for (const w of G.weapons) {
    if (w.id === 'orbit') {
      const spr = w.evo ? S.bladeEvo : S.blade;
      const scl = (w.st.size * G.stats.area) / 14;
      ctx.setTransform(k, 0, 0, k, ox, oy);
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#38f6ff'; ctx.lineWidth = 2;
      const rr = Math.hypot(w.bx[0] - p.x, w.by[0] - p.y);
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      for (let i = 0; i < w.nb; i++) {
        const a = Math.atan2(w.by[i] - p.y, w.bx[i] - p.x);
        const c = Math.cos(a) * k * scl, s = Math.sin(a) * k * scl;
        ctx.setTransform(c, s, -s, c, ox + w.bx[i] * k, oy + w.by[i] * k);
        ctx.drawImage(spr, -spr.hw, -spr.hw, spr.dw, spr.dw);
      }
    } else if (w.id === 'laser' && w.spinT > 0) {
      const n = 4 + G.stats.amount;
      const wid = w.st.width * G.stats.area;
      ctx.setTransform(k, 0, 0, k, ox, oy);
      for (let j = 0; j < n; j++) {
        const a = w.ang + (j * TAU) / n;
        beam(ctx, p.x, p.y, a, w.st.len * 0.8, wid * (0.9 + 0.2 * Math.sin(t * 30 + j)), '#c77dff', 0.9);
      }
    }
  }

  // player
  ctx.setTransform(k, 0, 0, k, ox, oy);
  if (!p.dead) {
    for (let i = p.trailN - 1; i >= 1; i--) {
      ctx.globalAlpha = 0.28 * (1 - i / p.trailN);
      const s = 18 * (1 - i / (p.trailN + 2));
      ctx.drawImage(dotSprite(CI_TRAIL), p.trail[i * 2] - s, p.trail[i * 2 + 1] - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 0.85;
    ctx.drawImage(S.playerGlow, p.x - 34, p.y - 34, 68, 68);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const blink = p.inv > 0 && ((p.inv * 14) | 0) % 2 === 0;
    if (!blink) {
      const hs = heroSprite(G.char);
      const c = Math.cos(p.fa) * k, s = Math.sin(p.fa) * k;
      ctx.setTransform(c, s, -s, c, ox + p.x * k, oy + p.y * k);
      ctx.drawImage(hs, -hs.hw, -hs.hw, hs.dw, hs.dw);
    }
    // hp bar
    ctx.setTransform(k, 0, 0, k, ox, oy);
    const bw = 34, frac = Math.max(0, p.hp / p.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(p.x - bw / 2 - 1, p.y + 21, bw + 2, 6);
    ctx.fillStyle = frac > 0.5 ? '#5dff9a' : frac > 0.25 ? '#ffd23f' : '#ff3f5a';
    ctx.fillRect(p.x - bw / 2, p.y + 22, bw * frac, 4);
    // direction chevron
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.char.color; ctx.lineWidth = 2.2; ctx.globalAlpha = 0.7;
    const ax = p.x + Math.cos(p.fa) * 30, ay = p.y + Math.sin(p.fa) * 30;
    ctx.beginPath();
    ctx.moveTo(ax + Math.cos(p.fa + 2.5) * 7, ay + Math.sin(p.fa + 2.5) * 7);
    ctx.lineTo(ax, ay);
    ctx.lineTo(ax + Math.cos(p.fa - 2.5) * 7, ay + Math.sin(p.fa - 2.5) * 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // fx
  ctx.globalCompositeOperation = 'lighter';
  ctx.setTransform(k, 0, 0, k, ox, oy);
  for (const f of FX) drawFx(ctx, f, p, t);
  ctx.globalAlpha = 1;

  // particles
  for (let i = 0, n = PT.n; i < n; i++) {
    const x = PT.x[i], y = PT.y[i];
    if (Math.abs(x - camX) > hw + 20 || Math.abs(y - camY) > hh + 20) continue;
    const lr = PT.life[i] / PT.max[i];
    const s = PT.size[i] * (0.4 + lr * 0.8);
    ctx.globalAlpha = lr > 0.5 ? 1 : lr * 2;
    ctx.drawImage(dotSprite(PT.col[i]), x - s, y - s, s * 2, s * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // damage numbers
  if (NUMS.length) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 15px system-ui, -apple-system, "PingFang SC", sans-serif';
    for (const n of NUMS) {
      const age = 1 - n.life / n.max;
      const pop = age < 0.15 ? 0.6 + (age / 0.15) * 0.7 : 1.3 - Math.min(0.3, (age - 0.15) * 0.6);
      const big = n.ty === 1 ? 1.45 : n.ty === 2 ? 1.25 : 1;
      const s = k * pop * big;
      ctx.setTransform(s, 0, 0, s, ox + n.x * k, oy + n.y * k);
      ctx.globalAlpha = n.life < 0.25 ? n.life / 0.25 : 1;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillText(n.s, 1.2, 1.4);
      ctx.fillStyle = n.ty === 1 ? '#fff04a' : n.ty === 2 ? '#ff3f5a' : n.ty === 3 ? '#5dff9a' : '#ffffff';
      ctx.fillText(n.s, 0, 0);
    }
    ctx.globalAlpha = 1;
  }

  // off-screen markers for chests and the boss
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = cw / dpr, H = ch / dpr;
  for (const o of PICKS) if (o.k === 'chest') marker(ctx, o.x, o.y, camX, camY, V, W, H, '#ffd23f', t);
  if (G.boss && !G.boss.dead) marker(ctx, G.boss.x, G.boss.y, camX, camY, V, W, H, '#ff3f5a', t);

  drawOverlays(ctx, cw, ch, dpr);
}

function marker(ctx, x, y, camX, camY, V, W, H, col, t) {
  const sx = (x - camX) * V.zoom + W / 2, sy = (y - camY) * V.zoom + H / 2;
  const m = 28;
  if (sx > m && sx < W - m && sy > m && sy < H - m) return;
  const cx = W / 2, cy = H / 2;
  const a = Math.atan2(sy - cy, sx - cx);
  const kx = (W / 2 - m) / Math.abs(Math.cos(a) || 1e-6), ky = (H / 2 - m) / Math.abs(Math.sin(a) || 1e-6);
  const r = Math.min(kx, ky);
  const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
  ctx.save();
  ctx.translate(px, py); ctx.rotate(a);
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 6);
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -10); ctx.lineTo(-2, 0); ctx.lineTo(-6, 10); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function beam(ctx, x, y, a, len, wid, col, alpha) {
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  ctx.lineCap = 'round';
  ctx.strokeStyle = col;
  ctx.globalAlpha = alpha * 0.25; ctx.lineWidth = wid * 2.4;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.globalAlpha = alpha * 0.7; ctx.lineWidth = wid;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = alpha; ctx.lineWidth = wid * 0.35;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.lineCap = 'butt';
}

function jag(ctx, x0, y0, x1, y1, amp) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d, ny = dx / d;
  const seg = Math.max(2, Math.min(6, (d / 28) | 0));
  for (let i = 1; i <= seg; i++) {
    const f = i / seg;
    const o = i === seg ? 0 : (Math.random() * 2 - 1) * amp;
    ctx.lineTo(x0 + dx * f + nx * o, y0 + dy * f + ny * o);
  }
}

function drawFx(ctx, f, p, t) {
  const lr = Math.max(0, f.life / f.max);
  const pr = 1 - lr;
  switch (f.k) {
    case FXK.SLASH: {
      const x = f.ref ? f.ref.x : f.x, y = f.ref ? f.ref.y : f.y;
      ctx.strokeStyle = f.col;
      if (f.w >= TAU - 0.01) {
        const r = f.r * (0.55 + pr * 0.45);
        ctx.globalAlpha = lr; ctx.lineWidth = f.r * 0.22 * lr + 2;
        ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.globalAlpha = lr;
        ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, TAU); ctx.stroke();
      } else {
        const h = f.w / 2;
        const sweep = Math.min(1, pr * 3.2);
        const a0 = f.a - h, a1 = f.a - h + f.w * sweep;
        ctx.globalAlpha = Math.min(1, lr * 1.6);
        ctx.lineWidth = f.r * 0.24;
        ctx.beginPath(); ctx.arc(x, y, f.r * 0.78, a0, a1); ctx.stroke();
        ctx.globalAlpha = Math.min(1, lr * 1.3) * 0.5; ctx.lineWidth = f.r * 0.5;
        ctx.beginPath(); ctx.arc(x, y, f.r * 0.6, a0 + f.w * 0.1 * sweep, a1); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.globalAlpha = lr;
        ctx.beginPath(); ctx.arc(x, y, f.r * 0.86, a0, a1); ctx.stroke();
      }
      break;
    }
    case FXK.BOLT: {
      if (f.n < 2) break;
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? '#ffffff' : f.col;
        ctx.lineWidth = pass ? 1.6 : 5;
        ctx.globalAlpha = pass ? lr : lr * 0.6;
        ctx.beginPath();
        ctx.moveTo(f.pts[0], f.pts[1]);
        for (let i = 1; i < f.n; i++) jag(ctx, f.pts[i * 2 - 2], f.pts[i * 2 - 1], f.pts[i * 2], f.pts[i * 2 + 1], 12);
        ctx.stroke();
      }
      break;
    }
    case FXK.BEAM:
      beam(ctx, f.x, f.y, f.a, f.r, f.w * (0.6 + lr * 0.6), f.col, lr);
      break;
    case FXK.RING: {
      const e = 1 - Math.pow(lr, 2.2);
      ctx.strokeStyle = f.col; ctx.globalAlpha = lr; ctx.lineWidth = 3 + 10 * lr;
      ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(1, f.r * e), 0, TAU); ctx.stroke();
      break;
    }
    case FXK.BOOM: {
      const r = f.r * (0.7 + pr * 0.6);
      ctx.globalAlpha = lr;
      ctx.drawImage(S.boom, f.x - r * 1.2, f.y - r * 1.2, r * 2.4, r * 2.4);
      ctx.strokeStyle = f.col; ctx.lineWidth = 3 * lr + 1;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.4 + pr * 0.8), 0, TAU); ctx.stroke();
      break;
    }
    case FXK.SKY: {
      ctx.globalAlpha = lr;
      ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(f.x + 20, f.y - 700); jag(ctx, f.x + 20, f.y - 700, f.x, f.y, 26); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(f.x + 20, f.y - 700); jag(ctx, f.x + 20, f.y - 700, f.x, f.y, 18); ctx.stroke();
      const r = f.r * (0.6 + pr);
      ctx.drawImage(S.boom, f.x - r, f.y - r, r * 2, r * 2);
      break;
    }
    case FXK.TELE: {
      const ex = f.x + Math.cos(f.a) * f.r, ey = f.y + Math.sin(f.a) * f.r;
      ctx.globalAlpha = (0.35 + 0.35 * Math.sin(t * 30)) * Math.min(1, lr * 3);
      ctx.strokeStyle = f.col; ctx.lineWidth = 40;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.globalAlpha = 0.8 * lr; ctx.lineWidth = 3; ctx.setLineDash([16, 12]);
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
  }
}

function drawOverlays(ctx, cw, ch, dpr) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  if (!vig || vigW !== cw || vigH !== ch) buildVignettes(cw, ch);
  ctx.globalAlpha = 1;
  ctx.drawImage(vig, 0, 0, cw, ch);
  const p = G.p;
  let red = G.redFlash > 0 ? Math.min(1, G.redFlash * 2.5) : 0;
  if (p && !p.dead && G.mode !== 'title' && p.hp / p.maxHp < 0.3) red = Math.max(red, 0.35 + 0.25 * Math.sin(G.realT * 6));
  if (red > 0) { ctx.globalAlpha = red; ctx.drawImage(vigRed, 0, 0, cw, ch); }
  if (G.whiteFlash > 0) { ctx.globalAlpha = Math.min(0.85, G.whiteFlash); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); }
  if (G.lvFlash > 0) { ctx.globalAlpha = G.lvFlash * 0.25; ctx.fillStyle = '#38f6ff'; ctx.fillRect(0, 0, cw, ch); }
  ctx.globalAlpha = 1;
  if (joy.active && G.mode === 'play') {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#38f6ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, joy.R, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(56,246,255,0.12)'; ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#38f6ff';
    ctx.shadowColor = '#38f6ff'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(joy.kx, joy.ky, joy.R * 0.42, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}
