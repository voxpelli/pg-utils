import { readFile } from 'node:fs/promises';

import pg from 'pg';
import {
  createUmzeptionPgContext,
  pgInstallSchemaFromString,
} from 'umzeption';

import { csvFromFolderToDb } from './csv-folder-to-db.js';
import { createPgPool, createAndLockConnection, releaseLock, isStringArray, TypeNeverError } from './utils.js';

/** @import { Pool, Client } from 'pg' */

/**
 * @typedef PgTestHelpersOptions
 * @property {string} connectionString
 * @property {string | URL} [fixtureFolder]
 * @property {string[]} [ignoreTables]
 * @property {number} [lockId] Advisory lock ID. Default: 42. Use unique IDs per test file for parallel runners (advisory locks are cluster-scoped).
 * @property {number} [lockTimeoutMs] Lock acquisition timeout in milliseconds. No default (waits indefinitely).
 * @property {number} [statementTimeoutMs] Per-statement query timeout in milliseconds on the pool. No default.
 * @property {number} [idleInTransactionTimeoutMs] Idle-in-transaction timeout in milliseconds. No default.
 * @property {string | URL | ((pool: Pool) => import('umzug').Umzug<import('umzeption').UmzeptionContext<'pg', import('umzeption').FastifyPostgresStyleDb>>)} schema
 * @property {Array<string[] | string>} [tableLoadOrder] Tables in parent-first insertion order. First item loaded first, dropped last. Mutually exclusive with `tablesWithDependencies`.
 * @property {Array<string[] | string>} [tablesWithDependencies] Deprecated: use `tableLoadOrder` instead. Tables in leaf-first deletion order. First item dropped first, loaded last.
 */

export class PgTestHelpers {
  /** @type {string} */
  #connectionString;
  /** @type {boolean} */
  #ended = false;
  /** @type {string | URL | undefined} */
  #fixtureFolder;
  /** @type {string[] | undefined} */
  #ignoreTables;
  /** @type {number} */
  #lockId;
  /** @type {number | undefined} */
  #lockTimeoutMs;
  /** @type {Pool} */
  #pool;
  /** @type {Promise<Client> | Client | undefined} */
  #lockClient;
  /** @type {PgTestHelpersOptions['schema']} */
  #schema;
  /** @type {Array<string[] | string> | undefined} */
  #tablesWithDependencies;
  /** @type {string[] | undefined} */
  #tableLoadOrder;
  /** @type {Pool['query']} */
  queryPromise;

