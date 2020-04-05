/**
 * jig.js
 *
 * Jig class users extend from to create digital property
 */

const Context = require('./context')

const JigControl = { // control state shared across all jigs, similar to a PCB
  stack: [], // jig call stack for the current method (Array<Target>)
  creates: new Set(), // jigs created in the current method (Set<Target>)
  reads: new Set(), // jigs read during the current method (Set<Target>)
  before: new Map(), // saved original state of jigs before method (Target->Checkpoint)
  callers: new Map(), // Callers on each jig method (Target->Set<Object>)
  error: null, // if any errors occurred to prevent swallows
  enforce: true, // enable safeguards for the user
  special: false, // enable reading special props on the token. Currently, $target and $owner
  proxies: new Map(), // map connecting targets to proxies (Target->Proxy)
  blankSlate: false // Whether to create the jig as an empty object
}

JigControl.disableSafeguards = f => {
  const prevEnforce = JigControl.enforce
  try {
    JigControl.enforce = false
    return f()
  } finally {
    JigControl.enforce = prevEnforce
  }
}

JigControl.enableSpecialProps = f => {
  const prevSpecial = JigControl.special
  try {
    JigControl.special = true
    return f()
  } finally {
    JigControl.special = prevSpecial
  }
}

class Jig {
  constructor (...args) {
    const run = Context._activeRun()

    if (!run.code.isSandboxed(this.constructor)) {
      run.transaction.begin()
      try {
        const T = run.code.deploy(this.constructor)
        return new T(...args)
      } finally { run.transaction.end() }
    }

    const childClasses = []
    let type = this.constructor
    while (type !== Jig) {
      childClasses.push(type)
      type = Object.getPrototypeOf(type)
    }

    if (childClasses.length === 0) { throw new Error('Jig must be extended') }

    const constructorRegex = /\s+constructor\s*\(/
    if (childClasses.some(type => constructorRegex.test(type.toString()))) {
      throw new Error('Jig must use init() instead of constructor()')
    }

    const unoverridable = ['origin', 'location', 'owner', 'satoshis', 'sync']
    childClasses.forEach(type => {
      unoverridable.forEach(prop => {
        if (Object.prototype.hasOwnProperty.call(childClasses[0].prototype, prop)) {
          throw new Error(`must not override ${prop}`)
        }
      })
    })

    const methods = []
    const classChain = [...childClasses, Jig]
    classChain.forEach(type => {
      Object.getOwnPropertyNames(type.prototype).forEach(prop => methods.push(prop))
    })
    const permanents = [...methods, 'owner', 'satoshis', 'origin', 'location']

    function resetJigControl () {
      JigControl.stack = []
      JigControl.creates = new Set()
      JigControl.reads = new Set()
      JigControl.before = new Map()
      JigControl.callers = new Map()
      JigControl.proxies = new Map()
      JigControl.error = null
    }

    const checkValid = () => {
      if (JigControl.enforce && this.origin && this.origin[0] === '!') {
        throw new Error(`${this.origin.slice(1)}`)
      }
    }

    const original = this
    const handler = { parent: null, name: null }
    const proxy = new Proxy(this, handler)

    // Helper methods to determine where the proxy is being called from
    const topOfStack = () => JigControl.stack[JigControl.stack.length - 1]
    const fromWithin = () => JigControl.stack.length && topOfStack() === original
    const fromInstanceOfSameJigClass = () => JigControl.stack.length && topOfStack().constructor === proxy.constructor
    const fromInstanceOfDifferentJigClass = () => JigControl.stack.length && topOfStack().constructor !== proxy.constructor

    // internal variable that tracks whether init is called. if we are injecting a state, then init was called.
    let calledInit = !!JigControl.blankSlate

    handler.getPrototypeOf = function (target) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      return Object.getPrototypeOf(target)
    }

    handler.setPrototypeOf = function (target, prototype) {
      throw new Error('setPrototypeOf disallowed')
    }

    handler.isExtensible = function (target) {
      return true
    }

    handler.preventExtensions = function (target) {
      throw new Error('preventExtensions disallowed')
    }

    handler.getOwnPropertyDescriptor = function (target, prop) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (!this.has(target, prop)) return undefined

      const descriptor = Object.getOwnPropertyDescriptor(target, prop)
      if (!descriptor) return undefined
      return Object.assign({}, descriptor, { value: this.get(target, prop) })
    }

    handler.defineProperty = function (target, prop, descriptor) {
      throw new Error('defineProperty disallowed')
    }

