
/*

  // ----------------------------------------------------------------------------------------------
  // _addCreations
  // ----------------------------------------------------------------------------------------------

  describe('_addCreations', () => {
    it('adds jigs once', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const a2 = await run.load(a.location)
      const arr = [a]
      const b = new A()
      expect(_addCreations(arr, [a2, b])).to.deep.equal([a, b])
    })

    // ------------------------------------------------------------------------

    it('throws if inconsistent worldview', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(() => _addCreations([a], [a2])).to.throw('Inconsistent worldview')
    })
  })
  */

/*
  // ----------------------------------------------------------------------------------------------
  // _sameCreation
  // ----------------------------------------------------------------------------------------------

  describe('_sameCreation', () => {
    it('true if same', () => {
      const run = new Run()
      const A = run.deploy(class A { })
      expect(_sameCreation(A, A)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('true if different instances of same jig', async () => {
      const run = new Run()
      const A = run.deploy(class A { })
      await A.sync()
      const A2 = await run.load(A.location)
      expect(_sameCreation(A, A2)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('throws if different jigs', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      class B extends Jig { }
      const a = new A()
      const a2 = new A()
      const b = new B()
      expect(_sameCreation(a, a2)).to.equal(false)
      expect(_sameCreation(a, b)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('throws if different locations', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(() => _sameCreation(a, a2)).to.throw('Inconsistent worldview')
    })

    // ------------------------------------------------------------------------

    it('false if non-jig', () => {
      expect(_sameCreation({}, {})).to.equal(false)
      expect(_sameCreation(null, null)).to.equal(false)
      class A { }
      expect(_sameCreation(A, A)).to.equal(false)
      const run = new Run()
      const A2 = run.deploy(A)
      expect(_sameCreation(A2, {})).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns false if undeployed', () => {
      const run = new Run()
      const A = Run.util.install(class A { })
      const B = run.deploy(class B { })
      expect(_sameCreation(A, B)).to.equal(false)
      expect(_sameCreation(B, A)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns true for same berries', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()
      const b = await CB.load('abc')
      const b2 = await CB.load('abc')
      expect(_sameCreation(b, b2)).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('return false for different berries', async () => {
      const run = new Run()
      class B extends Berry { }
      const CB = run.deploy(B)
      await CB.sync()

      const b = await CB.load('abc')
      const b2 = await CB.load('def')
      expect(_sameCreation(b, b2)).to.equal(false)

      class C extends Berry { }
      const CC = run.deploy(C)
      await CC.sync()

      const c = await C.load('abc')
      expect(_sameCreation(b, c)).to.equal(false)

      const b3 = { location: `${CB.location}_abc` }
      Object.setPrototypeOf(b3, CB.prototype)
      expect(_sameCreation(b, b3)).to.equal(false)
    })

    // ------------------------------------------------------------------------

    it('returns false for undeployed berries', async () => {
      new Run() // eslint-disable-line
      class B extends Berry { }
      const b = await B.load('abc')
      const b2 = await B.load('abc')
      expect(_sameCreation(b, b2)).to.equal(false)
    })
  })

  */

/*
  // ----------------------------------------------------------------------------------------------
  // _subtractCreations
  // ----------------------------------------------------------------------------------------------

  describe('_subtractCreations', () => {
    it('removes same jigs', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const a2 = await run.load(a.location)
      const b = new A()
      const arr = [a, b]
      expect(_subtractCreations(arr, [a2, b])).to.deep.equal([])
    })

    // ------------------------------------------------------------------------

    it('throws if inconsistent worldview', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      a.auth()
      await a.sync()
      const a2 = await run.load(a.origin)
      expect(() => _subtractCreations([a], [a2])).to.throw('Inconsistent worldview')
    })
  })
  */
