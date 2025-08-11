# MediaVault

A minimal Node + Express app with plain HTML/CSS/JS for managing a family library of **movies** and **audiobooks/books**.  
Includes a simple login (any username + one shared password) and a social activity feed (e.g., “luke watched Nemo”).

---

## Features (quick)
- Login: any username + one shared password from `.env`
- Lists: Movies & Books (metadata only for now)
- Add items: title, year, author/director, optional Drive/URL
- Social feed: who **uploaded**, **downloaded**, or **watched/read**
- Clean REST endpoints so you can swap in your real backend later

---

## Prerequisites
- **Node.js** 16+ recommended (18+ ideal).  
  If you’re on older Node and hit `webcrypto` errors from `nanoid`, this project uses `nanoid/non-secure` to keep things working.

---

## Get started

```bash
# 1) Clone or copy this folder, then:
cd mediaVault

# 2) Create your .env (at project root)
#    Example:
#    SHARED_PASSWORD="test"
#    SESSION_SECRET="something-random"
#    PORT=3000

# 3) Install deps
npm install

# 4) Run
npm start
# -> http://localhost:3000