/* ================================================================
   SIM-CORE.JS — Universal Simulation Engine
   Handles: Canvas rendering, panel display, controls, autoplay,
            scrubber, keyboard nav, rain background
   Depends on: window.SIM_SCENARIO being set before DOMContentLoaded
   ================================================================ */

(function (global) {
  'use strict';

  // ─── STATE ────────────────────────────────────────────────────────────────
  const S = {
    current:      0,
    autoplay:     false,
    autoTimer:    null,
    autoInterval: 7000,
    startMs:      Date.now(),
  };

  // ─── CANVAS ANIMATION STATE ───────────────────────────────────────────────
  let canvas, ctx;
  let nodes         = [];
  let nodeGlow      = [];   // per-node 0-1 brightness
  let connFlow      = [];   // per-connector signal-dot position 0-1
  let beaconR       = 0;    // C2 beacon ring radius
  let animT         = 0;    // global animation time (seconds)
  let rafId;

  // ─── DOM REFS ─────────────────────────────────────────────────────────────
  let intelEl, scrubEl, prevBtn, nextBtn, autoBtn, reinitBtn,
      timerEl, stageCountEl, severityEl;

  // ─── BOOT ─────────────────────────────────────────────────────────────────
  function init() {
    if (!global.SIM_SCENARIO) {
      console.error('[sim-core] SIM_SCENARIO not defined');
      return;
    }

    canvas       = document.getElementById('attack-canvas');
    ctx          = canvas && canvas.getContext('2d');
    intelEl      = document.getElementById('intel-inner');
    scrubEl      = document.getElementById('scrubber-stages');
    prevBtn      = document.getElementById('ctrl-prev');
    nextBtn      = document.getElementById('ctrl-next');
    autoBtn      = document.getElementById('ctrl-autoplay');
    reinitBtn    = document.getElementById('ctrl-reinit');
    timerEl      = document.getElementById('incident-timer');
    stageCountEl = document.getElementById('stage-counter');
    severityEl   = document.getElementById('severity-label');

    if (!canvas || !ctx) return;

    // Populate status bar meta from scenario
    setEl('case-id',        SIM_SCENARIO.id);
    setEl('malware-family', SIM_SCENARIO.malwareFamily);
    setEl('threat-actor',   SIM_SCENARIO.threatActor);
    setEl('host-id',        SIM_SCENARIO.host);

    buildScrubber();
    bindControls();
    resizeCanvas();
    window.addEventListener('resize', () => { resizeCanvas(); computeNodes(); });

    computeNodes();
    initAnimState();
    renderIntel();
    updateStatusBar();
    startAnimLoop();
    startRain();
    tickTimer();
    initCursor();
  }

  // ─── CUSTOM CURSOR ────────────────────────────────────────────────────────
  function initCursor() {
    const cursor = document.getElementById('cursor');
    const ring   = document.getElementById('cursor-ring');
    if (!cursor || !ring || window.innerWidth <= 767) return;
    let cx = 0, cy = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', e => { cx = e.clientX; cy = e.clientY; });
    document.addEventListener('mouseenter', e => {
      if (e.target.matches('a,button,[role=button],.ctrl-btn,.scrub-btn')) {
        cursor.style.width  = '20px';
        cursor.style.height = '20px';
        ring.style.width    = '50px';
        ring.style.height   = '50px';
        ring.style.borderColor = 'rgba(0,240,255,0.6)';
      }
    }, true);
    document.addEventListener('mouseleave', e => {
      if (e.target.matches('a,button,[role=button],.ctrl-btn,.scrub-btn')) {
        cursor.style.width  = '12px';
        cursor.style.height = '12px';
        ring.style.width    = '36px';
        ring.style.height   = '36px';
        ring.style.borderColor = 'rgba(0,255,65,0.5)';
      }
    }, true);
    (function moveCursor() {
      rx += (cx - rx) * 0.25;
      ry += (cy - ry) * 0.25;
      cursor.style.transform = `translate(calc(${cx}px - 50%), calc(${cy}px - 50%))`;
      ring.style.transform   = `translate(calc(${rx}px - 50%), calc(${ry}px - 50%))`;
      requestAnimationFrame(moveCursor);
    })();
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el && val) el.textContent = val;
  }

  function hexRgba(hex, a) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function esc(s) {
    return String(s||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── CANVAS SIZING ────────────────────────────────────────────────────────
  function resizeCanvas() {
    const wrap = document.getElementById('canvas-container');
    if (!wrap) return;
    canvas.width  = wrap.offsetWidth;
    canvas.height = wrap.offsetHeight;
  }

  // ─── NODE POSITION COMPUTATION ────────────────────────────────────────────
  function computeNodes() {
    const stages = SIM_SCENARIO.stages;
    const n = stages.length;
    const W = canvas.width, H = canvas.height;
    const mX = Math.min(60, W * 0.06);

    const useRows      = n > 5;
    const useThreeRows = n > 10;   // 11+ stages → 3-row snake

    if (!useRows) {
      // ── Single row ──────────────────────────────────────────
      const sp = (W - 2 * mX) / Math.max(n - 1, 1);
      const y  = H / 2;
      nodes = stages.map((s, i) => ({
        x: mX + i * sp, y,
        r: Math.min(26, sp * 0.28),
        stage: s, idx: i,
      }));

    } else if (useThreeRows) {
      // ── Three-row snake layout (4-4-4 for 12 stages) ────────
      const r1n = Math.ceil(n / 3);
      const r2n = Math.ceil((n - r1n) / 2);
      const r3n = n - r1n - r2n;

      const sp1 = (W - 2 * mX) / Math.max(r1n - 1, 1);
      const sp2 = (W - 2 * mX) / Math.max(r2n - 1, 1);
      const sp3 = (W - 2 * mX) / Math.max(r3n - 1, 1);

      const y1 = H * 0.17;
      const y2 = H * 0.50;
      const y3 = H * 0.83;

      const rSz = Math.min(20, Math.min(sp1, sp2, sp3) * 0.28);

      nodes = stages.map((s, i) => {
        if (i < r1n) {
          // Row 1: left → right
          return { x: mX + i * sp1, y: y1, r: rSz, stage: s, idx: i };
        } else if (i < r1n + r2n) {
          // Row 2: right → left (snake reversal)
          const j = i - r1n;
          return { x: mX + (r2n - 1 - j) * sp2, y: y2, r: rSz, stage: s, idx: i };
        } else {
          // Row 3: left → right
          const j = i - r1n - r2n;
          return { x: mX + j * sp3, y: y3, r: rSz, stage: s, idx: i };
        }
      });

    } else {
      // ── Two-row snake layout ─────────────────────────────────
      const half = Math.ceil(n / 2);
      const row1n = half, row2n = n - half;
      const sp1 = (W - 2 * mX) / Math.max(row1n - 1, 1);
      const sp2 = (W - 2 * mX) / Math.max(row2n - 1, 1);
      const y1 = H * 0.30, y2 = H * 0.72;
      const rSz = Math.min(22, Math.min(sp1, sp2) * 0.28);

      nodes = stages.map((s, i) => {
        if (i < row1n) {
          return { x: mX + i * sp1, y: y1, r: rSz, stage: s, idx: i };
        }
        const j = i - row1n;
        return { x: mX + j * sp2, y: y2, r: rSz, stage: s, idx: i };
      });
    }

    // Lateral-movement branch hosts (only for 2-row layouts where space allows)
    if (!useThreeRows) {
      const latNode = nodes.find(nd => nd.stage.code === 'LAT');
      if (latNode) {
        const branchDir = latNode.y > H * 0.5 ? -1 : 1; // flip up if in lower row
        latNode.branches = [
          { x: latNode.x - Math.max(35, latNode.r * 1.8), y: latNode.y + branchDir * (latNode.r + 38), label: 'fs-fin-01' },
          { x: latNode.x + Math.max(35, latNode.r * 1.8), y: latNode.y + branchDir * (latNode.r + 38), label: 'srv-dc-02' },
        ];
      }
    }

    // Re-init animation arrays to match new node count
    nodeGlow = nodes.map((nd, i) => lerp(0.12, 1, i <= S.current ? 1 : 0));
    connFlow = nodes.map(() => Math.random());
  }

  function initAnimState() {
    nodeGlow = nodes.map((nd, i) => i <= S.current ? 1 : 0.12);
    connFlow = nodes.map(() => 0);
    beaconR  = 0;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  // ─── ANIMATION LOOP ───────────────────────────────────────────────────────
  function startAnimLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    let last = performance.now();

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      animT += dt;
      updateAnim(dt);
      drawFrame();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  function updateAnim(dt) {
    const cur  = S.current;
    const n    = SIM_SCENARIO.stages.length;
    const c2i  = SIM_SCENARIO.stages.findIndex(s => s.code === 'C2');

    // Smooth node glow
    nodes.forEach((nd, i) => {
      const target = i <= cur ? 1 : 0.12;
      nodeGlow[i] += (target - nodeGlow[i]) * dt * 4;
    });

    // Connector signal flow
    for (let i = 0; i < cur; i++) {
      const speed = (i === cur - 1) ? 0.75 : 0.35;
      connFlow[i] = (connFlow[i] + dt * speed) % 1;
    }

    // C2 beacon
    if (cur >= c2i && c2i >= 0) {
      beaconR = (beaconR + dt * 55) % 100;
    }
  }

  // ─── DRAW FRAME ───────────────────────────────────────────────────────────
  function drawFrame() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Very subtle background panel tint
    ctx.fillStyle = 'rgba(0,4,0,0.25)';
    ctx.fillRect(0, 0, W, H);

    drawConnectors();
    drawDetectionMarkers();
    drawBranches();
    drawNodes();
    drawBeacons();
  }

  // ── Connectors ─────────────────────────────────────────────────────────────
  function drawConnectors() {
    const stages = SIM_SCENARIO.stages;
    const n      = stages.length;
    const cur    = S.current;

    // Pre-compute which connector indices are row-wrap transitions
    const wrapSet = new Set();
    if (n > 5 && n <= 10) {
      wrapSet.add(Math.ceil(n / 2));
    } else if (n > 10) {
      const r1n = Math.ceil(n / 3);
      const r2n = Math.ceil((n - r1n) / 2);
      wrapSet.add(r1n);
      wrapSet.add(r1n + r2n);
    }

    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1], b = nodes[i];
      const isWrap = wrapSet.has(i);

      const done   = i <= cur;
      const active = i === cur;
      const col    = done ? stages[i].color : '#003300';
      const lw     = done ? 2 : 1;
      const la     = done ? 0.65 : 0.18;

      // Base line (curved for wrap connector)
      ctx.beginPath();
      if (isWrap) {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 + 20;
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
      } else {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.strokeStyle = hexRgba(col, la);
      ctx.lineWidth   = lw;
      ctx.stroke();

      // Animated signal dot on completed + active connectors
      if (done) {
        const p  = connFlow[i - 1];
        let sx, sy;
        if (isWrap) {
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2 + 20;
          sx = bezierPt(a.x, mx, b.x, p);
          sy = bezierPt(a.y, my, b.y, p);
        } else {
          sx = a.x + (b.x - a.x) * p;
          sy = a.y + (b.y - a.y) * p;
        }

        const dotR = active ? 5 : 3;
        ctx.beginPath();
        ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#00FF41' : col;
        ctx.shadowBlur  = active ? 18 : 8;
        ctx.shadowColor = active ? '#00FF41' : col;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  function bezierPt(p0, p1, p2, t) {
    return (1-t)*(1-t)*p0 + 2*(1-t)*t*p1 + t*t*p2;
  }

  // ── Detection Markers ──────────────────────────────────────────────────────
  function drawDetectionMarkers() {
    // Place detection opportunity markers on key connectors
    const detEdges = [1, 3, 5, 7]; // connector index = between node[i-1] and node[i]
    const cur      = S.current;

    detEdges.forEach(idx => {
      if (idx >= nodes.length) return;
      const a = nodes[idx - 1], b = nodes[idx];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const passed = cur >= idx;

      ctx.save();
      ctx.globalAlpha = passed ? 0.9 : 0.28;
      ctx.translate(mx, my - 16);

      // Diamond shield icon
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(7, 0);
      ctx.lineTo(0, 7);  ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fillStyle   = passed ? 'rgba(0,240,255,0.18)' : 'rgba(0,240,255,0.05)';
      ctx.strokeStyle = passed ? '#00F0FF' : 'rgba(0,240,255,0.4)';
      ctx.lineWidth   = 1;
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = passed ? '#00F0FF' : 'rgba(0,240,255,0.4)';
      ctx.font      = `7px 'Share Tech Mono',monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('DET', 0, 15);
      ctx.restore();
    });
  }

  // ── Lateral Movement Branches ─────────────────────────────────────────────
  function drawBranches() {
    const cur   = S.current;
    const latI  = SIM_SCENARIO.stages.findIndex(s => s.code === 'LAT');
    if (latI < 0 || cur < latI) return;

    const lN = nodes[latI];
    if (!lN || !lN.branches) return;

    lN.branches.forEach(b => {
      ctx.beginPath();
      ctx.moveTo(lN.x, lN.y + lN.r);
      ctx.lineTo(b.x, b.y - 10);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,23,68,0.65)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Host node
      ctx.beginPath();
      ctx.arc(b.x, b.y, 13, 0, Math.PI * 2);
      ctx.fillStyle   = 'rgba(255,23,68,0.15)';
      ctx.strokeStyle = 'rgba(255,23,68,0.75)';
      ctx.lineWidth   = 1;
      ctx.fill(); ctx.stroke();

      ctx.fillStyle    = '#FF6B6B';
      ctx.font         = `8px 'Share Tech Mono',monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x, b.y);
      ctx.textBaseline = 'alphabetic';
    });
  }

  // ── Nodes ─────────────────────────────────────────────────────────────────
  function drawNodes() {
    const cur    = S.current;
    const stages = SIM_SCENARIO.stages;

    nodes.forEach((nd, i) => {
      const s      = nd.stage;
      const active = i === cur;
      const done   = i <  cur;
      const gl     = nodeGlow[i];
      const { x, y, r } = nd;

      // Pulse rings on active node
      if (active) {
        [1, 1.7, 2.5].forEach((mult, ri) => {
          const pr = r + 8 * mult + Math.sin(animT * 3 + ri) * 4;
          ctx.beginPath();
          ctx.arc(x, y, pr, 0, Math.PI * 2);
          ctx.strokeStyle = hexRgba(s.color, 0.22 - ri * 0.06);
          ctx.lineWidth   = 1.5 - ri * 0.3;
          ctx.stroke();
        });
      }

      // Containment chain-break indicator
      if (s.code === 'CTN' && active) {
        drawIsolatedTag(x, y, r);
      }

      // Node body
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle   = hexRgba(s.color, active ? 0.3 : done ? 0.2 : 0.06);
      ctx.strokeStyle = hexRgba(s.color, active ? 1 : done ? 0.6 : 0.2);
      ctx.lineWidth   = active ? 2.5 : 1.5;
      ctx.shadowBlur  = active ? 22 : done ? 6 : 0;
      ctx.shadowColor = s.color;
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur  = 0;

      // Stage code (inside node) — scale font down for longer codes
      const codeLen  = s.code.length;
      const codeFmul = codeLen <= 3 ? 0.60 : codeLen === 4 ? 0.50 : 0.40;
      ctx.fillStyle    = active ? '#fff' : done ? hexRgba(s.color, 0.9) : 'rgba(200,200,200,0.35)';
      ctx.font         = `bold ${Math.max(8, r * codeFmul)}px 'Share Tech Mono',monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      if (active) { ctx.shadowBlur = 8; ctx.shadowColor = '#fff'; }
      ctx.fillText(s.code, x, y);
      ctx.shadowBlur = 0;

      // Stage number (above node)
      ctx.fillStyle    = active ? '#00FF41' : done ? 'rgba(0,255,65,0.6)' : 'rgba(0,255,65,0.22)';
      ctx.font         = `bold ${Math.max(8, r * 0.42)}px 'Share Tech Mono',monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(i + 1).padStart(2, '0'), x, y - r - 2);

      // Stage label (below node)
      const n_stages = SIM_SCENARIO.stages.length;
      const threeRow = n_stages > 10;
      const lsz      = Math.max(7, Math.min(threeRow ? 10 : 11, r * 0.52));
      const lbl      = s.label.toUpperCase();
      ctx.fillStyle    = active ? '#E8F5E9' : done ? 'rgba(200,230,201,0.7)' : 'rgba(200,230,201,0.28)';
      ctx.font         = `${lsz}px 'Share Tech Mono',monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';

      if (threeRow) {
        // 3-row: single line, truncate to fit node spacing
        const maxW = r * 4.2;
        let txt = lbl;
        while (txt.length > 4 && ctx.measureText(txt).width > maxW) {
          txt = txt.slice(0, -3) + '..';
        }
        ctx.fillText(txt, x, y + r + 3);
      } else {
        // 2-row: allow two-line wrap for long labels
        const words = lbl.split(' ');
        if (words.length > 1 && ctx.measureText(lbl).width > r * 3.2) {
          const mid   = Math.ceil(words.length / 2);
          const line1 = words.slice(0, mid).join(' ');
          const line2 = words.slice(mid).join(' ');
          ctx.fillText(line1, x, y + r + 4);
          ctx.fillText(line2, x, y + r + 4 + lsz + 1);
        } else {
          ctx.fillText(lbl, x, y + r + 4);
        }
      }
      ctx.textBaseline = 'alphabetic';

      // Completed tick
      if (done) {
        ctx.fillStyle = hexRgba(s.color, 0.75);
        ctx.font      = `10px 'Share Tech Mono',monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('✓', x + r * 0.6, y - r * 0.55);
        ctx.textBaseline = 'alphabetic';
      }
    });
  }

  function drawIsolatedTag(x, y, r) {
    ctx.fillStyle    = 'rgba(0,255,65,0.7)';
    ctx.font         = `8px 'Share Tech Mono',monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('[CHAIN SEVERED]', x, y - r - 14);
    ctx.textBaseline = 'alphabetic';
    // Short cut line
    ctx.beginPath();
    ctx.moveTo(x + r + 4, y);
    ctx.lineTo(x + r + 28, y);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(0,255,65,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── C2 Beacons ────────────────────────────────────────────────────────────
  function drawBeacons() {
    const c2i = SIM_SCENARIO.stages.findIndex(s => s.code === 'C2');
    if (c2i < 0 || S.current < c2i || !nodes[c2i]) return;
    const { x, y, r } = nodes[c2i];

    [beaconR, (beaconR + 40) % 100, (beaconR + 70) % 100].forEach((br, i) => {
      const a = Math.max(0, 1 - br / 100) * (0.5 - i * 0.12);
      if (a <= 0) return;
      ctx.beginPath();
      ctx.arc(x, y, r + br, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,0,255,${a})`;
      ctx.lineWidth   = 1.5 - i * 0.3;
      ctx.stroke();
    });
  }

  // ─── INTEL PANEL RENDER ───────────────────────────────────────────────────
  function renderIntel() {
    if (!intelEl) return;
    const stage  = SIM_SCENARIO.stages[S.current];
    const total  = SIM_SCENARIO.stages.length;
    if (!stage) return;

    const sev = {
      LOW: '#F39C12', MEDIUM: '#F39C12', HIGH: '#FF6B00',
      CRITICAL: '#FF1744', RESOLVED: '#00FF41',
    };
    const sevCol = sev[stage.severity] || '#C8E6C9';

    const techniqueHtml = stage.techniqueId
      ? `<div class="intel-badge technique-badge"><span class="badge-id">${esc(stage.techniqueId)}</span> <span class="badge-name">· ${esc(stage.techniqueName)}</span></div>`
      : `<div class="intel-badge response-badge"><span class="badge-name">${esc(stage.techniqueName)}</span></div>`;

    const beh = (stage.behavior || [])
      .map(b => `<li><span class="intel-bullet">▸</span>${esc(b)}</li>`).join('');
    const tel = (stage.telemetry || [])
      .map(t => `<span class="intel-tag">${esc(t)}</span>`).join('');
    const iocs = (stage.iocs || [])
      .map(ioc => `<div class="intel-ioc-line">&gt; ${esc(ioc)}</div>`).join('');

    intelEl.innerHTML = `
      <div class="intel-stage-badge" style="border-color:${sevCol}20">
        <div class="intel-stage-num">STAGE ${String(S.current+1).padStart(2,'0')} / ${total}</div>
        <div class="intel-sev-badge" style="color:${sevCol};border-color:${sevCol}50">${stage.severity}</div>
      </div>

      <div class="intel-stage-title" style="color:${stage.color}">${esc(stage.label.toUpperCase())}</div>

      <div class="intel-mitre-block">
        <div class="intel-block-label">MITRE ATT&amp;CK MAPPING</div>
        <div class="intel-tactic-badge">TACTIC: <span>${esc(stage.tactic.toUpperCase())}</span></div>
        ${techniqueHtml}
      </div>

      <div class="intel-block">
        <div class="intel-block-label">MISSION LOG</div>
        <div class="intel-log-box">${esc(stage.missionLog)}</div>
      </div>

      <div class="intel-block">
        <div class="intel-block-label">MALWARE BEHAVIOR</div>
        <ul class="intel-behavior-list">${beh}</ul>
      </div>

      <div class="intel-block">
        <div class="intel-block-label">TELEMETRY SOURCES</div>
        <div class="intel-tags-wrap">${tel}</div>
      </div>

      <div class="intel-block">
        <div class="intel-block-label">DETECTION SIGNAL</div>
        <div class="intel-detect-box">&gt; ${esc(stage.detection)}</div>
      </div>

      <div class="intel-block">
        <div class="intel-block-label">IOC EXAMPLES</div>
        <div class="intel-ioc-block">${iocs}</div>
      </div>

      <div class="intel-block">
        <div class="intel-block-label">ANALYST ACTION</div>
        <div class="intel-action-box">&gt; ${esc(stage.analystAction)}</div>
      </div>

      <div class="intel-confidence-row">
        <div class="intel-conf-item">
          <span class="intel-conf-label">CONFIDENCE:</span>
          <span class="intel-conf-val" style="color:${stage.confidence==='HIGH'?'#00FF41':'#F39C12'}">${esc(stage.confidence)}</span>
        </div>
        <div class="intel-conf-item">
          <span class="intel-conf-label">SEVERITY:</span>
          <span class="intel-conf-val" style="color:${sevCol}">${esc(stage.severity)}</span>
        </div>
      </div>

      <div class="intel-why-block">
        <div class="intel-why-label">// WHY THIS MATTERS</div>
        <div class="intel-why-text">" ${esc(stage.whyItMatters)} "</div>
      </div>`;

    // Trigger reveal animation
    intelEl.classList.remove('intel-revealed');
    void intelEl.offsetWidth;
    intelEl.classList.add('intel-revealed');

    // Scroll panel to top
    const panel = document.getElementById('sim-intel-panel');
    if (panel) panel.scrollTop = 0;
  }

  // ─── STATUS BAR UPDATE ────────────────────────────────────────────────────
  function updateStatusBar() {
    const stage = SIM_SCENARIO.stages[S.current];
    const total = SIM_SCENARIO.stages.length;
    const sevColors = {
      LOW:'#F39C12',MEDIUM:'#F39C12',HIGH:'#FF6B00',CRITICAL:'#FF1744',RESOLVED:'#00FF41'
    };
    if (stageCountEl) stageCountEl.textContent = `${S.current + 1} / ${total}`;
    if (severityEl) {
      severityEl.textContent = stage.severity;
      severityEl.style.color  = sevColors[stage.severity] || '#C8E6C9';
    }
    // Flash
    const bar = document.getElementById('sim-status-bar');
    if (bar) { bar.classList.remove('bar-flash'); void bar.offsetWidth; bar.classList.add('bar-flash'); }
  }

  // ─── SCRUBBER ─────────────────────────────────────────────────────────────
  function buildScrubber() {
    if (!scrubEl) return;
    scrubEl.innerHTML = SIM_SCENARIO.stages.map((s, i) => `
      <button class="scrub-btn" data-idx="${i}" data-code="${s.code}"
        aria-label="Stage ${i+1}: ${s.label}"
        title="${s.label}">
        <span class="scrub-num">${i+1}</span>
        <span class="scrub-label">${s.code}</span>
      </button>`).join('');

    scrubEl.querySelectorAll('.scrub-btn').forEach(btn => {
      btn.addEventListener('click', () => goTo(+btn.dataset.idx));
    });
    syncScrubber();
  }

  function syncScrubber() {
    if (!scrubEl) return;
    scrubEl.querySelectorAll('.scrub-btn').forEach((btn, i) => {
      btn.classList.toggle('scrub-active', i === S.current);
      btn.classList.toggle('scrub-done',   i <  S.current);
    });
  }

  // ─── NAVIGATION ───────────────────────────────────────────────────────────
  function goTo(idx) {
    const n = SIM_SCENARIO.stages.length;
    if (idx < 0 || idx >= n) return;
    S.current = idx;
    renderIntel();
    updateStatusBar();
    syncScrubber();
    syncControlState();
    triggerAlerts();
  }

  function next() {
    if (S.current < SIM_SCENARIO.stages.length - 1) goTo(S.current + 1);
    else stopAuto();
  }

  function prev() {
    if (S.current > 0) goTo(S.current - 1);
  }

  function reinit() {
    stopAuto();
    goTo(0);
    connFlow = nodes.map(() => 0);
    beaconR  = 0;
    S.startMs = Date.now();
  }

  // ─── AUTOPLAY ─────────────────────────────────────────────────────────────
  function startAuto() {
    S.autoplay = true;
    if (autoBtn) { autoBtn.textContent = '⏸ PAUSE'; autoBtn.classList.add('btn-active'); }
    S.autoTimer = setInterval(() => {
      if (S.current >= SIM_SCENARIO.stages.length - 1) stopAuto();
      else next();
    }, S.autoInterval);
  }

  function stopAuto() {
    S.autoplay = false;
    clearInterval(S.autoTimer);
    if (autoBtn) { autoBtn.textContent = '▶ AUTOPLAY'; autoBtn.classList.remove('btn-active'); }
  }

  // ─── CONTROLS BINDING ─────────────────────────────────────────────────────
  function bindControls() {
    if (prevBtn)  prevBtn.addEventListener('click',  () => { stopAuto(); prev(); });
    if (nextBtn)  nextBtn.addEventListener('click',  () => { stopAuto(); next(); });
    if (autoBtn)  autoBtn.addEventListener('click',  () => S.autoplay ? stopAuto() : startAuto());
    if (reinitBtn) reinitBtn.addEventListener('click', reinit);

    document.addEventListener('keydown', e => {
      if (['ArrowRight','ArrowDown'].includes(e.key))  { e.preventDefault(); stopAuto(); next(); }
      if (['ArrowLeft','ArrowUp'].includes(e.key))     { e.preventDefault(); stopAuto(); prev(); }
      if (e.key === ' ')  { e.preventDefault(); S.autoplay ? stopAuto() : startAuto(); }
      if (e.key === 'Escape') stopAuto();
    });

    syncControlState();
  }

  function syncControlState() {
    const n = SIM_SCENARIO.stages.length;
    if (prevBtn)  prevBtn.disabled  = S.current === 0;
    if (nextBtn)  nextBtn.disabled  = S.current === n - 1;
  }

  // ─── ALERT FLASHES ────────────────────────────────────────────────────────
  function triggerAlerts() {
    const stage   = SIM_SCENARIO.stages[S.current];
    const flashEl = document.getElementById('chain-flash');
    if (!flashEl) return;

    const msgs = {
      EXEC:  '⚡ PAYLOAD EXECUTED — PROCESS INJECTION INITIATED',
      C2:    '⚡ THREAT SIGNAL ACQUIRED — C2 BEACON DETECTED',
      CRED:  '🔴 CRITICAL — LSASS MEMORY ACCESS DETECTED',
      LAT:   '🔴 CRITICAL — LATERAL MOVEMENT IN PROGRESS',
      EXFIL: '🔴 CRITICAL — DATA EXFILTRATION DETECTED',
      CTN:   '✓ HOST ISOLATED — CHAIN SEVERED',
      // AiTM stages
      HIJACK:'🔴 SESSION TOKEN STOLEN — MFA BYPASSED',
      BEC:   '🔴 CRITICAL — BUSINESS EMAIL COMPROMISE ACTIVE',
      // Ransomware stages
      IAC:   '⚡ INITIAL ACCESS CONFIRMED — RDP BRUTE FORCE SUCCESSFUL',
      REXEC: '⚡ COBALT STRIKE BEACON ACTIVE — PROCESS INJECTION CONFIRMED',
      EVA:   '⚠ DEFENSE EVASION — EDR KILLED, LOGS CLEARED',
      PER:   '⚠ PERSISTENCE INSTALLED — SCHEDULED TASK + RUN KEY',
      RECON: '⚡ BLOODHOUND COLLECTION COMPLETE — ENVIRONMENT MAPPED',
      VSS:   '🔴 CRITICAL — SHADOW COPIES DELETED — RECOVERY ELIMINATED',
      ENC:   '🔴 CRITICAL — ENCRYPTION IN PROGRESS — LOCKBIT 3.0 ACTIVE',
      RAN:   '☠ RANSOM NOTE DEPLOYED — DOUBLE EXTORTION INITIATED',
      LATM:  '🔴 CRITICAL — LATERAL MOVEMENT — 23 HOSTS COMPROMISED',
    };

    const msg = msgs[stage.code];
    if (msg) {
      flashEl.textContent = msg;
      flashEl.className   = 'chain-flash-msg active';
      setTimeout(() => { flashEl.className = 'chain-flash-msg'; }, 5500);
    }
  }

  // ─── INCIDENT TIMER ───────────────────────────────────────────────────────
  function tickTimer() {
    // Dwell time offsets per stage (seconds from T0)
    const timeOffsets = SIM_SCENARIO.stages.map(s => s.timeOffset || 0);

    setInterval(() => {
      const secs = timeOffsets[S.current] || 0;
      const h = Math.floor(secs / 3600),
            m = Math.floor((secs % 3600) / 60),
            s = secs % 60;
      if (timerEl) timerEl.textContent =
        `${pad(h)}:${pad(m)}:${pad(s)}`;
    }, 250);
  }

  function pad(n) { return String(n).padStart(2,'0'); }

  // ─── MATRIX RAIN BACKGROUND ───────────────────────────────────────────────
  function startRain() {
    const bg = document.getElementById('bg-rain');
    if (!bg) return;
    const rc = bg.getContext('2d');

    function resize() {
      bg.width  = window.innerWidth;
      bg.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const CHARS = 'アイウエオカキクケコサシスセソ01ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&';
    let drops = Array.from({ length: Math.floor(bg.width / 20) }, () => Math.random() * bg.height);

    function loop() {
      rc.fillStyle = 'rgba(0,0,0,0.04)';
      rc.fillRect(0, 0, bg.width, bg.height);
      rc.fillStyle = 'rgba(0,255,65,0.35)';
      rc.font      = '13px monospace';

      if (drops.length !== Math.floor(bg.width / 20)) {
        drops = Array.from({ length: Math.floor(bg.width/20) }, () => Math.random() * bg.height);
      }

      drops.forEach((y, i) => {
        rc.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * 20, y);
        if (y > bg.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 20;
      });
      requestAnimationFrame(loop);
    }
    loop();
  }

  // ─── ENTRY POINT ──────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
