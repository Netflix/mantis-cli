const awsHelpers = require('../aws-helpers')
const fs = require('fs-extra')

const createSecurityGroup = (ctx, task) => {
  const response = awsHelpers.createSecurityGroups(ctx.ec2, ctx.defaults.mantisControlPlane.securityGroup).catch(err => {
    if (err.code === 'InvalidGroup.Duplicate') {
      task.skip(`Security group already exists (${ctx.defaults.mantisControlPlane.securityGroup})`)
    } else {
      throw err
    }
  })

  return response
}

function authorizeSecurityGroupIngress(ctx, task, fromPort, toPort) {
  return awsHelpers.authorizeSecurityGroupIngress(ctx.ec2, ctx.defaults.mantisControlPlane.securityGroup, fromPort, toPort).catch(err => {
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

const authorizeRemoteDebugSecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 5005, 5005)
}

const authorizeApiSecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 8100, 8100)
}

const authorizeApiV2SecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 8075, 8075)
}

const authorizeSchedulingInfoSecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 8076, 8076)
}

const authorizeMetricsSecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 8082, 8082)
}

const authorizeMesosSecurityGroupIngress = (ctx, task) => {
  return authorizeSecurityGroupIngress(ctx, task, 80, 65535)
}

const bootstrap = (ctx, task) => {
  const userData = fs.readFileSync(ctx.defaults.mantisControlPlane.cloudInitTemplate).toString('base64')
  const params = {
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
    PrivateIpAddress: '172.31.0.7',
    SecurityGroupIds: [
      ctx.defaults.mantisControlPlane.securityGroup,
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
      task.skip('Mantis Control Plane service already launched')
    } else {
      throw err
    }
  })

  return response
}

module.exports.createSecurityGroup = createSecurityGroup
module.exports.authorizeSSHSecurityGroupIngress = authorizeSSHSecurityGroupIngress
module.exports.authorizeRemoteDebugSecurityGroupIngress = authorizeRemoteDebugSecurityGroupIngress
module.exports.authorizeApiSecurityGroupIngress = authorizeApiSecurityGroupIngress
module.exports.authorizeApiV2SecurityGroupIngress = authorizeApiV2SecurityGroupIngress
module.exports.authorizeSchedulingInfoSecurityGroupIngress = authorizeSchedulingInfoSecurityGroupIngress
module.exports.authorizeMetricsSecurityGroupIngress = authorizeMetricsSecurityGroupIngress
module.exports.authorizeMesosSecurityGroupIngress = authorizeMesosSecurityGroupIngress
module.exports.bootstrap = bootstrap
