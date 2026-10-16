import { G, startRun, chooseOption, reroll, closeChest, togglePause, quitRun } from './game.js';
import { WEAPONS, PASSIVES, CHARS, SHOP, ACHIEVEMENTS, shopCost, RUN_TIME } from './data.js';
import { meta, saveMeta, buyUpgrade, refundAll, unlockChar, upLevel } from './meta.js';
import { iconURL } from './icons.js';
import { bus, fmtTime } from './util.js';
import { sfx, setAudioOpts, initAudio, setIntensity } from './audio.js';
import { release } from './input.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['s-title', 's-chars', 's-shop', 's-ach', 's-levelup', 's-chest', 's-pause', 's-over'];
let current = 's-title';
let selChar = 'nia';
let cardLock = 0;

const SPEAKER_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="#fff"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/></svg>';
const SPEAKER_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="#fff"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

export function show(id) {
  current = id;
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  const inRun = ['s-levelup', 's-chest', 's-pause'].includes(id) || id === null;
  $('hud').classList.toggle('hidden', !inRun);
}
export function currentScreen() { return current; }

function on(id, fn) {
  $(id).addEventListener('click', (e) => { e.preventDefault(); initAudio(); fn(e); });
}

function applyAudio() {
  const s = meta.save.settings;
  setAudioOpts({ muted: s.muted, music: s.music, sfx: s.sfx });
  $('btn-mute').innerHTML = s.muted ? SPEAKER_OFF : SPEAKER_ON;
  const lab = (b, name, v) => { b.textContent = name + '：' + (v ? '开' : '关'); b.classList.toggle('off', !v); };
  lab($('t-music'), '音乐', s.music); lab($('p-music'), '音乐', s.music);
  lab($('t-sfx'), '音效', s.sfx); lab($('p-sfx'), '音效', s.sfx);
  lab($('p-nums'), '伤害数字', s.dmgNums); lab($('p-shake'), '屏幕震动', s.shake);
}

export function toggleMute() {
  meta.save.settings.muted = !meta.save.settings.muted;
  saveMeta(); applyAudio();
}

// ---------------- title
function renderTitle() {
  $('t-coins').textContent = meta.save.coins;
  const st = meta.save.stats;
  $('t-record').textContent = st.runs
    ? '最佳：存活 ' + fmtTime(st.bestTime) + ' · 击杀 ' + st.bestKills + ' · 等级 ' + st.bestLevel + (st.wins ? ' · 胜利 ' + st.wins + ' 次' : '')
    : '第一次来？先活过 5 分钟试试。';
  const touch = matchMedia('(hover: none)').matches;
  $('t-hint').textContent = touch
    ? '只管走位，武器会自动攻击。按住屏幕任意位置拖动即可移动。'
    : '只管走位，武器会自动攻击。WASD / 方向键移动，Esc 暂停，1 2 3 选择升级。';
}

export function goTitle() {
  G.mode = 'title';
  setIntensity(0);
  renderTitle();
  show('s-title');
}

// ---------------- characters
function renderChars() {
  const list = $('char-list');
  list.innerHTML = '';
  for (const c of CHARS) {
    const unlocked = !!meta.save.chars[c.id];
    const w = WEAPONS.find((x) => x.id === c.weapon);
    const el = document.createElement('div');
    el.className = 'char-card' + (selChar === c.id ? ' sel' : '') + (unlocked ? '' : ' locked');
    el.style.setProperty('--c', c.color);
    el.innerHTML =
      '<img src="' + iconURL(c.id, false, 128) + '" alt="">' +
      '<div class="cinfo"><div class="cn">' + esc(c.name) + '</div><div class="ct">' + esc(c.title) + '</div>' +
      '<div class="cw"><img src="' + iconURL(w.id) + '" alt="">初始武器：' + esc(w.name) + '</div>' +
      '<div class="cb">' + esc(c.bonusText) + '</div><div class="cd">' + esc(c.desc) + '</div></div>' +
      (unlocked ? '' : '<div class="lock"><button class="btn small unlock"><img class="coin-ico" src="' + iconURL('coin') + '" alt=""> ' + c.cost + ' 解锁</button></div>');
    el.addEventListener('click', (e) => {
      initAudio();
      if (!unlocked) {
        if (e.target.closest('.unlock')) {
          if (unlockChar(c.id)) { sfx.buy(); selChar = c.id; renderChars(); } else sfx.deny();
        } else sfx.deny();
        return;
      }
      selChar = c.id; sfx.click(); renderChars();
    });
    list.appendChild(el);
  }
  $('c-go').disabled = !meta.save.chars[selChar];
}

