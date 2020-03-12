const { fork } = require('child_process')

module.exports = async function(options) {
  const arabPath = require.resolve('./arab')

  const ps = fork(arabPath, ['--color'], {
    stdio: 'inherit',
    cwd: options.cwd,
    env: {
      BABE_OPTIONS: JSON.stringify(options),
    },
  })

  process.on('SIGINT', () => {
    ps.kill('SIGINT')
  })

  process.on('SIGTERM', () => {
    ps.kill('SIGTERM')
  })

  return new Promise((resolve, reject) => {
    ps.on('exit', code => {
      if (code === 0 || code === null) {
        resolve()
      }
      reject()
    })

    ps.on('errot', reject)
  })
}
