import { createReadStream } from 'node:fs';
import { opendir } from 'node:fs/promises';
import pathModule from 'node:path';
import { pipeline as promisedPipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

import { from as copyFrom } from 'pg-copy-streams';

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

/**
 * @param {string | Pool} connection
 * @param {string | URL} path
 * @param {string[] | undefined} [tablesWithDependencies]
 * @returns {Promise<void>}
 */
export async function csvFromFolderToDb (connection, path, tablesWithDependencies = []) {
  const files = await getFilesOrderedByDependencies(path, tablesWithDependencies);

  const pool = (typeof connection === 'object' && 'connect' in connection) ? connection : createPgPool(connection);

  const client = await pool.connect();

  for (const file of files) {
    const name = pathModule.basename(file, '.csv');
    const dbCopy = client.query(copyFrom(`COPY ${name} FROM STDIN DELIMITER ',' CSV HEADER`));

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const csvContent = createReadStream(file);

    try {
      await promisedPipeline(csvContent, dbCopy);
    } catch (cause) {
      throw new Error(`Failed inserting data into "${name}"`, { cause });
    }
  }

  client.release();
}
