/**
 * index.js
 *
 * Master list of test modules
 */

require('./extra/group-lock.js')

require('./kernel/api.js')
require('./kernel/auth.js')
require('./kernel/blockchain')
require('./kernel/code.js')
require('./kernel/deploy.js')
require('./kernel/destroy.js')
require('./kernel/locks.js')
require('./kernel/native.js')
require('./kernel/sealed.js')
require('./kernel/sync.js')
require('./kernel/upgrade.js')

require('./module/mockchain')
require('./module/viewer')

require('./util/admin.js')
require('./util/bindings.js')
require('./util/codec.js')
require('./util/deep.js')
require('./util/dynamic.js')
require('./util/log.js')
require('./util/misc.js')
require('./util/proxy2.js')
require('./util/queue.js')
require('./util/standard-lock.js')
