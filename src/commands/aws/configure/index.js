const {Command, flags} = require('@oclif/command')
const awsHelpers = require('../../../lib/aws/aws-helpers')
const fs = require('fs-extra')
const cli = require('cli-ux').cli

/**
 * This class runs a command that configures AWS. It stores credentials
 * in a file located at `~/.aws/credentials` in the same format as the AWS CLI.
 * This command can take short or long-form arguments for credentials, otherwise,
 * the CLI prompts the user for input. On new input, this class will overwrite the
 * existing credentials file.
 */
class ConfigureCommand extends Command {
  async run() {
    const {flags} = this.parse(ConfigureCommand)
    const key = flags.key || await cli.prompt('AWS access key id')
    const secret = flags.secret || await cli.prompt('AWS secret access key')

    const credentialsContents = `[default]
aws_access_key_id = ${key}
aws_secret_access_key = ${secret}
`
    cli.action.start('Configuring AWS credentials')
    fs.ensureFile(awsHelpers.credentialsFile)
    .then(() => fs.writeFileSync(awsHelpers.credentialsFile, credentialsContents))

    cli.action.stop()
  }
}

ConfigureCommand.description = `configures AWS credentials
Stores AWS credentials in ~/.aws/credentials in ~/.aws/config
in the same format as the AWS CLI:

[default]
aws_access_key_id = <access key id>
aws_secret_access_key = <secret access key>
`

ConfigureCommand.flags = {
  key: flags.string({char: 'k', description: 'AWS access key id'}),
  secret: flags.string({char: 's', description: 'AWS secret access key'}),
}

module.exports = ConfigureCommand
