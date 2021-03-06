#!/usr/bin/env node

'use strict'

const { program } = require('commander')
const chalk = require('chalk')
const { release } = require('../lib')
const pkg = require('../package.json')

function run() {
  if (pkg.private) {
    console.log(
      chalk.redBright(
        `This package ${pkg.name} has been marked as private, remove the 'private' field from the package.json to publish it.`
      )
    )
    process.exit(1)
  }

  program
    .version(pkg.version, '-v, --version', 'Output the current version')
    .option('--latest', 'Generate latest changelog', true)
    .option('--repo-type <repo-type>', 'Publish type, github or gitlab')
    .option('--repo-url <repo-url>', 'Github repo url to release')
    .option('--changelog-preset <changelog-preset>', 'Customize conventional changelog preset')

  program.commands.forEach(c => c.on('--help', () => console.log()))

  enhanceErrorMessages('missingArgument', argName => {
    return `Missing required argument ${chalk.yellow(`<${argName}>`)}.`
  })

  enhanceErrorMessages('unknownOption', optionName => {
    return `Unknown option ${chalk.yellow(optionName)}.`
  })

  enhanceErrorMessages('optionMissingArgument', (option, flag) => {
    return (
      `Missing required argument for option ${chalk.yellow(option.flags)}` +
      (flag ? `, got ${chalk.yellow(flag)}` : ``)
    )
  })

  program.parse(process.argv)

  const options = Object.create(null)

  if (program.repoType === 'github' || program.repoType === 'gitlab') {
    options.repoType = program.repoType
  } else {
    console.log(
      chalk.redBright(`Expected the --repo-type as github or gitlab, but got ${program.repoType}.`)
    )
    process.exit(1)
  }

  if (program.latest) {
    options.latest = program.latest
  }

  if (program.repoUrl) {
    options.repoUrl = program.repoUrl
  }

  if (program.changelogPreset) {
    options.changelogPreset = program.changelogPreset
  }

  release(options)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}

run()

function enhanceErrorMessages(methodName, log) {
  program.Command.prototype[methodName] = function (...args) {
    if (methodName === 'unknownOption' && this._allowUnknownOption) {
      return
    }

    this.outputHelp()

    console.log(`  ` + chalk.red(log(...args)))
    console.log()
    process.exit(1)
  }
}
