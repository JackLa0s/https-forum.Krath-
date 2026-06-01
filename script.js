import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyByVWFsry-8UL5vOW6olKOyPUl_lGrtL6w",
  authDomain: "krath-forum.firebaseapp.com",
  databaseURL: "https://krath-forum-default-rtdb.firebaseio.com",
  projectId: "krath-forum",
  storageBucket: "krath-forum.firebasestorage.app",
  messagingSenderId: "976851054817",
  appId: "1:976851054817:web:af842c0f22b7f5b61b47a0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ===== PROFILE =====
let profile = JSON.parse(localStorage.getItem('profile') || '{}');
if (!profile.name) profile = { name: 'ຜູ້ໃຊ້ບໍ່ລະບຸຊື່', bio: '', avatar: '👤' };
function saveProfile_local() { localStorage.setItem('profile', JSON.stringify(profile)); }

// ===== THEME =====
const html = document.documentElement;
let theme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', theme);
document.getElementById('themeToggle').textContent = theme === 'dark' ? '🌙' : '☀️';
document.getElementById('themeToggle').onclick = () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '🌙' : '☀️';
};

// ===== IMAGE =====
function toBase64(file) {
  return new Promise((res, rej) => {
    if (file.size > 500000) { alert('ຮູບພາບຕ້ອງມີຂະໜາດບໍ່ເກີນ 500KB'); rej(); return; }
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
let pendingImage = null;
window.previewImage = async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    pendingImage = await toBase64(file);
    const p = document.getElementById('imagePreview');
    p.src = pendingImage; p.classList.remove('hidden');
    document.getElementById('removeImg').classList.remove('hidden');
  } catch(e) { pendingImage = null; }
};
window.removeImage = () => {
  pendingImage = null;
  document.getElementById('imagePreview').classList.add('hidden');
  document.getElementById('removeImg').classList.add('hidden');
  document.getElementById('imageInput').value = '';
};
let pendingAvatar = null;
window.previewAvatar = async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try { pendingAvatar = await toBase64(file); document.getElementById('avatarPreview').src = pendingAvatar; } catch(e) {}
};

// ===== PAGES =====
window.showPage = (page) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(page + 'Page').classList.add('active');
  if (page === 'profile') renderProfile();
  if (page === 'techNews') loadNews();
};

// ===== THREADS =====
let allThreads = {};
let currentCat = 'all';

onValue(ref(db, 'threads'), (snap) => {
  allThreads = snap.val() || {};
  renderThreads();
  renderTrending();
  renderHot();
});

