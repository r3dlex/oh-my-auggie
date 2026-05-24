// .rules.ts — Archgate domain rules
// Each rule: name, severity ("error" | "warn" | "info"), match, violation, correction.

export interface Rule {
  name: string;
  severity: "error" | "warn" | "info";
  match: string;
  violation?: string;
  correction?: string;
}

// ─── backend ────────────────────────────────────────────────
export const backend: Rule[] = [
  {
    name: "api-versioning",
    severity: "error",
    match: "All public REST endpoints must include a version prefix (/v1/, /v2/, …).",
    violation: "POST /users/create",
    correction: "POST /v1/users",
  },
  {
    name: "error-shape",
    severity: "error",
    match: "Error responses must use { error: { code, message, details? } } shape.",
    violation: 'res.status(400).json({ msg: "bad input" })',
    correction: 'res.status(400).json({ error: { code: "INVALID_INPUT", message: "…" } })',
  },
  {
    name: "no-sql-injection-patterns",
    severity: "error",
    match: "String interpolation must not be used to build SQL queries.",
    violation: '`SELECT * FROM users WHERE id = ${req.params.id}`',
    correction: "db.query('SELECT * FROM users WHERE id = $1', [req.params.id])",
  },
];

// ─── frontend ────────────────────────────────────────────────
export const frontend: Rule[] = [
  {
    name: "component-naming",
    severity: "error",
    match: "React components must use PascalCase filenames and exports.",
    violation: "export function userCard() { … }  // file: userCard.tsx",
    correction: "export function UserCard() { … }  // file: UserCard.tsx",
  },
  {
    name: "props-interface",
    severity: "error",
    match: "Component props must be defined as a named TypeScript interface, not inline.",
    violation: "function Button({ label }: { label: string }) { … }",
    correction: "interface ButtonProps { label: string }\nfunction Button({ label }: ButtonProps) { … }",
  },
];

// ─── data ────────────────────────────────────────────────────
export const data: Rule[] = [
  {
    name: "migration-naming",
    severity: "error",
    match: "Migration files must follow pattern YYYYMMDDHHMMSS_<slug>.sql.",
    violation: "add_users_table.sql",
    correction: "20260101120000_add_users_table.sql",
  },
  {
    name: "query-batching",
    severity: "warn",
    match: "ORM queries inside loops are prohibited.",
    violation: "for (const id of ids) { await User.findOne(id); }",
    correction: "await User.findAll({ where: { id: ids } });",
  },
];

// ─── architecture ────────────────────────────────────────────
export const architecture: Rule[] = [
  {
    name: "layer-boundaries",
    severity: "error",
    match: "Route handlers must not import from the data layer directly.",
    violation: "import { db } from '../db' // inside routes/users.ts",
    correction: "import { UserService } from '../services/UserService'",
  },
  {
    name: "dependency-direction",
    severity: "error",
    match: "Dependencies must only flow inward (domain ← application ← infrastructure).",
    violation: "import { User } from '../../domain/User' // inside infrastructure/",
    correction: "Depend on the port interface, not the domain entity directly.",
  },
  {
    name: "no-circular-dependencies",
    severity: "error",
    match: "Circular imports between modules are prohibited.",
    violation: "// moduleA imports moduleB, moduleB imports moduleA",
    correction: "Extract shared logic into a third module.",
  },
];

// ─── general ─────────────────────────────────────────────────
export const general: Rule[] = [
  {
    name: "file-naming",
    severity: "warn",
    match: "Source files must use kebab-case. Test files must end in .test.ts or .spec.ts.",
    violation: "UserService.ts",
    correction: "user-service.ts",
  },
  {
    name: "function-length",
    severity: "warn",
    match: "Functions must not exceed 40 lines.",
    violation: "// 80-line parseAndValidateAndSaveUser function",
    correction: "parseUser(), validateUser(), saveUser() — each ≤ 40 lines",
  },
  {
    name: "test-structure",
    severity: "error",
    match: "Tests must follow Arrange-Act-Assert pattern.",
    violation: "it('works', () => { /* 20 lines of mixed setup and assertions */ })",
    correction: "it('returns 404 when user not found', () => { /* Arrange / Act / Assert */ })",
  },
  {
    name: "import-ordering",
    severity: "info",
    match: "Imports: Node built-ins → external → internal. Groups separated by blank line.",
    violation: "import { UserService } from './services'\nimport path from 'path'",
    correction: "import path from 'path'\n\nimport { UserService } from './services'",
  },
];
