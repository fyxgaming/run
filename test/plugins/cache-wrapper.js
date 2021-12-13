/**
 * cache-wrapper.js
 *
 * Tests for lib/plugins/cache-wrapper.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')

// ------------------------------------------------------------------------------------------------
// CacheWrapper
// ------------------------------------------------------------------------------------------------

describe('CacheWrapper', () => {
  it('test', () => {
    console.log(Run.plugins.CacheWrapper)
  })
})

// ------------------------------------------------------------------------------------------------
