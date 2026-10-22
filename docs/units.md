# Units

The definitions file `src/units.txt` ships with the app, which loads
it as it starts. The file defines every unit, prefix and unit list
the calculator knows, and every function but the built-in ones. The
file is the source of truth: it lists every name, and a comment
beside a factor says where the factor comes from when that is not
obvious. The file groups its definitions by system and by family.
Four lists here are complete, as the file stands: the primitives, the
unit lists, the inexact units and the measured factors. Every other
section names the units a reader is likely to look for, and the file
holds the rest. [Quantities](quantities.md) defines a unit, a prefix,
a dimension, a kind, a conversion and a unit list, and
[The expression language](expressions.md) says how a typed name is
read. [The definition language](definitions.md) says how a definition
is written, and [Numbers](numbers.md) says what exact and inexact
mean.

A unit named in prose is typed as its name in one word, `fortnight`
or `troyounce`, and a parenthesis after it gives its further names,
as `lb` and `lbm` after the pound. An example gives what you type,
what you convert it into, and what Exucal shows: the result side of
an output line, with its relation, `=` or `≈`, at the default
settings. `≈` marks an inexact value, and also an exact value with
more digits than are shown
([Digits you can trust](numbers.md#digits-you-can-trust)). A note
says "inexact" wherever a unit or a function in an example is
inexact, and every other `≈` is an exact value cut to the display
digits. A conversion into one unit answers in two lines, and the
examples quote the first
([The reciprocal line](quantities.md#the-reciprocal-line) describes
the second). An error is described in a few words, not quoted. The
typed forms paste straight into the have and want fields.

The definitions file holds these things:

- **Nine primitives.** The seven SI base units, the radian, which
  marks a kind, and the bit ([The primitives](#the-primitives)).
- **The SI in full.** The base units, every prefix, the derived units
  with special names and the non-SI units accepted for use with the
  SI ([The SI](#the-si)).
- **The US customary units.** Length, area, liquid and dry measure,
  mass, force, pressure, energy, power, speed and light
  ([US customary](#us-customary)).
- **The UK imperial units where they differ from the US ones.** The
  imperial gallon with its subdivisions, the stone and the long ton
  ([UK imperial](#uk-imperial)).
- **More than one name for most units.** A symbol and a name, other
  names beside them, `imp` and `uk` for the imperial units, and names
  that differ only in case ([Naming conventions](#naming-conventions)).
- **The physical constants the definitions use.** The circle constant
  is the built-in function `pi()`, not a definition. The extras, the
  units outside the three systems, are the four families after the
  constants ([Constants and extras](#constants-and-extras)).
- **Other metric and scientific units.** CGS, pressure, calories,
  radiation, the light year and the parsec, and more
  ([Other metric and scientific units](#other-metric-and-scientific-units)).
- **Time beyond the day.** The week, the month, the year and the
  century ([Time beyond the day](#time-beyond-the-day)).
- **Information.** The bit, the byte and the binary prefixes
  ([Information](#information)).
- **Counts and ratios.** `percent`, `dozen` and the like, plain
  numbers ([Counts and ratios](#counts-and-ratios)).
- **The angle units beyond the radian, inexact through `pi()`.** The
  degree, the grad, the turn and everything built on them; the radian
  and the steradian are exact
  ([Angles and rotation](#angles-and-rotation)).
- **Temperature differences as units, readings as functions.** `degC`
  is a difference, and `tempC(20)` is a reading
  ([Temperature: differences and readings](#temperature-differences-and-readings)).
- **Logarithmic levels as functions.** `decibel`, `bel` and `neper`
  ([Logarithmic levels](#logarithmic-levels)).
- **Fifteen unit lists.** `dms` is the one inexact list
  ([Unit lists defined in the file](#unit-lists-defined-in-the-file)).
- **Every factor read exactly as written.** A conversion is exact
  unless a unit calls `pi()`. Three factors are measured values, and
  the documents that fix the rest are named
  ([Which factors are exact](#which-factors-are-exact)).
- **Names that are absent or mean something else.** `u`, `at`, `dB`,
  `e` and `rad` among them
  ([Names that are absent or mean something else](#names-that-are-absent-or-mean-something-else)).

## The primitives

Every unit in the file is defined down to the primitives, the base
quantities the file declares with a body of `!` or `!kind`
([Primitives](definitions.md#primitives)). The file declares nine, in
this order: the seven SI base units, the radian and the bit. The seven
are the meter `m`, the kilogram `kg`, the second `s`, the ampere `A`,
the kelvin `K`, the mole `mol` and the candela `cd`. The radian,
`radian`, is declared as a kind primitive. A kind primitive is a
marker of a kind, with no dimension of its own, and it keeps an angle
apart from a plain number
([Primitives, dimensions and kinds](quantities.md#primitives-dimensions-and-kinds)
says what a kind does). The bit, `bit`, is declared as a dimension
primitive.

Information is a dimension so that a count of bits does not collapse
into a plain number. If the bit were a plain number, a bit per second
would be a hertz, and a count of bits could be added to any plain
number. As a dimension, information keeps a bit per second apart from
a hertz, as the radian kind keeps a radian per second apart from a
hertz: `1 bit/s` into `Hz` is a dimension mismatch, and `1 turn/min`
into `Hz` is a kind mismatch.

A blank want answers in the primitives, in that order
([How dimensions are written in messages](quantities.md#how-dimensions-are-written-in-messages)).

| You type      | Into    | Exucal shows                                              | Note                                   |
| ------------- | ------- | --------------------------------------------------------- | -------------------------------------- |
| `1 N`         |         | `= 1 m kg / s^2`                                          | a blank want answers in the primitives |
| `1 bit/s`     | `Hz`    | an error, a dimension mismatch: `bit / s` against `1 / s` | information is a dimension             |
| `1 turn/min`  | `Hz`    | an error, a kind mismatch: the radian                     | the radian marks a kind                |
| `60 turn/min` | `rad/s` | `≈ 6.2831853 rad / s`                                     | angles per time on both sides; inexact |

## The SI

Most units are defined twice, by **symbol** and by **name**, the two
forms the SI gives its units: `m` and `meter`.

### Base units

Each base unit is defined by symbol and by name: `m` and `meter`, with
`metre` as well; `kg` and `kilogram`; `s` and `second`; `A` and
`ampere`; `K` and `kelvin`; `mol` and `mole`; and `cd` and `candela`.
Three units are defined beside them: the gram (`g`), a thousandth of
a kilogram; the tonne (`t`, `metricton`), a thousand kilograms; and
the liter (`L`, `l`, `litre`), a cubic decimeter.

### Prefixes

Every SI prefix is defined by name and by symbol, from `quetta-` and
`Q-`, a factor of `1e30`, down to `quecto-` and `q-`, a factor of
`1e-30`. The four prefixes the SI added in 2022, `quetta-`, `ronna-`,
`ronto-` and `quecto-`, are among them. `deca-` is also written
`deka-`, and micro is written three ways: `µ-`, the micro sign; `μ-`,
the Greek letter mu; and `u-`, an ASCII stand-in. A prefix goes in
front of a unit's symbol or its name, `km` and `kilometer`, and
[Names](expressions.md#names) says how a prefixed name is read. The
binary prefixes, which are not the SI's, are defined beside them: by
name, `kibi-` to `yobi-`, and by symbol, `Ki-` to `Yi-`, each a power
of `1024`. They are meant for the bit and the byte, but a prefix
applies to any unit.

### Derived units with special names

The SI's twenty-two derived units with special names are all defined,
by symbol and by name: `Hz`, `N`, `Pa`, `J`, `W`, `C`, `V`, `F`, `Ω`,
`S`, `Wb`, `T`, `H`, `lm`, `lx`, `Bq`, `Gy`, `Sv`, `kat`, `rad`, `sr`
and `degC`, each with its name spelled out, `hertz` to `celsius`. `Ω`
is also written `ohm`, and the siemens has a second name, `mho`. The
SI counts the radian among its derived units, and the file declares
it as a primitive, with `rad` as its symbol
([The primitives](#the-primitives)). `degC` is the degree Celsius as
a temperature difference
([Temperature: differences and readings](#temperature-differences-and-readings)).

### Non-SI units accepted for use with the SI

The SI accepts these units from outside it, and the file defines
them:

- The minute, the hour and the day: `min`, `h` and `d`, with `minute`,
  `hr`, `hour` and `day`.
- The degree and its subdivisions, `deg`, `arcmin` and `arcsec`,
  inexact through `pi()` ([Angles and rotation](#angles-and-rotation)).
- The hectare and the are, `ha` and `are`.
- The liter and the tonne, defined beside the base units.
- The astronomical unit: `au`, `AU` and `astronomicalunit`.
- The electronvolt, `eV` and `electronvolt`.
- The dalton: `Da`, `dalton`, `amu` and `atomicmassunit`. Its symbol
  `u` is absent
  ([Names that are absent or mean something else](#names-that-are-absent-or-mean-something-else)).

The neper, the bel and the decibel, which the SI also accepts, are
functions here ([Logarithmic levels](#logarithmic-levels)). The
examples span the SI, from its prefixes to its accepted units:

| You type      | Into  | Exucal shows        | Note                                              |
| ------------- | ----- | ------------------- | ------------------------------------------------- |
| `1 Qm`        | `m`   | `= 1e+30 m`         | a prefix of 2022                                  |
| `1 µm`        | `m`   | `= 1e-6 m`          | the micro sign; `1 μm` and `1 um` answer the same |
| `1 dekameter` | `m`   | `= 10 m`            | `deka` and `meter`                                |
| `1 mho`       | `S`   | `= 1 S`             |                                                   |
| `1 t`         | `kg`  | `= 1000 kg`         | the tonne                                         |
| `1 L`         | `m^3` | `= 0.001 m^3`       |                                                   |
| `1 au`        | `m`   | `≈ 1.4959787e+11 m` |                                                   |
| `1 eV`        | `J`   | `≈ 1.6021766e-19 J` |                                                   |

## US customary

The inch, the foot, the yard and the mile are the international ones,
fixed by the 1959 agreement on the yard and the pound: the inch is
exactly `2.54 cm`. The imperial system shares them, and the
avoirdupois pound and ounce too. By family:

- Length. The inch, the foot, the yard and the mile are `in`, `ft`,
  `yd` and `mi`, each also by name, and `statutemile` is a second
  name for the mile. The other length units include the mil (`thou`),
  the hand, the fathom, the chain, the link, the rod (`pole`,
  `perch`), the furlong and the league. The nautical mile (`nmi`,
  `nmile`) is the international one, 1852 meters. The point is an
  inch over 72, as desktop publishing has it, with the pica of 12
  points.
- Survey measure. The survey foot (`surveyft`) is exactly
  `1200 m / 3937`, and older survey data uses it. The land-survey
  units are built on it: `surveyyard`, `surveymile`, `surveychain`,
  `surveylink`, `surveyrod`, `surveyfurlong`, `surveyacre`, `section`
  and `township`.
- Area. The acre, the international one of 4840 square yards, and
  the acre-foot (`acrefoot`).
- Liquid measure. The gallon of 231 cubic inches (`gal`) and its
  subdivisions: the quart (`qt`); the pint (`pt`); the cup, half a
  pint; the gill; the fluid ounce (`floz`, `fluidounce`); the
  tablespoon (`tbsp`); the teaspoon (`tsp`); the fluid dram (`fldram`,
  `fluiddram`); and the minim. The barrel (`bbl`), the petroleum one,
  is 42 gallons, and the hogshead is 63 gallons.
- Dry measure. The bushel of 2150.42 cubic inches (`bu`) and its
  subdivisions, the peck (`pk`) and the dry gallon, quart and pint
  (`drygallon`, `dryquart`, `drypint`). The dry barrel, the cord and
  the board foot (`fbm`) stand beside them.
- Mass. The avoirdupois units are the pound (`lb`, `lbm`), exactly
  `0.45359237 kg`, with the ounce (`oz`), the dram (`dr`, `drachm`),
  the grain (`gr`), the hundredweight of 100 pounds and the ton of
  2000 pounds. The troy units are the troy ounce (`ozt`) of 480
  grains, the troy pound (`lbt`) and the pennyweight (`dwt`). The
  apothecaries' units are the scruple and the apothecaries' dram,
  ounce and pound, `apdram`, `apounce` and `appound`.
- Force, pressure, energy and power. The forces include the
  pound-force (`lbf`), `ozf`, `kip`, `tonforce` and the poundal
  (`pdl`), and the slug is the mass that goes with them,
  `lbf s^2 / ft`. The pressures include `psi`, `psf` and `ksi`. The
  energies include `Btu` (`btu`, `BTU`), the International Table Btu,
  the therm and the quad. The powers include the horsepower (`hp`),
  the mechanical one, and `tonrefrigeration`.
- Speed. `mph`, `fps` and the knot (`kn`).
- Light. The footcandle (`fc`), a lumen per square foot.

| You type       | Into   | Exucal shows      | Note                               |
| -------------- | ------ | ----------------- | ---------------------------------- |
| `1 mi`         | `ft`   | `= 5280 ft`       |                                    |
| `1 in`         | `cm`   | `= 2.54 cm`       |                                    |
| `1 surveyfoot` | `m`    | `≈ 0.30480061 m`  | `1200 / 3937`                      |
| `1 surveymile` | `mi`   | `≈ 1.000002 mi`   |                                    |
| `1 acre`       | `yd^2` | `= 4840 yd^2`     |                                    |
| `1 gallon`     | `in^3` | `= 231 in^3`      |                                    |
| `1 cup`        | `floz` | `= 8 floz`        |                                    |
| `1 lb`         | `kg`   | `= 0.45359237 kg` |                                    |
| `1 ozt`        | `oz`   | `≈ 1.0971429 oz`  | a troy ounce in avoirdupois ounces |
| `1 hp`         | `W`    | `≈ 745.69987 W`   |                                    |
| `1 psi`        | `Pa`   | `≈ 6894.7573 Pa`  |                                    |
| `1 knot`       | `km/h` | `= 1.852 km / h`  |                                    |

## UK imperial

The UK imperial units are defined where they differ from the US
customary ones ([Naming conventions](#naming-conventions) says how
the two systems are told apart). By family:

- Capacity. `impgallon` (`impgal`), the imperial gallon, is exactly
  `4.54609 L`. Its subdivisions are `impquart`, `imppint`, `impgill`,
  `impfloz`, the fluid ounce of twenty to the pint, `impfldram` and
  `impminim`, and its multiples are `imppeck` and `impbushel`. All
  but the fluid dram and the minim also have a name with `uk` in
  front, `ukgallon` and `ukpint` among them.
- Mass. The imperial masses beyond the pound are these; the pound,
  the ounce, the dram and the grain are the US ones.
  - The stone (`st`) is 14 pounds.
  - The quarter is 28 pounds.
  - The long hundredweight (`longhundredweight`, `imphundredweight`,
    `ukhundredweight`, `impcwt`) is 112 pounds.
  - The long ton (`longton`, `impton`, `ukton`) is 2240 pounds.
  - The cental is 100 pounds, the short hundredweight under its
    British name.
- Area. The rood, a quarter of an acre.

| You type      | Into      | Exucal shows         | Note        |
| ------------- | --------- | -------------------- | ----------- |
| `1 impgallon` | `gallon`  | `≈ 1.2009499 gallon` |             |
| `1 imppint`   | `impfloz` | `= 20 impfloz`       |             |
| `1 pint`      | `floz`    | `= 16 floz`          | the US pint |
| `1 impfloz`   | `floz`    | `≈ 0.96075994 floz`  |             |
| `1 longton`   | `lb`      | `= 2240 lb`          |             |
| `1 stone`     | `lb`      | `= 14 lb`            |             |
| `1 rood`      | `acre`    | `= 0.25 acre`        |             |

## Naming conventions

The file names a unit the way people write it, so most units have
more than one name.

- Most units are defined by symbol and by name ([The SI](#the-si)). A
  further name whose body is another name alone is an **alias** of
  it, as `metricton` is of `tonne` ([Units](definitions.md#units)), so
  the two convert with the factor one and either can be typed
  anywhere. A **spelling** is an alias that differs from the name by
  convention, as `metre` beside `meter`, `litre` beside `liter` and
  `deka-` beside `deca-` do, or by script, as the ASCII `ohm`,
  `angstrom` and `u-` do for `Ω`, `Å` and `µ-` or `μ-`.
- Where the US and the UK give one name to different units, the plain
  name is the US unit and the name with `imp` in front is the
  imperial one, and most imperial units have a name with `uk` in
  front as well: `gallon` is 231 cubic inches, and `impgallon` and
  `ukgallon` are 4.54609 liters. The ton and the hundredweight come as
  a short and a long unit instead, `ton` (`shortton`, `uston`) and
  `longton`, and `hundredweight` (`cwt`) and `longhundredweight`. The
  long units also have names with `imp` and `uk` in front, and
  [UK imperial](#uk-imperial) gives the values.
- Names are case-sensitive ([Names](expressions.md#names)), and some
  differ only in case:
  - `Gal` is the galileo, and `gal` is the gallon.
  - `St` is the stokes, and `st` is the stone.
  - `T` is the tesla, and `t` is the tonne.
  - `S` is the siemens, and `s` is the second.
  - `B` is the byte, and `b` is the bit.

| You type      | Into    | Exucal shows                                              | Note                        |
| ------------- | ------- | --------------------------------------------------------- | --------------------------- |
| `1 metricton` | `tonne` | `= 1 tonne`                                               | an alias                    |
| `1 metre`     | `meter` | `= 1 meter`                                               | a spelling                  |
| `1 ohm`       | `Ω`     | `= 1 Ω`                                                   | an ASCII spelling           |
| `1 gallon`    | `L`     | `≈ 3.7854118 L`                                           | the US gallon               |
| `1 ukton`     | `lb`    | `= 2240 lb`                                               | the long ton                |
| `1 Gal`       | `m/s^2` | `= 0.01 m / s^2`                                          | the galileo                 |
| `1 gal`       | `L`     | `≈ 3.7854118 L`                                           | the gallon                  |
| `1 T`         | `t`     | an error, a dimension mismatch: `kg / s^2 A` against `kg` | the tesla against the tonne |

## Constants and extras

Beyond the three systems, the file holds a few physical constants,
defined as units so that other definitions can use them, and the
extras, the units that belong to none of the three systems: the other
metric and scientific units, time beyond the day, information, and
counts and ratios. Five of the SI's seven defining constants are
defined, each exact as the SI fixes it: `c`, the speed of light; `e`,
the elementary charge; `planck`; `boltzmann`; and `avogadro` (`N_A`).
The two left out are the cesium frequency and the luminous efficacy.
`gravity` (`g0`), the standard acceleration of gravity,
`9.80665 m / s^2`, is exact by convention, a value fixed by agreement
rather than measured. Other definitions use the constants: the
electronvolt is `e V`, the kilogram-force is `kg gravity`, and the
light year is `c julianyear`. Each constant is a quantity with a
dimension, so `c` converts into `km/s`, and `e` with a blank want
answers with a charge in the primitives. The circle constant is not a
definition but the built-in function `pi()`
([Constants](builtins.md#constants)), which the file's bodies call
where a unit needs it, the angle units among them.

| You type    | Into    | Exucal shows                  | Note                                                                                                                              |
| ----------- | ------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `c`         | `km/s`  | `≈ 299792.46 km / s`          |                                                                                                                                   |
| `planck`    | `J s`   | `≈ 6.6260702e-34 J s`         |                                                                                                                                   |
| `boltzmann` | `J/K`   | `= 1.380649e-23 J / K`        |                                                                                                                                   |
| `avogadro`  |         | `≈ 6.0221408e+23 × (1 / mol)` | in the primitives, written as [How dimensions are written in messages](quantities.md#how-dimensions-are-written-in-messages) says |
| `e`         |         | `≈ 1.6021766e-19 s A`         | the elementary charge                                                                                                             |
| `gravity`   | `m/s^2` | `= 9.80665 m / s^2`           | exact by convention                                                                                                               |
| `1 kgf`     | `N`     | `= 9.80665 N`                 | `kg gravity`                                                                                                                      |
| `pi()`      |         | `≈ 3.1415927`                 | the circle constant, a built-in; inexact                                                                                          |

## Other metric and scientific units

Beyond the SI, the file reaches the units of older and specialized
practice, the CGS system among them:

- `Å` (`angstrom`), the ångström; the micron, a micrometer; the
  fermi, a femtometer; and `cc`, the cubic centimeter.
- The CGS units include the dyne (`dyn`), the erg, `Gal`, the
  galileo, the poise, the stokes (`St`), the gauss, the maxwell
  (`Mx`), the oersted (`Oe`) and the phot, a lumen per square
  centimeter. The oersted is inexact through `pi()`.
- The pressure units include `bar`; the atmosphere (`atm`), the
  standard one; the torr, an atmosphere over 760; `mmHg`, the
  millimeter of mercury, with `cmHg` and `inHg` for the centimeter and
  the inch of mercury; and `mmH2O`, the millimeter of water, with
  `cmH2O` and `inH2O` likewise. The millimeter of mercury and the
  millimeter of water are conventional, fixed by agreement rather than
  measured. The technical atmosphere is a kilogram-force per square
  centimeter, and its symbol `at` is absent
  ([Names that are absent or mean something else](#names-that-are-absent-or-mean-something-else)).
- `kgf` (`kilopond`, `kp`), the kilogram-force, and `gf`, the
  gram-force: the forces that the millimeter of water and the
  technical atmosphere are defined from.
- The calorie (`cal`), the thermochemical one, `4.184 J`, and
  `cal_IT`, the International Table calorie; `Wh`, the watt-hour, and
  `Ah`, the ampere-hour; and `tonTNT`, the ton of TNT.
- `metrichp` (`PS`), the metric horsepower, and `kph` (`kmh`), a
  kilometer per hour.
- The radiation units include the curie (`Ci`), the rem and the
  roentgen. The absorbed-dose rad is not defined
  ([Names that are absent or mean something else](#names-that-are-absent-or-mean-something-else)).
- The carat (`ct`) of 200 milligrams, and the barn.
- The light year (`ly`) and the parsec (`pc`), the parsec inexact
  through `pi()`. The astronomical unit is among the units the SI
  accepts ([The SI](#the-si)).

| You type | Into   | Exucal shows         | Note                   |
| -------- | ------ | -------------------- | ---------------------- |
| `1 Å`    | `nm`   | `= 0.1 nm`           |                        |
| `1 dyn`  | `N`    | `= 1e-5 N`           |                        |
| `1 Oe`   | `A/m`  | `≈ 79.577472 A / m`  | inexact through `pi()` |
| `1 atm`  | `torr` | `= 760 torr`         |                        |
| `1 atm`  | `psi`  | `≈ 14.695949 psi`    |                        |
| `1 mmHg` | `Pa`   | `≈ 133.32239 Pa`     | the conventional value |
| `1 cal`  | `J`    | `= 4.184 J`          |                        |
| `1 PS`   | `hp`   | `≈ 0.98632007 hp`    |                        |
| `1 Ci`   | `Bq`   | `= 3.7e+10 Bq`       |                        |
| `1 ly`   | `km`   | `≈ 9.4607305e+12 km` |                        |
| `1 pc`   | `ly`   | `≈ 3.2615638 ly`     | inexact through `pi()` |

## Time beyond the day

The time units beyond the day include the week (`wk`), the fortnight,
the Julian year, the tropical and sidereal years, the month, the
decade, the century and the millennium. `year` is the Julian year
(`yr`, `julianyear`), 365.25 days: the calendar year varies in
length, and the Julian year is the fixed one that the light year is
defined with. The month, the decade, the century and the millennium
are defined from it, a month being a twelfth of a Julian year. The
tropical year (`tropicalyear`) and the sidereal year (`siderealyear`)
are measured values, read exactly
([Which factors are exact](#which-factors-are-exact)).

| You type         | Into  | Exucal shows      | Note                                  |
| ---------------- | ----- | ----------------- | ------------------------------------- |
| `1 fortnight`    | `hr`  | `= 336 hr`        |                                       |
| `1 year`         | `day` | `= 365.25 day`    | the Julian year                       |
| `1 month`        | `day` | `= 30.4375 day`   | a twelfth of the Julian year          |
| `1 tropicalyear` | `day` | `= 365.24219 day` | a measured value, read exactly        |
| `1 siderealyear` | `day` | `≈ 365.25636 day` | a measured value, cut to eight digits |
| `1 millennium`   | `day` | `= 365250 day`    |                                       |

## Information

The bit is a primitive ([The primitives](#the-primitives)). The byte
(`B`) is eight bits, `b` is the bit, and `bps` is a bit per second.
The binary prefixes and the SI prefixes both apply
([Prefixes](#prefixes)): `KiB` is 1024 bytes, and `kB` is a thousand
bytes.

| You type | Into   | Exucal shows     | Note            |
| -------- | ------ | ---------------- | --------------- |
| `1 B`    | `bit`  | `= 8 bit`        |                 |
| `1 MiB`  | `byte` | `= 1048576 byte` | a binary prefix |
| `1 MB`   | `byte` | `= 1000000 byte` | an SI prefix    |
| `1 GiB`  | `GB`   | `≈ 1.0737418 GB` |                 |
| `1 Mbps` | `B/s`  | `= 125000 B / s` |                 |

## Counts and ratios

`percent`, `permille`, `ppm`, `ppb`, `dozen` and `gross` are plain
numbers, each defined with a number for a body: `percent` is
`1 / 100`, `permille` is `1 / 1000`, `ppm` is `1e-6`, `ppb` is
`1e-9`, `dozen` is `12` and `gross` is `144`. Each is multiplied in
as any unit is, so `5 percent` is `0.05` and `3 dozen` is `36`, and a
plain number converts into any of them.

| You type    | Into      | Exucal shows      |
| ----------- | --------- | ----------------- |
| `5 percent` |           | `= 0.05`          |
| `3 dozen`   |           | `= 36`            |
| `1 gross`   | `dozen`   | `= 12 dozen`      |
| `50 ppm`    | `percent` | `= 0.005 percent` |
| `2 ppb`     |           | `= 2e-9`          |

## Angles and rotation

Beyond the radian, the angle and rotation units include these.

- The degree, the arcminute and the arcsecond, `deg`, `arcmin` and
  `arcsec`.
- The grad (`gon`, `gradian`), a four-hundredth of a turn.
- The turn (`rev`, `revolution`, `circle`).
- The revolution per minute and the revolution per second, `rpm` and
  `rps`.

The angles among them are quantities of the radian kind, and `rpm`
and `rps` are angles per time
([Primitives, dimensions and kinds](quantities.md#primitives-dimensions-and-kinds)),
so `60 rpm` converts into `rad/s` and not into `Hz`. Every one of
them is defined through `pi()`, the degree as `pi() radian / 180`,
the grad as `pi() radian / 200` and the turn as `2 pi() radian`, so
every one is inexact, and a conversion among them or into radians is
`≈`: `1 turn` into `deg` is `≈ 360 deg`
([Which factors are exact](#which-factors-are-exact) says what
follows for the digits). The radian (`rad`) and the steradian (`sr`),
defined as `radian^2`, are exact.

| You type   | Into       | Exucal shows         | Note                  |
| ---------- | ---------- | -------------------- | --------------------- |
| `1 turn`   | `deg`      | `≈ 360 deg`          | inexact on both sides |
| `1 deg`    | `arcmin`   | `≈ 60 arcmin`        | inexact               |
| `90 deg`   | `radian`   | `≈ 1.5707963 radian` | inexact               |
| `100 gon`  | `deg`      | `≈ 90 deg`           | inexact               |
| `1 rps`    | `rpm`      | `≈ 60 rpm`           | inexact               |
| `1 radian` | `deg`      | `≈ 57.29578 deg`     | inexact: `deg`        |
| `1 sr`     | `radian^2` | `= 1 radian^2`       | exact                 |

## Temperature: differences and readings

`degC` (`celsius`), `degF` (`fahrenheit`) and `degR` (`rankine`) are
temperature differences, the size of a step on a scale and not a
reading on it: `1 degC` is `1 K`, and `1 degF` and `1 degR` are five
ninths of a kelvin. `degC` is the SI's degree Celsius
([The SI](#the-si)).

A reading is a call of `tempC` or `tempF`, functions of a plain
number. `tempC(x)` is `x K + 273.15 K`, for `x` at or above
`-273.15`. `tempF(x)` is `(x + 459.67) degF`, for `x` at or above
`-459.67`. Each gives the temperature that a reading of `x` on its
scale denotes, and a reading below absolute zero is an error. Each has
an inverse, so any temperature converts into either function, a call
of the other included: `tempF(212)` into `tempC` is `= tempC(100)`.
The kelvin and Rankine scales start at absolute zero, so a reading on
either is a difference from zero, `300 K` or `540 degR`, and needs no
function.
[Temperature and logarithmic levels as functions](quantities.md#temperature-and-logarithmic-levels-as-functions)
says why a reading is a function and not a unit.

| You type             | Into    | Exucal shows                                                  | Note                                      |
| -------------------- | ------- | ------------------------------------------------------------- | ----------------------------------------- |
| `1 degF`             | `K`     | `≈ 0.55555556 K`                                              | a difference, five ninths of a kelvin     |
| `212 degF - 32 degF` | `degC`  | `= 100 degC`                                                  | differences                               |
| `20 degC`            | `degF`  | `= 36 degF`                                                   | a difference, not a reading               |
| `tempC(100)`         |         | `= 373.15 K`                                                  | a reading                                 |
| `tempF(212)`         | `tempC` | `= tempC(100)`                                                | a reading into a reading                  |
| `300 K`              | `tempC` | `= tempC(26.85)`                                              | a temperature into a reading              |
| `540 degR`           | `tempF` | `= tempF(80.33)`                                              | a Rankine reading, a difference from zero |
| `tempC(-300)`        |         | an error, a failed condition: `tempC` requires `x >= -273.15` | below absolute zero                       |

## Logarithmic levels

`decibel`, `bel` and `neper` are functions of a plain number, a
level, and each gives the ratio that the level denotes. `decibel(x)`
is `pow(10, x / 10)` and `bel(x)` is `pow(10, x)`, and both are power
ratios. `neper(x)` is `exp(x)`, an amplitude ratio. `decibel` has the
inverse `10 log10(y)`, `bel` has `log10(y)` and `neper` has `ln(y)`,
so a ratio converts into a level: `1000` into `decibel` is
`= decibel(30)`. The ratio and the level are both plain numbers. `dB`
is not the decibel
([Names that are absent or mean something else](#names-that-are-absent-or-mean-something-else)).
[Temperature and logarithmic levels as functions](quantities.md#temperature-and-logarithmic-levels-as-functions)
says why a level is a function and not a unit.

| You type      | Into      | Exucal shows          | Note                        |
| ------------- | --------- | --------------------- | --------------------------- |
| `decibel(20)` |           | `= 100`               | a power ratio               |
| `decibel(3)`  |           | `≈ 1.9952623`         | inexact                     |
| `bel(2)`      |           | `= 100`               |                             |
| `neper(1)`    |           | `≈ 2.7182818`         | an amplitude ratio; inexact |
| `1000`        | `decibel` | `= decibel(30)`       | a ratio into a level        |
| `2`           | `neper`   | `≈ neper(0.69314718)` | inexact                     |

## Unit lists defined in the file

A list the file defines is typed by its name alone as the want, and
it answers with a sum, largest unit first.
[Unit lists](quantities.md#unit-lists) in Quantities says how the sum
is counted, and [Unit lists](definitions.md#unit-lists) in The
definition language says how a list is defined. There are fifteen,
and `time` and `hms` are two lists with the same units:

| List          | Units               |
| ------------- | ------------------- |
| `time`, `hms` | `hr;min;s`          |
| `dhms`        | `day;hr;min;s`      |
| `ydhms`       | `year;day;hr;min;s` |
| `dms`         | `deg;arcmin;arcsec` |
| `ftin`        | `ft;in`             |
| `ydftin`      | `yd;ft;in`          |
| `miftin`      | `mi;ft;in`          |
| `lboz`        | `lb;oz`             |
| `stlb`        | `stone;lb`          |
| `tonlb`       | `ton;lb`            |
| `galqtpt`     | `gal;qt;pt;floz`    |
| `cups`        | `cup;tbsp;tsp`      |
| `mipace`      | `hr/mi;min/mi;s/mi` |
| `kmpace`      | `hr/km;min/km;s/km` |

`dms` is the one inexact list, since its units are defined through
`pi()` ([Which factors are exact](#which-factors-are-exact)), so its
sum is `≈` whatever the counts. Every other list's units are exact.

| You type      | Into      | Exucal shows                                | Note                                 |
| ------------- | --------- | ------------------------------------------- | ------------------------------------ |
| `1e8 s`       | `ydhms`   | `= 3 year + 61 day + 15 hr + 46 min + 40 s` | the year is the Julian year          |
| `1 km`        | `miftin`  | `≈ 3280 ft + 10.07874 in`                   | the count of miles is zero, left out |
| `100 kg`      | `stlb`    | `≈ 15 stone + 10.462262 lb`                 |                                      |
| `1.3 gal`     | `galqtpt` | `= 1 gal + 1 qt + 6.4 floz`                 | the count of pints is zero, left out |
| `1 L`         | `cups`    | `≈ 4 cup + 3 tbsp + 1.8841362 tsp`          |                                      |
| `1 hr / 7 mi` | `kmpace`  | `≈ 5 min / km + 19.562327 s / km`           | a pace                               |
| `1 radian`    | `dms`     | `≈ 57 deg + 17 arcmin + 44.806247 arcsec`   | inexact: the one inexact list        |

## Which factors are exact

Every factor in the file is read exactly as written, so a conversion
is exact unless a unit on either side calls `pi()`.
[Units, prefixes and exactness of factors](quantities.md#units-prefixes-and-exactness-of-factors)
states the rule and says which factors are defined and which are
measured.

### The inexact units

Five definitions call `pi()`: `deg`, `grad`, `turn`, `parsec` and
`oersted`. They and everything built on them are the file's inexact
units, and the list is complete: `deg`, `degree`, `arcmin`,
`arcminute`, `arcsec`, `arcsecond`, `grad`, `gon`, `gradian`, `turn`,
`rev`, `revolution`, `circle`, `rpm`, `rps`, `parsec`, `pc`, `oersted`
and `Oe`, with the unit list `dms`. Every other unit is exact, the
radian and the steradian among them. `pi()` is inexact, a value no
fraction holds
([Exact and inexact values](numbers.md#exact-and-inexact-values)), so
a unit defined through it carries an error radius, and a conversion
through such a unit is `≈` even when the number is round: `1 turn`
into `deg` is `≈ 360 deg`. The `≈` costs no digits: the file is
evaluated at the ceiling, so an inexact unit is known to more digits
than any pass asks for, and the digits shown are certified as for any
inexact value ([Units](definitions.md#units),
[Digits you can trust](numbers.md#digits-you-can-trust)).

### The measured factors

Three factors are measured values, carried to the digits the file
gives and read exactly: the dalton, `Da`, `1.66053906660e-27 kg`, the
CODATA 2018 value; the tropical year, `365.24219 day`; and the
sidereal year, `365.256363004 day`. A conversion through one of these
factors is exact in the arithmetic, and the relation is `=` where
every digit is shown, as any exact value's is. Every other factor is a defined
factor, fixed by a document or a convention, the five defining
constants and `gravity` among them
([Constants and extras](#constants-and-extras)).

### The sources

A document fixes these factors:

- The SI brochure, 9th edition, the 2019 SI, fixes the SI units and
  prefixes, the prefixes of 2022 included, and the five defining
  constants.
- NIST Handbook 44 fixes the US customary units, and the 1959
  agreement on the yard and the pound fixes the inch, the foot, the
  yard, the mile and the pound.
- The Weights and Measures Act 1985 fixes the UK imperial units.
- The Mendenhall Order of 1893 fixes the survey foot.
- IAU 2012 fixes the astronomical unit.
- CODATA 2018 gives the dalton.
- IEC 80000-13 fixes the binary prefixes.
- The International Table fixes `Btu` and `cal_IT`.

`gravity`, `mmHg` and `mmH2O` carry the values convention gives them.
The other factors are the definitions in common use, such as the torr
as an atmosphere over 760 and the thermochemical calorie as
`4.184 J`.

| You type         | Into     | Exucal shows            | Note                                        |
| ---------------- | -------- | ----------------------- | ------------------------------------------- |
| `1 yd`           | `m`      | `= 0.9144 m`            | a defined factor                            |
| `1 Btu`          | `J`      | `≈ 1055.0559 J`         | a defined factor, the International Table's |
| `1 au`           | `km`     | `≈ 1.4959787e+8 km`     | a defined factor, IAU 2012's                |
| `1 Da`           | `kg`     | `≈ 1.6605391e-27 kg`    | a measured factor, cut to eight digits      |
| `1 siderealyear` | `s`      | `≈ 31558150 s`          | a measured factor                           |
| `1 arcsec`       | `radian` | `≈ 4.8481368e-6 radian` | inexact through `pi()`                      |
| `g0`             | `ft/s^2` | `≈ 32.174049 ft / s^2`  | exact by convention                         |
| `1 inHg`         | `Pa`     | `≈ 3386.3886 Pa`        | the conventional value                      |

## Names that are absent or mean something else

- `u`, the dalton's symbol, and `at`, the technical atmosphere's, are
  not defined. `au` is a unit, and `d-` and `da-` are both prefixes.
  A unit `u` would then make `dau` read as both `d` + `au` and
  `da` + `u`, and a name that reads two ways is an error when the
  file loads ([Names](definitions.md#names)). A unit's own name wins
  over a split, so `at` itself would be read whole; the clash is in
  `dat`, which would read as both `d` + `at` and `da` + `t`. Write
  `Da` (or `dalton`, `amu`, `atomicmassunit`) and
  `technicalatmosphere`. Typed anyway, `u` is an unknown unit, since
  `u-` is only the prefix micro, and `at` reads as `a` + `t`, an
  attotonne: `1 at` into `kg` is `= 1e-15 kg`.
- `dB` is `d` + `B`, a tenth of a byte, since a prefix and a unit
  spell it and a function's name may not read as a prefix followed by
  a unit ([Names](definitions.md#names)). The decibel is the function
  `decibel`.
- `e` is the elementary charge
  ([Constants and extras](#constants-and-extras)). Euler's number is
  `exp(1)`.
- `rad` is the radian. The absorbed-dose rad is not defined, and the
  gray, `Gy`, is the unit of absorbed dose.
- `g` is the gram. The standard acceleration of gravity is `gravity`
  or `g0`.
- `c` is the speed of light, `d` is the day, `h` is the hour and `m`
  is the meter. Each is a prefix as well, and a prefix is read only
  in front of a unit, so the name alone is the unit. The Planck
  constant is `planck`, not `h`.
- `C` is the coulomb and `F` is the farad, not the degree Celsius and
  the degree Fahrenheit, which are `degC` and `degF`
  ([Temperature: differences and readings](#temperature-differences-and-readings)).

| You type     | Into  | Exucal shows                                              | Note                               |
| ------------ | ----- | --------------------------------------------------------- | ---------------------------------- |
| `1 u`        |       | an error, an unknown unit: `u`                            | the dalton is `Da`                 |
| `1 um`       | `m`   | `= 1e-6 m`                                                | `u-` is the prefix micro           |
| `1 at`       | `kg`  | `= 1e-15 kg`                                              | `a` + `t`, an attotonne            |
| `1 at`       | `Pa`  | an error, a dimension mismatch: `kg` against `kg / m s^2` | not the technical atmosphere       |
| `1 dB`       |       | `= 0.8 bit`                                               | `d` + `B`                          |
| `decibel(1)` |       | `≈ 1.2589254`                                             | the decibel; inexact               |
| `exp(1)`     |       | `≈ 2.7182818`                                             | Euler's number; inexact            |
| `1 rad`      | `deg` | `≈ 57.29578 deg`                                          | the radian; inexact: `deg`         |
| `1 h`        | `s`   | `= 3600 s`                                                | the hour                           |
| `planck`     |       | `≈ 6.6260702e-34 m^2 kg / s`                              | the Planck constant                |
| `1 g`        |       | `= 0.001 kg`                                              | the gram                           |
| `g0`         |       | `= 9.80665 m / s^2`                                       | the standard acceleration          |
| `1 C`        |       | `= 1 s A`                                                 | the coulomb, not a degree Celsius  |
| `1 F`        |       | `= 1 s^4 A^2 / m^2 kg`                                    | the farad, not a degree Fahrenheit |
