const bsv = require('bsv')
const Run = require('../dist/run.node.min')
const { asm } = Run

// Create a locking script which to spend must input the value of 2+2
class TwoPlusTwoLock {
  get script () { return asm('OP_2 OP_2 OP_ADD OP_EQUAL') }
}

TwoPlusTwoLock.deps = { asm }

// Create a custom owner that is capable of unlocking TwoPlusTwoLocks
class TwoPlusTwoKey {
  // Returns the Lock used in the next jig owner
  next () { return new TwoPlusTwoLock() }

  // Unlocks a locking script
  async sign (tx, locks) {
    // Find each input that is a TwoPlusTwo lock and sign it with 4
    tx.inputs
      .filter((_, n) => locks[n] instanceof TwoPlusTwoLock)
      .forEach(input => input.setScript('OP_4'))
  }
}

// A basic jig that we can update the properties on
class Dragon extends Jig {
  setName(name) { this.name = name }
}

async function main () {
  const run = new Run({ network: 'mock', owner: new TwoPlusTwoKey() })

  const dragon = new Dragon()
  await dragon.sync()

  dragon.setName('Victoria')
  await dragon.sync()

  console.log('Unlocked the custom lock')
}

main().catch(e => console.error(e))
