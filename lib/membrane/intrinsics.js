/**
 * intrinsics
 *
 * Membrane that allows intrinsics supported by Run to be used in proxy. Because unless we handle
 * them specially, Set, Map, and TypedArray methods will throw errors that the target is not the
 * of the intrinsic type. We want to allow intrinsics to be used normally, but tracked.
 */

const Membrane = require('./membrane')

// ------------------------------------------------------------------------------------------------
// Intrinsics
// ------------------------------------------------------------------------------------------------

class Intrinsics extends Membrane {

}

// ------------------------------------------------------------------------------------------------

module.exports = Intrinsics
