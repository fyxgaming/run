const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { Location } = Run

const txid = '98244c0b51c1af3c541d901ce4bfcc05041dc8e4e80747ac5f0084e81bda339b'
const badHexTxid = '98244c0b51c1af3c541d901ce4bfcc05???dc8e4e80747ac5f0084e81bda339b'
const tempTxid = '????????????????????????????????????????????????5f0084e81bda339b'

describe('Location', () => {
  describe('parse', () => {
    it('should parse valid locations', () => {
      const expectLocation = (s, obj) => expect(Location.parse(s)).to.deep.equal(Object.assign({ location: s }, obj))
      expectLocation('_o0', { vout: 0 })
      expectLocation('_i1', { vin: 1 })
      expectLocation('_r2', { vref: 2 })
      expectLocation(`${txid}_o0`, { txid, vout: 0 })
      expectLocation(`${txid}_i1`, { txid, vin: 1 })
      expectLocation(`${txid}_r6000000000`, { txid, vref: 6000000000 })
      expectLocation(`${tempTxid}_o1`, { tempTxid, vout: 1 })
      expectLocation(`${txid}_o1://${txid}`, { txid, vout: 1, innerLocation: txid, location: `${txid}_o1` })
      expect(() => Location.parse(`${txid}_o1://hello`)).not.to.throw()
      expectLocation('!Bad', { error: 'Bad' })
      expectLocation('!', { error: '' })
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
    })
  })

  describe('build', () => {
    it('should create from valid options', () => {
      expect(Location.build({ vout: 0 })).to.equal('_o0')
      expect(Location.build({ vin: 1 })).to.equal('_i1')
      expect(Location.build({ vref: 2 })).to.equal('_r2')
      expect(Location.build({ txid, vout: 0 })).to.equal(`${txid}_o0`)
      expect(Location.build({ txid, vref: 1, innerLocation: 'hello' })).to.equal(`${txid}_r1://hello`)
      expect(Location.build({ tempTxid, vout: 3 })).to.equal(`${tempTxid}_o3`)
      expect(Location.build({ error: 'Bad' })).to.equal('!Bad')
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
      expect(() => Location.build({ txid, vout: 0, innerLocation: {} })).to.throw('Inner location must be a string')
      expect(() => Location.build({ error: null })).to.throw('Error must be a string')
    })
  })
})
