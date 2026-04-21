# oh-my-auggie

<!-- Banner -->
<p align="center">
  <img src="assets/oma-banner.png" alt="oh-my-auggie banner" width="100%"/>
</p>

<!-- Badges -->
<p align="center">

  [![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=r3dlex&logo=GitHub%20Sponsors&color=success)](https://github.com/sponsors/r3dlex)
  [![Versão](https://img.shields.io/badge/version-0.3.4-blue)](https://github.com/r3dlex/oh-my-auggie)
  [![auggie](https://img.shields.io/badge/auggie-%3E%3D%200.22.0-green)](https://www.augmentcode.com)
  [![Licença](https://img.shields.io/badge/license-Apache%202.0-orange)](LICENSE)

</p>

---

> **Orquestração multi-agente para o CLI `auggie` da [Augment Code](https://www.augmentcode.com)** — a experiência "oh-my-*" para o auggie.

---

## Instalação

### Pré-requisitos

- `auggie` >= 0.22.0 — [documentação de instalação](https://www.augmentcode.com)
- `node` >= 18 (para o servidor de estado MCP)

### Instalação via Marketplace (recomendado)

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

É isso. O plugin registra automaticamente todos os comandos, agentes, hooks e o servidor de estado MCP.

### Instalação Manual

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

## Comandos

Após instalados, estes comandos de barra estão disponíveis:

| Comando | Descrição |
|---------|-----------|
| `/oma:autopilot` | Pipeline autônomo completo — expandir, planejar, implementar, QA, validar |
| `/oma:ralph` | Loop de persistência — continua trabalhando até que todos os critérios de aceite passem |
| `/oma:ultrawork` | Execução paralela de alto rendimento via subagentes concorrentes |
| `/oma:team` | Equipe coordenada de N agentes |
| `/oma:ultraqa` | Ciclo de QA: testar, verificar, corrigir, repetir |
| `/oma:ralplan` | Planejamento por consenso com revisão do Arquiteto + Crítico |
| `/oma:plan` | Planejamento estratégico com revisão de analista/arquiteto |
| `/oma:cancel` | Cancelar modo ativo e limpar estado |
| `/oma:status` | Mostrar modo e estado atual |
| `/oma:ask <model>` | Consultar com um modelo específico |
| `/oma:note` | Escrever no notepad (prioridade, trabalho, manual) |
| `/oma:doctor` | Diagnosticar problemas de instalação |

### Gatilhos por Palavra-chave

Dispense o prefixo `/oma:` — estes são ativados automaticamente quando detectados na conversa:

| Palavra-chave | Ativa |
|--------------|-------|
| `autopilot` | `/oma:autopilot` |
| `ralph`, "don't stop" | `/oma:ralph` |
| `ulw`, `ultrawork` | `/oma:ultrawork` |
| `ralplan` | `/oma:ralplan` |
| `canceloma` | `/oma:cancel` |
| `deslop`, "anti-slop" | passagem de limpeza deslop |

<p align="center">
  <img src="assets/buddy-galaxy-dark.png" alt="OMA - Galaxy Theme" width="300" style="border-radius:12px;"/>
</p>

<p align="center">
  <em>OMA — parallel agents, persistent state, zero dependency overhead</em>
</p>

---

## Arquitetura

```
oh-my-auggie/
├── plugins/oma/
│   ├── agents/          # 4 subagentes (v0.1): explorer, planner, executor, architect
│   ├── commands/        # 5 comandos (v0.1): autopilot, ralph, status, cancel, help
│   ├── hooks/           # 3 hooks: session-start, delegation-enforce, stop-gate
│   ├── rules/           # orchestration.md, enterprise.md (aditivos)
│   └── mcp/
│       └── state-server.mjs   # Servidor de estado MCP sem dependências
├── .augment-plugin/
│   └── marketplace.json  # Manifesto do marketplace do Auggie
└── e2e/
    └── oma-core-loop.bats   # 34 testes de integração
```

**Arquivos de estado** (armazenados em `.oma/` — ignorados pelo git):

| Arquivo | Propósito |
|---------|-----------|
| `.oma/state.json` | modo, ativo, iteração |
| `.oma/notepad.json` | seções de prioridade, trabalho e manual |
| `.oma/task.log.json` | histórico de veredito do arquiteto/executor |

---

## Perfis

| Perfil | Descrição |
|--------|-----------|
| **Community** (padrão) | Paralelização total, sem portões de aprovação |
| **Enterprise** | Roteamento de modelo consciente de custos, requisitos de ADR, portões de aprovação |

O Enterprise é ativado criando `.oma/config.json` com `{ "profile": "enterprise" }`. Enterprise apenas *adiciona* regras — nunca remove funcionalidades da comunidade.

---

## Desenvolvimento

```bash
# Executar o conjunto de testes
bats e2e/oma-core-loop.bats

# Verificar scripts de hook
shellcheck plugins/oma/hooks/*.sh

# Validar todos os manifestos
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

## Segurança

Por favor, consulte nossa [Política de Segurança](SECURITY.md) para versões suportadas e diretrizes de relatórios de vulnerabilidades.

---

## Links

| Recurso | URL |
|---------|-----|
| Augment Code | https://www.augmentcode.com |
| Documentação do CLI auggie | https://www.augmentcode.com/docs/cli |
| Documentação de Plugins | https://www.augmentcode.com/docs/cli/plugins |
| Documentação de Hooks | https://www.augmentcode.com/docs/cli/hooks |
| Documentação do MCP | https://www.augmentcode.com/docs/cli/integrations |
| Segurança | https://github.com/r3dlex/oh-my-auggie/blob/main/SECURITY.md |
| oh-my-auggie | https://github.com/r3dlex/oh-my-auggie |

---

## Sponsor

**:heart: Gosta do oh-my-auggie? Considere patrocinar seu desenvolvimento.**

Seu patrocínio financia diretamente o tempo e energia dedicados a tornar a orquestração multi-agente acessível a todos os desenvolvedores na plataforma Augment Code. Cada contribuição — não importa o tamanho — ajuda a manter o projeto vivo, responsivo e em melhoria.

👉 **[Patrocine no GitHub](https://github.com/sponsors/r3dlex)**

Opções de pagamento único e recorrente disponíveis. Patrocinadores são reconhecidos no README do projeto e nas notas de versão.

---

*oh-my-auggie não é afiliado à Augment Code. "auggie" e "Augment Code" são marcas registradas de seus respectivos proprietários.*
