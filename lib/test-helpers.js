import { readFile } from 'node:fs/promises';

import {
  createUmzeptionPgContext,
  pgInstallSchemaFromString,
} from 'umzeption';

import { csvFromFolderToDb } from './csv-folder-to-db.js';
import { createPgPool, isStringArray, TypeNeverError } from './utils.js';

/** @import { Pool } from 'pg' */

/**
 * @typedef PgTestHelpersOptions
 * @property {string} connectionString
 * @property {string | URL} [fixtureFolder]
 * @property {string | URL | (() => import('umzug').Umzug<import('umzeption').UmzeptionContext<'pg', import('umzeption').FastifyPostgresStyleDb>>)} schema
 * @property {Array<string[] | string>} [tablesWithDependencies]
 */

export class PgTestHelpers {
  /** @type {string | URL | undefined} */
  #fixtureFolder;
  /** @type {Pool} */
  #pool;
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
      schema,
      tablesWithDependencies,
    } = options;

    if (typeof connectionString !== 'string') {
      throw new TypeNeverError(connectionString, 'Invalid connectionString, expected a string');
    }
    if (fixtureFolder && typeof fixtureFolder !== 'string' && !(fixtureFolder instanceof URL)) {
      throw new TypeNeverError(fixtureFolder, 'Invalid fixtureFolder, expected a string');
    }
    if (typeof schema !== 'string' && typeof schema !== 'object' && typeof schema !== 'function') {
      throw new TypeNeverError(schema, 'Invalid schema, expected a string, object or function');
    }
    if (tablesWithDependencies && !Array.isArray(tablesWithDependencies)) {
      throw new TypeNeverError(tablesWithDependencies, 'Invalid tablesWithDependencies, expected an array');
    }

    const pool = createPgPool(connectionString);

    this.#fixtureFolder = fixtureFolder;
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
   * @returns {Promise<void>}
   */
  async #removeTablesByName (tables) {
    if (isStringArray(tables)) {
      await Promise.all(
        tables.map(name => this.queryPromise('DROP TABLE IF EXISTS ' + name + ' CASCADE'))
      ).catch(cause => {
        throw new Error(`Failed to drop tables: ${tables}`, { cause });
      });
    } else {
      for (const name of tables) {
        await (
          Array.isArray(name)
            ? this.#removeTablesByName(name)
            : this.queryPromise('DROP TABLE IF EXISTS ' + name + ' CASCADE').catch(cause => {
              throw new Error(`Failed to drop table: ${name}`, { cause });
            })
        );
      }
    }
  }

  /** @returns {Promise<void>} */
  async initTables () {
    try {
      if (typeof this.#schema === 'function') {
        await this.#schema().up();
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
    return csvFromFolderToDb(this.#pool, this.#fixtureFolder, this.#tablesWithDependencies?.flat());
  }

  /** @returns {Promise<void>} */
  async removeTables () {
    if (this.#tablesWithDependencies) {
      await this.#removeTablesByName(this.#tablesWithDependencies);
    }
    await this.#removeTablesByName(await this.#getTableNames());
  }
}
