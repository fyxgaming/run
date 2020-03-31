/**
 * checkpoint.js
 *
 * A save point for a jig to easily revert its state
 */

class Checkpoint {

}

/*
  checkOwner (x) {
    if (typeof x.$owner !== 'undefined' && typeof this.restrictedOwner !== 'undefined' &&
        x.$owner !== this.restrictedOwner) {
      const suggestion = `Hint: Consider saving a clone of ${x} value instead.`
      throw new Error(`Property ${display(x)} is owned by a different token\n\n${suggestion}`)
    }
  }
  */

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
    JigControl.disableProxy(() => {
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
