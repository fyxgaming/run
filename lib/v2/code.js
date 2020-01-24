// const TokenSet = require('./token-set')
const Xray = require('./xray')

// TokenMap/TokenSet are unique like Jig. Require access to Protocol.

/**
 * A group of code to be deployed together
 */
class Package {
  constructor (sandbox) {
    this.sandbox = sandbox
    this.props = {}

    // const refs = new TokenSet()

    // const intrinsics = {}

    class TokenSerializer {
      getTokenFromLocation(x) { return {} }
      getLocationForToken(x) { return 'abc' }
      getSandboxForCode(x) { return x }
    }

    const xray = new Xray.Builder()
      // .checkSerializable()
      .allowTokens()
      .allowDeployables()
      // .allowIntrinsics(intrinsics)
      // .preferIntrinsics(intrinsics)
      // .clone()
      .useTokenSerializer(new TokenSerializer())
      .serialize()
      .clone()
      .build()

    const props = Object.assign({}, sandbox)
    const result = xray.scan(props)
    // refs.add(result.tokens)
    this.props = result.serialized
    this.deployables = result.deployables
    this.clone = result.clone

    // const xray2 = new Xray.Builder().deserialize().build()
    // this.props2 = xray2.scan(this.props).deserialized

    // Deploy refs
  }
}

module.exports = Package
