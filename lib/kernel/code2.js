/**
 * code.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 *
 * Terminology
 *   - T means any type, meaning a class or function
 *   - S means specifically a sandboxed typed
 */

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Code repository, installer, and deployer
 *
 * This manager is specific to a single network. It may, however, be shared across multiple
 * Run instances on that network.
 */
class Code2 {
  constructor (network) {
    this._network = network
    this._localDescriptors = new Map() // T -> CodeDescriptor
    this._sandboxDescriptors = new Map() // S -> CodeDescriptor
    this._locationDescriptors = new Map() // Location -> CodeDescriptor
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = Code2
