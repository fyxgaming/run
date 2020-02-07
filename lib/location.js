/**
 * location.js
 *
 * Parses and builds location strings that point to tokens on the blockchain
 */

/**
 * Helper class to create and parse location strings
 *
 * Every token in Run is stored at a location on the blockchain. Both the "origin"
 * property and "location" property on jigs and code are location strings. Berries
 * have a location but not an origin, and these are prefixed with a protocol.
 *
 * This class helps store and read all of this, but within Run's code, it is important
 * to consider all of the above cases when looking at a location.
 *
 * ------------------
 * JIG/CODE LOCATIONS
 * ------------------
 *
 * To the user, most Jig locations come in the form:
 *
 *  "<txid>_o<vout>"
 *
 * The txid is a transaction id in hex, and vout is the output index as an integer.
 * Locations are usually outputs. But they need not always be outputs. There are other
 * kinds of locations. If the location ends with _i<vin>, then the location refers
 * to an input of a transaction. If the location ends in _r<vref>, then the location
 * refers to another asset reference within the OP_RETURN JSON. Sometimes within an
 * OP_RETURN JSON you will see locations without txids, and these refer to locations
 * in the CURRENT transaction. They look like _o1, _i0, etc.
 *
 * -------------------
 * TEMPORARY LOCATIONS
 * -------------------
 *
 * While a transaction is being built, a jig may have a temporary location:
 *
 *  "????????????????????????????????????????????????ca2f5ee8de79daf0_o1"
 *
 * This is identified by a random temporary txid that starts with '?'. It will get
 * turned into a real location when the token's transaction is known and published.
 * The convention is for temporary txids to have 48 ?'s followed by 16 random hex
 * chars to uniquely identify the temporary txid, but this is not strictly required.
 *
 * ---------------
 * BERRY LOCATIONS
 * ---------------
 *
 * Berry locations are a combination of a protocol + inner location, and usually
 * look like:
 *
 *  "<protocol_txid>_o<protocol_vout>://<inner_location>"
 *
 * The protocol uniquely identifies how the inner location is to be loaded.
 * The inner location does not have to be a valid location in the normal sense.
 * It will be parsed by the protocol, and may be a simple txid or friendly string.
 *
 * ---------------
 * ERROR LOCATIONS
 * ---------------
 *
 * Finally, a location may be invalid, in which case it starts with ! followed by
 * an optional error string
 *
 *  "!This location is not valid"
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
     * @return {string=} out.error Error string if this location is invalid
     * @return {string=} out.innerLocation Inner location string if this location was a protocol
     * @return {string=} out.location Location string passed in with protocol removed
     */
  static parse (location) {
    const error = s => { throw new Error(`${s}: ${location}`) }

    if (typeof location !== 'string') error('Location must be a string')
    if (!location.length) error('Location must not be empty')

    // Check if we are dealing with an error
    if (location[0] === '!') {
      return { error: location.slice(1) }
    }

    // Check if we are dealing with a protocol
    const protocolParts = location.split('://')
    if (protocolParts.length > 2) error('Location must only have one protocol')
    if (protocolParts.length === 2) {
      return Object.assign({}, Location.parse(protocolParts[0]), { innerLocation: protocolParts[1] })
    }

    // Split the txid and index parts
    const parts = location.split('_')
    if (parts.length > 2) error('Location has an unexpected _ separator')
    if (parts.length < 2) error('Location requires a _ separator')

    const output = { location }

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
     * @param {string=} out.error Error string if this location is invalid
     * @param {string=} options.innerLocation Protocol inner location
     * @return {string} The built location string
     */
  static build (options) {
    const error = s => { throw new Error(`${s}: ${JSON.stringify(options)}`) }

    if (typeof options !== 'object' || !options) error('Location object is invalid')
    if (typeof options.innerLocation !== 'undefined' && typeof options.innerLocation !== 'string') error('Inner location must be a string')
    if (typeof options.error !== 'undefined' && typeof options.error !== 'string') error('Error must be a string')

    // If this is an error, return directly
    if (typeof options.error !== 'undefined') return `!${options.error}`

    // Get the txid
    const txid = `${options.txid || options.tempTxid || ''}`

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

    const badIndex = isNaN(index) || !isFinite(index) || !Number.isInteger(index) || index < 0
    if (badIndex) error('Location index must be a non-negative integer')

    // Create the location
    const location = `${txid}_${category}${index}`

    // Append the sub-location if this is a protocol
    return options.innerLocation ? `${location}://${options.innerLocation}` : location
  }
}

module.exports = Location
