import { env } from '../../env.js';
import type { VoiceSettings } from '../settings/user-settings-store.js';

const REQUEST_TIMEOUT_MS = 20_000;
const SPEAKER_CACHE_TTL_MS = 30_000;
const TEST_SPEAKER_NAME = 'ずんだもん';
const TEST_STYLE_NAME = 'ノーマル';

export type VoicevoxStyle = {
  name: string;
  id: number;
  type?: string;
};

export type VoicevoxSpeaker = {
  name: string;
  speaker_uuid: string;
  styles: VoicevoxStyle[];
};

type AudioQuery = {
  speedScale?: number;
  [key: string]: unknown;
};

let cachedSpeakers: { value: VoicevoxSpeaker[]; expiresAt: number } | null = null;

export class VoicevoxError extends Error {
  readonly userMessage: string;

  constructor(userMessage: string, technicalMessage?: string) {
    super(technicalMessage ?? userMessage);
    this.name = 'VoicevoxError';
    this.userMessage = userMessage;
  }
}

function buildUrl(path: string): URL {
  return new URL(path, `${env.voicevoxBaseUrl.replace(/\/$/, '')}/`);
}

async function fetchWithTimeout(input: URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = init.signal ?? undefined;
  const abortFromExternal = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', abortFromExternal, { once: true });
  }

  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (externalSignal?.aborted) throw error;

    if (controller.signal.aborted) {
      throw new VoicevoxError(
        'VOICEVOXの応答がタイムアウトしました。VOICEVOXが正常に動作しているか確認してください。',
        `VOICEVOX request timed out: ${input.toString()}`
      );
    }

    throw new VoicevoxError(
      'VOICEVOXに接続できません。Botを動かしているPCでVOICEVOXを起動してください。',
      `VOICEVOX request failed: ${input.toString()} - ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abortFromExternal);
  }
}

async function expectOk(response: Response, operation: string): Promise<Response> {
  if (response.ok) return response;
  const body = await response.text().catch(() => '');
  throw new VoicevoxError(
    'VOICEVOXで音声合成に失敗しました。VOICEVOXの状態を確認してください。',
    `VOICEVOX ${operation} failed: HTTP ${response.status}${body ? ` - ${body}` : ''}`
  );
}

function withSignal(init: RequestInit, signal?: AbortSignal): RequestInit {
  return signal ? { ...init, signal } : init;
}

export async function getVoicevoxVersion(): Promise<string> {
  const response = await fetchWithTimeout(buildUrl('/version'));
  await expectOk(response, 'version check');
  return await response.text();
}

export async function getSpeakers(
  signal?: AbortSignal,
  options: { forceRefresh?: boolean } = {}
): Promise<VoicevoxSpeaker[]> {
  if (!options.forceRefresh && cachedSpeakers && cachedSpeakers.expiresAt > Date.now()) {
    return cachedSpeakers.value;
  }

  const response = await fetchWithTimeout(buildUrl('/speakers'), withSignal({}, signal));
  await expectOk(response, 'speaker listing');
  const speakers = (await response.json()) as VoicevoxSpeaker[];
  cachedSpeakers = { value: speakers, expiresAt: Date.now() + SPEAKER_CACHE_TTL_MS };
  return speakers;
}

export function getTalkStyles(speaker: VoicevoxSpeaker): VoicevoxStyle[] {
  return speaker.styles.filter((style) => !style.type || style.type === 'talk');
}

async function resolveStyleId(voice: VoiceSettings, signal?: AbortSignal): Promise<number> {
  const speakers = await getSpeakers(signal);
  const speaker = speakers.find((candidate) => candidate.name === voice.speakerName);

  if (!speaker) {
    throw new VoicevoxError(
      `VOICEVOXに「${voice.speakerName}」が見つかりません。`,
      `VOICEVOX speaker not found: ${voice.speakerName}`
    );
  }

  const styles = getTalkStyles(speaker);
  const style = styles.find((candidate) => candidate.name === voice.styleName);

  if (!style) {
    throw new VoicevoxError(
      `VOICEVOXの「${voice.speakerName}」に「${voice.styleName}」スタイルが見つかりません。`,
      `VOICEVOX style not found: ${voice.speakerName}/${voice.styleName}`
    );
  }

  return style.id;
}

export async function synthesizeVoice(
  text: string,
  voice: VoiceSettings,
  signal?: AbortSignal
): Promise<Buffer> {
  const speakerId = await resolveStyleId(voice, signal);
  const audioQueryUrl = buildUrl('/audio_query');
  audioQueryUrl.searchParams.set('text', text);
  audioQueryUrl.searchParams.set('speaker', String(speakerId));

  const queryResponse = await fetchWithTimeout(
    audioQueryUrl,
    withSignal({ method: 'POST' }, signal)
  );
  await expectOk(queryResponse, 'audio_query');

  const audioQuery = (await queryResponse.json()) as AudioQuery;
  audioQuery.speedScale = voice.speedScale;

  const synthesisUrl = buildUrl('/synthesis');
  synthesisUrl.searchParams.set('speaker', String(speakerId));

  const synthesisResponse = await fetchWithTimeout(
    synthesisUrl,
    withSignal(
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audioQuery)
      },
      signal
    )
  );
  await expectOk(synthesisResponse, 'synthesis');

  return Buffer.from(await synthesisResponse.arrayBuffer());
}

export async function synthesizeTestVoice(text: string, signal?: AbortSignal): Promise<Buffer> {
  return await synthesizeVoice(
    text,
    {
      engine: 'voicevox',
      speakerName: TEST_SPEAKER_NAME,
      styleName: TEST_STYLE_NAME,
      speedScale: 1.0
    },
    signal
  );
}

export const testVoice = {
  speakerName: TEST_SPEAKER_NAME,
  styleName: TEST_STYLE_NAME
} as const;
