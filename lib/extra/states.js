
const mainnet = {
  'jig://05f67252e696160a7c0099ae8d1ec23c39592378773b3a5a55f16bd1286e7dcb_o2': {
    kind: 'code',
    props: {
      deps: {
        Hex: {
          $jig: '727e7b423b7ee40c0b5be87fba7fa5673ea2d20a74259040a7295d9c32a90011_o1'
        },
        Tx: {
          $jig: '_o1'
        }
      },
      location: '_o2',
      nonce: 2,
      origin: '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o1',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0
    },
    src: "function txo (rawtx) {\n  const ret = { }\n\n  function chunks (script) {\n    const b = Hex.stringToBytes(script)\n    let i = 0\n\n    function u8 () { return b[i++] }\n    function u16 () { return u8() + u8() * 256 }\n    function u32 () { return u16() + u16() * 256 * 256 }\n    function buf (n) { const h = Hex.bytesToString(b.slice(i, i + n)); i += n; return h }\n\n    const OP_PUSHDATA1 = 0x4c\n    const OP_PUSHDATA2 = 0x4d\n    const OP_PUSHDATA4 = 0x4e\n\n    const chunks = []\n    while (i < b.length) {\n      const opcodenum = u8()\n      if (opcodenum > 0 && opcodenum < OP_PUSHDATA1) {\n        chunks.push({ buf: buf(opcodenum), len: opcodenum, opcodenum })\n      } else if (opcodenum === OP_PUSHDATA1) {\n        const len = u8()\n        chunks.push({ buf: buf(len), len, opcodenum })\n      } else if (opcodenum === OP_PUSHDATA2) {\n        const len = u16()\n        chunks.push({ buf: buf(len), len, opcodenum })\n      } else if (opcodenum === OP_PUSHDATA4) {\n        const len = u32()\n        chunks.push({ buf: buf(len), len, opcodenum })\n      } else {\n        chunks.push({ opcodenum })\n      }\n    }\n    return chunks\n  }\n\n  // https://stackoverflow.com/questions/23190056/hex-to-base64-converter-for-javascript\n  function bytesToBase64 (arr) {\n    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/' // base64 alphabet\n    const bin = n => n.toString(2).padStart(8, 0) // convert num to 8-bit binary string\n    const l = arr.length\n    let result = ''\n    for (let i = 0; i <= (l - 1) / 3; i++) {\n      const c1 = i * 3 + 1 >= l // case when \"=\" is on end\n      const c2 = i * 3 + 2 >= l // case when \"=\" is on end\n      const chunk = bin(arr[3 * i]) + bin(c1 ? 0 : arr[3 * i + 1]) + bin(c2 ? 0 : arr[3 * i + 2])\n      const r = chunk.match(/.{1,6}/g).map((x, j) => j === 3 && c2 ? '=' : (j === 2 && c1 ? '=' : abc[+('0b' + x)]))\n      result += r.join('')\n    }\n    return result\n  }\n\n  function xput (script, output) {\n    const ret = { }\n    chunks(script).forEach((c, n) => {\n      if (c.buf) {\n        ret['b' + n] = bytesToBase64(Hex.stringToBytes(c.buf))\n        const enc = c.buf.replace(/[0-9a-f]{2}/g, '%$&')\n        if (output) try { ret['s' + n] = decodeURIComponent(enc) } catch (e) { }\n        if (output) ret['h' + n] = c.buf\n      } else {\n        ret['b' + n] = { op: c.opcodenum }\n      }\n    })\n    return ret\n  }\n\n  function input (txin, i) {\n    const ret = xput(txin.script)\n    ret.e = { h: txin.prevTxId, i: txin.outputIndex }\n    ret.i = i\n    ret.seq = txin.sequenceNumber\n    return ret\n  }\n\n  function output (txout, i) {\n    const ret = xput(txout.script, true)\n    ret.e = { v: txout.satoshis, i }\n    ret.i = i\n    return ret\n  }\n\n  const tx = new Tx(rawtx)\n  ret.in = tx.inputs.map(input)\n  ret.out = tx.outputs.map(output)\n  ret.lock = tx.nLockTime\n  return ret\n}",
    version: '04'
  },
  'jig://727e7b423b7ee40c0b5be87fba7fa5673ea2d20a74259040a7295d9c32a90011_o1': {
    kind: 'code',
    props: {
      deps: {},
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0
    },
    // eslint-disable-next-line
    src: "class Hex {\n  static stringToBytes (s) {\n    if (typeof s !== 'string' || s.length % 2 !== 0) {\n      throw new Error(`Bad hex: ${s}`)\n    }\n\n    s = s.toLowerCase()\n\n    const HEX_CHARS = '0123456789abcdef'.split('')\n    const bytes = []\n\n    for (let i = 0; i < s.length; i += 2) {\n      const high = HEX_CHARS.indexOf(s[i])\n      const low = HEX_CHARS.indexOf(s[i + 1])\n\n      if (high === -1 || low === -1) {\n        throw new Error(`Bad hex: ${s}`)\n      }\n\n      bytes.push(high * 16 + low)\n    }\n\n    return bytes\n  }\n\n  static bytesToString (b) {\n    if (!Array.isArray(b)) throw new Error(`Bad bytes: ${b}`)\n\n    const validDigit = x => Number.isInteger(x) && x >= 0 && x < 256\n    b.forEach(x => { if (!validDigit(x)) throw new Error(`Bad digit: ${x}`) })\n\n    return b\n      .map(x => x.toString('16'))\n      .map(x => x.length === 1 ? '0' + x : x)\n      .join('')\n  }\n}",
    version: '04'
  },
  'jig://05f67252e696160a7c0099ae8d1ec23c39592378773b3a5a55f16bd1286e7dcb_o1': {
    kind: 'code',
    props: {
      deps: {
        Hex: {
          $jig: '727e7b423b7ee40c0b5be87fba7fa5673ea2d20a74259040a7295d9c32a90011_o1'
        }
      },
      location: '_o1',
      nonce: 2,
      origin: '312985bd960ae4c59856b3089b04017ede66506ea181333eec7c9bb88b11c490_o2',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0
    },
    src: 'class Tx {\n  constructor (rawtx) {\n    const b = Hex.stringToBytes(rawtx)\n    let i = 0\n\n    function u8 () { return b[i++] }\n    function u16 () { return u8() + u8() * 256 }\n    function u32 () { return u16() + u16() * 256 * 256 }\n    function u64 () { return u32() + u32() * 256 * 256 * 256 * 256 }\n    function varint () { const b0 = u8(); return b0 === 0xff ? u64() : b0 === 0xfe ? u32() : b0 === 0xfd ? u16() : b0 }\n    function txid () { const h = Hex.bytesToString(b.slice(i, i + 32).reverse()); i += 32; return h }\n    function script () { const n = varint(); const h = Hex.bytesToString(b.slice(i, i + n)); i += n; return h }\n\n    this.version = u32()\n\n    const nin = varint()\n    this.inputs = []\n    for (let vin = 0; vin < nin; vin++) {\n      this.inputs.push({\n        prevTxId: txid(),\n        outputIndex: u32(),\n        script: script(),\n        sequenceNumber: u32()\n      })\n    }\n\n    const nout = varint()\n    this.outputs = []\n    for (let vout = 0; vout < nout; vout++) {\n      this.outputs.push({\n        satoshis: u64(),\n        script: script()\n      })\n    }\n\n    this.nLockTime = u32()\n  }\n}',
    version: '04'
  },
  'jig://72a61eb990ffdb6b38e5f955e194fed5ff6b014f75ac6823539ce5613aea0be8_o1': {
    kind: 'code',
    props: {
      decimals: 0,
      deps: {
        Jig: {
          $jig: 'native://Jig'
        }
      },
      icon: {
        emoji: null
      },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0,
      sealed: false,
      supply: 0,
      symbol: null,
      version: '2.0'
    },
    src: "class Token extends Jig {\n  init (amount, owner) {\n    this._checkAmount(amount)\n\n    // The base Token class cannot be created on its own\n    const extended = this.constructor !== Token\n    if (!extended) throw new Error('Token must be extended')\n\n    // Make sure we are calling from ourself\n    const minting = caller === this.constructor\n    const sending = caller && caller.constructor === this.constructor\n    if (!minting && !sending) throw new Error('Must create token using mint()')\n\n    this.sender = sending ? caller.owner : null\n    this.amount = amount\n    if (owner) this.owner = owner\n  }\n\n  static mint (amount, owner) {\n    this.supply += amount\n    return new this(amount, owner)\n  }\n\n  send (to, amount = this.amount) {\n    this._checkAmount(amount)\n\n    if (this.amount === amount) {\n      this.destroy()\n    } else if (this.amount > amount) {\n      this.amount -= amount\n    } else {\n      throw new Error('Not enough funds')\n    }\n\n    return new this.constructor(amount, to)\n  }\n\n  combine (...tokens) {\n    // If no tokens to combine, nothing to do\n    if (!tokens.length) return this\n\n    // Each token to combine must all be of this type\n    const all = tokens.concat(this)\n    if (all.some(token => token.constructor !== this.constructor)) {\n      throw new Error('Cannot combine different token classes')\n    }\n\n    // Check for duplicate tokens in the array\n    const countOf = token => all.reduce((count, next) => next === token ? count + 1 : count, 0)\n    if (all.some(token => countOf(token) > 1)) throw new Error('Cannot combine duplicate tokens')\n\n    // Destroy each token, absorbing it into this one\n    tokens.forEach(token => {\n      this.amount += token.amount\n      token.destroy()\n    })\n\n    // There is no sender for combined tokens\n    this.sender = null\n\n    // Make sure our new amount is within safe range\n    this._checkAmount(this.amount)\n\n    return this\n  }\n\n  destroy () {\n    super.destroy()\n\n    this.amount = 0\n    this.sender = null\n  }\n\n  _checkAmount (amount) {\n    if (typeof amount !== 'number') throw new Error('amount is not a number')\n    if (!Number.isInteger(amount)) throw new Error('amount must be an integer')\n    if (amount <= 0) throw new Error('amount must be positive')\n    if (amount > Number.MAX_SAFE_INTEGER) throw new Error('amount too large')\n  }\n}",
    version: '04'
  },
  'jig://b17a9af70ab0f46809f908b2e900e395ba40996000bf4f00e3b27a1e93280cf1_o1': {
    kind: 'code',
    props: {
      decimals: 0,
      deps: {
        Jig: {
          $jig: 'native://Jig'
        }
      },
      icon: {
        emoji: null
      },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0,
      sealed: false,
      supply: 0,
      symbol: null
    },
    src: "class Token extends Jig {\n  init (...tokens) {\n    // The base Token class cannot be created on its own\n    if (Object.getPrototypeOf(this.constructor) === Jig) {\n      throw new Error('Token must be extended')\n    }\n\n    // Case: Mint\n    if (caller === this.constructor) {\n      this._checkAmount(caller.mintAmount)\n      this.amount = caller.mintAmount\n      this.sender = null\n      return\n    }\n\n    // Case: Send\n    if (caller && caller.constructor === this.constructor) {\n      this._checkAmount(caller.sendAmount)\n      this.amount = caller.sendAmount\n      this.owner = caller.sendOwner\n      this.sender = caller.owner\n      return\n    }\n\n    // Case: Combine\n    if (!Array.isArray(tokens) || tokens.length < 2) {\n      throw new Error('Invalid tokens to combine')\n    }\n\n    // Each token to combine must all be of this type\n    if (tokens.some(token => token.constructor !== this.constructor)) {\n      throw new Error('Cannot combine different token classes')\n    }\n\n    // Check for duplicate tokens in the array\n    const countOf = token => tokens.reduce((count, next) => next === token ? count + 1 : count, 0)\n    if (tokens.some(token => countOf(token) > 1)) throw new Error('Cannot combine duplicate tokens')\n\n    // Destroy each token, absorbing it into this one\n    this.amount = 0\n    tokens.forEach(token => {\n      this.amount += token.amount\n      token.destroy()\n    })\n\n    // There is no sender for combined tokens\n    this.sender = null\n\n    // Make sure our new amount is within safe range\n    this._checkAmount(this.amount)\n  }\n\n  static mint (amount) {\n    this.mintAmount = amount\n    const token = new this()\n    delete this.mintAmount\n    this.supply += amount\n    return token\n  }\n\n  destroy () {\n    super.destroy()\n\n    this.amount = 0\n    this.sender = null\n  }\n\n  send (to, amount = this.amount) {\n    this._checkAmount(amount)\n\n    if (amount > this.amount) {\n      throw new Error('Not enough funds')\n    }\n\n    this.sendAmount = amount\n    this.sendOwner = to\n    const sent = new this.constructor()\n    delete this.sendAmount\n    delete this.sendOwner\n\n    if (this.amount === amount) {\n      this.destroy()\n    } else {\n      this.amount -= amount\n      this.sender = null\n    }\n\n    return sent\n  }\n\n  _checkAmount (amount) {\n    if (typeof amount !== 'number') throw new Error('amount is not a number')\n    if (!Number.isInteger(amount)) throw new Error('amount must be an integer')\n    if (amount <= 0) throw new Error('amount must be positive')\n    if (amount > Number.MAX_SAFE_INTEGER) throw new Error('amount too large')\n  }\n}",
    version: '04'
  },
  'jig://3b7ef411185bbe3d01caeadbe6f115b0103a546c4ef0ac7474aa6fbb71aff208_o1': {
    kind: 'code',
    props: {
      deps: {},
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0
    },
    // eslint-disable-next-line
    src: 'function sha256 (message) {\n  if (!Array.isArray(message)) throw new Error(`Invalid bytes: ${message}`)\n\n  // Based off https://github.com/emn178/js-sha256/blob/master/src/sha256.js\n\n  const EXTRA = [-2147483648, 8388608, 32768, 128]\n  const SHIFT = [24, 16, 8, 0]\n  const K = [\n    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,\n    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,\n    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,\n    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,\n    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,\n    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,\n    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,\n    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2\n  ]\n\n  const blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]\n\n  let h0 = 0x6a09e667\n  let h1 = 0xbb67ae85\n  let h2 = 0x3c6ef372\n  let h3 = 0xa54ff53a\n  let h4 = 0x510e527f\n  let h5 = 0x9b05688c\n  let h6 = 0x1f83d9ab\n  let h7 = 0x5be0cd19\n\n  let block = 0\n  let start = 0\n  let bytes = 0\n  let hBytes = 0\n  let first = true\n  let hashed = false\n  let lastByteIndex = 0\n\n  update()\n  finalize()\n  return digest()\n\n  function update () {\n    let i\n    let index = 0\n    const length = message.length\n\n    while (index < length) {\n      if (hashed) {\n        hashed = false\n        blocks[0] = block\n        blocks[16] = blocks[1] = blocks[2] = blocks[3] =\n                blocks[4] = blocks[5] = blocks[6] = blocks[7] =\n                blocks[8] = blocks[9] = blocks[10] = blocks[11] =\n                blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0\n      }\n\n      for (i = start; index < length && i < 64; ++index) {\n        blocks[i >> 2] |= message[index] << SHIFT[i++ & 3]\n      }\n\n      lastByteIndex = i\n      bytes += i - start\n      if (i >= 64) {\n        block = blocks[16]\n        start = i - 64\n        hash()\n        hashed = true\n      } else {\n        start = i\n      }\n    }\n\n    if (bytes > 4294967295) {\n      hBytes += bytes / 4294967296 << 0\n      bytes = bytes % 4294967296\n    }\n  }\n\n  function finalize () {\n    blocks[16] = block\n    blocks[lastByteIndex >> 2] |= EXTRA[lastByteIndex & 3]\n    block = blocks[16]\n    if (lastByteIndex >= 56) {\n      if (!hashed) {\n        hash()\n      }\n      blocks[0] = block\n      blocks[16] = blocks[1] = blocks[2] = blocks[3] =\n            blocks[4] = blocks[5] = blocks[6] = blocks[7] =\n            blocks[8] = blocks[9] = blocks[10] = blocks[11] =\n            blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0\n    }\n    blocks[14] = hBytes << 3 | bytes >>> 29\n    blocks[15] = bytes << 3\n    hash()\n  }\n\n  function hash () {\n    let a = h0\n    let b = h1\n    let c = h2\n    let d = h3\n    let e = h4\n    let f = h5\n    let g = h6\n    let h = h7\n    let j\n    let s0\n    let s1\n    let maj\n    let t1\n    let t2\n    let ch\n    let ab\n    let da\n    let cd\n    let bc\n\n    for (j = 16; j < 64; ++j) {\n      t1 = blocks[j - 15]\n      s0 = ((t1 >>> 7) | (t1 << 25)) ^ ((t1 >>> 18) | (t1 << 14)) ^ (t1 >>> 3)\n      t1 = blocks[j - 2]\n      s1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10)\n      blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0\n    }\n\n    bc = b & c\n    for (j = 0; j < 64; j += 4) {\n      if (first) {\n        ab = 704751109\n        t1 = blocks[0] - 210244248\n        h = t1 - 1521486534 << 0\n        d = t1 + 143694565 << 0\n        first = false\n      } else {\n        s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))\n        s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))\n        ab = a & b\n        maj = ab ^ (a & c) ^ bc\n        ch = (e & f) ^ (~e & g)\n        t1 = h + s1 + ch + K[j] + blocks[j]\n        t2 = s0 + maj\n        h = d + t1 << 0\n        d = t1 + t2 << 0\n      }\n      s0 = ((d >>> 2) | (d << 30)) ^ ((d >>> 13) | (d << 19)) ^ ((d >>> 22) | (d << 10))\n      s1 = ((h >>> 6) | (h << 26)) ^ ((h >>> 11) | (h << 21)) ^ ((h >>> 25) | (h << 7))\n      da = d & a\n      maj = da ^ (d & b) ^ ab\n      ch = (h & e) ^ (~h & f)\n      t1 = g + s1 + ch + K[j + 1] + blocks[j + 1]\n      t2 = s0 + maj\n      g = c + t1 << 0\n      c = t1 + t2 << 0\n      s0 = ((c >>> 2) | (c << 30)) ^ ((c >>> 13) | (c << 19)) ^ ((c >>> 22) | (c << 10))\n      s1 = ((g >>> 6) | (g << 26)) ^ ((g >>> 11) | (g << 21)) ^ ((g >>> 25) | (g << 7))\n      cd = c & d\n      maj = cd ^ (c & a) ^ da\n      ch = (g & h) ^ (~g & e)\n      t1 = f + s1 + ch + K[j + 2] + blocks[j + 2]\n      t2 = s0 + maj\n      f = b + t1 << 0\n      b = t1 + t2 << 0\n      s0 = ((b >>> 2) | (b << 30)) ^ ((b >>> 13) | (b << 19)) ^ ((b >>> 22) | (b << 10))\n      s1 = ((f >>> 6) | (f << 26)) ^ ((f >>> 11) | (f << 21)) ^ ((f >>> 25) | (f << 7))\n      bc = b & c\n      maj = bc ^ (b & d) ^ cd\n      ch = (f & g) ^ (~f & h)\n      t1 = e + s1 + ch + K[j + 3] + blocks[j + 3]\n      t2 = s0 + maj\n      e = a + t1 << 0\n      a = t1 + t2 << 0\n    }\n\n    h0 = h0 + a << 0\n    h1 = h1 + b << 0\n    h2 = h2 + c << 0\n    h3 = h3 + d << 0\n    h4 = h4 + e << 0\n    h5 = h5 + f << 0\n    h6 = h6 + g << 0\n    h7 = h7 + h << 0\n  }\n\n  function digest () {\n    return [\n      (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, h0 & 0xFF,\n      (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, h1 & 0xFF,\n      (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, h2 & 0xFF,\n      (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, h3 & 0xFF,\n      (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, h4 & 0xFF,\n      (h5 >> 24) & 0xFF, (h5 >> 16) & 0xFF, (h5 >> 8) & 0xFF, h5 & 0xFF,\n      (h6 >> 24) & 0xFF, (h6 >> 16) & 0xFF, (h6 >> 8) & 0xFF, h6 & 0xFF,\n      (h7 >> 24) & 0xFF, (h7 >> 16) & 0xFF, (h7 >> 8) & 0xFF, h7 & 0xFF\n    ]\n  }\n}',
    version: '04'
  },
  'jig://b2f52f369d6ac4210585e0d173020106bd338197f136e02bc4d1fb2af3ef789f_o1': {
    kind: 'code',
    props: {
      deps: {
        Jig: {
          $jig: 'native://Jig'
        }
      },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0,
      sealed: false,
      supply: 0,
      total: 0,
      version: '1.0'
    },
    src: "class NFT extends Jig {\n  init (owner, number, metadata) {\n    // The base NFT class cannot be created on its own\n    const extended = this.constructor !== NFT\n    if (!extended) throw new Error('NFT must be extended')\n\n    // Make sure we are calling from ourself\n    const minting = caller === this.constructor\n    if (!minting) throw new Error('Must create token using mint()')\n\n    if (owner) this.owner = owner\n    if (metadata) this.metadata = metadata\n\n    if (number) {\n      this.number = number\n      this.no = number // relay compat\n    }\n  }\n\n  static mint (owner, metadata) {\n    const max = this.maxSupply || this.max // relay compat\n    if (max && this.supply >= max) {\n      throw new Error('Maximum supply exceeded')\n    }\n\n    this.supply++\n    this.total++ // relay compat\n\n    return new this(owner, this.supply, metadata)\n  }\n\n  send (to) {\n    this.sender = this.owner\n    this.owner = to\n  }\n}",
    version: '04'
  },
  'jig://780ab8919cb89323707338070323c24ce42cdec2f57d749bd7aceef6635e7a4d_o1': {
    kind: 'code',
    props: {
      deps: {
        Hex: {
          $jig: '727e7b423b7ee40c0b5be87fba7fa5673ea2d20a74259040a7295d9c32a90011_o1'
        },
        asm: {
          $jig: '61e1265acb3d93f1bf24a593d70b2a6b1c650ec1df90ddece8d6954ae3cdd915_o1'
        }
      },
      location: '_o1',
      nonce: 2,
      origin: '90a3ece416f696731430efac9657d28071cc437ebfff5fb1eaf710fe4b3c8d4e_o1',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0,
      sealed: false
    },
    // eslint-disable-next-line
    src: "class Group {\n      constructor (pubkeys, required) {\n        this.pubkeys = pubkeys\n        this.required = typeof required === 'undefined' ? this.pubkeys.length : required\n      }\n\n      script () {\n        // Check pubkeys\n        if (!Array.isArray(this.pubkeys)) throw new Error('pubkeys not an array')\n        if (this.pubkeys.length < 1) throw new Error('pubkeys must have at least one entry')\n        if (this.pubkeys.length > 16) throw new Error('No more than 16 pubkeys allowed')\n        const set = new Set()\n        for (const pubkey of this.pubkeys) set.add(pubkey)\n        if (set.size !== this.pubkeys.length) throw new Error('pubkeys contains duplicates')\n        this.pubkeys.forEach(pubkey => Hex.stringToBytes(pubkey))\n\n        // Check m\n        const badRequired = typeof this.required !== 'number' || !Number.isInteger(this.required) || this.required < 1\n        if (badRequired) throw new Error('required must be a non-negative integer')\n        if (this.required > this.pubkeys.length) throw new Error('required must be <= the number of pubkeys')\n\n        // Create script\n        // ie. OP_2 <pk1> <pk2> <pk3> OP_3 OP_CHECKMULTISIG\n        return asm(`OP_${this.required} ${this.pubkeys.join(' ')} OP_${this.pubkeys.length} OP_CHECKMULTISIG`)\n      }\n\n      domain () {\n        return 1 + this.required * 74 // 1 (OP_0) + (1 + 73) * nsigs\n      }\n\n      add (pubkey) {\n        if (!this.pubkeys.includes(pubkey)) {\n          this.pubkeys.push(pubkey)\n        }\n      }\n    }",
    version: '04'
  },
  'jig://61e1265acb3d93f1bf24a593d70b2a6b1c650ec1df90ddece8d6954ae3cdd915_o1': {
    kind: 'code',
    props: {
      OP_CODES: {
        OP_0: 0,
        OP_0NOTEQUAL: 146,
        OP_1: 81,
        OP_10: 90,
        OP_11: 91,
        OP_12: 92,
        OP_13: 93,
        OP_14: 94,
        OP_15: 95,
        OP_16: 96,
        OP_1ADD: 139,
        OP_1NEGATE: 79,
        OP_1SUB: 140,
        OP_2: 82,
        OP_2DROP: 109,
        OP_2DUP: 110,
        OP_2OVER: 112,
        OP_2ROT: 113,
        OP_2SWAP: 114,
        OP_3: 83,
        OP_3DUP: 111,
        OP_4: 84,
        OP_5: 85,
        OP_6: 86,
        OP_7: 87,
        OP_8: 88,
        OP_9: 89,
        OP_ABS: 144,
        OP_ADD: 147,
        OP_AND: 132,
        OP_BIN2NUM: 129,
        OP_BOOLAND: 154,
        OP_BOOLOR: 155,
        OP_CAT: 126,
        OP_CHECKMULTISIG: 174,
        OP_CHECKMULTISIGVERIFY: 175,
        OP_CHECKSIG: 172,
        OP_CHECKSIGVERIFY: 173,
        OP_CODESEPARATOR: 171,
        OP_DEPTH: 116,
        OP_DIV: 150,
        OP_DROP: 117,
        OP_DUP: 118,
        OP_ELSE: 103,
        OP_ENDIF: 104,
        OP_EQUAL: 135,
        OP_EQUALVERIFY: 136,
        OP_FALSE: 0,
        OP_FROMALTSTACK: 108,
        OP_GREATERTHAN: 160,
        OP_GREATERTHANOREQUAL: 162,
        OP_HASH160: 169,
        OP_HASH256: 170,
        OP_IF: 99,
        OP_IFDUP: 115,
        OP_INVALIDOPCODE: 255,
        OP_INVERT: 131,
        OP_LESSTHAN: 159,
        OP_LESSTHANOREQUAL: 161,
        OP_LSHIFT: 152,
        OP_MAX: 164,
        OP_MIN: 163,
        OP_MOD: 151,
        OP_MUL: 149,
        OP_NEGATE: 143,
        OP_NIP: 119,
        OP_NOP: 97,
        OP_NOP1: 176,
        OP_NOP10: 185,
        OP_NOP2: 177,
        OP_NOP3: 178,
        OP_NOP4: 179,
        OP_NOP5: 180,
        OP_NOP6: 181,
        OP_NOP7: 182,
        OP_NOP8: 183,
        OP_NOP9: 184,
        OP_NOT: 145,
        OP_NOTIF: 100,
        OP_NUM2BIN: 128,
        OP_NUMEQUAL: 156,
        OP_NUMEQUALVERIFY: 157,
        OP_NUMNOTEQUAL: 158,
        OP_OR: 133,
        OP_OVER: 120,
        OP_PICK: 121,
        OP_PUBKEY: 254,
        OP_PUBKEYHASH: 253,
        OP_PUSHDATA1: 76,
        OP_PUSHDATA2: 77,
        OP_PUSHDATA4: 78,
        OP_RETURN: 106,
        OP_RIPEMD160: 166,
        OP_ROLL: 122,
        OP_ROT: 123,
        OP_RSHIFT: 153,
        OP_SHA1: 167,
        OP_SHA256: 168,
        OP_SIZE: 130,
        OP_SPLIT: 127,
        OP_SUB: 148,
        OP_SWAP: 124,
        OP_TOALTSTACK: 107,
        OP_TRUE: 81,
        OP_TUCK: 125,
        OP_VERIFY: 105,
        OP_WITHIN: 165,
        OP_XOR: 134
      },
      deps: {
        Hex: {
          $jig: '727e7b423b7ee40c0b5be87fba7fa5673ea2d20a74259040a7295d9c32a90011_o1'
        }
      },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0
    },
    src: "function asm (s) {\n  const parts = s.split(' ')\n  let out = []\n\n  for (const part of parts) {\n    // If one of our predefined op-codes\n    if (typeof asm.OP_CODES[part] !== 'undefined') {\n      out.push(asm.OP_CODES[part])\n      continue\n    }\n\n    // Hex data\n    const bytes = Hex.stringToBytes(part.length === 1 ? '0' + part : part)\n\n    // OP_0\n    if (bytes[0] === 0) {\n      out.push(bytes[0]) // OP_0\n      continue\n    }\n\n    // OP_1-OP_16\n    if (bytes.length === 1 && bytes[0] >= 1 && bytes[0] <= 16) {\n      out.push(bytes[0] + 0x50)\n      continue\n    }\n\n    // OP_PUSH+[1-75] <bytes>\n    if (bytes.length <= 75) {\n      out = out.concat(bytes.length).concat(bytes)\n      continue\n    }\n\n    // OP_PUSHDATA1 <len> <bytes>\n    if (bytes.length < 256) {\n      out = out.concat(asm.OP_CODES.OP_PUSHDATA1).concat([bytes.length]).concat(bytes)\n      continue\n    }\n\n    const floor = x => parseInt(x.toString(), 10)\n\n    // OP_PUSHDATA2 <len> <bytes>\n    if (bytes.length < 256 * 256) {\n      const len = [floor(bytes.length / 256), bytes.length % 256]\n      out = out.concat(asm.OP_CODES.OP_PUSHDATA2).concat(len).concat(bytes)\n      continue\n    }\n\n    // OP_PUSHDATA4 <len> <bytes>\n    const len = [\n      floor(bytes.length / 256 / 256 / 256),\n      floor(bytes.length / 256 / 256) % 256,\n      floor(bytes.length / 256) % 256,\n      bytes.length % 256\n    ]\n    out = out.concat(asm.OP_CODES.OP_PUSHDATA4).concat(len).concat(bytes)\n    continue\n  }\n\n  return Hex.bytesToString(out)\n}",
    version: '04'
  },
  'jig://71fba386341b932380ec5bfedc3a40bce43d4974decdc94c419a94a8ce5dfc23_o1': {
    kind: 'code',
    props: {
      deps: {
        Jig: {
          $jig: 'native://Jig'
        }
      },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0
    },
    // eslint-disable-next-line
    src: "function expect (subject) {\n  let negated = false\n\n  const stringify = x => {\n    if (typeof x !== 'object' || !x) return x\n    try { return JSON.stringify(x) } catch (e) { return x.toString() }\n  }\n\n  function check (condition, conditionString, message) {\n    if (negated ? condition : !condition) {\n      throw new Error(message || `expected value${negated ? ' not' : ''} to be ${conditionString} but was ${stringify(subject)}`)\n    }\n  }\n\n  function deepEqual (a, b) {\n    if (a === b) return true\n\n    if (typeof a !== typeof b) return false\n\n    if (typeof a !== 'object') return false\n\n    if (a === null || b === null) return false\n\n    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false\n\n    if (Object.keys(a).length !== Object.keys(b).length) return false\n\n    if (!Object.keys(a).every(key => deepEqual(a[key], b[key]))) return false\n\n    if (a instanceof Set) {\n      if (a.size !== b.size) return false\n      if (!deepEqual(Array.from(a.entries()), Array.from(b.entries()))) return false\n    }\n\n    if (a instanceof Map) {\n      if (a.size !== b.size) return false\n      if (!deepEqual(Array.from(a.entries()), Array.from(b.entries()))) return false\n    }\n\n    return true\n  }\n\n  function extendsFrom (a, b) {\n    if (typeof a !== 'function') return false\n    if (typeof b !== 'function') return false\n    while (a) {\n      a = Object.getPrototypeOf(a)\n      if (a === b) return true\n    }\n    return false\n  }\n\n  return {\n    get not () { negated = !negated; return this },\n\n    toBe: (value, message) => check(subject === value, `${stringify(value)}`, message),\n    toEqual: (value, message) => check(deepEqual(subject, value), `equal to ${stringify(value)}`, message),\n    toBeInstanceOf: (Class, message) => check(subject && subject instanceof Class, `an instance of ${Class && Class.name}`, message),\n\n    toBeDefined: message => check(typeof subject !== 'undefined', 'defined', message),\n    toBeNull: message => check(subject === null, 'null', message),\n\n    toBeNumber: message => check(typeof subject === 'number', 'a number', message),\n    toBeInteger: message => check(Number.isInteger(subject), 'an integer', message),\n    toBeLessThan: (value, message) => check(subject < value && typeof subject === 'number' && typeof value === 'number', `less than ${value}`, message),\n    toBeLessThanOrEqualTo: (value, message) => check(subject <= value && typeof subject === 'number' && typeof value === 'number', `less than or equal to ${value}`, message),\n    toBeGreaterThan: (value, message) => check(subject > value && typeof subject === 'number' && typeof value === 'number', `greater than ${value}`, message),\n    toBeGreaterThanOrEqualTo: (value, message) => check(subject >= value && typeof subject === 'number' && typeof value === 'number', `greater than or equal to ${value}`, message),\n\n    toBeBoolean: message => check(typeof subject === 'boolean', 'a boolean', message),\n    toBeString: message => check(typeof subject === 'string', 'a string', message),\n    toBeObject: message => check(subject && typeof subject === 'object', 'an object', message),\n    toBeArray: message => check(Array.isArray(subject), 'an array', message),\n    toBeSet: message => check(subject instanceof Set, 'a set', message),\n    toBeMap: message => check(subject instanceof Map, 'a map', message),\n    toBeUint8Array: message => check(subject instanceof Uint8Array, 'a uint8array', message),\n\n    toBeClass: message => check(typeof subject === 'function' && subject.toString().startsWith('class'), 'a class', message),\n    toBeFunction: message => check(typeof subject === 'function' && !subject.toString().startsWith('class'), 'a function', message),\n    toBeJigClass: message => check(typeof subject === 'function' && subject.toString().startsWith('class') && extendsFrom(subject, Jig), 'a jig class', message),\n    toExtendFrom: (Class, message) => check(extendsFrom(subject, Class), `an extension of ${Class && Class.name}`, message)\n  }\n}",
    version: '04'
  },
  'jig://81bcef29b0e4ed745f3422c0b764a33c76d0368af2d2e7dd139db8e00ee3d8a6_o1': {
    kind: 'code',
    props: {
      deps: {},
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0
    },
    // eslint-disable-next-line
    src: "class Base58 {\n  static decode (s) {\n    // Based on https://gist.github.com/diafygi/90a3e80ca1c2793220e5/\n    if (typeof s !== 'string') throw new Error(`Cannot decode: ${s}`)\n    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'\n    const d = [] // the array for storing the stream of decoded bytes\n    const b = [] // the result byte array that will be returned\n    let j // the iterator variable for the byte array (d)\n    let c // the carry amount variable that is used to overflow from the current byte to the next byte\n    let n // a temporary placeholder variable for the current byte\n    for (let i = 0; i < s.length; i++) {\n      j = 0 // reset the byte iterator\n      c = A.indexOf(s[i]) // set the initial carry amount equal to the current base58 digit\n      if (c < 0) throw new Error(`Invalid base58 character: ${s}\\n\\nDetails: i=${i}, c=${s[i]}`)\n      if (!(c || b.length ^ i)) b.push(0) // prepend the result array with a zero if the base58 digit is zero and non-zero characters haven't been seen yet (to ensure correct decode length)\n      while (j in d || c) { // start looping through the bytes until there are no more bytes and no carry amount\n        n = d[j] // set the placeholder for the current byte\n        n = n ? n * 58 + c : c // shift the current byte 58 units and add the carry amount (or just add the carry amount if this is a new byte)\n        c = n >> 8 // find the new carry amount (1-byte shift of current byte value)\n        d[j] = n % 256 // reset the current byte to the remainder (the carry amount will pass on the overflow)\n        j++ // iterate to the next byte\n      }\n    }\n    while (j--) { b.push(d[j]) } // since the byte array is backwards, loop through it in reverse order, and append\n    if (b.length < 5) throw new Error(`Base58 string too short: ${s}`)\n    // We assume the checksum and version are correct\n    return b.slice(1, b.length - 4)\n  }\n}",
    version: '04'
  },
  'jig://05f67252e696160a7c0099ae8d1ec23c39592378773b3a5a55f16bd1286e7dcb_o3': {
    kind: 'code',
    props: {
      deps: {
        Berry: {
          $jig: 'native://Berry'
        },
        txo: {
          $jig: '_o2'
        }
      },
      location: '_o3',
      metadata: {
        author: 'Run ▸ Extra',
        license: 'MIT',
        website: 'https://www.run.network'
      },
      nonce: 2,
      origin: '5332c013476cd2a2c18710a01188695bc27a5ef1748a51d4a5910feb1111dab4_o1',
      owner: '1PytriYokKN3GpKw84L4vvrGBwUvTYzCpx',
      satoshis: 0
    },
    // eslint-disable-next-line
    src: "class B extends Berry {\n  init (base64Data, mediaType, encoding, filename, metadata = {}) {\n    this.base64Data = base64Data\n    this.mediaType = mediaType\n    this.encoding = encoding\n    this.filename = filename\n    this.metadata = metadata\n\n    if (mediaType === 'image/svg+xml' || mediaType === 'image/png') {\n      this.metadata.image = this\n    }\n  }\n\n  static async pluck (path, fetch) {\n    const txid = path.length === 64 ? path : JSON.parse(path).txid\n    const metadata = path.length === 64 ? {} : JSON.parse(path).metadata\n    const data = txo(await fetch(txid))\n    const out = data.out.find(o => o.s2 === '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut')\n    if (!out) throw new Error(`Cannot find B:// data in ${txid}`)\n    return new B(out.b3, out.s4, out.s5, out.s6, metadata)\n  }\n\n  static async loadWithMetadata (txid, metadata) {\n    return this.load(JSON.stringify({ txid, metadata }))\n  }\n}",
    version: '04'
  }
}

