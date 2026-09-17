import type { Message, PartialMessage } from 'discord.js';
import { processDiscordMessage } from '../text/text-processor.js';
import { hasWaitingMessage, removeWaitingMessage, updateWaitingMessage } from './reading-queue.js';

export async function handleRealtimeMessageUpdate(message:Message|PartialMessage):Promise<void>{
  if(!message.guildId || !hasWaitingMessage(message.guildId,message.id))return;
  let full:Message;
  try{full=message.partial?await message.fetch():message as Message;}catch{return;}
  if(!full.inGuild())return;
  const text=await processDiscordMessage(full);
  if(!text){removeWaitingMessage(full.guildId,full.id);return;}
  updateWaitingMessage(full.guildId,full.id,text);
}
export function handleRealtimeMessageDelete(message:Message|PartialMessage):void{
  if(!message.guildId)return;removeWaitingMessage(message.guildId,message.id);
}
