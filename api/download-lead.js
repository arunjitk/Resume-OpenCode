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
