import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required. Check your .env file.`);
  return value;
}
function optionalEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}
function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const tursoDatabaseUrl = optionalEnv('TURSO_DATABASE_URL', 'file:./data/speakingbot.db');
const tursoAuthToken = optionalEnv('TURSO_AUTH_TOKEN');
if (!tursoDatabaseUrl.startsWith('file:') && !tursoAuthToken) {
  throw new Error('TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL points to a remote database.');
}

export const env = {
  discordBotToken: requireEnv('DISCORD_BOT_TOKEN'),
  discordApplicationId: requireEnv('DISCORD_APPLICATION_ID'),
  discordGuildId: requireEnv('DISCORD_GUILD_ID'),
  voicevoxBaseUrl: optionalEnv('VOICEVOX_BASE_URL', 'http://127.0.0.1:50021'),
  tursoDatabaseUrl,
  tursoAuthToken: tursoAuthToken || undefined,
  instanceLockTtlMs: Math.max(20_000, numberEnv('INSTANCE_LOCK_TTL_MS', 45_000)),
  instanceHeartbeatMs: Math.max(5_000, numberEnv('INSTANCE_HEARTBEAT_MS', 15_000))
} as const;
