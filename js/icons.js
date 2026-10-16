// Neon icons drawn in code, cached as data URLs for the DOM UI.
const TAU = Math.PI * 2;
const cache = new Map();

const COLORS = {
  orbit: '#38f6ff', whip: '#ff4fd8', missile: '#ffa53a', chain: '#8fd0ff', aura: '#5dff9a',
  boomerang: '#fff04a', zone: '#ff5a3c', laser: '#c77dff',
  might: '#ff4a5a', armor: '#9fb4ff', maxhp: '#ff5c8a', regen: '#5dff9a', speed: '#38f6ff',
  cooldown: '#8fd0ff', area: '#c77dff', magnet: '#ffd23f', amount: '#ffa53a', duration: '#ff9ae0',
  crit: '#fff04a', growth: '#5dffe0', coin: '#ffd23f', heal: '#ff5c8a', gold: '#ffd23f',
  reroll: '#38f6ff', revive: '#fff04a', chest: '#ffd23f', skull: '#ff3fa4', clock: '#38f6ff',
  nia: '#38f6ff', volt: '#8fd0ff', phantom: '#fff04a', lock: '#8a7fb0',
};

export function iconColor(id) { return COLORS[id] || '#ffffff'; }

function heart(c, s) {
  c.beginPath();
  c.moveTo(0, s * 0.32);
  c.bezierCurveTo(-s * 0.55, -s * 0.05, -s * 0.3, -s * 0.45, 0, -s * 0.18);
  c.bezierCurveTo(s * 0.3, -s * 0.45, s * 0.55, -s * 0.05, 0, s * 0.32);
  c.closePath();
}

function star(c, r1, r2, n) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TAU - Math.PI / 2;
    const r = i % 2 ? r2 : r1;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
}

