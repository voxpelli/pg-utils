import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { dbToCsvFolder } from '../../index.js';

chai.use(chaiAsPromised);
chai.should();

describe('dbToCsvFolder', () => {
  describe('orderBy validation', () => {
    // Security: orderBy is interpolated into SQL — these tests verify injection is blocked

    it('should reject SQL injection in orderBy', async () => {
      await dbToCsvFolder('postgres://x', '/tmp/test', ['t'], { orderBy: '1; DROP TABLE users--' })
        .should.be.rejectedWith(/Invalid orderBy value/);
    });

    it('should reject expressions with spaces', async () => {
      await dbToCsvFolder('postgres://x', '/tmp/test', ['t'], { orderBy: 'name ASC' })
        .should.be.rejectedWith(/Invalid orderBy value/);
    });

    it('should reject multi-column expressions', async () => {
      await dbToCsvFolder('postgres://x', '/tmp/test', ['t'], { orderBy: 'id, name' })
        .should.be.rejectedWith(/Invalid orderBy value/);
    });

    it('should reject subquery attempts', async () => {
      await dbToCsvFolder('postgres://x', '/tmp/test', ['t'], { orderBy: '(SELECT 1)' })
        .should.be.rejectedWith(/Invalid orderBy value/);
    });

    it('should accept a column index', async () => {
      // Validation passes — fails on connection, not validation
      try {
        await dbToCsvFolder('postgres://x', '/tmp/test', ['t'], { orderBy: '1' });
        throw new Error('Should have thrown');
      } catch (/** @type {unknown} */ err) {
        const error = /** @type {Error} */ (err);
        error.message.should.not.match(/Invalid orderBy/);
        error.message.should.match(/connect|ECONN|ENOTFOUND|getaddrinfo|EAI_/i);
      }
    });

    it('should accept a simple identifier', async () => {
      try {
        await dbToCsvFolder('postgres://x', '/tmp/test', ['t'], { orderBy: 'created_at' });
        throw new Error('Should have thrown');
      } catch (/** @type {unknown} */ err) {
        const error = /** @type {Error} */ (err);
        error.message.should.not.match(/Invalid orderBy/);
        error.message.should.match(/connect|ECONN|ENOTFOUND|getaddrinfo|EAI_/i);
      }
    });
  });
});
