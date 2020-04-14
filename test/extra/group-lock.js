/**
 * group-lock.js
 *
 * Tests for lib/extra/group-lock.js
 */

const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { PrivateKey } = require('bsv')
const { expect } = chai
const { Run } = require('../env/config')
const { GroupLock } = Run

// ------------------------------------------------------------------------------------------------
// GroupLock
// ------------------------------------------------------------------------------------------------

describe('GroupLock', () => {
  it('should generate script 1-1', () => {

  })

  it('should generate script 3-5', () => {

  })

  it('should generate script 16-16', () => {
    // Defaults to 16

  })

  it('should default m to all pubkeys length', () => {

  })

  it('should throw if pubkeys is not non-empty array', () => {
    expect(() => new GroupLock(null, 1).script).to.throw('pubkeys not an array')
    expect(() => new GroupLock({}, 1).script).to.throw('pubkeys not an array')
    expect(() => new GroupLock([], 1).script).to.throw('pubkeys must have at least one entry')
  })

  it('should throw if more than 16 pubkeys', () => {
    const pubkeys = []
    for (let i = 0; i < 17; i++) {
      pubkeys.push(new PrivateKey().publicKey.toString())
    }
    expect(() => new GroupLock(pubkeys, 1).script).to.throw('No more than 16 pubkeys allowed')
  })

  it('should throw if duplicate pubkeys', () => {
    const pubkeys = [new PrivateKey().publicKey.toString()]
    pubkeys.push(pubkeys[0])
    expect(() => new GroupLock(pubkeys, 1).script).to.throw('pubkeys contains duplicates')
  })

  it('should throw if pubkeys are not valid hex strings', () => {
    expect(() => new GroupLock(['a'], 1).script).to.throw('Bad hex')
    expect(() => new GroupLock(['**'], 1).script).to.throw('Bad hex')
    expect(() => new GroupLock([123], 1).script).to.throw('Bad hex')
    expect(() => new GroupLock([null], 1).script).to.throw('Bad hex')
  })

  it('should throw if m is out of range', () => {
    const pubkeys = [new PrivateKey().publicKey.toString()]
    expect(() => new GroupLock(pubkeys, 0).script).to.throw('m must be a non-negative integer')
    expect(() => new GroupLock(pubkeys, -1).script).to.throw('m must be a non-negative integer')
    expect(() => new GroupLock(pubkeys, 1.5).script).to.throw('m must be a non-negative integer')
    expect(() => new GroupLock(pubkeys, '1').script).to.throw('m must be a non-negative integer')
    expect(() => new GroupLock(pubkeys, null).script).to.throw('m must be a non-negative integer')
    expect(() => new GroupLock(pubkeys, 2).script).to.throw('m must be <= the number of pubkeys')
  })
})

// ------------------------------------------------------------------------------------------------
