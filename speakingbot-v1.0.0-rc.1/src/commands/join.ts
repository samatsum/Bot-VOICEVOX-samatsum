import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { cancelAllReadings } from '../services/reading/reading-queue.js';
import { connectToVoiceChannel } from '../services/voice/connection-manager.js';
import type { Command } from '../types.js';

export const joinCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('あなたが参加しているボイスチャンネルへBotを参加させます'),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: 'このコマンドはDiscordサーバー内でのみ使用できます。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: '先に通常のボイスチャンネルへ参加してから `/join` を実行してください。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (voiceChannel.type !== ChannelType.GuildVoice) {
      await interaction.reply({
        content: '現在は通常のボイスチャンネルのみ対応しています。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const botMember = interaction.guild.members.me;
    const permissions = botMember ? voiceChannel.permissionsFor(botMember) : null;

    if (
      !permissions?.has(PermissionFlagsBits.ViewChannel) ||
      !permissions.has(PermissionFlagsBits.Connect) ||
      !permissions.has(PermissionFlagsBits.Speak)
    ) {
      await interaction.reply({
        content: 'このVCへ参加する権限が不足しています。Botに「チャンネルを表示」「接続」「発言」を許可してください。',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.guild.members.me?.voice.channelId === voiceChannel.id) {
      await interaction.reply({
        content: `すでに **${voiceChannel.name}** に参加しています。`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // 別VCへ移動する場合、旧VC向けの読み上げQueueは破棄する。
    cancelAllReadings(interaction.guildId);

    try {
      await connectToVoiceChannel(voiceChannel);
      await interaction.editReply(`**${voiceChannel.name}** に参加しました。`);
    } catch (error) {
      console.error('Failed to join voice channel:', error);
      await interaction.editReply('ボイスチャンネルへの接続に失敗しました。権限とネットワーク状態を確認してください。');
    }
  }
};
