import { ChannelType, MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction, type Message, type MessageContextMenuCommandInteraction } from 'discord.js';
import { enqueueReading } from './reading-queue.js';
import { getGuildVoiceConnection } from '../voice/connection-manager.js';
import { processDiscordMessage, processPlainText } from '../text/text-processor.js';
import { resolveVoiceOverride } from '../settings/voice-resolver.js';

function parseMessageLink(link:string):{guildId:string;channelId:string;messageId:string}|null{
  const m=link.trim().match(/^https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)(?:\?.*)?$/i);
  return m?{guildId:m[1]!,channelId:m[2]!,messageId:m[3]!}:null;
}
async function ensureViewerCanRead(interaction: ChatInputCommandInteraction, channel: any):Promise<boolean>{
  if(!interaction.guild) return false;
  const member=await interaction.guild.members.fetch(interaction.user.id);
  if(!('permissionsFor' in channel)) return false;
  const perms=channel.permissionsFor(member);
  return !!perms?.has(PermissionFlagsBits.ViewChannel) && !!perms?.has(PermissionFlagsBits.ReadMessageHistory);
}
export async function fetchLinkedMessage(interaction:ChatInputCommandInteraction, link:string):Promise<Message<true>>{
  const parsed=parseMessageLink(link); if(!parsed) throw new Error('Discordのメッセージリンクを指定してください。');
  if(parsed.guildId!==interaction.guildId) throw new Error('このBotが対象としている同じDiscordサーバーのメッセージだけ読み上げられます。');
  const channel=await interaction.guild!.channels.fetch(parsed.channelId);
  if(!channel || !channel.isTextBased() || !('messages' in channel)) throw new Error('対象チャンネルを読み取れません。');
  if(!(await ensureViewerCanRead(interaction,channel))) throw new Error('あなたには元メッセージのチャンネルを閲覧する権限がありません。');
  try { return await channel.messages.fetch(parsed.messageId) as Message<true>; }
  catch { throw new Error('元メッセージを取得できません。Botの「メッセージ履歴を読む」権限も確認してください。'); }
}

type Override={speakerName?:string|null;styleName?:string|null;speedScale?:number|null};
async function enqueue(
  guildId:string, requesterId:string, text:string, voiceBaseUserId:string, override:Override, label:string,
  notifyError:(message:string)=>Promise<void>
){
  if(!getGuildVoiceConnection(guildId)) throw new Error('BotはVCに参加していません。先に `/join` を実行してください。');
  const voice=await resolveVoiceOverride(guildId,voiceBaseUserId,override);
  const result=await enqueueReading(guildId,{text,userId:requesterId,voice,source:'command',sourceLabel:label,onError:notifyError});
  if(!result.ok) throw new Error(result.reason==='queue-full'?'読み上げQueueが上限（50件）に達しています。':'あなたの読み上げQueueが上限（10件）に達しています。');
  return {position:result.position,voice};
}

export async function speakPlainText(interaction:ChatInputCommandInteraction, input:string, override:Override){
  if(!interaction.guildId) throw new Error('このコマンドはDiscordサーバー内でのみ使用できます。');
  const text=await processPlainText(interaction.guildId,input); if(!text) throw new Error('読み上げられる文章がありません。');
  return await enqueue(interaction.guildId,interaction.user.id,text,interaction.user.id,override,`/speak text / ${interaction.user.globalName??interaction.user.username}`,async(message)=>{await interaction.followUp({content:`⚠️ ${message}`,flags:MessageFlags.Ephemeral}).catch(()=>undefined);});
}
export async function speakLinkedMessage(interaction:ChatInputCommandInteraction, link:string, override:Override){
  const message=await fetchLinkedMessage(interaction,link);
  const text=await processDiscordMessage(message,{respectSkipPrefix:false}); if(!text) throw new Error('読み上げられる内容がありません。');
  return await enqueue(interaction.guildId!,interaction.user.id,text,message.author.id,override,`/speak message / ${message.author.username}`,async(error)=>{await interaction.followUp({content:`⚠️ ${error}`,flags:MessageFlags.Ephemeral}).catch(()=>undefined);});
}
export async function speakContextMessage(interaction:MessageContextMenuCommandInteraction){
  if(!interaction.inCachedGuild()) throw new Error('この操作はDiscordサーバー内でのみ使用できます。');
  if(!getGuildVoiceConnection(interaction.guildId)) throw new Error('BotはVCに参加していません。先に `/join` を実行してください。');
  const message=interaction.targetMessage as Message<true>;
  const channel=message.channel;
  if(!('permissionsFor' in channel)) throw new Error('対象チャンネルの権限を確認できません。');
  const member=await interaction.guild.members.fetch(interaction.user.id);
  const perms=channel.permissionsFor(member);
  if(!perms?.has(PermissionFlagsBits.ViewChannel) || !perms.has(PermissionFlagsBits.ReadMessageHistory)) throw new Error('あなたにはこのメッセージを閲覧する権限がありません。');
  const text=await processDiscordMessage(message,{respectSkipPrefix:false}); if(!text) throw new Error('読み上げられる内容がありません。');
  const voice=await resolveVoiceOverride(interaction.guildId,message.author.id,{});
  const result=await enqueueReading(interaction.guildId,{text,userId:interaction.user.id,voice,source:'command',sourceLabel:`右クリック / ${message.author.username}`,onError:async(error)=>{await interaction.followUp({content:`⚠️ ${error}`,flags:MessageFlags.Ephemeral}).catch(()=>undefined);}});
  if(!result.ok) throw new Error(result.reason==='queue-full'?'読み上げQueueが上限（50件）に達しています。':'あなたの読み上げQueueが上限（10件）に達しています。');
  return {position:result.position,voice};
}
