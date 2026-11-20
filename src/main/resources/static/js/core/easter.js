/* =========================================================
   云章 CMS · 秘术彩蛋模块（可插拔，纯前端，不影响后端）
   ① 操作时灵体秘术吐槽（包装 fetch）
   ② 点击处法阵涟漪
   ③ Konami 指令触发矩阵雨 + 灵体暴走
   ========================================================= */

(function () {
  'use strict';

  /* ---------------- 控制台彩蛋 ---------------- */
  console.log('%c云章 CMS · 秘术彩蛋已加载\n试试指令 ↑ ↑ ↓ ↓ ← → ← → B A',
    'color:#8b5cf6;font-weight:bold;line-height:1.6');

  /* ---------------- 秘术台词 ---------------- */

  const SAY = [
    [/^POST .*\/api\/articles\/[^/]+\/submit$/, '灵稿已送入审判法阵'],
    [/^POST .*\/api\/articles\/[^/]+\/approve$/, '灵魂纯净，准予解封'],
    [/^POST .*\/api\/articles\/[^/]+\/reject$/, '此稿灵魂不洁，退回重修'],
    [/^POST .*\/api\/articles\/[^/]+\/withdraw$/, '已将灵稿召回'],
    [/^POST .*\/api\/articles\/[^/]+\/resubmit$/, '再度送入审判法阵'],
    [/^POST .*\/api\/articles\/[^/]+\/offline$/, '封印重新加身'],
    [/^POST .*\/api\/articles\/batch\/approve$/, '批量解封，法阵齐鸣'],
    [/^POST .*\/api\/articles\/batch\/offline$/, '批量封印，灵体归位'],
    [/^DELETE .*\/api\/articles\/[^/]+$/, '又一道灵体归于虚无'],
    [/^POST .*\/api\/articles$/, '灵稿已凝结，静待灌注'],
    [/^PUT .*\/api\/articles\/[^/]+$/, '咒文已改写'],
    [/^POST .*\/api\/auth\/login$/, '欢迎回来，术士'],
    [/^POST .*\/api\/auth\/logout$/, '法阵关闭，后会有期'],
    [/^POST .*\/api\/categories/, '新法阵目录已开辟'],
    [/^POST .*\/api\/users/, '一位新术士已入册'],
    [/^POST .*\/api\/roles/, '新宗门已立'],
  ];

  function lineFor(method, url) {
    const key = method + ' ' + url.split('?')[0];
    for (const [re, text] of SAY) if (re.test(key)) return text;
    return '';
  }

  let sayBox = null;
  function speak(text) {
    if (!text) return;
    if (!sayBox) {
      sayBox = document.createElement('div');
      sayBox.className = 'mystic-say-box';
      document.body.appendChild(sayBox);
    }
    const el = document.createElement('div');
    el.className = 'mystic-say';
    el.innerHTML = '<span class="ms-ic">✦</span><span class="ms-tx"></span>';
    el.querySelector('.ms-tx').textContent = text;
    sayBox.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 450);
    }, 3200);
  }

  /* ---------------- 包装 fetch 做操作反馈 ---------------- */

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const input = args[0];
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = ((args[1] && args[1].method) || 'GET').toUpperCase();
    const watch = method === 'POST' || method === 'PUT' || method === 'DELETE';

    try {
      const res = await origFetch.apply(this, args);
      if (watch) {
        res.clone().json().then((p) => {
          if (p.code === 0) speak(lineFor(method, url));
          else if (p.code === 40300 || p.code === 403) speak('越权！审判法阵拒绝了你');
          else speak('咒文反噬：' + (p.message || '施法失败'));
        }).catch(() => {});
      }
      return res;
    } catch (e) {
      if (watch) speak('咒文反噬，连不上法阵');
      throw e;
    }
  };

  /* ---------------- 点击法阵涟漪 ---------------- */

  document.addEventListener('pointerdown', (e) => {
    const ring = document.createElement('div');
    ring.className = 'mystic-ripple';
    ring.style.left = e.clientX + 'px';
    ring.style.top = e.clientY + 'px';
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 900);
  }, true);

  /* ---------------- Konami 黑客彩蛋 ---------------- */

  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let buf = [];

  document.addEventListener('keydown', (e) => {
    buf.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    buf = buf.slice(-KONAMI.length);
    if (KONAMI.every((k, i) => k === buf[i])) matrixRain();
  });

  function matrixRain() {
    if (document.querySelector('.mystic-matrix')) return;
    document.body.classList.add('spirit-rampage');

    const canvas = document.createElement('canvas');
    canvas.className = 'mystic-matrix';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand') || '#8b5cf6';
    const glyphs = '01アイウエオカキクケコサシスセソ✦✧◇△';
    const fs = 16;
    let cols = Math.floor(canvas.width / fs);
    let drops = Array(cols).fill(1).map(() => Math.random() * -50);

    let frames = 0;
    const timer = setInterval(() => {
      frames++;
      ctx.fillStyle = 'rgba(11,8,32,.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = brand.trim();
      ctx.font = fs + 'px monospace';
      cols = Math.floor(canvas.width / fs);
      while (drops.length < cols) drops.push(0);
      for (let i = 0; i < cols; i++) {
        const ch = glyphs.charAt(Math.floor(Math.random() * glyphs.length));
        ctx.fillText(ch, i * fs, drops[i] * fs);
        if (drops[i] * fs > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      if (frames > 200) {
        clearInterval(timer);
        canvas.remove();
        document.body.classList.remove('spirit-rampage');
      }
    }, 50);

    speak('禁咒·矩阵天罚！');
  }
})();