function openChars() {
  selChar = meta.save.chars[meta.save.lastChar] ? meta.save.lastChar : 'nia';
  renderChars();
  show('s-chars');
}

export function beginRun(id) {
  release();
  startRun(id || selChar);
  saveMeta();
  show(null);
  buildSlots();
}

// ---------------- shop
function renderShop() {
  $('shop-coins').textContent = meta.save.coins;
  const list = $('shop-list');
  list.innerHTML = '';
  for (const item of SHOP) {
    const lvl = upLevel(item.id);
    const maxed = lvl >= item.max;
    const cost = maxed ? 0 : shopCost(item, lvl);
    const el = document.createElement('div');
    el.className = 'tile' + (maxed ? ' maxed' : '');
    let pips = '';
    for (let i = 0; i < item.max; i++) pips += '<span class="pip' + (i < lvl ? ' on' : '') + '"></span>';
    el.innerHTML =
      '<img src="' + iconURL(item.icon) + '" alt=""><div class="tn">' + esc(item.name) + '</div>' +
      '<button class="btn buy"' + (!maxed && meta.save.coins < cost ? ' disabled' : '') + '>' +
      (maxed ? '已满级' : '<img src="' + iconURL('coin') + '" alt="">' + cost) + '</button>' +
      '<div class="td">' + esc(item.desc) + '<div class="pips">' + pips + '</div></div>';
    el.querySelector('.buy').addEventListener('click', () => {
      initAudio();
      if (buyUpgrade(item.id)) {
        sfx.buy(); renderShop();
        const tiles = list.children;
        const idx = SHOP.indexOf(item);
        if (tiles[idx]) tiles[idx].classList.add('flash');
      } else sfx.deny();
    });
    list.appendChild(el);
  }
}
let shopReturn = 's-title';
function openShop(from) { shopReturn = from || 's-title'; renderShop(); show('s-shop'); }

// ---------------- achievements
function renderAch() {
  const list = $('ach-list');
  list.innerHTML = '';
  let n = 0;
  for (const a of ACHIEVEMENTS) {
    const done = !!meta.save.ach[a.id];
    if (done) n++;
    const el = document.createElement('div');
    el.className = 'ach' + (done ? ' done' : '');
    el.innerHTML = '<div class="an">' + (done ? '★ ' : '') + esc(a.name) + '</div><div class="ad">' + esc(a.desc) + '</div><div class="ar">奖励 ' + a.reward + ' 金币</div>';
    list.appendChild(el);
  }
  $('ach-count').textContent = '已完成 ' + n + ' / ' + ACHIEVEMENTS.length;
  const s = meta.save.stats;
  $('ach-stats').innerHTML = [
    ['游戏局数', s.runs], ['胜利次数', s.wins], ['总击杀', s.totalKills], ['累计金币', s.totalCoins],
    ['首领击破', s.bossKills], ['武器进化', s.evolutions], ['最长存活', fmtTime(s.bestTime)], ['最高连杀', s.bestCombo],
  ].map(([k, v]) => '<div class="st"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>').join('');
}

// ---------------- HUD
let hudCache = {};
function buildSlots() {
  const el = $('slots');
  let h = '<div class="srow">';
  for (const w of G.weapons) h += '<div class="slot' + (w.evo ? ' evo' : '') + '"><img src="' + iconURL(w.id, w.evo, 64) + '" alt=""><b>' + (w.evo ? '★' : w.level) + '</b></div>';
  h += '</div><div class="srow">';
  for (const p of G.passives) h += '<div class="slot"><img src="' + iconURL(p.id, false, 64) + '" alt=""><b>' + p.level + '</b></div>';
  h += '</div>';
  el.innerHTML = h;
  hudCache = {};
}

