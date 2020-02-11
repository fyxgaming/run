/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 8);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = chai;

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = Mocha;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * helpers.js
 *
 * Helper functions used across test modules
 */

const bsv = __webpack_require__(3)
const process = __webpack_require__(11)
const { expect } = __webpack_require__(0)

const testPurses = {
  main: [
    'L3qpvEdCa4h7qxuJ1xqQwNQV2dfDR8YB57awpcbnBpoyGMAZEGLq', // 1DnxveABdMVKASzbCCUsibc29CwE7Kx9zZ
    'KxCNcuTavkKd943xAypLjRKufmdXUaooZzWoB4piRRvJK74LYwCR' // 1DurgtJhiT5oTYy6kL6QTSNiQB4DWuo3j8
  ],
  test: [
    'cT7uSf2Q4nFDWoqQtSBaKHnQsuWVdcvxZMiuCs3nkwYh94xctaFg', // mpBU73vq9ajhkXknP1sNGe6wjXH7QtwmWm
    'cTyDeBV8w9XQvaVvPY448rJVAScbu56X64tyEq6f6gdChgGw6aVq', // mhjSrMHzs97CCvhPtBn1qbfuJqqfmMzWQ4
    'cQP1h2zumWrCr2zxciuNeho61QUGtQ4zBKWFauk7WEhFb8kvjRTh' // n34P4t4K6bJtc6qfGU2pqcRix8mUACdNyJ
  ],
  stn: [
    'cT7uSf2Q4nFDWoqQtSBaKHnQsuWVdcvxZMiuCs3nkwYh94xctaFg', // mpBU73vq9ajhkXknP1sNGe6wjXH7QtwmWm
    'cTyDeBV8w9XQvaVvPY448rJVAScbu56X64tyEq6f6gdChgGw6aVq' // mhjSrMHzs97CCvhPtBn1qbfuJqqfmMzWQ4
  ]
}

// The test mode determines the Run build. It is either an environment variable or a webpack define.
// We override global.TEST_MODE so that we can just use TEST_MODE.
global.TEST_MODE = process.env.TEST_MODE

// Provides the Run build for tests
// The same tests run in different environments (node, browser) and with different Run builds
// (lib, dist). This module outputs the appropriate instance for the test environment.
let Run = null

if (false) {}
if (false) {}
if (false) {}
if (true) Run = __webpack_require__(12)

// We check if _util is defined on Run to see if Run was obfuscated. If it was, we return a proxy
// that allows tests to access the original properties as if they were unobfuscated.
const needsUnobfuscation = typeof Run._util === 'undefined'

// Wraps an object to unobfuscate its properties for testing in obfuscated builds
function unobfuscate (obj) {
  if (!needsUnobfuscation) return obj

  const obfuscationMap = __webpack_require__(13)

  const handler = {
    get: (target, prop) => {
      // If we're getting a constructor, we can simply reproxy and return it here
      if (prop === 'constructor') return new Proxy(target.constructor, handler)

      // If the obfuscation map has the key, use its transalted version
      const key = typeof obfuscationMap[prop] === 'string' ? obfuscationMap[prop] : prop
      const val = target[key]

      // If val is null, we can return it directly
      if (!val) return val

      // Regular functions get bound to the target not the proxy for better reliability
      if (typeof val === 'function' && !val.prototype) return val.bind(target)

      // Jigs don't need to be proxied and cause problems when they are
      // "val instanceof Jig" causes problems. Checking class names is good enough for tests.
      let type = val.constructor
      while (type) {
        if (type.name === 'Jig') return val
        type = Object.getPrototypeOf(type)
      }

      // Read-only non-confurable properties cannot be proxied
      const descriptor = Object.getOwnPropertyDescriptor(target, key)
      if (descriptor && descriptor.writable === false && descriptor.configurable === false) return val

      // Objects get re-proxied so that their sub-properties are unobfuscated
      if (typeof val === 'object' && prop !== 'prototype') return new Proxy(val, handler)

      // All other objects we return directly
      return val
    },

    set: (target, prop, value) => {
      // Sets are applied to the obfuscated properties if they exist
      const key = prop in obfuscationMap ? obfuscationMap[prop] : prop
      target[key] = value
      return true
    },

    construct: (T, args) => {
      // If we construct from a type, the new instance gets proxied to be unobfuscated too
      return new Proxy(new T(...args), handler)
    }
  }

  return new Proxy(obj, handler)
}

Run = unobfuscate(Run)

function createRun (options = { }) {
  const network = options.network || 'mock'
  const blockchain = network !== 'mock' ? 'star' : undefined
  const purse = network === 'mock' ? undefined : testPurses[network][0]
  const sandbox = 'sandbox' in options ? options.sandbox :  false
    ? undefined : true
  const run = new Run(Object.assign({ network, purse, sandbox, logger: null, blockchain }, options))
  return run
}

async function hookPay (run, ...enables) {
  enables = new Array(run.syncer.queued.length).fill(true).concat(enables)
  const orig = run.purse.pay.bind(run.purse)
  run.purse.pay = async (tx) => {
    if (!enables.length) { return orig(tx) }
    if (enables.shift()) { return orig(tx) } else { return tx }
  }
}

let action = null

function hookStoreAction (run) {
  const origAction = run.transaction.storeAction.bind(run.transaction)
  run.transaction.storeAction = (target, method, args, inputs, outputs, reads, before, after, proxies) => {
    origAction(target, method, args, inputs, outputs, reads, before, after, proxies)
    target = proxies.get(target)
    inputs = new Set(Array.from(inputs).map(i => proxies.get(i)))
    outputs = new Set(Array.from(outputs).map(o => proxies.get(o)))
    reads = new Set(Array.from(reads).map(o => proxies.get(o)))
    action = { target, method, args, inputs, outputs, reads }
  }
  return run
}

function expectAction (target, method, args, inputs, outputs, reads) {
  expect(action.target).to.equal(target)
  expect(action.method).to.equal(method)
  expect(action.args).to.deep.equal(args)
  expect(action.inputs.size).to.equal(inputs.length)
  Array.from(action.inputs.values()).forEach((i, n) => expect(i).to.equal(inputs[n]))
  expect(action.outputs.size).to.equal(outputs.length)
  Array.from(action.outputs.values()).forEach((o, n) => expect(o).to.equal(outputs[n]))
  expect(action.reads.size).to.equal(reads.length)
  Array.from(action.reads.values()).forEach((x, n) => expect(x).to.equal(reads[n]))
  action = null
}

function expectNoAction () {
  if (action) throw new Error('Unexpected transaction')
}

async function deploy (Class) {
  const app = 'Star ▸ Library'
  const networks = [['test', 'Testnet'], ['main', 'Mainnet']]

  let properties = ''

  for (const [network, suffix] of networks) {
    const run = createRun({ network, app })
    const origin = `origin${suffix}`
    const location = `location${suffix}`
    const owner = `owner${suffix}`

    delete Class[origin]
    delete Class[location]
    delete Class[owner]

    run.deploy(Class)

    await run.sync()

    properties += `${Class.name}.${origin} = '${Class[origin]}'\n`
    properties += `${Class.name}.${location} = '${Class[location]}'\n`
    properties += `${Class.name}.${owner} = '${Class[owner]}'\n`

    run.deactivate()
  }

  console.log(properties)
}

async function payFor (tx, privateKey, blockchain) {
  const numSplits = 10

  const address = new bsv.PrivateKey(privateKey).toAddress()
  let utxos = await blockchain.utxos(address)

  function shuffle (a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  utxos = shuffle(utxos)

  const satoshisRequired = () => Math.max(1000, tx._estimateFee() + tx._getOutputAmount())

  let total = 0
  utxos.forEach(utxo => { total += utxo.satoshis })
  const averageSatoshisPerSplit = Math.floor(total / numSplits)

  // Walk through each UTXO, adding it to the transaction, and checking if we can stop
  let addedChange = false
  for (const utxo of utxos) {
    tx.from(utxo)

    if (!addedChange) {
      addedChange = true
      tx.change(address)
    } else {
      tx.to(address, averageSatoshisPerSplit)
    }

    if (tx._getInputAmount() >= satoshisRequired()) break
  }

  // make sure we actually have enough inputs
  if (tx._getInputAmount() < satoshisRequired()) throw new Error('not enough funds')

  tx.sign(privateKey)

  return tx
}

module.exports = {
  Run,
  Jig: Run.Jig,
  unobfuscate,
  createRun,
  hookPay,
  hookStoreAction,
  expectAction,
  expectNoAction,
  deploy,
  payFor
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(5)))

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = bsv;

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/* eslint-disable no-invalid-this */
let checkError = __webpack_require__(10);

module.exports = (chai, utils) => {
    const Assertion = chai.Assertion;
    const assert = chai.assert;
    const proxify = utils.proxify;

    // If we are using a version of Chai that has checkError on it,
    // we want to use that version to be consistent. Otherwise, we use
    // what was passed to the factory.
    if (utils.checkError) {
        checkError = utils.checkError;
    }

    function isLegacyJQueryPromise(thenable) {
        // jQuery promises are Promises/A+-compatible since 3.0.0. jQuery 3.0.0 is also the first version
        // to define the catch method.
        return typeof thenable.catch !== "function" &&
               typeof thenable.always === "function" &&
               typeof thenable.done === "function" &&
               typeof thenable.fail === "function" &&
               typeof thenable.pipe === "function" &&
               typeof thenable.progress === "function" &&
               typeof thenable.state === "function";
    }

    function assertIsAboutPromise(assertion) {
        if (typeof assertion._obj.then !== "function") {
            throw new TypeError(utils.inspect(assertion._obj) + " is not a thenable.");
        }
        if (isLegacyJQueryPromise(assertion._obj)) {
            throw new TypeError("Chai as Promised is incompatible with thenables of jQuery<3.0.0, sorry! Please " +
                                "upgrade jQuery or use another Promises/A+ compatible library (see " +
                                "http://promisesaplus.com/).");
        }
    }

    function proxifyIfSupported(assertion) {
        return proxify === undefined ? assertion : proxify(assertion);
    }

    function method(name, asserter) {
        utils.addMethod(Assertion.prototype, name, function () {
            assertIsAboutPromise(this);
            return asserter.apply(this, arguments);
        });
    }

    function property(name, asserter) {
        utils.addProperty(Assertion.prototype, name, function () {
            assertIsAboutPromise(this);
            return proxifyIfSupported(asserter.apply(this, arguments));
        });
    }

    function doNotify(promise, done) {
        promise.then(() => done(), done);
    }

    // These are for clarity and to bypass Chai refusing to allow `undefined` as actual when used with `assert`.
    function assertIfNegated(assertion, message, extra) {
        assertion.assert(true, null, message, extra.expected, extra.actual);
    }

    function assertIfNotNegated(assertion, message, extra) {
        assertion.assert(false, message, null, extra.expected, extra.actual);
    }

    function getBasePromise(assertion) {
        // We need to chain subsequent asserters on top of ones in the chain already (consider
        // `eventually.have.property("foo").that.equals("bar")`), only running them after the existing ones pass.
        // So the first base-promise is `assertion._obj`, but after that we use the assertions themselves, i.e.
        // previously derived promises, to chain off of.
        return typeof assertion.then === "function" ? assertion : assertion._obj;
    }

    function getReasonName(reason) {
        return reason instanceof Error ? reason.toString() : checkError.getConstructorName(reason);
    }

    // Grab these first, before we modify `Assertion.prototype`.

    const propertyNames = Object.getOwnPropertyNames(Assertion.prototype);

    const propertyDescs = {};
    for (const name of propertyNames) {
        propertyDescs[name] = Object.getOwnPropertyDescriptor(Assertion.prototype, name);
    }

    property("fulfilled", function () {
        const derivedPromise = getBasePromise(this).then(
            value => {
                assertIfNegated(this,
                                "expected promise not to be fulfilled but it was fulfilled with #{act}",
                                { actual: value });
                return value;
            },
            reason => {
                assertIfNotNegated(this,
                                   "expected promise to be fulfilled but it was rejected with #{act}",
                                   { actual: getReasonName(reason) });
                return reason;
            }
        );

        module.exports.transferPromiseness(this, derivedPromise);
        return this;
    });

    property("rejected", function () {
        const derivedPromise = getBasePromise(this).then(
            value => {
                assertIfNotNegated(this,
                                   "expected promise to be rejected but it was fulfilled with #{act}",
                                   { actual: value });
                return value;
            },
            reason => {
                assertIfNegated(this,
                                "expected promise not to be rejected but it was rejected with #{act}",
                                { actual: getReasonName(reason) });

                // Return the reason, transforming this into a fulfillment, to allow further assertions, e.g.
                // `promise.should.be.rejected.and.eventually.equal("reason")`.
                return reason;
            }
        );

        module.exports.transferPromiseness(this, derivedPromise);
        return this;
    });

    method("rejectedWith", function (errorLike, errMsgMatcher, message) {
        let errorLikeName = null;
        const negate = utils.flag(this, "negate") || false;

        // rejectedWith with that is called without arguments is
        // the same as a plain ".rejected" use.
        if (errorLike === undefined && errMsgMatcher === undefined &&
            message === undefined) {
            /* eslint-disable no-unused-expressions */
            return this.rejected;
            /* eslint-enable no-unused-expressions */
        }

        if (message !== undefined) {
            utils.flag(this, "message", message);
        }

        if (errorLike instanceof RegExp || typeof errorLike === "string") {
            errMsgMatcher = errorLike;
            errorLike = null;
        } else if (errorLike && errorLike instanceof Error) {
            errorLikeName = errorLike.toString();
        } else if (typeof errorLike === "function") {
            errorLikeName = checkError.getConstructorName(errorLike);
        } else {
            errorLike = null;
        }
        const everyArgIsDefined = Boolean(errorLike && errMsgMatcher);

        let matcherRelation = "including";
        if (errMsgMatcher instanceof RegExp) {
            matcherRelation = "matching";
        }

        const derivedPromise = getBasePromise(this).then(
            value => {
                let assertionMessage = null;
                let expected = null;

                if (errorLike) {
                    assertionMessage = "expected promise to be rejected with #{exp} but it was fulfilled with #{act}";
                    expected = errorLikeName;
                } else if (errMsgMatcher) {
                    assertionMessage = `expected promise to be rejected with an error ${matcherRelation} #{exp} but ` +
                                       `it was fulfilled with #{act}`;
                    expected = errMsgMatcher;
                }

                assertIfNotNegated(this, assertionMessage, { expected, actual: value });
                return value;
            },
            reason => {
                const errorLikeCompatible = errorLike && (errorLike instanceof Error ?
                                                        checkError.compatibleInstance(reason, errorLike) :
                                                        checkError.compatibleConstructor(reason, errorLike));

                const errMsgMatcherCompatible = errMsgMatcher && checkError.compatibleMessage(reason, errMsgMatcher);

                const reasonName = getReasonName(reason);

                if (negate && everyArgIsDefined) {
                    if (errorLikeCompatible && errMsgMatcherCompatible) {
                        this.assert(true,
                                    null,
                                    "expected promise not to be rejected with #{exp} but it was rejected " +
                                    "with #{act}",
                                    errorLikeName,
                                    reasonName);
                    }
                } else {
                    if (errorLike) {
                        this.assert(errorLikeCompatible,
                                    "expected promise to be rejected with #{exp} but it was rejected with #{act}",
                                    "expected promise not to be rejected with #{exp} but it was rejected " +
                                    "with #{act}",
                                    errorLikeName,
                                    reasonName);
                    }

                    if (errMsgMatcher) {
                        this.assert(errMsgMatcherCompatible,
                                    `expected promise to be rejected with an error ${matcherRelation} #{exp} but got ` +
                                    `#{act}`,
                                    `expected promise not to be rejected with an error ${matcherRelation} #{exp}`,
                                    errMsgMatcher,
                                    checkError.getMessage(reason));
                    }
                }

                return reason;
            }
        );

        module.exports.transferPromiseness(this, derivedPromise);
        return this;
    });

    property("eventually", function () {
        utils.flag(this, "eventually", true);
        return this;
    });

    method("notify", function (done) {
        doNotify(getBasePromise(this), done);
        return this;
    });

    method("become", function (value, message) {
        return this.eventually.deep.equal(value, message);
    });

    // ### `eventually`

    // We need to be careful not to trigger any getters, thus `Object.getOwnPropertyDescriptor` usage.
    const methodNames = propertyNames.filter(name => {
        return name !== "assert" && typeof propertyDescs[name].value === "function";
    });

    methodNames.forEach(methodName => {
        Assertion.overwriteMethod(methodName, originalMethod => function () {
            return doAsserterAsyncAndAddThen(originalMethod, this, arguments);
        });
    });

    const getterNames = propertyNames.filter(name => {
        return name !== "_obj" && typeof propertyDescs[name].get === "function";
    });

    getterNames.forEach(getterName => {
        // Chainable methods are things like `an`, which can work both for `.should.be.an.instanceOf` and as
        // `should.be.an("object")`. We need to handle those specially.
        const isChainableMethod = Assertion.prototype.__methods.hasOwnProperty(getterName);

        if (isChainableMethod) {
            Assertion.overwriteChainableMethod(
                getterName,
                originalMethod => function () {
                    return doAsserterAsyncAndAddThen(originalMethod, this, arguments);
                },
                originalGetter => function () {
                    return doAsserterAsyncAndAddThen(originalGetter, this);
                }
            );
        } else {
            Assertion.overwriteProperty(getterName, originalGetter => function () {
                return proxifyIfSupported(doAsserterAsyncAndAddThen(originalGetter, this));
            });
        }
    });

    function doAsserterAsyncAndAddThen(asserter, assertion, args) {
        // Since we're intercepting all methods/properties, we need to just pass through if they don't want
        // `eventually`, or if we've already fulfilled the promise (see below).
        if (!utils.flag(assertion, "eventually")) {
            asserter.apply(assertion, args);
            return assertion;
        }

        const derivedPromise = getBasePromise(assertion).then(value => {
            // Set up the environment for the asserter to actually run: `_obj` should be the fulfillment value, and
            // now that we have the value, we're no longer in "eventually" mode, so we won't run any of this code,
            // just the base Chai code that we get to via the short-circuit above.
            assertion._obj = value;
            utils.flag(assertion, "eventually", false);

            return args ? module.exports.transformAsserterArgs(args) : args;
        }).then(newArgs => {
            asserter.apply(assertion, newArgs);

            // Because asserters, for example `property`, can change the value of `_obj` (i.e. change the "object"
            // flag), we need to communicate this value change to subsequent chained asserters. Since we build a
            // promise chain paralleling the asserter chain, we can use it to communicate such changes.
            return assertion._obj;
        });

        module.exports.transferPromiseness(assertion, derivedPromise);
        return assertion;
    }

    // ### Now use the `Assertion` framework to build an `assert` interface.
    const originalAssertMethods = Object.getOwnPropertyNames(assert).filter(propName => {
        return typeof assert[propName] === "function";
    });

    assert.isFulfilled = (promise, message) => (new Assertion(promise, message)).to.be.fulfilled;

    assert.isRejected = (promise, errorLike, errMsgMatcher, message) => {
        const assertion = new Assertion(promise, message);
        return assertion.to.be.rejectedWith(errorLike, errMsgMatcher, message);
    };

    assert.becomes = (promise, value, message) => assert.eventually.deepEqual(promise, value, message);

    assert.doesNotBecome = (promise, value, message) => assert.eventually.notDeepEqual(promise, value, message);

    assert.eventually = {};
    originalAssertMethods.forEach(assertMethodName => {
        assert.eventually[assertMethodName] = function (promise) {
            const otherArgs = Array.prototype.slice.call(arguments, 1);

            let customRejectionHandler;
            const message = arguments[assert[assertMethodName].length - 1];
            if (typeof message === "string") {
                customRejectionHandler = reason => {
                    throw new chai.AssertionError(`${message}\n\nOriginal reason: ${utils.inspect(reason)}`);
                };
            }

            const returnedPromise = promise.then(
                fulfillmentValue => assert[assertMethodName].apply(assert, [fulfillmentValue].concat(otherArgs)),
                customRejectionHandler
            );

            returnedPromise.notify = done => {
                doNotify(returnedPromise, done);
            };

            return returnedPromise;
        };
    });
};

module.exports.transferPromiseness = (assertion, promise) => {
    assertion.then = promise.then.bind(promise);
};

module.exports.transformAsserterArgs = values => values;


/***/ }),
/* 5 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */



var base64 = __webpack_require__(29)
var ieee754 = __webpack_require__(30)
var isArray = __webpack_require__(31)

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(5)))

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * blockchain.js
 *
 * Tests for ../lib/blockchain.js
 */

const bsv = __webpack_require__(3)
const { describe, it, beforeEach } = __webpack_require__(1)
const chai = __webpack_require__(0)
const chaiAsPromised = __webpack_require__(4)
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, createRun, payFor, unobfuscate } = __webpack_require__(2)
const { BlockchainServer } = Run
const Blockchain = unobfuscate(Run.Blockchain)

// ------------------------------------------------------------------------------------------------
// Blockchain API tests
// ------------------------------------------------------------------------------------------------

describe('Blockchain', () => {
  it('should throw not implemented', async () => {
    const blockchain = new Blockchain()
    expect(() => blockchain.network).to.throw('Not implemented')
    await expect(blockchain.broadcast()).to.be.rejectedWith('Not implemented')
    await expect(blockchain.fetch()).to.be.rejectedWith('Not implemented')
    await expect(blockchain.utxos()).to.be.rejectedWith('Not implemented')
  })

  describe('isBlockchain', () => {
    it('should return true for valid blockchain', () => {
      const mockchain = new Run.Mockchain()
      expect(Blockchain.isBlockchain(mockchain)).to.equal(true)
      const blockchainServer = new Run.BlockchainServer()
      expect(Blockchain.isBlockchain(blockchainServer)).to.equal(true)
    })

    it('should return false for invalid blockchain', () => {
      expect(Blockchain.isBlockchain()).to.equal(false)
      expect(Blockchain.isBlockchain({})).to.equal(false)
      expect(Blockchain.isBlockchain(false)).to.equal(false)
      expect(Blockchain.isBlockchain(null)).to.equal(false)
      expect(Blockchain.isBlockchain(() => {})).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Universal blockchain API test suite
// ------------------------------------------------------------------------------------------------

function runBlockchainTestSuite (blockchain, privateKey, sampleTx,
  supportsSpentTxIdInBlocks, supportsSpentTxIdInMempool, indexingLatency, errors) {
  const address = privateKey.toAddress().toString()

  describe('broadcast', () => {
    it('should support sending to self', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
    })

    it('should throw if missing input', async () => {
      const utxos = await blockchain.utxos(address)
      const utxo = Object.assign({}, utxos[0], { vout: 999 })
      const tx = new bsv.Transaction().from(utxo).change(address).fee(250).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.missingInput)
    })

    it('should throw if no inputs', async () => {
      const tx = new bsv.Transaction().to(address, 100)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noInputs)
    })

    it('should throw if no outputs', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.noOutputs)
    })

    it('should throw if fee too low', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).change(address).fee(0).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.feeTooLow)
    })

    it('should throw if not signed', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).change(address)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.notFullySigned)
    })

    it('should throw if duplicate input', async () => {
      const utxos = await blockchain.utxos(address)
      const tx = new bsv.Transaction().from(utxos).from(utxos).change(address).sign(privateKey)
      await expect(blockchain.broadcast(tx)).to.be.rejectedWith(errors.duplicateInput)
    })
  })

  describe('fetch', () => {
    it('should get pre-existing transaction', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      expect(tx.hash).to.equal(sampleTx.txid)
    })

    it('should set time', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      expect(tx.time).not.to.equal(undefined)
      expect(tx.time > new Date('January 3, 2009')).to.equal(true)
      expect(tx.time <= Date.now()).to.equal(true)
    })

    it('should cache repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.fetch(sampleTx.txid))
      await Promise.all(requests)
    })

    it('should throw if nonexistant', async () => {
      const bad = '0000000000000000000000000000000000000000000000000000000000000000'
      const requests = [bad, bad, bad].map(txid => blockchain.fetch(txid))
      await expect(Promise.all(requests)).to.be.rejectedWith()
    })

    it('should set spent information for transaction in mempool and unspent', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
      const tx2 = await blockchain.fetch(tx.hash)
      // check the cached copy
      expect(tx2.outputs[0].spentTxId).to.equal(null)
      expect(tx2.outputs[0].spentIndex).to.equal(null)
      expect(tx2.outputs[0].spentHeight).to.equal(null)
      // check the uncached copy
      if (blockchain instanceof BlockchainServer) {
        await sleep(indexingLatency)
        blockchain.cache.transactions.clear()
      }
      const tx3 = await blockchain.fetch(tx.hash)
      if (supportsSpentTxIdInMempool) {
        expect(tx3.outputs[0].spentTxId).to.equal(null)
        expect(tx3.outputs[0].spentIndex).to.equal(null)
        expect(tx3.outputs[0].spentHeight).to.equal(null)
      } else {
        expect(tx3.outputs[0].spentTxId).to.equal(undefined)
        expect(tx3.outputs[0].spentIndex).to.equal(undefined)
        expect(tx3.outputs[0].spentHeight).to.equal(undefined)
      }
      expect(tx3.confirmations).to.equal(0)
    })

    it('should set spent information for transaction in mempool and spent', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      function sleep (ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
      if (blockchain instanceof BlockchainServer) {
        await sleep(indexingLatency)
        blockchain.cache.transactions.clear()
      }
      const firstInput = tx.inputs[0]
      const prev = await blockchain.fetch(firstInput.prevTxId.toString('hex'))
      if (supportsSpentTxIdInMempool) {
        expect(prev.outputs[firstInput.outputIndex].spentTxId).to.equal(tx.hash)
        expect(prev.outputs[firstInput.outputIndex].spentIndex).to.equal(0)
        expect(prev.outputs[firstInput.outputIndex].spentHeight).to.equal(-1)
      } else {
        expect(prev.outputs[firstInput.outputIndex].spentTxId).to.equal(undefined)
        expect(prev.outputs[firstInput.outputIndex].spentIndex).to.equal(undefined)
        expect(prev.outputs[firstInput.outputIndex].spentHeight).to.equal(undefined)
      }
    })

    it('should set spent information for transaction in block and spent', async () => {
      const tx = await blockchain.fetch(sampleTx.txid)
      for (let i = 0; i < sampleTx.vout.length; i++) {
        if (supportsSpentTxIdInBlocks) {
          expect(tx.outputs[i].spentTxId).to.equal(sampleTx.vout[i].spentTxId)
          expect(tx.outputs[i].spentIndex).to.equal(sampleTx.vout[i].spentIndex)
          expect(tx.outputs[i].spentHeight).to.equal(sampleTx.vout[i].spentHeight)
        } else {
          expect(tx.outputs[0].spentTxId).to.equal(undefined)
          expect(tx.outputs[0].spentIndex).to.equal(undefined)
          expect(tx.outputs[0].spentHeight).to.equal(undefined)
        }
      }
      expect(tx.time).to.equal(sampleTx.time)
      if (sampleTx.blockhash) {
        expect(tx.blockhash).to.equal(sampleTx.blockhash)
        expect(tx.blocktime).to.equal(sampleTx.blocktime)
        expect(tx.confirmations > sampleTx.minConfirmations).to.equal(true)
      }
    })

    it('should keep spent info when force fetch', async () => {
      const privateKey2 = new bsv.PrivateKey(privateKey.network)
      const address2 = privateKey2.toAddress()
      const tx1 = await payFor(new bsv.Transaction().to(address2, 1000).sign(privateKey), privateKey, blockchain)
      await blockchain.broadcast(tx1)
      const utxo = { txid: tx1.hash, vout: 0, script: tx1.outputs[0].script, satoshis: 1000 }
      const tx2 = (await payFor(new bsv.Transaction().from(utxo), privateKey, blockchain)).sign(privateKey2)
      await blockchain.broadcast(tx2)
      const tx1b = await blockchain.fetch(tx1.hash, true)
      expect(tx1b.outputs[0].spentTxId).to.equal(tx1.outputs[0].spentTxId)
      expect(tx1b.outputs[0].spentIndex).to.equal(tx1.outputs[0].spentIndex)
      expect(tx1b.outputs[0].spentHeight).to.equal(tx1.outputs[0].spentHeight)
    })
  })

  describe('utxos', () => {
    it('should return utxos', async () => {
      const utxos = await blockchain.utxos(address)
      expect(utxos.length > 0).to.equal(true)
      expect(utxos[0].txid).not.to.equal(undefined)
      expect(utxos[0].vout).not.to.equal(undefined)
      expect(utxos[0].script).not.to.equal(undefined)
      expect(utxos[0].satoshis).not.to.equal(undefined)
    })

    it('should return empty list if no utxos', async () => {
      const address = new bsv.PrivateKey(privateKey.network).toAddress()
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(0)
    })

    it('should not return spent outputs', async () => {
      const tx = await payFor(new bsv.Transaction(), privateKey, blockchain)
      await blockchain.broadcast(tx)
      const utxos = await blockchain.utxos(address)
      expect(utxos.some(utxo => utxo.txid === tx.inputs[0].prevTxId.toString() &&
        utxo.vout === tx.inputs[0].outputIndex)).to.equal(false)
      expect(utxos.some(utxo => utxo.txid === tx.hash && utxo.vout === 0)).to.equal(true)
    })

    it('should cache repeated calls', async () => {
      const requests = []
      for (let i = 0; i < 100; i++) requests.push(blockchain.utxos(address))
      await Promise.all(requests)
    })

    it('should throw for invalid address', async () => {
      const requests = ['123', '123', '123'].map(addr => blockchain.utxos(addr))
      await expect(Promise.all(requests)).to.be.rejectedWith()
    })
  })
}

// ------------------------------------------------------------------------------------------------
// Blockchain tests
// ------------------------------------------------------------------------------------------------

describe('Blockchain', () => {
  describe('constructor', () => {
    it('should return mainnet blockchain for main network', () => {
      expect(createRun({ network: 'main' }).blockchain).not.to.equal(undefined)
    })

    it('should return testnet blockchain for test network', () => {
      expect(createRun({ network: 'test' }).blockchain).not.to.equal(undefined)
    })

    it('should return scaling blockchain for stn network', () => {
      expect(createRun({ network: 'stn' }).blockchain).not.to.equal(undefined)
    })

    it('should return mock blockchain for mock network', () => {
      expect(createRun({ network: 'mock' }).blockchain).not.to.equal(undefined)
    })

    it('should throw for bad network', () => {
      expect(() => createRun({ network: 'bitcoin' })).to.throw()
    })
  })
})

// ------------------------------------------------------------------------------------------------
// BlockchainServer tests
// ------------------------------------------------------------------------------------------------

