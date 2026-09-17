# Bot-VOICEVOX-samatsum

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
- [VOICEVOX](https://voicevox.hiroshiba.jp/)
- Discordアカウントと、自分が管理できるDiscordサーバー
- Turso Cloud DB（複数PCで同じ設定を共有する場合。ローカルDBでも起動可能）

## セットアップ

初回導入の手順は **[Windows初回導入ガイド](docs/INSTALL_WINDOWS.md)** にまとめています。Node.jsとVOICEVOXのインストール、Discord Botの作成、設定ファイルの準備、起動確認まで、上から順番に進めてください。

既存環境を別PCへ追加する場合や、管理者から設定ファイルを受け取る場合も同じガイドを参照してください。Discord側の詳しい設定は[Discord管理者向け設定](docs/DISCORD_ADMIN_SETUP.md)に分けています。

## 普段の起動

初回セットアップ済みなら、VOICEVOXを起動してから以下だけです。

```cmd
cd /d C:\Users\あなたのユーザー名\Bot-VOICEVOX-samatsum
npm.cmd run start
```

VOICEVOXを先に起動したままにしてください。終了するときはコマンド画面で `Ctrl+C` を押します。`start-bot.cmd` をダブルクリックして起動することもできます。

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

`.env.example` は設定項目を示す公開用の見本です。実際のTokenを保存する `.env` は `.gitignore` で除外されています。作成方法と、別の管理者から安全に受け取る方法は[Windows初回導入ガイド](docs/INSTALL_WINDOWS.md#6-envファイルを準備)を確認してください。

## VOICEVOX / 音声ライブラリ

このBotはVOICEVOXを利用します。`/credits` でもクレジットを確認できます。

初版Allowlist:

- `VOICEVOX:ずんだもん`
- `VOICEVOX:四国めたん`

VOICEVOX本体および各音声ライブラリ・キャラクターの利用条件を必ず確認してください。

- VOICEVOX利用規約: https://voicevox.hiroshiba.jp/term/

## ライセンスについて

**このRCには、Bot-VOICEVOX-samatsum本体の配布ライセンスをまだ確定していません。**

GitHubをPublicにして第三者へ再利用・改変・再配布を許可したい場合は、v1.0.0公開前に `LICENSE` を選定してください。詳細は [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) を参照してください。
