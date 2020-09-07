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
  init (tokens) {
    // The base Token class cannot be created on its own
    if (Object.getPrototypeOf(this.constructor) === Jig) {
      throw new Error('Token must be extended')
    }

    // Case: Combine
    if (tokens) {
      // We must combine at least 2 tokens. Otherwise, no point.
      if (!Array.isArray(tokens) || tokens.length < 2) {
        throw new Error('Invalid tokens to combine')
      }

      // Each token to combine must all be of this type
      if (tokens.some(token => token.constructor !== this)) {
        throw new Error('Cannot combine different token classes')
      }

      // Destroy each token, absorbing it into this one
      this.amount = 0
      tokens.forEach(token => {
        this.amount += token.amount
        token._destroy()
      })

      // Make sure our new amount is within safe range
      this._checkAmount(this.amount)
    }

    // Case: mint
    if (!tokens) {
      // Only the class can mint which requires its owner's approval
      if (caller !== this.constructor) {
        throw new Error(`Use ${this.constructor.name}.mint to mint`)
      }

      this._checkAmount(caller.amountToMint)

      this.amount = caller.amountToMint
    }
  }

  static mint (amount) {
    this.amountToMint = amount
    const token = new this()
    delete this.amountToMint
    return token
  }

  _destroy () {
    this.amount = 0
    super.destroy()
  }

  send (to, amount) {
    amount = typeof amount === 'undefined' ? this.amount : amount

    this._checkAmount(amount)

    if (amount > this.amount) {
      throw new Error('not enough funds')
    }

    if (this.amount === amount) {
      this.owner = to
      return null
    }

    // how to send safely...

    const change = new this.constructor(this.amount - amount, this)
    this.owner = to
    return change
  }

  /*
  get value () {
    let amount = this.amount
    for (let i = 0; i < this.constructor.decimals; i++) amount /= 10
    return amount
  }
  */

  static combine (...tokens) {
    return new this(undefined, undefined, tokens)
  }

  _checkAmount (amount) {
    if (typeof amount !== 'number') throw new Error('amount is not a number')
    if (!Number.isInteger(amount)) throw new Error('amount must be an integer')
    if (amount <= 0) throw new Error('amount must be positive')
    if (amount > Number.MAX_SAFE_INTEGER) throw new Error('amount too large')
  }
}

Token.decimals = 0
Token.sealed = false

// ------------------------------------------------------------------------------------------------

module.exports = Code._preinstall(Token)
