import chai from 'chai';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import pathModule from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';

import { csvFromFolderToDb, PgTestHelpers } from '../../index.js';

import { connectionString } from '../db.js';

chai.should();

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 * @returns {Promise<T>}
 */
async function withTimeout (promise, timeoutMs) {
  return Promise.race([
    promise,
    (async () => {
      await delay(timeoutMs);
      throw new Error(`Timed out after ${timeoutMs}ms`);
    })(),
  ]);
}

describe('csvFromFolderToDb integration', () => {
  it('should release the client when fixture import fails', async function () {
    this.timeout(5000);
    const tableName = 'table_that_should_not_exist';
    const fixturePath = await mkdtemp(pathModule.join(tmpdir(), 'pg-utils-regression-'));

    const pool = new Pool({
      connectionString,
      max: 1,
    });

    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await writeFile(
        pathModule.join(fixturePath, `${tableName}.csv`),
        'id\n1\n'
      );

      try {
        await csvFromFolderToDb(pool, fixturePath);
        throw new Error('Expected fixture import to fail');
      } catch (err) {
        /** @type {Error} */ (err).message.should.equal(`Failed inserting data into "${tableName}"`);
      }

      pool.totalCount.should.equal(1);
      pool.idleCount.should.equal(1);

      const { rows } = await withTimeout(pool.query('SELECT 1 AS value'), 1000);
      rows.should.deep.equal([
        { value: 1 },
      ]);
    } finally {
      await rm(fixturePath, { recursive: true, force: true });
      await pool.end();
    }
  });

  it('should import fixtures using tableLoadOrder (parent-first)', async function () {
    this.timeout(10000);

    const testHelpers = new PgTestHelpers({
      connectionString,
      schema: new URL('../create-complex-tables.pgsql', import.meta.url),
      tableLoadOrder: [
        ['user_foo', 'user_bar'],
        'foobar',
      ],
    });

    const pool = new Pool({ connectionString });

    try {
      await testHelpers.removeTables();
      await testHelpers.initTables();

      // Parent-first: users loaded before user_foo/user_bar, which load before foobar
      await csvFromFolderToDb(
        pool,
        new URL('../complex-fixtures', import.meta.url),
        { tableLoadOrder: ['user_foo', 'user_bar', 'foobar'] }
      );

      const { rows: foobarRows } = await pool.query('SELECT * FROM foobar');
      foobarRows.should.have.lengthOf(2);

      const { rows: userRows } = await pool.query('SELECT * FROM users');
      userRows.should.have.lengthOf(2);
    } finally {
      await testHelpers.removeTables();
      await testHelpers.end();
      await pool.end();
    }
  });

  it('should throw when both tableLoadOrder and tablesWithDependencies are provided', async () => {
    try {
      await csvFromFolderToDb(
        connectionString,
        new URL('../simple-fixtures', import.meta.url),
        { tableLoadOrder: ['users'], tablesWithDependencies: ['users'] }
      );
      throw new Error('Expected to throw');
    } catch (/** @type {unknown} */ err) {
      /** @type {Error} */ (err).message.should.match(/Cannot specify both/);
    }
  });
});
