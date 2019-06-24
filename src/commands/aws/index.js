const {Command} = require('@oclif/command')
const CommandHelp = require('@oclif/plugin-help').default

class AwsCommand extends Command {
  async run() {
    const help = new CommandHelp(this.config, this.opts)
    help.showHelp(['help', 'aws'])
  }
}

AwsCommand.description = 'interacts with a Mantis cluster within the AWS environment'

module.exports = AwsCommand