describe('BlockchainServer', () => {
  describe('constructor', () => {
    describe('network', () => {
      it('should default network to main', () => {
        expect(new BlockchainServer().network).to.equal('main')
      })

      it('should throw for bad network', () => {
        expect(() => new BlockchainServer({ network: 'bad' })).to.throw('Unknown network: bad')
        expect(() => new BlockchainServer({ network: 0 })).to.throw('Invalid network: 0')
        expect(() => new BlockchainServer({ network: {} })).to.throw('Invalid network: [object Object]')
        expect(() => new BlockchainServer({ network: null })).to.throw('Invalid network: null')
      })
    })

    describe('logger', () => {
      it('should support null loggers', () => {
        expect(new BlockchainServer({ logger: null }).logger).to.equal(null)
      })

      it('should throw for bad logger', () => {
        expect(() => new BlockchainServer({ logger: 'bad' })).to.throw('Invalid logger: bad')
        expect(() => new BlockchainServer({ logger: false })).to.throw('Invalid logger: false')
      })
    })

    describe('api', () => {
      it('should default to star api', () => {
        expect(unobfuscate(new BlockchainServer()).api.name).to.equal('star')
      })

      it('should throw for bad api', () => {
        expect(() => new BlockchainServer({ api: 'bad' })).to.throw('Unknown blockchain API: bad')
        expect(() => new BlockchainServer({ api: null })).to.throw('Invalid blockchain API: null')
        expect(() => new BlockchainServer({ api: 123 })).to.throw('Invalid blockchain API: 123')
      })
    })

    describe('lastBlockchain', () => {
      it('should support passing different last blockchain', () => {
        const lastBlockchain = { cache: {} }
        expect(new BlockchainServer({ lastBlockchain }).cache).not.to.equal(lastBlockchain.cache)
      })

      it('should only copy cache if same network', async () => {
        const testnet1 = new BlockchainServer({ network: 'test' })
        // Fill the cache with one transaction
        await testnet1.fetch('d89f6bfb9f4373212ed18b9da5f45426d50a4676a4a684c002a4e838618cf3ee')
        const testnet2 = new BlockchainServer({ network: 'test', lastBlockchain: testnet1 })
        const mainnet = new BlockchainServer({ network: 'main', lastBlockchain: testnet2 })
        expect(testnet2.cache).to.deep.equal(testnet1.cache)
        expect(mainnet.cache).not.to.equal(testnet2.cache)
      })
    })

    describe('timeout', () => {
      it('should support custom timeouts', () => {
        expect(new BlockchainServer({ timeout: 3333 }).axios.defaults.timeout).to.equal(3333)
      })

      it('should default timeout to 10000', () => {
        expect(new BlockchainServer().axios.defaults.timeout).to.equal(10000)
      })

      it('should throw for bad timeout', () => {
        expect(() => new BlockchainServer({ timeout: 'bad' })).to.throw('Invalid timeout: bad')
        expect(() => new BlockchainServer({ timeout: null })).to.throw('Invalid timeout: null')
        expect(() => new BlockchainServer({ timeout: -1 })).to.throw('Invalid timeout: -1')
        expect(() => new BlockchainServer({ timeout: NaN })).to.throw('Invalid timeout: NaN')
      })
    })
  })

  describe('utxos', () => {
    it('should correct for server returning duplicates', async () => {
      const address = bsv.PrivateKey('mainnet').toAddress().toString()
      const txid = '0000000000000000000000000000000000000000000000000000000000000000'
      const api = unobfuscate({ })
      api.utxosUrl = (network, address) => 'https://api.run.network/v1/main/status'
      api.utxosResp = (data, address) => {
        const utxo = { txid, vout: 0, satoshis: 0, script: new bsv.Script() }
        return [utxo, utxo]
      }
      function warn (warning) { this.lastWarning = warning }
      const logger = { warn, info: () => {} }
      const blockchain = new BlockchainServer({ network: 'main', api, logger })
      const utxos = await blockchain.utxos(address)
      expect(utxos.length).to.equal(1)
      expect(logger.lastWarning).to.equal(`Duplicate utxo returned from server: ${txid}_o0`)
    }).timeout(30000)

    it('should throw if API is down', async () => {
      const api = unobfuscate({ })
      api.utxosUrl = (network, address) => 'bad-url'
      const blockchain = new BlockchainServer({ network: 'main', api })
      const address = bsv.PrivateKey('mainnet').toAddress().toString()
      const requests = [blockchain.utxos(address), blockchain.utxos(address)]
      await expect(Promise.all(requests)).to.be.rejected
    })

    it('should return large number of UTXOS', async () => {
      const run = createRun({ network: 'main' })
      const utxos = await run.blockchain.utxos('14kPnFashu7rYZKTXvJU8gXpJMf9e3f8k1')
      expect(utxos.length > 1220).to.equal(true)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// BlockchainServerCache tests
// ------------------------------------------------------------------------------------------------

describe('BlockchainServerCache', () => {
  describe('get', () => {
    it('should not return expired transactions', async () => {
      const cache = unobfuscate(new BlockchainServer.Cache())
      cache.expiration = 1
      const tx = new bsv.Transaction()
      cache.fetched(tx)
      const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }
      await sleep(10)
      expect(cache.get(tx.hash)).not.to.equal(tx)
    })
  })

  describe('fetched', () => {
    it('should flush oldest transcation when full', () => {
      const cache = unobfuscate(new BlockchainServer.Cache({ size: 1 }))
      cache.size = 1
      const tx1 = new bsv.Transaction().addData('1')
      const tx2 = new bsv.Transaction().addData('2')
      cache.fetched(tx1)
      cache.fetched(tx2)
      expect(cache.transactions.size).to.equal(1)
      expect(cache.transactions.get(tx2.hash)).to.equal(tx2)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// API tests
// ------------------------------------------------------------------------------------------------

// sample transactions with spent outputs in mined blocks on each network
const sampleTransactions = {
  main: {
    txid: 'afc557ef2970af0b5fb8bc1a70a320af425c7a45ca5d40eac78475109563c5f8',
    blockhash: '000000000000000005609907e3092b92882c522fffb0705c73e91ddc3a6941ed',
    blocktime: 1556620117,
    time: 1556620117000,
    minConfirmations: 15000,
    vout: [{
      spentTxId: '26fb663eeb8d3cd407276b045a8d71da9f625ef3dca66f51cb047d97a8cad3a6',
      spentIndex: 0,
      spentHeight: 580333
    }]
  },
  test: {
    txid: 'acf2d978febb09e3a0d5817f180b19df675a0e95f75a2a1efeec739ebff865a7',
    blockhash: '00000000000001ffaf368388b7ac954a562bd76fe39f6e114b171655273a38a7',
    blocktime: 1556695666,
    time: 1556695666000,
    minConfirmations: 18000,
    vout: [{
      spentTxId: '806444d15f416477b00b6bbd937c02ff3c8f8c5e09dae28425c87a8a0ef58af0',
      spentIndex: 0,
      spentHeight: 1298618
    }]
  },
  stn: {
    txid: 'a40ee613c5982d6b39d2425368eb2375f49b38a45b457bd72db4ec666d96d4c6'
  }
}

const errors = {
  noInputs: 'tx has no inputs',
  noOutputs: 'tx has no outputs',
  feeTooLow: 'tx fee too low',
  notFullySigned: 'tx not fully signed',
  duplicateInput: /transaction input [0-9]* duplicate input/,
  missingInput: 'Missing inputs'
}

const apis = { Star: 'star', BitIndex: 'bitindex', WhatsOnChain: 'whatsonchain' }
const networks = ['main', 'test']
const supportsSpentTxIdInBlocks = { Star: true, BitIndex: true, WhatsOnChain: false }
const supportsSpentTxIdInMempool = { Star: true, BitIndex: true, WhatsOnChain: false }

// Iterate networks first, then APIs, so that we can reuse the caches when possible
networks.forEach(network => {
  Object.keys(apis).forEach(api => {
    describe(`${api} (${network})`, function () {
      const run = createRun({ network, blockchain: apis[api] })
      beforeEach(() => run.activate())
      this.timeout(30000)
      runBlockchainTestSuite(run.blockchain, run.purse.bsvPrivateKey,
        sampleTransactions[network], supportsSpentTxIdInBlocks[api],
        supportsSpentTxIdInMempool[api], 1000 /* indexingLatency */, errors)
    })
  })
})

// ------------------------------------------------------------------------------------------------

module.exports = runBlockchainTestSuite


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * index.js
 *
 * Includes all the tests that run using mocha
 */

__webpack_require__(9)
__webpack_require__(7)
__webpack_require__(14)
__webpack_require__(15)
__webpack_require__(17)
__webpack_require__(18)
__webpack_require__(19)
__webpack_require__(21)
__webpack_require__(22)
__webpack_require__(23)
__webpack_require__(24)
__webpack_require__(26)
__webpack_require__(27)
__webpack_require__(28)
__webpack_require__(32)
__webpack_require__(33)
__webpack_require__(34)


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

const { describe, it, beforeEach } = __webpack_require__(1)
const chai = __webpack_require__(0)
const chaiAsPromised = __webpack_require__(4)
chai.use(chaiAsPromised)
const { expect } = chai
const { createRun, Run } = __webpack_require__(2)
const { Jig, Berry } = Run

class Post extends Berry {
  init (text) {
    this.text = text
  }
}

class Twetch {
  static async pluck (location, fetch, pluck) {
    const txo = await fetch(location)
    if (txo.out[0].s2 === '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut') { // B protocol
      return new Post(txo.out[0].s3)
    }
  }
}

Twetch.deps = { Post }

Post.protocol = Twetch

class Favorite extends Jig {
  init (post) {
    this.post = post
  }
}

describe.skip('Berry', () => {
  const run = createRun({ network: 'main' })
  beforeEach(() => run.activate())

  it('should fail to deploy if protocol is undeployed', async () => {
    const txid = 'd5e8313dc183d5a600a37933a55d1679436fc0d3f4d3c672b85872f84dbc41e1_o2'
    const post = await run.load(txid, { protocol: Twetch })
    const favorite = new Favorite(post)
    await favorite.sync()
  }).timeout(10000)

  it('should deploy and load a twetch post', async () => {
    await run.deploy(Twetch)
    const txid = 'b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0'
    const post = await run.load(txid, { protocol: Twetch })
    const favorite = new Favorite(post)
    await favorite.sync()
    await run.load(favorite.location)
    run.state.cache.clear()
    await run.load(favorite.location)
  }).timeout(10000)

  it('should load favorite without protocol from blockchain', async () => {
    const location = 'd5e8313dc183d5a600a37933a55d1679436fc0d3f4d3c672b85872f84dbc41e1_o2'
    const favorite = await run.load(location)
    console.log(favorite)
  }).timeout(10000)

  it('should load post with protocol from blockchain', async () => {
    const location = 'f5aba0377ccb7be4ee0f6ab0f9a6cef64bbd3d2bbc0ff0bd2e050e7733a3e0e1_o1://b446cb6e6187e79f95bc85df7d0e8332873f055d6b63bc29c049584917cceda0'
    const post = await run.load(location)
    console.log(post)
  }).timeout(10000)

  it('should throw if load invalid post with protocol', async () => {
    const location = 'f5aba0377ccb7be4ee0f6ab0f9a6cef64bbd3d2bbc0ff0bd2e050e7733a3e0e1_o1://6d8f2138df60fe2dc0b35d78fcb987086258ef5ab73bdff8b08bb8c01001840e'
    await expect(run.load(location)).to.be.rejectedWith('Failed to load berry using Twetch')
  })

  it('should support loading berries from berries', () => {
    // TODO
  })

  it('should support multiple fetches per berry', () => {
    // TODO
  })

  it('should throw if pluck more than one berry', () => {
    // TODO
  })

  it('should support deploying protocol after already using it locally', () => {
    // TODO
  })
})


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/* !
 * Chai - checkError utility
 * Copyright(c) 2012-2016 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .checkError
 *
 * Checks that an error conforms to a given set of criteria and/or retrieves information about it.
 *
 * @api public
 */

/**
 * ### .compatibleInstance(thrown, errorLike)
 *
 * Checks if two instances are compatible (strict equal).
 * Returns false if errorLike is not an instance of Error, because instances
 * can only be compatible if they're both error instances.
 *
 * @name compatibleInstance
 * @param {Error} thrown error
 * @param {Error|ErrorConstructor} errorLike object to compare against
 * @namespace Utils
 * @api public
 */

function compatibleInstance(thrown, errorLike) {
  return errorLike instanceof Error && thrown === errorLike;
}

/**
 * ### .compatibleConstructor(thrown, errorLike)
 *
 * Checks if two constructors are compatible.
 * This function can receive either an error constructor or
 * an error instance as the `errorLike` argument.
 * Constructors are compatible if they're the same or if one is
 * an instance of another.
 *
 * @name compatibleConstructor
 * @param {Error} thrown error
 * @param {Error|ErrorConstructor} errorLike object to compare against
 * @namespace Utils
 * @api public
 */

function compatibleConstructor(thrown, errorLike) {
  if (errorLike instanceof Error) {
    // If `errorLike` is an instance of any error we compare their constructors
    return thrown.constructor === errorLike.constructor || thrown instanceof errorLike.constructor;
  } else if (errorLike.prototype instanceof Error || errorLike === Error) {
    // If `errorLike` is a constructor that inherits from Error, we compare `thrown` to `errorLike` directly
    return thrown.constructor === errorLike || thrown instanceof errorLike;
  }

  return false;
}

/**
 * ### .compatibleMessage(thrown, errMatcher)
 *
 * Checks if an error's message is compatible with a matcher (String or RegExp).
 * If the message contains the String or passes the RegExp test,
 * it is considered compatible.
 *
 * @name compatibleMessage
 * @param {Error} thrown error
 * @param {String|RegExp} errMatcher to look for into the message
 * @namespace Utils
 * @api public
 */

function compatibleMessage(thrown, errMatcher) {
  var comparisonString = typeof thrown === 'string' ? thrown : thrown.message;
  if (errMatcher instanceof RegExp) {
    return errMatcher.test(comparisonString);
  } else if (typeof errMatcher === 'string') {
    return comparisonString.indexOf(errMatcher) !== -1; // eslint-disable-line no-magic-numbers
  }

  return false;
}

/**
 * ### .getFunctionName(constructorFn)
 *
 * Returns the name of a function.
 * This also includes a polyfill function if `constructorFn.name` is not defined.
 *
 * @name getFunctionName
 * @param {Function} constructorFn
 * @namespace Utils
 * @api private
 */

var functionNameMatch = /\s*function(?:\s|\s*\/\*[^(?:*\/)]+\*\/\s*)*([^\(\/]+)/;
function getFunctionName(constructorFn) {
  var name = '';
  if (typeof constructorFn.name === 'undefined') {
    // Here we run a polyfill if constructorFn.name is not defined
    var match = String(constructorFn).match(functionNameMatch);
    if (match) {
      name = match[1];
    }
  } else {
    name = constructorFn.name;
  }

  return name;
}

/**
 * ### .getConstructorName(errorLike)
 *
 * Gets the constructor name for an Error instance or constructor itself.
 *
 * @name getConstructorName
 * @param {Error|ErrorConstructor} errorLike
 * @namespace Utils
 * @api public
 */

function getConstructorName(errorLike) {
  var constructorName = errorLike;
  if (errorLike instanceof Error) {
    constructorName = getFunctionName(errorLike.constructor);
  } else if (typeof errorLike === 'function') {
    // If `err` is not an instance of Error it is an error constructor itself or another function.
    // If we've got a common function we get its name, otherwise we may need to create a new instance
    // of the error just in case it's a poorly-constructed error. Please see chaijs/chai/issues/45 to know more.
    constructorName = getFunctionName(errorLike).trim() ||
        getFunctionName(new errorLike()); // eslint-disable-line new-cap
  }

  return constructorName;
}

/**
 * ### .getMessage(errorLike)
 *
 * Gets the error message from an error.
 * If `err` is a String itself, we return it.
 * If the error has no message, we return an empty string.
 *
 * @name getMessage
 * @param {Error|String} errorLike
 * @namespace Utils
 * @api public
 */

function getMessage(errorLike) {
  var msg = '';
  if (errorLike && errorLike.message) {
    msg = errorLike.message;
  } else if (typeof errorLike === 'string') {
    msg = errorLike;
  }

  return msg;
}

module.exports = {
  compatibleInstance: compatibleInstance,
  compatibleConstructor: compatibleConstructor,
  compatibleMessage: compatibleMessage,
  getMessage: getMessage,
  getConstructorName: getConstructorName,
};


/***/ }),
/* 11 */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),
/* 12 */
/***/ (function(module, exports) {

module.exports = Run;

/***/ }),
/* 13 */
/***/ (function(module) {

module.exports = JSON.parse("{\"_checkActive\":\"aab\",\"checkOwner\":\"aac\",\"checkSatoshis\":\"aad\",\"checkRunTransaction\":\"aae\",\"extractRunData\":\"aaf\",\"outputType\":\"aag\",\"getNormalizedSourceCode\":\"aah\",\"deployable\":\"aai\",\"encryptRunData\":\"aaj\",\"decryptRunData\":\"aak\",\"activeRunInstance\":\"aal\",\"sameJig\":\"aam\",\"networkSuffix\":\"aan\",\"isBlockchain\":\"aaac\",\"broadcastUrl\":\"aap\",\"broadcastData\":\"aaq\",\"fetchUrl\":\"aar\",\"fetchResp\":\"aas\",\"utxosUrl\":\"aat\",\"utxosResp\":\"aau\",\"dedupUtxos\":\"aav\",\"correctForServerUtxoIndexingDelay\":\"aaw\",\"fetched\":\"aax\",\"broadcasted\":\"aay\",\"isSandbox\":\"aaz\",\"getInstalled\":\"aaab\",\"installFromTx\":\"aabb\",\"installJig\":\"aacb\",\"fastForward\":\"aadb\",\"finish\":\"aaeb\",\"publishNext\":\"aafb\",\"publish\":\"aagb\",\"storeCode\":\"aahb\",\"storeAction\":\"aaib\",\"setProtoTxAndCreator\":\"aajb\",\"buildBsvTransaction\":\"aakb\",\"setupFromPrivateKey\":\"aalb\",\"setupFromPublicKey\":\"aamb\",\"setupFromAddress\":\"aanb\",\"queryLatest\":\"aaob\",\"removeBadAssets\":\"aapb\",\"estimateSize\":\"aaqb\",\"_util\":\"aarb\",\"proxies\":\"aasb\",\"enforce\":\"aatb\",\"stack\":\"aaub\",\"reads\":\"aavb\",\"creates\":\"aawb\",\"before\":\"aaxb\",\"callers\":\"aayb\",\"blankSlate\":\"aazb\",\"requests\":\"aabc\",\"broadcasts\":\"aacc\",\"expiration\":\"aadc\",\"indexingDelay\":\"aaec\",\"fetchedTime\":\"aafc\",\"transactions\":\"aagc\",\"utxosByLocation\":\"aahc\",\"utxosByAddress\":\"aaic\",\"blockHeight\":\"aajc\",\"installs\":\"aakc\",\"syncer\":\"aalc\",\"protoTx\":\"aamc\",\"beginCount\":\"aanc\",\"cachedTx\":\"aaoc\",\"syncListeners\":\"aapc\",\"onBroadcastListeners\":\"aaqc\",\"lastPosted\":\"aarc\",\"queued\":\"aasc\",\"sizeBytes\":\"aatc\",\"maxSizeBytes\":\"aauc\",\"JigControl\":\"aavc\",\"ProtoTransaction\":\"aawc\",\"PROTOCOL_VERSION\":\"aaxc\",\"SerialTaskQueue\":\"aayc\",\"extractProps\":\"aazc\",\"onReadyForPublish\":\"aaad\",\"spentJigs\":\"aabd\",\"spentLocations\":\"aacd\"}");

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * code.js
 *
 * Tests for ../lib/code.js
 */

// TODO: Do we need to pass run.blockchain into tests?

const { describe, it, beforeEach } = __webpack_require__(1)
const chai = __webpack_require__(0)
const chaiAsPromised = __webpack_require__(4)
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, Jig, createRun, hookPay } = __webpack_require__(2)

// ------------------------------------------------------------------------------------------------
// Code tests
// ------------------------------------------------------------------------------------------------

// These are set in 'should deploy to testnet' and used in 'should load from testnet'.
let deployedCodeLocation = null
let deployedCodeOwner = null

describe('Code', () => {
  const run = createRun()
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())

  describe('deploy', () => {
    it('should deploy a basic class', async () => {
      class A { }
      await run.deploy(A)
      expect(A.location).not.to.equal(undefined)
      expect(A.location).to.equal(A.origin)
      expect(A.originMocknet).to.equal(A.origin)
      expect(A.locationMocknet).to.equal(A.origin)
      expect(A.owner).to.equal(run.owner.pubkey)
      expect(A.ownerMocknet).to.equal(run.owner.pubkey)
    })

    it('should not deploy previous install', async () => {
      class A { }
      const loc = await run.deploy(A)
      expect(loc).to.equal(await run.deploy(A))
    })

    it('should deploy functions', async () => {
      function f (a, b) { return a + b }
      const loc = await run.deploy(f)
      expect(f.origin).to.equal(loc)
      expect(f.location).to.equal(loc)
    })

    it('should throw for non-deployables', async () => {
      await expect(run.deploy(2)).to.be.rejected
      await expect(run.deploy('abc')).to.be.rejected
      await expect(run.deploy({ n: 1 })).to.be.rejected
      await expect(run.deploy(Math.random)).to.be.rejected
    })

    it('should throw if parent dep mismatch', async () => {
      class C { }
      class B { }
      class A extends B { }
      A.deps = { B: C }
      await expect(run.deploy(A)).to.be.rejectedWith('unexpected parent dependency B')
    })

    it('should support parent dep set to its sandbox', async () => {
      class B { }
      const B2 = await run.load(await run.deploy(B))
      class A extends B { }
      A.deps = { B: B2 }
      await run.deploy(A)
    })

    it('should deploy parents', async () => {
      class Grandparent { }
      class Parent extends Grandparent { f () { this.n = 1 } }
      class Child extends Parent { f () { super.f(); this.n += 1 } }
      const Child2 = await run.load(await run.deploy(Child))
      const child = new Child2()
      child.f()
      expect(child.n).to.equal(2)
      expect(run.code.installs.has(Parent)).to.equal(true)
      expect(run.code.installs.has(Grandparent)).to.equal(true)
    })

    it('should deploy dependencies', async () => {
      class A { createB () { return new B() } }
      class B { constructor () { this.n = 1 } }
      A.deps = { B }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().createB().n).to.equal(1)
    })

    it('should always deploy parents', async () => {
      function f () { }
      class A { callF () { f() } }
      A.deps = { f }
      class B extends A { callF2 () { f() } }
      const B2 = await run.load(await run.deploy(B))
      const b = new B2()
      expect(() => b.callF()).not.to.throw()
      expect(() => b.callF2()).to.throw()
    })

    it('should return deployed dependencies in jigs', async () => {
      class B { }
      class A {
        bInstanceofB () { return new B() instanceof B }
        bPrototype () { return Object.getPrototypeOf(new B()) }
        nameOfB () { return B.name }
      }
      A.deps = { B }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().nameOfB()).to.equal('B')
      const B2 = await run.load(await run.deploy(B))
      expect(new A2().bPrototype()).to.equal(B2.prototype)
    })

    it('should support renaming dependencies', async () => {
      class A { createB() { return new B() } } // eslint-disable-line
      class C { constructor () { this.n = 1 } }
      A.deps = { B: C }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().createB().n).to.equal(1)
    })

    it('should throw for undefined dependencies', async () => {
      class B { }
      class A { createB () { return new B() } }
      const A2 = await run.load(await run.deploy(A))
      expect(() => new A2().createB()).to.throw('B is not defined')
    })

    it('should support circular dependencies', async () => {
      class A { createB () { return new B() } }
      class B { createA () { return new A() } }
      A.deps = { B }
      B.deps = { A }
      const A2 = await run.load(await run.deploy(A))
      const B2 = await run.load(await run.deploy(B))
      expect(new A2().createB()).to.be.instanceOf(B2)
      expect(new B2().createA()).to.be.instanceOf(A2)
    })

    it('should set temporary origins and locations before sync', async () => {
      class B { }
      class A { }
      A.deps = { B }
      const locationPromise = run.deploy(A)
      expect(B.origin).to.equal(undefined)
      expect(A.origin).to.equal(undefined)
      expect(B.location).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(B.originMocknet).to.equal('_d1')
      expect(A.originMocknet).to.equal('_d0')
      expect(B.locationMocknet).to.equal('_d1')
      expect(A.locationMocknet).to.equal('_d0')
      const location = await locationPromise
      expect(location.startsWith('_')).to.equal(false)
      expect(B.origin.startsWith('_')).to.equal(false)
      expect(A.origin.startsWith('_')).to.equal(false)
      expect(B.location.startsWith('_')).to.equal(false)
      expect(A.location.startsWith('_')).to.equal(false)
      expect(B.originMocknet.startsWith('_')).to.equal(false)
      expect(A.originMocknet.startsWith('_')).to.equal(false)
      expect(B.locationMocknet.startsWith('_')).to.equal(false)
      expect(A.locationMocknet.startsWith('_')).to.equal(false)
    })

    it('should support batch deploys', async () => {
      class A { }
      class B { }
      class C { }
      run.transaction.begin()
      run.deploy(A)
      run.deploy(B)
      run.deploy(C)
      run.transaction.end()
      expect(A.origin).to.equal(undefined)
      expect(B.origin).to.equal(undefined)
      expect(C.origin).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(B.location).to.equal(undefined)
      expect(C.location).to.equal(undefined)
      expect(A.originMocknet).to.equal('_d0')
      expect(B.originMocknet).to.equal('_d1')
      expect(C.originMocknet).to.equal('_d2')
      expect(A.locationMocknet).to.equal('_d0')
      expect(B.locationMocknet).to.equal('_d1')
      expect(C.locationMocknet).to.equal('_d2')
      await run.sync()
      const txid = A.origin.split('_')[0]
      expect(A.origin.startsWith(txid)).to.equal(true)
      expect(B.origin.startsWith(txid)).to.equal(true)
      expect(C.origin.startsWith(txid)).to.equal(true)
      expect(A.location.startsWith(txid)).to.equal(true)
      expect(B.location.startsWith(txid)).to.equal(true)
      expect(C.location.startsWith(txid)).to.equal(true)
      expect(A.originMocknet.startsWith(txid)).to.equal(true)
      expect(B.originMocknet.startsWith(txid)).to.equal(true)
      expect(C.originMocknet.startsWith(txid)).to.equal(true)
      expect(A.locationMocknet.startsWith(txid)).to.equal(true)
      expect(B.locationMocknet.startsWith(txid)).to.equal(true)
      expect(C.locationMocknet.startsWith(txid)).to.equal(true)
    })

    it('should deploy all queued', async () => {
      class A { }
      class B { }
      run.deploy(A)
      run.deploy(B)
      await run.sync()
      expect(A.origin.split('_')[0]).not.to.equal(B.origin.split('_')[0])
      expect(A.location.split('_')[0]).not.to.equal(B.location.split('_')[0])
    })

    it('should revert metadata for deploy failures', async () => {
      hookPay(run, false)
      class A { }
      await expect(run.deploy(A)).to.be.rejected
      expect(A.origin).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(A.originMocknet).to.equal(undefined)
      expect(A.locationMocknet).to.equal(undefined)
    })

    it('should revert metadata for queued deploy failures', async () => {
      hookPay(run, true, false)
      class A { }
      class B { }
      run.deploy(A).catch(e => {})
      run.deploy(B).catch(e => {})
      expect(A.origin).to.equal(undefined)
      expect(B.origin).to.equal(undefined)
      expect(A.location).to.equal(undefined)
      expect(B.location).to.equal(undefined)
      expect(A.originMocknet.startsWith('_')).to.equal(true)
      expect(B.originMocknet.startsWith('_')).to.equal(true)
      expect(A.locationMocknet.startsWith('_')).to.equal(true)
      expect(B.locationMocknet.startsWith('_')).to.equal(true)
      await expect(run.sync()).to.be.rejectedWith('tx has no inputs')
      expect(A.origin.endsWith('_o1')).to.equal(true)
      expect(A.originMocknet.endsWith('_o1')).to.equal(true)
      expect(B.origin).to.equal(undefined)
      expect(B.originMocknet).to.equal(undefined)
      expect(A.location.endsWith('_o1')).to.equal(true)
      expect(A.locationMocknet.endsWith('_o1')).to.equal(true)
      expect(B.location).to.equal(undefined)
      expect(B.locationMocknet).to.equal(undefined)
    })

    it('should deploy to testnet', async () => {
      const run = createRun({ network: 'test' })
      class C { g () { return 1 } }
      class B { }
      class A extends B {
        f () { return 1 }

        createC () { return new C() }
      }
      A.deps = { B, C }
      await run.deploy(A)
      expect(A.origin.split('_')[0].length).to.equal(64)
      expect(B.origin.split('_')[0].length).to.equal(64)
      expect(C.origin.split('_')[0].length).to.equal(64)
      expect(A.originTestnet.split('_')[0].length).to.equal(64)
      expect(B.originTestnet.split('_')[0].length).to.equal(64)
      expect(C.originTestnet.split('_')[0].length).to.equal(64)
      expect(A.origin.endsWith('_o2')).to.equal(true)
      expect(B.origin.endsWith('_o1')).to.equal(true)
      expect(C.origin.endsWith('_o3')).to.equal(true)
      expect(A.originTestnet.endsWith('_o2')).to.equal(true)
      expect(B.originTestnet.endsWith('_o1')).to.equal(true)
      expect(C.originTestnet.endsWith('_o3')).to.equal(true)
      expect(A.location.split('_')[0].length).to.equal(64)
      expect(B.location.split('_')[0].length).to.equal(64)
      expect(C.location.split('_')[0].length).to.equal(64)
      expect(A.locationTestnet.split('_')[0].length).to.equal(64)
      expect(B.locationTestnet.split('_')[0].length).to.equal(64)
      expect(C.locationTestnet.split('_')[0].length).to.equal(64)
      expect(A.location.endsWith('_o2')).to.equal(true)
      expect(B.location.endsWith('_o1')).to.equal(true)
      expect(C.location.endsWith('_o3')).to.equal(true)
      expect(A.locationTestnet.endsWith('_o2')).to.equal(true)
      expect(B.locationTestnet.endsWith('_o1')).to.equal(true)
      expect(C.locationTestnet.endsWith('_o3')).to.equal(true)
      deployedCodeLocation = A.originTestnet
      deployedCodeOwner = A.ownerTestnet
    }).timeout(30000)

    it('should support presets', async () => {
      const run = createRun({ network: 'test' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      const run2 = createRun({ network: 'test' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).to.equal(A.originTestnet)
      expect(A.location).to.equal(A.locationTestnet)
      expect(location).to.equal(A.locationTestnet)
    }).timeout(30000)

    it('should support origin-only presets', async () => {
      const run = createRun({ network: 'main' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      const run2 = createRun({ network: 'main' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).to.equal(A.originMainnet)
      expect(A.location).to.equal(A.originMainnet)
      expect(location).to.equal(A.locationMainnet)
    }).timeout(30000)

    it('should support location-only presets', async () => {
      const run = createRun({ network: 'test' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      delete A.originTestnet
      const run2 = createRun({ network: 'test' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).to.equal(undefined)
      expect(A.location).to.equal(A.locationTestnet)
      expect(location).to.equal(A.locationTestnet)
    }).timeout(30000)
  })

  describe('load', () => {
    it('should load from cache', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      expect(await run.load(A.origin)).to.equal(A2)
    })

    it('should load from mockchain when cached', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      const run2 = createRun({ blockchain: run.blockchain })
      const A3 = await run2.load(A.origin)
      expect(A2).to.equal(A3)
    })

    it('should load from mockchain when uncached', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const A3 = await run2.load(A.origin)
      expect(A2.owner).to.equal(run.owner.pubkey)
      expect(A2.owner).to.equal(A2.ownerMocknet)
      expect(A3.owner).to.equal(A2.owner)
    })

    it('should load from testnet', async () => {
      const run = createRun({ network: 'test' })
      const A = await run.load(deployedCodeLocation)
      expect(A.origin).to.equal(deployedCodeLocation)
      expect(A.location).to.equal(deployedCodeLocation)
      expect(A.originTestnet).to.equal(deployedCodeLocation)
      expect(A.locationTestnet).to.equal(deployedCodeLocation)
      expect(A.owner).to.equal(deployedCodeOwner)
      expect(A.ownerTestnet).to.equal(deployedCodeOwner)
      expect(new A().f()).to.equal(1)
      expect(new A().createC().g()).to.equal(1)
    }).timeout(30000)

    it('should throw if load temporary location', async () => {
      class A { f () { return 1 } }
      run.deploy(A).catch(e => {})
      await expect(run.load(A.locationMocknet)).to.be.rejected
    })

    it('should load functions', async () => {
      function f (a, b) { return a + b }
      const f2 = await run.load(await run.deploy(f))
      expect(f(1, 2)).to.equal(f2(1, 2))
    })

    it('should load after deploy with preset', async () => {
      // get a location
      class A { }
      await run.deploy(A)
      // deactivating, which will leave A.location set
      run.deactivate()
      expect(typeof A.location).to.equal('string')
      // deploy the same code again
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.deploy(A)
      // find the sandbox directly, without using load, because we want to make sure deploy works correctly.
      // and using load, make sure the sandboxes are the same
      expect(run2.code.installs.get(A)).to.equal(await run2.load(A.location))
    })

    it('should support dependencies in different transactions', async () => {
      class A {}
      class B extends A {}
      class C {}
      C.B1 = B
      C.B2 = B
      run.deploy(A)
      run.deploy(B)
      run.deploy(C)
      await run.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.load(C.location)
    })
  })

  describe('static props', () => {
    it('should support circular props', async () => {
      class A extends Jig { }
      class B extends Jig { }
      A.B = B
      B.A = A
      await run.deploy(A)
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const A2 = await run2.load(A.location)
      const B2 = await run2.load(B.location)
      expect(A2.B).to.equal(B2)
      expect(B2.A).to.equal(A2)
    })

    it('should correctly deploy then load static properties', async () => {
      // TODO: Arbitrary code, support, maps, sets, circular, anonymous class
      class B { }
      class A extends B { }
      class J extends Jig {}
      class K extends Jig {}
      class C { }
      A.deps = { C }
      A.n = 1
      A.s = 'a'
      A.a = [1, 2, 3]
      A.b = true
      A.x = null
      A.o = { m: 1, n: '2' }
      A.j = new J()
      A.k = [new K()]
      class D { }
      A.D = D
      A.E = class E { }
      A.F = { R: class R { } }
      A.Self = A
      A.G = function g () { return 1 }
      // A.anonymousClass = class {}
      // A.anonymousFunction = function () {}
      // A.anonymousLambda = () => {}
      await run.deploy(A)
      expect(D.origin.length > 66 && D.location.length > 66).to.equal(true)
      expect(A.E.origin.length > 66 && A.E.location.length > 66).to.equal(true)
      expect(A.F.R.origin.length > 66 && A.F.R.location.length > 66).to.equal(true)
      const run2 = createRun({ blockchain: run.blockchain })
      const checkAllProperties = async T => {
        expect(T.n).to.equal(A.n)
        expect(T.s).to.equal(A.s)
        expect(T.a).to.deep.equal(A.a)
        expect(T.b).to.equal(A.b)
        expect(T.x).to.equal(A.x)
        expect(T.o).to.deep.equal(A.o)
        expect(T.j.origin).to.equal(A.j.origin)
        expect(T.j.location).to.equal(A.j.location)
        expect(T.k[0].origin).to.equal(A.k[0].origin)
        expect(T.k[0].location).to.equal(A.k[0].location)
        const D2 = await run2.load(A.D.origin)
        expect(T.D).to.equal(D2)
        const E2 = await run2.load(A.E.origin)
        expect(T.E).to.equal(E2)
        const R2 = await run2.load(A.F.R.origin)
        expect(T.F.R).to.equal(R2)
        const C2 = await run2.load(C.origin)
        expect(T.deps).to.deep.equal({ C: C2 })
        expect(T.Self).to.equal(T)
        const G2 = await run2.load(A.G.origin)
        expect(T.G).to.equal(G2)
        // expect(T.anonymousClass).to.equal(await run2.load(A.anonymousClass.origin))
        // expect(T.anonymousFunction).to.equal(await run2.load(A.anonymousFunction.origin))
        // expect(T.anonymousLambda).to.equal(await run2.load(A.anonymousLambda.origin))
      }
      await checkAllProperties(await run2.load(A.origin))
    })

    it('should throw for bad deps', async () => {
      class B { }
      class A extends Jig { }
      A.deps = [B]
      await expect(run.deploy(A)).to.be.rejectedWith('deps must be an object')
      A.deps = B
      await expect(run.deploy(A)).to.be.rejectedWith('deps must be an object')
    })

    it('should throw for bad strings', async () => {
      class A extends Jig { }
      const stringProps = ['origin', 'location', 'originMainnet', 'locationMainnet', 'originTestnet',
        'locationTestnet', 'originStn', 'locationStn', 'originMocknet', 'locationMocknet']
      for (const s of stringProps) {
        A[s] = {}
        await expect(run.deploy(A)).to.be.rejectedWith(`${s} must be a string`)
        A[s] = 123
        await expect(run.deploy(A)).to.be.rejectedWith(`${s} must be a string`)
        delete A[s]
      }
    })

    it('should throw if unpackable', async () => {
      class A { }
      A.date = new Date()
      await expect(run.deploy(A)).to.be.rejectedWith('A static property of A is not supported')
      class B { }
      B.Math = Math
      await expect(run.deploy(B)).to.be.rejectedWith('A static property of B is not supported')
      class C { }
      C.weakSet = new WeakSet()
      await expect(run.deploy(C)).to.be.rejectedWith('A static property of C is not supported')
    })
  })

  describe('sandbox', () => {
    it('should sandbox methods from locals', async () => {
      const s = 'abc'
      class A {
        add (n) { return n + 1 }

        break () { return s }
      }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().add(1)).to.equal(2)
      expect(new A().break()).to.equal('abc')
      expect(() => new A2().break()).to.throw()
    })

    it('should sandbox methods from globals', async () => {
      class A {
        isUndefined (x) {
          if (typeof window !== 'undefined') return typeof window[x] === 'undefined'
          if (typeof global !== 'undefined') return typeof global[x] === 'undefined'
          return true
        }
      }
      const A1 = await run.load(await run.deploy(A))
      const a1 = new A1()
      const bad = ['Date', 'Math', 'eval', 'XMLHttpRequest', 'FileReader', 'WebSocket', 'setTimeout', 'setInterval']
      bad.forEach(x => expect(a1.isUndefined(x)).to.equal(true))
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const A2 = await run2.load(A.origin)
      const a2 = new A2()
      bad.forEach(x => expect(a2.isUndefined(x)).to.equal(true))
    })
  })

  describe('misc', () => {
    it('should pass instanceof checks', async () => {
      class A { }
      const A2 = await run.load(await run.deploy(A))
      expect(new A()).to.be.instanceOf(A)
      expect(new A()).not.to.be.instanceOf(A2)
      expect(new A2()).not.to.be.instanceOf(A)
      expect(new A2()).to.be.instanceOf(A2)
    })
  })

  describe('activate', () => {
    it('should support activating different network', async () => {
      if (Run.instance) Run.instance.deactivate()
      const run = createRun() // Create a new run to have a new code cache
      class A { }
      await run.deploy(A)
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationMocknet)
      expect(A.owner).to.equal(run.owner.pubkey)
      expect(A.ownerMocknet).to.equal(run.owner.pubkey)
      const run2 = createRun({ network: 'test' })
      expect(A.location).to.equal(undefined)
      expect(A.locationMocknet.length).to.equal(67)
      expect(A.owner).to.equal(undefined)
      expect(A.ownerMocknet).to.equal(run.owner.pubkey)
      await run2.deploy(A)
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationTestnet)
      expect(A.owner).to.equal(A.ownerTestnet)
      run.activate()
      expect(A.location.length).to.equal(67)
      expect(A.location).to.equal(A.locationMocknet)
      expect(A.owner).to.equal(A.ownerMocknet)
      expect(run.code.installs.size).to.equal( false ? undefined : 8)
    }).timeout(30000)

    it('should set correct owner for different networks', async () => {
      class A { }
      class B extends Jig { init () { if (this.owner !== A.owner) throw new Error() } }
      B.deps = { A }
      for (const network of ['test', 'mock']) {
        const run = createRun({ network })
        run.transaction.begin()
        run.deploy(A)
        run.deploy(B)
        run.transaction.end()
        await run.sync()
        const b = new B()
        await b.sync()
        run.deactivate()
        const run2 = createRun({ network, owner: run.owner.privkey })
        await run2.sync()
      }
    }).timeout(30000)
  })
})

// ------------------------------------------------------------------------------------------------

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(5)))

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * evaluator.js
 *
 * Tests for ../lib/evaluator.js
 */

const { describe, it } = __webpack_require__(1)
const { expect } = __webpack_require__(0)
const { Run } = __webpack_require__(2)
const { intrinsicNames } = __webpack_require__(16)

// ------------------------------------------------------------------------------------------------
// Evaluator test suite
// ------------------------------------------------------------------------------------------------

function runEvaluatorTestSuite (createEvaluator, destroyEvaluator) {
  describe('evaluate parameters', () => {
    it('should evaluate named function', () => {
      const evaluator = createEvaluator()
      const [f] = evaluator.evaluate('function f() { return 1 }')
      expect(typeof f).to.equal('function')
      expect(f.name).to.equal('f')
      expect(f()).to.equal(1)
      destroyEvaluator(evaluator)
    })

    it('should evaluate anonymous function', () => {
      const evaluator = createEvaluator()

      const [f] = evaluator.evaluate('function () { return "123" }')
      expect(typeof f).to.equal('function')
      expect(f.name).to.equal('anonymousFunction')
      expect(f()).to.equal('123')

      const [g] = evaluator.evaluate('() => { return [] }')
      expect(typeof g).to.equal('function')
      expect(g.name).to.equal('anonymousFunction')
      expect(g()).to.deep.equal([])

      destroyEvaluator(evaluator)
    })

    it('should evaluate named class', () => {
      const evaluator = createEvaluator()
      const [T] = evaluator.evaluate('class A { }')
      expect(typeof T).to.equal('function')
      expect(T.name).to.equal('A')
      destroyEvaluator(evaluator)
    })

    it('should evaluate anonymous class', () => {
      const evaluator = createEvaluator()
      const [T] = evaluator.evaluate('class { }')
      expect(typeof T).to.equal('function')
      expect(T.name).to.equal('AnonymousClass')
      destroyEvaluator(evaluator)
    })

    it('should throw if code is not a string', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate()).to.throw('Code must be a string. Received: undefined')
      expect(() => evaluator.evaluate(123)).to.throw('Code must be a string. Received: 123')
      expect(() => evaluator.evaluate(function f () {})).to.throw('Code must be a string. Received: ')
      destroyEvaluator(evaluator)
    })

    it('should throw if env is not an object', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('()=>{}', false)).to.throw('Environment must be an object. Received: false')
      expect(() => evaluator.evaluate('()=>{}', 123)).to.throw('Environment must be an object. Received: 123')
      expect(() => evaluator.evaluate('()=>{}', class A {})).to.throw('Environment must be an object. Received: ')
      destroyEvaluator(evaluator)
    })

    it('should throw if env contains $globals', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('()=>{}', { $globals: {} })).to.throw('Environment must not contain $globals')
      destroyEvaluator(evaluator)
    })

    it('should throw if evaluated code throws', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('throw new Error()')).to.throw()
      expect(() => evaluator.evaluate('x.y = z')).to.throw()
      destroyEvaluator(evaluator)
    })
  })

  describe('environment', () => {
    it('should place environment parent class in scope', () => {
      const evaluator = createEvaluator()
      const [A] = evaluator.evaluate('class A {}')
      evaluator.evaluate('class B extends A {}', { A })
      destroyEvaluator(evaluator)
    })

    it('should place environment constant in scope', () => {
      const evaluator = createEvaluator()
      const [f] = evaluator.evaluate('function f() { return CONSTANT }', { CONSTANT: 5 })
      expect(f()).to.equal(5)
      destroyEvaluator(evaluator)
    })

    it('should place environment function in scope', () => {
      const evaluator = createEvaluator()
      const [f] = evaluator.evaluate('function f() { return 1 }')
      const [g] = evaluator.evaluate('function g() { return f() + 1 }', { f })
      expect(g()).to.equal(2)
      destroyEvaluator(evaluator)
    })

    it('should place environment related class in scope', () => {
      const evaluator = createEvaluator()
      const [Z] = evaluator.evaluate('class Z {}')
      evaluator.evaluate('class Y { constructor() { this.a = new Z() } }', { Z })
      destroyEvaluator(evaluator)
    })

    it('should throw if parent class is not in environment', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('class B extends MissingClass {}')).to.throw('MissingClass is not defined')
      destroyEvaluator(evaluator)
    })

    it('should throw if called function is not in environment', () => {
      const evaluator = createEvaluator()
      const [f] = evaluator.evaluate('function f() { return missingFunction() }')
      expect(() => f()).to.throw('missingFunction is not defined')
      destroyEvaluator(evaluator)
    })

    it('should share intrinsics between evaluations', () => {
      const evaluator = createEvaluator()
      intrinsicNames.forEach(name => {
        if (typeof global[name] === 'undefined') return
        const intrinsic1 = evaluator.evaluate(`function f() { return ${name} }`)[0]()
        const intrinsic2 = evaluator.evaluate(`function f() { return ${name} }`)[0]()
        expect(intrinsic1).to.equal(intrinsic2)
      })
      destroyEvaluator(evaluator)
    })
  })

  describe('globals', () => {
    it('should support setting related classes', () => {
      const evaluator = createEvaluator()
      const [A, globals] = evaluator.evaluate('class A { createB() { return new B() } }')
      globals.B = class B { }
      expect(() => new A().createB()).not.to.throw()
      destroyEvaluator(evaluator)
    })

    it('should support setting related functions', () => {
      const evaluator = createEvaluator()
      const [f, globals] = evaluator.evaluate('function f () { return g() }')
      globals.g = function g () { return 3 }
      expect(f()).to.equal(3)
      destroyEvaluator(evaluator)
    })

    it('should support setting related constants', () => {
      const evaluator = createEvaluator()
      const [f, globals] = evaluator.evaluate('function f () { return NUM }')
      globals.NUM = 42
      expect(f()).to.equal(42)
      destroyEvaluator(evaluator)
    })

    it('should support setting getters ', () => {
      const evaluator = createEvaluator()
      const [f, globals] = evaluator.evaluate('function f () { return someValue }')
      Object.defineProperty(globals, 'someValue', { configurable: true, get: () => 4 })
      expect(f()).to.equal(4)
      destroyEvaluator(evaluator)
    })
  })
}