    handler.has = function (target, prop) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (JigControl.enforce && prop[0] === '_' && fromInstanceOfDifferentJigClass()) {
        throw new Error(`cannot check ${prop} because it is private`)
      }

      const didRead = JigControl.stack.length && (!(target instanceof Jig) || !permanents.includes(prop))

      if (didRead) JigControl.reads.add(original)

      return prop in target
    }

    handler.get = function (target, prop, receiver) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (JigControl.special) {
        if (prop === '$owner') return proxy
        if (prop === '$target') return target
      }

      const targetIsAJig = target instanceof Jig

      const syncRequired = ['origin', 'location']

      if (JigControl.enforce && targetIsAJig && syncRequired.includes(prop) && target[prop][0] === '_') {
        throw new Error(`sync required before reading ${prop}`)
      }

      // These don't change, so they don't require a read
      const noRead = ['origin', 'constructor']
      if (targetIsAJig && noRead.includes(prop)) return target[prop]
      const isJigMethod = targetIsAJig && typeof target[prop] === 'function'
      if (JigControl.stack.length && !isJigMethod) JigControl.reads.add(original)

      if (prop[0] === '_' && fromInstanceOfDifferentJigClass()) {
        throw new Error(`cannot get ${prop} because it is private`)
      }

      // return basic types directly
      const basicTypes = ['undefined', 'boolean', 'number', 'string', 'symbol']
      if (basicTypes.includes(typeof target[prop])) {
        return target[prop]
      }

      if (prop === Symbol.iterator) {
        // For Uint8Arrays:
        // If getting an iterator, return the iterator function bound to the original target
        // instead of the proxy, because `new Uint8Array(new Proxy(new Uint8Array([1, 2]), {}))`
        // would otherwise throw an error that "this is not a typed array". For a reference, see:
        // https://stackoverflow.com/questions/45700439/new-proxynew-map-values
        if (target instanceof Context._intrinsics.Uint8Array) return target[prop].bind(target)

        // For everything else, we want to return the proxy. Uint8Arrays only have simple types
        // that don't require a proxy. Sets, Maps, Arrays etc. all need proxies to enforce rules.
        return target[prop].bind(receiver)
      }

      // return object types wrapped
      if (typeof target[prop] === 'object') {
        if (target[prop] === null) return null
        if (target[prop] instanceof Jig) return target[prop]

        // When we take this out, we get proxies of proxies being wrapped. Why?
        if (!JigControl.enforce) return target[prop]

        // wrap existing objects for protection
        const handler = Object.assign({}, this, { parent: target, name: prop })
        return new Proxy(target[prop], handler)
      }

      // If we are returning any constructor, then we don't need to wrap it. Only
      // Jig methods need to be wrapped. Constructors will get wrapped automatically
      // in the Jig constructor.
      if (prop === 'constructor') {
        return target[prop]
      }

      if (typeof target[prop] === 'function') {
        const handler = Object.assign({}, this, { parent: target, name: prop })
        return new Proxy(target[prop], handler)
      }
    }

    handler.set = function (target, prop, value, receiver) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (JigControl.enforce) {
        if (!fromWithin()) {
          throw new Error(`must not set ${prop} outside of a method`)
        }

        if (target instanceof Jig) {
          const notSettable = ['origin', 'location', ...methods]

          if (notSettable.includes(prop)) {
            throw new Error(`must not set ${prop}`)
          }
        } else {
          // Must not overwrite methods on internal objects
          if (typeof target[prop] === 'function') {
            throw new Error(`must not overwrite internal method ${prop}`)
          }

          // Must not set properties on internal property functions
          if (typeof target === 'function') {
            throw new Error(`must not set ${prop} on method ${target.name}`)
          }
        }
      }

      // Check each set doesn't contain objects from other tokens
      Context._checkNoObjectsBelongingToOtherTokens(value, proxy)

      // Whether value is serializable is checked after the method is complete
      target[prop] = value

      return true
    }

    handler.deleteProperty = function (target, prop) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (JigControl.enforce) {
        if (!fromWithin()) {
          throw new Error(`must not delete ${prop} outside of a method`)
        }

        if (target instanceof Jig) {
          const notDeletable = ['origin', 'location', 'satoshis', 'owner', ...methods]

          if (notDeletable.includes(prop)) {
            throw new Error(`must not delete ${prop}`)
          }
        } else {
          if (typeof target[prop] === 'function') {
            throw new Error(`must not delete internal method ${prop}`)
          }
        }
      }

      delete target[prop]

      return true
    }

    handler.ownKeys = function (target) {
      checkValid()

      if (JigControl.stack.length) JigControl.proxies.set(original, proxy)

      if (JigControl.stack.length) JigControl.reads.add(original)

      if (fromInstanceOfDifferentJigClass()) {
        return Reflect.ownKeys(target).filter(key => key[0] !== '_')
      } else {
        return Reflect.ownKeys(target)
      }
    }

    handler.apply = function (target, thisArg, args) {
      const parentIsAJig = this.parent instanceof Jig

      if (parentIsAJig && this.name[0] === '_' && !fromInstanceOfSameJigClass()) {
        throw new Error(`cannot call ${this.name} because it is private`)
      }

      if (parentIsAJig && this.name === 'sync') {
        if (JigControl.stack.length) throw new Error('sync may only be called externally')
        return target.call(proxy, ...args)
      }

      const run = Context._activeRun()
      run.transaction.begin()

      // If we are calling an internal method on the jig from outside of the jig, then
      // this method is not allowed to change any state. However, we may be deep in a
      // call stack from other jigs, so we cannot use the JigControl.before to determine if
      // a change has occurred. We need a new call stack. Therefore, we'll save the current
      // stack and JigControl state before calling and reinstate it after.
      let outerJigControl = null
      if (!parentIsAJig && !fromWithin()) {
        outerJigControl = Object.assign({}, JigControl)
        resetJigControl()
      }

      // record all jigs that called this jig in order to be able to spend
      // them if this method changes state. all jigs involved in the production
      // of a change of state must be spent.
      const callers = JigControl.callers.get(original) || new Set()
      JigControl.stack.forEach(target => callers.add(target))
      JigControl.callers.set(original, callers)

      // add ourselves to the stack because we're about to invoke a method
      JigControl.stack.push(original)

      JigControl.proxies.set(original, proxy)

      try {
        if (parentIsAJig && this.name === 'init') {
          if (calledInit) throw new Error('init cannot be called twice')
          calledInit = true
          JigControl.creates.add(original)
        }

        const reads = new Set(JigControl.reads)

        // Make a copy of the args, which ensures that if the args are changed in the method,
        // we still record to the blockchain what was passed in at the time it was called.
        //
        // Crossing a cell membrane is to enter a safe zone. In the safe zone, args needs to
        // be of types that is safe for the cell. Ownership is abandoned at the membrane.
        //
        // Internal methods do not need a checkpoint, because we can pass args directly.
        // We are not crossing a membranes.
        const argsCheckpoint = parentIsAJig ? new Context.Checkpoint(args, run.code) : null

        if (!JigControl.before.has(original)) {
          const checkpoint = new Context.Checkpoint(Object.assign({}, original), run.code)
          JigControl.before.set(original, checkpoint)
        }

        JigControl.reads = reads

        // TODO: Create a clone instead

        // Call the method
        //
        // The call target is the object we call the method on. When our target is a jig,
        // we use the proxy because the method might try to change properties like origin
        // which we want to prevent. If we passed target, we could not intercept these.
        //
        // When our target is an internal non-Jig object, we use the object itself without a
        // proxy because these are native JavaScript objects and require that to work. This
        // is safe because any attempts to change a Jig property like the origin or location
        // must go through a Jig itself, which would be wrapped with a proxy.

        // The call args are restored from their checkpoint, so that the intrinsics are the sandbox intrinsics
        const callArgs = parentIsAJig ? argsCheckpoint.restore() : args

        const ret = target.call(parentIsAJig ? proxy : this.parent, ...callArgs)

        if (parentIsAJig && this.name === 'init' && typeof ret !== 'undefined') {
          throw new Error('init must not return')
        }

        if (parentIsAJig) {
          Context._ownerScript(original.owner)
          Context._checkSatoshis(original.satoshis)
        }

        // if there was an error in the call or a child call, and the exception
        // was swallowed, rethrow the error anyway.
        if (JigControl.error) throw new Error(`internal errors must not be swallowed\n\n${JigControl.error}`)

        JigControl.stack.pop()

        // if we are at the bottom of the stack, we have to decide whether to create an
        // action. To do this, we will compare jig states before and after and see if
        // any jigs changed, and if so, figure out the inputs and outputs.
        if (!JigControl.stack.length) {
          // disable enforcement as we are about to read locations on possible inner proxies
          const reads = new Set(JigControl.reads)

          const after = new Map()
          const changed = JigControl.disableSafeguards(() => {
            // Calculate after checkpoints. We already have before in JigControl.before
            const objectsToSave = new Set(JigControl.reads)
            Array.from(JigControl.before.keys()).forEach(x => objectsToSave.add(x))
            objectsToSave.forEach(target => {
              after.set(target, new Context.Checkpoint(Object.assign({}, target), run.code))
            })

            // Calculate the changed array
            const didChange = ([x, checkpoint]) => !checkpoint.equals(after.get(x))
            return Array.from(JigControl.before).filter(didChange).map(([target]) => target)
          })

          // re-enable enforcement and set back the old reads
          JigControl.reads = reads

          // if anything was created or changed, then we have an action
          const deepReplacing = !parentIsAJig && !JigControl.enforce
          if ((JigControl.creates.size || changed.length) && !deepReplacing) {
            if (!parentIsAJig) {
              throw new Error(`internal method ${this.name} may not be called to change state`)
            }

            const inputs = new Set()
            const outputs = new Set()
            const reads = new Set(JigControl.reads)

            // helper function to add a jig to the inputs and outputs
            const spend = target => {
              outputs.add(target)
              if (!JigControl.creates.has(target)) inputs.add(target)
            }

            // for every jig changed, add all jigs involved in the production of
            // its changes (its callers set) as outputs, and add them as inputs
            // if they were not newly created.
            changed.forEach(target => {
              JigControl.callers.get(target).forEach(caller => spend(caller))
              spend(target)
            })

            // every jig created gets a new output, and the same applies to its callers
            JigControl.creates.forEach(target => {
              JigControl.callers.get(target).forEach(caller => spend(caller))
              spend(target)
            })

            // record the action in the proto-transaction
            run.transaction.storeAction(original, this.name, args, inputs, outputs,
              reads, JigControl.before, after, JigControl.proxies)
          }

          // If we are within an internal method, then add any changes of state back
          // to the main JigControl. Otherwise reset JigControl.
          if (outerJigControl) {
            JigControl.creates.forEach(target => outerJigControl.creates.add(target))
            JigControl.reads.forEach(target => outerJigControl.reads.add(target))
            JigControl.before.forEach((checkpoint, target) => {
              if (!JigControl.before.has(target)) outerJigControl.before.set(target, checkpoint)
            })
            JigControl.proxies.forEach((proxy, target) => {
              if (!JigControl.proxies.has(target)) outerJigControl.proxies.set(target, proxy)
            })
            JigControl.callers.forEach((callers, target) => {
              if (!outerJigControl.callers.has(target)) {
                outerJigControl.callers.set(target, callers)
              } else {
                const outerCallers = outerJigControl.callers.get(target)
                callers.forEach(caller => outerCallers.add(caller))
              }
            })
            Object.assign(JigControl, outerJigControl)
          } else {
            resetJigControl()
          }
        }

        run.transaction.end()

        // return the return value of the method to the user
        return ret
      } catch (e) {
        // mark that there was an error so that if a parent jig attempts to
        // wrap it, we will still be able to throw an exception at the end.
        // only record the first...
        if (!JigControl.error) JigControl.error = e

        if (outerJigControl) Object.assign(JigControl, outerJigControl)

        JigControl.stack.pop()

        // If we are at the bottom of the stack, and there was an error, then
        // reset all jigs involved back to their original state before throwing
        // the error to the user.
        if (!JigControl.stack.length) {
          JigControl.before.forEach((checkpoint, jig) => {
            const restored = checkpoint.restore()
            JigControl.disableSafeguards(() => {
              Object.keys(jig).forEach(key => delete jig[key])
              Object.assign(jig, restored)
            })
          })
          resetJigControl()
        }

        run.transaction.end()

        throw e
      }
    }

    // if we are injecting a state directly from a cache, just return
    if (JigControl.blankSlate) return proxy

    this.owner = JigControl.stack.length ? JigControl.stack[JigControl.stack.length - 1].owner : run.transaction._owner
    this.satoshis = 0
    // origin and location will be set inside of storeAction
    this.origin = '_'
    this.location = '_'

    proxy.init(...args)

    return proxy
  }

  init () { }

  toString () { return `[jig ${this.constructor.name}]` }

  async sync (options) {
    const syncer = Context._activeRun()._kernel._syncer
    return syncer.sync(Object.assign({}, options, { target: this }))
  }

  static get caller () {
    // we must be inside a jig method called by another jig method to be non-null
    if (JigControl.stack.length < 2) return null

    // return the proxy for the jig that called this jig
    return JigControl.proxies.get(JigControl.stack[JigControl.stack.length - 2])
  }

  static set caller (value) { throw new Error('Must not set caller on Jig') }

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

Jig.deps = { JigControl, Context }

module.exports = { Jig, JigControl }
