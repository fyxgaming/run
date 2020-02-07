const { describe, it } = require('mocha')
const { createRun, Run } = require('./helpers')
const { Jig, Berry } = Run

class Post extends Berry {
  init (location, text) {
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

Run.installProtocol(Twetch)

describe('Berry', () => {
  it('should load a twetch post', async () => {
    console.log(Jig.name)
    /*
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

    // const favorite2 = await run.load(favorite.location)
    */
    const favorite2 = await run.load('140a35a53523eb5538665847ecb4e1e8817e8dae2988cc2ba19e6da017f65c0c')

    console.log('------------')
    console.log(favorite2)
    console.log('------------')
  })

  // Test
})