// ------------------------------------------------------------------------------------------------
// Evaluator tests
// ------------------------------------------------------------------------------------------------

describe('Evaluator', () => {
  const createEvaluator = () => new Run.Evaluator()
  const destroyEvaluator = evaluator => evaluator.deactivate()
  runEvaluatorTestSuite(createEvaluator, destroyEvaluator)

  describe('willSandbox', () => {
    it('should return whether name matches when regex', () => {
      const fCode = function f () { }.toString()
      const ACode = (class A {}).toString()
      const BCode = (class B {}).toString()
      const AnonClassCode = (class {}).toString()
      const AnonFunctionCode = (() => {}).toString()
      const evaluator = new Run.Evaluator({ sandbox: /(f|B)/ })
      expect(evaluator.willSandbox(fCode)).to.equal(true)
      expect(evaluator.willSandbox(ACode)).to.equal(false)
      expect(evaluator.willSandbox(BCode)).to.equal(true)
      expect(evaluator.willSandbox(AnonClassCode)).to.equal(false)
      expect(evaluator.willSandbox(AnonFunctionCode)).to.equal(false)
    })

    it('should return sandbox option when boolean', () => {
      const code = function f () { }.toString()
      expect(new Run.Evaluator({ sandbox: true }).willSandbox(code)).to.equal(true)
      expect(new Run.Evaluator({ sandbox: false }).willSandbox(code)).to.equal(false)
    })
  })

  it('should support deactivate and activate', () => {
    function f () { return g } // eslint-disable-line
    const evaluator = new Run.Evaluator({ sandbox: false })
    const f2 = evaluator.evaluate(f.toString(), { g: 2 })[0]
    expect(f2()).to.equal(2)
    evaluator.deactivate()
    expect(() => f2()).to.throw()
    evaluator.activate()
    expect(f2()).to.equal(2)
  })
})

describe('SESEvaluator', () => {
  const createEvaluator = () => new Run.Evaluator.SESEvaluator()
  const destroyEvaluator = () => {}
  runEvaluatorTestSuite(createEvaluator, destroyEvaluator)

  it('should ban non-deterministic globals', () => {
    const evaluator = createEvaluator()
    Run.Evaluator.nonDeterministicGlobals.forEach(key => {
      expect(!!evaluator.evaluate(key)[0]).to.equal(false)
    })
  })

  it('should prevent access to the global scope', () => {
    const evaluator = createEvaluator()
    expect(evaluator.evaluate('typeof window === "undefined" && typeof global === "undefined"')[0]).to.equal(true)
  })
})

describe('GlobalEvaluator', () => {
  const createEvaluator = options => new Run.Evaluator.GlobalEvaluator(options)
  const destroyEvaluator = evaluator => evaluator.deactivate()
  runEvaluatorTestSuite(createEvaluator, destroyEvaluator)

  it('should detect setting the same global twice in environment', () => {
    let warned = false
    const logger = { warn: () => { warned = true } }
    const evaluator = createEvaluator({ logger })
    evaluator.evaluate('globalToSetTwice', { globalToSetTwice: 1 })
    evaluator.evaluate('globalToSetTwice', { globalToSetTwice: 2 })
    expect(warned).to.equal(true)
    destroyEvaluator(evaluator)
  })

  it('should detect setting the same global twice in globals', () => {
    let warned = false
    const logger = { warn: () => { warned = true } }
    const evaluator = createEvaluator({ logger })
    const globals1 = evaluator.evaluate('function f() { }')[1]
    const globals2 = evaluator.evaluate('function f() { }')[1]
    Object.defineProperty(globals1, 'globalToSetTwice', { configurable: true, value: 1 })
    Object.defineProperty(globals2, 'globalToSetTwice', { configurable: true, value: 2 })
    expect(warned).to.equal(true)
    destroyEvaluator(evaluator)
  })

  it('should correctly deactivate globals', () => {
    const evaluator = createEvaluator()
    const globals = evaluator.evaluate('1', { x: 1 })[1]
    globals.y = 2
    expect(x).to.equal(1) // eslint-disable-line
    expect(y).to.equal(2) // eslint-disable-line
    destroyEvaluator(evaluator)
    expect(typeof x).to.equal('undefined')
    expect(typeof y).to.equal('undefined')
  })

  it('should correctly reactivate globals', () => {
    const evaluator = createEvaluator()
    evaluator.evaluate('1', { x: 1 })
    expect(x).to.equal(1) // eslint-disable-line
    evaluator.deactivate()
    expect(typeof x).to.equal('undefined')
    evaluator.activate()
    expect(x).to.equal(1) // eslint-disable-line
    destroyEvaluator(evaluator)
  })
})

// ------------------------------------------------------------------------------------------------

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(5)))

/***/ }),
/* 16 */
/***/ (function(module, exports) {

/**
 * intrinsics.js
 *
 * Helpers for the known built-in objects in JavaScript
 */

// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const intrinsicNames = [
  // Global functions
  'console',
  'eval',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'escape',

  // Fundamental objects
  'Object',
  'Function',
  'Boolean',
  'Symbol',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',

  // Numbers and dates
  'Number',
  'BigInt',
  'Math',
  'Date',

  // Text processing
  'String',
  'RegExp',

  // Indexed collections
  'Array',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',

  // Keyed collections
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',

  // Structured data
  'ArrayBuffer',
  'DataView',
  'JSON',

  // Control abstraction objects
  'Promise',
  'Generator',
  'GeneratorFunction',
  'AsyncFunction',

  // Reflection
  'Reflect',
  'Proxy',

  // Internationalization
  'Intl',

  // WebAssembly
  'WebAssembly'
]

// Returns an object with the built-in intrinsics in this environment
const getIntrinsics = () => {
  let code = 'const x = {};'
  intrinsicNames.forEach(name => { code += `x.${name}=typeof ${name}!=='undefined'?${name}:undefined;` })
  code += 'return x'
  return new Function(code)() // eslint-disable-line
}

const globalIntrinsics = getIntrinsics()

// ------------------------------------------------------------------------------------------------
// Intrinsics
// ------------------------------------------------------------------------------------------------

/**
 * Manages known intrinsics
 */
class Intrinsics {
  constructor () {
    this.default = null
    this.allowed = []
    this.types = new Set()
    this.use(globalIntrinsics)
  }

  set (intrinsics) {
    this.default = null
    this.allowed = []
    this.types = new Set()
    this.use(intrinsics)
    return this
  }

  allow (intrinsics) {
    this.allowed.push(intrinsics)
    Object.keys(intrinsics).forEach(name => this.types.add(intrinsics[name]))
    return this
  }

  use (intrinsics) {
    this.allow(intrinsics)
    this.default = intrinsics
    return this
  }
}

Intrinsics.defaultIntrinsics = new Intrinsics()

// ------------------------------------------------------------------------------------------------

module.exports = { getIntrinsics, intrinsicNames, globalIntrinsics, Intrinsics }


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * expect.js
 *
 * Tests for ../lib/expect.js
 */

const { describe, it, beforeEach } = __webpack_require__(1)
const { expect } = __webpack_require__(0)
const { Run, Jig, createRun, deploy } = __webpack_require__(2)

describe('expect', () => {
  const run = createRun()
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())

  it('should support toBe', () => {
    expect(() => Run.expect(1).toBe(1)).not.to.throw()
    expect(() => Run.expect('hello').toBe('hello')).not.to.throw()
    expect(() => Run.expect(null).toBe(null)).not.to.throw()
    expect(() => Run.expect({}).toBe({})).to.throw('expected value to be {} but was {}')
    expect(() => Run.expect(1).not.toBe(2)).not.to.throw()
    expect(() => Run.expect({}).not.toBe({})).not.to.throw()
    expect(() => Run.expect(null).not.toBe(null)).to.throw('expected value not to be null but was null')
    class A extends Jig { }
    const a = new A() // an un-synced jig
    expect(() => Run.expect(a).toBe(a)).not.to.throw()
    expect(() => Run.expect(a).toBe(null)).to.throw()
  })

  it('should support toEqual', () => {
    expect(() => Run.expect(1).toEqual(1)).not.to.throw()
    expect(() => Run.expect(true).toEqual(true)).not.to.throw()
    expect(() => Run.expect({}).toEqual({})).not.to.throw()
    expect(() => Run.expect({ a: [1] }).toEqual({ a: [1] })).not.to.throw()
    expect(() => Run.expect([1, '2', { n: 3 }]).toEqual([1, '2', { n: 3 }])).not.to.throw()
    expect(() => Run.expect([1]).toEqual([2])).to.throw('expected value to be equal to [2] but was [1]')
    expect(() => Run.expect(new class A {}()).toEqual(new class B {}())).not.to.throw()
    expect(() => Run.expect({ a: 1 }).not.toEqual({ a: 2 })).not.to.throw()
    expect(() => Run.expect(new class A {}()).not.toEqual({ })).to.throw('expected value not to be equal to {} but was {}')
  })

  it('should support toBeInstanceOf', () => {
    class A {}
    class B extends A {}
    expect(() => Run.expect(new A()).toBeInstanceOf(A)).not.to.throw()
    expect(() => Run.expect(new B()).toBeInstanceOf(B)).not.to.throw()
    expect(() => Run.expect(new B()).toBeInstanceOf(A)).not.to.throw()
    expect(() => Run.expect([]).toBeInstanceOf(Array)).not.to.throw()
    expect(() => Run.expect(1).toBeInstanceOf(A)).to.throw('expected value to be an instance of A but was 1')
    expect(() => Run.expect(new A()).not.toBeInstanceOf(B)).not.to.throw()
    expect(() => Run.expect(new A()).not.toBeInstanceOf(A)).to.throw('expected value not to be an instance of A but was {}')
  })

  it('should support toBeDefined', () => {
    expect(() => Run.expect(1).toBeDefined()).not.to.throw()
    expect(() => Run.expect(undefined).toBeDefined()).to.throw('expected value to be defined but was undefined')
    expect(() => Run.expect().not.toBeDefined()).not.to.throw()
    expect(() => Run.expect(undefined).not.toBeDefined()).not.to.throw()
    expect(() => Run.expect(0).not.toBeDefined()).to.throw('expected value not to be defined but was 0')
  })

  it('should support toBeNull', () => {
    expect(() => Run.expect(null).toBeNull()).not.to.throw()
    expect(() => Run.expect(0).toBeNull()).to.throw('expected value to be null but was 0')
    expect(() => Run.expect(false).not.toBeNull()).not.to.throw()
    expect(() => Run.expect(null).not.toBeNull()).to.throw('expected value not to be null but was null')
  })

  it('should support toBeNumber', () => {
    expect(() => Run.expect(0).toBeNumber()).not.to.throw()
    expect(() => Run.expect(5).toBeNumber()).not.to.throw()
    expect(() => Run.expect(1.1).toBeNumber()).not.to.throw()
    expect(() => Run.expect(NaN).toBeNumber()).not.to.throw()
    expect(() => Run.expect(Infinity).toBeNumber()).not.to.throw()
    expect(() => Run.expect(false).toBeNumber()).to.throw('expected value to be a number but was false')
    expect(() => Run.expect('0').toBeNumber('bad argument')).to.throw('bad argument')
    expect(() => Run.expect('hello').not.toBeNumber()).not.to.throw()
    expect(() => Run.expect(5).not.toBeNumber()).to.throw('expected value not to be a number but was 5')
  })

  it('should support toBeInteger', () => {
    expect(() => Run.expect(0).toBeInteger()).not.to.throw()
    expect(() => Run.expect(1).toBeInteger()).not.to.throw()
    expect(() => Run.expect(1.1).toBeInteger()).to.throw('expected value to be an integer but was 1.1')
    expect(() => Run.expect(NaN).toBeInteger()).to.throw('expected value to be an integer but was NaN')
    expect(() => Run.expect(false).toBeInteger()).to.throw('expected value to be an integer but was false')
    expect(() => Run.expect('hello').not.toBeInteger()).not.to.throw()
    expect(() => Run.expect(5).not.toBeInteger()).to.throw('expected value not to be an integer but was 5')
  })

  it('should support toBeLessThan', () => {
    expect(() => Run.expect(0).toBeLessThan(1)).not.to.throw()
    expect(() => Run.expect(-1.2).toBeLessThan(-1.1)).not.to.throw()
    expect(() => Run.expect(false).toBeLessThan(0)).to.throw('expected value to be less than 0 but was false')
    expect(() => Run.expect(0).not.toBeLessThan(0)).not.to.throw()
    expect(() => Run.expect(-1).not.toBeLessThan(0)).to.throw('expected value not to be less than 0 but was -1')
  })

  it('should support toBeLessThanOrEqualTo', () => {
    expect(() => Run.expect(1).toBeLessThanOrEqualTo(1)).not.to.throw()
    expect(() => Run.expect(-1.2).toBeLessThanOrEqualTo(-1.1)).not.to.throw()
    expect(() => Run.expect(false).toBeLessThanOrEqualTo(0)).to.throw('expected value to be less than or equal to 0 but was false')
    expect(() => Run.expect(1).not.toBeLessThanOrEqualTo(0)).not.to.throw()
    expect(() => Run.expect(0).not.toBeLessThanOrEqualTo(0)).to.throw('expected value not to be less than or equal to 0 but was 0')
  })

  it('should support toBeGreaterThan', () => {
    expect(() => Run.expect(1).toBeGreaterThan(0)).not.to.throw()
    expect(() => Run.expect(-1.1).toBeGreaterThan(-1.2)).not.to.throw()
    expect(() => Run.expect(false).toBeGreaterThan(0)).to.throw('expected value to be greater than 0 but was false')
    expect(() => Run.expect(0).not.toBeGreaterThan(0)).not.to.throw()
    expect(() => Run.expect(0).not.toBeGreaterThan(-1)).to.throw('expected value not to be greater than -1 but was 0')
  })

  it('should support toBeGreaterThanOrEqualTo', () => {
    expect(() => Run.expect(1).toBeGreaterThanOrEqualTo(1)).not.to.throw()
    expect(() => Run.expect(-1.1).toBeGreaterThanOrEqualTo(-1.2)).not.to.throw()
    expect(() => Run.expect(false).toBeGreaterThanOrEqualTo(0)).to.throw('expected value to be greater than or equal to 0 but was false')
    expect(() => Run.expect(0).not.toBeGreaterThanOrEqualTo(1)).not.to.throw()
    expect(() => Run.expect(0).not.toBeGreaterThanOrEqualTo(0)).to.throw('expected value not to be greater than or equal to 0 but was 0')
  })

  it('should support toBeBoolean', () => {
    expect(() => Run.expect(true).toBeBoolean()).not.to.throw()
    expect(() => Run.expect(1).toBeBoolean()).to.throw('expected value to be a boolean but was 1')
    expect(() => Run.expect('true').not.toBeBoolean()).not.to.throw()
    expect(() => Run.expect(false).not.toBeBoolean()).to.throw('expected value not to be a boolean but was false')
  })

  it('should support toBeString', () => {
    expect(() => Run.expect('hello').toBeString()).not.to.throw()
    expect(() => Run.expect(true).toBeString()).to.throw('expected value to be a string but was true')
    expect(() => Run.expect(1).not.toBeString()).not.to.throw()
    expect(() => Run.expect('hello').not.toBeString()).to.throw('expected value not to be a string but was hello')
  })

  it('should support toBeObject', () => {
    expect(() => Run.expect({}).toBeObject()).not.to.throw()
    expect(() => Run.expect([1, 2, 3]).toBeObject()).not.to.throw()
    expect(() => Run.expect(null).toBeObject()).to.throw('expected value to be an object but was null')
    expect(() => Run.expect(true).toBeObject()).to.throw('expected value to be an object but was true')
    expect(() => Run.expect(1).not.toBeObject()).not.to.throw()
    expect(() => Run.expect(null).not.toBeObject()).not.to.throw()
    expect(() => Run.expect({}).not.toBeObject()).to.throw('expected value not to be an object but was {}')
  })

  it('should support toBeArray', () => {
    expect(() => Run.expect([]).toBeArray()).not.to.throw()
    expect(() => Run.expect(new Array(1)).toBeArray()).not.to.throw()
    expect(() => Run.expect({}).toBeArray()).to.throw('expected value to be an array but was {}')
    expect(() => Run.expect(1).not.toBeArray()).not.to.throw()
    expect(() => Run.expect(null).not.toBeArray()).not.to.throw()
    expect(() => Run.expect([1, 2]).not.toBeArray()).to.throw('expected value not to be an array but was [1,2]')
  })

  it('should support toBeClass', () => {
    expect(() => Run.expect(class A {}).toBeClass()).not.to.throw()
    expect(() => Run.expect(class {}).toBeClass()).not.to.throw()
    expect(() => Run.expect(function f () {}).toBeClass()).to.throw('expected value to be a class but was')
    expect(() => Run.expect(() => {}).toBeClass()).to.throw('expected value to be a class but was')
    expect(() => Run.expect({}).not.toBeClass()).not.to.throw()
    expect(() => Run.expect(class A {}).not.toBeClass()).to.throw('expected value not to be a class but was')
  })

  it('should support toBeFunction', () => {
    expect(() => Run.expect(function f () {}).toBeFunction()).not.to.throw()
    expect(() => Run.expect(() => {}).toBeFunction()).not.to.throw()
    expect(() => Run.expect(class A {}).toBeFunction()).to.throw('expected value to be a function but was class A {}')
    expect(() => Run.expect(class {}).toBeFunction()).to.throw('expected value to be a function but was class {}')
    expect(() => Run.expect([]).not.toBeFunction()).not.to.throw()
    expect(() => Run.expect(() => {}).not.toBeFunction()).to.throw('expected value not to be a function but was () => {}')
  })

  it.skip('should deploy', async () => {
    await deploy(Run.expect)
  }).timeout(30000)
})


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * jig.js
 *
 * Tests for ../lib/jig.js
 */

const { describe, it, beforeEach } = __webpack_require__(1)
const chai = __webpack_require__(0)
const chaiAsPromised = __webpack_require__(4)
chai.use(chaiAsPromised)
const { expect } = chai
const { PrivateKey } = __webpack_require__(3)
const { Run, Jig, createRun, hookPay, hookStoreAction, expectAction, expectNoAction } = __webpack_require__(2)

