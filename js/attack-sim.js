'use strict';

const STAGES = [
  {
    id: 'recon',
    phase: '01',
    label: 'Reconnaissance',
    tactic: 'Reconnaissance',
    techniqueId: 'T1589',
    techniqueName: 'Gather Victim Identity Information',
    severity: 'low',
    detectionConfidence: 20,
    isDetectionPoint: false,
    isCritical: false,
    isContainment: false,
    icon: '◈',
    summary: 'Threat actor performs passive OSINT against target organization.',
    details: [
      'LinkedIn scraping yields 847 employee profiles across IT, Finance, and Executive roles.',
      'GitHub commit history exposes internal domain <code>corp.internal</code> and mail server config fragments.',
      'Certificate Transparency logs reveal subdomain <code>vpn.corp.internal</code> — AnyConnect deployment confirmed.',
      'No active network interaction. Detection probability is extremely low at this stage.',
    ],
    iocs: [
      { label: 'LinkedIn profiles harvested', value: '847' },
      { label: 'Subdomains enumerated', value: '23' },
      { label: 'Target email format', value: 'first.last@corp.internal' },
    ],
    tools: ['Maltego', 'theHarvester', 'Shodan', 'crt.sh'],
    verdict: null,
  },
  {
    id: 'weaponize',
    phase: '02',
    label: 'Weaponization',
    tactic: 'Resource Development',
    techniqueId: 'T1583.001',
    techniqueName: 'Acquire Infrastructure: Domains',
    severity: 'medium',
    detectionConfidence: 35,
    isDetectionPoint: false,
    isCritical: false,
    isContainment: false,
    icon: '◉',
    summary: 'Adversary registers lookalike domain and deploys AiTM phishing infrastructure.',
    details: [
      'Domain <code>corp-internal-vpn[.]com</code> registered via privacy proxy 6 days prior to campaign launch.',
      'Evilginx2 reverse-proxy framework deployed on VPS — harvests session cookies post-authentication.',
      'TLS certificate issued by Let\'s Encrypt within 2 hours of domain registration.',
      'Phishing lure crafted to mimic Cisco AnyConnect MFA prompt — matches pixel-exact branding.',
    ],
    iocs: [
      { label: 'Lookalike domain', value: 'corp-internal-vpn[.]com' },
      { label: 'Hosting ASN', value: 'AS14061 DigitalOcean' },
      { label: 'Framework', value: 'Evilginx2 v3.2' },
    ],
    tools: ['Evilginx2', 'Let\'s Encrypt', 'GoPhish'],
    verdict: null,
  },
  {
    id: 'delivery',
    phase: '03',
    label: 'Delivery',
    tactic: 'Initial Access',
    techniqueId: 'T1566.002',
    techniqueName: 'Phishing: Spearphishing Link',
    severity: 'high',
    detectionConfidence: 72,
    isDetectionPoint: true,
    isCritical: false,
    isContainment: false,
    icon: '▶',
    summary: 'Spearphishing emails deliver AiTM proxy links to 23 targeted employees.',
    details: [
      'Emails spoofed from <code>it-support@corp.internal</code> — SPF/DKIM alignment bypassed via compromised relay.',
      '23 targeted recipients selected from Finance and IT Admin roles identified in recon phase.',
      'Lure: "Mandatory VPN certificate renewal — action required before end of business."',
      '<span class="atk-highlight">DETECTION OPPORTUNITY:</span> Email gateway logs show 4 messages flagged by URL reputation feed — 19 delivered.',
    ],
    iocs: [
      { label: 'Emails sent', value: '23' },
      { label: 'Emails delivered', value: '19' },
      { label: 'Phishing URL', value: 'hxxps://corp-internal-vpn[.]com/renew' },
      { label: 'Subject line', value: 'ACTION REQUIRED: VPN Certificate Renewal' },
    ],
    tools: ['GoPhish', 'Postfix relay', 'Evilginx2'],
    verdict: 'PARTIAL DETECTION — 4/23 emails blocked. 19 reached inbox.',
  },
  {
    id: 'access',
    phase: '04',
    label: 'Credential Theft',
    tactic: 'Credential Access',
    techniqueId: 'T1539',
    techniqueName: 'Steal Web Session Cookie',
    severity: 'critical',
    detectionConfidence: 91,
    isDetectionPoint: true,
    isCritical: true,
    isContainment: false,
    icon: '⬡',
    summary: 'Three employees authenticate through AiTM proxy — session tokens captured.',
    details: [
      '3 of 19 recipients clicked the phishing link. All 3 completed MFA — tokens captured post-auth by reverse proxy.',
      'Session cookies replayed from attacker IP <code>185.220.101.47</code> — MFA completely bypassed.',
      '<span class="atk-highlight">DETECTION OPPORTUNITY:</span> Impossible travel alert: same session token used from two geographically separate IPs within 4 minutes.',
      'SIEM generated <code>HIGH</code> alert — SOC analyst marked as false positive due to VPN policy miscommunication.',
    ],
    iocs: [
      { label: 'Users compromised', value: '3' },
      { label: 'Attacker IP', value: '185.220.101.47 (Tor exit)' },
      { label: 'Alert generated', value: 'Impossible Travel — HIGH' },
      { label: 'Alert disposition', value: 'FALSE POSITIVE (error)' },
    ],
    tools: ['Evilginx2 session harvest', 'Tor exit node'],
    verdict: 'MISSED DETECTION — Impossible travel alert dismissed by analyst.',
  },
  {
    id: 'persist',
    phase: '05',
    label: 'Persistence',
    tactic: 'Persistence',
    techniqueId: 'T1137.005',
    techniqueName: 'Office Application Startup: Outlook Rules',
    severity: 'critical',
    detectionConfidence: 88,
    isDetectionPoint: true,
    isCritical: true,
    isContainment: false,
    icon: '⬡',
    summary: 'Malicious Outlook rule and rogue MFA device registered to maintain access.',
    details: [
      'Attacker registers personal mobile as additional MFA device using the hijacked session — persistent authenticated access established.',
      'Outlook forwarding rule created: all emails containing keywords <code>password</code>, <code>invoice</code>, <code>wire</code> silently forwarded to <code>dropbox@proton[.]me</code>.',
      '<span class="atk-highlight">DETECTION OPPORTUNITY:</span> Azure AD logs record new MFA device from foreign IP — alert threshold not configured.',
      'Finance manager\'s mailbox begins exfiltrating business intelligence passively with no further attacker interaction.',
    ],
    iocs: [
      { label: 'Rogue MFA device', value: 'iPhone registered from RU IP' },
      { label: 'Forwarding rule target', value: 'dropbox@proton[.]me' },
      { label: 'Keywords monitored', value: 'password, invoice, wire, transfer' },
    ],
    tools: ['Microsoft Graph API', 'Outlook Web Access'],
    verdict: 'MISSED DETECTION — MFA registration alert threshold not configured.',
  },
  {
    id: 'discovery',
    phase: '06',
    label: 'Discovery',
    tactic: 'Discovery',
    techniqueId: 'T1087.002',
    techniqueName: 'Account Discovery: Domain Account',
    severity: 'high',
    detectionConfidence: 78,
    isDetectionPoint: true,
    isCritical: false,
    isContainment: false,
    icon: '◈',
    summary: 'Attacker enumerates AD users, groups, and shared drives via Microsoft Graph.',
    details: [
      'Microsoft Graph API queried for all users, groups, and SharePoint sites using the compromised Finance session.',
      'Enumeration yields 1,240 user accounts, 89 groups, and 14 SharePoint document libraries.',
      'Sensitive SharePoint library <code>/Finance/Q4-Projections</code> identified — contains M&A planning documents.',
      '<span class="atk-highlight">DETECTION OPPORTUNITY:</span> Unusual Graph API call volume (3,400 calls in 8 min) triggers anomaly baseline alert — <code>MEDIUM</code> severity.',
    ],
    iocs: [
      { label: 'Graph API calls', value: '3,400 in 8 minutes' },
      { label: 'Users enumerated', value: '1,240' },
      { label: 'SharePoint libraries', value: '14 discovered' },
      { label: 'Alert generated', value: 'Graph API anomaly — MEDIUM' },
    ],
    tools: ['Microsoft Graph API', 'AADInternals'],
    verdict: 'ALERTED — MEDIUM severity anomaly queued for next business day review.',
  },
  {
    id: 'exfil',
    phase: '07',
    label: 'Exfiltration',
    tactic: 'Exfiltration',
    techniqueId: 'T1048.003',
    techniqueName: 'Exfiltration Over Alternative Protocol: HTTPS',
    severity: 'critical',
    detectionConfidence: 94,
    isDetectionPoint: true,
    isCritical: true,
    isContainment: false,
    icon: '⬡',
    summary: '2.3 GB of M&A documents exfiltrated to attacker-controlled cloud storage.',
    details: [
      '2.3 GB of Q4 financial projections and M&A planning documents downloaded from SharePoint.',
      'Data exfiltrated via HTTPS POST requests to <code>rclone</code>-fronted Mega.nz bucket — encrypted in transit.',
      '<span class="atk-highlight">DETECTION OPPORTUNITY:</span> DLP rule triggers on bulk download of <code>/Finance/</code> path — <code>CRITICAL</code> alert escalated to SOC.',
      'SOC initiates incident response 47 minutes after exfiltration completes. Data already in attacker control.',
    ],
    iocs: [
      { label: 'Data volume', value: '2.3 GB' },
      { label: 'Exfil destination', value: 'Mega.nz (via rclone)' },
      { label: 'Protocol', value: 'HTTPS/TLS 1.3' },
      { label: 'Alert generated', value: 'DLP Bulk Download — CRITICAL' },
      { label: 'Time to detection', value: '47 min post-exfil' },
    ],
    tools: ['rclone', 'Mega.nz', 'SharePoint bulk download'],
    verdict: 'DETECTED — CRITICAL DLP alert. Response initiated 47 min after completion.',
  },
  {
    id: 'contain',
    phase: '08',
    label: 'Containment',
    tactic: 'Incident Response',
    techniqueId: 'RS:M01',
    techniqueName: 'Revoke Compromised Credentials',
    severity: 'contained',
    detectionConfidence: 100,
    isDetectionPoint: false,
    isCritical: false,
    isContainment: true,
    icon: '✓',
    summary: 'Incident contained. All adversary access revoked. Lessons learned documented.',
    details: [
      'All 3 compromised sessions revoked. Rogue MFA device removed. User passwords reset with forced re-enrollment.',
      'Malicious Outlook forwarding rules deleted. Exchange audit logs preserved for forensics.',
      'Blocking IOCs deployed: IP <code>185.220.101.47</code>, domain <code>corp-internal-vpn[.]com</code>, Mega.nz cloud storage egress.',
      'Post-incident: MFA registration alerting configured, impossible travel threshold lowered, DLP bulk download threshold reduced from 500MB to 50MB.',
    ],
    iocs: [
      { label: 'Sessions revoked', value: '3' },
      { label: 'MFA devices removed', value: '1' },
      { label: 'IOCs blocked', value: '14' },
      { label: 'Policy gaps remediated', value: '4' },
    ],
    tools: ['Azure AD Admin', 'Exchange Admin', 'SIEM', 'EDR'],
    verdict: 'CONTAINED — Full credential reset and IOC blocking complete.',
  },
];

