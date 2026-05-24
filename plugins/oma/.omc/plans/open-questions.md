# Open Questions

## vscode-extensions-trio - 2026-04-21

- [ ] **Publisher identity for oh-my-gemini and oh-my-auggie VS Code extensions** -- The existing vscode-omp uses publisher `r3dlex`. Should oh-my-gemini and oh-my-auggie use the same publisher, or different ones? Affects marketplace listing and trust.
- [ ] **oh-my-auggie agent discovery path** -- oh-my-auggie does not have a `.github/agents/` or top-level `agents/` directory. Where should the extension look for agent definitions? Options: `plugins/oma/agents/` (if it exists), skip the agents panel entirely, or create an `agents/` convention.
- [ ] **Phase 2 shared library location** -- When extracting `@omc/vscode-core`, should it live in its own repo, in the AiTool workspace root, or as a published npm package? This affects how the three repos consume it.
- [ ] **oh-my-githubcopilot subagent tracking** -- The vscode-omp plan assumes future `.omx/state/subagent-tracker.json` support. Does oh-my-githubcopilot (OMP) plan to add subagent tracking hooks similar to oh-my-gemini's? If not, the SubagentTreeProvider in vscode-omp should be deferred.
- [ ] **VSIX marketplace publishing** -- Should the extensions be published to the VS Code Marketplace, or distributed as `.vsix` files only (sideload)? Publishing requires a verified publisher account and review process.
- [ ] **oh-my-auggie dual state: .oma/ vs .omc/** -- When oh-my-claudecode runs on top of oh-my-auggie, both `.oma/` and `.omc/` have state. Should the extension merge/deduplicate workflow entries, or show them in separate tree sections?
- [ ] **Icon assets** -- Each extension needs activity bar icons (SVG). Should these be designed from scratch per brand, or use variations of a shared template?
