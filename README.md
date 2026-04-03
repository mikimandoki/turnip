# Turnip

A habit tracker built with React, Vite, and Capacitor.

## Development

```bash
pnpm install
pnpm dev          # local web dev server
pnpm test         # run tests
pnpm build        # typecheck + test + production build
```

## Android

### Prerequisites

- Android Studio with an SDK installed
- A device connected via USB with USB debugging enabled, or an emulator running

### Scripts

| Command             | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `pnpm android`      | Dev JS bundle → installs **Turnip QA** on device |
| `pnpm android:prod` | Prod JS bundle → installs **Turnip** on device   |

Both apps can be installed simultaneously — they have different package IDs so they don't overwrite each other and have completely separate data stores. This makes it easy to keep a stable personal install alongside a build you're actively changing.

### How it works

Two Gradle product flavors are defined in `android/app/build.gradle`:

| Flavor | Package ID             | App name  | JS bundle                              |
| ------ | ---------------------- | --------- | -------------------------------------- |
| `qa`   | `com.getturnip.app.qa` | Turnip QA | development (unminified)               |
| `prod` | `com.getturnip.app`    | Turnip    | production (minified, tests must pass) |

Both flavors use the **debug** build type so no signing keystore is needed. The scripts call `./gradlew installQaDebug` and `./gradlew installProdDebug` directly, bypassing `cap run android` which always defaults to debug without flavor support.

The QA app name comes from a string resource overlay at `android/app/src/qa/res/values/strings.xml`, which Android merges over the base `strings.xml` for that flavor.

# Web

`jeep-sqlite` requires the `sql-wasm.wasm` binary in `public/assets/` to run the SQLite engine in the browser.

It is necessary to use `pnpm` overrides to pin `sql.js` to the version expected by `jeep-sqlite` (currently **1.11.0**) to avoid `LinkError` instantiation failures.
