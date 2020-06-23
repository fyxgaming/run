/**
 * snapshot.js
 *
 * Tests for lib/util/snapshot.js
 */

const { describe, it } = require('mocha')
// const { expect } = require('chai')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const Snapshot = unmangle(unmangle(Run)._util)._Snapshot

// ------------------------------------------------------------------------------------------------
// Snapshot
// ------------------------------------------------------------------------------------------------

describe('Snapshot', () => {
  describe('constructor', () => {
    it('should snapshot jigs', () => {

    })

    it('should snapshot code', () => {

    })

    it('should snapshot berries', () => {

    })

    it('should throw if not a jig', () => {
      console.log(Snapshot)
    })
  })
})

// ------------------------------------------------------------------------------------------------