describe('Jig', () => {
  const run = hookStoreAction(createRun())
  beforeEach(() => run.blockchain.block())
  beforeEach(() => run.activate())

  describe('constructor', () => {
    it('should create basic jig', async () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(run.code.installs.has(A)).to.equal(true)
      await run.sync()
      expect(A.origin.length).to.equal(67)
    })

    it('throws if not extended', () => {
      expect(() => new Jig()).to.throw()
      expectNoAction()
    })

    it('throws if constructor method exists', () => {
      class A extends Jig { constructor () { super(); this.n = 1 } }
      expect(() => new A()).to.throw('Jig must use init() instead of constructor()')
      expectNoAction()
    })

    it('should call init method with constructor args', () => {
      class A extends Jig { init (a, b) { this.a = a; this.b = b } }
      const a = new A(1, 'z')
      expectAction(a, 'init', [1, 'z'], [], [a], [])
      expect(a.a).to.equal(1)
      expect(a.b).to.equal('z')
    })

    it('should all supers', async () => {
      class A extends Jig { f () { this.a = true }}
      class B extends A { f () { super.f(); this.b = true }}
      class C extends B { f () { super.f(); this.c = true }}
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      c.f()
      expectAction(c, 'f', [], [c], [c], [])
      expect(c.a).to.equal(true)
      expect(c.b).to.equal(true)
      expect(c.c).to.equal(true)
    })
  })

  describe('sandbox', () => {
    it('should throw if access external variables', () => {
      let n = 1 // eslint-disable-line
      class A extends Jig { init () { n = 2 } }
      expect(() => new A()).to.throw()
      expectNoAction()
      global.x = 1 // eslint-disable-line
      class B extends Jig { init () { x = 2 } } // eslint-disable-line
      expect(() => new B()).to.throw()
      expectNoAction()
      delete global.x
    })

    it('should throw if access jig control', () => {
      class A extends Jig { init () { JigControl.stack.push(1) } } // eslint-disable-line
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('should throw if access globals', () => {
      class A extends Jig {
        isUndefined (x) {
          if (typeof window !== 'undefined') return typeof window[x] === 'undefined'
          if (typeof global !== 'undefined') return typeof global[x] === 'undefined'
          return true
        }
      }
      const a = new A()
      const bad = ['Date', 'Math', 'eval', 'XMLHttpRequest', 'FileReader', 'WebSocket', 'setTimeout', 'setInterval']
      bad.forEach(x => expect(a.isUndefined(x)).to.equal(true))
    })

    it('should throw useful error when creating date', () => {
      class A extends Jig { createDate () { return new Date() } }
      const a = new A()
      expect(() => a.createDate()).to.throw('Hint: Date is disabled inside jigs because it is non-deterministic.')
    })
  })

  describe('instanceof', () => {
    it('should match basic jigs', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a).to.be.instanceOf(A)
      expect(a).to.be.instanceOf(Jig)
    })

    it('should match class extensions', () => {
      class A extends Jig { }
      class B extends A { }
      class C extends Jig { }
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      expect(b).to.be.instanceOf(A)
      expect(b).to.be.instanceOf(B)
      expect(b).to.be.instanceOf(Jig)
      expect(c).not.to.be.instanceOf(B)
      expect(c).to.be.instanceOf(Jig)
    })

    it('should not match non-instances', () => {
      expect(new class { }()).not.to.be.instanceOf(Jig)
      expect(new class { }() instanceof Jig).to.equal(false)
    })

    it('should support searching owner for an uninstalled class', async () => {
      class A extends Jig { }
      class B extends Jig { }
      const a = new A() // eslint-disable-line
      await a.sync()
      run.owner.jigs.find(jig => jig instanceof B)
    })

    it('should match loaded instances', async () => {
      class A extends Jig { }
      const a = new A()
      await run.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      expect(a2 instanceof A).to.equal(true)
    })

    it('should not match prototypes', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.constructor.prototype instanceof Jig).to.equal(false)
      expect(Object.getPrototypeOf(a) instanceof Jig).to.equal(false)
    })
  })

  describe('init', () => {
    it('should throw if called externally', () => {
      class A extends Jig { init (n) { this.n = n } }
      const a = new A(5)
      expectAction(a, 'init', [5], [], [a], [])
      expect(() => a.init(6)).to.throw()
      expectNoAction()
    })

    it('should throw if called internally', () => {
      class A extends Jig {
        init (n) { this.n = n }

        f (n) { this.init(n) }
      }
      const a = new A(5)
      expectAction(a, 'init', [5], [], [a], [])
      expect(() => a.f(6)).to.throw()
      expectNoAction()
    })

    it('should throw if init returns a value', async () => {
      class A extends Jig { init () { return {} }}
      expect(() => new A()).to.throw()
    })
  })

  describe('sync', () => {
    it('should set origins and locations on class and instance', async () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const a2 = await a.sync()
      expect(a).to.equal(a2)
      expect(A.origin.length).to.equal(67)
      expect(A.origin.endsWith('_o1')).to.equal(true)
      expect(A.location.length).to.equal(67)
      expect(A.location.endsWith('_o1')).to.equal(true)
      expect(a.origin.length).to.equal(67)
      expect(a.origin.endsWith('_o2')).to.equal(true)
      expect(a.location.length).to.equal(67)
      expect(a.location.endsWith('_o2')).to.equal(true)
    })

    it('should throw if called internally', () => {
      class A extends Jig { init () { this.sync() } }
      class B extends Jig { f () { this.sync() } }
      expect(() => new A()).to.throw()
      expectNoAction()
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f()).to.throw()
      expectNoAction()
    })

    it('should throw if override sync', () => {
      class A extends Jig { sync () { } }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('should forward sync', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      await run.sync()
      const a2 = await run2.load(a.location)
      a2.set(1)
      a2.set(2)
      await a2.sync()
      run.activate()
      expect(a.x).to.equal(undefined)
      await a.sync()
      expect(a.x).to.equal(2)
    })

    it('should forward sync inner jigs', async () => {
      class Store extends Jig { set (x, y) { this[x] = y } }
      const a = new Store()
      expectAction(a, 'init', [], [], [a], [])
      const b = new Store()
      expectAction(b, 'init', [], [], [b], [])
      a.set('b', b)
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const b2 = await run2.load(b.location)
      b2.set('n', 1)
      await b2.sync()
      run.activate()
      expect(a.b.n).to.equal(undefined)
      await a.sync()
      expect(a.b.n).to.equal(1)
    })

    it('should forward sync circularly referenced jigs', async () => {
      class A extends Jig { setB (b) { this.b = b } }
      class B extends Jig { setA (a) { this.a = a } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      a.setB(b)
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      b2.setA(a2)
      await b2.sync()
      run.activate()
      expect(a.b.a).to.equal(undefined)
      await a.sync()
      expect(a.b.a.location).to.equal(a.location)
    })

    it('should support disabling forward sync', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      a2.set(1)
      await a2.sync()
      run.activate()
      expect(a.x).to.equal(undefined)
      await a.sync({ forward: false })
      expect(a.x).to.equal(undefined)
    })

    it('should throw if forward sync is unsupported', async () => {
      class A extends Jig { }
      const a = new A()
      await a.sync() // pending transactions must publish first
      const oldFetch = run.blockchain.fetch
      run.blockchain.fetch = async (...args) => {
        const tx = await oldFetch.call(run.blockchain, ...args)
        tx.outputs.forEach(output => delete output.spentTxId)
        tx.outputs.forEach(output => delete output.spentIndex)
        tx.outputs.forEach(output => delete output.spentHeight)
        return tx
      }
      await expect(a.sync()).to.be.rejectedWith('Failed to forward sync jig')
      run.blockchain.fetch = oldFetch
    })

    it('should throw if attempt to update an old state', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.privkey })
      const a2 = await run2.load(a.location)
      a2.set(1)
      await a2.sync()
      run.activate()
      a.set(2)
      await expect(a.sync()).to.be.rejectedWith('tx input 0 missing or spent')
      expect(a.x).to.equal(1)
    })

    it('should throw if spentTxId is missing', async () => {
      class A extends Jig { }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const tx = await run.blockchain.fetch(a.location.slice(0, 64))
      tx.outputs[2].spentTxId = '123'
      tx.outputs[2].spentIndex = 0
      await expect(a.sync()).to.be.rejectedWith('tx not found')
    })

    it('should throw if spentTxId is incorrect', async () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      await run.sync()
      const tx = await run.blockchain.fetch(a.location.slice(0, 64))
      tx.outputs[2].spentTxId = b.location.slice(0, 64)
      tx.outputs[2].spentIndex = 0
      await expect(a.sync()).to.be.rejectedWith('Blockchain API returned an incorrect spentTxId')
    })

    it('should not throw if sync jig updated by another', async () => {
      class A extends Jig {
        set (x) { this.x = x }
      }
      class B extends Jig {
        init (a) { this.a = a }
        setA (x) { this.a.set(x) }
      }
      const a = new A()
      const b = new B(a)
      b.setA(1)
      await run.sync()
      const a2 = await run.load(a.origin)
      await expect(a2.sync()).not.to.be.rejected
    })
  })

  describe('method', () => {
    it('should support passing null in args', async () => {
      class Dragon extends Jig {
        init (lair) {
          this.lair = lair
        }
      }
      const dragon = new Dragon(null)
      await dragon.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const dragon2 = await run2.load(dragon.location)
      expect(dragon).to.deep.equal(dragon2)
    })

    it('should support swapping inner jigs', () => {
      class A extends Jig {
        setX (a) { this.x = a }

        setY (a) { this.y = a }

        swapXY () { const t = this.x; this.x = this.y; this.y = t }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      const c = new A()
      expectAction(c, 'init', [], [], [c], [])
      a.setX(b)
      expectAction(a, 'setX', [b], [a], [a], [])
      a.setY(c)
      expectAction(a, 'setY', [c], [a], [a], [])
      a.swapXY()
      expectAction(a, 'swapXY', [], [a], [a], [a])
    })

    it('should restore old state if method throws', () => {
      class Outer extends Jig { setN () { this.n = 1 } }
      class Inner extends Jig { setZ () { this.z = 1 } }
      class Revertable extends Jig {
        init () {
          this.n = 1
          this.arr = ['a', { b: 1 }]
          this.self = this
          this.inner = new Inner()
        }

        methodThatThrows (outer) {
          outer.setN()
          this.n = 2
          this.arr[2].b = 2
          this.arr.push(3)
          this.inner.setZ()
          throw new Error()
        }
      }
      Revertable.deps = { Inner }
      const main = new Revertable()
      expectAction(main, 'init', [], [], [main, main.inner], [])
      const outer = new Outer()
      expectAction(outer, 'init', [], [], [outer], [])
      expect(() => main.methodThatThrows(outer)).to.throw()
      expectNoAction()
      expect(main.n).to.equal(1)
      expect(main.arr).to.deep.equal(['a', { b: 1 }])
      expect(main.self).to.equal(main)
      expect(main.inner.z).to.equal(undefined)
      expect(outer.n).to.equal(undefined)
    })

    it('should throw if swallow internal errors', () => {
      class B extends Jig { init () { throw new Error('some error message') } }
      class A extends Jig { f () { try { return new B() } catch (e) { } } }
      A.deps = { B }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw('internal errors must not be swallowed\n\nError: some error message')
      expectNoAction()
    })

    it('should support calling static helpers', () => {
      class Preconditions { static checkArgument (b) { if (!b) throw new Error() } }
      class A extends Jig { set (n) { $.checkArgument(n > 0); this.n = n } } // eslint-disable-line
      A.deps = { $: Preconditions }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.set(0)).to.throw()
      expectNoAction()
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
    })

    it('should throw if set a property directly on another jig in the call stack', () => {
      class A extends Jig {
        setB (b) { this.b = b }

        g () { this.b.n = 1 }
      }
      class B extends Jig {
        setA (a) { this.a = a }

        f () { this.a.g() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      a.setB(b)
      expectAction(a, 'setB', [b], [a], [a], [])
      b.setA(a)
      expectAction(b, 'setA', [a], [b], [b], [])
      expect(() => b.f()).to.throw()
      expectNoAction()
    })

    it('should throw if update on wrong network', async () => {
      class A extends Jig { f () { this.n = 1; return this } }
      const a = await new A().sync()
      createRun({ network: 'test' })
      await expect(a.f().sync()).to.be.rejectedWith('Signature missing for A')
    }).timeout(30000)
  })

  describe('arguments', () => {
    it('should support serializable arguments', () => {
      class A extends Jig { f (...args) { this.args = args } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      a.f(1, 'a', true)
      expectAction(a, 'f', [1, 'a', true], [a], [a], [])
      a.f({ n: 1 }, [1, 2, 3])
      expectAction(a, 'f', [{ n: 1 }, [1, 2, 3]], [a], [a], [])
      a.f({ a: { b: {} } }, { a: [1, 2, 3] })
      expectAction(a, 'f', [{ a: { b: {} } }, { a: [1, 2, 3] }], [a], [a], [])
      a.f(a, [a], { a })
      expectAction(a, 'f', [a, [a], { a }], [a], [a], [])
      a.f(new Set())
      expectAction(a, 'f', [new Set()], [a], [a], [])
      a.f(new Map())
      expectAction(a, 'f', [new Map()], [a], [a], [])
      const g = () => {}
      a.f(g)
      expectAction(a, 'f', [g], [a], [a], [])
      const blob = new (class Blob {})()
      a.f(blob)
      expectAction(a, 'f', [blob], [a], [a], [])
    })

    it('should throw if not arguments not serializable', () => {
      class A extends Jig { f (...args) { this.args = args } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f(NaN)).to.throw('NaN cannot be serialized')
      expectNoAction()
      expect(() => a.f(Infinity)).to.throw('Infinity cannot be serialized')
      expectNoAction()
      expect(() => a.f(Symbol.hasInstance)).to.throw('Symbol(Symbol.hasInstance) cannot be serialized')
    })

    it('should support changing args in method', () => {
      class A extends Jig { f (arr, obj) { arr.pop(); obj.n = 1; this.n = 0 } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f([1], { n: 0 })
      expectAction(a, 'f', [[1], { n: 0 }], [a], [a], [])
    })

    it('should allow checking jig constructors', async () => {
      class A extends Jig { init (b) { this.test = b.constructor === B } }
      class B extends Jig { init () { this.x = A.owner } }
      A.deps = { B }
      B.deps = { A }
      await run.deploy(A)
      await run.deploy(B)
      const b = new B()
      const a = new A(b)
      expect(b.x).to.equal(run.owner.pubkey)
      expect(a.test).to.equal(true)
      await run.sync()
      run.deactivate()
      const run2 = createRun({ owner: run.owner.privkey, blockchain: run.blockchain })
      await run2.sync()
    })
  })

  describe('get', () => {
    it('should not publish transaction if no changes', () => {
      class B extends Jig {
        set (n) { this.n = n }

        get (n) { return this.n + n }
      }
      class A extends B {
        init () { this.b = new B(); this.b.set(1) }

        get (n) { return this.b.get(4) + super.get(n) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a, a.b], [a])
      a.set(2)
      expectAction(a, 'set', [2], [a], [a], [])
      expect(a.get(3)).to.equal(10)
      expectNoAction()
    })

    it('should not spend reads', () => {
      class B extends Jig { }
      class A extends Jig { init (b) { this.n = b.n } }
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const a = new A(b)
      expectAction(a, 'init', [b], [], [a], [b])
    })

    it('should support gettesr', async () => {
      class A extends Jig {
        init () { this.n = 1 }

        get nplusone () { return this.n + 1 }
      }
      class B extends Jig {
        init (a) { this.n = a.nplusone }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.nplusone).to.equal(2)
      const b = new B(a)
      expectAction(b, 'init', [a], [], [b], [a])
      expect(b.n).to.equal(2)
      await run.sync()
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(2)
    })
  })

  describe('spending rules', () => {
    it('should spend all callers when a jig changes', async () => {
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig { set (a, n) { a.set(n); return this } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.set(a, 2)
      expectAction(b, 'set', [a, 2], [b, a], [b, a], [])
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should spend all callers for instantiation', async () => {
      class A extends Jig { create () { return new A() } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const a2 = a.create()
      expectAction(a, 'create', [], [a], [a, a2], [])
      await run.sync()
      await run.load(a2.location)
    })

    it('should spend all callers across multiple call stacks', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { f (a, c) { a.set(1); c.g(a) } }
      class C extends Jig { g (a) { a.set(2) } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      b.f(a, c)
      expectAction(b, 'f', [a, c], [b, c, a], [b, c, a], [])
      expect(a.n).to.equal(2)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should support calling self', async () => {
      class A extends Jig {
        g (b, c) { b.h(this, c) }

        set (n) { this.n = n }
      }
      class B extends Jig {
        f (a, c) { a.g(this, c) }

        h (a, c) { c.set(a, 1) }
      }
      class C extends Jig {
        set (a, n) { a.set(n) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      b.f(a, c)
      expectAction(b, 'f', [a, c], [b, a, c], [b, a, c], [])
      expect(a.n).to.equal(1)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(1)
    })

    // TODO: Long term, this probably should not spend if we can figure out a way to do it.
    it('should spend reads uninvolved in the change', async () => {
      class A extends Jig {
        set (n) { this.n = n }

        get () { return this.n }
      }
      class B extends Jig {
        f (a, c) { a.set(1); a.set(c.get(a) + 1) }
      }
      class C extends Jig {
        get (a) { return a.get() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      const c = new C()
      expectAction(c, 'init', [], [], [c], [])
      b.f(a, c)
      expectAction(b, 'f', [a, c], [b, c, a], [b, c, a], [a])
      expect(a.n).to.equal(2)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })
  })

  describe('non-spending reads', () => {
    it('should reference but not spend reads', async () => {
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig {
        init () { this.a = new A(3) }

        set (a) { this.n = a.n + this.a.n }
      }
      B.deps = { A }
      const b = new B()
      expectAction(b, 'init', [], [], [b, b.a], [])
      const a = new A(2)
      expectAction(a, 'init', [2], [], [a], [])
      b.set(a)
      expect(b.n).to.equal(5)
      expectAction(b, 'set', [a], [b], [b], [a, b, b.a])
      await run.sync()
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(5)
    })

    it('should throw if read different instances of same jig', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      class B extends Jig {
        init (a) { this.a = a }

        apply (a2) { this.n = this.a + a2.n }
      }
      const b = new B(a)
      expect(() => b.apply(a2)).to.throw('Inconsistent worldview')
    })

    it('should throw if read different instance than written', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a, a2) { this.n = a.n; a2.set(3) } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      const b = new B()
      expect(() => b.apply(a, a2)).to.throw('Inconsistent worldview')
    })

    it('should throw if read different instances of a jig across a batch', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      run.transaction.begin()
      const b = new B()
      const b2 = new B()
      b.apply(a)
      b2.apply(a2)
      run.transaction.end()
      await expect(run.sync()).to.be.rejectedWith(`read different locations of same jig ${a.origin}`)
    })

    it('should throw if attempt to read old version of jig', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      class B extends Jig { apply (a) { this.n = a.n } }
      const b = new B()
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(1)
      b.apply(a)
      await expect(run.sync()).to.be.rejectedWith(`Read ${a.location} is not the latest. Must sync() jigs`)
    })

    it('should throw if unknown whether read is stale', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      const b = new B()
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(1)
      const oldFetch = run.blockchain.fetch
      try {
        run.blockchain.fetch = async txid => {
          const tx = await oldFetch.call(run.blockchain, txid)
          if (txid === a.origin.slice(0, 64)) {
            const vout = parseInt(a.origin.slice(66))
            delete tx.outputs[vout].spentTxId
            delete tx.outputs[vout].spentIndex
            delete tx.outputs[vout].spentHeight
          }
          return tx
        }
        b.apply(a)
        await expect(run.sync()).to.be.rejectedWith(`Read ${a.location} may not be latest. Blockchain did not return spentTxId. Aborting`)
      } finally { run.blockchain.fetch = oldFetch }
    })

    it('should throw if read is stale during load', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      const b = new B()
      a.set(1)
      await run.sync()
      b.apply(a)
      const a2 = await run.load(a.location)
      a2.set(2)
      await run.sync()
      // create a new run to not use the state cache
      const run2 = createRun({ blockchain: run.blockchain, state: new Run.StateCache() })
      const oldFetch = run.blockchain.fetch
      try {
        run2.blockchain.fetch = async txid => {
          const tx = await oldFetch.call(run.blockchain, txid)
          if (txid !== a2.location.slice(0, 64)) tx.time = Date.now() - 6 * 60 * 60 * 1000
          if (txid === b.location.slice(0, 64)) tx.time = Date.now()
          return tx
        }
        await expect(run2.load(b.location)).to.be.rejectedWith(`${a.location} is stale. Aborting.`)
      } finally { run.blockchain.fetch = oldFetch }
    })
  })

  describe('uint8array', () => {
    it('should match instanceof checks', async () => {
      class A extends Jig {
        set () { this.buf = Uint8Array.from([1, 2, 3]) }

        check1 (buf) { return buf instanceof Uint8Array }

        check2 () { return this.buf instanceof Uint8Array }
      }
      class B extends A {
        check3 () { return this.buf instanceof Uint8Array }
      }
      const a = new A()
      a.set()
      expect(a.check1(new Uint8Array([1, 2, 3]))).to.equal(true)
      const b = new B()
      b.set()
      await b.sync()
      const b2 = await run.load(b.location)
      expect(b.buf.length).to.equal(b2.buf.length)
      for (let i = 0; i < b.buf.length; i++) {
        expect(b.buf[i]).to.equal(b2.buf[i])
      }
    })

    it('should support gets and returns', async () => {
      class A extends Jig {
        init () { this.buf = new Uint8Array([1, 2, 3]) }

        get buf2 () { return this.buf }

        getBuf () { return this.buf }
      }
      const a = new A()
      function testBuf (buf) {
        expect(buf.length).to.equal(3)
        expect(buf[0]).to.equal(1)
        expect(buf[1]).to.equal(2)
        expect(buf[2]).to.equal(3)
        expect(buf.constructor === run.code.intrinsics.default.Uint8Array).to.equal(true)
      }
      testBuf(a.buf)
      testBuf(a.buf2)
      testBuf(a.getBuf())
      await run.sync()
      const a2 = await run.load(a.location)
      testBuf(a2.buf)
      testBuf(a2.buf2)
      testBuf(a2.getBuf())
    })
  })

  describe('set', () => {
    it('should throw if unserializable value', () => {
      class A extends Jig {
        f () { this.n = NaN }

        g () { this.n = Symbol.hasInstance }

        h () { this.n = -Infinity }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw('NaN cannot be serialized')
      expectNoAction()
      expect(typeof a.n).to.equal('undefined')
      expect(() => a.g()).to.throw('Symbol(Symbol.hasInstance) cannot be serialized')
      expectNoAction()
      expect(typeof a.n).to.equal('undefined')
      expect(() => a.h()).to.throw('-Infinity cannot be serialized')
      expectNoAction()
      expect(typeof a.n).to.equal('undefined')
    })

    it('should throw if set is external', () => {
      class A extends Jig { }
      class B extends Jig { init () { this.a = new A(); this.a.n = 1 }}
      B.deps = { A }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.n = 1 }).to.throw()
      expectNoAction()
      expect(() => new B()).to.throw()
      expectNoAction()
    })

    it('should throw if attempt to override methods', () => {
      class A extends Jig {
        f () { }

        g () { this.f = 1 }

        h () { this.sync = [] }

        i () { this.init = 'hello' }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.g()).to.throw()
      expectNoAction()
      expect(() => a.h()).to.throw()
      expectNoAction()
      expect(() => a.i()).to.throw()
      expectNoAction()
    })

    it('should throw if set properties on methods', () => {
      class A extends Jig {
        init () { this.arr = [] }

        f () { this.sync.n = 1 }

        g () { this.arr.filter.n = 2 }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw('must not set n on method sync')
      expectNoAction()
      expect(() => a.g()).to.throw('must not set n on method filter')
      expectNoAction()
    })

    it('should not create transaction if no value change', () => {
      class A extends Jig {
        init () { this.n = 1 }

        set (n) { this.n = n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.set(1)
      expectNoAction()
    })
  })

  describe('delete', () => {
    it('should support deleting internally', () => {
      class A extends Jig {
        init () { this.n = 1 }

        delete () { delete this.n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.delete()
      expectAction(a, 'delete', [], [a], [a], [])
      expect(a.n).to.equal(undefined)
    })

    it('should throw if delete externally', () => {
      class A extends Jig { init () { this.n = 1 }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.n }).to.throw()
      expectNoAction()
    })

    it('should throw if delete method', () => {
      class A extends Jig { f () { } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.sync }).to.throw()
    })

    it('should not create transaction if delete did not change object', () => {
      class A extends Jig { delete () { this.n = 1; delete this.n } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.delete()
      expectNoAction()
    })
  })

  describe('getPrototypeOf', () => {
    it('should not spend or reference jigs', () => {
      class A extends Jig {
        f () { this.a2 = new A() }

        g () {
          this.x = this.a2 instanceof A
          this.y = this.a2.constructor.prototype === 'hello'
          this.z = Object.getPrototypeOf(this.a2) === 'world'
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f()
      expectAction(a, 'f', [], [a], [a, a.a2], [])
      a.g()
      expectAction(a, 'g', [], [a], [a], [a])
    })
  })

  describe('setPrototypeOf', () => {
    it('should throw if change prototype', () => {
      class A extends Jig { f () { Reflect.setPrototypeOf(this, Object) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Reflect.setPrototypeOf(a, Object)).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('preventExtensions', () => {
    it('should throw if prevent extensions', () => {
      class A extends Jig { f () { Object.preventExtensions(this) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Object.preventExtensions(a)).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('defineProperty', () => {
    it('should throw is define property', () => {
      class A extends Jig { f () { Object.defineProperty(this, 'n', { value: 1 }) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => Object.defineProperty(a, 'n', { value: 1 })).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })
  })

  describe('has', () => {
    it('should add non-permanent properties to reads', () => {
      class A extends Jig { init () { this.arr = [1] }}
      class B extends Jig {
        f (a) { this.x = 'n' in a }

        g (a) { this.y = 'arr' in a }

        h (a) { this.z = '1' in a.arr }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [a])
      b.g(a)
      expectAction(b, 'g', [a], [b], [b], [a])
      b.h(a)
      expectAction(b, 'h', [a], [b], [b], [a])
    })

    it('should not add permanant properties to reads', () => {
      class A extends Jig { f () {} }
      class B extends Jig {
        f (a) {
          this.x1 = 'f' in a
          this.x2 = 'origin' in a
          this.x3 = 'location' in a
          this.x4 = 'owner' in a
          this.x5 = 'satoshis' in a
          this.x6 = 'sync' in a
          this.x7 = 'constructor' in a
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [])
    })

    it('should support has for undefined values', () => {
      class A extends Jig {
        init () { this.x = undefined }
      }
      const a = new A()
      expect('x' in a).to.equal(true)
    })
  })

  describe('ownKeys', () => {
    it('should add to reads if call ownKeys', () => {
      class A extends Jig {}
      class B extends Jig { f (a) { this.x = Reflect.ownKeys(a) }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [a])
    })
  })

  describe('getOwnPropertyDescriptor', () => {
    it('should add to reads if call getOwnPropertyDescriptor', () => {
      class A extends Jig { init () { this.n = 1 }}
      class B extends Jig { f (a) { this.x = Object.getOwnPropertyDescriptor(a, 'n') }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.f(a)
      expectAction(b, 'f', [a], [b], [b], [a])
    })
  })

  describe('array', () => {
    it('should support calling push internally', async () => {
      class A extends Jig {
        init () { this.a = [] }

        add (n) { this.a.push(n) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.add(1)
      expect(a.a[0]).to.equal(1)
      expectAction(a, 'add', [1], [a], [a], [a])
    })

    it('should throw if change array externally', () => {
      class A extends Jig {
        init () { this.a = [3, 1, 2, 5, 0] }

        add (n) { this.a.push(n) }
      }
      class B extends Jig { init () { new A().a.push(1) } }
      B.deps = { A }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const err = func => `internal method ${func} may not be called to change state`
      const writeOps = [
        () => expect(() => a.a.copyWithin(1)).to.throw(err('copyWithin')),
        () => expect(() => a.a.pop()).to.throw(err('pop')),
        () => expect(() => a.a.push(1)).to.throw(err('push')),
        () => expect(() => a.a.reverse()).to.throw(err('reverse')),
        () => expect(() => a.a.shift()).to.throw(err('shift')),
        () => expect(() => a.a.sort()).to.throw(err('sort')),
        () => expect(() => a.a.splice(0, 1)).to.throw(err('splice')),
        () => expect(() => a.a.unshift(4)).to.throw(err('unshift')),
        () => expect(() => a.a.fill(0)).to.throw(err('fill')),
        () => expect(() => new B()).to.throw(err('push'))
      ]
      writeOps.forEach(op => { op(); expectNoAction() })
    })

    it('should support read-only methods without spending', () => {
      class A extends Jig { init () { this.a = [] } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const readOps = [
        () => expect(a.a.length).to.equal(0),
        () => expect(() => a.a.concat([1])).not.to.throw(),
        () => expect(() => a.a.entries()).not.to.throw(),
        () => expect(() => a.a.every(() => true)).not.to.throw(),
        () => expect(() => a.a.filter(() => true)).not.to.throw(),
        () => expect(() => a.a.find(() => true)).not.to.throw(),
        () => expect(() => a.a.findIndex(() => true)).not.to.throw(),
        () => expect(() => a.a.forEach(() => {})).not.to.throw(),
        () => expect(() => a.a.includes(1)).not.to.throw(),
        () => expect(() => a.a.indexOf(1)).not.to.throw(),
        () => expect(() => a.a.join()).not.to.throw(),
        () => expect(() => a.a.keys()).not.to.throw(),
        () => expect(() => a.a.lastIndexOf(1)).not.to.throw(),
        () => expect(() => a.a.map(() => true)).not.to.throw(),
        () => expect(() => a.a.reduce(() => true, 0)).not.to.throw(),
        () => expect(() => a.a.reduceRight(() => true, 0)).not.to.throw(),
        () => expect(() => a.a.slice(0)).not.to.throw(),
        () => expect(() => a.a.some(() => true)).not.to.throw(),
        () => expect(() => a.a.toLocaleString()).not.to.throw(),
        () => expect(() => a.a.toString()).not.to.throw()
      ]
      readOps.forEach(op => { op(); expectNoAction() })

      // TODO: test no change
    })

    it('should support iteration', () => {
      class A extends Jig {
        init () { this.a = [] }

        add (x) { this.a.push(x) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.add(1)
      expectAction(a, 'add', [1], [a], [a], [a])
      a.add(2)
      expectAction(a, 'add', [2], [a], [a], [a])
      expect(Array.from(a.a)).to.deep.equal([1, 2])
      expectNoAction()
      const e = [1, 2]
      for (const x of a.a) { expect(x).to.equal(e.shift()) }
      expectNoAction()
    })

    it('should throw if overwrite or delete method on array', () => {
      class A extends Jig {
        init () { this.a = [] }

        f () { this.a.filter = 2 }

        g () { delete this.a.filter }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f()).to.throw()
      expectNoAction()
      expect(() => a.g()).to.throw()
      expectNoAction()
    })
  })

  describe('owner', () => {
    it('should be defined before init is called', () => {
      class A extends Jig { init () { this.ownerAtInit = this.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [a])
      expect(a.ownerAtInit).to.equal(run.owner.pubkey)
    })

    it('should be assigned to creator', async () => {
      class A extends Jig {
        send (to) { this.owner = to }

        createA () { return new A() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const bsvNetwork = Run._util.bsvNetwork(run.blockchain.network)
      const privateKey = new PrivateKey(bsvNetwork)
      const pubkey = privateKey.publicKey.toString()
      a.send(pubkey)
      expectAction(a, 'send', [pubkey], [a], [a], [])
      await a.sync()
      const run2 = hookStoreAction(createRun({ blockchain: run.blockchain, owner: privateKey }))
      const a2 = await run2.load(a.location)
      const a3 = a2.createA()
      expectAction(a2, 'createA', [], [a2], [a2, a3], [])
      await a2.sync()
      expect(a3.owner).to.equal(pubkey)
    })

    it('should throw if not set to a public key', async () => {
      class A extends Jig { send (owner) { this.owner = owner }}
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const publicKey = new PrivateKey().publicKey
      expect(() => a.send(publicKey)).to.throw('is not deployable')
      expect(() => a.send(JSON.parse(JSON.stringify(publicKey)))).to.throw('owner must be a pubkey string')
      expect(() => a.send('123')).to.throw('owner is not a valid public key')
      expectNoAction()
    })

    it('should throw if delete owner', () => {
      class A extends Jig { f () { delete this.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.owner }).to.throw()
      expectNoAction()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })

    it('should throw if set owner externally', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.owner = '123' }).to.throw()
      expectNoAction()
    })

    it('should throw if define owner method', () => {
      class A extends Jig { owner () {} }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('should add to reads', () => {
      class A extends Jig { f (a) { this.x = a.owner }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const a2 = new A()
      expectAction(a2, 'init', [], [], [a2], [])
      a.f(a2)
      expectAction(a, 'f', [a2], [a], [a], [a2])
    })

    it('should support only class owner creating instances', async () => {
      const privkey = new PrivateKey()
      class A extends Jig {
        init (owner) {
          if (this.owner !== A.owner) throw new Error()
          this.owner = owner
        }
      }
      const run = createRun()
      const a = new A(privkey.publicKey.toString())
      await run.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain, owner: privkey })
      await run2.load(a.location)
    })
  })

  describe('satoshis', () => {
    it('should be defined before init', () => {
      class A extends Jig { init () { this.satoshisAtInit = this.satoshis }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [a])
      expect(a.satoshisAtInit).to.equal(0)
    })

    it('should support setting to valid numbers', async () => {
      class A extends Jig { f (s) { this.satoshis = s }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      a.f(100000)
      expectAction(a, 'f', [100000], [a], [a], [])
      a.f(0)
      expectAction(a, 'f', [0], [a], [a], [])
      await run.sync()
    })

    it('should throw if set to invalid number', () => {
      class A extends Jig {
        f (s) { this.satoshis = s }

        g () { this.satoshis = NaN }

        h () { this.satoshis = Infinity }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.f(-1)).to.throw()
      expectNoAction()
      expect(() => a.f('1')).to.throw()
      expectNoAction()
      expect(() => a.f(100000001)).to.throw()
      expectNoAction()
      expect(() => a.g()).to.throw()
      expectNoAction()
      expect(() => a.h()).to.throw()
      expectNoAction()
    })

    it('should load satoshis from mocknet', async () => {
      class A extends Jig { f (s) { this.satoshis = s }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(50)
      expectAction(a, 'f', [50], [a], [a], [])
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.satoshis).to.equal(50)
    })

    it('should load satoshis from testnet', async () => {
      const run = createRun({ network: 'test' })
      class A extends Jig { f (s) { this.satoshis = s }}
      const a = new A()
      a.f(50)
      await run.sync()
      await run.load(a.location)
    }).timeout(10000)

    it('should throw if create satoshis method', () => {
      class A extends Jig { owner () {} }
      expect(() => new A()).to.throw()
      expectNoAction()
    })

    it('should throw if delete satoshis property', () => {
      class A extends Jig { f () { delete this.satoshis }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.satoshis }).to.throw()
      expectNoAction()
      expect(() => a.f()).to.throw()
      expectNoAction()
    })

    it('should throw if set externally', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.satoshis = 1 }).to.throw()
      expectNoAction()
    })

    it('should add to purse when satoshis decreased', async () => {
      class A extends Jig { f (satoshis) { this.satoshis = satoshis; return this }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await a.f(10000).sync()
      expectAction(a, 'f', [10000], [a], [a], [])
      const before = await run.purse.balance()
      await a.f(0).sync()
      expectAction(a, 'f', [0], [a], [a], [])
      const after = await run.purse.balance()
      expect(after - before > 8000).to.equal(true)
    })
  })

  describe('misc', () => {
    it('should support custom toJSON method', () => {
      class A extends Jig { toJSON () { return [1, 2, 3] } }
      const a = new A()
      expect(JSON.stringify(a)).to.equal('[1,2,3]')
      expectAction(a, 'init', [], [], [a], [])
    })

    it('should throw if $class or $ref property', () => {
      class A extends Jig { init () { this.o = { $class: 'undefined' } } }
      expect(() => new A()).to.throw()
      expectNoAction()
      class B extends Jig { init () { this.o = { $ref: '123' } } }
      expect(() => new B()).to.throw()
      expectNoAction()
    })

    it('should throw if $class or $ref arg', () => {
      class A extends Jig { init (o) { this.o = o } }
      expect(() => new A({ $class: 'undefined' })).to.throw()
      expectNoAction()
      expect(() => new A({ $ref: '123' })).to.throw()
      expectNoAction()
    })

    it('should make unusable when deploy fails', async () => {
      const oldPay = run.purse.pay
      run.purse.pay = async tx => tx
      class A extends Jig {
        init () { this.n = 1 }

        f () {}
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await expect(a.sync()).to.be.rejected
      expect(() => a.origin).to.throw()
      expect(() => a.n).to.throw()
      expect(() => Reflect.ownKeys(a)).to.throw()
      expect(() => a.f()).to.throw()
      expectNoAction()
      try {
        console.log(a.n)
      } catch (e) {
        expect(e.toString().startsWith('Error: Deploy failed')).to.equal(true)
        expect(e.toString().indexOf('Error: Broadcast failed, tx has no inputs')).not.to.equal(-1)
      } finally {
        run.purse.pay = oldPay
      }
    })

    it('should throw if transaction is unpaid', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = await new A().sync()
      const oldPay = run.purse.pay
      run.purse.pay = async (tx) => { return tx }
      const a2 = new A()
      // test when just init, no inputs
      expectAction(a2, 'init', [], [], [a2], [])
      const suggestion = 'Hint: Is the purse funded to pay for this transaction?'
      await expect(run.sync()).to.be.rejectedWith(`Broadcast failed, tx has no inputs\n\n${suggestion}`)
      // test with a spend, pre-existing inputs
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
      await expect(run.sync()).to.be.rejectedWith(`Broadcast failed, tx fee too low\n\n${suggestion}`)
      run.purse.pay = oldPay
    })

    it('should throw if owner signature is missing', async () => {
      class A extends Jig {
        init () { this.n = 1 }

        f () { this.n = 2 }
      }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const oldSign = run.owner.sign
      run.owner.sign = async (tx) => { return tx }
      a.f()
      await expect(a.sync()).to.be.rejectedWith('Signature missing for A')
      run.owner.sign = oldSign
    })

    it('should pass reads and writes in correct order', async () => {
      class B extends Jig {
        init (n) { this.n = n }

        inc () { this.n += 1 }
      }
      class A extends Jig {
        add (arr) {
          arr[1].inc()
          arr[0].inc()
          this.n = arr.reduce((s, t) => s + t.n, 0)
          return [new B(1), new B(2)]
        }
      }
      A.deps = { B }
      const b = new B(1)
      expectAction(b, 'init', [1], [], [b], [])
      const b2 = new B(2)
      expectAction(b2, 'init', [2], [], [b2], [])
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const [b3, b4] = a.add([b, b2])
      expectAction(a, 'add', [[b, b2]], [a, b2, b], [a, b2, b, b3, b4], [b2, b])
    })

    it('should detect uncaught errors', async () => {
      class A extends Jig { f () { this.n = 1 } }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      const oldBroadcast = run.blockchain.broadcast
      run.blockchain.broadcast = async (tx) => { throw new Error() }
      expect(a.n).to.equal(undefined)
      a.f()
      expectAction(a, 'f', [], [a], [a], [])
      expect(a.n).to.equal(1)
      await new Promise(resolve => {
        setTimeout(() => {
          let completed = false
          try { a.origin } catch (e) { completed = true } // eslint-disable-line
          if (completed) {
            run.blockchain.broadcast = oldBroadcast
            expect(() => a.origin).to.throw('A previous update failed')
            expect(() => a.location).to.throw('A previous update failed')
            expect(() => a.owner).to.throw('A previous update failed')
            expect(() => a.n).to.throw('A previous update failed')
            expect(() => a.f()).to.throw('A previous update failed')
            resolve()
          }
        }, 1)
      })
    })

    it('should use unique set', async () => {
      class B extends Jig {}
      class A extends Jig {
        init () { this.set = new Set() }
        add (x) { this.set.add(x) }
      }
      const a = await new A().sync()
      const b = await new B().sync()
      const b2 = await run.load(b.location)
      a.add(b)
      a.add(b2)
      expect(a.set.size).to.equal(1)
      await run.sync()
      await run.load(a.location)
      run.state.cache.clear()
      await run.load(a.location)
    })

    it('should use unique map', async () => {
      class B extends Jig {}
      class A extends Jig {
        init () { this.map = new Map() }
        set (x, y) { this.map.set(x, y) }
      }
      const a = await new A().sync()
      const b = await new B().sync()
      const b2 = await run.load(b.location)
      a.set(b, 1)
      a.set(b2, 2)
      expect(a.map.size).to.equal(1)
      await run.sync()
      await run.load(a.location)
      run.state.cache.clear()
      await run.load(a.location)
    })

    it('should support arbitrary objects', async () => {
      class Store extends Jig { set (x) { this.x = x } }
      const store = new Store()
      class Dragon { }
      store.set(new Dragon())
      await store.sync()
      expect(!!Dragon.location).to.equal(true)
      await run.load(store.location)
      run.state.cache.clear()
      await run.load(store.location)
    })

    it('should support circular objects', async () => {
      class A extends Jig {
        init () {
          this.x = []
          this.x.push(this.x)
        }
      }
      const a = new A()
      await a.sync()
      await run.load(a.location)
      run.state.cache.clear()
      await run.load(a.location)
    })
  })

  describe('mempool chain', () => {
    it('should support long mempool chain for purse', async () => {
      class A extends Jig { }
      for (let i = 0; i < 100; i++) { new A() } // eslint-disable-line
      await run.sync()
    }).timeout(10000)

    it.skip('should support long mempool chain for jig', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      for (let i = 0; i < 100; i++) {
        a.set(i)
        await a.sync()
      }
    })

    it.skip('should support multiple jigs with different length chains', async () => {
      // TODO
    })
  })

  describe('toString', () => {
    it('should return a default value', () => {
      class A extends Jig { }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.toString()).to.equal('[jig A]')
    })

    it('should support overriding toString', () => {
      class A extends Jig { toString () { return 'hello' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(a.toString()).to.equal('hello')
    })
  })

  describe('origin', () => {
    it('throw if read origin before sync', async () => {
      class A extends Jig { f () { this.origin2 = this.origin }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.origin).to.throw('sync required before reading origin')
      expect(() => a.f()).to.throw('sync required before reading origin')
      await a.sync()
      expect(() => a.origin).not.to.throw()
      expect(() => a.f()).not.to.throw()
    })

    it('should support reading internally after sync', async () => {
      class A extends Jig { f () { this.origin2 = this.origin }}
      const a = new A()
      await a.sync()
      expectAction(a, 'init', [], [], [a], [])
      a.f()
      expectAction(a, 'f', [], [a], [a], [])
    })

    it('should throw if delete origin', () => {
      class A extends Jig { f () { delete this.origin }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.origin }).to.throw('must not delete origin')
      expectNoAction()
      expect(() => a.f()).to.throw('must not delete origin')
      expectNoAction()
    })

    it('should throw if set origin', () => {
      class A extends Jig { f () { this.origin = '123' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.origin = '123' }).to.throw('must not set origin')
      expectNoAction()
      expect(() => a.f()).to.throw('must not set origin')
      expectNoAction()
    })

    it('should throw if origin method exists', () => {
      class A extends Jig { origin () {} }
      expect(() => new A()).to.throw('must not override origin')
      expectNoAction()
    })
  })

  describe('location', () => {
    it('should throw if read before sync', async () => {
      class A extends Jig {}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.location).to.throw('sync required before reading location')
      await a.sync()
      expect(() => a.location).not.to.throw()
    })

    it('should support reading internally after sync', async () => {
      class A extends Jig { f () { this.location2 = this.location }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      await a.sync()
      a.f()
      expectAction(a, 'f', [], [a], [a], [a])
      expect(a.location2).to.equal(a.origin)
      expect(() => a.f()).to.throw('sync required before reading location')
      expectNoAction()
      await a.sync()
      const secondLocation = a.location
      a.f()
      expectAction(a, 'f', [], [a], [a], [a])
      expect(a.location2).to.equal(secondLocation)
    })

    // TODO: This is probably possible to support in many cases
    it.skip('should support reading location quickly', async () => {
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      expect(a.location).not.to.throw()
      a.f()
      expect(a.location).not.to.throw()
    })

    it('should throw if delete location', () => {
      class A extends Jig { f () { delete this.location }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { delete a.location }).to.throw('must not delete location')
      expectNoAction()
      expect(() => a.f()).to.throw('must not delete location')
      expectNoAction()
    })

    it('should throw if set location', () => {
      class A extends Jig { f () { this.location = '123' }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => { a.location = '123' }).to.throw('must not set location')
      expectNoAction()
      expect(() => a.f()).to.throw('must not set location')
      expectNoAction()
    })

    it('should throw if location method exists', () => {
      class A extends Jig { location () {} }
      expect(() => new A()).to.throw('must not override location')
      expectNoAction()
    })
  })

  describe('load', () => {
    it('should load single jig', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      a.f([2])
      expectAction(a, 'f', [[2]], [a], [a], [])
      a.f({ n: 3 })
      expectAction(a, 'f', [{ n: 3 }], [a], [a], [])
      await a.sync()
      const a2 = await run.load(a.location)
      expect(a2.n.n).to.equal(3)
    })

    it('should load older state', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      await a.sync()
      const location1 = a.location
      a.f(2)
      expectAction(a, 'f', [2], [a], [a], [])
      await a.sync()
      const a2 = await run.load(location1)
      expect(a2.n).to.equal(1)
    })

    it('should throw if location is bad', async () => {
      class A extends Jig { }
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      await expect(run.load(a.location.slice(0, 64) + '_o0')).to.be.rejected
      await expect(run.load(a.location.slice(0, 64) + '_o3')).to.be.rejected
    })

    it('should support loading jig with multiple updates', async () => {
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig {
        init () { this.a = new A() }

        set (n) { this.n = n; this.a.set(n) }
      }
      B.deps = { A }
      const b = new B()
      expectAction(b, 'init', [], [], [b, b.a], [])
      b.set(2)
      expectAction(b, 'set', [2], [b, b.a], [b, b.a], [b])
      await run.sync()
      const b2 = await run.load(b.location)
      const a2 = await run.load(b.a.location)
      expect(b2.n).to.equal(2)
      expect(a2.n).to.equal(2)
    })

    it('should support loading jigs that updated other jigs', async () => {
      class A extends Jig { set (n) { this.n = n }}
      class B extends Jig { set (n, a) { a.set(n) } }
      B.deps = { A }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      b.set(2, a)
      expectAction(b, 'set', [2, a], [b, a], [b, a], [])
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should support arguments with different instances of the same jig location', async () => {
      class Num extends Jig { init (n) { this.n = n }}
      const a = await new Num(1).sync()
      expectAction(a, 'init', [1], [], [a], [])
      const a2 = await run.load(a.location)
      const a3 = await run.load(a.location)
      class Sum extends Jig { init (x, y) { this.n = x.n + y.n }}
      const sum = new Sum(a2, a3)
      expectAction(sum, 'init', [a2, a3], [], [sum], [a2, a3])
      await run.sync()
      expect(sum.n).to.equal(2)
    })

    it('should throw if pass different locations of same jig as arguments', async () => {
      class A extends Jig { f (n) { this.n = n; return this }}
      const a = await new A().sync()
      expectAction(a, 'init', [], [], [a], [])
      await a.f(1).sync()
      expectAction(a, 'f', [1], [a], [a], [])
      const a2 = await run.load(a.location)
      await a2.f(2).sync()
      expectAction(a2, 'f', [2], [a2], [a2], [])
      class B extends Jig { init (x, y) { this.n = x.n + y.n }}
      expect(() => new B(a, a2)).to.throw()
    })

    it('should support loading instances of extended classes', async () => {
      class A extends Jig { }
      class B extends A { }
      const b = await new B().sync()
      expectAction(b, 'init', [], [], [b], [])
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.load(b.location)
    })

    it('should support reading jigs as arguments', async () => {
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig { init (a) { this.n = a.n } }
      const a = await new A(1).sync()
      expectAction(a, 'init', [1], [], [a], [])
      const b = await new B(a).sync()
      expectAction(b, 'init', [a], [], [b], [a])
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(1)
    })

    it('should add inner jigs to reads', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig {
        init (a) { this.a = a }

        apply () { this.n = this.a.n }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.set(1)
      expectAction(a, 'set', [1], [a], [a], [])
      const b = await new B(a).sync()
      expectAction(b, 'init', [a], [], [b], [])
      a.set(2)
      expectAction(a, 'set', [2], [a], [a], [])
      b.apply()
      expectAction(b, 'apply', [], [b], [b], [b, a])
      expect(b.n).to.equal(2)
      await b.sync()
      const b2 = await run.load(b.location)
      expect(b2.n).to.equal(2)
    })
  })

  describe('state cache', () => {
    it('should cache local updates', async () => {
      class A extends Jig {
        init () { this.undef = undefined }

        set (n) { this.n = n }
      }
      const a = new A()
      const t0 = Date.now()
      for (let i = 0; i < 10; i++) {
        a.set(i)
      }
      const b = new A()
      run.transaction.begin()
      const b2 = new A()
      a.set({ b, b2, A })
      run.transaction.end()
      b.set(1)
      await a.sync()
      const t1 = Date.now()
      await run.load(a.location)
      const t2 = Date.now()
      expect((t1 - t0) / (t2 - t1) > 10).to.equal(true) // Load without state cache is 10x slower

      const run2 = createRun({ blockchain: run.blockchain, state: new Run.StateCache() })
      const t3 = Date.now()
      await run2.load(a.location)
      const t4 = Date.now()
      await run2.load(a.location)
      const t5 = Date.now()
      expect((t4 - t3) / (t5 - t4) > 10).to.equal(true) // Load without state cache is 10x slower
    })
  })

  describe('class props', () => {
    it('should be able to access class properties from instances', async () => {
      class A extends Jig {}
      A.n = 1
      const a = await new A().sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      expect(a2.constructor.n).to.equal(1)
    })

    it('should support reads of class properties from inside jig methods', () => {
      class A extends Jig { f () { this.n = this.constructor.n }}
      A.n = 1
      const a = new A()
      a.f()
      expect(a.n).to.equal(1)
    })

    it('should support reading properties on preset classes', () => {
      class B extends Jig { }
      B.originMocknet = B.locationMocknet = '123'
      B.ownerMocknet = 'abc'
      B.n = 1
      class A extends Jig { init () { this.n = B.n }}
      A.originMocknet = A.locationMocknet = '456'
      A.ownerMocknet = 'def'
      A.deps = { B }
      const a = new A()
      expect(a.n).to.equal(1)
    })
  })

  describe('batch', () => {
    it('should support load of batch with multiple instantiations', async () => {
      class A extends Jig { }
      run.transaction.begin()
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      run.transaction.end()
      await a.sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      expect(a.origin.slice(0, 64)).to.equal(b.origin.slice(0, 64))
      expect(a.origin).to.equal(a2.origin)
      expect(b.origin).to.equal(b2.origin)
    })

    it('should support load of batch with multiple jig updates', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new A()
      expectAction(b, 'init', [], [], [b], [])
      run.transaction.begin()
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      b.f(2)
      expectAction(b, 'f', [2], [b], [b], [])
      run.transaction.end()
      await a.sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      const b2 = await run2.load(b.location)
      expect(a2.location.slice(0, 64)).to.equal(b2.location.slice(0, 64))
      expect(a2.n).to.equal(1)
      expect(b2.n).to.equal(2)
    })

    it('should support load of batch with self-references', async () => {
      class A extends Jig { f (a) { this.n = a } }
      run.transaction.begin()
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      a.f(a)
      expectAction(a, 'f', [a], [a], [a], [])
      run.transaction.end()
      await a.sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const a2 = await run2.load(a.location)
      expect(a.origin).to.equal(a2.origin)
      expect(a2).to.deep.equal(a2.n)
      expect(a.n).to.deep.equal(a2.n)
      expect(a.owner).to.equal(a2.owner)
    })

    it('should support load of batch with circularly referenced jigs', async () => {
      class A extends Jig { set (x) { this.x = x } }
      run.transaction.begin()
      const a = new A()
      const b = new A()
      a.set(b)
      b.set(a)
      run.transaction.end()
      await run.sync()
      await run.load(a.location)
      await run.load(b.location)
    })

    it('should roll back all jigs from batch failures', async () => {
      hookPay(run, true, true, true, false)
      class A extends Jig { f (n) { this.n = n } }
      class B extends Jig { f (a, n) { a.f(a.n + 1); this.n = n } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      run.transaction.begin()
      a.f(1)
      expectAction(a, 'f', [1], [a], [a], [])
      b.f(a, 20)
      expectAction(b, 'f', [a, 20], [b, a], [b, a], [a])
      run.transaction.end()
      run.transaction.begin()
      a.f(10)
      expectAction(a, 'f', [10], [a], [a], [])
      b.f(a, 30)
      expectAction(b, 'f', [a, 30], [b, a], [b, a], [a])
      run.transaction.end()
      expect(a.n).to.equal(11)
      expect(b.n).to.equal(30)
      await expect(a.sync()).to.be.rejected
      expect(a.n).to.equal(2)
      expect(b.n).to.equal(20)
    })
  })

  describe('private', () => {
    it('should handle has of private property', () => {
      class J extends Jig {
        init () { this._x = 1 }

        has (a, x) { return x in a }
      }
      class K extends J { }
      class L extends Jig { has (a, x) { return x in a } }
      expect('_x' in new J()).to.equal(true)
      expect(new K().has(new K(), '_x')).to.equal(true)
      expect(() => new L().has(new J(), '_x')).to.throw('cannot check _x because it is private')
      expect(() => new K().has(new J(), '_x')).to.throw('cannot check _x because it is private')
      expect(() => new J().has(new K(), '_x')).to.throw('cannot check _x because it is private')
    })

    it('should handle get of private property', () => {
      class J extends Jig {
        init () { this._x = 1 }

        get (a, x) { return a[x] }
      }
      class K extends J { }
      class L extends Jig { get (a, x) { return a[x] } }
      expect(new J()._x).to.equal(1)
      expect(new K().get(new K(), '_x')).to.equal(1)
      expect(() => new L().get(new J(), '_x')).to.throw('cannot get _x because it is private')
      expect(() => new K().get(new J(), '_x')).to.throw('cannot get _x because it is private')
      expect(() => new J().get(new K(), '_x')).to.throw('cannot get _x because it is private')
    })

    it('should handle private method', () => {
      class J extends Jig {
        g () { return this._f() }

        _f () { return 1 }

        call (a, x) { return a[x]() }
      }
      class K extends J { }
      class L extends Jig { call (a, x) { return a[x]() } }
      expect(new J().g()).to.equal(1)
      expect(new K().call(new K(), '_f')).to.equal(1)
      expect(new L().call(new J(), 'g')).to.equal(1)
      expect(() => new J()._f()).to.throw('cannot call _f because it is private')
      expect(() => new L().call(new J(), '_f')).to.throw('cannot get _f because it is private')
      expect(() => new K().call(new J(), '_f')).to.throw('cannot get _f because it is private')
      expect(() => new J().call(new K(), '_f')).to.throw('cannot get _f because it is private')
    })

    it('should not return private properties in ownKeys', () => {
      class J extends Jig {
        init () { this._x = 1 }

        ownKeys (a) { return Reflect.ownKeys(a) }
      }
      class K extends J { }
      class L extends Jig { ownKeys (a) { return Reflect.ownKeys(a) } }
      expect(Reflect.ownKeys(new J()).includes('_x')).to.equal(true)
      expect(new K().ownKeys(new K()).includes('_x')).to.equal(true)
      expect(new L().ownKeys(new J()).includes('_x')).to.equal(false)
      expect(new K().ownKeys(new J()).includes('_x')).to.equal(false)
      expect(new J().ownKeys(new K()).includes('_x')).to.equal(false)
    })
  })

  describe('caller', () => {
    it('should be null when called externally', async () => {
      class A extends Jig {
        init () { expect(Jig.caller).toBeNull() }
        f () { expect(Jig.caller).toBeNull() }
      }
      A.deps = { expect: Run.expect }
      const a = new A()
      a.f()
      await run.sync()
      await run.load(a.location)
    })

    it('should be calling jig when called internally', async () => {
      class Parent extends Jig {
        init () { this.child = new Child(this) }
        f () { this.self = this.child.f(this) }
      }
      class Child extends Jig {
        init (parent) { expect(Jig.caller).toBe(parent) }
        f (parent) { expect(Jig.caller).toBe(parent); return parent }
      }
      Parent.deps = { Child }
      Child.deps = { expect: Run.expect }
      const parent = new Parent()
      parent.f()
      expect(parent.self).to.equal(parent)
      await run.sync()
      await run.load(parent.location)
    })

    it('should support caller being this', async () => {
      class A extends Jig {
        init () { this.f() }
        f () { this.caller = Jig.caller }
      }
      const a = await new A().sync()
      expect(a.caller).to.equal(a)
      const a2 = await run.load(a.location)
      expect(a2.caller).to.equal(a2)
    })

    it('should be accessible as static on both extended and base class', async () => {
      class A extends Jig {
        expectCaller (caller) {
          expect(Jig.caller).toBe(caller)
          expect(A.caller).toBe(caller)
        }
      }
      A.deps = { expect: Run.expect }
      class B extends Jig {
        init (a) { a.expectCaller(this) }
      }
      const a = new A()
      a.expectCaller(null)
      const b = new B(a)
      await run.sync()
      await run.load(b.location)
    })

    it('should support calling a method on the caller', async () => {
      class A extends Jig {
        set (n) { this.n = n }
        apply (b) { b.apply() }
      }
      class B extends Jig { apply () { Jig.caller.set(1) } }
      const a = new A()
      const b = new B()
      a.apply(b)
      expect(a.n).to.equal(1)
      await run.sync()
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(1)
    })

    it('should support static getter called caller', () => {
      class A extends Jig {
        static get caller () { return 1 }
      }
      expect(Jig.caller).to.equal(null)
      expect(A.caller).to.equal(1)
      const a = new A()
      expect(a.constructor.caller).to.equal(1)
    })

    it('should throw if set caller', () => {
      class A extends Jig { init () { A.caller = 1 } }
      expect(() => { A.caller = 1 }).to.throw('Must not set caller on Jig')
      expect(() => new A()).to.throw('Must not set caller on Jig')
    })

    it('should allow local variables named caller', async () => {
      class A extends Jig { init () { const caller = 2; this.n = caller } }
      const a = await new A().sync()
      expect(a.n).to.equal(2)
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
    })

    it('should allow dependencies named caller', async () => {
      const run = createRun({ sandbox: false })
      function caller () { return 2 }
      class A extends Jig { init () { this.n = caller() } }
      A.deps = { caller }
      const a = await new A().sync()
      expect(a.n).to.equal(2)
      const a2 = await run.load(a.location)
      expect(a2.n).to.equal(2)
      run.deactivate()
    })
  })

  describe('internal properties and methods', () => {
    it('should support calling a read-only method on an internal property from outside', () => {
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.obj.toString()).not.to.throw()
      expect(() => a.arr.indexOf(3)).not.to.throw()
      expect(() => a.buf.indexOf(2)).not.to.throw()
    })

    it('should support calling a read-only method on an internal property from another jig', () => {
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) {
          this.x = a.obj.toString()
          this.y = a.arr.indexOf(3)
          this.z = a.buf.indexOf(2)
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).not.to.throw()
    })

    it('should support calling a write method on an internal property from outside', () => {
      class A extends Jig {
        init () {
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([3, 2, 1])
        }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.arr.push(1)).to.throw('internal method push may not be called to change state')
      expectNoAction()
      expect(() => a.buf.sort()).to.throw('internal method sort may not be called to change state')
      expectNoAction()
    })

    it('should support calling a write method on an internal property from another jig', () => {
      class A extends Jig {
        init () {
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([3, 2, 1])
        }
      }
      class B extends Jig {
        f (a) { a.arr.push(1) }

        g (a) { a.buf.sort() }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).to.throw('internal method push may not be called to change state')
      expectNoAction()
      expect(() => b.g(a)).to.throw('internal method sort may not be called to change state')
      expectNoAction()
    })

    it('should support internal methods that do not require args to be serializable', () => {
      class A extends Jig { init () { this.arr = [1, 2, 3] } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      expect(() => a.arr.filter(x => x === 1)).not.to.throw()
      expect(() => a.arr.indexOf(Symbol.hasInstance)).not.to.throw()
    })

    it('should throw if save an internal property on another jig', () => {
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) { this.x = a.obj }

        g (a) { this.y = a.arr }

        h (a) { this.z = a.buf }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).to.throw('Property [object Object] is owned by a different token')
      expect(() => b.g(a)).to.throw('Property 1,2,3 is owned by a different token')
      expect(() => b.h(a)).to.throw('Property 1,2 is owned by a different token')
    })

    it('should not throw if save a copy of an internal property on another jig', () => {
      class A extends Jig {
        init () {
          this.obj = { n: 1 }
          this.arr = [1, 2, 3]
          this.buf = new Uint8Array([1, 2])
        }
      }
      class B extends Jig {
        f (a) { this.x = Object.assign({}, a.obj) }

        g (a) { this.y = [...a.arr] }

        h (a) { this.z = new Uint8Array(a.buf) }
      }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).not.to.throw()
      expect(() => b.g(a)).not.to.throw()
      expect(() => b.h(a)).not.to.throw()
    })

    it('should throw if save an internal method on another jig', () => {
      class A extends Jig {
        init () {
          class Blob { f () { return 2 } }
          this.blob = new Blob()
        }
      }
      class B extends Jig { f (a) { this.x = a.blob.f } }
      const a = new A()
      expectAction(a, 'init', [], [], [a], [])
      const b = new B()
      expectAction(b, 'init', [], [], [b], [])
      expect(() => b.f(a)).to.throw('Property f () { return 2 } is owned by a different token')
    })
  })
})

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(5)))

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

const { describe, it } = __webpack_require__(1)
const { expect } = __webpack_require__(0)
const Location = __webpack_require__(20)

const txid = '98244c0b51c1af3c541d901ce4bfcc05041dc8e4e80747ac5f0084e81bda339b'
const badHexTxid = '98244c0b51c1af3c541d901ce4bfcc05???dc8e4e80747ac5f0084e81bda339b'
const tempTxid = '????????????????????????????????????????????????5f0084e81bda339b'

describe('Location', () => {
  describe('parse', () => {
    it('should parse valid locations', () => {
      const expectLocation = (s, obj) => expect(Location.parse(s)).to.deep.equal(Object.assign({ location: s }, obj))
      expectLocation('_o0', { vout: 0 })
      expectLocation('_i1', { vin: 1 })
      expectLocation('_r2', { vref: 2 })
      expectLocation(`${txid}_o0`, { txid, vout: 0 })
      expectLocation(`${txid}_i1`, { txid, vin: 1 })
      expectLocation(`${txid}_r6000000000`, { txid, vref: 6000000000 })
      expectLocation(`${tempTxid}_o1`, { tempTxid, vout: 1 })
      expectLocation(`${txid}_o1://${txid}`, { txid, vout: 1, innerLocation: txid, location: `${txid}_o1` })
      expect(() => Location.parse(`${txid}_o1://hello`)).not.to.throw()
      expectLocation('!Bad', { error: 'Bad' })
      expectLocation('!', { error: '' })
    })

    it('should throw for invalid locations', () => {
      expect(() => Location.parse(null)).to.throw('Location must be a string')
      expect(() => Location.parse({})).to.throw('Location must be a string')
      expect(() => Location.parse('')).to.throw('Location must not be empty')
      expect(() => Location.parse(txid)).to.throw('Location requires a _ separator')
      expect(() => Location.parse(`${txid}_${txid}_o1`)).to.throw('Location has an unexpected _ separator')
      expect(() => Location.parse('abc_o1')).to.throw('Location has an invalid txid length')
      expect(() => Location.parse(`${badHexTxid}_o1`)).to.throw('Location has invalid hex in its txid')
      expect(() => Location.parse(`${txid}_o`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_r0.1`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_rABC`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_i-1`)).to.throw('Location has an invalid index number')
      expect(() => Location.parse(`${txid}_00`)).to.throw('Location has an invalid index category')
      expect(() => Location.parse(`${txid}_a1`)).to.throw('Location has an invalid index category')
      expect(() => Location.parse(`${txid}_o1://${txid}_o1://${txid}_o1`)).to.throw('Location must only have one protocol')
      expect(() => Location.parse(`${txid}_n1://${txid}_o1`)).to.throw('Location has an invalid index category')
    })
  })

  describe('build', () => {
    it('should create from valid options', () => {
      expect(Location.build({ vout: 0 })).to.equal('_o0')
      expect(Location.build({ vin: 1 })).to.equal('_i1')
      expect(Location.build({ vref: 2 })).to.equal('_r2')
      expect(Location.build({ txid, vout: 0 })).to.equal(`${txid}_o0`)
      expect(Location.build({ txid, vref: 1, innerLocation: 'hello' })).to.equal(`${txid}_r1://hello`)
      expect(Location.build({ tempTxid, vout: 3 })).to.equal(`${tempTxid}_o3`)
      expect(Location.build({ error: 'Bad' })).to.equal('!Bad')
    })

    it('should throw for invalid options', () => {
      expect(() => Location.build()).to.throw('Location object is invalid')
      expect(() => Location.build(null)).to.throw('Location object is invalid')
      expect(() => Location.build(`${txid}_o1`)).to.throw('Location object is invalid')
      expect(() => Location.build({})).to.throw('Location index unspecified')
      expect(() => Location.build({ vout: '123' })).to.throw('Location index unspecified')
      expect(() => Location.build({ vin: null })).to.throw('Location index unspecified')
      expect(() => Location.build({ vref: {} })).to.throw('Location index unspecified')
      expect(() => Location.build({ vout: 123.4 })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ vin: -1 })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ vref: Infinity })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ vout: NaN })).to.throw('Location index must be a non-negative integer')
      expect(() => Location.build({ txid, vout: 0, innerLocation: {} })).to.throw('Inner location must be a string')
      expect(() => Location.build({ error: null })).to.throw('Error must be a string')
    })
  })
})


/***/ }),
/* 20 */
/***/ (function(module, exports) {

/**
 * location.js
 *
 * Parses and builds location strings that point to tokens on the blockchain
 */

/**
 * Helper class to create and parse location strings
 *
 * Every token in Run is stored at a location on the blockchain. Both the "origin"
 * property and "location" property on jigs and code are location strings. Berries
 * have a location but not an origin, and these are prefixed with a protocol.
 *
 * This class helps store and read all of this, but within Run's code, it is important
 * to consider all of the above cases when looking at a location.
 *
 * ------------------
 * JIG/CODE LOCATIONS
 * ------------------
 *
 * To the user, most Jig locations come in the form:
 *
 *  "<txid>_o<vout>"
 *
 * The txid is a transaction id in hex, and vout is the output index as an integer.
 * Locations are usually outputs. But they need not always be outputs. There are other
 * kinds of locations. If the location ends with _i<vin>, then the location refers
 * to an input of a transaction. If the location ends in _r<vref>, then the location
 * refers to another asset reference within the OP_RETURN JSON. Sometimes within an
 * OP_RETURN JSON you will see locations without txids, and these refer to locations
 * in the CURRENT transaction. They look like _o1, _i0, etc.
 *
 * -------------------
 * TEMPORARY LOCATIONS
 * -------------------
 *
 * While a transaction is being built, a jig may have a temporary location:
 *
 *  "????????????????????????????????????????????????ca2f5ee8de79daf0_o1"
 *
 * This is identified by a random temporary txid that starts with '?'. It will get
 * turned into a real location when the token's transaction is known and published.
 * The convention is for temporary txids to have 48 ?'s followed by 16 random hex
 * chars to uniquely identify the temporary txid, but this is not strictly required.
 *
 * ---------------
 * BERRY LOCATIONS
 * ---------------
 *
 * Berry locations are a combination of a protocol + inner location, and usually
 * look like:
 *
 *  "<protocol_txid>_o<protocol_vout>://<inner_location>"
 *
 * The protocol uniquely identifies how the inner location is to be loaded.
 * The inner location does not have to be a valid location in the normal sense.
 * It will be parsed by the protocol, and may be a simple txid or friendly string.
 *
 * ---------------
 * ERROR LOCATIONS
 * ---------------
 *
 * Finally, a location may be invalid, in which case it starts with ! followed by
 * an optional error string
 *
 *  "!This location is not valid"
 */
class Location {
  /**
     * Parses a location string
     * @param {string} location Location to parse
     * @return {object} out
     * @return {string=} out.txid Transaction ID
     * @return {number=} out.vout Output index
     * @return {number=} out.vin Input index
     * @return {number=} out.vref Reference index
     * @return {string=} out.tempTxid Temporary transaction ID
     * @return {string=} out.error Error string if this location is invalid
     * @return {string=} out.innerLocation Inner location string if this location was a protocol
     * @return {string=} out.location Location string passed in with protocol removed
     */
  static parse (location) {
    // TODO: Temporary: Remove this, once we start using tempTxid
    if (location === '_') return { }

    const error = s => { throw new Error(`${s}: ${location}`) }

    if (typeof location !== 'string') error('Location must be a string')
    if (!location.length) error('Location must not be empty')

    // Check if we are dealing with an error
    if (location[0] === '!') {
      return { error: location.slice(1), location }
    }

    // Check if we are dealing with a protocol
    const protocolParts = location.split('://')
    if (protocolParts.length > 2) error('Location must only have one protocol')
    if (protocolParts.length === 2) {
      return Object.assign({}, Location.parse(protocolParts[0]), { innerLocation: protocolParts[1] })
    }

    // Split the txid and index parts
    const parts = location.split('_')
    if (parts.length > 2) error('Location has an unexpected _ separator')
    if (parts.length < 2) error('Location requires a _ separator')

    const output = { location }

    // Validate the txid
    if (parts[0].length !== 0 && parts[0].length !== 64) error('Location has an invalid txid length')
    if (parts[0][0] === '?') {
      output.tempTxid = parts[0]
    } else if (parts[0].length) {
      if (!/^[a-fA-F0-9]*$/.test(parts[0])) error('Location has invalid hex in its txid')
      output.txid = parts[0]
    }

    // Validate the index number
    const indexString = parts[1].slice(1)
    const index = parseInt(indexString, 10)
    if (isNaN(index) || !/^[0-9]*$/.test(indexString)) error('Location has an invalid index number')

    // Validate the index category
    switch (parts[1][0]) {
      case 'o': { output.vout = index; break }
      case 'i': { output.vin = index; break }
      case 'r': { output.vref = index; break }
      default: error('Location has an invalid index category')
    }

    return output
  }

  /**
     * Creates a location string from options
     * @param {object} options
     * @param {string=} options.txid Transaction ID
     * @param {number=} options.vout Output index
     * @param {number=} options.outputIndex Output index
     * @param {number=} options.vin Input index
     * @param {number=} options.vref Reference index
     * @param {string=} options.tempTxid Temporary transaction ID
     * @param {string=} out.error Error string if this location is invalid
     * @param {string=} options.location Location when not specifying parts as above
     * @param {string=} options.innerLocation Protocol inner location
     * @return {string} The built location string
     */
  static build (options) {
    const error = s => { throw new Error(`${s}: ${JSON.stringify(options)}`) }

    if (typeof options !== 'object' || !options) error('Location object is invalid')
    if (typeof options.innerLocation !== 'undefined' && typeof options.innerLocation !== 'string') error('Inner location must be a string')
    if (typeof options.error !== 'undefined' && typeof options.error !== 'string') error('Error must be a string')

    // If this is an error, return directly
    if (typeof options.error !== 'undefined') return `!${options.error}`

    let location = options.location
    if (!location) {
      // Get the txid
      const txid = `${options.txid || options.tempTxid || ''}`

      // Get the index
      let category = null; let index = null
      if (typeof options.vout === 'number') {
        category = 'o'
        index = options.vout
      } else if (typeof options.vin === 'number') {
        category = 'i'
        index = options.vin
      } else if (typeof options.vref === 'number') {
        category = 'r'
        index = options.vref
      } else error('Location index unspecified')

      const badIndex = isNaN(index) || !isFinite(index) || !Number.isInteger(index) || index < 0
      if (badIndex) error('Location index must be a non-negative integer')

      // Create the location
      location = `${txid}_${category}${index}`
    }

    // Append the sub-location if this is a protocol
    return options.innerLocation ? `${location}://${options.innerLocation}` : location
  }
}

module.exports = Location


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * mockchain.js
 *
 * Tests for ../lib/mockchain.js
 */

const { PrivateKey, Transaction } = __webpack_require__(3)
const { describe, it, before, beforeEach } = __webpack_require__(1)
const chai = __webpack_require__(0)
const chaiAsPromised = __webpack_require__(4)
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, unobfuscate, createRun } = __webpack_require__(2)
const runBlockchainTestSuite = __webpack_require__(7)

describe('Mockchain', () => {
  const run = createRun({ blockchain: new Run.Mockchain() })
  const tx = run.blockchain.transactions.values().next().value
  beforeEach(() => run.blockchain.block())

  const errors = {
    noInputs: 'tx has no inputs',
    noOutputs: 'tx has no outputs',
    feeTooLow: 'tx fee too low',
    notFullySigned: 'tx not fully signed',
    duplicateInput: 'transaction input 1 duplicate input',
    missingInput: 'tx input 0 missing or spent'
  }

  const sampleTx = {
    txid: tx.hash,
    time: tx.time
  }

  // generate a spending transaction so that we have spentTxId
  before(async () => {
    const utxos = await run.blockchain.utxos(run.purse.address)
    const spentTx = new Transaction().from(utxos).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
    await run.blockchain.broadcast(spentTx)
    sampleTx.vout = [
      {
        spentTxId: undefined,
        spentIndex: undefined,
        spentHeight: undefined
      },
      {
        spentTxId: spentTx.hash,
        spentIndex: 0,
        spentHeight: 0
      }
    ]
  })

  runBlockchainTestSuite(run.blockchain, run.purse.bsvPrivateKey, sampleTx,
    true /* supportsSpentTxIdInBlocks */, true /* supportsSpentTxIdInMempool */,
    0 /* indexingLatency */, errors)

  describe('block', () => {
    it('should update block heights', async () => {
      const txns = []
      for (let i = 0; i < 25; i++) {
        const utxo = (await run.blockchain.utxos(run.purse.address))[0]
        const tx = new Transaction().from(utxo).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
        await run.blockchain.broadcast(tx)
        txns.push(unobfuscate(tx))
      }
      for (let i = 0; i < txns.length; i++) {
        expect(txns[i].blockHeight).to.equal(-1)
        expect(txns[i].outputs[0].spentHeight).to.equal(i < txns.length - 1 ? -1 : null)
      }
      run.blockchain.block()
      for (let i = 0; i < txns.length; i++) {
        expect(txns[i].blockHeight).to.equal(run.blockchain.blockHeight)
        expect(txns[i].outputs[0].spentHeight).to.equal(i < txns.length - 1
          ? run.blockchain.blockHeight : null)
      }
    })

    it('should respect 25 chain limit', async () => {
      for (let i = 0; i < 25; i++) {
        const utxo = (await run.blockchain.utxos(run.purse.address))[0]
        const tx = new Transaction().from(utxo).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
        await run.blockchain.broadcast(tx)
      }
      const utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const tx = new Transaction().from(utxo).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
      await expect(run.blockchain.broadcast(tx)).to.be.rejectedWith('too-long-mempool-chain')
      run.blockchain.block()
      await run.blockchain.broadcast(tx)
    })
  })

  describe('performance', () => {
    it('should support fast broadcsts', async () => {
      const utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const start = new Date()
      const tx = new Transaction().from(utxo).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
      await run.blockchain.broadcast(tx)
      expect(new Date() - start < 200).to.equal(true)
    })

    it('should support fast fetches', async () => {
      let utxo = (await run.blockchain.utxos(run.purse.address))[0]
      const earlyTxid = utxo.txid
      const measures = []
      for (let i = 0; i < 1000; i++) {
        const tx = new Transaction().from(utxo).change(run.purse.bsvAddress).sign(run.purse.bsvPrivateKey)
        utxo = { txid: tx.hash, vout: 0, script: tx.outputs[0].script, satoshis: tx.outputs[0].satoshis }
        await run.blockchain.broadcast(tx)
        const before = new Date()
        await run.blockchain.fetch(tx.hash)
        await run.blockchain.fetch(earlyTxid)
        measures.push(new Date() - before)
        run.blockchain.block()
      }
      const start = measures.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const end = measures.slice(measures.length - 3).reduce((a, b) => a + b, 0) / 3
      expect(start < 10).to.equal(true)
      expect(end < 10).to.equal(true)
    }).timeout(30000)

    it('should support fast utxo queries', async () => {
      // Generate 10 private keys and fund their addresses
      const privateKeys = []; const addresses = []
      for (let i = 0; i < 10; i++) { privateKeys.push(new PrivateKey()) }
      privateKeys.forEach(privateKey => addresses.push(privateKey.toAddress()))
      addresses.forEach(address => run.blockchain.fund(address, 100000))

      // Send from each address to the next, 1000 times
      const measures = []
      for (let i = 0; i < 1000; i++) {
        const before = new Date()
        const utxos = await run.blockchain.utxos(addresses[i % 10])
        measures.push(new Date() - before)
        const tx = new Transaction().from(utxos).to(addresses[(i + 1) % 10], 1000)
          .change(addresses[i % 10]).sign(privateKeys[i % 10])
        await run.blockchain.broadcast(tx)
        run.blockchain.block()
      }

      // Get an average time to query utxos() at the start and end, and check it didn't change much
      const start = measures.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      const end = measures.slice(measures.length - 3).reduce((a, b) => a + b, 0) / 3
      expect(start < 10).to.equal(true)
      expect(end < 10).to.equal(true)
    }).timeout(30000)
  })
})


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * owner.js
 *
 * Tests for ../lib/owner.js
 */

const bsv = __webpack_require__(3)
const { describe, it } = __webpack_require__(1)
const chai = __webpack_require__(0)
const chaiAsPromised = __webpack_require__(4)
chai.use(chaiAsPromised)
const { expect } = chai
const { Jig, createRun, hookPay } = __webpack_require__(2)

describe('Owner', () => {
  describe('constructor', () => {
    it('should support creating from bsv private key on testnet', () => {
      const privkey = new bsv.PrivateKey('testnet')
      const run = createRun({ owner: privkey })
      expect(run.owner.privkey).to.equal(privkey.toString())
      expect(run.owner.pubkey).to.equal(privkey.publicKey.toString())
      expect(run.owner.address).to.equal(privkey.toAddress().toString())
    })

    it('should support creating from string private key on mainnet', () => {
      const privkey = new bsv.PrivateKey('mainnet')
      const run = createRun({ network: 'main', owner: privkey.toString() })
      expect(run.owner.privkey).to.equal(privkey.toString())
      expect(run.owner.pubkey).to.equal(privkey.publicKey.toString())
      expect(run.owner.address).to.equal(privkey.toAddress().toString())
    })

    it('should support creating from bsv public key on mainnet', () => {
      const pubkey = new bsv.PrivateKey('mainnet').publicKey
      const run = createRun({ network: 'main', owner: pubkey })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(pubkey.toString())
      expect(run.owner.address).to.equal(pubkey.toAddress().toString())
    })

    it('should support creating from string public key on mocknet', () => {
      const pubkey = new bsv.PrivateKey('testnet').publicKey
      const run = createRun({ network: 'mock', owner: pubkey.toString() })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(pubkey.toString())
      expect(run.owner.address).to.equal(pubkey.toAddress().toString())
    })

    it('should support creating from bsv address on stn', () => {
      const address = new bsv.PrivateKey('testnet').toAddress()
      const run = createRun({ network: 'stn', owner: address })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(undefined)
      expect(run.owner.address).to.equal(address.toString())
    })

    it('should support creating from string address on mainnet', () => {
      const address = new bsv.PrivateKey('livenet').toAddress()
      const run = createRun({ network: 'main', owner: address.toString() })
      expect(run.owner.privkey).to.equal(undefined)
      expect(run.owner.pubkey).to.equal(undefined)
      expect(run.owner.address).to.equal(address.toString())
    })

    it('should throw if bad owner', () => {
      expect(() => createRun({ owner: '123' })).to.throw('bad owner key or address: 123')
    })

    it('throw if owner private key is on wrong network', () => {
      const owner = new bsv.PrivateKey('testnet').toString()
      expect(() => createRun({ owner, network: 'main' })).to.throw('Private key network mismatch')
    })
  })

  describe('code', () => {
    it('should update with code deployed', async () => {
      const run = createRun()
      class A extends Jig { set (x) { this.x = x }}
      run.deploy(A)
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.code[0].name).to.equal('A')
      expect(run.owner.code[0].origin).to.equal(A.origin)
      expect(run.owner.code[0].location).to.equal(A.location)
      await run.sync()
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.code[0].name).to.equal('A')
      expect(run.owner.code[0].origin).to.equal(A.origin)
      expect(run.owner.code[0].location).to.equal(A.location)
      const a = new A()
      a.set(function add (a, b) { return a + b })
      expect(run.owner.code.length).to.equal(2)
      await run.sync()
      expect(run.owner.code.length).to.equal(2)
    })

    it('should remove if code fails to post', async () => {
      const run = createRun()
      hookPay(run, false)
      class A {}
      run.deploy(A).catch(() => {})
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.code[0].name).to.equal('A')
      expect(run.owner.code[0].origin).to.equal(A.origin)
      expect(run.owner.code[0].location).to.equal(A.location)
      await expect(run.sync()).to.be.rejected
      expect(run.owner.code.length).to.equal(0)
    })
  })

  describe('jigs', () => {
    it('should update with jigs created', async () => {
      const run = createRun()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { send (to) { this.owner = to } }
      A.deps = { B }
      const a = new A()
      expect(run.owner.jigs).to.deep.equal([a])
      const b = a.createB()
      expect(run.owner.jigs).to.deep.equal([a, b])
      await run.sync()
      expect(run.owner.jigs).to.deep.equal([a, b])
      b.send(new bsv.PrivateKey().publicKey.toString())
      expect(run.owner.jigs).to.deep.equal([a])
      await run.sync()
      expect(run.owner.jigs).to.deep.equal([a])
    })

    it('should update jigs on sync', async () => {
      const run = createRun()
      class A extends Jig { createB () { return new B() }}
      class B extends Jig { }
      A.deps = { B }
      const a = new A()
      const b = a.createB()
      expect(run.owner.jigs).to.deep.equal([a, b])
      await run.sync()
      const run2 = createRun({ owner: run.owner.privkey, blockchain: run.blockchain })
      const c = new A()
      await run2.sync()
      expect(run2.owner.jigs).to.deep.equal([a, b, c])
    })

    it('should remove jigs when fail to post', async () => {
      const run = createRun()
      hookPay(run, false)
      class A extends Jig {}
      const a = new A()
      expect(run.owner.jigs).to.deep.equal([a])
      expect(run.owner.code.length).to.equal(1)
      await expect(run.sync()).to.be.rejectedWith('tx has no inputs')
      expect(run.owner.jigs.length).to.equal(0)
      expect(run.owner.code.length).to.equal(0)
    })

    it('should support filtering jigs by class', async () => {
      const run = createRun()
      class A extends Jig {}
      class B extends Jig {}
      const a = new A()
      new B() // eslint-disable-line
      expect(run.owner.jigs.find(x => x instanceof A)).to.deep.equal(a)
    })

    it('should support getting jigs without private key', async () => {
      const run = createRun()
      class A extends Jig {}
      const a = await new A().sync()
      const run2 = createRun({ blockchain: run.blockchain, owner: run.owner.pubkey })
      await run2.sync()
      expect(run2.owner.privkey).to.equal(undefined)
      expect(run2.owner.jigs).to.deep.equal([a])
    })
  })
})


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * purse.js
 *
 * Tests for ../lib/purse.js
 */

const bsv = __webpack_require__(3)
const { describe, it, beforeEach } = __webpack_require__(1)
const chai = __webpack_require__(0)
const chaiAsPromised = __webpack_require__(4)
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, Jig, createRun, payFor } = __webpack_require__(2)
const { Purse } = Run

// ------------------------------------------------------------------------------------------------
// Pay API tests
// ------------------------------------------------------------------------------------------------

describe('Pay', () => {
  it('should throw not implemented for methods', async () => {
    const pay = new Run.Pay()
    await expect(pay.pay(new bsv.Transaction())).to.be.rejectedWith('Not implemented')
  })
})

// ------------------------------------------------------------------------------------------------
// Purse tests
// ------------------------------------------------------------------------------------------------

describe('Purse', () => {
  const run = createRun()
  beforeEach(() => run.activate())

  describe('constructor', () => {
    describe('key', () => {
      it('should generate random purse if unspecified', () => {
        expect(run.purse.bsvPrivateKey.toString()).not.to.equal(createRun().purse.bsvPrivateKey.toString())
        expect(run.purse.privkey).not.to.equal(createRun().purse.privkey)
      })

      it('should calculate address correctly from private key', () => {
        expect(run.purse.bsvPrivateKey.toAddress().toString()).to.equal(run.purse.address)
      })

      it('should support passing in private key', () => {
        const privkey = new bsv.PrivateKey()
        const run = createRun({ purse: privkey })
        expect(run.purse.privkey).to.equal(privkey.toString())
        expect(run.purse.bsvPrivateKey).to.deep.equal(privkey)
      })

      it('should throw if private key is on wrong network', () => {
        const purse = new bsv.PrivateKey('mainnet').toString()
        expect(() => createRun({ purse, network: 'test' })).to.throw('Private key network mismatch')
      })
    })

    describe('logger', () => {
      it('should support passing in valid logger', () => {
        expect(new Purse({ blockchain: run.blockchain, logger: console }).logger).to.equal(console)
      })

      it('should support passing in null logger', () => {
        expect(new Purse({ blockchain: run.blockchain, logger: null }).logger).to.equal(null)
      })

      it('should support not passing in a logger', () => {
        expect(new Purse({ blockchain: run.blockchain }).logger).to.equal(null)
      })

      it('should throw if pass in an invalid logger', () => {
        expect(() => new Purse({ blockchain: run.blockchain, logger: 123 })).to.throw('Invalid logger option: 123')
        expect(() => new Purse({ blockchain: run.blockchain, logger: () => {} })).to.throw('Invalid logger option: ')
        expect(() => new Purse({ blockchain: run.blockchain, logger: false })).to.throw('Invalid logger option: false')
      })
    })

    describe('splits', () => {
      it('should support passing in valid splits', () => {
        expect(new Purse({ blockchain: run.blockchain, splits: 1 }).splits).to.equal(1)
        expect(new Purse({ blockchain: run.blockchain, splits: 5 }).splits).to.equal(5)
        expect(new Purse({ blockchain: run.blockchain, splits: Number.MAX_SAFE_INTEGER }).splits).to.equal(Number.MAX_SAFE_INTEGER)
      })

      it('should default to 10 if not specified', () => {
        expect(new Purse({ blockchain: run.blockchain }).splits).to.equal(10)
      })

      it('should throw if pass in invalid splits', () => {
        expect(() => new Purse({ blockchain: run.blockchain, splits: 0 })).to.throw('Option splits must be at least 1: 0')
        expect(() => new Purse({ blockchain: run.blockchain, splits: -1 })).to.throw('Option splits must be at least 1: -1')
        expect(() => new Purse({ blockchain: run.blockchain, splits: 1.5 })).to.throw('Option splits must be an integer: 1.5')
        expect(() => new Purse({ blockchain: run.blockchain, splits: NaN })).to.throw('Option splits must be an integer: NaN')
        expect(() => new Purse({ blockchain: run.blockchain, splits: Number.POSITIVE_INFINITY })).to.throw('Option splits must be an integer: Infinity')
        expect(() => new Purse({ blockchain: run.blockchain, splits: false })).to.throw('Invalid splits option: false')
        expect(() => new Purse({ blockchain: run.blockchain, splits: null })).to.throw('Invalid splits option: null')
      })
    })

    describe('feePerKb', () => {
      it('should support passing in valid feePerKb', () => {
        expect(new Purse({ blockchain: run.blockchain, feePerKb: 1.5 }).feePerKb).to.equal(1.5)
        expect(new Purse({ blockchain: run.blockchain, feePerKb: 1000 }).feePerKb).to.equal(1000)
        expect(new Purse({ blockchain: run.blockchain, feePerKb: Number.MAX_SAFE_INTEGER }).feePerKb).to.equal(Number.MAX_SAFE_INTEGER)
      })

      it('should throw if pass in invalid feePerKb', () => {
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: 0 }).feePerKb).to.throw('Option feePerKb must be at least 1: 0')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: -1 })).to.throw('Option feePerKb must be at least 1: -1')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: NaN })).to.throw('Option feePerKb must be finite: NaN')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: Number.POSITIVE_INFINITY })).to.throw('Option feePerKb must be finite: Infinity')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: false })).to.throw('Invalid feePerKb option: false')
        expect(() => new Purse({ blockchain: run.blockchain, feePerKb: null })).to.throw('Invalid feePerKb option: null')
      })

      it('should default to 1000 if not specified', () => {
        expect(new Purse({ blockchain: run.blockchain }).feePerKb).to.equal(1000)
      })
    })

    describe('blockchain', () => {
      it('should support passing in valid blockchain', () => {
        const mockchain = new Run.Mockchain()
        expect(new Purse({ blockchain: mockchain }).blockchain).to.equal(mockchain)
        const blockchainServer = new Run.BlockchainServer()
        expect(new Purse({ blockchain: blockchainServer }).blockchain).to.equal(blockchainServer)
      })

      it('should throw if pass in invalid blockchain', () => {
        expect(() => new Purse({ blockchain: {} })).to.throw('Invalid blockchain option')
        expect(() => new Purse({ blockchain: false })).to.throw('Invalid blockchain option: false')
      })

      it('should require passing in blockchain', () => {
        expect(() => new Purse()).to.throw('Option blockchain is required')
      })
    })
  })

  describe('splits', () => {
    it('should throw if set invalid value', () => {
      expect(() => { run.purse.splits = -1 }).to.throw('Option splits must be at least 1: -1')
    })
  })

  describe('feePerKb', () => {
    it('should throw if set invalid value', () => {
      expect(() => { run.purse.feePerKb = -1 }).to.throw('Option feePerKb must be at least 1: -1')
    })
  })

  describe('pay', () => {
    it('should adds inputs and outputs', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, 100)
      const tx2 = await run.purse.pay(tx)
      expect(tx2.inputs.length).to.equal(1)
      expect(tx2.outputs.length).to.equal(11)
    })

    it('should throw if not enough funds', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, Number.MAX_SAFE_INTEGER)
      await expect(run.purse.pay(tx)).to.be.rejectedWith('Not enough funds')
    })

    it('should throw if no utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = new bsv.Transaction().to(address, 100)
      let didLogWarning = false
      const logger = { warn: () => { didLogWarning = true } }
      const purse = new Purse({ blockchain: run.blockchain, logger })
      await expect(purse.pay(tx)).to.be.rejectedWith('Not enough funds')
      expect(didLogWarning).to.equal(true)
      const purseWithNoLogger = new Purse({ blockchain: run.blockchain, logger: null })
      await expect(purseWithNoLogger.pay(tx)).to.be.rejectedWith('Not enough funds')
    })

    it('should automatically split utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      await run.blockchain.broadcast(tx)
      const utxos = await run.blockchain.utxos(run.purse.address)
      expect(utxos.length).to.equal(10)
    })

    it('should shuffle UTXOs', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      await run.blockchain.broadcast(tx)
      const txBase = await run.purse.pay(new bsv.Transaction().to(address, 100))
      for (let i = 0; i < 100; i++) {
        const tx2 = await run.purse.pay(new bsv.Transaction().to(address, 100))
        const sameTxId = tx2.inputs[0].prevTxId.toString() === txBase.inputs[0].prevTxId.toString()
        const sameIndex = tx2.inputs[0].outputIndex === txBase.inputs[0].outputIndex
        if (!sameTxId || !sameIndex) return
      }
      throw new Error('Did not shuffle UTXOs')
    })

    it('should respect custom feePerKb', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const run = createRun()
      run.purse.feePerKb = 1
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      const feePerKb = tx.getFee() / tx.toBuffer().length * 1000
      const diffFees = Math.abs(feePerKb - 1)
      expect(diffFees < 10).to.equal(true)
      run.purse.feePerKb = 2000
      const tx2 = await run.purse.pay(new bsv.Transaction().to(address, 100))
      const feePerKb2 = tx2.getFee() / tx2.toBuffer().length * 1000
      const diffFees2 = Math.abs(feePerKb2 - 2000)
      expect(diffFees2 < 10).to.equal(true)
    })

    it('should respect custom splits', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const run = createRun()
      run.purse.splits = 1
      const tx = await run.purse.pay(new bsv.Transaction().to(address, 100))
      expect(tx.outputs.length).to.equal(2)
      run.purse.splits = 20
      const tx2 = await run.purse.pay(new bsv.Transaction().to(address, 100))
      expect(tx2.outputs.length).to.equal(21)
    })
  })

  describe('balance', () => {
    it('should sum non-jig and non-class utxos', async () => {
      const address = new bsv.PrivateKey().toAddress()
      const send = await payFor(new bsv.Transaction().to(address, 9999), run.purse.bsvPrivateKey, run.blockchain)
      await run.blockchain.broadcast(send)
      createRun({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      const utxos = await run.blockchain.utxos(run.purse.address)
      const nonJigUtxos = utxos.filter(utxo => utxo.satoshis > 100000)
      const balance = nonJigUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
      expect(await run.purse.balance()).to.equal(balance)
    })
  })

  describe('utxos', () => {
    it('should return non-jig and non-class utxos', async () => {
      const run2 = createRun({ owner: run.purse.bsvPrivateKey, blockchain: run.blockchain })
      class A extends Jig { init () { this.satoshis = 8888 } }
      await new A().sync()
      expect((await run2.purse.utxos()).length).to.equal(10)
    })
  })
})


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * run.js
 *
 * Tests for ../lib/index.js
 */

