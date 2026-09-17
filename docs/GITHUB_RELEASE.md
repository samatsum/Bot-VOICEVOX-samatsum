# GitHub 公開・Release手順

## 1. リポジトリを準備

このリポジトリのルートをSpeakingBotのプロジェクトルートとして使用します。バージョン番号は `package.json` を正本とし、リリース単位はGit tagで管理します。

初回例:

```powershell
git init
git add .
git commit -m "chore: prepare SpeakingBot v1.0.0-rc.1"
git branch -M main
git remote add origin <REPOSITORY_URL>
git push -u origin main
```

既にclone済みなら通常のadd/commit/pushで構いません。

## 2. push前確認

```powershell
git status
```

`.env`、`node_modules/`、`data/` がコミット対象に入っていないことを確認してください。

秘密情報の文字列をソースやREADMEへ直接書いていないことも確認します。

## 3. Release Candidate tag

```powershell
git tag v1.0.0-rc.1
git push origin v1.0.0-rc.1
```

GitHub Releasesで `v1.0.0-rc.1` をPre-releaseとして作成し、ZIPを添付できます。

## 4. v1.0.0

`docs/RELEASE_CHECKLIST.md` がすべて通った後:

1. `package.json` を `1.0.0` に変更
2. CHANGELOGを更新
3. commit
4. `v1.0.0` tag
5. GitHub Release作成

## 5. プロジェクトライセンス

Public repoへ公開する前に、SpeakingBot本体をどのライセンスで配布するか決めてください。

ライセンスを付けないPublic repositoryは「自由に再利用できるOSS」という意味にはなりません。第三者へ改変・再配布を許可したい場合はMIT等の明示的ライセンスを検討してください。
