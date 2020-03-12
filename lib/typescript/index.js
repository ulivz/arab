const { existsSync, readFileSync } = require('fs')
const { join } = require('path')

function getTSConfig({ cwd, preset, enableTsConfig = false }) {
  let tsconfigPath = join(__dirname, 'tsconfig.json')
  if (enableTsConfig) {
    const tmp = join(cwd, 'tsconfig.json')
    if (existsSync(tmp)) {
      tsconfigPath = tmp
    }
  }

  const tsConfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'))
  if (preset === 'cli') {
    tsConfig.compilerOptions.module = 'commonjs'
  }

  return tsConfig
}

module.exports = {
  getTSConfig,
}
