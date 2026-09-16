import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Compare to the working tree: uncommitted integration work is a valid baseline.
const before = readFileSync(new URL('./src/generated.ts', import.meta.url));
const result = spawnSync('pnpm', ['generate'], { cwd: import.meta.dirname, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const after = readFileSync(new URL('./src/generated.ts', import.meta.url));
if (!before.equals(after)) {
  console.error('TypeScript contract was stale; review the regenerated src/generated.ts');
  process.exit(1);
}
console.log('TypeScript contract matches the current OpenAPI');
