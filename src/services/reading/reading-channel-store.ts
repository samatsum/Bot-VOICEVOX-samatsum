import { db } from '../../db/client.js';

export async function addReadingChannel(guildId: string, channelId: string): Promise<boolean> {
  const result = await db.execute({
    sql: 'INSERT OR IGNORE INTO reading_channels(guild_id, channel_id, created_at) VALUES(?, ?, ?)',
    args: [guildId, channelId, Date.now()]
  });
  return result.rowsAffected > 0;
}

export async function removeReadingChannel(guildId: string, channelId: string): Promise<boolean> {
  const result = await db.execute({sql:'DELETE FROM reading_channels WHERE guild_id = ? AND channel_id = ?', args:[guildId, channelId]});
  return result.rowsAffected > 0;
}

export async function getReadingChannels(guildId: string): Promise<string[]> {
  const result = await db.execute({sql:'SELECT channel_id FROM reading_channels WHERE guild_id = ? ORDER BY created_at', args:[guildId]});
  return result.rows.map((row) => String(row.channel_id));
}

export async function isReadingChannel(guildId: string, channelId: string): Promise<boolean> {
  const result = await db.execute({sql:'SELECT 1 AS ok FROM reading_channels WHERE guild_id = ? AND channel_id = ? LIMIT 1', args:[guildId, channelId]});
  return result.rows.length > 0;
}
