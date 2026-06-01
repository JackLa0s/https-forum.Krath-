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

// ===== USER PROFILE =====
let profile = JSON.parse(localStorage.getItem('profile') || '{}');
if (!profile.name) profile = { name: 'ผู้ใช้ไม่ระบุชื่อ', bio: '', avatar: '👤' };

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

// ===== IMAGE TO BASE64 =====
function toBase64(file) {
  return new Promise((res, rej) => {
    if (file.size > 500000) { alert('รูปภาพต้องมีขนาดไม่เกิน 500KB'); rej(); return; }
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ===== IMAGE PREVIEW =====
let pendingImage = null;
window.previewImage = async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    pendingImage = await toBase64(file);
    const preview = document.getElementById('imagePreview');
    preview.src = pendingImage;
    preview.classList.remove('hidden');
    document.getElementById('removeImg').classList.remove('hidden');
  } catch(err) { pendingImage = null; }
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
  try {
    pendingAvatar = await toBase64(file);
    document.getElementById('avatarPreview').src = pendingAvatar;
  } catch(err) {}
};

// ===== PAGES =====
let currentPage = 'home';
window.showPage = (page) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(page + 'Page').classList.add('active');
  currentPage = page;
  if (page === 'profile') renderProfile();
};

// ===== THREADS DATA =====
let allThreads = {};
let currentCat = 'all';
let currentThreadId = null;
let hotInterval = null;

onValue(ref(db, 'threads'), (snap) => {
  allThreads = snap.val() || {};
  renderThreads();
  renderTrending();
  renderHot();
});

// ===== CATEGORY FILTER =====
window.filterCategory = (cat) => {
  currentCat = cat;
  document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-cat="${cat}"]`)?.classList.add('active');
  const titles = { all: 'กระทู้ทั้งหมด', game: '🎮 เกม', anime: '⛩️ อนิเมะ/มังงะ', movie: '🎬 ภาพยนตร์/ซีรีส์', tech: '💻 เทคโนโลยี', other: '💬 อื่นๆ' };
  document.getElementById('pageTitle').textContent = titles[cat] || 'กระทู้';
  renderThreads();
  showPage('home');
};

// ===== SEARCH =====
document.getElementById('searchInput').addEventListener('input', (e) => renderThreads(e.target.value));

// ===== RENDER THREADS =====
function renderThreads(search = '') {
  const list = document.getElementById('threadsList');
  const noT = document.getElementById('noThreads');
  list.innerHTML = '';
  const entries = Object.entries(allThreads).sort((a,b) => (b[1].timestamp||0)-(a[1].timestamp||0));
  const filtered = entries.filter(([, t]) => {
    const matchCat = currentCat === 'all' || t.category === currentCat;
    const matchSearch = !search || t.title.includes(search) || t.body.includes(search);
    return matchCat && matchSearch;
  });
  if (filtered.length === 0) { noT.style.display = 'block'; return; }
  noT.style.display = 'none';
  filtered.forEach(([id, t]) => {
    const div = document.createElement('div');
    div.className = 'thread-card';
    const views = t.views || 0;
    const comments = t.comments ? Object.keys(t.comments).length : 0;
    const avatarHtml = t.authorAvatar && t.authorAvatar.startsWith('data:')
      ? `<img src="${t.authorAvatar}" class="avatar-sm" />`
      : `<span>${t.authorAvatar || '👤'}</span>`;
    div.innerHTML = `
      <div class="thread-card-top">
        <span class="cat-badge ${t.category || 'other'}">${catLabel(t.category)}</span>
      </div>
      <h3>${escHtml(t.title)}</h3>
      <p class="thread-preview">${escHtml(t.body)}</p>
      ${t.image ? `<img src="${t.image}" class="thread-img-preview" />` : ''}
      <div class="thread-card-bottom">
        ${avatarHtml}
        <span>${escHtml(t.author)}</span>
        <span>·</span><span>${t.date}</span>
        <span>·</span><span>💬 ${comments}</span>
        <span>·</span><span>👁 ${views}</span>
      </div>
    `;
    div.onclick = () => viewThread(id);
    list.appendChild(div);
  });
}

function catLabel(cat) {
  return { game:'🎮 เกม', anime:'⛩️ อนิเมะ', movie:'🎬 ภาพยนตร์', tech:'💻 เทค', other:'💬 อื่นๆ' }[cat] || '💬 อื่นๆ';
}

// ===== TRENDING =====
function renderTrending() {
  const el = document.getElementById('trendingList');
  const entries = Object.entries(allThreads)
    .sort((a,b) => ((b[1].views||0)+(Object.keys(b[1].comments||{}).length*3)) - ((a[1].views||0)+(Object.keys(a[1].comments||{}).length*3)))
    .slice(0, 5);
  el.innerHTML = '';
  entries.forEach(([id, t], i) => {
    const div = document.createElement('div');
    div.className = 'trend-item';
    div.innerHTML = `<span class="trend-rank">#${i+1}</span><span class="trend-title">${escHtml(t.title)}</span>`;
    div.onclick = () => viewThread(id);
    el.appendChild(div);
  });
}

