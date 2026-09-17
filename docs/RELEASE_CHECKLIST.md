# v1.0.0 リリースチェック

このチェックを完了したら `1.0.0-rc.1` から `1.0.0` へ昇格します。

## クリーンインストール

- [ ] 新しいWindows PCまたはクリーンなフォルダで導入できる
- [ ] `npm.cmd ci` が成功する
- [ ] `.env.example` だけを見て設定可能
- [ ] `npm.cmd run deploy:commands` が成功する
- [ ] `npm.cmd run start` が成功する

## Discord / Voice

- [ ] `/ping`
- [ ] `/join` / `/leave`
- [ ] リアルタイム読み上げ
- [ ] 複数reading channel
- [ ] 無人VC自動退出
- [ ] 一時的Voice切断から復旧
- [ ] 意図的切断で勝手に戻らない
- [ ] 入退室通知ON/OFF

## Queue

- [ ] FIFO
- [ ] `/skip`
- [ ] `/queue show`
- [ ] `/queue clear`
- [ ] `/cancel`
- [ ] 全体上限50
- [ ] ユーザー上限10
- [ ] 編集/削除が待機Queueへ反映

## TTS / Text Processor

- [ ] VOICEVOX停止時にDiscordへエラー
- [ ] VOICEVOX復旧後にBot再起動なしで再利用可能
- [ ] URL / Markdown / spoiler / code / emoji / attachment
- [ ] 300文字制限または設定値
- [ ] `;` 除外
- [ ] PCごとの話者/style差異フォールバック

## User settings

- [ ] `/voice`
- [ ] 話者 / style / speed
- [ ] プレビュー
- [ ] `/read on/off/status`
- [ ] 再起動後も維持
- [ ] PC切替後も維持

## On-demand

- [ ] `/speak text`
- [ ] `/speak message`
- [ ] 右クリック「読み上げる」
- [ ] speaker/style/speed override
- [ ] 他Guildリンク拒否
- [ ] 閲覧権限のないメッセージ拒否

## Dictionary

- [ ] add / edit / remove
- [ ] list / search / test
- [ ] edit/remove/history Autocomplete
- [ ] historyの復元ボタン
- [ ] 削除済み単語の履歴から復元
- [ ] export / import
- [ ] 操作者/日時/履歴保持
- [ ] realtime と `/speak` の両方に適用

## DB / Multi-PC

- [ ] PC-A設定 → PC-Bへ共有
- [ ] 二重起動拒否
- [ ] 正常終了後は即時切替
- [ ] 強制終了後はTTL経過で切替
- [ ] heartbeat一時失敗で即時二重起動しない
- [ ] lock ownership喪失時に安全停止

## Access / Permission

- [ ] 初期open
- [ ] `/access mode admin`
- [ ] 一般ユーザー制限
- [ ] `/access`変更はサーバー管理者のみ
- [ ] `/credits`確認
- [ ] BotにAdministrator不要

## Distribution

- [ ] README確認
- [ ] INSTALL_WINDOWS確認
- [ ] OPERATIONS確認
- [ ] TROUBLESHOOTING確認
- [ ] `.env` がZIP/Gitに含まれていない
- [ ] 実Tokenがソース/履歴に含まれていない
- [ ] VOICEVOX/各音声ライブラリの規約を再確認
- [ ] Bot-VOICEVOX-samatsum本体の配布ライセンスを決定
- [ ] `package.json` versionを1.0.0へ変更
- [ ] CHANGELOG更新
- [ ] `v1.0.0` tag作成
