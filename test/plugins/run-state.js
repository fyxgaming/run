/**
 * run-state.js
 *
 * Tests for lib/plugins/run-state.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const { RunState } = Run.plugins

// ------------------------------------------------------------------------------------------------
// RunState
// ------------------------------------------------------------------------------------------------

describe('RunState', () => {
  it('enabled by default on mainnet', () => {
    const run = new Run({ network: 'main' })
    expect(run.cache instanceof RunState).to.equal(true)
  })

  // ------------------------------------------------------------------------

  it('not used on testnet or mocknet', () => {
    const run1 = new Run({ network: 'test' })
    expect(run1.cache instanceof RunState).to.equal(false)
    const run2 = new Run({ network: 'mock' })
    expect(run2.cache instanceof RunState).to.equal(false)
  })
})

// ------------------------------------------------------------------------------------------------
