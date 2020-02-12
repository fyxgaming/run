const { describe, it } = require('mocha')
const { Run } = require('./helpers')

describe('test', () => {
  it('test', async () => {
    const run = new Run()
    const j = await run.load('d17541f0cc218fcfb726e980b579a6c07f337c74d9988683dde2c8f89628c67f_o2')
    console.log(j)
  })
})
