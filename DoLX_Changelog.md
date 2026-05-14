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
## Changes and Additions:
* Added **bank heist prison cooldown**.
  * After the bank heist is complete, the bank alert level now lowers by 1 point whenever the player is sent to prison.
* Updated **bank heist observation behaviour**.
  * Wren’s observation quest now recognises the player’s X-Change state.
  * If the player is X-Changed, bank staff may be less suspicious because the player no longer matches the expected description.
  * Guards may still react differently.
* Updated **Water Dragon island travel**.
  * Travelling to the island as a Water Dragon can now unlock the **Lost World** feat.
* Restored **DoLP transparent clothing option**.
  * Brought back the option to toggle the anti-transparent clothes setting on or off.
* Added **missing images**.
  * Added missing thunderstorm and penis size 6 image assets.

## Rebalancing and Fixes:
* Fixed **Poppy LI support**.
  * Fixed a missing check that was accidentally removed.
  * Improved Poppy-related save repair and NPC metadata handling.
* Fixed **fertile breeder pregnancy**.
  * Real fertile breeder pregnancies could still fail with a 0% chance in fetish pregnancy mode when the fertility cycle multiplier was 0.
  * Real breeder now correctly bypasses the cycle penalty when both the breeder effect and fertile state are active.
  * Fake breeder behaviour is unchanged.
* Fixed **blackmail park streaking quest**.
  * Fixed an issue where the streaking option could fail to appear for the blackmail quest.
* Add fixes by **CitrusBurst**.
  * Fixed old wallpaper names that were renamed with hyphens, such as `wavywhite` to `wavy-white`.
  * Fixed **Alex Cottage maths project bonus** missing +5 points when working on the maths project from Alex’s cottage.
* Fixed **action text typo**.
  * Corrected some typo in `action-text.twee`.
* Tidied **bank narration**.
  * Reworked bank text to make it less stiff and easier to read.
* Optimised **save version checks**.
  * `backComp` and `modupdate` now only run when the save version does not match `StartConfig.version`.
  * Same-version save loads and page refreshes no longer run the full migration pipeline.
  * Normal load and refresh setup still runs as before, including time setup, font setup, custom lenses, debug event sync, PRNG restore, and history controls.
  * Older saves and saves without `saveVersions` still run migrations normally.
* Improved **general performance**.
  * Made parts of the code lighter for Updated UI, MiniMap UI, Mod LI settings, and Poppy core code.
* Repaired **NPCName migration and mod LI defaults** (especially for vanilla's save).
  * Registered mod LI NPCName slots are now guaranteed before `pruneNPCName` runs.
  * New NPCNameList pushes are still gated behind `modLIUnlocks`, but existing NPCNameList slots are always repaired.
  * Expanded mod LI stub defaults with relation-box-safe fields, including virginity, pregnancy, timers, orgasm state, appearance, and relationship stats.
  * Existing half-repaired slots now get missing defaults backfilled without wiping relationship progress.
  * Nested defaults now repair after `Object.assign`, preventing partial templates from replacing required nested data.
  * Corrupted Poppy slots now have Night Monster vestige fields cleaned, including title, type, description, beastname, and monster.
  * Restored Poppy’s canonical metadata, including tolerant title, skill insecurity, human type, and adult flags.
  * Consolidated future mod LI metadata and vestige cleanup rules into a single config helper.
  * Padded the `npcNamed` `_swi` array to match `NPCNameList` length and avoid silent index drift.
* Reduced **console log noise**.
  * Wrapped selected console logging behind debugger checks to keep normal console output cleaner.
