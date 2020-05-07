/**
 * standard-lock.js
 *
 * The most common lock to create a P2PKH output for an resource's address
 */

// ------------------------------------------------------------------------------------------------
// StandardLock
// ------------------------------------------------------------------------------------------------

/**
 * The default lock in Run used to generate a P2PKH output.
 *
 * When you set an address string or a public key string as the owner of a resource, Run generates
 * a standard lock for it. By standardizing this output, we reduce blockchain API queries.
 */
class StandardLock {
  constructor (address) {
    this.address = address
  }

  script () {
    if (typeof this.address !== 'string') {
      throw new Error(`Address is not a string: ${this.address}`)
    }

    // Based on https://gist.github.com/diafygi/90a3e80ca1c2793220e5/
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    const d = [] // the array for storing the stream of decoded bytes
    const b = [] // the result byte array that will be returned
    let j // the iterator variable for the byte array (d)
    let c // the carry amount variable that is used to overflow from the current byte to the next byte
    let n // a temporary placeholder variable for the current byte
    const s = this.address
    for (let i = 0; i < s.length; i++) {
      j = 0 // reset the byte iterator
      c = A.indexOf(s[i]) // set the initial carry amount equal to the current base58 digit
      if (c < 0) throw new Error(`Invalid character in address: ${s}\n\nDetails: i=${i}, c=${s[i]}`)
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
    if (b.length < 6) throw new Error(`Address too short: ${s}`)
    // TODO: Verify the checksum. To do this, we need an onchain sha256.
    if (b[0] !== 0 && b[0] !== 111) throw new Error(`Address may only be a P2PKH type: ${s}`)
    const hash160 = b.slice(1, b.length - 4)
    const script = [118, 169, 20, ...hash160, 136, 172] // OP_DUP OP_HASH160 <PKH> OP_EQUALVERIFY OP_CHECKSIG
    return new Uint8Array(script)
  }

  domain () {
    return 108 // 1 + 73 (sig) + 1 + 33 (compressed pubkey)
  }
}

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

StandardLock.locationMainnet = '87cd529983d7fa5e0fc3c70a0d6f488f9f251aaffd3c86aea5f88ac364895795_o5'
StandardLock.originMainnet = '87cd529983d7fa5e0fc3c70a0d6f488f9f251aaffd3c86aea5f88ac364895795_o5'
StandardLock.ownerMainnet = '13HMuzt7FMHiicG2Pi4PLkJopkzydQGcug'

StandardLock.locationTestnet = '10a88faafc164b73957e0bdf983d9168e6d7a83fea4a5c68669e331cda07188b_o5'
StandardLock.originTestnet = '10a88faafc164b73957e0bdf983d9168e6d7a83fea4a5c68669e331cda07188b_o5'
StandardLock.ownerTestnet = 'mpPoB3cgrvUz9rxp9zqDGHUYNBVMWs2Xy7'

// ------------------------------------------------------------------------------------------------

// A "trick" keeps the class name intact in minified builds
StandardLock.toString()

module.exports = StandardLock
