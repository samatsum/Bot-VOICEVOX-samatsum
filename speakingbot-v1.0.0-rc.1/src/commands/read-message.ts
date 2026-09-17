import { ApplicationCommandType, ContextMenuCommandBuilder, MessageFlags } from 'discord.js';
import type { MessageCommand } from '../types.js';
import { speakContextMessage } from '../services/reading/on-demand-reader.js';

export const readMessageCommand:MessageCommand={
  data:new ContextMenuCommandBuilder().setName('読み上げる').setType(ApplicationCommandType.Message),
  async execute(interaction){
    await interaction.deferReply({flags:MessageFlags.Ephemeral});
    try{
      const result=await speakContextMessage(interaction);
      await interaction.editReply(`読み上げQueueへ追加しました（位置: ${result.position}）。\n音声: ${result.voice.speakerName} / ${result.voice.styleName} / ${result.voice.speedScale.toFixed(1)}x`);
    }catch(error){await interaction.editReply(error instanceof Error?error.message:String(error));}
  }
};
