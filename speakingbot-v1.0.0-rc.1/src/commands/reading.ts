import {
  ChannelType,
  MessageFlags,
  SlashCommandBuilder
} from 'discord.js';
import {
  addReadingChannel,
  getReadingChannels,
  removeReadingChannel
} from '../services/reading/reading-channel-store.js';
import type { Command } from '../types.js';

const data = new SlashCommandBuilder()
  .setName('reading')
  .setDescription('リアルタイム読み上げ対象のテキストチャンネルを設定します');

data.addSubcommand((subcommand) =>
  subcommand
    .setName('add')
    .setDescription('読み上げ対象チャンネルを追加します')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('追加するテキストチャンネル')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
);

data.addSubcommand((subcommand) =>
  subcommand
    .setName('remove')
    .setDescription('読み上げ対象チャンネルを削除します')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('削除するテキストチャンネル')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
);

data.addSubcommand((subcommand) =>
  subcommand.setName('list').setDescription('読み上げ対象チャンネルを一覧表示します')
);

export const readingCommand: Command = {
  data,

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'このコマンドはDiscordサーバー内でのみ使用できます。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const channel = interaction.options.getChannel('channel', true);
      const added = await addReadingChannel(interaction.guildId, channel.id);

      await interaction.reply({
        content: added
          ? `<#${channel.id}> をリアルタイム読み上げ対象に追加しました。`
          : `<#${channel.id}> はすでに読み上げ対象です。`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'remove') {
      const channel = interaction.options.getChannel('channel', true);
      const removed = await removeReadingChannel(interaction.guildId, channel.id);

      await interaction.reply({
        content: removed
          ? `<#${channel.id}> をリアルタイム読み上げ対象から削除しました。`
          : `<#${channel.id}> は読み上げ対象に登録されていません。`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const channelIds = await getReadingChannels(interaction.guildId);
    const content =
      channelIds.length > 0
        ? `現在のリアルタイム読み上げ対象:\n${channelIds.map((id) => `- <#${id}>`).join('\n')}`
        : 'リアルタイム読み上げ対象チャンネルはまだ登録されていません。';

    await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral
    });
  }
};
