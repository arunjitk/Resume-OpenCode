'use strict';

require('dotenv').config();

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { Resend } = require('resend');

// ── PERSIST msgToSession across restarts ────────────────────────────────────
const MSG_MAP_FILE     = path.join(__dirname, '.msg-session-map.json');
const OFFSET_FILE      = path.join(__dirname, '.telegram-offset.json');
const SESSIONS_FILE    = path.join(__dirname, '.chat-sessions.json');

function loadMsgMap() {
  try {
    const raw  = fs.readFileSync(MSG_MAP_FILE, 'utf8');
    const obj  = JSON.parse(raw);
    const expiry = Date.now() - 24 * 60 * 60 * 1000;
    const result = new Map();
    for (const [k, v] of Object.entries(obj)) {
      if (v && v.ts > expiry) result.set(Number(k), v.sessionId);
    }
    console.log(`[chat] loaded ${result.size} session mapping(s) from disk`);
    return result;
  } catch (_) { return new Map(); }
}

function saveMsgMap() {
  const obj = {};
  msgToSession.forEach((sessionId, msgId) => {
    obj[msgId] = { sessionId, ts: Date.now() };
  });
  fs.writeFileSync(MSG_MAP_FILE, JSON.stringify(obj), 'utf8');
}

// ── PERSIST polling offset so restarts don't re-deliver old updates ──────────
function loadOffset() {
  try {
    const raw = fs.readFileSync(OFFSET_FILE, 'utf8');
    return JSON.parse(raw).offset || 0;
  } catch (_) { return 0; }
}

function saveOffset(val) {
  try { fs.writeFileSync(OFFSET_FILE, JSON.stringify({ offset: val }), 'utf8'); }
  catch (_) {}
}

// ── PERSIST chat session messages so history survives restarts ───────────────
function loadSessions() {
  try {
    const raw    = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const obj    = JSON.parse(raw);
    const expiry = Date.now() - 24 * 60 * 60 * 1000;
    const result = new Map();
    for (const [sid, data] of Object.entries(obj)) {
      const msgs = (data.messages || []).filter(m => (m.ts || 0) > expiry);
      if (msgs.length) result.set(sid, { res: null, messages: msgs, name: data.name || 'Visitor' });
    }
    console.log(`[chat] restored ${result.size} session(s) from disk`);
    return result;
  } catch (_) { return new Map(); }
}

function saveSessions() {
  try {
    const obj = {};
    chatSessions.forEach((s, sid) => {
      if (s.messages.length) obj[sid] = { messages: s.messages, name: s.name };
    });
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj), 'utf8');
  } catch (_) {}
}

// ── Safe SSE write — returns false and nulls session.res on failure ──────────
function sseWrite(session, data) {
  if (!session || !session.res) return false;
  try {
    if (!session.res.writable) { session.res = null; return false; }
    const ok = session.res.write(data);
    return ok;
  } catch (err) {
    console.error('[SSE write error]', err.message);
    session.res = null;
    return false;
  }
}

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve built static files
app.use(express.static(path.join(__dirname, 'dist')));

// Serve non-bundled source directories (js, css, ResumePDF) from project root
app.use('/js',        express.static(path.join(__dirname, 'js')));
app.use('/css',       express.static(path.join(__dirname, 'css')));
app.use('/ResumePDF', express.static(path.join(__dirname, 'ResumePDF')));

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
// sessionId → { res (SSE), messages: [], name: '' }
// Restored from disk so history and queued replies survive server restarts.
const chatSessions = loadSessions();

// Persist telegram msgId → sessionId mapping across restarts
const msgToSession = loadMsgMap();

// Purge idle sessions older than 24 h and persist
setInterval(() => {
  const expiry = Date.now() - 24 * 60 * 60 * 1000;
  chatSessions.forEach((s, id) => {
    if ((s.messages.at(-1)?.ts || 0) < expiry && !s.res) chatSessions.delete(id);
  });
  saveSessions();
}, 60 * 60 * 1000);

