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
  static get _Jig () { return require('./jig') }
  static get _assert () { return require('./misc')._assert }
  static get _kernel () { return require('./misc')._kernel }
  static get _text () { return require('./type')._text }
  static get _deepVisit () { return require('./deep')._deepVisit }
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
    // Dedup our inner syncs
    options._synced = options._synced || new Set()
    if (options._synced.has(this)) return
    options._synced.add(this)

    const {
      _TAG, _assert, _Membrane, _Bindings, _Log, _Repository, _Record, _text, _kernel, _deepVisit,
      _Jig
    } = Context

    _Log._info(_TAG, 'Sync', _text(this))

    _assert(!_Repository._isNative(this), 'Native code may not be synced')

    let hadPendingUpdates = false

    // Wait for pending updates
    while (true) {
      const location = _Membrane._sudo(() => this.location)
      const { error, record } = _Bindings._location(location)
      if (error) throw new Error(`Cannot sync.\n\n${error}`)

      _Log._info(_TAG, 'Waiting to publish pending updates')

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

      _assert(loc.txid && typeof loc.vout !== 'undefined')

      const spendTxId = await kernel._blockchain.spends(loc.txid, loc.vout)
      if (!spendTxId) break

      _Log._info(_TAG, 'Forward syncing to', spendTxId)

      const spendTx = await kernel._blockchain.fetch(spendTxId)

      // Use an import to update the jig
      const record = await _Record._import(spendTx, true /* published */, this /* jigToSync */)
      _Record._delete(record)

      // Get the next location, and loop again
      location = _Membrane._sudo(() => this.location)
      loc = _Bindings._location(location)

      break
    }

    if (options.inner !== false) {
      _Log._info(_TAG, 'Inner syncing')

      const promises = []

      _deepVisit(this, x => {
        if (x instanceof _Jig || x instanceof Code) {
          const promise = x.sync(options)
          promises.push(promise)
          return false
        }
      })

      await Promise.all(promises)
    }

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

  // B extends A, B is not Code, A is, B instanceof Code is true. Wow. In fact, any extensions are.
  // That's bad. Somehow, hasInstance needs to work on the actual instance, not any parents.
  // What if we just have a WeakSet of all code? That'll work.

  static [Symbol.hasInstance] (x) {
    // Only functions may be code jigs
    if (typeof x !== 'function') return false

    // The repository has a quick check
    return Context._Repository._isCode(x)
  }
}

Code.deps = { Context }

// ------------------------------------------------------------------------------------------------

const NativeCode = Context._Repository._installNative(Code)

module.exports = NativeCode
