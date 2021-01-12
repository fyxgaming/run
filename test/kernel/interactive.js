/**
 * interactive.js
 *
 * Tests for the interactive code property
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig } = Run
const { LocalCache } = Run.plugins

// ------------------------------------------------------------------------------------------------
// Interactive
// ------------------------------------------------------------------------------------------------

describe('Interactive', () => {
  // --------------------------------------------------------------------------
  // Deploy
  // --------------------------------------------------------------------------
  describe('Deploy', () => {
    it('interactive by default', async () => {
      const run = new Run()
      class A extends Jig { static f (B) { this.B = B } }
      class B { }
      const CB = run.deploy(B)
      const CA = run.deploy(A)
      CA.f(CB)
      await run.sync()
      await run.load(CA.location)
      run.cache = new LocalCache()
      await run.load(CA.location)
    })

    // ------------------------------------------------------------------------

    it('interactive set to true', async () => {
      const run = new Run()
      class A extends Jig { static f (B) { this.B = B } }
      class B { }
      A.interactive = true
      B.interactive = true
      const CA = run.deploy(A)
      const CB = run.deploy(B)
      CA.f(CB)
      await run.sync()
      await run.load(CA.location)
      run.cache = new LocalCache()
      await run.load(CA.location)
    })

    // ------------------------------------------------------------------------

    it('non-interactive', async () => {
      const run = new Run()
      class A extends Jig { static f (B) { this.x = B.name } }
      class B { }
      A.interactive = false
      const CB = run.deploy(B)
      const CA = run.deploy(A)
      await run.sync()
      expect(() => CA.f(CB)).to.throw('A is not permitted to interact with B')
    })
  })

  // --------------------------------------------------------------------------
  // Upgrade
  // --------------------------------------------------------------------------

  describe('Upgrade', () => {
    it('become interactive', async () => {
      const run = new Run()
      class A extends Jig { static f (B) { this.x = B.name } }
      class B { }
      A.interactive = false
      const CB = run.deploy(B)
      const CA = run.deploy(A)
      await run.sync()
      expect(() => CA.f(CB)).to.throw('A is not permitted to interact with B')
      class A2 extends Jig { static f (B) { this.x = B.name } }
      A2.interactive = true
      CA.upgrade(A2)
      CA.f(B)
      await CA.sync()
      expect(CA.x).to.equal('B')
    })

    // ------------------------------------------------------------------------

    it('become interactive in same transaction', async () => {
      const run = new Run()
      class A extends Jig { static f (B) { this.x = B.name } }
      class B { }
      A.interactive = false
      const CB = run.deploy(B)
      const CA = run.deploy(A)
      await run.sync()
      expect(() => CA.f(CB)).to.throw('A is not permitted to interact with B')
      class A2 extends Jig { static f (B) { this.x = B.name } }
      A2.interactive = true
      run.transaction(() => {
        CA.upgrade(A2)
        CA.f(B)
      })
      await CA.sync()
      expect(CA.x).to.equal('B')
    })

    // ------------------------------------------------------------------------

    it('become non-interactive', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Method
  // --------------------------------------------------------------------------

  describe('Method', () => {
    it('set to interactive', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('define non-interactive', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('delete to become interactive', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Non-interactivity
  // --------------------------------------------------------------------------

  describe('Non-interactivity', () => {
    it('pass self as parameter', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('pass instance as parameter', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('pass base class as parameter', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('pass dependency as parameter', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('pass native code as parameter', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('atomically swap two instances', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('atomically swap a class and an instance', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('call methods on class and a dependency instance', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('add dependencies in method', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('add dependencies in upgrade', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('upgrade and deploy new dependency', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('use dependency with non-dependency inside', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('call non-dependency with reference before non-interactive upgrade', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('use non-dependency if upgrade to make interactive', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('use non-dependency if call method to make interactive', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if use dependency removed in transaction due to method', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if use dependency removed in transaction due to upgrade', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if use dependency removed in transaction due to upgrade sync', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if call method on non-dependency', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if deploy while non-interactive', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if deploy code that extends without extending', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if delete non-dependency instance', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if call method on dependency with non-dependency parameter', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if dependency is more restricted than self', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if spend non-dependency to update', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if mark non-interactive in method that uses non-dependency', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if non-interactive in update to transaction', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Use cases
  // --------------------------------------------------------------------------

  describe('Use cases', () => {
    it('mint non-interactive tokens', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('combine non-interactive tokens', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('batch send interactive tokens', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('send token from interactive jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if use different two tokens that are not-interactive', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if send from non-interactive jig', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Misc
  // --------------------------------------------------------------------------

  describe('Misc', () => {
    it('jigs cannot set interactive property', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('berries cannot set interactive property', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
