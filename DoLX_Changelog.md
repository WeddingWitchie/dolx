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
* Added new **Transgender** trait, allowing flexible Gender Identity preference changes while still respecting attitude settings.
* Added detailed **Gender Identity stats section**, including meter values, drift, transformation progress, and body state.
* Added **bank heist event**, with skill checks and multiple outcomes.
* Added **bank heist journal progress** and follow-up events (high alert & trespassing scenario).
* Added **bike rework events** with seasonal/weather tradeoffs and durability tweaks.
* Added **Waterdragon lore event** at island spear encounter.
* Added **post-heist bank alert event** for high crime players.
* Added **NPC generation fixes and validation improvements** for encounters.
* Added widgets `<<Their>>` and `<<Hisselect>>`.
* Added more **stat descriptions** explaining Gender Identity preference effects.
* Added **Transformation Trait category** and improved trait organization.

## Rebalancing and Fixes:
* Fixed Gender Identity system:
  * Genital creation now correctly initializes sex stats and menstruation.
  * Dysphoria no longer gets stuck at 1.
  * Old saves now properly reinitialize via meter version update.
* Fixed **encounter issues** where genitals failed to function.
* Fixed **wardrobe system errors**, including:
  * Invalid wardrobe key usage
  * Incorrect filtering removing valid items
  * Assignment and logic operator bugs
* Fixed **NPC gender narration bug** (off-by-one RNG issue).
* Fixed **MMA gym closing incorrectly**.
* Fixed **counter action softlock** when no enemies remain.
* Fixed **invalid `$ballssize` and `$penissize` values** and corrupted body snapshots.
* Fixed **Sydney hair salon date**.
* Fixed **changing room wardrobe bug**.
* Fixed **Hopeless Cycle logic bugs** (torch, free-hand check).
* Fixed **missing NPC generation in island event**.
* Fixed **Pirate Zephyr Island progress reset issue**.
* Fixed **double hand combat issue**.
* Fixed **clothes feat boost issues**.
* Fixed **Wicked Wardrobe feats unlock conditions**.
* Fixed **Wraith Set randomization behavior**.
* Fixed **study error in Avery Mansion**.
* Fixed **spacing issue in poll event**.
* Fixed **NPC pairing validation in encounters**.
* Fixed **infinite loop and duplicate feat issues**.
* Fixed **bank heist follow-up triggers**.

## Gameplay Changes:
* Rebalanced **Suspicious pill** (now reduces skills with chance).
* Rebalanced **Shady person** (portal pill now costs money instead of granting it).
* Reworked **bike travel** to introduce meaningful tradeoffs.
* Updated **Counter action** logic to prevent invalid usage.
* Updated **Chastity system** to adapt with X-Change transformations.
* Updated **cock/hole addict traits** with more precise conditions and checks.
* Improved **breakthrough orgasm system** so it properly registers and persists.
* Updated **Crossdresser & Gender-Anxious descriptions** to clarify behavior.

## Code Improvements:
* Simplified and cleaned various systems (PruneNPC, feats, wardrobe, etc.).
* Removed unused **DoLP Meme Text Expanded setting**.
* Removed unused/dead code (Bailey housekeeping, legacy systems).
* Improved **save compatibility and initialization** for vanilla and DoLP saves.
* General refactoring across multiple files (including 28 files for attitude system rework).

## Small Fixes:
* Added missing icons (Bailey rent deposit, Briar offer, lockpicking training, Kylar events).
* Fixed Robin bathing stripping logic.
* Fixed Danube oranges event not triggering.
* Various minor bug fixes, cleanup, and consistency improvements.