/**
 * local-purse
 */

class LocalPurse {
  static makeRandom () {
    return new LocalPurse()
  }

  async pay (tx) {
    throw new Error('Not implemented')
  }
}

module.exports = LocalPurse
