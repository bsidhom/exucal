# The app

Exucal runs in the browser. It is a web page, so the same app runs on a
phone, a tablet or a computer, installs to the home screen or the
desktop, and works without a network connection once it has loaded.
Six things are specific to the web page: [installing](#installing),
[offline use](#offline-use),
[updates and the build ID](#updates-and-the-build-id),
[the settings panel](#the-settings-panel),
[copying a result](#copying-a-result) and
[the two fields](#the-two-fields).
[The expression language](expressions.md) says what to type into the
fields, [Numbers](numbers.md) says what a result means, and
[Settings](settings.md) says what each setting does.

## Installing

Exucal is a progressive web app (PWA): a browser that installs web apps
can put it on the home screen or the desktop, where it opens in a
window of its own. Nothing comes from an app store, and none of the
app's own behavior changes when it is installed.

## Offline use

The app works offline once it has loaded, installed or not, in any
browser with service workers. In a browser without them, it works
online only.

The app loads its units from a file. If the file cannot be loaded, the
page says so in place of the fields and offers to try again. The app
never retries on its own.

Nothing you type leaves the device. The app calls no third-party
service. It contacts only the host it was loaded from, to load its own
files and to check for and fetch a new version. The developer docs'
[Security](../devdocs/security.md#the-page) page states these rules.

## Updates and the build ID

The footer shows the build ID of the running version. Clicking it
checks for a new version. The app also checks on its own, fetches a new
version in the background, and offers it in the footer as a link. A new
version never interrupts: the running version stays until you follow
the link, and the app then reloads as the new version.

## The settings panel

The cog in the top right corner opens the settings panel, with the
result still in view so that you see what a setting does as you change
it. Every change applies at once. You close the panel with its own
button, with the Escape key or with the cog.

## Copying a result

The app answers with one or two output lines: your expression with its
result and, for a conversion, the same conversion in the opposite
direction. A copy button at the end of each line copies the part after
the `=` or `≈` as the line shows it, with `*` in place of the screen's
`×` and without any digit the line does not show, so that it pastes
back as input. The button's icon shows for a moment whether the copy
succeeded.

| You have | You want | The output line           | The copy button writes |
| -------- | -------- | ------------------------- | ---------------------- |
| `3 ft`   | `in`     | `3 ft = 36 in`            | `36 in`                |
| `3 ft`   | `in`     | `in ≈ 0.027777778 × 3 ft` | `0.027777778 * 3 ft`   |

## The two fields

The fields are labeled "You have" and "You want": the **have** holds an
expression, and the **want** holds what to measure it in. The result
follows as you type. While the have is blank, the output area shows a
hint on what to type. The fields turn off the browser's autocomplete,
autocorrect and spell-checking, since an expression is not a word. An
error marks the field at fault and names the text at fault. When the
want cannot measure the have, the error names both and marks neither
field.
