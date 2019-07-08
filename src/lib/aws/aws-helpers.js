const fs = require('fs')
const os = require('os')

/**
 * Absolute path of AWS credentials. Use the default location defined
 * and stored by the aws-cli at `$HOME/.aws/credentials`.
 */
const credentialsFile = os.homedir().concat('/', '.aws/credentials')

/**
 * Creates an AWS security group for the default VPC.
 *
 * @param {Object} ec2 - ec2 client object
 * @param {string} groupName - AWS-compatible security group name
 */
async function createSecurityGroups(ec2, groupName) {
  const vpcParams = {
    Filters: [
      {Name: 'isDefault', Values: ['true']},
    ],
  }

  const vpcs = await ec2.describeVpcs(vpcParams).promise()
  const vpcId = vpcs.Vpcs[0].VpcId

  const securityGroupParams = {
    VpcId: vpcId,
    GroupName: groupName,
    Description: groupName,
  }

  return ec2.createSecurityGroup(securityGroupParams).promise()
}

/**
 * Adds ingress rules to a security group.
 *
 * @param {AWS.EC2} ec2 - ec2 client object
 * @param {string} groupName - AWS-compatible security group name
 * @param {number} fromPort - lower-bound port range
 * @param {number} toPort - uppor-bound port range
 */
async function authorizeSecurityGroupIngress(ec2, groupName, fromPort, toPort) {
  const params = {
    GroupName: groupName,
    IpProtocol: 'tcp',
    FromPort: fromPort,
    ToPort: toPort,
    CidrIp: '0.0.0.0/0',
  }

  return ec2.authorizeSecurityGroupIngress(params).promise()
}

/**
 * Creates an IAM role with a specified name. The role will
 * assume STS credentials for any EC2 instance.
 *
 * @param {AWS.IAM} iam - iam client object
 * @param {string} name - iam role name
 */
async function createIamRole(iam, name) {
  const role = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'ec2.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
      },
    ],
  }

  const params = {
    AssumeRolePolicyDocument: JSON.stringify(role),
    Path: '/',
    RoleName: name,
  }

  return iam.createRole(params).promise()
}

/**
 * Uses the AWS-provided managed S3ReadOnlyAccess policy and attaches
 * it to the specified role name.
 *
 * @param {AWS.IAM} iam - iam client object
 * @param {string} name - role name
 * @param {string} policy - ARN of policy
 */
async function attachPolicy(iam, name, policy) {
  const params = {
    PolicyArn: policy,
    RoleName: name,
  }

  return iam.attachRolePolicy(params).promise()
}

/**
 * Creates an instance profile with the specified name. This API call
 * doesn't do anything useful--it only creates an instance profile.
 * The caller will have to add roles (previously created ones) to
 * the instance profile individually.
 *
 * @param {AWS.IAM} iam - iam client object
 * @param {string} name - instance profile name
 */
async function createIamInstanceProfile(iam, name) {
  const params = {
    InstanceProfileName: name,
  }

  return iam.createInstanceProfile(params).promise()
}

/**
 * Adds an IAM role to an instance profile. The IAM role needs to
 * to preexist.
 *
 * @param {AWS.IAM} iam - iam client object
 * @param {string} name - instance profile name
 * @param {string} role - role name to add
 */
async function addIamRoleToInstanceProfile(iam, name, role) {
  const params = {
    InstanceProfileName: name,
    RoleName: role,
  }

  return iam.addRoleToInstanceProfile(params).promise()
}

/**
 * Terminates the specified instances.
 *
 * @param {AWS.EC2} ec2 - ec2 client object
 * @param {string[]} instanceIds - ids of running aws instances
 */
async function terminateInstances(ec2, tagKey, tagValue) {
  const describeParams = {
    Filters: [
      {
        Name: 'tag:' + tagKey,
        Values: [
          tagValue,
        ],
      },
    ],
  }
  const instances = await ec2.describeInstances(describeParams).promise()
  const instanceIds = instances.Reservations.flatMap(r => {
    return r.Instances.map(i => i.InstanceId)
  })

  if (instanceIds.length === 0) {
    return
  }

  const params = {
    InstanceIds: instanceIds,
  }

  return ec2.terminateInstances(params).promise()
}

/**
 * Deletes a security group.
 *
 * @param {AWS.EC2} ec2 - ec2 client object
 * @param {string} groupId - id of security group
 */
async function deleteSecurityGroup(ec2, groupId) {
  const params = {
    GroupId: groupId,
  }

  return ec2.deleteSecurityGroup(params).promise()
}

/**
 * Synchronous API to check if AWS credentials exist locally.
 */
function credentialsExist() {
  return fs.existsSync(credentialsFile)
}

/**
 * Returns an EC2 AMI ID for the region.
 */
function getAmiId(region) {
  if (region === 'us-east-1') {
    return 'ami-759bc50a'
  } else if (region === 'us-east-2') {
    return 'ami-5e8bb23b'
  } else if (region === 'us-west-2') {
    return 'ami-ba602bc2'
  }
}

/**
 * Returns the subnet matching range 172.31.0.0/20 with 4091 internal IPs.
 * Subnet naming semantics are not necessarily the same across regions.
 */
function getRegionSubnet(region) {
  if (region === 'us-east-1') {
    return 'd'
  } else if (region === 'us-east-2') {
    return 'a'
  } else if (region === 'us-west-2') {
    return 'c'
  }
}

module.exports.createSecurityGroups = createSecurityGroups
module.exports.authorizeSecurityGroupIngress = authorizeSecurityGroupIngress
module.exports.createIamRole = createIamRole
module.exports.attachPolicy = attachPolicy
module.exports.createIamInstanceProfile = createIamInstanceProfile
module.exports.addIamRoleToInstanceProfile = addIamRoleToInstanceProfile
module.exports.terminateInstances = terminateInstances
module.exports.deleteSecurityGroup = deleteSecurityGroup
module.exports.credentialsFile = credentialsFile
module.exports.credentialsExist = credentialsExist
module.exports.getAmiId = getAmiId
module.exports.getRegionSubnet = getRegionSubnet
