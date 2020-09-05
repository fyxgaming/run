// TODO

/*
    // ------------------------------------------------------------------------

    it('should add to purse when satoshis decreased', async () => {
        const run = createHookedRun()
        class A extends Jig { f (satoshis) { this.satoshis = satoshis; return this }}
        const a = new A()
        expectAction(a, 'init', [], [], [a], [])
        await a.f(5000).sync()
        expectAction(a, 'f', [5000], [a], [a], [])
        const before = await run.purse.balance()
        await a.f(0).sync()
        expectAction(a, 'f', [0], [a], [a], [])
        const after = await run.purse.balance()
        expect(after - before > 3000).to.equal(true)
      })
      */

/*
    it('should support long mempool chain for purse', async () => {
      const run = createHookedRun()
      class A extends Jig { }
      for (let i = 0; i < 100; i++) { new A() } // eslint-disable-line
      await run.sync()
    })
    */
