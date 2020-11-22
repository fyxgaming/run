/**
 * token.js
 *
 * Tests for lib/extra/token.js
 */

const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { PrivateKey } = require('bsv')
const Run = require('../env/run')
const { COVER, STRESS } = require('../env/config')
const { getExtrasBlockchain } = require('../env/misc')
const { Token } = Run.extra
const { LocalCache } = Run.module

// ------------------------------------------------------------------------------------------------
// Token
// ------------------------------------------------------------------------------------------------

describe('Token', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  if (COVER) Run.cover('TestToken')

  // --------------------------------------------------------------------------
  // mint
  // --------------------------------------------------------------------------

  describe('mint', () => {
    it('new tokens', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const token = TestToken.mint(100)
      await token.sync()
      expect(token.amount).to.equal(100)
      expect(token.owner).to.equal(TestToken.owner)
    })

    it.skip('test', () => {
      // const bsv = require('bsv')
      const rawtx = '0100000002df16b0d8947f2b7a2cb513baf0f3b9d2336e0961e659422f430030b23ba45113050000006b483045022100d3e9909fc04d3236b4b480823625fe294c99a53b070e143e597c29939fc872440220536d65b6d63132ea8de09ec325b3e3b6ec477c15943fc68ebd21df9ba0b2c41e4121031d1d8beba70108ece5b241b2070bd02fdec6ed8f0943190c7ad7fddf84b40868ffffffffdf16b0d8947f2b7a2cb513baf0f3b9d2336e0961e659422f430030b23ba451130e0000006a473044022055e36ff75fe90a62dea43bf1083d08d7b87f67373b637282d93f136470895ce9022051c81d89457023c2fc21efcb86b8a0cfc98de8d202dd10d2c70a9bf706845f3a412102d7e5caa4f528a857222c085ac96c5ddd9ed0367b3608372bc9df375d441f7819ffffffff060000000000000000fd3d0e006a0372756e0105004d310e7b22696e223a312c22726566223a5b22386666363136666536346635663534376337343761303963633661313262393136343738376533363866383336316661613530386434616163333731653538655f6f31222c22316466613937363664653864333065353339353031646630373536353763376265383564663166396539323466323431626435363833636538363664636433315f6f31222c22316537313466393963303635656237393561393037303163653561323235653261343232663231643835626635373362333464646535303730303136373137355f6f31222c22633433656437393463613666643338613665383634303533636238663935386236316535373232306237373934656136313333333731353865636535346630615f6f31222c22666236623835383766653333636563363532666638343332633162373235353564323738326664666162343663363837333666386336663536383238646662365f6f31222c22326238393035363965613530313461633861633332613838626339623162623137363532643430343764636238333532636637383231333239336161303565315f6f31222c22616638643033326261633964306333353734343561666330363434373061393137626630616366303666663435336465393964356339623335613530623363345f6f31222c22333031353237633635303834383966336661373966373731373361613366366337363731316230393662636462343965396632636663646236643738346666375f6f31222c22623430666635303165393838646536383230303830643735346336313938363663623963373531366561363335343464373763333437663065323961366165615f6f31222c22313335316134336262323330303034333266343235396536363130393665333364326239663366306261313362353263376132623766393464386230313664665f6f33222c22313335316134336262323330303034333266343235396536363130393665333364326239663366306261313362353263376132623766393464386230313664665f6f31222c22333631336335396564353163653863303939313164653737303337643130326565326533643237636262636666353261326230663839366233346130346538345f6f31222c22343166666361343333393462663735643436656636646330643933356463646336333934393639393766303437343334653633663962313438666461643961305f6f31222c22313764373238626562306533363764323663653935333764356363346232373532613532333266303433613564366662366665346535663762376133343234625f6f31222c22383465376462643436363165306534386531346263643536303038326330666130383938396265373735646433613433363139333536303561326237316434355f6f31222c22346562366439333030336135663562623463666637313164373338323033616435366166646261326437396361376666383466313635643533333737323361625f6f31222c22626439313433386566366136393566393533623465326431323331386338653461316331353861333031313937666534666435313139303935333131373838395f6f31222c22666337303961613865316133663133353931333931643931613065663834623236656431346163646534633236333034333962303230343165303833666535655f6f31225d2c226f7574223a5b2232616134363363316539636166626236656634383665306239343739653737333334346163306564303365393036623064656336643062656661366361356633222c2238333763336333353664656263346662656433633933323865366261626265613833663463383665303634386232316563356537613032323661343636386437222c2265313632353437336565373231326561323536653330653761623431363036333733633735303432653833323231373462656564303464653537663561373161222c2263323861353066393234643761333431386630356336643636303064666662623365363431656331643131623334656539633162383464653136633831383161225d2c2264656c223a5b5d2c22637265223a5b226e326273484e41625955446d574d48695061566238516946545a7a4c6d5038426d45222c226d6e4b5272686f56786d68545a6b46755241737152357832627072597962536f5236222c226e326273484e41625955446d574d48695061566238516946545a7a4c6d5038426d45225d2c2265786563223a5b7b226f70223a2243414c4c222c2264617461223a5b7b22246a6967223a307d2c22626567696e222c5b313630353732313839373832335d5d7d2c7b226f70223a2243414c4c222c2264617461223a5b7b22246a6967223a307d2c227265736f6c7665222c5b2262326438393839646136353562656238313964663531633930663662303164323231376161313037343837393137353664643339353831373837373235633065222c313630353732313833373839332c7b227061796c6f6164223a227b5c227374617465486173685c223a5c22346166336562623232356335366562393765626139316437356561656662646137373532343230383234613138333235303864663830616134626662623062635c222c5c22616374696f6e496e6465785c223a307d227d2c313630353732313838323839335d5d7d2c7b226f70223a2243414c4c222c2264617461223a5b7b22246a6967223a307d2c227265736f6c7665222c5b2230303061373437303638333638393937663165613331316365653432666539343033373932376632633864666232383035653339303763383732376533343666222c313630353732313834383139392c7b22636f6e74657874223a5b2264363765386633333234333037316332373234653233653639613336336132616364306530306339646262336662316131616231303163346365303361613061225d2c2266726f6d223a22303335623865303034656632623737306537323534373162366630636462633534623565633232633564376137666161633163396635383030373065643466653932222c227061796c6f6164223a227b5c227374617465486173685c223a5c22346166336562623232356335366562393765626139316437356561656662646137373532343230383234613138333235303864663830616134626662623062635c222c5c22616374696f6e496e6465785c223a307d222c227265706c79223a22222c22736967223a2233303435303232313030633765356634663561643865373033626266353830333334313130616531383139636362323533306464646531383937346234336262613662616138633166333032323036376238363332663133313237633935383835383333393637353635316462356263353561383733396330396434373938623663353165386631333065633233222c227375626a656374223a22416374222c22746f223a5b22303265663337376438663036336438653837363835653264373336663234666331363333643437643262383833643632656461343161316636343365373431323530225d2c227473223a313630353732313834383139327d2c313630353732313839333139395d5d7d2c7b226f70223a2243414c4c222c2264617461223a5b7b22246a6967223a307d2c227265736f6c7665222c5b2236636230636165303834333331663663386430623566626132643563626232333061303537633566666439663661323531613739326532303066326232396533222c313630353732313834383336392c7b227061796c6f6164223a227b5c227374617465486173685c223a5c22346166336562623232356335366562393765626139316437356561656662646137373532343230383234613138333235303864663830616134626662623062635c222c5c22616374696f6e496e6465785c223a307d227d2c313630353732313839333336395d5d7d2c7b226f70223a2243414c4c222c2264617461223a5b7b22246a6967223a307d2c227265736f6c7665222c5b2236323065323538303036363430666231666466366538303166376265646434366161356636623764373132376235373762303162323234656439363961323634222c313630353732313836323436372c7b22636f6e74657874223a5b2264363765386633333234333037316332373234653233653639613336336132616364306530306339646262336662316131616231303163346365303361613061225d2c2266726f6d223a22303335623865303034656632623737306537323534373162366630636462633534623565633232633564376137666161633163396635383030373065643466653932222c227061796c6f6164223a227b5c227374617465486173685c223a5c22346166336562623232356335366562393765626139316437356561656662646137373532343230383234613138333235303864663830616134626662623062635c222c5c22616374696f6e496e6465785c223a307d222c227265706c79223a22222c22736967223a223330343430323230303366376564353136656533373365373338333730373863636238613533383131303331346436613935663230363231323934646334636438623735376133313032323033373831346235343834623433643361376436646661626136616236633436333362313963303934396164613834363531356132336563633630636534653565222c227375626a656374223a22416374222c22746f223a5b22303265663337376438663036336438653837363835653264373336663234666331363333643437643262383833643632656461343161316636343365373431323530225d2c227473223a313630353732313836323435397d2c313630353732313930373436375d5d7d5d7d22020000000000001976a914e748899e58e726b82af3581a6a43ec1d1f43c60f88ac22020000000000001976a914e748899e58e726b82af3581a6a43ec1d1f43c60f88ac22020000000000001976a9144a9ae5b7180ab0e7c64b30a1a80f8efe71e2b0b288ac22020000000000001976a914e748899e58e726b82af3581a6a43ec1d1f43c60f88acd8829800000000001976a914561047a5552687f0b5b97d4b328b00b4a1efc77588ac00000000'
      // const rawtx = '0100000005bb29c2d5dfb22bf6dfe3389b17fc582e2d1d44405dafca968aaea90abcd8f0ba010000006a47304402201d3a7f94529ffb961ce5de2a6faf7a33e1494d675f8ed99d390e0f902d59e21202203b56d1867fe82e5a604fb8cd945d9ac3b484f2f78e3a7878f8010f72a24b71e44121026fe43d611c5ba7721551b75467839d145b0e499a9b791494c253e7b48d066df7ffffffff22d88c5fcf0fa5599d80b66c731f98998abd5dcceb285b5b74e733d0055bb4af010000006a47304402207714ed4c9dbc389e1dec377de861f8a8ec36ee3b578d8c31f84d2b4508e0381a02201f857ea08fc205e51e16683ee877131f65833c7338d59a97dda655aead5a8ace4121026fe43d611c5ba7721551b75467839d145b0e499a9b791494c253e7b48d066df7fffffffff4e2a2403af6d5dc071ed7d8cb9cdd1b56679eddb9c4eba1e09bc28a34a15042010000006a473044022002726c9fd0dce4dd1d36a83a95bd4357fc95f7388b987e40eb648e94821ebb9c02200cdb579f5c078b13f20390008b11c97707007a9872e9a66ce052e363b70ccbd34121031d1d8beba70108ece5b241b2070bd02fdec6ed8f0943190c7ad7fddf84b40868fffffffff4e2a2403af6d5dc071ed7d8cb9cdd1b56679eddb9c4eba1e09bc28a34a150420b0000006b4830450221009a26771a71a9c10e95972c66f15d3b23c531bf185708b4e854dcb2b56b528c06022071aa35138d3939cd204f3351a1cdffeb153f477a30187056b6895b9302a3f4bb4121031d1d8beba70108ece5b241b2070bd02fdec6ed8f0943190c7ad7fddf84b40868ffffffffcb90c993a21247bc2f22a424cd2eb4df62ac2b8d0fdbada02d07b578daeeedb4010000006a4730440220208f31f097831e416111becfb8fcfdd0418c9584279b3f4cec35adc18f3d721d02201005ff681adc8d5ca268636c62e338d61c86c9e891f16191122bb2e1300c3f08412102d7e5caa4f528a857222c085ac96c5ddd9ed0367b3608372bc9df375d441f7819ffffffff100000000000000000fd2e09006a0372756e0105004d22097b22696e223a342c22726566223a5b22386666363136666536346635663534376337343761303963633661313262393136343738376533363866383336316661613530386434616163333731653538655f6f31222c22316537313466393963303635656237393561393037303163653561323235653261343232663231643835626635373362333464646535303730303136373137355f6f31222c22346562366439333030336135663562623463666637313164373338323033616435366166646261326437396361376666383466313635643533333737323361625f6f31222c22623430666635303165393838646536383230303830643735346336313938363663623963373531366561363335343464373763333437663065323961366165615f6f31222c22313764373238626562306533363764323663653935333764356363346232373532613532333266303433613564366662366665346535663762376133343234625f6f31222c22383465376462643436363165306534386531346263643536303038326330666130383938396265373735646433613433363139333536303561326237316434355f6f31222c22376164363837303231666338636566313835316664346366306130343238303838333165666136343163653430643233303963663764326665363765376135355f6f31222c22633161666333386235346630386665306164613230323363373865653131386261343235366464393033323832376262326533336464623566313237656565355f6f31222c22633433656437393463613666643338613665383634303533636238663935386236316535373232306237373934656136313333333731353865636535346630615f6f31222c22363833336265626433333463613461363336333837353061336335633232373632323634363739356338623234353764323666313931643431663464646331395f6f31222c22333464643339333831316539343561623664653533323264366564323530313130613731623565646163656137316662323233613539333063343934383939365f6f31222c22616638643033326261633964306333353734343561666330363434373061393137626630616366303666663435336465393964356339623335613530623363345f6f31222c22343166666361343333393462663735643436656636646330643933356463646336333934393639393766303437343334653633663962313438666461643961305f6f31222c22626439313433386566366136393566393533623465326431323331386338653461316331353861333031313937666534666435313139303935333131373838395f6f31222c22333631336335396564353163653863303939313164653737303337643130326565326533643237636262636666353261326230663839366233346130346538345f6f31222c22333031353237633635303834383966336661373966373731373361613366366337363731316230393662636462343965396632636663646236643738346666375f6f31222c22666236623835383766653333636563363532666638343332633162373235353564323738326664666162343663363837333666386336663536383238646662365f6f31222c22326238393035363965613530313461633861633332613838626339623162623137363532643430343764636238333532636637383231333239336161303565315f6f31225d2c226f7574223a5b2264346533393638376135353061663435653639383836643965366235363238326564616435313338326637653235336139653661326332623433333636636430222c2234653666386337313738383064613932643464336234653434643235633865363139353033666239646236393863383731633937366163616438343934313930222c2230633633366337333761313336333738633465633662393532313335356330336233386137343833363736376266333038333935616265613762653565333535222c2235323134353161323535376634376461636131386534656236383865376463616132643664373337333930333533353861653430613930623633383032386161222c2266353533646635653235363230666433313235646663376363383462616439646662666562343038326232376237613366633530303638326561316336353733225d2c2264656c223a5b5d2c22637265223a5b226d6e4b5272686f56786d68545a6b46755241737152357832627072597962536f5236225d2c2265786563223a5b7b226f70223a224e4557222c2264617461223a5b7b22246a6967223a347d2c5b226d6e4b5272686f56786d68545a6b46755241737152357832627072597962536f5236222c7b22246a6967223a367d2c5b7b22636f696e223a7b2224756e64223a317d2c2266696768746572223a7b22246a6967223a307d2c226974656d73223a5b7b22246a6967223a317d2c7b2224756e64223a317d2c7b2224756e64223a317d5d2c226f776e6572223a226e326273484e41625955446d574d48695061566238516946545a7a4c6d5038426d45222c227075626b6579223a22303335623865303034656632623737306537323534373162366630636462633534623565633232633564376137666161633163396635383030373065643466653932222c22736b696c6c73223a5b7b22246a6967223a377d2c7b22246a6967223a387d2c7b22246a6967223a397d5d2c2274616773223a5b5d7d2c7b2266696768746572223a7b22246a6967223a327d2c226974656d73223a5b7b22246a6967223a337d5d2c226f776e6572223a226d6e4b5272686f56786d68545a6b46755241737152357832627072597962536f5236222c227075626b6579223a22303331643164386265626137303130386563653562323431623230373062643032666465633665643866303934333139306337616437666464663834623430383638222c22736b696c6c73223a5b7b2224647570223a5b2231222c2232222c2230222c22736b696c6c73222c2230225d7d5d2c2274616773223a5b22626f74225d7d5d2c2264363765386633333234333037316332373234653233653639613336336132616364306530306339646262336662316131616231303163346365303361613061222c313630353732313833343839365d5d7d5d7d22020000000000001976a914e748899e58e726b82af3581a6a43ec1d1f43c60f88ac22020000000000001976a914e748899e58e726b82af3581a6a43ec1d1f43c60f88ac22020000000000001976a9144a9ae5b7180ab0e7c64b30a1a80f8efe71e2b0b288ac22020000000000001976a9144a9ae5b7180ab0e7c64b30a1a80f8efe71e2b0b288ac22020000000000001976a9144a9ae5b7180ab0e7c64b30a1a80f8efe71e2b0b288ac51919800000000001976a914561047a5552687f0b5b97d4b328b00b4a1efc77588ac51919800000000001976a914561047a5552687f0b5b97d4b328b00b4a1efc77588ac51919800000000001976a914561047a5552687f0b5b97d4b328b00b4a1efc77588ac51919800000000001976a914561047a5552687f0b5b97d4b328b00b4a1efc77588ac51919800000000001976a914561047a5552687f0b5b97d4b328b00b4a1efc77588ac51919800000000001976a914561047a5552687f0b5b97d4b328b00b4a1efc77588ac51919800000000001976a914561047a5552687f0b5b97d4b328b00b4a1efc77588ac51919800000000001976a914561047a5552687f0b5b97d4b328b00b4a1efc77588ac51919800000000001976a914561047a5552687f0b5b97d4b328b00b4a1efc77588acf0bb9800000000001976a914561047a5552687f0b5b97d4b328b00b4a1efc77588ac00000000'
      // const tx = new bsv.Transaction(rawtx)
      const payload = new Run().payload(rawtx)
      console.log(JSON.stringify(payload, 0, 3))
    })

    // ------------------------------------------------------------------------

    it('updates supply', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      const TestToken = run.deploy(class TestToken extends Token { })
      TestToken.mint(100)
      TestToken.mint(200)
      TestToken.mint(300)
      expect(TestToken.supply).to.equal(600)
    })

    // ------------------------------------------------------------------------

    it('throws if class is not extended', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      expect(() => Token.mint(100)).to.throw('Token must be extended')
    })

    // ------------------------------------------------------------------------

    it('large amounts', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      expect(TestToken.mint(2147483647).amount).to.equal(2147483647)
      expect(TestToken.mint(Number.MAX_SAFE_INTEGER).amount).to.equal(Number.MAX_SAFE_INTEGER)
    })

    // ------------------------------------------------------------------------

    it('throws for bad amounts', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      expect(() => TestToken.mint()).to.throw('amount is not a number')
      expect(() => TestToken.mint('1')).to.throw('amount is not a number')
      expect(() => TestToken.mint(0)).to.throw('amount must be positive')
      expect(() => TestToken.mint(-1)).to.throw('amount must be positive')
      expect(() => TestToken.mint(Number.MAX_SAFE_INTEGER + 1)).to.throw('amount too large')
      expect(() => TestToken.mint(1.5)).to.throw('amount must be an integer')
      expect(() => TestToken.mint(Infinity)).to.throw('amount must be an integer')
      expect(() => TestToken.mint(NaN)).to.throw('amount must be an integer')
    })

    // ------------------------------------------------------------------------

    it('throws if try to fake class', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      run.deploy(TestToken)
      await run.sync()

      const run2 = new Run({ blockchain: await getExtrasBlockchain() })
      class HackToken extends TestToken { }
      run2.deploy(HackToken)
      await expect(run2.sync()).to.be.rejectedWith('Missing signature for TestToken')
    })

    // ------------------------------------------------------------------------

    it('sender is null', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      const token = TestToken.mint(1)
      await run.sync()
      expect(token.sender).to.equal(null)
      if (COVER) return
      const token2 = await run.load(token.location)
      expect(token2.sender).to.equal(null)
      run.cache = new LocalCache()
      const token3 = await run.load(token.location)
      expect(token3.sender).to.equal(null)
    })
  })

  // --------------------------------------------------------------------------
  // send
  // --------------------------------------------------------------------------

  describe('send', () => {
    it('full amount', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      await token.sync()
      const sent = token.send(address)
      await sent.sync()
      expect(sent.owner).to.equal(address)
      expect(sent.amount).to.equal(100)
      expect(token.owner).to.equal(null)
      expect(token.amount).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('partial amount', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      await token.sync()
      const sent = token.send(address, 30)
      await run.sync()
      expect(token.owner).to.equal(run.owner.address)
      expect(token.amount).to.equal(70)
      expect(sent).to.be.instanceOf(TestToken)
      expect(sent.owner).to.equal(address)
      expect(sent.amount).to.equal(30)
    })

    // ------------------------------------------------------------------------

    it('throws if send too much', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      expect(() => token.send(address, 101)).to.throw('Not enough funds')
    })

    // ------------------------------------------------------------------------

    it('throws if send bad amount', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const address = new PrivateKey().toAddress().toString()
      const token = TestToken.mint(100)
      expect(() => token.send(address, {})).to.throw('amount is not a number')
      expect(() => token.send(address, '1')).to.throw('amount is not a number')
      expect(() => token.send(address, 0)).to.throw('amount must be positive')
      expect(() => token.send(address, -1)).to.throw('amount must be positive')
      expect(() => token.send(address, Number.MAX_SAFE_INTEGER + 1)).to.throw('amount too large')
      expect(() => token.send(address, 1.5)).to.throw('amount must be an integer')
      expect(() => token.send(address, Infinity)).to.throw('amount must be an integer')
      expect(() => token.send(address, NaN)).to.throw('amount must be an integer')
    })

    // ------------------------------------------------------------------------

    it('throws if send to bad owner', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const token = TestToken.mint(100)
      await token.sync()
      expect(() => token.send(10)).to.throw('Invalid owner: 10')
      expect(() => token.send('abc', 10)).to.throw('Invalid owner: "abc"')
    })

    // ------------------------------------------------------------------------

    it('sender on sent token is sending owner', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      const sender = TestToken.mint(2)
      await sender.sync()
      const sent = sender.send(run.purse.address, 1)
      expect(sent.sender).to.equal(sender.owner)
      await sent.sync()
      if (COVER) return
      const sent2 = await run.load(sent.location)
      expect(sent2.sender).to.equal(sender.owner)
      run.cache = new LocalCache()
      const sent3 = await run.load(sent.location)
      expect(sent3.sender).to.equal(sender.owner)
    })

    // ------------------------------------------------------------------------

    it('sender on sending token is null', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      const orig = TestToken.mint(2)
      await orig.sync()
      const sender = orig.send(run.owner.address, 1)
      await sender.sync()
      sender.send(run.purse.address, 1)
      expect(sender.sender).to.equal(null)
      await sender.sync()
      if (COVER) return
      const sender2 = await run.load(sender.location)
      expect(sender2.sender).to.equal(null)
      run.cache = new LocalCache()
      const sender3 = await run.load(sender.location)
      expect(sender3.sender).to.equal(null)
    })

    // ------------------------------------------------------------------------

    it('custom lock', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      const CustomLock = await run.deploy(class CustomLock {
        script () { return '' }
        domain () { return 0 }
      }).sync()
      class TestToken extends Token { }
      const a = TestToken.mint(2)
      await a.sync()
      const b = a.send(new CustomLock())
      await run.sync()
      expect(b.owner instanceof CustomLock).to.equal(true)
      await b.sync()
      if (COVER) return
      run.cache = new LocalCache()
      const b2 = await run.load(b.location)
      expect(b2.owner instanceof CustomLock).to.equal(true)
    })
  })

  // --------------------------------------------------------------------------
  // combine
  // --------------------------------------------------------------------------

  describe('combine', () => {
    it('two tokens', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      const a = TestToken.mint(30)
      const b = TestToken.mint(70)
      const c = new TestToken(a, b)
      await run.sync()
      expect(c).to.be.instanceOf(TestToken)
      expect(c.amount).to.equal(100)
      expect(c.owner).to.equal(run.owner.address)
      expect(a.amount).to.equal(0)
      expect(a.owner).not.to.equal(run.owner.address)
      expect(b.amount).to.equal(0)
      expect(b.owner).not.to.equal(run.owner.address)
    })

    // ------------------------------------------------------------------------

    it('many tokens', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      const tokens = []
      for (let i = 0; i < 10; ++i) tokens.push(TestToken.mint(1))
      const combined = new TestToken(...tokens)
      await combined.sync()
      expect(combined).to.be.instanceOf(TestToken)
      expect(combined.amount).to.equal(10)
      expect(combined.owner).to.equal(run.owner.address)
      tokens.forEach(token => {
        expect(token.amount).to.equal(0)
        expect(token.owner).not.to.equal(run.owner.address)
      })
    })

    // ------------------------------------------------------------------------

    // load() does not work in cover mode for preinstalls
    it('load after combine', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      const a = TestToken.mint(30)
      const b = TestToken.mint(70)
      const c = new TestToken(a, b)
      await run.sync()
      if (COVER) return
      run.cache = new LocalCache()
      const c2 = await run.load(c.location)
      expect(c2.amount).to.equal(c.amount)
    })

    // ------------------------------------------------------------------------

    it('throws if combine different owners without signatures', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const a = TestToken.mint(1)
      const b = TestToken.mint(2)
      const address = new PrivateKey().toAddress().toString()
      await b.sync()
      b.send(address)
      await expect(new TestToken(a, b).sync()).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('throws if empty', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      expect(() => new TestToken()).to.throw('Invalid tokens to combine')
    })

    // ------------------------------------------------------------------------

    it('throws if one', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const token = TestToken.mint(1)
      expect(() => new TestToken(token)).to.throw('Invalid tokens to combine')
    })

    // ------------------------------------------------------------------------

    it('throws if combined amount is too large', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const a = TestToken.mint(Number.MAX_SAFE_INTEGER)
      const b = TestToken.mint(1)
      expect(() => new TestToken(a, b)).to.throw('amount too large')
    })

    // ------------------------------------------------------------------------

    it('throws if combine non-tokens', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const error = 'Cannot combine different token classes'
      expect(() => new TestToken(TestToken.mint(1), 1)).to.throw(error)
      expect(() => new TestToken(TestToken.mint(1), {})).to.throw(error)
      expect(() => new TestToken(TestToken.mint(1), TestToken.mint(1), {})).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if combine different token classes', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const error = 'Cannot combine different token classes'
      class DifferentToken extends Token { }
      class ExtendedToken extends TestToken { }
      expect(() => new TestToken(TestToken.mint(1), DifferentToken.mint(1))).to.throw(error)
      expect(() => new TestToken(TestToken.mint(1), ExtendedToken.mint(1))).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if combine duplicate tokens', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const token = TestToken.mint(1)
      expect(() => new TestToken(token, token)).to.throw('Cannot combine duplicate tokens')
    })

    // ------------------------------------------------------------------------

    it('sender on combined token is null', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      const a = TestToken.mint(2)
      const b = TestToken.mint(2)
      await run.sync()
      const c = b.send(run.owner.address, 1)
      const combined = new TestToken(a, b, c)
      await combined.sync()
      expect(combined.sender).to.equal(null)
      if (COVER) return
      const combined2 = await run.load(combined.location)
      expect(combined2.sender).to.equal(null)
      run.cache = new LocalCache()
      const combined3 = await run.load(combined.location)
      expect(combined3.sender).to.equal(null)
    })
  })

  // --------------------------------------------------------------------------
  // destroy
  // --------------------------------------------------------------------------

  describe('destroy', () => {
    it('amount is 0', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      const token = TestToken.mint(2)
      expect(token.amount).to.equal(2)
      token.destroy()
      expect(token.amount).to.equal(0)
      await run.sync()
      if (COVER) return
      run.cache = new LocalCache()
      const token2 = await run.load(token.location)
      expect(token2.amount).to.equal(0)
      const token3 = await run.load(token.location)
      expect(token3.amount).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('sender is null', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      const orig = TestToken.mint(2)
      await orig.sync()
      const token = orig.send(run.owner.address, 1)
      expect(token.sender).to.equal(orig.owner)
      token.destroy()
      expect(token.sender).to.equal(null)
      await run.sync()
      if (COVER) return
      run.cache = new LocalCache()
      const token2 = await run.load(token.location)
      expect(token2.sender).to.equal(null)
      const token3 = await run.load(token.location)
      expect(token3.sender).to.equal(null)
    })

    // ------------------------------------------------------------------------

    it('cannot be combined', async () => {
      new Run({ blockchain: await getExtrasBlockchain() }) // eslint-disable-line
      class TestToken extends Token { }
      const a = TestToken.mint(2)
      a.destroy()
      const b = TestToken.mint(2)
      const c = new TestToken(a, b)
      await expect(c.sync()).to.be.rejected
    })

    // ------------------------------------------------------------------------

    it('cannot be sent', async () => {
      const run = new Run({ blockchain: await getExtrasBlockchain() })
      class TestToken extends Token { }
      const a = TestToken.mint(2)
      a.destroy()
      expect(() => a.send(run.owner.address)).to.throw()
    })
  })

  // --------------------------------------------------------------------------
  // Stress
  // --------------------------------------------------------------------------

  if (STRESS) {
    describe('Stress', () => {
      if (!COVER) {
        it('many sends', async () => {
          const a = new Run()
          a.timeout = 500000
          const b = new Run()
          b.timeout = 500000
          class TestToken extends Token { }
          const TT = b.deploy(TestToken)
          await b.sync()

          // B mints tokens
          for (let i = 0; i < 20; i++) {
            const token = TT.mint(10)
            await token.sync()

            Run.instance.blockchain.block()
          }

          // B sends to A and back again in a loop
          for (let i = 0; i < 20; i++) {
            b.activate()
            await b.inventory.sync()
            b.inventory.jigs.forEach(jig => jig.send(a.owner.pubkey))
            await b.sync()

            a.activate()
            await a.inventory.sync()
            a.inventory.jigs.forEach(jig => jig.send(b.owner.pubkey))
            await a.sync()

            Run.instance.blockchain.block()
          }

          // Loading from scratch
          b.activate()
          b.cache = new LocalCache()
          await b.inventory.sync()
        })
      }
    })
  }

  // ------------------------------------------------------------------------

  it.skip('deploy', async () => {
    // const purse = '<purse>'
    // const owner = '<owner>'
    // const run = new Run({ network: '<network>', purse, owner })

    // run.deploy(Run.extra.Token)
    // await run.sync()
    // console.log(Run.extra.Token)
  })
})

// ------------------------------------------------------------------------------------------------
