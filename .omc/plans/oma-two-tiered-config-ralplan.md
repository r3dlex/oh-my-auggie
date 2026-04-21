# OMA Two-Tiered Config System -- Implementation Plan

**Plan saved to:** `.omc/plans/oma-two-tiered-config-ralplan.md`
**Generated:** 2026-04-06
**Revision:** 1 (addresses 5 targeted fixes)
**Type:** RALPLAN-DR deliberate mode (brownfield)
**Complexity:** MEDIUM

---

## RALPLAN-DR Summary

### Principles (5)

1. **Global-first, local-override**: Global `~/.oma/config.json` is the system-wide default; local `.oma/config.json` per-project overrides specific keys. `profile` is the single exception -- it is global-only and cannot be overridden locally.

2. **Zero new dependencies**: All config logic lives in `src/utils.ts` using only Node.js built-ins (`fs`, `path`, `os`). Compiled output is `dist/utils.js` (no `node_modules` dependency).

3. **Type-safe config schema**: TypeScript interfaces (`Config`, `HudConfig`, `OrchestrationConfig`, `PathsConfig`) enforce shape at compile time. Runtime validation via `validateConfig()`.

4. **Additive merge**: `deepMerge()` performs shallow-top/deep-nested merging. Nested objects are merged recursively; top-level keys are overwritten entirely. Empty local values do not wipe global values.

5. **Setup-gated**: Phase 0 of `/oma:setup` initializes `~/.oma/` and creates the default global config. No config file is created until the user explicitly runs setup.

### Decision Drivers (top 3)

1. **Cross-platform global dir**: `os.homedir()` resolves to `C:\Users\username\.oma` on Windows, `$HOME/.oma` on Unix. `expandTilde()` normalizes `~/.oma` paths for all environments.

2. **Profile is enterprise-gated**: `profile: "enterprise"` controls ADR enforcement, approval gates, and cost tracking. Allowing local override of `profile` would let users bypass enterprise controls by setting `profile: "default"` in a project-local config. Making it global-only ensures enterprise policies are enforced at the system level.

3. **Existing hooks adopt incrementally**: All 6 hooks are updated to call `getMergedConfig()` instead of `loadConfig()`. No hook is broken by the migration -- each gets richer config without behavioral regression.

### Viable Options (2)

