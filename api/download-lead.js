module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone } = req.body || {};

  if (!name || !email)
    return res.status(400).json({ error: 'Name and email are required.' });

  // Resolve client IP
  const rawIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
             || req.socket.remoteAddress
             || 'unknown';
  const clientIp = rawIp.replace(/^::ffff:/, '');

  // Geo-enrich the IP
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

    if (!botToken || !chatId) throw new Error('Telegram credentials not configured');

    const text = [
      '📥 *Resume Download Request*',
      '',
      `👤 *Name:*  ${name}`,
      `📧 *Email:* ${email}`,
      `📱 *Phone:* ${phone || '—'}`,
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
      throw new Error(body.description || 'Telegram API error');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[download-lead error]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
