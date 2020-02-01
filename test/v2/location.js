const { describe, it } = require('mocha')
const { expect } = require('chai')
const Location = require('../../lib/v2/location')

const txid = '98244c0b51c1af3c541d901ce4bfcc05041dc8e4e80747ac5f0084e81bda339b'
const badHexTxid = '98244c0b51c1af3c541d901ce4bfcc05???dc8e4e80747ac5f0084e81bda339b'
const tempTxid = '????????????????????????????????????????????????5f0084e81bda339b'

describe('Location', () => {
  describe('parse', () => {
    it('should parse valid locations', () => {
      expect(Location.parse(`${txid}_o0`)).to.deep.equal({ txid, vout: 0 })
      expect(Location.parse(`${txid}_i1`)).to.deep.equal({ txid, vin: 1 })
      expect(Location.parse(`${txid}_r6000000000`)).to.deep.equal({ txid, vref: 6000000000 })
      expect(Location.parse(`${tempTxid}_o1`)).to.deep.equal({ tempTxid, vout: 1 })
      expect(Location.parse(`${txid}_o1://${txid}_o2`)).to.deep.equal({ txid, vout: 2, proto: { txid, vout: 1 }})
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
    })

    it('should throw for invalid options', () => {
    })
  })
})
