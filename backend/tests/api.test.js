const request = require('supertest');
const fs = require('fs');
const path = require('path');
const createApp = require('../src/app');
const db = require('../src/db');

const app = createApp({ loginMax: 1000, generalMax: 100000 });
const PW = 'Password123!';
let admin, author, author2, reader; // { token, id }

async function register(name, email) {
  const res = await request(app).post('/api/v1/auth/register').send({ name, email, password: PW });
  return { token: res.body.token, id: res.body.user.id };
}
const auth = (u) => ({ Authorization: `Bearer ${u.token}` });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function makePost(user, overrides = {}) {
  const res = await request(app).post('/api/v1/posts').set(auth(user))
    .send({ title: 'Hello Malawi', body_markdown: '# Hi', status: 'published', tags: ['Tech'], ...overrides });
  return res.body.post;
}

beforeAll(async () => {
  await db.query('TRUNCATE likes, comments, post_tags, posts, tags, users RESTART IDENTITY CASCADE');
  admin = await register('Admin', 'admin@test.mw');
  author = await register('Author One', 'author1@test.mw');
  author2 = await register('Author Two', 'author2@test.mw');
  reader = await register('Reader', 'reader@test.mw');
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [admin.id]);
  await db.query("UPDATE users SET role='author' WHERE id = ANY($1)", [[author.id, author2.id]]);
});
afterAll(() => db.pool.end());

describe('Auth', () => {
  test('register defaults to reader and stores a bcrypt hash, ignoring role in body', async () => {
    const res = await request(app).post('/api/v1/auth/register')
      .send({ name: 'Sneaky', email: 'sneaky@test.mw', password: PW, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('reader');
    const { rows } = await db.query('SELECT password_hash FROM users WHERE email=$1', ['sneaky@test.mw']);
    expect(rows[0].password_hash).not.toBe(PW);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$10\$/); // bcrypt, 10 rounds
  });

  test('register rejects duplicate email (409) and invalid input (400)', async () => {
    const dup = await request(app).post('/api/v1/auth/register')
      .send({ name: 'Dup', email: 'reader@test.mw', password: PW });
    expect(dup.status).toBe(409);
    const bad = await request(app).post('/api/v1/auth/register')
      .send({ name: 'X', email: 'nope', password: 'short' });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.details)).toEqual(['name', 'email', 'password']);
  });

  test('login returns a JWT; wrong password gives 401', async () => {
    const ok = await request(app).post('/api/v1/auth/login').send({ email: 'reader@test.mw', password: PW });
    expect(ok.status).toBe(200);
    expect(ok.body.token.split('.')).toHaveLength(3);
    const bad = await request(app).post('/api/v1/auth/login').send({ email: 'reader@test.mw', password: 'wrongpass1' });
    expect(bad.status).toBe(401);
  });

  test('login is rate limited to 5 attempts per minute (6th gets 429)', async () => {
    const limited = createApp({ loginMax: 5 });
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      const r = await request(limited).post('/api/v1/auth/login').send({ email: 'x@test.mw', password: 'whatever12' });
      statuses.push(r.status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });

  test('protected routes reject missing or tampered tokens', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
    const tampered = reader.token.slice(0, -2) + 'xx';
    expect((await request(app).get('/api/v1/auth/me').set({ Authorization: `Bearer ${tampered}` })).status).toBe(401);
    expect((await request(app).get('/api/v1/auth/me').set(auth(reader))).body.user.email).toBe('reader@test.mw');
  });
});

