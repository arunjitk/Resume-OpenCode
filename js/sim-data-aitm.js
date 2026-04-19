/* ================================================================
   SIM-DATA-AITM.JS — 8-Stage AiTM Phishing / BEC Scenario
   Evilginx2-based Adversary-in-the-Middle campaign
   targeting Microsoft 365 with MFA bypass and BEC outcome
   ================================================================ */

window.SIM_SCENARIO = {
  id:            'IR-2024-0612',
  name:          'AiTM PHISHING ATTACK SIMULATION',
  malwareFamily: 'EVILGINX2',
  threatActor:   'APT-FIN11',
  host:          'mail.corp-target.com',
  description:   '8-stage Adversary-in-the-Middle phishing campaign — MFA bypass, session hijacking, and Business Email Compromise.',

  stages: [

    /* ── STAGE 01 ─────────────────────────────────────────────── */
    {
      id: 1, code: 'RECON', label: 'Infrastructure Setup',
      tactic: 'Resource Development', techniqueId: 'T1583.001',
      techniqueName: 'Acquire Infrastructure: Domains',
      color: '#FF6B00', severity: 'MEDIUM', confidence: 'HIGH',
      timeOffset: 0,

      missionLog: 'Threat actor APT-FIN11 registered typosquat domains mimicking the target\'s Microsoft 365 login portal 72 hours before the attack. Evilginx2 proxy infrastructure deployed on VPS nodes across 4 countries. Email sending infrastructure established with valid SPF/DKIM records to bypass basic filters.',

      behavior: [
        'Typosquat domain registered: microsoftonline-auth[.]com',
        'Evilginx2 phishlet configured for Microsoft 365 authentication flow',
        'LetsEncrypt TLS certificate issued to attacker domain (valid HTTPS)',
        'High-reputation VPS hosts used to avoid IP blacklisting',
        'SPF and DKIM records configured on sending domain for email auth bypass',
      ],
      telemetry: ['Passive DNS monitoring', 'Threat intel domain registration feeds', 'Certificate Transparency log monitoring', 'Brand protection services', 'WHOIS monitoring alerts'],
      detection: 'Newly registered domain with high visual similarity to corporate authentication portal. Certificate Transparency log shows fresh TLS cert on lookalike domain. Domain registered 72–96 hours before campaign — typical attack preparation window.',
      iocs: ['microsoftonline-auth[.]com (registered 72h pre-attack)', 'NS: ns1.vpsnet[.]ru', 'Cert: CN=microsoftonline-auth[.]com (LetsEncrypt)', 'IP: 185.220.101.47 (known VPS range)'],
      analystAction: 'Submit lookalike domain to takedown process. Add to proxy/DNS blocklist. Alert Microsoft brand protection team. Monitor for related domains via CT logs.',
      whyItMatters: 'Catching attacker infrastructure during setup — before any phishing email is sent — allows disruption of the entire campaign at no cost to the organization.',
    },

    /* ── STAGE 02 ─────────────────────────────────────────────── */
    {
      id: 2, code: 'LURE', label: 'Phishing Delivery',
      tactic: 'Initial Access', techniqueId: 'T1566.002',
      techniqueName: 'Spearphishing Link',
      color: '#FF4500', severity: 'HIGH', confidence: 'HIGH',
      timeOffset: 4320,

      missionLog: 'At 08:45 UTC the campaign dispatched 47 targeted phishing emails to CFO and finance team members. Lure theme: Microsoft 365 shared document notification with urgency trigger ("Q3 financial report — access expires in 24 hours"). Email passed SPF/DKIM validation. Link redirected through legitimate redirect chain before landing on Evilginx2 proxy.',

      behavior: [
        'Email from: microsoft-shared-docs@corp-mailer[.]com (DKIM valid)',
        'Redirect chain: bit.ly → legitimate CDN → microsoftonline-auth[.]com',
        'Landing page is pixel-perfect Microsoft 365 login clone (proxied live)',
        'Urgency trigger: "Your access expires in 24 hours" in email body',
        '47 targets in finance and executive staff — spearphished via LinkedIn recon',
      ],
      telemetry: ['Email security gateway logs (DKIM pass)', 'URL sandboxing / detonation', 'Proxy click-through logs', 'User-reported phishing (SOAR)', 'O365 audit trail — email delivery'],
      detection: 'Redirect chain passing through link-shortener before landing on uncategorized domain. Email with financial urgency language. O365 authentication attempt from unusual geographic location immediately after email delivery.',
      iocs: ['microsoftonline-auth[.]com in clicked URL', 'From: microsoft-shared-docs@corp-mailer[.]com', 'Redirect: bit.ly/3xKw9mF → microsoftonline-auth[.]com', 'Subject: "[Shared] Q3 Financial Report — Access Expires"'],
      analystAction: 'Block link-shortener redirect destination at proxy. Pull email from all 47 inboxes. Notify all recipients. Check O365 audit log for authentication events in window following email delivery.',
      whyItMatters: 'DKIM-valid phishing emails bypassing email security gateways illustrate why technical email controls alone are insufficient — employee awareness and URL sandboxing are critical layers.',
    },

    /* ── STAGE 03 ─────────────────────────────────────────────── */
    {
      id: 3, code: 'AITM', label: 'AiTM Proxy Intercept',
      tactic: 'Credential Access', techniqueId: 'T1557.002',
      techniqueName: 'AiTM Phishing',
      color: '#9B59B6', severity: 'CRITICAL', confidence: 'HIGH',
      timeOffset: 4680,

      missionLog: 'CFO\'s executive assistant (Emma Wheeler) clicked the phishing link at 09:33 UTC and completed the Microsoft 365 MFA challenge on the Evilginx2 proxy page. Both the password and the session cookie were captured in real-time by the proxy before being relayed to Microsoft. MFA was fully satisfied — Evilginx2 captured an authenticated session token.',

      behavior: [
        'Evilginx2 acts as reverse proxy between victim and real Microsoft login',
        'User completes full MFA (SMS OTP / Authenticator) — proxy relays in real time',
        'Victim receives legitimate Microsoft 365 dashboard (no error, no suspicion)',
        'Evilginx2 captures: username, password, authenticated session cookie',
        'Session cookie is MFA-bound — no password replay needed for hijack',
      ],
      telemetry: ['O365 sign-in logs (successful auth from proxy IP)', 'Conditional Access evaluation logs', 'Evilginx2 capture log (attacker-side)', 'Browser device fingerprint delta', 'Risky Sign-In alert (if Entra ID P2 licensed)'],
      detection: 'Successful O365 authentication from an IP not matching the user\'s usual ASN/country. Sign-in immediately following phishing email receipt. Entra ID Risky Sign-In flag if P2 licensed. Same session used from two geographically disparate IPs.',
      iocs: ['O365 sign-in: 185.220.101.47 (proxy IP, not user\'s ISP)', 'User-Agent mismatch between phishing session and normal session', 'OAuth token issued at 09:33:47 UTC from proxy IP', 'Session cookie: eas_sid=...xG9a7... (captured by Evilginx)'],
      analystAction: 'Immediately revoke all active sessions for affected account (Revoke-AzureADUserAllRefreshTokens). Force re-authentication. Review O365 audit log for actions taken post-compromise. Notify user.',
      whyItMatters: 'AiTM completely defeats SMS OTP and push-notification MFA — only phishing-resistant MFA (FIDO2 hardware keys, certificate-based auth) prevents this attack at authentication time.',
    },

    /* ── STAGE 04 ─────────────────────────────────────────────── */
    {
      id: 4, code: 'HIJACK', label: 'Session Hijack',
      tactic: 'Credential Access', techniqueId: 'T1550.004',
      techniqueName: 'Web Session Cookie',
      color: '#FF1744', severity: 'CRITICAL', confidence: 'HIGH',
      timeOffset: 4860,

      missionLog: 'Attacker imported the captured session cookie into a browser at 09:36 UTC and gained full authenticated access to Emma Wheeler\'s Microsoft 365 account — Outlook, SharePoint, Teams, and OneDrive. No password or MFA required. Attacker began email reconnaissance, reading CFO correspondence and mapping approval workflows.',

      behavior: [
        'Session cookie injected into attacker browser (cookie editor extension)',
        'Full access to Outlook, Teams, SharePoint, OneDrive without re-auth',
        'Attacker reads 6 months of CFO/Finance email threads (reconnaissance)',
        'Identifies active vendor payment approval workflow and key approvers',
        'Maps invoice format, approval chain, and upcoming large transactions',
      ],
      telemetry: ['O365 audit log — MailItemsAccessed', 'O365 audit log — FileSyncUploadedFull (OneDrive access)', 'Unified Audit Log — unusual IP reading mail', 'Entra ID Risky Session alert', 'MCAS (Defender for Cloud Apps) impossible travel'],
      detection: 'O365 MailItemsAccessed events from an IP not in the user\'s normal ISN. Impossible travel: user authenticated from London 3 minutes after authenticating from Singapore. Bulk email reading in short window is anomalous.',
      iocs: ['MailItemsAccessed from IP 185.220.101.47', 'Impossible travel alert: London → Singapore in 3 min', 'User-Agent: Mozilla/5.0 (X11; Linux x86_64)... (Linux — unusual for exec)', 'Session duration: 47 min continuous with no idle time'],
      analystAction: 'Revoke all sessions immediately. Enable Continuous Access Evaluation (CAE) if not already active. Pull full O365 audit log for the last 24h for this account. Determine scope of email data accessed.',
      whyItMatters: 'A stolen authenticated session bypasses every access control tied to identity verification — the attacker is the user, authenticated, with the user\'s full permissions.',
    },

    /* ── STAGE 05 ─────────────────────────────────────────────── */
    {
      id: 5, code: 'PERSIST', label: 'OAuth Persistence',
      tactic: 'Persistence', techniqueId: 'T1098.003',
      techniqueName: 'Account Manipulation: OAuth Tokens',
      color: '#F39C12', severity: 'HIGH', confidence: 'HIGH',
      timeOffset: 5100,

      missionLog: 'At 09:48 UTC attacker registered an OAuth application "Microsoft Integration Tool" in the victim\'s Entra ID tenant using the hijacked admin-adjacent session. Application granted Mail.Read, Mail.ReadWrite, Files.ReadWrite.All permissions. This creates a persistent access path that survives password resets.',

      behavior: [
        'OAuth app "Microsoft Integration Tool" registered in Entra ID',
        'App granted: Mail.Read, Mail.ReadWrite, Files.ReadWrite.All delegated perms',
        'App consent granted using hijacked session (no admin approval required)',
        'Refresh token issued to attacker app — survives password reset',
        'App registered with attacker-controlled redirect URI for token interception',
      ],
      telemetry: ['Entra ID audit log — App Registration events', 'O365 audit log — Add app role assignment', 'OAuth consent grant logs', 'MCAS OAuth app anomaly alert', 'SIEM: new app with broad permissions alert'],
      detection: 'New OAuth application registered during an anomalous login session. Broad email and file permissions granted without IT approval workflow. App registered with an external redirect URI not matching corporate domains.',
      iocs: ['App ID: 8f3a2b1c-d4e5-6789-abcd-ef0123456789', 'App Name: "Microsoft Integration Tool"', 'Permissions: Mail.Read, Mail.ReadWrite, Files.ReadWrite.All', 'Redirect URI: https://oauth-callback.microsoftonline-auth[.]com'],
      analystAction: 'Delete the rogue OAuth application immediately. Revoke all tokens associated with app. Audit all OAuth apps registered in last 30 days. Enable admin consent workflow for all OAuth app registrations.',
      whyItMatters: 'OAuth app persistence survives password resets and additional MFA — it is frequently overlooked during IR and enables continued access weeks after the initial compromise is remediated.',
    },

    /* ── STAGE 06 ─────────────────────────────────────────────── */
    {
      id: 6, code: 'BEC', label: 'Business Email Compromise',
      tactic: 'Collection', techniqueId: 'T1534',
      techniqueName: 'Internal Spearphishing',
      color: '#FF00FF', severity: 'CRITICAL', confidence: 'HIGH',
      timeOffset: 6000,

      missionLog: 'At 10:24 UTC attacker sent a BEC email from Emma Wheeler\'s real O365 mailbox to the CFO (David Chen) requesting an urgent wire transfer of $186,000 to a new vendor account, referencing the real Q3 project identified during reconnaissance. Email intercepted inbox rules created to auto-delete any bounces or CFO replies to Emma.',

      behavior: [
        'Inbox rule created to delete emails containing "wire" and "transfer" from inbox',
        'BEC email sent from real Emma Wheeler O365 account to CFO',
        'References real Q3 project name and recent vendor conversation (recon-informed)',
        'Wire transfer request for $186,000 to "StellarEdge Consulting Ltd" (shell company)',
        'Urgency framing: "Vendor closes books today — need confirmation by 11:00"',
      ],
      telemetry: ['O365 audit log — New-InboxRule (auto-delete)', 'O365 audit log — SendAs / Send email events', 'SIEM BEC detection rule (financial keywords + new rule)', 'MCAS: mass email send from new IP', 'Message trace log'],
      detection: 'New inbox rule created during anomalous session that deletes emails containing financial keywords. Email to CFO referencing wire transfer originating from an atypical IP. Financial request with urgency trigger and new beneficiary account.',
      iocs: ['New-InboxRule: delete messages containing "wire","transfer","confirm" (10:22 UTC)', 'Email from emma.wheeler@corp-target.com to cfo@corp-target.com at 10:24 UTC', 'Wire instructions to: StellarEdge Consulting Ltd, Account: GB29NWBK60161331926819', 'Amount: $186,000 USD'],
      analystAction: 'Call CFO directly to prevent wire transfer. Delete rogue inbox rules. Pull full send-as log for the account. Alert finance team to halt any pending wire initiated in this window. Contact bank if wire was executed.',
      whyItMatters: 'BEC is the highest-impact phishing outcome in financial terms — the FBI IC3 reports BEC as the #1 cybercrime by financial loss, averaging over $4.9 billion annually.',
    },

    /* ── STAGE 07 ─────────────────────────────────────────────── */
    {
      id: 7, code: 'EXFIL', label: 'Data Exfiltration',
      tactic: 'Exfiltration', techniqueId: 'T1567.002',
      techniqueName: 'Exfil to Cloud Storage',
      color: '#FF1744', severity: 'CRITICAL', confidence: 'HIGH',
      timeOffset: 6300,

      missionLog: 'Simultaneously with the BEC email, attacker used the OAuth app\'s Files.ReadWrite.All permission to exfiltrate 2.3 GB of SharePoint financial documents at 10:28 UTC — syncing them directly to an attacker-controlled OneDrive account via Microsoft Graph API. Transfer blends with normal SharePoint sync traffic.',

      behavior: [
        'Graph API calls via registered OAuth app using refresh tokens (no re-auth)',
        'Files.ReadWrite.All permission used to enumerate and download SharePoint',
        'GET /sites/{site-id}/drive/root/children — recursively enumerates docs',
        '2.3 GB of financial documents synced to attacker OneDrive via Graph API',
        'Transfer mimics legitimate M365 sync — no external egress detected by DLP',
      ],
      telemetry: ['O365 unified audit log — FileDownloaded, FileSyncDownloadedFull', 'Graph API activity log', 'MCAS data exfiltration alert (volume anomaly)', 'SharePoint audit log — bulk download', 'DLP (cloud-to-cloud exfil often missed)'],
      detection: 'Bulk SharePoint file download via Graph API from a registered OAuth app with an external redirect URI. 2.3 GB transfer in 8 minutes. Access originating from a non-standard ASN. MCAS volume anomaly alert on SharePoint activity.',
      iocs: ['Graph API client_id: 8f3a2b1c-d4e5-6789-abcd-ef0123456789', 'FileDownloaded: 847 files in 8 minutes from /Finance/Documents/', 'Destination: attacker OneDrive (tenant: onedrive-ext-storage[.]com)', 'Transfer volume: 2.3 GB via Graph API at 10:28 UTC'],
      analystAction: 'Revoke all OAuth app tokens via Graph API. Identify all files accessed via the app. Notify DPO — M365 data exfil may trigger GDPR/breach reporting obligations. Request Microsoft Preservation Order if needed.',
      whyItMatters: 'Cloud-to-cloud exfiltration via trusted APIs like Microsoft Graph is invisible to traditional network DLP and firewall monitoring — dedicated CASB/MCAS controls are essential.',
    },

    /* ── STAGE 08 ─────────────────────────────────────────────── */
    {
      id: 8, code: 'CTN', label: 'Containment',
      tactic: 'Incident Response', techniqueId: null,
      techniqueName: 'Analyst Response / Remediation',
      color: '#00FF41', severity: 'RESOLVED', confidence: 'HIGH',
      timeOffset: 7200,

      missionLog: 'IR team contained the incident at 11:00 UTC. Attacker\'s session revoked, OAuth app deleted, Emma Wheeler account reset with FIDO2 token enforced. Wire transfer halted (CFO notified directly). Bank notified. DPO engaged for 72-hour GDPR breach notification assessment. Total dwell time: 1 hour 27 minutes.',

      behavior: [
        'Revoke-AzureADUserAllRefreshTokens executed for Emma Wheeler account',
        'OAuth app "Microsoft Integration Tool" deleted from Entra ID',
        'All inbox rules created in last 24h reviewed and removed',
        'Account password reset + FIDO2 hardware key enrolled (mandatory)',
        'Wire transfer notification sent to CFO directly via phone (not email)',
        'Microsoft Security contacted for Graph API activity preservation',
      ],
      telemetry: ['Entra ID audit log — session revocation complete', 'O365 audit log — admin app deletion', 'Bank confirmation — wire transfer halted', 'DPO breach assessment log', 'MCAS — all anomalous activity ceased post-remediation'],
      detection: 'Zero attacker activity post-containment. OAuth app token retry attempts at 11:03 UTC returned 401 Unauthorized. BEC wire transfer cancelled by bank at 11:07 UTC (funds not yet cleared).',
      iocs: ['RESOLVED: microsoftonline-auth[.]com — blocked at proxy', 'RESOLVED: OAuth App 8f3a2b1c — deleted', 'RESOLVED: Session tokens — all revoked 11:00 UTC', 'Wire: $186,000 — HALTED by bank at 11:07 UTC'],
      analystAction: 'Complete incident report. Enforce phishing-resistant MFA (FIDO2) org-wide. Review Conditional Access policies. Enable admin consent workflow for OAuth apps. Brief finance team on BEC wire verification procedures.',
      whyItMatters: 'This incident illustrates that MFA alone is not sufficient against AiTM — phishing-resistant FIDO2 authentication, Continuous Access Evaluation, and MCAS monitoring are required to close this attack surface.',
    },

  ],
};