window.filterCategory = (cat) => {
  currentCat = cat;
  document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-cat="${cat}"]`)?.classList.add('active');
  const titles = { all:'ກະທູ້ທັງໝົດ', game:'🎮 ເກມ', anime:'⛩️ ອານິເມະ/ມັງງະ', movie:'🎬 ຮູບເງົາ/ຊີຣີສ໌', tech:'💻 ເທັກໂນໂລຊີ', other:'💬 ອື່ນໆ' };
  document.getElementById('pageTitle').textContent = titles[cat] || 'ກະທູ້';
  renderThreads();
  showPage('home');
};

document.getElementById('searchInput').addEventListener('input', (e) => renderThreads(e.target.value));

function catLabel(cat) {
  return { game:'🎮 ເກມ', anime:'⛩️ ອານິເມະ', movie:'🎬 ຮູບເງົາ', tech:'💻 ເທັກ', other:'💬 ອື່ນໆ' }[cat] || '💬 ອື່ນໆ';
}

function renderThreads(search = '') {
  const list = document.getElementById('threadsList');
  const noT = document.getElementById('noThreads');
  list.innerHTML = '';
  const entries = Object.entries(allThreads).sort((a,b) => (b[1].timestamp||0)-(a[1].timestamp||0));
  const filtered = entries.filter(([,t]) => {
    const matchCat = currentCat === 'all' || t.category === currentCat;
    const matchSearch = !search || t.title.includes(search) || t.body.includes(search);
    return matchCat && matchSearch;
  });
  if (filtered.length === 0) { noT.style.display = 'block'; return; }
  noT.style.display = 'none';
  filtered.forEach(([id, t]) => {
    const div = document.createElement('div');
    div.className = 'thread-card';
    const comments = t.comments ? Object.keys(t.comments).length : 0;
    const avHtml = t.authorAvatar?.startsWith('data:') ? `<img src="${t.authorAvatar}" class="avatar-sm" style="width:20px;height:20px;border-radius:50%;object-fit:cover">` : `<span>${t.authorAvatar||'👤'}</span>`;
    div.innerHTML = `
      <div class="thread-card-top"><span class="cat-badge ${t.category||'other'}">${catLabel(t.category)}</span></div>
      <h3>${escHtml(t.title)}</h3>
      <p class="thread-preview">${escHtml(t.body)}</p>
      ${t.image ? `<img src="${t.image}" class="thread-img-preview" />` : ''}
      <div class="thread-card-bottom">${avHtml}<span>${escHtml(t.author)}</span><span>·</span><span>${t.date}</span><span>·</span><span>💬 ${comments}</span><span>·</span><span>👁 ${t.views||0}</span></div>
    `;
    div.onclick = () => viewThread(id);
    list.appendChild(div);
  });
}

function renderTrending() {
  const el = document.getElementById('trendingList'); el.innerHTML = '';
  Object.entries(allThreads)
    .sort((a,b) => ((b[1].views||0)+(Object.keys(b[1].comments||{}).length*3))-((a[1].views||0)+(Object.keys(a[1].comments||{}).length*3)))
    .slice(0,5).forEach(([id,t],i) => {
      const div = document.createElement('div'); div.className = 'trend-item';
      div.innerHTML = `<span class="trend-rank">#${i+1}</span><span class="trend-title">${escHtml(t.title)}</span>`;
      div.onclick = () => viewThread(id); el.appendChild(div);
    });
}

function renderHot() {
  const el = document.getElementById('hotList'); el.innerHTML = '';
  Object.entries(allThreads).sort((a,b) => (b[1].views||0)-(a[1].views||0)).slice(0,6).forEach(([id,t]) => {
    const div = document.createElement('div'); div.className = 'hot-card';
    div.innerHTML = `<div class="hot-views">👁 ${t.views||0} views</div><div class="hot-title">${escHtml(t.title)}</div>`;
    div.onclick = () => viewThread(id); el.appendChild(div);
  });
}

let hotCountdown = 60;
const hotInterval = setInterval(() => {
  hotCountdown--;
  if (hotCountdown <= 0) { hotCountdown = 60; renderHot(); }
  const el = document.getElementById('hotTimer');
  if (el) el.textContent = `ອັບເດດໃນ ${hotCountdown}s`;
}, 1000);

