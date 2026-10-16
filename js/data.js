// Game data. Names and descriptions live in strings.js and are filled in by i18n.setLang().
const TAU = Math.PI * 2;

export const WEAPON_MAX = 6;
export const SLOT_MAX = 6;
export const RUN_TIME = 900; // 15 minutes

export const WEAPONS = [
  {
    id: 'orbit', idx: 0, color: '#38f6ff',
    evo: { with: 'area' },
  },
  {
    id: 'whip', idx: 1, color: '#ff4fd8',
    evo: { with: 'might' },
  },
  {
    id: 'missile', idx: 2, color: '#ffa53a',
    evo: { with: 'amount' },
  },
  {
    id: 'chain', idx: 3, color: '#8fd0ff',
    evo: { with: 'cooldown' },
  },
  {
    id: 'aura', idx: 4, color: '#5dff9a',
    evo: { with: 'maxhp' },
  },
  {
    id: 'boomerang', idx: 5, color: '#fff04a',
    evo: { with: 'speed' },
  },
  {
    id: 'zone', idx: 6, color: '#ff5a3c',
    evo: { with: 'duration' },
  },
  {
    id: 'laser', idx: 7, color: '#c77dff',
    evo: { with: 'crit' },
  },
];

export function weaponStats(id, L, evo) {
  let s;
  switch (id) {
    case 'orbit':
      s = { count: 3, dmg: 11, radius: 66, spin: 3.6, size: 14, tick: 0.45, kb: 110 };
      if (L >= 2) s.count++;
      if (L >= 3) { s.dmg += 5; s.radius += 15; }
      if (L >= 4) s.count++;
      if (L >= 5) { s.spin *= 1.3; s.dmg += 5; }
      if (L >= 6) { s.count++; s.size *= 1.3; }
      if (evo) { s.count *= 2; s.dmg *= 1.6; s.size *= 1.25; s.kb = 240; s.tick = 0.35; }
      break;
    case 'whip':
      s = { count: 1, dmg: 20, cd: 1.25, range: 125, arc: 2.1, kb: 170 };
      if (L >= 2) s.count = 2;
      if (L >= 3) s.dmg += 8;
      if (L >= 4) { s.range *= 1.2; s.dmg += 5; }
      if (L >= 5) s.cd -= 0.2;
      if (L >= 6) { s.dmg += 10; s.range *= 1.15; }
      if (evo) { s.dmg *= 1.5; s.range *= 1.4; s.cd = 0.95; s.arc = TAU; s.count = 1; s.kb = 260; }
      break;
    case 'missile':
      s = { count: 1, dmg: 16, cd: 1.6, boom: 44, speed: 500 };
      if (L >= 2) s.count++;
      if (L >= 3) s.dmg += 6;
      if (L >= 4) { s.count++; s.boom += 10; }
      if (L >= 5) s.cd -= 0.3;
      if (L >= 6) { s.count++; s.dmg += 8; }
      if (evo) { s.count *= 3; s.boom *= 1.4; s.cd = 0.9; s.dmg *= 1.1; }
      break;
    case 'chain':
      s = { count: 1, dmg: 15, cd: 1.4, jumps: 3, range: 175, strikes: 0 };
      if (L >= 2) s.jumps += 2;
      if (L >= 3) s.dmg += 6;
      if (L >= 4) s.count++;
      if (L >= 5) s.cd -= 0.25;
      if (L >= 6) { s.jumps += 3; s.dmg += 6; }
      if (evo) { s.jumps *= 2; s.count++; s.strikes = 5; s.dmg *= 1.3; }
      break;
    case 'aura':
      s = { r: 66, dmg: 5, tick: 0.42, slow: 0.25, heal: false };
      if (L >= 2) s.r += 12;
      if (L >= 3) s.dmg += 3;
      if (L >= 4) { s.r += 12; s.tick = 0.34; }
      if (L >= 5) s.dmg += 3;
      if (L >= 6) { s.r += 15; s.dmg += 4; }
      if (evo) { s.r *= 1.35; s.dmg *= 1.7; s.slow = 0.5; s.heal = true; }
      break;
    case 'boomerang':
      s = { count: 1, dmg: 16, cd: 1.5, size: 16, range: 250, speed: 520, all: false };
      if (L >= 2) s.count++;
      if (L >= 3) s.dmg += 6;
      if (L >= 4) { s.size *= 1.25; s.range *= 1.2; }
      if (L >= 5) s.count++;
      if (L >= 6) { s.dmg += 10; s.speed *= 1.2; }
      if (evo) { s.count = s.count * 2 + 2; s.size *= 1.4; s.dmg *= 1.3; s.cd = 1.2; s.all = true; }
      break;
    case 'zone':
      s = { count: 1, dmg: 7, cd: 3, r: 52, dur: 2.6, tick: 0.3, trail: false };
      if (L >= 2) s.count++;
      if (L >= 3) { s.dmg += 3; s.r += 10; }
      if (L >= 4) s.dur += 0.8;
      if (L >= 5) s.count++;
      if (L >= 6) { s.dmg += 4; s.r += 15; }
      if (evo) { s.r *= 1.5; s.dur *= 1.6; s.dmg *= 1.3; s.trail = true; s.cd = 2.4; }
      break;
    case 'laser':
      s = { count: 1, dmg: 32, cd: 2.3, width: 12, len: 760, spin: false };
      if (L >= 2) s.cd -= 0.3;
      if (L >= 3) s.dmg += 12;
      if (L >= 4) s.count++;
      if (L >= 5) s.width *= 1.4;
      if (L >= 6) { s.dmg += 15; s.count++; }
      if (evo) { s.spin = true; s.width *= 1.3; s.cd = 3.4; s.tick = 0.14; s.dur = 2.4; s.dmg *= 0.42; }
      break;
  }
  return s;
}

