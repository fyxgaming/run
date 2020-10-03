/**
 * berry.js
 *
 * Third-party protocol support through berries
 */

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

// Current berry class being plucked
const _PLUCK_CLASS = null

// Current berry location being plucked
let _PLUCK_LOCATION = null

// ------------------------------------------------------------------------------------------------
// BerryDeps
// ------------------------------------------------------------------------------------------------

class BerryDeps {
  static get _Code () { return require('./code') }
  static get _Membrane () { return require('./membrane') }
  static get _NativeBerry () { return require('./berry') }
  static get _PLUCK_CLASS () { return _PLUCK_CLASS }
  static get _PLUCK_LOCATION () { return _PLUCK_LOCATION }
  static get _Rules () { return require('./rules') }
  static get _sudo () { return require('../util/admin')._sudo }
  static get _Universal () { return require('./universal') }

  static _clearPluckLocation () { _PLUCK_LOCATION = null }
}

// ------------------------------------------------------------------------------------------------
// Berry
// ------------------------------------------------------------------------------------------------

class Berry {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  constructor (...args) {
    const BERRIES = BerryDeps._Universal._BERRIES
    const NativeBerry = BerryDeps._NativeBerry
    const Membrane = BerryDeps._Membrane
    const PLUCK_CLASS = BerryDeps._PLUCK_CLASS
    const PLUCK_LOCATION = BerryDeps._PLUCK_LOCATION
    const Rules = BerryDeps._Rules
    const clearPluckLocation = BerryDeps._clearPluckLocation

    // Check that the berry class has been extended
    if (this.constructor === NativeBerry) throw new Error('Berry must be extended')

    // Check that the berry class doesn't have a constructor. Force users to use init.
    const childClasses = []
    let type = this.constructor
    while (type !== NativeBerry) {
      childClasses.push(type)
      type = Object.getPrototypeOf(type)
    }
    const constructorRegex = /\s+constructor\s*\(/
    if (childClasses.some(type => constructorRegex.test(type.toString()))) {
      throw new Error('Berry must use init() instead of constructor()')
    }

    // Check that the protocol matches
    if (!PLUCK_CLASS || PLUCK_CLASS !== this.constructor) {
      throw new Error('Must only create Berry from its own plucker')
    }

    // Run the init
    this.init(...args)

    // Make sure the user did not set a location. We set that.
    if (typeof this.location !== 'undefined') {
      throw new Error('Berry init() must not set a location')
    }

    // Set the location
    if (!PLUCK_LOCATION) throw new Error('Must only pluck one berry at a time')
    this.location = PLUCK_LOCATION
    clearPluckLocation()

    // Wrap ourselves in a proxy so that every action is tracked
    const rules = Rules._berryInstance()
    const proxy = new Membrane(this, rules)

    // Add ourselves to the list of berries
    BERRIES.add(proxy)

    // Return the proxy
    return proxy
  }

  // --------------------------------------------------------------------------
  // hasInstance
  // --------------------------------------------------------------------------

  static [Symbol.hasInstance] (x) {
    // Prevent users from creating "berries" via Object.setPrototypeOf. This also solves
    // the issues of Dragon.prototype instanceof Dragon returning true.
    if (!BerryDeps._Universal._BERRIES.has(x)) return false

    // If we aren't checking a particular class, we are done
    if (this === BerryDeps._NativeBerry) return true

    // Get the sandboxed version of the class
    const C = BerryDeps._Code._lookupByType(this)

    // If didn't find this code, then it couldn't be an instance.
    if (!C) return false

    // Check if the berry class matches
    return BerryDeps._sudo(() => {
      let type = Object.getPrototypeOf(x)
      while (type) {
        if (type.constructor.location === C.location) return true
        type = Object.getPrototypeOf(type)
      }

      return false
    })
  }

  // --------------------------------------------------------------------------
  // pluck
  // --------------------------------------------------------------------------

  static async pluck (location, fetch, pluck) {
    throw new Error('Not implemented')
  }

  // --------------------------------------------------------------------------
  // init
  // --------------------------------------------------------------------------

  init (...args) { }
}

Berry.deps = { BerryDeps }

Berry.sealed = false

// ------------------------------------------------------------------------------------------------
// _pluckBerry
// ------------------------------------------------------------------------------------------------

/*
async function _pluckBerry (location, blockchain, code, BerryClass) {
  const { _txToTxo } = require('../../lib/kernel/misc')
  const Location = require('./util/location')

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
*/

// ------------------------------------------------------------------------------------------------

Berry.toString() // Preserves the class name during compilation

const NativeBerry = new BerryDeps._Code()
const editor = BerryDeps._Code._editor(NativeBerry)
const internal = false
editor._installNative(Berry, internal)

module.exports = NativeBerry
