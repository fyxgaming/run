/**
 * code.js
 *
 * Tests for lib/kernel/code.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { PrivateKey } = require('bsv')
const { Run } = require('../../env/config')
const { Jig, Berry } = Run
const { unmangle } = require('../../env/unmangle')
const Code = unmangle(Run)._Code
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
      new Run() // eslint-disable-line
      class A { }
      const CA = new Code(A)
      expect(CA.toString()).to.equal(A.toString())
    })

    it('creates from function', () => {
      new Run() // eslint-disable-line
      function f () { }
      new Code(f) // eslint-disable-line
    })

    it('adds invisible code functions', () => {
      new Run() // eslint-disable-line
      class A { }
      const CA = new Code(A)
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
      new Run() // eslint-disable-line
      class A { }
      const CA1 = new Code(A)
      const CA2 = new Code(A)
      expect(CA1).to.equal(CA2)
    })

    it('throws if not a function', () => {
      new Run() // eslint-disable-line
      expect(() => new Code()).to.throw('Cannot install')
      expect(() => new Code(0)).to.throw('Cannot install')
      expect(() => new Code({})).to.throw('Cannot install')
      expect(() => new Code('class A {}')).to.throw('Cannot install')
      expect(() => new Code(null)).to.throw('Cannot install')
    })

    it('throw if anonymous', () => {
      new Run() // eslint-disable-line
      expect(() => new Code(() => {})).to.throw('Cannot install')
      expect(() => new Code(class {})).to.throw('Cannot install')
    })

    it('throws if built-in', () => {
      new Run() // eslint-disable-line
      expect(() => new Code(Object)).to.throw('Cannot install Object')
      expect(() => new Code(Date)).to.throw('Cannot install Date')
      expect(() => new Code(Uint8Array)).to.throw('Cannot install')
      expect(() => new Code(Math.sin)).to.throw('Cannot install sin')
      expect(() => new Code(parseInt)).to.throw('Cannot install parseInt')
    })

    it('throws if prototype inheritance', () => {
      new Run() // eslint-disable-line
      function A () { }
      function B () { }
      B.prototype = Object.create(A.prototype)
      expect(() => new Code(B)).to.throw('Cannot install B')
    })

    it('throws if contains reserved words', () => {
      new Run() // eslint-disable-line
      class A { }
      A.toString = () => 'hello'
      expect(() => new Code(A)).to.throw('Cannot install A')
      class B { static deploy () { } }
      expect(() => new Code(B)).to.throw('Cannot install B')
      class C { }
      C.upgrade = 1
      expect(() => new Code(C)).to.throw('Cannot install C')
      class D { }
      D.sync = undefined
      expect(() => new Code(D)).to.throw('Cannot install D')
      class E { static get release () { } }
      expect(() => new Code(E)).to.throw('Cannot install E')
    })

    it('throws if contains bindings', () => {
      new Run() // eslint-disable-line
      class A { }
      A.location = randomLocation()
      A.origin = randomLocation()
      A.owner = randomOwner()
      A.satoshis = 0
      expect(() => new Code(A)).to.throw('Cannot install A')
    })

    it('creates parents', () => {
      new Run() // eslint-disable-line
      class A { }
      class B extends A { }
      class C extends B { }
      const CC = new Code(C)
      const CB = new Code(B)
      const CA = new Code(A)
      expect(Object.getPrototypeOf(CC)).to.equal(CB)
      expect(Object.getPrototypeOf(CB)).to.equal(CA)
    })

    it('throws if error creating dependency', () => {
      new Run() // eslint-disable-line
      class A { }
      A.Date = Date
      expect(() => new Code(A)).to.throw('Cannot install Date')
      expect(Code._get(A)).to.equal(undefined)
      expect(Code._get(Date)).to.equal(undefined)
    })

    it('creates code for props', () => {
      new Run() // eslint-disable-line
      class A { }
      class B { }
      A.B = B
      const CA = new Code(A)
      expect(CA.B).to.equal(new Code(B))
    })

    it('installs circular prop code', () => {
      new Run() // eslint-disable-line
      class A { }
      class B { }
      A.B = B
      B.A = A
      const CA = new Code(A)
      const CB = new Code(B)
      expect(CA.B).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

    it('installs circular parent-child code', () => {
      new Run() // eslint-disable-line
      class B { }
      class A extends B { }
      B.A = A
      const CA = new Code(A)
      const CB = new Code(B)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
      expect(CB.A).to.equal(CA)
    })

    it('installs parent that is code jig', () => {
      new Run() // eslint-disable-line
      class B { }
      const CB = new Code(B)
      class A extends CB { }
      B.deps = { A }
      const CA = new Code(A)
      expect(Object.getPrototypeOf(CA)).to.equal(CB)
    })

    it('sets initial bindings', () => {
      new Run() // eslint-disable-line
      class A { }
      const CA = new Code(A)
      expect(() => CA.location).to.throw('Cannot read location: Not deployed')
      expect(() => CA.origin).to.throw('Cannot read origin: Not deployed')
      expect(() => CA.owner).to.throw('Cannot read owner: Not bound')
      expect(() => CA.satoshis).to.throw('Cannot read satoshis: Not bound')
      Membrane._sudo(() => {
        expect(CA.location).to.equal('error://Not deployed\n\nHint: Deploy the code first to assign location')
        expect(CA.origin).to.equal('error://Not deployed\n\nHint: Deploy the code first to assign origin')
        expect(unmangle(CA.owner)._value).to.equal(undefined)
        expect(unmangle(CA.satoshis)._value).to.equal(0)
      })
    })
  })

  describe('deps', () => {
    it('makes deps globals', () => {
      new Run() // eslint-disable-line
      class A { }
      function f () { return A }
      f.deps = { A }
      const sf = new Code(f)
      expect(sf()).to.equal(new Code(A))
    })

    it('supports normal javascript values as deps', () => {
      new Run() // eslint-disable-line
      class A {
        static n () { return n } // eslint-disable-line
        static o () { return o } // eslint-disable-line
      }
      A.deps = { n: 1, o: { a: [] } }
      const CA = new Code(A)
      expect(CA.n()).to.equal(1)
      expect(CA.o()).not.to.equal(A.deps.o)
      expect(CA.o()).to.deep.equal(A.deps.o)
      expect(CA.o() instanceof SI.Object).to.equal(true)
      expect(CA.o().a instanceof SI.Array).to.equal(true)
    })

    it('sets deps on returned code jig', () => {
      new Run() // eslint-disable-line
      class A { }
      class B { }
      A.deps = { B }
      const CA = new Code(A)
      expect(CA.deps.B).to.equal(new Code(B))
    })

    it('throws if deps invalid', () => {
      new Run() // eslint-disable-line
      class A { }
      A.deps = null
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.deps = '123'
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.deps = []
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.deps = new class Deps {}()
      expect(() => new Code(A)).to.throw('Cannot install A')
    })

    it('doesnt install parent deps on child', () => {
      new Run() // eslint-disable-line
      class B { f () { return n } } // eslint-disable-line
      class A extends B { g () { return n } } // eslint-disable-line
      B.deps = { n: 1 }
      const CB = new Code(B)
      const b = new CB()
      expect(b.f()).to.equal(1)
      const CA = new Code(A)
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
      const CA = new Code(A)
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
      const CA = new Code(A)
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
      const CA = new Code(A)
      expect(CA.b).to.equal(b)
      expect(CA.j).to.equal(j)
      expect(CA.C).not.to.equal(C)
      expect(CA.C.toString()).to.equal(C.toString())
      expect(CA.C).to.equal(new Code(C))
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
      const CA = new Code(A)
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
      const CA = new Code(A)
      const CB = new Code(B)
      expect(CA).to.equal(CB)
    })

    it('installs separate presets for parent and child', () => {
      const run = new Run()
      const network = run.blockchain.network
      class B { }
      B.presets = { [network]: { n: 1, m: 0 } }
      class A extends B { }
      A.presets = { [network]: { n: 2 } }
      const CB = new Code(B)
      const CA = new Code(A)
      expect(CB.n).to.equal(1)
      expect(CB.m).to.equal(0)
      expect(CA.n).to.equal(2)
      expect(CA.m).to.equal(0)
      expect(Object.getOwnPropertyNames(CA).includes('n')).to.equal(true)
      expect(Object.getOwnPropertyNames(CA).includes('m')).to.equal(false)
    })

    it('throws if parent dependency mismatch', () => {
      new Run() // eslint-disable-line
      class A { }
      class C { }
      class B extends A { }
      B.deps = { A: C }
      expect(() => new Code(B)).to.throw('Parent dependency mismatch')
    })

    it('throws if presets are invalid', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = null
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.presets = { [network]: null }
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.presets = {
        [network]: {
          location: '_o1',
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      expect(() => new Code(A)).to.throw('Cannot install A')
      A.presets = {
        [network]: {
          location: '_o1',
          origin: randomLocation(),
          nonce: 2,
          owner: randomOwner(),
          satoshis: 0
        }
      }
      expect(() => new Code(A)).to.throw()
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
      expect(() => new Code(A)).to.throw()
      delete A.presets.test
      A.presets[network].nonce = 0
      expect(() => new Code(A)).to.throw()
      A.presets[network].nonce = null
      expect(() => new Code(A)).to.throw()
      A.presets = []
      expect(() => new Code(A)).to.throw()
      A.presets = { [network]: new class Presets {}() }
      expect(() => new Code(A)).to.throw()
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
        expect(() => new Code(A)).to.throw('Cannot install A')
      }
    })

    it('throws if presets contains reserved properties', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { deps: {} } }
      expect(() => new Code(A)).to.throw()
      A.presets = { [network]: { presets: {} } }
      expect(() => new Code(A)).to.throw()
      A.presets = { [network]: { upgrade: () => {} } }
      expect(() => new Code(A)).to.throw()
    })
  })

  describe('prototype', () => {
    it('sets prototype constructor to code jig', () => {
      new Run() // eslint-disable-line
      class A { }
      const CA = new Code(A)
      expect(CA.prototype.constructor).to.equal(CA)
    })
  })

  describe('name', () => {
    it('returns class or function name', () => {
      new Run() // eslint-disable-line
      class A { }
      expect(new Code(A).name).to.equal('A')
      function f () { }
      expect(new Code(f).name).to.equal('f')
    })
  })

  describe('toString', () => {
    it('returns same string as original code', () => {
      new Run() // eslint-disable-line
      class A { }
      const CA = new Code(A)
      expect(CA.toString()).to.equal(A.toString())
      expect(A.toString().replace(/\s/g, '')).to.equal('classA{}')
    })

    it('returns same code as original code when there is a parent', () => {
      new Run() // eslint-disable-line
      class B { }
      const CB = new Code(B)
      class A extends CB { }
      const CA = new Code(A)
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
      new Run() // eslint-disable-line
      class A {}
      class B extends A {}
      const CB = new Code(B)
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
      new Run() // eslint-disable-line
      class A {
        static send (to) { this.owner = to }
      }
      A.send = () => { throw new Error('Must call methods on jigs') }
      const CA = new Code(A)
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

    it.only('publishes after dependent transaction', () => {
      new Run() // eslint-disable-line
      class A {}
      const CA = new Code(A)
      CA.deploy()
      class B extends A { }
      const CB = new Code(B)
      CB.deploy()
    })
  })
})

// ------------------------------------------------------------------------------------------------
