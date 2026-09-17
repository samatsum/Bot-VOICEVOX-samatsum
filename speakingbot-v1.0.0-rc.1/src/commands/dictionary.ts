import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ButtonInteraction
} from 'discord.js';
import type { Command } from '../types.js';
import {
  addDictionaryEntry,
  editDictionaryEntry,
  exportDictionary,
  getDictionaryChannelId,
  getDictionaryEntry,
  getDictionaryHistory,
  importDictionary,
  listDictionaryEntries,
  removeDictionaryEntry,
  restoreDictionaryHistoryById,
  searchDictionaryEntries,
  searchDictionaryWordCandidates,
  setDictionaryChannelId
} from '../services/dictionary/dictionary-service.js';
import { processPlainText } from '../services/text/text-processor.js';

const RESTORE_BUTTON_PREFIX='dictionary:history:restore:';

const data=new SlashCommandBuilder().setName('dictionary').setDescription('サーバー共通の読み上げ辞書を管理します');
data.addSubcommand((s)=>s.setName('channel').setDescription('辞書専用チャンネルを表示・設定します').addChannelOption((o)=>o.setName('channel').setDescription('辞書専用チャンネル').addChannelTypes(ChannelType.GuildText,ChannelType.GuildAnnouncement).setRequired(false)));
data.addSubcommand((s)=>s.setName('add').setDescription('単語と読みを追加します').addStringOption((o)=>o.setName('word').setDescription('単語').setRequired(true).setMaxLength(100)).addStringOption((o)=>o.setName('reading').setDescription('読み').setRequired(true).setMaxLength(200)));
data.addSubcommand((s)=>s.setName('edit').setDescription('登録済み単語の読みを変更します').addStringOption((o)=>o.setName('word').setDescription('登録済み単語を選択').setRequired(true).setAutocomplete(true).setMaxLength(100)).addStringOption((o)=>o.setName('reading').setDescription('新しい読み').setRequired(true).setMaxLength(200)));
data.addSubcommand((s)=>s.setName('remove').setDescription('単語を論理削除します').addStringOption((o)=>o.setName('word').setDescription('登録済み単語を選択').setRequired(true).setAutocomplete(true).setMaxLength(100)));
data.addSubcommand((s)=>s.setName('list').setDescription('辞書一覧を表示します'));
data.addSubcommand((s)=>s.setName('search').setDescription('辞書を部分検索します').addStringOption((o)=>o.setName('query').setDescription('検索語').setRequired(true)));
data.addSubcommand((s)=>s.setName('history').setDescription('単語の変更履歴を表示し、過去状態へ戻せます').addStringOption((o)=>o.setName('word').setDescription('登録済み・削除済み単語を選択').setRequired(true).setAutocomplete(true).setMaxLength(100)));
data.addSubcommand((s)=>s.setName('test').setDescription('辞書を含むText Processorの変換結果を確認します').addStringOption((o)=>o.setName('text').setDescription('テスト文章').setRequired(true).setMaxLength(2000)));
data.addSubcommand((s)=>s.setName('export').setDescription('現在の辞書をJSONで出力します'));
data.addSubcommand((s)=>s.setName('import').setDescription('export形式のJSON辞書を取り込みます').addAttachmentOption((o)=>o.setName('file').setDescription('dictionary.json').setRequired(true)));

async function actor(interaction:any){
  let displayName=interaction.user.globalName??interaction.user.username;
  try{displayName=(await interaction.guild.members.fetch(interaction.user.id)).displayName;}catch{}
  return {userId:interaction.user.id,displayName};
}
function fmtTime(ms:number){return new Date(ms).toLocaleString('ja-JP');}
function fit(text:string,max=1900){return text.length<=max?text:`${text.slice(0,max)}\n…（省略）`;}
function truncate(text:string,max=100){return text.length<=max?text:`${text.slice(0,Math.max(1,max-1))}…`;}
async function isDictionaryChannel(guildId:string, channelId:string|null|undefined):Promise<boolean>{
  const configured=await getDictionaryChannelId(guildId);
  return !!configured && configured===channelId;
}
async function requireDictionaryChannel(interaction:any):Promise<boolean>{
  const channelId=await getDictionaryChannelId(interaction.guildId);
  if(!channelId){await interaction.reply({content:'辞書専用チャンネルが未設定です。まず `/dictionary channel channel:#チャンネル` を実行してください。',flags:MessageFlags.Ephemeral});return false;}
  if(interaction.channelId!==channelId){await interaction.reply({content:`辞書操作は <#${channelId}> で実行してください。`,flags:MessageFlags.Ephemeral});return false;}
  return true;
}

