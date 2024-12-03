import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { PgTestHelpers } from '../../index.js';

chai.use(chaiAsPromised);

const should = chai.should();

const validConfig = Object.freeze({
  connectionConfig: 'postgres://user:pass@localhost/pg_utils_test_db',
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
    should.throw(() => new PgTestHelpers({}), /^Invalid connectionConfig/);
  });

  it('should fail when connectionConfig is missing', () => {
    const { connectionConfig, ...config } = validConfig;
    // @ts-expect-error
    should.throw(() => new PgTestHelpers(config), /^Invalid connectionConfig/);
  });

  it('should fail when given invalid connectionConfig', () => {
    // @ts-expect-error
    should.throw(() => new PgTestHelpers({ connectionConfig: true }), /^Invalid connectionConfig/);
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

  it('should fail when trying to init fixtures when fixtureFolder is not set', async () => {
    const testHelpers = new PgTestHelpers({ ...validConfig });

    should.exist(testHelpers);

    await testHelpers.insertFixtures().should.be.rejectedWith(/No fixture folder defined/);
  });

  it('should work when given valid options', () => {
    const testHelpers = new PgTestHelpers({ ...validConfig });

    should.exist(testHelpers);
  });
});
