const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../../env/run')
const { Jig } = Run

describe('recreateJigsFromStates', () => {
  it('basic class and instance', async () => {
    const run = new Run()
    class A extends Jig { }
    const CA = run.deploy(A)
    await run.sync()
    const json = Run.functions.encodeJigJson(Object.assign({}, CA), x => '123')
    expect(Object.keys(json)).to.deep.equal(['deps', 'location', 'nonce', 'origin', 'owner', 'satoshis'])
    expect(json.deps.Jig.$jig).to.equal('123')
  })
})
