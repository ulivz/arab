const { extname } = require('path')
const through2 = require('through2')
const babelCompile = require('./babel-compile')

/**
 * A gulp plugin to handle compilation of scripts.
 */
module.exports = function({
  cwd,
  targets,
  format,
  babelConfig,
  babelPresetUmiOptions,
  nodeEnv,
  loggerPrefix,
}) {
  return through2.obj((file, env, cb) => {
    try {
      file.contents = Buffer.from(
        babelCompile({
          cwd,
          filename: file.relative,
          content: file.contents.toString(),
          targets,
          format,
          babelConfig,
          babelPresetUmiOptions,
          nodeEnv,
          loggerPrefix,
        })
      )
      // .(jsx|tsx) -> .js
      file.path = file.path.replace(extname(file.path), '.js')
      cb(null, file)
    } catch (error) {
      console.error(error)
      cb(null)
    }
  })
}
