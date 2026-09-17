import { PermissionFlagsBits, type PermissionsBitField } from 'discord.js';
import { db } from '../../db/client.js';

export type AccessMode = 'open' | 'admin';

export async function getAccessMode(guildId: string): Promise<AccessMode> {
  const row = (await db.execute({sql:'SELECT access_mode FROM guild_settings WHERE guild_id = ?', args:[guildId]})).rows[0];
  return row?.access_mode === 'admin' ? 'admin' : 'open';
}

export async function setAccessMode(guildId: string, mode: AccessMode): Promise<void> {
  await db.execute({
    sql: `INSERT INTO guild_settings(guild_id, access_mode, updated_at)
          VALUES(?, ?, ?)
          ON CONFLICT(guild_id) DO UPDATE SET access_mode = excluded.access_mode, updated_at = excluded.updated_at`,
    args: [guildId, mode, Date.now()]
  });
}

export function hasServerManagePermission(memberPermissions: Readonly<PermissionsBitField> | null): boolean {
  return memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

export async function canUseBotByPermissions(guildId: string, memberPermissions: Readonly<PermissionsBitField> | null): Promise<boolean> {
  const mode = await getAccessMode(guildId);
  return mode === 'open' || hasServerManagePermission(memberPermissions);
}
