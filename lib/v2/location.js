/**
 * location.js
 *
 * Parses and builds location strings that point to tokens on the blockchain
 */

/**
 * Helper class to create and parse location strings
 *
 * Every token in Run is stored at a location on the blockchain. Both the "origin"
 * property and "location" property on jigs and code are location strings. Jiglets
 * have a location but not an origin. To the user, these come in the form:
 *
 *  <txid>_o<vout>
 *
 * Where txid is a transaction id in hex, and vout is the output index as an integer.
 * Locations are usually outputs. But they need not always be outputs. There are other
 * kinds of locations. If the location ends with _i<vin>, then the location refers
 * to an input of a transaction. If the location ends in _r<vref>, then the location
 * refers to another "ref" location within the OP_RETURN JSON. Sometimes within the
 * OP_RETURN JSON you will see locations without txids, and these refer to relative
 * locations. They look like _o1, _i0, etc.
 *
 * While a transaction is being built, a jig may have a temporary location. This is
 * identified by a random temporary txid that starts with '?'. This will get turned
 * into a real location when the token's transaction is known and published. The
 * convention is for temporary txids to have 48 ?'s followed by 16 random hex chars
 * to uniquely identify the temporary txid, but this is not strictly required.
 *
 * Finally, it is important that tokens be deterministically loadable. Most tokens
 * are jigs and code and are parsed by the Run protocol. However with Jiglets, a
 * token may be parsed by another protocol. Two locations may even be parsed differently
 * by two different protocols, so it's important when identifying the location of a
 * jiglet to attach its protocol to its location. So, we add a protocol prefix:
 *
 *      <protocol_location>://<token_location>
 *
 * This class helps store and read all of this, but within Run's code, it is important
 * to consider all of the above cases when looking at a location.
 */
class Location {
  /**
     * Parses a location string
     * @param {string} location Location to parse
     * @return {object} out
     * @return {string=} out.txid Transaction ID
     * @return {number=} out.vout Output index
     * @return {number=} out.vin Input index
     * @return {number=} out.vref Reference index
     * @return {string=} out.tempTxid Temporary transaction ID
     * @return {object=} out.proto Protocol location object
     */
  static parse (location) {
    const error = s => { throw new Error(`${s}: ${location}`) }

    if (typeof location !== 'string') error('Location must be a string')
    if (!location.length) error('Location must not be empty')

    // Check if we are dealing with a protocol
    const protoParts = location.split('://')
    if (protoParts.length > 2) error('Location must only have one protocol')
    if (protoParts.length === 2) {
      return Object.assign({}, Location.parse(protoParts[1]),
        { proto: Location.parse(protoParts[0]) })
    }

    // Split the txid and index parts
    const parts = location.split('_')
    if (parts.length > 2) error('Location has an unexpected _ separator')
    if (parts.length < 2) error('Location requires a _ separator')

    const output = {}

    // Validate the txid
    if (parts[0].length !== 0 && parts[0].length !== 64) error('Location has an invalid txid length')
    if (parts[0][0] === '?') {
      output.tempTxid = parts[0]
    } else if (parts[0].length) {
      if (!/^[a-fA-F0-9]*$/.test(parts[0])) error('Location has invalid hex in its txid')
      output.txid = parts[0]
    }

    // Validate the index number
    const indexString = parts[1].slice(1)
    const index = parseInt(indexString, 10)
    if (isNaN(index) || !/^[0-9]*$/.test(indexString)) error('Location has an invalid index number')

    // Validate the index category
    switch (parts[1][0]) {
      case 'o': { output.vout = index; break }
      case 'i': { output.vin = index; break }
      case 'r': { output.vref = index; break }
      default: error('Location has an invalid index category')
    }

    return output
  }

  /**
     * Creates a location string from options
     * @param {object} options
     * @param {string=} options.txid Transaction ID
     * @param {number=} options.vout Output index
     * @param {number=} options.outputIndex Output index
     * @param {number=} options.vin Input index
     * @param {number=} options.vref Reference index
     * @param {string=} options.tempTxid Temporary transaction ID
     * @param {object=} options.proto Protocol location object
     * @return {string} The built location string
     */
  static build (options) {
    const error = s => { throw new Error(`${s}: ${JSON.stringify(options)}`) }

    if (typeof options !== 'object' || !options) error('Location object is invalid')
    if (options.proto && options.proto.proto) error('Locations must only have one protocol')

    // If we have a protocol, build that first.
    const prefix = options.proto ? `${Location.build(options.proto)}://` : ''

    // Get the txid
    const txid = `${options.txid || options.tempTxId}`

    // Get the index
    let category = null; let index = null
    if (typeof options.vout === 'number') {
      category = 'o'
      index = options.vout
    } else if (typeof options.vin === 'number') {
      category = 'i'
      index = options.vin
    } else if (typeof options.vref === 'number') {
      category = 'r'
      index = options.vref
    } else error('Location index unspecified')

    const badIndex = isNaN(index) || !isFinite(index) || !Number.isInteger(index)
    if (badIndex) error('Location index must be an integer')

    return `${prefix}${txid}_${category}${index}`
  }
}

module.exports = Location
