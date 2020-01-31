/**
 * protocol.js
 *
 * Manager for token protocols are supported by Run
 */

const { Jig, JigControl } = require('../jig')
const { Jiglet, JigletControl } = require('./jiglet')

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
      case 'function': return !!x.origin && !!x.location && !!x.owner
      default: return false
    }
  }

  static getLocation (x) {
    const location = JigControl.disableProxy(() => x.location)
    if (typeof location !== 'string' || !location.length) {
      throw new Error(`Location not valid: ${location}`)
    }
    return location
  }

  static getOrigin (x) {
    if (x && x instanceof Jiglet) return Protocol.getLocation(x)
    const origin = JigControl.disableProxy(() => x.origin)
    if (typeof origin !== 'string' || !origin.length) {
      throw new Error(`Origin not valid: ${origin}`)
    }
    return origin
  }

  static async loadJiglet (location, blockchain) {
    for (const loader of Protocol.loaders) {
      try {
        JigletControl.loader = loader
        return await loader.load(location, blockchain)
      } catch (e) {
        continue
      } finally {
        JigletControl.loader = undefined
      }
    }
    throw new Error(`No loader available for ${location}`)
  }
}

// ------------------------------------------------------------------------------------------------
// Loader API for custom Jiglets
// ------------------------------------------------------------------------------------------------

class Loader {
  // Static to keep stateless
  static async load (location, blockchain) {
    // Fetch the transaction
    // Extract relevant data out of it
    // Create and return a jiglet
  }
}

// ------------------------------------------------------------------------------------------------

Protocol.loaders = new Set()
Protocol.Loader = Loader

module.exports = Protocol
