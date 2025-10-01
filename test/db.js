import { parseEnv } from 'node:util';
import { readFileSync } from 'node:fs';

// eslint-disable-next-line n/no-process-env
const dotEnvFile = process.env['DOTENV_FILE'] || new URL('.env', import.meta.url);

let envVars = {};
try {
  // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename
  const envContent = readFileSync(dotEnvFile, 'utf8');
  envVars = parseEnv(envContent);
} catch {
  // .env file is optional, ignore if it doesn't exist
}

// eslint-disable-next-line n/no-process-env
const databaseUrl = envVars['DATABASE_URL'] || process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL environment variable, integration tests aborted');
}

export const connectionString = databaseUrl;
