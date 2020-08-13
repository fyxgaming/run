/**
 * code.js
 *
 * Tests for native code (Jig, Berry)
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { Code, Jig, Berry } = Run

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const NATIVE = [Jig, Berry]

const ERROR = 'Native code is immutable'

// ------------------------------------------------------------------------------------------------
// Native
// ------------------------------------------------------------------------------------------------

describe('Native', () => {
  it('is instanceof Code', () => {
    NATIVE.forEach(N => expect(N instanceof Code).to.equal(true))
  })

  it('throws if define property', () => {
    NATIVE.forEach(N => expect(() => Object.defineProperty(N, 'x', { value: 1 })).to.throw(ERROR))
  })

  it('throws if delete property', () => {
    NATIVE.forEach(N => expect(() => { delete N.x }).to.throw(ERROR))
  })

  it('cannot prevent extensions', () => {
    NATIVE.forEach(N => expect(() => Object.preventExtensions(N)).to.throw(ERROR))
  })

  it('throws if set property', () => {
    NATIVE.forEach(N => expect(() => { N.x = 1 }).to.throw(ERROR))
  })

  it('throws if set prototype', () => {
    NATIVE.forEach(N => expect(() => Object.setPrototypeOf(N, {})).to.throw(ERROR))
  })

  it('throws if deploy', () => {
    const run = new Run()
    const error = 'Cannot deploy native code'
    NATIVE.forEach(N => expect(() => run.deploy(N)).to.throw(error))
  })

  it('has native bindings', () => {
    NATIVE.forEach(N => {
      expect(N.location).to.equal('native://' + N.name)
      expect(N.origin).to.equal('native://' + N.name)
      expect(N.nonce).to.equal(0)
      expect(N.owner).to.equal(null)
      expect(N.satoshis).to.equal(null)
    })
  })
})

// ------------------------------------------------------------------------------------------------
