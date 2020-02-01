const { describe, it } = require('mocha')
const { expect } = require('chai')
const Location = require('../lib/location')

const txid = '98244c0b51c1af3c541d901ce4bfcc05041dc8e4e80747ac5f0084e81bda339b'
const badHexTxid = '98244c0b51c1af3c541d901ce4bfcc05???dc8e4e80747ac5f0084e81bda339b'
const tempTxid = '????????????????????????????????????????????????5f0084e81bda339b'

describe('Location', () => {
  describe('parse', () => {
    it('should parse valid locations', () => {
      expect(Location.parse('_o0')).to.deep.equal({ vout: 0 })
      expect(Location.parse('_i1')).to.deep.equal({ vin: 1 })
      expect(Location.parse('_r2')).to.deep.equal({ vref: 2 })
      expect(Location.parse(`${txid}_o0`)).to.deep.equal({ txid, vout: 0 })
      expect(Location.parse(`${txid}_i1`)).to.deep.equal({ txid, vin: 1 })
      expect(Location.parse(`${txid}_r6000000000`)).to.deep.equal({ txid, vref: 6000000000 })
      expect(Location.parse(`${tempTxid}_o1`)).to.deep.equal({ tempTxid, vout: 1 })
      expect(Location.parse(`${txid}_o1://${txid}_o2`)).to.deep.equal({ txid, vout: 2, proto: { txid, vout: 1 } })
    })

    it('should throw for invalid locations', () => {
      expect(() => Location.parse(null)).to.throw('Location must be a string')
      expect(() => Location.parse({})).to.throw('Location must be a string')
      expect(() => Location.parse('')).to.throw('Location must not be empty')
      expect(() => Location.parse(txid)).to.throw('Location requires a _ separator')
      expect(() => Location.parse(`${txid}_${txid}_o1`)).to.throw('Location has an unexpected _ separator')
      expect(() => Location.parse('abc_o1')).to.throw('Location has an invalid txid length')
      expect(() => Location.parse(`${badHexTxid}_o1`)).to.throw('Location has invalid hex in its txid')
      expect(() => Location.parse(`${txid}_o`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_r0.1`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_rABC`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_i-1`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_00`)).to.throw('Location has an invalid index category')
      expect(() => Location.parse(`${txid}_a1`)).to.throw('Location has an invalid index category')
      expect(() => Location.parse(`${txid}_o1://${txid}_o1://${txid}_o1`)).to.throw('Location must only have one protocol')
      expect(() => Location.parse(`${txid}_n1://${txid}_o1`)).to.throw('Location has an invalid index category')
      expect(() => Location.parse(`${txid}_o1://${txid}_n1`)).to.throw('Location has an invalid index category')
    })
  })

  describe('build', () => {
    it('should parse valid options', () => {
      expect(Location.build({ vout: 0 })).to.equal('_o0')
      expect(Location.build({ vin: 1 })).to.equal('_i1')
      expect(Location.build({ vref: 2 })).to.equal('_r2')
      expect(Location.build({ txid, vout: 0 })).to.equal(`${txid}_o0`)
      expect(Location.build({ txid, vref: 1, proto: { txid, vin: 2 } })).to.equal(`${txid}_i2://${txid}_r1`)
      expect(Location.build({ tempTxid, vout: 3 })).to.equal(`${tempTxid}_o3`)
    })

    it('should throw for invalid options', () => {
      expect(() => Location.build()).to.throw('Location object is invalid')
      expect(() => Location.build(null)).to.throw('Location object is invalid')
      expect(() => Location.build(`${txid}_o1`)).to.throw('Location object is invalid')
      expect(() => Location.build({})).to.throw('Location index unspecified')
      expect(() => Location.build({ vout: '123' })).to.throw('Location index unspecified')
      expect(() => Location.build({ vin: null })).to.throw('Location index unspecified')
      expect(() => Location.build({ vref: {} })).to.throw('Location index unspecified')
      expect(() => Location.build({ vout: 123.4 })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ vin: -1 })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ vref: Infinity })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ vout: NaN })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ txid, vout: 0, proto: { txid, vout: 0, proto: {} } })).to.throw('Location must only have one protocol')
    })
  })
})
