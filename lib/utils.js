import pg from 'pg';

/** @import { Pool, Client } from 'pg' */

/**
 * Default advisory lock ID used for database locking (test isolation) during test runs.
 * By using a fixed default ID (42), we serialize operations that
 * must not run concurrently (such as schema migrations or fixture loading), preventing race
 * conditions and deadlocks in test environments.
 *
 * This can be overridden via the `lockId` option in {@link createAndLockConnection} or
 * `PgTestHelpersOptions` to avoid contention in parallel test runners (advisory locks are
 * cluster-scoped, not database-scoped).
 *
 * @see {@link https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS|PostgreSQL Advisory Lock Functions}
 * @see {@link https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS|Advisory Locks Overview}
 */
const LOCK_ID = 42;

/**
 * @param {string} connectionString
 * @returns {Pool}
 */
export function createPgPool (connectionString) {
  return new pg.Pool({
    allowExitOnIdle: true,
    connectionString,
  });
}

/**
 * @param {string} connectionString
 * @param {{ lockId?: number, lockTimeoutMs?: number }} [options]
 * @returns {Promise<Client>}
 */
export async function createAndLockConnection (connectionString, options = {}) {
  const { lockId = LOCK_ID, lockTimeoutMs } = options;

  const client = new pg.Client({
    connectionString,
  });

  let connected = false;

  try {
    await client.connect();
    connected = true;
    if (lockTimeoutMs !== undefined) {
      await client.query(`SET lock_timeout = ${Number(lockTimeoutMs)}`);
    }
    await client.query('SELECT pg_advisory_lock($1)', [lockId]);
  } catch (cause) {
    if (connected) {
      await client.end();
    }
    throw new Error('Failed to acquire database lock', { cause });
  }

  // Prevent uncaught 'error' if the connection drops while holding the lock.
  // PostgreSQL auto-releases session-level locks on disconnect; this just
  // prevents the EventEmitter uncaught-error crash.
  client.on('error', () => {});

  return client;
}

/**
 * @param {Client | Promise<Client>} lockClient
 * @param {number} [lockId]
 * @returns {Promise<void>}
 */
export async function releaseLock (lockClient, lockId = LOCK_ID) {
  const client = await lockClient;

  try {
    await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
  } finally {
    await client.end();
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
