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

## Integration Tests

Integration tests require a PostgreSQL database. Set `DATABASE_URL` in `test/.env` or as an environment variable. Without it, integration tests will abort with an error.

Unit tests (`test/unit/`) run without a database.

## Architecture

This is a small utility library with three exports from `index.js`:

- **`csvFromFolderToDb`** (`lib/csv-folder-to-db.js`) — Imports CSV files from a folder into Postgres tables using `pg-copy-streams`. Files are named `<table>.csv`.
- **`dbToCsvFolder`** (`lib/db-to-csv-folder.js`) — Exports Postgres tables to CSV files using `pg-copy-streams`. Reverse of the above.
- **`PgTestHelpers`** (`lib/test-helpers.js`) — Test helper class that manages schema setup, fixture loading, table teardown, and PostgreSQL advisory locking (lock ID 42) to serialize concurrent test suites.

Shared utilities in `lib/utils.js`: pool creation (`allowExitOnIdle: true`), advisory lock acquire/release, `TypeNeverError`, `isStringArray`.

### Table ordering

Two options exist for specifying table dependency order, and they use **opposite directions**:
- `tableLoadOrder` — parent-first (intuitive: first item loaded first, dropped last)
- `tablesWithDependencies` — leaf-first, **deprecated**

Internally, `tableLoadOrder` is reversed to match the leaf-first convention used by internal methods. Nested arrays in `tableLoadOrder` group tables for parallel dropping.

### Schema initialization

`PgTestHelpers` accepts `schema` as a SQL string, a `URL` to a `.sql` file, or a function returning an `Umzug` instance (via `umzeption`).

## Style

- ESM only, neostandard via `@voxpelli/eslint-config`
- Types via JSDoc, checked by `tsc` (never compiled except for declaration generation)
- Type coverage enforced at 95%+ (`--strict`)
- Tests use mocha + chai + chai-as-promised + sinon, coverage via c8
- Conventional commits enforced by husky hook (`validate-conventional-commit`)
