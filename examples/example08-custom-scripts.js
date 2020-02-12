const bsv = require('bsv')
const Run = require('../dist/run.node.min')
const { Owner } = Run

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

class MathSolver extends Owner {
    getOwner() {
        return new SumScript()
    }

    async sign(tx) {
        return tx
    }
}

async function main() {
    const owner = new MathSolver()
    const run = new Run({ network: 'mock', owner })

    const problemScript = new SumScript()
    const mathProblem = new MathProblem(problemScript)
    await mathProblem.sync()

    console.log(mathProblem)
}

main().catch(e => console.error(e))