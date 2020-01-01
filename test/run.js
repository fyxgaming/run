/**
 * process.js
 *
 * Provides the Run build for tests
 *
 * The same tests run in different environments (node, browser) and with different Run builds
 * (lib, dist). This module outputs the appropriate instance for the test environment.
 */

const process = require('process')
const unobfuscate = require('./unobfuscate')

// The test mode determines the Run build. It is either an environment variable or a webpack define.
// We override global.TEST_MODE so that we can just use TEST_MODE.
global.TEST_MODE = process.env.TEST_MODE

let Run = null

if (TEST_MODE === 'lib') Run = require('../lib')
if (TEST_MODE === 'cover') Run = require('../lib')
if (TEST_MODE === 'dist') Run = require('../dist/run.node.min')
if (TEST_MODE === 'webpack') Run = require('run')

// We check if _util is defined on Run to see if Run was obfuscated. If it was, we return a proxy
// that allows tests to access the original properties as if they were unobfuscated.
if (typeof Run._util === 'undefined') {
  Run = unobfuscate(Run)
}

module.exports = Run
