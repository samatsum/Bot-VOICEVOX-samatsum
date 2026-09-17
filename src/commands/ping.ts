import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types.js';

export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botが応答できるか確認します'),

  async execute(interaction) {
    await interaction.reply('Pong!');
  }
};
