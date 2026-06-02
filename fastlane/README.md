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

Sync all certs + profiles from the match repo. Run once when setting up a new machine or when a cert expires.

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build .ipa and upload to TestFlight (internal testing)

### ios production

```sh
[bundle exec] fastlane ios production
```

Submit build to App Store for review. Run after QA has approved the build on TestFlight.

### ios adhoc

```sh
[bundle exec] fastlane ios adhoc
```

Build .ipa for ad-hoc distribution via Diawi or Firebase Distribution

### ios build_only

```sh
[bundle exec] fastlane ios build_only
```

Build .ipa only (no upload) — verify build config

### ios bump_version

```sh
[bundle exec] fastlane ios bump_version
```

Increment version number. Param: type (major|minor|patch). Example: bundle exec fastlane ios bump_version type:minor

### ios refresh_profile

```sh
[bundle exec] fastlane ios refresh_profile
```

Refresh provisioning profile after adding a new device. Does not revoke the cert.

### ios register_new_device

```sh
[bundle exec] fastlane ios register_new_device
```

Register a new device in Apple Portal then refresh the development profile

----


## Android

### android beta

```sh
[bundle exec] fastlane android beta
```

Build .aab and upload to Google Play Internal Testing

### android firebase_beta

```sh
[bundle exec] fastlane android firebase_beta
```

Build APK + AAB → upload to Firebase App Distribution (non-production environments)

### android production

```sh
[bundle exec] fastlane android production
```

Promote build from Internal Testing to Production with staged rollout

### android build_only

```sh
[bundle exec] fastlane android build_only
```

Build .aab only (no upload) — verify build + signing config

### android bump_version

```sh
[bundle exec] fastlane android bump_version
```

Update versionName in build.gradle. Example: bundle exec fastlane android bump_version version:2.1.0

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
