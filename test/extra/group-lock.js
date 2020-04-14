/**
 * group-lock.js
 *
 * Tests for lib/extra/group-lock.js
 */

const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('../env/config')
const { GroupLock } = Run

// ------------------------------------------------------------------------------------------------
// GroupLock
// ------------------------------------------------------------------------------------------------

describe('GroupLock', () => {
  it('should throw if pubkeys is not array', () => {
    // TODO
  })

  it('should throw if pubkeys is empty', () => {
    // TODO
  })

  it('should throw if pubkeys are not valid hex strings', () => {
    // TODO
  })

  it('should throw if m is out of range', () => {
    // TODO
  })

  it('should throw if more than 16 pubkeys', () => {
    // TODO
  })
})

// ------------------------------------------------------------------------------------------------
