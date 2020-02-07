/**
 * protocol.js
 *
 * Manager for token protocols are supported by Run
 */

const { Jig, JigControl } = require('./jig')
const { Berry, BerryControl } = require('./berry')
const Location = require('./location')
const util = require('./util')

// ------------------------------------------------------------------------------------------------
// Protocol manager
// ------------------------------------------------------------------------------------------------

class Protocol {
  static async pluckBerry (location, blockchain, code, protocol) {
    const fetch = x => blockchain.fetch(x)
    const pluck = x => this.pluckBerry(x, blockchain, code)

    try {
      // TODO: Allow undeployed, with bad locations
      const sandboxedProtocol = code.installBerryProtocol(protocol)

      BerryControl.protocol = sandboxedProtocol
      if (Location.parse(sandboxedProtocol.location).error) {
        BerryControl.location = Location.build({ error: `${protocol.name} protocol not deployed` })
      } else {
        BerryControl.location = Location.build({ location: sandboxedProtocol.location, innerLocation: location })
      }

      const berry = await sandboxedProtocol.pluck(location, fetch, pluck)
      return berry
    } finally {
      BerryControl.protocol = undefined
      BerryControl.location = undefined
    }
  }

  static isToken (x) {
    switch (typeof x) {
      case 'object': return x && (x instanceof Jig || x instanceof Berry)
      case 'function': {
        if (!!x.origin && !!x.location && !!x.owner) return true
        const net = util.networkSuffix(util.activeRunInstance().blockchain.network)
        return !!x[`origin${net}`] && !!x[`location${net}`] && !!x[`owner${net}`]
      }
      default: return false
    }
  }

  static isDeployable (x) {
    if (typeof x !== 'function') return false
    return x.toString().indexOf('[native code]') === -1
  }

  static getLocation (x) {
    const location = JigControl.disableProxy(() => x.location)
    Location.parse(location)
    return location
  }

  static getOrigin (x) {
    if (x && x instanceof Berry) return Protocol.getLocation(x)
    const origin = JigControl.disableProxy(() => x.origin)
    Location.parse(origin)
    return origin
  }
}

// ------------------------------------------------------------------------------------------------
// Berry protocol plucker
// ------------------------------------------------------------------------------------------------

class BerryProtocol {
  // Static to keep stateless
  // Location is defined by the protocol
  static async pluck (location, fetch, pluck) {
    // Fetch tx
    // Parse
    // Return Berry
  }
}

// ------------------------------------------------------------------------------------------------

Protocol.BerryProtocol = BerryProtocol

module.exports = Protocol
