import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { cancelAllReadings } from '../services/reading/reading-queue.js';
import { disconnectFromGuild } from '../services/voice/connection-manager.js';
import type { Command } from '../types.js';

export const leaveCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Botをボイスチャンネルから退出させます'),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'このコマンドはDiscordサーバー内でのみ使用できます。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // 仕様: /leave は現在再生中と待機Queueも破棄する。
    cancelAllReadings(interaction.guildId);
    const disconnected = disconnectFromGuild(interaction.guildId);

    if (!disconnected) {
      await interaction.reply({
        content: 'Botは現在ボイスチャンネルに参加していません。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.reply({
      content: '読み上げを停止し、ボイスチャンネルから退出しました。',
      flags: MessageFlags.Ephemeral
    });
  }
};
