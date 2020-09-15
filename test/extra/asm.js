/**
 * asm.js
 *
 * Tests for lib/extra/asm.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { asm } = Run

// ------------------------------------------------------------------------------------------------
// asm
// ------------------------------------------------------------------------------------------------

describe('asm', () => {
  it('numeric opcodes', () => {
    expect(asm('0')[0]).to.equal(asm.OP_CODES.OP_0)
    expect(asm('1')[0]).to.equal(asm.OP_CODES.OP_1)
    expect(asm('8')[0]).to.equal(asm.OP_CODES.OP_8)
    expect(asm('a')[0]).to.equal(asm.OP_CODES.OP_10)
    expect(asm('10')[0]).to.equal(asm.OP_CODES.OP_16)
  })

  // --------------------------------------------------------------------------

  it('short push data', () => {
    expect([...asm('20')]).to.deep.equal([1, 32])
    expect([...asm('ff')]).to.deep.equal([1, 255])
    expect([...asm('ffff')]).to.deep.equal([2, 255, 255])
    expect([...asm('ff00ff00')]).to.deep.equal([4, 255, 0, 255, 0])
    let x = ''
    for (let i = 0; i < 75; i++) x = x + 'ff'
    expect([...asm(x)].slice(0, 2)).to.deep.equal([75, 255])
  })

  // --------------------------------------------------------------------------

  it('push data 1', () => {
    let x = ''
    for (let i = 0; i < 76; i++) x = x + 'ff'
    expect([...asm(x)].slice(0, 3)).to.deep.equal([asm.OP_CODES.OP_PUSHDATA1, 76, 255])
    let y = ''
    for (let i = 0; i < 255; i++) y = y + 'ff'
    expect([...asm(y)].slice(0, 3)).to.deep.equal([asm.OP_CODES.OP_PUSHDATA1, 255, 255])
  })

  // --------------------------------------------------------------------------

  it('push data 2', () => {
    let x = ''
    for (let i = 0; i < 256; i++) x = x + 'ff'
    expect([...asm(x)].slice(0, 4)).to.deep.equal([asm.OP_CODES.OP_PUSHDATA2, 1, 0, 255])
  })

  // --------------------------------------------------------------------------

  it('push data 4', () => {
    let x = ''
    for (let i = 0; i < 256 * 256; i++) x = x + 'ff'
    expect([...asm(x)].slice(0, 6)).to.deep.equal([asm.OP_CODES.OP_PUSHDATA4, 0, 1, 0, 0, 255])
  })

  // --------------------------------------------------------------------------

  it('throws if invalid', () => {
    expect(() => asm('OP_')).to.throw('Bad hex')
    expect(() => asm('OP_FAKE')).to.throw('Bad hex')
    expect(() => asm('...')).to.throw('Bad hex')
  })

  // --------------------------------------------------------------------------

  it('21e8', () => {
    asm('e34d02244f210de0bcfd936f0f29e4a19008b3e1106f2fa6265edb3f04459d17 21e8 OP_SIZE OP_4 OP_PICK OP_SHA256 OP_SWAP OP_SPLIT OP_DROP OP_EQUALVERIFY OP_DROP OP_CHECKSIG')
  })
})

// ------------------------------------------------------------------------------------------------
