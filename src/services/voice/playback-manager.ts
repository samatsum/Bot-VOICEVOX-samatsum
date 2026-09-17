import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  StreamType,
  type AudioPlayer,
  type VoiceConnection
} from '@discordjs/voice';

const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static') as string | null;

const players = new Map<string, AudioPlayer>();
const ffmpegProcesses = new Map<string, ChildProcessWithoutNullStreams>();
const TEST_AUDIO_PATH = path.resolve(process.cwd(), 'assets', 'test-tone.ogg');
const PLAYBACK_END_TIMEOUT_MS = 120_000;

function getOrCreatePlayer(guildId: string): AudioPlayer {
  const existing = players.get(guildId);
  if (existing) {
    return existing;
  }

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Stop
    }
  });

  player.on('error', (error) => {
    console.error(`Audio player error in guild ${guildId}:`, error);
  });

  players.set(guildId, player);
  return player;
}

function stopFfmpeg(guildId: string): void {
  const process = ffmpegProcesses.get(guildId);
  if (!process) {
    return;
  }

  ffmpegProcesses.delete(guildId);
  if (!process.killed) {
    process.kill();
  }
}

async function waitForPlaybackStart(player: AudioPlayer): Promise<void> {
  if (player.state.status === AudioPlayerStatus.Playing) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for audio playback to start.'));
    }, 5_000);

    const onPlaying = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      player.off(AudioPlayerStatus.Playing, onPlaying);
      player.off('error', onError);
    };

    player.once(AudioPlayerStatus.Playing, onPlaying);
    player.once('error', onError);
  });
}

async function waitForPlaybackEnd(player: AudioPlayer): Promise<void> {
  if (player.state.status === AudioPlayerStatus.Idle) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for audio playback to finish.'));
    }, PLAYBACK_END_TIMEOUT_MS);

    const onIdle = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      player.off(AudioPlayerStatus.Idle, onIdle);
      player.off('error', onError);
    };

    player.once(AudioPlayerStatus.Idle, onIdle);
    player.once('error', onError);
  });
}

export async function playTestAudio(
  guildId: string,
  connection: VoiceConnection
): Promise<void> {
  const player = getOrCreatePlayer(guildId);

  stopFfmpeg(guildId);
  player.stop(true);

  const resource = createAudioResource(createReadStream(TEST_AUDIO_PATH), {
    inputType: StreamType.OggOpus
  });

  connection.subscribe(player);
  player.play(resource);
  await waitForPlaybackStart(player);
}

async function startWavPlayback(
  guildId: string,
  connection: VoiceConnection,
  wav: Buffer
): Promise<AudioPlayer> {
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static could not resolve an FFmpeg executable.');
  }

  const player = getOrCreatePlayer(guildId);

  stopFfmpeg(guildId);
  player.stop(true);

  const ffmpeg = spawn(ffmpegPath, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    'pipe:0',
    '-vn',
    '-ac',
    '2',
    '-ar',
    '48000',
    '-c:a',
    'libopus',
    '-b:a',
    '96k',
    '-f',
    'ogg',
    'pipe:1'
  ]);

  ffmpegProcesses.set(guildId, ffmpeg);

  let ffmpegError = '';
  ffmpeg.stderr.setEncoding('utf8');
  ffmpeg.stderr.on('data', (chunk: string) => {
    ffmpegError += chunk;
  });

  ffmpeg.once('error', (error) => {
    console.error(`FFmpeg process error in guild ${guildId}:`, error);
  });

  ffmpeg.once('close', (code) => {
    if (ffmpegProcesses.get(guildId) === ffmpeg) {
      ffmpegProcesses.delete(guildId);
    }

    if (code !== 0 && code !== null && ffmpegError.trim()) {
      console.error(`FFmpeg exited with code ${code}: ${ffmpegError.trim()}`);
    }
  });

  ffmpeg.stdin.end(wav);

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.OggOpus
  });

  connection.subscribe(player);
  player.play(resource);

  try {
    await waitForPlaybackStart(player);
    return player;
  } catch (error) {
    stopFfmpeg(guildId);
    throw error;
  }
}

export async function playWavBuffer(
  guildId: string,
  connection: VoiceConnection,
  wav: Buffer
): Promise<void> {
  await startWavPlayback(guildId, connection, wav);
}

export async function playWavBufferAndWait(
  guildId: string,
  connection: VoiceConnection,
  wav: Buffer
): Promise<void> {
  const player = await startWavPlayback(guildId, connection, wav);

  try {
    await waitForPlaybackEnd(player);
  } finally {
    stopFfmpeg(guildId);
  }
}

export function stopGuildAudio(guildId: string): void {
  const player = players.get(guildId);

  stopFfmpeg(guildId);
  player?.stop(true);
}
