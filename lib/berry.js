const Context = require('./context')

const BerryControl = {
  protocol: undefined
}

// Note: This is a good way to learn the Jig class
class Berry {
  constructor (...args) {
    const run = Context.activeRunInstance()

    // Sandbox the berry
    if (!run.code.isSandbox(this.constructor)) {
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
    if (typeof this.location !== 'string') {
      throw new Error('Berry init() must set a location')
    }

    // Free the object so there are no more changes
    // TODO: deep freeze
    Object.freeze(this)
  }

  init () { }

  static [Symbol.hasInstance] (target) {
    const run = Context.activeRunInstance()

    // check if the target has a location. this will be false for this.constructor.prototype.
    if (typeof target !== 'object' || !('location' in target)) return false

    // find the sandboxed version of this class because thats what instances will be
    let T = run.code.getInstalled(this)
    if (!T) {
      const net = Context.networkSuffix(run.blockchain.network)
      T = run.code.getInstalled(this[`origin${net}`])
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

module.exports = { Berry, BerryControl }
