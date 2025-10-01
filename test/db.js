import { parseEnv } from 'node:util';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// eslint-disable-next-line n/no-process-env
const dotEnvFile = process.env['DOTENV_FILE'] || new URL('.env', import.meta.url);
const dotEnvPath = dotEnvFile instanceof URL ? fileURLToPath(dotEnvFile) : dotEnvFile;

try {
  // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename
  const envContent = readFileSync(dotEnvPath, 'utf8');
  const envVars = parseEnv(envContent);
  // eslint-disable-next-line n/no-process-env
  Object.assign(process.env, envVars);
} catch {
  // .env file is optional, ignore if it doesn't exist
}

// eslint-disable-next-line n/no-process-env
if (!process.env['DATABASE_URL']) {
  throw new Error('Missing DATABASE_URL environment variable, integration tests aborted');
}

// eslint-disable-next-line n/no-process-env
export const connectionString = process.env['DATABASE_URL'];
