/**
 * rules.js
 *
 * Tests for lib/kernel/rules.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Rules = unmangle(unmangle(Run)._Rules)
const Membrane = unmangle(Run)._Membrane
const { mangle } = unmangle

// ------------------------------------------------------------------------------------------------
// Rules
// ------------------------------------------------------------------------------------------------

describe('Rules', () => {
  describe('code', () => {
    it('creates rules', () => {
      const rules = unmangle(Rules._code())
      expect(rules._parentJig).to.equal(null)
      expect(rules._admin).to.equal(true)
      expect(rules._errors).to.equal(true)
      expect(rules._bindings).to.equal(true)
      expect(rules._reserved).to.equal(true)
      expect(rules._codeMethods).to.equal(true)
      expect(rules._jigMethods).to.equal(false)
      expect(rules._privacy).to.equal(true)
      expect(rules._immutable).to.equal(false)
      expect(rules._recordable).to.equal(true)
      expect(rules._recordCalls).to.equal(true)
      expect(rules._owned).to.equal(true)
      expect(rules._thisless).to.equal(false)
      expect(rules._cow).to.equal(false)
      expect(rules._cowProps).to.equal(false)
      expect(rules._disabledMethods).to.deep.equal([])
    })
  })

  // --------------------------------------------------------------------------

  describe('static code', () => {
    it('creates rules', () => {
      const isClass = Math.random() < 0.5
      const rules = unmangle(Rules._staticCode(isClass))
      expect(rules._parentJig).to.equal(null)
      expect(rules._admin).to.equal(true)
      expect(rules._errors).to.equal(true)
      expect(rules._bindings).to.equal(true)
      expect(rules._reserved).to.equal(true)
      expect(rules._codeMethods).to.equal(true)
      expect(rules._jigMethods).to.equal(false)
      expect(rules._privacy).to.equal(false)
      expect(rules._immutable).to.equal(true)
      expect(rules._recordable).to.equal(true)
      expect(rules._recordCalls).to.equal(false)
      expect(rules._owned).to.equal(false)
      expect(rules._thisless).to.equal(!isClass)
      expect(rules._cow).to.equal(false)
      expect(rules._cowProps).to.equal(false)
      expect(rules._disabledMethods).to.deep.equal([])
    })
  })

  // --------------------------------------------------------------------------

  describe('native code', () => {
    it('creates rules', () => {
      const rules = unmangle(Rules._nativeCode())
      expect(rules._parentJig).to.equal(null)
      expect(rules._admin).to.equal(true)
      expect(rules._errors).to.equal(true)
      expect(rules._bindings).to.equal(true)
      expect(rules._reserved).to.equal(false)
      expect(rules._codeMethods).to.equal(true)
      expect(rules._jigMethods).to.equal(false)
      expect(rules._privacy).to.equal(false)
      expect(rules._immutable).to.equal(true)
      expect(rules._recordable).to.equal(false)
      expect(rules._recordCalls).to.equal(false)
      expect(rules._owned).to.equal(true)
      expect(rules._thisless).to.equal(false)
      expect(rules._cow).to.equal(false)
      expect(rules._cowProps).to.equal(false)
      expect(rules._disabledMethods).to.deep.equal([])
    })
  })

  // --------------------------------------------------------------------------

  describe('jig instance', () => {
    it('creates rules', () => {
      const rules = unmangle(Rules._jigInstance())
      expect(rules._parentJig).to.equal(null)
      expect(rules._admin).to.equal(true)
      expect(rules._errors).to.equal(true)
      expect(rules._bindings).to.equal(true)
      expect(rules._reserved).to.equal(true)
      expect(rules._codeMethods).to.equal(false)
      expect(rules._jigMethods).to.equal(true)
      expect(rules._privacy).to.equal(true)
      expect(rules._immutable).to.equal(false)
      expect(rules._recordable).to.equal(true)
      expect(rules._recordCalls).to.equal(true)
      expect(rules._owned).to.equal(true)
      expect(rules._thisless).to.equal(false)
      expect(rules._cow).to.equal(false)
      expect(rules._cowProps).to.equal(false)
      expect(rules._disabledMethods).to.deep.equal([])
    })
  })

  // --------------------------------------------------------------------------

  describe('berry instance', () => {
    it('creates rules', () => {
      const rules = unmangle(Rules._berryInstance())
      expect(rules._parentJig).to.equal(null)
      expect(rules._admin).to.equal(true)
      expect(rules._errors).to.equal(true)
      expect(rules._bindings).to.equal(true)
      expect(rules._reserved).to.equal(true)
      expect(rules._codeMethods).to.equal(false)
      expect(rules._jigMethods).to.equal(false)
      expect(rules._privacy).to.equal(true)
      expect(rules._immutable).to.equal(true)
      expect(rules._recordable).to.equal(true)
      expect(rules._recordCalls).to.equal(true)
      expect(rules._owned).to.equal(true)
      expect(rules._thisless).to.equal(false)
      expect(rules._cow).to.equal(false)
      expect(rules._cowProps).to.equal(false)
      expect(rules._disabledMethods).to.deep.equal([])
    })
  })

  // --------------------------------------------------------------------------

  describe('cow', () => {
    it('creates rules', () => {
      const rules = unmangle(Rules._cow())
      expect(rules._parentJig).to.equal(null)
      expect(rules._admin).to.equal(true)
      expect(rules._errors).to.equal(true)
      expect(rules._bindings).to.equal(false)
      expect(rules._reserved).to.equal(false)
      expect(rules._codeMethods).to.equal(false)
      expect(rules._jigMethods).to.equal(false)
      expect(rules._privacy).to.equal(false)
      expect(rules._immutable).to.equal(false)
      expect(rules._recordable).to.equal(false)
      expect(rules._recordCalls).to.equal(false)
      expect(rules._owned).to.equal(false)
      expect(rules._thisless).to.equal(false)
      expect(rules._cow).to.equal(true)
      expect(rules._cowProps).to.equal(false)
      expect(rules._disabledMethods).to.deep.equal([])
    })
  })

  // --------------------------------------------------------------------------

  describe('child property', () => {
    it('creates rules', () => {
      const parentRules = {
        _admin: Math.random() < 0.5,
        _errors: Math.random() < 0.5,
        _bindings: Math.random() < 0.5,
        _reserved: Math.random() < 0.5,
        _codeMethods: Math.random() < 0.5,
        _jigMethods: Math.random() < 0.5,
        _privacy: Math.random() < 0.5,
        _immutable: Math.random() < 0.5,
        _recordable: Math.random() < 0.5,
        _recordCalls: Math.random() < 0.5,
        _owned: Math.random() < 0.5,
        _cowProps: Math.random() < 0.5
      }
      const parentJig = new Membrane({}, mangle(Object.assign({}, parentRules)))
      const owned = Math.random() < 0.5
      const rules = unmangle(Rules._childProperty(parentJig, false, owned))
      expect(rules._parentJig).to.equal(parentJig)
      expect(rules._admin).to.equal(parentRules._admin)
      expect(rules._errors).to.equal(parentRules._errors)
      expect(rules._bindings).to.equal(false)
      expect(rules._reserved).to.equal(false)
      expect(rules._codeMethods).to.equal(false)
      expect(rules._jigMethods).to.equal(false)
      expect(rules._privacy).to.equal(parentRules._privacy)
      expect(rules._immutable).to.equal(parentRules._immutable)
      expect(rules._recordable).to.equal(parentRules._recordable)
      expect(rules._recordCalls).to.equal(false)
      expect(rules._owned).to.equal(parentRules._owned)
      expect(rules._thisless).to.equal(parentRules._thisless && owned)
      expect(rules._cow).to.equal(parentRules._cow)
      expect(rules._cowProps).to.equal(parentRules._cowProps)
      expect(rules._disabledMethods).to.deep.equal([])
    })

    it('method are immutable', () => {
      const parentJig = new Membrane({})
      const rules = unmangle(Rules._childProperty(parentJig, true, false))
      expect(rules._immutable).to.equal(true)
    })
  })
})
