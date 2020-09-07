const bsv = require('bsv')
const Run = require('../dist/run.node.min')

async function main () {
  class Princess extends Jig {
    send (to) { this.owner = to }
  }

  class Gold extends Jig {
    send (to) { this.owner = to }
  }

  class Ransom extends Jig {
    init (tx, owner) { this.tx = tx; this.owner = owner }
  }

  // ------------------------------------------------------------------------
  // Dragon acquires the princess
  // ------------------------------------------------------------------------

  const dragonRun = new Run({ network: 'mock' })

  const princess = new Princess()

  await princess.sync()

  // ------------------------------------------------------------------------
  // Town acquires some gold
  // ------------------------------------------------------------------------

  const townRun = new Run({ network: 'mock' })

  const gold = new Gold()

  await gold.sync()

  // ------------------------------------------------------------------------
  // Town creates an atomic swap proposal and signs it
  // ------------------------------------------------------------------------

  const swap = new Run.Transaction(() => {
    gold.send(dragonRun.owner.pubkey)
    princess.send(townRun.owner.pubkey)
  })

  const swapTransaction = await swap.export()

  swap.rollback()

  // ------------------------------------------------------------------------
  // Town sends the proposal to the dragon
  // ------------------------------------------------------------------------

  const buffer = new Uint8Array(swapTransaction.toBuffer())

  const ransom = new Ransom(buffer, dragonRun.owner.pubkey)

  await ransom.sync()

  // ------------------------------------------------------------------------
  // Dragon reviews the proposal and then accepts it
  // ------------------------------------------------------------------------

  dragonRun.activate()

  const tx = new bsv.Transaction(bsv.deps.Buffer.from(ransom.tx))

  await dragonRun.transaction.import(tx)

  console.log('Number of jigs swapped:', dragonRun.transaction.actions.length)

  dragonRun.transaction.end()

  await dragonRun.sync()
}

main()
