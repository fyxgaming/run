/**
 * opreturn.js
 *
 * Tests for lib/util/opreturn.js
 */

// ------------------------------------------------------------------------------------------------
// _checkRunTransaction
// ------------------------------------------------------------------------------------------------

/*
describe('_checkRunTransaction', () => {
  it('should throw if bad protocol version', () => {
    const tx1 = buildRunTransaction('run', [0x00, Run.protocol], {}, 'buildSafeDataOut', true, 0)
    expect(() => _checkRunTransaction(tx1)).to.throw('Unsupported run protocol')
    const tx2 = buildRunTransaction('run', [0x01], {}, 'buildSafeDataOut', true, 0)
    expect(() => _checkRunTransaction(tx2)).to.throw('Unsupported run protocol')
    const tx3 = buildRunTransaction('run', [0x03], {}, 'buildSafeDataOut', true, 0)
    expect(() => _checkRunTransaction(tx3)).to.throw('Unsupported run protocol')
  })
})

// ------------------------------------------------------------------------------------------------
// _outputType
// ------------------------------------------------------------------------------------------------

describe('_outputType', () => {
  it('should return rundata', () => {
    const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
    expect(_outputType(tx, 0)).to.equal('rundata')
  })

  it('should return code', () => {
    const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
    expect(_outputType(tx, 1)).to.equal('code')
  })

  it('should return jig', () => {
    const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
    expect(_outputType(tx, 2)).to.equal('jig')
    expect(_outputType(tx, 3)).to.equal('jig')
  })

  it('should return other for change', () => {
    const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
    expect(_outputType(tx, 4)).to.equal('other')
  })

  it('should return other for money', () => {
    const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
    expect(_outputType(tx, 0)).to.equal('other')
  })

  it('should return other for bad run data', () => {
    const tx = buildRunTransaction('run', [Run.protocol], 'hello, world', 'buildSafeDataOut', true, 4)
    expect(_outputType(tx, 4)).to.equal('other')
  })
})
*/

// ------------------------------------------------------------------------------------------------
