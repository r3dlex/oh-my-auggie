# oh-my-auggie

<!-- Banner -->
<p align="center">
  <img src="assets/oma-banner.png" alt="oh-my-auggie banner" width="100%"/>
</p>

<!-- Badges -->
<p align="center">

  [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)
  [![Version](https://img.shields.io/badge/version-0.2-blue)](https://github.com/r3dlex/oh-my-auggie)
  [![auggie](https://img.shields.io/badge/auggie-%3E%3D%200.22.0-green)](https://www.augmentcode.com)
  [![Licence](https://img.shields.io/badge/licence-Apache%202.0-orange)](LICENSE)

</p>

> **Orchestration multi-agent pour [l'interface CLI `auggie` d'Augment Code](https://www.augmentcode.com)** — l'expérience "oh-my-*" pour auggie.

---

## Installation

### Prérequis

- `auggie` >= 0.22.0 — [docs d'installation](https://www.augmentcode.com)
- `node` >= 18 (pour le serveur d'état MCP)

### Installation via le Marketplace (recommandé)

```bash
auggie plugin marketplace add r3dlex/oh-my-auggie
auggie plugin install oma@oh-my-auggie
```

C'est tout. Le plugin enregistre automatiquement toutes les commandes, agents, hooks et le serveur d'état MCP.

### Installation manuelle

```bash
git clone https://github.com/r3dlex/oh-my-auggie.git
cd oh-my-auggie
auggie plugin install --source ./plugins/oma oma@oh-my-auggie
```

<p align="center">
  <img src="assets/buddy-dark.png" alt="OMA - Dark Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — votre co-pilote multi-agent, mode dark edition</em>
</p>

---

## Commandes

Une fois installé, ces commandes slash sont disponibles :

| Commande | Description |
|----------|-------------|
| `/oma:autopilot` | Pipeline autonome complet — expansion, planification, implémentation, QA, validation |
| `/oma:ralph` | Boucle de persistance — continue à travailler jusqu'à ce que tous les critères d'acceptation soient atteints |
| `/oma:ultrawork` | Exécution parallèle à haut débit via des sous-agents concurrents |
| `/oma:team` | Équipe coordonnée de N agents |
| `/oma:ultraqa` | Bouclage QA : tester, vérifier, corriger, répéter |
| `/oma:ralplan` | Planification par consensus avec revue Architect + Critique |
| `/oma:plan` | Planification stratégique avec revue analyste/architecte |
| `/oma:cancel` | Annuler le mode actif et effacer l'état |
| `/oma:status` | Afficher le mode et l'état actuels |
| `/oma:ask <model>` | Interroger avec un modèle spécifique |
| `/oma:note` | Écrire dans le bloc-notes (priorité, travail, manuel) |
| `/oma:doctor` | Diagnostiquer les problèmes d'installation |

### Déclencheurs par mot-clé

Oubliez le préfixe `/oma:` — ceux-ci s'activent automatiquement lorsqu'ils sont détectés dans la conversation :

| Mot-clé | Active |
|---------|--------|
| `autopilot` | `/oma:autopilot` |
| `ralph`, "don't stop" | `/oma:ralph` |
| `ulw`, `ultrawork` | `/oma:ultrawork` |
| `ralplan` | `/oma:ralplan` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | passage de nettoyage deslop |

<p align="center">
  <img src="assets/buddy-galaxy-dark.png" alt="OMA - Galaxy Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — galaxy-themed, ready for any workflow</em>
</p>

---

## Architecture

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 4 sous-agents (v0.1): explorer, planner, executor, architect
│   ├── commands/        # 5 commandes (v0.1): autopilot, ralph, status, cancel, help
│   ├── hooks/           # 3 hooks : session-start, delegation-enforce, stop-gate
│   ├── rules/           # orchestration.md, enterprise.md (additif)
│   └── mcp/
│       └── state-server.mjs   # Serveur d'état MCP zero-dépendance
├── .augment-plugin/
│   └── marketplace.json  # Manifeste du marketplace Auggie
└── e2e/
    └── oma-core-loop.bats   # 34 tests d'intégration
```

**Fichiers d'état** (stockés dans `.oma/` — ignorés par git) :

| Fichier | Purpose |
|---------|---------|
| `.oma/state.json` | mode, active, iteration |
| `.oma/notepad.json` | sections priority, working, manual |
| `.oma/task.log.json` | historique des verdicts architecte/executor |

---

## Profils

| Profil | Description |
|--------|-------------|
| **Communauté** (défaut) | Plein de parallélisation, sans portes d'approbation |
| **Entreprise** | Routage de modèle conscient des coûts, exigences ADR, portes d'approbation |

L'entreprise est activée en créant `.oma/config.json` avec `{ "profile": "enterprise" }`. L'entreprise ne fait qu'*ajouter* des règles — elle ne supprime jamais les fonctionnalités de la communauté.

---

## Développement

```bash
# Exécuter la suite de tests
bats e2e/oma-core-loop.bats

# Linter les scripts de hooks
shellcheck plugins/oma/hooks/*.sh

# Valider tous les manifestes
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

## Sécurité

Veuillez consulter notre [Politique de sécurité](SECURITY.md) pour les versions supportées et les directives de signalement des vulnérabilités.

---

## Liens

| Ressource | URL |
|-----------|-----|
| Augment Code | https://www.augmentcode.com |
| docs CLI auggie | https://www.augmentcode.com/docs/cli |
| docs Plugins | https://www.augmentcode.com/docs/cli/plugins |
| docs Hooks | https://www.augmentcode.com/docs/cli/hooks |
| docs MCP | https://www.augmentcode.com/docs/cli/integrations |
| Sécurité | https://github.com/r3dlex/oh-my-auggie/blob/main/SECURITY.md |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |

---

## Sponsor

**:heart: Vous adorez oh-my-auggie ? Envisagez de sponsoriser son développement.**

Votre parrainage finance directement le temps et l'énergie investis pour rendre l'orchestration multi-agent accessible à chaque développeur sur la plateforme Augment Code. Chaque contribution — quelle que soit sa taille — aide à maintenir le projet vivant, réactif et en amélioration.

👉 **[Sponsoriser sur GitHub](https://github.com/sponsors/r3dlex)**

Options uniques et récurrentes disponibles. Les sponsors sont reconnus dans le README du projet et dans les notes de version.

---

*oh-my-auggie n'est pas affilié à Augment Code. "auggie" et "Augment Code" sont des marques déposées de leurs propriétaires respectifs.*
