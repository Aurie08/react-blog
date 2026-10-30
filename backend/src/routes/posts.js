const express = require('express');
const db = require('../db');
const HttpError = require('../utils/httpError');
const wrap = require('../utils/wrap');
const upload = require('../middleware/upload');
const { cleanMarkdown, cleanText } = require('../utils/sanitize');
const { slugify, uniqueSlug } = require('../utils/slug');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const parseId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'Invalid id');
  return n;
};

// Tags can arrive as JSON array, comma string, or repeated multipart fields.
function parseTags(raw) {
  if (raw === undefined) return undefined;
  let list = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { list = raw.split(','); }
  }
  if (!Array.isArray(list)) list = [list];
  const names = [...new Set(list.map((t) => cleanText(t)).filter(Boolean))];
  if (names.length > 10) throw new HttpError(400, 'Maximum 10 tags');
  return names;
}

async function setTags(client, postId, names) {
  await client.query('DELETE FROM post_tags WHERE post_id=$1', [postId]);
  for (const name of names) {
    const slug = slugify(name);
    const { rows } = await client.query(
      `INSERT INTO tags(name,slug) VALUES ($1,$2)
       ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [name, slug]);
    await client.query('INSERT INTO post_tags VALUES ($1,$2) ON CONFLICT DO NOTHING', [postId, rows[0].id]);
  }
}

// Shared SELECT: counts via correlated subqueries so likes x comments never multiply.
const POST_SELECT = `
  SELECT p.id, p.title, p.slug, p.body_markdown, p.cover_image_url, p.status,
         p.views_count, p.created_at, p.author_id, u.name AS author_name,
         (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = p.id)    AS likes_count,
         (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comments_count,
         COALESCE((SELECT json_agg(json_build_object('id',t.id,'name',t.name,'slug',t.slug) ORDER BY t.name)
                   FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id), '[]') AS tags
  FROM posts p JOIN users u ON u.id = p.author_id`;

// ---- GET /posts : paginated, searchable, public ----
router.get('/', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const where = ["p.status = 'published'"];
  const params = [];
  if (req.query.search) {
    params.push(`%${String(req.query.search).replace(/[%_\\]/g, '\\$&')}%`);
    where.push(`(p.title ILIKE $${params.length} OR p.body_markdown ILIKE $${params.length})`);
  }
  if (req.query.tag) {
    params.push(String(req.query.tag).toLowerCase());
    where.push(`EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id=pt.tag_id
                        WHERE pt.post_id=p.id AND t.slug=$${params.length})`);
  }
  const whereSql = 'WHERE ' + where.join(' AND ');
  const total = (await db.query(`SELECT COUNT(*)::int AS n FROM posts p ${whereSql}`, params)).rows[0].n;
  const { rows } = await db.query(
    `${POST_SELECT} ${whereSql} ORDER BY p.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]);
  res.json({ data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

// ---- GET /posts/:slug ----
router.get('/:slug', optionalAuth, wrap(async (req, res) => {
  const { rows } = await db.query(`${POST_SELECT} WHERE p.slug = $1`, [req.params.slug]);
  const post = rows[0];
  if (!post) throw new HttpError(404, 'Post not found');
  const isOwnerOrAdmin = req.user && (req.user.role === 'admin' || req.user.id === post.author_id);
  if (post.status === 'draft' && !isOwnerOrAdmin) throw new HttpError(404, 'Post not found');

  if (post.status === 'published') {
    // Fire-and-forget: the response does not wait for (or fail because of) the counter.
    db.query('UPDATE posts SET views_count = views_count + 1 WHERE id=$1', [post.id])
      .catch((e) => console.error('view count failed', e.message));
  }
  if (req.user) {
    const liked = await db.query('SELECT 1 FROM likes WHERE user_id=$1 AND post_id=$2', [req.user.id, post.id]);
    post.liked_by_me = liked.rowCount > 0;
  }
  res.json({ post });
}));

// ---- POST /posts ----
router.post('/', authenticate, requireRole('author', 'admin'), upload, wrap(async (req, res) => {
  const title = cleanText(req.body.title);
  const body = cleanMarkdown(req.body.body_markdown);
  const status = req.body.status || 'draft';
  const tags = parseTags(req.body.tags) || [];
  const errors = {};
  if (title.length < 3 || title.length > 200) errors.title = 'Title must be 3-200 characters';
  if (!body) errors.body_markdown = 'Body is required';
  if (!['draft', 'published'].includes(status)) errors.status = "Status must be 'draft' or 'published'";
  if (Object.keys(errors).length) throw new HttpError(400, 'Validation failed', errors);

  const cover = req.file ? `/uploads/${req.file.filename}` : null;
  const slug = await uniqueSlug(slugify(title),
    async (s) => (await db.query('SELECT 1 FROM posts WHERE slug=$1', [s])).rowCount > 0);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO posts(title,slug,body_markdown,cover_image_url,status,author_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [title, slug, body, cover, status, req.user.id]);
    await setTags(client, rows[0].id, tags);
    await client.query('COMMIT');
    const post = (await db.query(`${POST_SELECT} WHERE p.id=$1`, [rows[0].id])).rows[0];
    res.status(201).json({ post });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// Ownership check lives on the SERVER, in the controller.
async function loadOwnedPost(req) {
  const id = parseId(req.params.id);
  const { rows } = await db.query('SELECT id, author_id, title FROM posts WHERE id=$1', [id]);
  if (!rows[0]) throw new HttpError(404, 'Post not found');
  if (req.user.role !== 'admin' && req.user.id !== rows[0].author_id) {
    throw new HttpError(403, 'You can only modify your own posts');
  }
  return rows[0];
}

// ---- PUT /posts/:id ----
router.put('/:id', authenticate, requireRole('author', 'admin'), upload, wrap(async (req, res) => {
  const existing = await loadOwnedPost(req);
  const sets = [];
  const params = [];
  const add = (col, val) => { params.push(val); sets.push(`${col}=$${params.length}`); };

  if (req.body.title !== undefined) {
    const t = cleanText(req.body.title);
    if (t.length < 3 || t.length > 200) throw new HttpError(400, 'Title must be 3-200 characters');
    add('title', t);
  }
  if (req.body.body_markdown !== undefined) {
    const b = cleanMarkdown(req.body.body_markdown);
    if (!b) throw new HttpError(400, 'Body cannot be empty');
    add('body_markdown', b);
  }
  if (req.body.status !== undefined) {
    if (!['draft', 'published'].includes(req.body.status)) throw new HttpError(400, 'Invalid status');
    add('status', req.body.status);
  }
  if (req.file) add('cover_image_url', `/uploads/${req.file.filename}`);
  const tags = parseTags(req.body.tags);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    if (sets.length) {
      params.push(existing.id);
      await client.query(`UPDATE posts SET ${sets.join(',')} WHERE id=$${params.length}`, params);
    }
    if (tags) await setTags(client, existing.id, tags);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  const post = (await db.query(`${POST_SELECT} WHERE p.id=$1`, [existing.id])).rows[0];
  res.json({ post });
}));

// ---- DELETE /posts/:id (FK ON DELETE CASCADE removes comments, likes, post_tags) ----
router.delete('/:id', authenticate, requireRole('author', 'admin'), wrap(async (req, res) => {
  const existing = await loadOwnedPost(req);
  await db.query('DELETE FROM posts WHERE id=$1', [existing.id]);
  res.status(204).end();
}));

// ---- Comments ----
const publishedPostOr404 = async (id) => {
  const { rows } = await db.query('SELECT id, status FROM posts WHERE id=$1', [id]);
  if (!rows[0] || rows[0].status !== 'published') throw new HttpError(404, 'Post not found');
  return rows[0];
};

// Flat list; the client (or ?tree=true) nests by parent_id.
router.get('/:id/comments', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  await publishedPostOr404(id);
  const { rows } = await db.query(
    `SELECT c.id, c.post_id, c.parent_id, c.content, c.is_moderated, c.created_at,
            c.user_id, u.name AS user_name
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.post_id=$1 ORDER BY c.created_at ASC, c.id ASC`, [id]);
  if (req.query.tree === 'true') {
    const byId = new Map(rows.map((r) => [r.id, { ...r, replies: [] }]));
    const roots = [];
    for (const node of byId.values()) {
      (node.parent_id && byId.get(node.parent_id) ? byId.get(node.parent_id).replies : roots).push(node);
    }
    return res.json({ data: roots });
  }
  res.json({ data: rows });
}));

router.post('/:id/comments', authenticate, wrap(async (req, res) => {
  const postId = parseId(req.params.id);
  await publishedPostOr404(postId);
  const content = cleanMarkdown(req.body.content);
  if (!content || content.length > 2000) throw new HttpError(400, 'Comment must be 1-2000 characters');

  let parentId = null;
  if (req.body.parent_id !== undefined && req.body.parent_id !== null) {
    parentId = parseId(req.body.parent_id);
    const parent = await db.query('SELECT post_id FROM comments WHERE id=$1', [parentId]);
    if (!parent.rows[0] || parent.rows[0].post_id !== postId) {
      throw new HttpError(400, 'parent_id must be a comment on the same post');
    }
  }
  const { rows } = await db.query(
    `INSERT INTO comments(post_id,user_id,parent_id,content) VALUES ($1,$2,$3,$4)
     RETURNING id, post_id, user_id, parent_id, content, is_moderated, created_at`,
    [postId, req.user.id, parentId, content]);
  res.status(201).json({ comment: { ...rows[0], user_name: req.user.name } });
}));

// ---- POST /posts/:id/like (toggle) ----
router.post('/:id/like', authenticate, wrap(async (req, res) => {
  const postId = parseId(req.params.id);
  await publishedPostOr404(postId);
  // The UNIQUE(user_id, post_id) index makes this race-safe: a second concurrent insert is a no-op.
  const ins = await db.query(
    'INSERT INTO likes(user_id,post_id) VALUES ($1,$2) ON CONFLICT (user_id,post_id) DO NOTHING RETURNING id',
    [req.user.id, postId]);
  let liked = true;
  if (!ins.rowCount) {
    await db.query('DELETE FROM likes WHERE user_id=$1 AND post_id=$2', [req.user.id, postId]);
    liked = false;
  }
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM likes WHERE post_id=$1', [postId]);
  res.json({ liked, likes_count: rows[0].n });
}));

module.exports = router;
