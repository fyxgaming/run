const Protocol = require('./protocol')

/**
 * A container for Run tokens that guarantees uniqueness on the blockchain, even across different
 * instances of the same token, preserves their order added, and throws if there are multiple
 * tokens with the same origin that have different locations.
 */
class TokenSet {
  constructor () {
    this.locations = new Map() // Location -> Token
    this.origins = new Map() // Origin -> Token
    this.tokens = new Set()
  }

  add (token) {
    if (token instanceof TokenSet) { return Array.from(token.tokens).some(t => this.add(t)) }

    if (!Protocol.isToken(token)) throw new Error(`Only tokens may be added to a token set. Added: ${token}`)

    const location = Protocol.getLocation(token)
    if (this.locations.has(location)) {
      return false
    }

    const origin = Protocol.getOrigin(token)
    if (this.origins.has(origin)) {
      throw new Error(`Only unique tokens may be added to a token set. Added: ${token}`)
    }

    this.locations.add(location)
    this.origins.add(origin)
    this.tokens.add(token)

    return true
  }

  delete (token) {
    if (token instanceof TokenSet) { return Array.from(token.tokens).some(t => this.delete(t)) }

    if (!Protocol.isToken(token)) throw new Error(`Only tokens may be removed from a token set. Added: ${token}`)

    const location = Protocol.getLocation(token)
    const existingToken = this.locations.get(location)

    if (existingToken) {
      this.locations.delete(location)
      this.origins.delete(Protocol.getOrigin(token))
      this.tokens.delete(existingToken)
      return true
    }

    return false
  }
}

module.exports = TokenSet
