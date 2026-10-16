import {
  G, E, GEMS, PROJ, PT, frame, togglePause, simulate, debugGiveXP, debugHorde, debugMaxWeapon,
  debugDropChest, debugSkip, debugEvent, vacuum, startRun, chooseOption, debugDie,
} from './game.js';
import { render } from './render.js';
import { initInput, readMove } from './input.js';
import { initUI, updateHud, onKey, beginRun, goTitle, pickCard, show } from './ui.js';
import { initAudio, suspendAudio } from './audio.js';
import { meta, saveMeta, initMeta } from './meta.js';
import { clearSave } from './util.js';
import { setLang, detectLang } from './i18n.js';
import { initPlatform, loadingStart, loadingStop, setGameplay, platformLocale, getEnv } from './platform.js';

// the SDK (when present) must be ready before the save is read: on CrazyGames it lives in SDK.data
await initPlatform();
loadingStart();
initMeta();
setLang(detectLang(meta.save.settings.lang, platformLocale()));

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
let renderScale = 1; // lowered automatically if the device cannot keep up

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1) * renderScale;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const V = G.view;
  V.w = w; V.h = h; V.dpr = canvas.width / w;
  V.zoom = Math.max(0.6, Math.min(1.6, Math.sqrt((w * h) / (1100 * 720))));
  V.ww = w / V.zoom; V.wh = h / V.zoom;
  const diag = Math.hypot(V.ww, V.wh);
  V.spawnR = diag / 2 + 50;
  V.despawnR = diag / 2 + 420;
  needsDraw = true;
}

let needsDraw = true;
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));
resize();

initInput(canvas, {
  canJoy: () => G.mode === 'play',
  onKey: (code) => { initAudio(); onKey(code); },
});
initUI();
document.body.classList.remove('boot');

// audio needs a user gesture (iOS: touchend / click)
const unlock = () => initAudio();
for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) window.addEventListener(ev, unlock, { passive: true });

// stop pinch / double-tap zoom and page scrolling while playing (also keeps a host page from scrolling)
document.addEventListener('gesturestart', (e) => e.preventDefault());
window.addEventListener('wheel', (e) => {
  if (!e.target.closest || !e.target.closest('.screen')) e.preventDefault();
}, { passive: false });
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => {
  if (!e.target.closest || !e.target.closest('.screen')) e.preventDefault();
}, { passive: false });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (G.mode === 'play') togglePause(true);
    suspendAudio(true);
    saveMeta();
  } else suspendAudio(false);
});

// ---------------- main loop
let last = performance.now();
let fpsAcc = 0, fpsN = 0, slowT = 0, fastT = 0;
G.fps = 60;
G.updMs = 0; G.renMs = 0;
const FROZEN = new Set(['levelup', 'chest', 'pause', 'over']);
const PLAYING = new Set(['play', 'lvintro']);
let lastMode = '';

function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;
  if (dt <= 0) return;
  const w0 = performance.now();
  const mv = readMove();
  G.input.x = mv.x; G.input.y = mv.y;
  frame(dt);
  if (G.mode !== 'title') updateHud();
  const w1 = performance.now();
  // frozen screens keep the last frame; skip redraw to save battery
  if (!FROZEN.has(G.mode) || needsDraw || lastMode !== G.mode || G.whiteFlash > 0 || G.lvFlash > 0 || G.redFlash > 0) {
    render(ctx, canvas.width, canvas.height);
    needsDraw = false;
  }
  const w2 = performance.now();
  G.updMs = G.updMs * 0.95 + (w1 - w0) * 0.05;
  G.renMs = G.renMs * 0.95 + (w2 - w1) * 0.05;
  lastMode = G.mode;
  // tell the platform when the player is actually playing; tab switches are handled by the platform itself
  if (!document.hidden) setGameplay(PLAYING.has(G.mode));
  // fps + adaptive quality
  fpsAcc += dt; fpsN++;
  if (fpsAcc >= 0.5) {
    G.fps = Math.round(fpsN / fpsAcc);
    fpsAcc = 0; fpsN = 0;
    if (G.mode === 'play' && !document.hidden) {
      if (G.fps < 48) { slowT += 0.5; fastT = 0; } else if (G.fps >= 58) { fastT += 0.5; slowT = 0; } else { slowT = 0; fastT = 0; }
      if (slowT >= 2) {
        slowT = 0;
        if (renderScale > 0.75) { renderScale = Math.max(0.75, renderScale - 0.25); resize(); }
        else if (!G.lowFx) { G.lowFx = true; G.ptCap = 600; }
        else if (G.perfCap > 380) G.perfCap -= 60;
      }
    }
  }
}
requestAnimationFrame(loop);

// startup "loading": wait for the title font (short cap so a slow font never blocks play)
try {
  if (document.fonts && document.fonts.load) {
    await Promise.race([document.fonts.load('900 40px Orbitron'), new Promise((r) => setTimeout(r, 1500))]);
  }
} catch (e) { /* ignore */ }
needsDraw = true;
loadingStop();

// ---------------- debug hook for headless testing
window.__game = {
  G,
  get enemies() { return E.length; },
  state() {
    return {
      mode: G.mode, t: +G.t.toFixed(2), level: G.level, xp: +G.xp.toFixed(1), kills: G.kills, enemies: E.length, gems: GEMS.length,
      proj: PROJ.length, particles: PT.n, fps: G.fps, hp: G.p ? Math.round(G.p.hp) : null, coins: Math.floor(G.coins),
      weapons: G.weapons.map((w) => w.id + ':' + w.level + (w.evo ? '*' : '')), passives: G.passives.map((p) => p.id + ':' + p.level),
      env: getEnv(), renderScale, lowFx: G.lowFx, updMs: +G.updMs.toFixed(2), renMs: +G.renMs.toFixed(2), metaCoins: meta.save.coins, boss: G.boss ? G.boss.type : null,
    };
  },
  start(id = 'nia') { beginRun(id); return this.state(); },
  title() { goTitle(); },
  sim(sec, auto = true) { simulate(sec, auto); return this.state(); },
  skip(sec) { debugSkip(sec); return this.state(); },
  xp(n) { debugGiveXP(n); return this.state(); },
  horde(n, type) { return debugHorde(n, type); },
  maxWeapon(id) { return debugMaxWeapon(id); },
  chest() { debugDropChest(); },
  event(i) { debugEvent(i); },
  vacuum() { vacuum(); },
  pick(i) { pickCard(i); },
  choose(i) { chooseOption(i); },
  auto(v = true) { G.auto = v; },
  god(v = true) { G.god = v; },
  kill() { debugDie(); },
  coins(n) { meta.save.coins += n; saveMeta(); },
  reset() { clearSave(); location.reload(); },
  show,
  startRun,
};