function viewThread(id) {
  showPage('thread');
  runTransaction(ref(db, `threads/${id}/views`), v => (v||0)+1);
  onValue(ref(db, `threads/${id}`), (snap) => {
    const t = snap.val(); if (!t) return;
    const avHtml = t.authorAvatar?.startsWith('data:') ? `<img src="${t.authorAvatar}" class="avatar-sm" style="width:28px;height:28px;border-radius:50%;object-fit:cover">` : `<span style="font-size:1.2rem">${t.authorAvatar||'👤'}</span>`;
    const comments = t.comments ? Object.values(t.comments) : [];
    document.getElementById('threadDetail').innerHTML = `
      <div style="margin-bottom:1rem"><span class="cat-badge ${t.category||'other'}">${catLabel(t.category)}</span></div>
      <h1 class="detail-title">${escHtml(t.title)}</h1>
      <div class="detail-meta">${avHtml}<span><strong>${escHtml(t.author)}</strong></span><span>·</span><span>${t.date}</span><span>·</span><span>👁 ${t.views||0}</span></div>
      <div class="detail-body">${escHtml(t.body)}</div>
      ${t.image ? `<img src="${t.image}" class="detail-img" />` : ''}
      <div class="detail-actions">
        ${t.author === profile.name
          ? `<button class="btn btn-secondary" onclick="editThread('${id}')">✏️ ແກ້ໄຂ</button><button class="btn btn-danger" onclick="deleteThread('${id}')">🗑 ລຶບ</button>`
          : `<span style="font-size:0.85rem;color:var(--text3)">ກະທູ້ຂອງ ${escHtml(t.author)}</span>`}
      </div>
    `;
    let commentImgPending = null;
    document.getElementById('commentsSection').innerHTML = `
      <div class="comments-title">💬 ຄວາມເຫັນ (${comments.length})</div>
      <div id="commentList">
        ${comments.map(c => {
          const cav = c.authorAvatar?.startsWith('data:') ? `<img src="${c.authorAvatar}" style="width:24px;height:24px;border-radius:50%;object-fit:cover">` : `<span>${c.authorAvatar||'👤'}</span>`;
          return `<div class="comment"><div class="comment-top">${cav}<span class="comment-author">${escHtml(c.author)}</span><span class="comment-date">${c.date}</span></div><div class="comment-text">${escHtml(c.text)}</div>${c.image?`<img src="${c.image}" class="comment-img">`:''}</div>`;
        }).join('')}
      </div>
      <div class="add-comment">
        <textarea id="commentText" class="input-field" rows="3" placeholder="ຂຽນຄວາມເຫັນ..."></textarea>
        <div class="comment-img-upload">
          <input type="file" id="commentImgInput" accept="image/*" style="display:none" />
          <button class="upload-btn" onclick="document.getElementById('commentImgInput').click()">📷 ແນບຮູບ</button>
          <img id="commentImgPreview" class="image-preview hidden" style="max-height:120px" />
        </div>
        <button class="btn btn-primary" onclick="submitComment('${id}')">ສົ່ງຄວາມເຫັນ</button>
      </div>
    `;
    document.getElementById('commentImgInput').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try { commentImgPending = await toBase64(file); const p = document.getElementById('commentImgPreview'); p.src = commentImgPending; p.classList.remove('hidden'); } catch(e) {}
    };
    window._commentImgPending = () => commentImgPending;
    window._clearCommentImg = () => { commentImgPending = null; };
  });
}

window.submitComment = (threadId) => {
  const text = document.getElementById('commentText').value.trim();
  if (!text) { alert('ກະລຸນາຂຽນຄວາມເຫັນ'); return; }
  const img = window._commentImgPending?.();
  const av = profile.avatar?.startsWith('data:') ? profile.avatar : (profile.avatar||'👤');
  const c = { author: profile.name, authorAvatar: av, date: new Date().toLocaleDateString('lo-LA'), text };
  if (img) c.image = img;
  push(ref(db, `threads/${threadId}/comments`), c);
  document.getElementById('commentText').value = '';
  window._clearCommentImg?.();
  const p = document.getElementById('commentImgPreview'); if (p) p.classList.add('hidden');
  document.getElementById('commentImgInput').value = '';
};

window.editThread = (id) => {
  const t = allThreads[id]; if (!t) return;
  const nt = prompt('ແກ້ໄຂຫົວຂໍ້:', t.title); if (nt === null) return;
  const nb = prompt('ແກ້ໄຂເນື້ອຫາ:', t.body); if (nb === null) return;
  update(ref(db, `threads/${id}`), { title: nt, body: nb });
};
window.deleteThread = (id) => {
  if (!confirm('ຕ້ອງການລຶບກະທູ້ນີ້ບໍ?')) return;
  remove(ref(db, `threads/${id}`));
  showPage('home');
};

window.openCreateModal = () => {
  pendingImage = null;
  document.getElementById('imagePreview').classList.add('hidden');
  document.getElementById('removeImg').classList.add('hidden');
  document.getElementById('imageInput').value = '';
  document.getElementById('threadTitle').value = '';
  document.getElementById('threadBody').value = '';
  document.getElementById('createModal').classList.remove('hidden');
};
window.closeCreateModal = () => document.getElementById('createModal').classList.add('hidden');

