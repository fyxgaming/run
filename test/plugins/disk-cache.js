/**
 * disk-cache.js
 *
 * Tests for lib/plugins/disk-cache.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const fs = require('fs')
const Run = require('../env/run')
const { BROWSER } = require('../env/config')
const { DiskCache } = Run.plugins

// ------------------------------------------------------------------------------------------------
// DiskCache
// ------------------------------------------------------------------------------------------------

describe('DiskCache', () => {
  // --------------------------------------------------------------------------
  // browser
  // --------------------------------------------------------------------------

  // Tests when running in node where IndexedDbCache is not supported
  if (BROWSER) {
    describe('browser', () => {
      it('null if not a browser', () => {
        expect(DiskCache).to.equal(null)
      })
    })

    return // Don't run any other tests
  }

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

    it('swallows error if fails to create directory', () => {
      let dir = 'x'
      for (let i = 0; i < 20; i++) dir = dir + dir
      new DiskCache({ dir }) // eslint-disable-line
      expect(fs.existsSync(dir)).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
