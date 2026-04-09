# Contributing to oh-my-auggie

Thank you for your interest in contributing to oh-my-auggie (OMA). This guide covers everything from forking to submitting your PR.

## 1. Audience & Prerequisites

Before you start, make sure you have:

- **Node.js** >= 18 (required; check with `node --version`)
- **npm** (comes with Node.js)
- **git** (for version control)
- **auggie CLI** installed (to test in-session skills and commands)
- Basic familiarity with TypeScript and git workflows

This guide assumes you are comfortable with terminal commands and git branching.

---

## 2. Fork & Clone

1. **Fork the repository** on GitHub by clicking the "Fork" button at https://github.com/r3dlex/oh-my-auggie

2. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/oh-my-auggie.git
   cd oh-my-auggie/plugins/oma
   ```

3. **Add the upstream remote** so you can sync with the main repository:
   ```bash
   git remote add upstream https://github.com/r3dlex/oh-my-auggie.git
   ```

4. **Verify your remotes**:
   ```bash
   git remote -v
   # origin    https://github.com/<your-username>/oh-my-auggie.git (fetch)
   # origin    https://github.com/<your-username>/oh-my-auggie.git (push)
   # upstream  https://github.com/r3dlex/oh-my-auggie.git (fetch)
   # upstream  https://github.com/r3dlex/oh-my-auggie.git (read-only)
   ```

5. **Check available branches**:
   ```bash
   git branch -r
   # origin/HEAD -> origin/main
   # origin/main
   # upstream/main
   ```

Note: OMA uses a single `main` branch for all development. Feature branches are based off `upstream/main`.

---

## 3. Install & Build

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

   The `build` script is defined in `package.json` and runs `tsc` (TypeScript compilation to JavaScript). The output goes to `dist/`.

---

## 4. Linking as an Active Plugin

OMA is an Augment Code plugin. Once built, you need to tell auggie to use your local checkout. Here are two flows:

### Flow A: Plugin marketplace add (recommended)

**Advantages**: Uses Augment Code's native plugin system, marketplace semantics.

```bash
# Add the local directory as a marketplace source
auggie plugin marketplace add /path/to/oh-my-auggie/plugins/oma

# Install the plugin
auggie plugin install oh-my-auggie@oh-my-auggie

# Run OMA setup
/oma:setup
```

### Flow B: Direct plugin directory

**Advantages**: Lowest friction, no marketplace overhead.

```bash
# Tell auggie to load from your checkout
auggie --plugin-dir /path/to/oh-my-auggie/plugins/oma

# Run OMA setup
/oma:setup
```

### Comparison table

| Flow | Command | Plugin system? | Rebuild cost | Use when |
|------|---------|---|---|---|
| **A (recommended)** | `auggie plugin marketplace add` + `install` | Yes, full marketplace | Medium | Testing plugin isolation |
| **B** | `auggie --plugin-dir` | Yes, via `--plugin-dir` | Low | Developing OMA itself |

---

## 5. Rebuilding After Changes

After editing TypeScript files in `src/`, hooks, agents, skills, or commands:

```bash
npm run build
```

Then restart auggie to pick up changes:

```bash
# Kill the current auggie session and relaunch
/oma:setup
```

If you only edited test files, you can rebuild with:

```bash
npm run build
npm test
```

---

## 6. Running Tests

```bash
# Run tests once and exit
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run coverage
```

All tests should pass before you submit a PR.

---

## 7. Rebasing onto Upstream

When you are ready to sync with the latest upstream changes:

```bash
# Fetch the latest from upstream
git fetch upstream

# Rebase your branch onto main
git rebase upstream/main

# If conflicts: resolve them, then `git rebase --continue`

# Force-push to your fork (safe if no one else is on your branch)
git push --force-with-lease origin <your-branch>

# Re-run tests after rebase
npm run build
npm test
```

**Why `--force-with-lease`?** It is safer than `--force` because it aborts if someone else pushed to your branch since your last fetch.

---

## 8. Submitting a PR

1. **Push your branch** to your fork:
   ```bash
   git push origin <your-branch>
   ```

2. **Open a PR** on GitHub:
   - Go to https://github.com/r3dlex/oh-my-auggie/pulls
   - Click "New pull request"
   - Select your fork and branch
   - Fill in the PR title and description
   - Reference any related issues (e.g., "Fixes #123")

3. **PR templates** (if present):
   - Check `.github/pull_request_template.md` for required sections
   - GitHub will auto-populate the template when you open the PR

4. **What happens next**:
   - CI will run tests and build checks
   - Reviewers will provide feedback
   - Update your PR by pushing more commits to the same branch
   - Once approved, a maintainer will merge your PR

---

## 9. Troubleshooting

### Skills/agents not showing up after rebuild

After `npm run build`, restart auggie and re-run setup:

```bash
/oma:setup
```

### Build fails with "tsc: not found"

```bash
npm install
npm run build
```

If that does not work, clear and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Tests fail after rebase

```bash
npm ci
npm run build
npm test
```

### Plugin still showing old version

```bash
npm run build
# Restart auggie
/oma:setup
```

### Need more help?

- **Augment Code docs**: https://docs.augmentcode.com
- **GitHub Issues**: https://github.com/r3dlex/oh-my-auggie/issues

---

## Additional Resources

- **Main README**: [README.md](../README.md)
- **Quick Start**: See [README.md](../README.md#quick-start)
- **GitHub Issues**: https://github.com/r3dlex/oh-my-auggie/issues

Happy contributing!
