/**
 * code.js
 *
 * Tests for Code functionality once deployed
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const PrivateKey = require('bsv/lib/privatekey')
const { Code, Jig, Berry, LocalCache, _sudo } = unmangle(Run)

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Methods available on all code instances
const CODE_METHODS = ['upgrade', 'sync', 'destroy', 'auth', Symbol.hasInstance]

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // toString
  // --------------------------------------------------------------------------

  describe('toString', () => {
    it('returns source code for class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(CA.toString().startsWith('class A')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns source code for function', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      expect(cf.toString().startsWith('function f')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns source code for jig class', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(CA.toString().startsWith('class A extends Jig')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns source code for child code class', () => {
      const run = new Run()
      class A { }
      class B extends A { }
      const CB = run.deploy(B)
      expect(CB.toString().startsWith('class B')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns source code for child non-code class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B extends CA { }
      expect(B.toString().startsWith('class B')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returnsj same method for different code', () => {
      const run = new Run()
      class A { }
      function f () { }
      const CA = run.deploy(A)
      const cf = run.deploy(f)
      expect(CA.toString).to.equal(cf.toString)
      expect(CA.toString()).not.to.equal(cf.toString())
    })
  })

  // --------------------------------------------------------------------------
  // Code methods
  // --------------------------------------------------------------------------

  describe('Code methods', () => {
    it('adds invisible code methods to class', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CODE_METHODS.forEach(name => expect(typeof CA[name]).to.equal('function'))
      CODE_METHODS.forEach(name => expect(name in CA).to.equal(true))
      CODE_METHODS.forEach(name => expect(Object.getOwnPropertyNames(CA).includes(name)).to.equal(false))
    })

    // ------------------------------------------------------------------------

    it('adds invisible code methods to function', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      CODE_METHODS.forEach(name => expect(typeof cf[name]).to.equal('function'))
      CODE_METHODS.forEach(name => expect(name in cf).to.equal(true))
      CODE_METHODS.forEach(name => expect(Object.getOwnPropertyNames(cf).includes(name)).to.equal(false))
    })

    // ------------------------------------------------------------------------

    it('code methods for class are always the same', () => {
      const run = new Run()
      class A { }
      class B { }
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      expect(CA.upgrade).to.equal(CA.upgrade)
      expect(CA.sync).to.equal(CB.sync)
    })

    // ------------------------------------------------------------------------

    it('code methods for class are frozen', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CODE_METHODS.forEach(name => expect(Object.isFrozen(CA[name])))
    })
  })

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    it('initial bindings are unreadable', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(() => CA.location).to.throw('Cannot read location')
      expect(() => CA.origin).to.throw('Cannot read origin')
      expect(() => CA.nonce).to.throw('Cannot read nonce')
      expect(() => CA.owner).to.throw('Cannot read owner')
      expect(() => CA.satoshis).to.throw('Cannot read satoshis')
    })

    // ------------------------------------------------------------------------

    it('name is correct', () => {
      const run = new Run()
      class A { }
      expect(run.deploy(A).name).to.equal('A')
      function f () { }
      expect(run.deploy(f).name).to.equal('f')
      class B extends A { }
      expect(run.deploy(B).name).to.equal('B')
    })

    // ------------------------------------------------------------------------

    it('returns code by name', () => {
      const run = new Run()
      class A { static getThis () { return A } }
      const A2 = run.deploy(A)
      expect(A2.getThis()).to.equal(A2)
      function f () { return f }
      const f2 = run.deploy(f)
      expect(f2()).to.equal(f2)
    })

    // ------------------------------------------------------------------------

    it('returns parent property if not set on child', () => {
      const run = new Run()
      class A { }
      A.n = 1
      class B extends A { }
      const CB = run.deploy(B)
      expect(CB.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('same method is returned every time', () => {
      const run = new Run()
      class A { static f () { } }
      const CA = run.deploy(A)
      expect(typeof CA.f).to.equal('function')
      expect(CA.f).to.equal(CA.f)
    })

    // ------------------------------------------------------------------------

    it('same method is returned for child code', () => {
      const run = new Run()
      class A { static f () { } }
      const CA = run.deploy(A)
      class B extends CA {}
      const CB = run.deploy(B)
      expect(typeof CB.f).to.equal('function')
      expect(CB.f).to.equal(CA.f)
    })
  })

  // --------------------------------------------------------------------------
  // delete
  // --------------------------------------------------------------------------

  describe('delete', () => {
    it('throws if external', () => {
      const run = new Run()
      class A extends Jig { }
      A.n = 1
      const CA = run.deploy(A)
      expect(() => { delete CA.n }).to.throw('Updates must be performed in the jig\'s methods')
    })

    // ------------------------------------------------------------------------

    it('allowed inside', async () => {
      const run = new Run()
      class A extends Jig { static f () { delete this.n } }
      A.n = 1
      const CA = run.deploy(A)
      CA.f()
      test(CA)
      await CA.sync()
      function test (CA) { expect('n' in CA).to.equal(false) }
      const CA2 = await run.load(CA.location)
      test(CA2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('deletes on current class not parent', async () => {
      const run = new Run()
      class A extends Jig { static f () { delete this.n } }
      A.n = 1
      class B extends A { }
      const CB = run.deploy(B)
      function test (CB) { expect(CB.n).to.equal(1) }
      CB.f()
      await CB.sync()
      test(CB)
      const CB2 = await run.load(CB.location)
      test(CB2)
      run.cache = new LocalCache()
      const CB3 = await run.load(CB.location)
      test(CB3)
    })
  })

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  describe('set', () => {
    it('throws if external', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(() => { CA.n = 1 }).to.throw("Updates must be performed in the jig's methods")
    })

    // ------------------------------------------------------------------------

    it('allowed internally', async () => {
      const run = new Run()
      class A extends Jig { static f () { this.n = 1 } }
      const CA = run.deploy(A)
      CA.f()
      await CA.sync()
      function test (CA) { expect(CA.n).to.equal(1) }
      test(CA)
      const CA2 = await run.load(CA.location)
      test(CA2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('overrides parent on child', async () => {
      const run = new Run()
      class A extends Jig { static f (n) { this.n = n } }
      class B extends A { }
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      CA.f(1)
      CB.f(2)
      await CB.sync()
      await CA.sync()
      function test (CA, CB) {
        expect(CA.n).to.equal(1)
        expect(CB.n).to.equal(2)
      }
      test(CA, CB)
      const CA2 = await run.load(CA.location)
      const CB2 = await run.load(CB.location)
      test(CA2, CB2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      const CB3 = await run.load(CB.location)
      test(CA3, CB3)
    })
  })

  // --------------------------------------------------------------------------
  // defineProperty
  // --------------------------------------------------------------------------

  describe('defineProperty', () => {
    it('throws if external', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      const desc = { value: true, configurable: true, enumerable: true, writable: true }
      const error = "Updates must be performed in the jig's methods"
      expect(() => Object.defineProperty(CA, 'n', desc)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('defines on current class', async () => {
      const run = new Run()
      class A extends Jig {
        static f (s) {
          const desc = { value: s, configurable: true, enumerable: true, writable: true }
          Object.defineProperty(this, 's', desc)
        }
      }
      class B extends A { }
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      CA.f('abc')
      CB.f('def')
      await CB.sync()
      await CA.sync()
      function test (CA, CB) {
        expect(CA.s).to.equal('abc')
        expect(CB.s).to.equal('def')
      }
      test(CA, CB)
      const CA2 = await run.load(CA.location)
      const CB2 = await run.load(CB.location)
      test(CA2, CB2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      const CB3 = await run.load(CB.location)
      test(CA3, CB3)
    })
  })

  // --------------------------------------------------------------------------
  // instanceof
  // --------------------------------------------------------------------------

  describe('instanceof', () => {
    it('deployed classes returns true', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(CA instanceof Code).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('deployed functions returns true', () => {
      const run = new Run()
      function f () { }
      const cf = run.deploy(f)
      expect(cf instanceof Code).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('non-code return false', () => {
      expect(class A { } instanceof Code).to.equal(false)
      expect(function f () { } instanceof Code).to.equal(false)
      expect(undefined instanceof Code).to.equal(false)
      expect(true instanceof Code).to.equal(false)
      expect({} instanceof Code).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('native code return true', () => {
      expect(Jig instanceof Code).to.equal(true)
      expect(Berry instanceof Code).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------
  // getOwnPropertyDescriptor
  // --------------------------------------------------------------------------

  describe('getOwnPropertyDescriptor', () => {
    it('returned undefined for code methods', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      CODE_METHODS.forEach(name => expect(Object.getOwnPropertyDescriptor(CA, name)).to.equal(undefined))
    })
  })

  // --------------------------------------------------------------------------
  // isExtensible
  // --------------------------------------------------------------------------

  describe('isExtensible', () => {
    it('returns true', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(Object.isExtensible(CA)).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------
  // preventExtensions
  // --------------------------------------------------------------------------

  describe('preventExtensions', () => {
    it('throws externally', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(() => Object.preventExtensions(CA)).to.throw('preventExtensions disabled')
    })

    // ------------------------------------------------------------------------

    it('throws internally', () => {
      const run = new Run()
      class A extends Jig { static f () { Object.preventExtensions(this) } }
      const CA = run.deploy(A)
      expect(() => CA.f()).to.throw('preventExtensions disabled')
    })
  })

  // --------------------------------------------------------------------------
  // setPrototypeOf
  // --------------------------------------------------------------------------

  describe('setPrototypeOf', () => {
    it('throws externally', () => {
      const run = new Run()
      class A extends Jig { }
      const CA = run.deploy(A)
      expect(() => Object.setPrototypeOf(CA, {})).to.throw('setPrototypeOf disabled')
    })

    // ------------------------------------------------------------------------

    it('throws internally', () => {
      const run = new Run()
      class A extends Jig { static f () { Object.setPrototypeOf(this, { }) } }
      const CA = run.deploy(A)
      expect(() => CA.f()).to.throw('setPrototypeOf disabled')
    })

    // ------------------------------------------------------------------------

    it('allowed on non-code child', () => {
      const run = new Run()
      class A extends Jig {}
      const CA = run.deploy(A)
      class B extends CA { }
      Object.setPrototypeOf(B, {})
    })
  })

  // --------------------------------------------------------------------------
  // Bindings
  // --------------------------------------------------------------------------

  describe('Bindings', () => {
    it('throws if delete', async () => {
      const run = new Run()
      class A extends Jig { static f (name) { delete this[name] } }
      const CA = run.deploy(A)
      await CA.sync()
      function test (A) {
        expect(() => A.f('location')).to.throw('Cannot delete location')
        expect(() => A.f('origin')).to.throw('Cannot delete origin')
        expect(() => A.f('nonce')).to.throw('Cannot delete nonce')
        expect(() => A.f('owner')).to.throw('Cannot delete owner')
        expect(() => A.f('satoshis')).to.throw('Cannot delete satoshis')
      }
      test(CA)
      const CA2 = await run.load(CA.location)
      test(CA2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('throws if set location, origin, or nonce', async () => {
      const run = new Run()
      class A extends Jig { static f (name, value) { this[name] = value } }
      const CA = run.deploy(A)
      await CA.sync()
      function test (A) {
        expect(() => A.f('location', '123')).to.throw('Cannot set location')
        expect(() => A.f('origin', '123')).to.throw('Cannot set origin')
        expect(() => A.f('nonce', 10)).to.throw('Cannot set nonce')
      }
      test(CA)
      const CA2 = await run.load(CA.location)
      test(CA2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('throws if define location, origin, or nonce', async () => {
      const run = new Run()
      class A extends Jig {
        static f (name, value) {
          const desc = { value, configurable: true, enumerable: true, writable: true }
          Object.defineProperty(this, name, desc)
        }
      }
      const CA = run.deploy(A)
      await CA.sync()
      function test (A) {
        expect(() => A.f('location', '123')).to.throw('Cannot set location')
        expect(() => A.f('origin', '123')).to.throw('Cannot set origin')
        expect(() => A.f('nonce', 10)).to.throw('Cannot set nonce')
      }
      test(CA)
      const CA2 = await run.load(CA.location)
      test(CA2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('set owner', async () => {
      const run = new Run()
      class A extends Jig { static f (owner) { this.owner = owner } }
      const CA = run.deploy(A)
      const pubkey = new PrivateKey().toPublicKey().toString()
      CA.f(pubkey)
      await CA.sync()
      function test (CA) { expect(CA.owner).to.equal(pubkey) }
      test(CA)
      const CA2 = await run.load(CA.location)
      test(CA2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('throws if set invalid owner', async () => {
      const run = new Run()
      class A extends Jig { static f (owner) { this.owner = owner } }
      const CA = run.deploy(A)
      await CA.sync()
      function test (CA) {
        expect(() => CA.f('123')).to.throw('Invalid owner')
        expect(() => CA.f(null)).to.throw('Invalid owner')
        expect(() => CA.f(undefined)).to.throw('Invalid owner')
        expect(() => CA.f(true)).to.throw('Invalid owner')
      }
      test(CA)
      const CA2 = await run.load(CA.location)
      test(CA2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('set satoshis', async () => {
      const run = new Run()
      class A extends Jig { static f (satoshis) { this.satoshis = satoshis } }
      const CA = run.deploy(A)
      CA.f(1000)
      await CA.sync()
      function test (CA) { expect(CA.satoshis).to.equal(1000) }
      test(CA)
      const CA2 = await run.load(CA.location)
      test(CA2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })

    // ------------------------------------------------------------------------

    it('throws if set invalid satoshis', async () => {
      const run = new Run()
      class A extends Jig { static f (satoshis) { this.satoshis = satoshis } }
      const CA = run.deploy(A)
      await CA.sync()
      function test (CA) {
        expect(() => CA.f('123')).to.throw()
        expect(() => CA.f(-1)).to.throw()
        expect(() => CA.f(1.5)).to.throw()
        expect(() => CA.f(Number.MAX_VALUE)).to.throw()
        expect(() => CA.f(Infinity)).to.throw()
        expect(() => CA.f()).to.throw()
        expect(() => CA.f(false)).to.throw()
      }
      test(CA)
      const CA2 = await run.load(CA.location)
      test(CA2)
      run.cache = new LocalCache()
      const CA3 = await run.load(CA.location)
      test(CA3)
    })
  })

  // --------------------------------------------------------------------------
  // Activate
  // --------------------------------------------------------------------------

  describe('activate', () => {
    it('deactivate removes bindings', async () => {
      const run = new Run()
      class A { }
      run.deploy(A)
      await run.sync()
      run.deactivate()
      expect(typeof A.location).to.equal('undefined')
      expect(typeof A.origin).to.equal('undefined')
      expect(typeof A.nonce).to.equal('undefined')
      expect(typeof A.owner).to.equal('undefined')
      expect(typeof A.satoshis).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it('activate adds bindings', async () => {
      const run = new Run()
      class A { }
      run.deploy(A)
      await run.sync()
      const location = A.location
      const origin = A.origin
      const nonce = A.nonce
      const owner = A.owner
      const satoshis = A.satoshis
      run.deactivate()
      run.activate()
      expect(A.location).to.equal(location)
      expect(A.origin).to.equal(origin)
      expect(A.nonce).to.equal(nonce)
      expect(A.owner).to.equal(owner)
      expect(A.satoshis).to.equal(satoshis)
    })
  })

  // --------------------------------------------------------------------------
  // Preinstall
  // --------------------------------------------------------------------------

  describe('preinstall', () => {
    it('creates code without bindings', () => {
      const C = Run.preinstall(class A { })
      expect(C instanceof Code).to.equal(true)
      _sudo(() => {
        expect(C.location).to.equal(undefined)
        expect(C.origin).to.equal(undefined)
        expect(C.nonce).to.equal(undefined)
        expect(C.owner).to.equal(undefined)
        expect(C.satoshis).to.equal(undefined)
      })
    })

    // ------------------------------------------------------------------------

    it('throws if read bindings', () => {
      const C = Run.preinstall(class A { })
      expect(() => C.location).to.throw('Cannot read location')
      expect(() => C.origin).to.throw('Cannot read origin')
      expect(() => C.nonce).to.throw('Cannot read nonce')
      expect(() => C.owner).to.throw('Cannot read owner')
      expect(() => C.satoshis).to.throw('Cannot read satoshis')
    })

    // ------------------------------------------------------------------------

    it('only preinstalls once', () => {
      class A { }
      const C1 = Run.preinstall(A)
      const C2 = Run.preinstall(A)
      expect(C1).to.equal(C2)
    })

    // ------------------------------------------------------------------------

    it('create jigs using preinstalled code', async () => {
      class A extends Jig { }
      const CA = Run.preinstall(A)
      new Run() // eslint-disable-line
      const a = new CA()
      await a.sync()
      expect(typeof A.location).to.equal('string')
      expect(typeof CA.location).to.equal('string')
    })

    // ------------------------------------------------------------------------

    it('pass as args preinstalled code', async () => {
      class A extends Jig { }
      const CA = Run.preinstall(A)
      new Run() // eslint-disable-line
      class B extends Jig { init (A) { this.A = A } }
      const b = new B(CA)
      await b.sync()
      expect(typeof A.location).to.equal('string')
      expect(typeof CA.location).to.equal('string')
    })

    // ------------------------------------------------------------------------

    it('use as code props preinstalled code', async () => {
      class A extends Jig { }
      const CA = Run.preinstall(A)
      const run = new Run()
      class B {}
      B.A = CA
      const CB = await run.deploy(B)
      await CB.sync()
      expect(typeof A.location).to.equal('string')
      expect(typeof CA.location).to.equal('string')
    })

    // ------------------------------------------------------------------------

    it('locks onto network once used', async () => {
      class A extends Jig { }
      const CA = Run.preinstall(A)
      const run = new Run()
      run.deploy(CA)
      await run.sync()
      const location = CA.location
      run.deactivate()
      expect(CA.location).to.equal(location)
    })
  })

  // --------------------------------------------------------------------------
  // uninstall
  // --------------------------------------------------------------------------

  describe('uninstall', () => {
    it('remove bindings and presets from local', async () => {
      const run = new Run()
      class A { }
      const C = run.deploy(A)
      await C.sync()
      run.uninstall(A)
      expect('presets' in A).to.equal(false)
      expect('location' in A).to.equal(false)
      expect('origin' in A).to.equal(false)
      expect('nonce' in A).to.equal(false)
      expect('owner' in A).to.equal(false)
      expect('satoshis' in A).to.equal(false)
      expect('location' in C).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('can be deployed again', async () => {
      const run = new Run()
      class A { }
      const C = run.deploy(A)
      run.uninstall(C)
      const D = run.deploy(A)
      await run.sync()
      expect(C.location).not.to.equal(D.location)
    })

    // ------------------------------------------------------------------------

    it('can use uninstalled code', async () => {
      const run = new Run()
      class A extends Jig { static f () { this.n = 1 } }
      const C = run.deploy(A)
      run.uninstall(A)
      C.auth()
      C.f()
      C.destroy()
      new C() // eslint-disable-line
      await run.sync()
    })

    // ------------------------------------------------------------------------

    it('throws for native code', () => {
      const run = new Run()
      expect(() => run.uninstall(Jig)).to.throw('Cannot uninstall native code')
      expect(() => run.uninstall(Berry)).to.throw('Cannot uninstall native code')
    })
  })
})

// ------------------------------------------------------------------------------------------------
