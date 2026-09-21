import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createDatabase } from './database.js';
import { issueToken, requireAuth, tokenCookieOptions } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const allowedUsefulness = new Set(['Good', 'Needs Improvement']);

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCapsule(body = {}) {
  const capsule = {
    project_name: cleanText(body.project_name),
    prompt_title: cleanText(body.prompt_title),
    prompt_version: cleanText(body.prompt_version),
    prompt_text: cleanText(body.prompt_text),
    response_summary: cleanText(body.response_summary),
    category: cleanText(body.category),
    usefulness: cleanText(body.usefulness),
    reviewed: body.reviewed === true || body.reviewed === 1 ? 1 : 0,
    improved: body.improved === true || body.improved === 1 ? 1 : 0,
    screenshot_url: cleanText(body.screenshot_url),
    notes: cleanText(body.notes)
  };

  const errors = [];
  if (!capsule.project_name) errors.push('Project name is required.');
  if (!capsule.prompt_title) errors.push('Prompt title is required.');
  if (!capsule.prompt_text) errors.push('Prompt text is required.');
  if (capsule.usefulness && !allowedUsefulness.has(capsule.usefulness)) {
    errors.push('Usefulness must be Good or Needs Improvement.');
  }
  if (capsule.screenshot_url) {
    try {
      const url = new URL(capsule.screenshot_url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      errors.push('Screenshot evidence must be a valid HTTP or HTTPS URL.');
    }
  }
  return { capsule, errors };
}

export function createApp(options = {}) {
  const app = express();
  const db = options.db || createDatabase();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/auth/github', (_req, res) => {
    const state = crypto.randomBytes(24).toString('hex');
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/'
    });
    const callback = `${process.env.APP_URL}/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: callback,
      scope: 'read:user user:email',
      state
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  app.get('/auth/github/callback', async (req, res) => {
    if (!req.query.code || !req.query.state || req.query.state !== req.cookies.oauth_state) {
      return res.redirect('/login?error=oauth_state');
    }
    try {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: String(req.query.code),
          redirect_uri: `${process.env.APP_URL}/auth/github/callback`
        }).toString()
      });
      const oauth = await tokenResponse.json();
      if (!oauth.access_token) throw new Error('GitHub token exchange failed');
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${oauth.access_token}`,
          'User-Agent': 'AI-Capsule'
        }
      });
      if (!userResponse.ok) throw new Error('GitHub user request failed');
      const user = await userResponse.json();
      res.clearCookie('oauth_state', { path: '/' });
      res.cookie('token', issueToken(user), tokenCookieOptions());
      return res.redirect('/dashboard');
    } catch (error) {
      console.error('OAuth callback error:', error.message);
      return res.redirect('/login?error=oauth_failed');
    }
  });

  app.post('/auth/logout', (_req, res) => {
    res.clearCookie('token', { ...tokenCookieOptions(), maxAge: undefined });
    res.status(204).end();
  });

  app.get('/api/me', requireAuth, (req, res) => res.json(req.user));

  app.get('/api/capsules', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT * FROM capsules WHERE user_id = ? ORDER BY datetime(created_at) DESC, id DESC').all(req.user.id);
    res.json(rows.map(row => ({ ...row, reviewed: Boolean(row.reviewed), improved: Boolean(row.improved) })));
  });

  app.post('/api/capsules', requireAuth, (req, res) => {
    const { capsule, errors } = parseCapsule(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const result = db.prepare(`
      INSERT INTO capsules (user_id, project_name, prompt_title, prompt_version, prompt_text,
        response_summary, category, usefulness, reviewed, improved, screenshot_url, notes)
      VALUES (@user_id, @project_name, @prompt_title, @prompt_version, @prompt_text,
        @response_summary, @category, @usefulness, @reviewed, @improved, @screenshot_url, @notes)
    `).run({ user_id: req.user.id, ...capsule });
    const row = db.prepare('SELECT * FROM capsules WHERE id = ? AND user_id = ?').get(result.lastInsertRowid, req.user.id);
    res.status(201).json({ ...row, reviewed: Boolean(row.reviewed), improved: Boolean(row.improved) });
  });

  app.put('/api/capsules/:id', requireAuth, (req, res) => {
    const { capsule, errors } = parseCapsule(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const result = db.prepare(`
      UPDATE capsules SET project_name=@project_name, prompt_title=@prompt_title,
        prompt_version=@prompt_version, prompt_text=@prompt_text,
        response_summary=@response_summary, category=@category, usefulness=@usefulness,
        reviewed=@reviewed, improved=@improved, screenshot_url=@screenshot_url, notes=@notes
      WHERE id=@id AND user_id=@user_id
    `).run({ id: req.params.id, user_id: req.user.id, ...capsule });
    if (!result.changes) return res.status(404).json({ error: 'Capsule not found.' });
    const row = db.prepare('SELECT * FROM capsules WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    res.json({ ...row, reviewed: Boolean(row.reviewed), improved: Boolean(row.improved) });
  });

  app.delete('/api/capsules/:id', requireAuth, (req, res) => {
    const result = db.prepare('DELETE FROM capsules WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (!result.changes) return res.status(404).json({ error: 'Capsule not found.' });
    res.status(204).end();
  });

  if (process.env.NODE_ENV === 'production' || process.env.SERVE_CLIENT === 'true') {
    const clientDist = path.resolve(__dirname, '../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  });
  return app;
}
