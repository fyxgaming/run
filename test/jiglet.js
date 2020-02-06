const { describe, it } = require('mocha')
const { createRun, Run } = require('./helpers')
const { Jiglet } = Run

class TwetchPost extends Jiglet {
  init (location, text) {
    this.location = location
    this.text = text
  }
}

class TwetchLoader {
  static async load (location, blockchain) {
    const txid = location.slice(0, 64)
    const tx = await blockchain.fetch(txid)
    const BProtocolIdentifier = '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut'
    if (tx.outputs[0].script.chunks[2].buf.toString('utf8') !== BProtocolIdentifier) return
    return new TwetchPost(location, tx.outputs[0].script.chunks[3].buf.toString('utf8'))
  }
}

TwetchLoader.deps = { TwetchPost }
TwetchPost.loader = TwetchLoader

const run = createRun({ network: 'main' })

Run.protocol.install(TwetchLoader)

describe('Jiglet', () => {
  it('should load a twetch post', async () => {
    const post = await run.load('b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0_o0')
    console.log(post)
    // console.log(JSON.stringify(tx.outputs[0].script.toString('utf8')))
    // console.log(JSON.stringify(tx.outputs[0]._scriptBuffer.toString('utf8')))
  })
})
