/**
 * Record.js
 *
 * A record of a jig action that is turned into a transaction
 */

const { crypto } = require('bsv')
const Membrane = require('./membrane')
const { _kernel, _assert } = require('../../util/misc')
const { _text, _sourceCode, _parent } = require('../../util/type')
const { _location, _BINDINGS } = require('../../util/bindings')
const Snapshot = require('../../util/snapshot')
const Log = require('../../util/log')

// TODO: log publish, merge
// Relationship between linking and committing

// TODO
//    -publish async .. needs catch, and sync listeners

/*
{
  cmd: 'new',
  data: [],
  owner: '..',
  in: 5,
  out: [0, 1, 2],
  ref: []
}
*/

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

const RECORDS = new Map() // Unpublished, ID -> Record

let PUBLISHER = require('./publisher')

let RECORDING = false

// ------------------------------------------------------------------------------------------------
// Record
// ------------------------------------------------------------------------------------------------

class Record {
  constructor () {
    this._id = 'record://' + crypto.Random.getRandomBuffer(32).toString('hex')
    RECORDS.set(this._id, this)

    Log._debug(TAG, 'Create', this._id)

    this._kernel = _kernel()
    this._committed = false
    this._snapshots = new Map() // Jig -> Record

    this._cmd = null
    this._data = []
    this._owner = null

    this._jigs = [] // all
    this._spends = [] // spends become outputs if not deleted
    this._deletes = [] // jigs spent or created but not outputs
    this._creates = [] // new jigs created
    this._reads = [] // jigs read that are not spends, deletes, or creates

    this._upstream = [] // records we depend on
    this._downstream = [] // records that depend on us
  }

  _spend (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    if (hasJig(this._spends, jig)) return
    if (hasJig(this._creates, jig)) return
    if (hasJig(this._deletes, jig)) return

    this._spends.push(jig)

    this._snapshots.set(jig, new Snapshot(jig))

    this._reads = this._reads.filter(jig2 => !_sameJig(jig, jig2))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)

