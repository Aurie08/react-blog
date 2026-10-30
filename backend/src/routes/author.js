const express = require('express');
const db = require('../db');
const HttpError = require('../utils/httpError');
const wrap = require('../utils/wrap');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('author', 'admin'));

// Per-post metrics. Likes and comments are counted in SEPARATE subqueries, then joined
// to posts - joining both tables directly would multiply rows (likes x comments).
const PER_POST_SQL = `
  SELECT p.id, p.title, p.slug, p.status, p.views_count,
         COALESCE(l.n, 0)::int AS likes_count,
         COALESCE(c.n, 0)::int AS comments_count
  FROM posts p
  LEFT JOIN (SELECT post_id, COUNT(*) n FROM likes    GROUP BY post_id) l ON l.post_id = p.id
  LEFT JOIN (SELECT post_id, COUNT(*) n FROM comments GROUP BY post_id) c ON c.post_id = p.id
  WHERE p.author_id = $1
  ORDER BY p.created_at DESC`;

router.get('/stats', wrap(async (req, res) => {
  let authorId = req.user.id;
  if (req.query.author_id !== undefined) {
    if (req.user.role !== 'admin') throw new HttpError(403, 'Only admins can view other authors');
    authorId = Number(req.query.author_id);
    if (!Number.isInteger(authorId)) throw new HttpError(400, 'Invalid author_id');
  }
  const { rows: posts } = await db.query(PER_POST_SQL, [authorId]);
  const totals = posts.reduce((t, p) => ({
    total_posts: t.total_posts + 1,
    total_views: t.total_views + p.views_count,
    total_likes: t.total_likes + p.likes_count,
    total_comments: t.total_comments + p.comments_count,
  }), { total_posts: 0, total_views: 0, total_likes: 0, total_comments: 0 });
  res.json({ ...totals, posts });
}));

// Own posts including drafts (the public feed hides drafts).
router.get('/posts', wrap(async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, title, slug, status, views_count, created_at, cover_image_url
     FROM posts WHERE author_id=$1 ORDER BY created_at DESC`, [req.user.id]);
  res.json({ data: rows });
}));

module.exports = router;