window.submitThread = () => {
  const title = document.getElementById('threadTitle').value.trim();
  const body = document.getElementById('threadBody').value.trim();
  const cat = document.getElementById('threadCat').value;
  if (!title || !body) { alert('ກະລຸນາກອกຫົວຂໍ້ ແລະ ເນື້ອຫາ'); return; }
  const av = profile.avatar?.startsWith('data:') ? profile.avatar : (profile.avatar||'👤');
  const t = { title, body, category: cat, author: profile.name, authorAvatar: av, date: new Date().toLocaleDateString('lo-LA'), timestamp: Date.now(), views: 0 };
  if (pendingImage) t.image = pendingImage;
  push(ref(db, 'threads'), t);
  closeCreateModal(); showPage('home');
};

// ===== PROFILE =====
window.renderProfile = () => {
  const avHtml = profile.avatar?.startsWith('data:') ? `<img src="${profile.avatar}" class="avatar-large" />` : `<div class="avatar-large" style="display:flex;align-items:center;justify-content:center;font-size:2.5rem;background:rgba(255,255,255,0.2)">${profile.avatar||'👤'}</div>`;
  const myThreads = Object.entries(allThreads).filter(([,t]) => t.author === profile.name);
  const myComments = [];
  Object.values(allThreads).forEach(t => { if (t.comments) Object.values(t.comments).filter(c => c.author === profile.name).forEach(c => myComments.push({...c, threadTitle: t.title})); });
  document.getElementById('profileContainer').innerHTML = `
    <div class="profile-header">
      ${avHtml}
      <div class="profile-info">
        <h2>${escHtml(profile.name)}</h2>
        <p class="profile-bio">${escHtml(profile.bio||'ຍັງບໍ່ມີປະຫວັດ')}</p>
        <p style="font-size:0.8rem;color:rgba(255,255,255,0.6);margin-top:0.4rem">${myThreads.length} ກະທູ້ · ${myComments.length} ຄວາມເຫັນ</p>
      </div>
      <button class="btn btn-secondary" style="margin-left:auto" onclick="openProfileModal()">✏️ ແກ້ໄຂ</button>
    </div>
    <div class="profile-body">
      <div class="profile-tabs">
        <button class="tab-btn active" onclick="switchTab('posts')">ກະທູ້ຂອງຂ້ອຍ</button>
        <button class="tab-btn" onclick="switchTab('comments')">ຄວາມເຫັນຂອງຂ້ອຍ</button>
      </div>
      <div id="tab-posts" class="tab-content active">
        ${myThreads.length===0 ? '<p style="color:var(--text2)">ຍັງບໍ່ມີກະທູ້</p>' : myThreads.map(([id,t]) => `<div class="thread-card" onclick="viewThread('${id}')"><div class="thread-card-top"><span class="cat-badge ${t.category||'other'}">${catLabel(t.category)}</span></div><h3>${escHtml(t.title)}</h3><p class="thread-preview">${escHtml(t.body)}</p><div class="thread-card-bottom"><span>${t.date}</span><span>·</span><span>👁 ${t.views||0}</span></div></div>`).join('')}
      </div>
      <div id="tab-comments" class="tab-content">
        ${myComments.length===0 ? '<p style="color:var(--text2)">ຍັງບໍ່ມີຄວາມເຫັນ</p>' : myComments.map(c => `<div class="comment"><div class="comment-top"><span class="comment-date">ໃນກະທູ້: ${escHtml(c.threadTitle)}</span></div><div class="comment-text">${escHtml(c.text)}</div><div class="comment-date">${c.date}</div></div>`).join('')}
      </div>
    </div>
  `;
};

