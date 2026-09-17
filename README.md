# SpeakingBot

DiscordのテキストメッセージをVOICEVOXで読み上げる、Windows向けセルフホストBotです。

**現在のバージョン:** `1.0.0-rc.1`（RC版）

バージョン番号の正本は [`package.json`](package.json) です。リリースは `v1.0.0-rc.1`、`v1.0.0` のようなGit tagで管理します。

## 主な機能

- 複数テキストチャンネルのリアルタイム読み上げ
- VOICEVOX: ずんだもん / 四国めたん
- ユーザーごとの話者・スタイル・話速
- `/read on/off`
- FIFO Queue、`/skip`、`/queue show/clear`、`/cancel`
- URL / Markdown / Spoiler / Code / Emoji / 添付ファイル等の前処理
- `/speak text` による任意文章読み上げ
- `/speak message` と右クリック「読み上げる」による過去メッセージ読み上げ
- 共有辞書、変更履歴、履歴からの復元、Import / Export
- Turso/libSQLによる複数PC設定共有
- heartbeat + instance lockによる二重起動防止
- `/settings` と `/status`
- 無人VC自動退出、入退室通知、Queue待機中の編集/削除追従
- `open` / `admin` のアクセスモード

## 動作環境

- Windows 10/11
- Node.js 24.17.0 以上
- VOICEVOX
- Discord Bot Application
- Turso Cloud DB（複数PCで同じ設定を共有する場合。ローカルDBでも起動可能）

## 最短セットアップ

1. このリポジトリ/ZIPを取得します。
2. `.env.example` を `.env` にコピーして値を設定します。
3. VOICEVOXを起動します。
4. PowerShell 7またはコマンドプロンプトで次を実行します。

```powershell
npm.cmd install
npm.cmd run deploy:commands
npm.cmd run start
```

詳細は [`docs/INSTALL_WINDOWS.md`](docs/INSTALL_WINDOWS.md) を参照してください。

## 普段の起動

初回セットアップ済みなら、VOICEVOXを起動してから以下だけです。

```powershell
npm.cmd run start
```

複数PCで運用する場合は、同じBotを同時に2台で起動しないでください。Bot自身もTursoのinstance lockで二重起動を拒否します。

## 主なコマンド

| コマンド | 用途 |
| --- | --- |
| `/join` | 実行者のVCへ参加 |
| `/leave` | VCから退出 |
| `/reading add/remove/list` | リアルタイム読み上げ対象CH |
| `/voice` | 自分の話者・スタイル・話速 |
| `/read on/off/status` | 自分の自動読み上げ設定 |
| `/speak text` | 任意文章を手動読み上げ |
| `/speak message` | Discordメッセージリンクを読み上げ |
| 右クリック → アプリ → 読み上げる | 選択したメッセージを読み上げ |
| `/skip` | 現在の1件をスキップ |
| `/queue show/clear` | Queue確認 / 待機分削除 |
| `/cancel` | 現在再生＋待機Queueを全キャンセル |
| `/dictionary ...` | 共有辞書 |
| `/settings ...` | サーバー共通設定 |
| `/status` | Discord / VOICEVOX / DB / VC / Queue状態 |
| `/play-test` | Discord VCへの音声再生確認 |
| `/access ...` | open/adminモード |
| `/credits` | 音声クレジット |

## ドキュメント

- [Windows初回導入](docs/INSTALL_WINDOWS.md)
- [Discord管理者向け導入](docs/DISCORD_ADMIN_SETUP.md)
- [日常運用](docs/OPERATIONS.md)
- [アップデート](docs/UPGRADE.md)
- [トラブルシューティング](docs/TROUBLESHOOTING.md)
- [セキュリティ](docs/SECURITY.md)
- [GitHub公開・Release手順](docs/GITHUB_RELEASE.md)
- [v1.0.0リリースチェック](docs/RELEASE_CHECKLIST.md)
- [構成概要](docs/ARCHITECTURE.md)

## 秘密情報

以下をGitHub・Discord・Issue・スクリーンショットへ載せないでください。

- `DISCORD_BOT_TOKEN`
- `TURSO_AUTH_TOKEN`
- `.env`

`.env` は `.gitignore` で除外されています。

## VOICEVOX / 音声ライブラリ

このBotはVOICEVOXを利用します。`/credits` でもクレジットを確認できます。

初版Allowlist:

- `VOICEVOX:ずんだもん`
- `VOICEVOX:四国めたん`

VOICEVOX本体および各音声ライブラリ・キャラクターの利用条件を必ず確認してください。

- VOICEVOX利用規約: https://voicevox.hiroshiba.jp/term/

## ライセンスについて

**このRCには、SpeakingBot本体の配布ライセンスをまだ確定していません。**

GitHubをPublicにして第三者へ再利用・改変・再配布を許可したい場合は、v1.0.0公開前に `LICENSE` を選定してください。詳細は [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) を参照してください。
