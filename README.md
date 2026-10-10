

# CampusLink

*Chat, mentors and campus community in one real-time app.*

CampusLink brings campus communication into one place: students chat one-to-one in real time, connect with alumni for mentorship, share posts and images on a community feed, and catch up on long conversations with an AI summary.

Built for the *First Commit* hackathon by Kamand Prompt, IIT Mandi.

- *Live demo:* add your deployed link here
- *Demo video:* add your YouTube link here
- *Presentation:* add your Google Drive link here

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Real-Time Communication](#real-time-communication)
5. [Project Structure](#project-structure)
6. [Setup (Local)](#setup-local)
7. [Environment Variables](#environment-variables)
8. [Seed Demo Data and Demo Accounts](#seed-demo-data-and-demo-accounts)
9. [Testing in a Clean Environment](#testing-in-a-clean-environment)
10. [Deployment](#deployment)
11. [Security](#security)
12. [Socket Events](#socket-events)
13. [API Overview](#api-overview)
14. [Team](#team)

---

## Features

> Tick each box as you finish the phase, and delete anything you did not build before submitting.

### Core (mandatory)
- [x] *User authentication:* register, login, logout, persistent session (/api/me)
- [ ] *One-to-one chat:* search users, start a private conversation, real-time delivery, stored in the database
- [ ] Conversation list with latest message, history loaded on open, online status

### Extensions
- [ ] *Community Feed:* text and up to 4 images per post, likes, comments, delete own post, new posts appear live for everyone
- [ ] *Alumni Connect:* choose student or alumni at signup, alumni profiles (graduation year, department, company, job title, skills, bio, open to mentoring), searchable directory, one-click "Message" button, verified badge
- [ ] *AI Chat Summary:* "Summarize this chat" button that sends recent messages to the Claude API (from the backend only)
- [x] *Persistent database:* users now; conversations, messages, posts, likes and comments as phases are completed

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Plain HTML, CSS and JavaScript (served from public/ and views/) |
| Backend | Node.js + Express |
| Real-time | Socket.IO (WebSocket-based) |
| Database | SQLite via better-sqlite3 |
| Authentication | express-session (httpOnly cookie) + bcryptjs password hashing |
| AI | Anthropic Claude API, called only from the server |
| Config | dotenv |

---

## Architecture


 ┌──────────────────────────┐
 │   Browser (HTML/CSS/JS)  │
 │  login page · chat · feed│
 │  alumni directory        │
 └───────┬──────────┬───────┘
         │ HTTP     │ WebSocket (Socket.IO)
         │ (REST)   │ real-time messages, live feed
         ▼          ▼
 ┌─────────────────────────────────────┐
 │        Node.js + Express server      │
 │                                      │
 │  express-session ── auth cookie      │
 │  REST routes ────── register/login,  │
 │                     posts, alumni    │
 │  Socket.IO ──────── shares the same  │
 │                     session cookie   │
 └───────┬──────────────────┬──────────┘
         │                  │ HTTPS (API key stays on server)
         ▼                  ▼
 ┌──────────────┐    ┌──────────────────┐
 │ SQLite (.db) │    │  Claude API (AI) │
 └──────────────┘    └──────────────────┘


*How a login works:* the browser sends email and password to POST /api/login. The server checks the bcrypt hash, stores the user id in a session, and sends back an httpOnly cookie. Every later request, including the Socket.IO connection, carries that cookie, so the server always knows who is connected.

---

## Real-Time Communication

CampusLink uses *Socket.IO*, which runs on WebSockets (with automatic fallback and reconnection).

- When a user opens the app, the browser connects to the server. The connection is *authenticated with the same session cookie* used for the REST API, so anonymous sockets are rejected.
- Each user joins a personal room, and each conversation is its own room, so messages reach only the people in that conversation.
- The server saves every message to SQLite and then broadcasts it to the room, so history survives refreshes and restarts.
- The feed uses the same connection to push new posts, likes and comments to everyone live.

---

## Project Structure


campuslink/
├── server.js          # Express app, auth routes, Socket.IO setup
├── db.js              # SQLite connection and table creation
├── seed.js            # Demo data script (added in Phase 6)
├── views/
│   └── app.html       # Main app page (login required)
├── public/
│   ├── index.html     # Login / register page
│   ├── style.css
│   └── js/            # Browser-side scripts
├── uploads/           # Uploaded images (not committed)
├── .env.example       # Template for environment variables
├── .gitignore
└── package.json


---

## Setup (Local)

### Prerequisites
- [Node.js](https://nodejs.org) LTS (version 20 or newer)
- [Git](https://git-scm.com)

### Steps

bash
# 1. Clone the repository
git clone https://github.com/YOUR-USERNAME/campuslink.git
cd campuslink

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env          # Windows (Command Prompt): copy .env.example .env

# 4. Generate a random session secret and paste it into .env as SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 5. (Optional) Load demo data
npm run seed

# 6. Start the app
npm run dev      # development, auto-restarts on changes
# or
npm start        # plain start


Open *http://localhost:3000* in your browser.

The database file campuslink.db is created automatically on first run.

---

## Environment Variables

Copy .env.example to .env and fill in the values. *Never commit .env.*

| Variable | Required | Description |
|---|---|---|
| PORT | No | Port the server listens on. Default 3000. |
| SESSION_SECRET | *Yes* | Long random string used to sign session cookies. The server will not start without it. |
| NODE_ENV | No | development locally, production when deployed (enables secure cookies). |
| ANTHROPIC_API_KEY | For AI summary | API key from the Anthropic developer console. Used only on the server. |
| ANTHROPIC_MODEL | For AI summary | Model name to use for summaries (check the Anthropic docs for current names). |

If ANTHROPIC_API_KEY is missing, the app still works. The summary button shows a friendly error instead.

---

## Seed Demo Data and Demo Accounts

Run once to fill the app with sample users, chats and posts:

bash
npm run seed


> The seed script is added in Phase 6. After you write it, update the table below with the real accounts.

| Role | Email | Password |
|---|---|---|
| Student | student1@campuslink.test | password123 |
| Student | student2@campuslink.test | password123 |
| Alumni | alumni1@campuslink.test | password123 |

These are demo-only credentials. Do not reuse them anywhere real.

---

## Testing in a Clean Environment

Follow these steps on a machine that has only Node.js and Git installed.

1. Clone the repo and run the [setup steps](#setup-local).
2. Open http://localhost:3000 in a normal browser window and register *User A*.
3. Open an *incognito/private window* and register *User B*.
4. *Auth check:* log out and back in, refresh the page (you stay logged in), and open /app while logged out (you are redirected to the login page).
5. *Chat check:* from User A, search for User B and send a message. It should appear instantly in User B's window without a refresh. Refresh both windows and confirm the history is still there.
6. *Feed check:* post text and an image as User A. User B sees it appear live. Like and comment from User B.
7. *Alumni check:* register an alumnus, fill in the profile, then find them in the directory as a student and click *Message*.
8. *AI check:* in a conversation with several messages, click *Summarize this chat* (requires ANTHROPIC_API_KEY).

---

## Deployment

The app is a single Node.js service, so it deploys easily to *Render* or *Railway*.

*Render (example):*
1. Push the code to GitHub.
2. Create a new *Web Service* on Render and connect the repo.
3. Build command: npm install and start command: npm start.
4. Add environment variables: NODE_ENV=production, SESSION_SECRET, and optionally ANTHROPIC_API_KEY and ANTHROPIC_MODEL.
5. Deploy and open the generated URL.

*Note:* on free hosting tiers the disk may reset on redeploy, which wipes the SQLite file and uploaded images. Run npm run seed again after a redeploy, or attach a persistent disk if your host offers one.

---

## Security

- Passwords are hashed with bcrypt and never stored in plain text.
- Sessions use httpOnly, SameSite cookies (and secure in production), so browser scripts cannot read them.
- Socket.IO connections are authenticated with the same session.
- All database queries use prepared statements (protection against SQL injection).
- User content is rendered with textContent, not innerHTML, to prevent XSS.
- Uploads are limited by type (jpg, png, webp) and size (5 MB each), and are saved under random filenames.
- API keys and secrets live only in .env, which is listed in .gitignore. The AI key is used only on the server and is never sent to the browser.

---

## Socket Events

> Update this list to match what you actually built.

| Event | Direction | Purpose |
|---|---|---|
| message:send | client → server | Send a chat message |
| message:new | server → client | A new message arrived in one of your conversations |
| presence:update | server → client | A user came online or went offline |
| post:new | server → client | A new feed post was created |
| post:like | server → client | A post's like count changed |
| comment:new | server → client | A new comment was added |

---

## API Overview

| Method | Route | Description |
|---|---|---|
| POST | /api/register | Create an account and start a session |
| POST | /api/login | Log in |
| POST | /api/logout | Log out and destroy the session |
| GET | /api/me | Get the currently logged-in user |

> Add the chat, feed, alumni and AI routes here as you build them.

---

## Team

| Name | Role |
|HARSHITA|TEAM LEADER/FRONTEND|
|MANYA|BACKEND|
SASMITHA|PRESENTATION|
KHWAISH|BACKEND
