/**
 * disk-cache.js
 *
 * Tests for lib/plugins/disk-cache.js
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const Run = require('../env/run')
const { BROWSER } = require('../env/config')
const { DiskCache } = Run.plugins

// ------------------------------------------------------------------------------------------------
// DiskCache
// ------------------------------------------------------------------------------------------------

describe('DiskCache', () => {
  const TMP = '.tmp'

  // Clean up the tempory test directory after each test
  afterEach(() => {
    try {
      if (fs.existsSync(TMP)) {
        fs.rmdirSync(TMP, { recursive: true })
      }
    } catch (e) {
      console.warn(`Failed to remove ${TMP}: ${e}`)
    }
  })

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
      try {
        new DiskCache({ dir }) // eslint-disable-line
        expect(fs.existsSync(dir)).to.equal(true)
      } finally {
        fs.rmdirSync(dir)
      }
    })

    // ------------------------------------------------------------------------

    it('silently swallows error if directory already exists', () => {
      const dir = path.join(TMP, Math.random().toString())
      new DiskCache({ dir }) // eslint-disable-line
      new DiskCache({ dir }) // eslint-disable-line
      expect(fs.existsSync(dir)).to.equal(true)

      // TODO
    })

    // ------------------------------------------------------------------------

    it('logs error if fails to create directory', () => {
      let dir = path.join(TMP, 'x')
      for (let i = 0; i < 16; i++) dir = dir + dir
      new DiskCache({ dir }) // eslint-disable-line
      expect(fs.existsSync(dir)).to.equal(false)

      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  describe('set', () => {
    it.skip('saves to file', async () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('fails silently', async () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    it.skip('reads file', async () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('save race condition', async () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('fails silently', async () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
