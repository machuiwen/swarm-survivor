const TAU = Math.PI * 2;

export const WEAPON_MAX = 6;
export const SLOT_MAX = 6;
export const RUN_TIME = 900; // 15 minutes

export const WEAPONS = [
  {
    id: 'orbit', idx: 0, name: '环刃', color: '#38f6ff',
    desc: '光刃环绕自身旋转，切碎靠近的敌人。',
    lv: ['3 片光刃环绕旋转', '光刃 +1', '伤害 +5，环绕半径 +15', '光刃 +1', '旋转速度 +30%，伤害 +5', '光刃 +1，光刃变大 30%'],
    evo: { with: 'area', name: '星环风暴', desc: '光刃数量翻倍，半径脉动扩张，击退更猛烈。' },
  },
  {
    id: 'whip', idx: 1, name: '电鞭', color: '#ff4fd8',
    desc: '向前方甩出弧形电鞭，横扫一片。',
    lv: ['向前方挥出电鞭', '额外向身后挥一鞭', '伤害 +8', '范围 +20%，伤害 +5', '冷却 -0.2 秒', '伤害 +10，范围 +15%'],
    evo: { with: 'might', name: '雷霆裂斩', desc: '360° 环形斩击，范围与伤害大幅提升。' },
  },
  {
    id: 'missile', idx: 2, name: '追踪导弹', color: '#ffa53a',
    desc: '发射自动追踪敌人的导弹，命中后爆炸。',
    lv: ['发射 1 枚追踪导弹', '导弹 +1', '伤害 +6', '导弹 +1，爆炸范围 +10', '冷却 -0.3 秒', '导弹 +1，伤害 +8'],
    evo: { with: 'amount', name: '蜂群导弹', desc: '导弹数量三倍，爆炸更大，冷却更短。' },
  },
  {
    id: 'chain', idx: 3, name: '连锁闪电', color: '#8fd0ff',
    desc: '闪电击中最近的敌人，并在敌人之间跳跃。',
    lv: ['闪电跳跃 3 次', '跳跃 +2', '伤害 +6', '闪电 +1 道', '冷却 -0.25 秒', '跳跃 +3，伤害 +6'],
    evo: { with: 'cooldown', name: '天罚雷暴', desc: '跳跃翻倍，并从天而降落雷轰击敌群。' },
  },
  {
    id: 'aura', idx: 4, name: '能量力场', color: '#5dff9a',
    desc: '持续伤害并减速身边的敌人。',
    lv: ['展开能量力场', '范围 +12', '伤害 +3', '范围 +12，伤害更频繁', '伤害 +3', '范围 +15，伤害 +4'],
    evo: { with: 'maxhp', name: '噬魂领域', desc: '范围与伤害提升，强力减速，场内击杀回复生命。' },
  },
  {
    id: 'boomerang', idx: 5, name: '回旋镖', color: '#fff04a',
    desc: '掷出会飞回来的回旋镖，穿透所有敌人。',
    lv: ['掷出 1 枚回旋镖', '回旋镖 +1', '伤害 +6', '尺寸 +25%，射程 +20%', '回旋镖 +1', '伤害 +10，速度 +20%'],
    evo: { with: 'speed', name: '双子回旋', desc: '向四面八方掷出巨型回旋镖。' },
  },
  {
    id: 'zone', idx: 6, name: '灼烧地带', color: '#ff5a3c',
    desc: '在敌群中点燃火焰区域，持续灼烧。',
    lv: ['点燃 1 片火焰区域', '区域 +1', '伤害 +3，范围 +10', '持续时间 +0.8 秒', '区域 +1', '伤害 +4，范围 +15'],
    evo: { with: 'duration', name: '熔岩炼狱', desc: '火焰区域巨大且持久，脚下留下熔岩足迹。' },
  },
  {
    id: 'laser', idx: 7, name: '棱光激光', color: '#c77dff',
    desc: '射出贯穿一切的激光束。',
    lv: ['射出 1 道激光', '冷却 -0.3 秒', '伤害 +12', '激光 +1 道', '激光宽度 +40%', '伤害 +15，激光 +1 道'],
    evo: { with: 'crit', name: '歼星光束', desc: '四道激光围绕自身旋转扫射。' },
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
  { id: 'might', name: '力量模块', desc: '伤害 +10%', max: 5, color: '#ff4a5a' },
  { id: 'armor', name: '纳米装甲', desc: '受到的伤害 -1', max: 5, color: '#9fb4ff' },
  { id: 'maxhp', name: '生命容器', desc: '最大生命 +20', max: 5, color: '#ff5c8a' },
  { id: 'regen', name: '再生纳米', desc: '每秒回复 0.3 生命', max: 5, color: '#5dff9a' },
  { id: 'speed', name: '疾风靴', desc: '移动速度 +8%', max: 5, color: '#38f6ff' },
  { id: 'cooldown', name: '超频芯片', desc: '武器冷却 -7%', max: 5, color: '#8fd0ff' },
  { id: 'area', name: '扩域棱镜', desc: '攻击范围 +10%', max: 5, color: '#c77dff' },
  { id: 'magnet', name: '引力核', desc: '拾取范围 +30%', max: 5, color: '#ffd23f' },
  { id: 'amount', name: '弹匣扩容', desc: '投射物数量 +1', max: 2, color: '#ffa53a' },
  { id: 'duration', name: '时滞沙漏', desc: '持续时间 +12%', max: 5, color: '#ff9ae0' },
  { id: 'crit', name: '暴击透镜', desc: '暴击率 +6%（暴击造成双倍伤害）', max: 5, color: '#fff04a' },
  { id: 'growth', name: '智慧晶体', desc: '获得经验 +8%', max: 5, color: '#5dffe0' },
];

// ai: chase (default), ranged, exploder
export const ENEMIES = {
  crawler: { name: '爬虫', hp: 9, speed: 64, dmg: 6, r: 13, xp: 1, color: '#ff3fa4', shape: 'tri' },
  fast: { name: '疾影', hp: 6, speed: 128, dmg: 6, r: 10, xp: 1, color: '#3ff0ff', shape: 'diamond' },
  tank: { name: '重甲', hp: 60, speed: 40, dmg: 16, r: 24, xp: 4, color: '#ff9a2e', shape: 'hex', kbRes: 0.25 },
  ranged: { name: '射手', hp: 18, speed: 58, dmg: 7, r: 14, xp: 3, color: '#7dff5a', shape: 'square', ai: 'ranged' },
  splitter: { name: '分裂体', hp: 26, speed: 52, dmg: 10, r: 18, xp: 2, color: '#b45cff', shape: 'blob', split: 'mini' },
  mini: { name: '小分裂体', hp: 6, speed: 98, dmg: 5, r: 9, xp: 1, color: '#d9a6ff', shape: 'blob' },
  swarm: { name: '蜂群', hp: 4, speed: 112, dmg: 4, r: 7, xp: 1, color: '#ffe23f', shape: 'dot' },
  exploder: { name: '爆破虫', hp: 14, speed: 84, dmg: 24, r: 14, xp: 2, color: '#ff5a2e', shape: 'star', ai: 'exploder' },
  colossus: { name: '巨像', hp: 2600, speed: 50, dmg: 25, r: 56, xp: 160, color: '#ff9a2e', shape: 'hex', boss: 'colossus', kbRes: 0 },
  hive: { name: '母巢女王', hp: 7000, speed: 42, dmg: 22, r: 60, xp: 260, color: '#b45cff', shape: 'blob', boss: 'hive', kbRes: 0 },
  voidlord: { name: '虚空之主', hp: 16000, speed: 60, dmg: 30, r: 64, xp: 400, color: '#ff3fa4', shape: 'star', boss: 'void', kbRes: 0 },
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
  { t: 75, kind: 'stream', type: 'swarm', n: 40, text: '蜂群来袭！' },
  { t: 150, kind: 'elite', type: 'tank', n: 1, text: '精英出现！击败它获得宝箱' },
  { t: 210, kind: 'ring', type: 'crawler', n: 48, text: '被包围了！' },
  { t: 255, kind: 'elite', type: 'fast', n: 1, text: '精英出现！' },
  { t: 300, kind: 'boss', type: 'colossus', text: '警告：巨像降临' },
  { t: 390, kind: 'elite', type: 'splitter', n: 2, text: '精英出现！' },
  { t: 450, kind: 'stream', type: 'swarm', n: 80, text: '蜂群来袭！' },
  { t: 480, kind: 'elite', type: 'exploder', n: 1, text: '精英出现！' },
  { t: 510, kind: 'ring', type: 'exploder', n: 36, text: '爆破虫包围！' },
  { t: 560, kind: 'elite', type: 'crawler', n: 2, text: '精英出现！' },
  { t: 600, kind: 'boss', type: 'hive', text: '警告：母巢女王降临' },
  { t: 660, kind: 'elite', type: 'ranged', n: 3, text: '精英小队！' },
  { t: 720, kind: 'ring', type: 'tank', n: 30, text: '铁壁合围！' },
  { t: 750, kind: 'stream', type: 'swarm', n: 120, text: '蜂群来袭！' },
  { t: 780, kind: 'elite', type: 'tank', n: 3, text: '精英小队！' },
  { t: 840, kind: 'boss', type: 'voidlord', text: '最终警告：虚空之主' },
  { t: 870, kind: 'elite', type: 'fast', n: 2, text: '精英出现！' },
];

export function xpNeed(L) {
  return Math.floor(5 + (L - 1) * 7 + Math.max(0, L - 15) * 5 + Math.max(0, L - 25) * 6 + Math.max(0, L - 32) * 8 + Math.max(0, L - 40) * 10);
}

export const CHARS = [
  {
    id: 'nia', name: '霓刃', title: '近身舞者', weapon: 'orbit', color: '#38f6ff', cost: 0,
    bonus: { maxhp: 20 }, bonusText: '最大生命 +20',
    desc: '环刃护体，适合新手。贴近敌群也能稳住。',
  },
  {
    id: 'volt', name: '雷鸣', title: '风暴术士', weapon: 'chain', color: '#8fd0ff', cost: 400,
    bonus: { cooldown: 0.1 }, bonusText: '武器冷却 -10%',
    desc: '闪电在敌群中跳跃，越密集越致命。',
  },
  {
    id: 'phantom', name: '幻影', title: '疾行猎手', weapon: 'boomerang', color: '#fff04a', cost: 900,
    bonus: { speed: 0.15, crit: 0.08 }, bonusText: '移速 +15%，暴击率 +8%',
    desc: '高速游走，用回旋镖收割一切。',
  },
];

export const SHOP = [
  { id: 'might', name: '力量', desc: '伤害 +5%', max: 5, base: 60, icon: 'might' },
  { id: 'maxhp', name: '生命', desc: '最大生命 +10', max: 5, base: 50, icon: 'maxhp' },
  { id: 'armor', name: '护甲', desc: '受到的伤害 -1', max: 3, base: 100, icon: 'armor' },
  { id: 'regen', name: '恢复', desc: '每秒回复 +0.1 生命', max: 5, base: 70, icon: 'regen' },
  { id: 'cooldown', name: '冷却', desc: '武器冷却 -3%', max: 4, base: 120, icon: 'cooldown' },
  { id: 'area', name: '范围', desc: '攻击范围 +5%', max: 4, base: 90, icon: 'area' },
  { id: 'speed', name: '速度', desc: '移动速度 +5%', max: 3, base: 80, icon: 'speed' },
  { id: 'magnet', name: '磁力', desc: '拾取范围 +15%', max: 4, base: 50, icon: 'magnet' },
  { id: 'growth', name: '成长', desc: '获得经验 +5%', max: 5, base: 80, icon: 'growth' },
  { id: 'greed', name: '贪婪', desc: '获得金币 +10%', max: 5, base: 60, icon: 'coin' },
  { id: 'reroll', name: '刷新', desc: '每局可刷新升级选项 +1 次', max: 3, base: 150, icon: 'reroll' },
  { id: 'revive', name: '复活', desc: '阵亡后满血复活一次', max: 1, base: 1200, icon: 'revive' },
];

export function shopCost(item, lvl) {
  return Math.round((item.base * (lvl + 1) * (lvl + 2)) / 2 / 5) * 5;
}

export const ACHIEVEMENTS = [
  { id: 'first', name: '初次狩猎', desc: '完成第一局游戏', reward: 20 },
  { id: 't5', name: '坚持', desc: '单局存活 5 分钟', reward: 50 },
  { id: 't10', name: '老兵', desc: '单局存活 10 分钟', reward: 120 },
  { id: 'win', name: '黎明', desc: '存活 15 分钟或击败虚空之主', reward: 300 },
  { id: 'k1000', name: '千人斩', desc: '单局击杀 1000 个敌人', reward: 80 },
  { id: 'k3000', name: '虫群克星', desc: '单局击杀 3000 个敌人', reward: 200 },
  { id: 'boss', name: '屠巨者', desc: '击败一个首领', reward: 100 },
  { id: 'evo', name: '质变', desc: '进化一件武器', reward: 80 },
  { id: 'evo3', name: '究极武装', desc: '单局进化 3 件武器', reward: 250 },
  { id: 'lv30', name: '强者之路', desc: '单局达到 30 级', reward: 120 },
  { id: 'combo200', name: '连杀狂潮', desc: '达成 1000 连杀', reward: 100 },
  { id: 'full', name: '满载', desc: '单局同时拥有 6 件武器', reward: 100 },
  { id: 'rich', name: '小富翁', desc: '累计获得 2000 金币', reward: 150 },
  { id: 'allchars', name: '全员集结', desc: '解锁全部角色', reward: 200 },
];
