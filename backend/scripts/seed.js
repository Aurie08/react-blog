// npm run seed : wipes and repopulates the DB with demo users, tags, 4 Malawian posts,
// comments (incl. a nested reply) and likes. Safe to run repeatedly.
const bcrypt = require('bcrypt');
const { pool } = require('../src/db');
const migrate = require('./migrate');
const { slugify } = require('../src/utils/slug');

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Password123!';

const users = [
  { name: 'Admin User', email: 'admin@blog.mw', role: 'admin' },
  { name: 'Olinda Banda', email: 'olinda@blog.mw', role: 'author' },
  { name: 'Chikondi Phiri', email: 'chikondi@blog.mw', role: 'author' },
  { name: 'Ben Mwale', email: 'ben@blog.mw', role: 'reader' },
  { name: 'Thoko Nyirenda', email: 'thoko@blog.mw', role: 'reader' },
];

const posts = [
  {
    title: 'Navigating ESCOM Load-Shedding: Tech Strategies for MUBAS Students',
    tags: ['Tech', 'Education'],
    author: 'olinda@blog.mw',
    views: 214,
    body: `Anyone studying in Blantyre knows the rhythm: the lights go off just as your build finishes or your lecture slides finish downloading. Load-shedding by ESCOM is a fact of student life, but with a little planning you can keep your coursework moving.

## 1. Make your laptop your first battery

- Enable **battery saver** mode and lower screen brightness when the power is out.
- Close Docker, heavy browser tabs and background sync clients you do not need.
- Keep your laptop charged during the hours when power is available, not "when it dies".

## 2. Work offline-first

Download documentation before you need it. Tools like \`git\`, a local database and an editor with offline support let you commit and test without any connection.

\`\`\`bash
# Work and commit offline, push when the network returns
git commit -am "feat: finish login form"
git push origin main
\`\`\`

## 3. Plan around the schedule

Check the published load-shedding timetable each week and block your **deep-work** sessions (coding, writing) for the hours with power. Use dark hours for reading, notes and paper-based revision.

## 4. Invest in a small backup

A power bank (20,000 mAh or more) keeps a phone hotspot and a laptop alive for hours. Groups of students can also share the cost of a small inverter in a shared room.

> Reliable power is not guaranteed, but a reliable *workflow* is something we can build ourselves.

What strategies work for you on campus? Share them in the comments.`,
  },
  {
    title: 'Mobile Money API Integration: Comparing Airtel Money vs TNM Mpamba Developer Portals',
    tags: ['Fintech'],
    author: 'chikondi@blog.mw',
    views: 342,
    body: `Mobile money is how a huge share of Malawians send, receive and save money, so any serious local app eventually needs to accept it. Two names dominate: **Airtel Money** and **TNM Mpamba**. Here is what developers should look at when comparing their integration options.

## What to compare

| Area | What to check |
|------|---------------|
| Onboarding | Business registration, KYC documents, time to get sandbox credentials |
| Sandbox | Is there a realistic test environment and test wallets? |
| Authentication | API keys, OAuth tokens, token expiry and refresh |
| Callbacks | How payment results are delivered (webhooks) and how to verify them |
| Fees & limits | Per-transaction caps, daily limits, settlement time |
| Documentation | Completeness, examples, support responsiveness |

## Design tips regardless of provider

1. **Treat every payment as asynchronous.** Create a pending record, then update it when the callback arrives.
2. **Make callbacks idempotent.** Providers may retry; use a unique transaction reference.
3. **Never trust the client.** Confirm the final status on the server before delivering goods.
4. **Log everything** (without logging secrets) so disputes can be resolved quickly.

## A simple abstraction

Wrap each provider behind one interface so your app does not care which network the customer uses:

\`\`\`js
class PaymentProvider {
  async requestPayment({ phone, amount, reference }) {}
  async verifyCallback(req) {}
}
\`\`\`

> Always confirm current endpoints, fees and onboarding requirements directly on each provider's official developer portal, as they change over time.`,
  },
  {
    title: 'Smart Agriculture: IoT Moisture Sensors in Smallholder Farming in Lilongwe',
    tags: ['AgTech'],
    author: 'olinda@blog.mw',
    views: 156,
    body: `Agriculture supports most households in Malawi, and smallholder farmers around Lilongwe face unpredictable rainfall and rising input costs. Low-cost **soil moisture sensors** connected to simple microcontrollers can help farmers water and plant with more confidence.

## How a basic system works

1. A **capacitive soil moisture sensor** is placed in the root zone.
2. A microcontroller (such as an ESP32) reads the value every few minutes.
3. Readings are sent over Wi-Fi, or via LoRa to a nearby gateway where mobile coverage is weak.
4. A dashboard or an **SMS alert** tells the farmer when the soil is too dry.

\`\`\`cpp
int raw = analogRead(SENSOR_PIN);
int percent = map(raw, DRY_VALUE, WET_VALUE, 0, 100);
if (percent < 30) sendSmsAlert("Field A needs water");
\`\`\`

## Why it suits smallholders

- **Low cost:** sensors and boards are cheap compared to commercial systems.
- **Low power:** solar panels and small batteries work well.
- **Works with basic phones:** SMS means no smartphone is required.

## Challenges

- Calibration differs between soil types.
- Sensors can be damaged or stolen in open fields.
- Farmers need training and trust, so working with extension officers and farmer clubs matters.

Pilot projects with a few plots, honest feedback from farmers, and local maintenance partners are the best way to prove value before scaling.`,
  },
  {
    title: 'The Growth of the Software Ecosystem in Blantyre & Southern Region',
    tags: ['Local Tech'],
    author: 'chikondi@blog.mw',
    views: 98,
    body: `Blantyre has long been Malawi's commercial capital, and a growing community of developers, designers and founders is turning it into a practical home for software work too.

## Ingredients of a growing ecosystem

- **Universities and colleges** producing graduates in computing and business, including MUBAS.
- **Community meetups and hackathons** where students meet working developers.
- **Banks, telecoms and NGOs** that need software and create demand for local talent.
- **Mobile money and fintech** opening real problems to solve.

## What developers say they need

1. Reliable power and affordable, stable internet.
2. Access to mentors and first paid projects.
3. Simple ways to **accept international payments** and work remotely.

## How students can contribute

- Build in public: publish projects on GitHub and write about them.
- Join or start a campus tech club.
- Contribute to local open-source and civic tech projects.

> Ecosystems grow when people share what they learn. Write the tutorial you wished existed.

If you work in tech in the Southern Region, tell us what you are building.`,
  },
];

