/**
 * This example demonstrates creating a real jig on testnet using node.js.
 *
 * To run, execute `node example03-testnet.js` from its directory.
 */

const Run = require('../dist/run.node.min')

const purse = 'cQP1h2zumWrCr2zxciuNeho61QUGtQ4zBKWFauk7WEhFb8kvjRTh'
const run = new Run({ network: 'test', purse })

async function main () {
  class Dragon extends Jig {
    setName (name) {
      this.name = name
    }
  }

  const dragon = new Dragon()

  dragon.set('Satoshi Nakamoto')

  await dragon.sync()

  const dragon2 = await run.load(dragon.location)

  console.log('Same dragon: ', dragon.value === dragon2.value)
  console.log('Dragon location', dragon2.location)
}

main().catch(e => console.error(e))
