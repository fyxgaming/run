/**
 * token.js
 *
 * Token jig that provides ERC-20 like support
 */

const { Jig } = require('./jig')
const expect = require('../../lib/extra/expect')

// ------------------------------------------------------------------------------------------------
// Token
// ------------------------------------------------------------------------------------------------

class Token extends Jig {
  init (amount, _tokenToDecrease, _tokensToCombine) {
    expect(this.constructor).not.toBe(Token, 'Token must be extended')

    // case: creating a change token
    if (typeof _tokenToDecrease !== 'undefined') {
      expect(_tokenToDecrease).toBeObject('bad token type')
      expect(_tokenToDecrease.constructor).toBe(this.constructor, 'bad token class')
      this._checkAmount(amount)
      _tokenToDecrease._decreaseAmount(amount)
      this.amount = amount
      return
    }

    // case: combining tokens
    if (typeof _tokensToCombine !== 'undefined') {
      expect(_tokensToCombine).toBeArray()
      expect(_tokensToCombine.length).toBeGreaterThanOrEqualTo(2, 'must combine at least two tokens')
      if (_tokensToCombine.some(token => token.constructor !== this.constructor)) throw new Error('cannot combine different token classes')
      const countOf = token => _tokensToCombine.reduce((count, next) => next === token ? count + 1 : count, 0)
      if (_tokensToCombine.some(token => countOf(token) > 1)) throw new Error('cannot combine duplicate tokens')
      this.amount = 0
      _tokensToCombine.forEach(token => {
        this.amount += token.amount
        token._destroy()
      })
      this._checkAmount(this.amount)
      return
    }

    // case: minting
    this._checkAmount(amount)
    expect(this.owner).toBe(this.constructor.owner, `Only ${this.constructor.name}'s owner may mint`)
    this.amount = amount
    this._onMint(amount, caller)
  }

  send (to, amount) {
    amount = typeof amount === 'undefined' ? this.amount : amount
    this._checkAmount(amount)
    expect(amount).toBeLessThanOrEqualTo(this.amount, 'not enough funds')
    if (this.amount === amount) {
      this.owner = to
      return null
    }
    const change = new this.constructor(this.amount - amount, this)
    this.owner = to
    return change
  }

  get value () {
    let amount = this.amount
    for (let i = 0; i < this.constructor.decimals; i++) amount /= 10
    return amount
  }

  static combine (...tokens) {
    return new this(undefined, undefined, tokens)
  }

  _destroy () {
    this.amount = 0
    this.owner = '029d11c250cc84a6ffbaf84fc28da82fc4deee214021bed2dcaa22d5193d22e273' // burner
  }

  _decreaseAmount (amount) {
    this.amount -= amount
  }

  _checkAmount (amount) {
    expect(amount).toBeNumber('amount is not a number')
    expect(amount).toBeInteger('amount must be an integer')
    expect(amount).toBeGreaterThan(0, 'amount must be positive')
    expect(amount).toBeLessThanOrEqualTo(Number.MAX_SAFE_INTEGER, 'amount too large')
  }

  _onMint (amount, caller) { /* unimplemented */ }
}

Token.decimals = 0

Token.deps = { expect }

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

Token.originMainnet = 'b6cd82f20242845ebef6867e05fd048c7763edf966cc3f8bc236a9e221843ce0_o6'
Token.locationMainnet = 'b6cd82f20242845ebef6867e05fd048c7763edf966cc3f8bc236a9e221843ce0_o6'
Token.ownerMainnet = '13B8kvB8i2ka8JUKQYa3B1x33AZx5n7cXw'

Token.originTestnet = '6d626438e7a4fdbad1855b6656bb1abf74d0e2e500cc46b47ee79083838b429f_o6'
Token.locationTestnet = '6d626438e7a4fdbad1855b6656bb1abf74d0e2e500cc46b47ee79083838b429f_o6'
Token.ownerTestnet = 'mzHqorB2BvtguytBnC65v325cTH9b6qSgb'

// ------------------------------------------------------------------------------------------------

module.exports = Token
