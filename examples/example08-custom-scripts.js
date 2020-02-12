const bsv = require('bsv')
const Run = require('../dist/run.node.min')
const { Owner } = Run

class SumScript {
    toBytes() {
        // OP_1 OP_ADD OP_2 OP_EQUAL
        return new Uint8Array([0x51, 0x93, 0x52, 0x87])
    }
}

class Problem extends Jig {
    init(problem) { this.owner = problem }
    solve() { this.solved = true }
}

class Solver extends Owner {
    getOwner() {
        return new SumScript()
    }

    async sign(tx) {
        const pattern = Buffer.from(new SumScript().toBytes()).toString('hex')

        // Find inputs that match the SumScript pattern
        // Then write the "signature" OP_1
        tx.inputs.forEach(input => {
            const pkscript = input.output.script.toBuffer().toString('hex')
            if (pkscript === pattern) {
                input.script.add(bsv.Opcode.OP_1)
            }
        })

        return tx
    }
}

async function main() {
    const teacher = new Run({ network: 'mock' })

    // Create a math problem. What numbers sum to 2? Spend the output to answer.
    const script = new SumScript()
    const problem = new Problem(script)
    await problem.sync()

    const solver = new Solver()
    const student = new Run({ network: 'mock', owner: solver })
    problem.solve()
    await problem.sync()

    console.log('Custom Script Solved:', problem.solved)
}

main().catch(e => console.error(e))