/**
 * reserved.js
 *
 * Tests for reserved words
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, Berry } = Run

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
    it.skip('may override auth method on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override auth property on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override destroy method on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override destroy property on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override bindings on non-jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override auth method on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override auth property on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override destroy method on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override destroy property on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override non-location bindings on berry', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override sync method on berry', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override auth method on berry', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override destroy method on berry', () => {
      // tODO
    })

    // ------------------------------------------------------------------------

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

    // ------------------------------------------------------------------------

    it('throws if reserved prop as method on code', () => {
      const run = new Run()
      expect(() => run.deploy(class A extends Jig { static latest () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static recent () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static mustBeLatest () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static mustBeRecent () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static encryption () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static blockhash () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static blocktime () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static blockheight () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static load () { } })).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if reserved prop as method on jig', () => {
      const run = new Run()
      expect(() => run.deploy(class A extends Jig { latest () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { recent () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { mustBeLatest () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { mustBeRecent () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { encryption () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { blockhash () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { blocktime () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { blockheight () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { load () { } })).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if reserved prop as prop on code', () => {
      const run = new Run()
      class A { }
      A.latest = 1
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if override hasInstance on code', () => {
      const run = new Run()
      expect(() => run.deploy(class A { static [Symbol.hasInstance] () { } })).to.throw()
      expect(() => run.deploy(class A extends Jig { static [Symbol.hasInstance] () { } })).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if override location on berry', () => {
      const run = new Run()
      expect(() => run.deploy(class A extends Berry { location () { } })).to.throw()
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
    it.skip('may override auth method on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override auth property on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override destroy method on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override destroy property on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override auth method on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override auth property on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override destroy method on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may override destroy property on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if code has deps method', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { static deps () { } }
      expect(() => O.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has toString method', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { static toString () { } }
      expect(() => O.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has toString property', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { }
      A.toString = 1
      expect(() => O.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has upgrade method', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { static upgrade () { } }
      expect(() => O.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has upgrade property', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { }
      A.upgrade = function upgrade () { }
      expect(() => O.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has sync method', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { static sync () { } }
      expect(() => O.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has sync property', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { }
      A.sync = undefined
      expect(() => O.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has bindings methods', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      expect(() => O.upgrade(class A extends Jig { static origin () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static location () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static nonce () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static owner () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static satoshis () { } })).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if jig has bindings methods', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      expect(() => O.upgrade(class A extends Jig { origin () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { location () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { nonce () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { owner () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { satoshis () { } })).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if jig has sync method', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      expect(() => O.upgrade(class A extends Jig { sync () { } })).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if reserved prop as method on code', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      expect(() => O.upgrade(class A extends Jig { static latest () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static recent () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static mustBeLatest () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static mustBeRecent () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static encryption () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static blockhash () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static blocktime () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static blockheight () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static load () { } })).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if reserved prop as method on jig', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      expect(() => O.upgrade(class A extends Jig { latest () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { recent () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { mustBeLatest () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { mustBeRecent () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { encryption () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { blockhash () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { blocktime () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { blockheight () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { load () { } })).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if reserved prop as prop on code', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { }
      A.latest = 1
      expect(() => O.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if override hasInstance on code', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      expect(() => O.upgrade(class A { static [Symbol.hasInstance] () { } })).to.throw()
      expect(() => O.upgrade(class A extends Jig { static [Symbol.hasInstance] () { } })).to.throw()
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
    // may set presets on code

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
