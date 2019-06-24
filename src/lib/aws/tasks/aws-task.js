const fs = require('fs-extra')
const os = require('os')

const createKeyPair = (ctx, task) => {
  const params = {
    KeyName: ctx.defaults.keyPair,
  }

  const file = os.homedir().concat('/', `.aws/${ctx.defaults.keyPair}.pem`)
  let response = null

  if (fs.pathExistsSync(file)) {
    task.skip(`Key-pair file already exists (${ctx.defaults.keyPair})`)
  } else {
    response = ctx.ec2.createKeyPair(params).promise().then(data => {
      fs.ensureFileSync(file)
      fs.writeFileSync(file, data.KeyMaterial)
      fs.chmodSync(file, '400')
    }).catch(err => {
      if (err.code === 'InvalidKeyPair.Duplicate') {
        task.skip(`Key-pair already exists on AWS (${ctx.defaults.keyPair})`)
      } else {
        throw err
      }
    })
  }

  return response
}

const createDefaultVPC = (ctx, task) => {
  const params = {}

  ctx.ec2.createDefaultVpc(params).promise().catch(err => {
    if (err.code === 'DefaultVpcAlreadyExists') {
      task.skip('Default VPC already exists')
    } else {
      throw err
    }
  })
}

module.exports.createKeyPair = createKeyPair
module.exports.createDefaultVPC = createDefaultVPC
