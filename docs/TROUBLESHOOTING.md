# トラブルシューティング

## `TokenInvalid`

`.env` の `DISCORD_BOT_TOKEN` を確認してください。Bot TokenとApplication IDを取り違えないでください。

## `Missing Access (50001)`

対象GuildへBotがインストールされているか、`DISCORD_GUILD_ID`が正しいか確認してください。

## `/join` がAbortError

確認順:

1. ネット回線
2. Botの「チャンネルを表示 / 接続 / 発言」
3. 同じBot Tokenを使う古いプロセスが残っていないか
4. `npm.cmd list discord.js @discordjs/voice @snazzah/davey`
5. Voice接続先VCのチャンネル固有権限

ネットワーク不安定時にはVoice handshakeがタイムアウトすることがあります。

## VOICEVOXに接続できない

VOICEVOXを起動して:

```powershell
Invoke-RestMethod http://127.0.0.1:50021/version
```

`.env` の `VOICEVOX_BASE_URL` も確認してください。

## PowerShell 5.1で日本語が文字化け

`pwsh` でPowerShell 7へ入ってから実行してください。

## `tsx` が見つからない

新しいPC/新しい展開先では:

```powershell
npm.cmd install
```

## `Another SpeakingBot instance is active`

別PC/別ターミナルでSpeakingBotが稼働中です。正常終了してから切り替えてください。強制終了後はlock timeoutまで待ちます。

## Turso `fetch failed` / timeout

インターネット接続とTursoへの443/TCPを確認してください。

```powershell
Test-NetConnection <your-db-host>.turso.io -Port 443
```

一時的なエラーならheartbeatは再試行します。長時間続く場合はBotを停止して回線/Turso状態を確認してください。

## リアクションが付かない

SpeakingBotに「リアクションの追加」権限が必要です。権限がなくても読み上げ自体は継続します。
