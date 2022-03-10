const chalk = require('chalk')

const { resolveRoot, bin, run, step } = require('./utils')

main()

async function main() {
  const pkgJSONPath = resolveRoot('package.json')
  const pkg = require(pkgJSONPath)

  step(`Watching ${chalk.cyanBright.bold(pkg.name)}`, 'Dev')
  await run(bin('rollup'), ['-c', '-w', '--environment', [`FORMATS:cjs`]])
}
