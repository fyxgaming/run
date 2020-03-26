/**
 * transaction.js
 */

class Transaction {
  _begin () {
    console.log('[Transaction] Begin')
  }

  _end () {
    console.log('[Transaction] End')
  }

  _deploy (bundle) {
    console.log(`[Transaction] Deploying bundle: ${bundle}`)
  }
}

module.exports = Transaction
