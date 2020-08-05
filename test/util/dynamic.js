/**
 * dynamic.js
 *
 * Tests for lib/util/dynamic.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Dynamic = unmangle(Run)._Dynamic

// ------------------------------------------------------------------------------------------------
// Dynamic
// ------------------------------------------------------------------------------------------------

describe('Dynamic', () => {
  describe('constructor', () => {
    it('creates base type', () => {
      const D = new Dynamic()
      expect(typeof D === 'function').to.equal(true)
      expect(D.toString()).to.equal('function dynamic() { [native code] }')
    })

    // Create with custom base type
  })

  describe('_setInnerType', () => {
    // Only allow functions
    // Is a file a util?

    it('should change source code', () => {
      const D = new Dynamic()
      class A { f () { } }
      D.__type__ = A

      // Can't name using __type__
      // Jigs aren't allowed to have the dynamic type returned. Only they can do it, through upgrade.

      console.log(D.toString())
      console.log(D.prototype)
      console.log('1', Object.getOwnPropertyNames(D.prototype))
      console.log('2', Object.getOwnPropertyNames(Object.getPrototypeOf(D.prototype)))
      console.log(D.prototype.f)

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
