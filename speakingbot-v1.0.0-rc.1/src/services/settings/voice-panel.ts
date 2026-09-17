import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} from 'discord.js';
import {
  ALLOWED_SPEAKER_NAMES,
  DEFAULT_STYLE_NAME,
  getUserSettings,
  MAX_SPEED_SCALE,
  MIN_SPEED_SCALE,
  type UserSettings
} from './user-settings-store.js';
import { getSpeakers, getTalkStyles, type VoicevoxSpeaker } from '../tts/voicevox-engine.js';

function speedValues(): number[] {
  const values: number[] = [];
  for (let value = MIN_SPEED_SCALE; value <= MAX_SPEED_SCALE + 0.001; value += 0.1) {
    values.push(Math.round(value * 10) / 10);
  }
  return values;
}

function availableAllowedSpeakers(speakers: VoicevoxSpeaker[]): VoicevoxSpeaker[] {
  return speakers.filter((speaker) =>
    ALLOWED_SPEAKER_NAMES.includes(speaker.name as (typeof ALLOWED_SPEAKER_NAMES)[number])
  );
}

function chooseSpeaker(speakers: VoicevoxSpeaker[], settings: UserSettings): VoicevoxSpeaker {
  return speakers.find((speaker) => speaker.name === settings.voice.speakerName) ?? speakers[0]!;
}

export async function getAllowedVoicevoxSpeakers(): Promise<VoicevoxSpeaker[]> {
  const speakers = availableAllowedSpeakers(await getSpeakers());
  if (!speakers.length) {
    throw new Error('VOICEVOXに初版Allowlist（ずんだもん / 四国めたん）の話者が見つかりません。');
  }
  return speakers;
}

export async function getDefaultStyleForSpeaker(speakerName: string): Promise<string> {
  const speakers = await getAllowedVoicevoxSpeakers();
  const speaker = speakers.find((candidate) => candidate.name === speakerName);
  if (!speaker) return DEFAULT_STYLE_NAME;
  const styles = getTalkStyles(speaker);
  return styles.find((style) => style.name === DEFAULT_STYLE_NAME)?.name ?? styles[0]?.name ?? DEFAULT_STYLE_NAME;
}

export async function buildVoicePanel(guildId: string, userId: string) {
  const settings = await getUserSettings(guildId, userId);
  const speakers = await getAllowedVoicevoxSpeakers();
  const currentSpeaker = chooseSpeaker(speakers, settings);
  const styles = getTalkStyles(currentSpeaker);
  const currentStyle = styles.find((style) => style.name === settings.voice.styleName) ?? styles[0];

  const speakerSelect = new StringSelectMenuBuilder()
    .setCustomId(`voice:speaker:${userId}`)
    .setPlaceholder('話者を選択')
    .addOptions(
      speakers.map((speaker) => ({
        label: speaker.name,
        value: speaker.name,
        default: speaker.name === currentSpeaker.name
      }))
    );

  const styleSelect = new StringSelectMenuBuilder()
    .setCustomId(`voice:style:${userId}`)
    .setPlaceholder('スタイルを選択')
    .addOptions(
      styles.map((style) => ({
        label: style.name,
        value: style.name,
        default: style.name === currentStyle?.name
      }))
    );

  const speedSelect = new StringSelectMenuBuilder()
    .setCustomId(`voice:speed:${userId}`)
    .setPlaceholder('話速を選択')
    .addOptions(
      speedValues().map((speed) => ({
        label: `${speed.toFixed(1)}x`,
        value: speed.toFixed(1),
        default: Math.abs(speed - settings.voice.speedScale) < 0.001
      }))
    );

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`voice:preview:${userId}`)
      .setLabel('音声プレビュー')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`voice:reset:${userId}`)
      .setLabel('初期設定に戻す')
      .setStyle(ButtonStyle.Secondary)
  );

  const rows = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(speakerSelect),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(styleSelect),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(speedSelect),
    buttons
  ];

  return {
    content: [
      '**VOICEVOX 個人設定**',
      `話者: **${currentSpeaker.name}**${currentSpeaker.name!==settings.voice.speakerName?'（このPCで利用可能な話者へフォールバック）':''}`,
      `スタイル: **${currentStyle?.name ?? '未検出'}**`,
      `話速: **${settings.voice.speedScale.toFixed(1)}x**`,
      `リアルタイム読み上げ: **${settings.readEnabled ? 'ON' : 'OFF'}**`,
      '',
      '初版で選択できる話者は、利用規約確認済みの「ずんだもん」「四国めたん」です。'
    ].join('\n'),
    components: rows
  };
}
