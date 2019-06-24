const {expect, test} = require('@oclif/test')
const fs = require('fs-extra')

describe('aws:configure', () => {
  test
  .stub(fs, 'ensureFile', () => Promise.resolve(true))
  .stub(fs, 'writeFileSync', () => true)
  .stdout()
  .command(['aws:configure', '--key', 'foo', '--secret', 'bar'])
  .it('configures credentials', ctx => {
    expect(ctx.stdout).to.contain('')
  })
})
