const { join } = require('path')
const { cyan, gray, magenta } = require('chalk')
const vfs = require('vinyl-fs')
const less = require('gulp-less')
const gulpif = require('gulp-if')
const postcss = require('gulp-postcss')
const gulpClone = require('gulp-clone')
const gulpFilter = require('gulp-filter')
const merge = require('merge2')
const autoprefixer = require('autoprefixer')
const px2rem = require('postcss-plugin-px2rem')
const cleanCss = require('gulp-clean-css')
const gulpRename = require('gulp-rename')
const gulpWatch = require('gulp-watch')
const gulpBabel = require('./gulp-babel')
const gulpOutputFilesLogger = require('./gulp-output-files-logger')
const { getTSConfig } = require('./typescript')
const loadConfig = require('./load-config')
const generateDts = require('./generate-dts')

const JS_REG = /\.jsx?$/
const TS_REG = /\.tsx?$/
const LESS_REG = /\.less?$/
const CSS_REG = /\.css?$/

const { isPlainObject } = require('./util')
const logger = require('./logger')

/**
 * Pass from parent process.
 */
const BABE_OPTIONS = process.env.BABE_OPTIONS
  ? JSON.parse(process.env.BABE_OPTIONS)
  : null

/**
 * Babe
 */
async function arab(opts = {}) {
  opts.cwd = opts.cwd || process.cwd()
  const userConfig = loadConfig(opts.cwd)

  opts = {
    ...userConfig,
    ...opts,
    ...BABE_OPTIONS,
  }

  const {
    cwd = process.cwd(),
    input = 'src',

    watch,
    babel: babelConfig,

    hd = true,
    extraPostCSSPlugins = [],
    autoprefixer: autoprefixerConfig,
    targets = {
      ios: 8,
      android: 4,
    },
    minify,
    rename,
    preset = 'app',
    dts = false,
    sourceTsToLib = false,
    enableTsConfig = false,
  } = opts

  logger.info(
    `Transpile ${gray(opts.name || opts.cwd)} ${cyan(input)} ${
      watch ? `${magenta('on watch mode')}` : ''
      }`
  )
  logger.debug('opts', opts)

  const DEFAULT_FORMAT =
    preset === 'app' ? 'esm' : preset === 'cli' ? 'cjs' : 'esm'

  const { format = DEFAULT_FORMAT } = opts
  let { babelPresetUmiOptions = {} } = opts

  if (preset === 'cli') {
    babelPresetUmiOptions = {
      ...babelPresetUmiOptions,
      env: {
        corejs: undefined,
        useBuiltIns: false,
        targets: {
          node: '8.0.0',
        },
      },
      transformRuntime: false,
    }
  }

  const { outDir = format === 'esm' ? 'es' : 'lib' } = opts

  const inputDirPath = join(cwd, input)
  const outputDirPath = join(cwd, outDir)
  const srcFn = watch ? gulpWatch : vfs.src

  /**
   * Get post css plugins.
   */
  function getPostCssPlugins() {
    const plugins = [...extraPostCSSPlugins]

    let hdOptions = hd

    if (hdOptions) {
      if (!isPlainObject(hd)) {
        hdOptions = {}
      }

      plugins.push(
        autoprefixer({
          overrideBrowserslist: ['>0.2%', 'iOS >= 8', 'Android > 4.4'],
          flexbox: 'no-2009',
          ...(autoprefixerConfig || {}),
        })
      )

      plugins.push(
        px2rem({
          rootValue: 100,
          minPixelValue: 2,
          ...(hdOptions.px2rem || {}),
        })
      )
    }

    return plugins
  }

  const mainStream = srcFn(
    [
      join(inputDirPath, '**/*'),
      `!${join(inputDirPath, '**/fixtures/**/*')}`,
      `!${join(inputDirPath, '**/*.mdx')}`,
      `!${join(inputDirPath, '**/*.d.ts')}`,
      `!${join(inputDirPath, '**/*.+(test|e2e|spec).+(js|jsx|ts|tsx)')}`,
    ],
    {
      ignoreInitial: false,
      allowEmpty: true,
      base: inputDirPath,
    }
  )

  const loggerPrefix = opts.name && opts.monorepo ? opts.name : ''

  let sourceTsToLibStream

  if (sourceTsToLib) {
    /**
     * Stream of d.ts
     */
    sourceTsToLibStream = mainStream
      .pipe(gulpClone())
      .pipe(gulpFilter(['**/*.ts', '**/*.tsx']))
  }

  /**
   * Merge two streams
   */
  mainStream
  /**
   * Transpile `*.(ts|tsx|js|jsx)` with babel.
   */
    .pipe(
      gulpif(
        file => JS_REG.test(file.path) || TS_REG.test(file.path),
        gulpBabel({
          cwd,
          targets,
          format,
          babelConfig,
          babelPresetUmiOptions,
          nodeEnv:
            process.env.NODE_ENV || (watch ? 'development' : 'production'),
          loggerPrefix,
        })
      )
    )
    /**
     * Transpile `*.less`.
     */
    .pipe(gulpif(file => LESS_REG.test(file.path), less()))
    /**
     * Apply postcss.
     */
    .pipe(
      gulpif(
        file => LESS_REG.test(file.path) || CSS_REG.test(file.path),
        postcss(getPostCssPlugins())
      )
    )
    /**
     * Handle compress styles.
     *
     * Why using 'clean-css' ?
     * ref: https://www.npmtrends.com/clean-css-vs-cssmin-vs-cssnano-vs-csso
     */
    .pipe(
      gulpif(
        f => minify && (CSS_REG.test(f.path) || LESS_REG.test(f.path)),
        cleanCss()
      )
    )
    /**
     * Handle rename.
     */
    .pipe(gulpif(typeof rename === 'function', gulpRename(rename)))

  /**
   * Get final stream.
   */
  const stream = sourceTsToLibStream
    ? merge([mainStream, sourceTsToLibStream])
    : mainStream

  /**
   * Output.
   */
  stream
    .pipe(gulpif((!opts.monorepo && !watch), gulpOutputFilesLogger()))
    .pipe(vfs.dest(outputDirPath))

  let dtsPromise

  if (dts) {
    const tsconfig = getTSConfig({
      cwd,
      preset,
      enableTsConfig,
    })

    dtsPromise = generateDts({
      cwd: inputDirPath,
      outDir: outputDirPath,
      tsconfig,
      watch,
      loggerPrefix,
    })
  }

  if (watch) {
    [
      'SIGINT',
      'SIGTERM',
      'exit'
    ].forEach(eventType => {
      process.on(eventType, async () => {
        stream.close()
        if (dtsPromise) {
          const dtsWatcher = await dtsPromise
          dtsWatcher.close()
        }
      })
    })

    return {
      stream,
      dtsStream: dtsPromise,
    }
  }

  const mainPromise = new Promise((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
  })

  if (dtsPromise) {
    return await Promise.all([mainPromise, dtsPromise])
  }

  return mainPromise
}

if (BABE_OPTIONS) {
  arab(BABE_OPTIONS).catch(error => {
    throw new Error(error)
  })
}

module.exports = arab
