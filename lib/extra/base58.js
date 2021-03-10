/**
 * base58.js
 *
 * Bitcoin Base58Check decoder
 */

const Editor = require('../kernel/editor')

// ------------------------------------------------------------------------------------------------
// Base58
// ------------------------------------------------------------------------------------------------

class Base58 {
  static decode (s) {
    // Based on https://gist.github.com/diafygi/90a3e80ca1c2793220e5/
    if (typeof s !== 'string') throw new Error(`Cannot decode: ${s}`)
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    const d = [] // the array for storing the stream of decoded bytes
    const b = [] // the result byte array that will be returned
    let j // the iterator variable for the byte array (d)
    let c // the carry amount variable that is used to overflow from the current byte to the next byte
    let n // a temporary placeholder variable for the current byte
    for (let i = 0; i < s.length; i++) {
      j = 0 // reset the byte iterator
      c = A.indexOf(s[i]) // set the initial carry amount equal to the current base58 digit
      if (c < 0) throw new Error(`Invalid base58 character: ${s}\n\nDetails: i=${i}, c=${s[i]}`)
      if (!(c || b.length ^ i)) b.push(0) // prepend the result array with a zero if the base58 digit is zero and non-zero characters haven't been seen yet (to ensure correct decode length)
      while (j in d || c) { // start looping through the bytes until there are no more bytes and no carry amount
        n = d[j] // set the placeholder for the current byte
        n = n ? n * 58 + c : c // shift the current byte 58 units and add the carry amount (or just add the carry amount if this is a new byte)
        c = n >> 8 // find the new carry amount (1-byte shift of current byte value)
        d[j] = n % 256 // reset the current byte to the remainder (the carry amount will pass on the overflow)
        j++ // iterate to the next byte
      }
    }
    while (j--) { b.push(d[j]) } // since the byte array is backwards, loop through it in reverse order, and append
    if (b.length < 5) throw new Error(`Base58 string too short: ${s}`)
    // We assume the checksum and version are correct
    return b.slice(1, b.length - 4)
  }
}

Base58.toString() // Preserves the class name during compilation

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

Base58.presets = {}
Base58.presets.main = {}
Base58.presets.test = {}

Base58.presets.main.location = '81bcef29b0e4ed745f3422c0b764a33c76d0368af2d2e7dd139db8e00ee3d8a6_o1'
Base58.presets.main.origin = '81bcef29b0e4ed745f3422c0b764a33c76d0368af2d2e7dd139db8e00ee3d8a6_o1'
Base58.presets.main.nonce = 1
Base58.presets.main.owner = '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx'
Base58.presets.main.satoshis = 0

Base58.presets.test.location = '424abf066be56b9dd5203ed81cf1f536375351d29726d664507fdc30eb589988_o1'
Base58.presets.test.origin = '424abf066be56b9dd5203ed81cf1f536375351d29726d664507fdc30eb589988_o1'
Base58.presets.test.nonce = 1
Base58.presets.test.owner = 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE'
Base58.presets.test.satoshis = 0

// ------------------------------------------------------------------------------------------------

module.exports = Editor._preinstall(Base58)
