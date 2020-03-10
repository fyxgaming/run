const Evaluator = require('./evaluator')

/**
 * Evaluates code using dependences that are set as globals. This is quite dangerous, but we
 * only use it when sandbox=false, which is intended for testing code coverage and debugging.
 */
class GlobalEvaluator extends Evaluator {
    constructor (options = {}) {
        super(options)

      this.logger = options.logger
      this.activated = true
      // We will save the prior globals before overriding them so they can be reverted.
      // This will also store our globals when we deactivate so we can re-activate them.
      this.savedGlobalDescriptors = {}
    }
  
    evaluate (code, env = {}) {
      if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
      if (typeof env !== 'object') throw new Error(`Environment must be an object. Received: ${env}`)
      if ('$globals' in env) throw new Error('Environment must not contain $globals')
  
      // When a function is anonymous, it will be named the variable it is assigned. We give it
      // a friendly anonymous name to distinguish it from named classes and functions.
      const anon = code.startsWith('class') ? 'AnonymousClass' : 'anonymousFunction'
  
      // Set each env as a global
      const options = { configurable: true, enumerable: true, writable: true }
      Object.keys(env).forEach(key => this.setGlobalDescriptor(key, Object.assign({}, options, { value: env[key] })))
  
      // Turn the code into an object
      const result = eval(`const ${anon} = ${code}; ${anon}`) // eslint-disable-line
  
      // Wrap global sets so that we update savedGlobalDescriptors
      const wrappedGlobal = new Proxy(global, {
        set: (target, prop, value) => {
          this.setGlobalDescriptor(prop, Object.assign({}, options, { value }))
          return true
        },
        defineProperty: (target, prop, descriptor) => {
          this.setGlobalDescriptor(prop, descriptor)
          return true
        }
      })
  
      return { result, globals: wrappedGlobal }
    }
  
    setGlobalDescriptor (key, descriptor) {
      // Save the previous global the first time we override it. Future overrides
      // will throw a warning because now there are two values at the global scope.
      const priorDescriptor = Object.getOwnPropertyDescriptor(global, key)
  
      if (!(key in this.savedGlobalDescriptors)) {
        this.savedGlobalDescriptors[key] = priorDescriptor
      } else if (!sameDescriptors(descriptor, priorDescriptor)) {
        if (this.logger) {
          const warning = 'There might be bugs with sandboxing disabled'
          const reason = `Two different values were set at the global scope for ${key}`
          this.logger.warn(`${warning}\n\n${reason}`)
        }
      }
  
      Object.defineProperty(global, key, descriptor)
    }
  
    activate () {
      if (this.activated) return
      this.swapSavedGlobals()
      this.activated = true
    }
  
    deactivate () {
      if (!this.activated) return
      this.swapSavedGlobals()
      this.activated = false
    }
  
    swapSavedGlobals () {
      const swappedGlobalDescriptors = {}
  
      Object.keys(this.savedGlobalDescriptors).forEach(key => {
        swappedGlobalDescriptors[key] = Object.getOwnPropertyDescriptor(global, key)
  
        if (typeof this.savedGlobalDescriptors[key] === 'undefined') {
          delete global[key]
        } else {
          Object.defineProperty(global, key, this.savedGlobalDescriptors[key])
        }
      })
  
      this.savedGlobalDescriptors = swappedGlobalDescriptors
    }
  }