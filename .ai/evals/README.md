# Evals

This directory holds the offline eval-coverage scaffold for `oh-my-auggie`.

- `coverage-exceptions.json` — audited exceptions to the eval-coverage gate. Empty by default.
- `<set>/` — one directory per evalset, each with `evalset.json`, `rubric.md`, and `judge-config.json`.

No example evalsets are shipped. When a shippable surface needs evaluation, add a
`<set>/` directory with the three required files. The eval-coverage gate
(`modules/evals.md`, `modules/ci-policy.md`) is offline and structural only: CI
checks that each declared evalset is structurally valid; the LM-judge runs
out-of-band and never in CI.
