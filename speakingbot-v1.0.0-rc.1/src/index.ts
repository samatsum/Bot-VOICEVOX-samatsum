import { Events, MessageFlags } from 'discord.js';
import { client } from './client.js';
import { commandMap, messageCommandMap } from './commands/index.js';
import { env } from './env.js';
import { canUseBotByPermissions } from './services/access/access-service.js';
import { handleRealtimeMessage } from './services/reading/realtime-reader.js';
import { handleRealtimeMessageDelete, handleRealtimeMessageUpdate } from './services/reading/message-update-handler.js';
import { handleVoiceButton, handleVoiceSelect, isVoiceComponentCustomId } from './services/settings/voice-interactions.js';
import { handleDictionaryButton, isDictionaryComponentCustomId } from './commands/dictionary.js';
import { getVoicevoxVersion } from './services/tts/voicevox-engine.js';
import { closeDatabase, initializeDatabase, isRemoteDatabase } from './db/client.js';
import { acquireInstanceLock, getInstanceId, releaseInstanceLock, setInstanceLockLostHandler } from './db/instance-lock.js';
import { handleVoiceStateUpdate } from './services/voice/voice-state-handler.js';

const ALWAYS_AVAILABLE_COMMANDS = new Set(['access','credits']);
let shuttingDown=false;
async function shutdown(signal:string,exitCode=0){
  if(shuttingDown)return;shuttingDown=true;console.log(`Shutting down (${signal})...`);
  await releaseInstanceLock();client.destroy();await closeDatabase().catch(()=>undefined);process.exitCode=exitCode;
}
process.on('SIGINT',()=>void shutdown('SIGINT'));
process.on('SIGTERM',()=>void shutdown('SIGTERM'));

async function main(){
  try{await initializeDatabase();}catch(error){console.error('Database initialization failed. Check TURSO_DATABASE_URL / TURSO_AUTH_TOKEN and network connectivity.');console.error(error);await closeDatabase().catch(()=>undefined);process.exitCode=1;return;}
  console.log(`Database ready: ${isRemoteDatabase()?'Turso Cloud / remote':'local fallback'} (${env.tursoDatabaseUrl})`);
  const lock=await acquireInstanceLock(env.discordGuildId);
  if(!lock.ok){const age=Math.max(0,Math.round((Date.now()-lock.heartbeatAt)/1000));console.error(`Another SpeakingBot instance is active. instance=${lock.activeInstanceId}, heartbeat=${age}s ago`);console.error(`If the other PC crashed, wait about ${Math.ceil(env.instanceLockTtlMs/1000)} seconds and try again.`);await closeDatabase().catch(()=>undefined);process.exitCode=2;return;}
  console.log(`Instance lock acquired: ${getInstanceId()}`);
  setInstanceLockLostHandler(async(reason)=>{console.error(`Safety shutdown because instance lease was lost: ${reason}`);await shutdown('INSTANCE_LOCK_LOST',3);});

  client.once(Events.ClientReady,async(readyClient)=>{
    console.log(`Logged in as ${readyClient.user.tag}`);
    console.log('Phase 12.1 ready: dictionary autocomplete/history UI, settings/status, VC lifecycle, safer instance lease');
    console.log(`VOICEVOX endpoint: ${env.voicevoxBaseUrl}`);
    try{console.log(`VOICEVOX connected: version ${await getVoicevoxVersion()}`);}catch(error){console.warn('VOICEVOX is not reachable. The Bot will stay online, but TTS will fail until VOICEVOX is started.');console.warn(error);}
  });

  client.on(Events.InteractionCreate,async(interaction)=>{
    try{
      if(interaction.isAutocomplete()){
        const command=commandMap.get(interaction.commandName);if(!command?.autocomplete){await interaction.respond([]);return;}
        if(!interaction.inGuild() || !(await canUseBotByPermissions(interaction.guildId,interaction.memberPermissions))){await interaction.respond([]);return;}
        await command.autocomplete(interaction);return;
      }
      if(interaction.isChatInputCommand()){
        const command=commandMap.get(interaction.commandName);if(!command){await interaction.reply({content:'Unknown command.',flags:MessageFlags.Ephemeral});return;}
        if(!ALWAYS_AVAILABLE_COMMANDS.has(interaction.commandName)){
          if(!interaction.inGuild() || !(await canUseBotByPermissions(interaction.guildId,interaction.memberPermissions))){await interaction.reply({content:'このサーバーのSpeakingBotは現在 **admin** モードです。「サーバー管理」権限を持つユーザーだけが利用できます。',flags:MessageFlags.Ephemeral});return;}
        }
        await command.execute(interaction);return;
      }
      if(interaction.isMessageContextMenuCommand()){
        const command=messageCommandMap.get(interaction.commandName);if(!command){await interaction.reply({content:'Unknown message command.',flags:MessageFlags.Ephemeral});return;}
        if(!interaction.inGuild() || !(await canUseBotByPermissions(interaction.guildId,interaction.memberPermissions))){await interaction.reply({content:'このサーバーのSpeakingBotは現在 **admin** モードです。「サーバー管理」権限を持つユーザーだけが利用できます。',flags:MessageFlags.Ephemeral});return;}
        await command.execute(interaction);return;
      }
      if(interaction.isButton()&&isDictionaryComponentCustomId(interaction.customId)){
        if(!interaction.inGuild() || !(await canUseBotByPermissions(interaction.guildId,interaction.memberPermissions))){await interaction.reply({content:'このサーバーのSpeakingBotは現在 **admin** モードです。「サーバー管理」権限を持つユーザーだけが利用できます。',flags:MessageFlags.Ephemeral});return;}
        await handleDictionaryButton(interaction);return;
      }
      if((interaction.isStringSelectMenu()||interaction.isButton())&&isVoiceComponentCustomId(interaction.customId)){
        if(!interaction.inGuild() || !(await canUseBotByPermissions(interaction.guildId,interaction.memberPermissions))){await interaction.reply({content:'このサーバーのSpeakingBotは現在 **admin** モードです。「サーバー管理」権限を持つユーザーだけが利用できます。',flags:MessageFlags.Ephemeral});return;}
        if(interaction.isStringSelectMenu())await handleVoiceSelect(interaction);else await handleVoiceButton(interaction);return;
      }
    }catch(error){console.error('Interaction failed:',error);if(!interaction.isRepliable())return;const response={content:'操作の実行中にエラーが発生しました。',flags:MessageFlags.Ephemeral} as const;if(interaction.replied||interaction.deferred)await interaction.followUp(response).catch(()=>undefined);else await interaction.reply(response).catch(()=>undefined);}
  });
  client.on(Events.MessageCreate,(message)=>{void handleRealtimeMessage(message).catch((error)=>console.error('Realtime reading handler failed:',error));});
  client.on(Events.MessageUpdate,(_oldMessage,newMessage)=>{void handleRealtimeMessageUpdate(newMessage).catch((error)=>console.error('Message update handler failed:',error));});
  client.on(Events.MessageDelete,(message)=>{handleRealtimeMessageDelete(message);});
  client.on(Events.VoiceStateUpdate,(oldState,newState)=>{void handleVoiceStateUpdate(oldState,newState).catch((error)=>console.error('Voice state handler failed:',error));});
  client.on(Events.Error,(error)=>console.error('Discord client error:',error));

  try{await client.login(env.discordBotToken);}catch(error){await shutdown('LOGIN_FAILED',1);throw error;}
}
await main();
