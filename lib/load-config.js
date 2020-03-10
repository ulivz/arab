const JoyCon = require('joycon')

const joycon = new JoyCon()

module.exports = async function({ cwd = process.cwd() } = {}) {
  const config = await joycon.load({
    files: ['babe.config.js', 'babe.config.json', 'babe.js', 'package.json'],
    cwd,
    packageKey: 'babe',
  })

  return config.data
}
