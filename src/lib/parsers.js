const inquirer = require('inquirer')

/**
 * Parses flags for input. If a flag is not present, prompt the user for input
 * and supply a default value (if any) from the cache. Default values are stored
 * in `.local/share/mantis/defaults.json`.
 *
 * @param {Object} defaults - map of cached default key-value json pairs
 * @param {Object} flags - map of user input
 */
async function parseRegion(defaults, flags) {
  defaults.region = flags.region || await inquirer.prompt({
    name: 'region',
    message: 'select a region',
    type: 'list',
    choices: [{name: 'us-east-2'}, {name: 'us-east-1'}, {name: 'us-west-2'}],
  }).then(responses => responses.region) || defaults.region

  return defaults.region
}

async function parseConfirm(configs, flags) {
  const confirmation = flags.confirm || await inquirer.prompt({
    name: 'confirm',
    message: `Using configs: ${JSON.stringify(configs)}\nProceed? (Y/n)`,
    default: 'n',
  }).then(response => response.confirm === 'Y')

  return confirmation
}

module.exports.parseRegion = parseRegion
module.exports.parseConfirm = parseConfirm
