/**
 * misc.js
 *
 * Tests for lib/kernel/misc.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { _bsvNetwork } = unmangle(unmangle(Run)._misc)

// ------------------------------------------------------------------------------------------------
// _bsvNetwork
// ------------------------------------------------------------------------------------------------

describe('_bsvNetwork', () => {
  it('should return appropriate network', () => {
    expect(_bsvNetwork('main')).to.equal('mainnet')
    expect(_bsvNetwork('mainnet')).to.equal('mainnet')
    expect(_bsvNetwork('mainSideChain')).to.equal('mainnet')
    expect(_bsvNetwork('test')).to.equal('testnet')
    expect(_bsvNetwork('mock')).to.equal('testnet')
    expect(_bsvNetwork('stn')).to.equal('testnet')
  })
})

// ------------------------------------------------------------------------------------------------
