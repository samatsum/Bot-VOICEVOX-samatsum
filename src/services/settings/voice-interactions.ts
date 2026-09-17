import {
  MessageFlags,
  type ButtonInteraction,
  type StringSelectMenuInteraction
} from 'discord.js';
import {
  getUserSettings,
  resetVoiceSettings,
  setVoiceSpeaker,
  setVoiceSpeed,
  setVoiceStyle
} from './user-settings-store.js';
import { buildVoicePanel, getDefaultStyleForSpeaker, getAllowedVoicevoxSpeakers } from './voice-panel.js';
import { getTalkStyles, synthesizeVoice } from '../tts/voicevox-engine.js';
import { resolveVoiceOverride } from './voice-resolver.js';

const PREVIEW_TEXT = 'これは現在設定されている読み上げ音声です。';

function parseOwner(customId: string): string | null {
  const parts = customId.split(':');
  return parts.length >= 3 ? parts[2] ?? null : null;
}

async function ensureOwner(
  interaction: StringSelectMenuInteraction | ButtonInteraction
): Promise<boolean> {
  const ownerId = parseOwner(interaction.customId);
  if (ownerId && ownerId === interaction.user.id) return true;
  await interaction.reply({
    content: 'この音声設定パネルは、コマンドを実行した本人だけが操作できます。',
    flags: MessageFlags.Ephemeral
  });
  return false;
}

export function isVoiceComponentCustomId(customId: string): boolean {
  return customId.startsWith('voice:');
}

export async function handleVoiceSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inGuild() || !(await ensureOwner(interaction))) return;
  const action = interaction.customId.split(':')[1];
  const selected = interaction.values[0];
  if (!action || !selected) return;

  if (action === 'speaker') {
    const speakers = await getAllowedVoicevoxSpeakers();
    if (!speakers.some((speaker) => speaker.name === selected)) {
      await interaction.reply({ content: 'その話者は現在利用できません。', flags: MessageFlags.Ephemeral });
      return;
    }
    const styleName = await getDefaultStyleForSpeaker(selected);
    await setVoiceSpeaker(interaction.guildId, interaction.user.id, selected, styleName);
  } else if (action === 'style') {
    const settings = await getUserSettings(interaction.guildId, interaction.user.id);
    const speakers = await getAllowedVoicevoxSpeakers();
    const speaker = speakers.find((candidate) => candidate.name === settings.voice.speakerName);
    const valid = speaker && getTalkStyles(speaker).some((style) => style.name === selected);
    if (!valid) {
      await interaction.reply({ content: 'そのスタイルは現在の話者では利用できません。', flags: MessageFlags.Ephemeral });
      return;
    }
    await setVoiceStyle(interaction.guildId, interaction.user.id, selected);
  } else if (action === 'speed') {
    await setVoiceSpeed(interaction.guildId, interaction.user.id, Number(selected));
  } else {
    return;
  }

  await interaction.update(await buildVoicePanel(interaction.guildId, interaction.user.id));
}

export async function handleVoiceButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inGuild() || !(await ensureOwner(interaction))) return;
  const action = interaction.customId.split(':')[1];

  if (action === 'reset') {
    await resetVoiceSettings(interaction.guildId, interaction.user.id);
    await interaction.update(await buildVoicePanel(interaction.guildId, interaction.user.id));
    return;
  }

  if (action === 'preview') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const voice = await resolveVoiceOverride(interaction.guildId, interaction.user.id, {});
      const wav = await synthesizeVoice(PREVIEW_TEXT, voice);
      await interaction.editReply({
        content: `${voice.speakerName} / ${voice.styleName} / ${voice.speedScale.toFixed(1)}x のプレビューです。`,
        files: [{ attachment: wav, name: 'voice-preview.wav' }]
      });
    } catch (error) {
      console.error('Voice preview failed:', error);
      await interaction.editReply('音声プレビューの生成に失敗しました。VOICEVOXが起動しているか確認してください。');
    }
  }
}
