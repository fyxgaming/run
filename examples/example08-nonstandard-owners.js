const bsv = require('bsv')
const Run = require('../dist/run.node.min')
const { asm } = Run

class TwoPlusTwoLock {
  get script () { return asm('OP_2 OP_2 OP_ADD OP_EQUAL') }
  static get deps() { return { asm } }
}

class NonStandardOwner {
  next () { return new TwoPlusTwoLock() }

  async sign (tx, locks) {
    tx.inputs
      .filter((_, n) => locks[n] instanceof TwoPlusTwoLock)
      .forEach(input => input.setScript('OP_4'))
  }
}

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
