/**
 * immutable.js
 *
 * Tests for lib/membrane/immutable.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Immutable = unmangle(unmangle(Run)._membrane)._Immutable

// ------------------------------------------------------------------------------------------------
// Immutable
// ------------------------------------------------------------------------------------------------

describe('Immutable', () => {
  it('test', () => {
    expect(Immutable).not.to.equal(undefined)
    console.log(Immutable)
  })
})

// ------------------------------------------------------------------------------------------------