export function drawIcon(c, id, s, evo) {
  const col = COLORS[id] || '#fff';
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = col; c.fillStyle = col;
  c.shadowColor = col; c.shadowBlur = s * 0.12;
  c.lineWidth = s * 0.07;
  const h = s / 2;
  switch (id) {
    case 'orbit': {
      c.beginPath(); c.arc(0, 0, s * 0.1, 0, TAU); c.fill();
      c.globalAlpha = 0.4; c.beginPath(); c.arc(0, 0, s * 0.3, 0, TAU); c.stroke(); c.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const a = (i * TAU) / 3;
        c.save(); c.rotate(a); c.translate(s * 0.3, 0); c.rotate(Math.PI / 2);
        c.beginPath(); c.moveTo(0, -s * 0.14); c.lineTo(s * 0.06, 0); c.lineTo(0, s * 0.14); c.lineTo(-s * 0.06, 0); c.closePath(); c.fill();
        c.restore();
      }
      break;
    }
    case 'whip': {
      c.lineWidth = s * 0.1;
      c.beginPath(); c.arc(-s * 0.1, s * 0.05, s * 0.32, -1.3, 0.9); c.stroke();
      c.lineWidth = s * 0.04; c.strokeStyle = '#fff';
      c.beginPath(); c.arc(-s * 0.1, s * 0.05, s * 0.32, -1.1, 0.6); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(s * 0.18, s * 0.28, s * 0.05, 0, TAU); c.fill();
      break;
    }
    case 'missile': {
      c.rotate(-Math.PI / 4);
      c.beginPath(); c.moveTo(s * 0.34, 0); c.lineTo(s * 0.12, -s * 0.1); c.lineTo(-s * 0.2, -s * 0.1); c.lineTo(-s * 0.3, -s * 0.2);
      c.lineTo(-s * 0.3, s * 0.2); c.lineTo(-s * 0.2, s * 0.1); c.lineTo(s * 0.12, s * 0.1); c.closePath(); c.stroke();
      c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(-s * 0.32, -s * 0.07); c.lineTo(-s * 0.46, 0); c.lineTo(-s * 0.32, s * 0.07); c.fill();
      break;
    }
    case 'chain': {
      c.lineWidth = s * 0.08;
      c.beginPath(); c.moveTo(s * 0.08, -s * 0.4); c.lineTo(-s * 0.16, s * 0.02); c.lineTo(s * 0.06, s * 0.02); c.lineTo(-s * 0.1, s * 0.4); c.stroke();
      c.lineWidth = s * 0.03; c.strokeStyle = '#fff';
      c.beginPath(); c.moveTo(s * 0.08, -s * 0.4); c.lineTo(-s * 0.16, s * 0.02); c.lineTo(s * 0.06, s * 0.02); c.lineTo(-s * 0.1, s * 0.4); c.stroke();
      break;
    }
    case 'aura': {
      for (let i = 1; i <= 3; i++) { c.globalAlpha = 1.1 - i * 0.28; c.beginPath(); c.arc(0, 0, s * 0.12 * i, 0, TAU); c.stroke(); }
      c.globalAlpha = 1; c.beginPath(); c.arc(0, 0, s * 0.06, 0, TAU); c.fill();
      break;
    }
    case 'boomerang': {
      c.lineWidth = s * 0.11;
      c.beginPath(); c.moveTo(-s * 0.3, -s * 0.22); c.quadraticCurveTo(s * 0.05, -s * 0.05, s * 0.3, -s * 0.3);
      c.moveTo(-s * 0.3, -s * 0.22); c.quadraticCurveTo(-s * 0.12, s * 0.05, -s * 0.2, s * 0.34); c.stroke();
      break;
    }
    case 'zone': {
      c.beginPath(); c.moveTo(0, -s * 0.38);
      c.bezierCurveTo(s * 0.3, -s * 0.1, s * 0.3, s * 0.32, 0, s * 0.34);
      c.bezierCurveTo(-s * 0.3, s * 0.32, -s * 0.3, -s * 0.05, -s * 0.06, -s * 0.12);
      c.bezierCurveTo(-s * 0.05, -s * 0.2, 0, -s * 0.3, 0, -s * 0.38); c.stroke();
      c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(0, s * 0.16, s * 0.08, s * 0.12, 0, 0, TAU); c.fill();
      break;
    }
    case 'laser': {
      c.lineWidth = s * 0.1; c.beginPath(); c.moveTo(-s * 0.3, s * 0.3); c.lineTo(s * 0.4, -s * 0.4); c.stroke();
      c.lineWidth = s * 0.035; c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(-s * 0.3, s * 0.3); c.lineTo(s * 0.4, -s * 0.4); c.stroke();
      c.beginPath(); c.moveTo(-s * 0.3, s * 0.14); c.lineTo(-s * 0.14, s * 0.3); c.lineTo(-s * 0.3, s * 0.46); c.lineTo(-s * 0.46, s * 0.3); c.closePath(); c.fillStyle = col; c.fill();
      break;
    }
    case 'might': {
      c.lineWidth = s * 0.08;
      c.beginPath(); c.moveTo(-s * 0.28, s * 0.28); c.lineTo(s * 0.3, -s * 0.3); c.stroke();
      c.beginPath(); c.moveTo(-s * 0.3, s * 0.06); c.lineTo(-s * 0.06, s * 0.3); c.stroke();
      c.beginPath(); c.moveTo(s * 0.3, -s * 0.3); c.lineTo(s * 0.16, -s * 0.32); c.lineTo(s * 0.32, -s * 0.16); c.closePath(); c.fill();
      break;
    }
    case 'armor': {
      c.beginPath(); c.moveTo(0, -s * 0.36); c.lineTo(s * 0.3, -s * 0.24); c.quadraticCurveTo(s * 0.28, s * 0.2, 0, s * 0.38);
      c.quadraticCurveTo(-s * 0.28, s * 0.2, -s * 0.3, -s * 0.24); c.closePath(); c.stroke();
      c.globalAlpha = 0.35; c.fill(); c.globalAlpha = 1;
      break;
    }
    case 'maxhp': case 'heal': {
      heart(c, s * 1.1); c.globalAlpha = 0.35; c.fill(); c.globalAlpha = 1; c.stroke();
      if (id === 'maxhp') { c.strokeStyle = '#fff'; c.lineWidth = s * 0.05; c.beginPath(); c.moveTo(0, -s * 0.06); c.lineTo(0, s * 0.18); c.moveTo(-s * 0.12, s * 0.06); c.lineTo(s * 0.12, s * 0.06); c.stroke(); }
      break;
    }
    case 'regen': {
      c.beginPath(); c.arc(0, 0, s * 0.32, 0, TAU); c.stroke();
      c.lineWidth = s * 0.1; c.beginPath(); c.moveTo(0, -s * 0.18); c.lineTo(0, s * 0.18); c.moveTo(-s * 0.18, 0); c.lineTo(s * 0.18, 0); c.stroke();
      break;
    }
    case 'speed': {
      c.lineWidth = s * 0.09;
      c.beginPath(); c.moveTo(-s * 0.3, -s * 0.26); c.lineTo(-s * 0.04, 0); c.lineTo(-s * 0.3, s * 0.26); c.stroke();
      c.beginPath(); c.moveTo(s * 0.02, -s * 0.26); c.lineTo(s * 0.28, 0); c.lineTo(s * 0.02, s * 0.26); c.stroke();
      break;
    }
    case 'cooldown': case 'clock': {
      c.beginPath(); c.arc(0, 0, s * 0.33, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s * 0.2); c.moveTo(0, 0); c.lineTo(s * 0.15, s * 0.08); c.stroke();
      break;
    }
    case 'area': {
      c.lineWidth = s * 0.07;
      for (let i = 0; i < 4; i++) {
        c.save(); c.rotate((i * TAU) / 4 + Math.PI / 4);
        c.beginPath(); c.moveTo(s * 0.1, 0); c.lineTo(s * 0.36, 0); c.moveTo(s * 0.26, -s * 0.09); c.lineTo(s * 0.36, 0); c.lineTo(s * 0.26, s * 0.09); c.stroke();
        c.restore();
      }
      break;
    }
    case 'magnet': {
      c.lineWidth = s * 0.12;
      c.beginPath(); c.moveTo(-s * 0.22, -s * 0.3); c.lineTo(-s * 0.22, s * 0.02); c.arc(0, s * 0.02, s * 0.22, Math.PI, 0, true); c.lineTo(s * 0.22, -s * 0.3); c.stroke();
      c.strokeStyle = '#fff'; c.shadowColor = '#fff';
      c.beginPath(); c.moveTo(-s * 0.22, -s * 0.34); c.lineTo(-s * 0.22, -s * 0.22); c.moveTo(s * 0.22, -s * 0.34); c.lineTo(s * 0.22, -s * 0.22); c.stroke();
      break;
    }
    case 'amount': {
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.ellipse(i * s * 0.22, 0, s * 0.07, s * 0.2, 0, 0, TAU); c.stroke(); }
      break;
    }
    case 'duration': {
      c.beginPath(); c.moveTo(-s * 0.22, -s * 0.34); c.lineTo(s * 0.22, -s * 0.34); c.lineTo(-s * 0.22, s * 0.34); c.lineTo(s * 0.22, s * 0.34); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(-s * 0.1, s * 0.28); c.lineTo(s * 0.1, s * 0.28); c.lineTo(0, s * 0.14); c.closePath(); c.fill();
      break;
    }
    case 'crit': {
      c.beginPath(); c.arc(0, 0, s * 0.26, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(0, -s * 0.42); c.lineTo(0, -s * 0.12); c.moveTo(0, s * 0.12); c.lineTo(0, s * 0.42);
      c.moveTo(-s * 0.42, 0); c.lineTo(-s * 0.12, 0); c.moveTo(s * 0.12, 0); c.lineTo(s * 0.42, 0); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * 0.05, 0, TAU); c.fill();
      break;
    }
    case 'growth': {
      c.beginPath(); c.moveTo(0, -s * 0.4); c.lineTo(s * 0.24, -s * 0.08); c.lineTo(0, s * 0.4); c.lineTo(-s * 0.24, -s * 0.08); c.closePath(); c.stroke();
      c.globalAlpha = 0.35; c.fill(); c.globalAlpha = 1;
      c.beginPath(); c.moveTo(-s * 0.24, -s * 0.08); c.lineTo(s * 0.24, -s * 0.08); c.stroke();
      break;
    }
    case 'coin': case 'gold': {
      c.beginPath(); c.arc(0, 0, s * 0.33, 0, TAU); c.globalAlpha = 0.3; c.fill(); c.globalAlpha = 1; c.stroke();
      c.beginPath(); c.rect(-s * 0.1, -s * 0.1, s * 0.2, s * 0.2); c.stroke();
      break;
    }
    case 'reroll': {
      c.lineWidth = s * 0.08;
      c.beginPath(); c.arc(0, 0, s * 0.28, -0.3, Math.PI * 0.85); c.stroke();
      c.beginPath(); c.arc(0, 0, s * 0.28, Math.PI - 0.3, Math.PI * 1.85); c.stroke();
      c.beginPath(); c.moveTo(s * 0.28, -s * 0.2); c.lineTo(s * 0.28, s * 0.02); c.lineTo(s * 0.1, -s * 0.06); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-s * 0.28, s * 0.2); c.lineTo(-s * 0.28, -s * 0.02); c.lineTo(-s * 0.1, s * 0.06); c.closePath(); c.fill();
      break;
    }
    case 'revive': {
      c.lineWidth = s * 0.09;
      c.beginPath(); c.ellipse(0, -s * 0.2, s * 0.13, s * 0.16, 0, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(0, -s * 0.04); c.lineTo(0, s * 0.4); c.moveTo(-s * 0.24, s * 0.1); c.lineTo(s * 0.24, s * 0.1); c.stroke();
      break;
    }
    case 'chest': {
      c.beginPath(); c.rect(-s * 0.34, -s * 0.12, s * 0.68, s * 0.42); c.globalAlpha = 0.3; c.fill(); c.globalAlpha = 1; c.stroke();
      c.beginPath(); c.moveTo(-s * 0.34, -s * 0.12); c.quadraticCurveTo(0, -s * 0.46, s * 0.34, -s * 0.12); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.rect(-s * 0.06, -s * 0.04, s * 0.12, s * 0.14); c.fill();
      break;
    }
    case 'skull': {
      c.beginPath(); c.arc(0, -s * 0.06, s * 0.28, Math.PI * 0.85, Math.PI * 2.15); c.lineTo(s * 0.16, s * 0.32); c.lineTo(-s * 0.16, s * 0.32); c.closePath(); c.stroke();
      c.beginPath(); c.arc(-s * 0.1, -s * 0.04, s * 0.07, 0, TAU); c.arc(s * 0.1, -s * 0.04, s * 0.07, 0, TAU); c.fill();
      break;
    }
    case 'lock': {
      c.beginPath(); c.rect(-s * 0.24, -s * 0.04, s * 0.48, s * 0.36); c.stroke();
      c.beginPath(); c.arc(0, -s * 0.06, s * 0.16, Math.PI, 0); c.stroke();
      break;
    }
    case 'nia': case 'volt': case 'phantom': {
      drawHero(c, id, s * 0.9, col);
      break;
    }
    default: {
      c.beginPath(); c.arc(0, 0, s * 0.3, 0, TAU); c.stroke();
    }
  }
  if (evo) {
    c.shadowColor = '#ffd23f'; c.shadowBlur = s * 0.1;
    c.strokeStyle = '#ffd23f'; c.lineWidth = s * 0.05;
    c.beginPath(); c.arc(0, 0, h * 0.92, 0, TAU); c.stroke();
    c.fillStyle = '#ffd23f';
    c.save(); c.translate(h * 0.62, -h * 0.62); star(c, s * 0.13, s * 0.06, 5); c.fill(); c.restore();
  }
  c.restore();
}

