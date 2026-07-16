// Loads every federation data file in this folder. To add a federation,
// drop a new <code>.json file here — no code changes needed.
import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));

export const FEDERATION_LIST = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  .sort((a, b) => a.code.localeCompare(b.code));

export const FEDERATIONS = FEDERATION_LIST.map((f) => f.code);

export const CITIES_BY_FEDERATION = Object.fromEntries(
  FEDERATION_LIST.map((f) => [f.code, f.cities])
);
