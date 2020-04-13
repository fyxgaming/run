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
    })
  })
})

describe('Purse API ', () => {
  describe('instanceof', () => {
    it('should match non-objects', () => {
      expect(0 instanceof Purse).to.equal(false)
    })
  })
})

describe('Logger', () => {
  describe('instanceof', () => {
    it('should match non-objects', () => {
      expect(0 instanceof Logger).to.equal(false)
    })
  })
})

describe('State', () => {
  describe('instanceof', () => {
    it('should match non-objects', () => {
      expect(0 instanceof State).to.equal(false)
    })
  })
})

describe('Lock', () => {
  describe('instanceof', () => {
    it('should match non-objects', () => {
      expect(0 instanceof Lock).to.equal(false)
    })
  })
})

describe('Owner', () => {
  describe('instanceof', () => {
    it('should match non-objects', () => {
      expect(0 instanceof Owner).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
