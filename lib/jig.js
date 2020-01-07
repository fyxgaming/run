/**
 * jig.js
 *
 * Jig class users extend from to create digital property
 */

/* global control */

const util = require('./util')

module.exports = class Jig {
  constructor (...args) {
    const run = util.activeRunInstance()

    if (!run.code.isSandbox(this.constructor)) {
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

    function resetControl () {
      control.stack = []
      control.creates = new Set()
      control.reads = new Set()
      control.saves = new Map()
      control.callers = new Map()
      control.proxies = new Map()
      control.enforce = true
      control.error = null
    }

    const checkValid = () => {
      if (control.enforce && this.origin && this.origin[0] === '!') {
        throw new Error(`${this.origin.slice(1)}`)
      }
    }

    const original = this
    const handler = { parent: null, name: null }
    const proxy = new Proxy(this, handler)

    // Helper methods to determine where the proxy is being called from
    const topOfStack = () => control.stack[control.stack.length - 1]
    const fromWithin = () => control.stack.length && topOfStack() === original
    const fromInstanceOfSameJigClass = () => control.stack.length && topOfStack().constructor === proxy.constructor
    const fromInstanceOfDifferentJigClass = () => control.stack.length && topOfStack().constructor !== proxy.constructor

    // internal variable that tracks whether init is called. if we are injecting a state, then init was called.
    let calledInit = !!control.stateToInject

    handler.getPrototypeOf = function (target) {
      checkValid()

      if (control.stack.length) control.proxies.set(original, proxy)

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

      if (control.stack.length) control.proxies.set(original, proxy)

      if (!this.has(target, prop)) return undefined

      const descriptor = Object.getOwnPropertyDescriptor(target, prop)
      if (!descriptor) return undefined
      return { ...descriptor, value: this.get(target, prop) }
    }

    handler.defineProperty = function (target, prop, descriptor) {
      throw new Error('defineProperty disallowed')
    }

    handler.has = function (target, prop) {
      checkValid()

      if (control.stack.length) control.proxies.set(original, proxy)

      if (control.enforce && prop[0] === '_' && fromInstanceOfDifferentJigClass()) {
        throw new Error(`cannot check ${prop} because it is private`)
      }

      const didRead = control.stack.length && (!(target instanceof Jig) || !permanents.includes(prop))

      if (didRead) control.reads.add(original)

      return prop in target
    }

    handler.get = function (target, prop, receiver) {
      checkValid()

      if (control.stack.length) control.proxies.set(original, proxy)

      if (prop === '$object') return proxy

      const targetIsAJig = target instanceof Jig

      const syncRequired = ['origin', 'location']

      if (control.enforce && targetIsAJig && syncRequired.includes(prop) && target[prop][0] === '_') {
        throw new Error(`sync required before reading ${prop}`)
      }

      // These don't change, so they don't require a read
      const noRead = ['origin', 'constructor']
      if (targetIsAJig && noRead.includes(prop)) return target[prop]
      const isJigMethod = targetIsAJig && typeof target[prop] === 'function'
      if (control.stack.length && !isJigMethod) control.reads.add(original)

      if (prop[0] === '_' && fromInstanceOfDifferentJigClass()) {
        throw new Error(`cannot get ${prop} because it is private`)
      }

      // return basic types directly
      const basicTypes = ['undefined', 'boolean', 'number', 'string', 'symbol']
      if (basicTypes.includes(typeof target[prop])) return target[prop]

      // If getting an iterator, return the iterator function bound to the original target
      // instead of the proxy, because `new Uint8Array(new Proxy(new Uint8Array([1, 2]), {}))`
      // would otherwise throw an error that "this is not a typed array". For a reference, see:
      // https://stackoverflow.com/questions/45700439/new-proxynew-map-values
      if (prop === Symbol.iterator) return target[prop].bind(target)

      // return object types wrapped
      if (typeof target[prop] === 'object') {
        if (target[prop] === null) return null
        if (target[prop] instanceof Jig) return target[prop]
        if (!control.enforce) return target[prop]

        // wrap existing objects for protection
        return new Proxy(target[prop], { ...this, parent: target, name: prop })
      }

      // If we are returning any constructor, then we don't need to wrap it. Only
      // Jig methods need to be wrapped. Constructors will get wrapped automatically
      // in the Jig constructor.
      if (prop === 'constructor') {
        return target[prop]
      }

      if (typeof target[prop] === 'function') {
        // we must check if method includes prop because the Safari browser thinks class
        // methods are deployable. other browser do not
        if (util.deployable(target[prop]) && (!targetIsAJig || !methods.includes(prop))) return target[prop]

        // the property is a method on the object. wrap it up so that we can intercept its execution
        // to publish an action on the blockchain.
        return new Proxy(target[prop], { ...this, parent: target, name: prop })
      }
    }

    handler.set = function (target, prop, value, receiver) {
      checkValid()

      if (control.stack.length) control.proxies.set(original, proxy)

      if (control.enforce) {
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

      // Whether value is serializable is checked after the method is complete
      target[prop] = value

      return true
    }

    handler.deleteProperty = function (target, prop) {
      checkValid()

      if (control.stack.length) control.proxies.set(original, proxy)

      if (control.enforce) {
        if (!fromWithin()) {
          throw new Error(`must not delete ${prop} outside of a method`)
        }

        if (target instanceof Jig) {
          const notDeletable = ['origin', 'location', ...methods]

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

      if (control.stack.length) control.proxies.set(original, proxy)

      if (control.stack.length) control.reads.add(original)

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
        if (control.stack.length) throw new Error('sync may only be called externally')
        return target.call(proxy, ...args)
      }

      const run = util.activeRunInstance()
      run.transaction.begin()

      // If we are calling an internal method on the jig from outside of the jig, then
      // this method is not allowed to change any state. However, we may be deep in a
      // call stack from other jigs, so we cannot use the control.saves to determine if
      // a change has occurred. We need a new call stack. Therefore, we'll save the current
      // stack and control state before calling and reinstate it after.
      let outerControl = null
      if (!parentIsAJig && !fromWithin()) {
        outerControl = { ...control }
        resetControl()
      }

      // record all jigs that called this jig in order to be able to spend
      // them if this method changes state. all jigs involved in the production
      // of a change of state must be spent.
      const callers = control.callers.get(original) || new Set()
      control.stack.forEach(target => callers.add(target))
      control.callers.set(original, callers)

      // add ourselves to the stack because we're about to invoke a method
      control.stack.push(original)

      control.proxies.set(original, proxy)

      try {
        if (parentIsAJig && this.name === 'init') {
          if (calledInit) throw new Error('init cannot be called twice')
          calledInit = true
          control.creates.add(original)
        }

        const reads = new Set(control.reads)
        control.enforce = false

        const savedArgRefs = []
        const deployCode = target => { if (util.deployable(target)) run.code.deploy(target) }
        const packers = [deployCode, util.extractJigsAndCodeToArray(savedArgRefs)]
        // Internal methods do not need their args saved
        const savedArgs = parentIsAJig ? util.richObjectToJson(args, packers) : null

        if (!control.saves.has(original)) {
          const save = { refs: [] }
          const packers = [deployCode, util.extractJigsAndCodeToArray(save.refs)]
          save.json = util.richObjectToJson({ ...original }, packers)
          control.saves.set(original, save)
        }
        control.enforce = true
        control.reads = reads

        // make a copy of the args, which ensures that if the args are changed in the method,
        // we still record to the blockchain what was passed in at the time it was called.
        const callArgs = parentIsAJig ? util.jsonToRichObject(savedArgs,
          [util.injectJigsAndCodeFromArray(savedArgRefs)]) : args

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
        const ret = target.call(parentIsAJig ? proxy : this.parent, ...callArgs)

        if (parentIsAJig && this.name === 'init' && typeof ret !== 'undefined') {
          throw new Error('init must not return')
        }

        if (parentIsAJig) {
          util.checkOwner(original.owner)
          util.checkSatoshis(original.satoshis)
        }

        // if there was an error in the call or a child call, and the exception
        // was swallowed, rethrow the error anyway.
        if (control.error) throw new Error(`internal errors must not be swallowed\n\n${control.error}`)

        control.stack.pop()

        // if we are at the bottom of the stack, we have to decide whether to create an
        // action. To do this, we will compare jig states before and after and see if
        // any jigs changed, and if so, figure out the inputs and outputs.
        if (!control.stack.length) {
          // disable enforcement as we are about to read locations on possible inner proxies
          const reads = new Set(control.reads)
          control.enforce = false

          // detect references to properties of other jigs or code, and throw
          const preventPropertiesOfOtherObjects = (target, parent, name) => {
            if (typeof target.$object !== 'undefined' && target.$object !== proxy) {
              const suggestion = `Hint: Consider saving a clone of ${name}'s value instead.`
              throw new Error(`property ${name} is owned by a different jig\n\n${suggestion}`)
            }
          }

          // calculate stateAfter. We already have stateBefore in control.saves
          const stateAfter = new Map()

          const objectsToSave = new Set(control.reads)
          Array.from(control.saves.keys()).forEach(target => objectsToSave.add(target))

          objectsToSave.forEach(target => { // TODO: Remove when remove weak reads
            const refs = []
            const replacers = [util.extractJigsAndCodeToArray(refs), preventPropertiesOfOtherObjects]
            const json = util.richObjectToJson({ ...target }, replacers)
            stateAfter.set(target, { json, refs })
          })

          // calculate the changed array
          const changed = []
          for (const [target, stateBefore] of control.saves) {
            const after = stateAfter.get(target)
            const refChanged = (ref, n) => ref !== after.refs[n]
            if (JSON.stringify(stateBefore.json) !== JSON.stringify(after.json) ||
                    stateBefore.refs.some(refChanged)) {
              changed.push(target)
            }
          }

          // re-enable enforcement and set back the old reads
          control.enforce = true
          control.reads = reads

          // if anything was created or changed, then we have an action
          if (control.creates.size || changed.length) {
            if (!parentIsAJig) {
              throw new Error(`internal method ${this.name} may not be called to change state`)
            }

            const inputs = new Set()
            const outputs = new Set()
            const reads = new Set(control.reads)

            // helper function to add a jig to the inputs and outputs
            const spend = target => {
              outputs.add(target)
              if (!control.creates.has(target)) inputs.add(target)
            }

            // for every jig changed, add all jigs involved in the production of
            // its changes (its callers set) as outputs, and add them as inputs
            // if they were not newly created.
            changed.forEach(target => {
              control.callers.get(target).forEach(caller => spend(caller))
              spend(target)
            })

            // every jig created gets a new output, and the same applies to its callers
            control.creates.forEach(target => {
              control.callers.get(target).forEach(caller => spend(caller))
              spend(target)
            })

            // record the action in the proto-transaction
            run.transaction.storeAction(original, this.name, args, inputs, outputs,
              reads, control.saves, stateAfter, control.proxies)
          }

          // If we are within an internal method, then add any changes of state back
          // to the main control. Otherwise reset control.
          if (outerControl) {
            control.creates.forEach(target => outerControl.creates.add(target))
            control.reads.forEach(target => outerControl.reads.add(target))
            control.saves.forEach((save, target) => {
              if (!control.saves.has(target)) outerControl.saves.set(target, save)
            })
            control.proxies.forEach((proxy, target) => {
              if (!control.proxies.has(target)) outerControl.proxies.set(target, proxy)
            })
            control.callers.forEach((callers, target) => {
              if (!control.callers.has(target)) {
                outerControl.callers.set(target, callers)
              } else {
                callers.forEach(caller => outerControl.get(target).add(caller))
              }
            })
            Object.assign(control, outerControl)
          } else {
            resetControl()
          }
        }

        run.transaction.end()

        // return the return value of the method to the user
        return ret
      } catch (e) {
        // mark that there was an error so that if a parent jig attempts to
        // wrap it, we will still be able to throw an exception at the end.
        // only record the first...
        if (!control.error) control.error = e

        if (outerControl) Object.assign(control, outerControl)

        control.stack.pop()

        // if we are at the bottom of the stack, and there was an error, then
        // reset all jigs involved back to their original state before throwing
        // the error to the user.
        if (!control.stack.length) {
          control.saves.forEach((save, target) => {
            Object.keys(target).forEach(key => delete target[key])
            Object.assign(target, util.jsonToRichObject(save.json,
              [util.injectJigsAndCodeFromArray(save.refs)]))
          })

          resetControl()
        }

        run.transaction.end()

        const message = e.toString()
        if (message === 'TypeError: Date is not a constructor') {
          const hint = 'Hint: Date is disabled inside jigs because it is non-deterministic.'
          const hint2 = 'Consider passing in the Date as a number instead.'
          throw new Error(`${message}\n\n${hint}\n${hint2}`)
        } else throw e
      }
    }

    // if we are injecting a state directly from a cache, do that and just return
    if (control.stateToInject) {
      Object.assign(this, control.stateToInject)
      return proxy
    }

    this.owner = control.stack.length ? control.stack[control.stack.length - 1].owner : run.transaction.owner
    this.satoshis = 0
    // origin and location will be set inside of storeAction
    this.origin = '_'
    this.location = '_'

    proxy.init(...args)

    return proxy
  }

  init () { }

  toString () { return `[jig ${this.constructor.name}]` }

  sync (options) { return util.activeRunInstance().syncer.sync({ ...options, target: this }) }

  static [Symbol.hasInstance] (target) {
    const run = util.activeRunInstance()

    // check if the target has a location. this will be false for this.constructor.prototype.
    if (typeof target !== 'object' || !('location' in target)) return false

    // find the sandboxed version of this class because thats what instances will be
    let T = run.code.getInstalled(this)
    if (!T) {
      const net = util.networkSuffix(run.blockchain.network)
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
