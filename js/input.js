// Keyboard + floating virtual joystick (touch or mouse drag anywhere on the play field).
export const joy = { active: false, id: -1, ox: 0, oy: 0, kx: 0, ky: 0, R: 64 };
const keys = new Set();
const out = { x: 0, y: 0 };
let handlers = null;

export function initInput(canvas, h) {
  handlers = h;
  window.addEventListener('keydown', (e) => {
    const c = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) e.preventDefault();
    if (!e.repeat) handlers.onKey && handlers.onKey(c, e);
    keys.add(c);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); release(); });

  canvas.addEventListener('pointerdown', (e) => {
    if (!handlers.canJoy()) return;
    if (joy.active) return;
    e.preventDefault();
    joy.active = true; joy.id = e.pointerId;
    joy.ox = joy.kx = e.clientX; joy.oy = joy.ky = e.clientY;
    joy.R = Math.max(48, Math.min(76, Math.min(window.innerWidth, window.innerHeight) * 0.09));
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!joy.active || e.pointerId !== joy.id) return;
    e.preventDefault();
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > joy.R) {
      // floating stick: the base follows the finger so direction changes stay instant
      const over = d - joy.R;
      joy.ox += (dx / d) * over; joy.oy += (dy / d) * over;
      dx = e.clientX - joy.ox; dy = e.clientY - joy.oy;
    }
    joy.kx = e.clientX; joy.ky = e.clientY;
  });
  const end = (e) => { if (e.pointerId === joy.id) release(); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function release() { joy.active = false; joy.id = -1; }

export function readMove() {
  let x = 0, y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  if (joy.active) {
    const dx = joy.kx - joy.ox, dy = joy.ky - joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > joy.R * 0.12) {
      const m = Math.min(1, d / (joy.R * 0.6));
      x += (dx / d) * m; y += (dy / d) * m;
    }
  }
  const l = Math.hypot(x, y);
  if (l > 1) { x /= l; y /= l; }
  out.x = x; out.y = y;
  return out;
}
