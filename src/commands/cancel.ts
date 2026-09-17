import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { cancelAllReadings } from '../services/reading/reading-queue.js';
import type { Command } from '../types.js';
export const cancelCommand: Command = { data:new SlashCommandBuilder().setName('cancel').setDescription('現在の読み上げを停止し、待機Queueもすべて削除します'), async execute(interaction){
  if(!interaction.inGuild()){await interaction.reply({content:'このコマンドはDiscordサーバー内でのみ使用できます。',flags:MessageFlags.Ephemeral});return;}
  const r=cancelAllReadings(interaction.guildId);
  await interaction.reply({content:`読み上げをキャンセルしました。現在再生: ${r.stoppedCurrent?'停止':'なし'} / 待機Queue: ${r.removedWaiting}件削除`,flags:MessageFlags.Ephemeral});
}};
