/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable unicorn/no-await-expression-member */

import chai from 'chai';
import sinon from 'sinon';

import { PgTestHelpers } from '../../index.js';

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
          error.message.should.equal('Failed to drop table: foobar');
          error.should.have.property('cause');
          error.cause?.message.should.equal('Database connection lost');
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

      const { order } = await Promise.race([
        firstInit,
        secondInit,
      ]);

      firstCompleted.should.not.equal(secondCompleted, 'Only one should have completed');

      await (order === 'first' ? testHelpers1 : testHelpers2).end();

      await (order === 'first' ? secondInit : firstInit);

      firstCompleted.should.equal(secondCompleted, 'Both should have completed');

      await (order === 'first' ? testHelpers2 : testHelpers1).end();
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
});
