/**
 * code.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 */

// ------------------------------------------------------------------------------------------------
// Code
// ------------------------------------------------------------------------------------------------

/**
 * Manages all code known by all Run instances.
 */
class Code {
//   constructor () {
  /* no op */
//   }

  _deploy (kernel, func, options) {
    kernel._logger.info('Deploying', func.name)
  }
}

module.exports = Code
