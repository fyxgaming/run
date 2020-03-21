/**
 * kernel.js
 *
 * Run central kernel, that loads tokens and creates transactions
 */

// ------------------------------------------------------------------------------------------------
// Kernel
// ------------------------------------------------------------------------------------------------

class Kernel {
  constructor (blockchain, purse, logger) {
    this.blockchain = blockchain
    this.purse = purse
    this.logger = logger
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Kernel
