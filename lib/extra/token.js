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

    // Case: Mint
    if (caller === this.constructor) {
      this._checkAmount(caller.mintAmount)
      this.amount = caller.mintAmount
      return
    }

    // Case: Send
    if (caller && caller.constructor === this.constructor) {
      this._checkAmount(caller.sendAmount)
      this.amount = caller.sendAmount
      this.owner = caller.sendOwner
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

    // Check for duplicate tokens in the array
    const countOf = token => tokens.reduce((count, next) => next === token ? count + 1 : count, 0)
    if (tokens.some(token => countOf(token) > 1)) throw new Error('Cannot combine duplicate tokens')

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
    this.mintAmount = amount
    const token = new this()
    delete this.mintAmount
    this.supply += amount
    return token
  }

  destroy () {
    super.destroy()
    this.amount = 0
  }

  send (to, amount = this.amount) {
    this._checkAmount(amount)

    if (amount > this.amount) {
      throw new Error('Not enough funds')
    }

    this.sendAmount = amount
    this.sendOwner = to
    const sent = new this.constructor()
    delete this.sendAmount
    delete this.sendOwner

    if (this.amount === amount) {
      this.destroy()
    } else {
      this.amount -= amount
    }

    return sent
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
// Presets
// ------------------------------------------------------------------------------------------------

// TODO

// ------------------------------------------------------------------------------------------------

module.exports = Code._preinstall(Token)
