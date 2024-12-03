import dotenv from 'dotenv';

// eslint-disable-next-line n/no-process-env
const dotEnvFile = process.env['DOTENV_FILE'] || new URL('.env', import.meta.url);
dotenv.config({ path: dotEnvFile });

// eslint-disable-next-line n/no-process-env
if (!process.env['DATABASE_URL']) {
  throw new Error('Missing DATABASE_URL environment variable, integration tests aborted');
}

// eslint-disable-next-line n/no-process-env
export const connectionString = process.env['DATABASE_URL'];
