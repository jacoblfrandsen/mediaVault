async function api(path, opts={}){
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

function timeAgo(ts){
  const s = Math.floor((Date.now()-ts)/1000);
  if (s<60) return s+"s ago"; const m=Math.floor(s/60); if(m<60) return m+"m ago"; const h=Math.floor(m/60); if(h<24) return h+"h ago"; const d=Math.floor(h/24); return d+"d ago";
}

async function loadMe(){
  const { user } = await api('/api/me');
  if (!user) { window.location.href = '/'; return; }
  document.getElementById('me').textContent = user;
}

async function loadLists(){
  const movies = await api('/api/media?type=movie');
  const books = await api('/api/media?type=book');
  const moviesEl = document.getElementById('movies');
  const booksEl = document.getElementById('books');
  moviesEl.innerHTML = movies.map(renderTile).join('');
  booksEl.innerHTML = books.map(renderTile).join('');
  attachTileHandlers();
}

function renderTile(item){
  const who = item.uploader ? `<span class="meta">by ${item.uploader}</span>` : '';
  const meta = item.type === 'movie' ? (item.director||'') : (item.author||'');
  const year = item.year ? ` • ${item.year}` : '';
  const link = item.driveUrl ? `<a href="${item.driveUrl}" target="_blank">Open file</a>` : '';
  return `
  <li class="tile" data-id="${item.id}">
    <div class="title">${item.title}</div>
    <div class="meta">${item.type}${year}${meta? ' • '+meta:''}</div>
    ${who}
    <div class="actions">
      ${link}
      <button data-action="watch">Mark watched/read</button>
      <button data-action="download">Mark downloaded</button>
    </div>
  </li>`;
}

function attachTileHandlers(){
  document.querySelectorAll('.tile button').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      const action = e.target.getAttribute('data-action');
      const li = e.target.closest('.tile');
      const id = li.getAttribute('data-id');
      try {
        await api(`/api/media/${id}/download?action=${action}`, { method: 'POST' });
        await loadActivity();
      } catch(err){ alert(err.message); }
    });
  });
}

async function loadActivity(){
  const feed = await api('/api/activity?limit=50');
  const el = document.getElementById('activity');
  el.innerHTML = feed.map(entry=>{
    const verb = entry.action === 'watch' ? 'watched' : (entry.action === 'download' ? 'downloaded' : 'uploaded');
    const title = entry.title ? ` <strong>${entry.title}</strong>` : '';
    return `<li><span class="muted">${timeAgo(entry.ts)}</span> — <strong>${entry.user}</strong> ${verb}${title}</li>`;
  }).join('');
}

async function initUpload(){
  const form = document.getElementById('uploadForm');
  const errorEl = document.getElementById('uploadError');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    errorEl.textContent = '';
    const fd = new FormData(form);
    const type = fd.get('type');
    const title = fd.get('title');
    const year = fd.get('year');
    const person = fd.get('person');
    const driveUrl = fd.get('driveUrl');
    const body = { type, title, driveUrl };
    if (year) body.year = Number(year);
    if (type === 'movie' && person) body.director = person;
    if (type === 'book' && person) body.author = person;
    try {
      await api('/api/media', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      form.reset();
      await loadLists();
      await loadActivity();
    } catch(err){ errorEl.textContent = err.message; }
  });
}

async function init(){
  await loadMe();
  await loadLists();
  await loadActivity();
  initUpload();
  document.getElementById('logoutBtn').addEventListener('click', async ()=>{
    try { await api('/api/logout', { method:'POST' }); window.location.href = '/'; } catch(err){ alert(err.message); }
  });
}

init();


const pubDir = path.join(__dirname, 'public');
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir);
const ensure = (p, contents) => { if (!fs.existsSync(p)) fs.writeFileSync(p, contents, 'utf8'); };
ensure(path.join(pubDir, 'login.html'), LOGIN_HTML);
ensure(path.join(pubDir, 'app.html'), APP_HTML);
ensure(path.join(pubDir, 'styles.css'), CSS);
ensure(path.join(pubDir, 'app.js'), APP_JS);
