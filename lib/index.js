/**
 * index.js
 *
 * Project root
 */

class Adder {
  add (a, b) {
    return a + b
  }
}

/* global VERSION */
Adder.version = (typeof VERSION !== 'undefined' && VERSION) || require('../package').version

module.exports = Adder
