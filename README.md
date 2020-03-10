## Running Tests

### Node Testing

To run all tests locally:

    npm run test

This will compile the node build and run all tests on it.

### Browser Testing

To test the browser build:

    npm run test:browser

This will run the tests on a headless version of Chrome.

To test other browser, open `./test/browser.html` in any web browser.

### Developer Testing

During development, it is often useful to lint and test together using an uncompiled build. To do that:

    npm run test:dev

You may optionally pass a path to limit testing to just that module:

    npm run test:dev ./test/jig.js

This applies to `test:dev`, `test`, and `test:cover`.

### Code Coverage

To run testing with code coverage:

    npm run test:cover

This will print out coverage information in the console.