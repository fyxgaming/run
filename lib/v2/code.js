// const TokenSet = require('./token-set')
const Xray = require('./xray')

/**
 * A group of code to be deployed together
 */
class Package {
  constructor (sandbox) {
    this.sandbox = sandbox
    this.props = {}

    // const refs = new TokenSet()

    // const intrinsics = {}

    const xray = new Xray.Builder()
      // .checkSerializable()
      .allowTokens()
      .allowDeployables()
      // .allowIntrinsics(intrinsics)
      // .preferIntrinsics(intrinsics)
      // .clone()
      .serialize()
      .build()

    const props = Object.assign({}, sandbox)
    const result = xray.scan(props)
    // refs.add(result.tokens)
    this.props = result.serialized

    const xray2 = new Xray.Builder().deserialize().build()
    this.props2 = xray2.scan(this.props).deserialized

    // Deploy refs
  }
}

module.exports = Package
