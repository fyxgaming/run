

// ------------------------------------------------------------------------------------------------
// P2PKH Script
// ------------------------------------------------------------------------------------------------

class AddressLock {
  constructor (address) {
    if (typeof address !== 'string') throw new Error(`Address is not a string: ${address}`)
    this.address = address
  }

  get script () {
    // Based on https://gist.github.com/diafygi/90a3e80ca1c2793220e5/
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    var d = [] // the array for storing the stream of decoded bytes
    var b = [] // the result byte array that will be returned
    var i // the iterator variable for the base58 string
    var j // the iterator variable for the byte array (d)
    var c // the carry amount variable that is used to overflow from the current byte to the next byte
    var n // a temporary placeholder variable for the current byte
    const s = this.address
    for (i in s) { // loop through each base58 character in the input string
      j = 0 // reset the byte iterator
      c = A.indexOf(s[i]) // set the initial carry amount equal to the current base58 digit
      if (c < 0) throw new Error(`Invalid character in address: ${s}`) // see if each char is base 58
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
}

AddressLock.originTestnet = 'd19e4a8a2659f810661e397bb1d3f7f59ce786a4dcce377027429749e23344b5_o1'
AddressLock.locationTestnet = 'd19e4a8a2659f810661e397bb1d3f7f59ce786a4dcce377027429749e23344b5_o1'
AddressLock.ownerTestnet = 'mmi1pQpxBapUeT2UkimMVAowSFEPADhNsN'
AddressLock.originMainnet = '5f0bff528a5be3a2681d49b5a6dff3ddee558faf07eca26447ff093cf6f4de8d_o1'
AddressLock.locationMainnet = '5f0bff528a5be3a2681d49b5a6dff3ddee558faf07eca26447ff093cf6f4de8d_o1'
AddressLock.ownerMainnet = '1DFgNkdFDon7iUT9DPpY7r6AFYrAN5N9i3'