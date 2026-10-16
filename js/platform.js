// Thin wrapper around the CrazyGames HTML5 SDK v3. Every call is a safe no-op when the SDK
// is missing, fails to init, or runs outside CrazyGames (environment 'disabled').
let sdk = null;
let env = 'none'; // none | disabled | local | crazygames
let gameplay = false;
let useCloudData = false;

function warn(what, e) {
  try { console.warn('[platform] ' + what + ' failed:', e && (e.message || e.code || e)); } catch (err) { /* ignore */ }
}

function call(what, fn) {
  if (!sdk) return undefined;
  try {
    const r = fn(sdk);
    if (r && typeof r.catch === 'function') r.catch((e) => warn(what, e));
    return r;
  } catch (e) {
    warn(what, e);
    return undefined;
  }
}

// On a foreign top-level page (e.g. GitHub Pages) init() only resolves 'disabled' after ~7 s,
// so skip it there. CrazyGames always runs the game in an iframe or on its own domains.
function maybeCrazyGames() {
  try {
    const h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || /(^|\.)crazygames\./.test(h)) return true;
    if (/[?&]useLocalSdk=true/.test(location.search)) return true;
    return window.top !== window.self;
  } catch (e) {
    return true;
  }
}

export async function initPlatform(timeoutMs = 6000) {
  const S = window.CrazyGames && window.CrazyGames.SDK;
  if (!S || typeof S.init !== 'function') return env;
  if (!maybeCrazyGames()) { env = 'disabled'; return env; }
  try {
    let timer;
    const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('init timeout')), timeoutMs); });
    await Promise.race([S.init(), timeout]);
    clearTimeout(timer);
    env = S.environment || 'disabled';
  } catch (e) {
    warn('init', e);
    env = 'none';
    return env;
  }
  // in 'disabled' every SDK method throws, so never touch it there
  if (env === 'crazygames' || env === 'local') sdk = S;
  if (env === 'crazygames' && S.data) useCloudData = true;
  return env;
}

export function getEnv() { return env; }

export function loadingStart() { call('loadingStart', (s) => s.game.loadingStart()); }
export function loadingStop() { call('loadingStop', (s) => s.game.loadingStop()); }

export function setGameplay(on) {
  on = !!on;
  if (on === gameplay) return;
  gameplay = on;
  if (on) call('gameplayStart', (s) => s.game.gameplayStart());
  else call('gameplayStop', (s) => s.game.gameplayStop());
}

export function happytime() { call('happytime', (s) => s.game.happytime()); }

// the platform's mute wins over the in-game sound settings
export function platformMuted() {
  if (!sdk) return false;
  try { return !!(sdk.game.settings && sdk.game.settings.muteAudio); } catch (e) { return false; }
}

export function onPlatformSettings(fn) {
  call('addSettingsChangeListener', (s) => s.game.addSettingsChangeListener(fn));
}

export function platformLocale() {
  if (env !== 'crazygames' || !sdk) return '';
  try { return (sdk.user && sdk.user.systemInfo && sdk.user.systemInfo.locale) || ''; } catch (e) { return ''; }
}

// ---- storage: SDK.data (cloud + guest save) on CrazyGames, localStorage everywhere else
function local() {
  try { return window.localStorage; } catch (e) { return null; }
}

function cloudFail(what, e) {
  warn('data.' + what, e);
  useCloudData = false; // e.g. 'dataModuleDisabled': keep the game working on localStorage
}

export function storageGet(key) {
  if (useCloudData) {
    try {
      const v = sdk.data.getItem(key);
      if (v && typeof v.then === 'function') throw new Error('async getItem');
      if (v !== null && v !== undefined) return v;
      // one-time move of an older local save into the SDK store
      const old = local() && local().getItem(key);
      if (old) storageSet(key, old);
      return old || null;
    } catch (e) { cloudFail('getItem', e); }
  }
  const ls = local();
  return ls ? ls.getItem(key) : null;
}

export function storageSet(key, value) {
  if (useCloudData) {
    try {
      const r = sdk.data.setItem(key, value);
      if (r && typeof r.catch === 'function') r.catch((e) => warn('data.setItem', e));
      return;
    } catch (e) { cloudFail('setItem', e); }
  }
  const ls = local();
  if (ls) ls.setItem(key, value);
}

export function storageRemove(key) {
  if (useCloudData) {
    try { sdk.data.removeItem(key); } catch (e) { cloudFail('removeItem', e); }
  }
  const ls = local();
  if (ls) ls.removeItem(key);
}
