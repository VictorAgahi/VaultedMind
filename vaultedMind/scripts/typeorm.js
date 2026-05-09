import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const typeormCli = require.resolve('typeorm/cli.js');

const result = spawnSync('yarn', ['node', '--import', 'tsx', typeormCli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 0);
