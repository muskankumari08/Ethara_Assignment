# Team Task Manager

Full-stack team task manager with **role-based access control** (Admin / Member), **JWT authentication**, **Django REST Framework** APIs, **React** + **Tailwind CSS** UI, and **PostgreSQL** (via `DATABASE_URL`) for production deployments such as **Railway**.

> **Submission placeholders (fill in after you deploy and publish):**
>
> - **Live URL (frontend):** `https://YOUR-FRONTEND.up.railway.app`
> - **Live URL (API):** `https://YOUR-BACKEND.up.railway.app`
> - **GitHub repository:** `https://github.com/YOUR_ORG/YOUR_REPO`
> - **Demo video (2–5 minutes):** upload to YouTube/Loom and paste the link here

## Features

- **Authentication:** signup (name, email, password, confirm password), login (email, password), bcrypt password hashing via Django, JWT access/refresh tokens, protected frontend routes.
- **RBAC:** **Admin** — full project/task CRUD, assign tasks, view all data. **Member** — see projects they belong to, see **only assigned tasks**, update **task status** only (backend enforced).
- **Projects:** name, description, team members (M2M), created-by, created-at timestamps.
- **Tasks:** title, description, status (`todo` | `in_progress` | `completed`), due date, assignee, linked project; overdue logic on the dashboard.
- **Dashboard:** totals, completed, pending, overdue counts, status summary, recent tasks, overdue list.
- **UI:** responsive layout, sidebar navigation, cards, Tailwind-powered styling.

## Repository layout

| Path | Description |
|------|-------------|
| `backend/` | Django 5 + DRF + SimpleJWT + Gunicorn |
| `frontend/` | Vite + React 19 + React Router 7 + Tailwind 3 |

## REST API (required routes)

Base URL: your backend origin (e.g. `https://YOUR-BACKEND.up.railway.app`).

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/signup/` | Creates user; first signup becomes **admin**, later users are **members** (demo-friendly). Returns tokens + user. |
| `POST` | `/api/login/` | JWT; response includes `access`, `refresh`, and `user`. |
| `GET` | `/api/users/` | **Admin only** — list users for team invites / assignments. |
| `GET` / `POST` | `/api/projects/` | List scoped by role; create **admin only**. |
| `GET` / `PUT` / `DELETE` | `/api/projects/:id/` | Members: read if on team; write/delete **admin only**. |
| `GET` / `POST` | `/api/tasks/` | Optional `?project=<id>`. Members see assigned tasks only. |
| `GET` / `PUT` / `DELETE` | `/api/tasks/:id/` | Members: **PUT** with `{ "status": "..." }` only on assigned tasks. Admins: full update. Delete **admin only**. |

All authenticated routes expect `Authorization: Bearer <access_token>`.

## Local development

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
copy env.example .env           # optional: tune variables
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

- API root: `http://127.0.0.1:8000/api/...`
- Admin: `http://127.0.0.1:8000/admin/` (create superuser with `python manage.py createsuperuser`)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: `http://127.0.0.1:5173`
- Vite proxies `/api` → `http://127.0.0.1:8000` (see `frontend/vite.config.js`). Leave `VITE_API_URL` empty in dev.

### 3. PostgreSQL locally (optional)

Set `DATABASE_URL` to a Postgres URL before `migrate`. If unset, SQLite (`backend/db.sqlite3`) is used automatically.

## Production environment variables

### Backend (`backend/env.example`)

| Variable | Purpose |
|----------|---------|
| `DJANGO_SECRET_KEY` | Long random secret |
| `DJANGO_DEBUG` | `false` in production |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hosts (include your Railway host) |
| `DATABASE_URL` | Railway Postgres connection string |
| `DATABASE_SSL_REQUIRE` | Set `true` when your provider requires SSL |
| `CORS_ALLOWED_ORIGINS` | Comma-separated **frontend** origins (scheme + host, no path) |

### Frontend (`frontend/env.example`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Public backend origin, e.g. `https://YOUR-BACKEND.up.railway.app` (no `/api` suffix, no trailing slash). **Set at build time** on Railway. |

## Deploying on Railway (recommended: two services)

Create **one PostgreSQL** plugin and attach its `DATABASE_URL` to the backend service.

### Service A — API (root directory `backend`)

1. **Build:** `pip install -r requirements.txt` (Nixpacks usually auto-detects Python).
2. **Start:** `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT` (or use the included `Procfile` if your buildpack reads it).
3. **Release / one-off:** run `python manage.py migrate --noinput` after each deploy (Railway “Deploy” → custom command or one-off shell).
4. Set env vars from `backend/env.example`. Point `CORS_ALLOWED_ORIGINS` to your **frontend** URL.

### Service B — SPA (root directory `frontend`)

1. **Build command:** `npm ci && npm run build`
2. **Start command:** `npm start` (runs `node scripts/static-serve.cjs`, binding `0.0.0.0:$PORT`).
3. **Variables:** set `VITE_API_URL` to your **public backend URL** so the browser can call the API from the user’s machine.

After deploy, open the frontend URL, sign up (first user = admin), create projects, add members, create tasks, and verify a member account only sees assigned work.

## Demo video checklist

1. Sign up as first user (admin) and create a project with members.
2. Create tasks, assign statuses, show overdue cards with a past due date.
3. Sign up / log in as a second user (member), join a project, show restricted task list and status-only updates.
4. Mention where GitHub and live URLs are documented (this README).

## Security notes

- Rotate `DJANGO_SECRET_KEY` and database credentials for anything beyond coursework.
- Prefer HTTPS-only cookies if you extend auth; current API uses stateless JWT from the SPA.

## License

MIT (adjust as needed for your course / organization).
