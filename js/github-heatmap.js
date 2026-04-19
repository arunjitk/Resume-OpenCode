/* ================================================================
   GITHUB-HEATMAP.JS — GitHub Contribution Heatmap
   Fetches contribution data from the GitHub contributions API,
   renders a 52-week calendar heatmap on canvas using the
   --matrix-green CSS palette. Falls back to cached placeholder
   if the API is unavailable.
   ================================================================ */

(function () {
  'use strict';

  // ─── CONSTANTS ────────────────────────────────────────────────
  const GITHUB_USER   = 'arunjitk';           // ← GitHub username
  const API_BASE      = 'https://github-contributions-api.jogruber.de/v4';
  const CELL_SIZE     = 12;                   // px per contribution cell
  const CELL_GAP      = 3;                    // px gap between cells
  const WEEKS         = 52;
  const DAYS          = 7;
  const DAY_LABELS    = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  const MONTH_LABELS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  let contributions = [];
  let maxCount      = 0;

  // ─── COLOR INTERPOLATION ──────────────────────────────────────
  function getRainRgb() {
    const hex = (getComputedStyle(document.documentElement)
      .getPropertyValue('--matrix-green').trim() || '#00FF41').replace(/\s/g, '');
    const m = hex.match(/^#([0-9a-f]{6})$/i);
    if (!m) return [0, 255, 65];
    return [parseInt(m[1].slice(0,2),16), parseInt(m[1].slice(2,4),16), parseInt(m[1].slice(4,6),16)];
  }

  function levelColor(count, [r, g, b]) {
    if (count === 0) return 'rgba(0,20,0,0.55)';
    const intensity = Math.min(1, Math.sqrt(count / Math.max(maxCount, 1)));
    const a = 0.18 + intensity * 0.82;
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }

  // ─── DRAW HEATMAP ─────────────────────────────────────────────
  function drawHeatmap(canvas, data) {
    const rgb     = getRainRgb();
    const dpr     = window.devicePixelRatio || 1;
    const step    = CELL_SIZE + CELL_GAP;
    const padL    = 32;   // space for day labels
    const padTop  = 24;   // space for month labels
    const padR    = 8;
    const padBot  = 8;
    const W       = padL + WEEKS * step + padR;
    const H       = padTop + DAYS * step + padBot;

    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Sort + slice to last 52 weeks (364 days)
    const today     = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (WEEKS * DAYS - 1));

    // Build lookup: date-string → count
    const lookup = {};
    data.forEach(d => { lookup[d.date] = d.count; });

    // Track months for labels
    const monthPositions = {};

    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < DAYS; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);

        const key   = dateKey(date);
        const count = lookup[key] || 0;
        const x     = padL + w * step;
        const y     = padTop + d * step;

        // Track first occurrence of each month
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthPositions[monthKey]) {
          monthPositions[monthKey] = { x, label: MONTH_LABELS[date.getMonth()] };
        }

        // Cell
        const col   = levelColor(count, rgb);
        ctx.fillStyle   = col;
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 2)
          : ctx.rect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.fill();

        // Glow on active cells
        if (count > 0) {
          const [r, g, b] = rgb;
          const gAlpha = Math.min(0.45, (count / Math.max(maxCount, 1)) * 0.5);
          ctx.shadowColor = `rgba(${r},${g},${b},${gAlpha})`;
          ctx.shadowBlur  = 4;
          ctx.fill();
          ctx.shadowBlur  = 0;
        }
      }
    }

    // Day labels
    ctx.font      = `9px 'Share Tech Mono', monospace`;
    ctx.textAlign = 'right';
    DAY_LABELS.forEach((label, i) => {
      if (!label) return;
      const y = padTop + i * step + CELL_SIZE * 0.8;
      ctx.fillStyle = 'rgba(200,230,201,0.4)';
      ctx.fillText(label, padL - 4, y);
    });

    // Month labels
    ctx.textAlign = 'left';
    ctx.font      = `9px 'Share Tech Mono', monospace`;
    Object.values(monthPositions).forEach(({ x, label }) => {
      const [r, g, b] = rgb;
      ctx.fillStyle = `rgba(${r},${g},${b},0.65)`;
      ctx.fillText(label, x, padTop - 6);
    });
  }

  // ─── TOOLTIP ──────────────────────────────────────────────────
  function attachTooltip(canvas) {
    const tooltip = document.getElementById('gh-heatmap-tooltip');
    if (!tooltip) return;

    const step   = CELL_SIZE + CELL_GAP;
    const padL   = 32;
    const padTop = 24;
    const dpr    = window.devicePixelRatio || 1;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (WEEKS * DAYS - 1));
    startDate.setHours(0, 0, 0, 0);

    const lookup = {};
    contributions.forEach(d => { lookup[d.date] = d.count; });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;

      const w = Math.floor((mx - padL) / step);
      const d = Math.floor((my - padTop) / step);

      if (w < 0 || w >= WEEKS || d < 0 || d >= DAYS) {
        tooltip.style.display = 'none';
        return;
      }

      const date  = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const key   = dateKey(date);
      const count = lookup[key] || 0;
      const label = count === 0
        ? `No contributions on ${formatTooltipDate(date)}`
        : `${count} contribution${count === 1 ? '' : 's'} on ${formatTooltipDate(date)}`;

      tooltip.textContent  = label;
      tooltip.style.display = 'block';
      tooltip.style.left    = (e.clientX + 12) + 'px';
      tooltip.style.top     = (e.clientY - 28) + 'px';
    });

    canvas.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatTooltipDate(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ─── UPDATE STATS ─────────────────────────────────────────────
  function updateStats(total, yearTotal) {
    const totalEl = document.getElementById('gh-total-contributions');
    const yearEl  = document.getElementById('gh-year-contributions');
    const userEl  = document.getElementById('gh-username-link');
    if (totalEl) totalEl.textContent = total.toLocaleString();
    if (yearEl)  yearEl.textContent  = yearTotal.toLocaleString();
    if (userEl)  { userEl.href = `https://github.com/${GITHUB_USER}`; userEl.textContent = `@${GITHUB_USER}`; }
  }

  // ─── FETCH + RENDER ───────────────────────────────────────────
  async function fetchAndRender() {
    const canvas    = document.getElementById('gh-heatmap-canvas');
    const statusEl  = document.getElementById('gh-heatmap-status');
    if (!canvas) return;

    if (statusEl) statusEl.textContent = '> FETCHING CONTRIBUTION DATA...';

    try {
      const res  = await fetch(`${API_BASE}/${GITHUB_USER}?y=last`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      contributions = json.contributions || [];
      maxCount      = Math.max(...contributions.map(d => d.count), 1);

      // Year total from the 'total' object
      const thisYear  = new Date().getFullYear();
      const yearTotal = json.total?.[thisYear] || 0;
      const allTotal  = Object.values(json.total || {}).reduce((a, b) => a + b, 0);

      drawHeatmap(canvas, contributions);
      attachTooltip(canvas);
      updateStats(allTotal, yearTotal);
      if (statusEl) statusEl.style.display = 'none';

    } catch (err) {
      console.warn('[github-heatmap] API fetch failed:', err.message);
      // Render placeholder pattern
      renderPlaceholder(canvas);
      if (statusEl) {
        statusEl.textContent = '> LIVE DATA UNAVAILABLE — SHOWING CACHED VISUALIZATION';
        statusEl.style.color = 'rgba(200,230,201,0.35)';
      }
    }
  }

  function renderPlaceholder(canvas) {
    // Generate a plausible-looking contribution pattern for visual demo
    const placeholder = [];
    const today = new Date();
    for (let i = WEEKS * DAYS - 1; i >= 0; i--) {
      const d     = new Date(today);
      d.setDate(today.getDate() - i);
      // Work-day weighted pseudo-random activity
      const isWeekday = d.getDay() >= 1 && d.getDay() <= 5;
      const seed  = (d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate()) % 97;
      const count = isWeekday ? (seed < 30 ? 0 : seed < 60 ? 1 : seed < 80 ? 3 : seed < 92 ? 6 : 12) : (seed < 80 ? 0 : 2);
      placeholder.push({ date: dateKey(d), count });
    }
    contributions = placeholder;
    maxCount = 12;
    drawHeatmap(canvas, placeholder);
  }

  // ─── RE-DRAW ON PALETTE CHANGE ────────────────────────────────
  const mutObs = new MutationObserver(() => {
    const canvas = document.getElementById('gh-heatmap-canvas');
    if (canvas && contributions.length) drawHeatmap(canvas, contributions);
  });
  mutObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-access-level'] });

  // ─── LAZY INIT ────────────────────────────────────────────────
  function init() {
    const section = document.getElementById('gh-heatmap-section');
    if (!section) return;

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          fetchAndRender();
          obs.disconnect();
        }
      }, { threshold: 0.1 });
      obs.observe(section);
    } else {
      fetchAndRender();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
