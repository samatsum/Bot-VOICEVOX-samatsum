# アップデート手順

## 基本

アップデート前にBotを正常終了してください。

```text
Ctrl + C
```

新しいソースを配置したら:

```powershell
npm.cmd install
```

Slash Commandが追加・削除・引数変更されたリリースでは:

```powershell
npm.cmd run deploy:commands
```

その後:

```powershell
npm.cmd run start
```

## `.env`

新バージョンの `.env.example` と現在の `.env` を比較してください。

`.env`を新しいZIPで上書きしないでください。

## DBマイグレーション

現行版では必要なスキーマ変更を起動時に自動適用します。アップデート前に辞書Export等のバックアップを推奨します。

## ロールバック

重大な不具合時:

1. Botを停止
2. 直前のZIP/commitへ戻す
3. `npm.cmd install`
4. 必要なら旧版のコマンドを `deploy:commands`
5. 起動

DBスキーマが後方互換でないリリースでは個別Release Noteに従ってください。
