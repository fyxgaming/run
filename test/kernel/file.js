/**
 * file.js
 *
 * Tests for lib/kernel/file.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const File = unmangle(Run)._File

// ------------------------------------------------------------------------------------------------
// File
// ------------------------------------------------------------------------------------------------

describe('File', () => {
  describe('constructor', () => {
    it('creates base type', () => {
      const file = new File()
      expect(typeof file._type === 'function').to.equal(true)
      expect(file._type.toString()).to.equal('function Base() {}')
    })
  })

  describe('_set', () => {
    // Only allow functions
    // Is a file a util?

    it('should change source code', () => {
      const file = new File()

      class A { }
      file._set(A)
      console.log(file._type.toString())

      function f () { }
      file._set(f)
      console.log(file._type.toString())
    })

    // Old functions are removed
    // Prototype can't be changed
  })
})

// ------------------------------------------------------------------------------------------------
