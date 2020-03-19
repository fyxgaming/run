/**
 * adder.js
 *
 * Tests for Adder
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Adder = require('./config').lib

describe('Adder', () => {
  describe('add', () => {
    it('should sum', () => {
      const adder = new Adder()
      expect(adder.add(1, 1)).to.equal(2)
    })
  })

  it('should have version', () => {
    expect(Adder.version).to.equal(require('../package').version)
  })
})