(function () {
  const section = document.getElementById('attack-sim');
  if (!section) return;

  let currentIdx = 0;
  let autoTimer  = null;
  let hasStarted = false;

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const chain     = document.getElementById('atk-chain');
  const scrubber  = document.getElementById('atk-scrubber');
  const intel     = document.getElementById('atk-intel');
  const statusPhase = document.getElementById('atk-status-phase');
  const statusBadge = document.getElementById('atk-status-badge');
  const progressBar = document.getElementById('atk-progress-bar');
  const btnPrev   = document.getElementById('atk-prev');
  const btnNext   = document.getElementById('atk-next');
  const btnAuto   = document.getElementById('atk-auto');
  const btnReplay = document.getElementById('atk-replay');

  // ── Build chain ───────────────────────────────────────────────────────────
  function buildChain() {
    chain.innerHTML = '';
    STAGES.forEach((s, i) => {
      // Node row
      const row = document.createElement('div');
      row.className = 'atk-stage-row';
      row.dataset.idx = i;
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', `Stage ${s.phase}: ${s.label}`);

      const nodeClasses = ['atk-node', `atk-node-${s.severity}`];
      if (s.isCritical) nodeClasses.push('atk-node-crit');
      if (s.isContainment) nodeClasses.push('atk-node-contain');

      row.innerHTML = `
        <div class="${nodeClasses.join(' ')}" aria-hidden="true">${s.icon}</div>
        <div class="atk-stage-meta">
          <div class="atk-stage-phase">PHASE ${s.phase}</div>
          <div class="atk-stage-label">${s.label}</div>
          <div class="atk-stage-tactic">${s.tactic} · ${s.techniqueId}</div>
          ${s.isDetectionPoint ? '<span class="atk-badge atk-badge-detect">DETECTION POINT</span>' : ''}
          ${s.isCritical ? '<span class="atk-badge atk-badge-crit">CRITICAL</span>' : ''}
          ${s.isContainment ? '<span class="atk-badge atk-badge-contain">CONTAINED</span>' : ''}
        </div>
      `;

      row.addEventListener('click', () => goTo(i));
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); } });
      chain.appendChild(row);

      // Connector (between stages)
      if (i < STAGES.length - 1) {
        const conn = document.createElement('div');
        conn.className = 'atk-connector';
        conn.dataset.connIdx = i;
        chain.appendChild(conn);
      }
    });
  }

  // ── Build scrubber ────────────────────────────────────────────────────────
  function buildScrubber() {
    scrubber.innerHTML = '';
    STAGES.forEach((s, i) => {
      const pip = document.createElement('button');
      pip.className = `atk-scrub-pip atk-scrub-${s.severity}`;
      pip.dataset.idx = i;
      pip.setAttribute('aria-label', `Jump to ${s.label}`);
      pip.title = `${s.phase}: ${s.label}`;
      pip.addEventListener('click', () => goTo(i));
      scrubber.appendChild(pip);
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function goTo(idx) {
    currentIdx = Math.max(0, Math.min(STAGES.length - 1, idx));
    render();
  }

  function startAuto() {
    if (autoTimer) return;
    btnAuto.textContent = '[PAUSE]';
    btnAuto.classList.add('atk-btn-active');
    autoTimer = setInterval(() => {
      if (currentIdx >= STAGES.length - 1) {
        stopAuto();
      } else {
        goTo(currentIdx + 1);
      }
    }, 4000);
  }

  function stopAuto() {
    if (!autoTimer) return;
    clearInterval(autoTimer);
    autoTimer = null;
    btnAuto.textContent = '[AUTO]';
    btnAuto.classList.remove('atk-btn-active');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const stage = STAGES[currentIdx];

    // Update rows + connectors
    chain.querySelectorAll('.atk-stage-row').forEach((row, i) => {
      row.classList.toggle('atk-active',   i === currentIdx);
      row.classList.toggle('atk-done',     i < currentIdx);
      row.setAttribute('aria-current', i === currentIdx ? 'step' : 'false');
    });
    chain.querySelectorAll('.atk-connector').forEach((conn, i) => {
      conn.classList.toggle('atk-conn-active', i === currentIdx);
      conn.classList.toggle('atk-conn-done',   i < currentIdx);
    });

    // Scrubber pips
    scrubber.querySelectorAll('.atk-scrub-pip').forEach((pip, i) => {
      pip.classList.toggle('atk-scrub-active', i === currentIdx);
      pip.classList.toggle('atk-scrub-done',   i < currentIdx);
    });

    // Progress bar
    const pct = ((currentIdx) / (STAGES.length - 1)) * 100;
    progressBar.style.width = `${pct}%`;

    // Status bar
    statusPhase.textContent = `PHASE ${stage.phase} — ${stage.label.toUpperCase()}`;
    statusBadge.textContent = stage.severity.toUpperCase();
    statusBadge.className   = `atk-status-badge atk-severity-${stage.severity}`;

    // Buttons
    btnPrev.disabled = currentIdx === 0;
    btnNext.disabled = currentIdx === STAGES.length - 1;

    // Intel panel
    renderIntel(stage);
  }

  function renderIntel(s) {
    const confClass = s.detectionConfidence >= 80 ? 'atk-conf-high'
                    : s.detectionConfidence >= 50 ? 'atk-conf-med'
                    : 'atk-conf-low';

    const detailsHtml = s.details.map(d => `<li>${d}</li>`).join('');

    const iocsHtml = s.iocs.map(ioc => `
      <div class="atk-ioc-row">
        <span class="atk-ioc-label">${ioc.label}</span>
        <span class="atk-ioc-value">${ioc.value}</span>
      </div>
    `).join('');

    const toolsHtml = s.tools.map(t => `<span class="atk-tool-tag">${t}</span>`).join('');

    const verdictHtml = s.verdict ? `
      <div class="atk-verdict atk-verdict-${s.isCritical || s.severity === 'critical' ? 'miss' : s.isContainment ? 'contain' : 'detect'}">
        ${s.verdict}
      </div>
    ` : '';

    intel.innerHTML = `
      <div class="atk-intel-body">
        <div class="atk-intel-header">
          <div class="atk-intel-phase">PHASE ${s.phase} / ${STAGES.length.toString().padStart(2, '0')}</div>
          <div class="atk-intel-title">${s.label}</div>
          <div class="atk-intel-mitre">
            <span class="atk-mitre-tactic">${s.tactic}</span>
            <span class="atk-mitre-sep">›</span>
            <span class="atk-mitre-id">${s.techniqueId}</span>
            <span class="atk-mitre-name">${s.techniqueName}</span>
          </div>
        </div>

        <div class="atk-intel-summary">${s.summary}</div>

        <div class="atk-conf-block">
          <div class="atk-conf-label">Detection Confidence</div>
          <div class="atk-conf-bar-wrap">
            <div class="atk-conf-bar ${confClass}" style="width:${s.detectionConfidence}%"></div>
          </div>
          <div class="atk-conf-value ${confClass}">${s.detectionConfidence}%</div>
        </div>

        <div class="atk-intel-section">
          <div class="atk-intel-section-title">// ANALYST NOTES</div>
          <ul class="atk-detail-list">${detailsHtml}</ul>
        </div>

        <div class="atk-intel-section">
          <div class="atk-intel-section-title">// INDICATORS OF COMPROMISE</div>
          <div class="atk-ioc-grid">${iocsHtml}</div>
        </div>

        <div class="atk-intel-section">
          <div class="atk-intel-section-title">// TOOLS / TECHNIQUES</div>
          <div class="atk-tools-row">${toolsHtml}</div>
        </div>

        ${verdictHtml}
      </div>
    `;
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  btnPrev.addEventListener('click', () => { stopAuto(); goTo(currentIdx - 1); });
  btnNext.addEventListener('click', () => { stopAuto(); goTo(currentIdx + 1); });
  btnReplay.addEventListener('click', () => { stopAuto(); goTo(0); });
  btnAuto.addEventListener('click', () => { autoTimer ? stopAuto() : startAuto(); });

  // ── Keyboard nav ──────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (!isInViewport(section)) return;
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
      e.preventDefault(); stopAuto(); goTo(currentIdx + 1);
    } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
      e.preventDefault(); stopAuto(); goTo(currentIdx - 1);
    }
  });

  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  // ── IntersectionObserver — autoplay on first scroll into view ─────────────
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !hasStarted) {
      hasStarted = true;
      setTimeout(startAuto, 800);
      observer.disconnect();
    }
  }, { threshold: 0.25 });
  observer.observe(section);

  // ── Reduced motion — disable autoplay ────────────────────────────────────
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hasStarted = true; // prevent auto-start
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  buildChain();
  buildScrubber();
  render();
})();
