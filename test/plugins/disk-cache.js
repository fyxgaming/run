/**
 * disk-cache.js
 *
 * Tests for lib/plugins/disk-cache.js
 */

const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const { stub } = require('sinon')
const fs = require('fs')
const path = require('path')
const Run = require('../env/run')
const { BROWSER } = require('../env/config')
const { DiskCache } = Run.plugins
const unmangle = require('../env/unmangle')
const Log = unmangle(unmangle(Run)._Log)

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
      const previousLogger = Log._logger
      try {
        Log._logger = stub({ error: () => {}, warn: () => {} })
        const dir = path.join(TMP, Math.random().toString())
        new DiskCache({ dir }) // eslint-disable-line
        new DiskCache({ dir }) // eslint-disable-line
        expect(fs.existsSync(dir)).to.equal(true)
        expect(Log._logger.warn.called).to.equal(false)
        expect(Log._logger.error.called).to.equal(false)
      } finally {
        Log._logger = previousLogger
      }
    })

    // ------------------------------------------------------------------------

    it('logs error if fails to create directory', () => {
      const previousLogger = Log._logger
      try {
        Log._logger = stub({ error: () => {}, warn: () => {} })
        let dir = path.join(TMP, 'x')
        for (let i = 0; i < 16; i++) dir = dir + dir
        new DiskCache({ dir }) // eslint-disable-line
        expect(fs.existsSync(dir)).to.equal(false)
        expect(Log._logger.error.called).to.equal(true)
      } finally {
        Log._logger = previousLogger
      }
    })
  })

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  describe('set', () => {
    it('saves to file', async () => {
      const dir = path.join(TMP, Math.random().toString())
      const cache = new DiskCache({ dir })
      await cache.set('abc', 'def')
      const filename = await cache._filename('abc')
      expect(fs.existsSync(filename)).to.equal(true)
      expect(fs.readFileSync(filename, 'utf8')).to.equal('"def"')
    })

    // ------------------------------------------------------------------------

    it('long key', async () => {
      const dir = path.join(TMP, Math.random().toString())
      const cache = new DiskCache({ dir })
      let key = path.join(TMP, 'x')
      for (let i = 0; i < 16; i++) key = key + key
      await cache.set(key, [1, 2, 3])
      const filename = await cache._filename(key)
      expect(fs.existsSync(filename)).to.equal(true)
      expect(fs.readFileSync(filename, 'utf8')).to.equal('[1,2,3]')
    })

    // ------------------------------------------------------------------------

    it('logs error if fails', async () => {
      const previousLogger = Log._logger
      try {
        Log._logger = stub({ error: () => {}, warn: () => {} })
        const dir = path.join(TMP, Math.random().toString())
        const cache = new DiskCache({ dir })
        fs.rmdirSync(dir, { recursive: true })
        await cache.set('xyz', 'zyx')
        expect(Log._logger.error.called).to.equal(true)
        const filename = await cache._filename('xyz')
        expect(fs.existsSync(filename)).to.equal(false)
      } finally {
        Log._logger = previousLogger
      }
    })
  })

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    it('reads file', async () => {
      const dir = path.join(TMP, Math.random().toString())
      const cache = new DiskCache({ dir })
      const filename = await cache._filename('mmm')
      fs.writeFileSync(filename, '"nnn"')
      expect(await cache.get('mmm')).to.equal('nnn')
    })

    // ------------------------------------------------------------------------

    it.skip('invalid json', async () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('doesnt exist', async () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('save race condition', async () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
