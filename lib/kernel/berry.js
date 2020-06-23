/**
 * berry.js
 *
 * Third-party protocol support through Berries
 */

const { Transaction } = require('bsv')
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
    if (!BerryControl._BerryClass || BerryControl._BerryClass !== this.constructor) {
      throw new Error('Must only create Berry from its own plucker')
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

    if (typeof target !== 'object' || !target) return false

    // Check if we are already a constructor prototype.
    // (Dragon {} is the prototype of all dragons, and it should not be considered a Jig)
    if (target === target.constructor.prototype) return false

    // find the sandboxed version of this class because thats what instances will be
    let T = run.code._getSandboxed(this)
    if (!T) {
      const net = Context._networkSuffix(run.blockchain.network)
      T = run.code._getSandboxed(this[`origin${net}`])
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

// ------------------------------------------------------------------------------------------------
// BerryControl
// ------------------------------------------------------------------------------------------------

const BerryControl = {
  _BerryClass: undefined,
  location: undefined
}

// ------------------------------------------------------------------------------------------------
// _pluckBerry
// ------------------------------------------------------------------------------------------------

async function _pluckBerry (location, blockchain, code, BerryClass) {
  const { _txToTxo } = require('../util/misc')
  const Location = require('../util/location')

  // TODO: Make fetch and pluck secure, as well as txo above
  const fetch = async x => _txToTxo(new Transaction(await blockchain.fetch(x)))
  const pluck = x => _pluckBerry(x, blockchain, code, BerryClass)

  const oldBerryClass = BerryControl._BerryClass
  const oldBerryLocation = BerryControl.location

  try {
    // TODO: Allow undeployed, with bad locations
    const SandboxedBerryClass = code._installBerryProtocol(BerryClass)

    BerryControl._BerryClass = SandboxedBerryClass
    if (Location.parse(SandboxedBerryClass.location).error) {
      BerryControl.location = Location.build({ error: `${BerryClass.name} not deployed` })
    } else {
      BerryControl.location = Location.build({ location: SandboxedBerryClass.location, innerLocation: location })
    }

    const berry = await SandboxedBerryClass.pluck(location, fetch, pluck, SandboxedBerryClass)

    if (!berry) throw new Error(`Failed to load berry using ${BerryClass.name}: ${location}`)
    if (!(berry instanceof Berry)) throw new Error('Plucker must return an instance of Berry')

    return berry
  } finally {
    BerryControl._BerryClass = oldBerryClass
    BerryControl.location = oldBerryLocation
  }
}

// ------------------------------------------------------------------------------------------------

const _BerryDeps = { BerryControl, Context }

module.exports = { Berry, BerryControl, _BerryDeps, _pluckBerry }
