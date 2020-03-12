const { fork } = require('child_process')

const sigIntListeners = []
const sigtermListeners = []

process.on('SIGINT', () => {
  sigIntListeners.forEach(listener => listener && listener())
})

process.on('SIGTERM', () => {
  sigIntListeners.forEach(listener => listener && listener())
})

module.exports = async function(options) {
  const arabPath = require.resolve('./arab')

  const ps = fork(arabPath, ['--color'], {
    stdio: 'inherit',
    cwd: options.cwd,
    env: {
      BABE_OPTIONS: JSON.stringify(options),
    },
  })

  sigIntListeners.push(() => {
    ps.kill('SIGINT')
  })

  sigtermListeners.push(() => {
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
