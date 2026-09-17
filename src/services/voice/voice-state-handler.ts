import { PermissionFlagsBits, type VoiceState } from 'discord.js';
import { getAccessMode } from '../access/access-service.js';
import { cancelAllReadings, enqueueReading } from '../reading/reading-queue.js';
import { getGuildSettings } from '../settings/guild-settings-service.js';
import { resolveVoiceOverride } from '../settings/voice-resolver.js';
import { disconnectFromGuild, getGuildVoiceConnection } from './connection-manager.js';

const autoLeaveTimers = new Map<string, NodeJS.Timeout>();

function clearAutoLeave(guildId:string){const t=autoLeaveTimers.get(guildId);if(t)clearTimeout(t);autoLeaveTimers.delete(guildId);}
async function isAllowedByAccess(state:VoiceState){const mode=await getAccessMode(state.guild.id);return mode==='open'||!!state.member?.permissions.has(PermissionFlagsBits.ManageGuild);}
async function enqueueNotice(state:VoiceState,text:string){
  const guildId=state.guild.id,userId=state.id;
  if(!getGuildVoiceConnection(guildId) || !(await isAllowedByAccess(state)))return;
  try{
    const voice=await resolveVoiceOverride(guildId,userId,{});
    await enqueueReading(guildId,{text,userId,voice,source:'command',sourceLabel:'VC入退室通知'});
  }catch(error){console.error('Failed to enqueue VC notice:',error);}
}

export async function evaluateAutoLeave(guildId:string,guild:any):Promise<void>{
  clearAutoLeave(guildId);
  const channel=guild.members.me?.voice.channel;
  if(!channel)return;
  const humans=channel.members.filter((m:any)=>!m.user.bot);
  if(humans.size>0)return;
  const settings=await getGuildSettings(guildId);
  if(settings.autoLeaveSeconds<=0)return;
  const timer=setTimeout(()=>{
    autoLeaveTimers.delete(guildId);
    const current=guild.members.me?.voice.channel;
    if(!current)return;
    const stillEmpty=current.members.filter((m:any)=>!m.user.bot).size===0;
    if(!stillEmpty)return;
    cancelAllReadings(guildId);
    disconnectFromGuild(guildId);
    console.log(`Auto-left empty VC in guild ${guildId}.`);
  },settings.autoLeaveSeconds*1000);
  timer.unref();autoLeaveTimers.set(guildId,timer);
}

export async function handleVoiceStateUpdate(oldState:VoiceState,newState:VoiceState):Promise<void>{
  const guild=newState.guild,guildId=guild.id,botId=guild.members.me?.id;
  if(!botId)return;
  if(newState.id===botId){
    if(!newState.channelId){clearAutoLeave(guildId);cancelAllReadings(guildId);}
    else await evaluateAutoLeave(guildId,guild);
    return;
  }
  const botChannelId=guild.members.me?.voice.channelId;
  if(!botChannelId)return;
  const settings=await getGuildSettings(guildId);
  if(settings.joinLeaveNotice){
    const name=(newState.member??oldState.member)?.displayName ?? 'ユーザー';
    if(oldState.channelId!==botChannelId && newState.channelId===botChannelId) await enqueueNotice(newState,`${name}さんが参加しました`);
    else if(oldState.channelId===botChannelId && newState.channelId!==botChannelId) await enqueueNotice(oldState,`${name}さんが退出しました`);
  }
  await evaluateAutoLeave(guildId,guild);
}
