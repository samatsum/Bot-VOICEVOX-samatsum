import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types.js';
import { db, isRemoteDatabase } from '../db/client.js';
import { getInstanceId, getInstanceLockHealth } from '../db/instance-lock.js';
import { getQueueSnapshot } from '../services/reading/reading-queue.js';
import { getVoicevoxVersion } from '../services/tts/voicevox-engine.js';
import { getGuildVoiceConnection } from '../services/voice/connection-manager.js';

function uptimeText(){const s=Math.floor(process.uptime());const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);const sec=s%60;return `${h}h ${m}m ${sec}s`;}
export const statusCommand:Command={data:new SlashCommandBuilder().setName('status').setDescription('Bot-VOICEVOX-samatsumの現在状態を確認します'),async execute(interaction){
  if(!interaction.inCachedGuild()){await interaction.reply({content:'このコマンドはDiscordサーバー内でのみ使用できます。',flags:MessageFlags.Ephemeral});return;}
  await interaction.deferReply({flags:MessageFlags.Ephemeral});
  let dbStatus='OK';try{await db.execute('SELECT 1 AS ok');}catch{dbStatus='ERROR';}
  let vv='ERROR';try{vv=`OK (${(await getVoicevoxVersion()).replaceAll('"','')})`;}catch{}
  const conn=getGuildVoiceConnection(interaction.guildId);
  const vc=interaction.guild.members.me?.voice.channel;
  const q=getQueueSnapshot(interaction.guildId,interaction.user.id);
  const lock=getInstanceLockHealth();
  const heartbeatAge=lock.lastSuccessfulHeartbeatAt?Math.max(0,Math.round((Date.now()-lock.lastSuccessfulHeartbeatAt)/1000)):null;
  await interaction.editReply([
    '**Bot-VOICEVOX-samatsum Status**',
    `Discord: **OK**`,
    `VOICEVOX: **${vv}**`,
    `Database: **${dbStatus}** (${isRemoteDatabase()?'Turso Cloud':'local'})`,
    `VC: ${conn&&vc?`**${vc.name}**`:'未接続'}`,
    `Queue: **${q.total} / 50**（待機 ${q.waiting.length}）`,
    `Uptime: **${uptimeText()}**`,
    `Instance: \`${getInstanceId()}\``,
    `Heartbeat: **${lock.held?'held':'not-held'}** / failures=${lock.consecutiveFailures}${heartbeatAge===null?'':` / last=${heartbeatAge}s ago`}`
  ].join('\n'));
}};
