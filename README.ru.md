# oh-my-auggie

<!-- Banner -->
<p align="center">
  <img src="assets/oma-banner.png" alt="oh-my-auggie banner" width="100%"/>
</p>

<!-- Badges -->
<p align="center">

  [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)
  [![Версия](https://img.shields.io/badge/version-0.3.1-blue)](https://github.com/r3dlex/oh-my-auggie)
  [![auggie](https://img.shields.io/badge/auggie-%3E%3D%200.22.0-green)](https://www.augmentcode.com)
  [![Лицензия](https://img.shields.io/badge/license-Apache%202.0-orange)](LICENSE)

</p>

---

> **Мультиагентная оркестрация для CLI `auggie` от Augment Code** — опыт "oh-my-*" для auggie.

---

## Установка

### Требования

- `auggie` >= 0.22.0 — [документация по установке](https://www.augmentcode.com)
- `node` >= 18 (для MCP-сервера состояния)

### Установка через маркетплейс (рекомендуется)

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

Готово. Плагин автоматически регистрирует все команды, агенты, хуки и MCP-сервер состояния.

### Ручная установка

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

## Команды

После установки доступны следующие слэш-команды:

| Команда | Описание |
|---------|----------|
| `/oma:autopilot` | Полный автономный конвейер — расширение, планирование, реализация, QA, валидация |
| `/oma:ralph` | Цикл с сохранением состояния — продолжает работу, пока все критерии приёмки не будут выполнены |
| `/oma:ultrawork` | Высокопроизводительное параллельное выполнение через параллельные подagents |
| `/oma:team` | Координируемая команда из N агентов |
| `/oma:ultraqa` | QA-цикл: тестирование, верификация, исправление, повторение |
| `/oma:ralplan` | Планирование по консенсусу с проверкой Architect и Critic |
| `/oma:plan` | Стратегическое планирование с проверкой analyst/architect |
| `/oma:cancel` | Отменить активный режим и очистить состояние |
| `/oma:status` | Показать текущий режим и состояние |
| `/oma:ask <model>` | Запрос через указанную модель |
| `/oma:note` | Записать в блокнот (priority, working, manual) |
| `/oma:doctor` | Диагностировать проблемы установки |

### Триггеры по ключевым словам

Опустите префикс `/oma:` — они активируются автоматически при обнаружении в разговоре:

| Ключевое слово | Активирует |
|----------------|------------|
| `autopilot` | `/oma:autopilot` |
| `ralph`, "don't stop" | `/oma:ralph` |
| `ulw`, `ultrawork` | `/oma:ultrawork` |
| `ralplan` | `/oma:ralplan` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | deslop cleanup pass |

<p align="center">
  <img src="assets/buddy-galaxy-dark.png" alt="OMA - Galaxy Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — parallel agents, persistent state, zero dependency overhead</em>
</p>

---

## Архитектура

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 4 подагента (v0.1): explorer, planner, executor, architect
│   ├── commands/        # 5 команд (v0.1): autopilot, ralph, status, cancel, help
│   ├── hooks/           # 3 хука: session-start, delegation-enforce, stop-gate
│   ├── rules/           # orchestration.md, enterprise.md (аддитивные)
│   └── mcp/
│       └── state-server.mjs   # MCP-сервер состояния без зависимостей
├── .augment-plugin/
│   └── marketplace.json  # Манифест маркетплейса Auggie
└── e2e/
    └── oma-core-loop.bats   # 34 интеграционных теста
```

**Файлы состояния** (хранятся в `.oma/` — игнорируются git):

| Файл | Назначение |
|------|------------|
| `.oma/state.json` | mode, active, iteration |
| `.oma/notepad.json` | секции priority, working, manual |
| `.oma/task.log.json` | история вердиктов architect/executor |

---

## Профили

| Профиль | Описание |
|---------|----------|
| **Community** (по умолчанию) | Полная параллелизация, без блоков одобрения |
| **Enterprise** | Маршрутизация модели с учётом стоимости, требования ADR, блоки одобрения |

Enterprise активируется созданием `.oma/config.json` с `{ "profile": "enterprise" }`. Enterprise только *добавляет* правила — никогда не удаляет функции Community.

---

## Разработка

```bash
# Запустить набор тестов
bats e2e/oma-core-loop.bats

# Проверить хуки линтером
shellcheck plugins/oma/hooks/*.sh

# Валидировать все манифесты
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

## Безопасность

Пожалуйста, ознакомьтесь с нашей [Политикой безопасности](SECURITY.md) для поддерживаемых версий и рекомендаций по сообщениям об уязвимостях.

---

## Ссылки

| Ресурс | URL |
|--------|-----|
| Augment Code | https://www.augmentcode.com |
| Документация auggie CLI | https://www.augmentcode.com/docs/cli |
| Документация плагинов | https://www.augmentcode.com/docs/cli/plugins |
| Документация хуков | https://www.augmentcode.com/docs/cli/hooks |
| Документация MCP | https://www.augmentcode.com/docs/cli/integrations |
| Безопасность | https://github.com/r3dlex/oh-my-auggie/blob/main/SECURITY.md |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |

---

## Sponsor

**:heart: Нравится oh-my-auggie? Рассмотрите возможность спонсирования его разработки.**

Ваша спонсорская поддержка напрямую финансирует время и энергию, вложенные в то, чтобы сделать мультиагентную оркестрацию доступной для каждого разработчика на платформе Augment Code. Каждый вклад — независимо от размера — помогает поддерживать проект живым, отзывчивым и развивающимся.

👉 **[Sponsor on GitHub](https://github.com/sponsors/r3dlex)**

Доступны разовые и регулярные варианты. Спонсоры упоминаются в README проекта и заметках о выпусках.

---

*oh-my-auggie не связан с Augment Code. "auggie" и "Augment Code" являются торговыми марками их соответствующих владельцев.*
