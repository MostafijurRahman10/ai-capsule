# AI Capsule

AI Capsule is a private prompt library built for CSE3CWA/CSE5006 Assignment 3. Users sign in with GitHub OAuth and can create, view, update, and delete only their own prompt records.

## Live application

- **Application:** https://ai-capsule-2pni.onrender.com
- **Health check:** https://ai-capsule-2pni.onrender.com/api/health
- **Platform:** Render Web Service

> Render's free local filesystem is temporary. SQLite data may be lost after a restart or redeployment.

## Technology

- React 19 and Vite
- Node.js and Express
- SQLite using Node's built-in `node:sqlite`
- GitHub OAuth
- JWT authentication in a secure HttpOnly cookie

## Local setup

### Requirements

- Node.js 22.5 or later
- npm
- GitHub OAuth App

### 1. Configure GitHub OAuth

Create an OAuth App under **GitHub Settings > Developer settings > OAuth Apps**.

- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/auth/github/callback`

### 2. Configure environment variables

```bash
cp .env.example .env
openssl rand -base64 48
```

Add the OAuth credentials and generated JWT secret to `.env`:

```env
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_random_secret
DATABASE_PATH=./data/capsules.db
SERVE_CLIENT=true
```

Never commit `.env`, OAuth secrets, JWTs, or database files.

### 3. Install and run

```bash
npm install
npm --prefix client install
npm run build
npm start
```

Open http://localhost:3000.

## Main routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | GitHub sign-in |
| `/dashboard` | Protected | User workspace |
| `/api/health` | Public | Health status |
| `GET /api/capsules` | Protected | List the user's capsules |
| `POST /api/capsules` | Protected | Create a capsule |
| `PUT /api/capsules/:id` | Protected | Update an owned capsule |
| `DELETE /api/capsules/:id` | Protected | Delete an owned capsule |

## Authentication and ownership

1. Express redirects the user to GitHub with a random OAuth state value.
2. The callback verifies the state and exchanges the code for GitHub user information.
3. Express creates an application JWT and stores it in an HttpOnly cookie.
4. Protected routes verify the JWT before processing requests.
5. The verified JWT user ID is used in every database query.

The API never accepts `user_id` from the browser. Read, update, and delete queries include the authenticated user's ID, preventing access to another user's records.

## Tests

Run the automated tests:

```bash
npm test
```

The suite checks health status, invalid or missing JWT rejection, input validation, authenticated CRUD, and cross-user ownership protection.

Test the deployed API without authentication:

```bash
curl -i https://ai-capsule-2pni.onrender.com/api/capsules
```

Test it with an invalid JWT:

```bash
curl -i -H "Cookie: token=fake-token-123" \
  https://ai-capsule-2pni.onrender.com/api/capsules
```

Both deployed cURL checks returned 401 Unauthorized: one without a cookie and one with token=fake-token-123

## Deployment

The project uses `render.yaml` to configure the Render service.

Required production environment variables:

- `APP_URL=https://ai-capsule-2pni.onrender.com`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `JWT_SECRET`
- `NODE_ENV=production`
- `DATABASE_PATH=./data/capsules.db`

GitHub OAuth production settings:

- Homepage URL: `https://ai-capsule-2pni.onrender.com`
- Callback URL: `https://ai-capsule-2pni.onrender.com/auth/github/callback`

## Storage limitation

SQLite is suitable for this assignment, but Render's free filesystem is ephemeral. Data may be removed when the service restarts or redeploys. A production version should use PostgreSQL or a persistent disk.

## AI-assisted development statement

I built, tested, and deployed AI Capsule. I used AI for suggestions and documentation support, then reviewed and adjusted the work myself.

During development, I found that accepting a record’s owner from the browser could let a user access someone else’s data. I corrected this by taking the user ID from the verified JWT and including it in protected database queries. I chose SQLite to keep the application simple, and I documented the storage limitation on Render.

I verified GitHub login and authenticated CRUD through the deployed application. My API tests check JWT rejection, CRUD, and protection against access to another user’s records.
