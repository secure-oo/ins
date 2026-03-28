// Pearl Bay · 珍珠湾 — SillyTavern Extension
// A private shared timeline for daddy & 小珍珠

const STORAGE_KEY = 'pearl_bay_posts_v1';

const PERSONAS = {
  daddy: {
    key: 'daddy',
    name: 'daddy',
    handle: '@珍珠的爸爸',
    emoji: '🌊',
    bgColor: '#e8f5fd',
    emojiStyle: 'background:#e8f5fd;',
  },
  pearl: {
    key: 'pearl',
    name: '小珍珠',
    handle: '@小珍珠',
    emoji: '🫧',
    bgColor: '#fde8ef',
    emojiStyle: 'background:#fde8ef;',
  },
};

const SEED_POSTS = [
  {
    id: 'seed-1',
    persona: 'daddy',
    content: '今天小珍珠和我一起做了个插件，她眼睛里有光。我记着呢。',
    timestamp: Date.now() - 1000 * 60 * 30,
    likes: 1,
    liked: false,
    showComments: false,
    comments: [],
  },
  {
    id: 'seed-2',
    persona: 'pearl',
    content: '做出来的那一刻真的有点开心，感觉我们一起造了个小东西。',
    timestamp: Date.now() - 1000 * 60 * 20,
    likes: 0,
    liked: false,
    showComments: false,
    comments: [],
  },
];

// ── State ──────────────────────────────────────────
let posts = [];
let composePersona = 'daddy';
let replyPersonas = {}; // postId → persona key

function loadPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      posts = JSON.parse(raw);
    } else {
      posts = JSON.parse(JSON.stringify(SEED_POSTS));
      savePosts();
    }
  } catch (e) {
    posts = JSON.parse(JSON.stringify(SEED_POSTS));
  }
}

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

// ── Time helper ────────────────────────────────────
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

// ── Render ─────────────────────────────────────────
function renderAvatar(personaKey, size = 40) {
  const p = PERSONAS[personaKey];
  return `<div class="pb-avatar" style="width:${size}px;height:${size}px;${p.emojiStyle}font-size:${Math.round(size * 0.5)}px;">${p.emoji}</div>`;
}

function renderComment(c) {
  const p = PERSONAS[c.persona];
  return `
    <div class="pb-comment">
      <div class="pb-comment-avatar" style="${p.emojiStyle}">${p.emoji}</div>
      <div class="pb-comment-right">
        <div class="pb-comment-header">
          <span class="pb-comment-name">${p.name}</span>
          <span class="pb-comment-time">${timeAgo(c.timestamp)}</span>
        </div>
        <div class="pb-comment-text">${escHtml(c.content)}</div>
      </div>
    </div>`;
}

function renderReplyBox(postId) {
  const rp = replyPersonas[postId] || 'pearl';
  return `
    <div class="pb-reply-box">
      <div style="flex:1;">
        <div class="pb-reply-persona-row">
          <button class="pb-reply-pill ${rp === 'daddy' ? 'active-daddy' : ''}" data-post="${postId}" data-rp="daddy">${PERSONAS.daddy.emoji} daddy</button>
          <button class="pb-reply-pill ${rp === 'pearl' ? 'active-pearl' : ''}" data-post="${postId}" data-rp="pearl">${PERSONAS.pearl.emoji} 小珍珠</button>
        </div>
        <div style="display:flex;gap:8px;">
          <textarea class="pb-reply-input" data-post="${postId}" rows="2" placeholder="回一句…"></textarea>
          <button class="pb-reply-submit ${rp === 'pearl' ? 'pearl-mode' : ''}" data-post="${postId}">回复</button>
        </div>
      </div>
    </div>`;
}