export function drawHero(c, id, s, col) {
  c.save();
  c.strokeStyle = col; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = s * 0.15;
  c.lineWidth = s * 0.06;
  c.beginPath(); c.arc(0, 0, s * 0.42, 0, TAU); c.globalAlpha = 0.25; c.stroke(); c.globalAlpha = 1;
  if (id === 'nia') {
    c.beginPath(); c.moveTo(0, -s * 0.32); c.lineTo(s * 0.22, 0); c.lineTo(0, s * 0.32); c.lineTo(-s * 0.22, 0); c.closePath();
  } else if (id === 'volt') {
    c.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.lineTo(Math.cos(a) * s * 0.28, Math.sin(a) * s * 0.28); }
    c.closePath();
  } else {
    c.beginPath(); c.moveTo(s * 0.32, 0); c.lineTo(-s * 0.2, s * 0.24); c.lineTo(-s * 0.08, 0); c.lineTo(-s * 0.2, -s * 0.24); c.closePath();
  }
  c.globalAlpha = 0.35; c.fill(); c.globalAlpha = 1; c.stroke();
  c.fillStyle = '#fff'; c.shadowColor = '#fff';
  c.beginPath(); c.arc(0, 0, s * 0.08, 0, TAU); c.fill();
  c.restore();
}

export function iconURL(id, evo = false, px = 96) {
  const key = id + (evo ? '*' : '') + px;
  let u = cache.get(key);
  if (u) return u;
  try {
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    const c = cv.getContext('2d');
    c.translate(px / 2, px / 2);
    drawIcon(c, id, px * 0.92, evo);
    u = cv.toDataURL('image/png');
  } catch (e) {
    u = '';
  }
  cache.set(key, u);
  return u;
}
