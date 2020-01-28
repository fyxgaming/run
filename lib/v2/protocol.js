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
    if (typeof x !== 'object' || !x || typeof x.$protocol === 'undefined') return false
    const protocolIndex = Protocol.protocols.indexOf(x.$protocol)
    if (protocolIndex === -1) throw new Error(`Unknown token protocol: ${x.$protocol}`)
    return true
  }

  static getLocation (x) {
    if (typeof x !== 'object' || !x || typeof x.$protocol === 'undefined') throw new Error(`${display(x)} is not a token`)
    const protocolIndex = Protocol.protocols.indexOf(x.$protocol)
    if (protocolIndex === -1) throw new Error(`Unknown token protocol: ${x.$protocol}`)
    return Protocol.protocols[protocolIndex].getLocation(x)
  }

  static getOrigin (x) {
    if (typeof x !== 'object' || !x || typeof x.$protocol === 'undefined') throw new Error(`${display(x)} is not a token`)
    const protocolIndex = Protocol.protocols.indexOf(x.$protocol)
    if (protocolIndex === -1) throw new Error(`Unknown token protocol: ${x.$protocol}`)
    return Protocol.protocols[protocolIndex].getOrigin(x)
  }

  // Throw if unknown protocol?
}

// function isToken(x) {
// return typeof x === 'object' && x && x.$protocol && x.$location
// }

Protocol.protocols = [RunProtocol, BcatProtocol]

Protocol.RunProtocol = RunProtocol
Protocol.BcatProtocol = BcatProtocol

module.exports = Protocol
