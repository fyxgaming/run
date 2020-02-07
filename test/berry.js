const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
// const { expect } = chai
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

class Favorite extends Jig {
  init (post) {
    this.post = post
  }
}

describe('Berry', () => {
  it('should fail to deploy if protocol is undeployed', async () => {
    const txid = 'b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0'
    const post = await run.load(txid, { protocol: Twetch })
    const favorite = new Favorite(post)
    await favorite.sync()
  })

  it('should deploy and load a twetch post', async () => {
    await run.deploy(Twetch)
    const txid = 'b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0'
    const post = await run.load(txid, { protocol: Twetch })
    const favorite = new Favorite(post)
    await favorite.sync()
    await run.load(favorite.location)
    run.state.cache.clear()
    await run.load(favorite.location)
  }).timeout(10000)

  it.only('should load post without protocol from blockchain', async () => {
    const location = '59925b22090824f1573a6ef650249d7b1730ce519a5e88594730fc0d50faedd9_o2'
    const favorite = await run.load(location)
    console.log(favorite)
  })

  // Move the protocol manager inside of Run
  // Try loading a long-form location, with a specific protocol
  // Test subloads
})
