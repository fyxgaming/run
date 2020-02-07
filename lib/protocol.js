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

  static async pluckBerry (location, blockchain, code) {
    const fetch = x => blockchain.fetch(x)
    const pluck = x => Protocol.pluckBerry(x, blockchain, code)

    async function pluckWithProtocol (protocol, location) {
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

    // If we have a specific protocol to load, find the protocol and use it
    let locationObj = null
    try { locationObj = Location.parse(location) } catch (e) { }

    if (locationObj && locationObj.innerLocation) {
      const protocol = Array.from(Protocol.berryProtocols).find(x => x.location === locationObj.location)
      if (!protocol) throw new Error(`Protocol not installed: ${locationObj.location}`)
      return pluckWithProtocol(protocol, locationObj.innerLocation)
    }

    // We don't have a specific protocol to load, so try with each protocol
    const errors = []
    for (const protocol of Protocol.berryProtocols) {
      try {
        const berry = await pluckWithProtocol(protocol, location)
        if (berry) return berry
      } catch (e) {
        errors.push(`${protocol.name}: ${e.toString()}`)
      }
    }
    throw new Error(`No protocol available for ${location}\n\n${errors}`)
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
