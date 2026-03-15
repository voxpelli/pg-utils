# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Full validation**: `npm test` (runs lint + type checks + tests)
- **Checks only**: `npm run check` (lint, tsc, knip, type-coverage, installed-check)
- **Tests only**: `npm run test:mocha`
- **Single test file**: `npx mocha test/unit/test-helpers.spec.js`
- **Lint**: `npm run check:lint`
- **Type check**: `npm run check:tsc`
- **Build declarations**: `npm run build`
- **Important**: `npm run build` must be run before `npm run check` if new exports were added — `check` runs `clean` first which wipes `.d.ts` files, and `check:tsc` resolves imports through `index.d.ts`

## Integration Tests

Integration tests require a PostgreSQL database. Set `DATABASE_URL` in `test/.env` or as an environment variable. Without it, integration tests will abort with an error.

Unit tests (`test/unit/`) run without a database.

## Architecture

This is a small utility library with five exports from `index.js`:

- **`csvFromFolderToDb`** (`lib/csv-folder-to-db.js`) — Imports CSV files from a folder into Postgres tables using `pg-copy-streams`. Files are named `<table>.csv`.
- **`dbToCsvFolder`** (`lib/db-to-csv-folder.js`) — Exports Postgres tables to CSV files using `pg-copy-streams`. Reverse of the above.
- **`PgTestHelpers`** (`lib/test-helpers.js`) — Test helper class that manages schema setup, fixture loading, table teardown, and PostgreSQL advisory locking to serialize concurrent test suites. Implements `AsyncDisposable` for `await using`.
- **`pgTestSetup`** (`lib/test-helpers.js`) — Factory for `await using`: creates + sets up a PgTestHelpers instance, cleans up on failure.
- **`pgTestSetupFor`** (`lib/test-helpers.js`) — Factory for `t.after()`: same as above but registers cleanup via a duck-typed test context.

Shared utilities in `lib/utils.js`: pool creation (`allowExitOnIdle: true`), advisory lock acquire/release (configurable `lockId` and `lockTimeoutMs`), `TypeNeverError`, `isStringArray`.

### Table ordering

Two options exist for specifying table dependency order, and they use **opposite directions**:
- `tableLoadOrder` — parent-first (intuitive: first item loaded first, dropped last)
- `tablesWithDependencies` — leaf-first, **deprecated**

Internally, `tableLoadOrder` is reversed to match the leaf-first convention used by internal methods. Nested arrays in `tableLoadOrder` group tables for parallel dropping.

### Schema initialization

`PgTestHelpers` accepts `schema` as a SQL string, a `URL` to a `.sql` file, or a function returning an `Umzug` instance (via `umzeption`).

### Advisory locking

- Advisory locks are **cluster-scoped** (not database-scoped) — lock ID 42 on DB A blocks lock ID 42 on DB B if same PG cluster
- `removeTables()` drops ALL public tables, not just the helper's schema — different `lockId` values only safe with separate databases
- `setup()` calls `end()` on failure to prevent pool leaks when used with `await using`
- `await using` disposes at block scope exit — works in `it()` bodies, NOT in `before()`/`beforeEach()` hooks

## Style

- ESM only, neostandard via `@voxpelli/eslint-config`
- Types via JSDoc, checked by `tsc` (never compiled except for declaration generation)
- Type coverage enforced at 95%+ (`--strict`)
- Tests use mocha + chai + chai-as-promised + sinon, coverage via c8
- Conventional commits enforced by husky hook (`validate-conventional-commit`)
- Node.js >= 22.0.0 required, tsconfig extends `@voxpelli/tsconfig/node22` with `esnext.disposable` in lib
- Destructured options must be alphabetically sorted (`sort-destructure-keys` eslint rule)
- `eslint-disable-next-line` comments must be on the line immediately before the violation (not separated by code)
