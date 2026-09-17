import { MessageFlags, SlashCommandBuilder, type AutocompleteInteraction } from 'discord.js';
import { speakLinkedMessage, speakPlainText } from '../services/reading/on-demand-reader.js';
import { ALLOWED_SPEAKER_NAMES, MAX_SPEED_SCALE, MIN_SPEED_SCALE, getUserSettings } from '../services/settings/user-settings-store.js';
import { getSpeakers, getTalkStyles } from '../services/tts/voicevox-engine.js';
import type { Command } from '../types.js';

function addVoiceOptions(sub:any){
  return sub
    .addStringOption((o:any)=>o.setName('speaker').setDescription('この1回だけ話者を変更').setRequired(false).addChoices(...ALLOWED_SPEAKER_NAMES.map((name)=>({name,value:name}))))
    .addStringOption((o:any)=>o.setName('style').setDescription('この1回だけスタイルを変更').setRequired(false).setAutocomplete(true).setMaxLength(50))
    .addNumberOption((o:any)=>o.setName('speed').setDescription('この1回だけ話速を変更').setRequired(false).setMinValue(MIN_SPEED_SCALE).setMaxValue(MAX_SPEED_SCALE));
}
const data=new SlashCommandBuilder().setName('speak').setDescription('任意文章または既存Discordメッセージを手動で読み上げます');
data.addSubcommand((s)=>addVoiceOptions(s.setName('text').setDescription('コマンドに直接入力した文章を読み上げます').addStringOption((o)=>o.setName('text').setDescription('読み上げる文章').setRequired(true).setMaxLength(2000))));
data.addSubcommand((s)=>addVoiceOptions(s.setName('message').setDescription('Discordメッセージリンクの内容を読み上げます').addStringOption((o)=>o.setName('link').setDescription('Discordメッセージリンク').setRequired(true))));

async function autocomplete(interaction:AutocompleteInteraction){
  const focused=interaction.options.getFocused(true);if(focused.name!=='style'){await interaction.respond([]);return;}
  try{
    const speakers=(await getSpeakers()).filter((s)=>ALLOWED_SPEAKER_NAMES.includes(s.name as any));
    const selectedSpeaker=interaction.options.getString('speaker');
    let target=speakers;
    if(selectedSpeaker)target=speakers.filter((s)=>s.name===selectedSpeaker);
    else if(interaction.options.getSubcommand(false)==='text'&&interaction.guildId){const u=await getUserSettings(interaction.guildId,interaction.user.id);const base=speakers.find((s)=>s.name===u.voice.speakerName);if(base)target=[base];}
    const q=String(focused.value??'').toLowerCase();
    const names=[...new Set(target.flatMap((s)=>getTalkStyles(s).map((st)=>st.name)))].filter((name)=>name.toLowerCase().includes(q)).slice(0,25);
    await interaction.respond(names.map((name)=>({name,value:name})));
  }catch{await interaction.respond([]).catch(()=>undefined);}
}

export const speakCommand:Command={data,autocomplete,async execute(interaction){
  if(!interaction.inGuild()){await interaction.reply({content:'このコマンドはDiscordサーバー内でのみ使用できます。',flags:MessageFlags.Ephemeral});return;}
  await interaction.deferReply({flags:MessageFlags.Ephemeral});
  const override={speakerName:interaction.options.getString('speaker'),styleName:interaction.options.getString('style'),speedScale:interaction.options.getNumber('speed')};
  try{
    const sub=interaction.options.getSubcommand();
    const result=sub==='text'?await speakPlainText(interaction,interaction.options.getString('text',true),override):await speakLinkedMessage(interaction,interaction.options.getString('link',true),override);
    await interaction.editReply(`読み上げQueueへ追加しました（位置: ${result.position}）。\n音声: ${result.voice.speakerName} / ${result.voice.styleName} / ${result.voice.speedScale.toFixed(1)}x`);
  }catch(error){await interaction.editReply(error instanceof Error?error.message:String(error));}
}};
