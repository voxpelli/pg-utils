/* eslint-disable unicorn/no-await-expression-member */

import chai from 'chai';
import sinon from 'sinon';

import { PgTestHelpers } from '../../index.js';

import { connectionString } from '../db.js';

chai.should();

describe('PgTestHelpers integration', function () {
  beforeEach(async () => {
    await (new PgTestHelpers({
      connectionString,
      schema: new URL('../create-complex-tables.pgsql', import.meta.url),
      tablesWithDependencies: [
        'foobar',
        ['user_foo', 'user_bar'],
      ],
    })).removeTables();
  });

  describe('simple', () => {
    it('should be able to remove and init tables', async () => {
      const testHelpers = new PgTestHelpers({
        connectionString,
        schema: new URL('../create-simple-tables.pgsql', import.meta.url),
      });
      const { queryPromise } = testHelpers;

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
    });

    it('should be able to add fixtures', async () => {
      const testHelpers = new PgTestHelpers({
        connectionString,
        fixtureFolder: new URL('../simple-fixtures', import.meta.url),
        schema: new URL('../create-simple-tables.pgsql', import.meta.url),
      });
      const { queryPromise } = testHelpers;

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
    });
  });
});
