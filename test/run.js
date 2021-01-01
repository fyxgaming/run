/**
 * run.js
 *
 * Tests for lib/run.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('./env/run')
const unmangle = require('./env/unmangle')
const bsv = require('bsv')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Run
// ------------------------------------------------------------------------------------------------

describe('Run', () => {
  // --------------------------------------------------------------------------
  // util
  // --------------------------------------------------------------------------

  describe('util', () => {
    it('metadata', async () => {
      const run = new Run({ app: 'TestApp' })
      class A extends Jig { }
      run.deploy(A)
      await run.sync()
      const txid = A.location.slice(0, 64)
      const rawtx = await run.blockchain.fetch(txid)
      const metadata = Run.util.metadata(rawtx)

      const exec = [{ op: 'DEPLOY', data: [A.toString(), { deps: { Jig: { $jig: 0 } } }] }]
      expect(typeof metadata).to.equal('object')
      expect(metadata.version).to.equal(Run.protocol)
      expect(metadata.app).to.equal('TestApp')
      expect(metadata.in).to.equal(0)
      expect(metadata.ref).to.deep.equal(['native://Jig'])
      expect(metadata.out.length).to.equal(1)
      expect(metadata.del.length).to.equal(0)
      expect(metadata.cre).to.deep.equal([run.owner.address])
      expect(metadata.exec).to.deep.equal(exec)
    })
  })

  // --------------------------------------------------------------------------
  // _checkEnvironment
  // --------------------------------------------------------------------------

  describe('_checkEnvironment', () => {
    // ------------------------------------------------------------------------
    // node
    // ------------------------------------------------------------------------

    describe('node', () => {
      function testNodeVersion (version) {
        const oldVersionDesc = Object.getOwnPropertyDescriptor(process, 'version')
        try {
          Object.defineProperty(process, 'version', {
            value: version,
            writable: false,
            enumerable: true,
            configurable: true
          })
          unmangle(Run)._checkEnvironment()
        } finally {
          Object.defineProperty(process, 'version', oldVersionDesc)
        }
      }

      // ----------------------------------------------------------------------

      it('node 10-14 supported', () => {
        testNodeVersion('v10.15.3')
        testNodeVersion('v11.15.0')
        testNodeVersion('v12.3.1')
        testNodeVersion('v13.11.0')
        testNodeVersion('v14.15.1')
      })

      // ----------------------------------------------------------------------

      it('node >= 15 not supported', () => {
        const error = 'Run is not yet supported on Node 15 and above'
        expect(() => testNodeVersion('v15.3.0')).to.throw(error)
        expect(() => testNodeVersion('v16.0.0')).to.throw(error)
      })

      // ----------------------------------------------------------------------

      it('node <= 9 not supported', () => {
        const error = 'Run is supported only on Node v10 and above'
        expect(() => testNodeVersion('v9.11.2')).to.throw(error)
        expect(() => testNodeVersion('v8.16.0')).to.throw(error)
      })
    })

    // ------------------------------------------------------------------------
    // bsv
    // ------------------------------------------------------------------------

    describe('bsv', () => {
      function testBsvVersion (version) {
        const oldVersion = bsv.version
        try {
          bsv.version = version
          unmangle(Run)._checkEnvironment()
        } finally {
          bsv.version = oldVersion
        }
      }

      // ----------------------------------------------------------------------

      it('bsv 1.x does not throw an error', () => {
        expect(() => testBsvVersion('v1.5.4')).not.to.throw()
      })

      // ----------------------------------------------------------------------

      it('bsv 2.x throws an error', () => {
        const error = 'Run requires version 1.x of the bsv library'
        expect(() => testBsvVersion('2.0.0')).to.throw(error)
        expect(() => testBsvVersion('v2.0.0')).to.throw(error)
      })

      // ----------------------------------------------------------------------

      it('invalid bsv version throws an error', () => {
        const error = 'Run requires version 1.x of the bsv library'
        expect(() => testBsvVersion('0.1')).to.throw(error)
        expect(() => testBsvVersion(undefined)).to.throw(error)
      })
    })
  })
})

// ------------------------------------------------------------------------------------------------