async function buildHistoryPanel(guildId:string,word:string,notice?:string){
  const [history,current]=await Promise.all([getDictionaryHistory(guildId,word,20),getDictionaryEntry(guildId,word)]);
  if(!history.length)return {content:notice?`${notice}\n\n履歴がありません。`:'履歴がありません。',components:[] as ActionRowBuilder<ButtonBuilder>[]};
  const currentLabel=current?(current.isDeleted?'削除済み':current.reading):'項目なし';
  const lines=history.map((h)=>`#${h.id} ${h.action} / ${fmtTime(h.createdAt)} / ${h.actorDisplayName} / 状態: ${h.snapshotDeleted?'削除済み':h.snapshotReading}`);
  const rows:ActionRowBuilder<ButtonBuilder>[]=[];
  for(let i=0;i<history.length;i+=5){
    const row=new ActionRowBuilder<ButtonBuilder>();
    for(const h of history.slice(i,i+5)){
      const same=!!current && current.reading===h.snapshotReading && current.isDeleted===h.snapshotDeleted;
      row.addComponents(new ButtonBuilder()
        .setCustomId(`${RESTORE_BUTTON_PREFIX}${h.id}`)
        .setLabel(same?`#${h.id}（現在）`:`#${h.id} に戻す`)
        .setStyle(h.snapshotDeleted?ButtonStyle.Secondary:ButtonStyle.Primary)
        .setDisabled(same));
    }
    rows.push(row);
  }
  const body=`**${word}** の履歴\n現在: **${currentLabel}**\n\n${lines.join('\n')}\n\n下のボタンで、その履歴時点の状態へ戻せます。復元操作も新しい履歴として記録されます。`;
  return {content:fit(notice?`${notice}\n\n${body}`:body),components:rows};
}

async function autocomplete(interaction:AutocompleteInteraction){
  if(!interaction.inGuild()){await interaction.respond([]);return;}
  const sub=interaction.options.getSubcommand(false);
  const focused=interaction.options.getFocused(true);
  if(focused.name!=='word'||!sub||!['edit','remove','history'].includes(sub)){await interaction.respond([]);return;}
  if(!(await isDictionaryChannel(interaction.guildId,interaction.channelId))){await interaction.respond([]);return;}
  try{
    const includeDeleted=sub==='history';
    const entries=await searchDictionaryWordCandidates(interaction.guildId,String(focused.value??''),{includeDeleted,limit:25});
    await interaction.respond(entries.map((e)=>({
      name:truncate(`${e.isDeleted?'[削除済み] ':''}${e.word} → ${e.reading}`),
      value:e.word
    })));
  }catch{await interaction.respond([]).catch(()=>undefined);}
}

export function isDictionaryComponentCustomId(customId:string):boolean{return customId.startsWith(RESTORE_BUTTON_PREFIX);}
export async function handleDictionaryButton(interaction:ButtonInteraction):Promise<void>{
  if(!interaction.inGuild()){await interaction.reply({content:'この操作はDiscordサーバー内でのみ使用できます。',flags:MessageFlags.Ephemeral});return;}
  if(!(await isDictionaryChannel(interaction.guildId,interaction.channelId))){
    const channelId=await getDictionaryChannelId(interaction.guildId);
    await interaction.reply({content:channelId?`辞書操作は <#${channelId}> で実行してください。`:'辞書専用チャンネルが未設定です。',flags:MessageFlags.Ephemeral});return;
  }
  const historyId=Number(interaction.customId.slice(RESTORE_BUTTON_PREFIX.length));
  if(!Number.isInteger(historyId)||historyId<1){await interaction.reply({content:'履歴IDを読み取れませんでした。',flags:MessageFlags.Ephemeral});return;}
  await interaction.deferUpdate();
  try{
    const restored=await restoreDictionaryHistoryById(interaction.guildId,historyId,await actor(interaction));
    const state=restored.isDeleted?'削除済み':restored.reading;
    const panel=await buildHistoryPanel(interaction.guildId,restored.word,`履歴 **#${historyId}** の状態（**${state}**）へ戻しました。`);
    await interaction.editReply(panel);
  }catch(error){
    await interaction.followUp({content:error instanceof Error?error.message:String(error),flags:MessageFlags.Ephemeral}).catch(()=>undefined);
  }
}

