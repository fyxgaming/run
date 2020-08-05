/**
 * file.js
 *
 * Tests for lib/kernel/file.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const File = unmangle(Run)._File

// ------------------------------------------------------------------------------------------------
// File
// ------------------------------------------------------------------------------------------------

describe('File', () => {
  describe('constructor', () => {
    it('test', () => {
      console.log(File)
    })
  })
})

// ------------------------------------------------------------------------------------------------