  /** @param {PgTestHelpersOptions} options */
  constructor (options) {
    if (!options || typeof options !== 'object') {
      throw new TypeNeverError(options, 'Expected an options object');
    }

    const {
      connectionString,
      fixtureFolder,
      idleInTransactionTimeoutMs,
      ignoreTables,
      lockId = 42,
      lockTimeoutMs,
      schema,
      statementTimeoutMs,
      tableLoadOrder,
      tablesWithDependencies,
    } = options;

    if (typeof connectionString !== 'string') {
      throw new TypeNeverError(connectionString, 'Invalid connectionString, expected a string');
    }
    if (fixtureFolder && typeof fixtureFolder !== 'string' && !(fixtureFolder instanceof URL)) {
      throw new TypeNeverError(fixtureFolder, 'Invalid fixtureFolder, expected a string');
    }
    if (ignoreTables && !Array.isArray(ignoreTables)) {
      throw new TypeNeverError(ignoreTables, 'Invalid ignoreTables, expected an array');
    }
    if (typeof schema !== 'string' && typeof schema !== 'object' && typeof schema !== 'function') {
      throw new TypeNeverError(schema, 'Invalid schema, expected a string, object or function');
    }
    if (tableLoadOrder && tablesWithDependencies) {
      throw new Error('Cannot specify both tableLoadOrder and tablesWithDependencies');
    }
    if (tableLoadOrder && !Array.isArray(tableLoadOrder)) {
      throw new TypeNeverError(tableLoadOrder, 'Invalid tableLoadOrder, expected an array');
    }
    if (tablesWithDependencies && !Array.isArray(tablesWithDependencies)) {
      throw new TypeNeverError(tablesWithDependencies, 'Invalid tablesWithDependencies, expected an array');
    }
    if (lockId !== undefined && (typeof lockId !== 'number' || !Number.isSafeInteger(lockId))) {
      throw new TypeError('Invalid lockId, expected a safe integer');
    }
    if (lockTimeoutMs !== undefined && (typeof lockTimeoutMs !== 'number' || !Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 0)) {
      throw new TypeError('Invalid lockTimeoutMs, expected a non-negative safe integer');
    }
    if (statementTimeoutMs !== undefined && (typeof statementTimeoutMs !== 'number' || !Number.isSafeInteger(statementTimeoutMs) || statementTimeoutMs < 0)) {
      throw new TypeError('Invalid statementTimeoutMs, expected a non-negative safe integer');
    }
    if (idleInTransactionTimeoutMs !== undefined && (typeof idleInTransactionTimeoutMs !== 'number' || !Number.isSafeInteger(idleInTransactionTimeoutMs) || idleInTransactionTimeoutMs < 0)) {
      throw new TypeError('Invalid idleInTransactionTimeoutMs, expected a non-negative safe integer');
    }

    const pool = createPgPool(connectionString);

    // Set pool-level timeouts via 'connect' event. pg.Client serializes queries
    // internally, so the SET completes before any caller query even though the
    // callback return value is not awaited by pg-pool.
    if (statementTimeoutMs !== undefined) {
      pool.on('connect', (/** @type {import('pg').PoolClient} */ client) => {
        // eslint-disable-next-line promise/prefer-await-to-then
        client.query(`SET statement_timeout = ${Number(statementTimeoutMs)}`).catch(() => {});
      });
    }
    if (idleInTransactionTimeoutMs !== undefined) {
      pool.on('connect', (/** @type {import('pg').PoolClient} */ client) => {
        // eslint-disable-next-line promise/prefer-await-to-then
        client.query(`SET idle_in_transaction_session_timeout = ${Number(idleInTransactionTimeoutMs)}`).catch(() => {});
      });
    }

    // tableLoadOrder is parent-first; reverse to get the leaf-first
    // order that internal methods expect (drop first item first, load last)
    this.#tablesWithDependencies = tableLoadOrder
      ? [...tableLoadOrder].reverse()
      : tablesWithDependencies;
    this.#tableLoadOrder = tableLoadOrder?.flat();

    this.#connectionString = connectionString;
    this.#fixtureFolder = fixtureFolder;
    this.#ignoreTables = ignoreTables;
    this.#lockId = lockId;
    this.#lockTimeoutMs = lockTimeoutMs;
    this.#pool = pool;
    this.#schema = schema;
    this.queryPromise = pool.query.bind(pool);
  }

