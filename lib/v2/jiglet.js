const JigletControl = {
  loader: undefined
}

// Note: This is a good way to learn the Jig
class Jiglet {
  constructor (...args) {
    // Sandbox here

    // Check the Jiglet is property derived (no constructors)

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

  // TODO: instanceof override
}

// This should be overridden in each child class
Jiglet.loader = undefined

module.exports = { Jiglet, JigletControl }
