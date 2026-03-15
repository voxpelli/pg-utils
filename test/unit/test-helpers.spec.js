import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { PgTestHelpers, pgTestSetup, pgTestSetupFor } from '../../index.js';

chai.use(chaiAsPromised);

const should = chai.should();

const validConfig = Object.freeze({
  connectionString: 'postgres://user:pass@localhost/pg_utils_test_db',
  schema: 'something something create schema',
});

describe('PgTestHelpers', function () {
  this.timeout(10000);

  it('should fail when given no options', () => {
    // @ts-expect-error
    should.throw(() => new PgTestHelpers(), /^Expected an options object/);
  });

  it('should fail when given non-object options', () => {
    // @ts-expect-error
    should.throw(() => new PgTestHelpers('foo'), /^Expected an options object/);
  });

  it('should fail when required options are missing', () => {
    // @ts-expect-error
    should.throw(() => new PgTestHelpers({}), /^Invalid connectionString/);
  });

  it('should fail when connectionString is missing', () => {
    const { connectionString, ...config } = validConfig;
    // @ts-expect-error
    should.throw(() => new PgTestHelpers(config), /^Invalid connectionString/);
  });

  it('should fail when given invalid connectionString', () => {
    // @ts-expect-error
    should.throw(() => new PgTestHelpers({ connectionString: true }), /^Invalid connectionString/);
  });

  it('should fail when given invalid fixtureFolder', () => {
    // @ts-expect-error
    should.throw(() => new PgTestHelpers({ ...validConfig, fixtureFolder: true }), /^Invalid fixtureFolder/);
  });

  it('should fail when schema is missing', () => {
    const { schema, ...config } = validConfig;
    // @ts-expect-error
    should.throw(() => new PgTestHelpers(config), /^Invalid schema/);
  });

  it('should fail when given invalid schema', () => {
    // @ts-expect-error
    should.throw(() => new PgTestHelpers({ ...validConfig, schema: true }), /^Invalid schema/);
  });

  it('should fail when given invalid tablesWithDependencies', () => {
    // @ts-expect-error
    should.throw(() => new PgTestHelpers({ ...validConfig, tablesWithDependencies: 'foo' }), /^Invalid tablesWithDependencies/);
  });

  it('should fail when given invalid tableLoadOrder', () => {
    // @ts-expect-error
    should.throw(() => new PgTestHelpers({ ...validConfig, tableLoadOrder: 'foo' }), /^Invalid tableLoadOrder/);
  });

  it('should fail when given non-integer lockId', () => {
    should.throw(() => new PgTestHelpers({ ...validConfig, lockId: 3.5 }), /Invalid lockId/);
  });

  it('should fail when given unsafe integer lockId', () => {
    should.throw(() => new PgTestHelpers({ ...validConfig, lockId: Number.MAX_SAFE_INTEGER + 1 }), /Invalid lockId/);
  });

  it('should fail when given negative lockTimeoutMs', () => {
    should.throw(() => new PgTestHelpers({ ...validConfig, lockTimeoutMs: -1 }), /Invalid lockTimeoutMs/);
  });

  it('should fail when given float lockTimeoutMs', () => {
    should.throw(() => new PgTestHelpers({ ...validConfig, lockTimeoutMs: 1.5 }), /Invalid lockTimeoutMs/);
  });

  it('should fail when given invalid statementTimeoutMs', () => {
    should.throw(() => new PgTestHelpers({ ...validConfig, statementTimeoutMs: /** @type {*} */ ('five') }), /Invalid statementTimeoutMs/);
  });

  it('should fail when given negative statementTimeoutMs', () => {
    should.throw(() => new PgTestHelpers({ ...validConfig, statementTimeoutMs: -100 }), /Invalid statementTimeoutMs/);
  });

  it('should fail when given invalid idleInTransactionTimeoutMs', () => {
    should.throw(() => new PgTestHelpers({ ...validConfig, idleInTransactionTimeoutMs: Infinity }), /Invalid idleInTransactionTimeoutMs/);
  });

  it('should fail when trying to init fixtures when fixtureFolder is not set', async () => {
    const testHelpers = new PgTestHelpers({ ...validConfig });

    should.exist(testHelpers);

    try {
      await testHelpers.insertFixtures().should.be.rejectedWith(/No fixture folder defined/);
    } finally {
      await testHelpers.end();
    }
  });

  it('should work when given valid options', async () => {
    const testHelpers = new PgTestHelpers({ ...validConfig });

    should.exist(testHelpers);
    await testHelpers.end();
  });

  it('should accept lockId option', async () => {
    const testHelpers = new PgTestHelpers({ ...validConfig, lockId: 12345 });

    should.exist(testHelpers);
    await testHelpers.end();
  });

  it('should accept lockTimeoutMs option', async () => {
    const testHelpers = new PgTestHelpers({ ...validConfig, lockTimeoutMs: 5000 });

    should.exist(testHelpers);
    await testHelpers.end();
  });

  it('should accept timeout options', async () => {
    const testHelpers = new PgTestHelpers({
      ...validConfig,
      statementTimeoutMs: 30000,
      idleInTransactionTimeoutMs: 15000,
    });

    should.exist(testHelpers);
    await testHelpers.end();
  });

  it('should allow end() to be called twice without throwing', async () => {
    const testHelpers = new PgTestHelpers({ ...validConfig });

    await testHelpers.end();
    await testHelpers.end();
  });

  it('should allow end() without any prior locking operation', async () => {
    const testHelpers = new PgTestHelpers({ ...validConfig });

    await testHelpers.end();
  });

  it('should have Symbol.asyncDispose method that calls end()', async () => {
    const testHelpers = new PgTestHelpers({ ...validConfig });

    (typeof testHelpers[Symbol.asyncDispose]).should.equal('function');

    // Actually invoke dispose — verifies it delegates to end()
    await testHelpers[Symbol.asyncDispose]();

    // end() is idempotent — calling again should be safe
    await testHelpers.end();
  });

  describe('pgTestSetup', () => {
    it('should be a function', () => {
      (typeof pgTestSetup).should.equal('function');
    });
  });

  describe('pgTestSetupFor', () => {
    it('should be a function', () => {
      (typeof pgTestSetupFor).should.equal('function');
    });

    it('should throw when given a context without after()', async () => {
      await pgTestSetupFor(validConfig, {}).should.be.rejectedWith(/requires a test context with an after/);
    });

    it('should throw when given no context', async () => {
      // @ts-expect-error
      await pgTestSetupFor(validConfig).should.be.rejectedWith(/requires a test context with an after/);
    });
  });
});
