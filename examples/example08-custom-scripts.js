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
    init(problem) { this.owner = problem }
    solve() { this.solved = true }
}

class MathSolver extends Owner {
    getOwner() {
        return new SumScript()
    }

    async sign(tx) {
        // Find the input that has the SumScript
        // Write the signature [1, 1]
        return tx
    }
}

async function main() {
    const teacher = new Run({ network: 'mock' })

    // Create a math problem. What numbers sum to 2? Spend the output to answer.
    const problemScript = new SumScript()
    const mathProblem = new MathProblem(problemScript)
    await mathProblem.sync()

    console.log(mathProblem)

    const solver = new MathSolver()
    const student = new Run({ network: 'mock', owner: solver })
    mathProblem.solve()
    await mathProblem.sync()

    console.log(mathProblem)
}

main().catch(e => console.error(e))