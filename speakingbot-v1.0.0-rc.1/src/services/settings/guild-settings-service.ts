import { db } from '../../db/client.js';

export const MIN_MAX_TEXT_LENGTH = 50;
export const MAX_MAX_TEXT_LENGTH = 1000;
export const MIN_AUTO_LEAVE_SECONDS = 0;
export const MAX_AUTO_LEAVE_SECONDS = 600;

export type GuildSettings = {
  maxTextLength: number;
  joinLeaveNotice: boolean;
  attachmentNotice: boolean;
  emojiReading: boolean;
  autoLeaveSeconds: number;
  defaultSpeakerName: 'auto' | 'ずんだもん' | '四国めたん';
  defaultSpeedScale: number;
};

function boolValue(value: unknown, fallback: boolean): boolean {
  if (value === null || value === undefined) return fallback;
  return Number(value) !== 0;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampSpeed(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1.0;
  return Math.round(Math.min(2.0, Math.max(0.5, n)) * 10) / 10;
}

export async function getGuildSettings(guildId: string): Promise<GuildSettings> {
  const row = (await db.execute({
    sql: `SELECT max_text_length, join_leave_notice, attachment_notice, emoji_reading,
                 auto_leave_seconds, default_speaker_name, default_speed_scale
          FROM guild_settings WHERE guild_id = ?`,
    args: [guildId]
  })).rows[0];

  const rawSpeaker = String(row?.default_speaker_name ?? 'auto');
  const defaultSpeakerName: GuildSettings['defaultSpeakerName'] =
    rawSpeaker === 'ずんだもん' || rawSpeaker === '四国めたん' ? rawSpeaker : 'auto';

  return {
    maxTextLength: clampInt(row?.max_text_length, 300, MIN_MAX_TEXT_LENGTH, MAX_MAX_TEXT_LENGTH),
    joinLeaveNotice: boolValue(row?.join_leave_notice, false),
    attachmentNotice: boolValue(row?.attachment_notice, true),
    emojiReading: boolValue(row?.emoji_reading, true),
    autoLeaveSeconds: clampInt(row?.auto_leave_seconds, 30, MIN_AUTO_LEAVE_SECONDS, MAX_AUTO_LEAVE_SECONDS),
    defaultSpeakerName,
    defaultSpeedScale: clampSpeed(row?.default_speed_scale)
  };
}

async function setField(guildId: string, field: string, value: string | number): Promise<GuildSettings> {
  const allowed = new Set([
    'max_text_length', 'join_leave_notice', 'attachment_notice', 'emoji_reading',
    'auto_leave_seconds', 'default_speaker_name', 'default_speed_scale'
  ]);
  if (!allowed.has(field)) throw new Error('Unknown guild setting field.');
  await db.execute({
    sql: `UPDATE guild_settings SET ${field} = ?, updated_at = ? WHERE guild_id = ?`,
    args: [value, Date.now(), guildId]
  });
  return await getGuildSettings(guildId);
}

export async function setMaxTextLength(guildId: string, value: number) {
  return await setField(guildId, 'max_text_length', clampInt(value, 300, MIN_MAX_TEXT_LENGTH, MAX_MAX_TEXT_LENGTH));
}
export async function setJoinLeaveNotice(guildId: string, enabled: boolean) {
  return await setField(guildId, 'join_leave_notice', enabled ? 1 : 0);
}
export async function setAttachmentNotice(guildId: string, enabled: boolean) {
  return await setField(guildId, 'attachment_notice', enabled ? 1 : 0);
}
export async function setEmojiReading(guildId: string, enabled: boolean) {
  return await setField(guildId, 'emoji_reading', enabled ? 1 : 0);
}
export async function setAutoLeaveSeconds(guildId: string, seconds: number) {
  return await setField(guildId, 'auto_leave_seconds', clampInt(seconds, 30, MIN_AUTO_LEAVE_SECONDS, MAX_AUTO_LEAVE_SECONDS));
}
export async function setDefaultSpeakerName(guildId: string, speaker: GuildSettings['defaultSpeakerName']) {
  return await setField(guildId, 'default_speaker_name', speaker);
}
export async function setDefaultSpeedScale(guildId: string, speed: number) {
  return await setField(guildId, 'default_speed_scale', clampSpeed(speed));
}
