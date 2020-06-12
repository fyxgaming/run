/**
 * changes.js
 *
 * Tests for lib/util/changes.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const Changes = unmangle(unmangle(Run)._util)._Changes

// ------------------------------------------------------------------------------------------------
// Changes
// ------------------------------------------------------------------------------------------------

describe('Changes', () => {
  it('test', () => {
    console.log(Changes)
  })
})

// ------------------------------------------------------------------------------------------------
