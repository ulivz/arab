const JoyCon = require('joycon')

const joycon = new JoyCon()

module.exports = async function ({ cwd = process.cwd() } = {}) {
  const config = await joycon.load({
    files: ['arab.config.js', 'arab.config.json', 'arab.js', 'package.json'],
    cwd,
    packageKey: 'arab',
  })

  return config.data
}
