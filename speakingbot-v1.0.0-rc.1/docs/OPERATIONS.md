# 日常運用

## 通常起動

1. VOICEVOXを起動
2. SpeakingBotフォルダで:

```powershell
npm.cmd run start
```

## 正常終了

Botを動かしているターミナルで:

```text
Ctrl + C
```

正常終了時はTursoのinstance lockを解放します。

## 別PCへ切り替える

1. PC-Aを `Ctrl+C` で正常終了
2. PC-BでVOICEVOXを起動
3. PC-Bで `npm.cmd run start`
4. `/status` でDB/VOICEVOX/VC状態を確認

同じBotを同時に2台で動かすと、instance lockにより後から起動した側を拒否します。

## PCがクラッシュした場合

正常終了できなかった場合、lockは即時解除されません。デフォルトでは約45秒経過後に別PCが取得可能になります。

## Turso障害

heartbeatが一時失敗しても即時停止しません。長時間DBとの通信が途絶え、安全にlock所有権を保証できない状態では安全側に停止する設計です。

復旧後は再起動し、`/status`を確認してください。

## VOICEVOX障害

VOICEVOXが停止してもDiscord Bot自体は可能な限りオンラインを維持します。TTS要求時にDiscordへエラー通知します。

VOICEVOXを再起動後、新しい読み上げ要求で復旧を確認してください。

## Queue

- `/queue show`: 現在/待機件数
- `/skip`: 現在の1件のみ中断
- `/queue clear`: 待機分のみ破棄
- `/cancel`: 現在＋待機をすべて破棄

## 辞書バックアップ

定期的に:

```text
/dictionary export
```

でJSONを保存できます。Turso自体が正本ですが、サービス移行や誤操作対策として外部バックアップも有効です。

## Tokenローテーション

Discord Bot TokenまたはTurso Tokenが漏洩した場合:

1. 旧Tokenを無効化
2. 新Tokenを発行
3. 各PCの `.env` を更新
4. Bot再起動
5. TokenをGit履歴、Issue、Discord等へ残していないか確認
