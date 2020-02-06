const { describe, it } = require('mocha')
const { createRun, Run } = require('./helpers')
const { Jiglet } = Run

class TwetchPost extends Jiglet { }

class TwetchLoader {
  static async load (location, blockchain) {
    const txid = location.slice(0, 64)
    const tx = await blockchain.fetch(txid)
    console.log(JSON.stringify(tx.outputs[0]))
    return new TwetchPost()
  }
}

TwetchLoader.deps = { TwetchPost }
TwetchPost.loader = TwetchLoader

const run = createRun({ network: 'main' })

Run.protocol.install(TwetchLoader)

describe('Jiglet', () => {
  it('should load a twetch post', async () => {
    console.log('hello')
    const post = await run.load('b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0_o0')
    console.log(post)
  })
})
