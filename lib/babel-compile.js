const babel = require('@babel/core')
const afBabel = require('af-babel')
const { cyan, gray } = require('chalk')
const logger = require('./logger')
/**
 * Babel transform.
 *
 * @param opts
 * @param babelConfig
 * @returns {*}
 */
module.exports = function(opts) {
  const {
    targets,
    filename,
    content,
    format,
    babelConfig,
    babelPresetUmiOptions,
    nodeEnv,
    loggerPrefix,
  } = opts

  const babelOpts = afBabel({
    presetOptions: {
      ...babelPresetUmiOptions,
      nodeEnv,
      env: {
        targets,
        ...babelPresetUmiOptions.env,
        modules: format === 'esm' ? false : 'auto',
      },
    },
    babelConfig,
  })

  logger.debug('babelOpts', JSON.stringify(babelOpts, null, 2))

  babelOpts.plugins.push(require.resolve('./babel-plugin-normalize-extensions'))

  logger.log(
    `Transpiled: ${loggerPrefix ? `${gray(loggerPrefix)} ` : ''}${cyan(
      filename
    )}`
  )

  return babel.transform(content, {
    ...babelOpts,
    filename,
  }).code
}