const { describe, it } = __webpack_require__(1)
const chai = __webpack_require__(0)
const chaiAsPromised = __webpack_require__(4)
chai.use(chaiAsPromised)
const { expect } = chai
const { Jig, Run, createRun } = __webpack_require__(2)
const bsv = __webpack_require__(3)
const packageInfo = __webpack_require__(25)

describe('Run', () => {
  describe('constructor', () => {
    describe('logger', () => {
      it('should create default logger', () => {
        expect(!!createRun().logger).to.equal(true)
      })

      it('should accept null logger', () => {
        expect(() => createRun({ logger: null })).not.to.throw()
      })

      it('should throw for invalid logger', () => {
        expect(() => createRun({ logger: 1 })).to.throw('Option \'logger\' must be an object. Received: 1')
        expect(() => createRun({ logger: false })).to.throw('Option \'logger\' must be an object. Received: false')
        expect(() => createRun({ logger: () => {} })).to.throw('Option \'logger\' must be an object. Received: ')
      })

      it('should complete methods for custom logger', () => {
        let infoMessage = ''; let errorMessage = ''; let errorData = null
        const run = createRun({
          logger: {
            info: message => { infoMessage = message },
            error: (message, data) => { errorMessage = message; errorData = data }
          }
        })
        run.logger.info('info')
        run.logger.debug('debug')
        run.logger.warn('warn')
        run.logger.error('error', 1)
        expect(infoMessage).to.equal('info')
        expect(errorMessage).to.equal('error')
        expect(errorData).to.equal(1)
      })
    })

    describe('blockchain', () => {
      it('should create default blockchain', () => {
        const run = new Run()
        expect(run.blockchain instanceof Run.BlockchainServer).to.equal(true)
        expect(run.blockchain.network).to.equal('main')
        expect(run.blockchain.api.name).to.equal('star')
      })

      it('should support creating mockchain', () => {
        const run = createRun({ network: 'mock' })
        expect(run.blockchain instanceof Run.Mockchain).to.equal(true)
        expect(run.blockchain.network).to.equal('mock')
      })

      it('should support creating blockchain service', () => {
        const run = createRun({ blockchain: 'whatsonchain', network: 'test' })
        expect(run.blockchain instanceof Run.BlockchainServer).to.equal(true)
        expect(run.blockchain.api.name).to.equal('whatsonchain')
        expect(run.blockchain.network).to.equal('test')
      })

      it('should accept custom blockchain', () => {
        let fetched = false
        const blockchain = { broadcast: async () => {}, fetch: async () => { fetched = true }, utxos: async () => {}, network: 'main' }
        const run = createRun({ blockchain })
        run.blockchain.fetch()
        expect(fetched).to.equal(true)
      })

      it('should throw for invalid custom blockchain', () => {
        const blockchain = { broadcast: async () => {}, fetch: async () => {}, utxos: async () => {}, network: 'main' }
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { broadcast: null }) })).to.throw('Invalid \'blockchain\'')
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { fetch: null }) })).to.throw('Invalid \'blockchain\'')
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { utxos: null }) })).to.throw('Invalid \'blockchain\'')
        expect(() => createRun({ blockchain: Object.assign({}, blockchain, { network: null }) })).to.throw('Invalid \'blockchain\'')
      })

      it('should throw for null blockchain', () => {
        expect(() => createRun({ blockchain: null })).to.throw('Invalid \'blockchain\'')
      })

      it('should throw for invalid blockchain', () => {
        expect(() => createRun({ blockchain: 123 })).to.throw('Option \'blockchain\' must be an object or string. Received: 123')
        expect(() => createRun({ blockchain: false })).to.throw('Option \'blockchain\' must be an object or string. Received: false')
        expect(() => createRun({ blockchain: () => {} })).to.throw('Option \'blockchain\' must be an object or string. Received: ')
      })

      it('should support all networks', () => {
        const networks = ['main', 'test', 'stn', 'mock']
        networks.forEach(network => {
          expect(createRun({ network }).blockchain.network).to.equal(network)
        })
      })

      it('should copy mockchain from previous blockchain', () => {
        const run1 = createRun()
        const run2 = createRun()
        expect(run1.blockchain).to.deep.equal(run2.blockchain)
      })

      it('should copy blockchain cache from previous blockchain', async () => {
        const run1 = createRun({ network: 'test' })
        await run1.blockchain.fetch('d89f6bfb9f4373212ed18b9da5f45426d50a4676a4a684c002a4e838618cf3ee')
        const run2 = createRun({ network: 'test' })
        expect(run1.blockchain).not.to.deep.equal(run2.blockchain)
        expect(run1.blockchain.cache).to.deep.equal(run2.blockchain.cache)
      })
    })

    describe('sandbox', () => {
      it('should default to sandbox enabled', () => {
        expect(new Run({ network: 'mock' }).code.evaluator.sandbox).to.equal(true)
        class A extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).to.throw()
      })

      it('should support enabling sandbox', () => {
        expect(createRun({ sandbox: true }).code.evaluator.sandbox).to.equal(true)
      })

      it('should support disabling sandbox', () => {
        const run = createRun({ network: 'mock', sandbox: false })
        expect(run.code.evaluator.sandbox).to.equal(false)
        class A extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).not.to.throw()
        run.deactivate()
      })

      it('should support RegExp sandbox', () => {
        const run = createRun({ network: 'mock', sandbox: /A/ })
        expect(run.code.evaluator.sandbox instanceof RegExp).to.equal(true)
        class A extends Jig { init () { this.version = Run.version } }
        class B extends Jig { init () { this.version = Run.version } }
        expect(() => new A()).to.throw()
        expect(() => new B()).not.to.throw()
        run.deactivate()
      })

      it('should throw for bad sandbox', () => {
        expect(() => createRun({ sandbox: null })).to.throw('Invalid option \'sandbox\'. Received: null')
        expect(() => createRun({ sandbox: 0 })).to.throw('Option \'sandbox\' must be a boolean or RegExp. Received: 0')
        expect(() => createRun({ sandbox: {} })).to.throw('Invalid option \'sandbox\'. Received:')
        expect(() => createRun({ sandbox: () => {} })).to.throw('Option \'sandbox\' must be a boolean or RegExp. Received: ')
      })
    })

    describe('app', () => {
      it('should default to empty app string', () => {
        expect(createRun().app).to.equal('')
      })

      it('should support custom app name', () => {
        expect(createRun({ app: 'biz' }).app).to.equal('biz')
      })

      it('should throw if bad app name', () => {
        expect(() => createRun({ app: 0 })).to.throw('Option \'app\' must be a string. Received: 0')
        expect(() => createRun({ app: true })).to.throw('Option \'app\' must be a string. Received: true')
        expect(() => createRun({ app: { name: 'biz' } })).to.throw('Option \'app\' must be a string. Received: [object Object]')
      })
    })

    describe('state', () => {
      it('should default to state cache', () => {
        expect(createRun().state instanceof Run.StateCache).to.equal(true)
      })

      it('should support custom state', () => {
        const state = new Run.StateCache()
        expect(createRun({ state }).state).to.deep.equal(state)
      })

      it('should throw if invalid state', () => {
        expect(() => createRun({ state: { get: () => {} } })).to.throw('State requires a set method')
        expect(() => createRun({ state: { set: () => {} } })).to.throw('State requires a get method')
        expect(() => createRun({ state: null })).to.throw('Option \'state\' must not be null')
        expect(() => createRun({ state: false })).to.throw('Option \'state\' must be an object. Received: false')
      })

      it('should copy previous state', () => {
        const run1 = createRun()
        const run2 = createRun()
        expect(run2.state).to.deep.equal(run1.state)
      })
    })

    describe('owner', () => {
      it('should default to random owner', () => {
        const run = createRun()
        expect(run.owner).not.to.equal(null)
        expect(typeof run.owner.privkey).to.equal('string')
      })

      it('should support null owner', () => {
        expect(createRun({ owner: null }).owner).not.to.equal(null)
      })

      it('should throw for invalid owner', () => {
        expect(() => createRun({ owner: 123 })).to.throw('Option \'owner\' must be a valid key or address. Received: 123')
        expect(() => createRun({ owner: false })).to.throw('Option \'owner\' must be a valid key or address. Received: false')
      })
    })

    describe('purse', () => {
      it('should default to random purse', () => {
        const run = createRun()
        expect(run.purse).not.to.equal(null)
        expect(typeof run.purse.privkey).to.equal('string')
      })

      it('should support null purse', () => {
        expect(createRun({ purse: null }).purse).not.to.equal(null)
      })

      it('should throw for invalid purse', () => {
        expect(() => createRun({ purse: {} })).to.throw('Purse requires a pay method')
        expect(() => createRun({ purse: 123 })).to.throw('Option \'purse\' must be a valid private key or Pay API. Received: 123')
        expect(() => createRun({ purse: true })).to.throw('Option \'purse\' must be a valid private key or Pay API. Received: true')
      })
    })

    describe('code', () => {
      it('should default to new code', () => {
        expect(createRun().code instanceof Run.Code).to.equal(true)
      })

      it('should support creating with new code', () => {
        expect(() => createRun({ code: new Run.Code() })).not.to.throw()
      })

      it('should reuse code if possible', () => {
        expect(new Map(createRun().code.installs)).to.deep.equal(new Map(createRun().code.installs))
        expect(new Map(createRun({ sandbox: false }).code.installs))
          .not.to.deep.equal(new Map(createRun({ sandbox: true }).code.installs))
      })

      it('should throw for invalid code', () => {
        expect(() => createRun({ code: null })).to.throw('Option \'code\' must be an instance of Code')
        expect(() => createRun({ code: 123 })).to.throw('Option \'code\' must be an instance of Code')
        expect(() => createRun({ code: false })).to.throw('Option \'code\' must be an instance of Code')
      })
    })

    it('should set global bsv network', () => {
      createRun()
      expect(bsv.Networks.defaultNetwork).to.equal('testnet')
      createRun({ network: 'main' })
      expect(bsv.Networks.defaultNetwork).to.equal('mainnet')
    })
  })

  describe('purse', () => {
    it('throw accept setting valid purse', () => {
      const run = createRun()
      run.purse = new bsv.PrivateKey()
      expect(run.purse instanceof Run.Purse).to.equal(true)
    })

    it('throw throw if set invalid purse', () => {
      const run = createRun()
      expect(() => { run.purse = 123 }).to.throw('Option \'purse\' must be a valid private key or Pay API')
    })
  })

  describe('static properties', () => {
    it('version should match package.json', () => {
      expect(Run.version).to.equal(packageInfo.version)
    })
  })

  describe('load', () => {
    it('should throw if inactive', async () => {
      const run = createRun()
      class A { }
      await run.deploy(A)
      createRun()
      await expect(run.load(A.location)).to.be.rejectedWith('This Run instance is not active')
    })

    it('should throw for invalid arg', async () => {
      const run = createRun()
      await expect(run.load()).to.be.rejectedWith('typeof location is undefined - must be string')
      await expect(run.load(123)).to.be.rejectedWith('typeof location is number - must be string')
      await expect(run.load({})).to.be.rejectedWith('typeof location is object - must be string')
    })
  })

  describe('deploy', () => {
    it('should throw if inactive', async () => {
      class A { }
      const run = createRun()
      createRun()
      await expect(run.deploy(A)).to.be.rejectedWith('This Run instance is not active')
    })

    it('should support batch deploy', async () => {
      class A { }
      const run = createRun()
      run.transaction.begin()
      await run.deploy(A)
      run.transaction.end()
    })
  })

  describe('misc', () => {
    it('should support same owner and purse', async () => {
      const key = new bsv.PrivateKey('testnet')
      const run = createRun({ owner: key, purse: key })
      class A extends Jig { set (name) { this.name = name; return this } }
      const a = await new A().sync()
      const purseUtxos = await run.purse.utxos()
      expect(purseUtxos.length).to.equal(10)
      await run.sync()
      expect(run.owner.code.length).to.equal(1)
      expect(run.owner.jigs.length).to.equal(1)

      const txid = run.owner.code[0].location.slice(0, 64)
      const codeVout = parseInt(run.owner.code[0].location.slice(66))
      const jigVout = parseInt(run.owner.jigs[0].location.slice(66))
      expect(codeVout).to.equal(1)
      expect(jigVout).to.equal(2)

      purseUtxos.forEach(utxo => {
        expect(utxo.txid !== txid || utxo.vout !== jigVout).to.equal(true)
        expect(utxo.txid !== txid || utxo.vout !== codeVout).to.equal(true)
      })

      await a.set('a').sync()
    })

    it('should support multiple simultaneous loads', async () => {
      // This tests a tricky timing issue where class dependencies need to be fully
      // loaded before load() returns. There used to be a case where that was possible.
      const run = createRun()
      class A extends Jig { }
      class B extends A { }
      await run.deploy(B)
      class C extends Jig { init () { if (!B) throw new Error() } }
      C.deps = { B }
      await run.deploy(C)
      class D extends C { }
      const d = new D()
      await run.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      const p1 = run2.load(d.location)
      const p2 = run2.load(d.location)
      await Promise.all([p1, p2])
    })

    it('should reuse state cache', async () => {
      async function timeLoad (network, location) {
        const run = createRun({ network })
        const before = new Date()
        await run.load(location)
        return new Date() - before
      }

      const testLocation = '7d96e1638074471796c6981b12239865b0daeff24ea72fee207338cf2d388ffd_o1'
      const mainLocation = 'a0dd3999349d0cdd116a1a607eb07e5e394355484af3ba7a7a5babe0c2efc5ca_o1'

      expect(await timeLoad('test', testLocation) > 1000).to.equal(true)
      expect(await timeLoad('test', testLocation) > 1000).to.equal(false)

      expect(await timeLoad('main', mainLocation) > 1000).to.equal(true)
      expect(await timeLoad('main', mainLocation) > 1000).to.equal(false)
    }).timeout(30000)

    it.skip('should fail if reuse jigs across code instances', () => {
      // TODO: What should this behavior be?
      class A extends Jig { set (x) { this.x = x } }
      createRun({ code: new Run.Code() })
      const a1 = new A()
      createRun({ code: new Run.Code() })
      const a2 = new A()
      expect(a1.constructor).not.to.equal(a2.constructor)
      expect(() => a2.set(a1)).to.throw('Different code instances')
    })
  })
})


