const bsv = require('bsv')
const Run = require('../dist/run.node.min')

class SumScript {
    toBytes() {
        // OP_ADD 2 OP_EQUALVERIFY
        return new Uint8Array([0x93, 0x02, 0x88])
    }
}

class MathProblem extends Jig {
    init(owner) { this.owner = owner }
    claim(owner) { this.owner = owner }
}

async function main() {
    const run = new Run({ network: 'mock' })

    const problemScript = new SumScript()
    const mathProblem = new MathProblem(problemScript)
    await mathProblem.sync()

    console.log(mathProblem)
}

main().catch(e => console.error(e))