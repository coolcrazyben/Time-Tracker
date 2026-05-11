/**
 * Unified database layer.
 * USE_SQLITE=true  → better-sqlite3 (local dev)
 * default          → @neondatabase/serverless (production)
 *
 * All SQL is written in Postgres syntax ($1, $2 …).
 * pgToSQLite() rewrites placeholders to ? for SQLite.
 */

export type TimeSession = {
  id: number
  start_time: string
  end_time: string | null
  label: string | null
  notes: string | null
}

export type DriveSession = {
  id: number
  start_time: string
  end_time: string | null
  destination: string
  route_data: string | null
}

export type Waypoint = { lat: number; lng: number; ts: number }

// ─── Internal helpers ─────────────────────────────────────────────────────────

const USE_SQLITE = process.env.USE_SQLITE === 'true'

/** Convert Postgres $1/$2/… placeholders to SQLite ? */
function pgToSQLite(sql: string): string {
  return sql.replace(/\$\d+/g, '?')
}

let _sqlite: import('better-sqlite3').Database | null = null

function getSQLite(): import('better-sqlite3').Database {
  if (_sqlite) return _sqlite
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as typeof import('better-sqlite3')
  const path = process.env.SQLITE_PATH ?? './clock-report.db'
  _sqlite = new Database(path)
  _sqlite.pragma('journal_mode = WAL')
  _sqlite.exec(`
    CREATE TABLE IF NOT EXISTS time_sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time TEXT    NOT NULL,
      end_time   TEXT,
      label      TEXT,
      notes      TEXT
    );
    CREATE TABLE IF NOT EXISTS drive_sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time  TEXT NOT NULL,
      end_time    TEXT,
      destination TEXT NOT NULL,
      route_data  TEXT
    );
  `)
  // Migration: add route_data to existing tables that predate this column
  try { _sqlite.exec(`ALTER TABLE drive_sessions ADD COLUMN route_data TEXT`) } catch { /* already exists */ }
  return _sqlite
}

type Scalar = string | number | null

// ─── Neon (production) helpers ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _neonSql: ((...args: any[]) => Promise<any>) | null = null

function getNeonSql() {
  if (_neonSql) return _neonSql
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { neon } = require('@neondatabase/serverless')
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
  if (!connectionString) {
    throw new Error(
      'No database connection string found. ' +
      'Set DATABASE_URL (or POSTGRES_URL) in your Vercel project environment variables, ' +
      'or set USE_SQLITE=true for local development.'
    )
  }
  _neonSql = neon(connectionString)
  return _neonSql!
}

/**
 * Convert "SELECT … WHERE id = $1" + [val] into the
 * (TemplateStringsArray, ...values) form that neon() tagged-template expects.
 *
 * Tagged template `sql\`…${v}…\`` desugars to sql(['…','…'], v),
 * so we split on $1/$2/… placeholders and spread the params.
 */
