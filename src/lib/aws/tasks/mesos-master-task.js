const awsHelpers = require('../aws-helpers')
const fs = require('fs-extra')
const retry = require('async-retry')

const privateIp = '172.31.0.6'

const createSecurityGroup = (ctx, task) => {
  const response = awsHelpers.createSecurityGroups(ctx.ec2, ctx.defaults.mesosMaster.securityGroup).catch(err => {
    if (err.code === 'InvalidGroup.Duplicate') {
      task.skip(`Security group already exists (${ctx.defaults.mesosMaster.securityGroup})`)
    } else {
      throw err
    }
  })

  return response
}

const authorizeSSHSecurityGroupIngress = (ctx, task) => {
  const response = awsHelpers.authorizeSecurityGroupIngress(ctx.ec2, ctx.defaults.mesosMaster.securityGroup, 22, 22).catch(err => {
    if (err.code === 'InvalidPermission.Duplicate') {
      task.skip('Ingress rule already exists')
    } else {
      throw err
    }
  })

  return response
}

const authorizeMesosSecurityGroupIngress = (ctx, task) => {
  const response = awsHelpers.authorizeSecurityGroupIngress(ctx.ec2, ctx.defaults.mesosMaster.securityGroup, 80, 65535).catch(err => {
    if (err.code === 'InvalidPermission.Duplicate') {
      task.skip('Ingress rule already exists')
    } else {
      throw err
    }
  })

  return response
}

const bootstrap = async (ctx, task) => {
  const userData = fs.readFileSync(ctx.defaults.mesosMaster.cloudInitTemplate).toString('base64')
  const params = {
    ImageId: awsHelpers.getAmiId(ctx.defaults.region),
    InstanceType: 't2.micro',
    KeyName: ctx.defaults.regionalKeyPair,
    MaxCount: 1,
    MinCount: 1,
    Placement: {
      AvailabilityZone: ctx.defaults.region + awsHelpers.getRegionSubnet(ctx.defaults.region),
    },
    PrivateIpAddress: privateIp,
    SecurityGroupIds: [
      ctx.defaults.mesosMaster.securityGroup,
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

  const runResponse = ctx.ec2.runInstances(params).promise().catch(err => {
    if (err.code === 'InvalidIPAddress.InUse') {
      task.skip('Mesos Master node already launched')
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

    ctx.mesosMasterPublicDnsName = `${publicDnsName}:5050`
  }, {retries: 5})

  return runResponse
}

module.exports.createSecurityGroup = createSecurityGroup
module.exports.authorizeSSHSecurityGroupIngress = authorizeSSHSecurityGroupIngress
module.exports.authorizeMesosSecurityGroupIngress = authorizeMesosSecurityGroupIngress
module.exports.bootstrap = bootstrap
