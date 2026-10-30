# ELE-IWS-521 React Blog: Backend API (Node / Express / PostgreSQL)

## Setup
```bash
npm install
cp .env.example .env          # set DATABASE_URL and JWT_SECRET
npm run migrate               # create tables
npm run seed                  # demo users + 4 Malawian posts (password: Password123!)
npm run dev                   # http://localhost:4000/api/v1/health
npm test                      # needs a blog_test database (TEST_DATABASE_URL to override)
```
Demo logins (after seed): `admin@blog.mw`, `olinda@blog.mw` / `chikondi@blog.mw` (authors), `ben@blog.mw` / `thoko@blog.mw` (readers).

API contract: `openapi.yaml` (paste into https://editor.swagger.io or import into Postman).

## Structure
```
src/app.js              middleware stack + route mounting (createApp)
src/routes/             auth, posts (+comments, likes), author (stats), users (roles)
src/middleware/         auth (JWT + RBAC), rateLimit, upload (multer), errorHandler
migrations/*.sql        schema, applied by scripts/migrate.js
scripts/seed.js         npm run seed
tests/api.test.js       18 Jest/Supertest tests
```

## Suggested commit sequence (at least 5 required)
1. `chore: scaffold express app, config and pg pool`
2. `feat(db): add schema migration and migrate runner`
3. `feat(auth): implement register/login with bcrypt and JWT middleware`
4. `feat(rbac): add role middleware and ownership checks`
5. `feat(posts): CRUD, tags, pagination, search, cover upload`
6. `feat(engagement): nested comments, like toggle, author stats`
7. `feat(security): rate limiting, helmet, input sanitisation`
8. `chore(seed): Malawian seed data`
9. `test: add Jest/Supertest suite`
10. `docs: OpenAPI spec and README` then tag: `git tag final-submission`

## Deploy (Render)
Push to GitHub -> Render "New Blueprint" using `render.yaml` -> set `CORS_ORIGIN` to the frontend URL -> run `npm run seed` once from the Render shell.
Note: uploaded cover images live on local disk, which is ephemeral on free tiers (they vanish on redeploy); seed posts have no cover images so the demo is unaffected.
