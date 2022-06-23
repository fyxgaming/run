const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../../env/run')
const { Jig, Code } = Run

describe('recreateJigsFromStates', () => {
  it('basic class and instance', async () => {
    const run = new Run()
    class A extends Jig { }
    run.deploy(A)
    const a = new A()
    await run.sync()
    const classState = await run.cache.get(`jig://${A.location}`)
    const instanceState = await run.cache.get(`jig://${a.location}`)
    const states = {
      [`jig://${A.location}`]: classState,
      [`jig://${a.location}`]: instanceState
    }
    const jigs = Run.util.recreateJigsFromStates(states)
    expect(jigs[A.location] instanceof Code).to.equal(true)
    expect(jigs[a.location] instanceof Jig).to.equal(true)
    expect(jigs[a.location] instanceof jigs[A.location]).to.equal(true)
  })

  it('recreate extras', () => {
    Run.util.recreateJigsFromStates(require('../../../lib/extra/states-mainnet'))
    Run.util.recreateJigsFromStates(require('../../../lib/extra/states-testnet'))
  })

  it('recreate instance', () => {
    const states = { 'jig://d281ccb8887f1aaeb713432a2d4d8ecaeaa883e378d2fc8246c5089c182d77df_o1': { cls: { $jig: '5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o2' }, kind: 'jig', props: { damage: 9001, location: '_o1', nonce: 3, origin: 'aaf54705511588df5767f313edc5830d81e4a3c6f2df83af9f240579ad9a76a4_o1', owner: '14aJe8iM3HopTwa44Ed5ZQq2UxdDvrEMXo', satoshis: 0, type: 'Axe', upgrades: ['Steel', 'Wrap'] }, version: '04' }, 'jig://5b399a7a29442ed99ba43c1679be0f6c66c7bb7981a41c94484bdac416a12e74_o2': { kind: 'code', props: { deps: { Jig: { $jig: 'native://Jig' } }, location: '_o2', metadata: { emoji: '🗡️' }, nonce: 1, origin: '_o2', owner: '14aJe8iM3HopTwa44Ed5ZQq2UxdDvrEMXo', satoshis: 0 }, src: 'class Weapon extends Jig {\n    init(type, damage) {\n        this.type = type\n        this.damage = damage\n        this.upgrades = []\n    }\n\n    upgrade(upgrade, damageBonus) {\n        this.upgrades.push(upgrade)\n        this.damage += damageBonus\n    }\n}', version: '04' } }
    const jigs = Run.util.recreateJigsFromStates(states)
    expect(jigs.d281ccb8887f1aaeb713432a2d4d8ecaeaa883e378d2fc8246c5089c182d77df_o1 instanceof Jig).to.equal(true)
  })

  it('does not recreate if missing dependency', async () => {
    const run = new Run()
    class A extends Jig { }
    run.deploy(A)
    const a = new A()
    await run.sync()
    const instanceState = await run.cache.get(`jig://${a.location}`)
    const states = {
      [`jig://${a.location}`]: instanceState
    }
    expect(() => Run.util.recreateJigsFromStates(states)).to.throw(`Missing ref: ${A.location}`)
  })
})
