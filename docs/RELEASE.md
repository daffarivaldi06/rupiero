# Building a Rupiero release for the phone

How to install Rupiero as an everyday app (no Metro, no sample data) and update it later **without losing data**.

## What to know first

- **The data lives only on the phone**, in the app's database. It is lost if the app is uninstalled or its data is cleared ("Clear data" in Android Settings).
  So before any risky step: Settings → Data → **Export backup (JSON)**, and keep it in Drive/Files.
- **The signing key** lives outside the repository, e.g. in `~/.rupiero/rupiero-release.jks`. Its passwords are kept in a password manager
  and in `~/.gradle/gradle.properties` (`RUPIERO_UPLOAD_*`). Android only installs an update over an app signed with the **same** key.
  Keep a copy of the `.jks` file and its passwords off the laptop (password manager + personal cloud).
  If the key is lost, a new version can only be installed after uninstalling (data lost, unless restored from a backup).
- A release build has **no** sample data and does **not** show the Developer tools (database reset).

## Building the release APK

From the project folder, in Git Bash:

```bash
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The result: `android/app/build/outputs/apk/release/app-release.apk` (±35 MB). `arm64-v8a` is enough for modern Android phones;
add `,x86_64` to install it on an emulator as well.

Check that the APK is signed with the Rupiero key (the SHA-256 must be `5B:1C:BF:A1:…:15:55:53`):

```bash
"$LOCALAPPDATA/Android/Sdk/build-tools/"*/apksigner.bat verify --print-certs app/build/outputs/apk/release/app-release.apk
```

## First installation

The debug build currently on the phone is signed with the debug key, so the release build **cannot** be installed over it.
The debug build has to be uninstalled first, and that **deletes the data on the phone** (currently test data).

1. If there is data on the phone worth keeping: Settings → Data → Export backup (JSON).
2. Uninstall Rupiero from the phone (long-press the icon → Uninstall), or `adb uninstall com.daffarivaldi.budgetapp`.
3. Install the release:
   - By cable: `adb install android/app/build/outputs/apk/release/app-release.apk`, or
   - Without a cable: send the APK to the phone (Drive, Quick Share), open the file and allow "Install unknown apps" for that app.
4. Open Rupiero. A new, empty database is created with two default accounts. If needed: Settings → Data → Restore from backup.
5. Add the widget again (the old one is removed with the uninstall).

## Updating to a new version (data kept)

1. **Back up first**: Settings → Data → Export backup (JSON). This is a safety net; updating does not delete data.
2. Raise the version in `app.json`: `"version"` (e.g. `1.1.0`) and **`android.versionCode` +1** (e.g. `1` → `2`).
   Android refuses a versionCode lower than the installed one.
3. Build the release APK as above (the same key is picked up automatically from `gradle.properties`).
4. Install it **over** the old version; do not uninstall:
   - `adb install -r android/app/build/outputs/apk/release/app-release.apk`, or
   - open the APK on the phone → Android shows **"Update"** (not "Install"). If it reports a package or signature conflict, **stop**:
     the key is different. Do not uninstall; check the key first.
5. Open the app. If the new version changes the schema, the database migration runs once, automatically, on opening (`PRAGMA user_version`),
   without deleting data.

## Version history

| Version | versionCode | Contents |
|---|---|---|
| 1.0.0 | 1 | Phases 0–4 |
| 1.0.1 | 2 | Phase 5: Indonesian/English UI, theme setting, accessibility, inline validation, toasts + undo. No schema change (still v3). **Do not use:** forms stay cut off after the keyboard closes |
| 1.0.2 | 3 | Keyboard handling in forms fixed (Android 15+ edge-to-edge). No schema change |

## Never

- Uninstall the app or clear its data without a recent backup.
- Change `android.package` (`com.daffarivaldi.budgetapp`) in `app.json`: Android treats it as a different app and the data does not carry over.
- Create a new key or delete `rupiero-release.jks`.
- Install a debug build over the release (different key; it will be refused).
