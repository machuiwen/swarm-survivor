import { G, startRun, chooseOption, reroll, closeChest, togglePause, quitRun } from './game.js';
import { WEAPONS, PASSIVES, CHARS, SHOP, ACHIEVEMENTS, shopCost, RUN_TIME } from './data.js';
import { meta, saveMeta, buyUpgrade, refundAll, unlockChar, upLevel } from './meta.js';
import { iconURL } from './icons.js';
import { bus, fmtTime } from './util.js';
import { sfx, setAudioOpts, initAudio, setIntensity } from './audio.js';
import { release } from './input.js';
import { t, getLang, setLang } from './i18n.js';
import { platformMuted, onPlatformSettings } from './platform.js';

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
  const muted = s.muted || platformMuted();
  setAudioOpts({ muted, music: s.music, sfx: s.sfx });
  $('btn-mute').innerHTML = muted ? SPEAKER_OFF : SPEAKER_ON;
  const lab = (b, key, v) => {
    b.textContent = t('opt.fmt', { name: t(key), v: t(v ? 'opt.on' : 'opt.off') });
    b.classList.toggle('off', !v);
  };
  lab($('t-music'), 'opt.music', s.music); lab($('p-music'), 'opt.music', s.music);
  lab($('t-sfx'), 'opt.sfx', s.sfx); lab($('p-sfx'), 'opt.sfx', s.sfx);
  lab($('p-nums'), 'opt.nums', s.dmgNums); lab($('p-shake'), 'opt.shake', s.shake);
}

// in-game confirm dialog; window.confirm() may be blocked inside the platform iframe
let confirmYes = null;
function askConfirm(msg, onYes) {
  $('confirm-msg').textContent = msg;
  confirmYes = onYes;
  $('confirm').classList.remove('hidden');
}
function closeConfirm(ok) {
  const fn = confirmYes;
  confirmYes = null;
  $('confirm').classList.add('hidden');
  if (ok && fn) fn();
}

function switchLang() {
  const next = getLang() === 'zh' ? 'en' : 'zh';
  meta.save.settings.lang = next;
  saveMeta();
  setLang(next);
  applyAudio();
  renderTitle();
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
    ? t('menu.best', { time: fmtTime(st.bestTime), kills: st.bestKills, level: st.bestLevel }) + (st.wins ? t('menu.wins', { n: st.wins }) : '')
    : t('menu.firstTime');
  const touch = matchMedia('(hover: none)').matches;
  $('t-hint').textContent = t(touch ? 'menu.hintTouch' : 'menu.hintKeys');
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
      '<div class="cw"><img src="' + iconURL(w.id) + '" alt="">' + esc(t('chars.weapon', { name: w.name })) + '</div>' +
      '<div class="cb">' + esc(c.bonusText) + '</div><div class="cd">' + esc(c.desc) + '</div></div>' +
      (unlocked ? '' : '<div class="lock"><button class="btn small unlock">' + esc(t('chars.unlock')) + ' <img class="coin-ico" src="' + iconURL('coin') + '" alt=""> ' + c.cost + '</button></div>');
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

function lastChar() { return meta.save.chars[meta.save.lastChar] ? meta.save.lastChar : 'nia'; }

// Play goes straight into a run with the last hero: one click from the menu to gameplay
function quickStart() { beginRun(lastChar()); }

function openChars() {
  selChar = lastChar();
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
      (maxed ? esc(t('shop.maxed')) : '<img src="' + iconURL('coin') + '" alt="">' + cost) + '</button>' +
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
    el.innerHTML = '<div class="an">' + (done ? '★ ' : '') + esc(a.name) + '</div><div class="ad">' + esc(a.desc) + '</div><div class="ar">' + esc(t('ach.reward', { n: a.reward })) + '</div>';
    list.appendChild(el);
  }
  $('ach-count').textContent = t('ach.count', { n, total: ACHIEVEMENTS.length });
  const s = meta.save.stats;
  $('ach-stats').innerHTML = [
    ['stat.runs', s.runs], ['stat.wins', s.wins], ['stat.totalKills', s.totalKills], ['stat.totalCoins', s.totalCoins],
    ['stat.bossKills', s.bossKills], ['stat.evolutions', s.evolutions], ['stat.bestTime', fmtTime(s.bestTime)], ['stat.bestCombo', s.bestCombo],
  ].map(([k, v]) => '<div class="st"><div class="k">' + esc(t(k)) + '</div><div class="v">' + v + '</div></div>').join('');
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
  if (c.k !== G.kills) { c.k = G.kills; $('kills').textContent = t('hud.kills', { n: G.kills }); }
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
  el.innerHTML = esc(t('ach.toast', { name: a.name })) + '<small>' + esc(t('ach.toastCoins', { n: a.reward })) + '</small>';
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
  $('b-reroll').textContent = t('lv.reroll', { n: G.rerolls });
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
  cc.textContent = t('chest.coins', { n: coins });
  cardLock = performance.now() + 900;
  clearBanner();
  show('s-chest');
}

