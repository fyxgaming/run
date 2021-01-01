/**
 * run.js
 *
 * Tests for lib/run.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('./env/run')
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
})

// ------------------------------------------------------------------------------------------------
