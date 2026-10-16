// Permanent progress: coins, shop upgrades, unlocked characters, achievements, records, settings.
import { loadSave, writeSave, bus } from './util.js';
import { SHOP, CHARS, ACHIEVEMENTS, shopCost } from './data.js';

const DEF = {
  coins: 0,
  up: Object.fromEntries(SHOP.map((s) => [s.id, 0])),
  chars: { nia: true, volt: false, phantom: false },
  ach: {},
  stats: {
    runs: 0, wins: 0, totalKills: 0, totalCoins: 0, bossKills: 0, evolutions: 0,
    bestTime: 0, bestKills: 0, bestLevel: 0, bestCombo: 0,
  },
  settings: { muted: false, music: true, sfx: true, dmgNums: true, shake: true },
  lastChar: 'nia',
};

export const meta = { save: loadSave(DEF) };

export function saveMeta() { writeSave(meta.save); }

export function upLevel(id) { return meta.save.up[id] || 0; }

export function buyUpgrade(id) {
  const item = SHOP.find((s) => s.id === id);
  if (!item) return false;
  const lvl = upLevel(id);
  if (lvl >= item.max) return false;
  const cost = shopCost(item, lvl);
  if (meta.save.coins < cost) return false;
  meta.save.coins -= cost;
  meta.save.up[id] = lvl + 1;
  saveMeta();
  return true;
}

export function refundAll() {
  let back = 0;
  for (const item of SHOP) {
    const lvl = upLevel(item.id);
    for (let l = 0; l < lvl; l++) back += shopCost(item, l);
    meta.save.up[item.id] = 0;
  }
  meta.save.coins += back;
  saveMeta();
  return back;
}

export function unlockChar(id) {
  const c = CHARS.find((x) => x.id === id);
  if (!c || meta.save.chars[id]) return false;
  if (meta.save.coins < c.cost) return false;
  meta.save.coins -= c.cost;
  meta.save.chars[id] = true;
  saveMeta();
  checkAch({});
  return true;
}

// run: { time, kills, level, evolved, bestCombo, weapons, won, bossKills }
export function checkAch(run) {
  const s = meta.save;
  const got = [];
  const cond = {
    first: () => run.done,
    t5: () => run.time >= 300,
    t10: () => run.time >= 600,
    win: () => run.won,
    k1000: () => run.kills >= 1000,
    k3000: () => run.kills >= 3000,
    boss: () => run.bossKills > 0 || s.stats.bossKills > 0,
    evo: () => run.evolved > 0 || s.stats.evolutions > 0,
    evo3: () => run.evolved >= 3,
    lv30: () => run.level >= 30,
    combo200: () => run.bestCombo >= 1000 || s.stats.bestCombo >= 1000,
    full: () => run.weapons >= 6,
    rich: () => s.stats.totalCoins >= 2000,
    allchars: () => CHARS.every((c) => s.chars[c.id]),
  };
  for (const a of ACHIEVEMENTS) {
    if (s.ach[a.id]) continue;
    let okk = false;
    try { okk = !!cond[a.id](); } catch (e) { okk = false; }
    if (okk) {
      s.ach[a.id] = Date.now();
      s.coins += a.reward;
      got.push(a);
      bus.emit('ach', a);
    }
  }
  if (got.length) saveMeta();
  return got;
}