export function updateHud() {
  if (!G.p) return;
  const c = hudCache;
  const xpf = Math.min(1, G.xp / G.xpNext);
  const xr = Math.round(xpf * 200);
  if (c.xp !== xr) { c.xp = xr; $('xpfill').style.transform = 'scaleX(' + xpf.toFixed(3) + ')'; }
  if (c.lv !== G.level) { c.lv = G.level; $('lvl').textContent = 'Lv.' + G.level; }
  const sec = Math.floor(G.t);
  if (c.t !== sec) {
    c.t = sec;
    $('timer').textContent = fmtTime(G.t);
    $('timer').classList.toggle('late', G.t > RUN_TIME - 60);
  }
  if (c.k !== G.kills) { c.k = G.kills; $('kills').textContent = '击杀 ' + G.kills; }
  const co = Math.floor(G.coins);
  if (c.co !== co) { c.co = co; $('coin-n').textContent = co; }
  const sig = G.weapons.map((w) => w.id + w.level + (w.evo ? 'e' : '')).join() + '|' + G.passives.map((p) => p.id + p.level).join();
  if (c.sig !== sig) { buildSlots(); c.sig = sig; }
  const combo = G.combo >= 10 ? G.combo : 0;
  if (c.combo !== combo) {
    const el = $('combo');
    el.classList.toggle('hidden', !combo);
    if (combo) {
      $('combo-n').textContent = combo;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    }
    c.combo = combo;
  }
}

let bannerTimer = 0;
function showBanner({ text, kind }) {
  const el = $('banner');
  el.className = '';
  void el.offsetWidth;
  el.textContent = text;
  el.className = 'show ' + (kind || '');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { el.className = ''; }, 2500);
}

// achievements are shown one at a time so they never pile up over buttons
const toastQ = [];
let toastBusy = false;
function toast(a) { toastQ.push(a); if (!toastBusy) nextToast(); }
function nextToast() {
  const a = toastQ.shift();
  if (!a) { toastBusy = false; return; }
  toastBusy = true;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = '成就解锁：' + esc(a.name) + '<small>+' + a.reward + ' 金币</small>';
  $('toasts').appendChild(el);
  sfx.ach();
  setTimeout(() => { el.remove(); nextToast(); }, 2600);
}

function clearBanner() { clearTimeout(bannerTimer); $('banner').className = ''; }

// ---------------- level up / chest / pause / over
function showCards(opts) {
  const box = $('cards');
  box.innerHTML = '';
  opts.forEach((o, i) => {
    const el = document.createElement('button');
    el.className = 'card' + (o.evo ? ' evo' : '');
    el.style.setProperty('--c', o.color);
    el.style.setProperty('--d', (i * 0.09).toFixed(2) + 's');
    el.innerHTML =
      '<span class="c-key">' + (i + 1) + '</span>' +
      (o.tag ? '<span class="c-tag">' + esc(o.tag) + '</span>' : '') +
      '<img class="c-ico" src="' + iconURL(o.icon, o.evo, 128) + '" alt="">' +
      '<div class="c-body"><div class="c-name">' + esc(o.name) + '</div>' +
      (o.lv ? '<div class="c-lv">' + esc(o.lv) + '</div>' : '') +
      '<div class="c-desc">' + esc(o.desc) + '</div>' +
      (o.hint ? '<div class="c-hint">' + esc(o.hint) + '</div>' : '') + '</div>';
    el.addEventListener('click', () => pickCard(i));
    box.appendChild(el);
    setTimeout(() => sfx.card(), i * 90);
  });
  $('reroll-n').textContent = G.rerolls;
  $('b-reroll').classList.toggle('hidden', G.rerolls <= 0);
  cardLock = performance.now() + 380; // stop a held tap from instantly choosing
  clearBanner();
  show('s-levelup');
}

export function pickCard(i) {
  if (G.mode !== 'levelup' || performance.now() < cardLock) return;
  const cards = $('cards').children;
  if (cards[i]) cards[i].classList.add('sel');
  cardLock = performance.now() + 1e6;
  setTimeout(() => {
    chooseOption(i);
    cardLock = 0;
  }, 120);
}

function showChest({ items, coins }) {
  $('chest-img').src = iconURL('chest', false, 192);
  const box = $('chest-items');
  box.innerHTML = '';
  items.forEach((o, i) => {
    const el = document.createElement('div');
    el.className = 'chest-item' + (o.evo ? ' evo' : '');
    el.style.setProperty('--c', o.color);
    el.style.setProperty('--d', (0.9 + i * 0.18).toFixed(2) + 's');
    el.innerHTML = '<img src="' + iconURL(o.icon, o.evo, 96) + '" alt=""><div><div class="n">' + esc(o.name) + (o.lv ? ' <small>' + esc(o.lv) + '</small>' : '') + '</div><div class="d">' + esc(o.desc) + '</div></div>';
    box.appendChild(el);
  });
  const cc = $('chest-coins');
  cc.style.setProperty('--d', (1 + items.length * 0.18).toFixed(2) + 's');
  cc.textContent = '+' + coins + ' 金币';
  cardLock = performance.now() + 900;
  clearBanner();
  show('s-chest');
}

