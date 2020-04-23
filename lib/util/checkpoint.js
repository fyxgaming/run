/**
 * checkpoint.js
 *
 * A save point for a jig to easily revert its state
 */

const TokenJSON = require('./json')
const { JigControl } = require('../kernel/jig')
const { _resourceType } = require('./misc')

class Checkpoint {
  constructor (x, code, owner) {
    this.refs = []

    // Checkpoints do not cache, because we need every token intact. Even dups. For now.
    // Otherwise, reads are lost.
    this.opts = {
      _replacer:
        TokenJSON._replace._multiple(
          TokenJSON._replace._resources(token => { this.refs.push(token); return this.refs.length - 1 }),
          TokenJSON._replace._arbitraryObjects()),

      _reviver: TokenJSON._revive._multiple(
        TokenJSON._revive._resources(ref => this.refs[ref]),
        TokenJSON._revive._arbitraryObjects())
    }

    JigControl._disableSafeguards(() => {
      JigControl._disableProxy(() => {
        this.serialized = TokenJSON._serialize(x, this.opts)
      })
    })

    this.refs.forEach(ref => {
      if (_resourceType(ref) === 'code') {
        code.deploy(ref)
      }
    })
  }

  restore () {
    this.restored = this.restored || TokenJSON._deserialize(this.serialized, this.opts)

    return this.restored
  }

  equals (other) {
    const deepEqual = (a, b) => {
      if (typeof a !== typeof b) return false
      if (typeof a === 'object' && typeof b === 'object') {
        if (a === null && b === null) return true
        if (a === null || b === null) return false
        if (Object.keys(a).length !== Object.keys(b).length) return false
        return Object.keys(a).every(key => deepEqual(a[key], b[key]))
      }
      return a === b
    }

    if (!deepEqual(this.serialized, other.serialized)) return false
    if (this.refs.length !== other.refs.length) return false
    return this.refs.every((ref, n) => this.refs[n] === other.refs[n])
  }
}

module.exports = Checkpoint