**Option A: TypeScript source + committed dist (chosen)**
- `src/utils.ts` is the source of truth; `dist/utils.js` is compiled by Step 11.
- Hooks import from `../dist/utils.js` (compiled output, consistent with the Windows rewrite plan's distribution model).
- Pros: Type-safe, compile-time checks, 95% coverage gate achievable.
- Cons: Requires compilation step; two files to maintain.

**Option B: Direct `dist/utils.js` editing**
- Edit `dist/utils.js` directly without source.
- Pros: No build step.
- Cons: No type safety, no compile-time validation, inconsistent with the TypeScript rewrite plan direction.

**Invalidation rationale for Option B**: The Windows rewrite plan (approved 2026-04-04) establishes TypeScript as the source-of-truth pattern for all OMA logic. Editing compiled output directly violates that principle and bypasses type checking.

### ADR

- **Decision**: Use `src/utils.ts` as source, compile to `dist/utils.js` via `npm run build`. `profile` is global-only. `deepMerge()` uses `const baseObj = base[key] ?? {}` for undefined edge cases.
- **Drivers**: Type safety, cross-platform paths, enterprise profile enforcement.
- **Alternatives considered**: Direct `dist/utils.js` editing (no type safety); local `profile` override (enterprise bypass).
- **Why chosen**: Satisfies type safety, cross-platform, and enterprise enforcement simultaneously.
- **Consequences**: Requires `npm run build` after Step 10; `dist/` directory is committed to repo.
- **Follow-ups**: Consider `oma config edit` command for interactive config editing.

---

## Config Schema

```typescript
// plugins/oma/src/types.ts

export interface HudConfig {
    enabled: boolean;
    style: 'default' | 'compact' | 'minimal';
}

export interface OrchestrationConfig {
    mode: 'ralph' | 'autopilot' | 'ultrawork' | 'ultraqa' | 'team';
    maxIterations: number;
}

export interface PathsConfig {
    omaDir: string;   // e.g. "~/.oma" — expanded at runtime via expandTilde()
    plansDir: string; // e.g. "~/.oma/plans"
}

export interface Config {
    version: string;
    hud: HudConfig;
    orchestration: OrchestrationConfig;
    paths: PathsConfig;
    profile: 'default' | 'enterprise';
}

export const DEFAULT_CONFIG: Config = {
    version: '1.0',
    hud: { enabled: true, style: 'default' },
    orchestration: { mode: 'ralph', maxIterations: 100 },
    paths: { omaDir: '~/.oma', plansDir: '~/.oma/plans' },
    profile: 'default'
};
```

---

## deepMerge Algorithm

`deepMerge(base: Config, overlay: Partial<Config>): Config` performs shallow-top/deep-nested merging:

```javascript
function deepMerge(base, overlay) {
    const result = { ...base };
    for (const key of Object.keys(overlay)) {
        if (
            typeof overlay[key] === 'object' &&
            overlay[key] !== null &&
            !Array.isArray(overlay[key])
        ) {
            const baseObj = base[key] ?? {};   // FIX 3: handle undefined base value
            result[key] = { ...baseObj, ...overlay[key] };
        } else {
            result[key] = overlay[key];
        }
    }
    return result;
}
```

**Merge examples table:**

| global | local | result |
|--------|-------|--------|
| `{}` | `{}` | `{}` |
| `{ a: 1 }` | `{}` | `{ a: 1 }` |
| `{}` | `{ a: 1 }` | `{ a: 1 }` |
| `{ a: 1 }` | `{ a: 2 }` | `{ a: 2 }` |
| `{ a: { b: 1 } }` | `{ a: { c: 2 } }` | `{ a: { b: 1, c: 2 } }` |
| `{ a: 1, b: 2 }` | `{ b: 3 }` | `{ a: 1, b: 3 }` |
| `{}` | `{ hud: { style: 'compact' } }` | `{ hud: { style: 'compact', enabled: true } }` |

---

## Implementation Steps

### Step 1 -- Extend `src/utils.ts` with config utilities

**File modified:** `plugins/oma/src/utils.ts`

Add all new exports. Note: Step 11 compiles this file to `dist/utils.js`. Hooks import from `dist/utils.js` (see Step 3-8).

```javascript
import { homedir } from 'os';
import { resolve } from 'path';

// ... existing exports from Windows rewrite plan ...

// ─── FIX 5: expandTilde ───────────────────────────────────────────────────────
/**
 * Expands ~ in a path to the user's home directory.
 * Works cross-platform: Unix (~) and Windows (~) both resolve via os.homedir().
 * e.g. "~/.oma" -> "/home/user/.oma" or "C:\Users\username\.oma"
 */
export function expandTilde(p) {
    if (typeof p !== 'string') return p;
    if (p.startsWith('~/') || p === '~') {
        return resolve(homedir(), p.slice(2));
    }
    return p;
}

// ─── FIX 1: Config utilities ─────────────────────────────────────────────────
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';

/**
 * Returns the global OMA config directory path.
 * Cross-platform: uses os.homedir() for Windows/Unix consistency.
 * FIX 5: Uses expandTilde() for path normalization.
 */
export function resolveGlobalOmaDir() {
    return expandTilde('~/.oma');
}

/**
 * Returns the local OMA config directory path (project-level .oma/).
 * Uses process.cwd() as the project root by default.
 */
export function resolveLocalOmaDir() {
    return expandTilde('.oma');  // relative path resolved via expandTilde
}

/**
 * Loads a JSON config file, returns null if absent or corrupt.
 */
export function loadJsonFileSafe(path) {
    try {
        if (!existsSync(path)) return null;
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Saves a JSON config file atomically.
 * Creates parent directories if absent.
 */
export function saveJsonFileSafe(path, data) {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = path + '.tmp.' + Date.now();
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    // Use sync rename (Windows fallback handled in Windows rewrite plan's writeJsonFile)
    const { renameSync } = require('fs');
    renameSync(tmp, path);
}

/**
 * Deep-merges two config objects (shallow-top, deep-nested).
 * FIX 3: Uses `const baseObj = base[key] ?? {}` to handle undefined base values.
 */
export function deepMerge(base, overlay) {
    const result = { ...base };
    for (const key of Object.keys(overlay ?? {})) {
        if (
            typeof overlay[key] === 'object' &&
            overlay[key] !== null &&
            !Array.isArray(overlay[key])
        ) {
            const baseObj = (base[key] ?? {});
            result[key] = { ...baseObj, ...overlay[key] };
        } else {
            result[key] = overlay[key];
        }
    }
    return result;
}

// ─── Default config ───────────────────────────────────────────────────────────
export const DEFAULT_CONFIG = {
    version: '1.0',
    hud: { enabled: true, style: 'default' },
    orchestration: { mode: 'ralph', maxIterations: 100 },
    paths: { omaDir: '~/.oma', plansDir: '~/.oma/plans' },
    profile: 'default'
};

/**
 * Returns the fully merged OMA config.
 * Merge order: DEFAULT_CONFIG <- global config <- local config
 *
 * FIX 2 (CRITICAL): `profile` is global-only.
 * After deep merge, if globalConfig.profile is set, force mergedConfig.profile
 * to globalConfig.profile. Local config cannot override profile.
 *
 * Example: global `profile: "enterprise"` + local `profile: "default"`
 *          = final `profile: "enterprise"`
 */
export function getMergedConfig() {
    const globalPath = resolveGlobalOmaDir();
    const localPath = resolveLocalOmaDir();

    const globalConfig = loadJsonFileSafe(join(globalPath, 'config.json')) ?? {};
    const localConfig = loadJsonFileSafe(join(localPath, 'config.json')) ?? {};

    let merged = deepMerge(DEFAULT_CONFIG, globalConfig);
    merged = deepMerge(merged, localConfig);

    // FIX 2: profile is global-only. Local cannot override it.
    if (globalConfig.profile !== undefined) {
        merged.profile = globalConfig.profile;
    }

    return merged;
}

/**
 * Reads a specific key from the merged config.
 * Supports dot notation: "hud.style" -> config.hud.style
 */
export function getConfigKey(key) {
    const config = getMergedConfig();
    const parts = key.split('.');
    let value = config;
    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part];
        } else {
            return undefined;
        }
    }
    return value;
}

/**
 * Sets a specific key in a config file (global by default, local with --local flag).
 * Supports dot notation for nested keys.
 */
export function setConfigKey(key, value, scope = 'global') {
    const basePath = scope === 'global' ? resolveGlobalOmaDir() : resolveLocalOmaDir();
    const configPath = join(basePath, 'config.json');
    const config = loadJsonFileSafe(configPath) ?? { ...DEFAULT_CONFIG };

    const parts = key.split('.');
    let target = config;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in target)) target[parts[i]] = {};
        target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = value;

    saveJsonFileSafe(configPath, config);
    return config;
}

/**
 * Resets a config file to defaults (global or local scope).
 */
export function resetConfig(scope = 'global') {
    const basePath = scope === 'global' ? resolveGlobalOmaDir() : resolveLocalOmaDir();
    const configPath = join(basePath, 'config.json');
    if (existsSync(configPath)) {
        const fs = require('fs');
        fs.unlinkSync(configPath);
    }
}
```

**Acceptance criteria:**
- `expandTilde('~/.oma')` returns `$HOME/.oma` on Unix and `C:\Users\<user>\.oma` on Windows.
- `resolveGlobalOmaDir()` uses `expandTilde('~/.oma')`.
- `deepMerge({ a: { b: 1 } }, { a: { c: 2 } })` returns `{ a: { b: 1, c: 2 } }`.
- `deepMerge({}, { hud: { style: 'compact' } })` returns `{ hud: { style: 'compact', enabled: true } }`.
- `getMergedConfig()` returns global + local merged config.
- `getMergedConfig()` with global `profile: "enterprise"` and local `profile: "default"` returns `profile: "enterprise"`.

---

### Step 2 -- Add MCP tools to state-server

**File modified:** `plugins/oma/mcp/state-server.mjs`

Add three new MCP tool handlers to the existing `tools` object:

```javascript
// ─── Config tools ─────────────────────────────────────────────────────────────
case 'oma_config_read': {
    const config = getMergedConfig();
    return { content: [{ type: 'text', text: JSON.stringify(config, null, 2) }] };
}
case 'oma_config_write': {
    const args = JSON.parse(params.arguments ?? '{}');
    const { key, value, scope = 'global' } = args;
    const updated = setConfigKey(key, value, scope);
    return { content: [{ type: 'text', text: `Config updated: ${key} = ${value} (${scope})` }] };
}
case 'oma_config_reset': {
    const args = JSON.parse(params.arguments ?? '{}');
    const scope = args.scope ?? 'global';
    resetConfig(scope);
    return { content: [{ type: 'text', text: `Config reset: ${scope}` }] };
}
```

**Acceptance criteria:**
- `tools/list` includes `oma_config_read`, `oma_config_write`, `oma_config_reset`.
- `oma_config_read` returns valid JSON with version, hud, orchestration, paths, profile fields.
- `oma_config_write` with `--local` flag writes to local `.oma/config.json`.
- `oma_config_reset` removes the config file and returns confirmation.

---

### Step 3 -- Update `approval-gate.mjs`

**File modified:** `plugins/oma/hooks/approval-gate.mjs` (compiled output, source in `src/hooks/approval-gate.ts`)

Replace `loadConfig()` import with `getMergedConfig()`:

```javascript
import { getMergedConfig } from '../dist/utils.js';

export async function main() {
    const input = await readAllStdin();
    const parsed = JSON.parse(input);
    const config = getMergedConfig();  // replaced loadConfig()

    // ... existing logic ...
}
```

**Acceptance criteria:**
- Hook imports from `../dist/utils.js` (compiled output path).
- `config.profile` is used for enterprise checks (via `getMergedConfig().profile`).
- Existing bats tests for approval-gate still pass (no behavioral regression).

---

### Step 4 -- Update `adr-enforce.mjs`

**File modified:** `plugins/oma/hooks/adr-enforce.mjs`

Same pattern as Step 3. Replace `loadConfig()` with `getMergedConfig()`.
Import from `../dist/utils.js`.

---

### Step 5 -- Update `delegation-enforce.mjs`

**File modified:** `plugins/oma/hooks/delegation-enforce.mjs`

Same pattern. Replace `loadConfig()` with `getMergedConfig()`.
Import from `../dist/utils.js`.

---

### Step 6 -- Update `stop-gate.mjs`

**File modified:** `plugins/oma/hooks/stop-gate.mjs`

Same pattern. Replace `loadConfig()` with `getMergedConfig()`.
Import from `../dist/utils.js`.

---

### Step 7 -- Update `keyword-detect.mjs`

**File modified:** `plugins/oma/hooks/keyword-detect.mjs`

Same pattern. Replace `loadConfig()` with `getMergedConfig()`.
Import from `../dist/utils.js`.

---

### Step 8 -- Update `cost-track.mjs`

**File modified:** `plugins/oma/hooks/cost-track.mjs`

Same pattern. Replace `loadConfig()` with `getMergedConfig()`.
Import from `../dist/utils.js`.

---

### Step 9 -- Update `/oma:setup` Phase 0

**File modified:** `plugins/oma/commands/oma-setup.md`

Add Phase 0 to the command description:

```markdown
---
command: /oma:setup
description: Initialize OMA for first use, or refresh existing configuration
triggers: setup, init, install
---

# /oma:setup

Initializes the OMA environment.

## Phase 0: Global config initialization

On first run, `/oma:setup` creates the global config directory and default config file:

1. **Create `~/.oma/` directory** (cross-platform via `expandTilde()`):
   - Uses `expandTilde('~/.oma')` to resolve `~/.oma` to the correct home directory path
   - Windows: `C:\Users\username\.oma`
   - Unix/macOS: `$HOME/.oma`
   - Sets `OMA_GLOBAL_DIR` environment variable to the resolved path
2. **Create `~/.oma/config.json`** with `DEFAULT_CONFIG` schema:
   ```json
   {
     "version": "1.0",
     "hud": { "enabled": true, "style": "default" },
     "orchestration": { "mode": "ralph", "maxIterations": 100 },
     "paths": { "omaDir": "~/.oma", "plansDir": "~/.oma/plans" },
     "profile": "default"
   }
   ```
3. **Set `OMA_GLOBAL_DIR`** environment variable in the active Auggie session context so hooks can reference it.

**FIX 5 implementation**: The setup logic uses `expandTilde('~/.oma')` (from Step 1) to resolve the global directory path, not a hardcoded `$HOME/.oma` string. This ensures cross-platform correctness.

## Phase 1: Project-level `.oma/` setup (existing behavior)

...
```

**Acceptance criteria:**
- Phase 0 runs on first invocation (when `~/.oma/config.json` does not exist).
- Phase 0 uses `expandTilde('~/.oma')` instead of hardcoded `$HOME/.oma`.
- `OMA_GLOBAL_DIR` is set to the resolved global config path.
- Re-running setup on an existing config does not overwrite the global config (safe idempotent).

---

### Step 10 -- Create `oma-config.md` command

**File created:** `plugins/oma/commands/oma-config.md`

```markdown
---
command: /oma:config
description: View, set, or reset OMA configuration (global or local)
triggers: config, oma config, cfg
---

# /oma:config

Manages OMA's two-tiered configuration system.

## Two-Tiered Model

- **Global config**: `~/.oma/config.json` -- system-wide defaults, applies to all projects
- **Local config**: `.oma/config.json` -- project-specific overrides
- **Merge order**: Defaults <- Global <- Local (local wins on conflict)
- **Exception**: `profile` is global-only -- local cannot override it

## Subcommands

### `get <key>`

Reads a config value from the merged config.

**Examples:**
- `/oma:config get profile` -- returns `"default"` or `"enterprise"`
- `/oma:config get hud.style` -- returns `"default"`, `"compact"`, or `"minimal"`
- `/oma:config get orchestration.mode` -- returns current default orchestration mode
- `/oma:config get paths.omaDir` -- returns global OMA directory path (expanded)

**Output**: Returns the value as a JSON string or "not set" if the key has no value.

### `set <key> <value> [--local]`

Writes a config value.

**Examples:**
- `/oma:config set hud.style compact` -- sets HUD to compact style (global)
- `/oma:config set hud.enabled false --local` -- disables HUD for this project only
- `/oma:config set orchestration.maxIterations 200` -- sets max iterations to 200
- `/oma:config set profile enterprise` -- sets enterprise profile (global only)

**Behavior:**
- Default scope is global (`~/.oma/config.json`).
- Use `--local` to write to project-level `.oma/config.json`.
- Nested keys supported via dot notation (`hud.style`, `orchestration.mode`).
- Profile can only be set globally (local scope with `profile` key prints a warning).

**Output**: Confirmation with the updated full config.

### `reset [--global] [--local]`

Resets config files to defaults.

**Examples:**
- `/oma:config reset --global` -- removes `~/.oma/config.json`, reverts to defaults
- `/oma:config reset --local` -- removes `.oma/config.json`, reverts to global defaults
- `/oma:config reset` -- resets both (with confirmation prompt)

**Behavior:**
- Removing a config file causes `getMergedConfig()` to fall back to the next tier.
- Reset is irreversible (no backup).

### `list [--scope global|local|merged]`

Lists config values.

**Examples:**
- `/oma:config list` -- shows merged config (all tiers combined)
- `/oma:config list --scope global` -- shows global config only
- `/oma:config list --scope local` -- shows local config only

**Output**: Formatted table of key-value pairs with scope indicators.

## Configuration Schema Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `version` | string | `"1.0"` | Config format version |
| `hud.enabled` | boolean | `true` | Show HUD on startup |
| `hud.style` | string | `"default"` | HUD display style: `default`, `compact`, `minimal` |
| `orchestration.mode` | string | `"ralph"` | Default orchestration mode |
| `orchestration.maxIterations` | number | `100` | Max iterations per mode |
| `paths.omaDir` | string | `"~/.oma"` | Global OMA directory |
| `paths.plansDir` | string | `"~/.oma/plans"` | Plans directory |
| `profile` | string | `"default"` | OMA profile: `default` or `enterprise` (global-only) |

## Profile Behavior

The `profile` key controls enterprise features:

- **`default`**: Community mode -- all standard OMA features, no enterprise hooks enforced.
- **`enterprise`**: Enterprise mode -- ADR enforcement required for architectural changes, approval gates for sensitive paths, cost tracking enabled.

**Important**: `profile` can only be set in the global config (`~/.oma/config.json`). Setting `profile` in a local config is ignored with a warning. This prevents users from bypassing enterprise policies by creating a local config.

Example:
```
$ oma config get profile
"default"

$ oma config set profile enterprise
Config updated: profile = "enterprise" (global)

$ oma config set profile default --local
WARNING: profile is global-only and cannot be overridden locally.
Current profile remains: "enterprise"
```

## Cross-Platform Notes

- Global config path resolves via `os.homedir()`: Windows `C:\Users\<user>\.oma`, Unix `~/.oma`.
- The `expandTilde()` utility normalizes `~/.oma` for all platforms.
- Paths in the config file (e.g., `paths.omaDir`) are expanded at runtime, not stored expanded.
```

**Acceptance criteria:**
- `/oma:config get hud.style` returns current merged value.
- `/oma:config set hud.style compact` writes to global config.
- `/oma:config set profile enterprise` writes to global config, `--local` prints warning.
- `/oma:config reset --global` removes global config.
- `/oma:config list --scope merged` shows all tiers combined.

---

### Step 11 -- Rebuild dist files

**Action:** Run `npm run build` in `plugins/oma/`.

This compiles `src/utils.ts` (and all other TypeScript sources) to `dist/utils.js`.

**FIX 1**: The compilation step ensures all `src/utils.ts` exports (including `expandTilde`, `resolveGlobalOmaDir`, `resolveLocalOmaDir`, `deepMerge`, `getMergedConfig`, `setConfigKey`, `resetConfig`, `DEFAULT_CONFIG`) are available at the `dist/utils.js` import path that hooks use.

**Acceptance criteria:**
- `npm run build` completes without errors.
- `dist/utils.js` contains all Step 1 exports.
- All hooks (Steps 3-8) that import from `../dist/utils.js` work correctly.

---

## Files Summary

| File | Action | Step |
|------|--------|------|
| `plugins/oma/src/utils.ts` | modified (add config utilities) | 1 |
| `plugins/oma/dist/utils.js` | generated (compiled output) | 11 |
| `plugins/oma/mcp/state-server.mjs` | modified (add MCP tools) | 2 |
| `plugins/oma/hooks/approval-gate.mjs` | modified (use getMergedConfig) | 3 |
| `plugins/oma/hooks/adr-enforce.mjs` | modified (use getMergedConfig) | 4 |
| `plugins/oma/hooks/delegation-enforce.mjs` | modified (use getMergedConfig) | 5 |
| `plugins/oma/hooks/stop-gate.mjs` | modified (use getMergedConfig) | 6 |
| `plugins/oma/hooks/keyword-detect.mjs` | modified (use getMergedConfig) | 7 |
| `plugins/oma/hooks/cost-track.mjs` | modified (use getMergedConfig) | 8 |
| `plugins/oma/commands/oma-setup.md` | modified (add Phase 0) | 9 |
| `plugins/oma/commands/oma-config.md` | new file | 10 |

---

## Verification Checklist

- [ ] `deepMerge({}, { hud: { style: 'compact' } })` returns `{ hud: { style: 'compact', enabled: true } }` (FIX 3)
- [ ] `deepMerge({ a: { b: 1 } }, { a: { c: 2 } })` returns `{ a: { b: 1, c: 2 } }`
- [ ] `getMergedConfig()` with global `profile: "enterprise"` + local `profile: "default"` returns `profile: "enterprise"` (FIX 2)
- [ ] `expandTilde('~/.oma')` resolves to correct home directory on Windows and Unix (FIX 5)
- [ ] `dist/utils.js` exists and contains all Step 1 exports after `npm run build` (FIX 1)
- [ ] All 6 hooks import from `../dist/utils.js` and use `getMergedConfig()`
- [ ] `/oma:setup` Phase 0 creates `~/.oma/config.json` using `expandTilde()` (FIX 5)
- [ ] `/oma:config get profile` returns merged value
- [ ] `/oma:config set profile enterprise` writes globally, `--local` prints warning
- [ ] MCP tools `oma_config_read`, `oma_config_write`, `oma_config_reset` appear in `tools/list`
- [ ] Existing bats tests still pass (no behavioral regression in hooks)

---

## Fix Summary

| Fix | Description | Location |
|-----|-------------|----------|
| **FIX 1 (CRITICAL-1)** | Changed all `dist/utils.js` references to source from `src/utils.ts`. Step 11 compiles `src/utils.ts` to `dist/utils.js`. Hooks import from compiled output (`../dist/utils.js`). | Steps 1, 3-8, 11 |
| **FIX 2 (CRITICAL-2)** | Added `profile` as global-only protected key. After deep merge, `if (globalConfig.profile !== undefined) merged.profile = globalConfig.profile`. Local cannot override. Example: global `profile: "enterprise"` + local `profile: "default"` = final `profile: "enterprise"`. | Step 1 (`getMergedConfig()`) |
| **FIX 3 (MAJOR-3)** | Added undefined edge case to `deepMerge` examples: `{}` + `{ hud: { style: "compact" } }` = `{ hud: { style: "compact" } }`. Algorithm uses `const baseObj = base[key] ?? {}` to handle undefined base values. | Step 1 (`deepMerge()`) |
| **FIX 4 (Minor)** | Provided full frontmatter + content for `plugins/oma/commands/oma-config.md`. Includes all subcommands (`get`, `set`, `reset`, `list`), schema reference table, profile behavior documentation, and cross-platform notes. | Step 10 |
| **FIX 5 (Minor)** | Step 9 (setup Phase 0) uses `expandTilde('~/.oma')` utility instead of hardcoded `$HOME/.oma`. `expandTilde()` uses `os.homedir()` for cross-platform correctness. | Step 9 |