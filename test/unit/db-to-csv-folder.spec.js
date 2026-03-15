import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import pathModule from 'node:path';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { dbToCsvFolder } from '../../index.js';

chai.use(chaiAsPromised);
chai.should();

// Fast-fail connection string: 127.0.0.1:1 avoids DNS resolution delay
const BAD_CONNECTION = 'postgres://127.0.0.1:1/nonexistent';

describe('dbToCsvFolder', () => {
  /** @type {string | undefined} */
  let tmpDir;

  afterEach(async () => {
    if (tmpDir) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await rm(tmpDir, { recursive: true, force: true });
      tmpDir = undefined;
    }
  });

  describe('orderBy validation', () => {
    // Security: orderBy is interpolated into SQL — these tests verify injection is blocked

    it('should reject SQL injection in orderBy', async () => {
      await dbToCsvFolder(BAD_CONNECTION, '/tmp/test', ['t'], { orderBy: '1; DROP TABLE users--' })
        .should.be.rejectedWith(/Invalid orderBy value/);
    });

    it('should reject expressions with spaces', async () => {
      await dbToCsvFolder(BAD_CONNECTION, '/tmp/test', ['t'], { orderBy: 'name ASC' })
        .should.be.rejectedWith(/Invalid orderBy value/);
    });

    it('should reject multi-column expressions', async () => {
      await dbToCsvFolder(BAD_CONNECTION, '/tmp/test', ['t'], { orderBy: 'id, name' })
        .should.be.rejectedWith(/Invalid orderBy value/);
    });

    it('should reject subquery attempts', async () => {
      await dbToCsvFolder(BAD_CONNECTION, '/tmp/test', ['t'], { orderBy: '(SELECT 1)' })
        .should.be.rejectedWith(/Invalid orderBy value/);
    });

    it('should reject column index 0', async () => {
      await dbToCsvFolder(BAD_CONNECTION, '/tmp/test', ['t'], { orderBy: '0' })
        .should.be.rejectedWith(/Invalid orderBy value/);
    });

    it('should accept a column index', async () => {
      tmpDir = await mkdtemp(pathModule.join(tmpdir(), 'pg-utils-test-'));

      // Validation passes — fails on connection, not validation
      try {
        await dbToCsvFolder(BAD_CONNECTION, tmpDir, ['t'], { orderBy: '1' });
        throw new Error('Should have thrown');
      } catch (/** @type {unknown} */ err) {
        const error = /** @type {Error} */ (err);
        error.message.should.not.match(/Invalid orderBy/);
        error.message.should.match(/connect|ECONN|ENOTFOUND|getaddrinfo|EAI_/i);
      }
    });

    it('should accept a simple identifier', async () => {
      tmpDir = await mkdtemp(pathModule.join(tmpdir(), 'pg-utils-test-'));

      try {
        await dbToCsvFolder(BAD_CONNECTION, tmpDir, ['t'], { orderBy: 'created_at' });
        throw new Error('Should have thrown');
      } catch (/** @type {unknown} */ err) {
        const error = /** @type {Error} */ (err);
        error.message.should.not.match(/Invalid orderBy/);
        error.message.should.match(/connect|ECONN|ENOTFOUND|getaddrinfo|EAI_/i);
      }
    });
  });
});
