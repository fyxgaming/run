/**
 * code.js
 *
 * Tests for lib/kernel/code.js and lib/kernel/repository.js
 */

const { describe, it } = require('mocha')
const { stub } = require('sinon')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { Transaction, PrivateKey } = require('bsv')
const Run = require('../env/run')
const { Code, Jig, Berry, sandbox } = Run
const unmangle = require('../env/unmangle')
const SI = unmangle(sandbox)._intrinsics
const Membrane = unmangle(unmangle(Run)._Membrane)
const { payFor } = require('../env/misc')

const randomLocation = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + '_o0'
const randomOwner = () => new PrivateKey().toAddress().toString()

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
  describe('deploy', () => {
    it.only('creates from class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(CA.toString()).to.equal(A.toString())
    })

    it('creates from function', () => {
      const run = new Run()
      function f () { }
      const f2 = run.deploy(f)
      expect(f2.toString()).to.equal(f.toString())
    })

    it('returns instanceof Code', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(A instanceof Code).to.equal(false)
      expect(CA instanceof Code).to.equal(true)
      function f () { }
      const f2 = run.deploy(f)
      expect(f instanceof Code).to.equal(false)
      expect(f2 instanceof Code).to.equal(true)
    })

    it('adds invisible Code functions', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(typeof CA.upgrade).to.equal('function')
      expect(typeof CA.sync).to.equal('function')
      expect(typeof CA.destroy).to.equal('function')
      expect(Object.getOwnPropertyNames(CA).includes('upgrade')).to.equal(false)
      expect(Object.getOwnPropertyNames(CA).includes('sync')).to.equal(false)
      expect(Object.getOwnPropertyNames(CA).includes('destroy')).to.equal(false)
    })

    it('creates local code only once', () => {
      const run = new Run()
      class A { }
      const CA1 = run.deploy(A)
      const CA2 = run.deploy(A)
      expect(CA1).to.equal(CA2)
    })

    it('throws if not a function', () => {
      const run = new Run()
      expect(() => run.deploy()).to.throw('Cannot install')
      expect(() => run.deploy(0)).to.throw('Cannot install')
      expect(() => run.deploy({})).to.throw('Cannot install')
      expect(() => run.deploy('class A {}')).to.throw('Cannot install')
      expect(() => run.deploy(null)).to.throw('Cannot install')
    })

    it('throw if anonymous', () => {
      const run = new Run()
      expect(() => run.deploy(() => {})).to.throw('Cannot install')
      expect(() => run.deploy(class {})).to.throw('Cannot install')
    })

    it('throws if built-in', () => {
      const run = new Run()
      expect(() => run.deploy(Object)).to.throw('Cannot install Object')
      expect(() => run.deploy(Date)).to.throw('Cannot install Date')
      expect(() => run.deploy(Uint8Array)).to.throw('Cannot install')
      expect(() => run.deploy(Math.sin)).to.throw('Cannot install sin')
      expect(() => run.deploy(parseInt)).to.throw('Cannot install parseInt')
      expect(() => run.deploy(SI.Object)).to.throw('Cannot install Object')
    })

    it('throws if prototype inheritance', () => {
      const run = new Run()
      function A () { }
      function B () { }
      B.prototype = Object.create(A.prototype)
      expect(() => run.deploy(B)).to.throw('Cannot install B')
    })

    it('throws if contains reserved words', () => {
      const run = new Run()
      class A { }
      A.toString = () => 'hello'
      expect(() => run.deploy(A)).to.throw('Cannot install A')
      class B { }
      B.upgrade = 1
      expect(() => run.deploy(B)).to.throw('Cannot install B')
      class C { static sync () { }}
      expect(() => run.deploy(C)).to.throw('Cannot install C')
      class D { static get destroy () { } }
      expect(() => run.deploy(D)).to.throw('Cannot install D')
    })

    it('throws if contains bindings', () => {
      const run = new Run()
      class A { }
      A.location = randomLocation()
      A.origin = randomLocation()
      A.owner = randomOwner()
      A.satoshis = 0
      A.nonce = 1
      expect(() => run.deploy(A)).to.throw('Cannot install A')
    })

    it('installs parents', () => {
      const run = new Run()
      class A { }
      class B extends A { }
      class C extends B { }
      const CC = run.deploy(C)
      const CB = run.deploy(B)
      const CA = run.deploy(A)
      expect(Object.getPrototypeOf(CC)).to.equal(CB)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)
    })

    it('throws if error creating dependency', () => {
      const run = new Run()
      class A { }
      A.Date = Date
      expect(() => run.deploy(A)).to.throw('Cannot install Date')
    })

    it('creates code for props', () => {
      const run = new Run()
      class A { }
      class B { }
      A.B = B
      const CA = run.deploy(A)
      expect(CA.B).to.equal(run.deploy(B))
    })

    it('installs circular prop code', () => {
      const run = new Run()
      class A { }
      class B { }
      A.B = B
      B.A = A
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(CA.B).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

    it('installs circular parent-child code', () => {
      const run = new Run()
      class B { }
      class A extends B { }
      B.A = A
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

    it('installs parent that is code jig', () => {
      const run = new Run()
      class B { }
      const CB = run.deploy(B)
      class A extends CB { }
      const CA = run.deploy(A)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
    })

    it('sets initial bindings', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(() => CA.location).to.throw('Cannot read location: undetermined')
      expect(() => CA.origin).to.throw('Cannot read origin: undetermined')
      expect(() => CA.nonce).to.throw('Cannot read nonce: undetermined')
      expect(() => CA.owner).to.throw('Cannot read owner: unbound')
      expect(() => CA.satoshis).to.throw('Cannot read satoshis: unbound')
      Membrane._sudo(() => {
        expect(CA.location.startsWith('record://')).to.equal(true)
        expect(CA.origin.startsWith('record://')).to.equal(true)
        expect(CA.nonce).to.equal(0)
        expect(unmangle(CA.owner)._value).to.equal(undefined)
        expect(unmangle(CA.satoshis)._value).to.equal(undefined)
      })
    })

    it('cannot reference Code directly', () => {
      const run = new Run()
      class A extends Code { }
      expect(() => run.deploy(A)).to.throw()
      class B {}
      B.Code = Code
      expect(() => run.deploy(B)).to.throw()
    })

    it('deploys parent and child', async () => {
      const run = new Run()
      class A {}
      class B extends A {}
      run.deploy(B)
      await run.sync()
      expect(A.location.endsWith('_o1'))
      expect(B.location.endsWith('_o2'))
    })

    it.skip('deploys with custom lock', async () => {
      const run = new Run()
      class L {
        script () { return new Uint8Array() }
        domain () { return 0 }
      }
      class A {
        static send (to) { this.owner = to }
      }
      A.send = () => { throw new Error('Must call methods on jigs') }
      const CA = run.deploy(A)
      run.deploy(CA)
      await run.sync()
      CA.send(new L())
      await CA.sync()
      expect(A.location.startsWith('record://'))
    })
  })

  describe('deps', () => {
    it('makes deps globals', () => {
      const run = new Run()
      class A { }
      function f () { return A }
      f.deps = { A }
      const sf = run.deploy(f)
      expect(sf()).to.equal(run.deploy(A))
    })

    it('supports normal javascript values as deps', () => {
      const run = new Run()
      class A {
        static n () { return n } // eslint-disable-line
        static o () { return o } // eslint-disable-line
      }
      A.deps = { n: 1, o: { a: [] } }
      const CA = run.deploy(A)
      expect(CA.n()).to.equal(1)
      expect(CA.o()).not.to.equal(A.deps.o)
      expect(CA.o()).to.deep.equal(A.deps.o)
      expect(CA.o() instanceof SI.Object).to.equal(true)
      expect(CA.o().a instanceof SI.Array).to.equal(true)
    })

    it('sets deps on returned code jig', () => {
      const run = new Run()
      class A { }
      class B { }
      A.deps = { B }
      const CA = run.deploy(A)
      expect(CA.deps.B).to.equal(run.deploy(B))
    })

    it('throws if deps invalid', () => {
      const run = new Run()
      class A { }
      A.deps = null
      expect(() => run.deploy(A)).to.throw('Cannot install A')
      A.deps = '123'
      expect(() => run.deploy(A)).to.throw('Cannot install A')
      A.deps = []
      expect(() => run.deploy(A)).to.throw('Cannot install A')
      A.deps = new class Deps {}()
      expect(() => run.deploy(A)).to.throw('Cannot install A')
    })

    it('doesnt install parent deps on child', () => {
      const run = new Run()
      class B { f () { return n } } // eslint-disable-line
      class A extends B { g () { return n } } // eslint-disable-line
      B.deps = { n: 1 }
      const CB = run.deploy(B)
      const b = new CB()
      expect(b.f()).to.equal(1)
      const CA = run.deploy(A)
      const a = new CA()
      expect(() => a.g()).to.throw()
    })
  })

  describe('presets', () => {
    it('uses blockchain presets', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      const CA = run.deploy(A)
      expect(CA.location).to.equal(A.presets[network].location)
      expect(CA.origin).to.equal(A.presets[network].origin)
      expect(CA.nonce).to.equal(A.presets[network].nonce)
      expect(CA.owner).to.equal(A.presets[network].owner)
      expect(CA.satoshis).to.equal(A.presets[network].satoshis)
      expect(typeof CA.presets).to.equal('undefined')
    })

    it('clones javascript objects for sandbox', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { a: [], s: new Set() } }
      const CA = run.deploy(A)
      expect(CA.a).not.to.equal(A.presets[network].a)
      expect(CA.s).not.to.equal(A.presets[network].s)
      expect(CA.a instanceof SI.Array).to.equal(true)
      expect(CA.s instanceof SI.Set).to.equal(true)
    })

    it.skip('copies jigs', async () => {
      const run = new Run()
      const network = run.blockchain.network
      class J extends Jig { }
      const j = new J()
      class B extends Berry { static pluck () { return new B() } }
      const b = await run.load('', B)
      class C {}
      class A { }
      A.presets = { [network]: { b, j, C } }
      const CA = run.deploy(A)
      expect(CA.b).to.equal(b)
      expect(CA.j).to.equal(j)
      expect(CA.C).not.to.equal(C)
      expect(CA.C.toString()).to.equal(C.toString())
      expect(CA.C).to.equal(run.deploy(C))
    })

    it('does not add presets to code jig', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      const CA = run.deploy(A)
      expect(CA.presets).to.equal(undefined)
    })

    it('returns different code for a copy with same presets', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      class B { }
      Object.assign(B, A)
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(CA).not.to.equal(CB)
    })

    it('installs separate presets for parent and child', () => {
      const run = new Run()
      const network = run.blockchain.network
      class B { }
      B.presets = { [network]: { n: 1, m: 0 } }
      class A extends B { }
      A.presets = { [network]: { n: 2 } }
      const CB = run.deploy(B)
      const CA = run.deploy(A)
      expect(CB.n).to.equal(1)
      expect(CB.m).to.equal(0)
      expect(CA.n).to.equal(2)
      expect(CA.m).to.equal(0)
      expect(Object.getOwnPropertyNames(CA).includes('n')).to.equal(true)
      expect(Object.getOwnPropertyNames(CA).includes('m')).to.equal(false)
    })

    it('throws if parent dependency mismatch', () => {
      const run = new Run()
      class A { }
      class C { }
      class B extends A { }
      B.deps = { A: C }
      expect(() => run.deploy(B)).to.throw('Parent dependency mismatch')
    })

    it('throws if presets are invalid', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = null
      expect(() => run.deploy(A)).to.throw('Cannot install A')
      A.presets = { [network]: null }
      expect(() => run.deploy(A)).to.throw('Cannot install A')
      A.presets = {
        [network]: {
          location: '_o1',
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      expect(() => run.deploy(A)).to.throw('Cannot install A')
      A.presets = {
        [network]: {
          location: '_o1',
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      expect(() => run.deploy(A)).to.throw()
      A.presets = {
        [network]: {
          location: randomLocation(),
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        },
        test: null
      }
      expect(() => run.deploy(A)).to.throw()
      delete A.presets.test
      A.presets[network].nonce = -1
      expect(() => run.deploy(A)).to.throw()
      A.presets[network].nonce = null
      expect(() => run.deploy(A)).to.throw()
      A.presets = []
      expect(() => run.deploy(A)).to.throw()
      A.presets = { [network]: new class Presets {}() }
      expect(() => run.deploy(A)).to.throw()
    })

    it('throws if presets are incomplete', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      const npresets = {
        location: '_o1',
        origin: randomLocation(),
        owner: randomOwner(),
        satoshis: 0
      }
      for (const key of Object.keys(npresets)) {
        A.presets = { [network]: Object.assign({}, npresets) }
        delete A.presets[network][key]
        expect(() => run.deploy(A)).to.throw('Cannot install A')
      }
    })

    it('throws if presets contains reserved properties', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { deps: {} } }
      expect(() => run.deploy(A)).to.throw()
      A.presets = { [network]: { presets: {} } }
      expect(() => run.deploy(A)).to.throw()
      A.presets = { [network]: { upgrade: () => {} } }
      expect(() => run.deploy(A)).to.throw()
    })
  })

  describe('sealed', () => {
    it.skip('sealed by default', () => {
      const run = new Run()
      class A { }
      A.options = { utility: true }
      const CA = run.deploy(A)
      CA.deploy()
      class C extends A { }
      const CC = run.deploy(C)
      CC.deploy()
      // TODO: Parent approval
    })

    it('allows unsealing', async () => {
      const run = new Run()
      class A { }
      A.sealed = false
      class B extends A { }
      const CA = run.deploy(A)
      await run.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.deploy(B)
      await CA.sync()
      expect(CA.origin).to.equal(CA.location)
    })

    it('throws if invalid', () => {
      const run = new Run()
      class A { }
      A.sealed = null
      expect(() => run.deploy(A)).to.throw('Invalid sealed option: null')
      A.sealed = 1
      expect(() => run.deploy(A)).to.throw('Invalid sealed option: 1')
    })
  })

  describe('prototype', () => {
    it('sets prototype constructor to Code', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(CA.prototype.constructor).to.equal(CA)
    })
  })

  describe('name', () => {
    it('returns class or function name', () => {
      const run = new Run()
      class A { }
      expect(run.deploy(A).name).to.equal('A')
      function f () { }
      expect(run.deploy(f).name).to.equal('f')
    })
  })

  describe('toString', () => {
    it('returns same string as original code', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(CA.toString()).to.equal(A.toString())
      expect(A.toString().replace(/\s/g, '')).to.equal('classA{}')
    })

    it('returns same code as original code when there is a parent', () => {
      const run = new Run()
      class B { }
      const CB = run.deploy(B)
      class A extends CB { }
      const CA = run.deploy(A)
      expect(CA.toString().replace(/\s/g, '')).to.equal('classAextendsB{}')
    })
  })

  describe('get', () => {
  })

  describe('methods', () => {
    // Code functions are not available inside functions
  })

  describe('sync', () => {
    // Only waits for current record
    // TODO: Check records

    it('deploys a class and syncs it', async () => {
      const run = new Run()
      class A {}
      run.deploy(A)
      await run.sync()
      const A2 = await run.load(A.location)
      expect(A2.toString()).to.equal(A.toString())
      expect(A2.origin).to.equal(A.origin)
      expect(A2.location).to.equal(A.location)
    })

    it('publishes after dependent transaction', async () => {
      const run = new Run()

      class A { }
      class B extends A { }
      A.B = B

      run.deploy(A)
      await run.sync()

      await run.load(A.location)

      const B2 = await run.load(B.location)

      class C extends B2 { }
      run.deploy(C)
      await run.sync()
    })

    it('should sync with warning when UTXO is incorrectly spent', async () => {
      const run = new Run()

      class A { }
      const C = run.deploy(A)

      await C.sync()
      const location = C.location

      const utxos = await run.blockchain.utxos(run.owner.address)
      const tx = new Transaction().from(utxos)
      const paid = await payFor(tx, run)
      const signed = paid.sign(run.owner.privkey)
      await run.blockchain.broadcast(signed.toString('hex'))

      await C.sync()
      expect(C.location).to.equal(location)
    })
  })

  describe('upgrade', () => {
    it('should replace code', async () => {
      const run = new Run()

      class A { f () { } }
      const CA = run.deploy(A)

      expect(typeof CA.prototype.f).to.equal('function')
      expect(CA.toString()).to.equal(A.toString())
      expect(CA.name).to.equal(A.name)

      const x = new CA()

      expect(x instanceof CA).to.equal(true)
      expect(typeof x.f).to.equal('function')

      run.deploy(A)
      await CA.sync()

      class B { g () { } }
      CA.upgrade(B)

      expect(typeof CA.prototype.f).to.equal('undefined')
      expect(typeof CA.prototype.g).to.equal('function')
      expect(CA.toString()).to.equal(B.toString())
      expect(CA.name).to.equal(B.name)
      expect(CA.prototype.constructor).to.equal(CA)

      const y = new CA()

      expect(y instanceof CA).to.equal(true)
      expect(typeof y.f).to.equal('undefined')
      expect(typeof y.g).to.equal('function')

      expect(x instanceof CA).to.equal(true)
      expect(typeof x.f).to.equal('undefined')
      expect(typeof x.g).to.equal('function')

      // Load with cache
      await run.sync()
      await run.load(CA.origin)
      await run.load(CA.location)

      // Load without cache
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(CA.origin)
      await run2.load(CA.location)
    })

    it('should upgrade functions', () => {
      const run = new Run()
      function f () { return 1 }
      const c = run.deploy(f)
      expect(c()).to.equal(1)
      function g () { return 2 }
      c.upgrade(g)
      expect(c()).to.equal(2)
    })

    it('should upgrade with dependencies', async () => {
      const run = new Run()
      class A { }
      class D { }
      class B extends D { }
      class C { }
      B.C = C
      const CA = run.deploy(A)
      CA.upgrade(B)
      await run.sync()
      await run.load(CA.location)
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(CA.location)
    })

    it('should throw if inconsistent world after upgrade', async () => {
      const run = new Run()
      class A { }
      class B { }
      const CA = run.deploy(A)
      CA.upgrade(B)
      await run.sync()
      const A1 = await run.load(CA.origin)
      class C { }
      C.A1 = A1
      C.A2 = CA
      expect(() => run.deploy(C)).to.throw('Inconsistent worldview')
    })

    it('should rollback upgrade', async () => {
      const run = new Run()
      class A { f () { } static t () { }}
      A.x = 1
      const C = run.deploy(A)
      await C.sync()
      expect(typeof C.t).to.equal('function')
      expect(typeof C.u).to.equal('undefined')

      class B { g () { } static u () { }}
      B.y = 2
      stub(run.purse, 'pay').callsFake(x => x)
      C.upgrade(B)
      expect(typeof C.t).to.equal('undefined')
      expect(typeof C.u).to.equal('function')

      await expect(C.sync()).to.be.rejected

      expect(C.toString()).to.equal(A.toString())
      expect(C.x).to.equal(1)
      expect(C.y).to.equal(undefined)
      expect(typeof C.prototype.f).to.equal('function')
      expect(typeof C.prototype.g).to.equal('undefined')
      expect(typeof C.t).to.equal('function')
      expect(typeof C.u).to.equal('undefined')
    })

    // TODO: Upgrade with parent
    // TODO: Upgrade with props (deployed and not)
    // TODO: Upgrade and remove parent
    // TODO: Upgrade with different parent
    // TODO: Same for props
    // TODO: Upgrade and change name
    // TODO: Cannot upgrade undeployed code
    // TODO: Does not deploy if already deployed
    // TODO: Rollback with multiple transactions in a batch
    // TODO: Rollback upgrade itself, not publish error
  })

  describe('activate', () => {
    it('simple activate test', async () => {
      const run = new Run()
      class A { }
      run.deploy(A)
      await run.sync()
      const location = A.location

      run.deactivate()
      expect(typeof A.location).to.equal('undefined')

      run.activate()
      expect(A.location).to.equal(location)
    })
  })

  describe('native', () => {
    it('should not return source code', () => {
      expect(Jig.toString().indexOf('[native code]')).not.to.equal(-1)
      expect(Code.toString().indexOf('[native code]')).not.to.equal(-1)
      expect(Berry.toString().indexOf('[native code]')).not.to.equal(-1)
    })
  })

  describe('destroy', () => {
    it('destroys code', async () => {
      const run = new Run()
      class A { }
      const C = run.deploy(A)
      await C.sync()

      C.destroy()
      await C.sync()
      expect(C.location.endsWith('_d0')).to.equal(true)

      // Load from state cache
      await run.load(C.origin)
      await run.load(C.location)

      // Load via replay
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(C.location)
    })
  })

  describe('load', () => {
    it('loads circular jig props', async () => {
      const run = new Run()

      class A { }
      class B { }
      A.B = B
      B.A = A

      run.deploy(A)
      await run.sync()

      // Load from cache
      const CA = await run.load(A.location)
      expect(CA.B.A).to.equal(CA)

      // Load via replay
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      const CA2 = await run2.load(A.location)
      expect(CA2.B.A).to.equal(CA2)
    })
  })

  describe('auth', () => {
    it('auths code', async () => {
      const run = new Run()
      class A { }
      const C = run.deploy(A)
      await C.sync()

      C.auth()
      await C.sync()
      expect(C.origin).not.to.equal(C.location)

      // Load from state cache
      await run.load(C.origin)
      await run.load(C.location)

      // Load via replay
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(C.location)
    })

    // Auth fails on new jigs, or when owner transfers in a batch
    // Auth is allowed when unbound and undefined, but a different transaction
  })

  describe('call', () => {
    it('calls static get method on jig', async () => {
      const run = new Run()
      class A extends Jig { static f (x) { return 123 + x } }
      const C = run.deploy(A)
      await C.sync()
      expect(C.f(1)).to.equal(124)
      expect(C.origin).to.equal(C.location)
    })

    it('calls static set method on jig', async () => {
      const run = new Run()
      class A extends Jig { static f (x) { this.x = x } }
      const C = run.deploy(A)
      await C.sync()
      C.f(1)
      expect(C.x).to.equal(1)
      await C.sync()
      expect(C.location).not.to.equal(C.origin)

      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      const C2 = await run2.load(C.location)

      expect(C.location).to.equal(C2.location)
      expect(C.x).to.equal(C2.x)
    })

    // TODO: Move to deploy
    it('allowed to set native class as dependency', async () => {
      const run = new Run()
      class A extends Jig { static f (x) { this.x = x } }
      A.deps = { Jig }
      const C = run.deploy(A)
      await C.sync()
    })

    it('calls static method with passthrough and without this on non-jig', async () => {
      const run = new Run()
      class A {
        static f (x) {
          if (x !== Symbol.hasInstance) throw new Error()
          if (this) throw new Error()
          return Symbol.iterator
        }
      }
      const C = run.deploy(A)
      await C.sync()
      expect(C.f(Symbol.hasInstance)).to.equal(Symbol.iterator)
    })

    it('can only call static methods on class they are from', async () => {
      const run = new Run()

      class A extends Jig {
        static f () { this.f = 'a' }
        static g () { this.g = 'a' }
      }

      class B extends A {
        static g () { this.g = 'b' }
        static h () { this.h = 'b' }
      }

      const CA = run.deploy(A)
      await CA.sync()

      const CB = run.deploy(B)
      await CB.sync()
      // CB.h()
      // await CB.sync()
      // console.log(CB)
    })
  })

  describe('get', () => {
    it('returns the same method twice', async () => {
      const run = new Run()
      class A { static f () { return 123 } }
      const C = run.deploy(A)
      await C.sync()
      expect(C.f).to.equal(C.f)
      expect(C.f()).to.equal(123)

      // Move these to separate tests
      // C.f.x = 1
      /*
      class B {
        static g () { this.x = 1 }
        static h () { this.g.x = 1 }
      }
      const D = run.deploy(B)
      await D.sync()
      // D.g()
      D.h()
      */
    })
  })

  // Constructing Code objects inside... they would normally construct sandbox. How to do base?
  //      Need for arb objects
  // Clean up loader
  // Spend all stack when set
  // Spend all stack when delete
  // Spend all stack when create too
  // Handle auth and destroy
  // Borrowing
  // Cache protocol
  // Inheritance and upgrading parents

  // TODO: Delete a parent class property from a child?
  // Classes should always operate on themselves

  // Test set properties on child when there is a similar property on parent class
  // Same for delete. There's a comment in membrane about this.
  // Call auth in a jig

  // Owner is parent ... for new jigs
})

// ------------------------------------------------------------------------------------------------