export const PASSIVES = [
  { id: 'might', max: 5, color: '#ff4a5a' },
  { id: 'armor', max: 5, color: '#9fb4ff' },
  { id: 'maxhp', max: 5, color: '#ff5c8a' },
  { id: 'regen', max: 5, color: '#5dff9a' },
  { id: 'speed', max: 5, color: '#38f6ff' },
  { id: 'cooldown', max: 5, color: '#8fd0ff' },
  { id: 'area', max: 5, color: '#c77dff' },
  { id: 'magnet', max: 5, color: '#ffd23f' },
  { id: 'amount', max: 2, color: '#ffa53a' },
  { id: 'duration', max: 5, color: '#ff9ae0' },
  { id: 'crit', max: 5, color: '#fff04a' },
  { id: 'growth', max: 5, color: '#5dffe0' },
];

// ai: chase (default), ranged, exploder
export const ENEMIES = {
  crawler: { hp: 9, speed: 64, dmg: 6, r: 13, xp: 1, color: '#ff3fa4', shape: 'tri' },
  fast: { hp: 6, speed: 128, dmg: 6, r: 10, xp: 1, color: '#3ff0ff', shape: 'diamond' },
  tank: { hp: 60, speed: 40, dmg: 16, r: 24, xp: 4, color: '#ff9a2e', shape: 'hex', kbRes: 0.25 },
  ranged: { hp: 18, speed: 58, dmg: 7, r: 14, xp: 3, color: '#7dff5a', shape: 'square', ai: 'ranged' },
  splitter: { hp: 26, speed: 52, dmg: 10, r: 18, xp: 2, color: '#b45cff', shape: 'blob', split: 'mini' },
  mini: { hp: 6, speed: 98, dmg: 5, r: 9, xp: 1, color: '#d9a6ff', shape: 'blob' },
  swarm: { hp: 4, speed: 112, dmg: 4, r: 7, xp: 1, color: '#ffe23f', shape: 'dot' },
  exploder: { hp: 14, speed: 84, dmg: 24, r: 14, xp: 2, color: '#ff5a2e', shape: 'star', ai: 'exploder' },
  colossus: { hp: 2600, speed: 50, dmg: 25, r: 56, xp: 160, color: '#ff9a2e', shape: 'hex', boss: 'colossus', kbRes: 0 },
  hive: { hp: 7000, speed: 42, dmg: 22, r: 60, xp: 260, color: '#b45cff', shape: 'blob', boss: 'hive', kbRes: 0 },
  voidlord: { hp: 16000, speed: 60, dmg: 30, r: 64, xp: 400, color: '#ff3fa4', shape: 'star', boss: 'void', kbRes: 0 },
};

export function hpScale(t) {
  const m = t / 60;
  return 1 + m * 0.35 + m * m * 0.07;
}

// [startMinute, spawns per second, max alive, weights]
export const WAVES = [
  [0, 1.5, 30, { crawler: 1 }],
  [1, 2.3, 60, { crawler: 3, fast: 1 }],
  [2, 3.3, 95, { crawler: 3, fast: 2, swarm: 1 }],
  [3, 4.6, 135, { crawler: 2, fast: 2, tank: 1, swarm: 1 }],
  [4, 6, 175, { crawler: 2, ranged: 1, tank: 1, splitter: 1 }],
  [5, 6.5, 210, { crawler: 2, fast: 2, splitter: 2, swarm: 2 }],
  [6, 8.5, 260, { crawler: 3, tank: 2, ranged: 1, exploder: 1 }],
  [7, 10.5, 310, { fast: 3, splitter: 2, exploder: 2, swarm: 2 }],
  [8, 12.5, 360, { crawler: 3, tank: 3, ranged: 2 }],
  [9, 16, 410, { fast: 3, swarm: 3, exploder: 2, crawler: 2 }],
  [10, 22, 450, { crawler: 2, fast: 2, tank: 2, ranged: 1, splitter: 2, swarm: 2, exploder: 1 }],
  [11, 28, 500, { tank: 3, splitter: 3, ranged: 2, crawler: 2 }],
  [12, 36, 560, { swarm: 4, fast: 3, exploder: 3, crawler: 2 }],
  [13, 46, 610, { tank: 3, splitter: 2, ranged: 2, exploder: 2, fast: 2 }],
  [14, 58, 660, { crawler: 2, fast: 2, tank: 2, ranged: 2, splitter: 2, swarm: 2, exploder: 2 }],
];