async function seed() {
  await migrate();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE likes, comments, post_tags, posts, tags, users RESTART IDENTITY CASCADE');

    const uid = {};
    for (const u of users) {
      const { rows } = await client.query(
        'INSERT INTO users(name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id', [u.name, u.email, hash, u.role]);
      uid[u.email] = rows[0].id;
    }

    const tagId = {};
    const postId = {};
    for (const p of posts) {
      const { rows } = await client.query(
        `INSERT INTO posts(title,slug,body_markdown,status,author_id,views_count)
         VALUES ($1,$2,$3,'published',$4,$5) RETURNING id`,
        [p.title, slugify(p.title), p.body, uid[p.author], p.views]);
      postId[p.title] = rows[0].id;
      for (const name of p.tags) {
        if (!tagId[name]) {
          tagId[name] = (await client.query('INSERT INTO tags(name,slug) VALUES ($1,$2) RETURNING id',
            [name, slugify(name)])).rows[0].id;
        }
        await client.query('INSERT INTO post_tags VALUES ($1,$2)', [rows[0].id, tagId[name]]);
      }
    }

    // Demo engagement: comments (with a nested reply) and likes
    const first = postId[posts[0].title];
    const c1 = (await client.query(
      'INSERT INTO comments(post_id,user_id,content) VALUES ($1,$2,$3) RETURNING id',
      [first, uid['ben@blog.mw'], 'The power bank tip saved my final-year project. Thanks!'])).rows[0].id;
    await client.query('INSERT INTO comments(post_id,user_id,parent_id,content) VALUES ($1,$2,$3,$4)',
      [first, uid['olinda@blog.mw'], c1, 'Glad it helped, Ben! Good luck with the demo.']);
    await client.query('INSERT INTO comments(post_id,user_id,content) VALUES ($1,$2,$3)',
      [postId[posts[1].title], uid['thoko@blog.mw'], 'Would love a follow-up on handling callback retries.']);
    for (const email of ['ben@blog.mw', 'thoko@blog.mw']) {
      await client.query('INSERT INTO likes(user_id,post_id) VALUES ($1,$2)', [uid[email], first]);
    }
    await client.query('INSERT INTO likes(user_id,post_id) VALUES ($1,$2)', [uid['ben@blog.mw'], postId[posts[1].title]]);

    await client.query('COMMIT');
    console.log(`Seeded ${users.length} users, ${posts.length} posts. Demo password: ${DEMO_PASSWORD}`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

seed().then(() => pool.end()).catch((e) => { console.error(e); process.exit(1); });
