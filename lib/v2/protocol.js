const { JigControl } = require('../jig')

class RunProtocol {
  static getLocation (token) { return JigControl.disableProxy(() => token.location) }
  static getOrigin (token) { return JigControl.disableProxy(() => token.origin) }
}

class BcatProtocol {
  static getLocation (token) { return token.location }
  static getOrigin (token) { return token.origin }
}

class Protocol {
  static install (protocol) {
    Protocol.protocols.push(protocol)
  }

  static isToken (x) {
    if (typeof x !== 'object' || !x) return false
    return Protocol.protocols.includes(x.$protocol)

    // Throw if unknown protocol?
  }
}

Protocol.protocols = [RunProtocol, BcatProtocol]

module.exports = Protocol
