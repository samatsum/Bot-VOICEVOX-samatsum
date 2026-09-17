import type { VoiceSettings } from './user-settings-store.js';
import { ALLOWED_SPEAKER_NAMES, getUserSettings, MAX_SPEED_SCALE, MIN_SPEED_SCALE } from './user-settings-store.js';
import { getSpeakers, getTalkStyles } from '../tts/voicevox-engine.js';

export async function resolveVoiceOverride(
  guildId:string,baseUserId:string,override:{speakerName?:string|null;styleName?:string|null;speedScale?:number|null}
):Promise<VoiceSettings>{
  const base=(await getUserSettings(guildId,baseUserId)).voice;
  const speakers=await getSpeakers();
  const available=speakers.filter((s)=>ALLOWED_SPEAKER_NAMES.includes(s.name as any));
  if(!available.length)throw new Error('VOICEVOXに利用可能な話者（ずんだもん / 四国めたん）が見つかりません。');
  const explicitSpeaker=override.speakerName?.trim();
  if(explicitSpeaker && !ALLOWED_SPEAKER_NAMES.includes(explicitSpeaker as any))throw new Error('指定された話者は現在利用できません。');
  let speaker=explicitSpeaker?available.find((s)=>s.name===explicitSpeaker):available.find((s)=>s.name===base.speakerName);
  if(explicitSpeaker && !speaker)throw new Error(`このPCのVOICEVOXに「${explicitSpeaker}」が見つかりません。`);
  speaker??=available[0]!;
  const styles=getTalkStyles(speaker);
  if(!styles.length)throw new Error(`「${speaker.name}」に読み上げ用スタイルがありません。`);
  const explicitStyle=override.styleName?.trim();
  let styleName:string;
  if(explicitStyle){
    if(!styles.some((s)=>s.name===explicitStyle))throw new Error(`「${speaker.name}」で利用できるスタイル: ${styles.map((s)=>s.name).join(' / ')}`);
    styleName=explicitStyle;
  }else if(speaker.name===base.speakerName && styles.some((s)=>s.name===base.styleName))styleName=base.styleName;
  else styleName=styles.find((s)=>s.name==='ノーマル')?.name??styles[0]!.name;
  let speedScale=override.speedScale??base.speedScale;
  if(!Number.isFinite(speedScale)||speedScale<MIN_SPEED_SCALE||speedScale>MAX_SPEED_SCALE)throw new Error(`話速は ${MIN_SPEED_SCALE.toFixed(1)}〜${MAX_SPEED_SCALE.toFixed(1)} の範囲で指定してください。`);
  speedScale=Math.round(speedScale*10)/10;
  return {engine:'voicevox',speakerName:speaker.name,styleName,speedScale};
}
