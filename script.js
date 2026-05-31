// Firebase Config
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyByVWFsry-8UL5vOW6olKOyPUl_lGrtL6w",
  authDomain: "krath-forum.firebaseapp.com",
  databaseURL: "https://krath-forum-default-rtdb.firebaseio.com",
  projectId: "krath-forum",
  storageBucket: "krath-forum.firebasestorage.app",
  messagingSenderId: "976851054817",
  appId: "1:976851054817:web:af842c0f22b7f5b61b47a0",
  measurementId: "G-LJZKZCXB10"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let userName = localStorage.getItem('userName') || 'ผู้ใช้ไม่ระบุชื่อ';
let currentThreadId = null;

// DOM
const homePage = document.getElementById('homePage');
const threadPage = document.getElementById('threadPage');
const threadsList = document.getElementById('threadsList');
const noThreads = document.getElementById('noThreads');
const searchInput = document.getElementById('searchInput');
const userNameEl = document.getElementById('userName');
const userBtn = document.getElementById('userBtn');
const newThreadBtn = document.getElementById('newThreadBtn');
const createThreadModal = document.getElementById('createThreadModal');
const userModal = document.getElementById('userModal');

userNameEl.textContent = userName;

// Modal
function openModal(modal) { modal.classList.remove('hidden'); }
function closeModal(modal) { modal.classList.add('hidden'); }

userBtn.addEventListener('click', () => {
  document.getElementById('userNameInput').value = userName;
  openModal(userModal);
});
document.getElementById('closeUserModal').addEventListener('click', () => closeModal(userModal));
document.getElementById('saveUserBtn').addEventListener('click', () => {
  const n = document.getElementById('userNameInput').value.trim();
  if (n) {
    userName = n;
    localStorage.setItem('userName', n);
    userNameEl.textContent = n;
    closeModal(userModal);
  }
});

newThreadBtn.addEventListener('click', () => {
  document.getElementById('threadTitleInput').value = '';
  document.getElementById('threadBodyInput').value = '';
  openModal(createThreadModal);
});
document.getElementById('closeCreateModal').addEventListener('click', () => closeModal(createThreadModal));

document.getElementById('submitThreadBtn').addEventListener('click', () => {
  const title = document.getElementById('threadTitleInput').value.trim();
  const body = document.getElementById('threadBodyInput').value.trim();
  if (!title || !body) { alert('กรุณากรอกหัวข้อและเนื้อหา'); return; }
  push(ref(db, 'threads'), {
    title, body,
    author: userName,
    date: new Date().toLocaleDateString('th-TH'),
    timestamp: Date.now()
  });
  closeModal(createThreadModal);
});

// Load threads
let allThreads = {};
onValue(ref(db, 'threads'), (snapshot) => {
  allThreads = snapshot.val() || {};
  renderThreadsList(searchInput.value);
});

function renderThreadsList(filter = '') {
  threadsList.innerHTML = '';
  const entries = Object.entries(allThreads).reverse();
  const filtered = entries.filter(([, t]) =>
    t.title.includes(filter) || t.body.includes(filter)
  );
  if (filtered.length === 0) {
    noThreads.style.display = 'block';
    return;
  }
  noThreads.style.display = 'none';
  filtered.forEach(([id, thread]) => {
    const preview = thread.body.substring(0, 100) + (thread.body.length > 100 ? '...' : '');
    const comments = thread.comments ? Object.keys(thread.comments).length : 0;
    const div = document.createElement('div');
    div.className = 'thread-card';
    div.innerHTML = `
      <h3>${escapeHtml(thread.title)}</h3>
      <p class="thread-meta">โดย ${escapeHtml(thread.author)} · ${thread.date} · ${comments} ความเห็น</p>
      <p class="thread-preview">${escapeHtml(preview)}</p>
    `;
    div.onclick = () => viewThread(id);
    threadsList.appendChild(div);
  });
}

searchInput.addEventListener('input', (e) => renderThreadsList(e.target.value));

function viewThread(threadId) {
  currentThreadId = threadId;
  homePage.classList.remove('active');
  threadPage.classList.add('active');

  onValue(ref(db, `threads/${threadId}`), (snap) => {
    const thread = snap.val();
    if (!thread) return;
    document.getElementById('detailTitle').textContent = thread.title;
    document.getElementById('detailMeta').textContent = `โดย ${thread.author} · ${thread.date}`;
    document.getElementById('detailBody').textContent = thread.body;

    const comments = thread.comments ? Object.values(thread.comments) : [];
    document.getElementById('commentCount').textContent = comments.length;
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    comments.forEach(c => {
      const div = document.createElement('div');
      div.className = 'comment';
      div.innerHTML = `
        <div class="comment-author">${escapeHtml(c.author)}</div>
        <div class="comment-time">${c.date}</div>
        <div class="comment-text">${escapeHtml(c.text)}</div>
      `;
      commentsList.appendChild(div);
    });

    document.getElementById('editThreadBtn').onclick = () => {
      const newTitle = prompt('แก้ไขหัวข้อ:', thread.title);
      if (newTitle !== null) {
        const newBody = prompt('แก้ไขเนื้อหา:', thread.body);
        if (newBody !== null) {
          update(ref(db, `threads/${threadId}`), { title: newTitle, body: newBody });
        }
      }
    };

    document.getElementById('deleteThreadBtn').onclick = () => {
      if (confirm('แน่ใจว่าต้องการลบกระทู้นี้?')) {
        remove(ref(db, `threads/${threadId}`));
        goHome();
      }
    };
  }, { onlyOnce: false });

  document.getElementById('submitCommentBtn').onclick = () => {
    const text = document.getElementById('commentInput').value.trim();
    if (!text) { alert('กรุณาเขียนความเห็น'); return; }
    push(ref(db, `threads/${threadId}/comments`), {
      author: userName,
      date: new Date().toLocaleDateString('th-TH'),
      text
    });
    document.getElementById('commentInput').value = '';
  };
}

function goHome() {
  homePage.classList.add('active');
  threadPage.classList.remove('active');
  currentThreadId = null;
}

document.getElementById('backBtn').addEventListener('click', goHome);

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}
