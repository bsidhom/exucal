# The app

Exucal runs in the browser. It is a web page, and the browser is the one
platform it is built for, so that the same app runs on a phone, a tablet
or a desktop. A browser that installs web apps puts it on the home
screen or the desktop, without an app store, and once the page has
loaded it works without a network connection in any browser with service
workers ([Offline use](#offline-use) says what those are).
[The expression language](expressions.md) says what to type into the
two fields: the **have**, labeled "You have", holds an expression, and
the **want**, labeled "You want", holds what to measure it in.
[Numbers](numbers.md) says what a result means, and
[Settings](settings.md) says what each setting does.

As a web page, the app behaves as follows:

- **Installing.** Exucal installs like an app and opens in a window of
  its own; the installed app is the same page ([Installing](#installing)).
- **Offline use.** The browser keeps a copy of the whole app on the
  device and serves the app from it. Nothing you type leaves the device
  ([Offline use](#offline-use)).
- **Updates and the build ID.** The footer names the running version by
  its build ID, and a new version waits as a link there until you
  follow it ([Updates and the build ID](#updates-and-the-build-id)).
- **The settings panel.** A cog in the page's corner opens the panel
  with the result still in view, and every change applies as it is made
  ([The settings panel](#the-settings-panel)).
- **Copying a result.** The copy button writes the result as text that
  pastes back into the have field ([Copying a result](#copying-a-result)).
- **The two fields.** The fields read an expression each, with the
  browser's typing aids off, and an error marks the field at fault
  ([The two fields](#the-two-fields)).

## Installing

Exucal is a progressive web app (PWA): a web page that a browser can
install to the home screen or the desktop. Installed, it opens in a
window of its own, under its own name and icon and without the
browser's bars. Each browser offers the install in its own way, such as
a button in the address bar or an entry in its menu. Installing changes
nothing in the app: the installed app is the same page, served from the
same copy where the browser keeps one ([Offline use](#offline-use)).

## Offline use

### The copy the browser keeps

A **service worker** lets the app work offline. It is a script the
browser runs beside the page: on the first load it makes a copy of the
whole app, and from then on it serves the app from that copy. The copy
holds the page, its scripts and styles, and the file of unit
definitions, so the app loads from the device, installed or not, with
or without a network connection. A browser without service workers
runs the app but keeps no copy, and so does a browser whose service
worker cannot be started. In both the app works online only. The
footer, the line at the foot of the page, reports each of these states
([Updates and the build ID](#updates-and-the-build-id) lists its
words).

### Loading the unit definitions

Until the unit definitions have loaded, from the network or from the
copy, the page shows "Loading units…" in place of the fields. When they
cannot be loaded, the page says so in place of the fields. If the file
cannot be fetched, it asks you to check your connection and try again.
If the file was fetched but is faulty, it says that the fault is a bug
in the app, not in what you typed. A "Retry" button loads them again.
The app never retries on its own: you decide when, since you know when
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

The footer names the running version and, beside it, shows one status:
a word or two on what the service worker is doing, or a link when there
is something for you to do. A new version of the app arrives through
the service worker, which fetches it in the background and offers it in
the footer.

### The build ID

The footer shows "Build" and the **build ID**: the first twelve
characters of the hash of the commit the app was built from. The whole
hash is the tooltip. A build from uncommitted changes carries "-dirty"
after the twelve characters. The build ID says which version a device
is running, so that a bug report can name the commit.

### Checking for a new version

The app checks for a new version on its own:

- whenever the page comes back into view;
- whenever the page, while in view, comes back online;
- about once an hour while the page stays in view.

You can also check at once by tapping the build ID. It is a button when
there is a service worker to check with, and plain text when there is
none, in the two browsers [Offline use](#offline-use) names. After a
tap, the footer reports the check and then its outcome, in the words
the table below lists. A check the app makes on its own shows nothing
unless it finds a new version, which the footer then reports in the
same words.

### Switching to a new version

A new version never interrupts. The running version stays until you
follow the "update to …" link, which names the new version's build ID.
Every open tab or window of the app shows the link. The footer asks the
new version for its build ID; a version that does not answer, as an old
one may not, is offered as "update" alone. Following the link switches
to the new version, which is already on the device, so the switch costs
no download. Every open tab or window of the app then reloads onto the
new version.

### Every word the footer can show

| The footer says                  | It means                                                                                                                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "caching…"                       | The first load: the service worker is making its copy of the app.                                                                                                                                                                       |
| "no offline"                     | The browser has no service workers, so the app keeps no copy and does not work offline.                                                                                                                                                 |
| "worker failed"                  | The service worker cannot be started; the app works online.                                                                                                                                                                             |
| "checking…"                      | The check you asked for is under way.                                                                                                                                                                                                   |
| "up to date"                     | The check found no new version.                                                                                                                                                                                                         |
| "couldn't check (offline?)"      | The check could not reach the host.                                                                                                                                                                                                     |
| "downloading…"                   | A new version is being fetched.                                                                                                                                                                                                         |
| "update to …", or "update" alone | A new version is ready, and the "…" is its build ID; the link switches to it.                                                                                                                                                           |
| "updating…"                      | The switch is under way, and the page is about to reload.                                                                                                                                                                               |
| "bypassed · reload"              | The page came from the network, past the copy, as a hard reload does, so the service worker is not serving it. The "reload" link reloads the page through the copy, so that the service worker serves it again, as on every other load. |
| "worker … · reload"              | The "…" is the build ID of the service worker serving the page, which differs from the page's own, a state the app does not expect. The "reload" link reloads the page from that worker's copy, so that the two agree.                  |

## The settings panel

The **cog** in the top right corner of the page opens the
**settings panel**, with the result still in view, so that the result
shows what a setting does as you change it. On a phone the panel slides
up over the lower part of the screen. You drag or tap the handle at its
top edge to switch it between two heights, and the settings scroll
inside it. On a wider screen the panel stands along the right edge, and
the page's content moves aside to make room for it. The panel's "Done"
button, the Escape key or the cog closes it, and focus returns to the
cog.

Every change applies as it is made. A choice or a button applies at
once; a number you type applies when you press Enter or leave the
field. On a phone's keyboard the Enter key is labeled Done; it applies
the number and leaves the panel open. The
[display digits](settings.md#display-digits), the
[extended count](settings.md#working-digits-and-the-extended-count) and
the [ratio width](settings.md#notation-and-ratio-width) also have "−"
and "+" buttons beside them, which step the value by one. The
"default …" link beside a setting that is not at its default restores
that setting's default, and "Reset all settings" at the panel's foot
restores every default
([Defaults and resets](settings.md#defaults-and-resets)). "About these
settings", beside "Reset all settings", opens [Settings](settings.md).

## Copying a result

The app answers in the output area under the fields with one or two
output lines: your expression with its result, and for a conversion the
reciprocal line, the same conversion in the opposite direction
([How a conversion is answered](quantities.md#how-a-conversion-is-answered)).
A copy button sits at the end of each line. It copies the right-hand
side of its line, after the `=` or `≈`, to the clipboard. The text is
the line's, except that `*` stands for the screen's `×`, which the
fields do not accept. So the text pastes back into the have field as
the quantity shown, the rule
[How numbers are written](numbers.md#how-numbers-are-written) states
for every result. The text carries the digits shown and no more, so
that what pastes back is what you saw: an exact value rounded to the
display digits pastes back as those digits, and under the
[ratio notation](settings.md#notation-and-ratio-width) it pastes back
as the ratio. The button's icon becomes a check mark for a moment once
the text is on the clipboard, or a red cross when the clipboard cannot
be written, and a screen reader hears "Copied" or "Couldn't copy".

| You have  | You want | The output line           | The copy button writes | Note                                |
| --------- | -------- | ------------------------- | ---------------------- | ----------------------------------- |
| `3 ft`    | `in`     | `3 ft = 36 in`            | `36 in`                |                                     |
| `3 ft`    | `in`     | `in ≈ 0.027777778 × 3 ft` | `0.027777778 * 3 ft`   | the reciprocal line                 |
| `3 ft`    | `in`     | `in = 1/36 × 3 ft`        | `1/36 * 3 ft`          | the reciprocal line, ratio notation |
| `1/3`     |          | `1/3 ≈ 0.33333333`        | `0.33333333`           | the digits shown, and no more       |
| `1/3`     |          | `1/3 = 1/3`               | `1/3`                  | ratio notation                      |
| `sqrt(2)` |          | `sqrt(2) ≈ 1.4142136`     | `1.4142136`            |                                     |

## The two fields

[The have field](expressions.md#the-have-field) and
[The want field](expressions.md#the-want-field) say what each field
accepts: an expression in the have, and in the want what to measure it
in, such as a unit or a unit list. The result follows as you type, with
no key to press. While the have is blank, nothing is computed, and the
output area shows a hint that says what to type into each field, with
examples.

The fields turn off the browser's autocomplete, autocorrect,
autocapitalization and spell-checking, and they keep what you type out
of the browser's form history: an expression is neither a word nor a
sentence, and a suggestion gets in its way.

An error marks the field at fault and writes a message in the output
area, which a screen reader also hears. The app evaluates the have
completely before it reads the want, so while the have has an error
only the have is marked, whatever the want holds
([The have field](expressions.md#the-have-field)). A mismatch is a want
that cannot measure the have, as `s` cannot measure `1 m`. It is about
the pair and marks neither field. In every case the message quotes the
text at fault, both sides for a mismatch
([Evaluation order and error locations](expressions.md#evaluation-order-and-error-locations)).

| You have | You want | The field marked | Note                         |
| -------- | -------- | ---------------- | ---------------------------- |
| `bogus`  | `ft;`    | the have         | only the have is marked      |
| `1 m`    | `bogus`  | the want         |                              |
| `1 m`    | `ft;`    | the want         | a `;` with no item after it  |
| `1 m`    | `s`      | neither          | a mismatch is about the pair |
