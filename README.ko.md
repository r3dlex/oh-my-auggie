# oh-my-auggie

<!-- Banner -->
<p align="center">
  <img src="assets/oma-banner.png" alt="oh-my-auggie 배너" width="100%"/>
</p>

<!-- Badges -->
<p align="center">

  [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)
  [![버전](https://img.shields.io/badge/version-0.3.4-blue)](https://github.com/r3dlex/oh-my-auggie)
  [![auggie](https://img.shields.io/badge/auggie-%3E%3D%200.22.0-green)](https://www.augmentcode.com)
  [![라이선스](https://img.shields.io/badge/license-Apache%202.0-orange)](LICENSE)

</p>

---

> **[Augment Code의 `auggie` CLI](https://www.augmentcode.com)를 위한 멀티 에이전트 오케스트레이션** — auggie를 위한 "oh-my-*" 경험을 제공합니다.

---

## 설치

### 필수 조건

- `auggie` >= 0.22.0 — [설치 문서](https://www.augmentcode.com)
- `node` >= 18 (MCP 상태 서버용)

### 마켓플레이스 설치 (권장)

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

설치 완료. 플러그인이 모든 명령, 에이전트, 훅 및 MCP 상태 서버를 자동으로 등록합니다.

### 수동 설치

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

## 명령어

설치되면 다음 슬래시 명령어를 사용할 수 있습니다:

| 명령어 | 설명 |
|--------|------|
| `/oma:autopilot` | 완전한 자율 파이프라인 — 확장, 계획, 구현, QA, 검증 |
| `/oma:ralph` | 지속 루프 — 모든 수락 기준이 통과할 때까지 계속 작업 |
| `/oma:ultrawork` | 동시 서브에이전트를 통한 고처리량 병렬 실행 |
| `/oma:team` | N명의 에이전트 조정 팀 |
| `/oma:ultraqa` | QA 사이클: 테스트, 검증, 수정, 반복 |
| `/oma:ralplan` | 아키텍트 + 비평가 리뷰를 통한 합의 계획 |
| `/oma:plan` | 분석가/아키텍트 리뷰가 있는 전략적 계획 |
| `/oma:cancel` | 활성 모드 취소 및 상태 초기화 |
| `/oma:status` | 현재 모드 및 상태 표시 |
| `/oma:ask <model>` | 특정 모델로 쿼리 |
| `/oma:note` | 메모장에 작성 (우선순위, 작업, 수동) |
| `/oma:doctor` | 설치 문제 진단 |

### 키워드 트리거

`/oma:` 접두사를 생략해도 됩니다 — 대화에서 감지되면 자동으로 활성화됩니다:

| 키워드 | 활성화 |
|--------|--------|
| `autopilot` | `/oma:autopilot` |
| `ralph`, "don't stop" | `/oma:ralph` |
| `ulw`, `ultrawork` | `/oma:ultrawork` |
| `ralplan` | `/oma:ralplan` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | deslop 정리 패스 |

<p align="center">
  <img src="assets/buddy-galaxy-dark.png" alt="OMA - Galaxy Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — parallel agents, persistent state, zero dependency overhead</em>
</p>

---

## 아키텍처

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 4개의 서브에이전트 (v0.1): explorer, planner, executor, architect
│   ├── commands/        # 5개의 명령어 (v0.1): autopilot, ralph, status, cancel, help
│   ├── hooks/           # 3개의 훅: session-start, delegation-enforce, stop-gate
│   ├── rules/           # orchestration.md, enterprise.md (추가 방식)
│   └── mcp/
│       └── state-server.mjs   # 의존성 없는 MCP 상태 서버
├── .augment-plugin/
│   └── marketplace.json  # Auggie 마켓플레이스 매니페스트
└── e2e/
    └── oma-core-loop.bats   # 34개의 통합 테스트
```

**상태 파일** (`.oma/`에 저장 — git 무시됨):

| 파일 | 목적 |
|------|------|
| `.oma/state.json` | 모드, 활성 상태, 반복 횟수 |
| `.oma/notepad.json` | 우선순위, 작업, 수동 섹션 |
| `.oma/task.log.json` | 아키텍트/실행자 판정 역사 |

---

## 프로필

| 프로필 | 설명 |
|--------|------|
| **Community** (기본) | 완전한 병렬화, 승인 게이트 없음 |
| **Enterprise** | 비용 인식 모델 라우팅, ADR 요구사항, 승인 게이트 |

Enterprise는 `.oma/config.json`에 `{ "profile": "enterprise" }`를 생성하여 활성화됩니다. Enterprise는 커뮤니티 기능을 제거하지 않고 *추가만* 합니다.

---

## 개발

```bash
# 테스트 스위트 실행
bats e2e/oma-core-loop.bats

# 훅 스크립트 린트
shellcheck plugins/oma/hooks/*.sh

# 모든 매니페스트 검증
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

## 보안

지원되는 버전과 취약점 보고 가이드라인은 [보안 정책](SECURITY.md)을 참고하세요.

---

## 링크

| 리소스 | URL |
|--------|-----|
| Augment Code | https://www.augmentcode.com |
| auggie CLI 문서 | https://www.augmentcode.com/docs/cli |
| 플러그인 문서 | https://www.augmentcode.com/docs/cli/plugins |
| 훅 문서 | https://www.augmentcode.com/docs/cli/hooks |
| MCP 문서 | https://www.augmentcode.com/docs/cli/integrations |
| 보안 | [SECURITY.md](SECURITY.md) |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |

---

## 스폰서

**:heart: oh-my-auggie를 사랑하시나요? 개발을 스폰서를 고려해 보세요.**

여러분의 스폰서십은 Augment Code 플랫폼의 모든 개발자에게 멀티 에이전트 오케스트레이션을Accessible하게 만드는 데 투입되는 시간과 에너지를 직접 지원합니다. 크기에 상관없이 모든 기여는 프로젝트를 생존하고, 반응灵敏하며, 개선되게 유지하는 데 도움이 됩니다.

👉 **[GitHub에서 스폰서하기](https://github.com/sponsors/r3dlex)**

일회성 및 정기 결제 옵션을 제공합니다. 스폰서는 프로젝트 README와 릴리스 노트에 인정받습니다.

---

*oh-my-auggie는 Augment Code와 제휴하지 않습니다. "auggie" 및 "Augment Code"는 각 소유자의 상표입니다.*
