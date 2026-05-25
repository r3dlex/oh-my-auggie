# oh-my-auggie (oma)

> **Sister projects:** [oh-my-claudecode (OMC)](https://github.com/Yeachan-Heo/oh-my-claudecode) | [oh-my-codex (OMX)](https://github.com/Yeachan-Heo/oh-my-codex) | [oh-my-githubcopilot (OMP)](https://github.com/r3dlex/oh-my-githubcopilot) | [oh-my-gemini (OMG)](https://github.com/r3dlex/oh-my-gemini) | [oh-my-auggie (OMA)](https://github.com/r3dlex/oh-my-auggie)

**Augment Code auggie CLI를 위한 멀티 에이전트 오케스트레이션. 학습 곡선은 거의 없습니다.**

_Augment Code auggie CLI를 새로 익히지 말고 oma를 사용하세요._

> 이 현지화 README는 통합 OMA 템플릿을 따릅니다. 명령은 바로 복사할 수 있도록 그대로 유지했습니다.

[English](README.md) • [Get Started](#quick-start) • [CLI Reference](#cli-reference) • [Workflows](#workflows) • [Discord](https://discord.gg/PUwSMR9XNk)

---

## 왜 oma인가?

Every software team juggles implementation, architecture, security review, testing, and DevOps — all simultaneously. `oma` orchestrates specialized agents so every dimension gets expert attention, in parallel, without you herding cats.

OMA meets Auggie where it already works: marketplace plugins, `/oma:*` slash commands, and optional `oma`/`super-oma` shell wrappers. It preserves Augment Code's agentic coding loop while adding durable state, team orchestration, HUD visibility, and workflow skills for planning, execution, review, and QA.

---

## Quick Start

```bash
npm install -g oh-my-auggie
oma setup --scope project
oma
```

After setup, restart your CLI for the `/` commands to appear.

```bash
oma doctor              # check prerequisites
oma team run --task "..." --workers 2   # parallel work
oma hud --watch         # live status
```

Auggie marketplace install:

```bash
auggie plugin marketplace add r3dlex/oh-my-auggie
auggie plugin install oma@oh-my-auggie
/oma:setup
```

---

## 기능

| Feature | Description |
|---------|-------------|
| **Specialized Agents** | 20+ agents: analyst, architect, executor, debugger, critic, verifier, test-engineer, writer, and more |
| **Parallel Team Mode** | tmux-based multi-worker orchestration with shared task state |
| **Workflow Skills** | 36+ built-in skills — plan, deep-interview, ralph, autopilot, ultrawork, code-review, and more |
| **Persistent Hooks** | Automatic tool tracking, project memory, session management |
| **Real-time HUD** | Live status overlay showing agents, costs, and progress |
| **CI/CD Ready** | Verification gates, test integration, release workflows |
| **Multilingual** | README in 12 languages |

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `oma` | Launch interactive session |
| `oma setup` | Configure Augment Code auggie integration |
| `oma doctor` | Check prerequisites and fix issues |
| `oma team run` | Start parallel team execution |
| `oma team status` | Check team progress |
| `oma hud --watch` | Show live status overlay |
| `oma trace` | Show execution trace |

See [SPEC.md](SPEC.md) for all commands.

---

## 워크플로

`oma` ships execution-mode and planning-mode workflows as built-in skills.

### Execution Modes

| Skill | Purpose |
|-------|---------|
| `$autopilot` | Idea → working code end-to-end |
| `$team` | N coordinated agents on a shared task |
| `$ralph` | Persistent completion loop until verified |
| `$ultrawork` | Maximum parallel throughput execution |
| `$ultraqa` | QA cycling until goals are met |

### Planning Modes

| Skill | Purpose |
|-------|---------|
| `$plan` | Strategic planning with optional interviews |
| `$deep-interview` | Socratic clarification before execution |
| `$ralplan` | Consensus planning with Architect + Critic review |

### Utility Modes

| Skill | Purpose |
|-------|---------|
| `$code-review` | Comprehensive code review |
| `$security-review` | Security audit |
| `$doctor` | Diagnose and fix installation issues |
| `$trace` | Agent flow trace and summary |
| `$note` | Save session notes |
| `$wiki` | Persistent project wiki |

---

## 팀 모드

```bash
oma team run --task "review src/ for reliability gaps" --workers 4
oma team status --team oma --json
oma team resume --team oma
oma team shutdown --team oma --force
```

OMA team mode is tmux-first when a terminal is available, stores durable state under `.oma/`, and keeps `/oma:team`, `oma team`, and `super-oma` aligned so Auggie users can resume or inspect runs without losing context.

---

## 문서

- [Full Documentation](SPEC.md)
- [Contributing](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)

---

## 라이선스

`oma` is open source under the [Apache License 2.0](LICENSE).

---

## 스폰서

If `oma` saves you time, consider [sponsoring the project](https://github.com/sponsors/r3dlex) ❤️