// ===== HOT RIGHT NOW =====
function renderHot() {
  const el = document.getElementById('hotList');
  const entries = Object.entries(allThreads)
    .sort((a,b) => (b[1].views||0)-(a[1].views||0))
    .slice(0, 6);
  el.innerHTML = '';
  entries.forEach(([id, t]) => {
    const div = document.createElement('div');
    div.className = 'hot-card';
    div.innerHTML = `
      <div class="hot-views">👁 ${t.views||0} views</div>
      <div class="hot-title">${escHtml(t.title)}</div>
    `;
    div.onclick = () => viewThread(id);
    el.appendChild(div);
  });
}

// Hot timer countdown
let hotCountdown = 60;
function startHotTimer() {
  const el = document.getElementById('hotTimer');
  clearInterval(hotInterval);
  hotInterval = setInterval(() => {
    hotCountdown--;
    if (hotCountdown <= 0) { hotCountdown = 60; renderHot(); }
    el.textContent = `อัปเดตใน ${hotCountdown}s`;
  }, 1000);
}
startHotTimer();

// ===== VIEW THREAD =====
function viewThread(id) {
  currentThreadId = id;
  showPage('thread');
  // increment views
  runTransaction(ref(db, `threads/${id}/views`), (v) => (v || 0) + 1);

  onValue(ref(db, `threads/${id}`), (snap) => {
    const t = snap.val(); if (!t) return;
    renderThreadDetail(id, t);
  });
}

