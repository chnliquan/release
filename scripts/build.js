const fs = require('fs-extra')
const chalk = require('chalk')

const { resolveRoot, bin, run, step } = require('./utils')

const args = require('minimist')(process.argv.slice(2))
const formats = args.formats || args.f
const devOnly = args.devOnly || args.d
const prodOnly = !devOnly && (args.prodOnly || args.p)
const sourceMap = args.sourcemap || args.s
const isRelease = args.release
const buildTypes = args.t || args.types || isRelease

main()

async function main() {
  if (isRelease) {
    // remove build cache for release builds to avoid outdated enum values
    await fs.remove(resolveRoot('node_modules/.rts2_cache'))
  }

  const pkgJSONPath = resolveRoot('package.json')
  const pkg = require(pkgJSONPath)

  // if building a specific format, do not remove dist.
  if (!formats) {
    await fs.remove(resolveRoot('dist'))
  }

  const env = devOnly ? 'development' : 'production'

  step(`Rolling up bundles for ${chalk.cyanBright.bold(pkg.name)}`, 'Build')
  await run(bin('rollup'), [
    '-c',
    '--environment',
    [
      `NODE_ENV:${env}`,
      formats ? `FORMATS:${formats}` : ``,
      buildTypes ? `TYPES:true` : ``,
      prodOnly ? `PROD_ONLY:true` : ``,
      sourceMap ? `SOURCE_MAP:true` : ``,
    ]
      .filter(Boolean)
      .join(','),
  ])

  // build types
  if (buildTypes && pkg.types) {
    step(`Rolling up type definitions for ${chalk.cyanBright.bold(pkg.name)}`, 'Build')
    console.log()

    const { Extractor, ExtractorConfig } = require('@microsoft/api-extractor')

    const extractorConfigPath = resolveRoot(`api-extractor.json`)
    const extractorConfig = ExtractorConfig.loadFileAndPrepare(extractorConfigPath)
    const extractorResult = Extractor.invoke(extractorConfig, {
      localBuild: true,
      showVerboseMessages: true,
    })

    if (!extractorResult.succeeded) {
      console.error(
        chalk.bgRed(' ERROR '),
        chalk.red(
          `API Extractor completed with ${extractorResult.errorCount} errors` +
            ` and ${extractorResult.warningCount} warnings.`
        )
      )
      process.exit(1)
    }

    await fs.remove(resolveRoot('dist/src'))
  }

  console.log()
  console.log(
    chalk.bgGreen.black(' DONE '),
    `Compiled ${chalk.cyanBright.bold(pkg.name)} successfully.`
  )
  console.log()
}
