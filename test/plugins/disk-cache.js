/**
 * disk-cache.js
 *
 * Tests for lib/plugins/disk-cache.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const fs = require('fs')
const Run = require('../env/run')
const { DiskCache } = Run.plugins

// ------------------------------------------------------------------------------------------------
// DiskCache
// ------------------------------------------------------------------------------------------------

describe('DiskCache', () => {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('defaults to .runcache dir', () => {
      expect(new DiskCache().dir).to.equal('./.runcache')
    })

    // ------------------------------------------------------------------------

    it('creates directory', () => {
      const dir = Math.random().toString()
      new DiskCache({ dir }) // eslint-disable-line
      expect(fs.existsSync(dir)).to.equal(true)
      fs.rmdirSync(dir)
    })

    // ------------------------------------------------------------------------

    it('does not throw if directory already exists', () => {
      const dir = Math.random().toString()
      new DiskCache({ dir }) // eslint-disable-line
      new DiskCache({ dir }) // eslint-disable-line
      expect(fs.existsSync(dir)).to.equal(true)
      fs.rmdirSync(dir)
    })

    // ------------------------------------------------------------------------

    it.skip('swallows error if fails to create directory', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
