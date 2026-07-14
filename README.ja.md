# oh-my-auggie (OMA)

**Augment Code の auggie CLI 向けマルチエージェント・オーケストレーション。**

> このローカライズ版概要は、[正規の英語 README](README.md) と同じ検証済みコマンドを使用します。前提条件、管理対象ファイル、安全性、更新手順は英語版で管理されます。

## Quick Start

Auggie ネイティブプラグインのインストールを推奨します。

```bash
auggie plugin marketplace add r3dlex/oh-my-auggie
auggie plugin install oma@oh-my-auggie
auggie
```

Auggie 内で次を実行します。

```text
/oma:help
/oma:version
/oma:doctor
```

`/oma:help` に `/oma:*` コマンドが表示され、`/oma:doctor` が診断レポートを出力すれば成功です。

## インストールとサポート

- [プラグインかラッパーか](README.md#plugin-or-wrapper) — 製品本体は Auggie プラグインで、`oma` は任意の npm ターミナル補助ツールです。
- [前提条件](README.md#prerequisites)
- [ヘルスチェック](README.md#health-check)
- [管理対象ファイル](README.md#first-time-setup-and-managed-files)
- [安全性](README.md#safety)
- [更新](README.md#updating)
- [トラブルシューティング](README.md#troubleshooting)
- [高度なドキュメント](README.md#documentation-and-advanced-use)
- [コントリビューション](CONTRIBUTING.md) · [コミュニティ](https://discord.gg/PUwSMR9XNk) · [Apache 2.0 ライセンス](LICENSE)
