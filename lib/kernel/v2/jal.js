/**
 * jal.js
 * 
 * The Jig Access Layer, a module to allow sandboxed jigs to talk to Run code safely
 */

// ------------------------------------------------------------------------------------------------
// JAL
// ------------------------------------------------------------------------------------------------

class UnownedLock {
    script() { return asm(`OP_FALSE OP_RETURN`) }
    domain() { return 0 }
}

const JAL = { }

JAL._Unowned = Unowned

// ------------------------------------------------------------------------------------------------

module.exports = JAL