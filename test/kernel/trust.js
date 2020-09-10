/**
 * trust.js
 *
 * Tests for loading trusted and untrusted code
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Trust
// ------------------------------------------------------------------------------------------------

describe('Trust', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('throws if invalid', () => {
      expect(() => new Run({ trust: null })).to.throw('Not trustable')
      expect(() => new Run({ trust: {} })).to.throw('Not trustable')
      expect(() => new Run({ trust: 'abc' })).to.throw('Not trustable')
      expect(() => new Run({ trust: '0000000000000000000000000000000000000000000000000000000000000000_o0' })).to.throw('Not trustable')
      expect(() => new Run({ trust: '**' })).to.throw('Not trustable')
    })
  })

  // --------------------------------------------------------------------------
  // trust
  // --------------------------------------------------------------------------

  describe('trust', () => {
    it('trust *', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      const run2 = new Run({ trust: [] })
      run2.cache = new LocalCache()
      await expect(run2.load(A.location)).to.be.rejectedWith('Cannot load untrusted code')
      run2.trust('*')
      await run2.load(A.location)
    })

    // ------------------------------------------------------------------------

    it('trust txid', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      const run2 = new Run({ trust: [] })
      run2.cache = new LocalCache()
      await expect(run2.load(A.location)).to.be.rejectedWith('Cannot load untrusted code')
      run2.trust(A.location.slice(0, 64))
      await run2.load(A.location)
    })

    // ------------------------------------------------------------------------

    it('throws if invalid', () => {
      const run = new Run()
      expect(() => run.trust(null)).to.throw('Not trustable')
      expect(() => run.trust({})).to.throw('Not trustable')
      expect(() => run.trust('abc')).to.throw('Not trustable')
      expect(() => run.trust('0000000000000000000000000000000000000000000000000000000000000000_o0')).to.throw('Not trustable')
      expect(() => run.trust('')).to.throw('Not trustable')
    })
  })

  // --------------------------------------------------------------------------
  // Trusted Code
  // --------------------------------------------------------------------------

  describe('Trusted Code', () => {
    it('imports trusted', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      const run2 = new Run({ trust: A.location.slice(0, 64) })
      const rawtx = await run.blockchain.fetch(A.location.slice(0, 64))
      await run2.import(rawtx)
    })

    // ------------------------------------------------------------------------

    it('loads via import trusted', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      const run2 = new Run({ trust: A.location.slice(0, 64) })
      run2.cache = new LocalCache()
      await run2.load(A.location)
    })

    // ------------------------------------------------------------------------

    it('loads via cache trusted', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      const run2 = new Run({ trust: [] })
      run2.trust(A.location.slice(0, 64))
      await run2.load(A.location)
    })
  })

  // --------------------------------------------------------------------------
  // Dependencies
  // --------------------------------------------------------------------------

  describe ('Dependencies', () => {
    it('imports dependencies if trusted', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      const B = run.deploy(class B extends A { })
      await run.sync()
      const run2 = new Run({ trust: [] })
      run2.trust(B.location.slice(0, 64))
      run2.cache = new LocalCache()
      const rawtx = await run2.blockchain.fetch(B.location.slice(0, 64))
      await run2.import(rawtx)
    })

    // ------------------------------------------------------------------------

    it('loads dependencies if trusted', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      const B = run.deploy(class B extends A { })
      await run.sync()
      const run2 = new Run({ trust: [] })
      run2.trust(B.location.slice(0, 64))
      run2.cache = new LocalCache()
      await run2.load(B.location)
    })

    // ------------------------------------------------------------------------

    it('trusts dependencies if trusted', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      const B = run.deploy(class B extends A { })
      await run.sync()
      const run2 = new Run({ trust: [] })
      run2.trust(B.location.slice(0, 64))
      run2.cache = new LocalCache()
      await run2.load(B.location)
      await run2.load(A.location)
    })
  })

  // --------------------------------------------------------------------------
  // Trust all
  // --------------------------------------------------------------------------

  describe('Trust All Code', () => {
    it('imports when trust all', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      const run2 = new Run({ trust: '*' })
      const rawtx = await run.blockchain.fetch(A.location.slice(0, 64))
      await run2.import(rawtx)
    })

    // ------------------------------------------------------------------------

    it('loads via import when trust all', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      const run2 = new Run({ trust: ['*'] })
      run2.cache = new LocalCache()
      await run2.load(A.location)
    })

    // ------------------------------------------------------------------------

    it('loads via cache when trust all', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      const run2 = new Run({ trust: [] })
      run2.trust('*')
      await run2.load(A.location)
    })
  })

  // --------------------------------------------------------------------------
  // Untrusted
  // --------------------------------------------------------------------------

  describe('Untrusted Code', () => {
    it('throws if untrusted import', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      const run2 = new Run({ trust: [] })
      const rawtx = await run.blockchain.fetch(A.location.slice(0, 64))
      await expect(run2.import(rawtx)).to.be.rejectedWith('Cannot load untrusted code')
    })

    // ------------------------------------------------------------------------

    it('throws if untrusted load via import', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      const run2 = new Run({ trust: [] })
      run2.cache = new LocalCache()
      await expect(run2.load(A.location)).to.be.rejectedWith('Cannot load untrusted code')
    })

    // ------------------------------------------------------------------------

    it('loads untrusted via cache', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      const run2 = new Run({ trust: [] })
      await run2.load(A.location)
    })
  })

  // --------------------------------------------------------------------------
  // Misc
  // --------------------------------------------------------------------------

  describe('Misc', () => {
    it('load untrusted with trust option', async () => {
      const run = new Run({ trust: [] })
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      await run.load(A.location)
      const run2 = new Run({ trust: [] })
      await run2.load(A.location, { trust: true })
      await run2.load(A.location)
    })

    // ------------------------------------------------------------------------

    it('import untrusted with trust option', async () => {
      const run = new Run({ trust: [] })
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      await run.load(A.location)
      const run2 = new Run({ trust: [] })
      const rawtx = await run.blockchain.fetch(A.location.slice(0, 64))
      await run2.import(rawtx, { trust: true })
      await run2.import(rawtx)
    })

    // ------------------------------------------------------------------------

    it('deploy trusts', async () => {
      const run = new Run({ trust: [] })
      const A = run.deploy(class A extends Jig { })
      await run.sync()
      await run.load(A.location)
    })

    // ------------------------------------------------------------------------

    it('upgrade trusts', async () => {
      const run = new Run({ trust: [] })
      const A = run.deploy(class A extends Jig { })
      A.upgrade(class B extends Jig { })
      await run.sync()
      await run.load(A.location)
    })

    // ------------------------------------------------------------------------

    it('trusted code copies to new run instance', async () => {
      const run = new Run({ trust: [] })
      const A = run.deploy(class A extends Jig { })
      A.upgrade(class B extends Jig { })
      await run.sync()
      const run2 = new Run()
      await run2.load(A.location)
    })
  })
})

// ------------------------------------------------------------------------------------------------
