# AI Capsule

AI Capsule is a private prompt library built for CSE3CWA/CSE5006 Assignment 3. Users authenticate with GitHub OAuth, receive an application JWT from Express in a secure HttpOnly cookie, and can create, read, update and delete only their own prompt records.

## Deployment

- **Public URL:** `https://YOUR-RENDER-SERVICE.onrender.com` (replace after deployment)
- **Cloud platform:** Render Web Service
- **Architecture:** React production files and the Express API are served from one origin
- **Health check:** `https://YOUR-RENDER-SERVICE.onrender.com/api/health`

The application is deployment-ready, but the submitted public URL must be added after the student's GitHub OAuth credentials and Render account are configured.

## Technology

- React 19 + Vite
- Node.js + Express
- SQLite through Node's built-in `node:sqlite` API
- GitHub OAuth Web Application Flow
- Express-issued JWT using `jsonwebtoken`
- Secure, HttpOnly, SameSite=Lax cookie named `token`

## Local setup

Prerequisites: Node.js 22.5 or later, npm, and a GitHub OAuth App. The deployment configuration pins Node 24.

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Create a GitHub OAuth App at **GitHub Settings > Developer settings > OAuth Apps**. For local development use:

   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`

3. Add the GitHub client ID and secret to `.env`. Generate `JWT_SECRET` with a long random value, for example:

   ```bash
   openssl rand -base64 48
   ```

4. Install dependencies:

   ```bash
   npm install
   npm --prefix client install
   ```

5. Start frontend and backend development servers:

   ```bash
   npm run dev
   ```

   Vite runs the React development server. For the most reliable local OAuth test, use the complete same-origin build instead:

   ```bash
   npm run build
   SERVE_CLIENT=true npm start
   ```

6. Open `http://localhost:3000` for the production-style run. For Vite development, configure a proxy or use the production-style run for OAuth testing.

## Required routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page |
| `/login` | Public | GitHub sign-in page |
| `/dashboard` | Protected in application behaviour | User's prompt workspace |
| `/api/health` | Public | Returns `{ "status": "ok" }` |
| `GET /api/capsules` | JWT protected | Read the signed-in user's capsules |
| `POST /api/capsules` | JWT protected | Create a capsule owned by the signed-in user |
| `PUT /api/capsules/:id` | JWT protected | Update an owned capsule |
| `DELETE /api/capsules/:id` | JWT protected | Delete an owned capsule |

The React frontend calls the Express routes with `fetch` and `credentials: "include"`. Because frontend and backend use one public origin, no CORS configuration is needed.

## OAuth and JWT flow

