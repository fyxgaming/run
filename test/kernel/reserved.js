/**
 * reserved.js
 *
 * Tests for reserved words
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// Reserved
// ------------------------------------------------------------------------------------------------

describe('Reserved', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // Deploy
  // --------------------------------------------------------------------------

  describe('Deploy', () => {
    // may override auth method on code
    // may override auth property on code
    // may override destroy method on code
    // may override destroy property on code

    // may override auth method on jig
    // may override auth property on jig
    // may override destroy method on jig
    // may override destroy property on jig

    it('throws if code has deps method', () => {
      const run = new Run()
      class A { static deps () { } }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has toString method', () => {
      const run = new Run()
      class A { static toString () { } }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has toString property', () => {
      const run = new Run()
      class A { }
      A.toString = 1
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has upgrade method', () => {
      const run = new Run()
      class A { static upgrade () { } }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has upgrade property', () => {
      const run = new Run()
      class A { }
      A.upgrade = function upgrade () { }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has sync method', () => {
      const run = new Run()
      class A { static sync () { } }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has sync property', () => {
      const run = new Run()
      class A { }
      A.sync = undefined
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has bindings methods', () => {
      const run = new Run()
      expect(() => run.deploy(class A extends Jig { static origin () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static location () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static nonce () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static owner () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static satoshis () { } })).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if jig has bindings methods', () => {
      const run = new Run()
      expect(() => run.deploy(class A extends Jig { origin () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { location () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { nonce () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { owner () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { satoshis () { } })).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if jig has sync method', () => {
      const run = new Run()
      expect(() => run.deploy(class A extends Jig { sync () { } })).to.throw()
    })

    // throws if reserved prop as method on code
    // throws if reserved prop as method on jig
    // throws if reserved prop as prop on code
    // throws if reserved prop as prop on jig

    // ------------------------------------------------------------------------

    it('throws if override jig methods', () => {
      const run = new Run()
      const error = 'Cannot override Jig methods or properties'
      expect(() => run.deploy(class A extends Jig { static [Symbol.hasInstance] () { } })).to.throw(error)
      expect(() => run.deploy(class A extends Jig { sync () { } })).to.throw(error)
      expect(() => run.deploy(class A extends Jig { origin () { } })).to.throw(error)
      expect(() => run.deploy(class A extends Jig { location () { } })).to.throw(error)
      expect(() => run.deploy(class A extends Jig { nonce () { } })).to.throw(error)
      expect(() => run.deploy(class A extends Jig { owner () { } })).to.throw(error)
      expect(() => run.deploy(class A extends Jig { satoshis () { } })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if presets has deps property', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { deps: {} } }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if presets has presets property', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { presets: {} } }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if presets has toString property', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { toString: function toString () { } } }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if presets has upgrade property', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { upgrade: undefined } }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if presets has sync property', () => {
      const run = new Run()
      const network = run.blockchain.network
      class A { }
      A.presets = { [network]: { sync: 1 } }
      expect(() => run.deploy(A)).to.throw()
    })
  })

  // --------------------------------------------------------------------------
  // Upgrade
  // --------------------------------------------------------------------------

  describe('Upgrade', () => {
    // may override auth method on code
    // may override auth property on code
    // may override destroy method on code
    // may override destroy property on code

    // may override auth method on jig
    // may override auth property on jig
    // may override destroy method on jig
    // may override destroy property on jig

    // throws if code has toString method
    // throws if code has toString property
    // throws if code has upgrade method
    // throws if code has upgrade property
    // throws if code has sync method
    // throws if code has sync property
    // throws if code has bindings

    // throws if jig has sync method
    // throws if jig has bindings

    // throws if reserved prop as method on code
    // throws if reserved prop as method on jig
    // throws if reserved prop as prop on code
    // throws if reserved prop as prop on jig

    it('throws if reserved', () => {
      const run = new Run()
      class A { }
      const CA = run.deploy(A)
      class B { }
      B.toString = 'hello'
      const error = 'Must not have any reserved words'
      expect(() => CA.upgrade(B)).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if override jig methods', () => {
      const run = new Run()
      function O () { }
      const CO = run.deploy(O)
      const error = 'Cannot override Jig methods or properties'
      expect(() => CO.upgrade(class A extends Jig { static [Symbol.hasInstance] () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { sync () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { origin () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { location () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { nonce () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { owner () { } })).to.throw(error)
      expect(() => CO.upgrade(class A extends Jig { satoshis () { } })).to.throw(error)
    })
  })

  // --------------------------------------------------------------------------
  // Method
  // --------------------------------------------------------------------------

  describe('Method', () => {
    // TODO

    // ------------------------------------------------------------------------

    it('throws if override jig methods', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        h () { this.sync = [] }

        i () { this.init = 'hello' }
      }
      const a = new A()
      expect(() => a.h()).to.throw('Cannot set sync')
      expect(() => a.i()).to.throw('Cannot set init')
    })

    // may set auth on code
    // may set destroy on code

    // may set auth on jig
    // may set destroy on jig

    // throws if set deps on code
    // Throws if set toString on code
    // Throws if define toString on code
    // Throws if set upgrade on code
    // Throws if define upgrade on code
    // Throws if set sync on code
    // Throws if define sync on code

    // Throws if set init on jig
    // Throws if define init on jig
    // Throws if set sync on jig
    // Throws if define sync on jig

    // throws if set reserved props on jig
    // throws if set reserved props on code
  })
})

// ------------------------------------------------------------------------------------------------
