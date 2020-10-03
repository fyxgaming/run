const { expect } = require('chai')
/**
 * berry.js
 *
 * Tests for lib/kernel/berry.js
 */

const { describe, it, afterEach } = require('mocha')
const Run = require('../env/run')
const { Berry } = Run

// ------------------------------------------------------------------------------------------------
// Berry
// ------------------------------------------------------------------------------------------------

describe('Berry', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // pluck
  // --------------------------------------------------------------------------

  describe('pluck', () => {
    it('basic berry', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return new B() } }
      const CB = run.deploy(B)
      await run.sync()
      const b = await run.load('abc', { berry: CB })
      expect(b instanceof B).to.equal(true)
      expect(b.location).to.equal(CB.location + '_abc')
    })

    // ------------------------------------------------------------------------

    it('deploying berry', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return new B() } }
      const CB = run.deploy(B)
      const b = await run.load('abc', { berry: CB })
      expect(b instanceof B).to.equal(true)
      expect(() => b.location).to.throw()
    })

    // ------------------------------------------------------------------------

    it('undeployed berry', async () => {
      const run = new Run()
      class B extends Berry { static async pluck () { return new B() } }
      const b = await run.load('abc', { berry: B })
      expect(b instanceof B).to.equal(true)
      expect(() => b.location).to.throw()
    })

    // ------------------------------------------------------------------------

    it.skip('berry with parent', () => {
    // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('berry with deps', () => {
    // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('return immutable', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws for invalid path', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if return different class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if return child class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if return non-object', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if pluck Berry', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if create more than one', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if not async', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('caches future plucks', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // init
  // --------------------------------------------------------------------------

  describe('fetch', () => {
    it.skip('fetches raw transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('sandboxed', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('may fetch multiple transactions', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if not a transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if blockchain timeout', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // init
  // --------------------------------------------------------------------------

  describe('init', () => {
    it.skip('set properties', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('define properties', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('delete properties', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('get own properties', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set location', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define location', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set prototype', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if create outside pluck', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if create in a different plucker', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Method
  // --------------------------------------------------------------------------

  describe('Method', () => {
    it.skip('get', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('getOwnPropertyDescriptor', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if define', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if delete', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if set prototype', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Jig
  // --------------------------------------------------------------------------

  describe('Jig', () => {
    it.skip('assigns to jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('pass into jig method', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if use undeployed berry', () => {

    })
  })

  // --------------------------------------------------------------------------
  // Code
  // --------------------------------------------------------------------------

  describe('Code', () => {
    it.skip('assigns to code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('pass into code method', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if use undeployed berry', () => {

    })
  })

  // --------------------------------------------------------------------------
  // Sync
  // --------------------------------------------------------------------------

  describe('Sync', () => {
    // TODO
  })

  // --------------------------------------------------------------------------
  // Instanceof
  // --------------------------------------------------------------------------

  describe('instanceof', () => {
    it.skip('returns true for Berry', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('returns true for berry class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('returns true for parent class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('returns false for another class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('returns true for local class', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('berry class instanceof code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('cannot fake with setPrototypeOf', () => {

    })
  })

  // Tests
  // - not a jig - no auth, destroy, sync, etc.
  // - cannot be upgraded
  // - if dependencies are upgraded, when berry is loaded, it uses original
  // - instanceof authd, destroyd
  // - sync destroyed/authd berry in jig
})

// ------------------------------------------------------------------------------------------------
