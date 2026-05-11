# Clock Report

A lightweight personal time & drive tracker. Single-user, no auth, deployable to Vercel in minutes.

## Features

- **Clock In / Out** — one large button, live ticking timer, optional job label and notes
- **Drive Tracking** — start/stop drive sessions with a destination label and live timer
- **Dashboard** — today's hours, week hours, drive count, drive time at a glance
- **Weekly Reports** — time and drive tables with CSV export, week navigation

## Stack

- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- **Dev:** SQLite via `better-sqlite3` (zero setup)
- **Prod:** Vercel Postgres

---

## Local Development

### 1. Clone and install

```bash
git clone <your-repo>
cd clock-report
npm install
```

### 2. Create `.env.local`

```bash
cp .env.example .env.local
```

The default `.env.local` already has `USE_SQLITE=true`. No database setup needed — the SQLite file is created automatically on first run.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init && git add . && git commit -m "init"
gh repo create clock-report --private --push --source .
```

### 2. Create a Vercel Postgres database

In the Vercel dashboard: **Storage → Create → Postgres**. Name it anything (e.g. `clock-report-db`). Connect it to your project — Vercel will inject the `POSTGRES_*` env vars automatically.

### 3. Deploy

```bash
npm i -g vercel
vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard and it deploys on push.

> **Note:** Do **not** set `USE_SQLITE` in Vercel env vars. Leave it unset to use Postgres.

### 4. Initialize the database

On first deploy, visit your app once — the tables are created automatically via `CREATE TABLE IF NOT EXISTS` on the first request.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `USE_SQLITE` | Dev only | Set to `true` to use local SQLite |
| `SQLITE_PATH` | Optional | Path to SQLite file (default `./clock-report.db`) |
| `POSTGRES_URL` | Prod | Injected automatically by Vercel Postgres |

---

## Notes

- All times are stored as UTC ISO strings. Dashboard stats use your browser's local timezone for "today" and "week" boundaries.
- The SQLite database file (`clock-report.db`) is excluded from git via `.gitignore`.
