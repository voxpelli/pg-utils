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
 * @property {string | URL | ((pool: Pool) => import('umzug').Umzug<import('umzeption').UmzeptionContext<'pg', import('umzeption').FastifyPostgresStyleDb>>)} schema
 * @property {Array<string[] | string>} [tablesWithDependencies]
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
  /** @type {Pool} */
  #pool;
  /** @type {Promise<Client> | Client | undefined} */
  #lockClient;
  /** @type {PgTestHelpersOptions['schema']} */
  #schema;
  /** @type {Array<string[] | string> | undefined} */
  #tablesWithDependencies;
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
      ignoreTables,
      schema,
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
    if (tablesWithDependencies && !Array.isArray(tablesWithDependencies)) {
      throw new TypeNeverError(tablesWithDependencies, 'Invalid tablesWithDependencies, expected an array');
    }

    const pool = createPgPool(connectionString);

    this.#connectionString = connectionString;
    this.#fixtureFolder = fixtureFolder;
    this.#ignoreTables = ignoreTables;
    this.#tablesWithDependencies = tablesWithDependencies;
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
      // eslint-disable-next-line promise/prefer-await-to-then
      this.#lockClient = createAndLockConnection(this.#connectionString).then(result => {
        this.#lockClient = result;
        return result;
      });
    }

    return this.#lockClient;
  }

  /** @returns {Promise<void>} */
  async #releaseLocked () {
    if (this.#lockClient) {
      await releaseLock(this.#lockClient);
      this.#lockClient = undefined;
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
      throw new Error('Failed to create tables', { cause });
    }
  }

  /** @returns {Promise<void>} */
  async insertFixtures () {
    if (!this.#fixtureFolder) {
      throw new Error('No fixture folder defined');
    }

    await this.#ensureLocked();

    return csvFromFolderToDb(this.#pool, this.#fixtureFolder, this.#tablesWithDependencies?.flat());
  }

  /** @returns {Promise<void>} */
  async removeTables () {
    await this.#ensureLocked();

    if (this.#tablesWithDependencies) {
      await this.#removeTablesByName(this.#tablesWithDependencies);
    }

    let tableNames = await this.#getTableNames();
    const ignoreTables = this.#ignoreTables;

    if (ignoreTables) {
      tableNames = tableNames.filter(name => !ignoreTables.includes(name));
    }

    await this.#removeTablesByName(tableNames);
  }

  /** @returns {Promise<void>} */
  async end () {
    if (this.#ended) return;

    this.#ended = true;
    await this.#releaseLocked();
    await this.#pool.end();
  }
}
