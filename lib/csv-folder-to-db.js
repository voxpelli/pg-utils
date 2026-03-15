import { createReadStream } from 'node:fs';
import { opendir } from 'node:fs/promises';
import pathModule from 'node:path';
import { pipeline as promisedPipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

import { from as copyFrom } from 'pg-copy-streams';
import pg from 'pg';

import { createPgPool } from './utils.js';

/** @import { Pool } from 'pg' */

/**
 * @param {string | URL} path
 * @param {string} [extension]
 * @returns {AsyncIterable<string>}
 */
async function * filesInFolder (path, extension) {
  const dir = await opendir(path);
  const stringPath = typeof path === 'string' ? path : fileURLToPath(path);

  for await (const dirent of dir) {
    if (!dirent.isFile()) continue;
    if (extension && pathModule.extname(dirent.name) !== extension) continue;
    yield pathModule.join(stringPath, dirent.name);
  }
}

/**
 * @param {string | URL} path
 * @param {string[]} tablesWithDependencies
 * @returns {Promise<string[]>}
 */
async function getFilesOrderedByDependencies (path, tablesWithDependencies) {
  /** @type {Map<string, string>} */
  const fileMap = new Map();

  for await (const file of filesInFolder(path, '.csv')) {
    fileMap.set(pathModule.basename(file, '.csv'), file);
  }

  /** @type {string[]} */
  const files = [];

  for (const table of tablesWithDependencies) {
    const file = fileMap.get(table);

    if (file) {
      files.unshift(file);
      fileMap.delete(table);
    }
  }

  return [
    ...fileMap.values(),
    ...files,
  ];
}

/** @type {boolean} */
let hasWarnedDeprecation = false;

/**
 * @typedef CsvFromFolderToDbOptions
 * @property {string[]} [tableLoadOrder] Tables in parent-first insertion order (first item loaded first, dropped last)
 * @property {string[]} [tablesWithDependencies] Deprecated: use `tableLoadOrder` instead. Tables in leaf-first deletion order (first item dropped first, loaded last)
 */

/**
 * @param {string[] | CsvFromFolderToDbOptions | undefined} options
 * @returns {string[]}
 */
function resolveTableOrder (options) {
  if (!options) return [];
  if (Array.isArray(options)) {
    warnDeprecation();
    return options;
  }

  const { tableLoadOrder, tablesWithDependencies } = options;

  if (tableLoadOrder && tablesWithDependencies) {
    throw new Error('Cannot specify both tableLoadOrder and tablesWithDependencies');
  }

  if (tablesWithDependencies) {
    warnDeprecation();
    return tablesWithDependencies;
  }

  if (tableLoadOrder) {
    // tableLoadOrder is parent-first; reverse to get the leaf-first
    // order that getFilesOrderedByDependencies expects via unshift()
    return [...tableLoadOrder].reverse();
  }

  return [];
}

function warnDeprecation () {
  if (!hasWarnedDeprecation) {
    hasWarnedDeprecation = true;
    // eslint-disable-next-line no-console
    console.warn('@voxpelli/pg-utils: tablesWithDependencies is deprecated, use tableLoadOrder instead (parent-first insertion order)');
  }
}

/**
 * @param {string | Pool} connection
 * @param {string | URL} path
 * @param {string[] | CsvFromFolderToDbOptions} [options]
 * @returns {Promise<void>}
 */
export async function csvFromFolderToDb (connection, path, options) {
  const tablesWithDependencies = resolveTableOrder(options);
  const files = await getFilesOrderedByDependencies(path, tablesWithDependencies);

  const ownPool = typeof connection !== 'object' || !('connect' in connection);
  const pool = ownPool ? createPgPool(connection) : connection;

  const client = await pool.connect();

  try {
    for (const file of files) {
      const name = pathModule.basename(file, '.csv');
      const dbCopy = client.query(copyFrom(`COPY ${pg.escapeIdentifier(name)} FROM STDIN WITH (FORMAT csv, HEADER MATCH)`));

      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const csvContent = createReadStream(file);

      try {
        await promisedPipeline(csvContent, dbCopy);
      } catch (cause) {
        throw new Error(`Failed inserting data into "${name}"`, { cause });
      }
    }
  } finally {
    client.release();
    if (ownPool) await pool.end();
  }
}
