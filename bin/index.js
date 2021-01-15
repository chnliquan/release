#! /usr/bin/env node

'use strict'

const { Command } = require('commander')
const { release } = require('../lib')
const pkg = require('../package.json')

const program = new Command()

program
  .version(pkg.version, '-v, --version', 'output the current version')
  .option('--latest', 'output latest changelog', true)
  .option('-t, --type <type>', 'specified repo type', 'github')
  .option('--repo-url <repoUrl>', 'specified github repo url')
  .option('--config <config>', 'customize conventional changelog rule')

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

release(options).catch(err => {
  console.error(err)
  process.exit(1)
})
