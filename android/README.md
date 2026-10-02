# Aviator's Regiment Android app

The app is a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity):
it opens the live website (`https://aviators-regiment.vercel.app`) full screen, without a
browser bar, using the phone's Chrome. Everything the website does (booking, payments,
tracking, the admin panel) works in the app, and every website deploy updates the app
at the same time. Only app-level changes (name, icon, colours, domain) need a new app release.

| | |
|---|---|
| Package name | `com.aviatorsregiment.app` (permanent once published on Google Play) |
| Name / home-screen label | Aviator's Regiment / Aviator's |
| Minimum Android | 6.0 (API 23); target API 36 |
| Shortcuts (long-press the icon) | Rent CX-3 (`/rent-cx3`), Track booking (`/track`) |
| Signing | Upload key outside the repository (see below) |

## Building

Requirements: Android SDK (platform 36, build-tools 36) and JDK 17+ (Android Studio's bundled
`jbr` works).

1. `local.properties` (not committed) must contain:
   ```
   sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
   signing.properties=C\:\\path\\to\\keystore.properties
   ```
   `keystore.properties` holds `storeFile`, `storePassword`, `keyAlias` and `keyPassword`.
   Without it, the release build is produced unsigned.
2. Build (from this folder):
   ```
   set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
   gradlew assembleRelease bundleRelease
   ```
3. Outputs:
   - `app/build/outputs/apk/release/app-release.apk`: installs directly on a phone (testing).
   - `app/build/outputs/bundle/release/app-release.aab`: the file uploaded to Google Play.

For each new release, increase `versionCode` (and usually `versionName`) in `app/build.gradle`.

## Direct download (outside Google Play)

The latest APK is offered at `https://aviators-regiment.vercel.app/downloads/aviators-regiment.apk`.
To update it, copy the new `app-release.apk` to `public/downloads/aviators-regiment.apk` and run
`vercel deploy --prod` from the project root. APKs are git-ignored, so the file only exists on the
machine that deploys.

A phone that installed this APK can't take the Google Play version as an update, because Play
signs with Google's key. Uninstall the downloaded copy first.

## Signing key

The upload key lives outside the repository, in
`Aviator_Regiment-android-signing/` next to the project folder
(`aviators-regiment-upload.jks` and `keystore.properties`). **Back that folder up somewhere
private.** The repository is public, so `*.jks`, `*.keystore` and `keystore.properties` are
git-ignored.

Its SHA-256 fingerprint is
`E9:CF:32:F1:58:AC:E5:8F:E3:01:9A:B7:79:0D:7C:F0:F3:DE:4F:75:00:13:91:B1:68:DF:24:4C:1A:BC:25:2B`.

## Linking the app and the website (Digital Asset Links)

The website serves `public/.well-known/assetlinks.json`, which lists the package name and the
signing certificate fingerprints. If the link fails, the app still works but shows a browser
address bar. Check it with:

```
https://digitalassetlinks.googleapis.com/v1/assetlinks:check?source.web.site=https://aviators-regiment.vercel.app&relation=delegate_permission/common.handle_all_urls&target.android_app.package_name=com.aviatorsregiment.app&target.android_app.certificate.sha256_fingerprint=<SHA-256>
```

**Google Play re-signs the app** with its own key (Play App Signing). After the first upload,
copy the "App signing key certificate" SHA-256 from Play Console → Test and release → App
integrity, and add it to `sha256_cert_fingerprints` in `assetlinks.json` (keep the upload-key
fingerprint too), then deploy the website.

## Changing the domain

The app is tied to one domain. When the site moves to a new domain:

1. Serve the same `assetlinks.json` on the new domain (it's part of the website, so it moves
   with it).
2. Change `hostName` in `app/build.gradle`, increase `versionCode`, build and publish an update.

Publishing to Google Play after the domain change avoids this extra release.
