/**
 * index.js
 *
 * Master list of test modules
 */

require('./run')

require('./kernel/blockchain')
require('./kernel/jig')
require('./kernel/location')

require('./module/blockchain-api')
require('./module/local-purse')
require('./module/mockchain')

require('./util')
require('./util/friendly')
// require('./util/xray')
