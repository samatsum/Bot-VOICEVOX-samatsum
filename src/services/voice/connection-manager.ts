import { entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus, type VoiceConnection } from '@discordjs/voice';
import type { VoiceChannel } from 'discord.js';
import { stopGuildAudio } from './playback-manager.js';

const CONNECT_TIMEOUT_MS = 30_000;
function monitorConnection(connection:VoiceConnection,guildId:string){
  connection.on(VoiceConnectionStatus.Disconnected,async()=>{
    try{
      await Promise.race([
        entersState(connection,VoiceConnectionStatus.Signalling,5_000),
        entersState(connection,VoiceConnectionStatus.Connecting,5_000)
      ]);
      console.log(`Voice connection in guild ${guildId} is reconnecting.`);
    }catch{
      console.warn(`Voice connection in guild ${guildId} could not recover and was destroyed.`);
      stopGuildAudio(guildId);connection.destroy();
    }
  });
}
export async function connectToVoiceChannel(channel:VoiceChannel):Promise<VoiceConnection>{
  const existing=getVoiceConnection(channel.guild.id);if(existing){stopGuildAudio(channel.guild.id);existing.destroy();}
  const connection=joinVoiceChannel({channelId:channel.id,guildId:channel.guild.id,adapterCreator:channel.guild.voiceAdapterCreator,selfDeaf:true,selfMute:false});
  monitorConnection(connection,channel.guild.id);
  try{await entersState(connection,VoiceConnectionStatus.Ready,CONNECT_TIMEOUT_MS);return connection;}catch(error){connection.destroy();throw error;}
}
export function getGuildVoiceConnection(guildId:string){return getVoiceConnection(guildId);}
export function disconnectFromGuild(guildId:string):boolean{const connection=getVoiceConnection(guildId);if(!connection)return false;stopGuildAudio(guildId);connection.destroy();return true;}
