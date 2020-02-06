const { describe, it } = require('mocha')
const { createRun, Run } = require('./helpers')
const { Jig, Jiglet } = Run

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
    const protocol = tx.outputs[0].script.chunks[2].buf.toString('utf8')
    if (protocol !== BProtocolIdentifier) return

    const text = tx.outputs[0].script.chunks[3].buf.toString('utf8')
    return new TwetchPost(`${TwetchLoader.location}://${location}`, text)
  }
}

TwetchLoader.deps = { TwetchPost }

TwetchPost.loader = TwetchLoader

TwetchLoader.originMainnet = 'b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0_o0'
TwetchLoader.locationMainnet = 'b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0_o0'
TwetchLoader.ownerMainnet = '02106ec352df6f29cbf65eb2fa8051ca1c2bce4605df0ae41600efd8f3a9276269'

TwetchPost.originMainnet = 'b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0_o1'
TwetchPost.locationMainnet = 'b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0_o1'
TwetchPost.ownerMainnet = '02106ec352df6f29cbf65eb2fa8051ca1c2bce4605df0ae41600efd8f3a9276269'

const run = createRun({ network: 'main' })

Run.protocol.install(TwetchLoader)

describe('Jiglet', () => {
  it('should load a twetch post', async () => {
    class Favorite extends Jig {
      init (post) {
        this.post = post
      }
    }

    const post = await run.load('b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0_o0')

    console.log('------------')
    console.log(post)
    console.log('------------')

    const favorite = new Favorite(post)

    await favorite.sync()

    console.log('------------')
    console.log(favorite)
    console.log('------------')

    const favorite2 = await run.load('8a0c1220c75e852f98c4ab1e313d1f0e90fc98499039a8db5a54669eceeca0c1_o2')

    console.log('------------')
    console.log(favorite2)
    console.log('------------')
  })
})
