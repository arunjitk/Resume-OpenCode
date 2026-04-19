/* ================================================================
   RADAR-CHART.JS — Skill Proficiency Radar Chart
   Lazy-loads Chart.js 4.x from CDN, renders when skills section
   enters the viewport. Reads --matrix-green CSS variable so it
   responds to the BIOS access-level palette changes.
   ================================================================ */

(function () {
  'use strict';

  // ─── DOMAIN DATA ──────────────────────────────────────────────
  const DOMAINS = [
    { label: 'THREAT HUNTING',    value: 95, color: '#00FF41' },
    { label: 'INCIDENT RESPONSE', value: 92, color: '#00FF41' },
    { label: 'SIEM / XDR',        value: 90, color: '#00F0FF' },
    { label: 'EDR / ENDPOINT',    value: 88, color: '#FF1744' },
    { label: 'CLOUD SECURITY',    value: 85, color: '#00F0FF' },
    { label: 'DIGITAL FORENSICS', value: 82, color: '#00FF41' },
    { label: 'NETWORK SECURITY',  value: 80, color: '#00F0FF' },
    { label: 'SOAR / AUTOMATION', value: 72, color: '#FF00FF' },
  ];

  let chartInstance = null;
  let initialized   = false;

  // ─── HELPERS ──────────────────────────────────────────────────
  function getRainColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--matrix-green').trim() || '#00FF41';
  }

  function getRainColorRgb() {
    const hex = getRainColor().replace(/\s/g, '');
    const m   = hex.match(/^#([0-9a-f]{6})$/i);
    if (!m) return [0, 255, 65];
    return [
      parseInt(m[1].slice(0, 2), 16),
      parseInt(m[1].slice(2, 4), 16),
      parseInt(m[1].slice(4, 6), 16),
    ];
  }

  function rgba(r, g, b, a) { return `rgba(${r},${g},${b},${a})`; }

  // ─── BUILD CHART ──────────────────────────────────────────────
  function buildChart() {
    const canvas = document.getElementById('skill-radar-canvas');
    if (!canvas || !window.Chart) return;
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    const [r, g, b] = getRainColorRgb();
    const primary   = getRainColor();

    chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels: DOMAINS.map(d => d.label),
        datasets: [{
          label: 'Proficiency',
          data: DOMAINS.map(d => d.value),
          fill: true,
          backgroundColor:      rgba(r, g, b, 0.10),
          borderColor:          primary,
          borderWidth:          2,
          pointBackgroundColor: DOMAINS.map(d => d.color),
          pointBorderColor:     DOMAINS.map(d => d.color),
          pointBorderWidth:     1,
          pointRadius:          5,
          pointHoverRadius:     7,
          pointHoverBackgroundColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1400,
          easing: 'easeInOutQuart',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,8,0,0.96)',
            borderColor:     primary,
            borderWidth:     1,
            titleColor:      primary,
            bodyColor:       '#C8E6C9',
            displayColors:   false,
            titleFont:       { family: 'Orbitron', size: 11 },
            bodyFont:        { family: 'Share Tech Mono', size: 12 },
            callbacks: {
              title: ([item]) => item.label,
              label: (item)   => `  ${item.raw}%  PROFICIENCY`,
            },
          },
        },
        scales: {
          r: {
            min: 55,
            max: 100,
            ticks: {
              stepSize: 15,
              display:  false,
              backdropColor: 'transparent',
            },
            grid: {
              color:     rgba(r, g, b, 0.12),
              lineWidth: 1,
            },
            angleLines: {
              color:     rgba(r, g, b, 0.18),
              lineWidth: 1,
            },
            pointLabels: {
              color: '#C8E6C9',
              font: {
                family: 'Share Tech Mono',
                size:   10,
              },
            },
          },
        },
      },
    });

    initialized = true;
  }

  // ─── LOAD CHART.JS THEN BUILD ─────────────────────────────────
  function loadAndBuild() {
    if (initialized) return;
    if (window.Chart) {
      buildChart();
      return;
    }
    const s   = document.createElement('script');
    s.src     = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload  = buildChart;
    s.onerror = () => console.warn('[radar-chart] Chart.js CDN failed to load');
    document.head.appendChild(s);
  }

  // ─── PALETTE-CHANGE RE-RENDER ──────────────────────────────────
  // Observe data-access-level attribute changes on <html>
  const mutObs = new MutationObserver(() => {
    if (!chartInstance) return;
    const [r, g, b] = getRainColorRgb();
    const primary   = getRainColor();
    const ds        = chartInstance.data.datasets[0];
    ds.backgroundColor = rgba(r, g, b, 0.10);
    ds.borderColor     = primary;
    chartInstance.options.scales.r.grid.color       = rgba(r, g, b, 0.12);
    chartInstance.options.scales.r.angleLines.color = rgba(r, g, b, 0.18);
    chartInstance.update('none');
  });
  mutObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-access-level'] });

  // ─── LAZY-LOAD VIA IntersectionObserver ───────────────────────
  function setup() {
    const container = document.getElementById('skill-radar-container');
    if (!container) return;

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadAndBuild();
          obs.disconnect();
        }
      }, { threshold: 0.15 });
      obs.observe(container);
    } else {
      loadAndBuild();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

})();
