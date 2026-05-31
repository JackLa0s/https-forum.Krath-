// Data Management
const db = {
  threads: [],
  userName: 'ผู้ใช้ไม่ระบุชื่อ'
};

// Initialize DB from localStorage
function initDB() {
  const saved = localStorage.getItem('forumDB');
  if (saved) {
    Object.assign(db, JSON.parse(saved));
  } else {
    // Sample data
    db.threads = [
      {
        id: Date.now() + Math.random(),
        title: 'ยินดีต้อนรับ',
        author: 'ผู้ดูแล',
        date: new Date().toLocaleDateString('th-TH'),
        body: 'ยินดีต้อนรับสู่เว็บกระทู้ส่วนตัว! 🎉\n\nคุณสามารถ:\n- สร้างกระทู้ใหม่\n- ตอบความเห็น\n- ค้นหากระทู้\n- แก้ไขและลบกระทู้ของคุณ',
        comments: []
      }
    ];
    saveDB();
  }
}

function saveDB() {
  localStorage.setItem('forumDB', JSON.stringify(db));
}

// DOM Elements
const homePage = document.getElementById('homePage');
const threadPage = document.getElementById('threadPage');
const threadsList = document.getElementById('threadsList');
const noThreads = document.getElementById('noThreads');
const searchInput = document.getElementById('searchInput');
const newThreadBtn = document.getElementById('newThreadBtn');
const createThreadModal = document.getElementById('createThreadModal');
const userModal = document.getElementById('userModal');
const userName = document.getElementById('userName');
const userBtn = document.getElementById('userBtn');

// Modal Functions
function openModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

// User Management
userBtn.addEventListener('click', () => {
  document.getElementById('userNameInput').value = db.userName;
  openModal(userModal);
});

document.getElementById('closeUserModal').addEventListener('click', () => {
  closeModal(userModal);
});

document.getElementById('saveUserBtn').addEventListener('click', () => {
  const newName = document.getElementById('userNameInput').value.trim();
  if (newName) {
    db.userName = newName;
    userName.textContent = newName;
    saveDB();
    closeModal(userModal);
  }
});

// Initialize user name
userName.textContent = db.userName;

// Create Thread
newThreadBtn.addEventListener('click', () => {
  document.getElementById('threadTitleInput').value = '';
  document.getElementById('threadBodyInput').value = '';
  openModal(createThreadModal);
});

document.getElementById('closeCreateModal').addEventListener('click', () => {
  closeModal(createThreadModal);
});

document.getElementById('submitThreadBtn').addEventListener('click', () => {
  const title = document.getElementById('threadTitleInput').value.trim();
  const body = document.getElementById('threadBodyInput').value.trim();

  if (!title || !body) {
    alert('กรุณากรอกหัวข้อและเนื้อหา');
    return;
  }

  const thread = {
    id: Date.now() + Math.random(),
    title,
    body,
    author: db.userName,
    date: new Date().toLocaleDateString('th-TH'),
    comments: []
  };

  db.threads.unshift(thread);
  saveDB();
  closeModal(createThreadModal);
  renderThreadsList();
});

// Render Threads List
function renderThreadsList(filter = '') {
  const filtered = db.threads.filter(t =>
    t.title.includes(filter) || t.body.includes(filter)
  );

  threadsList.innerHTML = '';

  if (filtered.length === 0) {
    noThreads.style.display = 'block';
    return;
  }

  noThreads.style.display = 'none';

  filtered.forEach(thread => {
    const preview = thread.body.substring(0, 100) + (thread.body.length > 100 ? '...' : '');
    const html = `
      <div class="thread-card" onclick="viewThread('${thread.id}')">
        <h3>${escapeHtml(thread.title)}</h3>
        <p class="thread-meta">
          โดย ${escapeHtml(thread.author)} · ${thread.date} · ${thread.comments.length} ความเห็น
        </p>
        <p class="thread-preview">${escapeHtml(preview)}</p>
      </div>
    `;
    threadsList.innerHTML += html;
  });
}

// View Thread Detail
function viewThread(threadId) {
  const parsedId = parseFloat(threadId);
  const thread = db.threads.find(t => t.id === parsedId);
  if (!thread) return;

  homePage.classList.remove('active');
  threadPage.classList.add('active');

  document.getElementById('detailTitle').textContent = thread.title;
  document.getElementById('detailMeta').textContent = `โดย ${thread.author} · ${thread.date}`;
  document.getElementById('detailBody').textContent = thread.body;
  document.getElementById('commentCount').textContent = thread.comments.length;

  // Render Comments
  const commentsList = document.getElementById('commentsList');
  commentsList.innerHTML = '';
  thread.comments.forEach(comment => {
    const html = `
      <div class="comment">
        <div class="comment-author">${escapeHtml(comment.author)}</div>
        <div class="comment-time">${comment.date}</div>
        <div class="comment-text">${escapeHtml(comment.text)}</div>
      </div>
    `;
    commentsList.innerHTML += html;
  });

  // Edit/Delete Buttons
  document.getElementById('editThreadBtn').onclick = () => {
    const newTitle = prompt('แก้ไขหัวข้อ:', thread.title);
    if (newTitle !== null) {
      const newBody = prompt('แก้ไขเนื้อหา:', thread.body);
      if (newBody !== null) {
        thread.title = newTitle;
        thread.body = newBody;
        saveDB();
        viewThread(threadId);
      }
    }
  };

  document.getElementById('deleteThreadBtn').onclick = () => {
    if (confirm('แน่ใจว่าต้องการลบกระทู้นี้?')) {
      db.threads = db.threads.filter(t => t.id !== threadId);
      saveDB();
      goHome();
    }
  };

  // Comment Submit
  document.getElementById('submitCommentBtn').onclick = () => {
    const text = document.getElementById('commentInput').value.trim();
    if (!text) {
      alert('กรุณาเขียนความเห็น');
      return;
    }

    thread.comments.push({
      author: db.userName,
      date: new Date().toLocaleDateString('th-TH'),
      text
    });

    saveDB();
    document.getElementById('commentInput').value = '';
    viewThread(threadId);
  };
}

// Go Back Home
function goHome() {
  homePage.classList.add('active');
  threadPage.classList.remove('active');
  renderThreadsList();
}

document.getElementById('backBtn').addEventListener('click', goHome);

// Search
searchInput.addEventListener('input', (e) => {
  renderThreadsList(e.target.value);
});

// Helper Functions
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize
initDB();
renderThreadsList();
