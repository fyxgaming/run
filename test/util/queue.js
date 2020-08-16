/**
 * queue.js
 * 
 * Tests for lib/util/queue.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { _SerialTaskQueue } = unmangle(Run)

// ------------------------------------------------------------------------------------------------
// SerialTaskQueue
// ------------------------------------------------------------------------------------------------

describe('SerialTaskQueue', () => {
    it('test', () => {
        console.log(_SerialTaskQueue)
    })
})

// ------------------------------------------------------------------------------------------------