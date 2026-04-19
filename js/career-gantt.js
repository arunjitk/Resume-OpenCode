/* ================================================================
   CAREER-GANTT.JS — Interactive Career Progression Timeline
   Renders a Gantt-style chart showing overlapping roles, tools per
   company, and career progression. Click a bar to expand a mission
   briefing detail card.
   ================================================================ */

(function () {
  'use strict';

  // ─── TIMELINE DATA ────────────────────────────────────────────
  // Dates as decimal years for positioning (year + month/12)
  const TIMELINE_START = 2018.17; // March 2018
  const TIMELINE_END   = 2026.0;  // Dec 2025 (shown as "present")

  const MISSIONS = [
    {
      id:        'mission-04',
      company:   'SISA INFORMATION SECURITY',
      codename:  'OPERATION WATCHGUARD',
      role:      'Security Analyst',
      start:     2018.17,   // Mar 2018
      end:       2020.67,   // Sep 2020
      color:     '#00F0FF',
      tools:     ['ELK Stack', 'SIEM', 'GRC / ISO 27001', 'Dashboard Dev', 'Log Correlation'],
      icon:      '🔍',
      briefing: {
        context:    'First SOC role — built log analysis infrastructure and security dashboards from scratch using ELK Stack. Established baseline detection rules and security governance frameworks.',
        highlights: [
          'Designed real-time log correlation dashboards in ELK',
          'Implemented security governance policies aligned to ISO 27001 / PCI DSS',
          'Conducted vulnerability assessments across enterprise infrastructure',
          'Authored internal threat intelligence reports and SOC runbooks',
        ],
        impact: 'Reduced MTTD from 72h to 8h through custom detection rule sets.',
        clearance: 'INTERNAL',
      },
    },
    {
      id:        'mission-03',
      company:   'ANI TECHNOLOGIES (OLA CABS)',
      codename:  'OPERATION RIDEGUARD',
      role:      'Security Operations Engineer',
      start:     2020.75,   // Oct 2020
      end:       2022.42,   // May 2022
      color:     '#FF6B00',
      tools:     ['Cortex XDR', 'Sumologic SIEM', 'AWS', 'Azure', 'PCI DSS', 'RBI Compliance'],
      icon:      '🚗',
      briefing: {
        context:    'Led security operations for India\'s largest ride-hailing platform. Managed cloud security across AWS/Azure at scale, with regulatory compliance across PCI DSS, RBI, and GDPR frameworks.',
        highlights: [
          'Managed SIEM (Sumologic) across 40M+ user transaction events per day',
          'Deployed Cortex XDR for endpoint threat detection across 600+ endpoints',
          'Achieved PCI DSS Level 1 compliance certification',
          'Implemented email forensics workflow reducing phishing response time by 60%',
          'Managed CAN bus & EV telemetry security for connected vehicle fleet',
        ],
        impact: 'Zero major security breaches during tenure across 40M+ active user accounts.',
        clearance: 'CONFIDENTIAL',
      },
    },
    {
      id:        'mission-02',
      company:   'TRELLIX (FORMERLY MCAFEE/FIREEYE)',
      codename:  'OPERATION FIRESTORM',
      role:      'SOC Lead — India',
      start:     2022.42,   // Jun 2022
      end:       2025.42,   // Jun 2025
      color:     '#FF00FF',
      tools:     ['Trellix EDR', 'Trellix Helix', 'Trellix ePO', 'AWS', 'Azure', 'Cofense', 'SecureWorks Taegis'],
      icon:      '🔥',
      briefing: {
        context:    'Led India SOC operations for a Fortune 500 cybersecurity vendor. Managed a cross-functional team of analysts handling enterprise threat detection at scale using the full Trellix product suite.',
        highlights: [
          'Led tier-2/3 SOC team of 12 analysts across incident triage, threat hunting, and IR',
          'Deployed automated playbooks cutting MTTR by 45% across 200+ enterprise clients',
          'Architected detection use cases across AWS CloudTrail, Azure Sentinel, and Trellix Helix',
          'Led red team exercises and purple team engagements for enterprise customers',
          'Managed SLAs, KPIs, and executive security briefings for BU leadership',
        ],
        impact: 'Elevated SOC maturity from Level 2 to Level 4 (CMMC) within 18 months.',
        clearance: 'SECRET',
      },
    },
    {
      id:        'mission-01',
      company:   'SMARSH',
      codename:  'OPERATION GENESIS',
      role:      'Senior Security Analyst III',
      start:     2025.5,    // Jul 2025
      end:       TIMELINE_END,
      color:     '#00FF41',
      tools:     ['CrowdStrike Falcon', 'SOAR Automation', 'Threat Hunting', 'Detection Engineering', 'Cloud SIEM'],
      icon:      '⚡',
      isActive:  true,
      briefing: {
        context:    'Current operative role — Senior Security Analyst III at a leading archiving and compliance technology firm. Managing advanced threat detection and incident response for a global enterprise environment.',
        highlights: [
          'Driving SOC lifecycle modernization with automated detection playbooks',
          'Implementing advanced threat hunting hypotheses across CrowdStrike telemetry',
          'Building SOAR-driven response workflows reducing analyst toil by 40%',
          'Developing detection engineering standards and use-case documentation',
        ],
        impact: 'ACTIVE OPERATION — details classified.',
        clearance: 'TOP SECRET',
      },
    },
  ];

  // ─── STATE ─────────────────────────────────────────────────────
  let activeMissionId = null;

  // ─── RENDER ────────────────────────────────────────────────────
  function render() {
    const wrap = document.getElementById('career-gantt-wrap');
    if (!wrap) return;

    const totalSpan = TIMELINE_END - TIMELINE_START;

    // Build year ruler
    const years = [];
    for (let y = Math.ceil(TIMELINE_START); y <= Math.floor(TIMELINE_END) + 1; y++) {
      years.push(y);
    }

    const rulerHtml = years.map(y => {
      const pct = ((y - TIMELINE_START) / totalSpan) * 100;
      return `<div class="gantt-year-mark" style="left:${pct.toFixed(2)}%">
        <div class="gantt-year-tick" aria-hidden="true"></div>
        <span class="gantt-year-label">${y}</span>
      </div>`;
    }).join('');

    // Build rows
    const rowsHtml = MISSIONS.map(m => {
      const startPct = Math.max(0, ((m.start - TIMELINE_START) / totalSpan) * 100);
      const endPct   = Math.min(100, ((m.end   - TIMELINE_START) / totalSpan) * 100);
      const widthPct = endPct - startPct;

      const toolChips = m.tools.slice(0, 5).map(t =>
        `<span class="gantt-tool-chip">${t}</span>`
      ).join('');

      const duration = m.isActive
        ? `${formatDate(m.start)} — PRESENT`
        : `${formatDate(m.start)} — ${formatDate(m.end)}`;

      return `
        <div class="gantt-row" data-mission="${m.id}">
          <div class="gantt-row-label">
            <span class="gantt-company-abbr" title="${m.company}">${companyAbbr(m.company)}</span>
          </div>
          <div class="gantt-track-area" role="presentation">
            <button
              class="gantt-bar ${m.isActive ? 'gantt-bar--active' : ''}"
              style="left:${startPct.toFixed(2)}%; width:${widthPct.toFixed(2)}%; border-color:${m.color};"
              data-mission="${m.id}"
              aria-label="Click to expand ${m.company} mission briefing"
              aria-expanded="false"
            >
              <span class="gantt-bar-icon">${m.icon}</span>
              <span class="gantt-bar-role">${m.role}</span>
              <span class="gantt-bar-duration">${duration}</span>
              <div class="gantt-tool-chips" aria-hidden="true">${toolChips}</div>
              ${m.isActive ? '<span class="gantt-active-pulse" aria-hidden="true"></span>' : ''}
            </button>
          </div>
        </div>`;
    }).join('');

    wrap.innerHTML = `
      <div class="gantt-ruler" aria-hidden="true">
        <div class="gantt-ruler-spacer"></div>
        <div class="gantt-ruler-track">${rulerHtml}</div>
      </div>
      <div class="gantt-rows" role="list" aria-label="Career timeline">${rowsHtml}</div>
      <div class="gantt-briefing" id="gantt-briefing" aria-live="polite" aria-label="Mission briefing detail"></div>
    `;

    // Wire click handlers
    wrap.querySelectorAll('.gantt-bar').forEach(btn => {
      btn.addEventListener('click', () => toggleBriefing(btn.dataset.mission, btn));
    });
  }

  // ─── TOGGLE MISSION BRIEFING ────────────────────────────────────
  function toggleBriefing(missionId, btn) {
    const panel = document.getElementById('gantt-briefing');
    if (!panel) return;

    // Close if clicking the same bar again
    if (activeMissionId === missionId) {
      panel.innerHTML = '';
      panel.classList.remove('gantt-briefing--open');
      document.querySelectorAll('.gantt-bar').forEach(b => b.setAttribute('aria-expanded', 'false'));
      activeMissionId = null;
      return;
    }

    activeMissionId = missionId;
    const mission   = MISSIONS.find(m => m.id === missionId);
    if (!mission) return;

    // Update aria states
    document.querySelectorAll('.gantt-bar').forEach(b => {
      b.setAttribute('aria-expanded', b.dataset.mission === missionId ? 'true' : 'false');
    });

    const allToolChips = mission.tools.map(t =>
      `<span class="gantt-tool-chip">${t}</span>`
    ).join('');

    const highlights = mission.briefing.highlights.map(h =>
      `<li class="gantt-brief-li"><span class="gantt-brief-bullet">›</span>${h}</li>`
    ).join('');

    panel.innerHTML = `
      <div class="gantt-brief-card" style="--mission-color:${mission.color}">
        <div class="gantt-brief-header">
          <div class="gantt-brief-meta">
            <span class="gantt-brief-codename">${mission.codename}</span>
            <span class="gantt-brief-clearance gantt-brief-clearance--${mission.briefing.clearance.toLowerCase().replace(' ', '-')}">
              ■ ${mission.briefing.clearance}
            </span>
          </div>
          <h3 class="gantt-brief-company">${mission.icon}&nbsp; ${mission.company}</h3>
          <div class="gantt-brief-role">${mission.role}
            <span class="gantt-brief-period">&nbsp;|&nbsp; ${formatDate(mission.start)} — ${mission.isActive ? 'PRESENT' : formatDate(mission.end)}</span>
          </div>
        </div>

        <div class="gantt-brief-body">
          <div class="gantt-brief-section">
            <div class="gantt-brief-label">// MISSION CONTEXT</div>
            <p class="gantt-brief-context">${mission.briefing.context}</p>
          </div>

          <div class="gantt-brief-section">
            <div class="gantt-brief-label">// KEY OPERATIONS</div>
            <ul class="gantt-brief-list">${highlights}</ul>
          </div>

          <div class="gantt-brief-section">
            <div class="gantt-brief-label">// TOOLS DEPLOYED</div>
            <div class="gantt-tool-chips gantt-tool-chips--full">${allToolChips}</div>
          </div>

          <div class="gantt-brief-impact">
            <span class="gantt-brief-impact-label">IMPACT:</span>
            <span class="gantt-brief-impact-text">${mission.briefing.impact}</span>
          </div>
        </div>

        <button class="gantt-brief-close" data-mission="${missionId}" aria-label="Close mission briefing">[CLOSE]</button>
      </div>
    `;

    panel.classList.add('gantt-briefing--open');

    // Scroll briefing into view
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);

    panel.querySelector('.gantt-brief-close').addEventListener('click', () => {
      panel.innerHTML = '';
      panel.classList.remove('gantt-briefing--open');
      document.querySelectorAll('.gantt-bar').forEach(b => b.setAttribute('aria-expanded', 'false'));
      activeMissionId = null;
    });
  }

  // ─── HELPERS ──────────────────────────────────────────────────
  function formatDate(decimal) {
    const year  = Math.floor(decimal);
    const month = Math.round((decimal - year) * 12);
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${MONTHS[month] || MONTHS[0]} ${year}`;
  }

  function companyAbbr(name) {
    const abbrs = {
      'SISA INFORMATION SECURITY':        'SISA',
      'ANI TECHNOLOGIES (OLA CABS)':      'OLA',
      'TRELLIX (FORMERLY MCAFEE/FIREEYE)':'TRELLIX',
      'SMARSH':                            'SMARSH',
    };
    return abbrs[name] || name.split(' ')[0];
  }

  // ─── INIT ─────────────────────────────────────────────────────
  function init() {
    if (!document.getElementById('career-gantt-wrap')) return;
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
