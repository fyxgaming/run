const Context = require('./context')

const JigletControl = {
  loader: undefined
}

// Note: This is a good way to learn the Jig class
class Jiglet {
  constructor (...args) {
    const run = Context.activeRunInstance()

    // Sandbox the Jiglet
    if (!run.code.isSandbox(this.constructor)) {
      run.transaction.begin()
      try {
        const T = run.code.deploy(this.constructor)
        return new T(...args)
      } finally { run.transaction.end() }
    }

    // Check the Jiglet is property derived (no constructors)
    const childClasses = []
    let type = this.constructor
    while (type !== Jiglet) {
      childClasses.push(type)
      type = Object.getPrototypeOf(type)
    }

    if (childClasses.length === 0) { throw new Error('Jiglet must be extended') }

    const constructorRegex = /\s+constructor\s*\(/
    if (childClasses.some(type => constructorRegex.test(type.toString()))) {
      throw new Error('Jiglet must use init() instead of constructor()')
    }

    // Check that the loader matches
    if (!JigletControl.loader || JigletControl.loader !== this.constructor.loader) {
      throw new Error('Must only create Jiglet from its loader')
    }

    // Run the init
    this.init(...args)

    // Validate the location
    if (typeof this.location !== 'string') {
      throw new Error('Jiglet init() must set a location')
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
Jiglet.loader = undefined

module.exports = { Jiglet, JigletControl }
