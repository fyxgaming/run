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
  static get _text () { return require('./type')._text }
  static get _Membrane () { return require('./membrane') }
  static get _Record () { return require('./record') }
  static get _Bindings () { return require('./bindings') }
  static get _Log () { return require('./log') }
  static get _TAG () { return 'Code' }
}

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Class that all non-native code jigs inherit from
 */
class Code {
  static async sync () {
    const { _TAG, _assert, _Membrane, _Bindings, _Log, _Repository, _Record, _text } = Context

    _Log._info(_TAG, 'Sync', _text(this))

    _assert(!_Repository._isNative(this), 'Native code may not be synced')

    let hadPendingUpdates = false

    // Wait for pending updates
    while (true) {
      const location = _Membrane._sudo(() => this.location)
      const { error, record } = _Bindings._location(location)
      if (error) throw new Error(`Cannot sync.\n\n${error}`)

      if (!record) break

      hadPendingUpdates = true
      await _Record._get(record)._sync()
    }

    // Forward sync if there were no updates pending
    if (!hadPendingUpdates) {
      console.log('FORWARD SYNCING')

      // Don't need to sync if deleted
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
    const { _TAG, _assert, _Log, _Repository, _text } = Context

    _Log._info(_TAG, 'Upgrade', _text(this))

    _assert(!_Repository._isNative(this), 'Native code may not be upgraded')

    // Not available inside jig code

    // TODO
  }

  static destroy () {
    const { _TAG, _assert, _Log, _Repository, _text } = Context

    _Log._info(_TAG, 'Destroy', _text(this))

    _assert(!_Repository._isNative(this), 'Native code may not be destroyed')

    // Not available inside jig code

    // TODO
  }

  static [Symbol.hasInstance] (x) {
    // Only functions may be code jigs
    if (typeof x !== 'function') return false

    // Native code is special. It does not have Code in the prototype chain.
    if (Context._Repository._isNative(x)) return true

    // Check if we are already a constructor prototype. Prototypes are not Code.
    if (x === x.constructor.prototype) return false

    // Check if Code is in the prototype chain of the class
    let type = Object.getPrototypeOf(x)
    while (type) {
      if (type === this) return true
      type = Object.getPrototypeOf(type)
    }

    return false
  }
}

Code.deps = { Context }

// ------------------------------------------------------------------------------------------------

const NativeCode = Context._Repository._installNative(Code)

module.exports = NativeCode