    this._link(jig)
  }

  _delete (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    _assert(hasJig(this._spends, jig) || hasJig(this._creates, jig))

    if (hasJig(this._deletes, jig)) return

    this._deletes.push(jig)

    this._reads = this._reads.filter(jig2 => !_sameJig(jig, jig2))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)
  }

  _create (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    _assert(!hasJig(this._jigs, jig))

    if (hasJig(this._creates, jig)) return

    this._creates.push(jig)

    this._snapshots.set(jig, new Snapshot(jig))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)

    const Unbound = require('./unbound')
    this._owner = new Unbound(undefined)
  }

  _read (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    if (hasJig(this._jigs, jig)) return

    this._reads.push(jig)

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)

    this._link(jig)
  }

  _commit () {
    _assert(this._cmd)
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    Membrane._sudo(() => {
      this._jigs.forEach((jig, index) => {
        if (hasJig(this._reads, jig)) return

        const location = `${this._id}_j${index}`
        const deployed = !_location(jig.origin).error

        jig.origin = deployed ? jig.origin : location
        jig.location = location
        jig.nonce = jig.nonce + 1
      })
    })

    this._committed = true
  }

  _rollback (e) {
    if (!RECORDS.has(this._id)) return

    this._downstream.forEach(r => r._rollback(e))

    Log._debug(TAG, 'Rollback', this._id)

    for (const [, snapshot] of this._snapshots) {
      snapshot._rollback()
    }

    RECORDS.delete(this._id)
  }

  _deploy (Cs) {
    _assert(!this._cmd)

    Log._info(TAG, 'Deploy', Cs.map(C => _text(C)).join(', '))

    this._cmd = 'deploy'

    // Spend parent inputs
    Cs.forEach(C => {
    // Utility classes don't need to be spent
      if (C.options && C.options.utility) return

      // No parent, no spend
      const Parent = _parent(C)
      if (!Parent) return

      // What if the parent is not yet created?
      this._spend(Parent)
    })

    // Create the arguments for the deploy action
    Cs.forEach(C => {
      const src = _sourceCode(C)
      const props = Membrane._sudo(() => Object.assign({}, C))

      // Remove bindings from the props because they won't be deployed
      _BINDINGS.forEach(x => delete props[x])

      // Make sure there are no presets
      _assert(!props.presets)

      this._data.push(src)
      this._data.push(props)

      this._create(C)
    })
  }

  _combine (record) {
    _assert(this._committed)
    _assert(record._committed)
    _assert(this._kernel === record._kernel)

    record._spends.forEach(jig => _assert(!hasJig(this._deletes, jig)))
    record._spends.forEach(jig => _assert(spendableBinding(record._snapshots.get(jig)._props.owner)))
    record._spends.forEach(jig => _assert(spendableBinding(record._snapshots.get(jig)._props.satoshis)))

    record._jigs
      .filter(jig => !hasJig(this._jigs, jig))
      .forEach(jig => this._jigs.push(jig))

    record._spends
      .filter(jig => !hasJig(this._spends, jig))
      .filter(jig => !hasJig(this._creates, jig))
      .forEach(jig => this._spends.push(jig))

    record._creates
      .filter(jig => !hasJig(this._creates, jig))
      .forEach(jig => this._creates.push(jig))

    record._deletes
      .filter(jig => !hasJig(this._deletes, jig))
      .forEach(jig => this._deletes.push(jig))

    record._reads
      .filter(jig => !hasJig(this._jigs, jig))
      .forEach(jig => this._reads.push(jig))

    record._snapshots.forEach((snapshot, jig) => {
      if (this._snapshots.has(jig)) return
      this._snapshots.set(jig, snapshot)
    })

    record._upstream.forEach(r => {
      if (this._upstream.includes(r)) return
      this._upstream.push(r)
      r._downstream = r._downstream.filter(s => s !== record)
      r._downstream.push(this)
    })

    record._downstream.forEach(r => {
      if (this._downstream.includes(r)) return
      this._downstream.push(r)
      r._upstream = r._upstream.filter(s => s !== record)
      r._upstream.push(this)
    })

    if (this._cmd !== 'multi') {
      const sub = { _cmd: this._cmd, _data: this._data, _owner: this._owner }
      this._data = [sub]
    }

    if (record._cmd === 'multi') {
      this._data = this._data.concat(record._data)
    } else {
      const sub = { _cmd: record._cmd, _data: record._data, _owner: record._owner }
      this._data.push(sub)
    }

    this._cmd = 'multi'

    RECORDS.delete(record._id)
  }

  _link (jig) {
    const location = Membrane._sudo(() => jig.location)
    const { record: recordId } = _location(location)
    if (!recordId) return

    const record = RECORDS.get(recordId)
    _assert(record, `Record not found: ${recordId}`)
    _assert(record._committed)

    if (!record._downstream.includes(this)) record._downstream.push(this)
    if (!this._upstream.includes(record)) this._upstream.push(record)
  }
}

// ------------------------------------------------------------------------------------------------
// _record
// ------------------------------------------------------------------------------------------------

Record._record = callback => {
  _assert(!RECORDING)

  const record = new Record()

  try {
    RECORDING = true

    const ret = callback(record)

    if (ret instanceof Promise) {
      throw new Error('Transactions must not include any asyncronous code')
    }

    record._commit()

    PUBLISHER._publish(record)
  } catch (e) {
    record._rollback(e)

    throw e
  } finally {
    RECORDING = false
  }
}

// ------------------------------------------------------------------------------------------------
// _recordMultiple
// ------------------------------------------------------------------------------------------------

Record._recordMultiple = callback => {
  const records = []
  const publisher = PUBLISHER
  PUBLISHER = { _publish: record => records.push(record) }

  try {
    const ret = callback()

    if (ret instanceof Promise) {
      throw new Error('Transactions must not include any asyncronous code')
    }

    while (records.length > 1) {
      const last = records.pop()
      records[records.length - 1]._combine(last)
    }

    if (records.length) publisher._publish(records[0])
  } catch (e) {
    records.reverse().forEach(r => r._rollback(e))

    throw e
  } finally {
    PUBLISHER = publisher
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function _sameJig (a, b) {
  return Membrane._sudo(() => {
    if (a === b) return true
    if (_location(a.origin).error) return false
    if (_location(b.origin).error) return false
    if (a.origin !== b.origin) return false
    if (a.location !== b.location) throw new Error('Inconsistent worldview')
    return true
  })
}

// ------------------------------------------------------------------------------------------------

const hasJig = (arr, jig) => arr.some(x => _sameJig(x, jig))

// ------------------------------------------------------------------------------------------------

const spendableBinding = binding => !(binding instanceof require('./Unbound')) || !binding

// ------------------------------------------------------------------------------------------------

module.exports = Record
