/**
 * protocol.js
 *
 * Manager for token protocols are supported by Run
 */

const { Jig, JigControl } = require('../jig')
const { Jiglet, JigletControl } = require('./jiglet')
const Location = require('../location')
const util = require('../util')

// ------------------------------------------------------------------------------------------------
// Protocol manager
// ------------------------------------------------------------------------------------------------

class Protocol {
  static install (loader) {
    // Should deploy? Need sandbox, for sandboxed jiglets. Or maybe not?

    if (typeof loader !== 'function' && typeof loader.load !== 'function') {
      throw new Error(`Cannot install loader: ${loader}`)
    }
    Protocol.loaders.add(loader)
  }

  static uninstall (loader) {
    return Protocol.loaders.delete(loader)
  }

  static isToken (x) {
    switch (typeof x) {
      case 'object': return x && (x instanceof Jig || x instanceof Jiglet)
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
    if (x && x instanceof Jiglet) return Protocol.getLocation(x)
    const origin = JigControl.disableProxy(() => x.origin)
    Location.parse(origin)
    return origin
  }

  static async loadJiglet (location, blockchain) {
    const errors = []
    for (const loader of Protocol.loaders) {
      try {
        JigletControl.loader = loader
        const token = await loader.load(location, blockchain)
        if (!token) continue
        return token
      } catch (e) {
        errors.push(`${loader.name}: ${e.toString()}`)
        continue
      } finally {
        JigletControl.loader = undefined
      }
    }
    throw new Error(`No loader available for ${location}\n\n${errors}`)
  }
}

// ------------------------------------------------------------------------------------------------
// Loader API for custom Jiglets
// ------------------------------------------------------------------------------------------------

class Loader {
  // Static to keep stateless
  static async load (location, blockchain) {
    // Fetch tx
    // Parse
    // Return Jiglet
  }
}

// ------------------------------------------------------------------------------------------------

Protocol.loaders = new Set()
Protocol.Loader = Loader

module.exports = Protocol
