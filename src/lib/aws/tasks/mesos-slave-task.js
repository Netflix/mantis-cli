const awsHelpers = require('../aws-helpers')
const fs = require('fs-extra')

const createSecurityGroup = (ctx, task) => {
  const response = awsHelpers.createSecurityGroups(ctx.ec2, ctx.defaults.mesosSlave.securityGroup).catch(err => {
    if (err.code === 'InvalidGroup.Duplicate') {
      task.skip(`Security group already exists (${ctx.defaults.mesosSlave.securityGroup})`)
    } else {
      throw err
    }
  })

  return response
}

const authorizeSSHSecurityGroupIngress = (ctx, task) => {
  const response = awsHelpers.authorizeSecurityGroupIngress(ctx.ec2, ctx.defaults.mesosSlave.securityGroup, 22, 22).catch(err => {
    if (err.code === 'InvalidPermission.Duplicate') {
      task.skip('Ingress rule already exists')
    } else {
      throw err
    }
  })

  return response
}

const authorizeMainSecurityGroupIngress = (ctx, task) => {
  const response = awsHelpers.authorizeSecurityGroupIngress(ctx.ec2, ctx.defaults.mesosSlave.securityGroup, 7104, 7104).catch(err => {
    if (err.code === 'InvalidPermission.Duplicate') {
      task.skip('Ingress rule already exists')
    } else {
      throw err
    }
  })

  return response
}

const authorizeExtraSecurityGroupIngress = (ctx, task) => {
  const response = awsHelpers.authorizeSecurityGroupIngress(ctx.ec2, ctx.defaults.mesosSlave.securityGroup, 7150, 7400).catch(err => {
    if (err.code === 'InvalidPermission.Duplicate') {
      task.skip('Ingress rule already exists')
    } else {
      throw err
    }
  })

  return response
}

const authorizeResourceSecurityGroupIngress = (ctx, task) => {
  const response = awsHelpers.authorizeSecurityGroupIngress(ctx.ec2, ctx.defaults.mesosSlave.securityGroup, 32768, 57344).catch(err => {
    if (err.code === 'InvalidPermission.Duplicate') {
      task.skip('Ingress rule already exists')
    } else {
      throw err
    }
  })

  return response
}

const bootstrap = (ctx, task) => {
  const userData = fs.readFileSync(ctx.defaults.mesosSlave.cloudInitTemplate).toString('base64')
  const params = {
    IamInstanceProfile: {
      Name: ctx.iamInstanceProfile,
    },
    ImageId: awsHelpers.getAmiId(ctx.defaults.region),
    InstanceType: 't2.micro',
    KeyName: ctx.defaults.regionalKeyPair,
    MaxCount: 1,
    MinCount: 1,
    Placement: {
      AvailabilityZone: ctx.defaults.region + awsHelpers.getRegionSubnet(ctx.defaults.region),
    },
    PrivateIpAddress: '172.31.0.5',
    SecurityGroupIds: [
      ctx.defaults.mesosSlave.securityGroup,
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
      task.skip('Mesos Slave node already launched')
    } else {
      throw err
    }
  })

  return response
}

module.exports.createSecurityGroup = createSecurityGroup
module.exports.authorizeSSHSecurityGroupIngress = authorizeSSHSecurityGroupIngress
module.exports.authorizeMainSecurityGroupIngress = authorizeMainSecurityGroupIngress
module.exports.authorizeExtraSecurityGroupIngress = authorizeExtraSecurityGroupIngress
module.exports.authorizeResourceSecurityGroupIngress = authorizeResourceSecurityGroupIngress
module.exports.bootstrap = bootstrap
