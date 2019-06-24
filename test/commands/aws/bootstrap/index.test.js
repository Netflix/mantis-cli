const {expect, test} = require('@oclif/test')
const fs = require('fs-extra')

describe.skip('aws:bootstrap', () => {
  test
  .stub(fs, 'readFileSync', () => true)
  .stdout()
  .command([
    'aws:bootstrap',
    '--security-group', 'group',
    '--key-name', 'key',
    '--region', 'region',
    '--user-data', 'file://user-data',
  ])
  .it('bootstraps a mantis cluster', ctx => {
    expect(ctx.stdout).to.contain('')
  })
})
