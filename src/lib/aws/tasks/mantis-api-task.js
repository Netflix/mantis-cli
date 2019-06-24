const awsHelpers = require('../aws-helpers')
const fs = require('fs-extra')
const retry = require('async-retry')

const privateIp = '172.31.0.8'

const createSecurityGroup = (ctx, task) => {
  const response = awsHelpers.createSecurityGroups(ctx.ec2, ctx.defaults.mantisApi.securityGroup).catch(err => {
    if (err.code === 'InvalidGroup.Duplicate') {
      task.skip(`Security group already exists (${ctx.defaults.mantisApi.securityGroup})`)
    } else {
      throw err
    }
  })

  return response
}

function authorizeSecurityGroupIngress(ctx, task, fromPort, toPort) {
  return awsHelpers.authorizeSecurityGroupIngress(ctx.ec2, ctx.defaults.mantisApi.securityGroup, fromPort, toPort).catch(err => {
    if (err.code === 'InvalidPermission.Duplicate') {
      task.skip('Ingress rule already exists')
    } else {
      throw err
    }
  })
}

const authorizeSSHSecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 22, 22)
}

const authorizeWebSecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 80, 80)
}

const authorizeWebSSLSecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 443, 443)
}

const authorizeApiSecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 7101, 7101)
}

const authorizeWebsocketSecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 7102, 7102)
}

const authorizeTunnelSecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 7001, 7001)
}

const bootstrap = async (ctx, task) => {
  const userData = fs.readFileSync(ctx.defaults.mantisApi.cloudInitTemplate).toString('base64')

  const runParams = {
    IamInstanceProfile: {
      Name: ctx.iamInstanceProfile,
    },
    ImageId: 'ami-5e8bb23b',
    InstanceType: 't2.micro',
    KeyName: ctx.defaults.keyPair,
    MaxCount: 1,
    MinCount: 1,
    Placement: {
      AvailabilityZone: 'us-east-2a',
    },
    PrivateIpAddress: privateIp,
    SecurityGroupIds: [
      ctx.defaults.mantisApi.securityGroup,
    ],
    TagSpecifications: [
      {
        ResourceType: 'instance',
        Tags: [
          {
            Key: ctx.defaults.tag.name,
            Value: ctx.defaults.tag.value,
          },
        ],
      },
    ],
    UserData: userData,
  }

  const runResponse = await ctx.ec2.runInstances(runParams).promise().catch(err => {
    if (err.code === 'InvalidIPAddress.InUse') {
      task.skip('Mantis API service already launched')
    } else {
      throw err
    }
  })

  const describeParams = {
    Filters: [
      {
        Name: 'private-ip-address',
        Values: [
          privateIp,
        ],
      },
    ],
  }

  await retry(async _ => {
    let describeResponse = await ctx.ec2.describeInstances(describeParams).promise().catch(err => {
      throw err
    })
    let publicDnsName = describeResponse.Reservations[0].Instances[0].PublicDnsName

    if (publicDnsName === '') {
      throw new Error('instance public dns not available yet')
    }

    ctx.mantisApiPublicDnsName = `${publicDnsName}:7101`
  }, {retries: 5})

  return runResponse
}

module.exports.createSecurityGroup = createSecurityGroup
module.exports.authorizeSSHSecurityGroupIngress = authorizeSSHSecurityGroupIngress
module.exports.authorizeWebSecurityGroupIngress = authorizeWebSecurityGroupIngress
module.exports.authorizeWebSSLSecurityGroupIngress = authorizeWebSSLSecurityGroupIngress
module.exports.authorizeApiSecurityGroupIngress = authorizeApiSecurityGroupIngress
module.exports.authorizeWebsocketSecurityGroupIngress = authorizeWebsocketSecurityGroupIngress
module.exports.authorizeTunnelSecurityGroupIngress = authorizeTunnelSecurityGroupIngress
module.exports.bootstrap = bootstrap
