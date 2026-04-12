# oh-my-auggie

<!-- Banner -->
<p align="center">
  <img src="assets/oma-banner.png" alt="oh-my-auggie バナー" width="100%"/>
</p>

<!-- Badges -->
<p align="center">

  [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)
  [![バージョン](https://img.shields.io/badge/version-0.2-blue)](https://github.com/r3dlex/oh-my-auggie)
  [![auggie](https://img.shields.io/badge/auggie-%3E%3D%200.22.0-green)](https://www.augmentcode.com)
  [![ライセンス](https://img.shields.io/badge/license-Apache%202.0-orange)](LICENSE)

</p>

---

> **Augment Codeの`auggie` CLIのためのマルチエージェントオーケストレーション** — auggieのための"oh-my-*"体験。

---

## インストール

### 前提条件

- `auggie` >= 0.22.0 — [インストールドキュメント](https://www.augmentcode.com)
- `node` >= 18（MCP状態サーバー用）

### マーケットプレイスからのインストール（推奨）

```bash
auggie plugin marketplace add r3dlex/oh-my-auggie
auggie plugin install oma@oh-my-auggie
```
Then initialize OMA in your project:

```
/oma:setup
```

Optionally configure MCP servers (adds state persistence and advanced tooling):

```
/oma:mcp-setup
```

 以上です。プラグインは自動的にすべてのコマンド、エージェント、フック、MCP状態サーバーを登録します。

### 手動インストール

```bash
git clone https://github.com/r3dlex/oh-my-auggie.git
cd oh-my-auggie
auggie plugin install --source ./plugins/oma oma@oh-my-auggie
```
Then initialize OMA in your project:

```
/oma:setup
```

Optionally configure MCP servers (adds state persistence and advanced tooling):

```
/oma:mcp-setup
```

<p align="center">
  <img src="assets/buddy-dark.png" alt="OMA - Dark Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — installed and ready. What do you want to build?</em>
</p>

---

## コマンド

インストール後、以下のスラッシュコマンドが利用可能になります：

| コマンド | 説明 |
|---------|------|
| `/oma:autopilot` | 完全自律パイプライン — 展開、計画、実装、QA、検証 |
| `/oma:ralph` | 永続化ループ — すべての受け入れ基準がパス 때까지作業を継続 |
| `/oma:ultrawork` | 並列サブエージェントによる高スループット実行 |
| `/oma:team` | Nエージェントの調整チーム |
| `/oma:ultraqa` | QAサイcling: テスト、検証、修正、繰り返し |
| `/oma:ralplan` | アーキテクト＋批評家レビューによるコンセンサス計画 |
| `/oma:plan` | アナリスト/アーキテクトレビューによる戦略的計画 |
| `/oma:cancel` | アクティブモードをキャンセルして状態をクリア |
| `/oma:status` | 現在のモードと状態を表示 |
| `/oma:ask <model>` | 特定のモデルでクエリ |
| `/oma:note` | メモ帳に書き込み（優先度、ワーク、手動） |
| `/oma:doctor` | インストール問題を診断 |

### キーワードトリガー

`/oma:`プレフィックスを省略 — これらは会話で検出されると自動的に有効になります：

| キーワード | 有効化 |
|---------|------|
| `autopilot` | `/oma:autopilot` |
| `ralph`, "don't stop" | `/oma:ralph` |
| `ulw`, `ultrawork` | `/oma:ultrawork` |
| `ralplan` | `/oma:ralplan` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | deslopクリーンアップパス |

<p align="center">
  <img src="assets/buddy-galaxy-dark.png" alt="OMA - Galaxy Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — parallel agents, persistent state, zero dependency overhead</em>
</p>

---

## アーキテクチャ

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 4サブエージェント（v0.1）: explorer, planner, executor, architect
│   ├── commands/        # 5コマンド（v0.1）: autopilot, ralph, status, cancel, help
│   ├── hooks/           # 3フック: session-start, delegation-enforce, stop-gate
│   ├── rules/           # orchestration.md, enterprise.md（追加式）
│   └── mcp/
│       └── state-server.mjs   # ゼロ依存のMCP状態サーバー
├── .augment-plugin/
│   └── marketplace.json  # Auggieマーケットプレイスマニフェスト
└── e2e/
    └── oma-core-loop.bats   # 34統合テスト
```

**状態ファイル**（`.oma/`に保存 — git無視）：

| ファイル | 目的 |
|---------|------|
| `.oma/state.json` | モード、アクティブ、反復 |
| `.oma/notepad.json` | 優先度、ワーク、手動セクション |
| `.oma/task.log.json` | アーキテクト/エグゼキュータ判定履歴 |

---

## プロファイル

| プロファイル | 説明 |
|---------|------|
| **コミュニティ**（デフォルト） | 完全並列化、承認ゲートなし |
| **エンタープライズ** | コスト認識モデルルーティング、ADR要件、承認ゲート |

エンタープライズは、`.oma/config.json`に`{ "profile": "enterprise" }`を作成することで有効になります。エンタープライズはコミュニティ機能を削除するのではなく、追加するだけです。

---

## 開発

```bash
# テストスイートを実行
bats e2e/oma-core-loop.bats

# フックスクリプトをリント
shellcheck plugins/oma/hooks/*.sh

# すべてのマニフェストを検証
node -e "
  const fs = require('fs');
  const files = [
    '.augment-plugin/marketplace.json',
    'plugins/oma/.augment-plugin/plugin.json',
    'plugins/oma/.augment-plugin/.mcp.json',
    'plugins/oma/hooks/hooks.json',
    '.claude-plugin/plugin.json'
  ];
  for (const f of files) {
    try { JSON.parse(fs.readFileSync(f)); console.log('OK: ' + f); }
    catch(e) { console.error('FAIL: ' + f + ' - ' + e.message); process.exit(1); }
  }
"
```

---

## セキュリティ

サポートされているバージョンと脆弱性報告のガイドラインについては、[セキュリティポリシー](SECURITY.md)をご確認ください。

---

## リンク

| リソース | URL |
|----------|-----|
| Augment Code | https://www.augmentcode.com |
| auggie CLIドキュメント | https://www.augmentcode.com/docs/cli |
| プラグインドキュメント | https://www.augmentcode.com/docs/cli/plugins |
| フックドキュメント | https://www.augmentcode.com/docs/cli/hooks |
| MCPドキュメント | https://www.augmentcode.com/docs/cli/integrations |
| セキュリティ | [SECURITY.md](SECURITY.md) |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |

---

## スポンサー

**:heart: oh-my-auggieを気に入っていただけましたか？開発へのスポンシングをご検討ください。**

あなたのスポンシングは、Augment Codeプラットフォーム上のすべての開発者にとってマルチエージェントオーケストレーションを可能にするために費やされた時間とエネルギーに直接充てられます。サイズに関係なく、すべての貢献はプロジェクトの存続、応答性、改善を維持するのに役立ちます。

👉 **[GitHubでスポンシング](https://github.com/sponsors/r3dlex)**

一回限りのオプションと定期購入オプションが利用可能です。スポンサーはプロジェクトREADMEとリリースノートで認知されます。

---

*oh-my-auggieはAugment Codeと提携していません。"auggie"と"Augment Code"はそれぞれの所有者の商標です。*