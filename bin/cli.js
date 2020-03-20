#!/usr/bin/env node

'use strict'

// For detailed usage, please head to https://github.com/cacjs/cac
const cli = require('cac')()
const chalk = require('chalk')
const logger = require('../lib/logger')
const arab = require('../lib')

function wrapCommand(command) {
  return async cliFlags => {
    cliFlags.cwd = cliFlags.cwd || process.cwd()

    if (cliFlags.debug) {
      logger.enableDebug()
    }

    logger.debug('mergedConfig', cliFlags)

    try {
      await command(cliFlags)
    } catch (e) {
      console.log()
      process.exitCode = 1
      console.log(chalk.red(e && e.stack))
      console.log()
    }
  }
}

cli
  .command('', require('../package').description)
  .option('-d, --dts', 'Generate declaration for TypeScript files, defaults tp false.')
  .option('-w, --watch', 'Watch mode.')
  .option('-s, --sourceTsToLib', 'Copy source ts files from "src" to "lib", it will speed up build largely.')
  .option('-e, --enableTsConfig', 'Read tsconfig.json under generating d.ts files.')
  .option('--monorepo', 'Enable monorepo transpliation.')
  .option('--preset [preset]', 'Transpile Preset, defaults to "app", available values: "app" | "cli"')
  .option('--runInBand', 'runInBand.')
  .option('--debug', 'Debug mode.')
  .action(wrapCommand(arab))

// Display help message when `-h` or `--help` appears
cli.help()
// Display version number when `-v` or `--version` appears
// It's also used in help message
cli.version(require('../package').version)

cli.parse()