1. `/auth/github` creates a cryptographically random OAuth state value in an HttpOnly cookie and redirects to GitHub.
2. `/auth/github/callback` verifies the returned state before exchanging the temporary code for a GitHub access token.
3. Express retrieves the GitHub user and issues its own HS256 JWT. The GitHub access token is not used as the application session.
4. Express stores the application JWT in a cookie named `token` with `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
5. `requireAuth` verifies the signature, issuer, expiry and algorithm on every protected route.
6. The verified JWT `sub` claim becomes `req.user.id`. The browser never supplies `user_id`.

## Database and ownership

The database is created automatically at `DATABASE_PATH`. The `capsules` table stores all required assignment fields and has an index on `user_id`.

- Create inserts the verified JWT user ID.
- Read uses `WHERE user_id = ?`.
- Update uses `WHERE id = ? AND user_id = ?`.
- Delete uses `WHERE id = ? AND user_id = ?`.

This prevents one authenticated user from reading or modifying another user's records.

### Storage limitation

On a free Render Web Service, the local filesystem is ephemeral. SQLite data can be lost when the service restarts or redeploys. This is the submitted application's honest limitation. For persistent production storage, migrate the same relational schema to Render PostgreSQL or attach a persistent disk on an eligible paid plan.

## Environment variables

| Name | Purpose | Secret? |
| --- | --- | --- |
| `PORT` | Express port; Render supplies it | No |
| `NODE_ENV` | Use `production` in Render | No |
| `APP_URL` | Exact deployed HTTPS origin, without trailing slash | No |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID | Treat as configuration |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App secret | Yes |
| `JWT_SECRET` | Signs and verifies application JWTs | Yes |
| `DATABASE_PATH` | SQLite file path | No |
| `SERVE_CLIENT` | Set `true` to serve the built client outside production | No |

Never commit `.env`, real secrets, database credentials, or a real JWT.

## Test the project

Run automated API tests:

```bash
npm test
```

The test suite verifies the public health endpoint, missing and invalid JWT rejection, complete authenticated CRUD, input validation, and cross-user ownership protection.

## Required deployed cURL evidence

Run these against the final public URL before recording the video:

```bash
curl -i https://YOUR-RENDER-SERVICE.onrender.com/api/capsules
```

Expected result: `HTTP/2 401` and `{"error":"Unauthorized"}`.

```bash
curl -i -H "Cookie: token=fake-token-123" https://YOUR-RENDER-SERVICE.onrender.com/api/capsules
```

Expected result: `HTTP/2 401` and `{"error":"Unauthorized"}`.

Record the actual results here after deployment:

- Test 1, no authentication: `401 Unauthorized` / date: `__________`
- Test 2, fake JWT: `401 Unauthorized` / date: `__________`

## Render deployment steps

1. Push this project to a private or public GitHub repository. Confirm `.env`, `node_modules`, `client/dist`, and database files are not committed.
2. In Render, create a **Blueprint** from the repository. `render.yaml` supplies the build, start and health-check settings.
3. Set `APP_URL` to the final Render URL, for example `https://ai-capsule-xxxx.onrender.com`.
4. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from the production GitHub OAuth App.
5. Confirm `JWT_SECRET` is generated and `NODE_ENV=production`.
6. In the GitHub OAuth App, set:
   - Homepage URL: the exact Render HTTPS URL
   - Authorization callback URL: `https://YOUR-RENDER-SERVICE.onrender.com/auth/github/callback`
7. Deploy, then verify `/api/health`, both cURL checks, OAuth login, and all four CRUD actions.
8. Keep the service available until marking is complete.

## AI-assisted development statement

AI assistance was used for project scaffolding, Express route structure, React components, CSS, security review, tests, deployment configuration and documentation. I reviewed the generated work and remain responsible for the implementation.

One problem identified and corrected was trusting record ownership data from a browser request. The corrected implementation does not accept `user_id` from the frontend. It obtains the owner exclusively from the subject of the verified application JWT and includes that owner in every database query.

OAuth and JWT protection were verified by checking the OAuth state, confirming Express creates the application JWT, running the unauthenticated and fake-token cURL tests, and completing authenticated API tests. CRUD and ownership were verified with automated tests that create, read, update and delete as one user, then attempt to access the same record as a second user.

The implementation decision I made was to serve the built React application and Express API from one deployed service. This keeps the cookie first-party, avoids unnecessary CORS configuration, and makes the deployed authentication flow easier to explain and verify.

## Video demonstration script (3-5 minutes)

1. **0:00-0:25:** Open the public Render URL. Point to the HTTPS address and state that it is not localhost.
2. **0:25-0:40:** Open `/api/health` and show `{ "status": "ok" }`.
3. **0:40-1:10:** In a terminal, run both required cURL commands. Show `401 Unauthorized` for no cookie and for `token=fake-token-123`.
4. **1:10-1:35:** Return to the app, select GitHub sign-in, complete OAuth, and enter the protected dashboard. Do not open browser cookie details or reveal the JWT.
5. **1:35-2:50:** Create a capsule, show it in the list, edit its version or notes, and delete it. This demonstrates CREATE, READ, UPDATE and DELETE.
6. **2:50-3:25:** Show Render's environment-variable **names only**. Hide values. Point out `APP_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`, `NODE_ENV`, and `DATABASE_PATH`.
7. **3:25-4:00:** Explain that SQLite is initialised automatically and ownership comes from the verified JWT. State that Render free local storage is ephemeral.
8. **4:00-4:30:** Briefly explain the corrected ownership problem and why one-origin deployment was chosen.

## Submission checklist

- Replace every `YOUR-RENDER-SERVICE` placeholder in this README.
- Add actual cURL test dates/results.
- Verify the public deployment stays available.
- Record and check a 3-5 minute MP4 with working audio.
- Do not show secrets or a real JWT in the recording.
- Remove `node_modules`, `client/dist`, `.env`, and local database files from the ZIP.
- Submit both the source-code ZIP and MP4 directly to the LMS.
