# Exucal

Exucal is a calculator that runs in the browser. It guarantees that a
result is exact wherever it can be, for arithmetic and functions
alike. Where it shows fewer digits than a result has, every digit
shown is certified and the last is correctly rounded. Where it cannot
certify as many digits as you ask for, it still shows them, with a
note saying how many are certified. It offers the elementary functions
and some special functions. It keeps track of units through every
calculation and conversion, so that a mismatch of units is an error
and never a number.

The user's documentation is in [`docs/`](docs/README.md), starting
with a tour by example. The developer's documentation is in
[`devdocs/`](devdocs/README.md), including how to build, run and test
the app.
