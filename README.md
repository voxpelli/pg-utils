# @voxpelli/pg-utils

My personal database utils / helpers for Postgres

[![npm version](https://img.shields.io/npm/v/@voxpelli/pg-utils.svg?style=flat)](https://www.npmjs.com/package/@voxpelli/pg-utils)
[![npm downloads](https://img.shields.io/npm/dm/@voxpelli/pg-utils.svg?style=flat)](https://www.npmjs.com/package/@voxpelli/pg-utils)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-7fffff?style=flat&labelColor=ff80ff)](https://github.com/neostandard/neostandard)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)](https://github.com/voxpelli/types-in-js)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/voxpelli/pg-utils)
[![Follow @voxpelli@mastodon.social](https://img.shields.io/mastodon/follow/109247025527949675?domain=https%3A%2F%2Fmastodon.social&style=social)](https://mastodon.social/@voxpelli)

## Usage

```javascript
import { PgTestHelpers } from '@voxpelli/pg-utils';

const pgHelpers = new PgTestHelpers({
  connectionString: 'postgres://user:pass@localhost/example',
  fixtureFolder: new URL('./fixtures', import.meta.url),
  ignoreTables: ['xyz'],
  schema: new URL('./create-tables.sql', import.meta.url),
  tableLoadOrder: [
    ['foo', 'bar'],
    'abc',
  ]
});

try {
  await pgHelpers.initTables();
  await pgHelpers.insertFixtures();
} finally {
  await pgHelpers.end();
}
```

Or use the `setup()` convenience method with `await using` for automatic cleanup:

```javascript
{
  await using pgHelpers = await new PgTestHelpers({
    connectionString: 'postgres://user:pass@localhost/example',
    schema: new URL('./create-tables.sql', import.meta.url),
    fixtureFolder: new URL('./fixtures', import.meta.url),
  }).setup();

  // Tables created, fixtures loaded.
  // pgHelpers.end() is called automatically when the block exits.
}
```

## PgTestHelpers

Class that creates a helpers instance

### Syntax

```ts
new PgTestHelpers({
  connectionString: 'postgres://user:pass@localhost/example',
  fixtureFolder: new URL('./fixtures', import.meta.url),
  ignoreTables: [
    // ...
  ],
  schema: new URL('./create-tables.sql', import.meta.url),
  tableLoadOrder: [
    // ...
  ]
});
```

### Arguments

* `options` – _[`PgTestHelpersOptions`](#pgtesthelpersoptions)_

### PgTestHelpersOptions

* `connectionString` – _`string`_ – a connection string for the postgres database
* `fixtureFolder` – _`[string | URL]`_ – _optional_ – the path to a folder of `.csv`-file fixtures named by their respective table
* `idleInTransactionTimeoutMs` – _`[number]`_ – _optional_ – idle-in-transaction session timeout in milliseconds, applied to pool connections. Auto-kills transactions left open by crashed tests.
* `ignoreTables` – _`[string[]]`_ – _optional_ – names of tables to ignore when dropping
* `lockId` – _`[number]`_ – _optional_ – advisory lock ID (default: `42`). All instances with the same `lockId` on the same PostgreSQL cluster serialize against each other — this is the intended isolation behavior that prevents concurrent test operations from interfering. Since `removeTables()` drops all public tables (not just the ones defined in `schema`), using different lock IDs only makes sense when test files target entirely separate databases (see [Parallel Test Runners](#parallel-test-runners)).
* `lockTimeoutMs` – _`[number]`_ – _optional_ – lock acquisition timeout in milliseconds. When set, a `SET lock_timeout` is issued before acquiring the advisory lock. If another process holds the lock longer than this, the acquisition fails with a descriptive error instead of waiting indefinitely.
* `schema` – _`string | URL | Umzug`_ – an umzug instance that can be used to initialize tables or the schema itself or a `URL` to a text file containing the schema
* `statementTimeoutMs` – _`[number]`_ – _optional_ – per-statement query timeout in milliseconds, applied to pool connections. Prevents any single query from hanging indefinitely.
* `tableLoadOrder` – _`[Array<string[] | string>]`_ – _optional_ – tables in parent-first insertion order: the first item is loaded first and dropped last. Use nested arrays to group tables that can be dropped in parallel. Mutually exclusive with `tablesWithDependencies`.
* `tablesWithDependencies` – _`[Array<string[] | string>]`_ – _optional_ – **Deprecated:** use `tableLoadOrder` instead. Tables in leaf-first deletion order: the first item is dropped first and loaded last.

### Methods

* `setup() => Promise<this>` – convenience method that runs the standard sequence: `removeTables()`, `initTables()`, and `insertFixtures()` (when `fixtureFolder` is set). Returns `this` so it can be chained with `await using`.
* `initTables() => Promise<void>` – sets up all of the tables. Automatically acquires an exclusive database lock on first call.
* `insertFixtures() => Promise<void>` – inserts all the fixtures data into the tables (only usable if `fixtureFolder` has been set). Automatically acquires an exclusive database lock on first call.
* `removeTables() => Promise<void>` – removes all of the tables (respecting `tableLoadOrder` / `tablesWithDependencies` ordering). Automatically acquires an exclusive database lock on first call. **Note:** this drops all tables in the `public` schema, not just those defined in `schema`.
* `end() => Promise<void>` – releases the database lock (if acquired) and closes all database connections. **Always call this when done** to properly clean up resources.
* `[Symbol.asyncDispose]() => Promise<void>` – alias for `end()`. Enables `await using` syntax for automatic cleanup.

#### Database Locking

The `PgTestHelpers` class uses [PostgreSQL advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS) to ensure exclusive database access during test operations. The lock is automatically acquired on the first call to `initTables()`, `insertFixtures()`, or `removeTables()`, and is held until `end()` is called. This prevents multiple test suites from interfering with each other when using the same database.

Advisory locks are **cluster-scoped** — all connections to the same PostgreSQL cluster (even to different databases) that use the same `lockId` will serialize against each other. The default `lockId` of `42` ensures all `PgTestHelpers` instances coordinate, which is normally what you want.

#### Parallel Test Runners

When using `node:test` or other parallel test runners, all test files share the same database and the same advisory lock (ID `42`). This means they serialize — which is correct, since `removeTables()` drops all public tables and concurrent drops would corrupt each other's state.

If your test files truly need parallel execution, consider using separate databases per test file and setting a unique `lockId` per database.

## Using with node:test

### Per-test with `await using`

The simplest pattern when each test needs a fresh database state. The `setup()` method runs `removeTables()`, `initTables()`, and `insertFixtures()` in one call, then `await using` calls `end()` automatically when the test exits:

```javascript
import { describe, it } from 'node:test';
import { PgTestHelpers } from '@voxpelli/pg-utils';

describe('my feature', () => {
  it('inserts a record', async () => {
    await using helpers = await new PgTestHelpers({
      connectionString: process.env.DATABASE_URL,
      schema: new URL('./schema.sql', import.meta.url),
    }).setup();

    // Tables are ready. helpers.end() called automatically on scope exit.
    const { rows } = await helpers.queryPromise('SELECT 1 AS val');
  });
});
```

**Trade-off:** each test pays the full setup cost (drop + create + load fixtures). For suites with many tests against the same fixture data, use the `beforeEach`/`afterEach` pattern instead.

### Per-test with `t.after()`

An alternative to `await using` that works without `Symbol.asyncDispose`. The test context's `after()` method registers a cleanup callback that runs after the test completes, even on failure:

```javascript
import { describe, it } from 'node:test';
import { PgTestHelpers } from '@voxpelli/pg-utils';

describe('my feature', () => {
  it('inserts a record', async (t) => {
    const helpers = await new PgTestHelpers({
      connectionString: process.env.DATABASE_URL,
      schema: new URL('./schema.sql', import.meta.url),
    }).setup();

    t.after(() => helpers.end());

    // Test body...
  });
});
```

### Suite-level with `beforeEach`/`afterEach`

Use hooks when the `helpers` reference is needed outside the test body — for example, to pass `helpers.queryPromise` to seed helpers or to share the setup across multiple tests. `await using` cannot be used in hooks because the scope exits when the hook function returns, before any tests run.

```javascript
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { PgTestHelpers } from '@voxpelli/pg-utils';

describe('my feature', () => {
  /** @type {PgTestHelpers} */
  let helpers;

  beforeEach(async () => {
    try {
      helpers = await new PgTestHelpers({
        connectionString: process.env.DATABASE_URL,
        schema: new URL('./schema.sql', import.meta.url),
        fixtureFolder: new URL('./fixtures', import.meta.url),
      }).setup();
    } catch (err) {
      await helpers.end();
      throw err;
    }
  });

  afterEach(async () => {
    await helpers.end();
  });

  it('reads a record', async () => {
    const { rows } = await helpers.queryPromise('SELECT 1 AS val');
    assert.strictEqual(rows[0]?.val, 1);
  });
});
```

The `try/catch` in `beforeEach` ensures `end()` is called if setup throws. Because `end()` is idempotent, calling it in both the catch block and `afterEach` is safe.

## Factory pattern

For projects with multiple test files sharing the same database configuration, centralise `PgTestHelpers` construction in a factory function:

```javascript
// tools/test-helpers.js
import { PgTestHelpers } from '@voxpelli/pg-utils';

export const testHelpers = () => new PgTestHelpers({
  connectionString: process.env.DATABASE_URL,
  schema: new URL('../schema.sql', import.meta.url),
  fixtureFolder: new URL('../test/fixtures', import.meta.url),
  tableLoadOrder: [
    'accounts',
    ['posts', 'comments'],
  ],
});
```

Test files become minimal:

```javascript
import { afterEach, beforeEach, describe, it } from 'node:test';
import { testHelpers } from '../tools/test-helpers.js';

describe('posts', () => {
  /** @type {import('@voxpelli/pg-utils').PgTestHelpers} */
  let helpers;

  beforeEach(async () => {
    try {
      helpers = await testHelpers().setup();
    } catch (err) {
      await helpers.end();
      throw err;
    }
  });

  afterEach(async () => {
    await helpers.end();
  });

  // ... tests using helpers.queryPromise ...
});
```

## csvFromFolderToDb()

Imports data into tables from a folder of CSV files. All files will be imported and they should named by their table names + `.csv`.

### Syntax

```ts
csvFromFolderToDb(pool, path, [options]) => Promise<void>
```

### Arguments

* `pool` – _`string | pg.Pool`_ – a postgres pool to use for the queries or a connection string that will be used to create one
* `path` – _`string | URL`_ – the path to the folder that contains the CSV:s named by their table names
* `options` – _`object`_ – _optional_ – ordering options (also accepts a `string[]` for backwards compatibility, treated as `tablesWithDependencies`)
  * `tableLoadOrder` – _`string[]`_ – tables in parent-first insertion order: the first table is loaded first. Mutually exclusive with `tablesWithDependencies`.
  * `tablesWithDependencies` – _`string[]`_ – **Deprecated:** use `tableLoadOrder` instead. Tables in leaf-first deletion order: the first table is loaded last.

### Returns

`Promise` that resolves on completion

## dbToCsvFolder()

Exports database tables to CSV files in a folder. Each table is written as `<table>.csv` with a header row.

### Syntax

```ts
dbToCsvFolder(connection, outputPath, tables, [options]) => Promise<void>
```

### Arguments

* `connection` – _`string | pg.Pool`_ – a postgres pool to use for the queries or a connection string that will be used to create one
* `outputPath` – _`string | URL`_ – the directory to write CSV files into (created if it does not exist)
* `tables` – _`string[]`_ – explicit list of table names to export
* `options` – _`object`_ – _optional_
  * `orderBy` – _`string`_ – column index (e.g. `'1'`) or simple identifier (e.g. `'created_at'`) for deterministic output ordering (default: `'1'`, i.e. the first column). Expressions, `ASC`/`DESC`, and multi-column values are not accepted.

### Returns

`Promise` that resolves on completion
