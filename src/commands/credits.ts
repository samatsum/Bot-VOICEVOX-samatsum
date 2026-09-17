import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const creditsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('credits')
    .setDescription('SpeakingBotが使用している音声合成ソフト等のクレジットを表示します'),

  async execute(interaction) {
    await interaction.reply({
      content: [
        '**SpeakingBot Credits**',
        '- 音声合成: VOICEVOX',
        '- 初版Allowlist: VOICEVOX:ずんだもん / VOICEVOX:四国めたん',
        '',
        '`/credits` はアクセスモードに関係なく利用できます。'
      ].join('\n'),
      flags: MessageFlags.Ephemeral
    });
  }
};