function renderPause() {
  const wl = $('p-weapons');
  wl.innerHTML = G.weapons.map((w) =>
    '<div class="build-item' + (w.evo ? ' evo' : '') + '"><img src="' + iconURL(w.id, w.evo) + '" alt=""><div><div class="bn">' + esc(w.evo ? w.def.evo.name : w.def.name) + '</div><div class="bl">' + (w.evo ? '已进化' : 'Lv.' + w.level + ' / 6') + '</div></div><div class="bd">伤害 ' + Math.round(w.dealt) + '<br>击杀 ' + w.kills + '</div></div>').join('') || '<div class="empty">无</div>';
  const pl = $('p-passives');
  pl.innerHTML = G.passives.map((p) =>
    '<div class="build-item"><img src="' + iconURL(p.id) + '" alt=""><div><div class="bn">' + esc(p.def.name) + '</div><div class="bl">Lv.' + p.level + ' / ' + p.def.max + ' · ' + esc(p.def.desc) + '</div></div></div>').join('') || '<div class="empty">还没有道具</div>';
  const s = G.stats;
  const pct = (v) => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
  $('p-stats').innerHTML = [
    ['生命', Math.ceil(G.p.hp) + ' / ' + G.p.maxHp], ['伤害', pct(s.might - 1)], ['冷却', pct(s.cd - 1)], ['范围', pct(s.area - 1)],
    ['移速', pct(s.speed - 1)], ['暴击率', Math.round(s.crit * 100) + '%'], ['护甲', s.armor], ['回复', s.regen.toFixed(1) + '/秒'],
    ['拾取范围', Math.round(s.magnet)], ['投射物', '+' + s.amount], ['经验', pct(s.growth - 1)], ['复活', G.revives],
  ].map(([k, v]) => '<div class="st"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>').join('');
  applyAudio();
}

function renderOver(sm) {
  const t = $('o-title');
  t.textContent = sm.won ? '胜利！' : '阵亡';
  t.className = sm.won ? 'win' : 'lose';
  $('o-sub').textContent = sm.char.name + ' · ' + (sm.won ? '你在虫潮中坚持到了黎明。' : '虫群吞没了你。再来一次，会更强。');
  const r = sm.rec;
  $('o-stats').innerHTML = [
    ['存活时间', fmtTime(sm.time), r.time], ['击杀', sm.kills, r.kills], ['等级', sm.level, r.level], ['最高连杀', sm.bestCombo, false],
    ['首领击破', sm.bossKills, false], ['武器进化', sm.evolved, false], ['受到伤害', Math.round(sm.dmgTaken), false],
  ].map(([k, v, rec]) => '<div class="st' + (rec ? ' rec' : '') + '"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>').join('');
  const max = Math.max(1, ...sm.weapons.map((w) => w.dealt));
  const total = sm.weapons.reduce((a, w) => a + w.dealt, 0) || 1;
  $('o-weapons').innerHTML = sm.weapons.map((w) =>
    '<div class="dmg-row" style="--c:' + w.color + '"><img src="' + iconURL(w.id, w.evo) + '" alt=""><div class="nm">' + esc(w.name) + '</div><div class="bar"><i style="width:' + ((w.dealt / max) * 100).toFixed(1) + '%"></i></div><div class="num">' + fmtNum(w.dealt) + ' · ' + Math.round((w.dealt / total) * 100) + '%</div></div>').join('');
  $('o-coins').innerHTML = '<span>拾取 ' + sm.coinsRun + '</span><span>结算奖励 ' + sm.bonus + '</span><div class="tot"><img class="coin-ico" src="' + iconURL('coin') + '" alt="">+' + sm.total + '</div>';
  $('o-ach').innerHTML = sm.ach.map((a) => '<span class="chip">★ ' + esc(a.name) + ' +' + a.reward + '</span>').join('');
}

function fmtNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return '' + n;
}

