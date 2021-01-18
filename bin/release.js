#!/usr/bin/env node

'use strict'

const { Command } = require('commander')
const chalk = require('chalk')
const { release } = require('../lib')
const pkg = require('../package.json')

function run() {
  if (pkg.private) {
    console.log(
      chalk.redBright(
        `This package ${pkg.name} has been marked as private, remove the 'private' field from the package.json to publish it`
      )
    )
    process.exit(0)
  }

  const program = new Command()

  program
    .version(pkg.version, '-v, --version', 'Output the current version')
    .option('--latest', 'Generate latest changelog', true)
    .option('-t, --type <type>', 'Publish type github or gitlab', 'github')
    .option('--repo-url <repoUrl>', 'Github repo url to release')
    .option('--config <config>', 'Conventional changelog rule')

  program.parse(process.argv)

  const options = Object.create(null)

  if (program.type) {
    options.type = program.type
  }

  if (program.latest) {
    options.latest = program.latest
  }

  if (program.repoUrl) {
    options.repoUrl = program.repoUrl
  }

  if (program.config) {
    options.config = program.config
  }

  release(options)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}

run()
