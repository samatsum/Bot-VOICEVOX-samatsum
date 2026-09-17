# Windows 初回導入

## 1. 必要なもの

- Node.js 24.17.0以上
- VOICEVOX
- Discord Bot Application
- 任意: PowerShell 7
- 複数PC共有を使う場合: Turso Cloud Database

確認:

```powershell
node --version
```

## 2. ファイルを配置

ZIPを任意のフォルダへ展開するか、GitHubリポジトリをcloneします。

```powershell
git clone <REPOSITORY_URL>
cd <REPOSITORY_DIRECTORY>
```

Gitを使わない場合はZIP展開でも構いません。

## 3. `.env` を作る

```powershell
Copy-Item .env.example .env
notepad .env
```

Windows PowerShellのExecution Policyにより`.ps1`が使えない場合でも、上記コマンドまたは手動コピーで問題ありません。

最低限:

```env
DISCORD_BOT_TOKEN=...
DISCORD_APPLICATION_ID=...
DISCORD_GUILD_ID=...
VOICEVOX_BASE_URL=http://127.0.0.1:50021
```

複数PC共有:

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
INSTANCE_LOCK_TTL_MS=45000
INSTANCE_HEARTBEAT_MS=15000
```

Tokenは公開しないでください。

## 4. 依存関係

```powershell
npm.cmd install
```

新しいPCでは必ず実行します。`node_modules`をPC間コピーしないでください。

## 5. Discordコマンド登録

初回、またはSlash Commandの構造が変わったアップデート時のみ:

```powershell
npm.cmd run deploy:commands
```

通常起動のたびに実行する必要はありません。

## 6. VOICEVOX確認

VOICEVOXを起動して:

```powershell
Invoke-RestMethod http://127.0.0.1:50021/version
```

PowerShell 5.1で日本語が文字化けする場合はPowerShell 7 (`pwsh`)を利用してください。

## 7. Bot起動

```powershell
npm.cmd run start
```

開発時:

```powershell
npm.cmd run dev
```

## 8. 初期確認

Discordで:

```text
/ping
/status
```

VCへ入り:

```text
/join
```

その後 `/reading add` で読み上げ対象チャンネルを設定します。

## 9. 2台目PC

2台目にも以下を準備します。

- Node.js
- 同じSpeakingBotソース
- 同じDiscord/Turso情報を持つ `.env`
- 実際に音声を出すならVOICEVOX
- `npm.cmd install`

Discordコマンドはすでに登録済みなら `deploy:commands` 不要です。