window.switchTab = (tab) => {
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active',(i===0&&tab==='posts')||(i===1&&tab==='comments')));
  document.getElementById('tab-posts').classList.toggle('active', tab==='posts');
  document.getElementById('tab-comments').classList.toggle('active', tab==='comments');
};
window.openProfileModal = () => {
  pendingAvatar = null;
  document.getElementById('avatarPreview').src = profile.avatar?.startsWith('data:') ? profile.avatar : '';
  document.getElementById('profileName').value = profile.name;
  document.getElementById('profileBio').value = profile.bio||'';
  document.getElementById('profileModal').classList.remove('hidden');
};
window.closeProfileModal = () => document.getElementById('profileModal').classList.add('hidden');
window.saveProfile = () => {
  const name = document.getElementById('profileName').value.trim();
  if (!name) { alert('ກະລຸນາປ້ອນຊື່'); return; }
  profile.name = name;
  profile.bio = document.getElementById('profileBio').value.trim();
  if (pendingAvatar) profile.avatar = pendingAvatar;
  saveProfile_local(); closeProfileModal(); renderProfile();
};

// ===== TECH NEWS =====
let newsData = { all: [], world: [] };
let currentNewsTab = 'all';
let newsLoaded = false;
let newsAutoInterval = null;

const RSS_SOURCES = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', tab: 'world', flag: '🇺🇸' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', tab: 'world', flag: '🌐' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', tab: 'world', flag: '🌐' },
];

window.loadNews = async (force = false) => {
  if (newsLoaded && !force) return;
  document.getElementById('newsList').innerHTML = '<div class="news-loading">⏳ ກຳລັງໂຫຼດຂ່າວ...</div>';
  newsData = { all: [], world: [] };

  const proxy = 'https://api.rss2json.com/v1/api.json?rss_url=';
  const fetches = RSS_SOURCES.map(async (src) => {
    try {
      const res = await fetch(proxy + encodeURIComponent(src.url) + '&count=8');
      const data = await res.json();
      if (data.status === 'ok' && data.items) {
        return data.items.map(item => ({
          title: item.title,
          desc: item.description?.replace(/<[^>]+>/g,'').substring(0,150) || '',
          url: item.link,
          image: item.thumbnail || item.enclosure?.link || '',
          date: new Date(item.pubDate).toLocaleDateString('lo-LA'),
          source: src.flag + ' ' + src.name,
          tab: src.tab
        }));
      }
    } catch(e) { return []; }
    return [];
  });

  const results = await Promise.all(fetches);
  results.flat().forEach(item => {
    newsData.world.push(item);
    newsData.all.push(item);
  });

  newsData.all.sort(() => Math.random() - 0.5);
  newsLoaded = true;
  const now = new Date().toLocaleTimeString('lo-LA');
  document.getElementById('newsUpdateTime').textContent = `ອັບເດດລ່າສຸດ: ${now}`;
  renderNews();

  // Auto refresh every 10 minutes
  clearInterval(newsAutoInterval);
  newsAutoInterval = setInterval(() => { newsLoaded = false; loadNews(true); }, 10 * 60 * 1000);
};

window.switchNewsTab = (tab) => {
  currentNewsTab = tab;
  document.querySelectorAll('.news-tab').forEach(b => b.classList.toggle('active', b.dataset.ntab === tab));
  renderNews();
};

function renderNews() {
  const el = document.getElementById('newsList');
  const items = newsData[currentNewsTab] || [];
  if (items.length === 0) {
    el.innerHTML = '<div class="news-error">😔 ບໍ່ສາມາດໂຫຼດຂ່າວໄດ້ ກະລຸນາລອງໃໝ່</div>';
    return;
  }
  el.innerHTML = items.map(item => `
    <a href="${item.url}" target="_blank" rel="noopener" class="news-card">
      ${item.image ? `<img src="${item.image}" class="news-card-img" onerror="this.style.display='none'" />` : '<div class="news-card-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem">📰</div>'}
      <div class="news-card-body">
        <div class="news-source">${item.source}</div>
        <div class="news-title">${escHtml(item.title)}</div>
        <div class="news-desc">${escHtml(item.desc)}</div>
        <div class="news-date">📅 ${item.date}</div>
      </div>
    </a>
  `).join('');
}

function escHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
