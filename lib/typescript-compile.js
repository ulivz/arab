const ts = require('typescript')

module.exports = function({ filename, compilerOptions }) {
  const output = {}
  /**
   * Ref: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#getting-the-dts-from-a-javascript-file
   */
  if (compilerOptions.declaration && compilerOptions.emitDeclarationOnly) {
    const host = ts.createCompilerHost(compilerOptions)
    host.writeFile = function(filename, contents, a1, a2, a3) {
      const sourceFilename = a3[0].fileName

      if (!output[sourceFilename]) {
        output[sourceFilename] = {}
      }
      output[sourceFilename].dts = contents
    }

    // Create a Program with an in-memory emit
    const program = ts.createProgram(filename, compilerOptions, host)
    // Prepare and emit the d.ts files
    program.emit()
  }

  return output
}
