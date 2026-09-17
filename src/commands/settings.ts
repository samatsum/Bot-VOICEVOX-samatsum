import { ChannelType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types.js';
import {
  getGuildSettings, MAX_AUTO_LEAVE_SECONDS, MAX_MAX_TEXT_LENGTH, MIN_AUTO_LEAVE_SECONDS,
  MIN_MAX_TEXT_LENGTH, setAttachmentNotice, setAutoLeaveSeconds, setDefaultSpeakerName,
  setDefaultSpeedScale, setEmojiReading, setJoinLeaveNotice, setMaxTextLength
} from '../services/settings/guild-settings-service.js';
import { getDictionaryChannelId, setDictionaryChannelId } from '../services/dictionary/dictionary-service.js';

const data = new SlashCommandBuilder().setName('settings').setDescription('Bot-VOICEVOX-samatsumのサーバー共通設定を確認・変更します');
data.addSubcommand((s)=>s.setName('show').setDescription('現在のサーバー設定を表示します'));
data.addSubcommand((s)=>s.setName('max-length').setDescription('1件の最大読み上げ文字数を設定します').addIntegerOption((o)=>o.setName('value').setDescription(`${MIN_MAX_TEXT_LENGTH}〜${MAX_MAX_TEXT_LENGTH}`).setRequired(true).setMinValue(MIN_MAX_TEXT_LENGTH).setMaxValue(MAX_MAX_TEXT_LENGTH)));
data.addSubcommand((s)=>s.setName('join-leave-notice').setDescription('VC入退室通知を設定します').addBooleanOption((o)=>o.setName('enabled').setDescription('ON/OFF').setRequired(true)));
data.addSubcommand((s)=>s.setName('attachment-notice').setDescription('画像・ファイル等の投稿通知を設定します').addBooleanOption((o)=>o.setName('enabled').setDescription('ON/OFF').setRequired(true)));
data.addSubcommand((s)=>s.setName('emoji-reading').setDescription('絵文字の読み上げを設定します').addBooleanOption((o)=>o.setName('enabled').setDescription('ON/OFF').setRequired(true)));
data.addSubcommand((s)=>s.setName('auto-leave').setDescription('VC無人時の自動退出秒数を設定します（0で無効）').addIntegerOption((o)=>o.setName('seconds').setDescription(`0〜${MAX_AUTO_LEAVE_SECONDS}秒`).setRequired(true).setMinValue(MIN_AUTO_LEAVE_SECONDS).setMaxValue(MAX_AUTO_LEAVE_SECONDS)));
data.addSubcommand((s)=>s.setName('dictionary-channel').setDescription('辞書専用チャンネルを設定します').addChannelOption((o)=>o.setName('channel').setDescription('辞書専用チャンネル').addChannelTypes(ChannelType.GuildText,ChannelType.GuildAnnouncement).setRequired(true)));
data.addSubcommand((s)=>s.setName('default-speaker').setDescription('未設定ユーザーの初期話者を設定します').addStringOption((o)=>o.setName('speaker').setDescription('autoはユーザーごとに自動割当').setRequired(true).addChoices({name:'自動割当',value:'auto'},{name:'ずんだもん',value:'ずんだもん'},{name:'四国めたん',value:'四国めたん'})));
data.addSubcommand((s)=>s.setName('default-speed').setDescription('未設定ユーザーの初期話速を設定します').addNumberOption((o)=>o.setName('speed').setDescription('0.5〜2.0').setRequired(true).setMinValue(0.5).setMaxValue(2.0)));

function onOff(v:boolean){return v?'ON':'OFF';}
async function show(interaction:any){
  const s=await getGuildSettings(interaction.guildId);
  const dict=await getDictionaryChannelId(interaction.guildId);
  await interaction.reply({content:[
    '**Bot-VOICEVOX-samatsum サーバー設定**',
    `最大読み上げ文字数: **${s.maxTextLength}**`,
    `VC入退室通知: **${onOff(s.joinLeaveNotice)}**`,
    `添付ファイル通知: **${onOff(s.attachmentNotice)}**`,
    `絵文字読み上げ: **${onOff(s.emojiReading)}**`,
    `無人VC自動退出: **${s.autoLeaveSeconds===0?'OFF':`${s.autoLeaveSeconds}秒`}**`,
    `辞書チャンネル: ${dict?`<#${dict}>`:'未設定'}`,
    `未設定ユーザーの初期話者: **${s.defaultSpeakerName==='auto'?'自動割当':s.defaultSpeakerName}**`,
    `未設定ユーザーの初期話速: **${s.defaultSpeedScale.toFixed(1)}x**`,
    '利用可能話者Allowlist: **ずんだもん / 四国めたん**'
  ].join('\n'),flags:MessageFlags.Ephemeral});
}

export const settingsCommand:Command={data,async execute(interaction){
  if(!interaction.inGuild()){await interaction.reply({content:'このコマンドはDiscordサーバー内でのみ使用できます。',flags:MessageFlags.Ephemeral});return;}
  const sub=interaction.options.getSubcommand();
  if(sub==='show'){await show(interaction);return;}
  if(sub==='max-length') await setMaxTextLength(interaction.guildId,interaction.options.getInteger('value',true));
  else if(sub==='join-leave-notice') await setJoinLeaveNotice(interaction.guildId,interaction.options.getBoolean('enabled',true));
  else if(sub==='attachment-notice') await setAttachmentNotice(interaction.guildId,interaction.options.getBoolean('enabled',true));
  else if(sub==='emoji-reading') await setEmojiReading(interaction.guildId,interaction.options.getBoolean('enabled',true));
  else if(sub==='auto-leave') await setAutoLeaveSeconds(interaction.guildId,interaction.options.getInteger('seconds',true));
  else if(sub==='dictionary-channel'){const c=interaction.options.getChannel('channel',true);await setDictionaryChannelId(interaction.guildId,c.id);}
  else if(sub==='default-speaker') await setDefaultSpeakerName(interaction.guildId,interaction.options.getString('speaker',true) as 'auto'|'ずんだもん'|'四国めたん');
  else if(sub==='default-speed') await setDefaultSpeedScale(interaction.guildId,interaction.options.getNumber('speed',true));
  await show(interaction);
}};
