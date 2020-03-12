const { extname } = require('path')
const through2 = require('through2')
const typescriptCompile = require('./typescript-compile')

/**
 * A gulp plugin to transpile typescript.
 */
module.exports = function({ compilerOptions }) {
  const fileMap = {}
  return through2.obj(
    (file, env, cb) => {
      fileMap[file.path] = file
      cb()
    },
    function(cb) {
      const retMap = typescriptCompile({
        filename: Object.keys(fileMap),
        compilerOptions,
      })

      const self = this

      Object.keys(retMap).forEach(filepath => {
        const file = fileMap[filepath]
        const ret = retMap[filepath]

        if (ret.js) {
          file.contents = Buffer.from(ret.js)
          file.path = file.path.replace(extname(file.path), '.js')
          if (ret.dts) {
            const dtsFile = file.clone()
            dtsFile.contents = Buffer.from(ret.dts)
            self.push(dtsFile)
          }
        } else if (ret.dts) {
          file.contents = Buffer.from(ret.dts)
          file.path = file.path.replace(extname(file.path), '.d.ts')
        }

        self.push(file)
      })

      cb()
    }
  )
}
