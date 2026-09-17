# Discord 管理者向け導入

## Developer Portal

Guild InstallのScope:

- `bot`
- `applications.commands`

Bot → Privileged Gateway Intents:

- `MESSAGE CONTENT INTENT`: ON

## 推奨Bot権限

SpeakingBotには必要最低限として以下を許可してください。

- チャンネルを表示
- メッセージを送信
- メッセージ履歴を読む
- リアクションの追加
- ファイルを添付
- 接続
- 発言

`管理者`、`サーバー管理`、`ロールの管理`、`メッセージの管理`等の強い権限はBot自身には不要です。

チャンネル側のPermission Overrideで拒否されている場合、サーバーRole側で許可していても機能しないことがあります。

## Access Mode

導入直後は `open` です。

- `open`: 一般ユーザーも利用可能
- `admin`: 「サーバー管理」権限を持つユーザーのみ利用可能

`/access` 自体は常にサーバー管理権限持ちのみ変更できます。
