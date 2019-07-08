const {Command, flags} = require('@oclif/command')
const AWS = require('aws-sdk')
const awsHelpers = require('../../../lib/aws/aws-helpers')
const cache = require('../../../lib/cache')
const config = require('../../../lib/aws/config')
const Listr = require('listr')
const notifier = require('node-notifier')
const parsers = require('../../../lib/parsers')

const teardownTask = require('../../../lib/aws/tasks/teardown-task')

/**
 * Serially run tasks to tear down a Mantis cluster in AWS.
 * It expects credentials to have been previously configured
 * using the `mants bootstrap:aws:configure` command.
 *
 * 1. Terminate all Mantis EC2 instances and delete all volumes
 * 2. Delete Mantis KeyPair
 * 3. Delete all Mantis security groups
 */
class TeardownCommand extends Command {
  async run() {
    if (!awsHelpers.credentialsExist()) {
      throw new Error(`AWS credentials not found at ${awsHelpers.credentialsFile}. ` +
        'Use `mantis aws:configure` to add your AWS credentials before bootstrapping.')
    }

    let defaults = cache.loadDefaults(this.config.dataDir)
    const {flags} = this.parse(TeardownCommand)

    await parsers.parseRegion(defaults, flags)
    cache.saveDefaults(this.config.dataDir, defaults)

    const ec2 = new AWS.EC2({apiVersion: config.aws.ec2.apiVersion, region: defaults.region})
    const iam = new AWS.IAM({apiVersion: config.aws.iam.apiVersion, region: defaults.region})

    Object.assign(defaults, config)
    const confirmation = await parsers.parseConfirm(defaults, flags)
    if (!confirmation) {
      return
    }

    let context = {
      defaults: defaults,
      ec2: ec2,
      iam: iam,
    }

    const tasks = new Listr([
      {
        title: 'Terminate instances',
        task: teardownTask.terminateInstances,
      },
    ])

    tasks.run(context).then(() => {
      notifier.notify({
        title: 'AWS Teardown',
        message: 'Mantis cluster teardown completed',
      })
    }).catch(err => {
      throw err
    })
  }
}

TeardownCommand.flags = {
  region: flags.string({char: 'r', description: 'AWS region'}),
  confirm: flags.boolean({char: 'y', default: false, description: 'Autoconfirms commands'}),
}

TeardownCommand.description = `tears down a Mantis cluster in AWS
This command will clean up all components in AWS created by
the \`aws:bootstrap\` command.
`

module.exports = TeardownCommand
