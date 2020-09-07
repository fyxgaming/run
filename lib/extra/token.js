/**
 * token.js
 *
 * Token jig that provides ERC-20 like support
 */

const Jig = require('../kernel/jig')
const Code = require('../kernel/code')

// ------------------------------------------------------------------------------------------------
// Token
// ------------------------------------------------------------------------------------------------

class Token extends Jig {
  init (...tokens) {
    // The base Token class cannot be created on its own
    if (Object.getPrototypeOf(this.constructor) === Jig) {
      throw new Error('Token must be extended')
    }

    // Case: mint
    if (caller === this.constructor) {
      this._checkAmount(caller.amountToMint)
      this.amount = caller.amountToMint
      return
    }

    // Case: Change
    if (caller && caller.constructor === this.constructor) {
      this._checkAmount(caller.amountOfChange)
      this.amount = caller.amountOfChange
      return
    }

    // Case: Combine
    if (!Array.isArray(tokens) || tokens.length < 2) {
      throw new Error('Invalid tokens to combine')
    }

    // Each token to combine must all be of this type
    if (tokens.some(token => token.constructor !== this.constructor)) {
      throw new Error('Cannot combine different token classes')
    }

    // Destroy each token, absorbing it into this one
    this.amount = 0
    tokens.forEach(token => {
      this.amount += token.amount
      token.destroy()
    })

    // Make sure our new amount is within safe range
    this._checkAmount(this.amount)
  }

  static mint (amount) {
    this.amountToMint = amount
    const token = new this()
    delete this.amountToMint
    this.supply += amount
    return token
  }

  destroy () {
    super.destroy()
    this.amount = 0
  }

  send (to, amountToSend = this.amount) {
    this._checkAmount(amountToSend)

    if (this.amount === amountToSend) {
      this.owner = to
      return null
    }

    if (amountToSend > this.amount) {
      throw new Error('Not enough funds')
    }

    this.amountOfChange = this.amount - amountToSend
    const change = new this.constructor()
    delete this.amountOfChange

    this.amount = amountToSend
    this.owner = to

    return change
  }

  _checkAmount (amount) {
    if (typeof amount !== 'number') throw new Error('amount is not a number')
    if (!Number.isInteger(amount)) throw new Error('amount must be an integer')
    if (amount <= 0) throw new Error('amount must be positive')
    if (amount > Number.MAX_SAFE_INTEGER) throw new Error('amount too large')
  }
}

Token.sealed = false

Token.decimals = 0

Token.icon = { emoji: null }

Token.symbol = null

Token.supply = 0

// ------------------------------------------------------------------------------------------------

module.exports = Code._preinstall(Token)
