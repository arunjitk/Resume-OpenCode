/* Animations — Scroll reveals, glitch text, cursor, parallax */
(function () {

  // ─── CUSTOM CURSOR ───────────────────────────────────────────
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  if (cursor && ring && window.innerWidth > 767) {
    let cx = 0, cy = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', e => { cx = e.clientX; cy = e.clientY; });
    document.addEventListener('mouseenter', e => {
      if (e.target.matches('a,button,[role=button],.mission-card,.cert-badge,.tool-card')) {
        cursor.style.width = '20px';
        cursor.style.height = '20px';
        ring.style.width = '50px';
        ring.style.height = '50px';
        ring.style.borderColor = 'rgba(0,240,255,0.6)';
      }
    }, true);
    document.addEventListener('mouseleave', e => {
      if (e.target.matches('a,button,[role=button],.mission-card,.cert-badge,.tool-card')) {
        cursor.style.width = '12px';
        cursor.style.height = '12px';
        ring.style.width = '36px';
        ring.style.height = '36px';
        ring.style.borderColor = 'rgba(0,255,65,0.5)';
      }
    }, true);
    (function moveCursor() {
      rx += (cx - rx) * 0.25;
      ry += (cy - ry) * 0.25;
      cursor.style.transform = `translate(calc(${cx}px - 50%), calc(${cy}px - 50%))`;
      ring.style.transform = `translate(calc(${rx}px - 50%), calc(${ry}px - 50%))`;
      requestAnimationFrame(moveCursor);
    })();
  }

  // ─── GLITCH TEXT REVEAL ──────────────────────────────────────
  const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&/\\|<>[]{}';

  function glitchReveal(el) {
    const original = el.dataset.text || el.textContent;
    el.dataset.text = original;
    let iteration = 0;
    const total = original.length * 3;
    const id = setInterval(() => {
      el.textContent = original.split('').map((char, i) => {
        if (char === ' ' || char === '\n') return char;
        if (i < Math.floor(iteration / 3)) return original[i];
        return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }).join('');
      if (iteration >= total) {
        el.textContent = original;
        clearInterval(id);
      }
      iteration++;
    }, 30);
  }

  // ─── DECRYPT TEXT REVEAL ────────────────────────────────────
  function decryptReveal(container) {
    const chars = container.querySelectorAll('.decrypt-char');
    chars.forEach((c, i) => {
      const original = c.dataset.original || c.textContent;
      c.dataset.original = original;
      let count = 0;
      const delay = i * 18;
      const id = setTimeout(() => {
        const t = setInterval(() => {
          if (original === ' ' || original === '\n') {
            c.textContent = original;
            clearInterval(t);
            return;
          }
          c.textContent = count < 5
            ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
            : original;
          if (count >= 5) clearInterval(t);
          count++;
        }, 40);
      }, delay);
    });
  }

  // ─── INTERSECTION OBSERVER ──────────────────────────────────
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

  // Glitch section titles
  const titleObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        glitchReveal(e.target);
        titleObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.section-title[data-text]').forEach(el => titleObs.observe(el));

  // Dossier decrypt
  const dossierObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        decryptReveal(e.target);
        dossierObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.dossier-body').forEach(el => dossierObs.observe(el));

  // Timeline node pulses
  const nodeObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('pulse');
      }
    });
  }, { threshold: 0.8 });

  document.querySelectorAll('.node-dot').forEach(el => nodeObs.observe(el));

  // Awards slide-in
  const awardObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        awardObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.award-banner').forEach(el => awardObs.observe(el));

  // Language bars
  const langObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const fill = e.target.querySelector('.lang-bar-fill');
        if (fill) {
          setTimeout(() => { fill.style.width = fill.dataset.width; }, 100);
        }
        langObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('.lang-item').forEach(el => langObs.observe(el));

  // ─── 3D CARD PARALLAX ────────────────────────────────────────
  function bindParallax(cards) {
    cards.forEach(card => {
      card.addEventListener('mousemove', e => {
        if (window.innerWidth < 900) return;
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateY(${x * 12}deg) rotateX(${-y * 8}deg) translateZ(8px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) translateZ(0)';
      });
    });
  }

  bindParallax(document.querySelectorAll('.mission-card'));
  bindParallax(document.querySelectorAll('.cert-badge'));
  bindParallax(document.querySelectorAll('.tool-card'));

  // ─── SCROLL PROGRESS ─────────────────────────────────────────
  const progressFill = document.getElementById('progress-fill');
  const progressDots = document.querySelectorAll('.progress-dot');
  const sections = Array.from(document.querySelectorAll('section[id]'));

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = Math.min((scrollTop / docH) * 100, 100);
    if (progressFill) progressFill.style.height = pct + '%';

    // Active section dot
    sections.forEach((sec, i) => {
      const rect = sec.getBoundingClientRect();
      const dot = progressDots[i];
      if (!dot) return;
      if (rect.top <= window.innerHeight * 0.5 && rect.bottom >= window.innerHeight * 0.5) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Active nav link
    document.querySelectorAll('.nav-links a').forEach(a => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      const rect = target.getBoundingClientRect();
      if (rect.top <= 80 && rect.bottom >= 80) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // ─── GLITCH OVERLAY on NAV CLICK ─────────────────────────────
  const glitchEl = document.querySelector('.glitch-overlay');
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', () => {
      if (!glitchEl) return;
      glitchEl.classList.remove('active');
      void glitchEl.offsetWidth;
      glitchEl.classList.add('active');
      setTimeout(() => glitchEl.classList.remove('active'), 300);
    });
  });

  // ─── HERO TYPING EFFECT ─────────────────────────────────────
  const typingEl = document.querySelector('.hero-typing');
  if (typingEl) {
    const lines = [
      'Threat Hunter',
      'Incident Responder',
      'Cloud Security Specialist',
      'OSINT Investigator',
      'SOC Lead',
    ];
    let li = 0, ci = 0, deleting = false;
    function typeLoop() {
      const current = lines[li];
      if (!deleting) {
        typingEl.textContent = current.substring(0, ci + 1);
        ci++;
        if (ci === current.length) { deleting = true; setTimeout(typeLoop, 2200); return; }
      } else {
        typingEl.textContent = current.substring(0, ci - 1);
        ci--;
        if (ci === 0) { deleting = false; li = (li + 1) % lines.length; }
      }
      setTimeout(typeLoop, deleting ? 50 : 90);
    }
    setTimeout(typeLoop, 3000);
  }

  // ─── BOOT SEQUENCE ───────────────────────────────────────────
  const bootLines = document.querySelectorAll('.boot-line');
  bootLines.forEach((line, i) => {
    line.style.animationDelay = `${i * 280}ms`;
  });

  // ─── MOBILE NAV ──────────────────────────────────────────────
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  // ─── KONAMI CODE ─────────────────────────────────────────────
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let kSeq = [];
  document.addEventListener('keydown', e => {
    kSeq.push(e.key);
    if (kSeq.length > KONAMI.length) kSeq.shift();
    if (kSeq.join(',') === KONAMI.join(',')) {
      document.getElementById('konami-modal').classList.add('open');
      kSeq = [];
    }
  });

  const konamiModal = document.getElementById('konami-modal');
  if (konamiModal) {
    konamiModal.querySelector('.pill-btn.red').addEventListener('click', () => {
      document.body.classList.add('red-pill');
      konamiModal.classList.remove('open');
    });
    konamiModal.querySelector('.pill-btn.blue').addEventListener('click', () => {
      document.body.classList.remove('red-pill');
      konamiModal.classList.remove('open');
    });
  }

  // ─── TERMINAL EASTER EGG ─────────────────────────────────────
  const termOverlay = document.getElementById('terminal-overlay');
  const termInput = document.getElementById('terminal-input');
  const termOutput = document.getElementById('terminal-output');

  const CMDS = {
    whoami: () => 'arunjit@secops:~$ Senior Security Analyst III | Threat Hunter | Incident Responder',
    'skills --list': () => [
      'CORE: Threat Hunting, OSINT, Incident Response, Digital Forensics, Cloud Security',
      'SIEM: CrowdStrike Falcon, ELK Stack, SumoLogic, Trellix Helix',
      'EDR:  SentinelOne, Cortex XDR, Trellix EDR',
      'CLOUD: AWS, Azure, GCP, Wiz',
      'CODE:  Python, C#, C++, Java',
    ].join('\n'),
    'contact --email': () => 'arunjithk1994@gmail.com',
    'sudo hire arunjit': () => [
      'Checking credentials... [OK]',
      'Verifying clearance... [GRANTED]',
      'Running background check... [PASSED]',
      '> Great decision. Send a message at arunjithk1994@gmail.com',
    ].join('\n'),
    help: () => [
      'Available commands:',
      '  whoami           — Operator identification',
      '  skills --list    — List all technical skills',
      '  contact --email  — Get email address',
      '  sudo hire arunjit — Make the best decision of your career',
      '  clear            — Clear terminal',
      '  exit             — Close terminal',
    ].join('\n'),
    clear: () => { termOutput.innerHTML = ''; return null; },
    exit: () => { termOverlay.classList.remove('open'); return null; },
  };

  function termLog(prompt, text, cls = 'output') {
    if (prompt) {
      const pLine = document.createElement('div');
      pLine.className = 'terminal-line';
      pLine.innerHTML = `<span class="prompt">${prompt}</span>`;
      termOutput.appendChild(pLine);
    }
    if (text !== null && text !== undefined) {
      text.split('\n').forEach(t => {
        const line = document.createElement('div');
        line.className = `terminal-line`;
        line.innerHTML = `<span class="${cls}">${t}</span>`;
        termOutput.appendChild(line);
      });
    }
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  document.addEventListener('keydown', e => {
    if (e.key === '`' && !termOverlay.classList.contains('open')) {
      e.preventDefault();
      termOverlay.classList.add('open');
      termInput.focus();
      termLog(null, 'ARUNJIT.K SECURE TERMINAL v1.0', 'output');
      termLog(null, 'Type "help" for available commands.', 'output');
    }
  });

  if (termInput) {
    termInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const cmd = termInput.value.trim();
        termInput.value = '';
        termLog(`> ${cmd}`, null);
        const handler = CMDS[cmd.toLowerCase()];
        if (handler) {
          const result = handler();
          if (result !== null && result !== undefined) termLog(null, result);
        } else if (cmd) {
          termLog(null, `Command not found: ${cmd}. Type "help".`, 'error');
        }
      }
    });
  }

  document.getElementById('terminal-close')?.addEventListener('click', () => {
    termOverlay.classList.remove('open');
  });

  // ─── SKILL FILTER ─────────────────────────────────────────────
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      if (window.setSkillFilter) window.setSkillFilter(cat);
      // Also filter hex tiles if sphere not loaded
      document.querySelectorAll('.skill-hex').forEach(tile => {
        if (cat === 'all' || tile.dataset.cat === cat) {
          tile.classList.remove('filtered-out');
        } else {
          tile.classList.add('filtered-out');
        }
      });
    });
  });

  // ─── DOWNLOAD LEAD MODAL ──────────────────────────────────────
  const extractBtn    = document.getElementById('extract-btn');
  const downloadModal = document.getElementById('download-lead-modal');
  const dlmClose      = document.getElementById('dlm-close');
  const dlmForm       = document.getElementById('download-lead-form');
  const dlmStatus     = document.getElementById('dlm-status');
  const dlmSubmit     = document.getElementById('dlm-submit');
  const RESUME_URL    = 'ResumePDF/Arunjit.K-Resume-2026 .pdf';
  const RESUME_FNAME  = 'Arunjit.K-Resume-2026.pdf';

  function openDownloadModal() {
    if (downloadModal) {
      downloadModal.classList.add('open');
      setTimeout(() => { document.getElementById('dlm-name')?.focus(); }, 50);
    }
  }

  function closeDownloadModal() {
    if (!downloadModal) return;
    downloadModal.classList.remove('open');
    if (dlmForm) dlmForm.reset();
    if (dlmStatus) dlmStatus.style.display = 'none';
    if (dlmSubmit) {
      dlmSubmit.textContent = '> [AUTHORIZE & EXTRACT]';
      dlmSubmit.style.color = '';
      dlmSubmit.disabled = false;
    }
  }

  function triggerDownload() {
    const a = document.createElement('a');
    a.href = RESUME_URL;
    a.download = RESUME_FNAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (extractBtn) extractBtn.addEventListener('click', openDownloadModal);
  if (dlmClose)   dlmClose.addEventListener('click', closeDownloadModal);

  if (downloadModal) {
    downloadModal.addEventListener('click', e => {
      if (e.target === downloadModal) closeDownloadModal();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && downloadModal?.classList.contains('open')) {
      closeDownloadModal();
    }
  });

  if (dlmForm) {
    dlmForm.addEventListener('submit', async e => {
      e.preventDefault();

      const name  = document.getElementById('dlm-name').value.trim();
      const email = document.getElementById('dlm-email').value.trim();
      const phone = document.getElementById('dlm-phone').value.trim();

      if (!name || !email) {
        dlmStatus.textContent    = '> ERROR: CALLSIGN AND RETURN ADDRESS ARE REQUIRED.';
        dlmStatus.style.color    = '#ff4444';
        dlmStatus.style.display  = 'block';
        return;
      }

      dlmSubmit.disabled    = true;
      dlmSubmit.textContent = '> VERIFYING IDENTITY...';
      dlmStatus.style.display = 'none';

      try {
        const res = await fetch('/api/download-lead', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, email, phone }),
        });

        let data = {};
        try { data = await res.json(); } catch { /* ignore */ }

        if (res.ok && data.success) {
          dlmSubmit.textContent   = '> AUTHORIZED ✓ — EXTRACTING...';
          dlmSubmit.style.color   = 'var(--matrix-green)';
          dlmStatus.textContent   = '> ACCESS GRANTED. FILE EXTRACTION INITIATED.';
          dlmStatus.style.color   = 'var(--matrix-green)';
          dlmStatus.style.display = 'block';
          setTimeout(() => {
            triggerDownload();
            setTimeout(closeDownloadModal, 1500);
          }, 800);
        } else {
          throw new Error(data.error || 'Verification failed');
        }
      } catch (err) {
        dlmSubmit.textContent   = '> [AUTHORIZE & EXTRACT]';
        dlmSubmit.style.color   = '';
        dlmSubmit.disabled      = false;
        dlmStatus.textContent   = `> ACCESS DENIED: ${err.message}`;
        dlmStatus.style.color   = '#ff4444';
        dlmStatus.style.display = 'block';
      }
    });
  }

  // ─── HUB ACCESS MODAL ────────────────────────────────────────
  const HUB_URL      = 'https://arunjitkcom.notion.site/Cyber-Security-Hub-c9062a39de4d4029b4637b81fcf939e6?source=copy_link';
  const hubBtn       = document.getElementById('hub-access-btn');
  const hubModal     = document.getElementById('hub-access-modal');
  const hamClose     = document.getElementById('ham-close');
  const hamForm      = document.getElementById('hub-access-form');
  const hamStatus    = document.getElementById('ham-status');
  const hamSubmit    = document.getElementById('ham-submit');

  function openHubModal() {
    if (hubModal) {
      hubModal.classList.add('open');
      setTimeout(() => { document.getElementById('ham-name')?.focus(); }, 50);
    }
  }

  function closeHubModal() {
    if (!hubModal) return;
    hubModal.classList.remove('open');
    if (hamForm)   hamForm.reset();
    if (hamStatus) hamStatus.style.display = 'none';
    if (hamSubmit) {
      hamSubmit.textContent = '> [AUTHORIZE & ACCESS HUB]';
      hamSubmit.style.color = '';
      hamSubmit.disabled    = false;
    }
  }

  if (hubBtn)   hubBtn.addEventListener('click', openHubModal);
  if (hamClose) hamClose.addEventListener('click', closeHubModal);

  if (hubModal) {
    hubModal.addEventListener('click', e => {
      if (e.target === hubModal) closeHubModal();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && hubModal?.classList.contains('open')) closeHubModal();
  });

  if (hamForm) {
    hamForm.addEventListener('submit', async e => {
      e.preventDefault();

      const name  = document.getElementById('ham-name').value.trim();
      const email = document.getElementById('ham-email').value.trim();

      if (!name || !email) {
        hamStatus.textContent   = '> ERROR: CALLSIGN AND RETURN ADDRESS ARE REQUIRED.';
        hamStatus.style.color   = '#ff4444';
        hamStatus.style.display = 'block';
        return;
      }

      hamSubmit.disabled    = true;
      hamSubmit.textContent = '> VERIFYING IDENTITY...';
      hamStatus.style.display = 'none';

      try {
        const res = await fetch('/api/hub-access', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, email }),
        });

        let data = {};
        try { data = await res.json(); } catch { /* ignore */ }

        if (res.ok && data.success) {
          hamSubmit.textContent   = '> AUTHORIZED ✓ — CONNECTING...';
          hamSubmit.style.color   = 'var(--cyber-cyan)';
          hamStatus.textContent   = '> ACCESS GRANTED. REDIRECTING TO CYBER SECURITY HUB...';
          hamStatus.style.color   = 'var(--cyber-cyan)';
          hamStatus.style.display = 'block';
          setTimeout(() => {
            window.open(HUB_URL, '_blank', 'noopener,noreferrer');
            setTimeout(closeHubModal, 800);
          }, 900);
        } else {
          throw new Error(data.error || 'Verification failed');
        }
      } catch (err) {
        hamSubmit.textContent   = '> [AUTHORIZE & ACCESS HUB]';
        hamSubmit.style.color   = '';
        hamSubmit.disabled      = false;
        hamStatus.textContent   = `> ACCESS DENIED: ${err.message}`;
        hamStatus.style.color   = '#ff4444';
        hamStatus.style.display = 'block';
      }
    });
  }

  // ─── CONTACT FORM ─────────────────────────────────────────────
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const btn    = form.querySelector('.transmit-btn');
      const status = document.getElementById('form-status');

      const name    = form.querySelector('#contact-name').value.trim();
      const email   = form.querySelector('#contact-email').value.trim();
      const subject = form.querySelector('#contact-subject').value.trim();
      const message = form.querySelector('#contact-message').value.trim();

      // Basic client-side validation
      if (!name || !email || !message) {
        status.textContent = '> ERROR: CALLSIGN, RETURN ADDRESS, AND MESSAGE BODY ARE REQUIRED.';
        status.style.color  = '#ff4444';
        status.style.display = 'block';
        return;
      }

      // Lock UI during transmission
      btn.disabled    = true;
      btn.textContent = '> TRANSMITTING...';
      btn.style.color = 'var(--text-dim)';
      status.style.display = 'none';

      try {
        const res = await fetch('/api/contact', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, email, subject, message }),
        });

        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error('Server returned an unexpected response. Is the API server running?');
        }

        if (res.ok && data.success) {
          btn.textContent  = '> TRANSMISSION SENT ✓';
          btn.style.color  = 'var(--matrix-green)';
          status.textContent  = '> UPLINK ESTABLISHED — MESSAGE DELIVERED.';
          status.style.color  = 'var(--matrix-green)';
          status.style.display = 'block';
          form.reset();
          setTimeout(() => {
            btn.textContent  = '> [TRANSMIT]';
            btn.style.color  = '';
            btn.disabled     = false;
            status.style.display = 'none';
          }, 5000);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err) {
        btn.textContent  = '> [TRANSMIT]';
        btn.style.color  = '';
        btn.disabled     = false;
        status.textContent  = `> TRANSMISSION FAILED: ${err.message}`;
        status.style.color  = '#ff4444';
        status.style.display = 'block';
      }
    });
  }

})();
