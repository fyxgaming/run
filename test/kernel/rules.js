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
      expect(rules._privacy).to.equal(true)
      expect(rules._immutable).to.equal(false)
      expect(rules._recordable).to.equal(true)
      expect(rules._recordCalls).to.equal(true)
      expect(rules._contract).to.equal(true)
      expect(rules._serializable).to.equal(true)
      expect(rules._cow).to.equal(false)
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
      expect(rules._privacy).to.equal(false)
      expect(rules._immutable).to.equal(true)
      expect(rules._recordable).to.equal(true)
      expect(rules._replayable).to.equal(false)
      expect(rules._contract).to.equal(false)
      expect(rules._serializable).to.equal(true)
      expect(rules._cow).to.equal(false)
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
      expect(rules._privacy).to.equal(false)
      expect(rules._immutable).to.equal(true)
      expect(rules._recordable).to.equal(false)
      expect(rules._replayable).to.equal(false)
      expect(rules._contract).to.equal(false)
      expect(rules._serializable).to.equal(false)
      expect(rules._cow).to.equal(false)
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
      expect(rules._privacy).to.equal(true)
      expect(rules._immutable).to.equal(false)
      expect(rules._recordable).to.equal(true)
      expect(rules._replayable).to.equal(false)
      expect(rules._contract).to.equal(true)
      expect(rules._serializable).to.equal(true)
      expect(rules._cow).to.equal(false)
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
      expect(rules._privacy).to.equal(true)
      expect(rules._immutable).to.equal(true)
      expect(rules._recordable).to.equal(true)
      expect(rules._replayable).to.equal(false)
      expect(rules._contract).to.equal(false)
      expect(rules._serializable).to.equal(true)
      expect(rules._cow).to.equal(false)
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
        _privacy: Math.random() < 0.5,
        _immutable: Math.random() < 0.5,
        _recordable: Math.random() < 0.5,
        _replayable: Math.random() < 0.5,
        _contract: Math.random() < 0.5,
        _serializable: Math.random() < 0.5
      }
      const parentJig = new Membrane({}, mangle(parentRules))
      const rules = unmangle(Rules._childProperty(parentJig, false))
      expect(rules._parentJig).to.equal(parentJig)
      expect(rules._admin).to.equal(parentRules._admin)
      expect(rules._errors).to.equal(parentRules._errors)
      expect(rules._bindings).to.equal(false)
      expect(rules._code).to.equal(false)
      expect(rules._privacy).to.equal(parentRules._privacy)
      expect(rules._immutable).to.equal(parentRules._immutable)
      expect(rules._recordable).to.equal(parentRules._recordable)
      expect(rules._replayable).to.equal(parentRules._replayable)
      expect(rules._contract).to.equal(false)
      expect(rules._serializable).to.equal(parentRules._serializable)
      expect(rules._cow).to.equal(parentRules._cow)
    })

    it('method are immutable', () => {
      const parentJig = new Membrane({})
      const rules = unmangle(Rules._childProperty(parentJig, true))
      expect(rules._immutable).to.equal(true)
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
