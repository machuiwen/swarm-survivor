import { STR, DATA_STR } from './strings.js';
import { WEAPONS, PASSIVES, ENEMIES, CHARS, SHOP, ACHIEVEMENTS } from './data.js';

export const LANGS = ['en', 'zh'];
let lang = 'en';

export function getLang() { return lang; }

export function t(key, vars) {
  let s = STR[lang][key];
  if (s === undefined) s = STR.en[key];
  if (s === undefined) return key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}

// saved choice, then the platform's locale, then the browser's; English otherwise
export function detectLang(saved, platformLocale) {
  if (LANGS.includes(saved)) return saved;
  const loc = String(platformLocale || (typeof navigator !== 'undefined' && navigator.language) || '').toLowerCase();
  return loc.startsWith('zh') ? 'zh' : 'en';
}

function localizeData() {
  const d = DATA_STR[lang];
  for (const w of WEAPONS) {
    const s = d.weapons[w.id];
    w.name = s.name; w.desc = s.desc; w.lv = s.lv;
    w.evo.name = s.evo.name; w.evo.desc = s.evo.desc;
  }
  for (const p of PASSIVES) Object.assign(p, d.passives[p.id]);
  for (const id in ENEMIES) ENEMIES[id].name = d.enemies[id];
  for (const c of CHARS) Object.assign(c, d.chars[c.id]);
  for (const s of SHOP) Object.assign(s, d.shop[s.id]);
  for (const a of ACHIEVEMENTS) Object.assign(a, d.ach[a.id]);
}

// static markup: data-i18n sets textContent, data-i18n-aria sets aria-label
function applyStatic() {
  const root = document.documentElement;
  root.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = t('doc.title');
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', t('doc.desc'));
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
}

export function setLang(l) {
  lang = LANGS.includes(l) ? l : 'en';
  localizeData();
  if (typeof document !== 'undefined') applyStatic();
}
