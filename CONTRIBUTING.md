# Contributing

小規模な個人開発を前提としています。

変更時の最低確認:

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
```

Slash Command定義を変更した場合はテストGuildで:

```powershell
npm.cmd run deploy:commands
```

秘密情報をIssue、PR、commitへ含めないでください。
