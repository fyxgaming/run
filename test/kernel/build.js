/**
 * build.js
 *
 * Tests that check properties of the transactions RUN builds
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const bsv = require('bsv')
const Run = require('../env/run')
const asm = require('../../lib/extra/asm')
const { Jig } = Run

// ------------------------------------------------------------------------------------------------
// Build
// ------------------------------------------------------------------------------------------------

describe('Build', () => {
  // --------------------------------------------------------------------------
  // scripts
  // --------------------------------------------------------------------------

  describe('output scripts', () => {
    it('p2pkh scripts for address owners', async () => {
      const run = new Run()
      const address1 = run.owner.address
      const address2 = new bsv.PrivateKey().toAddress().toString()
      const tx = new Run.Transaction()
      class A extends Jig { init (owner) { this.owner = owner } }
      tx.update(() => new A(address2))
      const rawtx = await tx.export()
      const bsvtx = new bsv.Transaction(rawtx)
      const hash1 = new bsv.Address(address1).hashBuffer.toString('hex')
      const hash2 = new bsv.Address(address2).hashBuffer.toString('hex')
      const asm1 = `OP_DUP OP_HASH160 ${hash1} OP_EQUALVERIFY OP_CHECKSIG`
      const asm2 = `OP_DUP OP_HASH160 ${hash2} OP_EQUALVERIFY OP_CHECKSIG`
      expect(bsvtx.outputs[1].script.toHex()).to.equal(bsv.Script.fromASM(asm1).toHex())
      expect(bsvtx.outputs[2].script.toHex()).to.equal(bsv.Script.fromASM(asm2).toHex())
    })

    // ------------------------------------------------------------------------

    it('p2pkh scripts for pubkey owners', async () => {
      new Run() // eslint-disable-line
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const tx = new Run.Transaction()
      class A extends Jig { send (owner) { this.owner = owner } }
      const a = new A()
      await a.sync()
      tx.update(() => a.send(pubkey))
      const rawtx = await tx.export()
      const bsvtx = new bsv.Transaction(rawtx)
      const hash = new bsv.PublicKey(pubkey).toAddress().hashBuffer.toString('hex')
      const asm = `OP_DUP OP_HASH160 ${hash} OP_EQUALVERIFY OP_CHECKSIG`
      expect(bsvtx.outputs[1].script.toHex()).to.equal(bsv.Script.fromASM(asm).toHex())
    })

    // ------------------------------------------------------------------------

    it('custom scripts for custom locks', async () => {
      const run = new Run()
      class A extends Jig { static send (owner) { this.owner = owner } }
      class L {
        script () { return asm('OP_1 abcd') }
        domain () { return 100 }
      }
      L.deps = { asm: Run.extra.asm }
      const CA = run.deploy(A)
      await CA.sync()
      const tx = new Run.Transaction()
      tx.update(() => CA.send(new L()))
      const rawtx = await tx.export()
      const bsvtx = new bsv.Transaction(rawtx)
      expect(bsvtx.outputs[1].script.toHex()).to.equal(bsv.Script.fromASM('OP_1 abcd').toHex())
    })
  })

  // --------------------------------------------------------------------------
  // satoshis
  // --------------------------------------------------------------------------

  describe('satoshis', () => {
    it.skip('output satoshis are correct for 0', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('output satoshis are correct for below dust', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('output satoshis are correct for above dust', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // custom base
  // --------------------------------------------------------------------------

  describe('custom base', () => {
    it.skip('output scripts are correct for custom base', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('output satoshis are correct for custom base', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // app name
  // --------------------------------------------------------------------------

  describe('app name', () => {
    it.skip('utf8 app name is correctly set', () => {
      // TODO
      /*
      const run = hookRun(new Run({ app: 'biz' }))
      class A extends Jig { }
      await run.deploy(A)
      expect(tx.outputs[0].script.chunks[4].buf.toString('utf8')).to.equal('biz')
      */
    })

    // ------------------------------------------------------------------------

    it.skip('empty app name is correctly set', () => {
      // TODO
      /*
      const run = hookRun(new Run({ app: 'biz' }))
      class A extends Jig { }
      await run.deploy(A)
      expect(tx.outputs[0].script.chunks[4].buf.toString('utf8')).to.equal('biz')
      */
    })
  })

  // --------------------------------------------------------------------------
  // prefix
  // --------------------------------------------------------------------------

  describe('prefix', () => {
    it.skip('has run tag', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('has version', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // metadata
  // --------------------------------------------------------------------------

  describe('metadata', () => {
    it.skip('deploy', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('instantiate from ref', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('call method with berry ref', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('destroy code', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('auth jig', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('multiple actions', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
