

  // The owner might want to be notified when things change. Listen for blockchain events?

  async utxos (blockchain) {
    const lock = Lock.from(this.next())
    const buffer = bsv.deps.Buffer.from(lock.script)
    const script = bsv.Script.from(buffer)
    return blockchain.utxos(script)
  }

  // When the 1-5th UTXO is exhausted, we never query it again. Is that a good practice?

  // When a jig is updated, it needs to be updated in the owner
  // There's a notification function. 

  // Remove inputs, add outputs
  run.on('input', token => this.remove(token))
  run.on('output', token => this.add(token))
  run.on('sync', () => this.sync())

  /*
  async unlock (tx) {
    const sighash = tx.sighash(1)
    const sig = ECDSA.sign('...')

    // How to generate the signature from the transaction?
    // What about previous key? What if I load the key?
    return new StandardKey(signature)
  }
  */