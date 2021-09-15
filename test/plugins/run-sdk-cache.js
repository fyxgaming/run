
/*
  // ----------------------------------------------------------------------------------------------
  // _dedupUtxos
  // ----------------------------------------------------------------------------------------------

  describe('_dedupUtxos', () => {
    it('dedups utxos', () => {
      const a = { txid: '0', vout: 1, script: '2', satoshis: 3 }
      const b = { txid: '4', vout: 5, script: '6', satoshis: 7 }
      expect(_dedupUtxos([a, b, b])).to.deep.equal([a, b])
    })

    // ------------------------------------------------------------------------

    it('logs warning', () => {
      const Log = unmangle(unmangle(Run)._Log)
      const previousLogger = Log._logger
      try {
        Log._logger = stub({ warn: () => {} })
        const a = { txid: 'abc', vout: 1, script: '2', satoshis: 3 }
        expect(_dedupUtxos([a, a])).to.deep.equal([a])
        const lastWarning = Log._logger.warn.lastCall.args.join(' ')
        expect(lastWarning.includes('[bsv] Duplicate utxo returned from server: abc_o1')).to.equal(true)
      } finally {
        Log._logger = previousLogger
      }
    })
  })
  */
