/**
 * token.js
 *
 * Token jig that provides ERC-20 like support
 */

const { Jig } = require('../kernel/jig')
const expect = require('./expect')

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

Token.originMainnet = '0f99a89c41a857402973fe2d767de69488fbdaf54067a2b1eb500c9d0eb3d21a_o7'
Token.locationMainnet = '0f99a89c41a857402973fe2d767de69488fbdaf54067a2b1eb500c9d0eb3d21a_o7'
Token.ownerMainnet = '1CscRyquNBh5UAVYhfxvy1HfnQrSLe85MG'

Token.originTestnet = 'ddcee5e04c67c2077026d813b2315c69a871ad38b47209d83f9e213a15663c57_o7'
Token.locationTestnet = 'ddcee5e04c67c2077026d813b2315c69a871ad38b47209d83f9e213a15663c57_o7'
Token.ownerTestnet = 'mqvDyKXEfdbUYTepHbi3vvtCxRrGVDgGcb'

// ------------------------------------------------------------------------------------------------

module.exports = Token