// ---------------- wiring
export function initUI() {
  for (const img of document.querySelectorAll('img.coin-ico')) if (!img.src) img.src = iconURL('coin', false, 64);
  on('b-start', () => { sfx.click(); openChars(); });
  on('b-shop', () => { sfx.click(); openShop('s-title'); });
  on('b-ach', () => { sfx.click(); renderAch(); show('s-ach'); });
  on('c-back', () => { sfx.click(); goTitle(); });
  on('c-go', () => { if (!meta.save.chars[selChar]) return; sfx.pick(); beginRun(selChar); });
  on('shop-back', () => { sfx.click(); if (shopReturn === 's-over') show('s-over'); else goTitle(); });
  on('shop-refund', () => {
    if (!window.confirm('重置全部强化并退还金币？')) return;
    refundAll(); sfx.coin(); renderShop();
  });
  on('ach-back', () => { sfx.click(); goTitle(); });
  on('b-reroll', () => { reroll(); });
  on('chest-ok', () => { if (performance.now() < cardLock) return; sfx.click(); closeChest(); });
  on('btn-pause', () => { if (togglePause(true)) sfx.click(); });
  on('btn-mute', () => toggleMute());
  on('p-resume', () => { sfx.click(); togglePause(false); });
  on('p-quit', () => { if (window.confirm('放弃本局？已获得的金币仍会结算。')) quitRun(); });
  const tog = (key) => () => { meta.save.settings[key] = !meta.save.settings[key]; saveMeta(); applyAudio(); sfx.click(); };
  on('t-music', tog('music')); on('p-music', tog('music'));
  on('t-sfx', tog('sfx')); on('p-sfx', tog('sfx'));
  on('p-nums', tog('dmgNums')); on('p-shake', tog('shake'));
  on('o-again', () => { sfx.pick(); beginRun(G.char ? G.char.id : selChar); });
  on('o-shop', () => { sfx.click(); openShop('s-over'); });
  on('o-home', () => { sfx.click(); goTitle(); });

  bus.on('levelup', (opts) => showCards(opts));
  bus.on('resume', () => { show(null); });
  bus.on('pause', () => { release(); renderPause(); show('s-pause'); });
  bus.on('chest', (c) => showChest(c));
  bus.on('banner', showBanner);
  bus.on('ach', toast);
  bus.on('runstart', () => { $('bossbar').classList.add('hidden'); hudCache = {}; });
  bus.on('boss', (e) => { $('bossbar').classList.remove('hidden'); $('bossname').textContent = e.def.name; });
  let lastBoss = -1;
  bus.on('bosshp', (e) => {
    if (!e) { $('bossbar').classList.add('hidden'); lastBoss = -1; return; }
    const f = Math.max(0, e.hp / e.maxHp);
    const r = Math.round(f * 300);
    if (r !== lastBoss) { lastBoss = r; $('bossfill').style.transform = 'scaleX(' + f.toFixed(3) + ')'; }
  });
  bus.on('ending', () => { release(); });
  bus.on('over', (sm) => { renderOver(sm); show('s-over'); });
  applyAudio();
  renderTitle();
  show('s-title');
}

export function onKey(code) {
  if (current === 's-levelup') {
    if (code === 'Digit1' || code === 'Numpad1') pickCard(0);
    else if (code === 'Digit2' || code === 'Numpad2') pickCard(1);
    else if (code === 'Digit3' || code === 'Numpad3') pickCard(2);
    else if (code === 'KeyR') reroll();
    return;
  }
  if (current === 's-chest' && (code === 'Enter' || code === 'Space')) { if (performance.now() >= cardLock) closeChest(); return; }
  if (code === 'Escape' || code === 'KeyP') {
    if (G.mode === 'play') togglePause(true);
    else if (G.mode === 'pause') togglePause(false);
    else if (current === 's-chars' || current === 's-shop' || current === 's-ach') { if (current === 's-shop' && shopReturn === 's-over') show('s-over'); else goTitle(); }
    return;
  }
  if (code === 'KeyM') toggleMute();
  if ((code === 'Enter' || code === 'Space') && current === 's-title') openChars();
  else if ((code === 'Enter') && current === 's-chars' && meta.save.chars[selChar]) beginRun(selChar);
  else if ((code === 'Enter') && current === 's-over') beginRun(G.char ? G.char.id : selChar);
}
