const { join, dirname } = require('path')
const { writeFile, ensureDirSync } = require('fs-extra')
const globby = require('globby')
const { cyan, gray } = require('chalk')
const chokidar = require('chokidar')
const compile = require('./typescript-compile')
const logger = require('./logger')

/**
 * A gulp plugin to handle compilation of scripts.
 */
module.exports = async function({
  cwd,
  outDir,
  watch,
  tsconfig,
  loggerPrefix,
}) {
  const patterns = [
    '**/*.(ts|tsx)',
    '!**/fixtures/**/*',
    '!**/*.mdx',
    '!**/*.d.ts',
    '!**/*.+(test|e2e|spec).+(js|jsx|ts|tsx)',
  ]

  const matchedFiles = globby
    .sync(patterns, {
      cwd,
    })
    .map(relative => {
      const outPathRelative = relative.replace(/tsx?$/, 'd.ts')

      return {
        relative,
        path: join(cwd, relative),
        outPathRelative,
        outPath: join(outDir, outPathRelative),
      }
    })

  const fileNames = matchedFiles.map(file => file.path)

  const compiledRetMap = compile({
    fileNames,
    tsconfig,
  })

  const handleRetMap = compiledRetMap => {
    return Promise.all(
      Object.keys(compiledRetMap).map(async filepath => {
        const ret = compiledRetMap[filepath]
        const targetFile = matchedFiles.find(file => file.path === filepath)
        ensureDirSync(dirname(targetFile.outPath))
        logger.log(
          `Generated: ${loggerPrefix ? `${gray(loggerPrefix)} ` : ''}${cyan(
            targetFile.outPathRelative
          )}`
        )
        await writeFile(targetFile.outPath, ret, 'utf-8')
      })
    )
  }

  await handleRetMap(compiledRetMap)

  if (watch) {
    const watcher = chokidar.watch(patterns, { cwd, ignoreInitial: true })
    ;['add', 'change', 'unlink'].forEach(eventType =>
      watcher.on(eventType, async file => {
        const filepath = join(cwd, file)
        const compiledRetMap = compile({
          fileNames: [filepath],
          tsconfig,
        })
        await handleRetMap(compiledRetMap)
      })
    )
  }
}