const testnet = {
  'jig://d476fd7309a0eeb8b92d715e35c6e273ad63c0025ff6cca927bd0f0b64ed88ff_o2': {
    kind: 'code',
    props: {
      deps: {
        Hex: {
          $jig: '1f0abf8d94477b1cb57629d861376616f6e1d7b78aba23a19da3e6169caf489e_o2'
        },
        Tx: {
          $jig: '_o1'
        }
      },
      location: '_o2',
      nonce: 2,
      origin: '33e78fa7c43b6d7a60c271d783295fa180b7e9fce07d41ff1b52686936b3e6ae_o1',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0
    },
    src: "function txo (rawtx) {\n  const ret = { }\n\n  function chunks (script) {\n    const b = Hex.stringToBytes(script)\n    let i = 0\n\n    function u8 () { return b[i++] }\n    function u16 () { return u8() + u8() * 256 }\n    function u32 () { return u16() + u16() * 256 * 256 }\n    function buf (n) { const h = Hex.bytesToString(b.slice(i, i + n)); i += n; return h }\n\n    const OP_PUSHDATA1 = 0x4c\n    const OP_PUSHDATA2 = 0x4d\n    const OP_PUSHDATA4 = 0x4e\n\n    const chunks = []\n    while (i < b.length) {\n      const opcodenum = u8()\n      if (opcodenum > 0 && opcodenum < OP_PUSHDATA1) {\n        chunks.push({ buf: buf(opcodenum), len: opcodenum, opcodenum })\n      } else if (opcodenum === OP_PUSHDATA1) {\n        const len = u8()\n        chunks.push({ buf: buf(len), len, opcodenum })\n      } else if (opcodenum === OP_PUSHDATA2) {\n        const len = u16()\n        chunks.push({ buf: buf(len), len, opcodenum })\n      } else if (opcodenum === OP_PUSHDATA4) {\n        const len = u32()\n        chunks.push({ buf: buf(len), len, opcodenum })\n      } else {\n        chunks.push({ opcodenum })\n      }\n    }\n    return chunks\n  }\n\n  // https://stackoverflow.com/questions/23190056/hex-to-base64-converter-for-javascript\n  function bytesToBase64 (arr) {\n    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/' // base64 alphabet\n    const bin = n => n.toString(2).padStart(8, 0) // convert num to 8-bit binary string\n    const l = arr.length\n    let result = ''\n    for (let i = 0; i <= (l - 1) / 3; i++) {\n      const c1 = i * 3 + 1 >= l // case when \"=\" is on end\n      const c2 = i * 3 + 2 >= l // case when \"=\" is on end\n      const chunk = bin(arr[3 * i]) + bin(c1 ? 0 : arr[3 * i + 1]) + bin(c2 ? 0 : arr[3 * i + 2])\n      const r = chunk.match(/.{1,6}/g).map((x, j) => j === 3 && c2 ? '=' : (j === 2 && c1 ? '=' : abc[+('0b' + x)]))\n      result += r.join('')\n    }\n    return result\n  }\n\n  function xput (script, output) {\n    const ret = { }\n    chunks(script).forEach((c, n) => {\n      if (c.buf) {\n        ret['b' + n] = bytesToBase64(Hex.stringToBytes(c.buf))\n        const enc = c.buf.replace(/[0-9a-f]{2}/g, '%$&')\n        if (output) try { ret['s' + n] = decodeURIComponent(enc) } catch (e) { }\n        if (output) ret['h' + n] = c.buf\n      } else {\n        ret['b' + n] = { op: c.opcodenum }\n      }\n    })\n    return ret\n  }\n\n  function input (txin, i) {\n    const ret = xput(txin.script)\n    ret.e = { h: txin.prevTxId, i: txin.outputIndex }\n    ret.i = i\n    ret.seq = txin.sequenceNumber\n    return ret\n  }\n\n  function output (txout, i) {\n    const ret = xput(txout.script, true)\n    ret.e = { v: txout.satoshis, i }\n    ret.i = i\n    return ret\n  }\n\n  const tx = new Tx(rawtx)\n  ret.in = tx.inputs.map(input)\n  ret.out = tx.outputs.map(output)\n  ret.lock = tx.nLockTime\n  return ret\n}",
    version: '04'
  },
  'jig://1f0abf8d94477b1cb57629d861376616f6e1d7b78aba23a19da3e6169caf489e_o2': {
    kind: 'code',
    props: {
      deps: {},
      location: '_o2',
      nonce: 1,
      origin: '_o2',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0
    },
    // eslint-disable-next-line
    src: "class Hex {\n  static stringToBytes (s) {\n    if (typeof s !== 'string' || s.length % 2 !== 0) {\n      throw new Error(`Bad hex: ${s}`)\n    }\n\n    s = s.toLowerCase()\n\n    const HEX_CHARS = '0123456789abcdef'.split('')\n    const bytes = []\n\n    for (let i = 0; i < s.length; i += 2) {\n      const high = HEX_CHARS.indexOf(s[i])\n      const low = HEX_CHARS.indexOf(s[i + 1])\n\n      if (high === -1 || low === -1) {\n        throw new Error(`Bad hex: ${s}`)\n      }\n\n      bytes.push(high * 16 + low)\n    }\n\n    return bytes\n  }\n\n  static bytesToString (b) {\n    if (!Array.isArray(b)) throw new Error(`Bad bytes: ${b}`)\n\n    const validDigit = x => Number.isInteger(x) && x >= 0 && x < 256\n    b.forEach(x => { if (!validDigit(x)) throw new Error(`Bad digit: ${x}`) })\n\n    return b\n      .map(x => x.toString('16'))\n      .map(x => x.length === 1 ? '0' + x : x)\n      .join('')\n  }\n}",
    version: '04'
  },
  'jig://d476fd7309a0eeb8b92d715e35c6e273ad63c0025ff6cca927bd0f0b64ed88ff_o1': {
    kind: 'code',
    props: {
      deps: {
        Hex: {
          $jig: '1f0abf8d94477b1cb57629d861376616f6e1d7b78aba23a19da3e6169caf489e_o2'
        }
      },
      location: '_o1',
      nonce: 2,
      origin: '33e78fa7c43b6d7a60c271d783295fa180b7e9fce07d41ff1b52686936b3e6ae_o2',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0
    },
    src: 'class Tx {\n  constructor (rawtx) {\n    const b = Hex.stringToBytes(rawtx)\n    let i = 0\n\n    function u8 () { return b[i++] }\n    function u16 () { return u8() + u8() * 256 }\n    function u32 () { return u16() + u16() * 256 * 256 }\n    function u64 () { return u32() + u32() * 256 * 256 * 256 * 256 }\n    function varint () { const b0 = u8(); return b0 === 0xff ? u64() : b0 === 0xfe ? u32() : b0 === 0xfd ? u16() : b0 }\n    function txid () { const h = Hex.bytesToString(b.slice(i, i + 32).reverse()); i += 32; return h }\n    function script () { const n = varint(); const h = Hex.bytesToString(b.slice(i, i + n)); i += n; return h }\n\n    this.version = u32()\n\n    const nin = varint()\n    this.inputs = []\n    for (let vin = 0; vin < nin; vin++) {\n      this.inputs.push({\n        prevTxId: txid(),\n        outputIndex: u32(),\n        script: script(),\n        sequenceNumber: u32()\n      })\n    }\n\n    const nout = varint()\n    this.outputs = []\n    for (let vout = 0; vout < nout; vout++) {\n      this.outputs.push({\n        satoshis: u64(),\n        script: script()\n      })\n    }\n\n    this.nLockTime = u32()\n  }\n}',
    version: '04'
  },
  'jig://7d14c868fe39439edffe6982b669e7b4d3eb2729eee7c262ec2494ee3e310e99_o1': {
    kind: 'code',
    props: {
      decimals: 0,
      deps: {
        Jig: {
          $jig: 'native://Jig'
        }
      },
      icon: {
        emoji: null
      },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0,
      sealed: false,
      supply: 0,
      symbol: null,
      version: '2.0'
    },
    src: "class Token extends Jig {\n  init (amount, owner) {\n    this._checkAmount(amount)\n\n    // The base Token class cannot be created on its own\n    const extended = this.constructor !== Token\n    if (!extended) throw new Error('Token must be extended')\n\n    // Make sure we are calling from ourself\n    const minting = caller === this.constructor\n    const sending = caller && caller.constructor === this.constructor\n    if (!minting && !sending) throw new Error('Must create token using mint()')\n\n    this.sender = sending ? caller.owner : null\n    this.amount = amount\n    if (owner) this.owner = owner\n  }\n\n  static mint (amount, owner) {\n    this.supply += amount\n    return new this(amount, owner)\n  }\n\n  send (to, amount = this.amount) {\n    this._checkAmount(amount)\n\n    if (this.amount === amount) {\n      this.destroy()\n    } else if (this.amount > amount) {\n      this.amount -= amount\n    } else {\n      throw new Error('Not enough funds')\n    }\n\n    return new this.constructor(amount, to)\n  }\n\n  combine (...tokens) {\n    // If no tokens to combine, nothing to do\n    if (!tokens.length) return this\n\n    // Each token to combine must all be of this type\n    const all = tokens.concat(this)\n    if (all.some(token => token.constructor !== this.constructor)) {\n      throw new Error('Cannot combine different token classes')\n    }\n\n    // Check for duplicate tokens in the array\n    const countOf = token => all.reduce((count, next) => next === token ? count + 1 : count, 0)\n    if (all.some(token => countOf(token) > 1)) throw new Error('Cannot combine duplicate tokens')\n\n    // Destroy each token, absorbing it into this one\n    tokens.forEach(token => {\n      this.amount += token.amount\n      token.destroy()\n    })\n\n    // There is no sender for combined tokens\n    this.sender = null\n\n    // Make sure our new amount is within safe range\n    this._checkAmount(this.amount)\n\n    return this\n  }\n\n  destroy () {\n    super.destroy()\n\n    this.amount = 0\n    this.sender = null\n  }\n\n  _checkAmount (amount) {\n    if (typeof amount !== 'number') throw new Error('amount is not a number')\n    if (!Number.isInteger(amount)) throw new Error('amount must be an integer')\n    if (amount <= 0) throw new Error('amount must be positive')\n    if (amount > Number.MAX_SAFE_INTEGER) throw new Error('amount too large')\n  }\n}",
    version: '04'
  },
  'jig://0bdf33a334a60909f4c8dab345500cbb313fbfd50b1d98120227eae092b81c39_o1': {
    kind: 'code',
    props: {
      decimals: 0,
      deps: {
        Jig: {
          $jig: 'native://Jig'
        }
      },
      icon: {
        emoji: null
      },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0,
      sealed: false,
      supply: 0,
      symbol: null
    },
    src: "class Token extends Jig {\n  init (...tokens) {\n    // The base Token class cannot be created on its own\n    if (Object.getPrototypeOf(this.constructor) === Jig) {\n      throw new Error('Token must be extended')\n    }\n\n    // Case: Mint\n    if (caller === this.constructor) {\n      this._checkAmount(caller.mintAmount)\n      this.amount = caller.mintAmount\n      this.sender = null\n      return\n    }\n\n    // Case: Send\n    if (caller && caller.constructor === this.constructor) {\n      this._checkAmount(caller.sendAmount)\n      this.amount = caller.sendAmount\n      this.owner = caller.sendOwner\n      this.sender = caller.owner\n      return\n    }\n\n    // Case: Combine\n    if (!Array.isArray(tokens) || tokens.length < 2) {\n      throw new Error('Invalid tokens to combine')\n    }\n\n    // Each token to combine must all be of this type\n    if (tokens.some(token => token.constructor !== this.constructor)) {\n      throw new Error('Cannot combine different token classes')\n    }\n\n    // Check for duplicate tokens in the array\n    const countOf = token => tokens.reduce((count, next) => next === token ? count + 1 : count, 0)\n    if (tokens.some(token => countOf(token) > 1)) throw new Error('Cannot combine duplicate tokens')\n\n    // Destroy each token, absorbing it into this one\n    this.amount = 0\n    tokens.forEach(token => {\n      this.amount += token.amount\n      token.destroy()\n    })\n\n    // There is no sender for combined tokens\n    this.sender = null\n\n    // Make sure our new amount is within safe range\n    this._checkAmount(this.amount)\n  }\n\n  static mint (amount) {\n    this.mintAmount = amount\n    const token = new this()\n    delete this.mintAmount\n    this.supply += amount\n    return token\n  }\n\n  destroy () {\n    super.destroy()\n\n    this.amount = 0\n    this.sender = null\n  }\n\n  send (to, amount = this.amount) {\n    this._checkAmount(amount)\n\n    if (amount > this.amount) {\n      throw new Error('Not enough funds')\n    }\n\n    this.sendAmount = amount\n    this.sendOwner = to\n    const sent = new this.constructor()\n    delete this.sendAmount\n    delete this.sendOwner\n\n    if (this.amount === amount) {\n      this.destroy()\n    } else {\n      this.amount -= amount\n      this.sender = null\n    }\n\n    return sent\n  }\n\n  _checkAmount (amount) {\n    if (typeof amount !== 'number') throw new Error('amount is not a number')\n    if (!Number.isInteger(amount)) throw new Error('amount must be an integer')\n    if (amount <= 0) throw new Error('amount must be positive')\n    if (amount > Number.MAX_SAFE_INTEGER) throw new Error('amount too large')\n  }\n}",
    version: '04'
  },
  'jig://4a1929527605577a6b30710e6001b9379400421d8089d34bb0404dd558529417_o1': {
    kind: 'code',
    props: {
      deps: {},
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0
    },
    // eslint-disable-next-line
    src: 'function sha256 (message) {\n  if (!Array.isArray(message)) throw new Error(`Invalid bytes: ${message}`)\n\n  // Based off https://github.com/emn178/js-sha256/blob/master/src/sha256.js\n\n  const EXTRA = [-2147483648, 8388608, 32768, 128]\n  const SHIFT = [24, 16, 8, 0]\n  const K = [\n    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,\n    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,\n    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,\n    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,\n    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,\n    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,\n    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,\n    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2\n  ]\n\n  const blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]\n\n  let h0 = 0x6a09e667\n  let h1 = 0xbb67ae85\n  let h2 = 0x3c6ef372\n  let h3 = 0xa54ff53a\n  let h4 = 0x510e527f\n  let h5 = 0x9b05688c\n  let h6 = 0x1f83d9ab\n  let h7 = 0x5be0cd19\n\n  let block = 0\n  let start = 0\n  let bytes = 0\n  let hBytes = 0\n  let first = true\n  let hashed = false\n  let lastByteIndex = 0\n\n  update()\n  finalize()\n  return digest()\n\n  function update () {\n    let i\n    let index = 0\n    const length = message.length\n\n    while (index < length) {\n      if (hashed) {\n        hashed = false\n        blocks[0] = block\n        blocks[16] = blocks[1] = blocks[2] = blocks[3] =\n                blocks[4] = blocks[5] = blocks[6] = blocks[7] =\n                blocks[8] = blocks[9] = blocks[10] = blocks[11] =\n                blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0\n      }\n\n      for (i = start; index < length && i < 64; ++index) {\n        blocks[i >> 2] |= message[index] << SHIFT[i++ & 3]\n      }\n\n      lastByteIndex = i\n      bytes += i - start\n      if (i >= 64) {\n        block = blocks[16]\n        start = i - 64\n        hash()\n        hashed = true\n      } else {\n        start = i\n      }\n    }\n\n    if (bytes > 4294967295) {\n      hBytes += bytes / 4294967296 << 0\n      bytes = bytes % 4294967296\n    }\n  }\n\n  function finalize () {\n    blocks[16] = block\n    blocks[lastByteIndex >> 2] |= EXTRA[lastByteIndex & 3]\n    block = blocks[16]\n    if (lastByteIndex >= 56) {\n      if (!hashed) {\n        hash()\n      }\n      blocks[0] = block\n      blocks[16] = blocks[1] = blocks[2] = blocks[3] =\n            blocks[4] = blocks[5] = blocks[6] = blocks[7] =\n            blocks[8] = blocks[9] = blocks[10] = blocks[11] =\n            blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0\n    }\n    blocks[14] = hBytes << 3 | bytes >>> 29\n    blocks[15] = bytes << 3\n    hash()\n  }\n\n  function hash () {\n    let a = h0\n    let b = h1\n    let c = h2\n    let d = h3\n    let e = h4\n    let f = h5\n    let g = h6\n    let h = h7\n    let j\n    let s0\n    let s1\n    let maj\n    let t1\n    let t2\n    let ch\n    let ab\n    let da\n    let cd\n    let bc\n\n    for (j = 16; j < 64; ++j) {\n      t1 = blocks[j - 15]\n      s0 = ((t1 >>> 7) | (t1 << 25)) ^ ((t1 >>> 18) | (t1 << 14)) ^ (t1 >>> 3)\n      t1 = blocks[j - 2]\n      s1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10)\n      blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0\n    }\n\n    bc = b & c\n    for (j = 0; j < 64; j += 4) {\n      if (first) {\n        ab = 704751109\n        t1 = blocks[0] - 210244248\n        h = t1 - 1521486534 << 0\n        d = t1 + 143694565 << 0\n        first = false\n      } else {\n        s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))\n        s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))\n        ab = a & b\n        maj = ab ^ (a & c) ^ bc\n        ch = (e & f) ^ (~e & g)\n        t1 = h + s1 + ch + K[j] + blocks[j]\n        t2 = s0 + maj\n        h = d + t1 << 0\n        d = t1 + t2 << 0\n      }\n      s0 = ((d >>> 2) | (d << 30)) ^ ((d >>> 13) | (d << 19)) ^ ((d >>> 22) | (d << 10))\n      s1 = ((h >>> 6) | (h << 26)) ^ ((h >>> 11) | (h << 21)) ^ ((h >>> 25) | (h << 7))\n      da = d & a\n      maj = da ^ (d & b) ^ ab\n      ch = (h & e) ^ (~h & f)\n      t1 = g + s1 + ch + K[j + 1] + blocks[j + 1]\n      t2 = s0 + maj\n      g = c + t1 << 0\n      c = t1 + t2 << 0\n      s0 = ((c >>> 2) | (c << 30)) ^ ((c >>> 13) | (c << 19)) ^ ((c >>> 22) | (c << 10))\n      s1 = ((g >>> 6) | (g << 26)) ^ ((g >>> 11) | (g << 21)) ^ ((g >>> 25) | (g << 7))\n      cd = c & d\n      maj = cd ^ (c & a) ^ da\n      ch = (g & h) ^ (~g & e)\n      t1 = f + s1 + ch + K[j + 2] + blocks[j + 2]\n      t2 = s0 + maj\n      f = b + t1 << 0\n      b = t1 + t2 << 0\n      s0 = ((b >>> 2) | (b << 30)) ^ ((b >>> 13) | (b << 19)) ^ ((b >>> 22) | (b << 10))\n      s1 = ((f >>> 6) | (f << 26)) ^ ((f >>> 11) | (f << 21)) ^ ((f >>> 25) | (f << 7))\n      bc = b & c\n      maj = bc ^ (b & d) ^ cd\n      ch = (f & g) ^ (~f & h)\n      t1 = e + s1 + ch + K[j + 3] + blocks[j + 3]\n      t2 = s0 + maj\n      e = a + t1 << 0\n      a = t1 + t2 << 0\n    }\n\n    h0 = h0 + a << 0\n    h1 = h1 + b << 0\n    h2 = h2 + c << 0\n    h3 = h3 + d << 0\n    h4 = h4 + e << 0\n    h5 = h5 + f << 0\n    h6 = h6 + g << 0\n    h7 = h7 + h << 0\n  }\n\n  function digest () {\n    return [\n      (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, h0 & 0xFF,\n      (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, h1 & 0xFF,\n      (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, h2 & 0xFF,\n      (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, h3 & 0xFF,\n      (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, h4 & 0xFF,\n      (h5 >> 24) & 0xFF, (h5 >> 16) & 0xFF, (h5 >> 8) & 0xFF, h5 & 0xFF,\n      (h6 >> 24) & 0xFF, (h6 >> 16) & 0xFF, (h6 >> 8) & 0xFF, h6 & 0xFF,\n      (h7 >> 24) & 0xFF, (h7 >> 16) & 0xFF, (h7 >> 8) & 0xFF, h7 & 0xFF\n    ]\n  }\n}',
    version: '04'
  },
  'jig://8554b58e95bbd7a1899b54ca1318cc3ce140c6cd7ed64789dcaf5ea5dcfdb1f1_o1': {
    kind: 'code',
    props: {
      deps: {
        Jig: {
          $jig: 'native://Jig'
        }
      },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0,
      sealed: false,
      supply: 0,
      total: 0,
      version: '1.0'
    },
    src: "class NFT extends Jig {\n  init (owner, number, metadata) {\n    // The base NFT class cannot be created on its own\n    const extended = this.constructor !== NFT\n    if (!extended) throw new Error('NFT must be extended')\n\n    // Make sure we are calling from ourself\n    const minting = caller === this.constructor\n    if (!minting) throw new Error('Must create token using mint()')\n\n    if (owner) this.owner = owner\n    if (metadata) this.metadata = metadata\n\n    if (number) {\n      this.number = number\n      this.no = number // relay compat\n    }\n  }\n\n  static mint (owner, metadata) {\n    const max = this.maxSupply || this.max // relay compat\n    if (max && this.supply >= max) {\n      throw new Error('Maximum supply exceeded')\n    }\n\n    this.supply++\n    this.total++ // relay compat\n\n    return new this(owner, this.supply, metadata)\n  }\n\n  send (to) {\n    this.sender = this.owner\n    this.owner = to\n  }\n}",
    version: '04'
  },
  'jig://63e0e1268d8ab021d1c578afb8eaa0828ccbba431ffffd9309d04b78ebeb6e56_o1': {
    kind: 'code',
    props: {
      deps: {
        Hex: {
          $jig: '1f0abf8d94477b1cb57629d861376616f6e1d7b78aba23a19da3e6169caf489e_o2'
        },
        asm: {
          $jig: '1f0abf8d94477b1cb57629d861376616f6e1d7b78aba23a19da3e6169caf489e_o1'
        }
      },
      location: '_o1',
      nonce: 3,
      origin: '03320f1244e509bb421e6f1ff724bf1156182890c3768cfa4ea127a78f9913d2_o1',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0,
      sealed: false
    },
    // eslint-disable-next-line
    src: "class Group {\n      constructor (pubkeys, required) {\n        this.pubkeys = pubkeys\n        this.required = typeof required === 'undefined' ? this.pubkeys.length : required\n      }\n\n      script () {\n        // Check pubkeys\n        if (!Array.isArray(this.pubkeys)) throw new Error('pubkeys not an array')\n        if (this.pubkeys.length < 1) throw new Error('pubkeys must have at least one entry')\n        if (this.pubkeys.length > 16) throw new Error('No more than 16 pubkeys allowed')\n        const set = new Set()\n        for (const pubkey of this.pubkeys) set.add(pubkey)\n        if (set.size !== this.pubkeys.length) throw new Error('pubkeys contains duplicates')\n        this.pubkeys.forEach(pubkey => Hex.stringToBytes(pubkey))\n\n        // Check m\n        const badRequired = typeof this.required !== 'number' || !Number.isInteger(this.required) || this.required < 1\n        if (badRequired) throw new Error('required must be a non-negative integer')\n        if (this.required > this.pubkeys.length) throw new Error('required must be <= the number of pubkeys')\n\n        // Create script\n        // ie. OP_2 <pk1> <pk2> <pk3> OP_3 OP_CHECKMULTISIG\n        return asm(`OP_${this.required} ${this.pubkeys.join(' ')} OP_${this.pubkeys.length} OP_CHECKMULTISIG`)\n      }\n\n      domain () {\n        return 1 + this.required * 74 // 1 (OP_0) + (1 + 73) * nsigs\n      }\n\n      add (pubkey) {\n        if (!this.pubkeys.includes(pubkey)) {\n          this.pubkeys.push(pubkey)\n        }\n      }\n    }",
    version: '04'
  },
  'jig://1f0abf8d94477b1cb57629d861376616f6e1d7b78aba23a19da3e6169caf489e_o1': {
    kind: 'code',
    props: {
      OP_CODES: {
        OP_0: 0,
        OP_0NOTEQUAL: 146,
        OP_1: 81,
        OP_10: 90,
        OP_11: 91,
        OP_12: 92,
        OP_13: 93,
        OP_14: 94,
        OP_15: 95,
        OP_16: 96,
        OP_1ADD: 139,
        OP_1NEGATE: 79,
        OP_1SUB: 140,
        OP_2: 82,
        OP_2DROP: 109,
        OP_2DUP: 110,
        OP_2OVER: 112,
        OP_2ROT: 113,
        OP_2SWAP: 114,
        OP_3: 83,
        OP_3DUP: 111,
        OP_4: 84,
        OP_5: 85,
        OP_6: 86,
        OP_7: 87,
        OP_8: 88,
        OP_9: 89,
        OP_ABS: 144,
        OP_ADD: 147,
        OP_AND: 132,
        OP_BIN2NUM: 129,
        OP_BOOLAND: 154,
        OP_BOOLOR: 155,
        OP_CAT: 126,
        OP_CHECKMULTISIG: 174,
        OP_CHECKMULTISIGVERIFY: 175,
        OP_CHECKSIG: 172,
        OP_CHECKSIGVERIFY: 173,
        OP_CODESEPARATOR: 171,
        OP_DEPTH: 116,
        OP_DIV: 150,
        OP_DROP: 117,
        OP_DUP: 118,
        OP_ELSE: 103,
        OP_ENDIF: 104,
        OP_EQUAL: 135,
        OP_EQUALVERIFY: 136,
        OP_FALSE: 0,
        OP_FROMALTSTACK: 108,
        OP_GREATERTHAN: 160,
        OP_GREATERTHANOREQUAL: 162,
        OP_HASH160: 169,
        OP_HASH256: 170,
        OP_IF: 99,
        OP_IFDUP: 115,
        OP_INVALIDOPCODE: 255,
        OP_INVERT: 131,
        OP_LESSTHAN: 159,
        OP_LESSTHANOREQUAL: 161,
        OP_LSHIFT: 152,
        OP_MAX: 164,
        OP_MIN: 163,
        OP_MOD: 151,
        OP_MUL: 149,
        OP_NEGATE: 143,
        OP_NIP: 119,
        OP_NOP: 97,
        OP_NOP1: 176,
        OP_NOP10: 185,
        OP_NOP2: 177,
        OP_NOP3: 178,
        OP_NOP4: 179,
        OP_NOP5: 180,
        OP_NOP6: 181,
        OP_NOP7: 182,
        OP_NOP8: 183,
        OP_NOP9: 184,
        OP_NOT: 145,
        OP_NOTIF: 100,
        OP_NUM2BIN: 128,
        OP_NUMEQUAL: 156,
        OP_NUMEQUALVERIFY: 157,
        OP_NUMNOTEQUAL: 158,
        OP_OR: 133,
        OP_OVER: 120,
        OP_PICK: 121,
        OP_PUBKEY: 254,
        OP_PUBKEYHASH: 253,
        OP_PUSHDATA1: 76,
        OP_PUSHDATA2: 77,
        OP_PUSHDATA4: 78,
        OP_RETURN: 106,
        OP_RIPEMD160: 166,
        OP_ROLL: 122,
        OP_ROT: 123,
        OP_RSHIFT: 153,
        OP_SHA1: 167,
        OP_SHA256: 168,
        OP_SIZE: 130,
        OP_SPLIT: 127,
        OP_SUB: 148,
        OP_SWAP: 124,
        OP_TOALTSTACK: 107,
        OP_TRUE: 81,
        OP_TUCK: 125,
        OP_VERIFY: 105,
        OP_WITHIN: 165,
        OP_XOR: 134
      },
      deps: {
        Hex: {
          $jig: '_o2'
        }
      },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0
    },
    src: "function asm (s) {\n  const parts = s.split(' ')\n  let out = []\n\n  for (const part of parts) {\n    // If one of our predefined op-codes\n    if (typeof asm.OP_CODES[part] !== 'undefined') {\n      out.push(asm.OP_CODES[part])\n      continue\n    }\n\n    // Hex data\n    const bytes = Hex.stringToBytes(part.length === 1 ? '0' + part : part)\n\n    // OP_0\n    if (bytes[0] === 0) {\n      out.push(bytes[0]) // OP_0\n      continue\n    }\n\n    // OP_1-OP_16\n    if (bytes.length === 1 && bytes[0] >= 1 && bytes[0] <= 16) {\n      out.push(bytes[0] + 0x50)\n      continue\n    }\n\n    // OP_PUSH+[1-75] <bytes>\n    if (bytes.length <= 75) {\n      out = out.concat(bytes.length).concat(bytes)\n      continue\n    }\n\n    // OP_PUSHDATA1 <len> <bytes>\n    if (bytes.length < 256) {\n      out = out.concat(asm.OP_CODES.OP_PUSHDATA1).concat([bytes.length]).concat(bytes)\n      continue\n    }\n\n    const floor = x => parseInt(x.toString(), 10)\n\n    // OP_PUSHDATA2 <len> <bytes>\n    if (bytes.length < 256 * 256) {\n      const len = [floor(bytes.length / 256), bytes.length % 256]\n      out = out.concat(asm.OP_CODES.OP_PUSHDATA2).concat(len).concat(bytes)\n      continue\n    }\n\n    // OP_PUSHDATA4 <len> <bytes>\n    const len = [\n      floor(bytes.length / 256 / 256 / 256),\n      floor(bytes.length / 256 / 256) % 256,\n      floor(bytes.length / 256) % 256,\n      bytes.length % 256\n    ]\n    out = out.concat(asm.OP_CODES.OP_PUSHDATA4).concat(len).concat(bytes)\n    continue\n  }\n\n  return Hex.bytesToString(out)\n}",
    version: '04'
  },
  'jig://f97d4ac2a3d6f5ed09fad4a4f341619dc5a3773d9844ff95c99c5d4f8388de2f_o1': {
    kind: 'code',
    props: {
      deps: {
        Jig: {
          $jig: 'native://Jig'
        }
      },
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0
    },
    // eslint-disable-next-line
    src: "function expect (subject) {\n  let negated = false\n\n  const stringify = x => {\n    if (typeof x !== 'object' || !x) return x\n    try { return JSON.stringify(x) } catch (e) { return x.toString() }\n  }\n\n  function check (condition, conditionString, message) {\n    if (negated ? condition : !condition) {\n      throw new Error(message || `expected value${negated ? ' not' : ''} to be ${conditionString} but was ${stringify(subject)}`)\n    }\n  }\n\n  function deepEqual (a, b) {\n    if (a === b) return true\n\n    if (typeof a !== typeof b) return false\n\n    if (typeof a !== 'object') return false\n\n    if (a === null || b === null) return false\n\n    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false\n\n    if (Object.keys(a).length !== Object.keys(b).length) return false\n\n    if (!Object.keys(a).every(key => deepEqual(a[key], b[key]))) return false\n\n    if (a instanceof Set) {\n      if (a.size !== b.size) return false\n      if (!deepEqual(Array.from(a.entries()), Array.from(b.entries()))) return false\n    }\n\n    if (a instanceof Map) {\n      if (a.size !== b.size) return false\n      if (!deepEqual(Array.from(a.entries()), Array.from(b.entries()))) return false\n    }\n\n    return true\n  }\n\n  function extendsFrom (a, b) {\n    if (typeof a !== 'function') return false\n    if (typeof b !== 'function') return false\n    while (a) {\n      a = Object.getPrototypeOf(a)\n      if (a === b) return true\n    }\n    return false\n  }\n\n  return {\n    get not () { negated = !negated; return this },\n\n    toBe: (value, message) => check(subject === value, `${stringify(value)}`, message),\n    toEqual: (value, message) => check(deepEqual(subject, value), `equal to ${stringify(value)}`, message),\n    toBeInstanceOf: (Class, message) => check(subject && subject instanceof Class, `an instance of ${Class && Class.name}`, message),\n\n    toBeDefined: message => check(typeof subject !== 'undefined', 'defined', message),\n    toBeNull: message => check(subject === null, 'null', message),\n\n    toBeNumber: message => check(typeof subject === 'number', 'a number', message),\n    toBeInteger: message => check(Number.isInteger(subject), 'an integer', message),\n    toBeLessThan: (value, message) => check(subject < value && typeof subject === 'number' && typeof value === 'number', `less than ${value}`, message),\n    toBeLessThanOrEqualTo: (value, message) => check(subject <= value && typeof subject === 'number' && typeof value === 'number', `less than or equal to ${value}`, message),\n    toBeGreaterThan: (value, message) => check(subject > value && typeof subject === 'number' && typeof value === 'number', `greater than ${value}`, message),\n    toBeGreaterThanOrEqualTo: (value, message) => check(subject >= value && typeof subject === 'number' && typeof value === 'number', `greater than or equal to ${value}`, message),\n\n    toBeBoolean: message => check(typeof subject === 'boolean', 'a boolean', message),\n    toBeString: message => check(typeof subject === 'string', 'a string', message),\n    toBeObject: message => check(subject && typeof subject === 'object', 'an object', message),\n    toBeArray: message => check(Array.isArray(subject), 'an array', message),\n    toBeSet: message => check(subject instanceof Set, 'a set', message),\n    toBeMap: message => check(subject instanceof Map, 'a map', message),\n    toBeUint8Array: message => check(subject instanceof Uint8Array, 'a uint8array', message),\n\n    toBeClass: message => check(typeof subject === 'function' && subject.toString().startsWith('class'), 'a class', message),\n    toBeFunction: message => check(typeof subject === 'function' && !subject.toString().startsWith('class'), 'a function', message),\n    toBeJigClass: message => check(typeof subject === 'function' && subject.toString().startsWith('class') && extendsFrom(subject, Jig), 'a jig class', message),\n    toExtendFrom: (Class, message) => check(extendsFrom(subject, Class), `an extension of ${Class && Class.name}`, message)\n  }\n}",
    version: '04'
  },
  'jig://424abf066be56b9dd5203ed81cf1f536375351d29726d664507fdc30eb589988_o1': {
    kind: 'code',
    props: {
      deps: {},
      location: '_o1',
      nonce: 1,
      origin: '_o1',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0
    },
    // eslint-disable-next-line
    src: "class Base58 {\n  static decode (s) {\n    // Based on https://gist.github.com/diafygi/90a3e80ca1c2793220e5/\n    if (typeof s !== 'string') throw new Error(`Cannot decode: ${s}`)\n    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'\n    const d = [] // the array for storing the stream of decoded bytes\n    const b = [] // the result byte array that will be returned\n    let j // the iterator variable for the byte array (d)\n    let c // the carry amount variable that is used to overflow from the current byte to the next byte\n    let n // a temporary placeholder variable for the current byte\n    for (let i = 0; i < s.length; i++) {\n      j = 0 // reset the byte iterator\n      c = A.indexOf(s[i]) // set the initial carry amount equal to the current base58 digit\n      if (c < 0) throw new Error(`Invalid base58 character: ${s}\\n\\nDetails: i=${i}, c=${s[i]}`)\n      if (!(c || b.length ^ i)) b.push(0) // prepend the result array with a zero if the base58 digit is zero and non-zero characters haven't been seen yet (to ensure correct decode length)\n      while (j in d || c) { // start looping through the bytes until there are no more bytes and no carry amount\n        n = d[j] // set the placeholder for the current byte\n        n = n ? n * 58 + c : c // shift the current byte 58 units and add the carry amount (or just add the carry amount if this is a new byte)\n        c = n >> 8 // find the new carry amount (1-byte shift of current byte value)\n        d[j] = n % 256 // reset the current byte to the remainder (the carry amount will pass on the overflow)\n        j++ // iterate to the next byte\n      }\n    }\n    while (j--) { b.push(d[j]) } // since the byte array is backwards, loop through it in reverse order, and append\n    if (b.length < 5) throw new Error(`Base58 string too short: ${s}`)\n    // We assume the checksum and version are correct\n    return b.slice(1, b.length - 4)\n  }\n}",
    version: '04'
  },
  'jig://d476fd7309a0eeb8b92d715e35c6e273ad63c0025ff6cca927bd0f0b64ed88ff_o3': {
    kind: 'code',
    props: {
      deps: {
        Berry: {
          $jig: 'native://Berry'
        },
        txo: {
          $jig: '_o2'
        }
      },
      location: '_o3',
      metadata: {
        author: 'Run ▸ Extra',
        license: 'MIT',
        website: 'https://www.run.network'
      },
      nonce: 2,
      origin: 'b44a203acd6215d2d24b33a41f730e9acf2591c4ae27ecafc8d88ef83da9ddea_o1',
      owner: 'n3CiECgxW1pB1rGbYiX67e4U7AnS3MpJeE',
      satoshis: 0
    },
    // eslint-disable-next-line
    src: "class B extends Berry {\n  init (base64Data, mediaType, encoding, filename, metadata = {}) {\n    this.base64Data = base64Data\n    this.mediaType = mediaType\n    this.encoding = encoding\n    this.filename = filename\n    this.metadata = metadata\n\n    if (mediaType === 'image/svg+xml' || mediaType === 'image/png') {\n      this.metadata.image = this\n    }\n  }\n\n  static async pluck (path, fetch) {\n    const txid = path.length === 64 ? path : JSON.parse(path).txid\n    const metadata = path.length === 64 ? {} : JSON.parse(path).metadata\n    const data = txo(await fetch(txid))\n    const out = data.out.find(o => o.s2 === '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut')\n    if (!out) throw new Error(`Cannot find B:// data in ${txid}`)\n    return new B(out.b3, out.s4, out.s5, out.s6, metadata)\n  }\n\n  static async loadWithMetadata (txid, metadata) {\n    return this.load(JSON.stringify({ txid, metadata }))\n  }\n}",
    version: '04'
  }
}

module.exports = { mainnet, testnet }
