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
const { Code, Jig, Berry } = unmangle(Run)

// When in an error state, all actions fail

// Written Tests:
//
// Jig
//  - Code methods not present
//  - Can assign properties to code methods (only upgrade)
//  - Getter that sets
//  - Ownership: Create object, pass into another method, set on other jig, then set on current jig => fail
//
// Code
//  - defineProperty disabled
//  - getters and setters either allowed, or not allowed
//  - Code methods cannot be deleted, or redefined, either from inside or outside
//  - Code that was previously deployed, so a ref
//  - Cannot set to "presets" or "deps" in a static method, or "sealed"? Or maybe you can set sealed.

// Code functions are not available inside functions
// Unfiled
// Constructing Code objects inside... they would normally construct sandbox. How to do base?
//      Need for arb objects
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
// Async updates
// Sync
// - Sync a jig to gets its newer code. Test
// - Sync a code to gets a newer code prop. Test

// TODO Deploy
//  -Presets are assigned on locals, but not until synced
//  -Failures, reverts

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Methods available on all code instances
const CODE_METHODS = ['upgrade', 'sync', 'destroy', 'auth']

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
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
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

    // ------------------------------------------------------------------------

    it('initial bindings are unreadable', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(() => CA.location).to.throw('location is undetermined')
      expect(() => CA.origin).to.throw('origin is undetermined')
      expect(() => CA.nonce).to.throw('nonce is undetermined')
      expect(() => CA.owner).to.throw('owner is undetermined')
      expect(() => CA.satoshis).to.throw('satoshis is undetermined')
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
  // setPrototypeOf
  // --------------------------------------------------------------------------

  describe('setPrototypeOf', () => {
    it('throws if change externally', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      expect(() => Object.setPrototypeOf(CA, {})).to.throw()
    })

    // ------------------------------------------------------------------------

    it.skip('throws if change internally', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('allowed to change on non-code child', () => {
      const run = new Run()
      class A {}
      const CA = run.deploy(A)
      class B extends CA { }
      Object.setPrototypeOf(B, {})
    })
  })

  // --------------------------------------------------------------------------
  // Caller
  // --------------------------------------------------------------------------

  describe.skip('caller', () => {
    // TODO
  })

  // --------------------------------------------------------------------------
  // Activate
  // --------------------------------------------------------------------------

  describe.skip('activate', () => {
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
})

// ------------------------------------------------------------------------------------------------
