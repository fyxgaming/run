class Lock {
    // As a buffer
    get script() { }
}

// Maybe we have a weak map, of scripts, to Scripts
// But then we can have script hashes

class Key {
    get lock() { }

    unlock(lock, sighash, partialKey) { // Script
        // Sign the sighash
    }
}

class StandardKey {} // P2PKH address
class StandardLock {}

class MiniKey {} // P2PK
class MiniLock {}

class GroupKey {} // Multi-sig
class GroupLock {}


// Multiple standard locks and keys
new GroupKey()


new GroupKey(
    [
        new MiniKey('...'),
        new MiniLock(...),
        new MiniLock(...)
    ],
    2)

// By convention, 


lock.script

new GroupLock

// Keys lives outside, locks go inside

const dragon = new Dragon()

dragon.send(run.purse.lock)

/*

run.purse.lock
run.purse.key

run.owner.lock
run.owner.key

class Key {
  unlock(script) {
    // return script to unlock
  }
}


const run = new Run()

run.owner.pubkey
run.owner.privkey


owner is a ... ?
purse is a ... ?

run.sendBitcoin(...)

owner and purse are the same thing.

// There might already be partial script

class Key {
  async unlock(lock, partialKey) {
    // ...
    // Returns unlockScript
  }
}

// BasicLock, BasicKey

new Run.BasicKey('...')

run.owner


const key1 = new Run.GroupKey('...')
const key2 = new Run.GroupKey('...')
const lock = new Run.GroupLock([key1, key2], 1)

// Now I want to find each key. I can create a group lock, from keys, private or public


run.owner.privkey
run.owner.addr
run.owner.lock


// Where does sign happen? If lock can be passed in. Can keys? No.

if (typeof bsv === 'undefined') {
  // BSV not installed in this environment.
  // Hint: 
}

new Run.GroupKey() // could be random


What the users sees, isn't what goes on the blockchain



send(run.owner)

if (lock instanceof CryptoLock) {
  // Get this from the jig
  // What about purses?
}

const key = new Run.CryptoKey('...')

// Get UTXOs. And create locks for each. How?

fromScript('...')

// Secure?

if (lock instanceof UnknownLock) {

}


class PublicKeyLock {
  constructor(pubkey) {
    // hex
  }

  get script() {
    // ...
  }
}

// 

// These 

run.owner = new Run.Address('...')
run.purse = new Run.PrivateKey('...')


// Mockchain and BlockchainApi both let you pass addrs, and pubkeys
// But what they need, is script


Run.modules.Personal()


const group = new Run.owner.Group([key1, key2, key3], 2)

token.send(group)

const key1 = new MultiSigKey()
const key2 = new MultiSigKey()
const key3 = new MultiSigKey()
const lock = new MultiSigLock([key1, key2, key3], 2)

const run = new Run({ owner: lock })

run.jigs
run.code

const run = new Run({ purse: new Run.MultiSigKeyPart('...') })

const run = new Run({ purse: new Run.module.MultiSigLock('...') })

run.owner.publock.pubkey
run.owner.privkey.privkey

Signatory
*/