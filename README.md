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
import {
  csvFromFolderToDb,
  dbToCsvFolder,
  PgTestHelpers,
} from '@voxpelli/pg-utils';

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
  // The helper automatically acquires an exclusive database lock
  // on the first call to initTables(), insertFixtures(), or removeTables()
  // to prevent concurrent access between tests during test operations.
  await pgHelpers.initTables();
  await pgHelpers.insertFixtures();
} finally {
  // Always release the lock and close connections,
  // even if a test or setup step throws an error
  await pgHelpers.end();
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
* `ignoreTables` – _`[string[]]`_ – _optional_ – names of tables to ignore when dropping
* `schema` – _`string | URL | Umzug`_ – an umzug instance that can be used to initialize tables or the schema itself or a `URL` to a text file containing the schema
* `tableLoadOrder` – _`[Array<string[] | string>]`_ – _optional_ – tables in parent-first insertion order: the first item is loaded first and dropped last. Use nested arrays to group tables that can be dropped in parallel. Mutually exclusive with `tablesWithDependencies`.
* `tablesWithDependencies` – _`[Array<string[] | string>]`_ – _optional_ – **Deprecated:** use `tableLoadOrder` instead. Tables in leaf-first deletion order: the first item is dropped first and loaded last.

### Methods

* `initTables() => Promise<void>` – sets up all of the tables. Automatically acquires an exclusive database lock on first call.
* `insertFixtures() => Promise<void>` – inserts all the fixtures data into the tables (only usable if `fixtureFolder` has been set). Automatically acquires an exclusive database lock on first call.
* `removeTables() => Promise<void>` – removes all of the tables (respecting `tableLoadOrder` / `tablesWithDependencies` ordering). Automatically acquires an exclusive database lock on first call.
* `end() => Promise<void>` – releases the database lock (if acquired) and closes all database connections. **Always call this when done** to properly clean up resources.

#### Database Locking

The `PgTestHelpers` class uses [PostgreSQL advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS) to ensure exclusive database access during test operations. The lock is automatically acquired on the first call to `initTables()`, `insertFixtures()`, or `removeTables()`, and is held until `end()` is called. This prevents multiple test suites from interfering with each other when using the same database.

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
  * `orderBy` – _`string`_ – SQL `ORDER BY` expression for deterministic output (default: `'1'`, i.e. the first column)

### Returns

`Promise` that resolves on completion

<!-- ## Used by

* [`example`](https://example.com/) – used by this one to do X and Y

## Similar modules

* [`example`](https://example.com/) – is similar in this way

## See also

* [Announcement blog post](#)
* [Announcement tweet](#) -->
