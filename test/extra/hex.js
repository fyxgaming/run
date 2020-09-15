/**
 * hex.js
 *
 * Tests for lib/extra/hex.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { hex } = Run

// ------------------------------------------------------------------------------------------------
// hex
// ------------------------------------------------------------------------------------------------

describe('hex', () => {
  it('empty', () => {
    expect(hex('')).to.deep.equal([])
  })

  // --------------------------------------------------------------------------

  it('lower case', () => {
    expect(hex('00')).to.deep.equal([0])
    expect(hex('01')).to.deep.equal([1])
    expect(hex('ff')).to.deep.equal([255])
    expect(hex('ff00')).to.deep.equal([255, 0])
  })

  // --------------------------------------------------------------------------

  it('upper case', () => {
    expect(hex('FF')).to.deep.equal([255])
  })

  // --------------------------------------------------------------------------

  it('throws if invalid length', () => {
    expect(() => hex('F')).to.throw('Bad hex')
    expect(() => hex('000')).to.throw('Bad hex')
  })

  // --------------------------------------------------------------------------

  it('throws if invalid chars', () => {
    expect(() => hex('@@')).to.throw('Bad hex')
    expect(() => hex('..')).to.throw('Bad hex')
    expect(() => hex('  ')).to.throw('Bad hex')
  })
})

// ------------------------------------------------------------------------------------------------
