const path = require('path')
const chalk = require('chalk')
const execa = require('execa')

function resolveRoot(p) {
  return path.resolve(__dirname, '..', p)
}

function bin(name) {
  return path.resolve(__dirname, '../node_modules/.bin/' + name)
}

function run(bin, args, opts = {}) {
  return execa(bin, args, { stdio: 'inherit', ...opts })
}

function step(msg, tag = 'Release') {
  console.log(`\n${chalk.gray(`>>> ${tag}:`)} ${chalk.magenta.bold(msg)}`)
}

module.exports = {
  resolveRoot,
  bin,
  run,
  step,
}
