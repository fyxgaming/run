/**
 * code.js
 *
 * Tests for lib/kernel/code.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { PrivateKey } = require('bsv')
const { Run } = require('../env/config')
const { Jig, Berry } = Run
const { unmangle } = require('../env/unmangle')
const Membrane = unmangle(Run)._Membrane
const SI = unmangle(Run.sandbox)._intrinsics

const randomLocation = () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + '_o0'
const randomOwner = () => new PrivateKey().toAddress().toString()

// test read only

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
  describe('new', () => {
    it('creates from class', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(CA.toString()).to.equal(A.toString())
    })

    it('creates from function', () => {
      const run = new Run()
      function f () { }
      run.install(f)
    })

    it('adds invisible code functions', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(typeof CA.deploy).to.equal('function')
      expect(typeof CA.upgrade).to.equal('function')
      expect(typeof CA.sync).to.equal('function')
      expect(typeof CA.release).to.equal('function')
      expect(Object.getOwnPropertyNames(CA).includes('deploy')).to.equal(false)
      expect(Object.getOwnPropertyNames(CA).includes('upgrade')).to.equal(false)
      expect(Object.getOwnPropertyNames(CA).includes('sync')).to.equal(false)
      expect(Object.getOwnPropertyNames(CA).includes('release')).to.equal(false)
    })

    it('creates only once', () => {
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
      class B { static deploy () { } }
      expect(() => run.install(B)).to.throw('Cannot install B')
      class C { }
      C.upgrade = 1
      expect(() => run.install(C)).to.throw('Cannot install C')
      class D { }
      D.sync = undefined
      expect(() => run.install(D)).to.throw('Cannot install D')
      class E { static get release () { } }
      expect(() => run.install(E)).to.throw('Cannot install E')
    })

    it('throws if contains bindings', () => {
      const run = new Run()
      class A { }
      A.location = randomLocation()
      A.origin = randomLocation()
      A.owner = randomOwner()
      A.satoshis = 0
      expect(() => run.install(A)).to.throw('Cannot install A')
    })

    it('creates parents', () => {
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
      B.deps = { A }
      const CA = run.install(A)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
    })

    it('sets initial bindings', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(() => CA.location).to.throw('Cannot read location: Undeployed')
      expect(() => CA.origin).to.throw('Cannot read origin: Undeployed')
      expect(() => CA.owner).to.throw('Cannot read owner: Not bound')
      expect(() => CA.satoshis).to.throw('Cannot read satoshis: Not bound')
      Membrane._sudo(() => {
        expect(CA.location).to.equal('error://Undeployed\n\nHint: Deploy the code first to assign location')
        expect(CA.origin).to.equal('error://Undeployed\n\nHint: Deploy the code first to assign origin')
        expect(unmangle(CA.owner)._value).to.equal(undefined)
        expect(unmangle(CA.satoshis)._value).to.equal(0)
      })
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

    it('copies blockchain objects', async () => {
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

    it('returns existing code for a copy with same presets', () => {
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
      expect(CA).to.equal(CB)
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
      A.presets[network].nonce = 1
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

    it('requires parent approval by default', () => {
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
  })

  describe('options', () => {
    it('allows utility classes', () => {
      const run = new Run()
      class A { }
      A.options = { utility: true }
      const CA = run.install(A)
      CA.deploy()
      class B extends A { }
      const CB = run.install(B)
      CB.deploy()
      class C extends A { }
      const CC = run.install(C)
      CC.deploy()
    })

    it('throws if invalid options', () => {
      const run = new Run()
      class A { }
      A.options = null
      expect(() => run.install(A)).to.throw('options must be an object')
    })

    it('throws if unknown option', () => {
      const run = new Run()
      class A { }
      A.options = { red: 1 }
      expect(() => run.install(A)).to.throw('Unknown option: red')
    })

    it('throws if invalid utility', () => {
      const run = new Run()
      class A { }
      A.options = { utility: 2 }
      expect(() => run.install(A)).to.throw('utility must be a boolean')
    })
  })

  describe('prototype', () => {
    it('sets prototype constructor to code jig', () => {
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

  describe('get', () => {
  })

  describe('functions', () => {
    // Code functions are not available inside functions
  })

  describe('deploy', () => {
    it('deploys parent and child', () => {
      const run = new Run()
      class A {}
      class B extends A {}
      const CB = run.install(B)
      CB.deploy()
      // const record = unmangle(stub(record))
      // expect(record._deploy.called).to.equal(true)
      expect(A.location.startsWith('record://'))
      expect(B.location.startsWith('record://'))
      expect(A.location.endsWith('_o2'))
      expect(B.location.endsWith('_o1'))
    })

    // Does not deploy if already deployed

    it('deploys with custom lock', () => {
      class L {
        script () { return new Uint8Array() }
        domain () { return 0 }
      }
      const run = new Run()
      class A {
        static send (to) { this.owner = to }
      }
      A.send = () => { throw new Error('Must call methods on jigs') }
      const CA = run.install(A)
      // A.send(1)
      CA.send(new L())
      CA.deploy()
      console.log(A)
      expect(A.location.startsWith('record://'))
    })
  })

  describe('upgrade', () => {

  })

  describe('sync', () => {
    // Only waits for current record

    it.only('publishes after dependent transaction', async () => {
      const run = new Run()

      class A {}

      await run.deploy(A)

      const A2 = await run.load(A.location)

      expect(A2.toString()).to.equal(A.toString())

      /*
      class B extends A { }
      const CB = run.install(B)
      CB.deploy()

      // Try sleeping, then syncing
      await new Promise((resolve, reject) => setTimeout(resolve, 200))

      await CB.sync()

      console.log(B.location)

      const B2 = await run.load(B.location)

      console.log(B2)
      console.log(B2.toString())
      */
    })
  })
})

// ------------------------------------------------------------------------------------------------
