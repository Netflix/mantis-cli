const empty = require('is-empty')
const fs = require('fs-extra')

/**
 * Loads cached defaults key-value json pairs from a
 * `defaults.json` file in the data directory. If the
 * file is not present, return an empty map.
 *
 * @param {string} dataDir - oclif data directory
 */
function loadDefaults(dataDir) {
  const fileName = dataDir.concat('/', 'defaults.json')
  fs.ensureFileSync(fileName)
  const file = fs.readFileSync(fileName)

  let defaults = {}
  if (!empty(file.toString('utf8'))) {
    defaults = JSON.parse(file)
  }

  return defaults
}

/**
 * Persists defaults as key-value json pairs into
 * `defaults.json`.
 *
 * @param {string} dataDir - oclif data directory
 * @param {Object} defaults - key-value pairs, typically from user input.
 */
function saveDefaults(dataDir, defaults) {
  const fileName = dataDir.concat('/', 'defaults.json')
  fs.ensureFileSync(fileName)
  const data = JSON.stringify(defaults)
  fs.writeFileSync(fileName, data)
}

module.exports.loadDefaults = loadDefaults
module.exports.saveDefaults = saveDefaults
