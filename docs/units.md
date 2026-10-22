# Units

The definitions file `src/units.txt` ships with the app, which loads
it as it starts. It defines every unit, prefix and unit list the
calculator knows, and every function but the built-in ones, and it is
the source of truth: it lists every name, and a comment beside a
factor says where the factor comes from when that is not obvious. The
sections below follow the file's own grouping, by system and by
family, and name the units a reader is likely to look for; the file
holds the rest. Four lists are complete: the primitives, the unit
lists, the inexact units and the measured factors.
[Quantities](quantities.md) defines a unit, a prefix, a dimension, a
kind, a conversion and a unit list,
[The expression language](expressions.md) says how a typed name is
read, and [The definition language](definitions.md) says how a
definition is written. A unit named in prose is typed as its name in
one word, `fortnight` or `troyounce`, and a parenthesis after it gives
its further names, as `lb` and `lbm` after the pound; where the
one-word form is not the file's, the typed name comes first.

## The primitives

The file declares nine primitives: the seven SI base units, the meter
`m`, the kilogram `kg`, the second `s`, the ampere `A`, the kelvin
`K`, the mole `mol` and the candela `cd`; the radian, `radian`, as a
kind primitive, so that an angle is kept apart from a plain number;
and the bit, `bit`, as a dimension primitive.

Information is a dimension so that a count of bits does not collapse
into a plain number: if the bit were a plain number, a bit per second
would be a hertz. As a dimension, it keeps `bit/s` apart from `Hz`,
as the radian kind keeps `rad/s` apart from `Hz`.

## The SI

Most units are defined twice, by **symbol** and by **name**, the two
forms the SI gives them: `m` and `meter`.

- Base units: `m` (`meter`, `metre`), `kg` (`kilogram`), `s`
  (`second`), `A` (`ampere`), `K` (`kelvin`), `mol` (`mole`) and `cd`
  (`candela`), with the gram (`g`), the tonne (`t`, `metricton`) and
  the liter (`L`, `l`, `litre`) beside them.
- Prefixes: every SI prefix by name and by symbol, from `quetta-` and
  `Q-` (`1e30`) down to `quecto-` and `q-` (`1e-30`), the four of
  2022 (`quetta-`, `ronna-`, `ronto-`, `quecto-`) included. `deca-`
  is also written `deka-`, and micro is `µ-` (the micro sign), `μ-`
  (the Greek mu) or `u-`. The binary prefixes, `kibi-` to `yobi-` and
  `Ki-` to `Yi-`, powers of 1024, are defined beside them.
