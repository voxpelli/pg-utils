import chai from 'chai';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import pathModule from 'node:path';
import { tmpdir } from 'node:os';
import { Pool } from 'pg';

import { csvFromFolderToDb, dbToCsvFolder, PgTestHelpers } from '../../index.js';

import { connectionString } from '../db.js';

chai.should();

describe('dbToCsvFolder integration', function () {
  this.timeout(15000);

  /** @type {import('../../index.js').PgTestHelpers} */
  let testHelpers;

  before(async () => {
    testHelpers = new PgTestHelpers({
      connectionString,
      fixtureFolder: new URL('../simple-fixtures', import.meta.url),
      schema: new URL('../create-simple-tables.pgsql', import.meta.url),
    });
    await testHelpers.removeTables();
    await testHelpers.initTables();
    await testHelpers.insertFixtures();
  });

  after(async () => {
    await testHelpers.removeTables();
    await testHelpers.end();
  });

  it('should export a table to CSV with a pool', async () => {
    const pool = new Pool({ connectionString });

    /** @type {string | undefined} */
    let outputDir;

    try {
      outputDir = await mkdtemp(pathModule.join(tmpdir(), 'pg-utils-export-'));

      await dbToCsvFolder(pool, outputDir, ['users']);

      const csv = await readFile(pathModule.join(outputDir, 'users.csv'), 'utf8');
      const lines = csv.trimEnd().split('\n');

      /** @type {string} */ (lines[0]).should.equal('id,name,email,role,created_at,last_edited_at');
      lines.should.have.lengthOf(3); // header + 2 data rows
    } finally {
      await pool.end();
      if (outputDir) {
        await rm(outputDir, { recursive: true, force: true });
      }
    }
  });

  it('should export a table to CSV with a connection string', async () => {
    /** @type {string | undefined} */
    let outputDir;

    try {
      outputDir = await mkdtemp(pathModule.join(tmpdir(), 'pg-utils-export-'));

      await dbToCsvFolder(connectionString, outputDir, ['users']);

      const csv = await readFile(pathModule.join(outputDir, 'users.csv'), 'utf8');
      const lines = csv.trimEnd().split('\n');

      /** @type {string} */ (lines[0]).should.equal('id,name,email,role,created_at,last_edited_at');
      lines.should.have.lengthOf(3);
    } finally {
      if (outputDir) {
        await rm(outputDir, { recursive: true, force: true });
      }
    }
  });

  it('should create the output directory if it does not exist', async () => {
    /** @type {string | undefined} */
    let outputDir;

    try {
      const base = await mkdtemp(pathModule.join(tmpdir(), 'pg-utils-export-'));
      outputDir = pathModule.join(base, 'nested', 'dir');

      await dbToCsvFolder(connectionString, outputDir, ['users']);

      const csv = await readFile(pathModule.join(outputDir, 'users.csv'), 'utf8');
      csv.should.include('id,name,email,role');

      await rm(base, { recursive: true, force: true });
      outputDir = undefined; // cleaned up via base
    } finally {
      if (outputDir) {
        await rm(outputDir, { recursive: true, force: true });
      }
    }
  });

  it('should produce CSV that can be re-imported', async () => {
    const pool = new Pool({ connectionString });

    /** @type {string | undefined} */
    let outputDir;

    try {
      outputDir = await mkdtemp(pathModule.join(tmpdir(), 'pg-utils-roundtrip-'));

      // Export
      await dbToCsvFolder(pool, outputDir, ['users']);

      // Clear the table
      await pool.query('DELETE FROM users');
      const { rows: emptyRows } = await pool.query('SELECT * FROM users');
      emptyRows.should.have.lengthOf(0);

      // Re-import
      await csvFromFolderToDb(pool, outputDir);

      // Verify data matches
      const { rows } = await pool.query('SELECT * FROM users ORDER BY name');
      rows.should.have.lengthOf(2);
      rows[0].name.should.equal('Bob Smith');
      rows[1].name.should.equal('Carl Foo');
    } finally {
      // Restore fixtures for other tests
      await pool.query('DELETE FROM users');
      await csvFromFolderToDb(
        pool,
        new URL('../simple-fixtures', import.meta.url).pathname
      );
      await pool.end();
      if (outputDir) {
        await rm(outputDir, { recursive: true, force: true });
      }
    }
  });

  it('should fail with a descriptive error for a non-existent table', async () => {
    /** @type {string | undefined} */
    let outputDir;

    try {
      outputDir = await mkdtemp(pathModule.join(tmpdir(), 'pg-utils-export-'));

      await dbToCsvFolder(connectionString, outputDir, ['table_that_does_not_exist']);

      throw new Error('Expected export to fail');
    } catch (/** @type {unknown} */ err) {
      /** @type {Error} */ (err).message.should.match(/table_that_does_not_exist/);
    } finally {
      if (outputDir) {
        await rm(outputDir, { recursive: true, force: true });
      }
    }
  });
});
