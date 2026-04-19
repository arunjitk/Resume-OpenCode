/* ================================================================
   BIOS.JS — BIOS-Style Boot Sequence & Access Level Selection
   Session-scoped: appears once per page load, resets on refresh/tab close
   ================================================================ */

(function () {
  'use strict';

  // ─── SESSION GATE ─────────────────────────────────────────────
  let biosCompleted = false;

  // ─── CONSTANTS ────────────────────────────────────────────────
  const LEVELS      = ['civilian', 'analyst', 'root'];
  const LEVEL_NAMES = ['USER', 'ANALYST', 'ROOT'];

  const POST_LINES = [
    { text: 'ARUNJIT SECURITY WORKSTATION v2.4.1',              delay: 0   },
    { text: 'Copyright (C) 2025 AK Systems. All rights reserved.', delay: 120 },
    { text: '',                                                   delay: 180 },
    { text: 'CPU: Threat-Intel Xeon @4.2GHz ........... [OK]',   delay: 200 },
    { text: 'RAM: 32768MB DDR5 ECC ..................... [OK]',   delay: 220 },
    { text: 'GPU: NV-Cipher RTX 9090 .................. [OK]',   delay: 220 },
    { text: 'NIC: SecureNet 10GbE ..................... [OK]',   delay: 220 },
    { text: 'STORAGE: /dev/sda1 ENCRYPTED ............. [OK]',   delay: 220 },
    { text: 'BIOS: SHA-256 CHECKSUM ................... VERIFIED', delay: 240 },
    { text: '',                                                   delay: 280 },
    { text: 'Detecting visitor profile...',                       delay: 300 },
    { text: 'No existing session found.',                         delay: 600 },
    { text: '',                                                   delay: 300 },
  ];

  const TERMINOLOGY = {
    civilian: {
      'dossier-eyebrow':    '// OPERATOR FILE',
      'dossier-label':      'CLASSIFIED DOSSIER',
      'dossier-stamp':      '■ CLASSIFIED',
      'experience-eyebrow': '// MISSION LOG',
      'experience-label':   'WORK EXPERIENCE',
      'skills-eyebrow':     '// THREAT ARSENAL',
      'skills-label':       'SKILLS MATRIX',
      'armory-eyebrow':     '// WEAPON LOADOUT',
      'armory-label':       'THE ARMORY',
      'projects-eyebrow':   '// DEPLOYED OPERATIONS',
      'projects-label':     'PROJECTS',
      'atsim-eyebrow':      '// LIVE DEMO',
      'atsim-label':        'ATTACK SIMULATION',
      'certs-eyebrow':      '// CLEARANCE LEVEL',
      'certs-label':        'CERTIFICATIONS',
      'awards-eyebrow':     '// FIELD COMMENDATIONS',
      'awards-label':       'AWARDS',
      'contact-eyebrow':    '// ESTABLISH UPLINK',
      'contact-label':      'CONTACT',
      'contact-cta':        'INITIATE CONTACT',
      'hero-tagline':       'Senior Security Analyst III',
      'hero-status':        'ACTIVE',
      'footer-line':        'All systems nominal.',
      'status-badge':       'PORTFOLIO',
    },
    analyst: {
      'dossier-eyebrow':    '// OPERATIVE PROFILE',
      'dossier-label':      'OPERATIVE PROFILE',
      'dossier-stamp':      '■ CONFIDENTIAL',
      'experience-eyebrow': '// DEPLOYMENT LOG',
      'experience-label':   'FIELD DEPLOYMENTS',
      'skills-eyebrow':     '// CAPABILITY INVENTORY',
      'skills-label':       'CAPABILITY MATRIX',
      'armory-eyebrow':     '// TOOL INVENTORY',
      'armory-label':       'TOOL INVENTORY',
      'projects-eyebrow':   '// ACTIVE OPERATIONS',
      'projects-label':     'FIELD DEPLOYMENTS',
      'atsim-eyebrow':      '// TACTICAL SIMULATION',
      'atsim-label':        'ATTACK SIMULATION',
      'certs-eyebrow':      '// ACCREDITATION LOG',
      'certs-label':        'ACCREDITATION LOG',
      'awards-eyebrow':     '// COMMENDATIONS',
      'awards-label':       'COMMENDATIONS',
      'contact-eyebrow':    '// OPEN SECURE CHANNEL',
      'contact-label':      'SECURE CHANNEL',
      'contact-cta':        'OPEN SECURE CHANNEL',
      'hero-tagline':       'Threat Intelligence | Incident Response',
      'hero-status':        'ON-MISSION',
      'footer-line':        'Session active. Monitoring enabled.',
      'status-badge':       'CLEARANCE: L2',
    },
    root: {
      'dossier-eyebrow':    '// CLASSIFIED FILE',
      'dossier-label':      'CLASSIFIED DOSSIER',
      'dossier-stamp':      '■ TOP SECRET',
      'experience-eyebrow': '// COVERT OPERATION LOG',
      'experience-label':   'COVERT OPERATIONS',
      'skills-eyebrow':     '// THREAT CAPABILITY INDEX',
      'skills-label':       'THREAT CAPABILITY INDEX',
      'armory-eyebrow':     '// WEAPONS CACHE',
      'armory-label':       'WEAPONS CACHE',
      'projects-eyebrow':   '// COVERT OPERATIONS',
      'projects-label':     'COVERT OPERATIONS',
      'atsim-eyebrow':      '// CLASSIFIED SIMULATION',
      'atsim-label':        'ATTACK SIMULATION',
      'certs-eyebrow':      '// AUTHORIZATION RECORDS',
      'certs-label':        'AUTHORIZATION RECORDS',
      'awards-eyebrow':     '// COMMENDATIONS CLASSIFIED',
      'awards-label':       'CLASSIFIED COMMENDATIONS',
      'contact-eyebrow':    '// ENCRYPTED LINK',
      'contact-label':      'ENCRYPTED LINK',
      'contact-cta':        'ESTABLISH ENCRYPTED LINK',
      'hero-tagline':       'Red Cell Operator | Full Stack Threat Actor',
      'hero-status':        'ROOT SHELL ACTIVE',
      'footer-line':        'WARNING: You are operating at root level.',
      'status-badge':       'CLEARANCE: ROOT',
    },
  };

  // ─── STATE ────────────────────────────────────────────────────
  let selectedIdx = 0;
  let biosOverlay = null;
  let outputEl    = null;
  let menuEl      = null;
  let keyHandler  = null;

  // ─── UTILITY: sleep ───────────────────────────────────────────
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ─── HIDE / SHOW SITE CONTENT ─────────────────────────────────
  function hideSiteContent() {
    const main = document.querySelector('main');
    const nav  = document.getElementById('nav');
    const prog = document.getElementById('progress-bar');
    if (main) { main.style.opacity = '0'; main.style.pointerEvents = 'none'; }
    if (nav)  { nav.style.opacity  = '0'; nav.style.pointerEvents  = 'none'; }
    if (prog) { prog.style.opacity = '0'; }
  }

  function revealSiteContent() {
    const main = document.querySelector('main');
    const nav  = document.getElementById('nav');
    const prog = document.getElementById('progress-bar');
    if (main) {
      main.style.transition = 'opacity 0.6s ease';
      main.style.opacity    = '1';
      main.style.pointerEvents = '';
    }
    if (nav) {
      nav.style.transition = 'opacity 0.5s ease';
      nav.style.opacity    = '1';
      nav.style.pointerEvents = '';
    }
    if (prog) {
      prog.style.transition = 'opacity 0.5s ease';
      prog.style.opacity    = '1';
    }
  }

  // ─── BUILD BIOS OVERLAY ───────────────────────────────────────
  function buildOverlay() {
    biosOverlay = document.createElement('div');
    biosOverlay.id = 'bios-overlay';
    biosOverlay.setAttribute('role', 'dialog');
    biosOverlay.setAttribute('aria-modal', 'true');
    biosOverlay.setAttribute('aria-label', 'Access level configuration');

    biosOverlay.innerHTML = `
      <div class="bios-scanlines" aria-hidden="true"></div>
      <div class="bios-screen" id="bios-screen">
        <div class="bios-output" id="bios-output" aria-live="polite"></div>
        <div class="bios-menu" id="bios-menu" aria-hidden="true"></div>
        <div class="bios-confirm" id="bios-confirm" aria-live="assertive"></div>
      </div>
    `;

    document.body.appendChild(biosOverlay);
    outputEl = document.getElementById('bios-output');
    menuEl   = document.getElementById('bios-menu');
  }

  // ─── POST ANIMATION ───────────────────────────────────────────
  async function playPost() {
    let accumulated = 0;
    for (const line of POST_LINES) {
      accumulated += line.delay;
      await sleep(line.delay);
      appendLine(line.text, line.text.includes('[OK]') || line.text.includes('VERIFIED'));
    }

    // Box border
    await sleep(100);
    appendRaw(`<span class="bios-box">
┌─────────────────────────────────────────────────────────────┐
│              VISITOR ACCESS CONFIGURATION                   │
│         Select access level to initialize session           │
└─────────────────────────────────────────────────────────────┘</span>`);

    await sleep(200);
    showMenu();
  }

  function appendLine(text, highlight = false) {
    const line = document.createElement('div');
    line.className = 'bios-line';
    if (highlight) {
      // Color [OK] and VERIFIED green
      line.innerHTML = text
        .replace(/\[OK\]/g, '<span class="bios-ok">[OK]</span>')
        .replace(/VERIFIED/g, '<span class="bios-ok">VERIFIED</span>');
    } else {
      line.textContent = text;
    }
    outputEl.appendChild(line);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function appendRaw(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    outputEl.appendChild(div);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  // ─── MENU ─────────────────────────────────────────────────────
  function showMenu() {
    const menu      = document.getElementById('bios-menu');
    menu.setAttribute('aria-hidden', 'false');
    menu.innerHTML  = `
      <div class="bios-menu-item" data-idx="0">
        <span class="bios-arrow">›</span>
        <span class="bios-key">[1]</span>
        <span class="bios-level-name">USER</span>
        <span class="bios-level-desc">— Public access. Standard portfolio view.</span>
        <span class="bios-cursor" aria-hidden="true">█</span>
      </div>
      <div class="bios-menu-item" data-idx="1">
        <span class="bios-arrow">›</span>
        <span class="bios-key">[2]</span>
        <span class="bios-level-name">ANALYST</span>
        <span class="bios-level-desc">— Authenticated access. Extended threat context.</span>
        <span class="bios-cursor" aria-hidden="true">█</span>
      </div>
      <div class="bios-menu-item" data-idx="2">
        <span class="bios-arrow">›</span>
        <span class="bios-key">[3]</span>
        <span class="bios-level-name">ROOT</span>
        <span class="bios-level-desc">— Full system access. Classified data unlocked.</span>
        <span class="bios-cursor" aria-hidden="true">█</span>
      </div>
      <div class="bios-menu-hint">
        Use ↑/↓ arrow keys or click to select. Press ENTER to confirm.
        Press [ESC] to default to USER.
      </div>
    `;

    // Mouse click on items
    menu.querySelectorAll('.bios-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedIdx = +item.dataset.idx;
        highlightMenu(selectedIdx);
        confirmSelection(selectedIdx);
      });
      item.addEventListener('mouseenter', () => {
        selectedIdx = +item.dataset.idx;
        highlightMenu(selectedIdx);
      });
    });

    highlightMenu(0);
    attachKeyHandler();
  }

  function highlightMenu(idx) {
    selectedIdx = idx;
    const items = document.querySelectorAll('.bios-menu-item');
    items.forEach((item, i) => {
      item.classList.toggle('bios-selected', i === idx);
      item.querySelector('.bios-cursor').style.display  = i === idx ? 'inline' : 'none';
      item.querySelector('.bios-arrow').textContent     = i === idx ? '>' : ' ';
    });
  }

  function attachKeyHandler() {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          highlightMenu((selectedIdx + 2) % 3);
          break;
        case 'ArrowDown':
          e.preventDefault();
          highlightMenu((selectedIdx + 1) % 3);
          break;
        case 'Enter':
          e.preventDefault();
          confirmSelection(selectedIdx);
          break;
        case '1':
          confirmSelection(0);
          break;
        case '2':
          confirmSelection(1);
          break;
        case '3':
          confirmSelection(2);
          break;
        case 'Escape':
          confirmSelection(0);
          break;
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  // ─── CONFIRM SELECTION ────────────────────────────────────────
  async function confirmSelection(idx) {
    // Remove keyboard handler immediately to prevent double-fire
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }

    const level     = LEVELS[idx];
    const levelName = LEVEL_NAMES[idx];
    const confirm   = document.getElementById('bios-confirm');

    // Disable menu pointer events
    if (menuEl) menuEl.style.pointerEvents = 'none';

    await sleep(300);
    confirm.innerHTML = `
      <div class="bios-line bios-confirm-line">&gt; ACCESS LEVEL: <span class="bios-ok">${levelName}</span> — CONFIRMED</div>
    `;
    await sleep(400);
    confirm.innerHTML += `<div class="bios-line bios-confirm-line">&gt; INITIALIZING USER SESSION...</div>`;
    await sleep(350);
    confirm.innerHTML += `<div class="bios-line bios-confirm-line">&gt; LOADING INTERFACE...</div>`;
    await sleep(650);

    // CRT collapse
    await crtCollapse();

    // Apply theme and terminology
    applyTheme(level);
    applyTerminology(level);

    // Set global access level
    window.__accessLevel = level;
    biosCompleted = true;

    // Show persistent HUD badge
    showAccessBadge(level, levelName);

    // Reveal site
    revealSiteContent();
  }

  // ─── CRT COLLAPSE ANIMATION ───────────────────────────────────
  async function crtCollapse() {
    const screen = document.getElementById('bios-screen');
    if (!screen) return;

    // Spike brightness
    screen.style.transition   = 'transform 420ms cubic-bezier(0.7,0,1,0.5), filter 420ms ease, opacity 200ms ease';
    screen.style.filter       = 'brightness(2.4) contrast(1.2)';
    await sleep(80);

    // Collapse scaleY
    screen.style.filter       = 'brightness(1.8)';
    screen.style.transform    = 'scaleY(0.02)';
    await sleep(430);

    // Fade out the whole overlay
    biosOverlay.style.transition = 'opacity 220ms ease';
    biosOverlay.style.opacity    = '0';
    await sleep(230);

    biosOverlay.remove();
  }

  // ─── APPLY THEME ──────────────────────────────────────────────
  function applyTheme(level) {
    document.documentElement.setAttribute('data-access-level', level);
  }

  // ─── APPLY TERMINOLOGY ────────────────────────────────────────
  function applyTerminology(level) {
    const terms = TERMINOLOGY[level];
    if (!terms) return;
    document.querySelectorAll('[data-term]').forEach(el => {
      const key = el.dataset.term;
      if (terms[key] !== undefined) el.textContent = terms[key];
    });
  }

  // ─── PERSISTENT HUD BADGE ─────────────────────────────────────
  function showAccessBadge(level, levelName) {
    const existing = document.getElementById('access-level-hud');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id        = 'access-level-hud';
    badge.className = `access-hud access-hud--${level}`;
    badge.setAttribute('aria-label', `Access level: ${levelName}`);
    badge.innerHTML = `
      <span class="access-hud-dot" aria-hidden="true"></span>
      <span class="access-hud-label">
        <span class="access-hud-key">ACCESS:</span>
        <span class="access-hud-val">${levelName}</span>
      </span>
    `;

    // Click to cycle/info (purely decorative)
    badge.title = `Session access level: ${levelName}`;
    document.body.appendChild(badge);

    // Slide in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => badge.classList.add('access-hud--visible'));
    });
  }

  // ─── ENTRY POINT ──────────────────────────────────────────────
  function init() {
    if (biosCompleted) return;
    buildOverlay();
    hideSiteContent();
    playPost();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
