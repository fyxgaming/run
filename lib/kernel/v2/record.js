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

// TODO: bindings updates, log publish, get working
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
// const _jigMapKey = (map, jig) => Array.from(map.keys()).find(x => _sameJig(x, jig)) || jig
// const _indexOfJigInMapKeys = (map, jig) => _indexOfJigInArray(Array.from(map.keys()), jig)
// const _jigInMapKeys = (map, jig) => _jigInArray(Array.from(map.keys()), jig)
// const _indexOfJigInArray = (arr, jig) => arr.findIndex(x => _sameJig(x, jig))

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
    this._published = false
    this._snapshots = new Map() // Jig -> Record

    this._cmd = null
    this._data = []

    this._jigs = [] // all
    this._spends = [] // spends become outputs if not deleted
    this._deletes = [] // jigs spent or created but not outputs
    this._creates = [] // new jigs created
    this._reads = [] // jigs read that are not spends, deletes, or creates

    this._upstream = new Set() // records we depend on
    this._downstream = new Set() // records that depend on us
  }

  _spend (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    if (_jigInArray(this._spends, jig)) return
    if (_jigInArray(this._creates, jig)) return
    if (_jigInArray(this._deletes, jig)) return

    this._spends.push(jig)

    this._snapshots.set(jig, new Snapshot(jig))

    this._reads = this._reads.filter(jig2 => !_sameJig(jig, jig2))

    if (!_jigInArray(this._jigs, jig)) this._jigs.push(jig)

    this._link(jig)
  }

  _delete (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    _assert(_jigInArray(this._spends, jig) || _jigInArray(this._creates, jig))

    if (_jigInArray(this._deletes, jig)) return

    this._deletes.push(jig)

    this._reads = this._reads.filter(jig2 => !_sameJig(jig, jig2))

    if (!_jigInArray(this._jigs, jig)) this._jigs.push(jig)
  }

  _create (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    _assert(!_jigInArray(this._jigs, jig))

    if (_jigInArray(this._creates, jig)) return

    this._creates.push(jig)

    this._snapshots.set(jig, new Snapshot(jig))

    if (!_jigInArray(this._jigs, jig)) this._jigs.push(jig)
  }

  _read (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    if (_jigInArray(this._jigs, jig)) return

    this._reads.push(jig)

    if (!_jigInArray(this._jigs, jig)) this._jigs.push(jig)

    this._link(jig)
  }

  _commit () {
    _assert(this._cmd)
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    Membrane._sudo(() => {
      this._jigs.forEach((jig, index) => {
        if (_jigInArray(this._reads, jig)) return

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

    // Turn it into a batch if not already
    // If batch, merge all insides

    // Commits
  }

  _link (jig) {
    const location = Membrane._sudo(() => jig.location)
    const { record: recordId } = _location(location)
    if (!recordId) return

    const record = RECORDS.get(recordId)
    _assert(record, `Record not found: ${recordId}`)
    _assert(record._published)

    record._downstream.add(this)
    this._upstream.add(record)
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
  const Membrane = require('../kernel/v2/membrane')
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

const _jigInArray = (arr, jig) => arr.some(x => _sameJig(x, jig))

// ------------------------------------------------------------------------------------------------

module.exports = Record
