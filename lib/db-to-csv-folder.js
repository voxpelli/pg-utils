import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import pathModule from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

import pg from 'pg';
import { to as copyTo } from 'pg-copy-streams';

import { createPgPool } from './utils.js';

/** @import { Pool } from 'pg' */

/**
 * @typedef DbToCsvFolderOptions
 * @property {string} [orderBy]
 */

/**
 * Exports database tables to CSV files in a folder.
 *
 * Each table is exported as `<table>.csv` with a header row, ordered by
 * the specified column (default: first column) for deterministic output.
 *
 * @param {string | Pool} connection
 * @param {string | URL} outputPath
 * @param {string[]} tables
 * @param {DbToCsvFolderOptions} [options]
 * @returns {Promise<void>}
 */
export async function dbToCsvFolder (connection, outputPath, tables, options = {}) {
  const { orderBy = '1' } = options;

  // Security: orderBy is interpolated into SQL — validate to prevent injection
  const isColumnIndex = /^[1-9]\d*$/.test(orderBy);
  const isIdentifier = /^[a-z_]\w*$/i.test(orderBy);

  if (!isColumnIndex && !isIdentifier) {
    throw new Error(
      `Invalid orderBy value: ${JSON.stringify(orderBy)}. ` +
      'Must be a positive column index (e.g. "1") or a simple identifier (e.g. "created_at").'
    );
  }

  const dirPath = typeof outputPath === 'string' ? outputPath : fileURLToPath(outputPath);

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(dirPath, { recursive: true });

  const escapedOrderBy = isColumnIndex ? orderBy : pg.escapeIdentifier(orderBy);

  const ownPool = typeof connection !== 'object' || !('connect' in connection);
  const pool = ownPool ? createPgPool(connection) : connection;

  try {
    const client = await pool.connect();

    try {
      for (const table of tables) {
        const sql = `COPY (SELECT * FROM ${pg.escapeIdentifier(table)} ORDER BY ${escapedOrderBy}) TO STDOUT WITH (FORMAT csv, HEADER true)`;
        const copyToStream = client.query(copyTo(sql));
        const filePath = pathModule.join(dirPath, `${table}.csv`);

        try {
          // eslint-disable-next-line security/detect-non-literal-fs-filename
          await pipeline(copyToStream, createWriteStream(filePath));
        } catch (cause) {
          throw new Error(`Failed exporting data from "${table}"`, { cause });
        }
      }
    } finally {
      client.release();
    }
  } finally {
    if (ownPool) await pool.end();
  }
}
