'use strict';

const { join, extname, dirname, basename } = require('path')
const { existsSync } = require('fs')
const { cyan, dim, green } = require('chalk')
const { isPlainObject } = require('./util')
const babel = require('@babel/core')
const prettyBytes = require('pretty-bytes')
const gzipSize = require('gzip-size')
const textTable = require('text-table')
const stringWidth = require('string-width')
const boxen = require('boxen')
const afBabel = require('@alipay/af-babel')

const vfs = require('vinyl-fs')
const less = require('gulp-less')
const gulpif = require('gulp-if')
const postcss = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const px2rem = require('postcss-plugin-px2rem')
const cleanCss = require('gulp-clean-css')
const gulpRename = require('gulp-rename')
const gulpWatch = require('gulp-watch')
const through2 = require('through2')
const globby = require('globby')
const logger = require('./logger')

const JS_REG = /\.jsx?$/
const TS_REG = /\.tsx?$/
const LESS_REG = /\.less?$/
const CSS_REG = /\.css?$/
const VUE_REG = /\.vue?$/

module.exports = async opts => {
  const { monorepo, cwd = process.cwd(), runInBand = false } = opts
  if (monorepo) {
    let packagePatterns = ['packages/*']
    let filter = v => v

    if (Array.isArray(monorepo)) {
      packagePatterns = monorepo

    } else if (isPlainObject(monorepo)) {
      if (monorepo.packages) packagePatterns = monorepo.packages
      if (monorepo.filter) filter = monorepo.filter
    }

    let packages = globby.sync(packagePatterns, {
      cwd,
      onlyDirectories: true,
    })
      .filter(filter)

    logger.debug('monorepo mode enabled!')
    logger.debug('packages', packages)

    packages = packages.map(dirname => {
      const path = join(cwd, dirname)
      return {
        path,
        pkgJsonPath: join(path, 'package.json'),
        dirname
      }
    })
      .map(pkg => ({
        ...pkg,
        pkgJson: existsSync(pkg.pkgJsonPath)
          ? require(pkg.pkgJsonPath)
          : {}
      }))

    const getOpts = pkg => {
      return {
        ...opts,
        cwd: pkg.path,
        name: pkg.pkgJson.name || pkg.dirname
      }
    }

    if (runInBand && !opts.watch) {
      for (let pkg of packages) {
        await babe(getOpts(pkg))
      }

    } else {
      await Promise.all(packages.map(pkg => {
        return babe(getOpts(pkg))
      }))
    }

    return
  }

  return babe(opts)
}

/**
 * babe
 */

