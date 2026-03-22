> **If the normal pipeline links above fail, use these backup downloads instead:**
> [Images](https://gitgud.io/Akoz/dol-xchange/-/archive/master/dol-xchange-master.zip?ref_type=heads&path=img) | [Audio](https://gitgud.io/Akoz/dol-xchange/-/archive/master/dol-xchange-master.zip?ref_type=heads&path=audio)

## Instructions:
  * Download DoLX_HTML.
  * Download DoLX_Images.
  * Download DoLX_Audio.
  * Extract all 3 downloaded packages into the same folder.
  * Run "Degrees of Lewdity VERSION.html".
  * Enjoy!

## Changelog
### New Features
* Added **Advanced Hair Dye** support based on **Dye Harder v0.22** by **Sasa ~La Creatura~** from the modloader mod thread.
* Added a **permanent in-heat / rut toggle**, letting players choose it directly instead of being forced into it through pill effects.
* Added new **minimaps** for:
  * **Forest**
  * **Moor**
  * **Smuggler Cave**
  * **Sea**
* Updated the **Tentacle Plains** and **Catacombs** minimaps to work better on **mobile**.
* Add the **HBSC Bank** feature from **Frostberg’s unfinished project** into a more complete system with:
  * account opening,
  * tier upgrades,
  * savings deposits and withdrawals,
  * fixed-term deposit handling,
  * early withdrawal options,
  * journal and stats interest notices,
  * and clearer rate / brochure alignment.

### Reworks and Improvements
* Reworked the **Gender Identity Meter**:
  * now reflects the overall identity direction of the player based on the **Identity system**,
  * averages identity topics through **preference, acceptance, rejection, and dysphoria**,
  * updates daily and drifts toward the current target,
  * and separates **Auto-Transformation** from the meter direction itself.
* Reworked the **DoLP attitude system** across **70+ files** (will work on more later).
* Changed **Fickle** into a **daily attitude** that selects one mood per day from:
  * meek,
  * shy,
  * neutral,
  * confident,
  * bratty.
* Rearranged **X-Change pills** in the **Hospital** UI.
* Improved the general **UI**.
* Updated the **suspicious pills reader**.
* Updated **breast sex animations** by **JollySpill**.
* Improved **clothes testing**.
* Updated **Kylar pilling** so players can now:
  * let Kylar pill themselves,
  * stop them,
  * or even do it themselves if possible.
* Added **Water Dragon transformation** support for **feat boost**.

### X-Change and Pill Changes
* Added **Anti-Pill side effects**, making the player overly sensitive to the point of itchiness / pain temporarily.
* Increased the general **X-Change sensitivity limit**.
* **Dumb Bitch** now also applies the same sensitivity / itchy side-effect layer like anti-pills.
* Fixed the **Premium** trait when it became sticky or was incorrectly applied to normal **X-Change pills**.
* Fixed the **Innocence Pill** so it behaves properly and no longer soft-locks the player at **0 awareness**, especially on permanent-pill paths.
* Fixed the **Swell Pill** so it now remembers whether it started on the **penis** path or the **curves** (breast and ass) path, and no longer mislabels bodies with **breasts + pussy + no penis** as penis-targeted.

### NPC / Event Fixes
* Fixed NPC generation in **Office Supply Molest**.
* Fixed NPC generation in the **gloryhole** sequence, where stale brothel customer history could corrupt slot 0 and crash `EventSystem.validate()`.
* Fixed NPC generation in the **stalk** sequence by clearing combat and event state before regeneration and correcting the chase image rendering.
* Cleaned lingering NPC generation after the **Bullet Vibe** street event.
* Fixed a structural **NPCList invariant issue**:
  * some scenes could shrink `$NPCList` to length 1,
  * cleanup did not always restore the expected 6-slot layout,
  * and some widgets assumed missing slots already existed.
  * The patch now preserves a stable 6-slot structure, restores missing entries as `setup.baseNPC`, and fixes `<<npc>>` writing to the wrong slot during multi-orgasm handling.
* Updated the **NPC debug detector** to stop false positives from expected beast-train lifecycle entries.

### Rendering / UI / Image Fixes
* Fixed **Advanced Hair Dye** colours breaking in the **history** feature.
* Fixed **clothing breast-layer rendering**:
  * `null` breast variants are now treated as an absent layer instead of producing invalid image paths like `null_gray.png`,
  * and old worn clothing now has missing `breast_img` / `sleeve_img` metadata backfilled from setup data.
* Fixed `colorWheelTemporary` so it resolves to proper colours, with black / dark both using `#000000`, plus source-data and fallback cleanup.
* Fixed the wrong text macro `<<pussy>>` being shown in an **anal escape** failure branch.
* Fixed the wrong **Kylar gender macro** in canteen eat narration.
* Fixed **sex toy throw-away** errors caused by stale `data-index` values after reindexing.

### Mechanics and Logic Fixes
* Fixed taking a **bath** or **swimming** not cleaning sperm properly, especially for **permanent Breeder** users, including the fake variant.
* Fixed **Breeder** state cleanup so all linked breeder flags are cleared consistently, cheat menu handling uses the proper widget path, and *sticky breeder residue can be removed by bathing when appropriate*.
* Fixed **permanent rut / heat** logic:
  * **Bull** no longer acts as both a trigger and an intensifier,
  * rut now activates only from the actual rut state,
  * while Bull only strengthens rut when rut is already active.
* Fixed `calculateallure()` so the expected story variable is actually assigned for feat checks like **Alluring**.
* Tweaked **Cock Addict** so toy detection better recognizes worn toys, including butt plugs that were previously skipped by breakthrough logic.
* Fixed `averytimespilled` being incorrectly treated as invalid at value `0` on older save paths by adding a shared migration / repair point.
* Fixed **beast pleasure** not being initialized correctly in sex / encounter scenes.
* Fixed bad `<<return>>` usage inside `<<widget "gi-auto-update">>`.

### Code Cleanup and Maintenance
* Removed unused code from:
  * **Mansion Bedroom Masturbate** chain,
  * **fertile helper**,
  * an old unused **effect widget**.
* Removed duplicate `"enter"` handling in the **PC room** for **orphanage** and **cottage** routes.
* Patched `sendToWardrobeFromDefault` to guard missing wardrobe slot arrays and missing source clothing references.
* Fixed **VS Code / `@ts-check` warnings** for `V.enemypleasure` and `V.enemypleasuremax` usage. The proper long-term solution is still to add them to the `SugarCubeStoryVariables` typings.