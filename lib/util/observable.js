/**
 * observable.js
 *
 * Lightweight event observable
 */

// ------------------------------------------------------------------------------------------------
// Observable
// ------------------------------------------------------------------------------------------------

class Observable {
  constructor () {
    this._subscriptions = new Map() // Subscription -> Observer
  }

  _next (value) {
    for (const observer of this._subscriptions.values()) {
      observer(value)
    }
  }

  _subscribe (observer) {
    const subscription = new Subscription(this)
    this._subscriptions.set(subscription, observer)
    return subscription
  }
}

// ------------------------------------------------------------------------------------------------
// Subscription
// ------------------------------------------------------------------------------------------------

class Subscription {
  constructor (observable) {
      this._observable = observable
    }

  _dispose () {
      this._observable._subscriptions.delete(this)
    }
}

// ------------------------------------------------------------------------------------------------

module.exports = Observable
