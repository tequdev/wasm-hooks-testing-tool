import {
  float_compare,
  float_divide,
  float_int,
  float_invert,
  float_log,
  float_mantissa,
  float_mulratio,
  float_multiply,
  float_negate,
  float_one,
  float_root,
  float_set,
  float_sign,
  float_sto,
  float_sto_set,
  float_sum,
} from '../../../src/api'
import { HOOK_RETURN_CODE } from '../../../src/context/interface'
import { defaultContext } from '../tools'

const {
  INVALID_FLOAT,
  INVALID_ARGUMENT,
  XFL_OVERFLOW,
  DIVISION_BY_ZERO,
  TOO_BIG,
  CANT_RETURN_NEGATIVE,
  COMPLEX_NOT_SUPPORTED,
} = HOOK_RETURN_CODE

describe('float', () => {
  const memory = new Uint8Array(1024 * 10)
  let ctx = defaultContext(memory)
  beforeEach(() => {
    memory.fill(0)
    ctx = defaultContext(memory)
  })
  describe('float_set', () => {
    it('test error', () => {
      // zero mantissa should return canonical zero
      expect(float_set(-5, 0n, ctx)).toBe(0n)
      expect(float_set(50, 0n, ctx)).toBe(0n)
      expect(float_set(-50, 0n, ctx)).toBe(0n)
      expect(float_set(0, 0n, ctx)).toBe(0n)

      // an exponent lower than -96 should produce an invalid float error
      expect(float_set(-97, 1n, ctx)).toBe(INVALID_FLOAT)

      // an exponent larger than +96 should produce an invalid float error
      expect(float_set(97, 1n, ctx)).toBe(INVALID_FLOAT)
    })

    const cases: [number, bigint, bigint][] = [
      [-5, 6541432897943971n, 6275552114197674403n],
      [-83, 7906202688397446n, 4871793800248533126n],
      [76, 4760131426754533n, 7732937091994525669n],
      [37, -8019384286534438n, 2421948784557120294n],
      [50, 5145342538007840n, 7264947941859247392n],
      [-70, 4387341302202416n, 5102462119485603888n],
      [-26, -1754544005819476n, 1280776838179040340n],
      [36, 8261761545780560n, 7015862781734272336n],
      [35, 7975622850695472n, 6997562244529705264n],
      [17, -4478222822793996n, 2058119652903740172n],
      [-53, 5506604247857835n, 5409826157092453035n],
      [-60, 5120164869507050n, 5283338928147728362n],
      [41, 5176113875683063n, 7102849126611584759n],
      [-54, -3477931844992923n, 778097067752718235n],
      [21, 6345031894305479n, 6743730074440567495n],
      [-23, 5091583691147091n, 5949843091820201811n],
      [-33, 7509684078851678n, 5772117207113086558n],
      [-72, -1847771838890268n, 452207734575939868n],
      [71, -9138413713437220n, 3035557363306410532n],
      [28, 4933894067102586n, 6868419726179738490n],
    ] as const
    it.each(cases)('test', (exp, mantissa, expected) => {
      expect(float_set(exp, mantissa, ctx)).toBe(expected)
    })
  })

  describe('float_compare', () => {
    const EQ = 0b001
    const LT = 0b010
    const GT = 0b100
    const LTE = 0b011
    const GTE = 0b101
    const NEQ = 0b110
    it('test invalid floats', () => {
      expect(float_compare(-1n, -2n, EQ, ctx)).toBe(INVALID_FLOAT)
      expect(float_compare(0n, -2n, EQ, ctx)).toBe(INVALID_FLOAT)
      expect(float_compare(-1n, 0n, EQ, ctx)).toBe(INVALID_FLOAT)
    })

    it('test invalid flags', () => {
      // flag 8 doesnt exist
      expect(float_compare(0n, 0n, 0b1000, ctx)).toBe(INVALID_ARGUMENT)
      // flag 16 doesnt exist
      expect(float_compare(0n, 0n, 0b10000, ctx)).toBe(INVALID_ARGUMENT)
      // every flag except the valid ones
      expect(float_compare(0n, 0n, ~0b111, ctx)).toBe(INVALID_ARGUMENT)
      // all valid flags combined is invalid too
      expect(float_compare(0n, 0n, 0b111, ctx)).toBe(INVALID_ARGUMENT)
      // no flags is also invalid
      expect(float_compare(0n, 0n, 0, ctx)).toBe(INVALID_ARGUMENT)
    })

    describe('test logic', () => {
      it('zero', () => {
        expect(float_compare(0n, 0n, EQ, ctx)).toBe(1n)
        expect(float_compare(0n, float_one(ctx), LT, ctx)).toBe(1n)
        expect(float_compare(0n, float_one(ctx), GT, ctx)).toBe(0n)
        expect(float_compare(0n, float_one(ctx), GTE, ctx)).toBe(0n)
        expect(float_compare(0n, float_one(ctx), LTE, ctx)).toBe(1n)
        expect(float_compare(0n, float_one(ctx), NEQ, ctx)).toBe(1n)
      })
      const large_negative = 1622844335003378560n /* -154846915           */
      const small_negative = 1352229899321148800n /* -1.15001111e-7       */
      const small_positive = 5713898440837102138n /* 3.33411333131321e-21 */
      const large_positive = 7749425685711506120n /* 3.234326634253e+92   */
      it('large negative < small negative', () => {
        expect(float_compare(large_negative, small_negative, LT, ctx)).toBe(1n)
        expect(float_compare(large_negative, small_negative, LTE, ctx)).toBe(1n)
        expect(float_compare(large_negative, small_negative, NEQ, ctx)).toBe(1n)
        expect(float_compare(large_negative, small_negative, GT, ctx)).toBe(0n)
        expect(float_compare(large_negative, small_negative, GTE, ctx)).toBe(0n)
        expect(float_compare(large_negative, small_negative, EQ, ctx)).toBe(0n)
      })
      it('large_negative < large positive', () => {
        expect(float_compare(large_negative, large_positive, LT, ctx)).toBe(1n)
        expect(float_compare(large_negative, large_positive, LTE, ctx)).toBe(1n)
        expect(float_compare(large_negative, large_positive, NEQ, ctx)).toBe(1n)
        expect(float_compare(large_negative, large_positive, GT, ctx)).toBe(0n)
        expect(float_compare(large_negative, large_positive, GTE, ctx)).toBe(0n)
        expect(float_compare(large_negative, large_positive, EQ, ctx)).toBe(0n)
      })
      it('small positive < large positive', () => {
        expect(float_compare(small_positive, large_positive, LT, ctx)).toBe(1n)
        expect(float_compare(small_positive, large_positive, LTE, ctx)).toBe(1n)
        expect(float_compare(small_positive, large_positive, NEQ, ctx)).toBe(1n)
        expect(float_compare(small_positive, large_positive, GT, ctx)).toBe(0n)
        expect(float_compare(small_positive, large_positive, GTE, ctx)).toBe(0n)
        expect(float_compare(small_positive, large_positive, EQ, ctx)).toBe(0n)
      })
      it('< 0', () => {
        // small negative < 0
        expect(float_compare(small_negative, 0n, LT, ctx)).toBe(1n)
        // large negative < 0
        expect(float_compare(large_negative, 0n, LT, ctx)).toBe(1n)
        // small positive > 0
        expect(float_compare(small_positive, 0n, GT, ctx)).toBe(1n)
        // large positive > 0
        expect(float_compare(large_positive, 0n, GT, ctx)).toBe(1n)
      })
    })
  })

  describe('float_negate', () => {
    it('test invalid floats', () => {
      expect(float_negate(-1n, ctx)).toBe(INVALID_FLOAT)
      expect(float_negate(-11010191919n, ctx)).toBe(INVALID_FLOAT)
    })

    it('test canonical zero', () => {
      expect(float_negate(0n, ctx)).toBe(0n)
    })

    it('test double negation', () => {
      expect(float_negate(float_one(ctx), ctx)).not.toBe(float_one(ctx))
      expect(float_negate(float_negate(float_one(ctx), ctx), ctx)).toBe(
        float_one(ctx),
      )
    })

    it('test random numbers', () => {
      // +/- 3.463476342523e+22
      expect(float_negate(6488646939756037240n, ctx)).toBe(1876960921328649336n)

      expect(float_negate(float_one(ctx), ctx)).toBe(1478180677777522688n)
      expect(float_negate(1838620299498162368n, ctx)).toBe(6450306317925550272n)
    })
  })

  describe('float_mantissa', () => {
    it('test invalid floats', () => {
      expect(float_mantissa(-1n, ctx)).toBe(INVALID_FLOAT)
      expect(float_mantissa(-11010191919n, ctx)).toBe(INVALID_FLOAT)
    })

    it('test canonical zero', () => {
      expect(float_mantissa(0n, ctx)).toBe(0n)
    })

    it('test one, negative one', () => {
      expect(float_mantissa(float_one(ctx), ctx)).toBe(1000000000000000n)
      expect(float_mantissa(float_negate(float_one(ctx), ctx), ctx)).toBe(
        1000000000000000n,
      )
    })

    const cases = [
      [4763370308433150973n /* 7.569101929907197e-74 */, 7569101929907197n],
      [668909658849475214n /* -2.376913998641806e-45 */, 2376913998641806n],
      [962271544155031248n /* -7.508423152486096e-29 */, 7508423152486096n],
      [7335644976228470276n /* 3.784782869302788e+69 */, 3784782869302788n],
      [2837780149340315954n /* -9.519583351644467e+75 */, 9519583351644466n],
      [2614004940018599738n /* -1.917156143712058e+63 */, 1917156143712058n],
      [4812250541755005603n /* 2.406139723315875e-71 */, 2406139723315875n],
      [5140304866732560580n /* 6.20129153019514e-53 */, 6201291530195140n],
      [1124677839589482624n /* -7.785132001599617e-20 */, 7785132001599616n],
      [5269336076015865585n /* 9.131711247126257e-46 */, 9131711247126257n],
      [2296179634826760368n /* -8.3510241225484e+45 */, 8351024122548400n],
      [1104028240398536470n /* -5.149931320135446e-21 */, 5149931320135446n],
      [2691222059222981864n /* -7.076681310166248e+67 */, 7076681310166248n],
      [6113256168823855946n /* 63.7507410946337 */, 6375074109463370n],
      [311682216630003626n /* -5.437441968809898e-65 */, 5437441968809898n],
      [794955605753965262n /* -2.322071336757966e-38 */, 2322071336757966n],
      [204540636400815950n /* -6.382252796514126e-71 */, 6382252796514126n],
      [5497195278343034975n /* 2.803732951029855e-33 */, 2803732951029855n],
      [1450265914369875626n /* -0.09114033611316906 */, 9114033611316906n],
      [7481064015089962668n /* 5.088633654939308e+77 */, 5088633654939308n],
    ]
    it.each(cases)('test random numbers', (mantissa, expected) => {
      expect(float_mantissa(mantissa, ctx)).toBe(expected)
    })
  })

  describe('float_sign', () => {
    it('test invalid floats', () => {
      expect(float_sign(-1n, ctx)).toBe(INVALID_FLOAT)
      expect(float_sign(-11010191919n, ctx)).toBe(INVALID_FLOAT)
    })
    it('test canonical zero', () => {
      expect(float_sign(0n, ctx)).toBe(0n)
    })
    it('test one, negative one', () => {
      expect(float_sign(float_one(ctx), ctx)).toBe(0n)
      expect(float_sign(float_negate(float_one(ctx), ctx), ctx)).toBe(1n)
    })

    const cases = [
      [7248434512952957686n /* 6.646312141200119e+64 */, 0n],
      [889927818394811978n /* -7.222291430194763e-33 */, 1n],
      [5945816149233111421n /* 1.064641104056701e-8 */, 0n],
      [6239200145838704863n /* 621826155.7938399 */, 0n],
      [6992780785042190360n /* 3.194163363180568e+50 */, 0n],
      [6883099933108789087n /* 1.599702486671199e+44 */, 0n],
      [890203738162163464n /* -7.498211197546248e-33 */, 1n],
      [4884803073052080964n /* 2.9010769824633e-67 */, 0n],
      [2688292350356944394n /* -4.146972444128778e+67 */, 1n],
      [4830109852288093280n /* 2.251051746921568e-70 */, 0n],
      [294175951907940320n /* -5.945575756228576e-66 */, 1n],
      [7612037404955382316n /* 9.961233953985069e+84 */, 0n],
      [7520840929603658997n /* 8.83675114967167e+79 */, 0n],
      [4798982086157926282n /* 7.152082635718538e-72 */, 0n],
      [689790136568817905n /* -5.242993208502513e-44 */, 1n],
      [5521738045011558042n /* 9.332101110070938e-32 */, 0n],
      [728760820583452906n /* -8.184880204173546e-42 */, 1n],
      [2272937984362856794n /* -3.12377216812681e+44 */, 1n],
      [1445723661896317830n /* -0.0457178113775911 */, 1n],
      [5035721527359772724n /* 9.704343214299189e-59 */, 0n],
    ]
    it.each(cases)('test random numbers', (mantissa, expected) => {
      expect(float_sign(mantissa, ctx)).toBe(expected)
    })
  })

  it('float_one', () => {
    expect(float_one(ctx)).toBe(6089866696204910592n)
  })

  describe('float_sum', () => {
    const one = float_one(ctx)
    it('1+1=2', () => {
      expect(float_sum(one, one, ctx)).toBe(6090866696204910592n)
    })
    it('1-1=0', () => {
      expect(float_sum(one, float_negate(one, ctx), ctx)).toBe(0n)
    })
    it('45678 + 0.345678 = 45678.345678', () => {
      expect(float_sum(6165492090242838528n, 6074309077695428608n, ctx)).toBe(
        6165492124810638528n,
      )
    })
    const cases = [
      [
        95785354843184473n /* -5.713362295774553e-77 */,
        7607324992379065667n /* 5.248821377668419e+84 */,
        7607324992379065667n /* 5.248821377668419e+84 */,
      ],
      [
        1011203427860697296n /* -2.397111329706192e-26 */,
        7715811566197737722n /* 5.64900413944857e+90 */,
        7715811566197737722n /* 5.64900413944857e+90 */,
      ],
      [
        6507979072644559603n /* 4.781210721563379e+23 */,
        422214339164556094n /* -7.883173446470462e-59 */,
        6507979072644559603n /* 4.781210721563379e+23 */,
      ],
      [
        129493221419941559n /* -3.392431853567671e-75 */,
        6742079437952459317n /* 4.694395406197301e+36 */,
        6742079437952459317n /* 4.694395406197301e+36 */,
      ],
      [
        5172806703808250354n /* 2.674331586920946e-51 */,
        3070396690523275533n /* -7.948943911338253e+88 */,
        3070396690523275533n /* -7.948943911338253e+88 */,
      ],
      // TODO: xfl.js
      // [
      //   2440992231195047997n /* -9.048432414980156e+53 */,
      //   4937813945440933271n /* 1.868753842869655e-64 */,
      //   2440992231195047996n /* -9.048432414980156e+53 */,
      // ],
      [
        7351918685453062372n /* 2.0440935844129e+70 */,
        6489541496844182832n /* 4.358033430668592e+22 */,
        7351918685453062372n /* 2.0440935844129e+70 */,
      ],
      [
        4960621423606196948n /* 6.661833498651348e-63 */,
        6036716382996689576n /* 0.001892882320224936 */,
        6036716382996689576n /* 0.001892882320224936 */,
      ],
      [
        1342689232407435206n /* -9.62374270576839e-8 */,
        5629833007898276923n /* 9.340672939897915e-26 */,
        1342689232407435206n /* -9.62374270576839e-8 */,
      ],
      [
        7557687707019793516n /* 9.65473154684222e+81 */,
        528084028396448719n /* -5.666471621471183e-53 */,
        7557687707019793516n /* 9.65473154684222e+81 */,
      ],
      [
        130151633377050812n /* -4.050843810676924e-75 */,
        2525286695563827336n /* -3.270904236349576e+58 */,
        2525286695563827336n /* -3.270904236349576e+58 */,
      ],
      [
        5051914485221832639n /* 7.88290256687712e-58 */,
        7518727241611221951n /* 6.723063157234623e+79 */,
        7518727241611221951n /* 6.723063157234623e+79 */,
      ],
      // TODO: xfl.js
      // [
      //   3014788764095798870n /* -6.384213012307542e+85 */,
      //   7425019819707800346n /* 3.087633801222938e+74 */,
      //   3014788764095767995n /* -6.384213012276667e+85 */,
      // ],
      [
        4918950856932792129n /* 1.020063844210497e-65 */,
        7173510242188034581n /* 3.779635414204949e+60 */,
        7173510242188034581n /* 3.779635414204949e+60 */,
      ],
      [
        20028000442705357n /* -2.013601933223373e-81 */,
        95248745393457140n /* -5.17675284604722e-77 */,
        95248946753650462n /* -5.176954206240542e-77 */,
      ],
      [
        5516870225060928024n /* 4.46428115944092e-32 */,
        7357202055584617194n /* 7.327463715967722e+70 */,
        7357202055584617194n /* 7.327463715967722e+70 */,
      ],
      [
        2326103538819088036n /* -2.2461310959121e+47 */,
        1749360946246242122n /* -1964290826489674 */,
        2326103538819088036n /* -2.2461310959121e+47 */,
      ],
      // TODO: xfl.js
      // [
      //   1738010758208819410n /* -862850129854894.6 */,
      //   2224610859005732191n /* -8.83984233944816e+41 */,
      //   2224610859005732192n /* -8.83984233944816e+41 */,
      // ],
      [
        4869534730307487904n /* 5.647132747352224e-68 */,
        2166841923565712115n /* -5.114102427874035e+38 */,
        2166841923565712115n /* -5.114102427874035e+38 */,
      ],
      [
        1054339559322014937n /* -9.504445772059864e-24 */,
        1389511416678371338n /* -0.0000240273144825857 */,
        1389511416678371338n /* -0.0000240273144825857 */,
      ],
    ]
    it.each(cases)('test random numbers', (float1, float2, expected) => {
      expect(float_sum(float1, float2, ctx)).toBe(expected)
    })
  })

  describe('float_multiply', () => {
    const one = float_one(ctx)
    it('ensure invalid xfl are not accepted', () => {
      expect(float_multiply(-1n, one, ctx)).toBe(INVALID_FLOAT)
    })
    it('multipl by 0', () => {
      expect(float_multiply(0n, one, ctx)).toBe(0n)
      expect(float_multiply(one, 0n, ctx)).toBe(0n)
    })
    it('check 1', () => {
      expect(float_multiply(one, one, ctx)).toBe(one)
      expect(float_multiply(one, float_negate(one, ctx), ctx)).toBe(
        float_negate(one, ctx),
      )
      expect(float_multiply(float_negate(one, ctx), one, ctx)).toBe(
        float_negate(one, ctx),
      )
      expect(
        float_multiply(float_negate(one, ctx), float_negate(one, ctx), ctx),
      ).toBe(one)
    })
    it('check overflow', () => {
      // 1e+95 * 1e+95
      expect(
        float_multiply(7801234554605699072n, 7801234554605699072n, ctx),
      ).toBe(XFL_OVERFLOW)
      // 1e+95 * 10
      expect(
        float_multiply(7801234554605699072n, 6107881094714392576n, ctx),
      ).toBe(XFL_OVERFLOW)
      expect(
        float_multiply(6107881094714392576n, 7801234554605699072n, ctx),
      ).toBe(XFL_OVERFLOW)
      // -1e+95 * 10
      expect(
        float_multiply(3189548536178311168n, 6107881094714392576n, ctx),
      ).toBe(XFL_OVERFLOW)
      // identity
      expect(float_multiply(3189548536178311168n, float_one(ctx), ctx)).toBe(
        3189548536178311168n,
      )
      expect(float_multiply(float_one(ctx), 3189548536178311168n, ctx)).toBe(
        3189548536178311168n,
      )
    })
    const cases = [
      [
        7791757438262485039n /* 9.537282166267951e+94 */,
        4759088999670263908n /* 3.287793167020132e-74 */,
        6470304726017852129n /* 3.135661113819873e+21 */,
      ],
      // [
      //   7534790022873909775n /* 4.771445910440463e+80 */,
      //   1017891960669847079n /* -9.085644138855975e-26 */,
      //   2472307761756037979n /* -4.335165957006171e+55 */,
      // ],
      [
        2813999069907898454n /* -3.75290242870895e+74 */,
        4962524721184225460n /* 8.56513107667986e-63 */,
        1696567870013294731n /* -3214410121988.235 */,
      ],
      [
        2151742066453140308n /* -8.028643824784212e+37 */,
        437647738130579252n /* -5.302173903011636e-58 */,
        5732835652591705549n /* 4.256926576434637e-20 */,
      ],
      [
        5445302332922546340n /* 4.953983058987172e-36 */,
        7770966530708354172n /* 6.760773121619068e+93 */,
        7137051085305881332n /* 3.349275551015668e+58 */,
      ],
      // [
      //   2542989542826132533n /* -2.959352989172789e+59 */,
      //   6308418769944702613n /* 3379291626008.213 */,
      //   2775217422137696934n /* -1.000051677471398e+72 */,
      // ],
      // [
      //   5017652318929433511n /* 9.649533293441959e-60 */,
      //   6601401767766764916n /* 8.131913296358772e+28 */,
      //   5538267259220228820n /* 7.846916809259732e-31 */,
      // ],
      [
        892430323307269235n /* -9.724796342652019e-33 */,
        1444078017997143500n /* -0.0292613723858478 */,
        5479222755754111850n /* 2.845608871588714e-34 */,
      ],
      [
        7030632722283214253n /* 5.017303585240493e+52 */,
        297400838197636668n /* -9.170462045924924e-66 */,
        1247594596364389994n /* -4.601099210133098e-13 */,
      ],
      [
        1321751204165279730n /* -6.700112973094898e-9 */,
        2451801790748530375n /* -1.843593458980551e+54 */,
        6918764256086244704n /* 1.235228445162848e+46 */,
      ],
      // [
      //   2055496484261758590n /* -1.855054180812414e+32 */,
      //   2079877890137711361n /* -8.222061547283201e+33 */,
      //   7279342234795540005n /* 1.525236964818469e+66 */,
      // ],
      [
        2439875962311968674n /* -7.932163531900834e+53 */,
        4707485682591872793n /* 5.727671617074969e-77 */,
        1067392794851803610n /* -4.543282792366554e-23 */,
      ],
      [
        6348574818322812800n /* 750654298515443.2 */,
        6474046245013515838n /* 6.877180109483582e+21 */,
        6742547427357110773n /* 5.162384810848757e+36 */,
      ],
      // [
      //   1156137305783593424n /* -3.215801176746448e-18 */,
      //   351790564990861307n /* -9.516993310703611e-63 */,
      //   4650775291275116747n /* 3.060475828764875e-80 */,
      // ],
      // [
      //   5786888485280994123n /* 4.266563737277259e-17 */,
      //   6252137323085080394n /* 1141040294.831946 */,
      //   5949619829273756852n /* 4.868321144702132e-8 */,
      // ],
      // [
      //   2078182880999439640n /* -6.52705240901148e+33 */,
      //   1662438186251269392n /* -51135233789.26864 */,
      //   6884837854131013998n /* 3.33762350889611e+44 */,
      // ],
      [
        1823781083140711248n /* -43268336830308640000 */,
        1120252241608199010n /* -3.359534020316002e-20 */,
        6090320310700749729n /* 1.453614495839137 */,
      ],
      // [
      //   6617782604883935174n /* 6.498351904047046e+29 */,
      //   6185835042802056262n /* 689635.404973575 */,
      //   6723852137583788319n /* 4.481493547008287e+35 */,
      // ],
      [
        333952667495151166n /* -9.693494324475454e-64 */,
        1556040883317758614n /* -68026.1150230799 */,
        5032611291744396930n /* 6.594107598923394e-59 */,
      ],
      //
      [
        2326968399632616779n /* -3.110991909440843e+47 */,
        707513695207834635n /* -4.952153338037259e-43 */,
        6180479299649214949n /* 154061.0896894437 */,
      ],
      // [
      //   1271003508324696477n /* -9.995612660957597e-12 */,
      //   5321949753651889765n /* 7.702193354704484e-43 */,
      //   512101972406838314n /* -7.698814141342762e-54 */,
      // ],
      [
        1928646740923345323n /* -1.106100408773035e+25 */,
        4639329980209973352n /* 9.629563273103463e-81 */,
        487453886143282122n /* -1.065126387268554e-55 */,
      ],
      // [
      //   6023906813956669432n /* 0.0007097711789686777 */,
      //   944348444470060009n /* -7.599721976996842e-30 */,
      //   888099590592064434n /* -5.394063627447218e-33 */,
      // ],
      // [
      //   6580290597764062787n /* 5.035141803138627e+27 */,
      //   6164319297265300034n /* 33950.07022461506 */,
      //   6667036882686408593n /* 1.709434178074513e+32 */,
      // ],
      [
        2523439530503240484n /* -1.423739175762724e+58 */,
        5864448766677980801n /* 9.769251096336e-13 */,
        2307233895764065602n /* -1.39088655037165e+46 */,
      ],
      [
        6760707453987140465n /* 5.308012931396465e+37 */,
        5951641080643457645n /* 6.889572514402925e-8 */,
        6632955645489194550n /* 3.656993999824438e+30 */,
      ],
      [
        6494270716308443375n /* 9.087252894929135e+22 */,
        564752637895553836n /* -6.306284101612332e-51 */,
        978508199357889360n /* -5.730679845862224e-28 */,
      ],
      // [
      //   6759145618427534062n /* 3.746177371790062e+37 */,
      //   4721897842483633304n /* 2.125432999353496e-76 */,
      //   5394267403342547165n /* 7.962249007433949e-39 */,
      // ],
      // [
      //   1232673571201806425n /* -7.694472557031513e-14 */,
      //   6884256144221925318n /* 2.75591359980743e+44 */,
      //   2037747561727791012n /* -2.12053015632682e+31 */,
      // ],
      [
        1427694775835421031n /* -0.004557293586344295 */,
        4883952867277976402n /* 2.050871208358738e-67 */,
        225519204318055258n /* -9.34642220427145e-70 */,
      ],
      [
        5843509949864662087n /* 6.84483279249927e-14 */,
        5264483986612843822n /* 4.279621844104494e-46 */,
        5028946513739275800n /* 2.929329593802264e-59 */,
      ],
      // [
      //   6038444022009738988n /* 0.003620521333274348 */,
      //   7447499078040748850n /* 7.552493624689458e+75 */,
      //   7406652183825856093n /* 2.734396428760669e+73 */,
      // ],
      // [
      //   939565473697468970n /* -2.816751204405802e-30 */,
      //   1100284903077087966n /* -1.406593998686942e-21 */,
      //   5174094397561240825n /* 3.962025339911417e-51 */,
      // ],
      // [
      //   5694071830210473617n /* 1.521901214166673e-22 */,
      //   5536709154363579683n /* 6.288811952610595e-31 */,
      //   5143674525748709391n /* 9.570950546343951e-53 */,
      // ],
      // [
      //   600729862341871819n /* -6.254711528966347e-49 */,
      //   6330630279715378440n /* 75764028872020.56 */,
      //   851415551394320910n /* -4.738821448667662e-35 */,
      // ],
      [
        1876763139233864902n /* -3.265694247738566e+22 */,
        4849561230315278754n /* 3.688031264625058e-69 */,
        649722744589988028n /* -1.204398248636604e-46 */,
      ],
      [
        3011947542126279863n /* -3.542991042788535e+85 */,
        1557732559110376235n /* -84942.87294925611 */,
        7713172080438368541n /* 3.009518380079389e+90 */,
      ],
      // [
      //   5391579936313268788n /* 5.274781978155572e-39 */,
      //   1018647290024655822n /* -9.840973493664718e-26 */,
      //   329450072133864644n /* -5.190898963188932e-64 */,
      // ],
      [
        2815029221608845312n /* -4.783054129655808e+74 */,
        4943518985822088837n /* 7.57379422402522e-64 */,
        1678961648155863225n /* -362258677403.8713 */,
      ],
      // [
      //   1377509900308195934n /* -0.00000841561358756515 */,
      //   7702104197062186199n /* 9.95603351337903e+89 */,
      //   2998768765665354000n /* -8.378613091344656e+84 */,
      // ],
    ]
    it.each(cases)(
      'test random nultiplications',
      (float1, float2, expected) => {
        expect(float_multiply(float1, float2, ctx)).toBe(expected)
      },
    )
  })

  describe('float_mulratio', () => {
    it('ensure invalid xfl are not accepted', () => {
      expect(float_mulratio(-1n, 0, 1, 1, ctx)).toBe(INVALID_FLOAT)
    })
    it('multiply by 0', () => {
      expect(float_mulratio(float_one(ctx), 0, 0, 1, ctx)).toBe(0n)
      expect(float_mulratio(0n, 0, 1, 1, ctx)).toBe(0n)
    })
    it('check 1', () => {
      expect(float_mulratio(float_one(ctx), 0, 1, 1, ctx)).toBe(float_one(ctx))
      expect(
        float_mulratio(float_negate(float_one(ctx), ctx), 0, 1, 1, ctx),
      ).toBe(float_negate(float_one(ctx), ctx))
    })
    it('check overflow', () => {
      // 1e+95 * 1e+95
      expect(float_mulratio(7801234554605699072n, 0, 0xffffffff, 1, ctx)).toBe(
        XFL_OVERFLOW,
      )
      // 1e+95 * 10
      expect(float_mulratio(7801234554605699072n, 0, 10, 1, ctx)).toBe(
        XFL_OVERFLOW,
      )
      // -1e+95 * 10
      expect(float_mulratio(3189548536178311168n, 0, 10, 1, ctx)).toBe(
        XFL_OVERFLOW,
      )
    })
    it('identity', () => {
      expect(float_mulratio(3189548536178311168n, 0, 1, 1, ctx)).toBe(
        3189548536178311168n,
      )
    })
    const cases = [
      [2296131684119423544n, 0, 2210828011, 2814367554, 2294351094683836182n],
      [565488225163275031n, 0, 2373474507, 4203973264, 562422045628095449n],
      [2292703263479286183n, 0, 3170020147, 773892643, 2307839765178024100n],
      // [758435948837102675n, 0, 3802740780, 1954123588, 760168290112163547n],
      // [3063742137774439410n, 0, 2888815591, 4122448592, 3053503824756415637n],
      [974014561126802184n, 0, 689168634, 3222648522, 957408554638995792n],
      [2978333847445611553n, 0, 1718558513, 2767410870, 2976075722223325259n],
      [6577058837932757648n, 0, 1423256719, 1338068927, 6577173649752398013n],
      // [2668681541248816636n, 0, 345215754, 4259223936, 2650183845127530219n],
      // [651803640367065917n, 0, 327563234, 1191613855, 639534906402789368n],
      [3154958130393015979n, 0, 1304112625, 3024066701, 3153571282364880740n],
      [1713286099776800976n, 0, 1902151138, 2927030061, 1712614441093927706n],
      // [2333142120591277120n, 0, 914099656, 108514965, 2349692988167140475n],
      // [995968561418010814n, 0, 1334462574, 846156977, 998955931389416094n],
      [6276035843030312442n, 0, 2660687613, 236740983, 6294920527635363073n],
      // [7333118474702086419n, 0, 46947714, 2479204760, 7298214153648998535n],
      [2873297486994296492n, 0, 880591893, 436034100, 2884122995598532757n],
      // [1935815261812737573n, 0, 3123665800, 3786746543, 1934366328810191207n],
      // [7249556282125616118n, 0, 2378803159, 2248850590, 7250005170160875417n],
      [311005347529659996n, 0, 992915590, 2433548552, 308187142737041830n],
    ] as const
    it.each(cases)(
      'random mulratios',
      (float1, round_up, numerator, denominator, expected) => {
        expect(
          float_mulratio(float1, round_up, numerator, denominator, ctx),
        ).toBe(expected)
      },
    )
  })

  describe('float_divide', () => {
    const one = float_one(ctx)
    const minus_one = float_negate(one, ctx)
    it('ensure invalid xfl are not accepted', () => {
      expect(float_divide(-1n, one, ctx)).toBe(INVALID_FLOAT)
    })
    it('divide by 0', () => {
      expect(float_divide(one, 0n, ctx)).toBe(DIVISION_BY_ZERO)
      expect(float_divide(0n, one, ctx)).toBe(0n)
    })
    it('check 1', () => {
      expect(float_divide(one, one, ctx)).toBe(one)
      expect(float_divide(minus_one, one, ctx)).toBe(minus_one)
      expect(float_divide(minus_one, minus_one, ctx)).toBe(one)
    })
    it('1 / 10 = 0.1', () => {
      expect(float_divide(one, 6107881094714392576n, ctx)).toBe(
        6071852297695428608n,
      )
    })
    it.todo('23456789 / 1623 = 76067.0295749', () => {
      expect(
        float_divide(6234216452170766464n, 6144532891733356544n, ctx),
      ).toBe(6168530993200328528n)
    })
    it.todo(
      '-1.245678451111 / 1.3546984132111e+42 = -9.195245517106014e-43',
      () => {
        expect(
          float_divide(1478426356228633688n, 6846826132016365020n, ctx),
        ).toBe(711756787386903390n)
      },
    )
    it('9.134546514878452e-81 / 1', () => {
      expect(float_divide(4638834963451748340n, one, ctx)).toBe(
        4638834963451748340n,
      )
    })
    it('9.134546514878452e-81 / 1.41649684651e+75 = (underflow 0)', () => {
      expect(
        float_divide(4638834963451748340n, 7441363081262569392n, ctx),
      ).toBe(0n)
    })
    it('1.3546984132111e+42 / 9.134546514878452e-81  = XFL_OVERFLOW', () => {
      expect(
        float_divide(6846826132016365020n, 4638834963451748340n, ctx),
      ).toBe(XFL_OVERFLOW)
    })
    const cases = [
      [
        3121244226425810900n /* -4.753284285427668e+91 */,
        2135203055881892282n /* -9.50403176301817e+36 */,
        7066645550312560102n /* 5.001334595622374e+54 */,
      ],
      [
        2473507938381460320n /* -5.535342582428512e+55 */,
        6365869885731270068n /* 6787211884129716 */,
        2187897766692155363n /* -8.155547044835299e+39 */,
      ],
      [
        1716271542690607496n /* -49036842898190.16 */,
        3137794549622534856n /* -3.28920897266964e+92 */,
        4667220053951274769n /* 1.490839995440913e-79 */,
      ],
      [
        1588045991926420391n /* -2778923.092005799 */,
        5933338827267685794n /* 6.601717648113058e-9 */,
        1733591650950017206n /* -420939403974674.2 */,
      ],
      [
        5880783758174228306n /* 8.089844083101523e-12 */,
        1396720886139976383n /* -0.00009612200909863615 */,
        1341481714205255877n /* -8.416224503589061e-8 */,
      ],
      [
        5567703563029955929n /* 1.254423600022873e-29 */,
        2184969513100691140n /* -5.227293453371076e+39 */,
        236586937995245543n /* -2.399757371979751e-69 */,
      ],
      [
        7333313065548121054n /* 1.452872188953566e+69 */,
        1755926008837497886n /* -8529353417745438 */,
        2433647177826281173n /* -1.703379046213333e+53 */,
      ],
      [
        1172441975040622050n /* -1.50607192429309e-17 */,
        6692015311011173216n /* 8.673463993357152e+33 */,
        560182767210134346n /* -1.736413416192842e-51 */,
      ],
      [
        577964843368607493n /* -1.504091065184005e-50 */,
        6422931182144699580n /* 9805312769113276000 */,
        235721135837751035n /* -1.533955214485243e-69 */,
      ],
      [
        6039815413139899240n /* 0.0049919124634346 */,
        2117655488444284242n /* -9.970862834892113e+35 */,
        779625635892827768n /* -5.006499985102456e-39 */,
      ],
      [
        1353563835098586141n /* -2.483946887437341e-7 */,
        6450909070545770298n /* 175440415122002600000 */,
        992207753070525611n /* -1.415835049016491e-27 */,
      ],
      [
        6382158843584616121n /* 50617712279937850 */,
        5373794957212741595n /* 5.504201387110363e-40 */,
        7088854809772330055n /* 9.196195545910343e+55 */,
      ],
      [
        2056891719200540975n /* -3.250289119594799e+32 */,
        1754532627802542730n /* -7135972382790282 */,
        6381651867337939070n /* 45547949813167340 */,
      ],
      [
        5730152450208688630n /* 1.573724193417718e-20 */,
        1663581695074866883n /* -62570322025.24355 */,
        921249452789827075n /* -2.515128806245891e-31 */,
      ],
      [
        6234301156018475310n /* 131927173.7708846 */,
        2868710604383082256n /* -4.4212413754468e+77 */,
        219156721749007916n /* -2.983939635224108e-70 */,
      ],
      [
        2691125731495874243n /* -6.980353583058627e+67 */,
        7394070851520237320n /* 8.16746263262388e+72 */,
        1377640825464715759n /* -0.000008546538744084975 */,
      ],
      [
        5141867696142208039n /* 7.764120939842599e-53 */,
        5369434678231981897n /* 1.143922406350665e-40 */,
        5861466794943198400n /* 6.7872793615536e-13 */,
      ],
      [
        638296190872832492n /* -7.792243040963052e-47 */,
        5161669734904371378n /* 9.551761192523954e-52 */,
        1557396184145861422n /* -81579.12330410798 */,
      ],
      [
        2000727145906286285n /* -1.128911353786061e+29 */,
        2096625200460673392n /* -6.954973360763248e+34 */,
        5982403476503576795n /* 0.000001623171355558107 */,
      ],
      [
        640472838055334326n /* -9.968890223464885e-47 */,
        5189754252349396763n /* 1.607481618585371e-50 */,
        1537425431139169736n /* -6201.557833201096 */,
      ],
    ] as const
    it.todo.each(cases)('random eivs', (float1, float2, expected) => {
      expect(float_divide(float1, float2, ctx)).toBe(expected)
    })
  })

  describe('float_invert', () => {
    it('divide by 0', () => {
      expect(float_invert(0n, ctx)).toBe(DIVISION_BY_ZERO)
    })
    it('ensure invalid xfl are not accepted', () => {
      expect(float_invert(-1n, ctx)).toBe(INVALID_FLOAT)
    })
    it('check 1', () => {
      expect(float_invert(float_one(ctx), ctx)).toBe(float_one(ctx))
    })
    it('1 / 10 = 0.1', () => {
      expect(float_invert(6107881094714392576n, ctx)).toBe(6071852297695428608n)
    })
    it.todo('1 / 123 = 0.008130081300813009', () => {
      expect(float_invert(6126125493223874560n, ctx)).toBe(6042953581977277649n)
    })
    it('1 / 1234567899999999 = 8.100000008100007e-16', () => {
      expect(float_invert(6360317241747140351n, ctx)).toBe(5808736320061298855n)
    })
    it.todo('1/ 1*10^-81 = 10**81', () => {
      expect(float_invert(4630700416936869888n, ctx)).toBe(7540018576963469311n)
    })
  })

  describe('float_int', () => {
    it('ensure invalid xfl are not accepted', () => {
      expect(float_int(-1n, 0, 0, ctx)).toBe(INVALID_FLOAT)
    })
    it('check 1', () => {
      expect(float_int(float_one(ctx), 0, 0, ctx)).toBe(1n)
    })
    it('check 1.23e-20 always returns 0 (too small to display)', () => {
      expect(float_int(5729808726015270912n, 0, 0, ctx)).toBe(0n)
      expect(float_int(5729808726015270912n, 15, 0, ctx)).toBe(0n)
      expect(float_int(5729808726015270912n, 16, 0, ctx)).toBe(INVALID_ARGUMENT)
    })
    it('one', () => {
      for (let i = 0; i < 16; i++) {
        expect(float_int(float_one(ctx), i, 0, ctx)).toBe(10n ** BigInt(i))
      }
    })
    it('normal upper limit on exponent', () => {
      expect(float_int(6360317241828374919n, 0, 0, ctx)).toBe(1234567981234567n)
    })
    it('ask for one decimal above limit', () => {
      expect(float_int(6360317241828374919n, 1, 0, ctx)).toBe(TOO_BIG)
    })
    it('ask for 15 decimals above limit', () => {
      expect(float_int(6360317241828374919n, 15, 0, ctx)).toBe(TOO_BIG)
    })
    it('every combination for 1.234567981234567', () => {
      for (let i = 0; i < 16; i++) {
        expect(float_int(6090101264186145159n, i, 0, ctx)).toBe(
          1234567981234567n / 10n ** BigInt(15 - i),
        )
      }
    })
    it('same with absolute parameter', () => {
      for (let i = 0; i < 16; i++) {
        expect(float_int(1478415245758757255n, i, 1, ctx)).toBe(
          1234567981234567n / 10n ** BigInt(15 - i),
        )
      }
    })
    it('neg xfl sans absolute parameter', () => {
      expect(float_int(1478415245758757255n, 15, 0, ctx)).toBe(
        CANT_RETURN_NEGATIVE,
      )
    })
    it('1.234567981234567e-16', () => {
      expect(float_int(5819885286543915399n, 15, 0, ctx)).toBe(1n)

      for (let i = 1; i < 15; i++) {
        expect(float_int(5819885286543915399n, i, 0, ctx)).toBe(0n)
      }
    })
  })

  it.todo('float_sto', () => {
    float_sto(0, 0, 0, 0, 0, 0, 0n, 0, ctx)
  })

  it.todo('float_sto_set', () => {
    float_sto_set(0, 0, ctx)
  })

  describe('float_log', () => {
    it('check 0 is not allowed', () => {
      expect(float_log(0n, ctx)).toBe(INVALID_ARGUMENT)
    })
    it.todo('log10( 846513684968451 ) = 14.92763398342338', () => {
      expect(float_log(6349533412187342878n, ctx)).toBe(6108373858112734914n)
    })
    it('log10 ( -1000 ) = invalid (complex not supported)', () => {
      expect(float_log(1532223873305968640n, ctx)).toBe(COMPLEX_NOT_SUPPORTED)
    })
    it('log10 (1000) == 3', () => {
      expect(float_log(6143909891733356544n, ctx)).toBe(6091866696204910592n)
    })
    it.todo('log10 (0.112381) == -0.949307107740766', () => {
      expect(float_log(6071976107695428608n, ctx)).toBe(1468659350345448364n)
    })
    it('log10 (0.00000000000000001123) = -16.94962024373854221', () => {
      expect(float_log(5783744921543716864n, ctx)).toBe(1496890038311378526n)
    })
    it('log10 (100000000000000000000000000000000000000000000000000000000000000) = 62', () => {
      expect(float_log(7206759403792793600n, ctx)).toBe(6113081094714392576n)
    })
  })

  describe('float_root', () => {
    it('one', () => {
      expect(float_root(float_one(ctx), 2, ctx)).toBe(float_one(ctx))
    })
    it('sqrt 9 is 3', () => {
      expect(float_root(6097866696204910592n, 2, ctx)).toBe(
        6091866696204910592n,
      )
    })
    it('cube root of 1000 is 10', () => {
      expect(float_root(6143909891733356544n, 3, ctx)).toBe(
        6107881094714392576n,
      )
    })
    it('sqrt of negative is "complex not supported error"', () => {
      expect(float_root(1478180677777522688n, 2, ctx)).toBe(
        COMPLEX_NOT_SUPPORTED,
      )
    })
    it('tenth root of 0 is 0', () => {
      expect(float_root(0n, 10, ctx)).toBe(0n)
    })
  })
})