  /** @returns {Promise<string[]>} */
  async #getTableNames () {
    const { rows } = await this.queryPromise('SELECT tablename FROM pg_tables WHERE schemaname = \'public\'');
    return rows.map(row => row.tablename);
  }

  /**
   * @param {Array<string[] | string>} tables
   * @param {boolean} [allowParallelRemoval]
   * @returns {Promise<void>}
   */
  async #removeTablesByName (tables, allowParallelRemoval = false) {
    if (allowParallelRemoval && isStringArray(tables)) {
      await Promise.all(
        tables.map(name => this.queryPromise('DROP TABLE IF EXISTS ' + pg.escapeIdentifier(/** @type {string} */ (name)) + ' CASCADE'))
      ).catch(cause => {
        throw new Error(`Failed to drop tables: ${tables}`, { cause });
      });
    } else {
      for (const name of tables) {
        await (
          Array.isArray(name)
            ? this.#removeTablesByName(name, true)
            : this.queryPromise('DROP TABLE IF EXISTS ' + pg.escapeIdentifier(/** @type {string} */ (name)) + ' CASCADE').catch(cause => {
              throw new Error(`Failed to drop table: ${name}`, { cause });
            })
        );
      }
    }
  }

  /**
   * Acquire an advisory lock used by this helper to serialize access with other
   * code that uses the same locking mechanism.
   *
   * This does not block all other database operations: only code paths that
   * acquire the same advisory lock ID via {@link createAndLockConnection} will
   * be prevented from proceeding concurrently. The lock is held until
   * {@link end} is called.
   *
   * @returns {Promise<Client>}
   */
  async #ensureLocked () {
    if (this.#ended) {
      throw new Error('This PgTestHelpers instance has been ended through .end() and can not be used any more.');
    }

    if (!this.#lockClient) {
      this.#lockClient = createAndLockConnection(this.#connectionString, {
        lockId: this.#lockId,
        ...this.#lockTimeoutMs !== undefined && { lockTimeoutMs: this.#lockTimeoutMs },
      // eslint-disable-next-line promise/prefer-await-to-then
      }).then(result => {
        this.#lockClient = result;
        return result;
      }, (err) => {
        this.#lockClient = undefined;
        throw err;
      });
    }

    return this.#lockClient;
  }

  /** @returns {Promise<void>} */
  async #releaseLocked () {
    const lockClient = this.#lockClient;

    if (lockClient) {
      this.#lockClient = undefined;
      await releaseLock(lockClient, this.#lockId);
    }
  }

  /** @returns {Promise<void>} */
  async initTables () {
    await this.#ensureLocked();

    try {
      if (typeof this.#schema === 'function') {
        await this.#schema(this.#pool).up();
        return;
      }

      const schema = this.#schema instanceof URL
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        ? await readFile(this.#schema, 'utf8')
        : this.#schema;

      return pgInstallSchemaFromString(createUmzeptionPgContext(this.#pool), schema);
    } catch (cause) {
      try { await this.#releaseLocked(); } catch {}
      throw new Error('Failed to create tables', { cause });
    }
  }

  /** @returns {Promise<void>} */
  async insertFixtures () {
    if (!this.#fixtureFolder) {
      throw new Error('No fixture folder defined');
    }

    await this.#ensureLocked();

    /** @type {import('./csv-folder-to-db.js').CsvFromFolderToDbOptions | undefined} */
    let options;

    if (this.#tableLoadOrder) {
      options = { tableLoadOrder: this.#tableLoadOrder };
    } else if (this.#tablesWithDependencies) {
      options = { tablesWithDependencies: this.#tablesWithDependencies.flat() };
    }

    try {
      await csvFromFolderToDb(this.#pool, this.#fixtureFolder, options);
    } catch (cause) {
      try { await this.#releaseLocked(); } catch {}
      throw new Error('Failed to import fixtures', { cause });
    }
  }

  /**
   * Convenience method for the standard test setup sequence: remove existing
   * tables, create the schema, and optionally load fixtures (when `fixtureFolder`
   * is configured). Returns `this` so the result can be used with `await using`.
   *
   * @returns {Promise<this>}
   */
  async setup () {
    try {
      await this.removeTables();
      await this.initTables();

      if (this.#fixtureFolder) {
        await this.insertFixtures();
      }
    } catch (cause) {
      try { await this.end(); } catch {}
      throw cause;
    }

    return this;
  }

  /** @returns {Promise<void>} */
  async removeTables () {
    await this.#ensureLocked();

    try {
      if (this.#tablesWithDependencies) {
        await this.#removeTablesByName(this.#tablesWithDependencies);
      }

      let tableNames = await this.#getTableNames();
      const ignoreTables = this.#ignoreTables;

      if (ignoreTables) {
        tableNames = tableNames.filter(name => !ignoreTables.includes(name));
      }

      await this.#removeTablesByName(tableNames);
    } catch (cause) {
      try { await this.#releaseLocked(); } catch {}
      throw new Error('Failed to remove tables', { cause });
    }
  }

  /** @returns {Promise<void>} */
  async end () {
    if (this.#ended) return;

    this.#ended = true;

    try {
      await this.#releaseLocked();
    } finally {
      await this.#pool.end();
    }
  }

  /** @returns {Promise<void>} */
  async [Symbol.asyncDispose] () {
    await this.end();
  }
}

/**
 * Create and set up a {@link PgTestHelpers} instance for use with `await using`.
 * Cleanup happens automatically via `Symbol.asyncDispose` on scope exit.
 *
 * @param {PgTestHelpersOptions} options
 * @returns {Promise<PgTestHelpers>}
 */
export async function pgTestSetup (options) {
  return new PgTestHelpers(options).setup();
}

/**
 * Create and set up a {@link PgTestHelpers} instance with cleanup registered
 * on a test context via `t.after()`. No `await using` or `afterEach` needed.
 *
 * Useful in `node:test` `it()` bodies and `beforeEach()` hooks where `t`
 * provides the test context. The `t` parameter uses duck-typing with `after`
 * optional so it accepts node:test's `TestContext | SuiteContext` union from
 * `beforeEach` hooks. At runtime, `beforeEach` always passes `TestContext`
 * (which has `after`). A clear error is thrown if `after` is missing.
 *
 * @param {PgTestHelpersOptions} options
 * @param {{ after?: (fn: () => Promise<void>) => void }} t Test context.
 * @returns {Promise<PgTestHelpers>}
 */
export async function pgTestSetupFor (options, t) {
  if (typeof t?.after !== 'function') {
    throw new TypeError('pgTestSetupFor requires a test context with an after() method');
  }

  const helpers = await new PgTestHelpers(options).setup();
  t.after(() => helpers.end());
  return helpers;
}
