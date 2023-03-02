
# diotima

Agenda management for the W3C Board of Directors.

> and turning rather towards the main ocean of the beautiful may by contemplation of this bring forth in all their
> splendor many fair fruits of discourse and meditation in a plenteous crop of philosophy; until with the strength
> and increase there acquired he descries a certain single knowledge connected with a beauty which has yet to be told.
> — *Diotima*, cited in *Symposium*, Plato

## Installation

Clone the repo and `npm install -g`.

## Usage

Before you use it, it needs to be set up with the right secrets. Diotima uses your platform's keychain system to
securely store and retrieve your secrets.

First, create a GitHub token with an account that has access to the BoD's org on GitHub, then:

```
diotima token YOUR_TOKEN
```

Second, get your W3C calendar URL (from an account that is invited to BoD events) and make sure to exclude cancelled
events, then:

```
diotima calendar CALENDAR_URL
```

You only need to do that once; afterwards you can generate an agenda any time with:

```
diotima agenda > path/to/agenda.md
```
