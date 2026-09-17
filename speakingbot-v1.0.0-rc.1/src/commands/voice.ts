import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { buildVoicePanel } from '../services/settings/voice-panel.js';
import type { Command } from '../types.js';

export const voiceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('自分のVOICEVOX話者・スタイル・話速を設定します'),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({ content: 'このコマンドはDiscordサーバー内でのみ使用できます。', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const panel = await buildVoicePanel(interaction.guildId, interaction.user.id);
    await interaction.editReply(panel);
  }
};
