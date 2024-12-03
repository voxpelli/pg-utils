# @voxpelli/pg-utils

My personal database utils / helpers for Postgres

[![npm version](https://img.shields.io/npm/v/@voxpelli/pg-utils.svg?style=flat)](https://www.npmjs.com/package/@voxpelli/pg-utils)
[![npm downloads](https://img.shields.io/npm/dm/@voxpelli/pg-utils.svg?style=flat)](https://www.npmjs.com/package/@voxpelli/pg-utils)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-7fffff?style=flat&labelColor=ff80ff)](https://github.com/neostandard/neostandard)
[![Module type: ESM](https://img.shields.io/badge/module%20type-esm-brightgreen)](https://github.com/voxpelli/badges-cjs-esm)
[![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)](https://github.com/voxpelli/types-in-js)
[![Follow @voxpelli@mastodon.social](https://img.shields.io/mastodon/follow/109247025527949675?domain=https%3A%2F%2Fmastodon.social&style=social)](https://mastodon.social/@voxpelli)

## Usage

```javascript
import {
  csvFromFolderToDb,
  PgTestHelpers,
} from '@voxpelli/pg-utils';

const pgHelpers = new PgTestHelpers({
  connectionString: 'postgres://user:pass@localhost/example',
  fixtureFolder: new URL('./fixtures', import.meta.url),
  schema: new URL('./create-tables.sql', import.meta.url),,
  tablesWithDependencies: [
    'abc',
    ['foo', 'bar'],
  ]
});
```

## PgTestHelpers

Class that creates a helpers instance

### Syntax

```ts
new PgTestHelpers({
  connectionString: 'postgres://user:pass@localhost/example',
  fixtureFolder: new URL('./fixtures', import.meta.url),
  schema: new URL('./create-tables.sql', import.meta.url),,
  tablesWithDependencies: [
    // ...
  ]
});
```

### Arguments

* `options` – _[`PgTestHelpersOptions`](#pgtesthelpersoptions)_

### PgTestHelpersOptions

* `connectionString` – _`string | _ – a connection string for the postgres database
* `fixtureFolder` – _`[string | URL]`_ – _optional_ – the path to a folder of `.csv`-file fixtures named by their respective table
* `schema` – _`string | URL | Umzug`_ – an umzug instance that can be used to initialize tables or the schema itself or a `URL` to a text file containing the schema
* `tablesWithDependencies` – _`[Array<string[] | string>]`_ – _optional_ – names of tables that depend on other tables. If some of these tables depend on each other, then use nested arrays to ensure that within the same array no two tables depend on each other

### Methods

* `initTables() => Promise<void>` – sets up all of the tables
* `insertFixtures() => Promise<void>` – inserts all the fixtures data into the tables (only usable if `fixtureFolder` has been set)
* `removeTables() => Promise<void>` – removes all of the tables (starting with `tablesWithDependencies`)

## csvFromFolderToDb()

Imports data into tables from a folder of CSV files. All files will be imported and they should named by their table names + `.csv`.

### Syntax

```ts
csvFromFolderToDb(pool, path, [tablesWithDependencies]) => Promise<void>
```

### Arguments

* `pool` – _`string | pg.Pool`_ – a postgres pool to use for the queries or a connection string that will be used to create one
* `path` – _`string | URL`_ – the path to the folder that contains the CSV:s named by their table names
* `tablesWithDependencies` – _`[string[]]`_ – _optional_ – names of tables that depend on other tables. The first name in this list will have its fixtures inserted last

### Returns

`Promise` that resolves on completion

<!-- ## Used by

* [`example`](https://example.com/) – used by this one to do X and Y

## Similar modules

* [`example`](https://example.com/) – is similar in this way

## See also

* [Announcement blog post](#)
* [Announcement tweet](#) -->
