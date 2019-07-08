const {Command, flags} = require('@oclif/command')
const AWS = require('aws-sdk')
const awsHelpers = require('../../../lib/aws/aws-helpers')
const cache = require('../../../lib/cache')
const config = require('../../../lib/aws/config')
const Listr = require('listr')
const notifier = require('node-notifier')
const parsers = require('../../../lib/parsers')

const awsTask = require('../../../lib/aws/tasks/aws-task')
const mantisApiTask = require('../../../lib/aws/tasks/mantis-api-task')
const mantisControlPlaneTask = require('../../../lib/aws/tasks/mantis-control-plane-task')
const mesosMasterTask = require('../../../lib/aws/tasks/mesos-master-task')
const mesosSlaveTask = require('../../../lib/aws/tasks/mesos-slave-task')
const zookeeperTask = require('../../../lib/aws/tasks/zookeeper-task')

/**
 * Serially run tasks to bootstrap a Mantis cluster in AWS.
 * It expects credentials to have been previously configured
 * using the `mants bootstrap:aws:configure` command.
 *
 * Bootstrapping a mantis cluster includes:
 *
 * 1. Creating an AWS key-pair
 * 2. Creating or using an existing default VPC
 * 3. Creating and setting up security groups for mantis components
 * 4. Bootstrapping zookeeper
 * 5. Bootstrapping mesos
 * 6. Bootstrapping mantis
 *
 * This command is idempotent in that re-running the command will skip tasks
 * that were already completed.
 */
