import { db } from '../../db/client.js';

export type DictionaryEntry = {
  id: number;
  word: string;
  reading: string;
  isDeleted: boolean;
  updatedByUserId: string;
  updatedByDisplayName: string;
  createdAt: number;
  updatedAt: number;
};

export type DictionaryHistory = {
  id: number;
  word: string;
  action: string;
  beforeReading: string | null;
  afterReading: string | null;
  actorUserId: string;
  actorDisplayName: string;
  snapshotReading: string;
  snapshotDeleted: boolean;
  createdAt: number;
};

type Actor = { userId: string; displayName: string };
const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { expiresAt: number; entries: DictionaryEntry[] }>();

function invalidate(guildId: string): void { cache.delete(guildId); }
function toEntry(row: Record<string, unknown>): DictionaryEntry {
  return {
    id: Number(row.id), word: String(row.word), reading: String(row.reading), isDeleted: Number(row.is_deleted) !== 0,
    updatedByUserId: String(row.updated_by_user_id), updatedByDisplayName: String(row.updated_by_display_name),
    createdAt: Number(row.created_at), updatedAt: Number(row.updated_at)
  };
}

export async function getDictionaryChannelId(guildId: string): Promise<string | null> {
  const row = (await db.execute({sql:'SELECT dictionary_channel_id FROM guild_settings WHERE guild_id = ?', args:[guildId]})).rows[0];
  const value = row?.dictionary_channel_id;
  return value ? String(value) : null;
}
export async function setDictionaryChannelId(guildId: string, channelId: string): Promise<void> {
  await db.execute({
    sql:`INSERT INTO guild_settings(guild_id, dictionary_channel_id, updated_at) VALUES(?, ?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET dictionary_channel_id=excluded.dictionary_channel_id, updated_at=excluded.updated_at`,
    args:[guildId,channelId,Date.now()]
  });
}

export async function getActiveDictionaryEntries(guildId: string): Promise<DictionaryEntry[]> {
  const hit = cache.get(guildId);
  if (hit && hit.expiresAt > Date.now()) return hit.entries;
  const result = await db.execute({
    sql:'SELECT * FROM dictionary_entries WHERE guild_id = ? AND is_deleted = 0 ORDER BY length(word) DESC, word',
    args:[guildId]
  });
  const entries = result.rows.map((row)=>toEntry(row as Record<string,unknown>));
  cache.set(guildId,{entries,expiresAt:Date.now()+CACHE_TTL_MS});
  return entries;
}

function isAsciiWordChar(char: string | undefined): boolean { return !!char && /[A-Za-z0-9_]/.test(char); }
function isAsciiWord(term: string): boolean { return /^[A-Za-z0-9_]+$/.test(term); }

export async function applyDictionary(guildId: string, input: string): Promise<string> {
  const entries = await getActiveDictionaryEntries(guildId);
  if (!entries.length || !input) return input;
  let out=''; let i=0;
  while (i < input.length) {
    let matched: DictionaryEntry | undefined;
    for (const entry of entries) {
      if (!input.startsWith(entry.word, i)) continue;
      if (isAsciiWord(entry.word)) {
        const prev = i>0 ? input[i-1] : undefined;
        const next = input[i+entry.word.length];
        if (isAsciiWordChar(prev) || isAsciiWordChar(next)) continue;
      }
      matched=entry; break;
    }
    if (matched) { out += matched.reading; i += matched.word.length; }
    else { out += input[i]; i += 1; }
  }
  return out;
}

