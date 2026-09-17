import { mkdir } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { env } from '../env.js';

if (env.tursoDatabaseUrl.startsWith('file:')) {
  await mkdir(new URL('../../data/', import.meta.url), { recursive: true }).catch(() => undefined);
}

export const db = createClient({
  url: env.tursoDatabaseUrl,
  authToken: env.tursoAuthToken
});

const schema = [
  `CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    access_mode TEXT NOT NULL DEFAULT 'open',
    dictionary_channel_id TEXT,
    max_text_length INTEGER NOT NULL DEFAULT 300,
    join_leave_notice INTEGER NOT NULL DEFAULT 0,
    attachment_notice INTEGER NOT NULL DEFAULT 1,
    emoji_reading INTEGER NOT NULL DEFAULT 1,
    auto_leave_seconds INTEGER NOT NULL DEFAULT 30,
    default_speaker_name TEXT NOT NULL DEFAULT 'auto',
    default_speed_scale REAL NOT NULL DEFAULT 1.0,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reading_channels (
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, channel_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    speaker_name TEXT NOT NULL,
    style_name TEXT NOT NULL,
    speed_scale REAL NOT NULL,
    read_enabled INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS dictionary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    word TEXT NOT NULL,
    reading TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    updated_by_user_id TEXT NOT NULL,
    updated_by_display_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (guild_id, word)
  )`,
  `CREATE TABLE IF NOT EXISTS dictionary_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    entry_id INTEGER NOT NULL,
    word TEXT NOT NULL,
    action TEXT NOT NULL,
    before_reading TEXT,
    after_reading TEXT,
    before_deleted INTEGER,
    after_deleted INTEGER,
    actor_user_id TEXT NOT NULL,
    actor_display_name TEXT NOT NULL,
    snapshot_reading TEXT NOT NULL,
    snapshot_deleted INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_dictionary_entries_guild_active ON dictionary_entries(guild_id, is_deleted)`,
  `CREATE INDEX IF NOT EXISTS idx_dictionary_history_guild_word ON dictionary_history(guild_id, word, id DESC)`,
  `CREATE TABLE IF NOT EXISTS instance_locks (
    guild_id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL,
    heartbeat_at INTEGER NOT NULL
  )`
];


const migrations = [
  `ALTER TABLE guild_settings ADD COLUMN max_text_length INTEGER NOT NULL DEFAULT 300`,
  `ALTER TABLE guild_settings ADD COLUMN join_leave_notice INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE guild_settings ADD COLUMN attachment_notice INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE guild_settings ADD COLUMN emoji_reading INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE guild_settings ADD COLUMN auto_leave_seconds INTEGER NOT NULL DEFAULT 30`,
  `ALTER TABLE guild_settings ADD COLUMN default_speaker_name TEXT NOT NULL DEFAULT 'auto'`,
  `ALTER TABLE guild_settings ADD COLUMN default_speed_scale REAL NOT NULL DEFAULT 1.0`
];

async function runMigrations(): Promise<void> {
  for (const sql of migrations) {
    try {
      await db.execute(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!message.includes('duplicate column') && !message.includes('already exists')) throw error;
    }
  }
}

export async function initializeDatabase(): Promise<void> {
  await db.batch(schema.map((sql) => ({ sql, args: [] })), 'write');
  await runMigrations();
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO guild_settings(guild_id, access_mode, updated_at)
          VALUES(?, 'open', ?)
          ON CONFLICT(guild_id) DO NOTHING`,
    args: [env.discordGuildId, now]
  });
}

export function isRemoteDatabase(): boolean {
  return !env.tursoDatabaseUrl.startsWith('file:');
}

export async function closeDatabase(): Promise<void> { await db.close(); }
