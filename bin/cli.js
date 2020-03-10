#!/usr/bin/env node

'use strict'

// For detailed usage, please head to https://github.com/cacjs/cac
const cli = require('cac')()
const chalk = require('chalk')
const loadConfig = require('../lib/loadConfig')
const logger = require('../lib/logger')
const babe = require('../lib')

function wrapCommand(command, configKey) {
  return async cliFlags => {
    const userConfig = await loadConfig() || {}
    const commandConfig = (configKey ? userConfig[configKey] : userConfig) || {}
    const globalConfig = userConfig.global || {}

    const mergedConfig = {
      ...globalConfig,
      ...commandConfig,
      ...cliFlags,
    }

    mergedConfig.cwd = mergedConfig.cwd || process.cwd()

    if (mergedConfig.debug) {
      logger.enableDebug()
    }

    logger.debug('mergedConfig', mergedConfig)

    try {
      await command(mergedConfig)
    } catch (e) {
      console.log()
      process.exitCode = 1
      console.log(chalk.red(e.stack))
      console.log()
    }
  }
}

cli
  .command('', require('../package').description)
  .option('--monorepo', 'Enable monorepo transpliation.')
  .option('--preset [preset]', 'Transpile Preset, defaults to "app", available values: "app" | "cli"')
  .option('--runInBand', 'runInBand.')
  .option('--debug', 'Debug mode.')
  .option('--watch', 'Watch mode.')
  .action(wrapCommand(babe))

// Display help message when `-h` or `--help` appears
cli.help()
// Display version number when `-v` or `--version` appears
// It's also used in help message
cli.version(require('../package').version)

cli.parse()
