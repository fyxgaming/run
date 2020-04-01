/**
 * checkpoint.js
 *
 * A save point for a jig to easily revert its state
 */

const TokenJSON = require('./json')
const { JigControl } = require('../kernel/jig')

class Checkpoint {
  constructor (x, code, owner) {
    this.x = x
    this.refs = []

    this.opts = {
      _sandboxIntrinsics: code._sandboxIntrinsics,
      _replacer: TokenJSON._replace._multiple(
        TokenJSON._replace._tokens(token => { this.refs.push(token); return this.refs.length - 1 }),
        TokenJSON._replace._arbitraryObjects()
      ),
      _reviver: TokenJSON._revive._multiple(
        TokenJSON._revive._tokens(ref => this.refs[ref]),
        TokenJSON._revive._arbitraryObjects()
      )
    }

    JigControl.disableSafeguards(() => {
      const xobj = Object.assign({}, x)
      this.serialized = TokenJSON._serialize(xobj, this.opts)
    })
  }
}

/*
class Checkpoint {
  constructor (x, code, owner) {
    this.x = x
    this.refs = []

    this.xray = new Xray()
      .allowDeployables()
      .allowTokens()
      .restrictOwner(owner)
      .useIntrinsics(code.intrinsics)
      .useTokenSaver(token => { this.refs.push(token); return (this.refs.length - 1).toString() })
      .useTokenLoader(ref => this.refs[parseInt(ref, 10)])

    // Note: We should scan and deploy in one pass
    const obj = x instanceof Jig ? Object.assign({}, x) : x
    this.xray.scan(obj)
    this.xray.deployables.forEach(deployable => code.deploy(deployable))
    this.serialized = this.xray.serialize(obj)
  }

  restore () {
    if (!('restored' in this)) {
      this.restored = this.xray.deserialize(this.serialized)
    }
    return this.restored
  }

  restoreInPlace () {
    JigControl.disableSafeguards(() => {
      Object.keys(this.x).forEach(key => delete this.x[key])
      Object.assign(this.x, this.restore())
    })
  }

  equals (other) {
    const deepEqual = (a, b) => {
      if (typeof a !== typeof b) return false
      if (typeof a === 'object' && typeof b === 'object') {
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
*/

module.exports = Checkpoint
