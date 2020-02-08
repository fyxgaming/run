const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { createRun, Run } = require('./helpers')
const { Jig, Berry } = Run

class Post extends Berry {
  init (text) {
    this.text = text
  }
}

class Twetch {
  static async pluck (location, fetch, pluck) {
    const txo = await fetch(location)
    if (txo.out[0].s2 === '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut') { // B protocol
      return new Post(txo.out[0].s3)
    }
  }
}

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
    const txid = 'd5e8313dc183d5a600a37933a55d1679436fc0d3f4d3c672b85872f84dbc41e1_o2'
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

  it.only('should load favorite without protocol from blockchain', async () => {
    const location = 'd5e8313dc183d5a600a37933a55d1679436fc0d3f4d3c672b85872f84dbc41e1_o2'
    const favorite = await run.load(location)
    console.log(favorite)
  })

  it('should load post with protocol from blockchain', async () => {
    const location = 'f5aba0377ccb7be4ee0f6ab0f9a6cef64bbd3d2bbc0ff0bd2e050e7733a3e0e1_o1://b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0'
    const post = await run.load(location)
    console.log(post)
  })

  it('should throw if load invalid post with protocol', async () => {
    const location = 'f5aba0377ccb7be4ee0f6ab0f9a6cef64bbd3d2bbc0ff0bd2e050e7733a3e0e1_o1://6d8f2138df60fe2dc0b35d78fcb987086258ef5ab73bdff8b08bb8c01001840e'
    await expect(run.load(location)).to.be.rejectedWith('Failed to load berry using Twetch')
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
