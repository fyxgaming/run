/**
 * performance.js
 *
 * Optional performance tests. To run:
 *
 *    env PERF=1 npm run test
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const config = require('./config')
const Adder = config.lib

describe('Performance', () => {
  if (!config.perf) return

  it('should sum a billion numbers quickly', () => {
    const adder = new Adder()
    const start = new Date()
    for (let i = 0; i < 1000 * 1000 * 1000; i++) {
      adder.add(i, 1)
    }
    expect(new Date() - start).to.be.lessThan(5000)
  })
})