/***/ }),
/* 25 */
/***/ (function(module) {

module.exports = JSON.parse("{\"name\":\"run\",\"repository\":\"git://github.com/runonbitcoin/run.git\",\"version\":\"0.5.0\",\"description\":\"Run JavaScript library\",\"main\":\"lib/index.js\",\"scripts\":{\"lint\":\"standard --fix\",\"build\":\"webpack\",\"test\":\"npm run build && TEST_MODE=dist mocha\",\"test:dev\":\"npm run lint && TEST_MODE=lib mocha\",\"test:cover\":\"TEST_MODE=cover nyc mocha\",\"test:browser\":\"npm run build && mocha-headless-chrome -f ./test/browser.html -t 600000\"},\"standard\":{\"globals\":[\"RUN_VERSION\",\"TEST_MODE\"],\"ignore\":[\"dist/**\",\"examples/**\"]},\"nyc\":{\"exclude\":[\"**/intrinsics.js\",\"**/test/**/*.js\"]},\"dependencies\":{\"axios\":\"0.19.0\",\"bsv\":\"1.2.0\",\"ses\":\"github:runonbitcoin/ses\",\"terser-webpack-plugin\":\"2.3.1\",\"webpack\":\"4.41.5\",\"webpack-cli\":\"3.3.10\"},\"devDependencies\":{\"chai\":\"^4.2.0\",\"chai-as-promised\":\"^7.1.1\",\"mocha\":\"^6.2.2\",\"mocha-headless-chrome\":\"^2.0.3\",\"nyc\":\"^15.0.0\",\"standard\":\"^14.3.1\"}}");

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * state.js
 *
 * Tests for ../lib/state.js
 */

const bsv = __webpack_require__(3)
const { describe, it, after, beforeEach, afterEach } = __webpack_require__(1)
const chai = __webpack_require__(0)
const chaiAsPromised = __webpack_require__(4)
chai.use(chaiAsPromised)
const { expect } = chai
const { Run, Jig, createRun } = __webpack_require__(2)
const { State, StateCache } = Run

const txid = '0000000000000000000000000000000000000000000000000000000000000000'

describe('StateCache', () => {
  const stateGets = []
  const stateSets = []
  const stateGetOverrides = new Map()

  class WrappedState extends StateCache {
    async get (location) {
      stateGets.push(location)
      if (stateGetOverrides.has(location)) return stateGetOverrides.get(location)
      return super.get(location)
    }

    async set (location, state) {
      stateSets.push({ location, state })
      super.set(location, state)
    }
  }

  function expectStateGet (location) {
    expect(stateGets.shift()).to.equal(location)
  }

  function expectStateSet (location, state) {
    expect(stateSets.shift()).to.deep.equal({ location, state })
  }

  afterEach(() => {
    expect(stateGets.length).to.equal(0)
    expect(stateSets.length).to.equal(0)
  })

  const run = createRun({ state: new WrappedState() })
  beforeEach(() => run.activate())

  // Clear the instance after the state tests so that we don't reuse the WrappedState
  after(() => { Run.instance = null })

  describe('set', () => {
    it('should call set for each update after sync', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      await a.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      await a.set([true, null])
      await a.sync()
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: [true, null] } })
    })

    it('should cache satoshis', async () => {
      class A extends Jig { init () { this.satoshis = 3000 } }
      const a = new A()
      await a.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 3000 } })
    })

    it('should cache owner', async () => {
      const owner = new bsv.PrivateKey().publicKey.toString()
      class A extends Jig { init (owner) { this.owner = owner } }
      const a = new A(owner)
      await a.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner, satoshis: 0 } })
    })

    it('should cache new jig references', async () => {
      class B extends Jig { }
      class A extends Jig { init () { this.b = new B() } }
      A.deps = { B }
      const a = new A()
      await run.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0, b: { $ref: '_o4' } } })
      expectStateSet(a.b.location, { type: '_o2', state: { owner: run.owner.pubkey, satoshis: 0 } })
    })

    it('should cache pre-existing jig references', async () => {
      class B extends Jig { }
      class A extends Jig { set (b) { this.b = b } }
      const b = new B()
      const a = new A()
      await a.set(b)
      await run.sync()
      expectStateSet(b.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, b: { $ref: b.location } } })
    })

    it('should cache code references', async () => {
      class B extends Jig { }
      run.deploy(B)
      class A extends Jig { init () { this.A = A; this.B = B } }
      A.deps = { B }
      const a = new A()
      await run.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0, A: { $ref: '_o1' }, B: { $ref: B.location } } })
    })

    it('should respect max cache size', async () => {
      const state = new Run.StateCache({ maxSizeMB: 400 / 1000 / 1000 })
      for (let i = 0; i < 100; i++) {
        await state.set(`${txid}_o` + i, i)
      }
      expect(state.cache.size < 100).to.equal(true)
      expect(state.cache.has(`${txid}_o99`)).to.equal(true)
      expect(state.cache.has(`${txid}_o0`)).to.equal(false)
    })

    it('should move existing values to the front of the cache', async () => {
      const state = new Run.StateCache({ maxSizeMB: 30 })
      await state.set(`${txid}_o0`, undefined)
      await state.set(`${txid}_o1`, undefined)
      await state.set(`${txid}_o2`, undefined)
      expect(state.cache.keys().next().value).to.equal(`${txid}_o0`)
      const sizeBytesBefore = state.sizeBytes
      expect(sizeBytesBefore).not.to.equal(0)
      await state.set(`${txid}_o0`, undefined)
      expect(state.sizeBytes).to.equal(sizeBytesBefore)
      expect(state.cache.keys().next().value).to.equal(`${txid}_o1`)
    })

    it('should throw for different values of same key', async () => {
      const state = new Run.StateCache({ maxSizeMB: 30 })
      await state.set(`${txid}_o0`, { n: 1 })
      await expect(state.set(`${txid}_o0`, { n: 2 })).to.be.rejectedWith('Attempt to set different states for the same location')
      await expect(state.set(`${txid}_o0`, { n: 'a' })).to.be.rejectedWith('Attempt to set different states for the same location')
      await expect(state.set(`${txid}_o0`, { n: 'a', m: 'b' })).to.be.rejectedWith('Attempt to set different states for the same location')
    })
  })

  describe('get', () => {
    it('should return latest state', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      const a2 = await run.load(a.location)
      expectStateGet(a2.location)
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
    })

    it('should return original state', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      stateGetOverrides.set(a.location, undefined)
      const a2 = await run.load(a.location)
      expectStateGet(a2.location)
      expectStateGet(a2.origin)
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
    })

    it('should return middle state', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      const middleLocation = a.location
      a.set(a)
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(middleLocation, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: { $ref: '_o1' } } })
      stateGetOverrides.set(a.location, undefined)
      const a2 = await run.load(a.location)
      expectStateGet(a2.location)
      expectStateGet(middleLocation)
      expectStateSet(middleLocation, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: { $ref: '_o1' } } })
    })

    it('should throw if invalid state', async () => {
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      // Load without a type property
      stateGetOverrides.set(a.location, { state: { owner: run.owner.pubkey, satoshis: 0 } })
      await expect(run.load(a.location)).to.be.rejectedWith('Cached state is missing a valid type and/or state property')
      expectStateGet(a.location)
      // Load without a state property
      stateGetOverrides.set(a.location, { type: A.location })
      await expect(run.load(a.location)).to.be.rejectedWith('Cached state is missing a valid type and/or state property')
      expectStateGet(a.location)
      // Load correct state
      stateGetOverrides.clear()
      await run.load(a.location)
      expectStateGet(a.location)
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
    })

    it('should return undefined if missing', async () => {
      const state = new Run.StateCache({ maxSizeMB: 30 })
      expect(await state.get(`${txid}_o0`)).to.equal(undefined)
    })

    it.skip('should throw if hashed state does not match', async () => {
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      stateGetOverrides.set(a.location, { n: 1 })
      await expect(run.load(a.location)).to.be.rejectedWith('hello')
      expectStateGet(a.location)
    })

    // TODO: pending state of jigs changed, make sure does not interfere in publishNext
  })
})

describe('State', () => {
  it('should throw not implemented errors', async () => {
    await expect(new State().get(`${txid}_o0`)).to.be.rejectedWith('Not implemented')
    await expect(new State().set(`${txid}_o0`, 0)).to.be.rejectedWith('Not implemented')
  })
})


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * token.js
 *
 * Tests for ../lib/token.js
 */

