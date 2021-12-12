/**
 * wrapped-cache.js
 *
 * Tests for lib/plugins/wrapped-cache.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')

// ------------------------------------------------------------------------------------------------
// WrappedCache
// ------------------------------------------------------------------------------------------------

describe('WrappedCache', () => {
  it('test', () => {
    console.log(Run.plugins.WrappedCache)
  })
})

// ------------------------------------------------------------------------------------------------
