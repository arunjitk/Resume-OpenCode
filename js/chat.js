/* Live Chat Widget — SSE + Telegram bot bridge */
(function () {

  const SESSION_KEY = 'chat_session_id';
  const NAME_KEY    = 'chat_visitor_name';

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  let visitorName = sessionStorage.getItem(NAME_KEY) || '';
  let evtSource   = null;
  let isOpen      = false;
  let unread      = 0;

  const fab         = document.getElementById('chat-fab');
  const win         = document.getElementById('chat-window');
  const msgList     = document.getElementById('chat-messages');
  const inputField  = document.getElementById('chat-input');
  const sendBtn     = document.getElementById('chat-send');
  const closeBtn    = document.getElementById('chat-close');
  const nameOverlay = document.getElementById('chat-name-overlay');
  const nameInput   = document.getElementById('chat-name-input');
  const nameSubmit  = document.getElementById('chat-name-submit');
  const badge       = document.getElementById('chat-badge');

  if (!fab || !win) return;

  // ─── Open / close ─────────────────────────────────────────────────────────

  // Expose so nav / contact buttons can trigger the widget
  window.openChatWidget = openChat;

  function openChat() {
    isOpen = true;
    win.classList.add('open');
    win.setAttribute('aria-hidden', 'false');
    fab.classList.add('active');
    fab.setAttribute('aria-expanded', 'true');
    clearBadge();

    if (visitorName) {
      showNameOverlay(false);
      connectSSE();
    } else {
      showNameOverlay(true);
      nameInput.focus();
    }
    scrollBottom();
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    win.setAttribute('aria-hidden', 'true');
    fab.classList.remove('active');
    fab.setAttribute('aria-expanded', 'false');
  }

  fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeChat();
  });

  // ─── Name capture ─────────────────────────────────────────────────────────

  nameSubmit.addEventListener('click', submitName);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });

  function submitName() {
    const val = nameInput.value.trim();
    if (!val) { nameInput.focus(); return; }
    visitorName = val;
    sessionStorage.setItem(NAME_KEY, val);
    showNameOverlay(false);
    connectSSE();
    appendSys(`> UPLINK ESTABLISHED — Operator ${escHtml(val)}`);
    appendSys('> Arunjit will respond shortly. Chat history is preserved this session.');
  }

  function showNameOverlay(visible) {
    nameOverlay.classList.toggle('hidden', !visible);
  }

  // ─── SSE connection ───────────────────────────────────────────────────────

  function connectSSE() {
    if (evtSource) { evtSource.close(); evtSource = null; }
    evtSource = new EventSource(`/api/chat/events?sessionId=${encodeURIComponent(sessionId)}`);

    evtSource.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        appendMsg(msg.from, msg.name, msg.text);
        if (!isOpen) bumpBadge();
      } catch (_) {}
    };

    evtSource.onerror = () => {
      // Browser auto-reconnects SSE; no manual retry needed
    };
  }

  // ─── Send ─────────────────────────────────────────────────────────────────

  function sendMessage() {
    const text = inputField.value.trim();
    if (!text || !visitorName) return;
    inputField.value = '';
    appendMsg('visitor', visitorName, text);

    fetch('/api/chat/message', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sessionId, name: visitorName, message: text }),
    }).catch(() => {});
  }

  sendBtn.addEventListener('click', sendMessage);
  inputField.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // ─── Render helpers ───────────────────────────────────────────────────────

  function appendMsg(from, name, text) {
    const wrap = document.createElement('div');
    wrap.className = `chat-msg chat-msg--${from}`;

    if (from !== 'system') {
      const nameEl = document.createElement('span');
      nameEl.className = 'chat-msg-name';
      nameEl.textContent = name;
      wrap.appendChild(nameEl);
    }

    const bubble = document.createElement('span');
    bubble.className = from === 'system' ? 'chat-sys-line' : 'chat-msg-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);

    msgList.appendChild(wrap);
    scrollBottom();
  }

  function appendSys(text) {
    appendMsg('system', null, text);
  }

  function scrollBottom() {
    requestAnimationFrame(() => { msgList.scrollTop = msgList.scrollHeight; });
  }

  function bumpBadge() {
    unread++;
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.classList.add('visible');
  }

  function clearBadge() {
    unread = 0;
    badge.textContent = '';
    badge.classList.remove('visible');
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

})();
