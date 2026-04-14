# oh-my-auggie

<!-- Banner -->
<p align="center">
  <img src="assets/oma-banner.png" alt="oh-my-auggie Banner" width="100%"/>
</p>

<!-- Badges -->
<p align="center">

  [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)
  [![Version](https://img.shields.io/badge/version-0.3.1-blue)](https://github.com/r3dlex/oh-my-auggie)
  [![auggie](https://img.shields.io/badge/auggie-%3E%3D%200.22.0-green)](https://www.augmentcode.com)
  [![Lizenz](https://img.shields.io/badge/Lizenz-Apache%202.0-orange)](LICENSE)

</p>

> **Multi-Agent-Orchestrierung fuer [Augment Codes `auggie` CLI](https://www.augmentcode.com)** — das „oh-my-*"-Erlebnis fuer auggie.

---

## Installation

### Voraussetzungen

- `auggie` >= 0.22.0 — [Installationsdokumentation](https://www.augmentcode.com)
- `node` >= 18 ( fuer den MCP-State-Server)

### Marketplace-Installation (empfohlen)

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

Das war's. Das Plugin registriert automatisch alle Befehle, Agents, Hooks und den MCP-State-Server.

### Manuelle Installation

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

## Befehle

Sobald installiert, sind diese Slash-Befehle verfuegbar:

| Befehl | Beschreibung |
|--------|---------------|
| `/oma:autopilot` | Vollstaendige autonome Pipeline — erweitern, planen, implementieren, QA, validieren |
| `/oma:ralph` | Persistenzschleife — arbeitet weiter, bis alle Akzeptanzkriterien erfuellt sind |
| `/oma:ultrawork` | Hochdurchsatz-parallele Ausfuehrung via gleichzeitiger Subagents |
| `/oma:team` | Koordiniertes Team aus N Agents |
| `/oma:ultraqa` | QA-Zyklus: testen, verifizieren, beheben, wiederholen |
| `/oma:ralplan` | Konsensplanung mit Architect- und Critic-Pruefung |
| `/oma:plan` | Strategische Planung mit Analyst/Architect-Pruefung |
| `/oma:cancel` | Aktiven Modus abbrechen und State loeschen |
| `/oma:status` | Aktuellen Modus und State anzeigen |
| `/oma:ask <model>` | Mit einem bestimmten Modell abfragen |
| `/oma:note` | In Notizblock schreiben (Prioritaet, Arbeits, Manuell) |
| `/oma:doctor` | Installationsprobleme diagnostizieren |

### Schluesselwort-Ausloeser

Das `/oma:`-Praefix weglassen — diese werden automatisch aktiviert, wenn sie in der Konversation erkannt werden:

| Schluesselwort | Aktiviert |
|----------------|-----------|
| `autopilot` | `/oma:autopilot` |
| `ralph`, "don't stop" | `/oma:ralph` |
| `ulw`, `ultrawork` | `/oma:ultrawork` |
| `ralplan` | `/oma:ralplan` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | deslop Bereinigungspass |

<p align="center">
  <img src="assets/buddy-galaxy-dark.png" alt="OMA - Galaxy Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — parallel agents, persistent state, zero dependency overhead</em>
</p>

---

## Architektur

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 4 Subagents (v0.1): explorer, planner, executor, architect
│   ├── commands/        # 5 Befehle (v0.1): autopilot, ralph, status, cancel, help
│   ├── hooks/           # 3 Hooks: session-start, delegation-enforce, stop-gate
│   ├── rules/           # orchestration.md, enterprise.md (additiv)
│   └── mcp/
│       └── state-server.mjs   # MCP-State-Server ohne Abhaengigkeiten
├── .augment-plugin/
│   └── marketplace.json  # Auggie Marketplace-Manifest
└── e2e/
    └── oma-core-loop.bats   # 34 Integrationstests
```

**State-Dateien** (gespeichert in `.oma/` — git-ignoriert):

| Datei | Zweck |
|------|-------|
| `.oma/state.json` | Modus, aktiv, Iteration |
| `.oma/notepad.json` | Prioritaet, Arbeits, Manuell-Abschnitte |
| `.oma/task.log.json` | Architect/Executor-Urteilshistorie |

---

## Profile

| Profil | Beschreibung |
|--------|-------------|
| **Community** (Standard) | Vollstaendige Parallelisierung, keine Genehmigungstore |
| **Enterprise** | Kostenbewusste Modellweiterleitung, ADR-Anforderungen, Genehmigungstore |

Enterprise wird durch Erstellen einer `.oma/config.json` mit `{ "profile": "enterprise" }` aktiviert. Enterprise fuegt nur Regeln hinzu — es entfernt niemals Community-Funktionen.

---

## Entwicklung

```bash
# Testsuite ausfuehren
bats e2e/oma-core-loop.bats

# Hook-Skripte linten
shellcheck plugins/oma/hooks/*.sh

# Alle Manifeste validieren
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

## Sicherheit

Bitte lesen Sie unsere [Sicherheitsrichtlinie](SECURITY.md) fuer unterstuetzte Versionen und Richtlinien zur Meldung von Sicherheitsluecken.

---

## Links

| Ressource | URL |
|----------|-----|
| Augment Code | https://www.augmentcode.com |
| auggie CLI-Dokumentation | https://www.augmentcode.com/docs/cli |
| Plugin-Dokumentation | https://www.augmentcode.com/docs/cli/plugins |
| Hooks-Dokumentation | https://www.augmentcode.com/docs/cli/hooks |
| MCP-Dokumentation | https://www.augmentcode.com/docs/cli/integrations |
| Sicherheit | https://github.com/r3dlex/oh-my-auggie/blob/main/SECURITY.md |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |

---

## Sponsor

**:heart: Oh-my-auggie gefaellt es Ihnen? Erwaegen Sie, seine Entwicklung zu sponsern.**

Ihr Sponsoring finanziert direkt die Zeit und Energie, die in die Zugänglichmachung der Multi-Agent-Orchestrierung fuer jeden Entwickler auf der Augment-Code-Plattform investiert wird. Jeder Beitrag — unabhaengig von der Größe — hilft, das Projekt am Leben, reaktionsschnell und in Verbesserung zu halten.

👉 **[Auf GitHub sponsern](https://github.com/sponsors/r3dlex)**

Einmalige und wiederkehrende Optionen verfuegbar. Sponsoren werden im Projekt-README und in den Release-Notes anerkannt.

---

*oh-my-auggie ist nicht mit Augment Code affiliiert. „auggie" und „Augment Code" sind Marken ihrer jeweiligen Inhaber.*
