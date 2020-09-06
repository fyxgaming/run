/**
 * token.js
 *
 * Token jig that provides ERC-20 like support
 */

const Jig = require('../kernel/jig')

// ------------------------------------------------------------------------------------------------
// Token
// ------------------------------------------------------------------------------------------------

class Token extends Jig {
  init (amount, _tokenToDecrease, _tokensToCombine) {
    if (this.constructor === Token) {
      throw new Error('Token must be extended')
    }

    // Case: creating a change token
    if (typeof _tokenToDecrease !== 'undefined') {
      if (typeof _tokenToDecrease !== 'object' || _tokenToDecrease === null) {
        throw new Error('bad token type')
      }

      if (_tokenToDecrease.constructor !== this.constructor) {
        throw new Error('bad token class')
      }

      this._checkAmount(amount)

      _tokenToDecrease._decreaseAmount(amount)
      this.amount = amount

      return
    }

    // Case: combining tokens
    if (typeof _tokensToCombine !== 'undefined') {
      if (!Array.isArray(_tokensToCombine)) {
        throw new Error('bad argument')
      }

      if (_tokensToCombine.length < 2) {
        throw new Error('Must combine at least two tokens')
      }

      if (_tokensToCombine.some(token => token.constructor !== this.constructor)) {
        throw new Error('Cannot combine different token classes')
      }

      const countOf = token => _tokensToCombine.reduce((count, next) => next === token ? count + 1 : count, 0)

      if (_tokensToCombine.some(token => countOf(token) > 1)) {
        throw new Error('cannot combine duplicate tokens')
      }

      this.amount = 0

      _tokensToCombine.forEach(token => {
        this.amount += token.amount
        token.destroy()
      })

      this._checkAmount(this.amount)

      return
    }

    // Case: mint
    this._checkAmount(amount)

    if (caller !== this.constructor) {
      throw new Error('Use Token.mint to mint')
    }

    this.amount = amount
  }

  static mint (amount) {
    return new this(amount)
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

  _decreaseAmount (amount) {
    this.amount -= amount
  }

  _checkAmount (amount) {
    if (typeof amount !== 'number') throw new Error('amount is not a number')
    if (!Number.isInteger(amount)) throw new Error('amount must be an integer')
    if (amount <= 0) throw new Error('amount must be positive')
    if (amount > Number.MAX_SAFE_INTEGER) throw new Error('amount too large')
  }
}

Token.decimals = 0

// ------------------------------------------------------------------------------------------------

module.exports = Token
