/**
 * This example demonstrates creating a customized fungible token and
 * sending it between two friends.
 *
 * To run, execute `node example05-tokens.js` from its directory.
 */

const Run = require('../dist/run.node.min')
const bsv = require('bsv')
const { Token } = Run.extra

const aliceRun = new Run({ network: 'mock' })
const bobRun = new Run({ network: 'mock' })
const bob = bobRun.owner.pubkey.toString()

async function main () {
  // ------------------------------------------------------------------------
  // Alice mints 100 gold and sends 50 to Bob in two pieces
  // ------------------------------------------------------------------------

  aliceRun.activate()

  class Gold extends Token { }
  Gold.source = 'Bitcoin Land'
  Gold.quality = 'Excellent'

  let alicesGold = Gold.mint(100)
  await alicesGold.sync()

  alicesGold.send(bob, 20)
  alicesGold.send(bob, 30)

  await aliceRun.sync()

  // ------------------------------------------------------------------------
  // Bob loads his gold in two pieces and them combines them together
  // ------------------------------------------------------------------------

  bobRun.activate()

  const goldClassTxid = Gold.location.slice(0, 64)
  bobRun.trust(goldClassTxid)

  await bobRun.inventory.sync()

  const pieces = bobRun.inventory.jigs.filter(jig => jig instanceof Gold)
  const bobsGold = new Gold(...pieces)

  // ------------------------------------------------------------------------
  // Alice mints 30 more gold for herself
  // ------------------------------------------------------------------------

  aliceRun.activate()

  const newGold = Gold.mint(30)

  alicesGold = new Gold(alicesGold, newGold)

  // ------------------------------------------------------------------------
  // Display the final balances
  // ------------------------------------------------------------------------

  console.log('Alice:', alicesGold.amount) // 80
  console.log('Bob:', bobsGold.amount) // 50
}

main().catch(e => console.error(e))
