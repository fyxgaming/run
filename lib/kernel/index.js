/**
 * kernel.js
 *
 * Run central kernel, that loads tokens and creates transactions
 */

// ------------------------------------------------------------------------------------------------
// Kernel
// ------------------------------------------------------------------------------------------------

class Kernel {
  constructor (blockchain, purse) {
    this.blockchain = blockchain
    this.purse = purse
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Kernel
