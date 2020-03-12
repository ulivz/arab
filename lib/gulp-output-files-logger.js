const { dim, green } = require('chalk')
const through2 = require('through2')
const prettyBytes = require('pretty-bytes')
const gzipSize = require('gzip-size')
const textTable = require('text-table')
const stringWidth = require('string-width')
const boxen = require('boxen')

/**
 * A gulp plugin to log output files.
 */
module.exports = function () {
  const fileLists = []

  return through2.obj(
    (file, env, cb) => {
      if (file && !file.isDirectory()) {
        fileLists.push({
          basename: file.relative,
          content: file.contents.toString(),
        })
      }

      cb(null, file)
    },
    cb => {
      const table = fileLists.map(({ basename: _basename, content }) => [
        green(_basename),
        prettyBytes(content.length),
        prettyBytes(gzipSize.sync(content)),
      ])
      table.unshift(['File', 'Size', 'Gzipped'].map(v => dim(v)))
      console.log(boxen(textTable(table, { stringLength: stringWidth })))
      cb()
    }
  )
}
