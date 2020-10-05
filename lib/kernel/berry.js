/**
 * berry.js
 *
 * Third-party protocol support through berries
 */

// ------------------------------------------------------------------------------------------------
// BerryDeps
// ------------------------------------------------------------------------------------------------

class BerryDeps {
  static get _Action () { return require('./action') }
  static get _Code () { return require('./code') }
  static get _Loader () { return require('./loader') }
  static get _Membrane () { return require('./membrane') }
  static get _NativeBerry () { return require('./berry') }
  static get _Rules () { return require('./rules') }
  static get _sudo () { return require('../util/admin')._sudo }
  static get _Universal () { return require('./universal') }
}

// ------------------------------------------------------------------------------------------------
// Berry
// ------------------------------------------------------------------------------------------------

class Berry {
  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  constructor (...args) {
    const Action = BerryDeps._Action
    const BERRIES = BerryDeps._Universal._BERRIES
    const NativeBerry = BerryDeps._NativeBerry
    const Membrane = BerryDeps._Membrane
    const nextBerryLocation = BerryDeps._Loader._nextBerryLocation
    const Rules = BerryDeps._Rules

    // Check that the berry class has been extended
    if (this.constructor === NativeBerry) throw new Error('Berry must be extended')

    // Make sure the user did not set a location. We set that.
    if (typeof this.location !== 'undefined') {
      throw new Error('Berry init() must not set a location')
    }

    // Assign the location which comes from the loader
    this.location = nextBerryLocation(this.constructor)

    // Wrap ourselves in a proxy so that every action is tracked
    const rules = Rules._berryInstance()
    const proxy = new Membrane(this, rules)

    // Add ourselves to the list of berries
    BERRIES.add(proxy)

    // Create the new action in the record, which will also call init()
    rules._immutable = false
    Action._pluck(this.constructor, proxy, args)
    rules._immutable = true

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

Berry.toString() // Preserves the class name during compilation

const NativeBerry = new BerryDeps._Code()
const editor = BerryDeps._Code._editor(NativeBerry)
const internal = false
editor._installNative(Berry, internal)

module.exports = NativeBerry
