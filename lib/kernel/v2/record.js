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
const Codec = require('../../util/codec')

// TODO
// Published
// How is owner applied to jigs during replay --- when publish is intercepted, owner is set there
// toJSON() needs to make sure nothing is unbound

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

// How do we compare a replayed record with a tx json?
// toJSON()
// generates inputs and outputs
// reorders jigs list
// spends, reads, creates, deletes

*/

/*
{
  "in": 3,
  "ref": ["abc_d0"],
  "out": ["...", "..."],
  "exec": [
    { "cmd": "deploy", "data": ["class A {}", {}], "owner": "123" },
    { "cmd": "call", "data": { "target": { "$jig": 0 } } }
  ]
}
*/

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Record'

const RECORDS = new Map() // Unpublished, ID -> Record

let PUBLISH_INTERCEPT = null

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

    this._exec = []
    this._owners = []

    this._jigs = [] // all involved
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

    this._reads = this._reads.filter(jig2 => !sameJig(jig, jig2))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)

    this._link(jig)
  }

  _delete (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    _assert(hasJig(this._spends, jig) || hasJig(this._creates, jig))

    if (hasJig(this._deletes, jig)) return

    this._deletes.push(jig)

    this._reads = this._reads.filter(jig2 => !sameJig(jig, jig2))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)
  }

  _create (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    _assert(!hasJig(this._jigs, jig))

    if (hasJig(this._creates, jig)) return

    this._creates.push(jig)

    const Unbound = require('./unbound')
    this._owners.push(new Unbound(undefined))

    this._snapshots.set(jig, new Snapshot(jig))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)
  }

  _read (jig) {
    _assert(!this._committed)
    _assert(RECORDS.has(this._id))

    if (hasJig(this._jigs, jig)) return

    this._reads.push(jig)

    this._snapshots.set(jig, new Snapshot(jig))

    if (!hasJig(this._jigs, jig)) this._jigs.push(jig)

    this._link(jig)
  }

  _commit () {
    _assert(this._exec.length)
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

    Log._debug(TAG, 'Rollback', this._id, ',', e)

    for (const [, snapshot] of this._snapshots) {
      snapshot._rollback()
    }

    RECORDS.delete(this._id)
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

    this._exec = this._exec.concat(record._exec)
    this._owners = this._owners.concat(record._owners)

    Membrane._sudo(() => {
      this._jigs.forEach((jig, index) => {
        if (hasJig(this._reads, jig)) return

        const location = `${this._id}_j${index}`

        if (hasJig(this._creates, jig)) jig.origin = location
        jig.location = location
      })
    })

    this._committed = true

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

  _upstreamPublished (record, bindingsMap) {
    this._upstream = this._upstream.filter(r => r !== record)

    for (const [jig, bindings] of bindingsMap) {
      const ours = this._jigs.find(j => sameJig(j, jig))
      if (!ours) continue

      const ss = this._snapshots.get(ours)
      if (!ss) continue

      Object.assign(ss._props, bindings)

      const Unbound = require('./unbound')

      if (!this._spentDownstream(ours)) {
        Membrane._sudo(() => {
          if (ours.owner instanceof Unbound && !ours.owner._value) ours.owner = bindings.owner
          if (ours.satoshis instanceof Unbound && !ours.satoshis._value) ours.satoshis = bindings.satoshis
        })
      }
    }

    this._publish()
  }

  _spentDownstream (jig) {
    for (const record of this._downstream) {
      for (const jig2 of record._spends) {
        if (sameJig(jig, jig2)) return true
      }
    }
    return false
  }

  _publish () {
    if (PUBLISH_INTERCEPT) return PUBLISH_INTERCEPT(this)

    console.log('PUBLISH')

    if (this._upstream.length) return
    if (!this._spends.length && !this._creates.length) return

    this._publishInternal().catch(e => this._rollback(e))
  }

  async _publishInternal () {
    Log._debug(TAG, 'Publish', this._id)

    console.log('----------')
    console.log(JSON.stringify(this._exec))
    console.log(JSON.stringify(this._owners))
    console.log('spends', this._spends.length)
    console.log('creates', this._creates.length)
    console.log('reads', this._reads.length)
    console.log('deletes', this._deletes.length)
    console.log('----------')

    const Unbound = require('./unbound')

    // Get owners for new creates
    for (let i = 0; i < this._owners.length; i++) {
      if (!(this._owners[i] instanceof Unbound)) continue

      const owners = await this._kernel._owner.owner()
      const owner = Array.isArray(owners) ? owners[0] : owners

      this._owners[i] = owner

      const jig = this._creates[i]
      const hasOwner = Membrane._sudo(() => jig.owner instanceof Unbound && !jig.owner)
      if (hasOwner) continue

      Membrane._sudo(() => { jig.owner = owner })
    }

    // Bind owners and satoshis
    this._creates.forEach(jig => {
      if (this._spentDownstream(jig)) return

      Membrane._sudo(() => {
        if (jig.owner instanceof Unbound) jig.owner = jig.owner._value
        if (jig.satoshis instanceof Unbound) jig.satoshis = jig.owner._value || 0
      })
    })

    // Calculate the inputs
    const inputs = this._spends

    // Calculate the outputs
    const outputs = this._spends.filter(jig => !hasJig(this._deletes, jig))
    this._creates.filter(jig => jig => !hasJig(this._deletes, jig)).forEach(jig => outputs.push(jig))

    // Calculate the refs
    const ref = this._reads.map(jig => this._snapshots.get(jig)._props.location)

    console.log('inputs', inputs.length)
    console.log('outputs', outputs.length)

    // Calculate state
    const out = []

    const codec = new Codec()._saveJigs(x => '123')

    const exec = this._exec.map(x => codec._encode(x))
    const lock = codec._encode(this._owners)

    // Create the OP_RETURN json
    const json = { in: inputs.length, ref, out, lock, exec }

    console.log('json', JSON.stringify(json, 0, 2))

    // Sort jigs by spends and refs, as they will be loaded later
    // Use codec to index into this

    // Lock codec can check if location is non-record, final. Done.
    // Otherwise, locks may depend on other records. Won't know til then.
    // But I could detect that here, stop the record, and link it up.
    // Breaks example otherwise. But then the second problem is deploys.
    // If lock is in another record, link it, and then wait.
    // If lock is not deployed, ... deploy it?

    // New owner's aren't assigned until the tx is broadcast.
    // Even during import. So ... We can deploy at the end.
    // How to deploy in an existing record?
    // Install and deploy. PUBLISH_INTERCEPT
    // run._deploy

    // Hash states of jigs
    // Create Record JSON
    // Create TX
    // Pay for TX
    // Sign TX
    // Broadcast
    // Apply final bindings, outputs and deletes
    // Add to cache, both outputs and deleted
    // Add to inventory
    // Notify next transaction to start publishing

    //

    // this._spends.map(jig => this._snapshots.get(jig)._props.location)

    // Create the transaction (separate method)
    // When a tx is imported, it is uncommitted
    // Jigs are assigned their record ID

    // Assign each owner to creates

    // How to know which commands go with which owners?

    // this._creates.forEach(jig => Membrane._sudo(() => { jig.owner = this._owner }))

    // Owners that need to be deployed

    // Update snapshots

    // And actual jigs when not downstream

    // Find the jig at the key
    // Set the location and origin and owner and satoshis

    // For all non-downstream bindings, set here

    // Async, and rollback

    const bindings = new Map() // Jig -> Bindings

    this._downstream.forEach(r => r._upstreamPublished(this, bindings))

    RECORDS.delete(this.id)
  }

  _deploy (Cs) {
    _assert(Cs.length)
    _assert(!this._exec.length)

    Log._info(TAG, 'Deploy', Cs.map(C => _text(C)).join(', '))

    const cmd = { cmd: 'deploy', data: [] }

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

      cmd.data.push(src)
      cmd.data.push(props)

      this._create(C)
    })

    this._exec.push(cmd)
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
    record._publish()
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
  const oldPublishIntercept = PUBLISH_INTERCEPT
  PUBLISH_INTERCEPT = record => records.push(record)

  try {
    const ret = callback()

    if (ret instanceof Promise) {
      throw new Error('Transactions must not include any asyncronous code')
    }

    while (records.length > 1) {
      const last = records.pop()
      records[records.length - 1]._combine(last)
    }

    if (records.length) records[0]._publish()
  } catch (e) {
    records.reverse().forEach(r => r._rollback(e))

    throw e
  } finally {
    PUBLISH_INTERCEPT = oldPublishIntercept
  }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function sameJig (a, b) {
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

const hasJig = (arr, jig) => arr.some(x => sameJig(x, jig))

// ------------------------------------------------------------------------------------------------

const spendableBinding = binding => !(binding instanceof require('./Unbound')) || !binding

// ------------------------------------------------------------------------------------------------

module.exports = Record
