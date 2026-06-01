# NOVA AI Secure Gemini Setup

## Issues Found

- `dashboard.js` still used public Pollinations endpoints for chat and image generation.
- AI calls were frontend-only, which is not safe for Gemini API keys.
- The UI had advanced AI modules, but no secure backend boundary.
- Service worker caching can preserve stale JavaScript after deployment if cache versions are not changed.

No active Gemini key pattern was found in the current local files. If a real key was ever committed, keep it revoked and rotate it in Google Cloud.

## Fixes Applied

- Removed Pollinations text and image API calls from `dashboard.js`.
- Added `NOVA_BACKEND_BASE_URL` and backend route placeholders.
- AI Chat, Document Generator, Image Generator, and Planner now call a backend proxy when configured.
- Added safe local fallback behavior so GitHub Pages still works without a backend.
- Kept all existing UI/UX and localStorage chat history features.
- Preserved PWA files and updated service worker cache behavior.

## Secure Architecture

```text
NOVA AI Frontend on GitHub Pages
        |
        v
Backend API / Firebase Function / Cloudflare Worker / Vercel Function
        |
        v
Gemini API with GEMINI_API_KEY stored only on the server
```

The Gemini key must be stored as an environment variable on the backend, never inside `dashboard.js`.

## Frontend Configuration

In `dashboard.js`, set:

```js
const NOVA_BACKEND_BASE_URL = "https://your-secure-backend.example.com";
```

Do not add a Gemini key to the frontend.

## Backend Endpoints Expected

- `POST /api/gemini/chat` returns `{ "text": "..." }`
- `POST /api/gemini/document` returns `{ "text": "..." }`
- `POST /api/gemini/planner` returns `{ "blocks": [["09:00", "Deep work", "..."]] }`
- `POST /api/gemini/image` returns `{ "url": "https://..." }`

## Recommended Auth & Memory

- Authentication: Firebase Authentication or Supabase Auth.
- Memory storage: Firestore or Supabase Postgres.
- Store per-user conversations, prompts, planner tasks, goals, and preferences after login.

## Deployment

Upload these files to the GitHub Pages repository root:

- `index.html`
- `dashboard.html`
- `styles.css`
- `main.js`
- `dashboard.js`
- `manifest.json`
- `sw.js`
- `SECURITY_SETUP.md`

After deployment, visit `/sw.js` and confirm the latest cache version is visible.

## Security Recommendations

- Never commit API keys.
- Use environment variables for backend secrets.
- Restrict Gemini API key usage in Google Cloud.
- Add rate limiting to the backend.
- Add CORS allowlist for your GitHub Pages domain.
- Rotate any key that was ever exposed publicly.
