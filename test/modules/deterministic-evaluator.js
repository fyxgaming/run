/**
 * evaluator.js
 *
 * Tests for lib/drivers/evaluator.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../helpers')
const { DeterministicEvaluator } = Run.modules

// ------------------------------------------------------------------------------------------------
// DeterministicEvaluator
// ------------------------------------------------------------------------------------------------

describe('DeterministicEvaluator', () => {
  describe('constructor', () => {
    it('should create without params', () => {
      new DeterministicEvaluator() // eslint-disable-line
    })
  })

  describe('evaluator', () => {
    it('test', () => {
      // Todo
    })
  })
})

// ------------------------------------------------------------------------------------------------
