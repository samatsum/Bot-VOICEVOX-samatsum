import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { skipCurrentReading } from '../services/reading/reading-queue.js';
import type { Command } from '../types.js';

export const skipCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('現在読み上げている1件だけをスキップします'),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'このコマンドはDiscordサーバー内でのみ使用できます。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const result = skipCurrentReading(interaction.guildId);

    await interaction.reply({
      content: result.skipped
        ? `現在の読み上げをスキップしました。待機中: ${result.remaining}件`
        : '現在読み上げ中の項目はありません。',
      flags: MessageFlags.Ephemeral
    });
  }
};
