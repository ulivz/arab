const { join, dirname } = require('path')
const typescriptCompile = require('../lib/typescript-compile')
const tsconfig = require('../lib/typescript/tsconfig')

describe('', () => {
  it('generate d.ts', () => {
    const filename = join(__dirname, 'fixtures/ts/export-interface.ts')

    const ret = typescriptCompile({
      fileNames: [filename],
      compilerOptions: tsconfig.compilerOptions
    })

    expect(ret).toMatchSnapshot()
  })

  it('generate d.ts for .tsx', () => {
    const filename = join(__dirname, 'fixtures/tsx/index.tsx')

    const ret = typescriptCompile({
      fileNames: [filename],
      compilerOptions: tsconfig.compilerOptions
    })

    expect(ret).toMatchSnapshot()
  })
})
