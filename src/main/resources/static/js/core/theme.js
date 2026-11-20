/* =========================================================
   云章 CMS · 主题配色切换器
   模式：跟随页面（每页自动配色）/ 手动选预设色 / 自定义取色
   选择保存在 localStorage，刷新保留；手动模式用内联变量覆盖。
   ========================================================= */

const STORE_KEY = 'cms-theme';

const PRESETS = [
  { name: '秘术紫', hex: '#8b5cf6' },
  { name: '灵体青', hex: '#22d3ee' },
  { name: '创作粉', hex: '#f472b6' },
  { name: '审核金', hex: '#fbbf24' },
  { name: '分类绿', hex: '#34d399' },
  { name: '用户蓝', hex: '#38bdf8' },
  { name: '角色品红', hex: '#e879f9' },
  { name: '日志薄荷', hex: '#2dd4bf' },
];

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function toHex(c) {
  return '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
function mix(hex, target, amt) {
  const c = hexToRgb(hex);
  return toHex({
    r: Math.round(c.r + (target.r - c.r) * amt),
    g: Math.round(c.g + (target.g - c.g) * amt),
    b: Math.round(c.b + (target.b - c.b) * amt),
  });
}
const darken = (hex, amt) => mix(hex, { r: 0, g: 0, b: 0 }, amt);
const lighten = (hex, amt) => mix(hex, { r: 255, g: 255, b: 255 }, amt);

const MANUAL_VARS = [
  '--brand', '--brand-rgb', '--brand-hover', '--brand-soft', '--brand-ink',
  '--sidebar-active', '--glow-brand', '--brand-bg1', '--brand-bg2',
];

function apply(hex) {
  const root = document.documentElement;
  if (!hex) {
    root.removeAttribute('data-theme');
    MANUAL_VARS.forEach((v) => root.style.removeProperty(v));
    return;
  }
  const { r, g, b } = hexToRgb(hex);
  root.setAttribute('data-theme', 'manual');
  root.style.setProperty('--brand', hex);
  root.style.setProperty('--brand-rgb', `${r},${g},${b}`);
  root.style.setProperty('--brand-hover', darken(hex, 0.12));
  root.style.setProperty('--brand-ink', lighten(hex, 0.28));
  root.style.setProperty('--brand-soft', `rgba(${r},${g},${b},.14)`);
  root.style.setProperty('--sidebar-active', `rgba(${r},${g},${b},.18)`);
  root.style.setProperty('--glow-brand', `0 0 18px rgba(${r},${g},${b},.45)`);
  root.style.setProperty('--brand-bg1', `rgba(${r},${g},${b},.22)`);
  root.style.setProperty('--brand-bg2', `rgba(${r},${g},${b},.12)`);
}

function buildPanel() {
  const dock = document.createElement('div');
  dock.className = 'theme-dock';
  dock.innerHTML = `
    <button class="theme-fab" type="button" aria-haspopup="true" aria-expanded="false" title="主题配色">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="10.5" r="7.5"/><circle cx="7.5" cy="10.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="10.5" cy="6.8" r="1.6" fill="currentColor" stroke="none"/><circle cx="14.2" cy="6.6" r="1.6" fill="currentColor" stroke="none"/><circle cx="17" cy="9.8" r="1.6" fill="currentColor" stroke="none"/><path d="M13.5 18c-2.2 0-3.2-1.4-1.8-2.6 1.1-1 .3-2.4-1.4-2.4"/></svg>
    </button>
    <div class="theme-panel" role="dialog" aria-label="主题配色">
      <div class="theme-title">主题配色</div>
      <button class="theme-auto" type="button">跟随页面</button>
      <div class="theme-swatches"></div>
      <label class="theme-custom">
        <span>自定义</span>
        <input type="color" value="#8b5cf6">
      </label>
    </div>`;
  document.body.appendChild(dock);

  const fab = dock.querySelector('.theme-fab');
  const panel = dock.querySelector('.theme-panel');
  const swatches = dock.querySelector('.theme-swatches');
  const autoBtn = dock.querySelector('.theme-auto');
  const colorInput = dock.querySelector('input[type=color]');

  PRESETS.forEach((p) => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'swatch';
    s.title = p.name;
    s.style.background = p.hex;
    s.dataset.hex = p.hex;
    swatches.appendChild(s);
  });

  const saved = localStorage.getItem(STORE_KEY);
  let current = saved === null ? 'auto' : saved;

  function mark() {
    autoBtn.classList.toggle('on', current === 'auto');
    swatches.querySelectorAll('.swatch').forEach((s) => {
      s.classList.toggle('on', s.dataset.hex.toLowerCase() === String(current).toLowerCase());
    });
  }
  function choose(hex) {
    current = hex ? hex : 'auto';
    if (hex) {
      localStorage.setItem(STORE_KEY, hex);
      apply(hex);
    } else {
      localStorage.setItem(STORE_KEY, 'auto');
      apply(null);
    }
    mark();
  }

  fab.addEventListener('click', () => {
    const open = dock.classList.toggle('open');
    fab.setAttribute('aria-expanded', String(open));
  });
  autoBtn.addEventListener('click', () => choose(null));
  swatches.addEventListener('click', (e) => {
    const s = e.target.closest('.swatch');
    if (s) choose(s.dataset.hex);
  });
  colorInput.addEventListener('input', () => choose(colorInput.value));

  document.addEventListener('click', (e) => {
    if (!dock.contains(e.target)) {
      dock.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
    }
  });

  if (current && current !== 'auto') apply(current);
  mark();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildPanel);
} else {
  buildPanel();
}
