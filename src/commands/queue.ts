import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import {
  clearWaitingReadings,
  getQueueSnapshot,
  MAX_PER_USER,
  MAX_QUEUE_LENGTH
} from '../services/reading/reading-queue.js';
import type { Command } from '../types.js';

const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('読み上げQueueを確認・整理します');

data.addSubcommand((subcommand) =>
  subcommand.setName('show').setDescription('現在のQueue状況を表示します')
);

data.addSubcommand((subcommand) =>
  subcommand
    .setName('clear')
    .setDescription('待機中のQueueだけを削除します（現在再生中は継続）')
);

export const queueCommand: Command = {
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

    if (subcommand === 'clear') {
      const result = clearWaitingReadings(interaction.guildId);
      await interaction.reply({
        content: `待機Queueを ${result.removed} 件削除しました。${result.currentContinues ? '現在読み上げ中の1件は継続します。' : ''}`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const queue = getQueueSnapshot(interaction.guildId, interaction.user.id);
    const current = queue.current
      ? `現在: ${queue.current.sourceLabel ?? queue.current.source} — 「${queue.current.text.slice(0, 80)}${queue.current.text.length > 80 ? '…' : ''}」`
      : '現在: なし';

    await interaction.reply({
      content: [
        current,
        `待機中: ${queue.waiting.length}件`,
        `Queue合計: ${queue.total} / ${MAX_QUEUE_LENGTH}`,
        `あなたのQueue: ${queue.userTotal} / ${MAX_PER_USER}`
      ].join('\n'),
      flags: MessageFlags.Ephemeral
    });
  }
};
