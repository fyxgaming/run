/**
 * reserved.js
 *
 * Tests for reserved words
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, Berry, LocalCache } = Run

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
    it('may override bindings on non-jig', () => {
      const run = new Run()
      run.deploy(class A { location () { }})
      run.deploy(class A { origin () { }})
      run.deploy(class A { nonce () { }})
      run.deploy(class A { owner () { }})
      run.deploy(class A { satoshis () { }})
    })

    // ------------------------------------------------------------------------

    it('may override auth method on jig', async () => {
      const run = new Run()
      class A extends Jig { auth () { this.n = 1 } }
      const a = new A()
      a.auth()
      expect(a.n).to.equal(1)
      await run.sync()
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('may override destroy method on jig', async () => {
      const run = new Run()
      class A extends Jig { destroy () { this.destroyed = true; super.destroy() } }
      const a = new A()
      a.destroy()
      expect(a.destroyed).to.equal(true)
      await run.sync()
      expect(a.location.endsWith('_d0')).to.equal(true)
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      expect(a2.destroyed).to.equal(true)
      expect(a2.location.endsWith('_d0')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('may override non-location bindings on berry', () => {
      const run = new Run()
      run.deploy(class B extends Berry { origin () { } })
      run.deploy(class B extends Berry { nonce () { } })
      run.deploy(class B extends Berry { owner () { } })
      run.deploy(class B extends Berry { satoshis () { } })
    })

    // ------------------------------------------------------------------------

    it('may override sync method on berry', () => {
      const run = new Run()
      run.deploy(class B extends Berry { sync () { } })
    })

    // ------------------------------------------------------------------------

    it('may override auth method on berry', () => {
      const run = new Run()
      run.deploy(class B extends Berry { auth () { } })
    })

    // ------------------------------------------------------------------------

    it('may override destroy method on berry', () => {
      const run = new Run()
      run.deploy(class B extends Berry { destroy () { } })
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

    it('throws if code has auth method', () => {
      const run = new Run()
      class A { static auth () { } }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has auth property', () => {
      const run = new Run()
      class A { }
      A.auth = 1
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has destroy method', () => {
      const run = new Run()
      class A { static destroy () { } }
      expect(() => run.deploy(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has destroy property', () => {
      const run = new Run()
      class A { }
      A.destroy = 1
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
    it('may override auth method on jig', () => {
      const run = new Run()
      const O = run.deploy(class O extends Jig { })
      class A extends Jig { auth () { } }
      O.upgrade(A)
    })

    // ------------------------------------------------------------------------

    it('may override destroy method on jig', () => {
      const run = new Run()
      const O = run.deploy(class O extends Jig { })
      class A extends Jig { destroy () { } }
      O.upgrade(A)
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

    it('throws if code has auth method', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { static auth () { } }
      expect(() => O.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has auth property', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { }
      A.auth = []
      expect(() => O.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has destroy method', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { static destroy () { } }
      expect(() => O.upgrade(A)).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if code has destroy property', () => {
      const run = new Run()
      const O = run.deploy(class O { })
      class A { }
      A.destroy = 'false'
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
    it('throws if set auth on code', () => {
      const run = new Run()
      class A extends Jig { static f () { this.auth = 1 } }
      const C = run.deploy(A)
      expect(() => C.f()).to.throw('Cannot set auth')
    })

    // ------------------------------------------------------------------------

    it('throws if set destroy on code', () => {
      const run = new Run()
      class A extends Jig { static f () { this.destroy = undefined } }
      const C = run.deploy(A)
      expect(() => C.f()).to.throw('Cannot set destroy')
    })

    // ------------------------------------------------------------------------

    it('may set presets on code', () => {
      const run = new Run()
      class A extends Jig { static f () { this.presets = 'abc' } }
      const C = run.deploy(A)
      C.f()
      expect(C.presets).to.equal('abc')
    })

    // ------------------------------------------------------------------------

    it('may set auth property on jig', async () => {
      const run = new Run()
      class A extends Jig { f () { this.auth = 1 } }
      const a = new A()
      a.f()
      expect(a.auth).to.equal(1)
      await run.sync()
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      expect(a2.auth).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('may set destroy property on jig', async () => {
      const run = new Run()
      function destroy () { }
      class A extends Jig { f () { this.destroy = destroy } }
      A.deps = { destroy }
      const a = new A()
      a.f()
      expect(a.destroy instanceof Run.Code).to.equal(true)
      await run.sync()
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      expect(a2.destroy instanceof Run.Code).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set deps on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set toString on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define toString on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set upgrade on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define upgrade on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set sync on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define sync on code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set init on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define init on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set sync on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define sync on jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if set reserved props on code', () => {
      const run = new Run()
      class A extends Jig { static f (x) { this[x] = 1 } }
      const C = run.deploy(A)
      expect(() => C.f('encryption')).to.throw()
      expect(() => C.f('latest')).to.throw()
      expect(() => C.f('load')).to.throw()
      expect(() => C.f('blocktime')).to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if set reserved props on jig', () => {
      new Run() // eslint-disable-line
      class A extends Jig { f (x) { this[x] = 1 } }
      const a = new A()
      expect(() => a.f('encryption')).to.throw()
      expect(() => a.f('latest')).to.throw()
      expect(() => a.f('load')).to.throw()
      expect(() => a.f('blocktime')).to.throw()
    })
  })

  // --------------------------------------------------------------------------
  // Pluck
  // --------------------------------------------------------------------------

  describe('Pluck', () => {
    it.skip('may set sync in pluck', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may set auth in pluck', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may set destroy in pluck', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may set non-location bindings in pluck', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set location in pluck', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set reserved props in pluck', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
