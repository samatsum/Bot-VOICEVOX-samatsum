# Windows 初回導入ガイド

このページは、Node.jsやVOICEVOXをまだインストールしていない方を対象にしています。上から順番に進めてください。

## 導入前に確認すること

必要なものは次のとおりです。

- Windows 10またはWindows 11のPC
- Discordアカウント
- Botを追加できる、自分が管理するDiscordサーバー
- ソフトをインストールできるWindowsユーザー権限
- インターネット接続

Tursoは必須ではありません。最初はローカルDBで動かし、複数PCで設定を共有したくなったときに追加できます。

## 1. Node.jsをインストール

Node.jsはSpeakingBotを動かすために必要な実行環境です。

1. ブラウザで[Node.js公式ダウンロードページ](https://nodejs.org/en/download)を開きます。
2. Windows向けのインストーラーをダウンロードします。一般的なIntel・AMD搭載PCでは `x64` の `.msi` を選びます。ARM版Windows PCの場合は `ARM64` を選びます。
3. ダウンロードした `.msi` ファイルをダブルクリックします。
4. セットアップ画面では、特別な理由がなければ初期設定のまま `Next` を進めてインストールします。
5. インストール完了後、すでに開いているコマンドプロンプトを閉じます。

スタートメニューで「コマンドプロンプト」と検索して開き、次を1行ずつ実行します。

```cmd
node --version
npm.cmd --version
```

`node --version` に `v24.17.0` 以上が表示され、`npm.cmd --version` に数字が表示されれば完了です。

`node は認識されていません` と表示された場合は、コマンドプロンプトを開き直してください。それでも直らなければNode.jsを再インストールします。

## 2. VOICEVOXをインストール

VOICEVOXは文章から音声を作るソフトです。SpeakingBotとは別にインストールし、Botの使用中は起動したままにします。

1. [VOICEVOX公式サイト](https://voicevox.hiroshiba.jp/)を開きます。
2. `ダウンロード` を選び、Windows版の案内に従ってダウンロードします。
3. CPU版・GPU版の選択肢が表示され、違いが分からない場合はCPU版を選びます。GPU版を使う場合は、公式ページの対応GPU条件を確認してください。利用規約と各キャラクターの利用条件も確認します。
4. ダウンロードしたインストーラーを起動し、画面の案内に従ってインストールします。
5. VOICEVOXを起動し、文章を入力して音声が再生できることを確認します。

VOICEVOXを起動したまま、ブラウザで次のURLを開きます。

```text
http://127.0.0.1:50021/version
```

バージョン番号が表示されれば、SpeakingBotから接続できる状態です。ページを開けない場合は、VOICEVOXが起動しているか確認してください。

## 3. Discord Botを作る

詳しい画面操作と必要権限は[Discord管理者向け設定](DISCORD_ADMIN_SETUP.md)に記載しています。先にそのページを開き、次の3つを取得してください。

| `.env` に書く名前 | 取得するもの |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Botページで取得するBot Token |
| `DISCORD_APPLICATION_ID` | General InformationにあるApplication ID |
| `DISCORD_GUILD_ID` | Botを使うDiscordサーバーのServer ID |

Bot Tokenはパスワードと同じ秘密情報です。GitHub、Discordのメッセージ、Issue、スクリーンショットへ載せないでください。

## 4. SpeakingBotをダウンロード

### 方法A: ZIPを使う

Gitを使ったことがない場合はこちらが簡単です。

1. [SpeakingBotのGitHubページ](https://github.com/samatsum/DiscordBot-VOICEVOX)を開きます。
2. 緑色の `Code` ボタンを押します。
3. `Download ZIP` を押します。
4. ダウンロードしたZIPを右クリックし、`すべて展開` を選びます。
5. 展開先を、例えば `C:\Users\あなたのユーザー名\DiscordBot-VOICEVOX` にします。

展開後、`package.json`、`README.md`、`src` フォルダが同じ階層にあることを確認してください。ZIP名のフォルダが余分に重なっている場合は、`package.json` があるフォルダを以後の作業場所にします。

### 方法B: Gitでcloneする

Gitを導入済みの場合は、コマンドプロンプトで次を実行します。

```cmd
cd /d C:\Users\あなたのユーザー名
git clone https://github.com/samatsum/DiscordBot-VOICEVOX.git
```

## 5. SpeakingBotのフォルダへ移動

コマンドプロンプトを開き、実際に保存した場所へ移動します。以下は保存先が `C:\Users\user\DiscordBot-VOICEVOX` の例です。

```cmd
cd /d C:\Users\user\DiscordBot-VOICEVOX
dir package.json
```

`package.json` が表示されれば正しい場所です。以後のnpmコマンドは、必ずこのフォルダで実行します。

プロンプトが次のようになっていれば正しい状態です。

```text
C:\Users\user\DiscordBot-VOICEVOX>
```

`C:\Users\user>` のまま `npm.cmd ci` を実行すると、`Could not read package.json` または `ENOENT` になります。その場合は、上の `cd /d` をもう一度実行してください。

## 6. `.env` を作って設定

プロジェクトフォルダで次を実行します。

```cmd
copy .env.example .env
notepad .env
```

メモ帳が開いたら、次の3か所を手順3で取得した値へ置き換えます。

```env
DISCORD_BOT_TOKEN=ここにBot Token
DISCORD_APPLICATION_ID=ここにApplication ID
DISCORD_GUILD_ID=ここにServer ID
VOICEVOX_BASE_URL=http://127.0.0.1:50021
```

入力時の注意:

- `=` の左右に空白を入れません。
- 値を引用符で囲む必要はありません。
- `your_bot_token_here` などの例示文字列を残さないでください。
- ファイル名を `.env.txt` にしないでください。上のcopyコマンドを使えば `.env` になります。
- `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` は、最初は空欄で構いません。
- 保存後、メモ帳を閉じます。

`.env` は `.gitignore` で除外されています。削除したり別PCへ移したりするときも、第三者に渡らないよう注意してください。

## 7. 依存ライブラリをインストール

プロジェクトフォルダで次を実行します。

```cmd
npm.cmd ci
```

完了すると `node_modules` フォルダが作られます。これはBotが使うライブラリの保存場所です。

- `node_modules` をGitHubへアップロードする必要はありません。
- 別PCへコピーせず、そのPCで `npm.cmd ci` を実行します。
- 削除しても、同じコマンドで再作成できます。

`found 0 vulnerabilities` と表示されれば理想的ですが、終了コードがエラーでなければ次へ進めます。

## 8. DiscordへBotを追加してコマンド登録

[Discord管理者向け設定](DISCORD_ADMIN_SETUP.md)の手順で、Botを使用するサーバーへ追加しておきます。

次に、プロジェクトフォルダで実行します。

```cmd
npm.cmd run deploy:commands
```

`Guild application commands deployed successfully.` と表示されれば登録完了です。初回と、コマンド構成が変わったアップデート時だけ実行します。

`401 Unauthorized` が表示された場合はBot Tokenを、`Unknown Guild` が表示された場合はServer IDとBotの追加先を確認してください。

## 9. Botを起動

先にVOICEVOXを起動し、そのままにします。続いてプロジェクトフォルダで実行します。

```cmd
npm.cmd run start
```

`Logged in as ...` と `VOICEVOX connected: version ...` が表示されれば起動成功です。このコマンド画面は閉じないでください。

終了するときは、コマンド画面を選択して `Ctrl+C` を押します。次回以降はVOICEVOXを起動してから `start-bot.cmd` をダブルクリックしても起動できます。

## 10. Discord上で動作確認

1. DiscordでBotがオンラインになっていることを確認します。
2. Botを追加したサーバーで `/ping` を実行します。
3. `/status` を実行し、Discord、VOICEVOX、DBの状態を確認します。
4. 自分がボイスチャンネルへ入り、`/join` を実行します。
5. `/play-test` を実行し、Discord VCでテスト音が聞こえることを確認します。
6. `/reading add` で、読み上げたいテキストチャンネルを登録します。

問題が起きた場合は[トラブルシューティング](TROUBLESHOOTING.md)を確認してください。

## 11. 2台目のPCで使う場合

2台目にもNode.js、SpeakingBot、`.env`、VOICEVOXが必要です。依存ライブラリは2台目で `npm.cmd ci` を実行して導入します。

ローカルDBでは設定をPC間共有できません。共有する場合はTursoを設定してください。同じDiscord Botを2台で同時起動しないでください。Discordコマンドが登録済みなら、2台目で `deploy:commands` を実行する必要はありません。