function renderPause() {
  const wl = $('p-weapons');
  wl.innerHTML = G.weapons.map((w) =>
    '<div class="build-item' + (w.evo ? ' evo' : '') + '"><img src="' + iconURL(w.id, w.evo) + '" alt=""><div><div class="bn">' + esc(w.evo ? w.def.evo.name : w.def.name) + '</div><div class="bl">' + esc(w.evo ? t('pause.evolved') : t('pause.lvOf', { n: w.level, max: 6 })) + '</div></div><div class="bd">' + esc(t('pause.dmg', { n: Math.round(w.dealt) })) + '<br>' + esc(t('pause.kills', { n: w.kills })) + '</div></div>').join('') || '<div class="empty">' + esc(t('pause.none')) + '</div>';
  const pl = $('p-passives');
  pl.innerHTML = G.passives.map((p) =>
    '<div class="build-item"><img src="' + iconURL(p.id) + '" alt=""><div><div class="bn">' + esc(p.def.name) + '</div><div class="bl">' + esc(t('pause.lvOf', { n: p.level, max: p.def.max })) + ' · ' + esc(p.def.desc) + '</div></div></div>').join('') || '<div class="empty">' + esc(t('pause.noItems')) + '</div>';
  const s = G.stats;
  const pct = (v) => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
  $('p-stats').innerHTML = [
    ['ps.hp', Math.ceil(G.p.hp) + ' / ' + G.p.maxHp], ['ps.might', pct(s.might - 1)], ['ps.cd', pct(s.cd - 1)], ['ps.area', pct(s.area - 1)],
    ['ps.speed', pct(s.speed - 1)], ['ps.crit', Math.round(s.crit * 100) + '%'], ['ps.armor', s.armor], ['ps.regen', t('ps.regenFmt', { n: s.regen.toFixed(1) })],
    ['ps.magnet', Math.round(s.magnet)], ['ps.amount', '+' + s.amount], ['ps.growth', pct(s.growth - 1)], ['ps.revives', G.revives],
  ].map(([k, v]) => '<div class="st"><div class="k">' + esc(t(k)) + '</div><div class="v">' + v + '</div></div>').join('');
  applyAudio();
}

function renderOver(sm) {
  const title = $('o-title');
  title.textContent = t(sm.won ? 'over.win' : 'over.lose');
  title.className = sm.won ? 'win' : 'lose';
  $('o-sub').textContent = sm.char.name + ' · ' + t(sm.won ? 'over.winSub' : 'over.loseSub');
  const r = sm.rec;
  $('o-stats').innerHTML = [
    ['over.time', fmtTime(sm.time), r.time], ['over.kills', sm.kills, r.kills], ['over.level', sm.level, r.level], ['over.combo', sm.bestCombo, false],
    ['over.bosses', sm.bossKills, false], ['over.evolved', sm.evolved, false], ['over.dmgTaken', Math.round(sm.dmgTaken), false],
  ].map(([k, v, rec]) => '<div class="st' + (rec ? ' rec' : '') + '"><div class="k">' + esc(t(k)) + '</div><div class="v">' + v +
    (rec ? '<span class="rec-tag">' + esc(t('over.newRecord')) + '</span>' : '') + '</div></div>').join('');
  const max = Math.max(1, ...sm.weapons.map((w) => w.dealt));
  const total = sm.weapons.reduce((a, w) => a + w.dealt, 0) || 1;
  $('o-weapons').innerHTML = sm.weapons.map((w) =>
    '<div class="dmg-row" style="--c:' + w.color + '"><img src="' + iconURL(w.id, w.evo) + '" alt=""><div class="nm">' + esc(w.name) + '</div><div class="bar"><i style="width:' + ((w.dealt / max) * 100).toFixed(1) + '%"></i></div><div class="num">' + fmtNum(w.dealt) + ' · ' + Math.round((w.dealt / total) * 100) + '%</div></div>').join('');
  $('o-coins').innerHTML = '<span>' + esc(t('over.picked', { n: sm.coinsRun })) + '</span><span>' + esc(t('over.bonus', { n: sm.bonus })) + '</span><div class="tot"><img class="coin-ico" src="' + iconURL('coin') + '" alt="">+' + sm.total + '</div>';
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
  on('b-start', () => { sfx.pick(); quickStart(); });
  on('b-chars', () => { sfx.click(); openChars(); });
  on('b-shop', () => { sfx.click(); openShop('s-title'); });
  on('b-ach', () => { sfx.click(); renderAch(); show('s-ach'); });
  on('c-back', () => { sfx.click(); goTitle(); });
  on('c-go', () => { if (!meta.save.chars[selChar]) return; sfx.pick(); beginRun(selChar); });
  on('shop-back', () => { sfx.click(); if (shopReturn === 's-over') show('s-over'); else goTitle(); });
  on('shop-refund', () => {
    askConfirm(t('shop.confirmRefund'), () => { refundAll(); sfx.coin(); renderShop(); });
  });
  on('ach-back', () => { sfx.click(); goTitle(); });
  on('b-reroll', () => { reroll(); });
  on('chest-ok', () => { if (performance.now() < cardLock) return; sfx.click(); closeChest(); });
  on('btn-pause', () => { if (togglePause(true)) sfx.click(); });
  on('btn-mute', () => toggleMute());
  on('p-resume', () => { sfx.click(); togglePause(false); });
  on('p-quit', () => { askConfirm(t('pause.confirmQuit'), () => quitRun()); });
  on('confirm-yes', () => { sfx.click(); closeConfirm(true); });
  on('confirm-no', () => { sfx.click(); closeConfirm(false); });
  on('t-lang', () => { sfx.click(); switchLang(); });
  onPlatformSettings(() => applyAudio());
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
  if (confirmYes) {
    if (code === 'Escape') closeConfirm(false);
    else if (code === 'Enter') closeConfirm(true);
    return;
  }
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
  if ((code === 'Enter' || code === 'Space') && current === 's-title') quickStart();
  else if ((code === 'Enter') && current === 's-chars' && meta.save.chars[selChar]) beginRun(selChar);
  else if ((code === 'Enter') && current === 's-over') beginRun(G.char ? G.char.id : selChar);
}