const bsv = __webpack_require__(3)
const { describe, it, beforeEach } = __webpack_require__(1)
const { Run, createRun, deploy } = __webpack_require__(2)
const { Token } = Run
const chai = __webpack_require__(0)
const chaiAsPromised = __webpack_require__(4)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Token', () => {
  const run = createRun()
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())

  class TestToken extends Token { }
  TestToken.decimals = 2

  describe('init', () => {
    it('should mint new tokens', () => {
      const token = new TestToken(100)
      expect(token.amount).to.equal(100)
      expect(token.owner).to.equal(TestToken.owner)
    })

    it('should throw if owner is not minting', async () => {
      await run.deploy(TestToken)
      createRun({ blockchain: run.blockchain })
      expect(() => new TestToken(100)).to.throw('Only TestToken\'s owner may mint')
    })

    it('should throw if class is not extended', () => {
      expect(() => new Token(100)).to.throw('Token must be extended')
    })

    it('should support large amounts', () => {
      expect(new TestToken(2147483647).amount).to.equal(2147483647)
      expect(new TestToken(Number.MAX_SAFE_INTEGER).amount).to.equal(Number.MAX_SAFE_INTEGER)
    })

    it('should throw for bad amounts', () => {
      expect(() => new TestToken()).to.throw('amount is not a number')
      expect(() => new TestToken('1')).to.throw('amount is not a number')
      expect(() => new TestToken(0)).to.throw('amount must be positive')
      expect(() => new TestToken(-1)).to.throw('amount must be positive')
      expect(() => new TestToken(Number.MAX_SAFE_INTEGER + 1)).to.throw('amount too large')
      expect(() => new TestToken(1.5)).to.throw('amount must be an integer')
      expect(() => new TestToken(Infinity)).to.throw('Infinity cannot be serialized')
      expect(() => new TestToken(NaN)).to.throw('NaN cannot be serialized')
    })
  })

  describe('send', () => {
    it('should support sending full amount', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      expect(token.send(pubkey)).to.equal(null)
      expect(token.owner).to.equal(pubkey)
      expect(token.amount).to.equal(100)
    })

    it('should support sending partial amount', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      const change = token.send(pubkey, 30)
      expect(change).to.be.instanceOf(TestToken)
      expect(change.owner).to.equal(run.owner.pubkey)
      expect(change.amount).to.equal(70)
      expect(token.owner).to.equal(pubkey)
      expect(token.amount).to.equal(30)
    })

    it('should throw if send too much', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      expect(() => token.send(pubkey, 101)).to.throw('not enough funds')
    })

    it('should throw if send bad amount', () => {
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      const token = new TestToken(100)
      expect(() => token.send(pubkey, {})).to.throw('amount is not a number')
      expect(() => token.send(pubkey, '1')).to.throw('amount is not a number')
      expect(() => token.send(pubkey, 0)).to.throw('amount must be positive')
      expect(() => token.send(pubkey, -1)).to.throw('amount must be positive')
      expect(() => token.send(pubkey, Number.MAX_SAFE_INTEGER + 1)).to.throw('amount too large')
      expect(() => token.send(pubkey, 1.5)).to.throw('amount must be an integer')
      expect(() => token.send(pubkey, Infinity)).to.throw('Infinity cannot be serialized')
      expect(() => token.send(pubkey, NaN)).to.throw('NaN cannot be serialized')
    })

    it('should throw if send to bad owner', () => {
      const token = new TestToken(100)
      expect(() => token.send(10)).to.throw('owner must be a pubkey string')
      expect(() => token.send('abc', 10)).to.throw('owner is not a valid public key')
    })
  })

  describe('combine', () => {
    it('should support combining two tokens', () => {
      const a = new TestToken(30)
      const b = new TestToken(70)
      const c = TestToken.combine(a, b)
      expect(c).to.be.instanceOf(TestToken)
      expect(c.amount).to.equal(100)
      expect(c.owner).to.equal(run.owner.pubkey)
      expect(a.amount).to.equal(0)
      expect(a.owner).not.to.equal(run.owner.pubkey)
      expect(b.amount).to.equal(0)
      expect(b.owner).not.to.equal(run.owner.pubkey)
    })

    it('should support combining many tokens', () => {
      const tokens = []
      for (let i = 0; i < 10; ++i) tokens.push(new TestToken(1))
      const combined = TestToken.combine(...tokens)
      expect(combined).to.be.instanceOf(TestToken)
      expect(combined.amount).to.equal(10)
      expect(combined.owner).to.equal(run.owner.pubkey)
      tokens.forEach(token => {
        expect(token.amount).to.equal(0)
        expect(token.owner).not.to.equal(run.owner.pubkey)
      })
    })

    it('should support load after combine', async () => {
      const a = new TestToken(30)
      const b = new TestToken(70)
      const c = TestToken.combine(a, b)
      await run.sync()
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain, code: run.code })
      const c2 = await run2.load(c.location)
      expect(c2.amount).to.equal(c.amount)
    })

    it('should throw if combine different owners without signatures', async () => {
      const a = new TestToken(1)
      const b = new TestToken(2)
      const pubkey = new bsv.PrivateKey().publicKey.toString()
      b.send(pubkey)
      await expect(TestToken.combine(a, b).sync()).to.be.rejectedWith('Signature missing for TestToken')
    })

    it('should throw if combined amount is too large', () => {
      const a = new TestToken(Number.MAX_SAFE_INTEGER)
      const b = new TestToken(1)
      expect(() => TestToken.combine(a, b)).to.throw('amount too large')
    })

    it('should throw if combine only one token', () => {
      expect(() => TestToken.combine(new TestToken(1))).to.throw('must combine at least two tokens')
    })

    it('should throw if combine no tokens', () => {
      expect(() => TestToken.combine()).to.throw('must combine at least two tokens')
    })

    it('should throw if combine non-tokens', () => {
      const error = 'cannot combine different token classes'
      expect(() => TestToken.combine(new TestToken(1), 1)).to.throw(error)
      expect(() => TestToken.combine(new TestToken(1), {})).to.throw(error)
      expect(() => TestToken.combine(new TestToken(1), new TestToken(1), {})).to.throw(error)
    })

    it('should throw if combine different token classes', () => {
      const error = 'cannot combine different token classes'
      class DifferentToken extends Token { }
      class ExtendedToken extends TestToken { }
      expect(() => TestToken.combine(new TestToken(1), new DifferentToken(1))).to.throw(error)
      expect(() => TestToken.combine(new TestToken(1), new ExtendedToken(1))).to.throw(error)
    })

    it('should throw if combine duplicate tokens', () => {
      const token = new TestToken(1)
      expect(() => TestToken.combine(token, token)).to.throw('cannot combine duplicate tokens')
    })
  })

  describe('value', () => {
    it('should default to 0', () => {
      class Token2 extends Token { }
      expect(Token2.decimals).to.equal(0)
      expect(new Token2(120).value).to.equal(120)
    })

    it('should divide amount by decimals', () => {
      expect(new TestToken(120).value).to.equal(1.2)
    })
  })

  describe('_onMint', () => {
    it.skip('should support limiting supply', async () => {
      // TODO: need a good way to do this, ideally using class properties
    })
  })

  it.skip('should deploy', async () => {
    await deploy(Token)
  }).timeout(30000)
})


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(Buffer) {/**
 * transaction.js
 *
 * Tests for ../lib/transaction.js
 */

const bsv = __webpack_require__(3)
const { Run, Jig, createRun, payFor } = __webpack_require__(2)
const chai = __webpack_require__(0)
const chaiAsPromised = __webpack_require__(4)
const { expect } = chai
chai.use(chaiAsPromised)
const { describe, it, beforeEach, afterEach } = __webpack_require__(1)
const { extractRunData, encryptRunData, decryptRunData } = Run._util

describe('Transaction', () => {
  const run = createRun()
  const owner = run.owner.pubkey
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())
  afterEach(() => run.transaction.rollback())
  afterEach(() => run.sync())

  describe('inspect', () => {
    it('should support no actions', () => {
      expect(run.transaction.actions.length).to.equal(0)
      class A extends Jig { }
      new A() // eslint-disable-line
      expect(run.transaction.actions.length).to.equal(0)
      // expect(run.transaction.inputs.length).to.equal(0)
      // expect(run.transaction.outputs.length).to.equal(0)
    })

    it('should return new jig action', async () => {
      class A extends Jig { init (x) { this.x = x } }
      run.transaction.begin()
      const a = new A(1)
      expect(run.transaction.actions).to.deep.equal([{ target: a, method: 'init', args: [1] }])
      // expect(run.transaction.inputs.length).to.equal(0)
      // expect(run.transaction.outputs).to.deep.equal([a])
    })

    it('should return jig update action', () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      run.transaction.begin()
      a.set(a)
      expect(run.transaction.actions).to.deep.equal([{ target: a, method: 'set', args: [a] }])
      // expect(run.transaction.inputs).to.deep.equal([a])
      // expect(run.transaction.outputs).to.deep.equal([a])
    })

    it('should return batch of actions', () => {
      class A extends Jig { set (x) { this.x = x } }
      const b = new A()
      run.transaction.begin()
      const a = new A()
      a.set(1)
      a.set([a])
      b.set(2)
      expect(run.transaction.actions).to.deep.equal([
        { target: a, method: 'init', args: [] },
        { target: a, method: 'set', args: [1] },
        { target: a, method: 'set', args: [[a]] },
        { target: b, method: 'set', args: [2] }
      ])
      // expect(run.transaction.inputs).to.deep.equal([b])
      // expect(run.transaction.outputs).to.deep.equal([a, a])
    })
  })

  describe('export', () => {
    it('should create transaction with no operations', () => {
      expect(() => run.transaction.export()).to.throw('No transaction in progress')
      run.transaction.begin()
      const tx = run.transaction.export()
      expect(tx.inputs.length).to.equal(0)
      expect(tx.outputs.length).to.equal(1)
      const runData = extractRunData(tx)
      expect(runData).to.deep.equal({ code: [], actions: [], jigs: 0 })
    })

    it('should create transaction with new jig', () => {
      class A extends Jig { }
      run.transaction.begin()
      const a = new A() // eslint-disable-line
      const tx = run.transaction.export()
      expect(tx.inputs.length).to.equal(0)
      expect(tx.outputs.length).to.equal(3)
      const runData = extractRunData(tx)
      expect(runData).to.deep.equal({
        code: [{ text: A.toString(), owner: run.owner.pubkey }],
        actions: [{ target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }],
        jigs: 1
      })
    })

    it('should throw if there are dependent queued transactions', () => {
      class A extends Jig { set (x) { this.x = x }}
      const a = new A()
      run.transaction.begin()
      a.set(1)
      expect(() => run.transaction.export()).to.throw('must not have any queued transactions before exporting')
    })

    it('should cache repeated calls to export', async () => {
      class A extends Jig { set (x) { this.x = x }}
      run.transaction.begin()
      const a = new A()
      const tx = run.transaction.export()
      expect(run.transaction.export()).to.deep.equal(tx)
      a.set(1)
      const tx2 = run.transaction.export()
      expect(tx2).not.to.deep.equal(tx)
      run.deploy(class B {})
      expect(run.transaction.export()).not.to.deep.equal(tx2)
    })
  })

  describe('import', () => {
    it('should support importing empty actions', async () => {
      run.transaction.begin()
      const tx = run.transaction.export()
      run.transaction.rollback()
      await run.transaction.import(tx)
      expect(run.transaction.actions.length).to.equal(0)
      class A extends Jig {}
      new A() // eslint-disable-line
      const tx2 = run.transaction.export()
      expect(tx2.outputs.length).to.equal(3)
    })

    it('should support importing new jig', async () => {
      run.transaction.begin()
      class B extends Jig { }
      class A extends B { set (x) { this.x = x }}
      A.author = 'abc'
      new A() // eslint-disable-line
      const tx = run.transaction.export()
      expect(tx.outputs.length).to.equal(4)
      run.transaction.rollback()
      await run.transaction.import(tx)
      expect(run.transaction.actions.length).to.equal(1)
      const a = run.transaction.actions[0].target
      expect(() => a.origin).to.throw('sync required before reading origin')
      a.set(1)
      expect(run.transaction.actions.length).to.equal(2)
      const tx2 = run.transaction.export()
      expect(tx2.outputs.length).to.equal(4)
    })

    it('should throw if invalid run transaction', async () => {
      await expect(run.transaction.import(new bsv.Transaction())).to.be.rejectedWith('not a run tx')
    })

    it('should throw if transaction already in progress', async () => {
      run.transaction.begin()
      run.deploy(class A {})
      const tx = run.transaction.export()
      run.transaction.rollback()
      run.transaction.begin()
      run.deploy(class A {})
      await expect(run.transaction.import(tx)).to.be.rejectedWith('transaction already in progress. cannot import.')
    })

    it('should support exporting then importing transaction', async () => {
      const run = createRun({ network: 'mock' })
      class Dragon extends Jig {}
      run.transaction.begin()
      new Dragon() // eslint-disable-line
      new Dragon() // eslint-disable-line
      await run.transaction.pay()
      await run.transaction.sign()
      const tx = run.transaction.export()
      const tx2 = new bsv.Transaction(tx.toBuffer())
      run.transaction.rollback()
      await run.transaction.import(tx2)
      run.transaction.end()
      await run.sync()
    })
  })

  describe('sign', () => {
    it('should fully sign transaction with owner keys', async () => {
      class A extends Jig { set (x) { this.x = x }}
      run.transaction.begin()
      const a = new A()
      // TODO: enable after owner inputs
      // expect(run.transaction.export().isFullySigned()).to.equal(false)
      await run.transaction.sign()
      expect(run.transaction.export().isFullySigned()).to.equal(true)
      run.transaction.end()
      await run.sync()
      run.transaction.begin()
      a.set(1)
      expect(run.transaction.export().isFullySigned()).to.equal(false)
      await run.transaction.sign()
      expect(run.transaction.export().isFullySigned()).to.equal(true)
    })

    it('should support atomic updates', async () => {
      class A extends Jig { set (x) { this.x = x } }
      const a = new A()
      await run.sync()

      const run2 = createRun({ blockchain: run.blockchain })
      const b = new A()
      await run2.sync()

      run2.transaction.begin()
      a.set(1)
      b.set(1)
      await run2.transaction.pay()
      await run2.transaction.sign()
      const tx = run2.transaction.export()

      run.activate()
      await run.transaction.import(tx)
      run.transaction.end()
      await run.sync()
    })
  })

  describe('pay', () => {
    it('should fully pay for transaction with purse', async () => {
      class A extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      await run.transaction.pay()
      const tx = run.transaction.export()
      expect(tx.outputs.length).to.equal(4)
      expect(tx.getFee() >= tx.toBuffer().length).to.equal(true)
    })
  })

  describe('publish', () => {
    const run = createRun({ app: 'biz', blockchain: new Run.Mockchain() })
    const owner = run.owner.pubkey
    let tx = null; let data = null
    const origBroadcast = run.blockchain.broadcast.bind(run.blockchain)
    run.blockchain.broadcast = async txn => {
      tx = txn
      if (tx.outputs[0].script.isSafeDataOut()) {
        data = decryptRunData(tx.outputs[0].script.chunks[5].buf.toString('utf8'))
        expect(tx.outputs.length > data.code.length + data.jigs + 1)
      } else { data = null }
      return origBroadcast(tx)
    }
    beforeEach(() => run.activate())
    beforeEach(() => run.blockchain.block())

    it('should publish new basic jig', async () => {
      class A extends Jig {}
      const a = await new A().sync()
      expect(data.code).to.deep.equal([{ text: A.toString(), owner }])
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args: [], creator: owner }])
      expect(data.jigs).to.equal(1)
      expect(A.location).to.equal(`${tx.hash}_o1`)
      expect(a.location).to.equal(`${tx.hash}_o2`)
    })

    it('should corretly set owners on code and jig outputs', async () => {
      const pubkey = new bsv.PrivateKey().toPublicKey()
      class A extends Jig { f (owner) { this.owner = owner; return this } }
      const a = await new A().sync()
      expect(tx.outputs[1].script.toAddress().toString()).to.equal(run.owner.address)
      expect(tx.outputs[2].script.toAddress().toString()).to.equal(run.owner.address)
      await a.f(pubkey.toString()).sync()
      expect(tx.outputs[1].script.toAddress().toString()).to.equal(pubkey.toAddress().toString())
    })

    it('should correctly set satoshis on code and jig outputs', async () => {
      class A extends Jig { f (satoshis) { this.satoshis = satoshis; return this } }
      const a = await new A().sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      expect(tx.outputs[2].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(1).sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(0).sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(bsv.Transaction.DUST_AMOUNT).sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT)
      await a.f(bsv.Transaction.DUST_AMOUNT + 1).sync()
      expect(tx.outputs[1].satoshis).to.equal(bsv.Transaction.DUST_AMOUNT + 1)
      run.blockchain.fund(run.purse.address, 300000000)
      run.transaction.begin()
      new A().f(1000)
      a.f(100000000)
      run.transaction.end()
      await run.sync()
      expect(tx.outputs[1].satoshis).to.equal(1000)
      expect(tx.outputs[2].satoshis).to.equal(100000000)
    })

    it('should only deploy code once', async () => {
      class A extends Jig {}
      const a = new A()
      await new A().sync() // eslint-disable-line
      expect(data.code).to.deep.equal([])
      const target = `${a.origin.slice(0, 64)}_o1`
      expect(data.actions).to.deep.equal([{ target, method: 'init', args: [], creator: run.owner.pubkey }])
      expect(data.jigs).to.equal(1)
    })

    it('should only deploy code once in batch', async () => {
      class A extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      new A() // eslint-disable-line
      await run.transaction.end().sync()
      expect(data.code).to.deep.equal([{ text: A.toString(), owner }])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
      ])
      expect(data.jigs).to.equal(2)
    })

    it('should deploy code in batch', async () => {
      class A extends Jig {}
      class B extends Jig {}
      run.transaction.begin()
      new A() // eslint-disable-line
      new B() // eslint-disable-line
      await run.transaction.end().sync()
      expect(data.code).to.deep.equal([
        { text: A.toString(), owner },
        { text: B.toString(), owner }
      ])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o2', method: 'init', args: [], creator: run.owner.pubkey }
      ])
      expect(data.jigs).to.equal(2)
    })

    it('should support basic jig args', async () => {
      class A extends Jig { init (a, b) { this.a = a; this.b = b }}
      await new A(1, { a: 'a' }).sync() // eslint-disable-line
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args: [1, { a: 'a' }], creator: run.owner.pubkey }])
    })

    it('should support passing jigs as args', async () => {
      class A extends Jig {
        init (n) { this.n = n }

        f (a) { this.x = a.n; return this }
      }
      const a = await new A(1).sync()
      const b = await new A(2).sync()
      await a.f(b).sync()
      const arg = { $ref: '_r0' }
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'f', args: [arg] }])
      expect(data.refs).to.deep.equal([b.location])
    })

    it('should support passing jigs as args without reading them', async () => {
      class A extends Jig { f (a) { this.a = a; return this } }
      const a = await new A().sync()
      const b = await new A().sync()
      await a.f(b, { a }, [b]).sync()
      const aref = { $ref: '_i0' }
      const bref = { $dup: 0 }
      const dups = [{ $ref: b.location }]
      const args = { $dedup: [bref, { a: aref }, [bref]], dups }
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'f', args: args }])
    })

    it('should support passing classes as args', async () => {
      class A extends Jig {
        init (a) { this.a = a }

        set (x) { this.x = x; return this }
      }
      class B { }
      class C extends A { }
      const a = await new A(A).sync()
      const args = [{ $ref: '_o1' }]
      expect(data.code).to.deep.equal([{ text: A.toString(), owner }])
      expect(data.actions).to.deep.equal([{ target: '_o1', method: 'init', args, creator: run.owner.pubkey }])
      expect(data.jigs).to.equal(1)
      await a.set(B).sync()
      expect(data.code).to.deep.equal([{ text: B.toString(), owner }])
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: '_o1' }] }])
      expect(data.jigs).to.equal(1)
      await new C().sync()
      await a.set(C).sync()
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: `${C.location}` }] }])
      await a.set(A).sync()
      expect(data.actions).to.deep.equal([{ target: '_i0', method: 'set', args: [{ $ref: `${A.location}` }] }])
    })

    it('should support passing classes as args in a batch transaction', async () => {
      class A extends Jig { set (x) { this.x = x } }
      class B { }
      run.transaction.begin()
      const a = new A()
      a.set(B)
      run.transaction.end()
      await run.sync()
      expect(data.code).to.deep.equal([
        { text: A.toString(), owner },
        { text: B.toString(), owner }
      ])
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o3', method: 'set', args: [{ $ref: '_o2' }] }
      ])
      expect(data.jigs).to.equal(1)
    })

    it('should support batch method calls', async () => {
      class A extends Jig { f (a) { this.a = a }}
      run.transaction.begin()
      const a = new A()
      a.f(1)
      a.f(2)
      a.f(3)
      await run.transaction.end().sync()
      expect(data.actions).to.deep.equal([
        { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey },
        { target: '_o2', method: 'f', args: [1] },
        { target: '_o2', method: 'f', args: [2] },
        { target: '_o2', method: 'f', args: [3] }
      ])
      expect(data.jigs).to.equal(1)
    })

    it('should support reading class props', async () => {
      class B extends Jig { }
      const b = new B()
      await run.sync()
      class C extends Jig { }
      C.m = 'n'
      class A extends C { }
      A.s = 'a'
      A.n = 1
      A.a = [true, 'true']
      A.b = false
      A.x = null
      A.o = { x: 2 }
      A.j = b
      run.deploy(A)
      await run.sync()
      const defC = { text: C.toString(), props: { m: 'n' }, owner }
      const propsA = { s: 'a', n: 1, a: [true, 'true'], b: false, x: null, o: { x: 2 }, j: { $ref: `${b.location}` } }
      const defA = { text: A.toString(), deps: { C: '_o1' }, props: propsA, owner }
      expect(data.code).to.deep.equal([defC, defA])
      expect(data.actions).to.deep.equal([])
      expect(data.jigs).to.equal(0)
      expect(A.location).to.equal(`${tx.hash}_o2`)
    })

    it('should support non-spending reads', async () => {
      class A extends Jig { set (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A()
      a.set(1)
      await run.sync()
      const a2 = await run.load(a.location)
      a2.set(2)
      const b = new B()
      b.apply(a2)
      await run.sync()
      expect(data).to.deep.equal({
        code: [],
        actions: [{ target: '_i0', method: 'apply', args: [{ $ref: '_r0' }] }],
        jigs: 1,
        refs: [a2.location]
      })
      expect(b.n).to.equal(2)
    })

    it('should store custom app name', async () => {
      class A extends Jig { }
      await run.deploy(A)
      expect(tx.outputs[0].script.chunks[4].buf.toString('utf8')).to.equal('biz')
    })
  })

  describe('load', () => {
    const build = async (code, actions, inputLocations, outputAddr, jigs, refs = [], nout = jigs + code.length, satoshis) => {
      const bsvNetwork = Run._util.bsvNetwork(run.blockchain.network)
      const addr = outputAddr || new bsv.Address(run.owner.address, bsvNetwork).toString()
      const data = { code, actions, jigs, refs }
      const payload = Buffer.from(encryptRunData(data), 'utf8')
      const script = bsv.Script.buildSafeDataOut([
        Buffer.from('run', 'utf8'),
        Buffer.from([Run.protocol], 'hex'),
        Buffer.alloc(0),
        payload,
        Buffer.from('r11r', 'utf8')
      ])
      const tx = new bsv.Transaction().addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }))
      for (let i = 0; i < nout; i++) { tx.to(addr, satoshis ? satoshis[i] : bsv.Transaction.DUST_AMOUNT) }
      for (const loc of inputLocations) {
        const txid = loc.slice(0, 64)
        const vout = parseInt(loc.slice(66))
        const output = (await run.blockchain.fetch(txid)).outputs[vout]
        tx.from({ txid, vout, script: output.script, satoshis: output.satoshis })
      }
      await payFor(tx, run.purse.bsvPrivateKey, run.blockchain)
      tx.sign(run.owner.bsvPrivateKey)
      await run.blockchain.broadcast(tx)
      return tx.hash
    }
    beforeEach(() => run.blockchain.fund(run.purse.address, 100000000))

    it('should load new jig', async () => {
      class A extends Jig { init (n) { this.n = n }}
      const code = [{ text: A.toString(), owner }]
      const actions = [{ target: '_o1', method: 'init', args: [3], creator: run.owner.pubkey }]
      const txid = await build(code, actions, [], null, 1)
      const a = await run.load(txid + '_o2')
      expect(a.n).to.equal(3)
    })

    it('should load jig method call', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = await new A().sync()
      const actions = [{ target: '_i0', method: 'f', args: [1] }]
      const txid = await build([], actions, [a.location], null, 1)
      const a2 = await run.load(txid + '_o1')
      expect(a2.n).to.equal(1)
    })

    it('should load batch of jig updates', async () => {
      class A extends Jig { f (n) { this.n = n }}
      const a = await new A().sync()
      const b = await new A().sync()
      const actions = [
        { target: '_i0', method: 'f', args: [1] },
        { target: '_i1', method: 'f', args: [2] }
      ]
      const txid = await build([], actions, [a.location, b.location], null, 2)
      const a2 = await run.load(txid + '_o1')
      const b2 = await run.load(txid + '_o2')
      expect(a2.n).to.equal(1)
      expect(b2.n).to.equal(2)
    })

    it('should load complex batch of updates', async () => {
      class B extends Jig { init () { this.n = 1 }}
      class A extends Jig { init (b) { this.n = b.n + 1 } }
      const code = [{ text: B.toString(), owner }, { text: A.toString(), owner }]
      const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
      const args = [{ $ref: '_o3' }]
      const actions = [action1, { target: '_o2', method: 'init', args, creator: run.owner.pubkey }]
      const txid = await build(code, actions, [], null, 2)
      const b = await run.load(txid + '_o3')
      const a = await run.load(txid + '_o4')
      expect(b.n).to.equal(1)
      expect(a.n).to.equal(2)
    })

    it('should load complex args with jig references', async () => {
      class B extends Jig { g () { this.n = 1 } }
      class A extends Jig { f (a, b) { this.a = a; b[0].g() }}
      const b = await new B().sync()
      const b2 = await new B().sync()
      const a = await new A().sync()
      const args = [{ $ref: `${b2.location}` }, [{ $ref: '_i1' }]]
      const actions = [{ target: '_i0', method: 'f', args }]
      const txid = await build([], actions, [a.location, b.location], null, 2)
      const a2 = await run.load(txid + '_o1')
      const b3 = await run.load(txid + '_o2')
      expect(b3.n).to.equal(1)
      expect(a2.a.origin).to.equal(b2.origin)
    })

    it('should support sending to new owner after changing networks', async () => {
      bsv.Networks.defaultNetwork = 'mainnet'
      class A extends Jig { send (to) { this.owner = to } }
      const a = await new A().sync()
      const privkey = new bsv.PrivateKey('testnet')
      const actions = [{ target: '_i0', method: 'send', args: [`${privkey.publicKey.toString()}`] }]
      const txid = await build([], actions, [a.location], privkey.toAddress().toString(), 1)
      await run.load(txid + '_o1')
    })

    it('should support non-spending read refs', async () => {
      class A extends Jig { init (n) { this.n = n } }
      class B extends Jig { apply (a) { this.n = a.n } }
      const a = new A(1)
      const b = new B()
      await run.sync()
      const actions = [{ target: '_i0', method: 'apply', args: [{ $ref: '_r0' }] }]
      const txid = await build([], actions, [b.location], null, 1, [a.location])
      const b2 = await run.load(txid + '_o1')
      expect(b2.n).to.equal(1)
    })

    it('should support setting static class property jig', async () => {
      const run = createRun()
      class Store extends Jig {
        set (value) { this.value = value }
      }
      class SetAction extends Jig {
        init (value) { SetAction.store.set(value) }
      }
      SetAction.store = new Store()
      const action = new SetAction(10)
      await run.sync()

      // Clear caches and reload
      run.deactivate()
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.load(action.location)
    })

    describe('errors', () => {
      it('should throw if no data', async () => {
        const tx = await payFor(new bsv.Transaction(), run.purse.bsvPrivateKey, run.blockchain)
        await run.blockchain.broadcast(tx)
        await expect(run.load(tx.hash + '_o0')).to.be.rejectedWith(`not a run tx: ${tx.hash}`)
        await expect(run.load(tx.hash + '_o1')).to.be.rejectedWith(`not a run tx: ${tx.hash}`)
      })

      it('should throw if bad output target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_o1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('target _o1 missing')
      })

      it('should throw if bad input target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_i1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        const tx = await run.blockchain.fetch(txid)
        const purseOutput = tx.inputs[1].prevTxId.toString('hex') + '_o' + tx.inputs[1].outputIndex
        const error = `Error loading ref _i1 at ${purseOutput}`
        await expect(run.load(txid + '_o1')).to.be.rejectedWith(error)
      })

      it('should throw if nonexistant target', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: 'abc_o1', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad method', async () => {
        class A extends Jig { }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad json args', async () => {
        class A extends Jig { f () { } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: 0 }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad class arg', async () => {
        class A extends Jig { f (n) { this.n = n } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [{ $class: 'Map' }] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('[object Object] cannot be deserialized')
      })

      it('should throw if nonexistant jig arg', async () => {
        class A extends Jig { f (a) { this.a = a } }
        const a = await new A().sync()
        const nonexistant = { $ref: 'abc_o2' }
        const actions = [{ target: '_i0', method: 'f', args: [nonexistant] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('bad number of jigs', async () => {
        class A extends Jig { f () { this.n = 1 } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 0)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('bad number of jigs')
      })

      it('should throw if missing read input', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const b = await new B().sync()
        const code = [{ text: A.toString(), owner }]
        const args = [{ $ref: `${b.location}` }]
        const actions = [{ target: '_o1', method: 'init', args, creator: run.owner.pubkey }]
        const txid = await build(code, actions, [], null, 2)
        await expect(run.load(txid + '_o3')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing write input', async () => {
        class B extends Jig { f () { this.n = 1 } }
        class A extends Jig { f (b) { b.f() } }
        const b = await new B().sync()
        const a = await new A().sync()
        const args = [{ $ref: `${b.location}` }]
        const actions = [{ target: '_i1', method: 'f', args }]
        const txid = await build([], actions, [a.location], null, 2)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing read output', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const b = await new B().sync()
        const code = [{ text: A.toString(), owner }]
        const args = [{ $ref: '_i0' }]
        const actions = [{ target: '_o1', method: 'init', args, creator: run.owner.pubkey }]
        const txid = await build(code, actions, [b.location], null, 2, [], 2)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing write output', async () => {
        class B extends Jig { f () { this.n = 1 } }
        class A extends Jig { f (b) { b.f() } }
        const b = await new B().sync()
        const a = await new A().sync()
        const args = [{ $ref: '_i0' }]
        const actions = [{ target: '_i1', method: 'f', args }]
        const txid = await build([], actions, [b.location, a.location], null, 2, [], 1)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if method throws', async () => {
        class A extends Jig { f () { throw new Error() } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [] }]
        const txid = await build([], actions, [a.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('unexpected exception in f')
      })

      it('should throw if missing input in batch', async () => {
        class A extends Jig { f (b) { this.n = b.n + 1 } }
        const code = [{ text: A.toString(), owner }]
        const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
        const args = [{ $ref: '_i0' }]
        const actions = [action1, { target: '_i1', method: 'f', args }]
        const txid = await build(code, actions, [], null, 2)
        await expect(run.load(txid + '_o3')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if missing output in batch', async () => {
        class B extends Jig { }
        class A extends Jig { init (b) { this.n = b.n } }
        const code = [{ text: B.toString(), owner }, { text: A.toString(), owner }]
        const action1 = { target: '_o1', method: 'init', args: [], creator: run.owner.pubkey }
        const args = [{ $ref: '_o3' }]
        const actions = [action1, { target: '_o2', method: 'init', args, creator: run.owner.pubkey }]
        const txid = await build(code, actions, [], null, 1, 2)
        await expect(run.load(txid + '_o4')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if initial jig owner does not match pk script', async () => {
        class A extends Jig { }
        const code = [{ text: A.toString(), owner }]
        const anotherOwner = new bsv.PrivateKey('testnet').publicKey.toString()
        const actions = [{ target: '_o1', method: 'init', args: [], creator: anotherOwner }]
        const txid = await build(code, actions, [], null, 1)
        await expect(run.load(txid + '_o2')).to.be.rejectedWith('bad owner on output 2')
      })

      it('should throw if updated jig owner does not match pk script', async () => {
        class A extends Jig { send (to) { this.owner = to } }
        const a = await new A().sync()
        const privkey1 = new bsv.PrivateKey('testnet')
        const privkey2 = new bsv.PrivateKey('testnet')
        const actions = [{ target: '_i0', method: 'send', args: [`${privkey1.publicKey.toString()}`] }]
        const txid = await build([], actions, [a.location], privkey2.toAddress().toString(), 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('bad owner on output 1')
      })

      it('should throw if missing target', async () => {
        const actions = [{ target: '_o1`', method: 'init', args: '[]', creator: run.owner.pubkey }]
        const txid = await build([], actions, [], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('missing target _o1')
      })

      it('should throw if satoshis amount is incorrect', async () => {
        class A extends Jig { f (satoshis) { this.satoshis = satoshis } }
        const a = await new A().sync()
        const actions = [{ target: '_i0', method: 'f', args: [1000] }]
        const txid = await build([], actions, [a.location], null, 1, [], 1, [bsv.Transaction.DUST_AMOUNT])
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('bad satoshis on output 1')
      })

      it('should throw if bad class props', async () => {
        class A extends Jig { }
        const code = [{ text: A.toString(), props: { n: { $class: 'Set' } }, owner }]
        const txid = await build(code, [], [], null, 0)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('[object Object] cannot be deserialized')
        const code2 = [{ text: A.toString(), props: { n: { $ref: 123 } }, owner }]
        const txid2 = await build(code2, [], [], null, 0)
        await expect(run.load(txid2 + '_o1')).to.be.rejectedWith('[object Object] cannot be scanned')
      })

      it('should throw if non-existant ref', async () => {
        class A extends Jig { init (n) { this.n = n } }
        class B extends Jig { apply (a) { this.n = a.n } }
        const a = new A(1)
        const b = new B()
        await run.sync()
        const actions = [{ target: '_i0', method: 'apply', args: [{ $ref: '_r1' }] }]
        const txid = await build([], actions, [b.location], null, 1, [a.location])
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('Unexpected ref _r1')
      })

      it('should throw if same jig used with different locations', async () => {
        class A extends Jig { set (n) { this.n = n } }
        class B extends Jig { apply (a, a2) { this.n = a.n + a2.n } }
        const a = new A()
        const b = new B()
        a.set(1)
        await run.sync()
        const a2 = await run.load(a.location)
        a2.set(2)
        await run.sync()
        const args = [{ $ref: '_r0' }, { $ref: '_r1' }]
        const actions = [{ target: '_i0', method: 'apply', args }]
        const txid = await build([], actions, [b.location], null, 1, [a.location, a2.location])
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('Inconsistent worldview')
      })

      it('should throw if same ref has different locations', async () => {
        class A extends Jig { set (n) { this.n = n } }
        class B extends Jig { apply (a, a2) { this.n = a.n + a2.n } }
        const a = new A()
        const b = new B()
        a.set(1)
        await run.sync()
        const a2 = await run.load(a.location)
        a2.set(2)
        await run.sync()
        const args = [{ $ref: `${a.location}` }, { $ref: `${a2.location}` }]
        const actions = [{ target: '_i0', method: 'apply', args }]
        const txid = await build([], actions, [b.location], null, 1)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith('Inconsistent worldview')
      })

      it('should throw if bad refs array', async () => {
        class A extends Jig { set (n) { this.n = n } }
        class B extends Jig { apply (a, a2) { this.n = a.n + a2.n } }
        const a = new A()
        const b = new B()
        a.set(1)
        await run.sync()
        const a2 = await run.load(a.location)
        a2.set(2)
        await run.sync()
        const args = [{ $ref: '_r0' }, { $ref: '_r1' }]
        const actions = [{ target: '_i0', method: 'apply', args }]
        const txid = await build([], actions, [b.location], null, 1, args)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith() // TODO: check error
      })

      it('should throw if bad class owner', async () => {
        class A extends Jig { }
        const differentOwner = new bsv.PrivateKey().publicKey.toString()
        const code = [{ text: A.toString(), owner: differentOwner }]
        const txid = await build(code, [], [], null, 0)
        await expect(run.load(txid + '_o1')).to.be.rejectedWith(`bad def owner: ${txid}_o1`)
      })

      it('should not load old protocol', async () => {
        const loc = '04b294f5d30daf37f075869c864a40a03946fc2b764d75c47f276908445b3bf4_o2'
        const run = createRun({ network: 'test' })
        await expect(run.load(loc)).to.be.rejectedWith('Unsupported run protocol in tx')
      })
    })
  })
})

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(6).Buffer))

/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}


