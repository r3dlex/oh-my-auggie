# oh-my-auggie

<p align="center">
  <img src="assets/oh-my-auggie.svg" alt="oh-my-auggie logo" width="300"/>
</p>

> **Orchestrazione multi-agente per [CLI `auggie` di Augment Code](https://www.augmentcode.com)** — l'esperienza "oh-my-*" per auggie.

[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)

---

## Installazione

### Prerequisiti

- `auggie` >= 0.22.0 — [documentazione di installazione](https://www.augmentcode.com)
- `node` >= 18 (per il server di stato MCP)

### Installazione da Marketplace (consigliata)

```bash
auggie plugin marketplace add r3dlex/oh-my-auggie
auggie plugin install oma@oh-my-auggie
```

Fatto. Il plugin registra automaticamente tutti i comandi, gli agenti, gli hook e il server di stato MCP.

### Installazione Manuale

```bash
git clone https://github.com/r3dlex/oh-my-auggie.git
cd oh-my-auggie
auggie plugin install --source ./plugins/oma oma@oh-my-auggie
```

---

## Comandi

Una volta installato, sono disponibili questi comandi slash:

| Comando | Descrizione |
|---------|-------------|
| `/oma:autopilot` | Pipeline autonoma completa — espandi, pianifica, implementa, QA, valida |
| `/oma:ralph` | Loop di persistenza — continua a lavorare finché tutti i criteri di accettazione non passano |
| `/oma:ultrawork` | Esecuzione parallela ad alto rendimento tramite subagenti concurrenti |
| `/oma:team` | Team coordinato di N agenti |
| `/oma:ultraqa` | Ciclo QA: testa, verifica, correggi, ripeti |
| `/oma:ralplan` | Pianificazione consensuale con revisione Architect + Critic |
| `/oma:plan` | Pianificazione strategica con revisione analyst/architect |
| `/oma:cancel` | Cancella la modalità attiva e pulisce lo stato |
| `/oma:status` | Mostra la modalità e lo stato correnti |
| `/oma:ask <model>` | Interroga con un modello specifico |
| `/oma:note` | Scrivi sul notepad (priority, working, manual) |
| `/oma:doctor` | Diagnostica i problemi di installazione |

### Trigger per Keyword

Ometti il prefisso `/oma:` — questi si attivano automaticamente quando rilevati nella conversazione:

| Keyword | Attiva |
|---------|--------|
| `autopilot` | `/oma:autopilot` |
| `ralph`, "don't stop" | `/oma:ralph` |
| `ulw`, `ultrawork` | `/oma:ultrawork` |
| `ralplan` | `/oma:ralplan` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | passata di pulizia deslop |

---

## Architettura

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 4 subagenti (v0.1): explorer, planner, executor, architect
│   ├── commands/        # 5 comandi (v0.1): autopilot, ralph, status, cancel, help
│   ├── hooks/           # 3 hook: session-start, delegation-enforce, stop-gate
│   ├── rules/           # orchestration.md, enterprise.md (additivi)
│   └── mcp/
│       └── state-server.mjs   # Server di stato MCP zero-dependencies
├── .augment-plugin/
│   └── marketplace.json  # Manifesto marketplace di Auggie
└── e2e/
    └── oma-core-loop.bats   # 34 test di integrazione
```

**File di stato** (memorizzati in `.oma/` — ignorati da git):

| File | Scopo |
|------|-------|
| `.oma/state.json` | modalità, attivo, iterazione |
| `.oma/notepad.json` | sezioni priority, working, manual |
| `.oma/task.log.json` | storico dei verdetti architect/executor |

---

## Profili

| Profilo | Descrizione |
|---------|-------------|
| **Community** (predefinito) | Parallelizzazione completa, nessun gate di approvazione |
| **Enterprise** | Routing del modello consapevole dei costi, requisiti ADR, gate di approvazione |

Enterprise si attiva creando `.oma/config.json` con `{ "profile": "enterprise" }`. Enterprise aggiunge solo regole — non rimuove mai le funzionalità community.

---

## Sviluppo

```bash
# Esegui la test suite
bats e2e/oma-core-loop.bats

# Lint degli hook script
shellcheck plugins/oma/hooks/*.sh

# Valida tutti i manifest
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

## Link

| Risorsa | URL |
|---------|-----|
| Augment Code | https://www.augmentcode.com |
| Documentazione CLI auggie | https://www.augmentcode.com/docs/cli |
| Documentazione plugin | https://www.augmentcode.com/docs/cli/plugins |
| Documentazione Hooks | https://www.augmentcode.com/docs/cli/hooks |
| Documentazione MCP | https://www.augmentcode.com/docs/cli/integrations |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |

---

## Sponsor

**:heart: Ti piace oh-my-auggie? Considera di sponsorizzarne lo sviluppo.**

Il tuo sponsorship finanzia direttamente il tempo e l'energia dedicati a rendere l'orchestrazione multi-agente accessibile a ogni sviluppatore sulla piattaforma Augment Code. Ogni contributo — senza regard alla dimensione — aiuta a mantenere il progetto vivo, reattivo e in miglioramento.

👉 **[Sponsorizza su GitHub](https://github.com/sponsors/r3dlex)**

Disponibili opzioni una tantum e ricorrenti. Gli sponsor vengono riconosciuti nel README del progetto e nelle note di release.

---

*oh-my-auggie non è affiliato con Augment Code. "auggie" e "Augment Code" sono marchi registrati dei rispettivi proprietari.*
