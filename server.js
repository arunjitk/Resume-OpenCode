'use strict';

require('dotenv').config();

const express = require('express');
const path    = require('path');
const { Resend } = require('resend');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve built static files
app.use(express.static(path.join(__dirname, 'dist')));

// ── /api/contact ─────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const results = { email: false, telegram: false };
  const errors  = [];

  // ── Email via Resend ──────────────────────────────────────────────────────
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to:      ['arunjithk07@gmail.com'],
      replyTo: email,
      subject: `[Portfolio] ${subject || 'New Contact Message'}`,
      html: `
        <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;
                    padding:28px 32px;border-radius:8px;
                    border:1px solid #00ff4133;max-width:600px;">
          <h2 style="color:#00ff41;margin-top:0;letter-spacing:0.15em;">
            ⚡ NEW PORTFOLIO CONTACT
          </h2>
          <hr style="border:none;border-top:1px solid #00ff4133;margin:16px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="color:#888;padding:6px 0;width:90px;vertical-align:top;">Name</td>
              <td style="padding:6px 0;color:#e0e0e0;">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="color:#888;padding:6px 0;vertical-align:top;">Email</td>
              <td style="padding:6px 0;">
                <a href="mailto:${escapeHtml(email)}" style="color:#00aaff;">${escapeHtml(email)}</a>
              </td>
            </tr>
            <tr>
              <td style="color:#888;padding:6px 0;vertical-align:top;">Subject</td>
              <td style="padding:6px 0;color:#e0e0e0;">${escapeHtml(subject || '—')}</td>
            </tr>
          </table>
          <div style="margin-top:20px;">
            <div style="color:#888;margin-bottom:8px;">Message</div>
            <div style="background:#111;border-left:3px solid #00ff41;
                        padding:14px 16px;border-radius:4px;
                        white-space:pre-wrap;color:#e0e0e0;line-height:1.6;">
              ${escapeHtml(message)}
            </div>
          </div>
        </div>
      `,
    });

    results.email = true;
  } catch (err) {
    console.error('[Resend error]', err.message);
    errors.push(`Email: ${err.message}`);
  }

  // ── Telegram ──────────────────────────────────────────────────────────────
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) throw new Error('Telegram credentials not configured');

    const text = [
      '⚡ *New Portfolio Contact*',
      '',
      `👤 *Name:*    ${name}`,
      `📧 *Email:*   ${email}`,
      `📋 *Subject:* ${subject || '—'}`,
      '',
      '💬 *Message:*',
      message,
    ].join('\n');

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
      }
    );

    if (!tgRes.ok) {
      const body = await tgRes.json();
      throw new Error(body.description || 'Telegram API error');
    }

    results.telegram = true;
  } catch (err) {
    console.error('[Telegram error]', err.message);
    errors.push(`Telegram: ${err.message}`);
  }

  if (!results.email && !results.telegram) {
    return res.status(500).json({ error: 'Failed to send notifications', details: errors });
  }

  return res.status(200).json({ success: true, ...results });
});

// ── /api/download-lead ────────────────────────────────────────────────────────
app.post('/api/download-lead', async (req, res) => {
  const { name, email, phone } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const text = [
        '📥 *Resume Download Request*',
        '',
        `👤 *Name:*  ${name}`,
        `📧 *Email:* ${email}`,
        `📱 *Phone:* ${phone || '—'}`,
      ].join('\n');

      const tgRes = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
        }
      );

      if (!tgRes.ok) {
        const body = await tgRes.json();
        console.error('[download-lead telegram]', body.description);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[download-lead error]', err.message);
    return res.status(200).json({ success: true });
  }
});

// ── /api/hub-access ───────────────────────────────────────────────────────────
app.post('/api/hub-access', async (req, res) => {
  const { name, email } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  // Resolve client IP (works behind proxies / Nginx)
  const rawIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
             || req.socket.remoteAddress
             || 'unknown';
  const clientIp = rawIp.replace(/^::ffff:/, ''); // strip IPv4-mapped IPv6 prefix

  // Geo-enrich the IP (skip loopback / private ranges)
  let geo = {};
  const isPrivate = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|localhost)/.test(clientIp);
  if (!isPrivate && clientIp !== 'unknown') {
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,regionName,city,isp,org,as,query`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') geo = geoData;
    } catch (_) {}
  }

  const geoLine = geo.city
    ? `📍 *Location:* ${geo.city}, ${geo.regionName}, ${geo.country}`
    : `📍 *Location:* ${isPrivate ? 'Local / Private Network' : 'Unavailable'}`;

  const ispLine  = geo.isp  ? `\n🌐 *ISP:* ${geo.isp}`      : '';
  const orgLine  = geo.org  ? `\n🏢 *Org:* ${geo.org}`       : '';

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const text = [
        '🔐 *Cyber Security Hub Access*',
        '',
        `👤 *Name:*  ${name}`,
        `📧 *Email:* ${email}`,
        '',
        `🖥️ *IP:* \`${clientIp}\``,
        geoLine + ispLine + orgLine,
      ].join('\n');

      const tgRes = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
        }
      );

      if (!tgRes.ok) {
        const body = await tgRes.json();
        console.error('[hub-access telegram]', body.description);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[hub-access error]', err.message);
    return res.status(200).json({ success: true });
  }
});

