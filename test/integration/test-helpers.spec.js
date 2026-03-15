/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable unicorn/no-await-expression-member */

import chai from 'chai';
import sinon from 'sinon';

import { messageWithCauses } from 'pony-cause';

import { PgTestHelpers, pgTestSetup, pgTestSetupFor } from '../../index.js';

import { connectionString } from '../db.js';

chai.should();

describe('PgTestHelpers integration', function () {
  beforeEach(async () => {
    const cleanup = new PgTestHelpers({
      connectionString,
      schema: new URL('../create-complex-tables.pgsql', import.meta.url),
      tablesWithDependencies: [
        'foobar',
        ['user_foo', 'user_bar'],
      ],
    });

    try {
      await cleanup.removeTables();
    } finally {
      await cleanup.end();
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('simple', () => {
    it('should be able to remove and init tables', async () => {
      const testHelpers = new PgTestHelpers({
        connectionString,
        schema: new URL('../create-simple-tables.pgsql', import.meta.url),
      });
      const { queryPromise } = testHelpers;

      try {
        // Should start out empty
        await testHelpers.removeTables();
        (await queryPromise('SELECT tablename FROM pg_tables WHERE schemaname = \'public\''))
          .rows.should.deep.equal([]);

        // Should add tables
        await testHelpers.initTables();
        (await queryPromise('SELECT tablename FROM pg_tables WHERE schemaname = \'public\''))
          .rows.should.deep.equal([
            { tablename: 'users' },
          ]);

        // Should be able to remove tables again
        await testHelpers.removeTables();
        (await queryPromise('SELECT tablename FROM pg_tables WHERE schemaname = \'public\''))
          .rows.should.deep.equal([]);
      } finally {
        await testHelpers.end();
      }
    });

    it('should be able to add fixtures', async () => {
      const testHelpers = new PgTestHelpers({
        connectionString,
        fixtureFolder: new URL('../simple-fixtures', import.meta.url),
        schema: new URL('../create-simple-tables.pgsql', import.meta.url),
      });
      const { queryPromise } = testHelpers;

      try {
        await testHelpers.removeTables();
        await testHelpers.initTables();

        (await queryPromise('SELECT * FROM users'))
          .rows.should.deep.equal([]);

        // Should insert fixtures
        await testHelpers.insertFixtures();
        (await queryPromise('SELECT * FROM users'))
          .rows.should.deep.equal([
            {
              'created_at': new Date('2024-12-03T13:53:56.587Z'),
              'email': 'bob@example.com',
              'id': 'c7f1e901-28b0-41d7-9313-80fd10a07e74',
              'last_edited_at': new Date('2024-12-03T13:53:56.587Z'),
              'name': 'Bob Smith',
              'role': 'superuser',
            },
            {
              'created_at': new Date('2024-12-03T13:53:56.587Z'),
              'email': 'carl@example.com',
              'id': '2d8d41ba-fcc4-4296-a212-61365e0efb75',
              'last_edited_at': new Date('2024-12-03 13:53:56.587+00'),
              'name': 'Carl Foo',
              // eslint-disable-next-line unicorn/no-null
              'role': null,
            },
          ]);
      } finally {
        await testHelpers.end();
      }
    });
  });

  describe('complex', () => {
    it('should be able to remove and init tables', async () => {
      const testHelpers = new PgTestHelpers({
        connectionString,
        schema: new URL('../create-complex-tables.pgsql', import.meta.url),
        tablesWithDependencies: [
          'foobar',
          ['user_foo', 'user_bar'],
        ],
      });
      const { queryPromise } = testHelpers;

      try {
        // Should start out empty
        await testHelpers.removeTables();
        (await queryPromise('SELECT tablename FROM pg_tables WHERE schemaname = \'public\''))
          .rows.should.deep.equal([]);

        // Should add tables
        await testHelpers.initTables();
        (await queryPromise('SELECT tablename FROM pg_tables WHERE schemaname = \'public\''))
          .rows.should.have.deep.members([
            { tablename: 'users' },
            { tablename: 'user_foo' },
            { tablename: 'user_bar' },
            { tablename: 'foobar' },
          ]);

        // Should be able to remove tables again
        await testHelpers.removeTables();
        (await queryPromise('SELECT tablename FROM pg_tables WHERE schemaname = \'public\''))
          .rows.should.deep.equal([]);
      } finally {
        await testHelpers.end();
      }
    });

    it('should be able to add fixtures', async () => {
      const testHelpers = new PgTestHelpers({
        connectionString,
        fixtureFolder: new URL('../complex-fixtures', import.meta.url),
        schema: new URL('../create-complex-tables.pgsql', import.meta.url),
        tablesWithDependencies: [
          ['foobar'],
          ['user_foo', 'user_bar'],
        ],
      });
      const { queryPromise } = testHelpers;

      try {
        await testHelpers.removeTables();
        await testHelpers.initTables();

        (await queryPromise('SELECT * FROM users'))
          .rows.should.deep.equal([]);

        // Should insert fixtures
        await testHelpers.insertFixtures();

        (await queryPromise('SELECT * FROM users'))
          .rows.should.deep.equal([
            {
              'created_at': new Date('2024-12-03T13:53:56.587Z'),
              'email': 'bob@example.com',
              'id': 'c7f1e901-28b0-41d7-9313-80fd10a07e74',
              'last_edited_at': new Date('2024-12-03T13:53:56.587Z'),
              'name': 'Bob Smith',
              'role': 'superuser',
            },
            {
              'created_at': new Date('2024-12-03T13:53:56.587Z'),
              'email': 'carl@example.com',
              'id': '2d8d41ba-fcc4-4296-a212-61365e0efb75',
              'last_edited_at': new Date('2024-12-03T13:53:56.587Z'),
              'name': 'Carl Foo',
              // eslint-disable-next-line unicorn/no-null
              'role': null,
            },
          ]);

        (await queryPromise('SELECT * FROM foobar'))
          .rows.should.deep.equal([
            {
              'bar_id': '026bf711-57fe-4b19-8082-45f8f839a654',
              'created_at': new Date('2024-12-03T14:38:33.021Z'),
              'foo_id': '727fe786-9bb4-45a5-aba0-de18ac77554a',
              'value': 'Foobar value 1',
            },
            {
              'bar_id': '633b6403-d66b-42c2-8a80-e89dd50301f9',
              'created_at': new Date('2024-12-03T14:38:33.021Z'),
              'foo_id': '727fe786-9bb4-45a5-aba0-de18ac77554a',
              'value': 'Foobar value 2',
            },
          ]);
      } finally {
        await testHelpers.end();
      }
    });

    it('should handle table removal errors with descriptive messages', async () => {
      const testHelpers = new PgTestHelpers({
        connectionString,
        schema: new URL('../create-complex-tables.pgsql', import.meta.url),
        tablesWithDependencies: [
          'foobar',
          ['user_foo', 'user_bar'],
        ],
      });

      try {
        await testHelpers.removeTables();
        await testHelpers.initTables();

        // Stub queryPromise to simulate an error when dropping the foobar table
        const stub = sinon.stub(testHelpers, 'queryPromise');
        stub.callThrough(); // Call the original by default
        stub.withArgs(sinon.match(/foobar/)).rejects(new Error('Database connection lost'));

        try {
          await testHelpers.removeTables();
          throw new Error('Should have thrown an error');
        } catch (/** @type {unknown} */ err) {
          const error = /** @type {Error & { cause?: Error }} */ (err);
          messageWithCauses(error).should.equal('Failed to remove tables: Failed to drop table: foobar: Database connection lost');
        } finally {
          stub.restore();
          await testHelpers.removeTables();
        }
      } finally {
        await testHelpers.end();
      }
    });

    it('should acquire database lock and prevent concurrent access', async function () {
      this.timeout(10000);

      const options = {
        connectionString,
        schema: new URL('../create-simple-tables.pgsql', import.meta.url),
      };

      const testHelpers1 = new PgTestHelpers({ ...options });
      const testHelpers2 = new PgTestHelpers({ ...options });

      let firstCompleted = false;
      let secondCompleted = false;

      const firstInit = testHelpers1.removeTables()
        .then(() => {
          firstCompleted = true;
          return testHelpers1.initTables();
        })
        .then(() => {
          return { order: 'first' };
        });
      const secondInit = testHelpers2.removeTables()
        .then(() => {
          secondCompleted = true;
          return testHelpers2.initTables();
        })
        .then(() => {
          return { order: 'second' };
        });

      try {
        const { order } = await Promise.race([
          firstInit,
          secondInit,
        ]);

        firstCompleted.should.not.equal(secondCompleted, 'Only one should have completed');

        await (order === 'first' ? testHelpers1 : testHelpers2).end();

        await (order === 'first' ? secondInit : firstInit);

        firstCompleted.should.equal(secondCompleted, 'Both should have completed');
      } finally {
        await testHelpers1.end();
        await testHelpers2.end();
      }
    });
  });

  describe('tableLoadOrder', () => {
    it('should be able to remove and init tables using parent-first order', async () => {
      // tableLoadOrder uses parent-first: users → user_foo/user_bar → foobar
      // (reverse of tablesWithDependencies which is leaf-first)
      const testHelpers = new PgTestHelpers({
        connectionString,
        schema: new URL('../create-complex-tables.pgsql', import.meta.url),
        tableLoadOrder: [
          ['user_foo', 'user_bar'],
          'foobar',
        ],
      });
      const { queryPromise } = testHelpers;

      try {
        await testHelpers.removeTables();
        (await queryPromise('SELECT tablename FROM pg_tables WHERE schemaname = \'public\''))
          .rows.should.deep.equal([]);

        await testHelpers.initTables();
        (await queryPromise('SELECT tablename FROM pg_tables WHERE schemaname = \'public\''))
          .rows.should.have.deep.members([
            { tablename: 'users' },
            { tablename: 'user_foo' },
            { tablename: 'user_bar' },
            { tablename: 'foobar' },
          ]);

        await testHelpers.removeTables();
        (await queryPromise('SELECT tablename FROM pg_tables WHERE schemaname = \'public\''))
          .rows.should.deep.equal([]);
      } finally {
        await testHelpers.end();
      }
    });

    it('should be able to add fixtures using parent-first order', async () => {
      const testHelpers = new PgTestHelpers({
        connectionString,
        fixtureFolder: new URL('../complex-fixtures', import.meta.url),
        schema: new URL('../create-complex-tables.pgsql', import.meta.url),
        tableLoadOrder: [
          ['user_foo', 'user_bar'],
          ['foobar'],
        ],
      });
      const { queryPromise } = testHelpers;

      try {
        await testHelpers.removeTables();
        await testHelpers.initTables();

        (await queryPromise('SELECT * FROM users'))
          .rows.should.deep.equal([]);

        await testHelpers.insertFixtures();

        (await queryPromise('SELECT * FROM users'))
          .rows.should.deep.equal([
            {
              'created_at': new Date('2024-12-03T13:53:56.587Z'),
              'email': 'bob@example.com',
              'id': 'c7f1e901-28b0-41d7-9313-80fd10a07e74',
              'last_edited_at': new Date('2024-12-03T13:53:56.587Z'),
              'name': 'Bob Smith',
              'role': 'superuser',
            },
            {
              'created_at': new Date('2024-12-03T13:53:56.587Z'),
              'email': 'carl@example.com',
              'id': '2d8d41ba-fcc4-4296-a212-61365e0efb75',
              'last_edited_at': new Date('2024-12-03T13:53:56.587Z'),
              'name': 'Carl Foo',
              // eslint-disable-next-line unicorn/no-null
              'role': null,
            },
          ]);

        (await queryPromise('SELECT * FROM foobar'))
          .rows.should.deep.equal([
            {
              'bar_id': '026bf711-57fe-4b19-8082-45f8f839a654',
              'created_at': new Date('2024-12-03T14:38:33.021Z'),
              'foo_id': '727fe786-9bb4-45a5-aba0-de18ac77554a',
              'value': 'Foobar value 1',
            },
            {
              'bar_id': '633b6403-d66b-42c2-8a80-e89dd50301f9',
              'created_at': new Date('2024-12-03T14:38:33.021Z'),
              'foo_id': '727fe786-9bb4-45a5-aba0-de18ac77554a',
              'value': 'Foobar value 2',
            },
          ]);
      } finally {
        await testHelpers.end();
      }
    });

    it('should throw when both tableLoadOrder and tablesWithDependencies are provided', () => {
      chai.should().throw(() => new PgTestHelpers({
        connectionString,
        schema: new URL('../create-complex-tables.pgsql', import.meta.url),
        tableLoadOrder: ['foobar'],
        tablesWithDependencies: ['foobar'],
      }), /Cannot specify both/);
    });
  });

  describe('lockId and timeout options', () => {
    it('should timeout when lock cannot be acquired within lockTimeoutMs', async function () {
      this.timeout(10000);

      const schema = new URL('../create-simple-tables.pgsql', import.meta.url);

      // First helper holds the lock
      const holder = new PgTestHelpers({ connectionString, schema });

      try {
        await holder.removeTables();

        // Second helper with a short timeout should fail
        const contender = new PgTestHelpers({
          connectionString,
          schema,
          lockTimeoutMs: 200,
        });

        try {
          await contender.removeTables();
          throw new Error('Should have thrown');
        } catch (/** @type {unknown} */ err) {
          const error = /** @type {Error & { cause?: Error }} */ (err);
          error.message.should.match(/Failed to remove tables|Failed to acquire database lock/);
        } finally {
          await contender.end();
        }
      } finally {
        await holder.end();
      }
    });

    it('should allow concurrent access with different lockIds', async function () {
      this.timeout(10000);

      const schema = new URL('../create-simple-tables.pgsql', import.meta.url);

      const helpers1 = new PgTestHelpers({ connectionString, schema, lockId: 9001 });
      const helpers2 = new PgTestHelpers({ connectionString, schema, lockId: 9002 });

      try {
        let first = false;
        let second = false;

        // Both should complete without blocking each other
        await Promise.all([
          // eslint-disable-next-line promise/prefer-await-to-then
          helpers1.removeTables().then(() => { first = true; return first; }),
          // eslint-disable-next-line promise/prefer-await-to-then
          helpers2.removeTables().then(() => { second = true; return second; }),
        ]);

        first.should.equal(true, 'first should have completed');
        second.should.equal(true, 'second should have completed');
      } finally {
        await helpers1.end();
        await helpers2.end();
      }
    });

    it('should release lock when initTables fails', async function () {
      this.timeout(10000);

      const lockId = 9003;

      // First helper with deliberately broken schema
      const broken = new PgTestHelpers({
        connectionString,
        schema: 'THIS IS NOT VALID SQL;',
        lockId,
      });

      try {
        await broken.initTables();
        throw new Error('Should have thrown');
      } catch (/** @type {unknown} */ err) {
        const error = /** @type {Error} */ (err);
        error.message.should.match(/Failed to create tables|Transaction rolled back/);
      } finally {
        await broken.end();
      }

      // Second helper with the same lockId should acquire without hanging
      const successor = new PgTestHelpers({
        connectionString,
        schema: new URL('../create-simple-tables.pgsql', import.meta.url),
        lockId,
        lockTimeoutMs: 2000,
      });

      try {
        await successor.removeTables();
      } finally {
        await successor.end();
      }
    });
  });

  describe('setup() convenience method', () => {
    it('should set up tables and return the instance', async () => {
      const helpers = new PgTestHelpers({
        connectionString,
        schema: new URL('../create-simple-tables.pgsql', import.meta.url),
      });

      try {
        const result = await helpers.setup();
        result.should.equal(helpers);

        const { rows } = await helpers.queryPromise(
          'SELECT tablename FROM pg_tables WHERE schemaname = \'public\''
        );
        rows.should.deep.equal([{ tablename: 'users' }]);
      } finally {
        await helpers.end();
      }
    });

    it('should load fixtures when fixtureFolder is set', async () => {
      const helpers = new PgTestHelpers({
        connectionString,
        schema: new URL('../create-simple-tables.pgsql', import.meta.url),
        fixtureFolder: new URL('../simple-fixtures', import.meta.url),
      });

      try {
        await helpers.setup();

        const { rows } = await helpers.queryPromise('SELECT email FROM users ORDER BY email');
        rows.map(r => r.email).should.deep.equal(['bob@example.com', 'carl@example.com']);
      } finally {
        await helpers.end();
      }
    });

    it('should work with Symbol.asyncDispose for automatic cleanup', async () => {
      const helpers = await new PgTestHelpers({
        connectionString,
        schema: new URL('../create-simple-tables.pgsql', import.meta.url),
      }).setup();

      try {
        const { rows } = await helpers.queryPromise(
          'SELECT tablename FROM pg_tables WHERE schemaname = \'public\''
        );
        rows.should.deep.equal([{ tablename: 'users' }]);
      } finally {
        // Simulate what await using does
        await helpers[Symbol.asyncDispose]();
      }
    });
  });

  describe('pgTestSetup() standalone factory', () => {
    it('should set up tables and return a PgTestHelpers instance', async () => {
      const helpers = await pgTestSetup({
        connectionString,
        schema: new URL('../create-simple-tables.pgsql', import.meta.url),
      });

      try {
        helpers.should.be.an.instanceof(PgTestHelpers);
        const { rows } = await helpers.queryPromise(
          'SELECT tablename FROM pg_tables WHERE schemaname = \'public\''
        );
        rows.should.deep.equal([{ tablename: 'users' }]);
      } finally {
        await helpers.end();
      }
    });

    it('should clean up pool on setup failure', async () => {
      try {
        await pgTestSetup({
          connectionString,
          schema: 'THIS IS NOT VALID SQL;',
        });
        throw new Error('Should have thrown');
      } catch (/** @type {unknown} */ err) {
        const error = /** @type {Error} */ (err);
        error.message.should.match(/Failed to create tables|Transaction rolled back/);
      }
      // If pool leaked, this test would hang — reaching here proves cleanup worked
    });
  });

  describe('pgTestSetupFor() with test context', () => {
    it('should set up tables and register cleanup on t.after()', async () => {
      /** @type {Array<() => Promise<void>>} */
      const afterCallbacks = [];
      const mockT = { after: (/** @type {() => Promise<void>} */ fn) => afterCallbacks.push(fn) };

      const helpers = await pgTestSetupFor({
        connectionString,
        schema: new URL('../create-simple-tables.pgsql', import.meta.url),
      }, mockT);

      try {
        helpers.should.be.an.instanceof(PgTestHelpers);
        afterCallbacks.should.have.lengthOf(1);

        const { rows } = await helpers.queryPromise(
          'SELECT tablename FROM pg_tables WHERE schemaname = \'public\''
        );
        rows.should.deep.equal([{ tablename: 'users' }]);
      } finally {
        // Simulate what t.after() would do
        for (const cb of afterCallbacks) {
          await cb();
        }
      }

      // Verify the callback actually ended the pool
      try {
        await helpers.queryPromise('SELECT 1');
        throw new Error('Expected query to fail after cleanup');
      } catch (/** @type {unknown} */ err) {
        /** @type {Error} */ (err).message.should.match(/Cannot use a pool after calling end/i);
      }
    });

    it('should clean up pool on setup failure', async () => {
      const mockT = { after: () => {} };

      try {
        await pgTestSetupFor({
          connectionString,
          schema: 'THIS IS NOT VALID SQL;',
        }, mockT);
        throw new Error('Should have thrown');
      } catch (/** @type {unknown} */ err) {
        const error = /** @type {Error} */ (err);
        error.message.should.match(/Failed to create tables|Transaction rolled back/);
      }
    });
  });
});
