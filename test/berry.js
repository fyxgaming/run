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

  it('should load favorite without protocol from blockchain', async () => {
    const location = '59925b22090824f1573a6ef650249d7b1730ce519a5e88594730fc0d50faedd9_o2'
    const favorite = await run.load(location)
    console.log(favorite)
  })

  it.only('should load post with protocol from blockchain', async () => {
    const location = '1e9c751bfa14e2f8c7f980ac005932224f3644273265e2740ccb0c0245acb18b_o1://b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0'
    const post = await run.load(location)
    console.log(post)
  })

  it('should support loading berries from berries', () => {
    // TODO
  })

  it('should support multiple fetches per berry', () => {
    // TODO
  })

  it('should throw if pluck more than one berry', () => {
    // TODO
  })
})