- Derived units with special names: all twenty-two, by symbol and by
  name: `Hz`, `N`, `Pa`, `J`, `W`, `C`, `V`, `F`, `Ω` (also `ohm`),
  `S` (also `mho`), `Wb`, `T`, `H`, `lm`, `lx`, `Bq`, `Gy`, `Sv`,
  `kat`, `rad` and `sr` (the radian, a primitive here, and the
  steradian) and `degC`, the degree Celsius as a temperature
  difference
  ([Temperature: differences and readings](#temperature-differences-and-readings)).
- Non-SI units accepted for use with the SI: `min`, `h` and `d`
  (`minute`, `hr`, `hour`, `day`); `deg`, `arcmin` and `arcsec`,
  inexact through `pi()`; `ha` (`hectare`) and `are`; the liter and
  the tonne; `au` (`AU`, `astronomicalunit`); `eV` (`electronvolt`);
  and `Da` (`dalton`, `amu`, `atomicmassunit`), whose symbol `u` is
  absent. The neper, the bel and the decibel are functions here
  ([Logarithmic levels](#logarithmic-levels)).

## US customary

The inch, the foot, the yard and the mile are the international ones
of the 1959 agreement on the yard and the pound (`in` is exactly
`2.54 cm`), shared with the imperial system, as are the avoirdupois
pound and ounce.

- Length: `in`, `ft`, `yd` and `mi` (`inch`, `foot`, `yard`, `mile`,
  `statutemile`); the mil (`thou`), the hand, the fathom, the chain,
  the link, the rod (`pole`, `perch`), the furlong and the league; the
  nautical mile (`nmi`, `nmile`), 1852 meters; the point, an inch over
  72, and the pica of 12 points.
- Survey measure: the survey foot (`surveyft`), exactly
  `1200 m / 3937`, and `surveyyard`, `surveymile`, `surveychain`,
  `surveylink`, `surveyrod`, `surveyfurlong`, `surveyacre`, `section`
  and `township`, built on it.
- Area: the acre of 4840 square yards and the acre-foot (`acrefoot`).
- Liquid measure: the gallon of 231 cubic inches (`gal`), the quart
  (`qt`), the pint (`pt`), the cup, the gill, the fluid ounce
  (`floz`, `fluidounce`), the tablespoon (`tbsp`), the teaspoon
  (`tsp`), the fluid dram (`fldram`, `fluiddram`) and the minim; the
  barrel (`bbl`) of 42 gallons and the hogshead of 63.
- Dry measure: the bushel of 2150.42 cubic inches (`bu`), the peck
  (`pk`), `drygallon`, `dryquart`, `drypint` and `drybarrel`; the cord
  and the board foot (`fbm`).
- Mass: avoirdupois, the pound (`lb`, `lbm`), exactly
  `0.45359237 kg`, the ounce (`oz`), the dram (`dr`, `drachm`), the
  grain (`gr`), the hundredweight of 100 pounds and the ton of 2000;
  troy, the troy ounce (`ozt`) of 480 grains, the troy pound (`lbt`)
  and the pennyweight (`dwt`); apothecaries', the scruple, `apdram`,
  `apounce` and `appound`.
- Force, pressure, energy and power: `lbf` (`poundforce`), `ozf`,
  `kip`, `tonforce`, the poundal (`pdl`) and the slug, a mass; `psi`,
  `psf` and `ksi`; `Btu` (`btu`, `BTU`), the International Table Btu,
  the therm and the quad; the horsepower (`hp`), the mechanical one,
  and `tonrefrigeration`.
- Speed and light: `mph`, `fps` and the knot (`kn`); the footcandle
  (`fc`).

## UK imperial

The imperial units are defined where they differ from the US ones.

- Capacity: `impgallon` (`impgal`), exactly `4.54609 L`, with
  `impquart`, `imppint`, `impgill`, `impfloz` (twenty to the pint),
  `impfldram` and `impminim`, and the multiples `imppeck` and
  `impbushel`. All but the fluid dram and the minim also have a name
  with `uk` in front, `ukgallon` and `ukpint` among them.
- Mass: the stone (`st`) of 14 pounds, the quarter of 28, the long
  hundredweight (`longhundredweight`, `imphundredweight`,
  `ukhundredweight`, `impcwt`) of 112 and the long ton (`longton`,
  `impton`, `ukton`) of 2240; the cental of 100 pounds. The pound,
  the ounce, the dram and the grain are the US ones.
- Area: the rood, a quarter of an acre.

## Naming conventions

- A further name whose body is another name alone is an **alias**, as
  `metricton` is of `tonne`. A **spelling** is an alias that differs
  by convention (`metre`, `litre`, `deka-`) or by script: the ASCII
  `ohm`, `angstrom` and `u-` for `Ω`, `Å` and `µ-` or `μ-`.
- Where the US and the UK give one name to different units, the plain
  name is the US unit and `imp` in front marks the imperial one, with
  a `uk` name for most: `gallon` and `impgallon`. The ton and the
  hundredweight come as short and long instead: `ton` (`shortton`,
  `uston`) and `longton`; `hundredweight` (`cwt`) and
  `longhundredweight`.
- Names are case-sensitive, and some differ only in case: `Gal`, the
  galileo, and `gal`, the gallon; `St`, the stokes, and `st`, the
  stone; `T`, the tesla, and `t`, the tonne; `S`, the siemens, and
  `s`, the second; `B`, the byte, and `b`, the bit.

## Constants and extras

Five of the SI's seven defining constants are defined as units, exact
as the SI fixes them: `c`, the speed of light; `e`, the elementary
charge; `planck`; `boltzmann`; and `avogadro` (`N_A`). The cesium
frequency and the luminous efficacy are left out. `gravity` (`g0`),
the standard acceleration of gravity, `9.80665 m / s^2`, is exact by
convention. Other definitions use them: the electronvolt is `e V`,
the kilogram-force is `kg gravity`, and the light year is
`c julianyear`. The circle constant is not a definition but the
built-in function `pi()` ([Constants](builtins.md#constants)), which
the file's bodies call where a unit needs it. The extras, the units
of none of the three systems, follow: the other metric and scientific
units, time beyond the day, information, and counts and ratios.

## Other metric and scientific units

- `Å` (`angstrom`), the micron, the fermi and `cc`, the cubic
  centimeter.
- CGS: the dyne (`dyn`), the erg, `Gal`, the galileo, the poise, the
  stokes (`St`), the gauss, the maxwell (`Mx`), the oersted (`Oe`),
  inexact through `pi()`, and the phot.
- Pressure: `bar`, the atmosphere (`atm`), the torr, `mmHg` (`cmHg`,
  `inHg`) and `mmH2O` (`cmH2O`, `inH2O`), the conventional
  millimeters of mercury and of water, and the technical atmosphere,
  whose symbol `at` is absent; with them the kilogram-force, `kgf`
  (`kilopond`, `kp`), and the gram-force, `gf`.
- Energy and power: the calorie (`cal`), the thermochemical one, and
  `cal_IT`, the International Table calorie; `Wh`, `Ah` and `tonTNT`;
  `metrichp` (`PS`), the metric horsepower; `kph` (`kmh`).
- Radiation: the curie (`Ci`), the rem and the roentgen. The
  absorbed-dose rad is not defined, since `rad` is the radian.
- The carat (`ct`) of 200 milligrams, the barn, the light year (`ly`)
  and the parsec (`pc`), inexact through `pi()`.

## Time beyond the day

The week (`wk`), the fortnight, the Julian year (`year`, `yr`,
`julianyear`) of 365.25 days, the tropical year (`tropicalyear`) and
the sidereal year (`siderealyear`), the month, a twelfth of the Julian
year, and the decade, the century and the millennium, in Julian years.
`year` is the Julian year, since the calendar year varies in length.

## Information

The byte (`B`) is eight bits, `b` is the bit, and `bps` is a bit per
second. The binary and the SI prefixes both apply: `KiB` is 1024
bytes, and `kB` is a thousand.

## Counts and ratios

`percent` (`1 / 100`), `permille` (`1 / 1000`), `ppm` (`1e-6`), `ppb`
(`1e-9`), `dozen` (`12`) and `gross` (`144`) are plain numbers:
`5 percent` is `0.05`, and a plain number converts into any of them.

## Angles and rotation

The degree (`deg`), the arcminute (`arcmin`) and the arcsecond
(`arcsec`); the grad (`gon`, `gradian`), a four-hundredth of a turn;
the turn (`rev`, `revolution`, `circle`); and `rpm` and `rps`, the
revolution per minute and per second. Every one is defined through
`pi()` (the degree is `pi() radian / 180`), so every one is inexact,
and a conversion among them or into radians is `≈`. The radian
(`rad`) and the steradian (`sr`, `radian^2`) are exact
([Which factors are exact](#which-factors-are-exact)).

## Temperature: differences and readings

`degC` (`celsius`), `degF` (`fahrenheit`) and `degR` (`rankine`) are
temperature differences: `1 degC` is `1 K`, and `1 degF` and `1 degR`
are five ninths of a kelvin. A reading is a call of `tempC` or
`tempF`, functions of a plain number with inverses: `tempC(x)` is
`x K + 273.15 K` for `x >= -273.15`, and `tempF(x)` is
`(x + 459.67) degF` for `x >= -459.67`. A kelvin or Rankine reading is
a difference from zero, `300 K` or `540 degR`, and needs no function.
[Temperature and logarithmic levels as functions](quantities.md#temperature-and-logarithmic-levels-as-functions)
says why a reading is a function.

## Logarithmic levels

`decibel`, `bel` and `neper` are functions of a plain number, the
level, and each gives the ratio the level denotes: `decibel(x)` is
`pow(10, x / 10)` and `bel(x)` is `pow(10, x)`, power ratios, and
`neper(x)` is `exp(x)`, an amplitude ratio. Their inverses are
`10 log10(y)`, `log10(y)` and `ln(y)`, so a ratio converts into a
level: `1000` into `decibel` is `decibel(30)`. `dB` is not the decibel
([Names that are absent or mean something else](#names-that-are-absent-or-mean-something-else)).

## Unit lists defined in the file

Fifteen lists, each typed by its name alone as the want; `time` and
`hms` have the same units. `dms` is the one inexact list, its units
being defined through `pi()`.

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

## Which factors are exact

Every factor is read exactly as written, so a conversion is exact
unless a unit on either side calls `pi()`
([Units, prefixes and exactness of factors](quantities.md#units-prefixes-and-exactness-of-factors)).

- The inexact units, a complete list: `deg`, `degree`, `arcmin`,
  `arcminute`, `arcsec`, `arcsecond`, `grad`, `gon`, `gradian`,
  `turn`, `rev`, `revolution`, `circle`, `rpm`, `rps`, `parsec`, `pc`,
  `oersted` and `Oe`, with the unit list `dms`. Every other unit is
  exact, the radian and the steradian among them.
- The measured factors, carried to the digits the file gives and read
  exactly: the dalton, `Da`, `1.66053906660e-27 kg` (CODATA 2018); the
  tropical year, `365.24219 day`; and the sidereal year,
  `365.256363004 day`. Every other factor is a defined one, fixed by a
  document or a convention.
- The documents: the SI brochure, 9th edition (the 2019 SI), for the
  SI units, prefixes and defining constants; NIST Handbook 44 for the
  US customary units, with the 1959 agreement on the yard and the
  pound for the inch, foot, yard, mile and pound; the Weights and
  Measures Act 1985 for the UK imperial units; the Mendenhall Order of
  1893 for the survey foot; IAU 2012 for the astronomical unit; CODATA
  2018 for the dalton; IEC 80000-13 for the binary prefixes; and the
  International Table for `Btu` and `cal_IT`. `gravity`, `mmHg` and
  `mmH2O` carry conventional values, and the other factors are the
  definitions in common use.

## Names that are absent or mean something else

- `u` (the dalton) and `at` (the technical atmosphere) are not
  defined: with `au` a unit and `d-` and `da-` prefixes, a unit `u`
  would make `dau` read as both `d` + `au` and `da` + `u`, an error
  when the file loads ([Names](definitions.md#names)), and a unit `at`
  would do the same in `dat`, against `t`. Write `Da` and
  `technicalatmosphere`. Typed anyway, `u` is an unknown unit, since
  `u-` is only the prefix micro, and `at` reads as `a` + `t`, an
  attotonne: `1 at` into `kg` is `= 1e-15 kg`.
- `dB` is `d` + `B`, a tenth of a byte (`1 dB` is `= 0.8 bit`); the
  decibel is the function `decibel`.
- `e` is the elementary charge; Euler's number is `exp(1)`.
- `rad` is the radian; the absorbed-dose rad is not defined, and the
  gray, `Gy`, is the unit of absorbed dose.
- `g` is the gram; the standard acceleration of gravity is `gravity`
  or `g0`.
- `c`, `d`, `h` and `m` are the speed of light, the day, the hour and
  the meter; each is a prefix as well, read as one only in front of a
  unit. The Planck constant is `planck`, not `h`.
- `C` and `F` are the coulomb and the farad; the degrees Celsius and
  Fahrenheit are `degC` and `degF`.
