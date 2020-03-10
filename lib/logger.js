const ID = require('../package').name
const chalk = require('chalk')
const debug = require('debug')(ID)

const curryFn = (statusText = '') => (msg, prefix = true) => {
  return console.log(`${chalk.cyan('❯ ')}${
    prefix
      ? `${chalk.gray(typeof prefix === 'string' ? prefix : ID)} `
      : ''
    }${statusText}${msg}`)
}

const error = curryFn(`${chalk.red('error')} `)
const info = curryFn(`💬 `)
const warn = curryFn(`⚠️  `)
const log = curryFn()

function enableDebug() {
  require('debug').enable(ID)
}

function disableDebug() {
  require('debug').disable(ID)
}

module.exports = {
  log,
  info,
  warn,
  error,
  debug,
  enableDebug,
  disableDebug
}
