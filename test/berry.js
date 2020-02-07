const { describe, it } = require('mocha')
const { createRun, Run } = require('./helpers')
const { Jig, Berry } = Run

class Post extends Berry {
  init (text) {
    this.text = text
  }
}

class Twetch {
  static async pluck (location, fetch, pluck) {
    const tx = await fetch(location)

    const chunks = tx.outputs[0].script.chunks
    const protocol = chunks[2].buf.toString('utf8')
    const text = chunks[3].buf.toString('utf8')

    if (protocol === Twetch.BProtocolIdentifier) {
      return new Post(text)
    }
  }
}

Twetch.BProtocolIdentifier = '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut'
Twetch.deps = { Post }
Post.protocol = Twetch

const run = createRun({ network: 'main' })

describe('Berry', () => {
  it('should deploy and load a twetch post', async () => {
    class Favorite extends Jig {
      init (post) {
        this.post = post
      }
    }

    await run.deploy(Twetch)
    const txid = 'b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0'
    const post = await run.load(txid, { protocol: Twetch })
    console.log(post)

    // console.log(Favorite.name)
    const favorite = new Favorite(post)
    await favorite.sync()
    // run.state.cache.clear()
    const favorite2 = await run.load(favorite.location)
    console.log(favorite2)
  }).timeout(10000)

  it('should fail to deploy if protocol is undeployed', () => {

  })

  // Move the protocol manager inside of Run
  // Try loading a long-form location, with a specific protocol
  // Test subloads
})
