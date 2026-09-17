import { PermissionFlagsBits, type Message } from 'discord.js';
import { getAccessMode } from '../access/access-service.js';
import { getUserSettings } from '../settings/user-settings-store.js';
import { resolveVoiceOverride } from '../settings/voice-resolver.js';
import { processDiscordMessage } from '../text/text-processor.js';
import { getGuildVoiceConnection } from '../voice/connection-manager.js';
import { createMessageStatusController } from './message-status.js';
import { enqueueReading } from './reading-queue.js';
import { isReadingChannel } from './reading-channel-store.js';

const ERROR_NOTIFICATION_COOLDOWN_MS = 60_000;
const lastErrorNotificationAt = new Map<string, number>();

async function notifyRealtimeError(message: Message<true>, errorMessage: string): Promise<void> {
  const key = `${message.guildId}:${message.channelId}`;
  const now = Date.now();
  const previous = lastErrorNotificationAt.get(key) ?? 0;
  if (now - previous < ERROR_NOTIFICATION_COOLDOWN_MS) return;
  lastErrorNotificationAt.set(key, now);

  try {
    await message.reply({
      content: `⚠️ 読み上げに失敗しました。${errorMessage}`,
      allowedMentions: { repliedUser: false }
    });
  } catch (error) {
    console.error('Failed to post realtime TTS error notification:', error);
  }
}

export async function handleRealtimeMessage(message: Message): Promise<void> {
  if (!message.inGuild() || message.author.bot || message.webhookId) return;

  const accessMode = await getAccessMode(message.guildId);
  if (
    accessMode === 'admin' &&
    !message.member?.permissions.has(PermissionFlagsBits.ManageGuild)
  ) return;

  if (!(await isReadingChannel(message.guildId, message.channelId))) return;
  if (!getGuildVoiceConnection(message.guildId)) return;

  const botVoiceChannelId = message.guild.members.me?.voice.channelId;
  const authorVoiceChannelId = message.member?.voice.channelId;
  if (!botVoiceChannelId || authorVoiceChannelId !== botVoiceChannelId) return;

  const userSettings = await getUserSettings(message.guildId, message.author.id);
  if (!userSettings.readEnabled) return;

  const text = await processDiscordMessage(message);
  if (!text) return;

  const status = createMessageStatusController(message);
  const result = await enqueueReading(message.guildId, {
    text,
    userId: message.author.id,
    voice: await resolveVoiceOverride(message.guildId,message.author.id,{}),
    source: 'message',
    sourceLabel: `#${message.channelId} / ${message.member?.displayName ?? message.author.username}`,
    messageId: message.id,
    channelId: message.channelId,
    onQueued: async () => status.set('waiting'),
    onStart: async () => status.set('playing'),
    onComplete: async () => status.set('none'),
    onCancel: async () => status.set('none'),
    onError: async (errorMessage) => {
      await status.set('failed');
      await notifyRealtimeError(message, errorMessage);
    }
  });

  if (!result.ok) {
    await status.set('rejected');
    console.warn(`Realtime message was not queued in guild ${message.guildId}: ${result.reason}`);
  }
}
