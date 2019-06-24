const awsHelpers = require('../aws-helpers')

const terminateInstances = (ctx, _) => {
  const response = awsHelpers.terminateInstances(ctx.ec2, ctx.defaults.tag.name, ctx.defaults.tag.value).catch(err => {
    throw err
  })

  return response
}

module.exports.terminateInstances = terminateInstances