// SSE stream — visitor subscribes for real-time messages
app.get('/api/chat/events', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).end();

  // Disable Nagle's algorithm — ensures small SSE frames are sent immediately
  // instead of being buffered waiting for larger TCP segments.
  if (req.socket) req.socket.setNoDelay(true);

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

  // Replay missed messages using Last-Event-ID (SSE spec).
  // The browser automatically sends this header with the last `id:` value it
  // received, so we only resend messages newer than that point.
  const lastId = parseInt(req.headers['last-event-id'] || '0', 10);
  const session = chatSessions.get(sessionId);
  session.messages
    .filter(m => (m.ts || 0) > lastId)
    .forEach(m => {
      try { res.write(`id: ${m.ts}\ndata: ${JSON.stringify(m)}\n\n`); } catch (_) {}
    });

  const heartbeat = setInterval(() => {
    try { if (res.writable) res.write(':ping\n\n'); } catch (_) {}
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    // Only null the session's res if it's still pointing to THIS connection.
    // If connectSSE() raced ahead and a newer connection registered first,
    // the close-event from the old connection must not overwrite the new one.
    const s = chatSessions.get(sessionId);
    if (s && s.res === res) s.res = null;
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
    if (tgJson.ok) {
      const tgMsgId = tgJson.result.message_id;
      msgToSession.set(tgMsgId, sessionId);
      // Persist so mapping survives server restarts
      saveMsgMap();
      console.log(`[chat] mapped tg_msg_id=${tgMsgId} → session=${sessionId.slice(0,8)}`);
    } else {
      console.error('[chat telegram] send failed:', JSON.stringify(tgJson));
    }
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
  if (!msg) return;

  // Only route replies to chat messages
  if (!msg.reply_to_message) {
    console.log(`[tg] update ignored — not a reply. msg_id=${msg.message_id}, text="${msg.text}"`);
    return;
  }

  const replyToId = msg.reply_to_message.message_id;
  console.log(`[tg] reply received — reply_to_msg_id=${replyToId}, text="${msg.text}"`);
  console.log(`[tg] known session mappings: ${[...msgToSession.entries()].map(([k,v])=>`${k}→${String(v).slice(0,8)}`).join(', ')}`);

  const sessionId = msgToSession.get(replyToId);
  if (!sessionId) {
    console.log(`[tg] no session found for msg_id=${replyToId}`);
    return;
  }

  console.log(`[tg] routing reply to session=${sessionId.slice(0,8)}`);

  // Ensure session exists (recreate if server restarted)
  if (!chatSessions.has(sessionId)) {
    chatSessions.set(sessionId, { res: null, messages: [], name: 'Visitor' });
  }
  const session = chatSessions.get(sessionId);

  const msgObj = { from: 'owner', name: 'Arunjit K', text: msg.text, ts: Date.now() };
  session.messages.push(msgObj);
  saveSessions(); // persist so queued replies survive the next restart

  if (session.res) {
    const sent = sseWrite(session, `id: ${msgObj.ts}\ndata: ${JSON.stringify(msgObj)}\n\n`);
    if (sent) {
      console.log(`[tg] pushed reply to live SSE session=${sessionId.slice(0,8)}`);
    } else {
      console.log(`[tg] SSE write failed for session=${sessionId.slice(0,8)} — reply queued for reconnect`);
    }
  } else {
    console.log(`[tg] session=${sessionId.slice(0,8)} has no active SSE — reply queued for reconnect`);
  }
}

async function startTelegramPolling() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) { console.log('[telegram] No token — skipping'); return; }

  // Check if webhook is already registered — if so, skip polling
  try {
    const r    = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const info = await r.json();
    if (info.ok && info.result.url) {
      console.log(`[telegram] Webhook active at ${info.result.url} — long-polling disabled`);
      return;
    }
  } catch (_) {}

  // Fallback long-polling (only if no webhook is set)
  console.log('[telegram] No webhook found — starting long-poll fallback...');

  // Resume from persisted offset so restarts don't re-deliver old updates
  let offset = loadOffset();
  console.log(`[telegram] polling from offset=${offset}`);

  async function poll() {
    try {
      // Client-side timeout slightly longer than Telegram's server-side timeout=25.
      // Without this, if the network silently drops the fetch hangs indefinitely
      // (until TCP keepalive kills it — potentially minutes), blocking all replies.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 35000);

      let r;
      try {
        r = await fetch(
          `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=25&allowed_updates=%5B%22message%22%5D`,
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(timer);
      }

      const data = await r.json();
      if (data.ok && data.result.length) {
        console.log(`[telegram] ${data.result.length} update(s) received`);
        for (const update of data.result) {
          offset = update.update_id + 1;
          routeTelegramUpdate(update);
        }
        // Persist the new offset so a server restart continues from here,
        // not from 0 (which would re-deliver already-processed updates).
        saveOffset(offset);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Expected: 35 s client-side timeout — just retry immediately
        console.log('[telegram poll] timeout — retrying');
      } else {
        console.error('[telegram poll]', err.message, err.cause?.message || '');
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    poll();
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
