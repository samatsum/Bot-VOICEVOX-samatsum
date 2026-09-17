import { MessageFlags, type Message } from 'discord.js';
import { applyDictionary } from '../dictionary/dictionary-service.js';
import { getGuildSettings } from '../settings/guild-settings-service.js';

export const DEFAULT_MAX_TEXT_LENGTH = 300;
const COMMON_EMOJI_NAMES = new Map<string,string>([['😂','笑'],['🤣','爆笑'],['😊','笑顔'],['😭','泣き'],['👍','グッド'],['❤','ハート'],['❤️','ハート'],['🎉','クラッカー'],['🔥','炎'],['💡','ひらめき'],['✅','チェック'],['❌','バツ']]);
type ProcessOptions = { maxLength?: number; respectSkipPrefix?: boolean };

function replaceSpoilers(text:string){return text.replace(/\|\|[\s\S]*?\|\|/g,' ネタバレ省略 ');}
function replaceCodeBlocks(text:string){return text.replace(/```[\s\S]*?```/g,' コード省略 ');}
function replaceInlineCode(text:string){return text.replace(/`([^`\n]+)`/g,'$1');}
function replaceMarkdownLinks(text:string){return text.replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/gi,'$1 URL');}
function replaceUrls(text:string){return text.replace(/https?:\/\/[^\s<>]+/gi,'URL');}
function replaceDiscordMentions(text:string,message:Message<true>):string{
  let result=text;
  result=result.replace(/<@!?(\d+)>/g,(_m,id:string)=>message.guild.members.cache.get(id)?.displayName ?? message.mentions.users.get(id)?.displayName ?? message.mentions.users.get(id)?.username ?? 'ユーザー');
  result=result.replace(/<#(\d+)>/g,(_m,id:string)=>{const c=message.guild.channels.cache.get(id);return c&&'name' in c?c.name:'チャンネル';});
  result=result.replace(/<@&(\d+)>/g,(_m,id:string)=>message.guild.roles.cache.get(id)?.name ?? 'ロール');
  return result.replace(/@everyone/g,'全員').replace(/@here/g,'ここにいる全員');
}
function replaceCustomEmoji(text:string){return text.replace(/<a?:([A-Za-z0-9_]+):\d+>/g,'$1');}
function stripCustomEmoji(text:string){return text.replace(/<a?:[A-Za-z0-9_]+:\d+>/g,' ');}
function replaceCommonUnicodeEmoji(text:string){let result=text;for(const [emoji,name] of COMMON_EMOJI_NAMES)result=result.split(emoji).join(` ${name} `);return result.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}](?:\uFE0F|\uFE0E)?/gu,' 絵文字 ');}
function stripUnicodeEmoji(text:string){return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}](?:\uFE0F|\uFE0E)?/gu,' ');}
function stripMarkdownSyntax(text:string){return text.replace(/^\s{0,3}#{1,6}\s+/gm,'').replace(/^\s*>+\s?/gm,'').replace(/^\s*[-*+]\s+/gm,'').replace(/^\s*\d+[.)]\s+/gm,'').replace(/~~([^~]+)~~/g,'$1').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/__([^_]+)__/g,'$1').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'$1').replace(/(?<!_)_([^_\n]+)_(?!_)/g,'$1').replace(/\\([\\`*_{}\[\]()#+\-.!|>~])/g,'$1');}
export function applyBuiltInFallbackNormalization(text:string):string{return text.replace(/(?<![A-Za-z0-9_])[wｗ]{3,}(?![A-Za-z0-9_])/gi,' 笑 ').replace(/([!！?？。…])\1{3,}/gu,'$1$1$1').replace(/(.)\1{7,}/gu,'$1$1$1$1$1');}
function normalizeWhitespace(text:string){return text.replace(/[\t\r]+/g,' ').replace(/\n{2,}/g,'。').replace(/\n/g,'。').replace(/\s{2,}/g,' ').replace(/\s+([、。！？])/g,'$1').trim();}
function limitLength(text:string,maxLength:number){return text.length<=maxLength?text:`${text.slice(0,maxLength)}。以下省略`;}
function describeAttachments(message:Message<true>):string[]{const parts:string[]=[];if(message.flags.has(MessageFlags.IsVoiceMessage))return ['ボイスメッセージが投稿されました'];let images=0,gifs=0,audio=0,files=0;for(const a of message.attachments.values()){const ct=a.contentType?.toLowerCase()??'',n=a.name.toLowerCase();if(ct==='image/gif'||n.endsWith('.gif'))gifs++;else if(ct.startsWith('image/'))images++;else if(ct.startsWith('audio/'))audio++;else files++;}if(images===1)parts.push('画像が投稿されました');if(images>1)parts.push(`画像が${images}件投稿されました`);if(gifs===1)parts.push('GIFが投稿されました');if(gifs>1)parts.push(`GIFが${gifs}件投稿されました`);if(audio===1)parts.push('音声ファイルが投稿されました');if(audio>1)parts.push(`音声ファイルが${audio}件投稿されました`);if(files===1)parts.push('ファイルが投稿されました');if(files>1)parts.push(`ファイルが${files}件投稿されました`);return parts;}
function describeStickers(message:Message<true>){return message.stickers.map(s=>`スタンプ ${s.name}`);}
function describePoll(message:Message<true>):string[]{const c=message as Message<true>&{poll?:{question?:{text?:string}}|null};const q=c.poll?.question?.text?.trim();return !c.poll?[]:q?[`投票が投稿されました。${q}`]:['投票が投稿されました'];}

async function processCoreText(guildId:string,text:string,emojiReading:boolean):Promise<string>{
  let result=text;result=replaceSpoilers(result);result=replaceCodeBlocks(result);result=replaceInlineCode(result);result=replaceMarkdownLinks(result);result=replaceUrls(result);
  result=emojiReading?replaceCustomEmoji(result):stripCustomEmoji(result);result=emojiReading?replaceCommonUnicodeEmoji(result):stripUnicodeEmoji(result);result=stripMarkdownSyntax(result);
  result=await applyDictionary(guildId,result);result=applyBuiltInFallbackNormalization(result);return normalizeWhitespace(result);
}
export async function processPlainText(guildId:string,input:string,options:ProcessOptions={}):Promise<string|null>{
  const trimmed=input.trim();if(!trimmed)return null;const settings=await getGuildSettings(guildId);const processed=await processCoreText(guildId,trimmed,settings.emojiReading);if(!processed)return null;return limitLength(processed,options.maxLength??settings.maxTextLength);
}
export async function processDiscordMessage(message:Message<true>,options:ProcessOptions={}):Promise<string|null>{
  const raw=message.content.trim();if((options.respectSkipPrefix??true)&&raw.startsWith(';'))return null;const settings=await getGuildSettings(message.guildId);
  let content=raw;if(content){content=replaceDiscordMentions(content,message);content=await processCoreText(message.guildId,content,settings.emojiReading);}
  const extra=settings.attachmentNotice?[...describeAttachments(message),...describeStickers(message),...describePoll(message)]:[];
  const combined=normalizeWhitespace([content,...extra].filter(Boolean).join('。'));if(!combined)return null;return limitLength(combined,options.maxLength??settings.maxTextLength);
}
