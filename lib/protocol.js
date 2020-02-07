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
  static installBerryProtocol (protocol) {
    if (typeof protocol !== 'function' && typeof protocol.pluck !== 'function') {
      throw new Error(`Cannot install protocol: ${protocol}`)
    }
    Protocol.berryProtocols.add(protocol)
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

  static async loadBerry (location, blockchain, code) {
    const errors = []
    for (const loader of Protocol.loaders) {
      try {
        const sandboxedLoader = code.install(loader)
        BerryControl.loader = sandboxedLoader
        const token = await sandboxedLoader.load(location, blockchain)
        if (!token) continue
        const loc = Location.parse(token.location)
        if (!loc.protocol) throw new Error(`Protocol must be set on Berry locations: ${token.location}`)
        return token
      } catch (e) {
        errors.push(`${loader.name}: ${e.toString()}`)
        continue
      } finally {
        BerryControl.loader = undefined
      }
    }
    throw new Error(`No loader available for ${location}\n\n${errors}`)
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

Protocol.berryProtocols = new Set()
Protocol.BerryProtocol = BerryProtocol

module.exports = Protocol
