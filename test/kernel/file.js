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
      expect(typeof file._Outer === 'function').to.equal(true)
      expect(file._Outer.toString()).to.equal('function Base() {}')
    })

    // Create with custom base type
  })

  describe('_setInnerType', () => {
    // Only allow functions
    // Is a file a util?

    it('should change source code', () => {
      const file = new File()

      class A { f () { } }
      file._setInnerType(A)
      console.log(file._Outer.toString())
      console.log(file._Outer.prototype)
      console.log('1', Object.getOwnPropertyNames(file._Outer.prototype))
      console.log('2', Object.getOwnPropertyNames(Object.getPrototypeOf(file._Outer.prototype)))
      console.log(file._Outer.prototype.f)

      console.log('---')
      console.log(Object.getOwnPropertyNames(A.prototype))
      console.log('---')

    //   function f () { }
    //   file._set(f)
    //   console.log(file._type.toString())
    })

    // Old functions are removed
    // Prototype can't be changed
    // Create instances, upgrades as we go
  })
})

// ------------------------------------------------------------------------------------------------
