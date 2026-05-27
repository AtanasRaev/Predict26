# Predict26 — World Cup 2026 Prediction App

A prediction game for friends to compete on World Cup 2026 match scores.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL** via [Neon](https://neon.tech) (free tier)
- **Prisma 7** ORM with `@prisma/adapter-pg`
- **Auth.js v5** (credentials + JWT sessions, no email required)
- **football-data.org** API (free tier, delayed data)
- **Tailwind CSS + shadcn/ui**
- **Vercel** hosting + Cron Jobs

## Getting Started

### 1. Clone and install

```bash
git clone <repo>
cd predict26
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:
- `DATABASE_URL` — PostgreSQL connection string (e.g. from Neon)
- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_SECRET` — same value as AUTH_SECRET
- `FOOTBALL_DATA_API_KEY` — from [football-data.org](https://www.football-data.org/client/register)
- `CRON_SECRET` — any random string to protect the cron endpoint

### 3. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 4. Create an admin user

```bash
npm run db:seed
```

Default credentials: `admin` / `changeme123` — **change after first login!**

### 5. Start development server

```bash
npm run dev
```

Visit `http://localhost:3000`

### 6. Seed fixture data

Log in as admin, go to `/admin`, click **Sync Fixtures**.  
This fetches all World Cup 2026 matches from football-data.org.

---

## Deployment (Vercel)

1. Push code to GitHub
2. Import repository to Vercel
3. Add environment variables in Vercel Dashboard
4. Deploy — `prisma generate` runs automatically via `postinstall`
5. Run migrations: `npx prisma migrate deploy`
6. Visit `/admin` and click **Sync Fixtures** to seed initial data

The `vercel.json` configures a cron job that syncs match scores every 10 minutes.  
Set `CRON_SECRET` in Vercel environment variables for security.

---

## Scoring Rules

### Group Stage
| Prediction | Points |
|---|---|
| Exact score | 3 |
| Correct outcome | 1 |
| Wrong | 0 |

### Knockout Stage (90 minutes only)
| Prediction | Points |
|---|---|
| Exact 90-min score | 3 |
| Correct 90-min outcome | 1 |
| Predicted draw + correct qualifier | 1 (outcome) + 1 (qualifier) = **2** |
| Exact 90-min draw + correct qualifier | 3 + 1 = **4** |
| Wrong outcome but predicted winner qualifies via ET/pens | **1 consolation** |

**Maximum knockout points = 4.**

---

## Pages

| Page | URL |
|---|---|
| Dashboard | `/` |
| Fixtures | `/fixtures` |
| Match detail | `/match/[id]` |
| My predictions | `/predictions` |
| Leaderboard | `/leaderboard` |
| Group standings | `/groups` |
| Admin panel | `/admin` |
| Admin match edit | `/admin/matches/[id]` |

---

## API Sync Strategy

- Fixtures: every 12 hours (admin can force anytime)
- Scores: every 10 min via Vercel Cron (5 min if live match detected)
- Standings: every 60 min + immediately after a match finishes
- All syncs respect cooldowns and write to `ApiSyncLog`
- Cron auto-skips outside the tournament window (June 11 – July 19, 2026)

---

## Leaderboard Tiebreakers

1. Total points
2. Exact score count
3. Correct outcome count
4. Submitted predictions count
5. Username (alphabetical)

---

## NPM Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Create admin user
npm run db:studio    # Open Prisma Studio
```