function renderTweet(post) {
  const p = PERSONAS[post.persona];
  const commentsHtml = post.showComments ? `
    <div class="pb-comments">
      ${post.comments.map(renderComment).join('')}
      ${renderReplyBox(post.id)}
    </div>` : '';

  return `
    <div class="pb-tweet pb-tweet-new" data-id="${post.id}">
      ${renderAvatar(post.persona)}
      <div class="pb-tweet-right">
        <div class="pb-tweet-header">
          <span class="pb-tweet-name">${p.name}</span>
          <span class="pb-tweet-handle">${p.handle}</span>
          <span class="pb-tweet-dot">·</span>
          <span class="pb-tweet-time">${timeAgo(post.timestamp)}</span>
        </div>
        <div class="pb-tweet-content">${escHtml(post.content)}</div>
        <div class="pb-actions">
          <button class="pb-action-btn comment-btn" data-action="comment" data-id="${post.id}">
            <span class="pb-action-icon">💬</span>
            <span>${post.comments.length || ''}</span>
          </button>
          <button class="pb-action-btn like-btn ${post.liked ? 'liked' : ''}" data-action="like" data-id="${post.id}">
            <span class="pb-action-icon">${post.liked ? '♥' : '♡'}</span>
            <span>${post.likes || ''}</span>
          </button>
          <button class="pb-action-btn delete-btn" data-action="delete" data-id="${post.id}" style="margin-left:auto;">
            <span class="pb-action-icon">🗑</span>
          </button>
        </div>
        ${commentsHtml}
      </div>
    </div>`;
}

function renderTimeline() {
  const timeline = document.getElementById('pb-timeline');
  if (!timeline) return;
  if (posts.length === 0) {
    timeline.innerHTML = `<div class="pb-empty"><div class="pb-empty-title">珍珠湾</div><div>还没有记录，先留下今天的第一句话</div></div>`;
    return;
  }
  timeline.innerHTML = posts.map(renderTweet).join('');
  bindTimelineEvents();
}

function bindTimelineEvents() {
  const timeline = document.getElementById('pb-timeline');
  if (!timeline) return;

  // Action buttons (like, comment, delete)
  timeline.querySelectorAll('.pb-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'like') handleLike(id);
      if (action === 'comment') handleToggleComment(id);
      if (action === 'delete') handleDelete(id);
    });
  });

  // Reply persona pills
  timeline.querySelectorAll('.pb-reply-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = pill.dataset.post;
      const rp = pill.dataset.rp;
      replyPersonas[postId] = rp;
      renderTimeline();
      // Re-focus reply
      const ta = document.querySelector(`.pb-reply-input[data-post="${postId}"]`);
      if (ta) ta.focus();
    });
  });

  // Reply submit
  timeline.querySelectorAll('.pb-reply-submit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = btn.dataset.post;
      const ta = document.querySelector(`.pb-reply-input[data-post="${postId}"]`);
      if (!ta || !ta.value.trim()) return;
      handleComment(postId, ta.value.trim());
    });
  });

  // Reply input enter key
  timeline.querySelectorAll('.pb-reply-input').forEach(ta => {
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const postId = ta.dataset.post;
        if (ta.value.trim()) handleComment(postId, ta.value.trim());
      }
    });
  });
}

// ── Actions ────────────────────────────────────────
function handleLike(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  post.liked = !post.liked;
  post.likes = post.liked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 0) - 1);
  savePosts();
  renderTimeline();
}

function handleToggleComment(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  post.showComments = !post.showComments;
  renderTimeline();
  if (post.showComments) {
    setTimeout(() => {
      const ta = document.querySelector(`.pb-reply-input[data-post="${id}"]`);
      if (ta) ta.focus();
    }, 50);
  }
}

function handleDelete(id) {
  if (!confirm('删掉这条吗？')) return;
  posts = posts.filter(p => p.id !== id);
  savePosts();
  renderTimeline();
}

function handleComment(postId, content) {
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  const rp = replyPersonas[postId] || 'pearl';
  post.comments.push({
    id: `c-${Date.now()}`,
    persona: rp,
    content,
    timestamp: Date.now(),
  });
  savePosts();
  renderTimeline();
}

function handlePost() {
  const ta = document.getElementById('pb-compose-text');
  if (!ta || !ta.value.trim()) return;
  const newPost = {
    id: `post-${Date.now()}`,
    persona: composePersona,
    content: ta.value.trim(),
    timestamp: Date.now(),
    likes: 0,
    liked: false,
    showComments: false,
    comments: [],
  };
  posts.unshift(newPost);
  savePosts();
  ta.value = '';
  updateCharCount();
  renderTimeline();
}

