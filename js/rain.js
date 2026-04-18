/* Matrix Digital Rain — Canvas renderer */
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

    // Fade trail
    ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${FONT_SIZE}px "Share Tech Mono", monospace`;

    for (let i = 0; i < drops.length; i++) {
      const x = i * FONT_SIZE;
      const y = drops[i] * FONT_SIZE;

      if (y > 0) {
        // Leading character — bright
        ctx.fillStyle = '#AAFFBB';
        ctx.shadowColor = '#00FF41';
        ctx.shadowBlur = 8;
        ctx.fillText(randomChar(), x, y);

        // Body characters — varying green opacity
        const opacity = 0.3 + Math.random() * 0.4;
        ctx.fillStyle = `rgba(0, 255, 65, ${opacity})`;
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
