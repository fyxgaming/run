/**
 * berry.js
 *
 * Tests for lib/kernel/berry.js
 */

const { Transaction } = require('bsv')
const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, payFor } = require('../env/config')
const { Berry, Jig } = Run

// ------------------------------------------------------------------------------------------------
// Berry
// ------------------------------------------------------------------------------------------------

describe('Berry', () => {
  describe('load', () => {
    it('should fetch to load a berry', async () => {
      const run = new Run()
      const berryTx = await payFor(new Transaction(), run)
      await run.blockchain.broadcast(berryTx)
      class B extends Berry {
        init (data) { this.data = data }
        static async pluck (location, fetch) {
          return new B(await fetch(location))
        }
      }
      const b = await run.load(berryTx.hash, B)
      expect(!!b.data).to.equal(true)
    })

    it('must only return berries from pluck', async () => {
      const run = new Run()
      class B { static async pluck (location, fetch, pluck) { return new B() } }
      await expect(run.load('123', B)).to.be.rejectedWith('Plucker must return an instance of Berry')
    })
  })

  describe('jig', () => {
    it('should support passing berries into jigs', async () => {
      const run = new Run()
      class B extends Berry { static async pluck (location, fetch, pluck) { return new B() } }
      await run.deploy(B)
      const b = await run.load('123', B)
      class A extends Jig { init (b) { this.b = b } }
      const a = new A(b)
      await a.sync()
      run.deactivate()
      const run2 = new Run({ blockchain: run.blockchain })
      await run2.load(a.location)
      // TODO: Add some checks
    })
  })

  describe.skip('protocols', () => {
    it('should load a twetch post', async () => {
      class TwetchPost extends Berry {
        init (text) {
          this.text = text
        }

        static async pluck (location, fetch, pluck) {
          const txo = await fetch(location)
          if (txo.out[0].s2 === '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut') { // B protocol
            return new TwetchPost(txo.out[0].s3)
          }
        }
      }
      const run = new Run({ network: 'main' })
      const txid = '4e146ac161324ef0b388798462867c29ad681ef4624ea4e3f7c775561af3ddd0'
      const post = await run.load(txid, TwetchPost)
      expect(post instanceof TwetchPost).to.equal(true)
      expect(post.text).to.equal('Came for the edgy marketing, stayed for truth & kindness')
    })

    it('should load a metanet node', async () => {
      class MetanetNode extends Berry {
        init (pnode, parent, data) {
          this.pnode = pnode
          this.parent = parent
          this.data = data
        }

        static async pluck (location, fetch, pluck) {
          const txo = await fetch(location)
          if (txo.out[0].s1 === 'meta') {
            const pnode = txo.out[0].s2
            const txidParent = txo.out[0].s3
            const data = txo.out[0].s4
            if (data === 'METANET_ROOT') {
              return new MetanetNode(pnode, null, data)
            } else {
              const parentNode = await pluck(txidParent)
              return new MetanetNode(pnode, parentNode, data)
            }
          }
        }
      }
      const run = new Run({ network: 'main' })
      const txid = '2f24d7edb8de0ef534d8e0bc2413eddda451b4accc481519a1647d7af79d8e88'
      const node = await run.load(txid, MetanetNode)
      expect(node.pnode).to.equal('1FqmFgY45CqSGXRNVpHNRQWqoNVCkRpUau')
      expect(node.parent instanceof MetanetNode).to.equal(true)
      expect(!!node.data).to.equal(true)
    })
  })

  // May load protocols in long form
  // Load multiple protocols
  // Set berries on code

  /*
    it('should support multiple fetches', () => {
      // TODO
    })

    it('should call pluck function with location and functions', async () => {
      const run = new Run()
      class CustomBerry { }
      class CustomProtocol {
        static async pluck (location, fetch, pluck) {
          expect(location).toBe('123')
          expect(typeof fetch).toBe('function')
          expect(typeof pluck).toBe('function')
          return new CustomBerry()
        }
      }
      CustomProtocol.deps = { expect: Run.expect, CustomBerry }
      CustomBerry.protocol = CustomProtocol
      await run.load('123', { protocol: CustomProtocol })
    })

    it('should not have a location is protocol is not deployed', async () => {
      const run = new Run({ network: 'main' })
      const txid = '4e146ac161324ef0b388798462867c29ad681ef4624ea4e3f7c775561af3ddd0'
      const post = await run.load(txid, { protocol: Twetch })
      expect(post.location.startsWith('!')).to.equal(true)
    })

    it('should throw if berry protocol doesnt return', async () => {
      const run = new Run()
      const txid = '4e146ac161324ef0b388798462867c29ad681ef4624ea4e3f7c775561af3ddd0'
      class Custom { static async pluck () { } }
      await expect(run.load(txid, { protocol: Custom })).to.be.rejected
    })

    it('should throw if berry protocol throws', async () => {
      const run = new Run()
      class Custom { static async pluck () { throw new Error('fail to load') } }
      await expect(run.load('123', { protocol: Custom })).to.be.rejectedWith('fail to load')
    })
  })

  /*
  it('should fail to deploy if protocol is undeployed', async () => {
    const txid = 'd5e8313dc183d5a600a37933a55d1679436fc0d3f4d3c672b85872f84dbc41e1_o2'
    const post = await run.load(txid, { protocol: Twetch })
    const favorite = new Favorite(post)
    await favorite.sync()
  }).timeout(10000)

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
    const location = 'd5e8313dc183d5a600a37933a55d1679436fc0d3f4d3c672b85872f84dbc41e1_o2'
    const favorite = await run.load(location)
    console.log(favorite)
  }).timeout(10000)

  it('should load post with protocol from blockchain', async () => {
    const location = 'f5aba0377ccb7be4ee0f6ab0f9a6cef64bbd3d2bbc0ff0bd2e050e7733a3e0e1_o1://b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0'
    const post = await run.load(location)
    console.log(post)
  }).timeout(10000)

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

  it('should support deploying protocol after already using it locally', () => {
    // TODO
  })
  */
})

// ------------------------------------------------------------------------------------------------
