# The app

Exucal runs in the browser. It is a web page, and the browser is the one
platform it is built for, so that the same app runs on a phone, a tablet
or a desktop. A browser that installs web apps puts it on the home
screen or the desktop. Once the page has loaded, a browser that can keep
a copy of it does so, and the copy works without a network connection.
[The expression language](expressions.md) says what to type into the
two fields: the **have**, labeled "You have", holds an expression, and
the **want**, labeled "You want", holds what to measure it in.
[Numbers](numbers.md) says what a result means, and
[Settings](settings.md) says what each setting does.

As a web page, the app behaves as follows:

- **Installing.** Exucal installs like an app and opens in a window of
  its own, with nothing changed in it ([Installing](#installing)).
- **Offline use.** A browser that can keep a copy of the whole app does
  so and serves the app from it. Nothing you type leaves the device
  ([Offline use](#offline-use)).
- **Updates and the build ID.** The footer names the running version by
  its build ID, and a new version waits there as a link until you
  follow it ([Updates and the build ID](#updates-and-the-build-id)).
- **The settings panel.** A cog in the page's corner opens the panel
  without hiding the result, and every change applies as it is made
  ([The settings panel](#the-settings-panel)).
- **Copying a result.** The copy button writes the result as text that
  pastes back into the have field ([Copying a result](#copying-a-result)).
- **The two fields.** The browser's autocomplete, autocorrect and
  spell-checking are off in both fields, and an error marks the field
  at fault ([The two fields](#the-two-fields)).

## Installing

Exucal is a progressive web app (PWA): a web page that a browser can
install to the home screen or the desktop, with nothing from an app
store. Installed, it opens in a window of its own, under its own name
and icon and without the browser's bars. Each browser offers the
install in its own way, such as a button in the address bar or an entry
in its menu. Installing changes nothing in the app: the installed app
is the same page, kept and served as [Offline use](#offline-use)
describes.

## Offline use

### The copy the browser keeps

A **service worker** lets the app work offline. It is a script the
browser runs beside the page: on the first load it makes a copy of the
whole app, and from then on it serves the app from that copy. The copy
holds the page, its scripts and styles, and the file of unit
definitions, so the app loads from the device, installed or not, with
or without a network connection. A browser without service workers
runs the app but keeps no copy, and a browser whose service worker
cannot be started runs the app but keeps no copy either. In both, the
app works online only. The **footer**, the line at the foot of the
page, says in a word or two whether the copy is being made or cannot be
kept.

### Loading the unit definitions

Until the unit definitions have loaded, from the network or from the
copy, the page shows a loading message in place of the fields. When
they cannot be loaded, the page says so in place of the fields. If the
file cannot be fetched, as on a first load without a connection, or at
any load without one in a browser that keeps no copy, it asks you to
check your connection and try again. If the file was fetched but is
faulty, it says that the fault is a bug in the app, not in what you
typed. A button beneath the message loads the definitions again. The
app never retries on its own: you decide when, since you know when
your connection is back.

### Privacy

Nothing you type leaves the device. The app calls no third-party
service. It contacts only the host it was loaded from, and only for its
own static files: to load them, and to check for and fetch a new
version, as [Updates and the build ID](#updates-and-the-build-id)
describes. It sends that host no local data, the settings it stores
included. The developer docs'
[Security](../devdocs/security.md#the-page) page states these rules and
where the code enforces them.

## Updates and the build ID

The footer also shows the **build ID**, a label for the running
version, to quote in a bug report, with nothing to read into it. Where
the browser keeps a copy, the build ID is a button: clicking or tapping
it checks for a new version at once, and the footer then says whether
one was found. The app also checks on a schedule of its own. A new
version arrives through the service worker, which fetches it in the
background and then offers it in the footer as a link. A new version
never interrupts: the running version stays, in every open tab or
window of the app, until you follow the link. Following it switches to
the new version, which is already on the device, so the switch costs no
download. Every open tab or window of the app then reloads, running the
new version. In a browser that keeps no copy there is nothing to
switch: every load fetches the current version from the network, and
the build ID is plain text.

## The settings panel

The **cog** in the top right corner of the page opens the
**settings panel** without hiding the result, so that the result shows
what a setting does as you change it. On a narrow screen, such as a
phone's, the panel rises over the lower part of the screen, and a
handle at its top edge makes it taller or shorter. On a wider screen
the panel stands along the right edge, and the page's content moves
aside to make room for it. Every change applies as it is made. The
panel closes from its own button, from the Escape key or from the cog,
and focus returns to the cog. The settings themselves are described on
the [Settings](settings.md) page.

## Copying a result

The app answers in the output area under the fields with one or two
output lines. The first writes your expression with its result. For a
conversion, a second line, the reciprocal line, writes the same
conversion in the opposite direction
([How a conversion is answered](quantities.md#how-a-conversion-is-answered)).
A copy button sits at the end of each line. It copies the right-hand
side of its line, after the `=` or `≈`, to the clipboard, so that you
can paste the result into the have field. The copied text matches the
characters shown, except that `*` stands for the screen's `×`, which
the fields do not accept.
[How numbers are written](numbers.md#how-numbers-are-written) states
the rule behind this: every result pastes back. The text carries the
digits shown and no more: an exact value rounded to the display digits
pastes back as those digits, and under the ratio notation it pastes
back as the ratio. For a moment after a copy, the button's icon shows
whether the text reached the clipboard, and a screen reader hears the
same.

| You have  | You want | The output line           | The copy button writes | Note                                |
| --------- | -------- | ------------------------- | ---------------------- | ----------------------------------- |
| `3 ft`    | `in`     | `3 ft = 36 in`            | `36 in`                |                                     |
| `3 ft`    | `in`     | `in ≈ 0.027777778 × 3 ft` | `0.027777778 * 3 ft`   | the reciprocal line                 |
| `3 ft`    | `in`     | `in = 1/36 × 3 ft`        | `1/36 * 3 ft`          | the reciprocal line, ratio notation |
| `1/3`     |          | `1/3 ≈ 0.33333333`        | `0.33333333`           | the digits shown, and no more       |
| `1/3`     |          | `1/3 = 1/3`               | `1/3`                  | ratio notation                      |
| `sqrt(2)` |          | `sqrt(2) ≈ 1.4142136`     | `1.4142136`            |                                     |

## The two fields

The want is most often a unit or a unit list.
[The have field](expressions.md#the-have-field) and
[The want field](expressions.md#the-want-field) list everything each
field accepts. The result follows as you type, with no key to press.
While the have is blank, nothing is computed, and the output area shows
a hint that says what to type into each field, with examples.

The fields turn off the browser's autocomplete, autocorrect,
autocapitalization and spell-checking, and they keep what you type out
of the browser's form history: an expression is neither a word nor a
sentence, and a suggestion gets in its way.

An error marks the field at fault and writes a message in the output
area, which a screen reader also hears. The app evaluates the have
completely before it reads the want, so while the have has an error
only the have is marked, whatever the want holds
([The have field](expressions.md#the-have-field)). A mismatch is a want
that cannot measure the have, as `s` cannot measure `1 m`
([Conformance](quantities.md#conformance)). It is about the pair and
marks neither field. In every case the message quotes the text at
fault, both sides for a mismatch
([Evaluation order and error locations](expressions.md#evaluation-order-and-error-locations)).

| You have | You want | The field marked | Note                                         |
| -------- | -------- | ---------------- | -------------------------------------------- |
| `1 m`    | `bogus`  | the want         |                                              |
| `1 m`    | `ft;`    | the want         | a `;` with no item after it                  |
| `bogus`  | `ft;`    | the have         | only the have, though the want is faulty too |
| `1 m`    | `s`      | neither          | a mismatch is about the pair                 |