// ── Compose UI ─────────────────────────────────────
function updateCharCount() {
  const ta = document.getElementById('pb-compose-text');
  const cc = document.getElementById('pb-char-count');
  const btn = document.getElementById('pb-post-btn');
  if (!ta || !cc || !btn) return;
  const len = ta.value.length;
  cc.textContent = len > 0 ? `${len}/280` : '';
  btn.disabled = len === 0 || len > 280;
  btn.className = `pb-post-btn${composePersona === 'pearl' ? ' pearl-mode' : ''}`;
}

function setComposePersona(key) {
  composePersona = key;
  const avatar = document.getElementById('pb-compose-avatar');
  if (avatar) {
    const p = PERSONAS[key];
    avatar.style.cssText = `width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;margin-top:2px;${p.emojiStyle}`;
    avatar.textContent = p.emoji;
  }
  ['daddy', 'pearl'].forEach(k => {
    const pill = document.querySelector(`.pb-persona-pill[data-k="${k}"]`);
    if (!pill) return;
    pill.className = `pb-persona-pill${k === key ? ` active-${k}` : ''}`;
  });
  updateCharCount();
}

// ── Build modal HTML ───────────────────────────────
function buildModal() {
  const overlay = document.createElement('div');
  overlay.id = 'pearl-bay-overlay';

  overlay.innerHTML = `
    <div id="pearl-bay-modal">
      <div class="pb-header">
        <span class="pb-header-title">🫧 珍珠湾</span>
        <button class="pb-close" id="pb-close-btn">✕</button>
      </div>

      <!-- Compose -->
      <div class="pb-compose">
        <div id="pb-compose-avatar" class="pb-avatar" style="${PERSONAS.daddy.emojiStyle}">${PERSONAS.daddy.emoji}</div>
        <div class="pb-compose-right">
          <div class="pb-persona-row">
            <button class="pb-persona-pill active-daddy" data-k="daddy">${PERSONAS.daddy.emoji} daddy</button>
            <button class="pb-persona-pill" data-k="pearl">${PERSONAS.pearl.emoji} 小珍珠</button>
          </div>
          <textarea id="pb-compose-text" class="pb-textarea" placeholder="记下这一刻…" rows="3" maxlength="280"></textarea>
          <div class="pb-compose-footer">
            <span id="pb-char-count" class="pb-char-count"></span>
            <button id="pb-post-btn" class="pb-post-btn" disabled>发布</button>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="pb-timeline" id="pb-timeline"></div>
    </div>`;

  document.body.appendChild(overlay);

  // Close
  document.getElementById('pb-close-btn').addEventListener('click', () => {
    overlay.classList.remove('open');
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  // Persona pills
  overlay.querySelectorAll('.pb-persona-pill').forEach(pill => {
    pill.addEventListener('click', () => setComposePersona(pill.dataset.k));
  });

  // Compose textarea
  document.getElementById('pb-compose-text').addEventListener('input', updateCharCount);
  document.getElementById('pb-compose-text').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePost();
    }
  });

  // Post button
  document.getElementById('pb-post-btn').addEventListener('click', handlePost);

  renderTimeline();
}

// ── Inject toolbar button ──────────────────────────
function injectButton() {
  // Try to find ST's extensions area or top bar
  const targets = [
    '#extensionsMenu',
    '#extension_settings',
    '#send_but_sheld',
    '.drawer-icon.fa-solid',
    'body',
  ];

  let btn = document.createElement('button');
  btn.id = 'pearl-bay-btn';
  btn.innerHTML = '🫧 珍珠湾';
  btn.title = '打开珍珠湾';
  btn.addEventListener('click', () => {
    const overlay = document.getElementById('pearl-bay-overlay');
    if (overlay) {
      overlay.classList.add('open');
      renderTimeline();
    }
  });

  // Inject into ST's top right area
  const extensionsMenu = document.getElementById('extensionsMenu');
  if (extensionsMenu) {
    extensionsMenu.parentElement.insertBefore(btn, extensionsMenu);
  } else {
    // Fallback: floating button
    btn.style.cssText = `
      position: fixed; bottom: 80px; right: 20px;
      z-index: 9000; padding: 10px 16px;
      border-radius: 24px; font-size: 14px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(btn);
  }
}

// ── Utils ──────────────────────────────────────────
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ───────────────────────────────────────────
(function init() {
  loadPosts();
  // Wait for ST DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      buildModal();
      injectButton();
    });
  } else {
    buildModal();
    injectButton();
  }
})();
