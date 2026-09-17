# Discord 管理者向け設定

このページではDiscord Botを初めて作るところから説明します。Discord Developer Portalの画面名は変更される場合があります。

## 1. Applicationを作る

1. ブラウザで[Discord Developer Portal](https://discord.com/developers/applications)を開き、Discordへログインします。
2. `New Application` を押します。
3. 名前に `Bot-VOICEVOX-samatsum` と入力し、Applicationを作成します。
4. 左側の `General Information` を開きます。
5. `Application ID` をコピーします。これは `.env` の `DISCORD_APPLICATION_ID` に使用します。

Application IDは秘密情報ではありませんが、入力間違いを防ぐためそのままコピーしてください。

## 2. Botを作りTokenを取得

1. 左側の `Bot` を開きます。
2. Botがまだ作成されていない場合は、Botを追加するボタンを押します。
3. `Reset Token` またはTokenを表示するボタンを押します。
4. 表示されたTokenをコピーし、安全な場所へ一時保存します。
5. この値を `.env` の `DISCORD_BOT_TOKEN` に使用します。

Bot TokenはBotへログインできるパスワードです。

- GitHubへcommitしないでください。
- DiscordのメッセージやIssueへ貼らないでください。
- スクリーンショットへ写さないでください。
- 漏えいした可能性がある場合は、Developer Portalで直ちにTokenを再生成してください。

## 3. Message Content Intentを有効化

同じ `Bot` ページにある `Privileged Gateway Intents` までスクロールします。

- `MESSAGE CONTENT INTENT`: ON

変更後は保存ボタンを押します。これがOFFだと、Bot-VOICEVOX-samatsumは通常のテキストメッセージ本文を読み取れません。

## 4. Server IDを取得

1. Discordアプリを開きます。
2. 左下の歯車から `詳細設定` を開きます。
3. `開発者モード` をONにします。
4. 左側のサーバーアイコンを右クリックします。
5. `サーバーIDをコピー` を選びます。
6. コピーした数字を `.env` の `DISCORD_GUILD_ID` に使用します。

チャンネルIDやユーザーIDではなく、Botを使用するサーバー自体のIDを指定してください。

## 5. Botをサーバーへ追加

Developer Portalで対象Applicationのインストール設定を開き、サーバーへ追加するためのURLを作成します。

必要なScope:

- `bot`
- `applications.commands`

Botへ許可する推奨権限:

- チャンネルを表示
- メッセージを送信
- メッセージ履歴を読む
- リアクションの追加
- ファイルを添付
- 接続
- 発言

生成されたインストールURLをブラウザで開き、追加先のサーバーを選びます。Botを追加するには、そのサーバーで必要な管理権限を持っている必要があります。

`管理者`、`サーバー管理`、`ロールの管理`、`メッセージの管理`などの強い権限をBotへ与える必要はありません。

## 6. チャンネル権限を確認

サーバー全体で権限を許可していても、個別チャンネルのPermission Overrideで拒否されていると利用できないことがあります。

- 読み上げ対象のテキストチャンネルを表示できる
- メッセージと履歴を読める
- 応答メッセージを送信できる
- 使用するボイスチャンネルへ接続・発言できる

以上をBotのロールまたはチャンネル設定で確認してください。

## 7. `.env` へ設定

取得した3つの値は、Bot-VOICEVOX-samatsumの `.env` に次のように設定します。

```env
DISCORD_BOT_TOKEN=Botページで取得したToken
DISCORD_APPLICATION_ID=General InformationのApplication ID
DISCORD_GUILD_ID=DiscordでコピーしたServer ID
```

設定後、プロジェクトフォルダで次を実行します。

```cmd
npm.cmd run deploy:commands
```

成功すると、対象サーバーで `/ping`、`/join` などのコマンドが利用できるようになります。

## Access Mode

導入直後は `open` です。

- `open`: サーバー内の一般ユーザーも利用可能
- `admin`: 「サーバー管理」権限を持つユーザーのみ利用可能

`/access` 自体はサーバー管理権限を持つユーザーだけが変更できます。