export const EVENTS = [
  { t: 75, kind: 'stream', type: 'swarm', n: 40, msg: 'ev.swarm' },
  { t: 150, kind: 'elite', type: 'tank', n: 1, msg: 'ev.eliteChest' },
  { t: 210, kind: 'ring', type: 'crawler', n: 48, msg: 'ev.ring' },
  { t: 255, kind: 'elite', type: 'fast', n: 1, msg: 'ev.elite' },
  { t: 300, kind: 'boss', type: 'colossus', msg: 'ev.colossus' },
  { t: 390, kind: 'elite', type: 'splitter', n: 2, msg: 'ev.elite' },
  { t: 450, kind: 'stream', type: 'swarm', n: 80, msg: 'ev.swarm' },
  { t: 480, kind: 'elite', type: 'exploder', n: 1, msg: 'ev.elite' },
  { t: 510, kind: 'ring', type: 'exploder', n: 36, msg: 'ev.boomerRing' },
  { t: 560, kind: 'elite', type: 'crawler', n: 2, msg: 'ev.elite' },
  { t: 600, kind: 'boss', type: 'hive', msg: 'ev.hive' },
  { t: 660, kind: 'elite', type: 'ranged', n: 3, msg: 'ev.squad' },
  { t: 720, kind: 'ring', type: 'tank', n: 30, msg: 'ev.wall' },
  { t: 750, kind: 'stream', type: 'swarm', n: 120, msg: 'ev.swarm' },
  { t: 780, kind: 'elite', type: 'tank', n: 3, msg: 'ev.squad' },
  { t: 840, kind: 'boss', type: 'voidlord', msg: 'ev.void' },
  { t: 870, kind: 'elite', type: 'fast', n: 2, msg: 'ev.elite' },
];

export function xpNeed(L) {
  return Math.floor(5 + (L - 1) * 7 + Math.max(0, L - 15) * 5 + Math.max(0, L - 25) * 6 + Math.max(0, L - 32) * 8 + Math.max(0, L - 40) * 10);
}

export const CHARS = [
  {
    id: 'nia', weapon: 'orbit', color: '#38f6ff', cost: 0,
    bonus: { maxhp: 20 },
  },
  {
    id: 'volt', weapon: 'chain', color: '#8fd0ff', cost: 400,
    bonus: { cooldown: 0.1 },
  },
  {
    id: 'phantom', weapon: 'boomerang', color: '#fff04a', cost: 900,
    bonus: { speed: 0.15, crit: 0.08 },
  },
];

export const SHOP = [
  { id: 'might', max: 5, base: 60, icon: 'might' },
  { id: 'maxhp', max: 5, base: 50, icon: 'maxhp' },
  { id: 'armor', max: 3, base: 100, icon: 'armor' },
  { id: 'regen', max: 5, base: 70, icon: 'regen' },
  { id: 'cooldown', max: 4, base: 120, icon: 'cooldown' },
  { id: 'area', max: 4, base: 90, icon: 'area' },
  { id: 'speed', max: 3, base: 80, icon: 'speed' },
  { id: 'magnet', max: 4, base: 50, icon: 'magnet' },
  { id: 'growth', max: 5, base: 80, icon: 'growth' },
  { id: 'greed', max: 5, base: 60, icon: 'coin' },
  { id: 'reroll', max: 3, base: 150, icon: 'reroll' },
  { id: 'revive', max: 1, base: 1200, icon: 'revive' },
];

export function shopCost(item, lvl) {
  return Math.round((item.base * (lvl + 1) * (lvl + 2)) / 2 / 5) * 5;
}

export const ACHIEVEMENTS = [
  { id: 'first', reward: 20 },
  { id: 't5', reward: 50 },
  { id: 't10', reward: 120 },
  { id: 'win', reward: 300 },
  { id: 'k1000', reward: 80 },
  { id: 'k3000', reward: 200 },
  { id: 'boss', reward: 100 },
  { id: 'evo', reward: 80 },
  { id: 'evo3', reward: 250 },
  { id: 'lv30', reward: 120 },
  { id: 'combo200', reward: 100 },
  { id: 'full', reward: 100 },
  { id: 'rich', reward: 150 },
  { id: 'allchars', reward: 200 },
];