describe('RBAC & posts', () => {
  test('reader cannot create posts (403), anonymous gets 401', async () => {
    const body = { title: 'Nope nope', body_markdown: 'x' };
    expect((await request(app).post('/api/v1/posts').set(auth(reader)).send(body)).status).toBe(403);
    expect((await request(app).post('/api/v1/posts').send(body)).status).toBe(401);
  });

  test('author creates a post with tags and a unique slug', async () => {
    const a = await makePost(author);
    const b = await makePost(author);
    expect(a.slug).toBe('hello-malawi');
    expect(b.slug).toBe('hello-malawi-2');
    expect(a.tags.map((t) => t.name)).toEqual(['Tech']);
    expect(a.author_id).toBe(author.id);
  });

  test('HTML/script is stripped from post bodies (XSS)', async () => {
    const p = await makePost(author, {
      title: 'XSS <b>test</b>',
      body_markdown: 'Safe **bold** <script>alert(1)</script><img src=x onerror=alert(2)>\n> quote',
    });
    expect(p.body_markdown).not.toMatch(/<script|onerror|<img/i);
    expect(p.body_markdown).toContain('**bold**');
    expect(p.body_markdown).toContain('> quote');
    expect(p.title).toBe('XSS test');
  });

  test('only the owner or an admin can update/delete a post', async () => {
    const p = await makePost(author, { title: 'Ownership test' });
    const other = await request(app).put(`/api/v1/posts/${p.id}`).set(auth(author2)).send({ title: 'Hijacked' });
    expect(other.status).toBe(403);
    const own = await request(app).put(`/api/v1/posts/${p.id}`).set(auth(author)).send({ title: 'Edited by owner' });
    expect(own.status).toBe(200);
    expect(own.body.post.title).toBe('Edited by owner');
    const adm = await request(app).put(`/api/v1/posts/${p.id}`).set(auth(admin)).send({ tags: ['Education', 'Fintech'] });
    expect(adm.body.post.tags.map((t) => t.name)).toEqual(['Education', 'Fintech']);
    expect((await request(app).delete(`/api/v1/posts/${p.id}`).set(auth(author2))).status).toBe(403);
    expect((await request(app).delete(`/api/v1/posts/${p.id}`).set(auth(author))).status).toBe(204);
  });

  test('feed paginates, searches and filters by tag; drafts stay hidden', async () => {
    await makePost(author, { title: 'Airtel Money guide', tags: ['Fintech'] });
    const draft = await makePost(author, { title: 'Secret draft', status: 'draft' });
    const all = await request(app).get('/api/v1/posts?limit=2&page=1');
    expect(all.body.data).toHaveLength(2);
    expect(all.body.pagination.total).toBeGreaterThan(2);
    const search = await request(app).get('/api/v1/posts?search=airtel');
    expect(search.body.data.map((p) => p.title)).toEqual(['Airtel Money guide']);
    const tag = await request(app).get('/api/v1/posts?tag=fintech');
    expect(tag.body.data.every((p) => p.tags.some((t) => t.slug === 'fintech'))).toBe(true);
    const titles = (await request(app).get('/api/v1/posts?limit=50')).body.data.map((p) => p.title);
    expect(titles).not.toContain('Secret draft');
    expect((await request(app).get(`/api/v1/posts/${draft.slug}`)).status).toBe(404);
    expect((await request(app).get(`/api/v1/posts/${draft.slug}`).set(auth(author))).status).toBe(200);
  });

  test('fetching a post increments views asynchronously', async () => {
    const p = await makePost(author, { title: 'Views test' });
    const first = await request(app).get(`/api/v1/posts/${p.slug}`);
    expect(first.body.post.views_count).toBe(0); // response doesn't wait for the counter
    await sleep(150);
    const second = await request(app).get(`/api/v1/posts/${p.slug}`);
    expect(second.body.post.views_count).toBe(1);
  });

  test('cover image upload works and non-images are rejected', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const ok = await request(app).post('/api/v1/posts').set(auth(author))
      .field('title', 'With cover').field('body_markdown', 'pic').field('status', 'published')
      .attach('cover_image', png, { filename: 'c.png', contentType: 'image/png' });
    expect(ok.status).toBe(201);
    expect(ok.body.post.cover_image_url).toMatch(/^\/uploads\/[a-f0-9]+\.png$/);
    fs.unlinkSync(path.join(__dirname, '..', ok.body.post.cover_image_url));
    const bad = await request(app).post('/api/v1/posts').set(auth(author))
      .field('title', 'Bad cover').field('body_markdown', 'x')
      .attach('cover_image', Buffer.from('hi'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(bad.status).toBe(400);
  });
});

describe('Comments, likes, stats, cascade', () => {
  let post, other;
  beforeAll(async () => {
    post = await makePost(author, { title: 'Engagement post' });
    other = await makePost(author2, { title: 'Another post' });
  });

  test('comments require auth, sanitize content and support nested replies', async () => {
    const url = `/api/v1/posts/${post.id}/comments`;
    expect((await request(app).post(url).send({ content: 'hi' })).status).toBe(401);
    const c1 = await request(app).post(url).set(auth(reader)).send({ content: 'Nice <script>x()</script>post' });
    expect(c1.status).toBe(201);
    expect(c1.body.comment.content).toBe('Nice post');
    const reply = await request(app).post(url).set(auth(author)).send({ content: 'Thanks!', parent_id: c1.body.comment.id });
    expect(reply.body.comment.parent_id).toBe(c1.body.comment.id);
    const tree = await request(app).get(`${url}?tree=true`);
    expect(tree.body.data).toHaveLength(1);
    expect(tree.body.data[0].replies).toHaveLength(1);
  });

  test('a reply cannot point at a comment on a different post', async () => {
    const c = await request(app).post(`/api/v1/posts/${other.id}/comments`).set(auth(reader)).send({ content: 'elsewhere' });
    const bad = await request(app).post(`/api/v1/posts/${post.id}/comments`).set(auth(reader))
      .send({ content: 'cross-post', parent_id: c.body.comment.id });
    expect(bad.status).toBe(400);
  });

  test('like toggles on/off and the DB enforces uniqueness', async () => {
    const url = `/api/v1/posts/${post.id}/like`;
    expect((await request(app).post(url)).status).toBe(401);
    const on = await request(app).post(url).set(auth(reader));
    expect(on.body).toEqual({ liked: true, likes_count: 1 });
    const off = await request(app).post(url).set(auth(reader));
    expect(off.body).toEqual({ liked: false, likes_count: 0 });
    await db.query('INSERT INTO likes(user_id,post_id) VALUES ($1,$2)', [reader.id, post.id]);
    await expect(db.query('INSERT INTO likes(user_id,post_id) VALUES ($1,$2)', [reader.id, post.id]))
      .rejects.toMatchObject({ code: '23505' });
    await db.query('DELETE FROM likes WHERE user_id=$1 AND post_id=$2', [reader.id, post.id]);
  });

  test('author stats aggregate correctly without double-counting joins', async () => {
    const p = await makePost(author2, { title: 'Stats post' });
    // 2 likes x 3 comments: a naive double JOIN would report 6 of each.
    await request(app).post(`/api/v1/posts/${p.id}/like`).set(auth(reader));
    await request(app).post(`/api/v1/posts/${p.id}/like`).set(auth(admin));
    for (let i = 0; i < 3; i++) {
      await request(app).post(`/api/v1/posts/${p.id}/comments`).set(auth(reader)).send({ content: `c${i}` });
    }
    const res = await request(app).get('/api/v1/author/stats').set(auth(author2));
    expect(res.status).toBe(200);
    const row = res.body.posts.find((x) => x.id === p.id);
    expect(row.likes_count).toBe(2);
    expect(row.comments_count).toBe(3);
    expect(res.body.total_likes).toBeGreaterThanOrEqual(2);
    expect((await request(app).get('/api/v1/author/stats').set(auth(reader))).status).toBe(403);
  });

  test('deleting a post cascades to its comments, likes and tags', async () => {
    const p = await makePost(author, { title: 'Cascade me' });
    await request(app).post(`/api/v1/posts/${p.id}/comments`).set(auth(reader)).send({ content: 'bye' });
    await request(app).post(`/api/v1/posts/${p.id}/like`).set(auth(reader));
    expect((await request(app).delete(`/api/v1/posts/${p.id}`).set(auth(author))).status).toBe(204);
    const counts = await db.query(
      `SELECT (SELECT COUNT(*) FROM comments WHERE post_id=$1)::int c,
              (SELECT COUNT(*) FROM likes WHERE post_id=$1)::int l,
              (SELECT COUNT(*) FROM post_tags WHERE post_id=$1)::int t`, [p.id]);
    expect(counts.rows[0]).toEqual({ c: 0, l: 0, t: 0 });
  });

  test('only admins can change roles', async () => {
    const url = `/api/v1/users/${reader.id}/role`;
    expect((await request(app).patch(url).set(auth(author)).send({ role: 'admin' })).status).toBe(403);
    expect((await request(app).patch(url).set(auth(admin)).send({ role: 'wizard' })).status).toBe(400);
    const ok = await request(app).patch(url).set(auth(admin)).send({ role: 'author' });
    expect(ok.body.user.role).toBe('author');
    await db.query("UPDATE users SET role='reader' WHERE id=$1", [reader.id]);
  });
});
