const bsv = require('bsv')
const Run = require('../dist/run.node.min')
const { asm } = Run.extra

/**
 * Define a lock
 * 
 * A lock is a special kind of jig owner that is a custom locking script
 * 
 * Below, script is the output script. Domain is how big its unocking script will be in bytes.
 */

class TwoPlusTwoLock {
  script () {
    const x= asm('OP_2 OP_2 OP_ADD OP_EQUAL')
    console.log('---', x, typeof x)
    return x
  }
  domain () { return 1 }
}

TwoPlusTwoLock.deps = { asm }

// Locks must be deployed on their own before they can be used 
async function deployLockClass() {
  const lockRun = new Run({ network: 'mock' })
  console.log('1')
  lockRun.deploy(TwoPlusTwoLock)
  console.log('2')
  await lockRun.sync()
  console.log('3')
  console.log(TwoPlusTwoLock.location)
}

/**
 * Define a key
 * 
 * To update jigs with the above lock, we need to create unlocking scripts.
 * 
 * We can do this by implementing the Owner API below. There are two method.
 */

class TwoPlusTwoKey {
  async nextOwner () { return new TwoPlusTwoLock() }

  async sign (rawtx, parents, locks) {
    const tx = new bsv.Transaction(rawtx)

    // Sign any TwoPlusTwoLock
    tx.inputs
      .filter((input, n) => locks[n] instanceof TwoPlusTwoLock)
      .forEach(input => input.setScript('OP_4'))
    
    return tx.toString('hex')
  }
}

/**
 * Create a jig assigned to the TwoPlusTwoLock and update it with the TwoPlusTwoKey
 */
async function main () {
  await deployLockClass()

  const run = new Run({ network: 'mock', owner: new TwoPlusTwoKey() })

  run.logger = console

  // TODO
  run.trust('*')

  console.log('a')
  class Dragon extends Jig {
    setName(name) { this.name = name }
  }
  const dragon = new Dragon()
  await dragon.sync()
  console.log('b')

  dragon.setName('Victoria')
  await dragon.sync()
  console.log('c')

  console.log('Unlocked the custom lock')
}

main().catch(e => console.error(e))
