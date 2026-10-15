# ConnectHub

A real-time community forum and chat platform built with the **MERN** stack and **Socket.io**.
Post, comment, vote, chat live in per-category rooms, get notified the moment someone replies to you, and moderate everything from an admin dashboard.

[![CI](https://github.com/<your-username>/connecthub/actions/workflows/ci.yml/badge.svg)](https://github.com/<your-username>/connecthub/actions)

> **Live demo:** _add your Vercel URL here_ · **API:** _add your Render URL here_

## Features

| Area | What you get |
| --- | --- |
| **Auth** | Register / login / logout, bcrypt-hashed passwords, JWT in an **httpOnly cookie**, protected routes, `user` / `admin` roles |
| **Forum** | CRUD posts, comments, up/down voting, categories + tags, full-text search, filters, sorting, pagination (URL-driven, shareable) |
| **Real-time** | One chat room per category, online-user list, typing indicators, live "someone commented on your post" notifications (persisted + pushed) |
| **Profile** | A user's posts, comments, activity timeline, karma, editable bio |
| **Admin** | Delete any post/comment, ban/unban users (banned users are kicked from sockets instantly), stats dashboard (users, posts, online users, active rooms) |
| **Quality** | Joi validation, centralized error handler, helmet, CORS, rate limiting, CSRF origin guard, MongoDB indexes, 53 Jest + Supertest tests |

## Tech stack

- **Server:** Node.js, Express 4, Mongoose 8, Socket.io 4, Joi, JWT, bcryptjs, helmet, express-rate-limit
- **Client:** React 18 (Vite), React Router 6, Context API, Tailwind CSS 3, Axios, socket.io-client
- **Database:** MongoDB (Atlas in production)
- **Tests:** Jest, Supertest, mongodb-memory-server, socket.io-client

## Project structure

```
connecthub/
├── package.json                 # root scripts (install:all, dev, seed, test, build)
├── .github/workflows/ci.yml     # runs server tests + client build on every push/PR
├── server/
│   ├── .env.example
│   ├── src/
│   │   ├── app.js               # Express app (helmet, CORS, parsers, rate limit, routes, errors)
│   │   ├── server.js            # boots DB + HTTP server + Socket.io, graceful shutdown
│   │   ├── config/              # env loader, DB connection, constants (categories, roles)
│   │   ├── models/              # User, Post, Comment, Message, Notification (+ indexes)
│   │   ├── validators/          # Joi schemas
│   │   ├── middleware/          # auth (protect/optionalAuth/requireRole), validate, rateLimiter, originGuard, errorHandler
│   │   ├── routes/              # URL -> middleware -> controller wiring
│   │   ├── controllers/         # thin HTTP layer (parse req, call service, send res)
│   │   ├── services/            # business logic (auth, posts, comments, notifications, chat, users, admin)
│   │   ├── sockets/             # Socket.io server, presence helpers, io singleton
│   │   ├── utils/               # ApiError, asyncHandler, JWT/cookie helpers, serializers
│   │   └── scripts/seed.js      # sample users, posts, comments, votes, chat messages
│   └── tests/                   # auth.test.js, post.test.js, socket.test.js + helpers
└── client/
    ├── .env.example · vercel.json · tailwind.config.js · vite.config.js
    └── src/
        ├── api/                 # axios instance + one function per endpoint
        ├── context/             # AuthContext, SocketContext, ToastContext
        ├── components/          # Navbar, PostCard, VoteButtons, CommentSection, Pagination, ...
        ├── pages/               # Home, Login, Register, PostDetail, PostForm, Chat, Profile, Admin, NotFound
        ├── hooks/ · utils/ · constants.js
        └── App.jsx · main.jsx · index.css
```

## Getting started

**Prerequisites:** Node.js 18+ and a MongoDB instance (local or a free [Atlas](https://www.mongodb.com/atlas) cluster).

```bash
# 1. Install everything (root + server + client)
npm run install:all

# 2. Configure environment
cp server/.env.example server/.env     # then edit MONGO_URI and JWT_SECRET
cp client/.env.example client/.env

# 3. Seed sample data (wipes the ConnectHub collections first!)
npm run seed

# 4. Run API (http://localhost:5000) and client (http://localhost:5173) together
npm run dev

# 5. Run the tests (uses an in-memory MongoDB, no setup needed)
npm test
```

Generate a strong secret with:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### Demo accounts (after seeding)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@connecthub.dev` | `Admin123!` |
| User | `alice@connecthub.dev` (also `bob`, `carol`, `dave`, `erin`) | `Password123!` |

Open two browsers (or one normal + one incognito window), log in as different users, join the same chat room and comment on each other's posts to see the real-time features.

> The first test run downloads a MongoDB binary (~100 MB) for `mongodb-memory-server`; it is cached afterwards.
>
> There is no public "make me admin" endpoint on purpose. To promote a user, run in `mongosh`:
> `db.users.updateOne({ username: "yourname" }, { $set: { role: "admin" } })`

## Environment variables

**server/.env**

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` / `production` |
| `PORT` | API port (Render sets this for you) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string (>= 32 chars in production) |
| `JWT_EXPIRES_DAYS` | Session length in days (default 7) |
| `CLIENT_URL` | Allowed browser origin(s) for CORS + Socket.io, comma-separated, no trailing slash |

**client/.env**

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL, e.g. `http://localhost:5000` (no `/api`) |
| `VITE_SOCKET_URL` | Socket.io URL, normally the same as the API |

## API reference

All routes are prefixed with `/api`. Errors always look like `{ "status": "error", "message": "...", "details": [...] }`.
Auth = httpOnly cookie. 🔒 = login required, 🛡️ = admin only.

### Auth
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/auth/register` | Create account, sets session cookie |
| POST | `/auth/login` | Log in, sets session cookie |
| POST | `/auth/logout` | Clears the cookie |
| GET | `/auth/me` 🔒 | Current user |

### Posts
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/posts` | List. Query: `page`, `limit` (≤50), `search`, `category`, `tag`, `author`, `sort` = `new` \| `top` \| `discussed` \| `relevance` |
| POST | `/posts` 🔒 | Create `{ title, body, category, tags[] }` |
| GET | `/posts/:id` | Single post (includes the viewer's `userVote`) |
| PATCH | `/posts/:id` 🔒 | Update (author or admin) |
| DELETE | `/posts/:id` 🔒 | Delete with its comments (author or admin) |
| POST | `/posts/:id/vote` 🔒 | `{ value: 1 \| -1 \| 0 }` -> `{ score, userVote }` |

### Comments
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/posts/:id/comments` | Oldest first. Query: `page`, `limit` |
| POST | `/posts/:id/comments` 🔒 | `{ body }`; notifies the post author in real time |
| DELETE | `/comments/:id` 🔒 | Author or admin |

### Users / profile
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/users/:username` | Profile + stats (posts, comments, karma) |
| GET | `/users/:username/posts` | Their posts (same query params as `/posts`) |
| GET | `/users/:username/comments` | Their comments |
| GET | `/users/:username/activity` | Mixed timeline of recent posts and comments |
| PATCH | `/users/me` 🔒 | Update bio |

### Notifications & chat
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/notifications` 🔒 | Latest notifications + unread count |
| PATCH | `/notifications/read-all` 🔒 | Mark everything read |
| PATCH | `/notifications/:id/read` 🔒 | Mark one read |
| GET | `/chat/:category/messages` 🔒 | Room history. Query: `before` (ISO date), `limit` |

### Admin
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/admin/stats` 🛡️ | Users, posts, comments, online users, active rooms, posts per category |
| GET | `/admin/users` 🛡️ | Search/paginate users |
| PATCH | `/admin/users/:id/ban` 🛡️ | `{ banned: true \| false }` |

### Misc
`GET /health` (uptime check), `GET /categories`.

### Socket.io events

Handshake is authenticated with the same session cookie.

| Direction | Event | Payload |
| --- | --- | --- |
| client -> server | `room:join` / `room:leave` | `{ category }` (ack `{ ok }`) |
| client -> server | `chat:message` | `{ category, body }` (ack `{ ok, message? }`) |
| client -> server | `chat:typing` | `{ category, isTyping }` |
| server -> client | `chat:message` | message object |
| server -> client | `chat:typing` | `{ category, user, isTyping }` |
| server -> client | `room:users` | `{ category, users[] }` |
| server -> client | `presence:update` | `users[]` (everyone online) |
| server -> client | `notification:new` | notification object |

## Architecture overview

```
 React SPA (Vercel)  ──REST + cookie──▶  Express API (Render)  ──Mongoose──▶  MongoDB Atlas
        │                                     │
        └────── Socket.io (cookie auth) ──────┘
```

**Layering (server):** `route -> middleware (auth / validate / rate-limit) -> controller -> service -> model`.
Controllers only translate HTTP; services hold the rules (ownership checks, vote logic, notifications) and know nothing about `req`/`res`; serializers shape every response so password hashes and vote arrays never leak.

**Key design decisions**
- **JWT in an httpOnly cookie** instead of localStorage, so XSS cannot steal the token. Because the SPA and API sit on different sites in production the cookie is `SameSite=None; Secure`, and an **Origin guard** rejects state-changing requests from unknown origins to compensate for the CSRF exposure.
- **The user is re-read on every request**, so banning someone or changing a role takes effect immediately instead of when the token expires. Bans also call `disconnectSockets` to kick live connections.
- **Votes are one atomic aggregation-pipeline update** (remove user from both sets, add to the chosen one, recompute `score`) so concurrent votes can't corrupt the count. `score` is stored (denormalised) so "top" sorting uses an index.
- **Comments are their own collection** referenced by `post`, not embedded, because threads are unbounded.
- **Indexes** match the queries: `{category, createdAt}`, `{score, createdAt}`, `{author, createdAt}`, `{tags, createdAt}`, a weighted text index on title/body/tags, `{post, createdAt}` for comments, `{category, createdAt}` for chat history, `{recipient, createdAt}` for notifications.
- **Presence is derived from Socket.io itself** (`fetchSockets`), not duplicated in a database. A user with several tabs counts once.
- **Notifications are persisted first, then pushed**, so offline users still see them in the bell later.
- **Validation:** Joi on every body/query/param with `stripUnknown`, which also blocks NoSQL operator injection and mass-assignment (e.g. you cannot register yourself as admin).

**Known limitations (honest trade-offs)**
- Presence/rooms live in a single Node process. Scaling to several instances needs `@socket.io/redis-adapter`.
- `$text` search is word-based (no fuzzy matching); MongoDB Atlas Search is the upgrade path.
- Render's free tier sleeps after inactivity, so the first request (and socket connect) may take ~30 s.

## Deployment

### 1. Database - MongoDB Atlas
1. Create a free **M0** cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. **Database Access** -> add a user with a strong password (read/write).
3. **Network Access** -> allow `0.0.0.0/0` (Render's free tier has no static IP).
4. **Connect -> Drivers** -> copy the connection string and put your database name in it:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/connecthub?retryWrites=true&w=majority`
5. (Optional) seed it once from your machine: set `MONGO_URI` to the Atlas string in `server/.env`, then `NODE_ENV=production npm run seed --prefix server -- --force`.

### 2. API - Render
1. Push the repo to GitHub.
2. Render dashboard -> **New -> Web Service** -> select the repo.
3. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
4. Environment variables:
   - `NODE_ENV=production`
   - `MONGO_URI=<your Atlas string>`
   - `JWT_SECRET=<48+ random bytes, hex>`
   - `CLIENT_URL=https://<your-app>.vercel.app` (exact origin, no trailing slash; add a custom domain too, comma-separated)
5. Deploy and note the URL, e.g. `https://connecthub-api.onrender.com`.

### 3. Client - Vercel
1. Vercel -> **Add New -> Project** -> import the repo.
2. **Root Directory:** `client` (framework preset: Vite; build `npm run build`; output `dist`).
3. Environment variables:
   - `VITE_API_URL=https://connecthub-api.onrender.com`
   - `VITE_SOCKET_URL=https://connecthub-api.onrender.com`
4. Deploy. `client/vercel.json` rewrites all routes to `index.html` so deep links and refreshes work.
5. Go back to Render and make sure `CLIENT_URL` exactly matches the final Vercel URL, then redeploy the API.

### Troubleshooting
- **Login works but you are logged out on refresh:** the cookie is being blocked. Check `NODE_ENV=production` on Render (enables `SameSite=None; Secure`) and that `CLIENT_URL` matches the browser origin exactly. Some browsers block third-party cookies by default; for a bulletproof setup serve both apps from subdomains of one custom domain (e.g. `app.example.com` + `api.example.com`).
- **CORS error:** `CLIENT_URL` is missing the origin or has a trailing slash.
- **Chat says "Reconnecting…":** the API is waking up (free tier) or `VITE_SOCKET_URL` is wrong.

## Scripts

| Command | Where | Purpose |
| --- | --- | --- |
| `npm run install:all` | root | install root, server and client dependencies |
| `npm run dev` | root | API (nodemon) + client (Vite) together |
| `npm run seed` | root | wipe and seed demo data |
| `npm test` | root | server test suite |
| `npm run build` | root | production client build |
| `npm start` | server | run the API in production mode |

## License

MIT
