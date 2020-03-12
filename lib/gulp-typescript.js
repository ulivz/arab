const { extname } = require('path')
const { cyan, gray } = require('chalk')
const through2 = require('through2')
const typescriptCompile = require('./typescript-compile')
const logger = require('./logger')

function handleTranformRet(self, file, ret, loggerPrefix) {
  try {
    file.contents = Buffer.from(ret)
    file.path = file.path.replace(extname(file.path), '.d.ts')
    logger.log(
      `Generated: ${loggerPrefix ? `${gray(loggerPrefix)} ` : ''}${cyan(
        file.relative
      )}`
    )

    self.push(file)
  } catch (error) {
    console.error(file && file.path)
    throw error
  }
}

/**
 * A gulp plugin to transpile typescript.
 */
module.exports = function(tsconfig, { watch, loggerPrefix = '' }) {
  const fileMap = {}

  return through2.obj(
    function(file, env, cb) {
      if (watch) {
        const self = this

        const retMap = typescriptCompile({
          fileNames: [file.path],
          tsconfig,
        })

        const ret = retMap[file.path]
        if (typeof ret !== 'string') {
          logger.warn(`Cannot generate d.ts for: ${file.path}`)
        }

        handleTranformRet(self, file, ret, loggerPrefix)
      } else {
        fileMap[file.path] = file
      }

      cb()
    },

    function(cb) {
      if (!watch) {
        const retMap = typescriptCompile({
          fileNames: Object.keys(fileMap),
          tsconfig,
        })

        const self = this

        Object.keys(retMap).forEach(filepath => {
          const file = fileMap[filepath] || fileMap[filepath + 'x']
          const ret = retMap[filepath]
          handleTranformRet(self, file, ret, loggerPrefix)
        })
      }

      cb()
    }
  )
}
