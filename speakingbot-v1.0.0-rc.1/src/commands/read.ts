import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getUserSettings, setReadEnabled } from '../services/settings/user-settings-store.js';
import type { Command } from '../types.js';

const data = new SlashCommandBuilder()
  .setName('read')
  .setDescription('自分の通常投稿をリアルタイム読み上げするか設定します')
  .addSubcommand((subcommand) => subcommand.setName('on').setDescription('自分の通常投稿を読み上げ対象にします'))
  .addSubcommand((subcommand) => subcommand.setName('off').setDescription('自分の通常投稿を読み上げ対象外にします'))
  .addSubcommand((subcommand) => subcommand.setName('status').setDescription('現在の自分の読み上げ設定を確認します'));

export const readCommand: Command = {
  data,
  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'このコマンドはDiscordサーバー内でのみ使用できます。', flags: MessageFlags.Ephemeral });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'status') {
      const settings = await getUserSettings(interaction.guildId, interaction.user.id);
      await interaction.reply({
        content: settings.readEnabled
          ? 'あなたのリアルタイム読み上げは **ON** です。'
          : 'あなたのリアルタイム読み上げは **OFF** です。`/speak text` や音声プレビューは引き続き利用できます。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const enabled = subcommand === 'on';
    await setReadEnabled(interaction.guildId, interaction.user.id, enabled);
    await interaction.reply({
      content: enabled
        ? 'あなたのリアルタイム読み上げを **ON** にしました。'
        : 'あなたのリアルタイム読み上げを **OFF** にしました。`;` と違い、以後の通常投稿を継続して読み上げません。',
      flags: MessageFlags.Ephemeral
    });
  }
};
