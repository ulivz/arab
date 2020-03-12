'use strict'

const { join } = require('path')
const { existsSync } = require('fs')
const globby = require('globby')

const { isPlainObject } = require('./util')
const logger = require('./logger')
const arab = require('./arab')
const forkArab = require('./fork-arab')
const loadConfig = require('./load-config')

module.exports = async opts => {
  const { cwd = process.cwd() } = opts
  const userConfig = (await loadConfig(cwd)) || {}

  opts = {
    ...userConfig,
    ...opts,
  }

  if (userConfig.monorepo) {
    opts.monorepo = userConfig.monorepo
  }

  const { monorepo, runInBand = false } = opts

  if (monorepo) {
    let packagePatterns = ['packages/*']
    let filter = v => v

    if (Array.isArray(monorepo)) {
      packagePatterns = monorepo
    } else if (isPlainObject(monorepo)) {
      if (monorepo.packages) {
        packagePatterns = monorepo.packages
      }
      if (monorepo.filter) {
        filter = monorepo.filter
      }
    }

    let packages = globby
      .sync(packagePatterns, {
        cwd,
        onlyDirectories: true,
      })
      .filter(filter)

    logger.debug('monorepo mode enabled!')
    logger.debug('packages', packages)

    packages = packages
      .map(dirname => {
        const path = join(cwd, dirname)
        return {
          path,
          pkgJsonPath: join(path, 'package.json'),
          dirname,
        }
      })
      .map(pkg => ({
        ...pkg,
        pkgJson: existsSync(pkg.pkgJsonPath) ? require(pkg.pkgJsonPath) : {},
      }))

    const getOpts = pkg => {
      return {
        ...opts,
        cwd: pkg.path,
        name: pkg.pkgJson.name || pkg.dirname,
      }
    }

    if (runInBand) {
      for (const pkg of packages) {
        await arab(getOpts(pkg))
      }
    } else {
      await Promise.all(
        packages.map(pkg => {
          return forkArab(getOpts(pkg))
        })
      )
    }

    return
  }

  return arab(opts)
}
