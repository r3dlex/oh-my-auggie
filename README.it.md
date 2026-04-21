# oh-my-auggie

<!-- Banner -->
<p align="center">
  <img src="assets/oma-banner.png" alt="oh-my-auggie banner" width="100%"/>
</p>

<!-- Badges -->
<p align="center">

  [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)
  [![Version](https://img.shields.io/badge/version-0.3.4-blue)](https://github.com/r3dlex/oh-my-auggie)
  [![auggie](https://img.shields.io/badge/auggie-%3E%3D%200.22.0-green)](https://www.augmentcode.com)
  [![License](https://img.shields.io/badge/license-Apache%202.0-orange)](LICENSE)

</p>

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
Then initialize OMA in your project:

```
/oma:setup
```

Optionally configure MCP servers (adds state persistence and advanced tooling):

```
/oma:mcp-setup
```

Fatto. Il plugin registra automaticamente tutti i comandi, gli agenti, gli hook e il server di stato MCP.

### Installazione Manuale

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

<p align="center">
  <img src="assets/buddy-galaxy-dark.png" alt="OMA - Galaxy Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — parallel agents, persistent state, zero dependency overhead</em>
</p>

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

## Sicurezza

Consulta la nostra [Politica di Sicurezza](SECURITY.md) per le versioni supportate e le linee guida per la segnalazione di vulnerabilità.

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
