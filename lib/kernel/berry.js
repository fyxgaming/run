/**
 * berry.js
 *
 * Third-party protocol support through Berries
 */

const Context = require('./context')

// ------------------------------------------------------------------------------------------------
// Berry
// ------------------------------------------------------------------------------------------------

// Note: This is a good way to learn the Jig class
class Berry {
  constructor (...args) {
    const run = Context._activeRun()

    // Sandbox the berry
    if (!run.code.isSandboxed(this.constructor)) {
      run.transaction.begin()
      try {
        const T = run.code.deploy(this.constructor)
        return new T(...args)
      } finally { run.transaction.end() }
    }

    // Check the berry is property derived (no constructors)
    const childClasses = []
    let type = this.constructor
    while (type !== Berry) {
      childClasses.push(type)
      type = Object.getPrototypeOf(type)
    }

    if (childClasses.length === 0) { throw new Error('Berry must be extended') }

    const constructorRegex = /\s+constructor\s*\(/
    if (childClasses.some(type => constructorRegex.test(type.toString()))) {
      throw new Error('Berry must use init() instead of constructor()')
    }

    // Check that the protocol matches
    if (!BerryControl.protocol || BerryControl.protocol !== this.constructor.protocol) {
      throw new Error('Must only create Berry from its protocol')
    }

    // Run the init
    this.init(...args)

    // Validate the location
    if (typeof this.location !== 'undefined') {
      throw new Error('Berry init() must not set a location')
    }

    if (!BerryControl.location) throw new Error('Must only pluck one berry at a time')
    this.location = BerryControl.location
    BerryControl.location = undefined

    // Free the object so there are no more changes
    Context.deepFreeze(this)
  }

  init () { }

  static [Symbol.hasInstance] (target) {
    const run = Context._activeRun()

    if (typeof target !== 'object') return false

    // Check if we are already a constructor prototype.
    // (Dragon {} is the prototype of all dragons, and it should not be considered a Jig)
    if (target === target.constructor.prototype) return false

    // find the sandboxed version of this class because thats what instances will be
    let T = run.code.getSandboxed(this)
    if (!T) {
      const net = Context._networkSuffix(run.blockchain.network)
      T = run.code.getSandboxed(this[`origin${net}`])
      if (!T) return false
    }

    // check if this class's prototype is in the prototype chain of the target
    let type = Object.getPrototypeOf(target)
    while (type) {
      if (type === T.prototype) return true
      type = Object.getPrototypeOf(type)
    }

    return false
  }
}

// This should be overridden in each child class
Berry.protocol = undefined

// ------------------------------------------------------------------------------------------------
// BerryControl
// ------------------------------------------------------------------------------------------------

const BerryControl = {
  protocol: undefined,
  location: undefined
}

// ------------------------------------------------------------------------------------------------
// _pluckBerry
// ------------------------------------------------------------------------------------------------

async function _pluckBerry (location, blockchain, code, protocol) {
  const { _txToTxo } = require('../util/misc')
  const Location = require('../util/location')

  // TODO: Make fetch and pluck secure, as well as txo above
  const fetch = async x => _txToTxo(await blockchain.fetch(x))
  const pluck = x => _pluckBerry(x, blockchain, code)

  try {
    // TODO: Allow undeployed, with bad locations
    const sandboxedProtocol = code._installBerryProtocol(protocol)

    BerryControl.protocol = sandboxedProtocol
    if (Location.parse(sandboxedProtocol.location).error) {
      BerryControl.location = Location.build({ error: `${protocol.name} protocol not deployed` })
    } else {
      BerryControl.location = Location.build({ location: sandboxedProtocol.location, innerLocation: location })
    }

    const berry = await sandboxedProtocol.pluck(location, fetch, pluck)

    if (!berry) throw new Error(`Failed to load berry using ${protocol.name}: ${location}`)

    return berry
  } finally {
    BerryControl.protocol = undefined
    BerryControl.location = undefined
  }
}

// ------------------------------------------------------------------------------------------------

Berry.deps = { BerryControl, Context }

module.exports = { Berry, BerryControl, _pluckBerry }
