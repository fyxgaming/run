/**
 * api.js
 *
 * Tests for lib/kernel/api.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { Blockchain, Purse, Logger, State, Lock, Owner } = Run.api

// ------------------------------------------------------------------------------------------------
// Blockchain Api
// ------------------------------------------------------------------------------------------------

describe('Blockchain API', () => {
  describe('instanceof', () => {
    it('should not match non-objects', () => {
      expect(0 instanceof Blockchain).to.equal(false)
      expect(true instanceof Blockchain).to.equal(false)
      expect('blockchain' instanceof Blockchain).to.equal(false)
      expect(null instanceof Blockchain).to.equal(false)
      expect(undefined instanceof Blockchain).to.equal(false)
      expect(Symbol.hasInstance instanceof Blockchain).to.equal(false)
      expect((() => {}) instanceof Blockchain).to.equal(false)
    })
  })
})

describe('Purse API ', () => {
  describe('instanceof', () => {
    it('should match non-objects', () => {
      expect(0 instanceof Purse).to.equal(false)
      expect(true instanceof Purse).to.equal(false)
      expect('blockchain' instanceof Purse).to.equal(false)
      expect(null instanceof Purse).to.equal(false)
      expect(undefined instanceof Purse).to.equal(false)
      expect(Symbol.hasInstance instanceof Purse).to.equal(false)
      expect((() => {}) instanceof Purse).to.equal(false)
    })
  })
})

describe('Logger API', () => {
  describe('instanceof', () => {
    it('should match non-objects', () => {
      expect(0 instanceof Logger).to.equal(false)
      expect(true instanceof Logger).to.equal(false)
      expect('blockchain' instanceof Logger).to.equal(false)
      expect(null instanceof Logger).to.equal(false)
      expect(undefined instanceof Logger).to.equal(false)
      expect(Symbol.hasInstance instanceof Logger).to.equal(false)
      expect((() => {}) instanceof Logger).to.equal(false)
    })
  })
})

describe('State API', () => {
  describe('instanceof', () => {
    it('should match non-objects', () => {
      expect(0 instanceof State).to.equal(false)
      expect(true instanceof State).to.equal(false)
      expect('blockchain' instanceof State).to.equal(false)
      expect(null instanceof State).to.equal(false)
      expect(undefined instanceof State).to.equal(false)
      expect(Symbol.hasInstance instanceof State).to.equal(false)
      expect((() => {}) instanceof State).to.equal(false)
    })
  })
})

describe('Lock API', () => {
  describe('instanceof', () => {
    it('should match non-objects', () => {
      expect(0 instanceof Lock).to.equal(false)
      expect(true instanceof Lock).to.equal(false)
      expect('blockchain' instanceof Lock).to.equal(false)
      expect(null instanceof Lock).to.equal(false)
      expect(undefined instanceof Lock).to.equal(false)
      expect(Symbol.hasInstance instanceof Lock).to.equal(false)
      expect((() => {}) instanceof Lock).to.equal(false)
    })
  })
})

describe('Owner API', () => {
  describe('instanceof', () => {
    it('should match non-objects', () => {
      expect(0 instanceof Owner).to.equal(false)
      expect(true instanceof Owner).to.equal(false)
      expect('blockchain' instanceof Owner).to.equal(false)
      expect(null instanceof Owner).to.equal(false)
      expect(undefined instanceof Owner).to.equal(false)
      expect(Symbol.hasInstance instanceof Owner).to.equal(false)
      expect((() => {}) instanceof Owner).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
