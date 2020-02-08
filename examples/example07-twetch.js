const bsv = require('bsv')
const Run = require('../dist/run.node.min')

// ----------------------------------------------------------------------------
// Define a protocol to read twetch posts
// ----------------------------------------------------------------------------

class Twetch {
    static async pluck (txid, fetch) {
        // The txo returned from fetch is unwriter's txo format
        const txo = await fetch(txid)

        // Twetch posts start with a B protocol and put the text in s3
        if (txo.out[0].s2 === '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut') {
            return new TwetchPost(txo.out[0].s3)
        }
    }
}

// Berries are stateless objects read from a protocol. They can be used in jigs.
class TwetchPost extends Berry {
    init (text) {
        this.text = text
    }
}

// We must always set the protocol on berry classes, because only this protocol
// can create instances. The Berry class enforces this.
TwetchPost.protocol = Twetch

Twetch.deps = { TwetchPost }

// ----------------------------------------------------------------------------
// Read a twetch post and use it in a Jig
// ----------------------------------------------------------------------------

const network = 'main'
const twetchPostTxid = 'b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0'
const purse = 'KxCNcuTavkKd943xAypLjRKufmdXUaooZzWoB4piRRvJK74LYwCR'

async function main() {
    const run = new Run({ network, purse })

    // Deploy the twetch protocol to mainnet. In a production app, we would pre-deploy the protocol.
    await run.deploy(Twetch)

    // We use the { protocol } syntax to specify this Twetch protocol is to be used
    const post = await run.load(twetchPostTxid, { protocol: Twetch })

    // TODO: Metanet example does this:
    console.log(post)
    console.log(Twetch.location)
    console.log(Twetch.owner)
    console.log(TwetchPost.location)
    console.log(TwetchPost.owner)
}

main()