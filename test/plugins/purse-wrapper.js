/**
 * purse-wrapper.js
 *
 * Tests for lib/plugins/purse-wrapper.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
require('chai').use(require('chai-as-promised'))
const { stub } = require('sinon')
const bsv = require('bsv')
const Run = require('../env/run')
const { PurseWrapper } = Run.plugins
const unmangle = require('../env/unmangle')
const Log = unmangle(unmangle(Run)._Log)

// ------------------------------------------------------------------------------------------------
// PurseWrapper
// ------------------------------------------------------------------------------------------------

describe('PurseWrapper', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('wraps methods when extended', () => {
      class MyPurse extends PurseWrapper {
        pay () { }
        broadcast () { }
        cancel () { }
      }
      const wrapper = new MyPurse()
      expect(wrapper.pay).not.to.equal(MyPurse.prototype.pay)
      expect(wrapper.broadcast).not.to.equal(MyPurse.prototype.broadcast)
      expect(wrapper.cancel).not.to.equal(MyPurse.prototype.cancel)
    })

    // ------------------------------------------------------------------------

    it('wraps methods when passed in', () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      expect(wrapper.pay).not.to.equal(purse.pay)
      expect(wrapper.broadcast).not.to.equal(purse.broadcast)
      expect(wrapper.cancel).not.to.equal(purse.cancel)
    })

    // ------------------------------------------------------------------------

    it('supports no broadcast method', () => {
      class MyPurse extends PurseWrapper {
        pay () { }
        cancel () { }
      }
      const wrapper = new MyPurse()
      expect(wrapper.pay).not.to.equal(MyPurse.prototype.pay)
      expect(typeof wrapper.broadcast).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it('supports no cancel method', () => {
      const purse = stub({ pay: () => {}, broadcast: () => {} })
      const wrapper = new PurseWrapper(purse)
      expect(wrapper.pay).not.to.equal(purse.pay)
      expect(typeof wrapper.cancel).to.equal('undefined')
    })
  })

  // --------------------------------------------------------------------------
  // pay
  // --------------------------------------------------------------------------

  describe('pay', () => {
    it('wraps call', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const rawtx = new bsv.Transaction().toString()
      const paidtx = new bsv.Transaction().toString()
      purse.pay.returns(paidtx)
      const parents = []
      const resp = await wrapper.pay(rawtx, parents)
      expect(resp).to.equal(paidtx)
      expect(purse.pay.calledWith(rawtx, parents)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('logs call', async () => {
      const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
      Log._logger = logger
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const rawtx = new bsv.Transaction().toString()
      const paidtx = new bsv.Transaction().toString()
      purse.pay.returns(paidtx)
      const parents = []
      await wrapper.pay(rawtx, parents)
      expect(logger.info.args.some(args => args.join(' ').includes('[Purse] Pay'))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('logs performance in debug', async () => {
      const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
      Log._logger = logger
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const rawtx = new bsv.Transaction().toString()
      const paidtx = new bsv.Transaction().toString()
      purse.pay.returns(paidtx)
      const parents = []
      await wrapper.pay(rawtx, parents)
      expect(logger.debug.args.some(args => args.join(' ').includes('[Purse] Pay (end)'))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('validates transaction', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      await expect(wrapper.pay(null, [])).to.be.rejectedWith('Invalid tx to pay')
      await expect(wrapper.pay(undefined, [])).to.be.rejectedWith('Invalid tx to pay')
      await expect(wrapper.pay('abc', [])).to.be.rejectedWith('Invalid tx to pay')
      await expect(wrapper.pay(true, [])).to.be.rejectedWith('Invalid tx to pay')
    })

    // ------------------------------------------------------------------------

    it('accepts bsv transaction', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const rawtx = new bsv.Transaction().toString()
      const paidtx = new bsv.Transaction().toString()
      purse.pay.returns(paidtx)
      const parents = []
      await wrapper.pay(new bsv.Transaction(rawtx), parents)
      expect(purse.pay.calledWith(rawtx, parents)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it.skip('validates parents', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('supports no parents', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const rawtx = new bsv.Transaction().toString()
      const paidtx = new bsv.Transaction().toString()
      purse.pay.returns(paidtx)
      await wrapper.pay(rawtx)
      expect(purse.pay.args[0][0]).to.equal(rawtx)
    })

    // ------------------------------------------------------------------------

    it.skip('validates response', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // broadcast
  // --------------------------------------------------------------------------

  describe('broadcast', () => {
    it('wraps call', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const rawtx = new bsv.Transaction().toString()
      await wrapper.broadcast(rawtx)
      expect(purse.broadcast.calledWith(rawtx)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('logs call', async () => {
      const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
      Log._logger = logger
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const rawtx = new bsv.Transaction().toString()
      await wrapper.broadcast(rawtx)
      expect(logger.info.args.some(args => args.join(' ').includes('[Purse] Broadcast'))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('logs performance in debug', async () => {
      const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
      Log._logger = logger
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const rawtx = new bsv.Transaction().toString()
      await wrapper.broadcast(rawtx)
      expect(logger.debug.args.some(args => args.join(' ').includes('[Purse] Broadcast (end)'))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('validates transaction', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      await expect(wrapper.broadcast(undefined)).to.be.rejectedWith('Invalid tx to broadcast')
      await expect(wrapper.broadcast(null)).to.be.rejectedWith('Invalid tx to broadcast')
      await expect(wrapper.broadcast('0000')).to.be.rejectedWith('Invalid tx to broadcast')
      await expect(wrapper.broadcast(123)).to.be.rejectedWith('Invalid tx to broadcast')
    })
  })

  // --------------------------------------------------------------------------
  // cancel
  // --------------------------------------------------------------------------

  describe('cancel', () => {
    it('wraps call', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const rawtx = new bsv.Transaction().toString()
      await wrapper.cancel(rawtx)
      expect(purse.cancel.calledWith(rawtx)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('logs call', async () => {
      const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
      Log._logger = logger
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const rawtx = new bsv.Transaction().toString()
      await wrapper.cancel(rawtx)
      expect(logger.info.args.some(args => args.join(' ').includes('[Purse] Cancel'))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('logs performance in debug', async () => {
      const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
      Log._logger = logger
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const rawtx = new bsv.Transaction().toString()
      await wrapper.cancel(rawtx)
      expect(logger.debug.args.some(args => args.join(' ').includes('[Purse] Cancel (end)'))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('validates transaction', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      await expect(wrapper.cancel(undefined)).to.be.rejectedWith('Invalid tx to cancel')
      await expect(wrapper.cancel(null)).to.be.rejectedWith('Invalid tx to cancel')
      await expect(wrapper.cancel('0000')).to.be.rejectedWith('Invalid tx to cancel')
      await expect(wrapper.cancel(123)).to.be.rejectedWith('Invalid tx to cancel')
    })
  })

  // --------------------------------------------------------------------------
  // send
  // --------------------------------------------------------------------------

  describe('send', () => {
    it('makes payment', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      purse.pay.callsFake(rawtx => rawtx)
      const address = new bsv.PrivateKey().toAddress().toString()
      const script = bsv.Script.fromAddress(address).toHex()
      await wrapper.send(script, 100)
      const paidtx = purse.pay.returnValues[0]
      expect(new bsv.Transaction(paidtx).outputs[0].script.toHex()).to.equal(script)
      expect(new bsv.Transaction(paidtx).outputs[0].satoshis).to.equal(100)
      expect(purse.broadcast.calledWith(paidtx)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('calls cancel if broadcast fails', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      let rawtx = null
      purse.pay.callsFake(x => { rawtx = x; return x })
      const address = new bsv.PrivateKey().toAddress().toString()
      const script = bsv.Script.fromAddress(address).toHex()
      purse.broadcast.throws(new Error('abc'))
      await expect(wrapper.send(script, 100)).to.be.rejectedWith('abc')
      expect(purse.cancel.calledWith(rawtx)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('swallows cancel if broadcast fails', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      purse.pay.callsFake(rawtx => rawtx)
      const address = new bsv.PrivateKey().toAddress().toString()
      const script = bsv.Script.fromAddress(address).toHex()
      purse.broadcast.throws(new Error('abc'))
      purse.cancel.throws(new Error('def'))
      await expect(wrapper.send(script, 100)).to.be.rejectedWith('abc')
    })

    // ------------------------------------------------------------------------

    it('logs call', async () => {
      const logger = stub({ info: x => x, warn: x => x, error: x => x, debug: x => x })
      Log._logger = logger
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      purse.pay.callsFake(rawtx => rawtx)
      const address = new bsv.PrivateKey().toAddress().toString()
      const script = bsv.Script.fromAddress(address).toHex()
      await wrapper.send(script, 100)
      expect(logger.info.args.some(args => args.join(' ').includes(`[Purse] Send ${script} 100`))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('accepts address', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      purse.pay.callsFake(rawtx => rawtx)
      const address = new bsv.PrivateKey().toAddress().toString()
      await wrapper.send(address, 100)
      const paidtx = purse.pay.returnValues[0]
      expect(new bsv.Transaction(paidtx).outputs[0].script.toAddress().toString()).to.equal(address)
      expect(purse.broadcast.calledWith(paidtx)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('accepts bsv address', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      purse.pay.callsFake(rawtx => rawtx)
      const address = new bsv.PrivateKey().toAddress().toString()
      await wrapper.send(new bsv.Address(address), 100)
      const paidtx = purse.pay.returnValues[0]
      expect(new bsv.Transaction(paidtx).outputs[0].script.toAddress().toString()).to.equal(address)
      expect(purse.broadcast.calledWith(paidtx)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('accepts bsv script', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      purse.pay.callsFake(rawtx => rawtx)
      const address = new bsv.PrivateKey().toAddress().toString()
      const bsvscript = bsv.Script.fromAddress(address)
      await wrapper.send(bsvscript, 100)
      const paidtx = purse.pay.returnValues[0]
      expect(new bsv.Transaction(paidtx).outputs[0].script.toHex()).to.equal(bsvscript.toHex())
      expect(purse.broadcast.calledWith(paidtx)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('throws if invalid script', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      await expect(wrapper.send(null, 100)).to.be.rejectedWith('Invalid script')
      await expect(wrapper.send('zzz', 100)).to.be.rejectedWith('Invalid script')
      await expect(wrapper.send(undefined, 100)).to.be.rejectedWith('Invalid script')
      await expect(wrapper.send({}, 100)).to.be.rejectedWith('Invalid script')
    })

    // ------------------------------------------------------------------------

    it('throws if invalid satoshis', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      const address = new bsv.PrivateKey().toAddress().toString()
      const script = bsv.Script.fromAddress(address).toHex()
      await expect(wrapper.send(script, undefined)).to.be.rejectedWith('Invalid satoshis')
      await expect(wrapper.send(script, null)).to.be.rejectedWith('Invalid satoshis')
      await expect(wrapper.send(script, -100)).to.be.rejectedWith('Invalid satoshis')
      await expect(wrapper.send(script, 1.5)).to.be.rejectedWith('Invalid satoshis')
      await expect(wrapper.send(script, {})).to.be.rejectedWith('Invalid satoshis')
    })
  })

  // --------------------------------------------------------------------------
  // setWrappingEnabled
  // --------------------------------------------------------------------------

  describe('setWrappingEnabled', () => {
    it('disable', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      wrapper.setWrappingEnabled(false)
      await wrapper.pay(null, null)
    })

    // ------------------------------------------------------------------------

    it('reenable', async () => {
      const purse = stub({ pay: () => {}, broadcast: () => {}, cancel: () => {} })
      const wrapper = new PurseWrapper(purse)
      wrapper.setWrappingEnabled(false)
      wrapper.setWrappingEnabled(true)
      await expect(wrapper.pay(null, null)).to.be.rejected
    })
  })
})

// ------------------------------------------------------------------------------------------------
