import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadEnvFile(file = '.env') {
  const path = resolve(process.cwd(), file);

  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function env(name, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === null || value === '' ? fallback : value;
}

export function requiredEnv(name) {
  const value = env(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
