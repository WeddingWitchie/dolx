# APK save recovery

## Where to put the files and install them

**You can extract the ZIP directly into your existing `apkbuilder` folder.** For example:

```text
C:\DoLX APK\Main build\Aoki_Utage\DOLPX_1.13.2\DEVTOOLAPKBUILDER for DoL\apkbuilder
```

Only these two items are needed for installation, `install-save-backup` and `cordova-plugin-dol-save-backup`. Put them beside the builder:

```text
apkbuilder/
    config.xml
    package.json
    cordova-plugin-dol-save-backup/
    install-save-backup.ps1
```

1. Open PowerShell in that `apkbuilder` folder.
2. Run this command:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\install-save-backup.ps1" -BuilderPath "."
   ```

3. Build normally using the updated game HTML containing the matching `DoLSaveGuard` integration (should be there in ver 0.22.4). Installing the plugin alone does not enable recovery in older HTML.

**Copying the files alone does not install the plugin.** The command registers it with Cordova and keeps a copy in the builder's directory. Existing builder dependencies and the Android platform must already be installed. Repeat installation for each variant (goose, mikili, etc); rerun it when updating the plugin.

## What it does

This plugin keeps up to three recent recovery snapshots in Android's private app files, separately from WebView's IndexedDB, localStorage, and cache. If WebView storage disappears, these files can still be loaded from the game's Saves menu. No Android storage permission or player setting is required.

## How players use it

1. Export a save file before updating. Install the updated APK over the existing app when supported; keep exported files outside the app.
2. Play a regular non-Ironman game and save to a slot as usual. A recovery copy is requested automatically. Autosaves also request copies, at most once every ten minutes. There is no separate enable button.
3. Open **Saves** and look for the **APK recovery backups** entries. Each entry shows the save name, game day, and time. Wait for a pending write to finish and reopen Saves if a just-created copy is not listed yet.
4. If normal slots disappear, open **Saves**, find the last good recovery entry, and select **Restore APK backup**. Confirm to replace the currently running game, including any unsaved progress. Cancel leaves your current game unchanged. If the newest copy fails, try an older one.
5. After recovery, save normally to create a slot again and export a separate file. Recovery loads one snapshot; it does not recreate the entire missing slot list.

If saves disappear, check recovery before making more saves: new copies eventually replace older ones. The three copies are shared by the app installation, not three copies per character or per slot. Deleting a normal slot leaves recovery copies intact. Clearing app data or uninstalling deletes the native backups too.

References: [Cordova Android plugins](https://cordova.apache.org/docs/en/latest/guide/platforms/android/plugin.html) and [Android AtomicFile](https://developer.android.com/reference/android/util/AtomicFile).
