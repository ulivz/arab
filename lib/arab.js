const { join } = require('path')

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
const gulpTypeScript = require('./gulp-typescript')
const gulpOutputFilesLogger = require('./gulp-output-files-logger')
const { getTSConfig } = require('./typescript')
const loadConfig = require('./load-config')

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

  if (opts.name) {
    logger.info(opts.name)
  }

  logger.debug('opts', opts)

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
    sourceToLib = false,
    enableTsConfig = false
  } = opts

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

  // TODO support root tsconfig.json at monorepo
  //
  // console.log(tsConfig.compilerOptions)

  const srcPath = join(cwd, input)
  const targetDir = join(cwd, outDir)
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
      join(srcPath, '**/*'),
      `!${join(srcPath, '**/fixtures/**/*')}`,
      `!${join(srcPath, '**/*.mdx')}`,
      `!${join(srcPath, '**/*.d.ts')}`,
      `!${join(srcPath, '**/*.+(test|e2e|spec).+(js|jsx|ts|tsx)')}`,
    ],
    {
      ignoreInitial: false,
      allowEmpty: true,
      base: srcPath,
    }
  )

  let declarationStream

  if (dts || sourceToLib) {
    /**
     * Load tscofig.json.
     */
    const tsConfig = getTSConfig({
      cwd,
      preset,
      enableTsConfig,
    })

    /**
     * Stream of d.ts
     */
    declarationStream = mainStream
      .pipe(gulpClone())
      .pipe(gulpFilter(['**/*.ts', '**/*.tsx']))
      .pipe(gulpif(dts, gulpTypeScript(tsConfig)))
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
        file => (JS_REG.test(file.path) || TS_REG.test(file.path)),
        gulpBabel({
          cwd,
          targets,
          format,
          babelConfig,
          babelPresetUmiOptions,
          nodeEnv: process.env.NODE_ENV || (watch ? 'development' : 'production'),
          loggerPrefix: opts.name && opts.monorepo && watch ? opts.name : false,
        }))
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
  const stream = declarationStream
    ? merge([mainStream, declarationStream])
    : mainStream

  /**
   * Output.
   */
  stream
    .pipe(gulpOutputFilesLogger())
    /**
     * Output
     */
    .pipe(vfs.dest(targetDir))

  /**
   * Default behaviors of handling watcher.
   */
  if (watch) {
    ;['add', 'change', 'unlink'].forEach(eventType =>
      stream.on(eventType, file => {
        console.log(`${eventType} ${cyan(file)}`)
      })
    )

    return stream
  }

  return new Promise((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
  })
}

if (BABE_OPTIONS) {
  arab(BABE_OPTIONS).catch(error => {
    throw new Error(error)
  })
}

module.exports = arab