async function babe(opts = {}) {
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
    preset = 'app'
  } = opts

  const DEFAULT_FORMAT = preset === 'app'
    ? 'esm'
    : preset === 'cli'
      ? 'cjs'
      : 'esm'

  const { format = DEFAULT_FORMAT } = opts
  let { babelPresetUmiOptions = {} } = opts

  if (preset === 'cli') {
    babelPresetUmiOptions = {
      ...babelPresetUmiOptions,
      env: {
        corejs: undefined,
        useBuiltIns: false,
        targets: {
          node: '8.0.0'
        }
      },
      transformRuntime: false,
    }
  }

  const { outDir = (format === 'esm' ? 'es' : 'lib') } = opts

  const srcPath = join(cwd, input)
  const targetDir = join(cwd, outDir)
  const srcFn = watch ? gulpWatch : vfs.src

  /**
   * A gulp plugin to handle compilation of scripts.
   */
  function gulpBabel() {
    return through2.obj((file, env, cb) => {
      try {
        file.contents = Buffer.from(
          babelTransform({
            cwd,
            filename: file.relative,
            content: file.contents.toString(),
            targets,
            format,
            babelConfig,
            babelPresetUmiOptions,
            nodeEnv: process.env.NODE_ENV || (watch ? 'development' : 'production'),
            loggerPrefix: opts.name && opts.monorepo && watch
              ? opts.name
              : false
          }),
        )
        // .(jsx|tsx) -> .js
        file.path = file.path.replace(extname(file.path), '.js')
        cb(null, file)
      } catch (e) {
        console.log(e)
        cb(null)
      }
    })
  }

  /**
   * A gulp plugin to log output files.
   */
  function gulpOutputFilesLogger() {
    const fileLists = []

    return through2.obj((file, env, cb) => {
      if (!file.stat.isDirectory()) {
        fileLists.push({
          basename: file.relative,
          content: file.contents.toString(),
        })
      }

      cb(null, file)
    }, cb => {
      const table = fileLists.map(({ basename: _basename, content }) => [
        green(_basename),
        prettyBytes(content.length),
        prettyBytes(gzipSize.sync(content)),
      ])
      table.unshift(['File', 'Size', 'Gzipped'].map(v => dim(v)))
      console.log(
        boxen(
          textTable(table, { stringLength: stringWidth }),
        ),
      )
      cb()
    })
  }

  /**
   * A gulp plugin to compile Vue SFC.
   */
  function gulpVueSFC() {
    const bundle = require('../build')

    return through2.obj(async (file, env, cb) => {
      const outputFile = join(cwd, outDir, file.relative)
      const outputDir = dirname(outputFile)
      const outputFilename = basename(outputFile)

      await bundle({
        cwd: join(cwd, input),
        build: {
          input: file.relative,
          outDir: outputDir,
          fileName: outputFilename.replace(extname(outputFilename), '.js'),
          extractCSS: false,
          minify: false,
          format: 'commonjs2',
        },
      })

      cb(null, null)
    })
  }

  /**
   * Get post css plugins.
   */
  function getPostCssPlugins() {
    const plugins = [
      ...extraPostCSSPlugins,
    ]

    let hdOptions = hd

    if (hdOptions) {
      if (!isPlainObject(hd)) {
        hdOptions = {}
      }

      plugins.push(
        autoprefixer({
          overrideBrowserslist: [
            '>0.2%',
            'iOS >= 8',
            'Android > 4.4',
          ],
          flexbox: 'no-2009',
          ...(autoprefixerConfig || {}),
        }),
      )

      plugins.push(
        px2rem({
          rootValue: 100,
          minPixelValue: 2,
          ...(hdOptions.px2rem || {}),
        }),
      )
    }

    return plugins
  }

  const ps = srcFn([
    join(srcPath, '**/*'),
    `!${join(srcPath, '**/fixtures/**/*')}`,
    `!${join(srcPath, '**/*.mdx')}`,
    `!${join(srcPath, '**/*.d.ts')}`,
    `!${join(srcPath, '**/*.+(test|e2e|spec).+(js|jsx|ts|tsx)')}`,
  ], {
    ignoreInitial: false,
    allowEmpty: true,
    base: srcPath,
  })
  /**
   * Transpile `*.(js|jsx|ts|tsx)`.
   */
    .pipe(
      gulpif(
        f => TS_REG.test(f.path) || JS_REG.test(f.path),
        gulpBabel(),
      ),
    )
    /**
     * Transpile `*.less`.
     */
    .pipe(
      gulpif(
        f => LESS_REG.test(f.path),
        less(),
      ),
    )
    /**
     * Apply postcss.
     */
    .pipe(
      gulpif(
        f => LESS_REG.test(f.path) || CSS_REG.test(f.path),
        postcss((getPostCssPlugins())),
      ),
    )
    /**
     * Transpile `*.vue`.
     */
    // .pipe(gulpif(
    //   f => VUE_REG.test(f.path), gulpVueSFC(),
    // ))
    /**
     * Handle compress styles.
     *
     * Why using 'clean-css' ?
     * ref: https://www.npmtrends.com/clean-css-vs-cssmin-vs-cssnano-vs-csso
     */
    .pipe(
      gulpif(
        f => minify && (CSS_REG.test(f.path) || LESS_REG.test(f.path)),
        cleanCss(),
      ),
    )
    /**
     * Handle rename.
     */
    .pipe(
      gulpif(
        typeof rename === 'function', gulpRename(rename),
      ),
    )
    .pipe(gulpOutputFilesLogger())
    /**
     * Output
     */
    .pipe(vfs.dest(targetDir))

  /**
   * Default behaviors of handling watcher.
   */
  if (watch) {
    ['add', 'change', 'unlink'].forEach(
      eventType => ps.on(eventType, file => {
        console.log(`${eventType} ${cyan(file)}`)
      }),
    )

    return ps
  }

  return new Promise((resolve, reject) => {
    ps.on('end', resolve)
    ps.on('error', reject)
  })
}

/**
 * Babel transform.
 *
 * @param opts
 * @param babelConfig
 * @returns {*}
 */

function babelTransform(opts) {
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
      }
    },
    babelConfig,
  })

  logger.debug('babelOpts', JSON.stringify(babelOpts, null, 2))

  babelOpts.plugins.push(
    require.resolve('./babel-plugin-normalize-extensions'),
  )

  logger.log(`Transpile: ${cyan(filename)}`, loggerPrefix)

  return babel.transform(content, {
    ...babelOpts,
    filename,
  }).code
}
