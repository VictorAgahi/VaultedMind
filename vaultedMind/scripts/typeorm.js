import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const typeormCli = require.resolve('typeorm/cli.js');

const isProduction = process.env.NODE_ENV === 'production';
const cmd = isProduction ? 'node' : 'yarn';
const args = isProduction
  ? [typeormCli, ...process.argv.slice(2)]
  : ['node', '--import', 'tsx', typeormCli, ...process.argv.slice(2)];

const result = spawnSync(cmd, args, {
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 0);
