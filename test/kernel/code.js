/**
 * repository.js
 *
 * Tests for lib/kernel/code.js and lib/kernel/repository.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { PrivateKey } = require('bsv')
const Run = require('../env/run')
const { Code, Jig, Berry, sandbox } = Run
const unmangle = require('../env/unmangle')
const SI = unmangle(sandbox)._intrinsics
const Membrane = unmangle(unmangle(Run)._Membrane)

const randomLocation = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + '_o0'
const randomOwner = () => new PrivateKey().toAddress().toString()

// ------------------------------------------------------------------------------------------------
// Repository
// ------------------------------------------------------------------------------------------------

describe('Repository', () => {
  describe('install', () => {
    it('creates from class', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(CA.toString()).to.equal(A.toString())
    })

    it('creates from function', () => {
      const run = new Run()
      function f () { }
      const f2 = run.install(f)
      expect(f2.toString()).to.equal(f.toString())
    })

    it('is instanceof Code', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(A instanceof Code).to.equal(false)
      expect(CA instanceof Code).to.equal(true)
      function f () { }
      const f2 = run.install(f)
      expect(f instanceof Code).to.equal(false)
      expect(f2 instanceof Code).to.equal(true)
    })

    it('adds invisible Code functions', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
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
      const CA1 = run.install(A)
      const CA2 = run.install(A)
      expect(CA1).to.equal(CA2)
    })

    it('throws if not a function', () => {
      const run = new Run()
      expect(() => run.install()).to.throw('Cannot install')
      expect(() => run.install(0)).to.throw('Cannot install')
      expect(() => run.install({})).to.throw('Cannot install')
      expect(() => run.install('class A {}')).to.throw('Cannot install')
      expect(() => run.install(null)).to.throw('Cannot install')
    })

    it('throw if anonymous', () => {
      const run = new Run()
      expect(() => run.install(() => {})).to.throw('Cannot install')
      expect(() => run.install(class {})).to.throw('Cannot install')
    })

    it('throws if built-in', () => {
      const run = new Run()
      expect(() => run.install(Object)).to.throw('Cannot install Object')
      expect(() => run.install(Date)).to.throw('Cannot install Date')
      expect(() => run.install(Uint8Array)).to.throw('Cannot install')
      expect(() => run.install(Math.sin)).to.throw('Cannot install sin')
      expect(() => run.install(parseInt)).to.throw('Cannot install parseInt')
      expect(() => run.install(SI.Object)).to.throw('Cannot install Object')
    })

    it('throws if prototype inheritance', () => {
      const run = new Run()
      function A () { }
      function B () { }
      B.prototype = Object.create(A.prototype)
      expect(() => run.install(B)).to.throw('Cannot install B')
    })

    it('throws if contains reserved words', () => {
      const run = new Run()
      class A { }
      A.toString = () => 'hello'
      expect(() => run.install(A)).to.throw('Cannot install A')
      class B { }
      B.upgrade = 1
      expect(() => run.install(B)).to.throw('Cannot install B')
      class C { static sync () { }}
      expect(() => run.install(C)).to.throw('Cannot install C')
      class D { static get destroy () { } }
      expect(() => run.install(D)).to.throw('Cannot install D')
    })

    it('throws if contains bindings', () => {
      const run = new Run()
      class A { }
      A.location = randomLocation()
      A.origin = randomLocation()
      A.owner = randomOwner()
      A.satoshis = 0
      A.nonce = 1
      expect(() => run.install(A)).to.throw('Cannot install A')
    })

    it('installs parents', () => {
      const run = new Run()
      class A { }
      class B extends A { }
      class C extends B { }
      const CC = run.install(C)
      const CB = run.install(B)
      const CA = run.install(A)
      expect(Object.getPrototypeOf(CC)).to.equal(CB)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)
    })

    it('throws if error creating dependency', () => {
      const run = new Run()
      class A { }
      A.Date = Date
      expect(() => run.install(A)).to.throw('Cannot install Date')
    })

    it('creates code for props', () => {
      const run = new Run()
      class A { }
      class B { }
      A.B = B
      const CA = run.install(A)
      expect(CA.B).to.equal(run.install(B))
    })

    it('installs circular prop code', () => {
      const run = new Run()
      class A { }
      class B { }
      A.B = B
      B.A = A
      const CA = run.install(A)
      const CB = run.install(B)
      expect(CA.B).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

    it('installs circular parent-child code', () => {
      const run = new Run()
      class B { }
      class A extends B { }
      B.A = A
      const CA = run.install(A)
      const CB = run.install(B)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

    it('installs parent that is code jig', () => {
      const run = new Run()
      class B { }
      const CB = run.install(B)
      class A extends CB { }
      const CA = run.install(A)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
    })

    it('sets initial bindings', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(() => CA.location).to.throw('Cannot read location: Undeployed')
      expect(() => CA.origin).to.throw('Cannot read origin: Undeployed')
      expect(() => CA.nonce).to.throw('Cannot read nonce: Undeployed')
      expect(() => CA.owner).to.throw('Cannot read owner: Not bound')
      expect(() => CA.satoshis).to.throw('Cannot read satoshis: Not bound')
      Membrane._sudo(() => {
        expect(CA.location).to.equal('error://Undeployed')
        expect(CA.origin).to.equal('error://Undeployed')
        expect(CA.nonce).to.equal(-1)
        expect(unmangle(CA.owner)._value).to.equal(undefined)
        expect(unmangle(CA.satoshis)._value).to.equal(undefined)
      })
    })

    it('cannot reference Code directly', () => {
      const run = new Run()
      class A extends Code { }
      expect(() => run.install(A)).to.throw()
      class B {}
      B.Code = Code
      expect(() => run.install(B)).to.throw()
    })
  })

  describe('deps', () => {
    it('makes deps globals', () => {
      const run = new Run()
      class A { }
      function f () { return A }
      f.deps = { A }
      const sf = run.install(f)
      expect(sf()).to.equal(run.install(A))
    })

    it('supports normal javascript values as deps', () => {
      const run = new Run()
      class A {
        static n () { return n } // eslint-disable-line
        static o () { return o } // eslint-disable-line
      }
      A.deps = { n: 1, o: { a: [] } }
      const CA = run.install(A)
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
      const CA = run.install(A)
      expect(CA.deps.B).to.equal(run.install(B))
    })

    it('throws if deps invalid', () => {
      const run = new Run()
      class A { }
      A.deps = null
      expect(() => run.install(A)).to.throw('Cannot install A')
      A.deps = '123'
      expect(() => run.install(A)).to.throw('Cannot install A')
      A.deps = []
      expect(() => run.install(A)).to.throw('Cannot install A')
      A.deps = new class Deps {}()
      expect(() => run.install(A)).to.throw('Cannot install A')
    })

    it('doesnt install parent deps on child', () => {
      const run = new Run()
      class B { f () { return n } } // eslint-disable-line
      class A extends B { g () { return n } } // eslint-disable-line
      B.deps = { n: 1 }
      const CB = run.install(B)
      const b = new CB()
      expect(b.f()).to.equal(1)
      const CA = run.install(A)
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
      const CA = run.install(A)
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
      const CA = run.install(A)
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
      const CA = run.install(A)
      expect(CA.b).to.equal(b)
      expect(CA.j).to.equal(j)
      expect(CA.C).not.to.equal(C)
      expect(CA.C.toString()).to.equal(C.toString())
      expect(CA.C).to.equal(run.install(C))
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
      const CA = run.install(A)
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
      const CA = run.install(A)
      const CB = run.install(B)
      expect(CA).not.to.equal(CB)
    })

    it('installs separate presets for parent and child', () => {
      const run = new Run()
      const network = run.blockchain.network
      class B { }
      B.presets = { [network]: { n: 1, m: 0 } }
      class A extends B { }
      A.presets = { [network]: { n: 2 } }
      const CB = run.install(B)
      const CA = run.install(A)
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
      expect(() => run.install(B)).to.throw('Parent dependency mismatch')
    })

    it('throws if presets are invalid', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = null
      expect(() => run.install(A)).to.throw('Cannot install A')
      A.presets = { [network]: null }
      expect(() => run.install(A)).to.throw('Cannot install A')
      A.presets = {
        [network]: {
          location: '_o1',
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      expect(() => run.install(A)).to.throw('Cannot install A')
      A.presets = {
        [network]: {
          location: '_o1',
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      expect(() => run.install(A)).to.throw()
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
      expect(() => run.install(A)).to.throw()
      delete A.presets.test
      A.presets[network].nonce = -1
      expect(() => run.install(A)).to.throw()
      A.presets[network].nonce = null
      expect(() => run.install(A)).to.throw()
      A.presets = []
      expect(() => run.install(A)).to.throw()
      A.presets = { [network]: new class Presets {}() }
      expect(() => run.install(A)).to.throw()
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
        expect(() => run.install(A)).to.throw('Cannot install A')
      }
    })

    it('throws if presets contains reserved properties', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { deps: {} } }
      expect(() => run.install(A)).to.throw()
      A.presets = { [network]: { presets: {} } }
      expect(() => run.install(A)).to.throw()
      A.presets = { [network]: { upgrade: () => {} } }
      expect(() => run.install(A)).to.throw()
    })
  })

  describe('sealed', () => {
    it('allows unsealing', async () => {
      const run = new Run()
      class A { }
      A.sealed = false
      class B extends A { }
      const CA = run.install(A)
      await run.deploy(A)
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
      expect(() => run.install(A)).to.throw('sealed must be a boolean')
      A.sealed = 1
      expect(() => run.install(A)).to.throw('sealed must be a boolean')
    })
  })

  describe('prototype', () => {
    it('sets prototype constructor to Code', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(CA.prototype.constructor).to.equal(CA)
    })
  })

  describe('name', () => {
    it('returns class or function name', () => {
      const run = new Run()
      class A { }
      expect(run.install(A).name).to.equal('A')
      function f () { }
      expect(run.install(f).name).to.equal('f')
    })
  })

  describe('toString', () => {
    it('returns same string as original code', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(CA.toString()).to.equal(A.toString())
      expect(A.toString().replace(/\s/g, '')).to.equal('classA{}')
    })

    it('returns same code as original code when there is a parent', () => {
      const run = new Run()
      class B { }
      const CB = run.install(B)
      class A extends CB { }
      const CA = run.install(A)
      expect(CA.toString().replace(/\s/g, '')).to.equal('classAextendsB{}')
    })
  })

  describe('deploy', () => {
    // Does not deploy if already deployed

    it('deploys parent and child', async () => {
      const run = new Run()
      class A {}
      class B extends A {}
      await run.deploy(B)
      expect(A.location.endsWith('_o1'))
      expect(B.location.endsWith('_o2'))
    })

    it.skip('sealed by default', () => {
      const run = new Run()
      class A { }
      A.options = { utility: true }
      const CA = run.install(A)
      CA.deploy()
      class C extends A { }
      const CC = run.install(C)
      CC.deploy()
      // TODO: Parent approval
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
      const CA = run.install(A)
      await run.deploy(CA)
      CA.send(new L())
      await CA.sync()
      expect(A.location.startsWith('record://'))
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
      await run.deploy(A)
      const A2 = await run.load(A.location)
      expect(A2.toString()).to.equal(A.toString())
      expect(A2.origin).to.equal(A.origin)
      expect(A2.location).to.equal(A.location)
    })

    it('publishes after dependent transaction', async () => {
      const run = new Run()

      class A {}
      class B extends A { }
      A.B = B

      await run.deploy(A)

      await run.load(A.location)

      const B2 = await run.load(B.location)

      class C extends B2 { }
      await run.deploy(C)

      // Deploy C fails
    })
  })

  describe('upgrade', () => {
    it.only('should replace code', () => {
      const run = new Run()
      class A { f () { } }
      const CA = run.install(A)
      console.log(CA.prototype.f, CA.prototype.g, CA.toString())

      const x = new CA()
      console.log(x.f, x.g)

      class B { g () { } }
      CA.upgrade(B)
      console.log(CA.prototype.f, CA.prototype.g, CA.toString())

      const y = new CA()

      console.log(x, y, x instanceof CA, y instanceof CA, x instanceof A, y instanceof B)
      console.log(x.f, x.g, y.f, y.g)
    })
  })

  describe('native', () => {
    it('should not return source code', () => {
      console.log(Jig.toString())
      console.log(Code.toString())
      console.log(Berry.toString())
    })
  })
})

// ------------------------------------------------------------------------------------------------
