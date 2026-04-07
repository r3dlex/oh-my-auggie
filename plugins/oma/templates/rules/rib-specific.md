---
name: rib-specific
description: RIB application conventions for backend, e2e, binpool, and build order
origin: oma-template
applies_to: rib-project
---

# RIB Application-Specific Rules

## Backend/Frontend Boundary

- Backend API controllers live in `backend/src/<Module>/` directories
- Public API modules named `<Module>.PublicApi` expose REST endpoints
- Frontend Angular code in `frontend/` — never import backend code directly
- All API contracts (DTOs, enums) must be in shared PublicApi projects

## E2E Test Conventions

E2E tests organized under `e2e/`:
- `functional/` — functional test suites
- `non-functional/` — performance, load tests
- `non-functional-angular/` — Angular-specific non-functional tests
- `rib-finance/` — domain-specific test suites
- `environments/` — environment-specific test configs
- `emails/` — email capture/replay for tests

## Binpool Handling

Binpool (`binpool/`) contains build-time config templates:
- `*.tmpl` files — template configs to be processed during build
- `buildtools/` — build tool scripts and utilities
- NEVER commit built artifacts to binpool
- Template files: `myappsettings.json.tmpl`, `*nlog.config.tmpl`, etc.

## Build Order Compliance

`buildorder.json` defines strict module build order:
- Modules must be built in declared order (dependencies first)
- Never modify `buildorder.json` without architecture review
- Key phases: Platform → Services → Basics → Model → Domain modules
- Circular dependencies between modules are prohibited

## Module Naming

- Backend modules: `Services.<Name>`, `Basics.<Name>`, `Model.<Name>`, etc.
- Public API modules: `<Module>.PublicApi` suffix
- E2E test modules mirror backend module structure