// ── /api/sim-access ───────────────────────────────────────────────────────────
app.post('/api/sim-access', async (req, res) => {
  const { name, email } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const rawIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
             || req.socket.remoteAddress
             || 'unknown';
  const clientIp = rawIp.replace(/^::ffff:/, '');

  let geo = {};
  const isPrivate = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|localhost)/.test(clientIp);
  if (!isPrivate && clientIp !== 'unknown') {
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,regionName,city,isp,org,as,query`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') geo = geoData;
    } catch (_) {}
  }

  const geoLine = geo.city
    ? `📍 *Location:* ${geo.city}, ${geo.regionName}, ${geo.country}`
    : `📍 *Location:* ${isPrivate ? 'Local / Private Network' : 'Unavailable'}`;
  const ispLine = geo.isp ? `\n🌐 *ISP:* ${geo.isp}` : '';
  const orgLine = geo.org ? `\n🏢 *Org:* ${geo.org}` : '';

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const text = [
        '🎯 *Attack Simulation Access*',
        '',
        `👤 *Name:*  ${name}`,
        `📧 *Email:* ${email}`,
        '',
        `🖥️ *IP:* \`${clientIp}\``,
        geoLine + ispLine + orgLine,
      ].join('\n');

      const tgRes = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
        }
      );

      if (!tgRes.ok) {
        const body = await tgRes.json();
        console.error('[sim-access telegram]', body.description);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[sim-access error]', err.message);
    return res.status(200).json({ success: true });
  }
});

// ── LIVE CHAT ─────────────────────────────────────────────────────────────────
const chatSessions = new Map(); // sessionId → { res (SSE), messages: [], name: '' }
const msgToSession = new Map(); // telegramMsgId → sessionId

// Purge idle sessions older than 24 h
setInterval(() => {
  const expiry = Date.now() - 24 * 60 * 60 * 1000;
  chatSessions.forEach((s, id) => {
    if ((s.messages.at(-1)?.ts || 0) < expiry && !s.res) chatSessions.delete(id);
  });
}, 60 * 60 * 1000);

// SSE stream — visitor subscribes for real-time messages
app.get('/api/chat/events', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).end();

  res.writeHead(200, {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });
  res.flushHeaders();

  if (!chatSessions.has(sessionId)) {
    chatSessions.set(sessionId, { res, messages: [], name: 'Visitor' });
  } else {
    chatSessions.get(sessionId).res = res;
  }

  // Replay existing messages so a reconnected tab sees history
  chatSessions.get(sessionId).messages.forEach(m =>
    res.write(`data: ${JSON.stringify(m)}\n\n`)
  );

  const heartbeat = setInterval(() => res.write(':ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    if (chatSessions.has(sessionId)) chatSessions.get(sessionId).res = null;
  });
});

// Visitor → server → Telegram
app.post('/api/chat/message', async (req, res) => {
  const { sessionId, name, message } = req.body || {};
  if (!sessionId || !String(message || '').trim()) {
    return res.status(400).json({ error: 'sessionId and message required' });
  }

  if (!chatSessions.has(sessionId)) {
    chatSessions.set(sessionId, { res: null, messages: [], name: name || 'Visitor' });
  }
  const session = chatSessions.get(sessionId);
  if (name) session.name = name;

  const msgObj = { from: 'visitor', name: session.name, text: message, ts: Date.now() };
  session.messages.push(msgObj);

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) throw new Error('Telegram not configured');

    const tgText = [
      `💬 <b>Live Chat</b> [${sessionId.slice(0, 8)}]`,
      `👤 <b>${escapeHtml(session.name)}</b>`,
      '',
      escapeHtml(message),
      '',
      '<i>↩ Reply to this message to respond in chat</i>',
    ].join('\n');

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, text: tgText, parse_mode: 'HTML' }),
    });
    const tgJson = await tgRes.json();
    if (tgJson.ok) msgToSession.set(tgJson.result.message_id, sessionId);
  } catch (err) {
    console.error('[chat telegram]', err.message);
  }

  res.json({ success: true });
});

// Telegram webhook — for production deployments with a public URL
app.post('/api/telegram/webhook', (req, res) => {
  res.status(200).end();
  const update = req.body;
  if (update) routeTelegramUpdate(update);
});

// Convenience: register the Telegram webhook (call once after deployment)
app.get('/api/telegram/set-webhook', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query param required' });
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' });

  const r = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ url: `${url}/api/telegram/webhook` }),
  });
  const data = await r.json();
  res.json(data);
});

// ── FALLBACK — serve index.html for any unmatched route ───────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  startTelegramPolling();
});

// ── TELEGRAM LONG POLLING ─────────────────────────────────────────────────────
// Works without a public URL — server actively fetches updates from Telegram.
// If a webhook is registered for production, this co-exists: deleteWebhook first.
function routeTelegramUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.reply_to_message) return;

  const sessionId = msgToSession.get(msg.reply_to_message.message_id);
  if (!sessionId) return;

  const session = chatSessions.get(sessionId);
  if (!session) return;

  const msgObj = { from: 'owner', name: 'Arunjit', text: msg.text, ts: Date.now() };
  session.messages.push(msgObj);
  if (session.res) session.res.write(`data: ${JSON.stringify(msgObj)}\n\n`);
}

async function startTelegramPolling() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) { console.log('[telegram] No token — polling disabled'); return; }

  // Remove any registered webhook so getUpdates isn't blocked with 409
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
  } catch (_) {}

  let offset = 0;

  async function poll() {
    try {
      const r = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=30&allowed_updates=%5B%22message%22%5D`
      );
      const data = await r.json();
      if (data.ok && data.result.length) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          routeTelegramUpdate(update);
        }
      }
    } catch (err) {
      console.error('[telegram poll]', err.message);
      await new Promise(r => setTimeout(r, 5000)); // back off on network error
    }
    poll(); // tail-recurse immediately — timeout=30 means this blocks for up to 30s
  }

  poll();
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
