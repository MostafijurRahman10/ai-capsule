import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/app.js';
import { createDatabase } from '../server/database.js';

process.env.JWT_SECRET = 'test-secret-long-enough-for-tests';
process.env.NODE_ENV = 'test';
process.env.APP_URL = 'http://localhost:3000';
process.env.GITHUB_CLIENT_ID = 'test-client';
process.env.GITHUB_CLIENT_SECRET = 'test-secret';

function cookieFor(userId, login = 'tester') {
  const token = jwt.sign({ login }, process.env.JWT_SECRET, {
    subject: userId, issuer: 'ai-capsule', expiresIn: '1h', algorithm: 'HS256'
  });
  return `token=${token}`;
}

function setup() {
  const db = createDatabase(':memory:');
  return { db, app: createApp({ db }) };
}

const validRecord = {
  project_name: 'SmartFarm', prompt_title: 'Debug deployment', prompt_version: 'v1',
  prompt_text: 'Why does my Node server fail?', response_summary: 'Check the start command.',
  category: 'Coding', usefulness: 'Good', reviewed: true, improved: false,
  screenshot_url: 'https://example.com/evidence.png', notes: 'Tested successfully.'
};

test('health endpoint is public', async () => {
  const { app, db } = setup();
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
  db.close();
});

test('missing and fake JWT are rejected', async () => {
  const { app, db } = setup();
  assert.equal((await request(app).get('/api/capsules')).status, 401);
  assert.equal((await request(app).get('/api/capsules').set('Cookie', 'token=fake-token-123')).status, 401);
  db.close();
});

test('authenticated user can complete CRUD', async () => {
  const { app, db } = setup();
  const cookie = cookieFor('user-1');
  const created = await request(app).post('/api/capsules').set('Cookie', cookie).send(validRecord);
  assert.equal(created.status, 201);
  assert.equal(created.body.user_id, 'user-1');

  const list = await request(app).get('/api/capsules').set('Cookie', cookie);
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);

  const updated = await request(app).put(`/api/capsules/${created.body.id}`).set('Cookie', cookie).send({ ...validRecord, prompt_version: 'v2', improved: true });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.prompt_version, 'v2');
  assert.equal(updated.body.improved, true);

  const removed = await request(app).delete(`/api/capsules/${created.body.id}`).set('Cookie', cookie);
  assert.equal(removed.status, 204);
  assert.equal((await request(app).get('/api/capsules').set('Cookie', cookie)).body.length, 0);
  db.close();
});

test('users cannot read, update, or delete another user records', async () => {
  const { app, db } = setup();
  const owner = cookieFor('owner');
  const intruder = cookieFor('intruder');
  const created = await request(app).post('/api/capsules').set('Cookie', owner).send(validRecord);
  const id = created.body.id;

  const intruderList = await request(app).get('/api/capsules').set('Cookie', intruder);
  assert.equal(intruderList.body.length, 0);
  assert.equal((await request(app).put(`/api/capsules/${id}`).set('Cookie', intruder).send({ ...validRecord, prompt_title: 'Changed' })).status, 404);
  assert.equal((await request(app).delete(`/api/capsules/${id}`).set('Cookie', intruder)).status, 404);
  assert.equal((await request(app).get('/api/capsules').set('Cookie', owner)).body.length, 1);
  db.close();
});

test('required fields and screenshot URL are validated', async () => {
  const { app, db } = setup();
  const cookie = cookieFor('user-1');
  const response = await request(app).post('/api/capsules').set('Cookie', cookie).send({ screenshot_url: 'not-a-url' });
  assert.equal(response.status, 400);
  assert.ok(response.body.errors.length >= 4);
  db.close();
});
