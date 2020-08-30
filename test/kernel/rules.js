/**
 * rules.js
 *
 * Tests for lib/kernel/rules.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Rules = unmangle(Run)._Rules
const Membrane = unmangle(Run)._Membrane
const { mangle } = unmangle

// ------------------------------------------------------------------------------------------------
// Rules
// ------------------------------------------------------------------------------------------------

describe('Rules', () => {
  describe('code', () => {
    it('creates rules', () => {
      const rules = Rules._code()
      expect(rules._parentJig).to.equal(null)
      expect(rules._admin).to.equal(true)
      expect(rules._errors).to.equal(true)
      expect(rules._bindings).to.equal(true)
      expect(rules._code).to.equal(true)
      expect(rules._private).to.equal(true)
      expect(rules._immutable).to.equal(false)
      expect(rules._record).to.equal(true)
      expect(rules._recordCalls).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------

  describe('static code', () => {
    it('creates rules', () => {
      const rules = Rules._staticCode()
      expect(rules._parentJig).to.equal(null)
      expect(rules._admin).to.equal(true)
      expect(rules._errors).to.equal(true)
      expect(rules._bindings).to.equal(true)
      expect(rules._code).to.equal(true)
      expect(rules._private).to.equal(false)
      expect(rules._immutable).to.equal(true)
      expect(rules._record).to.equal(true)
      expect(rules._recordCalls).to.equal(false)
    })
  })

  // --------------------------------------------------------------------------

  describe('native code', () => {
    it('creates rules', () => {
      const rules = Rules._nativeCode()
      expect(rules._parentJig).to.equal(null)
      expect(rules._admin).to.equal(true)
      expect(rules._errors).to.equal(true)
      expect(rules._bindings).to.equal(true)
      expect(rules._code).to.equal(true)
      expect(rules._private).to.equal(false)
      expect(rules._immutable).to.equal(true)
      expect(rules._record).to.equal(true)
      expect(rules._recordCalls).to.equal(false)
    })
  })

  // --------------------------------------------------------------------------

  describe('jig instance', () => {
    it('creates rules', () => {
      const rules = Rules._jigInstance()
      expect(rules._parentJig).to.equal(null)
      expect(rules._admin).to.equal(true)
      expect(rules._errors).to.equal(true)
      expect(rules._bindings).to.equal(true)
      expect(rules._code).to.equal(false)
      expect(rules._private).to.equal(true)
      expect(rules._immutable).to.equal(false)
      expect(rules._record).to.equal(true)
      expect(rules._recordCalls).to.equal(false)
    })
  })

  // --------------------------------------------------------------------------

  describe('berry instance', () => {
    it('creates rules', () => {
      const rules = Rules._berryInstance()
      expect(rules._parentJig).to.equal(null)
      expect(rules._admin).to.equal(true)
      expect(rules._errors).to.equal(true)
      expect(rules._bindings).to.equal(true)
      expect(rules._code).to.equal(false)
      expect(rules._private).to.equal(true)
      expect(rules._immutable).to.equal(true)
      expect(rules._record).to.equal(true)
      expect(rules._recordCalls).to.equal(false)
    })
  })

  // --------------------------------------------------------------------------

  describe('child property', () => {
    it('creates rules', () => {
      const parentRules = {
        _admin: Math.random() < 0.5,
        _errors: Math.random() < 0.5,
        _bindings: Math.random() < 0.5,
        _code: Math.random() < 0.5,
        _private: Math.random() < 0.5,
        _immutable: Math.random() < 0.5,
        _record: Math.random() < 0.5
      }
      const parentJig = new Membrane({}, mangle(parentRules))
      const rules = unmangle(Rules._childProperty(parentJig))
      expect(rules._parentJig).to.equal(parentJig)
      expect(rules._admin).to.equal(parentRules._admin)
      expect(rules._errors).to.equal(parentRules._errors)
      expect(rules._bindings).to.equal(false)
      expect(rules._code).to.equal(false)
      expect(rules._private).to.equal(parentRules._private)
      expect(rules._immutable).to.equal(parentRules._immutable)
      expect(rules._record).to.equal(parentRules._record)
      expect(rules._recordCalls).to.equal(parentRules._recordCalls)
    })
  })

  // --------------------------------------------------------------------------

  describe('equals', () => {
    it('returns true if same', () => {
      const r1 = new Rules()
      const r2 = new Rules()
      expect(r1.equals(r2)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('returns false if more rules', () => {
      const r1 = new Rules()
      const r2 = new Rules()
      r1.abc = 'def'
      expect(r1.equals(r2)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns false if less rules', () => {
      const r1 = new Rules()
      const r2 = new Rules()
      delete unmangle(r1)._immutable
      expect(r1.equals(r2)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns false if different rules', () => {
      const r1 = new Rules()
      const r2 = new Rules()
      const key = Object.keys(r1)[Math.floor(Math.random() * Object.keys(r1).length)]
      r1[key] = !r1.key
      expect(r1.equals(r2)).to.equal(false)
    })
  })
})
