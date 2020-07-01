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
  static get _kernel () { return require('./misc')._kernel }
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
  static async sync (options = {}) {
    const { _TAG, _assert, _Membrane, _Bindings, _Log, _Repository, _Record, _text, _kernel } = Context

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

    const kernel = _kernel()

    let location = _Membrane._sudo(() => this.location)
    let loc = _Bindings._location(location)

    // Forward sync
    while (true) {
      if (hadPendingUpdates) break
      if (options.forward === false) break
      if (typeof loc.vdel !== 'undefined') break

      console.log('FORWARD SYNCING')

      _assert(loc.txid && typeof loc.vout !== 'undefined')

      const spendTxId = await kernel._blockchain.spends(loc.txid, loc.vout)
      if (!spendTxId) break

      const spendTx = await kernel._blockchain.fetch(spendTxId)

      console.log(spendTx)

      // await _Record._import(spendTx, true /*published*/, this /*jigToSync)

      location = _Membrane._sudo(() => this.location)
      loc = _Bindings._location(location)

      break
    }

    // OFF_LIMITS list when syncing, it can't be used in a record
    // Already synced property of options, so that we don't sync twice.

    // Dedup our syncs

    // Limits to forward syncing ...
    // Limits to load depth

    if (options.inner !== false) {
      console.log('INNER SYNCING')
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