/***/ }),
/* 30 */
/***/ (function(module, exports) {

exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}


/***/ }),
/* 31 */
/***/ (function(module, exports) {

var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

const { describe, it, beforeEach } = __webpack_require__(1)
const { expect } = __webpack_require__(0)
const bsv = __webpack_require__(3)
const { createRun, Run } = __webpack_require__(2)
const { Location, UniqueSet, UniqueMap } = Run

// ------------------------------------------------------------------------------------------------
// A temporary token used for testing
// ------------------------------------------------------------------------------------------------

const randomLocation = () => `${bsv.crypto.Random.getRandomBuffer(32).toString('hex')}_o0`
const randomTempLocation = () => `??${bsv.crypto.Random.getRandomBuffer(31).toString('hex')}_o0`
const testToken = (origin, location) => {
  const token = () => {}
  token.owner = 'someone'
  token.origin = origin
  token.location = location
  token.deploy = () => { token.location = token.origin = randomTempLocation(); return token }
  token.update = () => { token.location = randomTempLocation(); return token }
  token.publish = () => {
    if (!token.origin || !Location.parse(token.origin).txid) token.origin = randomLocation()
    if (!token.location || !Location.parse(token.location).txid) token.location = randomLocation()
    return token
  }
  token.duplicate = () => { return testToken(token.origin, token.location) }
  return token
}

// ------------------------------------------------------------------------------------------------
// UniqueMap
// ------------------------------------------------------------------------------------------------

describe('UniqueMap', () => {
  const run = createRun()
  beforeEach(() => run.activate())

  describe('constructor', () => {
    it('should create empty map', () => {
      expect(new UniqueMap().size).to.equal(0)
    })

    it('should create map from array', () => {
      const arr = [[1, 2], ['a', 'b']]
      const map = new UniqueMap(arr)
      expect(map.size).to.equal(arr.length)
      arr.forEach(x => expect(map.has(x[0])).to.equal(true))
    })

    it('should create map from map', () => {
      const arr = [[1, 2], ['a', 'b']]
      const map = new UniqueMap(arr)
      const map2 = new UniqueMap(map)
      expect(map2.size).to.equal(arr.length)
      arr.forEach(([x]) => expect(map2.has(x)).to.equal(true))
      arr.forEach(([x, y]) => expect(map2.get(x)).to.equal(y))
    })
  })

  describe('clear', () => {
    it('should not throw on empty map', () => {
      expect(() => new UniqueMap().clear()).not.to.throw()
    })

    it('should empty contents', () => {
      const map = new UniqueMap()
      map.set(1, 2)
      map.clear()
      expect(map.size).to.equal(0)
    })

    it('should clear token states', () => {
      const a = testToken()
      const b = testToken().deploy().publish()
      const map = new UniqueMap([[a, 1], [b, 2]])
      map.clear()
      expect(map.size).to.equal(0)
      a.publish()
      const a2 = a.duplicate().update()
      const b2 = b.duplicate().update()
      map.set(a2, 1)
      map.set(b2, 2)
    })
  })

  describe('delete', () => {
    it('should return false if item is not present', () => {
      expect(new UniqueMap().delete(1)).to.equal(false)
      expect(new UniqueMap().delete(testToken())).to.equal(false)
      expect(new UniqueMap().delete(testToken().deploy())).to.equal(false)
      expect(new UniqueMap().delete(testToken().deploy().publish())).to.equal(false)
    })

    it('should delete item and return true if item is present', () => {
      expect(new UniqueMap([[1, 1]]).delete(1)).to.equal(true)
    })

    it('should clear token states', () => {
      const a = testToken()
      const b = testToken().deploy()
      const map = new UniqueMap([[a, 1], [b, 1]])
      map.delete(a)
      map.delete(b)
      expect(map.size).to.equal(0)
      const a2 = a.deploy().publish().duplicate().update()
      const b2 = b.publish().duplicate().update()
      map.set(a2, 1)
      map.set(b2, 1)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken().deploy().publish()
      const map = new UniqueMap([[a, a]])
      const a2 = a.duplicate().update()
      expect(() => map.delete(a2)).to.throw('Inconsistent worldview')
    })
  })

  describe('entries', () => {
    it('should iterate across entries', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      for (const entry of map.entries()) {
        const next = entries.shift()
        expect(entry).to.deep.equal(next)
      }
    })
  })

  describe('forEach', () => {
    it('should execute function for each entry', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      class A {
        constructor () { this.arr = [] }
        push (x, y) { this.arr.push([x, y]) }
      }
      const a = new A()
      map.forEach(a.push, a)
      expect(a.arr).to.deep.equal([[2, 1], ['b', 'a'], [true, false], [[], {}]])
    })
  })

  describe('get', () => {
    it('should return values for basic types and objects in set', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      entries.forEach(entry => expect(map.get(entry[0])).to.equal(entry[1]))
    })

    it('should return undefined for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const map = new UniqueMap()
      entries.forEach(entry => expect(map.get(entry)).to.equal(undefined))
    })

    it('should return undefined after object is deleted', () => {
      const obj = {}
      const map = new UniqueMap([[obj, 1]])
      expect(map.get(obj)).to.equal(1)
      map.delete(obj)
      expect(map.get(obj)).to.equal(undefined)
    })

    it('should return value for tokens in map', () => {
      const a = testToken()
      const b = testToken().deploy()
      const c = testToken().deploy().publish()
      const map = new UniqueMap([[a, 'abc'], [b, 'def'], [c, 'ghi']])
      expect(map.get(a)).to.equal('abc')
      expect(map.get(b)).to.equal('def')
      expect(map.get(c)).to.equal('ghi')
      const a2 = a.deploy().publish().duplicate()
      const b2 = b.publish().duplicate()
      const c2 = c.duplicate()
      expect(map.get(a2)).to.equal('abc')
      expect(map.get(b2)).to.equal('def')
      expect(map.get(c2)).to.equal('ghi')
    })

    it('should return undefined for missing tokens', () => {
      expect(new UniqueMap().get(testToken().deploy())).to.equal(undefined)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken()
      const b = testToken().deploy()
      const c = testToken().deploy().publish()
      const map = new UniqueMap([[a, 1], [b, 2], [c, 3]])
      expect(map.get(a)).to.equal(1)
      expect(map.get(b)).to.equal(2)
      expect(map.get(c)).to.equal(3)
      const a2 = a.deploy().publish().duplicate().update()
      const b2 = b.publish().duplicate().update()
      const c2 = c.duplicate().update().publish()
      expect(() => map.get(a2)).to.throw('Inconsistent worldview')
      expect(() => map.get(b2)).to.throw('Inconsistent worldview')
      expect(() => map.get(c2)).to.throw('Inconsistent worldview')
    })
  })

  describe('has', () => {
    it('should return true for basic types and objects in set', () => {
      const entries = [[1, 2], ['a', 'b'], [false, true], [{}, []]]
      const map = new UniqueMap(entries)
      entries.forEach(entry => expect(map.has(entry[0])).to.equal(true))
    })

    it('should return false for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const map = new UniqueMap()
      entries.forEach(entry => expect(map.has(entry)).to.equal(false))
    })

    it('should return false after object is deleted', () => {
      const obj = {}
      const map = new UniqueMap([[obj, 1]])
      expect(map.has(obj)).to.equal(true)
      map.delete(obj)
      expect(map.has(obj)).to.equal(false)
    })

    it('should return true for tokens in map', () => {
      const a = testToken()
      const b = testToken().deploy().publish().update()
      const map = new UniqueMap([[a, {}], [b, {}]])
      expect(map.has(a)).to.equal(true)
      expect(map.has(b)).to.equal(true)
      expect(map.has(b.duplicate())).to.equal(true)
    })

    it('should return false for missing tokens', () => {
      expect(new UniqueMap().has(testToken())).to.equal(false)
      expect(new UniqueMap().has(testToken().deploy())).to.equal(false)
      expect(new UniqueMap().has(testToken().deploy().publish())).to.equal(false)
      expect(new UniqueMap().has(testToken().deploy().publish().update())).to.equal(false)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken().deploy().publish().update().publish()
      const map = new UniqueMap([[a, []]])
      expect(map.has(a)).to.equal(true)
      expect(() => map.has(a.duplicate().update())).to.throw('Inconsistent worldview')
    })
  })

  describe('set', () => {
    it('should return map regardless', () => {
      const map = new UniqueMap()
      expect(map.set(1, 1)).to.equal(map)
      expect(map.set(1, 1)).to.equal(map)
    })

    it('should set basic types and objects as keys once', () => {
      const map = new UniqueMap()
      const entries = [[1, 2], ['abc', 'def'], [true, false], [{}, []]]
      entries.forEach(([x, y]) => map.set(x, y))
      entries.forEach(([x, y]) => map.set(x, y))
      expect(map.size).to.equal(entries.length)
    })

    it('should set tokens once', () => {
      const a = testToken().deploy().publish()
      const map = new UniqueMap()
      map.set(a, 0)
      const a2 = a.duplicate()
      map.set(a2, 1)
      expect(map.size).to.equal(1)
      expect(map.get(a2)).to.equal(1)
    })

    it('should throw if add two of the same tokens at different states', () => {
      const a = testToken().deploy().publish()
      const a2 = a.duplicate().update()
      const map = new UniqueMap()
      map.set(a2, a2)
      expect(() => map.set(a, {})).to.throw('Inconsistent worldview')
    })
  })

  describe('values', () => {
    it('should return values iterator', () => {
      const entries = [[1, 2], [3, 4]]
      const map = new UniqueMap(entries)
      const arr = []
      for (const val of map.values()) { arr.push(val) }
      expect(arr).to.deep.equal([2, 4])
    })
  })

  describe('misc', () => {
    it('should return UniqueMap for Symbol.species', () => {
      expect(new UniqueMap()[Symbol.species]).to.equal(UniqueMap)
    })

    it('should return iterator for Symbol.iterator', () => {
      expect(new UniqueMap()[Symbol.species]).to.equal(UniqueMap)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// UniqueSet
// ------------------------------------------------------------------------------------------------

describe('UniqueSet', () => {
  describe('constructor', () => {
    it('should create empty set', () => {
      expect(new UniqueSet().size).to.equal(0)
    })

    it('should create set from array', () => {
      const arr = [1, 2, 3]
      const set = new UniqueSet(arr)
      expect(set.size).to.equal(arr.length)
      arr.forEach(x => expect(set.has(x)).to.equal(true))
    })

    it('should create set from set', () => {
      const arr = [1, 2, 3]
      const set = new UniqueSet(arr)
      const set2 = new UniqueSet(set)
      expect(set2.size).to.equal(arr.length)
      arr.forEach(x => expect(set2.has(x)).to.equal(true))
    })
  })

  describe('add', () => {
    it('should return set regardless', () => {
      const set = new UniqueSet()
      expect(set.add(1)).to.equal(set)
      expect(set.add(1)).to.equal(set)
    })

    it('should add basic types and objects once', () => {
      const set = new UniqueSet()
      const entries = [1, 'abc', true, {}, []]
      entries.forEach(entry => set.add(entry))
      entries.forEach(entry => set.add(entry))
      expect(set.size).to.equal(entries.length)
    })

    it('should add tokens once', async () => {
      const a = testToken()
      const b = testToken().deploy().publish()
      const set = new UniqueSet()
      set.add(a)
      set.add(b)
      set.add(b.duplicate())
      expect(set.size).to.equal(2)
    })

    it('should throw if add two of the same tokens at different states', () => {
      const a = testToken()
      const b = testToken().deploy().publish()
      const set = new UniqueSet()
      set.add(a)
      set.add(b)
      const a2 = a.deploy().publish().duplicate().update()
      const b2 = a.duplicate().update().publish()
      expect(() => set.add(a2)).to.throw('Inconsistent worldview')
      expect(() => set.add(b2)).to.throw('Inconsistent worldview')
    })
  })

  describe('clear', () => {
    it('should not throw on empty set', () => {
      expect(() => new UniqueSet().clear()).not.to.throw()
    })

    it('should empty contents', () => {
      const set = new UniqueSet()
      set.add(1)
      set.clear()
      expect(set.size).to.equal(0)
    })

    it('should clear token states', () => {
      const set = new UniqueSet()
      const a = testToken().deploy()
      const b = testToken().deploy().publish()
      set.add(a)
      set.add(b)
      set.clear()
      expect(set.size).to.equal(0)
      set.add(a.publish().duplicate())
      set.add(b.duplicate().update())
      expect(set.size).to.equal(2)
    })
  })

  describe('delete', () => {
    it('should return false if item is not present', () => {
      expect(new UniqueSet().delete(1)).to.equal(false)
      expect(new UniqueSet().delete(testToken())).to.equal(false)
      expect(new UniqueSet().delete(testToken().deploy().publish())).to.equal(false)
    })

    it('should delete item and return true if item is present', () => {
      expect(new UniqueSet([1]).delete(1)).to.equal(true)
    })

    it('should clear token states', () => {
      const set = new UniqueSet()
      const token = testToken().deploy().publish()
      set.add(token)
      set.delete(token)
      expect(set.size).to.equal(0)
      set.add(token.update().publish())
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken()
      const b = testToken().deploy().publish()
      const set = new UniqueSet([a, b])
      expect(() => set.delete(a.deploy().publish().duplicate().update())).to.throw('Inconsistent worldview')
      expect(() => set.delete(b.duplicate().update().publish())).to.throw('Inconsistent worldview')
    })
  })

  describe('entries', () => {
    it('should iterate across entries', () => {
      const arr = [1, 2, 3]
      const set = new UniqueSet(arr)
      for (const entry of set.entries()) {
        const next = arr.shift()
        expect(entry).to.deep.equal([next, next])
      }
    })
  })

  describe('forEach', () => {
    it('should execute function for each entry', () => {
      const set = new UniqueSet([1, 2, 3])
      class A {
        constructor () { this.arr = [] }
        push (x) { this.arr.push(x) }
      }
      const a = new A()
      set.forEach(a.push, a)
      expect(a.arr).to.deep.equal([1, 2, 3])
    })
  })

  describe('has', () => {
    it('should return true for basic types and objects in set', () => {
      const entries = [1, 'a', false, {}, []]
      const set = new UniqueSet(entries)
      entries.forEach(entry => expect(set.has(entry)).to.equal(true))
    })

    it('should return false for basic types and objects not in set', () => {
      const entries = [1, 'a', false, {}, []]
      const set = new UniqueSet()
      entries.forEach(entry => expect(set.has(entry)).to.equal(false))
    })

    it('should return false after object is deleted', () => {
      const obj = {}
      const set = new UniqueSet([obj])
      expect(set.has(obj)).to.equal(true)
      set.delete(obj)
      expect(set.has(obj)).to.equal(false)
    })

    it('should return true for tokens in set', () => {
      const a = testToken().deploy().publish()
      const set = new UniqueSet([a])
      expect(set.has(a)).to.equal(true)
      expect(set.has(a.duplicate())).to.equal(true)
    })

    it('should return false for missing tokens', () => {
      expect(new UniqueSet().has(testToken())).to.equal(false)
      expect(new UniqueSet().has(testToken().deploy())).to.equal(false)
      expect(new UniqueSet().has(testToken().deploy().publish())).to.equal(false)
    })

    it('should throw for same tokens at different states', () => {
      const a = testToken().deploy()
      const b = testToken().deploy().publish().update()
      const set = new UniqueSet([a, b])
      expect(set.has(a)).to.equal(true)
      expect(set.has(b)).to.equal(true)
      expect(() => set.has(a.publish().duplicate().update())).to.throw('Inconsistent worldview')
      expect(() => set.has(b.duplicate().publish())).to.throw('Inconsistent worldview')
    })
  })

  describe('values', () => {
    it('should return values iterator', () => {
      const arr = []
      const set = new UniqueSet([1, 2, 3])
      for (const val of set.values()) { arr.push(val) }
      expect(arr).to.deep.equal([1, 2, 3])
    })
  })

  describe('misc', () => {
    it('should return UniqueSet for Symbol.species', () => {
      expect(new UniqueSet()[Symbol.species]).to.equal(UniqueSet)
    })

    it('should return iterator for Symbol.iterator', () => {
      expect(new UniqueSet()[Symbol.species]).to.equal(UniqueSet)
    })
  })
})

// ------------------------------------------------------------------------------------------------


/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(Buffer) {/**
 * util.js
 *
 * Tests for ../lib/util.js
 */

const bsv = __webpack_require__(3)
const { describe, it } = __webpack_require__(1)
const { expect } = __webpack_require__(0)
const { Run, createRun } = __webpack_require__(2)
const {
  checkOwner,
  checkSatoshis,
  getNormalizedSourceCode,
  deployable,
  checkRunTransaction,
  extractRunData,
  outputType,
  encryptRunData,
  decryptRunData,
  SerialTaskQueue
} = Run._util

createRun()

describe('util', () => {
  describe('checkSatoshis', () => {
    it('should support allowed values', () => {
      expect(() => checkSatoshis(0)).not.to.throw()
      expect(() => checkSatoshis(1)).not.to.throw()
      expect(() => checkSatoshis(bsv.Transaction.DUST_AMOUNT)).not.to.throw()
      expect(() => checkSatoshis(100000000)).not.to.throw()
    })

    it('should throw if bad satoshis', () => {
      expect(() => checkSatoshis()).to.throw('satoshis must be a number')
      expect(() => checkSatoshis(-1)).to.throw('satoshis must be non-negative')
      expect(() => checkSatoshis('0')).to.throw('satoshis must be a number')
      expect(() => checkSatoshis([0])).to.throw('satoshis must be a number')
      expect(() => checkSatoshis(1.5)).to.throw('satoshis must be an integer')
      expect(() => checkSatoshis(NaN)).to.throw('satoshis must be an integer')
      expect(() => checkSatoshis(Infinity)).to.throw('satoshis must be an integer')
      expect(() => checkSatoshis(100000001)).to.throw('satoshis must be less than 100000000')
    })
  })

  describe('checkOwner', () => {
    it('should support valid owners on different networks', () => {
      expect(() => checkOwner(new bsv.PrivateKey('mainnet').publicKey.toString())).not.to.throw()
      expect(() => checkOwner(new bsv.PrivateKey('testnet').publicKey.toString())).not.to.throw()
    })

    it('should throw if bad owner', () => {
      expect(() => checkOwner()).to.throw('owner must be a pubkey string')
      expect(() => checkOwner(123)).to.throw('owner must be a pubkey string')
      expect(() => checkOwner('hello')).to.throw('owner is not a valid public key')
      expect(() => checkOwner(new bsv.PrivateKey())).to.throw('owner must be a pubkey string')
      expect(() => checkOwner(new bsv.PrivateKey().publicKey)).to.throw('owner must be a pubkey string')
      expect(() => checkOwner([new bsv.PrivateKey().publicKey.toString()])).to.throw('owner must be a pubkey string')
    })
  })

  function buildRunTransaction (prefixString, protocolVersionArray, runData, scriptBuilder,
    containDebugInfo, numAdditionalOutputs) {
    const prefix = Buffer.from(prefixString, 'utf8')
    const protocolVersion = Buffer.from(protocolVersionArray, 'hex')
    const appId = Buffer.from('my-app', 'utf8')
    const payload = Buffer.from(encryptRunData(runData), 'utf8')
    const debugInfo = Buffer.from('r11r', 'utf8')
    const parts = containDebugInfo
      ? [prefix, protocolVersion, appId, payload, debugInfo]
      : [prefix, protocolVersion, appId, payload]
    const script = bsv.Script[scriptBuilder](parts)
    const tx = new bsv.Transaction().addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }))
    for (let i = 0; i < numAdditionalOutputs; i++) { tx.to(new bsv.PrivateKey().toAddress(), 100) }
    return tx
  }

  describe('checkRunTransaction', () => {
    it('should detects valid run transaction', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).not.to.throw()
    })

    it('should throw if a money transaction', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('should throw if bad prefix', () => {
      const tx = buildRunTransaction('run0', [Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('should throw if bad protocol version', () => {
      const tx1 = buildRunTransaction('run', [0x00, Run.protocol], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx1)).to.throw(`Unsupported run protocol in tx: ${tx1.hash}`)
      const tx2 = buildRunTransaction('run', [0x02], {}, 'buildSafeDataOut', true, 0)
      expect(() => checkRunTransaction(tx2)).to.throw(`Unsupported run protocol in tx: ${tx2.hash}`)
    })

    it('should throw if not op_false op_return', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildDataOut', true, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })

    it('should throw if no debug info', () => {
      const tx = buildRunTransaction('run', [Run.protocol], {}, 'buildSafeDataOut', false, 0)
      expect(() => checkRunTransaction(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })
  })

  describe('extractRunData', () => {
    it('should decrypt data', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
      expect(extractRunData(tx)).to.deep.equal({ code: [1], jigs: 2 })
    })

    it('should throw if not a run tx', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(() => extractRunData(tx)).to.throw(`not a run tx: ${tx.hash}`)
    })
  })

  describe('outputType', () => {
    it('should return rundata', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 0)
      expect(outputType(tx, 0)).to.equal('rundata')
    })

    it('should return code', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 1)).to.equal('code')
    })

    it('should return jig', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 2)).to.equal('jig')
      expect(outputType(tx, 3)).to.equal('jig')
    })

    it('should return other for change', () => {
      const tx = buildRunTransaction('run', [Run.protocol], { code: [1], jigs: 2 }, 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 4)).to.equal('other')
    })

    it('should return other for money', () => {
      const tx = new bsv.Transaction().to(new bsv.PrivateKey().toAddress(), 100)
      expect(outputType(tx, 0)).to.equal('other')
    })

    it('should return other for bad run data', () => {
      const tx = buildRunTransaction('run', [Run.protocol], 'hello, world', 'buildSafeDataOut', true, 4)
      expect(outputType(tx, 4)).to.equal('other')
    })
  })

  describe('getNormalizedSourceCode', () => {
    // Node 8 and Node 12 have slightly different spacing for getNormalizedSourceCode('function () { return 1 }')
    // We don't need the normalized code to always be exactly the same, as long as it functions the same.
    function expectNormalizedSourceCode (type, text) {
      const removeWhitespace = str => str.replace(/\s+/g, '')
      expect(removeWhitespace(getNormalizedSourceCode(type))).to.equal(removeWhitespace(text))
    }

    it('should get code for basic class', () => {
      class A {}
      expectNormalizedSourceCode(A, 'class A {}')
    })

    it('should get code for basic function', () => {
      function f () { return 1 }
      expectNormalizedSourceCode(f, 'function f () { return 1 }')
    })

    it('should get code for class that extends another class', () => {
      const SomeLibrary = { B: class B { } }
      class A extends SomeLibrary.B {}
      expectNormalizedSourceCode(A, 'class A extends B {}')
    })

    it('should get code for single-line class', () => {
      class B { }
      class A extends B { f () {} }
      expectNormalizedSourceCode(A, 'class A extends B { f () {} }')
    })
  })

  describe('deployable', () => {
    it('should return true for allowed', () => {
      class B { }
      expect(deployable(class A { })).to.equal(true)
      expect(deployable(class A extends B { })).to.equal(true)
      expect(deployable(function f () {})).to.equal(true)
    })

    it('should return false for non-functions', () => {
      expect(deployable()).to.equal(false)
      expect(deployable(1)).to.equal(false)
      expect(deployable({})).to.equal(false)
      expect(deployable(true)).to.equal(false)
    })

    it('should return false for standard library objects', () => {
      expect(deployable(Array)).to.equal(false)
      expect(deployable(Uint8Array)).to.equal(false)
      expect(deployable(Math.sin)).to.equal(false)
    })

    it('should return false for anonymous types', () => {
      expect(deployable(() => {})).to.equal(false)
      expect(deployable(function () { })).to.equal(false)
      expect(deployable(class {})).to.equal(false)
    })
  })

  describe('encryptRunData', () => {
    it('should encrypt run data', () => {
      const encrypted = encryptRunData({ a: 1 })
      expect(encrypted).not.to.equal(JSON.stringify({ a: 1 }))
    })
  })

  describe('decryptRunData', () => {
    it('should decrypt run data', () => {
      const encrypted = encryptRunData({ a: 1 })
      expect(decryptRunData(encrypted)).to.deep.equal({ a: 1 })
    })

    it('should throw for bad data', () => {
      expect(() => decryptRunData(JSON.stringify({ a: 1 }))).to.throw('unable to parse decrypted run data')
    })
  })

  /*
  describe('richObjectToJson', () => {
    it('should convert number', () => {
      expect(richObjectToJson(1)).to.equal(1)
      expect(richObjectToJson(-1)).to.equal(-1)
      expect(richObjectToJson(0)).to.equal(0)
      expect(richObjectToJson(1.5)).to.equal(1.5)
      expect(richObjectToJson(Number.MAX_SAFE_INTEGER)).to.equal(Number.MAX_SAFE_INTEGER)
      expect(richObjectToJson(Number.MAX_VALUE)).to.equal(Number.MAX_VALUE)
      expect(richObjectToJson(Number.MIN_SAFE_INTEGER)).to.equal(Number.MIN_SAFE_INTEGER)
      expect(richObjectToJson(Number.MIN_VALUE)).to.equal(Number.MIN_VALUE)
      expect(() => richObjectToJson(NaN)).to.throw('NaN cannot be serialized to json')
      expect(() => richObjectToJson(Infinity)).to.throw('Infinity cannot be serialized to json')
    })

    it('should convert boolean', () => {
      expect(richObjectToJson(true)).to.equal(true)
      expect(richObjectToJson(false)).to.equal(false)
    })

    it('should convert string', () => {
      expect(richObjectToJson('')).to.equal('')
      expect(richObjectToJson('123abc')).to.equal('123abc')
      expect(richObjectToJson('🐉')).to.equal('🐉')
    })

    it('should throw for function', () => {
      expect(() => richObjectToJson(() => {})).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(function () {})).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(Math.sin)).to.throw('cannot be serialized to json')
    })

    it('should throw for symbol', () => {
      expect(() => richObjectToJson(Symbol.hasInstance)).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
    })

    it('should convert object', () => {
      expect(richObjectToJson(null)).to.equal(null)
      expect(richObjectToJson({})).to.deep.equal({})
      expect(richObjectToJson({ a: 'a', n: 1, b: false })).to.deep.equal({ a: 'a', n: 1, b: false })
      expect(richObjectToJson({ o: { n: 1 } })).to.deep.equal({ o: { n: 1 } })
      expect(() => richObjectToJson({ s: Symbol.hasInstance })).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expect(() => richObjectToJson({ f: () => {} })).to.throw('() => {} cannot be serialized to json')
    })

    it('should convert array', () => {
      expect(richObjectToJson([])).to.deep.equal([])
      expect(richObjectToJson([1, 2, 3])).to.deep.equal([1, 2, 3])
      expect(richObjectToJson([{ a: '1' }, ['b']])).to.deep.equal([{ a: '1' }, ['b']])
      expect(() => richObjectToJson([Symbol.hasInstance])).to.throw('Symbol(Symbol.hasInstance) cannot be serialized to json')
      expect(() => richObjectToJson([() => {}])).to.throw('() => {} cannot be serialized to json')
    })

    it('should convert uint8array', () => {
      expect(richObjectToJson(new Uint8Array(0))).to.deep.equal({ $class: 'Uint8Array', base64Data: '' })
      expect(richObjectToJson(new Uint8Array(1))).to.deep.equal({ $class: 'Uint8Array', base64Data: 'AA==' })
      expect(richObjectToJson(new Uint8Array([1, 2, 3]))).to.deep.equal({ $class: 'Uint8Array', base64Data: 'AQID' })
      expect(richObjectToJson(new Uint8Array([255, 255, 255]))).to.deep.equal({ $class: 'Uint8Array', base64Data: '////' })
    })

    it('should allow duplicates', () => {
      const o = {}
      expect(() => richObjectToJson({ a: o, b: o })).not.to.throw()
    })

    it('should throw for circular references', () => {
      const a = {}
      const b = { a }
      a.b = b
      expect(() => richObjectToJson(a)).to.throw('circular reference detected: a')
    })

    it('should throw for unserializable types', () => {
      expect(() => richObjectToJson(new class {}())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(new class extends Array {}())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(new Set())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(new Map())).to.throw('cannot be serialized to json')
      expect(() => richObjectToJson(Buffer.alloc(0))).to.throw('cannot be serialized to json')
    })

    it('should convert undefined', () => {
      expect(richObjectToJson(undefined)).to.deep.equal({ $class: 'undefined' })
    })

    it('should throw for $ properties', () => {
      expect(() => richObjectToJson({ $class: 'unknown' })).to.throw('$ properties must not be defined')
      expect(() => richObjectToJson({ $ref: 'unknown' })).to.throw('$ properties must not be defined')
      expect(() => richObjectToJson({ $n: 1 })).to.throw('$ properties must not be defined')
    })

    it('should support custom packers', () => {
      const setPacker = x => { if (x && x.constructor === Set) return { $class: 'set' } }
      const mapPacker = x => { if (x && x.constructor === Map) return { $class: 'map' } }
      expect(richObjectToJson({ a: [1], s: new Set(), m: new Map() }, [setPacker, mapPacker]))
        .to.deep.equal({ a: [1], s: { $class: 'set' }, m: { $class: 'map' } })
    })
  })

  describe('jsonToRichObject', () => {
    it('should convert number', () => {
      expect(jsonToRichObject(1)).to.equal(1)
      expect(jsonToRichObject(-1)).to.equal(-1)
      expect(jsonToRichObject(0)).to.equal(0)
      expect(jsonToRichObject(1.5)).to.equal(1.5)
      expect(jsonToRichObject(Number.MAX_SAFE_INTEGER)).to.equal(Number.MAX_SAFE_INTEGER)
      expect(jsonToRichObject(Number.MAX_VALUE)).to.equal(Number.MAX_VALUE)
      expect(jsonToRichObject(Number.MIN_SAFE_INTEGER)).to.equal(Number.MIN_SAFE_INTEGER)
      expect(jsonToRichObject(Number.MIN_VALUE)).to.equal(Number.MIN_VALUE)
      expect(() => jsonToRichObject(NaN)).to.throw('JSON should not contain NaN')
      expect(() => jsonToRichObject(Infinity)).to.throw('JSON should not contain Infinity')
    })

    it('should convert boolean', () => {
      expect(jsonToRichObject(true)).to.equal(true)
      expect(jsonToRichObject(false)).to.equal(false)
    })

    it('should convert string', () => {
      expect(jsonToRichObject('')).to.equal('')
      expect(jsonToRichObject('123abc')).to.equal('123abc')
      expect(jsonToRichObject('🐉')).to.equal('🐉')
    })

    it('should throw for function', () => {
      expect(() => jsonToRichObject(() => {})).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(function () {})).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(Math.sin)).to.throw('JSON should not contain function')
    })

    it('should throw for symbol', () => {
      expect(() => jsonToRichObject(Symbol.hasInstance)).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
    })

    it('should convert object', () => {
      expect(jsonToRichObject(null)).to.equal(null)
      expect(jsonToRichObject({})).to.deep.equal({})
      expect(jsonToRichObject({ a: 'a', n: 1, b: false })).to.deep.equal({ a: 'a', n: 1, b: false })
      expect(jsonToRichObject({ o: { n: 1 } })).to.deep.equal({ o: { n: 1 } })
      expect(() => jsonToRichObject({ s: Symbol.hasInstance })).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
      expect(() => jsonToRichObject({ f: () => {} })).to.throw('JSON should not contain () => {}')
    })

    it('should convert array', () => {
      expect(jsonToRichObject([])).to.deep.equal([])
      expect(jsonToRichObject([1, 2, 3])).to.deep.equal([1, 2, 3])
      expect(jsonToRichObject([{ a: '1' }, ['b']])).to.deep.equal([{ a: '1' }, ['b']])
      expect(() => jsonToRichObject([Symbol.hasInstance])).to.throw('JSON should not contain Symbol(Symbol.hasInstance)')
      expect(() => jsonToRichObject([() => {}])).to.throw('JSON should not contain () => {}')
    })

    it('should convert uint8array', () => {
      const Uint8Array = run.code.intrinsics.default.Uint8Array
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: '' })).to.deep.equal(new Uint8Array(0))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: 'AA==' })).to.deep.equal(new Uint8Array(1))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: 'AQID' })).to.deep.equal(new Uint8Array([1, 2, 3]))
      expect(jsonToRichObject({ $class: 'Uint8Array', base64Data: '////' })).to.deep.equal(new Uint8Array([255, 255, 255]))
    })

    it('should throw for unserializable types', () => {
      expect(() => jsonToRichObject(new class {}())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(new class extends Array {}())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(new Set())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(new Map())).to.throw('JSON should not contain')
      expect(() => jsonToRichObject(Buffer.alloc(0))).to.throw('JSON should not contain')
    })

    it('should convert undefined', () => {
      expect(jsonToRichObject({ undef: { $class: 'undefined' } })).to.deep.equal({ undef: undefined })
      expect(jsonToRichObject({ $class: 'undefined' })).to.equal(undefined)
    })

    it('should throw for $class', () => {
      expect(() => jsonToRichObject({ $class: 'unknown' })).to.throw('$ properties must not be defined')
    })

    it('should support custom unpackers', () => {
      const setUnpacker = x => { if (x.$class === 'set') return new Set() }
      const mapUnpacker = x => { if (x.$class === 'map') return new Map() }
      expect(jsonToRichObject({ a: [1], s: { $class: 'set' }, m: { $class: 'map' } }, [setUnpacker, mapUnpacker])).to.deep.equal({ a: [1], s: new Set(), m: new Map() })
      const rootUnpacker = (x, p, k) => { if (p === null) return 1 }
      expect(jsonToRichObject({}, [rootUnpacker])).to.equal(1)
      const namedUnpacker = (x, p, k) => { if (k === 'a') return 1 }
      expect(jsonToRichObject({ a: [], b: 2 }, [namedUnpacker])).to.deep.equal({ a: 1, b: 2 })
    })
  })

  describe('extractJigsAndCodeToArray', () => {
    it('should support basic extraction', () => {
      class A extends Jig { }
      const arr = []
      const obj = { a: new A(), b: [new A(), A] }
      const json = richObjectToJson(obj, [extractJigsAndCodeToArray(arr)])
      expect(json).to.deep.equal({ a: { $index: 0 }, b: [{ $index: 1 }, { $index: 2 }] })
      expect(arr.length).to.equal(3)
      expect(arr[0]).to.equal(obj.a)
      expect(arr[1]).to.equal(obj.b[0])
      expect(arr[2]).to.equal(obj.b[1])
    })
  })

  describe('injectJigsAndCodeFromArray', () => {
    it('should support basic injection', () => {
      class A extends Jig { }
      const arr = [new A(), new A(), A]
      const json = { a: { $index: 0 }, b: [{ $index: 1 }, { $index: 2 }] }
      const obj = jsonToRichObject(json, [injectJigsAndCodeFromArray(arr)])
      expect(obj.a).to.equal(arr[0])
      expect(obj.b[0]).to.equal(arr[1])
      expect(obj.b[1]).to.equal(arr[2])
    })
  })
  */

  describe('SerialTaskQueue', () => {
    const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)) }

    it('should serialize tasks in order', async () => {
      const queue = new SerialTaskQueue()
      const order = []; const promises = []
      promises.push(queue.enqueue(async () => { await sleep(5); order.push(1) }))
      promises.push(queue.enqueue(async () => { await sleep(3); order.push(2) }))
      promises.push(queue.enqueue(async () => { await sleep(1); order.push(3) }))
      await Promise.all(promises)
      expect(order).to.deep.equal([1, 2, 3])
    })

    it('should support stops and starts', async () => {
      const queue = new SerialTaskQueue()
      let done1 = false; let done2 = false
      await queue.enqueue(() => { done1 = true })
      expect(done1).to.equal(true)
      await queue.enqueue(() => { done2 = true })
      expect(done2).to.equal(true)
    })
  })
})

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(6).Buffer))

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(Buffer) {const bsv = __webpack_require__(3)
const { describe, it } = __webpack_require__(1)
const { expect } = __webpack_require__(0)
const { Run, createRun } = __webpack_require__(2)
const { Evaluator, _util, Xray, Intrinsics } = Run
const { display } = _util

createRun()

// ------------------------------------------------------------------------------------------------
// Test vector class
// ------------------------------------------------------------------------------------------------

class TestVector {
  constructor (x) {
    this.x = x
    this.scannable = true
    this.cloneable = true
    this.serializable = true
    this.deserializable = true
    this.serializedX = x
    this.cloneChecks = []
    this.serializedChecks = []
    this.deserializedChecks = []
    this.intrinsics = Intrinsics.defaultIntrinsics
  }

  unscannable () { this.scannable = false; return this }
  uncloneable () { this.cloneable = false; return this }
  unserializable () { this.serializable = false; return this }
  undeserializable () { this.deserializable = false; return this }
  serialized (value) { this.serializedX = value; return this }

  checkClone (f) { this.cloneChecks.push(f); return this }
  checkSerialized (f) { this.serializedChecks.push(f); return this }
  checkDeserialized (f) { this.deserializedChecks.push(f); return this }

  useIntrinsics (intrinsics) { this.intrinsics = intrinsics; return this }

  testScan () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)
      if (this.scannable) {
        expect(() => xray.scan(this.x)).not.to.throw()
      } else {
        expect(() => xray.scan(this.x)).to.throw(`${display(this.x)} cannot be scanned`)
      }
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testCloneable () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)
      expect(xray.cloneable(this.x)).to.equal(this.cloneable)
      expect(xray.caches.cloneable.get(this.x)).to.equal(this.cloneable)
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testSerializable () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)
      expect(xray.serializable(this.x)).to.equal(this.serializable)
      expect(xray.caches.serializable.get(this.x)).to.equal(this.serializable)
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testDeserializable () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)
      expect(xray.deserializable(this.serializedX)).to.equal(this.deserializable)
      expect(xray.caches.deserializable.get(this.serializedX)).to.equal(this.deserializable)
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testClone () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)

      if (!this.cloneable) {
        expect(() => xray.clone(this.x)).to.throw(`${display(this.x)} cannot be cloned`)
        return
      }

      const cloned = xray.clone(this.x)

      if (typeof this.x === 'object' && this.x) {
        expect(cloned).not.to.equal(this.x)
      }
      expect(cloned).to.deep.equal(this.x)
      expect(xray.caches.clone.get(this.x)).to.deep.equal(this.x)

      this.cloneChecks.forEach(f => f(cloned))
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testSerialize () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)

      if (!this.serializable) {
        expect(() => xray.serialize(this.x)).to.throw(`${display(this.x)} cannot be serialized`)
        return
      }

      const serialized = xray.serialize(this.x)

      if (typeof this.x === 'object' && this.x) {
        expect(serialized).not.to.equal(this.serializedX)
      }
      expect(serialized).to.deep.equal(this.serializedX)
      expect(xray.caches.serialize.get(this.x)).to.deep.equal(this.serializedX)

      this.serializedChecks.forEach(f => f(serialized))
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }

  testDeserialize () {
    try {
      const xray = new Xray().useIntrinsics(this.intrinsics)

      if (!this.deserializable) {
        expect(() => xray.deserialize(this.serializedX)).to.throw(`${display(this.serializedX)} cannot be deserialized`)
        return
      }

      const deserialized = xray.deserialize(this.serializedX)

      if (typeof this.x === 'object' && this.x) {
        expect(deserialized).not.to.equal(this.x)
      }
      expect(deserialized).to.deep.equal(this.x)
      expect(xray.caches.deserialize.get(this.serializedX)).to.deep.equal(this.x)

      this.deserializedChecks.forEach(f => f(deserialized))
    } catch (e) { throw new Error(`Test failed for ${display(this.x)}\n\n${e}`) }
  }
}

// ------------------------------------------------------------------------------------------------
// Test vectors
// ------------------------------------------------------------------------------------------------

const vectors = []

function addTestVectors (intrinsics, testIntrinsics) {
  const {
    Object, Array, Set, Map, Uint8Array, Proxy, Int8Array,
    Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array,
    Float32Array, Float64Array, console, Function, Error, Math, WebAssembly,
    String, Date, JSON, Promise, WeakSet, WeakMap, RegExp
  } = testIntrinsics

  function addTestVector (x) {
    const vector = new TestVector(x).useIntrinsics(intrinsics)
    vectors.push(vector)
    return vector
  }

  // Booleans
  addTestVector(true)
  addTestVector(false)

  // Numbers
  addTestVector(0)
  addTestVector(-0)
  addTestVector(-1)
  addTestVector(Number.MAX_SAFE_INTEGER)
  addTestVector(Number.MIN_SAFE_INTEGER)
  addTestVector(Number.MAX_VALUE)
  addTestVector(Number.MIN_VALUE)
  addTestVector(0.5)
  addTestVector(-1.5)
  addTestVector(0.1234567890987654321)
  addTestVector(NaN).unserializable().undeserializable()
  addTestVector(Infinity).unserializable().undeserializable()
  addTestVector(-Infinity).unserializable().undeserializable()

  // Strings
  addTestVector('')
  addTestVector('abc')
  addTestVector('🐉')
  let longString = ''
  for (let i = 0; i < 10000; i++) longString += 'abcdefghijklmnopqrstuvwxyz'
  addTestVector(longString)

  // Undefined
  addTestVector(undefined).serialized({ $undef: 1 })

  // Objects
  addTestVector(null)
  addTestVector({})
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
  addTestVector({ n: 1 })
  addTestVector({ o1: { o2: { o3: {} } } })
  addTestVector({ s: 't', a: [1], b: true, n: 0, o: { n2: 2 }, z: null })
  addTestVector(new Proxy({}, {}))
  addTestVector({ $undef: 1 }).serialized(undefined).unserializable().undeserializable()
  addTestVector({ $ref: '123' }).unserializable().undeserializable()
  addTestVector({ $n: '0' }).unserializable().undeserializable()
  addTestVector({ $invalid: 1 }).unserializable().undeserializable()
  addTestVector({ undef: undefined }).serialized({ undef: { $undef: 1 } })

  // Array
  addTestVector([])
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Array))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Array))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Array))
  addTestVector([1, 'a', true])
  addTestVector([[[]]])
  const z = [[1], [2], [3]]
  addTestVector(z)
  const arr = [1]
  arr.x = 2
  addTestVector(arr)
  addTestVector([undefined, null]).serialized([{ $undef: 1 }, null])
  class CustomArray extends Array {}
  addTestVector(CustomArray.from([])).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector([{ $invalid: 1 }]).unserializable().undeserializable()

  // Sets
  addTestVector(new Set()).serialized({ $set: [] })
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Set))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Set))
  addTestVector(new Set([1, 2, 3])).serialized({ $set: [1, 2, 3] })
  addTestVector(new Set([new Set(['a', false, null]), {}, []]))
    .serialized({ $set: [{ $set: ['a', false, null] }, {}, []] })
  const setWithProps = new Set([0])
  Object.assign(setWithProps, { a: 'a', b: [], c: new Set() })
  addTestVector(setWithProps).serialized({ $set: [0], props: { a: 'a', b: [], c: { $set: [] } } })
  addTestVector({ $set: null }).unserializable().undeserializable()
  addTestVector({ $set: {} }).unserializable().undeserializable()
  addTestVector({ $set: [{ $invalid: 1 }] }).unserializable().undeserializable()
  addTestVector({ $set: new Uint8Array() }).unserializable().undeserializable()

  // Maps
  addTestVector(new Map()).serialized({ $map: [] })
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Map))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Map))
  addTestVector(new Map([[1, 2]])).serialized({ $map: [[1, 2]] })
  addTestVector(new Map([['a', true], ['b', false]])).serialized({ $map: [['a', true], ['b', false]] })
  addTestVector(new Map([[0, new Map()]])).serialized({ $map: [[0, { $map: [] }]] })
  const mapWithProps = new Map([[0, 1]])
  Object.assign(mapWithProps, { x: new Set() })
  addTestVector(mapWithProps).serialized({ $map: [[0, 1]], props: { x: { $set: [] } } })
  addTestVector({ $map: null }).unserializable().undeserializable()
  addTestVector({ $map: {} }).unserializable().undeserializable()
  addTestVector({ $map: [{}] }).unserializable().undeserializable()
  addTestVector({ $map: [[1, 2, 3]] }).unserializable().undeserializable()

  // Uint8Array
  addTestVector(new Uint8Array()).serialized({ $ui8a: '' })
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Uint8Array))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Uint8Array))
  addTestVector(new Uint8Array([0x00, 0x01])).serialized({ $ui8a: 'AAE=' })
  const hellobuf = Buffer.from('hello', 'utf8')
  addTestVector(new Uint8Array(hellobuf)).serialized({ $ui8a: hellobuf.toString('base64') })
  const randombuf = bsv.crypto.Random.getRandomBuffer(1024)
  addTestVector(new Uint8Array(randombuf)).serialized({ $ui8a: randombuf.toString('base64') })
  const bufWithProps = new Uint8Array()
  bufWithProps.x = 1
  addTestVector(bufWithProps).serialized({ $ui8a: '' }).unscannable().uncloneable().unserializable()
  addTestVector(Buffer.alloc(0)).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector({ $ui8a: [] }).unserializable().undeserializable()
  addTestVector({ $ui8a: {} }).unserializable().undeserializable()
  addTestVector({ $ui8a: '🐉' }).unserializable().undeserializable()
  addTestVector({ $ui8a: new Uint8Array() }).unserializable().undeserializable()

  // Duplicate references
  const objDup = { n: null }
  const dupObj = { a: objDup, b: objDup }
  addTestVector(dupObj)
    .serialized({ $dedup: { a: { $dup: 0 }, b: { $dup: 0 } }, dups: [{ n: null }] })
    .checkDeserialized(x => expect(x.a).to.equal(x.b))
  const arrDup = [undefined]
  const dupArr = [arrDup, arrDup]
  addTestVector(dupArr)
    .serialized({ $dedup: [{ $dup: 0 }, { $dup: 0 }], dups: [[{ $undef: 1 }]] })
    .checkDeserialized(x => expect(x[0]).to.equal(x[1]))
  const bufDup = new Uint8Array()
  const dupBuf = [bufDup, bufDup]
  addTestVector(dupBuf)
    .serialized({ $dedup: [{ $dup: 0 }, { $dup: 0 }], dups: [{ $ui8a: '' }] })
    .checkDeserialized(x => expect(x[0]).to.equal(x[1]))
  const setDup = new Set()
  const dupSet = new Set([{ a: setDup }, { b: setDup }])
  addTestVector(dupSet)
    .serialized({ $dedup: { $set: [{ a: { $dup: 0 } }, { b: { $dup: 0 } }] }, dups: [{ $set: [] }] })
    .checkDeserialized(x => {
      const keys = Array.from(x)
      expect(keys[0].a).to.equal(keys[1].b)
      expect(keys[0].a).not.to.equal(undefined)
    })
  const mapDup = new Map()
  const dupMap = new Map([[0, mapDup], [1, mapDup]])
  addTestVector(dupMap)
    .serialized({ $dedup: { $map: [[0, { $dup: 0 }], [1, { $dup: 0 }]] }, dups: [{ $map: [] }] })
    .checkDeserialized(x => expect(x.has(0)).to.equal(true))
    .checkDeserialized(x => expect(x.has(1)).to.equal(true))
    .checkDeserialized(x => expect(x.get(0)).to.equal(x.get(1)))

  // Multiple dups in a tree
  const multipleDups = { arr: [] }
  multipleDups.a = []
  multipleDups.arr.push(multipleDups.a)
  multipleDups.b = new Uint8Array()
  multipleDups.arr.push(multipleDups.b)
  multipleDups.c = new Set()
  multipleDups.arr.push(multipleDups.c)
  addTestVector(multipleDups)
    .serialized({
      $dedup: { a: { $dup: 0 }, b: { $dup: 1 }, c: { $dup: 2 }, arr: [{ $dup: 0 }, { $dup: 1 }, { $dup: 2 }] },
      dups: [[], { $ui8a: '' }, { $set: [] }]
    })
    .checkDeserialized(x => expect(x.a).to.equal(x.arr[0]))
    .checkDeserialized(x => expect(x.b).to.equal(x.arr[1]))
    .checkDeserialized(x => expect(x.c).to.equal(x.arr[2]))
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))

  // Circular references
  const circObj = {}
  circObj.c = circObj
  addTestVector(circObj)
    .serialized({
      $dedup: { $dup: 0 },
      dups: [{ c: { $dup: 0 } }]
    })
    .checkDeserialized(x => expect(x.c).to.equal(x))
  const circArr = []
  circArr.push(circArr)
  addTestVector(circArr)
    .serialized({
      $dedup: { $dup: 0 },
      dups: [[{ $dup: 0 }]]
    })
    .checkDeserialized(x => expect(x[0]).to.equal(x))
  const circSet = new Set()
  circSet.add(circSet)
  circSet.c = circSet
  addTestVector(circSet)
    .serialized({
      $dedup: { $dup: 0 },
      dups: [{ $set: [{ $dup: 0 }], props: { c: { $dup: 0 } } }]
    })
    .checkDeserialized(x => expect(x.c).to.equal(x.values().next().value))
  const circMap = new Map()
  circMap.set(circMap, 1)
  circMap.set(1, circMap)
  circMap.m = circMap
  addTestVector(circMap)
    .serialized({
      $dedup: { $dup: 0 },
      dups: [{
        $map: [[{ $dup: 0 }, 1], [1, { $dup: 0 }]],
        props: { m: { $dup: 0 } }
      }]
    })
    .checkDeserialized(x => expect(x.m).to.equal(x.get(1)))
    .checkDeserialized(x => expect(x.get(x.m)).to.equal(1))
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Map))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Map))

  // Complex circular dups
  const complexMap = new Map()
  const complexObj = {}
  const complexArr = []
  complexArr.push(complexMap)
  complexArr.push(complexObj)
  complexMap.set('a', complexObj)
  complexObj.b = complexArr
  addTestVector(complexArr)
    .serialized({
      $dedup: { $dup: 0 },
      dups: [[{ $map: [['a', { $dup: 1 }]] }, { $dup: 1 }], { b: { $dup: 0 } }]
    })
    .checkDeserialized(x => expect(x).to.equal(x[0].get('a').b))
    .checkDeserialized(x => expect(x[0]).to.equal(x[0].get('a').b[0]))
    .checkDeserialized(x => expect(x[0].get('a')).to.equal(x[0].get('a').b[0].get('a')))
    .checkClone(x => expect(x.constructor).to.equal(intrinsics.default.Array))
    .checkSerialized(x => expect(x.constructor).to.equal(intrinsics.default.Object))
    .checkDeserialized(x => expect(x.constructor).to.equal(intrinsics.default.Array))

  // Bad dedup serialization
  addTestVector({ $dedup: {} }).unserializable().undeserializable()
  addTestVector({ $dedup: {}, dups: {} }).unserializable().undeserializable()
  addTestVector({ $dedup: { $dup: 0 }, dups: [] }).unserializable().undeserializable()
  addTestVector({ $dedup: { $dup: 0 }, dups: [{ $dup: 1 }] }).unserializable().undeserializable()

  // Unsupported TypedArrays
  addTestVector(new Int8Array()).serialized({ $i8a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Uint8ClampedArray()).serialized({ $ui8ca: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Int16Array()).serialized({ $i16a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Uint16Array()).serialized({ $u16a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Int32Array()).serialized({ $i32a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Uint32Array()).serialized({ $ui32a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Float32Array()).serialized({ $f32a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new Float64Array()).serialized({ $f64a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  if (typeof BigInt64Array !== 'undefined') {
    // eslint-disable-next-line
    addTestVector(new BigInt64Array()).serialized({ $bi64a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  }
  if (typeof BigUint64Array !== 'undefined') {
    // eslint-disable-next-line
    addTestVector(new BigUint64Array()).serialized({ $bui64a: '' }).unscannable().uncloneable().unserializable().undeserializable()
  }

  // Symbols
  addTestVector(Symbol.hasInstance).uncloneable().unserializable().undeserializable()
  addTestVector(Symbol.iterator).uncloneable().unserializable().undeserializable()
  addTestVector(Symbol.species).uncloneable().unserializable().undeserializable()
  addTestVector(Symbol.unscopables).uncloneable().unserializable().undeserializable()

  // Intrinsic objects
  addTestVector(console).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Object).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Function).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Error).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Math).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Buffer).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(String).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Date).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(JSON).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Promise).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(Proxy).unscannable().uncloneable().unserializable().undeserializable()
  if (typeof WebAssembly !== 'undefined') {
    // eslint-disable-next-line
    addTestVector(WebAssembly).unscannable().uncloneable().unserializable().undeserializable()
  }

  // Unsupported objects
  addTestVector(new Date()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new WeakSet()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new WeakMap()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new RegExp()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(/^abc/).unscannable().uncloneable().unserializable().undeserializable()

  // Unknown intrinsics
  const sandboxIntrinsics = new Evaluator().intrinsics.allowed[1]
  addTestVector(new sandboxIntrinsics.Uint8Array()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new sandboxIntrinsics.Set()).unscannable().uncloneable().unserializable().undeserializable()
  addTestVector(new sandboxIntrinsics.Map()).unscannable().uncloneable().unserializable().undeserializable()

  // Deployable
  // finish implementing serializable, etc.
  // register test as needing deployable, and which deployables they are
  // check deployables after scan, etc.
  // test xray with and without support

  // allow deployables in other tests, even when don't support it

  // TODO: Wrap errors for tests to print what test it is

  // TODO: Circular arb object

  // Deployable
  /*
  addTestVector(class { }, { deployable: true })
  addTestVector(class A { }, { deployable: true })
  addTestVector(class { method() { return null }}, { deployable: true })
  addTestVector(class B { constructor() {}}, { deployable: true })
  addTestVector(function f() {}, { deployable: true })
  addTestVector(function add(a, b) { return a + b}, { deployable: true })
  addTestVector(function () { return '123' }, { deployable: true })
  addTestVector(() => {}, { deployable: true })
  addTestVector(x => x, { deployable: true })

  // Non-deployable
  addTestVector(Math.random, { deployable: false })
  addTestVector(Array.prototype.indexOf, { deployable: false })
  addTestVector(WeakSet.prototype.has, { deployable: false })
  addTestVector(String.prototype.endsWith, { deployable: false })
  addTestVector(isNaN, { deployable: false })
  addTestVector(isFinite, { deployable: false })
  addTestVector(parseInt, { deployable: false })
  addTestVector(escape, { deployable: false })
  addTestVector(eval, { deployable: false })
  */

  // Tokens

  // TODO: if (key.startsWith('$')) throw new Error('$ properties must not be defined')
  // -On Set properties
  // Port existing classes over
}

const evaluator = new Evaluator()

const globalIntrinsics = new Intrinsics()
addTestVectors(globalIntrinsics, globalIntrinsics.allowed[0])

const sesIntrinsics = new Intrinsics()
sesIntrinsics.set(evaluator.intrinsics.default)
addTestVectors(sesIntrinsics, sesIntrinsics.allowed[0])

// const allIntrinsics = new Intrinsics()
// allIntrinsics.use(evaluator.intrinsics.default)
// addTestVectors(allIntrinsics, allIntrinsics.allowed[0])
// addTestVectors(allIntrinsics, allIntrinsics.allowed[1])

// ------------------------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------------------------

describe('Xray', () => {
  describe('constructor', () => {
    it('should use default intrinsics', () => {
      expect(new Xray().intrinsics).to.equal(Intrinsics.defaultIntrinsics)
    })
  })

  describe('scan', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testScan())
    })
  })

  describe('cloneable', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testCloneable())
    })
  })

  describe('serializable', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testSerializable())
    })
  })

  describe('deserializable', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testDeserializable())
    })
  })

  describe('clone', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testClone())
    })
  })

  describe('serialize', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testSerialize())
    })
  })

  describe('deserialize', () => {
    it('should pass test vectors', () => {
      vectors.forEach(vector => vector.testDeserialize())
    })
  })
})

// ------------------------------------------------------------------------------------------------

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(6).Buffer))

/***/ })
/******/ ]);