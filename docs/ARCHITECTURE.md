# 構成概要

```text
Discord
  ├─ Slash Commands / Context Menu
  ├─ MessageCreate / Update / Delete
  └─ VoiceStateUpdate
          │
          v
SpeakingBot (Node.js / TypeScript)
  ├─ Access Service
  ├─ Settings Service
  ├─ Text Processor
  ├─ Dictionary Service
  ├─ Reading Queue
  ├─ Voice Connection / Playback
  └─ Instance Lock
          │
          ├────────> VOICEVOX (localhost:50021)
          │
          └────────> Turso / libSQL
```

## 正本

Turso利用時、以下の永続設定はDBを正本とします。

- Access Mode
- reading channel
- user voice settings
- `/read` state
- guild settings
- dictionary / history
- instance lock

Discordメッセージ本文や生成音声は原則として永続保存しません。

## TTS

VOICEVOXからWAVを取得し、FFmpeg/Opus経路でDiscord Voiceへ再生します。

## Single Guild

初版は1つのDiscord Guildを対象とする設計です。`DISCORD_GUILD_ID`を指定し、Guild Commandとしてデプロイします。
