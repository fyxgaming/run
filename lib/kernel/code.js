/**
 * code.js
 *
 * A jig for code such as classes and functions
 */

// ------------------------------------------------------------------------------------------------
// Context
// ------------------------------------------------------------------------------------------------

class Context {
  static get _Repository () { return require('./repository') }
  static get _assert () { return require('./misc')._assert }
  static get _Membrane () { return require('./membrane') }
  static get _Record () { return require('./record') }
  static get _Bindings () { return require('./bindings') }
}

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Class that all non-native code jigs inherit from
 */
class Code {
  static async sync () {
    Context._assert(!Context._Repository._isNative(this), 'Native code may not be synced')

    console.log('SYNC')

    // See if this jig is pending any updates
    const location = Context._Membrane._sudo(() => this.location)
    const { error, record } = Context._Bindings._location(location)
    if (error) throw new Error(`Cannot sync.\n\n${error}`)

    // Sync the record if there are pending updates
    if (record) {
      await Context._Record._get(record)._sync()
    }

    // Sync all inner jigs
    // const Jig = require('./')
    // _deepVisit(this._C, x => {
    // if (x instanceof Jig || x instanceof Code) {
    // promises.push(x.sync())
    // return false
    // }
    // })

    // When it gets there, see if still in a record

    // Forward sync this jig
    // Not safe, unless references are put in tact
    // return Promise.all(promises)

    // Not available inside jig code

    // TODO
  }

  static upgrade () {
    Context._assert(!Context._Repository._isNative(this), 'Native code may not be upgraded')

    console.log('UPGRADE')
    // Not available inside jig code

    // TODO
  }

  static destroy () {
    Context._assert(!Context._Repository._isNative(this), 'Native code may not be destroyed')

    console.log('DESTROY')
    // Not available inside jig code
    // Not available inside jig code

    // TODO
  }

  static [Symbol.hasInstance] (x) {
    // Only functions may be code jigs
    if (typeof x !== 'function') return false

    // Native code is special. It does not have Code in the prototype chain.
    const PrevCode = Context._Repository._get(x)
    if (PrevCode) return true

    // Check if we are already a constructor prototype. Prototypes are not Code.
    if (x === x.constructor.prototype) return false

    // Check if Code is in the prototype chain of the class
    let type = Object.getPrototypeOf(x)
    while (type) {
      if (type === this) return true
      type = Object.getPrototypeOf(type)
    }

    // Not code
    return false
  }
}

Code.deps = { Context }

// ------------------------------------------------------------------------------------------------

const NativeCode = Context._Repository._installNative(Code)

module.exports = NativeCode
