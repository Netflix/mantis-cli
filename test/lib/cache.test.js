const {expect, test} = require('@oclif/test')
const fs = require('fs-extra')
const cache = require('../../src/lib/cache')

describe('loadDefaults', () => {
  test
  .stub(fs, 'readFileSync', () => '{"foo": "bar"}')
  .stub(fs, 'ensureFileSync', () => true)
  .stub(fs, 'writeFileSync', () => true)
  .it('loads an existing set of defaults', () => {
    let defaults = cache.loadDefaults('.')
    expect(defaults).to.not.be.empty
    expect(defaults.foo).to.equal('bar')
  })

  test
  .stub(fs, 'readFileSync', () => Buffer.from(''))
  .stub(fs, 'ensureFileSync', () => true)
  .stub(fs, 'writeFileSync', () => true)
  .it('returns an empty set of defaults', () => {
    let defaults = cache.loadDefaults('.')
    expect(defaults).to.be.empty
  })
})
