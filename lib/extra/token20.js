/**
 * token20.js
 *
 * Token jig that provides ERC-20 like support. This is v2.0 of Token. Compared to version 1:
 *
 *    - combine is a separate method
 *    - mint to a specific owner
 *    - simplified internal logic
 */

const Jig = require('../kernel/jig')
const Editor = require('../kernel/editor')

// ------------------------------------------------------------------------------------------------
// Token
// ------------------------------------------------------------------------------------------------

class Token extends Jig {
  init (amount, owner) {
    this._checkAmount(amount)

    // The base Token class cannot be created on its own
    const extended = this.constructor !== Token
    if (!extended) throw new Error('Token must be extended')

    // Make sure we are calling from ourself
    const minting = caller === this.constructor
    const sending = caller && caller.constructor === this.constructor
    if (!minting && !sending) throw new Error('Must create token using mint()')

    this.sender = sending ? caller.owner : null
    this.amount = amount
    if (owner) this.owner = owner
  }

  static mint (amount, owner) {
    this.supply += amount
    return new this(amount, owner)
  }

  send (to, amount = this.amount) {
    this._checkAmount(amount)

    if (this.amount === amount) {
      this.destroy()
    } else if (this.amount > amount) {
      this.amount -= amount
    } else {
      throw new Error('Not enough funds')
    }

    return new this.constructor(amount, to)
  }

  combine (...tokens) {
    // If no tokens to combine, nothing to do
    if (!tokens.length) return this

    // Each token to combine must all be of this type
    const all = tokens.concat(this)
    if (all.some(token => token.constructor !== this.constructor)) {
      throw new Error('Cannot combine different token classes')
    }

    // Check for duplicate tokens in the array
    const countOf = token => all.reduce((count, next) => next === token ? count + 1 : count, 0)
    if (all.some(token => countOf(token) > 1)) throw new Error('Cannot combine duplicate tokens')

    // Destroy each token, absorbing it into this one
    tokens.forEach(token => {
      this.amount += token.amount
      token.destroy()
    })

    // There is no sender for combined tokens
    this.sender = null

    // Make sure our new amount is within safe range
    this._checkAmount(this.amount)

    return this
  }

  destroy () {
    super.destroy()

    this.amount = 0
    this.sender = null
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
Token.version = '2.0'

Token.toString() // Preserves the class name during compilation

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

Token.presets = {}
Token.presets.main = { }
Token.presets.test = { }

Token.presets.main.location = '72a61eb990ffdb6b38e5f955e194fed5ff6b014f75ac6823539ce5613aea0be8_o1'
Token.presets.main.origin = '72a61eb990ffdb6b38e5f955e194fed5ff6b014f75ac6823539ce5613aea0be8_o1'
Token.presets.main.nonce = 1
Token.presets.main.owner = '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx'
Token.presets.main.satoshis = 0

Token.presets.test.location = '7d14c868fe39439edffe6982b669e7b4d3eb2729eee7c262ec2494ee3e310e99_o1'
Token.presets.test.origin = '7d14c868fe39439edffe6982b669e7b4d3eb2729eee7c262ec2494ee3e310e99_o1'
Token.presets.test.nonce = 1
Token.presets.test.owner = 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE'
Token.presets.test.satoshis = 0

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(Token)
