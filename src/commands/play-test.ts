import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getGuildVoiceConnection } from '../services/voice/connection-manager.js';
import { playTestAudio } from '../services/voice/playback-manager.js';
import type { Command } from '../types.js';

export const playTestCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('play-test')
    .setDescription('現在Botが参加しているDiscord VCで音声再生を確認します'),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'このコマンドはDiscordサーバー内でのみ使用できます。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const connection = getGuildVoiceConnection(interaction.guildId);

    if (!connection) {
      await interaction.reply({
        content: 'BotはVCに参加していません。先に `/join` を実行してください。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await playTestAudio(interaction.guildId, connection);
      await interaction.editReply('テスト音を再生しました。');
    } catch (error) {
      console.error('Failed to play test audio:', error);
      await interaction.editReply('テスト音の再生に失敗しました。PowerShellのログを確認してください。');
    }
  }
};
