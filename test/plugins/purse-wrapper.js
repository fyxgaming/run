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

    it.skip('logs call', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs performance in debug', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('accepts bsv transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates parents', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('supports no parents', () => {
      // TODO
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

    it.skip('logs call', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs performance in debug', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates transaction', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // cancel
  // --------------------------------------------------------------------------

  describe('cancel', () => {
    it.skip('wraps call', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs call', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs performance in debug', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('validates transaction', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // send
  // --------------------------------------------------------------------------

  describe('send', () => {
    it.skip('makes payment', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('calls pay and broadcast', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('logs call', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('accepts address', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('accepts bsv address', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('accepts bsv script', () => {
      // TODO
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
