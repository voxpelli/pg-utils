import pg from 'pg';

/**
 * Fixed advisory lock ID used for database locking (test isolation) during test runs.
 * By using a fixed ID (42), we serialize operations that
 * must not run concurrently (such as schema migrations or fixture loading), preventing race
 * conditions and deadlocks in test environments.
 *
 * The value 42 is arbitrary but must be consistent across all test helpers using the same database.
 *
 * @see {@link https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS|PostgreSQL Advisory Lock Functions}
 * @see {@link https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS|Advisory Locks Overview}

 */
const LOCK_ID = 42;

/**
 * @param {string} connectionString
 * @returns {import('pg').Pool}
 */
export function createPgPool (connectionString) {
  return new pg.Pool({
    allowExitOnIdle: true,
    connectionString,
  });
}

/**
 * @param {string} connectionString
 * @returns {Promise<import('pg').Client>}
 */
export async function createAndLockConnection (connectionString) {
  const client = new pg.Client({
    connectionString,
  });

  let connected = false;

  try {
    await client.connect();
    connected = true;
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
  } catch (cause) {
    if (connected) {
      await client.end();
    }
    throw new Error('Failed to acquire database lock', { cause });
  }

  return client;
}

/**
 * @param {import('pg').Client} lockClient
 * @returns {Promise<void>}
 */
export async function releaseLock (lockClient) {
  try {
    await lockClient.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
  } finally {
    await lockClient.end();
  }
}

// TODO: Export to typed-utils maybe?
export class TypeNeverError extends TypeError {
  /**
   * @param {never} value
   * @param {string} message
   * @param {ErrorOptions} [options]
   */
  constructor (value, message, options) {
    super(`${message}. Got: ${typeof value}`, options);
  }
}

/**
 * Array.isArray() on its own give type any[]
 *
 * @param {unknown} value
 * @returns {value is unknown[]}
 */
function typesafeIsArray (value) {
  return Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is string[]}
 */
export function isStringArray (value) {
  if (!typesafeIsArray(value)) return false;
  return value.every(item => typeof item === 'string');
}
