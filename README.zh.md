# oh-my-auggie

<!-- Banner -->
<p align="center">
  <img src="assets/oma-banner.png" alt="oh-my-auggie banner" width="100%"/>
</p>

<!-- Badges -->
<p align="center">

  [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)
  [![版本](https://img.shields.io/badge/version-0.3.4-blue)](https://github.com/r3dlex/oh-my-auggie)
  [![auggie](https://img.shields.io/badge/auggie-%3E%3D%200.22.0-green)](https://www.augmentcode.com)
  [![许可证](https://img.shields.io/badge/license-Apache%202.0-orange)](LICENSE)

</p>

---

> **Augment Code 的 `auggie` CLI 的多智能体编排工具** — 面向 auggie 的 "oh-my-*" 体验。

---

## 安装

### 前置要求

- `auggie` >= 0.22.0 — [安装文档](https://www.augmentcode.com)
- `node` >= 18（用于 MCP 状态服务器）

### 市场安装（推荐）

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

就这样。插件会自动注册所有命令、智能体、钩子和 MCP 状态服务器。

### 手动安装

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

## 命令

安装后，以下斜杠命令将可用：

| 命令 | 描述 |
|------|------|
| `/oma:autopilot` | 全自主管道 — 扩展、计划、实施、QA、验证 |
| `/oma:ralph` | 持久化循环 — 持续工作直到所有验收标准通过 |
| `/oma:ultrawork` | 通过并发子智能体实现高吞吐并行执行 |
| `/oma:team` | N 个智能体的协调团队 |
| `/oma:ultraqa` | QA 循环：测试、验证、修复、重复 |
| `/oma:ralplan` | 通过架构师 + 评论家审查达成共识规划 |
| `/oma:plan` | 分析师/架构师审查的战略规划 |
| `/oma:cancel` | 取消活动模式并清除状态 |
| `/oma:status` | 显示当前模式和状态 |
| `/oma:ask <model>` | 使用特定模型进行查询 |
| `/oma:note` | 写入记事本（优先级、工作、手动） |
| `/oma:doctor` | 诊断安装问题 |

### 关键词触发

去掉 `/oma:` 前缀 — 以下内容在对话中被检测到时会自动激活：

| 关键词 | 激活 |
|--------|------|
| `autopilot` | `/oma:autopilot` |
| `ralph`, "don't stop" | `/oma:ralph` |
| `ulw`, `ultrawork` | `/oma:ultrawork` |
| `ralplan` | `/oma:ralplan` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | deslop 清理过程 |

<p align="center">
  <img src="assets/buddy-galaxy-dark.png" alt="OMA - Galaxy Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — parallel agents, persistent state, zero dependency overhead</em>
</p>

---

## 架构

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 4 个子智能体 (v0.1)：explorer、planner、executor、architect
│   ├── commands/        # 5 个命令 (v0.1)：autopilot、ralph、status、cancel、help
│   ├── hooks/           # 3 个钩子：session-start、delegation-enforce、stop-gate
│   ├── rules/           # orchestration.md、enterprise.md（叠加式）
│   └── mcp/
│       └── state-server.mjs   # 零依赖 MCP 状态服务器
├── .augment-plugin/
│   └── marketplace.json  # Auggie 市场清单
└── e2e/
    └── oma-core-loop.bats   # 34 个集成测试
```

**状态文件**（存储在 `.oma/` 中 — 会被 git 忽略）：

| 文件 | 用途 |
|------|------|
| `.oma/state.json` | 模式、活动、迭代 |
| `.oma/notepad.json` | 优先级、工作、手动部分 |
| `.oma/task.log.json` | 架构师/执行器裁定历史 |

---

## 配置文件

| 配置 | 描述 |
|------|------|
| **Community**（默认） | 完全并行化，无审批门控 |
| **Enterprise** | 成本感知模型路由、ADR 要求、审批门控 |

通过创建 `.oma/config.json` 并设置 `{ "profile": "enterprise" }` 来激活 Enterprise 配置。Enterprise 配置只会*添加*规则 — 永远不会移除社区功能。

---

## 开发

```bash
# 运行测试套件
bats e2e/oma-core-loop.bats

# 检查钩子脚本
shellcheck plugins/oma/hooks/*.sh

# 验证所有清单
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

## 安全

请查阅我们的[安全政策](SECURITY.md)，了解支持的版本和漏洞报告指南。

---

## 链接

| 资源 | URL |
|------|-----|
| Augment Code | https://www.augmentcode.com |
| auggie CLI 文档 | https://www.augmentcode.com/docs/cli |
| 插件文档 | https://www.augmentcode.com/docs/cli/plugins |
| 钩子文档 | https://www.augmentcode.com/docs/cli/hooks |
| MCP 文档 | https://www.augmentcode.com/docs/cli/integrations |
| 安全政策 | https://github.com/r3dlex/oh-my-auggie/blob/main/SECURITY.md |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |

---

## 赞助

**:heart: 喜欢 oh-my-auggie？考虑赞助它的开发。**

您的赞助直接为在 Augment Code 平台上让多智能体编排对每位开发者都触手可及的时间和精力提供资金支持。每一份贡献 — 无论大小 — 都有助于保持项目的活力、响应速度和持续改进。

👉 **[在 GitHub 上赞助](https://github.com/sponsors/r3dlex)**

提供一次性和定期选项。赞助商将在项目 README 和发布说明中获得认可。

---

*oh-my-auggie 与 Augment Code 没有关联。"auggie" 和 "Augment Code" 是其各自所有者的商标。*
