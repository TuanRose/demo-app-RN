fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios sync_certs

```sh
[bundle exec] fastlane ios sync_certs
```

Sync cert + profile từ match repo (chạy 1 lần khi setup máy mới hoặc cert hết hạn)

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build và upload lên TestFlight

### ios build_only

```sh
[bundle exec] fastlane ios build_only
```

Chỉ build .ipa, không upload

----


## Android

### android beta

```sh
[bundle exec] fastlane android beta
```

Build AAB và upload lên Google Play Internal Testing

### android build_only

```sh
[bundle exec] fastlane android build_only
```

Chỉ build AAB, không upload

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
