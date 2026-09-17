import { Client, GatewayIntentBits, Partials } from 'discord.js';

// - Guilds: Slash Commandなど、サーバー上の基本機能
// - GuildVoiceStates: Botと利用者のVC参加状態を扱う
// - GuildMessages: サーバー内の新規メッセージを受け取る
// - MessageContent: メッセージ本文を読み上げる
//
// MessageContent は Discord Developer Portal の
// Bot > Privileged Gateway Intents でも有効化する必要があります。
export const client = new Client({
  partials: [Partials.Message, Partials.Channel],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
