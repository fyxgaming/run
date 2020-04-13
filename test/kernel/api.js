/**
 * api.js
 *
 * Tests for lib/kernel/api.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../env/config')
const { Blockchain, Purse, Logger, State, Lock, Owner } = Run.api

// ------------------------------------------------------------------------------------------------
// Api
// ------------------------------------------------------------------------------------------------

describe('Api', () => {
  describe('Blockchain', () => {
    it('test', () => {
      console.log('hello')
    })
  })

  describe('Purse', () => {
    // TODO
  })

  describe('Logger', () => {
    // TODO
  })

  describe('State', () => {
    // TODO

  })

  describe('Lock', () => {
    // TODO

  })

  describe('Owner', () => {
    // TODO

  })
})

// ------------------------------------------------------------------------------------------------
