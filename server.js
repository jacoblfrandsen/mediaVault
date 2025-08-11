

// Write package.json on first run if missing (quality-of-life for copy/paste)


import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid/non-secure';
import { fileURLToPath } from 'url';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ------------ Config ------------
const PORT = process.env.PORT || 3000;
const SHARED_PASSWORD = process.env.SHARED_PASSWORD || 'letmein'; // ✱ set your own in .env
const SESSION_SECRET = process.env.SESSION_SECRET || 'media-shelf-secret';

// ------------ Middleware ------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true }
  })
);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ------------ In-memory stores (swap for DB later) ------------
/** @type {Array<{id:string,type:'movie'|'book', title:string, year?:number, author?:string, director?:string, driveUrl?:string, uploader:string, createdAt:number}>} */
const media = [];
/** @type {Array<{id:string, user:string, action:'watch'|'download'|'upload', mediaId?:string, title?:string, ts:number}>} */
const activity = [];
/** @type {Set<string>} */
const users = new Set();

// Seed with sample items (you can delete)
(function seed(){
  const m1 = { id: nanoid(), type: 'movie', title: 'Finding Nemo', year: 2003, director: 'Andrew Stanton', driveUrl: 'https://drive.google.com/your-nemo-file', uploader: 'admin', createdAt: Date.now() - 86400000 };
  const b1 = { id: nanoid(), type: 'book', title: 'Project Hail Mary', year: 2021, author: 'Andy Weir', driveUrl: 'https://drive.google.com/your-phm-file', uploader: 'admin', createdAt: Date.now() - 43200000 };
  media.push(m1, b1);
  users.add('admin');
  activity.push(
    { id: nanoid(), user: 'admin', action: 'upload', mediaId: m1.id, title: m1.title, ts: Date.now() - 86000000 },
    { id: nanoid(), user: 'admin', action: 'upload', mediaId: b1.id, title: b1.title, ts: Date.now() - 43000000 }
  );
})();

// ------------ Auth helpers ------------
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ------------ Routes: Auth ------------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  console.log(`Login attempt by ${username}`);
  console.log(`Password: ${password}`, 'SHARED_PASSWORD:', SHARED_PASSWORD);
  if (password !== SHARED_PASSWORD) return res.status(401).json({ error: 'Invalid password' });
  req.session.user = username.trim();
  users.add(req.session.user);
  return res.json({ ok: true, user: req.session.user });
});

app.post('/api/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session?.user || null });
});

// ------------ Routes: Media (books & movies) ------------
// GET /api/media?type=movie|book  — list
app.get('/api/media', requireAuth, (req, res) => {
  const { type } = req.query;
  const list = type ? media.filter(m => m.type === type) : media;
  res.json(list.sort((a,b)=>b.createdAt - a.createdAt));
});

// GET /api/media/:id — detail
app.get('/api/media/:id', requireAuth, (req, res) => {
  const item = media.find(m => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// POST /api/media — metadata-only upload (plug Drive/storage later)
// body: { type: 'movie'|'book', title, year?, author?, director?, driveUrl? }
app.post('/api/media', requireAuth, (req, res) => {
  const user = req.session.user;
  const { type, title, year, author, director, driveUrl } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'type and title are required' });
  if (!['movie','book'].includes(type)) return res.status(400).json({ error: 'type must be movie or book' });
  const item = { id: nanoid(), type, title: title.trim(), year: year? Number(year): undefined, author: author?.trim(), director: director?.trim(), driveUrl: driveUrl?.trim(), uploader: user, createdAt: Date.now() };
  media.push(item);
  activity.push({ id: nanoid(), user, action: 'upload', mediaId: item.id, title: item.title, ts: Date.now() });
  res.status(201).json(item);
});

// POST /api/media/:id/download?action=watch|download  — log an access
app.post('/api/media/:id/download', requireAuth, (req, res) => {
  const user = req.session.user;
  const item = media.find(m => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const action = (req.query.action === 'watch') ? 'watch' : 'download';
  activity.push({ id: nanoid(), user, action, mediaId: item.id, title: item.title, ts: Date.now() });
  res.json({ ok: true });
});

// ------------ Routes: Activity & Users ------------
// GET /api/activity?limit=50 — recent feed
app.get('/api/activity', requireAuth, (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const feed = activity
    .slice()
    .sort((a,b)=>b.ts - a.ts)
    .slice(0, limit);
  res.json(feed);
});

// GET /api/users — who exists
app.get('/api/users', requireAuth, (req, res) => {
  res.json(Array.from(users).sort());
});

// ------------ Pages ------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// ------------ Start server ------------
app.listen(PORT, () => {
  console.log(`MediaShelf running on http://localhost:${PORT}`);
});