export async function getDictionaryEntry(guildId:string, word:string):Promise<DictionaryEntry|null>{
  const row=(await db.execute({sql:'SELECT * FROM dictionary_entries WHERE guild_id=? AND word=?',args:[guildId,word]})).rows[0];
  return row ? toEntry(row as Record<string,unknown>) : null;
}
async function addHistory(guildId:string, entryId:number, word:string, action:string, before:DictionaryEntry|null, afterReading:string, afterDeleted:boolean, actor:Actor):Promise<void>{
  await db.execute({sql:`INSERT INTO dictionary_history(guild_id,entry_id,word,action,before_reading,after_reading,before_deleted,after_deleted,actor_user_id,actor_display_name,snapshot_reading,snapshot_deleted,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,args:[guildId,entryId,word,action,before?.reading ?? null,afterReading,before? (before.isDeleted?1:0):null,afterDeleted?1:0,actor.userId,actor.displayName,afterReading,afterDeleted?1:0,Date.now()]});
}

export async function addDictionaryEntry(guildId:string, word:string, reading:string, actor:Actor):Promise<DictionaryEntry>{
  word=word.trim(); reading=reading.trim(); if(!word||!reading) throw new Error('単語と読みは空にできません。');
  const before=await getDictionaryEntry(guildId,word); if(before && !before.isDeleted) throw new Error('その単語はすでに登録されています。`/dictionary edit` を使用してください。');
  const now=Date.now();
  if(before){
    await db.execute({sql:`UPDATE dictionary_entries SET reading=?,is_deleted=0,updated_by_user_id=?,updated_by_display_name=?,updated_at=? WHERE id=?`,args:[reading,actor.userId,actor.displayName,now,before.id]});
    await addHistory(guildId,before.id,word,'add',before,reading,false,actor);
  } else {
    const r=await db.execute({sql:`INSERT INTO dictionary_entries(guild_id,word,reading,is_deleted,updated_by_user_id,updated_by_display_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`,args:[guildId,word,reading,0,actor.userId,actor.displayName,now,now]});
    await addHistory(guildId,Number(r.lastInsertRowid),word,'add',null,reading,false,actor);
  }
  invalidate(guildId); return (await getDictionaryEntry(guildId,word))!;
}
export async function editDictionaryEntry(guildId:string, word:string, reading:string, actor:Actor):Promise<DictionaryEntry>{
  const before=await getDictionaryEntry(guildId,word); if(!before || before.isDeleted) throw new Error('その単語は現在の辞書に登録されていません。');
  reading=reading.trim(); if(!reading) throw new Error('読みは空にできません。');
  await db.execute({sql:`UPDATE dictionary_entries SET reading=?,updated_by_user_id=?,updated_by_display_name=?,updated_at=? WHERE id=?`,args:[reading,actor.userId,actor.displayName,Date.now(),before.id]});
  await addHistory(guildId,before.id,word,'edit',before,reading,false,actor); invalidate(guildId); return (await getDictionaryEntry(guildId,word))!;
}
export async function removeDictionaryEntry(guildId:string, word:string, actor:Actor):Promise<void>{
  const before=await getDictionaryEntry(guildId,word); if(!before || before.isDeleted) throw new Error('その単語は現在の辞書に登録されていません。');
  await db.execute({sql:`UPDATE dictionary_entries SET is_deleted=1,updated_by_user_id=?,updated_by_display_name=?,updated_at=? WHERE id=?`,args:[actor.userId,actor.displayName,Date.now(),before.id]});
  await addHistory(guildId,before.id,word,'remove',before,before.reading,true,actor); invalidate(guildId);
}
export async function listDictionaryEntries(guildId:string, limit=50):Promise<DictionaryEntry[]>{
  const r=await db.execute({sql:'SELECT * FROM dictionary_entries WHERE guild_id=? AND is_deleted=0 ORDER BY word LIMIT ?',args:[guildId,limit]}); return r.rows.map(x=>toEntry(x as Record<string,unknown>));
}
export async function searchDictionaryEntries(guildId:string, query:string, limit=25):Promise<DictionaryEntry[]>{
  const r=await db.execute({sql:`SELECT * FROM dictionary_entries WHERE guild_id=? AND is_deleted=0 AND (word LIKE ? OR reading LIKE ?) ORDER BY word LIMIT ?`,args:[guildId,`%${query}%`,`%${query}%`,limit]}); return r.rows.map(x=>toEntry(x as Record<string,unknown>));
}
export async function getDictionaryHistory(guildId:string, word:string, limit=20):Promise<DictionaryHistory[]>{
  const r=await db.execute({sql:'SELECT * FROM dictionary_history WHERE guild_id=? AND word=? ORDER BY id DESC LIMIT ?',args:[guildId,word,limit]});
  return r.rows.map((row)=>({id:Number(row.id),word:String(row.word),action:String(row.action),beforeReading:row.before_reading==null?null:String(row.before_reading),afterReading:row.after_reading==null?null:String(row.after_reading),actorUserId:String(row.actor_user_id),actorDisplayName:String(row.actor_display_name),snapshotReading:String(row.snapshot_reading),snapshotDeleted:Number(row.snapshot_deleted)!==0,createdAt:Number(row.created_at)}));
}
export async function restoreDictionaryHistory(guildId:string, word:string, historyId:number, actor:Actor):Promise<DictionaryEntry>{
  const h=(await db.execute({sql:'SELECT * FROM dictionary_history WHERE guild_id=? AND word=? AND id=?',args:[guildId,word,historyId]})).rows[0];
  if(!h) throw new Error('指定した履歴IDが見つかりません。');
  const before=await getDictionaryEntry(guildId,word); if(!before) throw new Error('辞書項目が見つかりません。');
  const reading=String(h.snapshot_reading); const deleted=Number(h.snapshot_deleted)!==0;
  await db.execute({sql:`UPDATE dictionary_entries SET reading=?,is_deleted=?,updated_by_user_id=?,updated_by_display_name=?,updated_at=? WHERE id=?`,args:[reading,deleted?1:0,actor.userId,actor.displayName,Date.now(),before.id]});
  await addHistory(guildId,before.id,word,'restore',before,reading,deleted,actor); invalidate(guildId); return (await getDictionaryEntry(guildId,word))!;
}
export async function searchDictionaryWordCandidates(
  guildId:string,
  query:string,
  options:{includeDeleted?:boolean;limit?:number}={}
):Promise<DictionaryEntry[]>{
  const includeDeleted=options.includeDeleted??false;
  const limit=Math.min(Math.max(options.limit??25,1),25);
  const q=query.trim();
  const pattern=`%${q}%`;
  const prefix=`${q}%`;
  const r=await db.execute({
    sql:`SELECT * FROM dictionary_entries
         WHERE guild_id=?
           AND (?=1 OR is_deleted=0)
           AND (?='' OR word LIKE ? COLLATE NOCASE OR reading LIKE ? COLLATE NOCASE)
         ORDER BY
           CASE
             WHEN ?<>'' AND word = ? COLLATE NOCASE THEN 0
             WHEN ?<>'' AND word LIKE ? COLLATE NOCASE THEN 1
             WHEN ?<>'' AND reading LIKE ? COLLATE NOCASE THEN 2
             ELSE 3
           END,
           is_deleted ASC,
           length(word) ASC,
           word COLLATE NOCASE ASC
         LIMIT ?`,
    args:[guildId,includeDeleted?1:0,q,pattern,pattern,q,q,q,prefix,q,prefix,limit]
  });
  return r.rows.map(x=>toEntry(x as Record<string,unknown>));
}

export async function getDictionaryHistoryById(guildId:string, historyId:number):Promise<DictionaryHistory|null>{
  const row=(await db.execute({sql:'SELECT * FROM dictionary_history WHERE guild_id=? AND id=?',args:[guildId,historyId]})).rows[0];
  if(!row)return null;
  return {id:Number(row.id),word:String(row.word),action:String(row.action),beforeReading:row.before_reading==null?null:String(row.before_reading),afterReading:row.after_reading==null?null:String(row.after_reading),actorUserId:String(row.actor_user_id),actorDisplayName:String(row.actor_display_name),snapshotReading:String(row.snapshot_reading),snapshotDeleted:Number(row.snapshot_deleted)!==0,createdAt:Number(row.created_at)};
}

export async function restoreDictionaryHistoryById(guildId:string, historyId:number, actor:Actor):Promise<DictionaryEntry>{
  const h=await getDictionaryHistoryById(guildId,historyId);
  if(!h) throw new Error('指定した履歴が見つかりません。');
  return restoreDictionaryHistory(guildId,h.word,historyId,actor);
}

export async function exportDictionary(guildId:string):Promise<{version:1;exportedAt:string;entries:{word:string;reading:string}[]}>{
  const entries=await getActiveDictionaryEntries(guildId); return {version:1,exportedAt:new Date().toISOString(),entries:entries.map(e=>({word:e.word,reading:e.reading}))};
}
export async function importDictionary(guildId:string, entries:{word:string;reading:string}[], actor:Actor):Promise<{added:number;updated:number}>{
  let added=0,updated=0;
  for(const item of entries.slice(0,5000)){
    const word=String(item.word??'').trim(), reading=String(item.reading??'').trim(); if(!word||!reading) continue;
    const before=await getDictionaryEntry(guildId,word);
    if(before && !before.isDeleted){ await editDictionaryEntry(guildId,word,reading,actor); updated++; }
    else { await addDictionaryEntry(guildId,word,reading,actor); added++; }
  }
  invalidate(guildId); return {added,updated};
}
