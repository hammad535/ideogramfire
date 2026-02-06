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

### 3. Environment variables

**Root `.env` (backend):**
```
OPENAI_API_KEY=your-openai-api-key
IDEOGRAM_API_KEY=your-ideogram-api-key
PORT=3000
SERVE_FRONTEND=false
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_ORIGIN=https://your-frontend-domain.com   # optional; dev allows localhost:3001/3002
```
- **Local dev:** `SERVE_FRONTEND=false` — backend is API-only; use CRA on 3001/3002 and proxy to 3000.
- **Production (serving built React):** `SERVE_FRONTEND=true` — backend serves `frontend/build` and SPA fallback (ensure `frontend/build` exists).

**`frontend/.env` (React; use anon key only, never service role):**
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the app
```bash
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000)

---

## Deploying to Render

Set environment variables in the Render dashboard. **Create React App bakes `REACT_APP_*` at build time** — they must be set before building the Static Site.

### Static Site (frontend) — build-time env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_SUPABASE_URL` | Yes | Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Yes | Supabase anon (publishable) key; never use service role in frontend |
| `REACT_APP_API_BASE_URL` | Yes on Render | Backend Web Service URL (e.g. `https://your-backend.onrender.com`) so the static site can call the API |

If `REACT_APP_SUPABASE_URL` or `REACT_APP_SUPABASE_ANON_KEY` are missing at build time, the app shows a blocking "Supabase not configured" screen and the generator is not accessible.

### Web Service (backend) — runtime env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `IDEOGRAM_API_KEY` | Yes | Ideogram API key |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (backend only; never in frontend) |
| `FRONTEND_ORIGIN` | Yes in prod | Static site origin for CORS (e.g. `https://your-frontend.onrender.com`) |
| `NODE_ENV` | Recommended | Set to `production` for production |

Backend listens on `process.env.PORT` (set by Render).

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
- File size is limited to 5MB
- All user inputs are sanitized
- API errors are handled gracefully

---

## Notes
- For internal use only. Do not expose API keys publicly.
- You need valid OpenAI and Ideogram API keys.
- If you have issues, check your `.env` and server logs. 