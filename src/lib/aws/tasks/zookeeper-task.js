const awsHelpers = require('../aws-helpers')
const fs = require('fs-extra')

const createSecurityGroup = (ctx, task) => {
  const response = awsHelpers.createSecurityGroups(ctx.ec2, ctx.defaults.zookeeper.securityGroup).catch(err => {
    if (err.code === 'InvalidGroup.Duplicate') {
      task.skip(`Security group already exists (${ctx.defaults.zookeeper.securityGroup})`)
    } else {
      throw err
    }
  })

  return response
}

const authorizeSSHSecurityGroupIngress = (ctx, task) => {
  const response = awsHelpers.authorizeSecurityGroupIngress(ctx.ec2, ctx.defaults.zookeeper.securityGroup, 22, 22).catch(err => {
    if (err.code === 'InvalidPermission.Duplicate') {
      task.skip('Ingress rule already exists')
    } else {
      throw err
    }
  })

  return response
}

const authorizeMainSecurityGroupIngress = (ctx, task) => {
  const response = awsHelpers.authorizeSecurityGroupIngress(ctx.ec2, ctx.defaults.zookeeper.securityGroup, 2181, 2181).catch(err => {
    if (err.code === 'InvalidPermission.Duplicate') {
      task.skip('Ingress rule already exists')
    } else {
      throw err
    }
  })

  return response
}

const bootstrap = (ctx, task) => {
  const userData = fs.readFileSync(ctx.defaults.zookeeper.cloudInitTemplate).toString('base64')
  const params = {
    ImageId: 'ami-5e8bb23b',
    InstanceType: 't2.micro',
    KeyName: ctx.defaults.keyPair,
    MaxCount: 1,
    MinCount: 1,
    Placement: {
      AvailabilityZone: 'us-east-2a',
    },
    PrivateIpAddress: '172.31.0.4',
    SecurityGroupIds: [
      ctx.defaults.zookeeper.securityGroup,
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

  const response = ctx.ec2.runInstances(params).promise().catch(err => {
    if (err.code === 'InvalidIPAddress.InUse') {
      task.skip('Zookeeper node already launched')
    } else {
      throw err
    }
  })

  return response
}

module.exports.createSecurityGroup = createSecurityGroup
module.exports.authorizeSSHSecurityGroupIngress = authorizeSSHSecurityGroupIngress
module.exports.authorizeMainSecurityGroupIngress = authorizeMainSecurityGroupIngress
module.exports.bootstrap = bootstrap
