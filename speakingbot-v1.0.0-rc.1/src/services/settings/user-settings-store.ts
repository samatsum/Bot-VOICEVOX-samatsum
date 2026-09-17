import { db } from '../../db/client.js';
import { getGuildSettings } from './guild-settings-service.js';

export type VoiceSettings = { engine: 'voicevox'; speakerName: string; styleName: string; speedScale: number };
export type UserSettings = { voice: VoiceSettings; readEnabled: boolean };

export const ALLOWED_SPEAKER_NAMES = ['ずんだもん', '四国めたん'] as const;
export const DEFAULT_STYLE_NAME = 'ノーマル';
export const DEFAULT_SPEED_SCALE = 1.0;
export const MIN_SPEED_SCALE = 0.5;
export const MAX_SPEED_SCALE = 2.0;

function normalizeSpeed(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SPEED_SCALE;
  const clamped = Math.min(MAX_SPEED_SCALE, Math.max(MIN_SPEED_SCALE, value));
  return Math.round(clamped * 10) / 10;
}
function deterministicSpeaker(userId: string): string {
  try { return ALLOWED_SPEAKER_NAMES[Number(BigInt(userId) % BigInt(ALLOWED_SPEAKER_NAMES.length))] ?? ALLOWED_SPEAKER_NAMES[0]; }
  catch { let hash=0;for(const c of userId)hash=(hash*31+c.charCodeAt(0))>>>0;return ALLOWED_SPEAKER_NAMES[hash%ALLOWED_SPEAKER_NAMES.length]??ALLOWED_SPEAKER_NAMES[0]; }
}
async function defaults(guildId:string,userId:string):Promise<UserSettings>{
  const g=await getGuildSettings(guildId);
  const speaker=g.defaultSpeakerName==='auto'?deterministicSpeaker(userId):g.defaultSpeakerName;
  return {voice:{engine:'voicevox',speakerName:speaker,styleName:DEFAULT_STYLE_NAME,speedScale:normalizeSpeed(g.defaultSpeedScale)},readEnabled:true};
}
function rowToSettings(row:Record<string,unknown>,d:UserSettings):UserSettings{
  const speaker=String(row.speaker_name??d.voice.speakerName);
  return {voice:{engine:'voicevox',speakerName:ALLOWED_SPEAKER_NAMES.includes(speaker as any)?speaker:d.voice.speakerName,styleName:String(row.style_name??DEFAULT_STYLE_NAME),speedScale:normalizeSpeed(Number(row.speed_scale??d.voice.speedScale))},readEnabled:Number(row.read_enabled??1)!==0};
}
async function ensureUser(guildId:string,userId:string):Promise<void>{
  const d=await defaults(guildId,userId);
  await db.execute({sql:`INSERT OR IGNORE INTO user_settings(guild_id,user_id,speaker_name,style_name,speed_scale,read_enabled,updated_at) VALUES(?,?,?,?,?,?,?)`,args:[guildId,userId,d.voice.speakerName,d.voice.styleName,d.voice.speedScale,1,Date.now()]});
}
export async function getUserSettings(guildId:string,userId:string):Promise<UserSettings>{
  await ensureUser(guildId,userId);const d=await defaults(guildId,userId);
  const row=(await db.execute({sql:'SELECT * FROM user_settings WHERE guild_id = ? AND user_id = ?',args:[guildId,userId]})).rows[0];
  return rowToSettings(row as Record<string,unknown>,d);
}
async function update(guildId:string,userId:string,fields:{speakerName?:string;styleName?:string;speedScale?:number;readEnabled?:boolean}):Promise<UserSettings>{
  const current=await getUserSettings(guildId,userId);const next={speakerName:fields.speakerName??current.voice.speakerName,styleName:fields.styleName??current.voice.styleName,speedScale:normalizeSpeed(fields.speedScale??current.voice.speedScale),readEnabled:fields.readEnabled??current.readEnabled};
  await db.execute({sql:`UPDATE user_settings SET speaker_name=?, style_name=?, speed_scale=?, read_enabled=?, updated_at=? WHERE guild_id=? AND user_id=?`,args:[next.speakerName,next.styleName,next.speedScale,next.readEnabled?1:0,Date.now(),guildId,userId]});return await getUserSettings(guildId,userId);
}
export async function setVoiceSpeaker(guildId:string,userId:string,speakerName:string,styleName=DEFAULT_STYLE_NAME){if(!ALLOWED_SPEAKER_NAMES.includes(speakerName as any))throw new Error(`Speaker is not allowed: ${speakerName}`);return await update(guildId,userId,{speakerName,styleName});}
export async function setVoiceStyle(guildId:string,userId:string,styleName:string){return await update(guildId,userId,{styleName});}
export async function setVoiceSpeed(guildId:string,userId:string,speedScale:number){return await update(guildId,userId,{speedScale});}
export async function resetVoiceSettings(guildId:string,userId:string){const d=await defaults(guildId,userId);return await update(guildId,userId,{speakerName:d.voice.speakerName,styleName:d.voice.styleName,speedScale:d.voice.speedScale});}
export async function setReadEnabled(guildId:string,userId:string,enabled:boolean){return await update(guildId,userId,{readEnabled:enabled});}