function toTemplate(sqlText: string, params: Scalar[]): [TemplateStringsArray, ...Scalar[]] {
  const parts = sqlText.split(/\$\d+/)
  const strings = Object.assign([...parts], { raw: [...parts] }) as TemplateStringsArray
  return [strings, ...params]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pgQuery<T = any>(sqlText: string, params: Scalar[]): Promise<T[]> {
  const sql = getNeonSql()
  const [strings, ...values] = toTemplate(sqlText, params)
  const rows = await sql(strings, ...values)
  return rows as T[]
}

let pgInitDone = false
async function ensurePgTables() {
  if (pgInitDone) return
  const sql = getNeonSql()
  // Use tagged template directly — no dynamic params needed here
  await sql`
    CREATE TABLE IF NOT EXISTS time_sessions (
      id         SERIAL PRIMARY KEY,
      start_time TIMESTAMPTZ NOT NULL,
      end_time   TIMESTAMPTZ,
      label      TEXT,
      notes      TEXT
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS drive_sessions (
      id          SERIAL PRIMARY KEY,
      start_time  TIMESTAMPTZ NOT NULL,
      end_time    TIMESTAMPTZ,
      destination TEXT NOT NULL,
      route_data  TEXT
    )
  `
  await sql`ALTER TABLE drive_sessions ADD COLUMN IF NOT EXISTS route_data TEXT`
  pgInitDone = true
}

// Generic SELECT
async function select<T>(sql: string, params: Scalar[] = []): Promise<T[]> {
  if (USE_SQLITE) {
    const db = getSQLite()
    return db.prepare(pgToSQLite(sql)).all(params) as T[]
  }
  await ensurePgTables()
  return pgQuery<T>(sql, params)
}

// Generic INSERT — returns inserted row id
async function insert(sql: string, params: Scalar[] = []): Promise<number> {
  if (USE_SQLITE) {
    const db = getSQLite()
    const info = db.prepare(pgToSQLite(sql)).run(params)
    return Number(info.lastInsertRowid)
  }
  await ensurePgTables()
  // Neon returns the rows array directly from tagged-template calls
  const rows = await pgQuery<{ id: number }>(`${sql} RETURNING id`, params)
  return Number(rows[0].id)
}

// Generic UPDATE/DELETE — no return value needed
async function mutate(sql: string, params: Scalar[] = []): Promise<void> {
  if (USE_SQLITE) {
    const db = getSQLite()
    db.prepare(pgToSQLite(sql)).run(params)
    return
  }
  await ensurePgTables()
  await pgQuery(sql, params)
}

// ─── Time Sessions ────────────────────────────────────────────────────────────

export async function getActiveTimeSession(): Promise<TimeSession | null> {
  const rows = await select<TimeSession>(
    'SELECT * FROM time_sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
  )
  return rows[0] ?? null
}

export async function clockIn(label?: string, notes?: string): Promise<TimeSession> {
  const now = new Date().toISOString()
  const id = await insert(
    'INSERT INTO time_sessions (start_time, label, notes) VALUES ($1, $2, $3)',
    [now, label ?? null, notes ?? null]
  )
  return { id, start_time: now, end_time: null, label: label ?? null, notes: notes ?? null }
}

export async function clockOut(id: number): Promise<void> {
  await mutate(
    'UPDATE time_sessions SET end_time = $1 WHERE id = $2',
    [new Date().toISOString(), id]
  )
}

export async function getTimeSessionsInRange(
  from: string,
  to: string
): Promise<TimeSession[]> {
  return select<TimeSession>(
    `SELECT * FROM time_sessions
     WHERE start_time >= $1 AND start_time < $2
     ORDER BY start_time ASC`,
    [from, to]
  )
}

export async function getTodayTimeSeconds(todayStart: string, todayEnd: string): Promise<number> {
  if (USE_SQLITE) {
    const rows = await select<{ secs: number }>(
      `SELECT COALESCE(SUM(
         strftime('%s', COALESCE(end_time, datetime('now'))) -
         strftime('%s', start_time)
       ), 0) AS secs
       FROM time_sessions
       WHERE start_time >= $1 AND start_time < $2`,
      [todayStart, todayEnd]
    )
    return Math.floor(Number(rows[0]?.secs ?? 0))
  }
  const rows = await select<{ secs: string }>(
    `SELECT COALESCE(SUM(
       EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))
     ), 0)::text AS secs
     FROM time_sessions
     WHERE start_time >= $1 AND start_time < $2`,
    [todayStart, todayEnd]
  )
  return Math.floor(Number(rows[0]?.secs ?? 0))
}

export async function getWeekTimeSeconds(weekStart: string, weekEnd: string): Promise<number> {
  if (USE_SQLITE) {
    const rows = await select<{ secs: number }>(
      `SELECT COALESCE(SUM(
         strftime('%s', COALESCE(end_time, datetime('now'))) -
         strftime('%s', start_time)
       ), 0) AS secs
       FROM time_sessions
       WHERE start_time >= $1 AND start_time < $2`,
      [weekStart, weekEnd]
    )
    return Math.floor(Number(rows[0]?.secs ?? 0))
  }
  const rows = await select<{ secs: string }>(
    `SELECT COALESCE(SUM(
       EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))
     ), 0)::text AS secs
     FROM time_sessions
     WHERE start_time >= $1 AND start_time < $2`,
    [weekStart, weekEnd]
  )
  return Math.floor(Number(rows[0]?.secs ?? 0))
}

// ─── Drive Sessions ───────────────────────────────────────────────────────────

export async function getActiveDriveSession(): Promise<DriveSession | null> {
  const rows = await select<DriveSession>(
    'SELECT * FROM drive_sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1'
  )
  return rows[0] ?? null
}

export async function startDrive(destination: string): Promise<DriveSession> {
  const now = new Date().toISOString()
  const id = await insert(
    'INSERT INTO drive_sessions (start_time, destination) VALUES ($1, $2)',
    [now, destination]
  )
  return { id, start_time: now, end_time: null, destination, route_data: null }
}

export async function stopDrive(id: number, routeData?: string | null): Promise<void> {
  await mutate(
    'UPDATE drive_sessions SET end_time = $1, route_data = $2 WHERE id = $3',
    [new Date().toISOString(), routeData ?? null, id]
  )
}

export async function getDriveSessionsInRange(
  from: string,
  to: string
): Promise<DriveSession[]> {
  return select<DriveSession>(
    `SELECT * FROM drive_sessions
     WHERE start_time >= $1 AND start_time < $2
     ORDER BY start_time ASC`,
    [from, to]
  )
}

export async function getWeekDriveStats(
  weekStart: string,
  weekEnd: string
): Promise<{ count: number; totalSeconds: number }> {
  if (USE_SQLITE) {
    const rows = await select<{ cnt: number; secs: number }>(
      `SELECT COUNT(*) AS cnt,
              COALESCE(SUM(
                strftime('%s', COALESCE(end_time, datetime('now'))) -
                strftime('%s', start_time)
              ), 0) AS secs
       FROM drive_sessions
       WHERE start_time >= $1 AND start_time < $2`,
      [weekStart, weekEnd]
    )
    return { count: Number(rows[0]?.cnt ?? 0), totalSeconds: Math.floor(Number(rows[0]?.secs ?? 0)) }
  }
  const rows = await select<{ cnt: string; secs: string }>(
    `SELECT COUNT(*)::text AS cnt,
            COALESCE(SUM(
              EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))
            ), 0)::text AS secs
     FROM drive_sessions
     WHERE start_time >= $1 AND start_time < $2`,
    [weekStart, weekEnd]
  )
  return {
    count: Number(rows[0]?.cnt ?? 0),
    totalSeconds: Math.floor(Number(rows[0]?.secs ?? 0)),
  }
}
