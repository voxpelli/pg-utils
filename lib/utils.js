import pg from 'pg';

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
