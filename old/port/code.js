/**
 * code.js
 *
 * Tests for lib/kernel/code.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../../test/env/config')

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

describe('Code', () => {
  describe('presets', () => {
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
    // TODO: Check records

    it('deploys a class and syncs it', async () => {
      const run = new Run()
      class A {}
      await run.deploy(A)
      const A2 = await run.load(A.location)
      expect(A2.toString()).to.equal(A.toString())
      expect(A2.origin).to.equal(A.origin)
      expect(A2.location).to.equal(A.location)
      console.log(A2)
    })

    it.only('publishes after dependent transaction', async () => {
      const run = new Run()

      class A {}
      class B extends A { }
      A.B = B

      await run.deploy(A)

      const t0 = new Date()
      const A2 = await run.load(A.location)
      const B2 = await run.load(B.location)
      console.log(new Date() - t0)

      class C extends B2 { }
      await run.deploy(C)

      // Deploy C fails
      console.log(C.location, A2)
    })
  })
})

// ------------------------------------------------------------------------------------------------
