import type { VoiceSettings } from '../settings/user-settings-store.js';
import { VoicevoxError, synthesizeVoice } from '../tts/voicevox-engine.js';
import { getGuildVoiceConnection } from '../voice/connection-manager.js';
import { playWavBufferAndWait, stopGuildAudio } from '../voice/playback-manager.js';

export const MAX_QUEUE_LENGTH = 50;
export const MAX_PER_USER = 10;

type ReadingSource = 'message' | 'command';
type AsyncCallback = () => Promise<void>;
type ErrorCallback = (message: string) => Promise<void>;

export type ReadingItem = {
  text: string;
  userId: string;
  voice: VoiceSettings;
  source: ReadingSource;
  sourceLabel?: string;
  messageId?: string;
  channelId?: string;
  onQueued?: AsyncCallback;
  onStart?: AsyncCallback;
  onComplete?: AsyncCallback;
  onCancel?: AsyncCallback;
  onError?: ErrorCallback;
};

type CurrentReading = { item: ReadingItem; controller: AbortController };
type GuildQueue = { items: ReadingItem[]; processing: boolean; current: CurrentReading | null };
const queues = new Map<string, GuildQueue>();

function getQueue(guildId: string): GuildQueue {
  let q = queues.get(guildId);
  if (!q) {
    q = { items: [], processing: false, current: null };
    queues.set(guildId, q);
  }
  return q;
}

export type EnqueueResult =
  | { ok: true; position: number }
  | { ok: false; reason: 'queue-full' | 'user-limit' };
export type QueueSnapshot = {
  current: ReadingItem | null;
  waiting: ReadingItem[];
  total: number;
  userTotal: number;
};

function total(q: GuildQueue) {
  return q.items.length + (q.current ? 1 : 0);
}

function userCount(q: GuildQueue, userId: string) {
  return q.items.filter((x) => x.userId === userId).length +
    (q.current?.item.userId === userId ? 1 : 0);
}

function userFacingError(error: unknown): string {
  return error instanceof VoicevoxError
    ? error.userMessage
    : '読み上げ音声の生成または再生に失敗しました。Botを動かしているPCのログを確認してください。';
}

async function safe(cb?: AsyncCallback) {
  if (!cb) return;
  try { await cb(); } catch (error) { console.error('Queue callback failed:', error); }
}

async function safeError(cb: ErrorCallback | undefined, message: string) {
  if (!cb) return;
  try { await cb(message); } catch (error) { console.error('Queue error callback failed:', error); }
}

export async function enqueueReading(guildId: string, item: ReadingItem): Promise<EnqueueResult> {
  const q = getQueue(guildId);
  if (total(q) >= MAX_QUEUE_LENGTH) return { ok: false, reason: 'queue-full' };
  if (userCount(q, item.userId) >= MAX_PER_USER) return { ok: false, reason: 'user-limit' };

  q.items.push(item);
  await safe(item.onQueued);
  const position = q.items.length + (q.current ? 1 : 0);
  void processQueue(guildId, q);
  return { ok: true, position };
}

async function processQueue(guildId: string, q: GuildQueue): Promise<void> {
  if (q.processing) return;
  q.processing = true;

  try {
    while (q.items.length) {
      const item = q.items.shift()!;
      const connection = getGuildVoiceConnection(guildId);

      if (!connection) {
        await safe(item.onCancel);
        for (const waiting of q.items.splice(0)) await safe(waiting.onCancel);
        return;
      }

      const controller = new AbortController();
      q.current = { item, controller };
      await safe(item.onStart);

      try {
        const wav = await synthesizeVoice(item.text, item.voice, controller.signal);
        if (controller.signal.aborted) {
          await safe(item.onCancel);
          continue;
        }

        await playWavBufferAndWait(guildId, connection, wav);
        if (controller.signal.aborted) await safe(item.onCancel);
        else await safe(item.onComplete);
      } catch (error) {
        if (controller.signal.aborted) {
          await safe(item.onCancel);
        } else {
          console.error(`Failed queued TTS (${item.source}) in guild ${guildId}:`, error);
          await safeError(item.onError, userFacingError(error));
        }
      } finally {
        if (q.current?.controller === controller) q.current = null;
      }
    }
  } finally {
    q.current = null;
    q.processing = false;
  }
}

export function skipCurrentReading(guildId: string) {
  const q = getQueue(guildId);
  const current = q.current;
  if (!current) return { skipped: false, remaining: q.items.length };
  current.controller.abort();
  stopGuildAudio(guildId);
  return { skipped: true, remaining: q.items.length };
}

export function clearWaitingReadings(guildId: string) {
  const q = getQueue(guildId);
  const removed = q.items.splice(0);
  for (const item of removed) void safe(item.onCancel);
  return { removed: removed.length, currentContinues: q.current !== null };
}

export function cancelAllReadings(guildId: string) {
  const q = getQueue(guildId);
  const removed = q.items.splice(0);
  const stoppedCurrent = !!q.current;
  for (const item of removed) void safe(item.onCancel);
  q.current?.controller.abort();
  stopGuildAudio(guildId);
  return { stoppedCurrent, removedWaiting: removed.length };
}


export function hasWaitingMessage(guildId:string,messageId:string):boolean{
  return getQueue(guildId).items.some((item)=>item.messageId===messageId);
}
export function updateWaitingMessage(guildId:string,messageId:string,text:string):boolean{
  const item=getQueue(guildId).items.find((candidate)=>candidate.messageId===messageId);
  if(!item)return false;item.text=text;return true;
}
export function removeWaitingMessage(guildId:string,messageId:string):boolean{
  const q=getQueue(guildId);const index=q.items.findIndex((item)=>item.messageId===messageId);if(index<0)return false;
  const [item]=q.items.splice(index,1);if(item)void safe(item.onCancel);return true;
}

export function getQueueSnapshot(guildId: string, userId: string): QueueSnapshot {
  const q = getQueue(guildId);
  return {
    current: q.current?.item ?? null,
    waiting: [...q.items],
    total: total(q),
    userTotal: userCount(q, userId)
  };
}