export const dictionaryCommand:Command={data,autocomplete,async execute(interaction){
  if(!interaction.inGuild()){await interaction.reply({content:'このコマンドはDiscordサーバー内でのみ使用できます。',flags:MessageFlags.Ephemeral});return;}
  const sub=interaction.options.getSubcommand();
  if(sub==='channel'){
    const c=interaction.options.getChannel('channel');
    if(c){await setDictionaryChannelId(interaction.guildId,c.id);await interaction.reply({content:`辞書専用チャンネルを <#${c.id}> に設定しました。`,flags:MessageFlags.Ephemeral});}
    else{const id=await getDictionaryChannelId(interaction.guildId);await interaction.reply({content:id?`現在の辞書専用チャンネル: <#${id}>`:'辞書専用チャンネルは未設定です。',flags:MessageFlags.Ephemeral});}
    return;
  }
  if(!(await requireDictionaryChannel(interaction))) return;
  try{
    const a=await actor(interaction);
    if(sub==='add'){const e=await addDictionaryEntry(interaction.guildId,interaction.options.getString('word',true),interaction.options.getString('reading',true),a);await interaction.reply({content:`登録しました: **${e.word}** → **${e.reading}**\n最終編集: ${e.updatedByDisplayName}`,flags:MessageFlags.Ephemeral});return;}
    if(sub==='edit'){const e=await editDictionaryEntry(interaction.guildId,interaction.options.getString('word',true),interaction.options.getString('reading',true),a);await interaction.reply({content:`更新しました: **${e.word}** → **${e.reading}**\n最終編集: ${e.updatedByDisplayName}`,flags:MessageFlags.Ephemeral});return;}
    if(sub==='remove'){const word=interaction.options.getString('word',true);await removeDictionaryEntry(interaction.guildId,word,a);await interaction.reply({content:`**${word}** を辞書から削除しました。必要なら \`/dictionary history\` から過去状態へ戻せます。`,flags:MessageFlags.Ephemeral});return;}
    if(sub==='list'){const es=await listDictionaryEntries(interaction.guildId,50);await interaction.reply({content:es.length?fit(`辞書（先頭${es.length}件）:\n${es.map(e=>`- ${e.word} → ${e.reading} 〔最終: ${e.updatedByDisplayName}〕`).join('\n')}`):'辞書は空です。',flags:MessageFlags.Ephemeral});return;}
    if(sub==='search'){const es=await searchDictionaryEntries(interaction.guildId,interaction.options.getString('query',true));await interaction.reply({content:es.length?fit(es.map(e=>`- ${e.word} → ${e.reading} 〔最終: ${e.updatedByDisplayName}〕`).join('\n')):'一致する項目はありません。',flags:MessageFlags.Ephemeral});return;}
    if(sub==='history'){const word=interaction.options.getString('word',true);const panel=await buildHistoryPanel(interaction.guildId,word);await interaction.reply({...panel,flags:MessageFlags.Ephemeral});return;}
    if(sub==='test'){const raw=interaction.options.getString('text',true);const converted=await processPlainText(interaction.guildId,raw,{maxLength:2000});await interaction.reply({content:fit(`変換前:\n${raw}\n\n変換後:\n${converted??'（読み上げ内容なし）'}`),flags:MessageFlags.Ephemeral});return;}
    if(sub==='export'){const payload=await exportDictionary(interaction.guildId);const buf=Buffer.from(JSON.stringify(payload,null,2)+'\n','utf8');await interaction.reply({content:`辞書を${payload.entries.length}件出力しました。`,files:[new AttachmentBuilder(buf,{name:'dictionary.json'})],flags:MessageFlags.Ephemeral});return;}
    if(sub==='import'){
      const file=interaction.options.getAttachment('file',true); if((file.size??0)>1_000_000) throw new Error('辞書ファイルは1MB以下にしてください。');
      const res=await fetch(file.url); if(!res.ok) throw new Error('辞書ファイルを取得できませんでした。');
      const json=await res.json() as any; if(!json||!Array.isArray(json.entries)) throw new Error('`/dictionary export` 形式のJSONを指定してください。');
      const result=await importDictionary(interaction.guildId,json.entries,a); await interaction.reply({content:`Import完了: 追加 ${result.added}件 / 更新 ${result.updated}件`,flags:MessageFlags.Ephemeral}); return;
    }
  }catch(error){
    const response={content:error instanceof Error?error.message:String(error),flags:MessageFlags.Ephemeral} as const;
    if(interaction.replied||interaction.deferred)await interaction.followUp(response).catch(()=>undefined);else await interaction.reply(response);
  }
}};
