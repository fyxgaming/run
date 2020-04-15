const bsv = require('bsv')
const Run = require('../dist/run.node.min')
const { asm } = Run

// Create a custom output script that to spend must input the result of 2+2
class TwoPlusTwoLock {
  get script () { return asm('OP_2 OP_2 OP_ADD OP_EQUAL') }
}

TwoPlusTwoLock.deps { asm }

// Create a NonStandardOwner that is capable of signing these custom output scripts
class NonStandardOwner {
  next () { return new TwoPlusTwoLock() }

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
  const owner = new NonStandardOwner()

  const run = new Run({ network: 'mock', owner })

  const dragon = new Dragon()
  await dragon.sync()

  dragon.setName('Victoria')
  await dragon.sync()

  console.log('Non-standard owner signed')
}

main().catch(e => console.error(e))
