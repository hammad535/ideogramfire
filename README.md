# IdeogramFIRE: Internal Image Generation App

A simple, secure, full-stack web app for internal use. Upload an image and a prompt, get OpenAI-powered text, and generate new images with Ideogram's API.

---

## Features
- Upload an image (PNG, JPG, JPEG, GIF, WEBP; max 5MB)
- Enter a short text prompt
- Uses OpenAI ChatGPT API to process your prompt and image
- Uses Ideogram Generate-V3 API to create new images
- Displays generated images on the same page
- All API keys are securely loaded from environment variables
- User-friendly error handling

---

## Setup

### 1. Clone the repository
```bash
git clone <this-repo-url>
cd ideogramFIRE
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create a `.env` file in the root directory
```
OPENAI_API_KEY=your-openai-api-key
IDEOGRAM_API_KEY=your-ideogram-api-key
PORT=3000
# Optional – production / hardening:
# FRONTEND_ORIGIN=https://app.company.com   # CORS allowlist (dev allows http://localhost:3001)
# RATE_LIMIT_WINDOW_MS=60000                # Per-user rate limit window (default 60s)
# RATE_LIMIT_MAX=30                          # Max requests per user per window (default 30)
# MAX_UPLOAD_MB=5                            # Max upload file size in MB (default 5)
# JSON_BODY_LIMIT=1mb                       # Max JSON body size
```

### 4. Backend auth (Supabase – required for protected API routes)
The backend validates Supabase JWT tokens and **reads these only from the environment** (never hardcode keys):

In the **root** `.env` file add:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
- Get both from [Supabase](https://supabase.com) → your project → **Settings → API**.
- Use the **Project URL** for `SUPABASE_URL` and the **service_role** key for `SUPABASE_SERVICE_ROLE_KEY`.
- **Important:** The service role key must never be committed or exposed to the frontend; the backend uses it only from `process.env.SUPABASE_SERVICE_ROLE_KEY`.

Without these, protected routes (`/api/generate`, `/api/process`, `/api/export-zip`, `/api/clean-image`) will return 401.

### 5. Frontend auth (Supabase)
Create a `frontend/.env` file (see `frontend/.env.example`):
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```
Get these from [Supabase](https://supabase.com) → your project → Settings → API. Without these, the app shows a warning and login will not work.

### 6. Run the app

**Option A – Backend only (serves built frontend):**
```bash
npm start
```
App at [http://localhost:3000](http://localhost:3000). Requires `cd frontend && npm run build` first if you changed the frontend.

**Option B – Backend + frontend dev (recommended for development):**
```bash
# Terminal 1 – backend
npm start

# Terminal 2 – frontend (with auth and proxy to backend)
cd frontend && npm start
```
Backend: [http://localhost:3000](http://localhost:3000). Frontend: [http://localhost:3001](http://localhost:3001). Use the frontend URL; login is required before using the app.

### Protected endpoints (require login)
- **POST /api/generate** and **POST /api/process** – image generation. Require `Authorization: Bearer <access_token>` (Supabase session). Return **401** when logged out or token missing/invalid.
- **POST /api/export-zip**, **GET /api/clean-image** – also protected.
- **GET /api/health** – public (no auth).

The frontend sends the Supabase session `access_token` in the `Authorization` header on every request to these endpoints. When the backend returns 401, the app shows “Session expired, please log in again.”

---

## Project Structure

```
backend/         # Express server, API routes, controllers
frontend/        # Static React app (served by backend)
.env             # Environment variables (not committed)
README.md        # This file
```

---

## Security & Best Practices
- Only common image types are accepted
- File size is limited by `MAX_UPLOAD_MB` (default 5MB)
- All user inputs are sanitized
- API errors return only safe JSON (`error`, `request_id`); full errors are logged server-side only
- **Backend:** Supabase `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are read only from `process.env` (root `.env`). Never hardcode the service role key in the codebase.
- **Production:** Serve over HTTPS. The backend uses `trust proxy` when behind an HTTPS reverse proxy.

---

## Production deployment

- **HTTPS:** Production must be served over HTTPS. Put the backend behind a reverse proxy (e.g. nginx, cloud load balancer) that terminates TLS.
- **Env vars for production:** Set `FRONTEND_ORIGIN` to your frontend URL (e.g. `https://app.company.com`) for CORS. Optionally tune `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `MAX_UPLOAD_MB`.
- **Health:** `GET /api/health` returns `{ status: "ok", uptime_seconds, ... }` for load balancers and monitoring.
- **Restart behavior:** The server exits on uncaught exceptions and unhandled rejections so your platform (Docker, Heroku, App Platform, etc.) can restart it. Recommended: run with a process manager or in a container with restart policy.

---

## Notes
- For internal use only. Do not expose API keys publicly.
- You need valid OpenAI and Ideogram API keys.
- If you have issues, check your `.env` and server logs. See **AUDIT.md** for production-readiness details. 