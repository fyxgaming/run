/**
 * admin.js
 * 
 * Tests for lib/util/admin.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { _sudo } = require('../../lib/run')
const { _admin, sudo } = unmangle(Run)

// ------------------------------------------------------------------------------------------------
// Admin
// ------------------------------------------------------------------------------------------------

describe('Admin', () => {
    describe('_admin', () => {
        it('should return false by default', () => {
            expect(_admin()).to.equal(false)
        })

        it('should return true only within sudo', () => {
            expect(_admin()).to.equal(false)
            _sudo(() => {
                expect(_admin()).to.equal(true)
            })
            expect(_admin()).to.equal(false)
        })
    })
    
    describe('_sudo', () => {
        it('supports nested sudo', () => {
            expect(_admin()).to.equal(false)
            _sudo(() => {
                expect(_admin()).to.equal(true)
                _sudo(() => {
                    expect(_admin()).to.equal(true)
                })
                expect(_admin()).to.equal(true)
            })
            expect(_admin()).to.equal(false)
        })
    })
})

// ------------------------------------------------------------------------------------------------

// TODO
// Then SEALED