class BootstrapCommand extends Command {
  async run() {
    if (!awsHelpers.credentialsExist()) {
      throw new Error(`AWS credentials not found at ${awsHelpers.credentialsFile}. ` +
        'Use `mantis aws:configure` to add your AWS credentials before bootstrapping.')
    }

    let defaults = cache.loadDefaults(this.config.dataDir)
    const {flags} = this.parse(BootstrapCommand)

    await parsers.parseRegion(defaults, flags)
    cache.saveDefaults(this.config.dataDir, defaults)

    const ec2 = new AWS.EC2({apiVersion: config.aws.ec2.apiVersion, region: defaults.region})
    const iam = new AWS.IAM({apiVersion: config.aws.iam.apiVersion, region: defaults.region})

    Object.assign(defaults, config)
    const confirmation = await parsers.parseConfirm(defaults, flags)
    if (!confirmation) {
      return
    }

    defaults.regionalKeyPair = defaults.keyPair + '-' + defaults.region

    let context = {
      defaults: defaults,
      ec2: ec2,
      iam: iam,
    }

    const tasks = new Listr([
      {
        title: 'Create key pair',
        task: awsTask.createKeyPair,
      },
      {
        title: 'Create default VPC',
        task: awsTask.createDefaultVPC,
      },
      {
        title: 'Create zookeeper security group',
        task: zookeeperTask.createSecurityGroup,
      },
      {
        title: 'Authorize zookeeper security group ssh port ingress',
        task: zookeeperTask.authorizeSSHSecurityGroupIngress,
      },
      {
        title: 'Authorize zookeeper security group zookeeper port ingress',
        task: zookeeperTask.authorizeMainSecurityGroupIngress,
      },
      {
        title: 'Bootstrap Zookeeper node',
        task: zookeeperTask.bootstrap,
      },
      {
        title: 'Create mesos-master security group',
        task: mesosMasterTask.createSecurityGroup,
      },
      {
        title: 'Authorize mesos-master security group ssh port ingress',
        task: mesosMasterTask.authorizeSSHSecurityGroupIngress,
      },
      {
        title: 'Authorize mesos-master security group mesos-master port 5050 ingress',
        task: mesosMasterTask.authorizeMesosSecurityGroupIngress,
      },
      {
        title: 'Bootstrap Mesos Master node',
        task: mesosMasterTask.bootstrap,
      },
      {
        title: 'Create mesos-slave security group',
        task: mesosSlaveTask.createSecurityGroup,
      },
      {
        title: 'Authorize mesos-slave security group ssh port ingress',
        task: mesosSlaveTask.authorizeSSHSecurityGroupIngress,
      },
      {
        title: 'Authorize mesos-slave security group mantis-agent port 7104 ingress',
        task: mesosSlaveTask.authorizeMainSecurityGroupIngress,
      },
      {
        title: 'Authorize mesos-slave security group mantis-agent port 7150-7400 ingress',
        task: mesosSlaveTask.authorizeExtraSecurityGroupIngress,
      },
      {
        title: 'Authorize mesos-slave security group mesos-slave resource port ingress',
        task: mesosSlaveTask.authorizeResourceSecurityGroupIngress,
      },
      {
        title: 'Bootstrap Mesos Slave node',
        task: mesosSlaveTask.bootstrap,
      },
      {
        title: 'Create mantis-control-plane security group',
        task: mantisControlPlaneTask.createSecurityGroup,
      },
      {
        title: 'Authorize mantis-control-plane security group ssh port ingress',
        task: mantisControlPlaneTask.authorizeSSHSecurityGroupIngress,
      },
      {
        title: 'Authorize mantis-control-plane security group remote debug port 5050 ingress',
        task: mantisControlPlaneTask.authorizeRemoteDebugSecurityGroupIngress,
      },
      {
        title: 'Authorize mantis-control-plane security group api port 8100 ingress',
        task: mantisControlPlaneTask.authorizeApiSecurityGroupIngress,
      },
      {
        title: 'Authorize mantis-control-plane security group api v2 port 8075 ingress',
        task: mantisControlPlaneTask.authorizeApiSecurityGroupIngress,
      },
      {
        title: 'Authorize mantis-control-plane security group scheduling info port 8076 ingress',
        task: mantisControlPlaneTask.authorizeSchedulingInfoSecurityGroupIngress,
      },
      {
        title: 'Authorize mantis-control-plane security group metrics port 8082 ingress',
        task: mantisControlPlaneTask.authorizeMetricsSecurityGroupIngress,
      },
      {
        title: 'Authorize mantis-control-plane security group console port 9090 ingress',
        task: mantisControlPlaneTask.authorizeMesosSecurityGroupIngress,
      },
      {
        title: 'Bootstrap Mantis Control Plane service',
        task: mantisControlPlaneTask.bootstrap,
      },
      {
        title: 'Create mantis-api security group',
        task: mantisApiTask.createSecurityGroup,
      },
      {
        title: 'Authorize mantis-api security group ssh port ingress',
        task: mantisApiTask.authorizeSSHSecurityGroupIngress,
      },
      {
        title: 'Authorize mantis-api security group web port 80 ingress',
        task: mantisApiTask.authorizeWebSecurityGroupIngress,
      },
      {
        title: 'Authorize mantis-api security group ssl port 443 ingress',
        task: mantisApiTask.authorizeWebSSLSecurityGroupIngress,
      },
      {
        title: 'Authorize mantis-api security group api port 7101 ingress',
        task: mantisApiTask.authorizeApiSecurityGroupIngress,
      },
      {
        title: 'Authorize mantis-api security group websocket port 7102 ingress',
        task: mantisApiTask.authorizeWebsocketSecurityGroupIngress,
      },
      {
        title: 'Authorize mantis-api security group tunnel port 7001 ingress',
        task: mantisApiTask.authorizeTunnelSecurityGroupIngress,
      },
      {
        title: 'Bootstrap Mantis API service',
        task: mantisApiTask.bootstrap,
      },
    ])

    tasks.run(context).then(ctx => {
      console.info('Mantis API will be provisioned in a few minutes\n' +
        `\twith public DNS available at ${ctx.mantisApiPublicDnsName}\n` +
        '\tInput this URL into your local Mantis UI to connect to the Mantis cluster.\n' +
        'Mesos Master will be provisioned in a few minutes\n' +
        `\twith public DNS available at ${ctx.mesosMasterPublicDnsName}\n` +
        '\tInput this URL into your local Mantis UI so it can connect to Mesos logs.\n')
      notifier.notify({
        title: 'Mantis AWS Bootstrap',
        message: 'Mantis cluster bootstrap completed',
      })
    }).catch(err => {
      console.error(err)
    })
  }
}

BootstrapCommand.description = `bootstraps a Mantis cluster in AWS
This command will automatically orchestrate the creation of all
AWS and Mantis dependencies in AWS. Specifically, it will create:

  1. AWS key pair
  2. Default VPC
  3. Security groups
  4. Single Zookeeper EC2 instance backed by EBS volume
  5. Single Mesos Master EC2 instance backed by EBS volume
  6. Single Mesos Slave EC2 instance backed by EBS volume
  7. Single Mantis Control Plane EC2 instance backed by EBS volume

This command will also set up connection strings and other properties
for Mantis.

Once this command finishes, you will be able to submit streaming jobs into
your Mantis cluster via HTTP requests to the Mantis Control Plane.

== IMPORTANT ==
As a pre-requisite, this command requires that you set up your AWS credentials.
See \`mantis aws:configure --help\` for more details.
`

BootstrapCommand.flags = {
  region: flags.string({char: 'r', description: 'AWS region'}),
  confirm: flags.boolean({char: 'y', default: false, description: 'Autoconfirms commands'}),
}

module.exports = BootstrapCommand
