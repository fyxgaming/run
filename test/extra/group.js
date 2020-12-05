/**
 * group.js
 *
 * Tests for lib/extra/group.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const bsv = require('bsv')
const { PrivateKey, Script } = bsv
const Run = require('../env/run')
const { COVER } = require('../env/config')
const { getExtrasBlockchain } = require('../env/misc')
const { Jig } = Run
const { Group } = Run.extra
const { LocalCache } = Run.plugins

// ------------------------------------------------------------------------------------------------
// Group
// ------------------------------------------------------------------------------------------------

describe('Group', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------

  function testScript (m, n) {
    const pubkeys = []
    for (let i = 0; i < n; i++) pubkeys.push(new PrivateKey().publicKey.toString())
    const lock = new Group(pubkeys, m)
    const script = lock.script()
    const asm = Script.fromHex(script).toASM()
    expect(lock.domain()).to.equal(1 + 74 * m)
    expect(asm).to.equal(`OP_${m} ${pubkeys.join(' ')} OP_${n} OP_CHECKMULTISIG`)
  }

  // --------------------------------------------------------------------------

  it('generate script 1-1', () => testScript(1, 1))
  it('generate script 3-5', () => testScript(3, 5))
  it('generate script 16-16', () => testScript(16, 16))

  // --------------------------------------------------------------------------

  it('default required to all pubkeys length', () => {
    const pubkeys = [new PrivateKey().publicKey.toString(), new PrivateKey().publicKey.toString()]
    expect(new Group(pubkeys).required).to.equal(2)
  })

  // --------------------------------------------------------------------------

  it('add', async () => {
    const pubkeys = [new PrivateKey().publicKey.toString()]
    const group = new Group(pubkeys)
    group.add(new PrivateKey().publicKey.toString())
    expect(group.pubkeys.length).to.equal(2)
  })

  // --------------------------------------------------------------------------

  it('does not add twice', async () => {
    const pubkeys = [new PrivateKey().publicKey.toString()]
    const group = new Group(pubkeys)
    const pubkey = new PrivateKey().publicKey.toString()
    group.add(pubkey)
    group.add(pubkey)
    expect(group.pubkeys.length).to.equal(2)
  })

  // --------------------------------------------------------------------------

  it('throws if pubkeys is not non-empty array', () => {
    expect(() => new Group(null, 1).script()).to.throw('pubkeys not an array')
    expect(() => new Group({}, 1).script()).to.throw('pubkeys not an array')
    expect(() => new Group([], 1).script()).to.throw('pubkeys must have at least one entry')
  })

  // --------------------------------------------------------------------------

  it('throws if more than 16 pubkeys', () => {
    const pubkeys = []
    for (let i = 0; i < 17; i++) {
      pubkeys.push(new PrivateKey().publicKey.toString())
    }
    expect(() => new Group(pubkeys, 1).script()).to.throw('No more than 16 pubkeys allowed')
  })

  // --------------------------------------------------------------------------

  it('throws if duplicate pubkeys', () => {
    const pubkeys = [new PrivateKey().publicKey.toString()]
    pubkeys.push(pubkeys[0])
    expect(() => new Group(pubkeys, 1).script()).to.throw('pubkeys contains duplicates')
  })

  // --------------------------------------------------------------------------

  it('throws if pubkeys are not valid hex strings', () => {
    expect(() => new Group(['a'], 1).script()).to.throw('Bad hex')
    expect(() => new Group(['**'], 1).script()).to.throw('Bad hex')
    expect(() => new Group([123], 1).script()).to.throw('Bad hex')
    expect(() => new Group([null], 1).script()).to.throw('Bad hex')
  })

  // --------------------------------------------------------------------------

  it('throws if required is out of range', () => {
    const pubkeys = [new PrivateKey().publicKey.toString()]
    expect(() => new Group(pubkeys, 0).script()).to.throw('required must be a non-negative integer')
    expect(() => new Group(pubkeys, -1).script()).to.throw('required must be a non-negative integer')
    expect(() => new Group(pubkeys, 1.5).script()).to.throw('required must be a non-negative integer')
    expect(() => new Group(pubkeys, '1').script()).to.throw('required must be a non-negative integer')
    expect(() => new Group(pubkeys, null).script()).to.throw('required must be a non-negative integer')
    expect(() => new Group(pubkeys, 2).script()).to.throw('required must be <= the number of pubkeys')
  })

  // --------------------------------------------------------------------------

  it('assign as jig owner', async () => {
    const run = new Run({ blockchain: await getExtrasBlockchain() })
    class A extends Jig { init (owner) { this.owner = owner } }
    const group = new Group([run.owner.pubkey])
    const a = new A(group)
    await a.sync()
    function test (a) { expect(a.owner instanceof Group).to.equal(true) }
    test(a)
    if (!COVER) {
      const a2 = await run.load(a.location)
      test(a2)
      run.cache = new LocalCache()
      const a3 = await run.load(a.location)
      test(a3)
    }
  })

  // ------------------------------------------------------------------------

  it.skip('deploy', async () => {
    // Hint: Run with env NETWORK=<network> to deploy with keys
    const run = new Run()
    run.deploy(Run.extra.Group)
    await run.sync()
    console.log(Run.extra.Group)
  })

  it.only('unseal', async () => {
    const run = new Run()
    run.deploy(Run.extra.Group)
    await run.sync()
    const { asm, Hex } = Run.extra

    class Group {
      constructor (pubkeys, required) {
        this.pubkeys = pubkeys
        this.required = typeof required === 'undefined' ? this.pubkeys.length : required
      }

      script () {
        // Check pubkeys
        if (!Array.isArray(this.pubkeys)) throw new Error('pubkeys not an array')
        if (this.pubkeys.length < 1) throw new Error('pubkeys must have at least one entry')
        if (this.pubkeys.length > 16) throw new Error('No more than 16 pubkeys allowed')
        const set = new Set()
        for (const pubkey of this.pubkeys) set.add(pubkey)
        if (set.size !== this.pubkeys.length) throw new Error('pubkeys contains duplicates')
        this.pubkeys.forEach(pubkey => Hex.stringToBytes(pubkey))

        // Check m
        const badRequired = typeof this.required !== 'number' || !Number.isInteger(this.required) || this.required < 1
        if (badRequired) throw new Error('required must be a non-negative integer')
        if (this.required > this.pubkeys.length) throw new Error('required must be <= the number of pubkeys')

        // Create script
        // ie. OP_2 <pk1> <pk2> <pk3> OP_3 OP_CHECKMULTISIG
        return asm(`OP_${this.required} ${this.pubkeys.join(' ')} OP_${this.pubkeys.length} OP_CHECKMULTISIG`)
      }

      domain () {
        return 1 + this.required * 74 // 1 (OP_0) + (1 + 73) * nsigs
      }

      add (pubkey) {
        if (!this.pubkeys.includes(pubkey)) {
          this.pubkeys.push(pubkey)
        }
      }
    }

    Group.deps = { asm, Hex }

    Group.toString()

    Run.extra.Group.upgrade(Group)
    await run.sync()
    console.log(Run.extra.Group)
  })

  it.skip('test', async () => {
    const run = new Run()
    run.deploy(Group)
    await run.sync()
    class A extends Group {
      constructor (pubkey) {
        super([pubkey], 2)
      }
    }
    A.deps = { Group }
    const CA = run.deploy(A)
    await run.sync()
    console.log(CA)
  })
})

// ------------------------------------------------------------------------------------------------
