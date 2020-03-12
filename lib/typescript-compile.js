const ts = require('typescript')

let cache = {}

module.exports = function({ fileNames, tsconfig }) {
  const { compilerOptions } = tsconfig
  const sourceFileNames = fileNames
  const compileFileNames = fileNames.filter(fileName => {
    return !cache[fileName]
  })

  if (compileFileNames.length > 0) {
    const output = {}
    /**
     * Ref: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#getting-the-dts-from-a-javascript-file
     */
    const host = ts.createCompilerHost(compilerOptions)
    host.writeFile = function(_filename, contents, a1, a2, a3) {
      const { fileName } = a3[0]

      if (!output[fileName]) {
        output[fileName] = {}
      }

      output[fileName] = contents
    }

    // Create a Program with an in-memory emit
    const program = ts.createProgram(compileFileNames, compilerOptions, host)
    // Prepare and emit the d.ts files
    program.emit()

    // Loop through all the input files
    // fileNames.forEach(file => {
    //   console.log("### JavaScript\n")
    //   console.log(host.readFile(file))
    //
    //   console.log("### Type Definition\n")
    //   const dts = file.replace(".js", ".d.ts")
    //   console.log(output[dts])
    // })

    cache = {
      ...cache,
      ...output,
    }
  }

  return sourceFileNames.reduce((memo, fileName) => {
    memo[fileName] = cache[fileName]
    return memo
  }, {})
}