function renderThreadDetail(id, t) {
  const comments = t.comments ? Object.values(t.comments) : [];
  const avatarHtml = t.authorAvatar && t.authorAvatar.startsWith('data:')
    ? `<img src="${t.authorAvatar}" class="avatar-sm" />`
    : `<span style="font-size:1.2rem">${t.authorAvatar || '👤'}</span>`;

  document.getElementById('threadDetail').innerHTML = `
    <div class="detail-cat"><span class="cat-badge ${t.category||'other'}">${catLabel(t.category)}</span></div>
    <h1 class="detail-title">${escHtml(t.title)}</h1>
    <div class="detail-meta">
      ${avatarHtml}
      <span><strong>${escHtml(t.author)}</strong></span>
      <span>·</span><span>${t.date}</span>
      <span>·</span><span>👁 ${t.views||0}</span>
    </div>
    <div class="detail-body">${escHtml(t.body)}</div>
    ${t.image ? `<img src="${t.image}" class="detail-img" />` : ''}
    <div class="detail-actions">
      <button class="btn btn-secondary" onclick="editThread('${id}')">✏️ แก้ไข</button>
      <button class="btn btn-danger" onclick="deleteThread('${id}')">🗑 ลบ</button>
    </div>
  `;

  // comments
  let commentImgPending = null;
  document.getElementById('commentsSection').innerHTML = `
    <div class="comments-title">💬 ความเห็น (${comments.length})</div>
    <div id="commentList">
      ${comments.map(c => {
        const avHtml = c.authorAvatar && c.authorAvatar.startsWith('data:')
          ? `<img src="${c.authorAvatar}" class="avatar-sm" style="width:24px;height:24px;border-radius:50%;object-fit:cover" />`
          : `<span>${c.authorAvatar || '👤'}</span>`;
        return `<div class="comment">
          <div class="comment-top">${avHtml}<span class="comment-author">${escHtml(c.author)}</span><span class="comment-date">${c.date}</span></div>
          <div class="comment-text">${escHtml(c.text)}</div>
          ${c.image ? `<img src="${c.image}" class="comment-img" />` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="add-comment">
      <textarea id="commentText" class="input-field" rows="3" placeholder="เขียนความเห็น..."></textarea>
      <div class="comment-img-upload">
        <input type="file" id="commentImgInput" accept="image/*" style="display:none" />
        <button class="upload-btn" onclick="document.getElementById('commentImgInput').click()">📷 แนบรูป</button>
        <img id="commentImgPreview" class="image-preview hidden" style="max-height:120px" />
      </div>
      <button class="btn btn-primary" onclick="submitComment('${id}')">ส่งความเห็น</button>
    </div>
  `;

  // comment image
  document.getElementById('commentImgInput').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      commentImgPending = await toBase64(file);
      const prev = document.getElementById('commentImgPreview');
      prev.src = commentImgPending; prev.classList.remove('hidden');
    } catch(err) { commentImgPending = null; }
  };
  window._commentImgPending = () => commentImgPending;
  window._clearCommentImg = () => { commentImgPending = null; };
}

// ===== SUBMIT COMMENT =====
window.submitComment = (threadId) => {
  const text = document.getElementById('commentText').value.trim();
  if (!text) { alert('กรุณาเขียนความเห็น'); return; }
  const imgData = window._commentImgPending ? window._commentImgPending() : null;
  const avatarVal = profile.avatar && profile.avatar.startsWith('data:') ? profile.avatar : (profile.avatar || '👤');
  const comment = {
    author: profile.name,
    authorAvatar: avatarVal,
    date: new Date().toLocaleDateString('th-TH'),
    text
  };
  if (imgData) comment.image = imgData;
  push(ref(db, `threads/${threadId}/comments`), comment);
  document.getElementById('commentText').value = '';
  if (window._clearCommentImg) window._clearCommentImg();
  const prev = document.getElementById('commentImgPreview');
  if (prev) prev.classList.add('hidden');
  document.getElementById('commentImgInput').value = '';
};

// ===== EDIT / DELETE THREAD =====
window.editThread = (id) => {
  const t = allThreads[id]; if (!t) return;
  const newTitle = prompt('แก้ไขหัวข้อ:', t.title);
  if (newTitle === null) return;
  const newBody = prompt('แก้ไขเนื้อหา:', t.body);
  if (newBody === null) return;
  update(ref(db, `threads/${id}`), { title: newTitle, body: newBody });
};
window.deleteThread = (id) => {
  if (!confirm('ต้องการลบกระทู้นี้?')) return;
  remove(ref(db, `threads/${id}`));
  showPage('home');
};

// ===== CREATE THREAD MODAL =====
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
  if (!title || !body) { alert('กรุณากรอกหัวข้อและเนื้อหา'); return; }
  const avatarVal = profile.avatar && profile.avatar.startsWith('data:') ? profile.avatar : (profile.avatar || '👤');
  const thread = {
    title, body, category: cat,
    author: profile.name,
    authorAvatar: avatarVal,
    date: new Date().toLocaleDateString('th-TH'),
    timestamp: Date.now(),
    views: 0
  };
  if (pendingImage) thread.image = pendingImage;
  push(ref(db, 'threads'), thread);
  closeCreateModal();
  showPage('home');
};

// ===== PROFILE =====
window.renderProfile = () => {
  const avatarHtml = profile.avatar && profile.avatar.startsWith('data:')
    ? `<img src="${profile.avatar}" class="avatar-large" />`
    : `<div class="avatar-large" style="display:flex;align-items:center;justify-content:center;font-size:2.5rem;background:rgba(255,255,255,0.2)">${profile.avatar || '👤'}</div>`;

  const myThreads = Object.entries(allThreads).filter(([,t]) => t.author === profile.name);
  const myComments = [];
  Object.values(allThreads).forEach(t => {
    if (t.comments) Object.values(t.comments).filter(c => c.author === profile.name).forEach(c => myComments.push({...c, threadTitle: t.title}));
  });

  document.getElementById('profileContainer').innerHTML = `
    <div class="profile-header">
      ${avatarHtml}
      <div class="profile-info">
        <h2>${escHtml(profile.name)}</h2>
        <p class="profile-bio">${escHtml(profile.bio || 'ยังไม่มีประวัติ')}</p>
        <p style="font-size:0.8rem;color:rgba(255,255,255,0.6);margin-top:0.4rem">${myThreads.length} กระทู้ · ${myComments.length} ความเห็น</p>
      </div>
      <button class="btn btn-secondary" style="margin-left:auto" onclick="openProfileModal()">✏️ แก้ไข</button>
    </div>
    <div class="profile-body">
      <div class="profile-tabs">
        <button class="tab-btn active" onclick="switchTab('posts')">กระทู้ของฉัน</button>
        <button class="tab-btn" onclick="switchTab('comments')">ความเห็นของฉัน</button>
      </div>
      <div id="tab-posts" class="tab-content active">
        ${myThreads.length === 0 ? '<p style="color:var(--text2)">ยังไม่มีกระทู้</p>' :
          myThreads.map(([id, t]) => `
            <div class="thread-card" onclick="viewThread('${id}')">
              <div class="thread-card-top"><span class="cat-badge ${t.category||'other'}">${catLabel(t.category)}</span></div>
              <h3>${escHtml(t.title)}</h3>
              <p class="thread-preview">${escHtml(t.body)}</p>
              <div class="thread-card-bottom"><span>${t.date}</span><span>·</span><span>👁 ${t.views||0}</span></div>
            </div>
          `).join('')}
      </div>
      <div id="tab-comments" class="tab-content">
        ${myComments.length === 0 ? '<p style="color:var(--text2)">ยังไม่มีความเห็น</p>' :
          myComments.map(c => `
            <div class="comment">
              <div class="comment-top"><span class="comment-date">ในกระทู้: ${escHtml(c.threadTitle)}</span></div>
              <div class="comment-text">${escHtml(c.text)}</div>
              <div class="comment-date">${c.date}</div>
            </div>
          `).join('')}
      </div>
    </div>
  `;
};

window.switchTab = (tab) => {
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', (i===0 && tab==='posts')||(i===1 && tab==='comments')));
  document.getElementById('tab-posts').classList.toggle('active', tab==='posts');
  document.getElementById('tab-comments').classList.toggle('active', tab==='comments');
};

window.openProfileModal = () => {
  pendingAvatar = null;
  const av = profile.avatar && profile.avatar.startsWith('data:') ? profile.avatar : '';
  document.getElementById('avatarPreview').src = av;
  document.getElementById('profileName').value = profile.name;
  document.getElementById('profileBio').value = profile.bio || '';
  document.getElementById('profileModal').classList.remove('hidden');
};
window.closeProfileModal = () => document.getElementById('profileModal').classList.add('hidden');

window.saveProfile = () => {
  const name = document.getElementById('profileName').value.trim();
  if (!name) { alert('กรุณากรอกชื่อ'); return; }
  profile.name = name;
  profile.bio = document.getElementById('profileBio').value.trim();
  if (pendingAvatar) profile.avatar = pendingAvatar;
  saveProfile_local();
  closeProfileModal();
  renderProfile();
};

// ===== HELPERS =====
function escHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
