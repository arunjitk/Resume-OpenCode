/* Matrix Digital Rain — Canvas renderer (reads --matrix-green from CSS) */
(function () {
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*<>/\\|';
  const CHARS = (KATAKANA + LATIN).split('');

  const isMobile = () => window.innerWidth < 768;
  const FONT_SIZE = 14;
  let cols, drops, frameCount = 0;

  // Read the current --matrix-green from CSS variables
  function getRainColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--matrix-green').trim() || '#00FF41';
  }

  // Parse hex/shorthand color to r,g,b components for rgba() use
  function hexToRgb(hex) {
    const clean = hex.replace(/\s/g, '');
    const m3 = clean.match(/^#([0-9a-f]{3})$/i);
    if (m3) {
      return [
        parseInt(m3[1][0]+m3[1][0], 16),
        parseInt(m3[1][1]+m3[1][1], 16),
        parseInt(m3[1][2]+m3[1][2], 16),
      ];
    }
    const m6 = clean.match(/^#([0-9a-f]{6})$/i);
    if (m6) {
      return [
        parseInt(m6[1].slice(0,2), 16),
        parseInt(m6[1].slice(2,4), 16),
        parseInt(m6[1].slice(4,6), 16),
      ];
    }
    return [0, 255, 65]; // fallback green
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const columnCount = isMobile()
      ? Math.floor(window.innerWidth / FONT_SIZE / 3)
      : Math.floor(window.innerWidth / FONT_SIZE);
    cols = columnCount;
    drops = Array.from({ length: cols }, () => Math.random() * -100);
  }

  function randomChar() {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  function draw() {
    frameCount++;
    if (frameCount % 2 !== 0) {
      requestAnimationFrame(draw);
      return;
    }

    const rainColor = getRainColor();
    const [r, g, b] = hexToRgb(rainColor);

    // Fade trail
    ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${FONT_SIZE}px "Share Tech Mono", monospace`;

    for (let i = 0; i < drops.length; i++) {
      const x = i * FONT_SIZE;
      const y = drops[i] * FONT_SIZE;

      if (y > 0) {
        // Leading character — bright
        ctx.fillStyle = rainColor;
        ctx.shadowColor = rainColor;
        ctx.shadowBlur = 8;
        ctx.fillText(randomChar(), x, y);

        // Body characters — varying opacity
        const opacity = 0.3 + Math.random() * 0.4;
        ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
        ctx.shadowBlur = 0;
        ctx.fillText(randomChar(), x, y - FONT_SIZE);
      }

      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }

      drops[i] += 0.5;
    }

    ctx.shadowBlur = 0;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
})();
