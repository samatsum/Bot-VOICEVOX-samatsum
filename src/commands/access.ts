import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import {
  getAccessMode,
  hasServerManagePermission,
  setAccessMode,
  type AccessMode
} from '../services/access/access-service.js';
import type { Command } from '../types.js';

const data = new SlashCommandBuilder()
  .setName('access')
  .setDescription('SpeakingBotを利用できるユーザー範囲を設定します')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('mode')
      .setDescription('Botのアクセスモードを変更します')
      .addStringOption((option) =>
        option
          .setName('value')
          .setDescription('open: 全員利用可 / admin: サーバー管理者のみ')
          .setRequired(true)
          .addChoices(
            { name: 'open — 全員が利用可能', value: 'open' },
            { name: 'admin — サーバー管理者のみ', value: 'admin' }
          )
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('status')
      .setDescription('現在のアクセスモードを確認します')
  );

export const accessCommand: Command = {
  data,

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'このコマンドはDiscordサーバー内でのみ使用できます。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Discord側のdefault_member_permissionsだけに依存せず、Bot側でも必ず検証する。
    if (!hasServerManagePermission(interaction.memberPermissions)) {
      await interaction.reply({
        content: '`/access` は「サーバー管理」権限を持つユーザーだけが使用できます。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'status') {
      const mode = await getAccessMode(interaction.guildId);
      await interaction.reply({
        content:
          mode === 'open'
            ? '現在のアクセスモードは **open** です。サーバー内の全ユーザーがSpeakingBotを利用できます。'
            : '現在のアクセスモードは **admin** です。「サーバー管理」権限を持つユーザーだけがSpeakingBotを利用できます。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const mode = interaction.options.getString('value', true) as AccessMode;
    await setAccessMode(interaction.guildId, mode);

    await interaction.reply({
      content:
        mode === 'open'
          ? 'アクセスモードを **open** に変更しました。これ以降、サーバー内の全ユーザーがSpeakingBotを利用できます。'
          : 'アクセスモードを **admin** に変更しました。これ以降、「サーバー管理」権限を持つユーザーだけがSpeakingBotを利用できます。',
      flags: MessageFlags.Ephemeral
    });
  }
};
