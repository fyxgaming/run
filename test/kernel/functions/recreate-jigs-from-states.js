const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../../env/run')
const { Jig, Code } = Run

describe('recreateJigsFromStates', () => {
  it('test', async () => {
    const run = new Run()
    class A extends Jig { }
    run.deploy(A)
    const a = new A()
    await run.sync()
    const classState = await run.cache.get(`jig://${A.location}`)
    const instanceState = await run.cache.get(`jig://${a.location}`)
    const states = {
      [A.location]: classState,
      [a.location]: instanceState
    }
    const jigs = Run.util.recreateJigsFromStates(states)
    expect(jigs[A.location] instanceof Code).to.equal(true)
    expect(jigs[a.location] instanceof Jig).to.equal(true)
    expect(jigs[a.location] instanceof jigs[A.location]).to.equal(true)
  })
})
