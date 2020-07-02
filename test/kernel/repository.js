/**
 * repository.js
 *
 * Tests for lib/kernel/repository.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')

// ------------------------------------------------------------------------------------------------
// Repository
// ------------------------------------------------------------------------------------------------

describe('Repository', () => {
  describe('install', () => {
    it('creates from class', () => {
      const run = new Run()
      class A { }
      const CA = run.install(A)
      expect(CA.toString()).to.equal(A.toString())
    })
  })
})

// ------------------------------------------------------------------------------------------------
